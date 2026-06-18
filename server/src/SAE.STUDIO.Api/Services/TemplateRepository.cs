using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Xml.Linq;
using SAE.Contracts.Runtime.Models.Common;

namespace SAE.STUDIO.Api.Services;

public sealed class TemplateRepository
{
    private readonly string _basePath;
    private readonly TemplateRegistryStore? _registry;
    private readonly ConcurrentDictionary<string, CachedTemplate> _cache = new();

    private static readonly string[] _extensions = [".saedocument", ".saeticket", ".saelabel", ".xml"];

    public TemplateRepository(TemplateRegistryStore? registry = null, string? basePath = null)
    {
        _registry = registry;
        _basePath = basePath ?? Path.Combine(AppContext.BaseDirectory, "Templates");
    }

    /// <summary>Determine file extension from XML content (root tag).</summary>
    public static string GetExtension(string xml)
    {
        try
        {
            var trimmed = xml.TrimStart();
            if (trimmed.StartsWith("<saedocument")) return ".saedocument";
            if (trimmed.StartsWith("<saetickets")) return ".saeticket";
            if (trimmed.StartsWith("<saelabels")) return ".saelabel";
        }
        catch { }
        return ".xml";
    }

    public ResolvedTemplate? Resolve(string name, TemplateCategory? category = null)
    {
        return ResolveInternal(name, category, tenantId: null);
    }

    /// <summary>
    /// Resolve with multi-tenant support.
    /// Search order: {tenant}/{category}/{name}.{ext} → {category}/{name}.{ext}
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

        if (_cache.TryGetValue(key, out var cached))
        {
            if (File.Exists(cached.FilePath) && cached.Checksum == ComputeChecksum(cached.FilePath))
                return new ResolvedTemplate(cached.Name, cached.Category, cached.FilePath, cached.Xml, cached.Description);
            _cache.TryRemove(key, out _);
        }

        string? filePath = null;
        TemplateCategory resolvedCat = TemplateCategory.Restaurant;

        if (tenantPrefix is not null && category.HasValue)
        {
            var tenantPath = Path.Combine(_basePath, tenantPrefix, category.Value.ToString().ToLowerInvariant());
            filePath = FindFile(tenantPath, name);
        }

        if (filePath is null && category.HasValue)
        {
            var catPath = Path.Combine(_basePath, category.Value.ToString().ToLowerInvariant());
            filePath = FindFile(catPath, name);
        }

        if (filePath is null && Directory.Exists(_basePath))
        {
            foreach (var dir in Directory.GetDirectories(_basePath))
            {
                var dirName = Path.GetFileName(dir)!;
                if (dirName.Length == 32 && Guid.TryParseExact(dirName, "N", out _)) continue;
                filePath = FindFile(dir, name);
                if (filePath is not null) break;
            }
        }

        if (filePath is null) return null;

        var xml = File.ReadAllText(filePath, Encoding.UTF8);
        var checksum = ComputeChecksum(filePath);
        var catDir = Path.GetFileName(Path.GetDirectoryName(filePath))!;
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
            foreach (var file in GetTemplateFiles(catDir))
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
        var ext = GetExtension(xml);
        var catDir = category.ToString().ToLowerInvariant();
        var dir = Path.Combine(_basePath, catDir);
        Directory.CreateDirectory(dir);

        // Clean up old files with different extensions
        foreach (var oldExt in _extensions)
        {
            if (oldExt == ext) continue;
            var oldPath = Path.Combine(dir, $"{name}{oldExt}");
            if (File.Exists(oldPath)) File.Delete(oldPath);
        }

        var filePath = Path.Combine(dir, $"{name}{ext}");
        File.WriteAllText(filePath, xml, Encoding.UTF8);
        var checksum = ComputeChecksum(filePath);
        _registry?.Upsert(name, category, version, ExtractDescription(filePath), checksum);
        Invalidate(name, category);
    }

    /// <summary>Remove a template from disk and registry.</summary>
    public bool Delete(string name, TemplateCategory category)
    {
        var catDir = category.ToString().ToLowerInvariant();
        var deleted = false;
        foreach (var ext in _extensions)
        {
            var filePath = Path.Combine(_basePath, catDir, $"{name}{ext}");
            if (File.Exists(filePath)) { File.Delete(filePath); deleted = true; }
        }
        _registry?.Delete(name, category);
        Invalidate(name, category);
        return deleted;
    }

    public void Invalidate(string name, TemplateCategory? category = null)
    {
        var key = (category.HasValue ? $"{category}/{name}" : name).ToLowerInvariant();
        _cache.TryRemove(key, out _);
    }

    private static string? FindFile(string directory, string name)
    {
        if (!Directory.Exists(directory)) return null;
        foreach (var ext in _extensions)
        {
            var path = Path.Combine(directory, $"{name}{ext}");
            if (File.Exists(path)) return path;
        }
        return null;
    }

    private static IEnumerable<string> GetTemplateFiles(string directory)
    {
        if (!Directory.Exists(directory)) yield break;
        foreach (var ext in _extensions)
        {
            foreach (var file in Directory.GetFiles(directory, $"*{ext}"))
                yield return file;
        }
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
