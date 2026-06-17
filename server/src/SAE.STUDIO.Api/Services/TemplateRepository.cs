using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using SAE.Contracts.Runtime.Models.Common;

namespace SAE.STUDIO.Api.Services;

public sealed class TemplateRepository
{
    private readonly string _basePath;
    private readonly TemplateRegistryStore? _registry;
    private readonly ConcurrentDictionary<string, CachedTemplate> _cache = new();

    public TemplateRepository(TemplateRegistryStore? registry = null, string? basePath = null)
    {
        _registry = registry;
        _basePath = basePath ?? Path.Combine(AppContext.BaseDirectory, "Templates");
    }

    public ResolvedTemplate? Resolve(string name, TemplateCategory? category = null)
    {
        return ResolveInternal(name, category, tenantId: null);
    }

    /// <summary>
    /// Resolve with multi-tenant support.
    /// Search order: {tenant}/{category}/{name}.xml → {category}/{name}.xml
    /// </summary>
    public ResolvedTemplate? Resolve(string name, TemplateCategory? category, Guid? tenantId)
    {
        return ResolveInternal(name, category, tenantId);
    }

    private ResolvedTemplate? ResolveInternal(string name, TemplateCategory? category, Guid? tenantId)
    {
        var tenantPrefix = tenantId.HasValue ? tenantId.Value.ToString("N") : null;
        var key = (tenantPrefix is not null ? $"{tenantPrefix}/{category}/{name}" :
                   category.HasValue ? $"{category}/{name}" : name).ToLowerInvariant();

        // Check cache
        if (_cache.TryGetValue(key, out var cached))
        {
            if (File.Exists(cached.FilePath) && cached.Checksum == ComputeChecksum(cached.FilePath))
                return new ResolvedTemplate(cached.Name, cached.Category, cached.FilePath, cached.Xml, cached.Description);
            _cache.TryRemove(key, out _);
        }

        // Search order: tenant → shared
        string? filePath = null;
        TemplateCategory resolvedCat = TemplateCategory.Restaurant;

        if (tenantPrefix is not null && category.HasValue)
        {
            var tenantPath = Path.Combine(_basePath, tenantPrefix, category.Value.ToString().ToLowerInvariant(), $"{name}.xml");
            if (File.Exists(tenantPath)) filePath = tenantPath;
        }

        if (filePath is null && category.HasValue)
        {
            var catPath = Path.Combine(_basePath, category.Value.ToString().ToLowerInvariant(), $"{name}.xml");
            if (File.Exists(catPath)) filePath = catPath;
        }

        // Fallback: scan all categories
        if (filePath is null && Directory.Exists(_basePath))
        {
            // Skip tenant directories when scanning
            foreach (var dir in Directory.GetDirectories(_basePath))
            {
                var dirName = Path.GetFileName(dir)!;
                if (dirName.Length == 32 && Guid.TryParseExact(dirName, "N", out _)) continue; // skip tenant dirs
                var candidate = Path.Combine(dir, $"{name}.xml");
                if (File.Exists(candidate)) { filePath = candidate; break; }
            }
        }

        if (filePath is null) return null;

        var xml = File.ReadAllText(filePath, Encoding.UTF8);
        var checksum = ComputeChecksum(filePath);
        var catDir = Path.GetFileName(Path.GetDirectoryName(filePath))!;
        // If parent is a tenant dir, the category is the grandparent
        var grandparent = Path.GetFileName(Path.GetDirectoryName(Path.GetDirectoryName(filePath)));
        if (grandparent is not null && Guid.TryParseExact(grandparent, "N", out _))
            catDir = Path.GetFileName(Path.GetDirectoryName(filePath))!;

        resolvedCat = Enum.TryParse<TemplateCategory>(catDir, ignoreCase: true, out var p) ? p : TemplateCategory.Restaurant;
        var desc = ExtractDescription(filePath);

        _registry?.Upsert(name, resolvedCat, 1, desc, checksum);
        var entry = new CachedTemplate(name, resolvedCat, filePath, xml, desc, checksum);
        _cache[key] = entry;
        return new ResolvedTemplate(name, resolvedCat, filePath, xml, desc);
    }

    public List<TemplateInfo> ListAll()
    {
        if (_registry is not null)
        {
            var fromDb = _registry.GetAll();
            if (fromDb.Count > 0) return fromDb;
        }
        var list = new List<TemplateInfo>();
        if (!Directory.Exists(_basePath)) return list;
        foreach (var catDir in Directory.GetDirectories(_basePath))
        {
            var catName = Path.GetFileName(catDir)!;
            if (!Enum.TryParse<TemplateCategory>(catName, ignoreCase: true, out var cat)) continue;
            foreach (var file in Directory.GetFiles(catDir, "*.xml"))
            {
                var n = Path.GetFileNameWithoutExtension(file);
                var cs = ComputeChecksum(file);
                var d = ExtractDescription(file);
                _registry?.Upsert(n, cat, 1, d, cs);
                list.Add(new TemplateInfo(n, cat, d ?? "", 1, cs));
            }
        }
        return list;
    }

    /// <summary>Publish a template from the Editor to the Runtime store.</summary>
    public void Save(string name, TemplateCategory category, string xml, int version = 1)
    {
        var catDir = category.ToString().ToLowerInvariant();
        var dir = Path.Combine(_basePath, catDir);
        Directory.CreateDirectory(dir);
        var filePath = Path.Combine(dir, $"{name}.xml");
        File.WriteAllText(filePath, xml, Encoding.UTF8);
        var checksum = ComputeChecksum(filePath);
        _registry?.Upsert(name, category, version, ExtractDescription(filePath), checksum);
        Invalidate(name, category);
    }

    /// <summary>Remove a template from disk and registry.</summary>
    public bool Delete(string name, TemplateCategory category)
    {
        var catDir = category.ToString().ToLowerInvariant();
        var filePath = Path.Combine(_basePath, catDir, $"{name}.xml");
        var deleted = false;
        if (File.Exists(filePath)) { File.Delete(filePath); deleted = true; }
        _registry?.Delete(name, category);
        Invalidate(name, category);
        return deleted;
    }

    public void Invalidate(string name, TemplateCategory? category = null)
    {
        var key = (category.HasValue ? $"{category}/{name}" : name).ToLowerInvariant();
        _cache.TryRemove(key, out _);
    }

    private static string ComputeChecksum(string filePath)
    {
        using var sha = SHA256.Create();
        using var stream = File.OpenRead(filePath);
        return Convert.ToHexStringLower(sha.ComputeHash(stream));
    }

    private static string? ExtractDescription(string filePath)
    {
        try
        {
            var first = File.ReadLines(filePath, Encoding.UTF8).FirstOrDefault();
            if (first?.Trim().StartsWith("<!--") == true && first.Trim().EndsWith("-->"))
                return first.Replace("<!--", "").Replace("-->", "").Trim();
        }
        catch { }
        return null;
    }

    private sealed record CachedTemplate(string Name, TemplateCategory Category, string FilePath, string Xml, string? Description, string Checksum);
}

public sealed record ResolvedTemplate(string Name, TemplateCategory Category, string FilePath, string Xml, string? Description);
