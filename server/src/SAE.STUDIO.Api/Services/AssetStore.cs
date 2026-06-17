using System.Collections.Concurrent;
using Microsoft.Data.Sqlite;

namespace SAE.STUDIO.Api.Services;

/// <summary>
/// Stores and serves static assets (logos, images, fonts) used by templates.
/// Assets live in {AppBase}/Assets/{name} on disk, with SQLite metadata.
/// </summary>
public sealed class AssetStore
{
    private readonly string _basePath;
    private readonly string _connectionString;

    public AssetStore(string? basePath = null)
    {
        _basePath = basePath ?? Path.Combine(AppContext.BaseDirectory, "Assets");
        Directory.CreateDirectory(_basePath);
        _connectionString = $"Data Source={Path.Combine(_basePath, "assets.db")}";
        EnsureTable();
    }

    private void EnsureTable()
    {
        using var conn = new SqliteConnection(_connectionString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS assets (
                name        TEXT PRIMARY KEY,
                content_type TEXT NOT NULL,
                size_bytes  INTEGER NOT NULL,
                checksum    TEXT,
                created_at  TEXT NOT NULL DEFAULT (datetime('now'))
            );
            """;
        cmd.ExecuteNonQuery();
    }

    public record AssetInfo(string Name, string ContentType, long SizeBytes, string? Checksum, DateTime CreatedAt);

    public List<AssetInfo> ListAll()
    {
        var list = new List<AssetInfo>();
        using var conn = new SqliteConnection(_connectionString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT name, content_type, size_bytes, checksum, created_at FROM assets ORDER BY name";
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
            list.Add(new AssetInfo(reader.GetString(0), reader.GetString(1), reader.GetInt64(2),
                reader.IsDBNull(3) ? null : reader.GetString(3), DateTime.Parse(reader.GetString(4))));
        return list;
    }

    public byte[]? Get(string name)
    {
        var filePath = Path.Combine(_basePath, name);
        return File.Exists(filePath) ? File.ReadAllBytes(filePath) : null;
    }

    public string? GetContentType(string name)
    {
        using var conn = new SqliteConnection(_connectionString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT content_type FROM assets WHERE name = @n";
        cmd.Parameters.AddWithValue("@n", name);
        return cmd.ExecuteScalar() as string;
    }

    public void Save(string name, byte[] data, string contentType)
    {
        var filePath = Path.Combine(_basePath, name);
        var dir = Path.GetDirectoryName(filePath);
        if (dir is not null) Directory.CreateDirectory(dir);
        File.WriteAllBytes(filePath, data);

        var checksum = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(data));
        using var conn = new SqliteConnection(_connectionString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            INSERT INTO assets (name, content_type, size_bytes, checksum, created_at)
            VALUES (@n, @ct, @s, @cs, datetime('now'))
            ON CONFLICT(name) DO UPDATE SET content_type=excluded.content_type, size_bytes=excluded.size_bytes, checksum=excluded.checksum, created_at=excluded.created_at;
            """;
        cmd.Parameters.AddWithValue("@n", name);
        cmd.Parameters.AddWithValue("@ct", contentType);
        cmd.Parameters.AddWithValue("@s", data.Length);
        cmd.Parameters.AddWithValue("@cs", checksum);
        cmd.ExecuteNonQuery();
    }

    public bool Delete(string name)
    {
        var filePath = Path.Combine(_basePath, name);
        if (File.Exists(filePath)) File.Delete(filePath);
        using var conn = new SqliteConnection(_connectionString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM assets WHERE name = @n";
        cmd.Parameters.AddWithValue("@n", name);
        return cmd.ExecuteNonQuery() > 0;
    }
}
