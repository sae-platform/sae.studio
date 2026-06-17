using Microsoft.Data.Sqlite;
using SAE.Contracts.Runtime.Models.Common;

namespace SAE.STUDIO.Api.Services;

/// <summary>
/// SQLite-backed registry for template metadata.
/// Source of truth for XML content is still the filesystem;
/// this table stores version, description, tags, checksum, and timestamps.
/// </summary>
public sealed class TemplateRegistryStore
{
    private readonly string _connectionString;

    public TemplateRegistryStore(string? dbPath = null)
    {
        var path = dbPath ?? Path.Combine(AppContext.BaseDirectory, "template_registry.db");
        _connectionString = $"Data Source={path}";
        EnsureTable();
    }

    private void EnsureTable()
    {
        using var conn = new SqliteConnection(_connectionString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS template_registry (
                name       TEXT NOT NULL,
                category   TEXT NOT NULL,
                version    INTEGER NOT NULL DEFAULT 1,
                description TEXT,
                tags       TEXT,
                checksum   TEXT,
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (name, category)
            );
            """;
        cmd.ExecuteNonQuery();
    }

    public List<TemplateInfo> GetAll()
    {
        var list = new List<TemplateInfo>();
        using var conn = new SqliteConnection(_connectionString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT name, category, version, description, checksum FROM template_registry ORDER BY category, name";
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
        {
            var cat = Enum.TryParse<TemplateCategory>(reader.GetString(1), ignoreCase: true, out var parsed)
                ? parsed : TemplateCategory.Restaurant;
            list.Add(new TemplateInfo(reader.GetString(0), cat, reader.GetString(3) ?? "", reader.GetInt32(2), reader.GetString(4) ?? ""));
        }
        return list;
    }

    public void Upsert(string name, TemplateCategory category, int version, string? description, string? checksum)
    {
        using var conn = new SqliteConnection(_connectionString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            INSERT INTO template_registry (name, category, version, description, checksum, updated_at)
            VALUES (@name, @category, @version, @description, @checksum, datetime('now'))
            ON CONFLICT(name, category) DO UPDATE SET
                version = excluded.version,
                description = excluded.description,
                checksum = excluded.checksum,
                updated_at = excluded.updated_at;
            """;
        cmd.Parameters.AddWithValue("@name", name);
        cmd.Parameters.AddWithValue("@category", category.ToString());
        cmd.Parameters.AddWithValue("@version", version);
        cmd.Parameters.AddWithValue("@description", (object?)description ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@checksum", (object?)checksum ?? DBNull.Value);
        cmd.ExecuteNonQuery();
    }

    public void Delete(string name, TemplateCategory category)
    {
        using var conn = new SqliteConnection(_connectionString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM template_registry WHERE name = @name AND category = @category";
        cmd.Parameters.AddWithValue("@name", name);
        cmd.Parameters.AddWithValue("@category", category.ToString());
        cmd.ExecuteNonQuery();
    }
}
