using Microsoft.Data.Sqlite;

namespace SAE.STUDIO.Api.Services;

/// <summary>
/// Maps business contexts to templates and logical printers.
/// Allows SAE.LITE clients to call Print("cierre-caja", data) without
/// knowing which template name or printer to use.
/// </summary>
public sealed class PrintContextStore
{
    private readonly string _connectionString;

    public PrintContextStore(string? dbPath = null)
    {
        var path = dbPath ?? Path.Combine(AppContext.BaseDirectory, "print_context.db");
        _connectionString = $"Data Source={path}";
        EnsureTable();
        SeedDefaults();
    }

    private void EnsureTable()
    {
        using var conn = new SqliteConnection(_connectionString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS print_context (
                key             TEXT PRIMARY KEY,
                template        TEXT NOT NULL,
                logical_printer TEXT NOT NULL DEFAULT 'CAJA',
                copies          INTEGER NOT NULL DEFAULT 1,
                enabled         INTEGER NOT NULL DEFAULT 1
            );
            """;
        cmd.ExecuteNonQuery();
    }

    private void SeedDefaults()
    {
        var defaults = new (string Key, string Template, string Printer)[]
        {
            ("cierre-caja", "cierre-caja", "CAJA"),
            ("informe-x", "informe-x", "CAJA"),
            ("informe-y", "informe-y", "CAJA"),
            ("informe-z", "informe-z", "CAJA"),
            ("arqueo", "arqueo", "CAJA"),
            ("comanda", "comanda", "COCINA"),
            ("comanda-cocina", "comanda-cocina", "COCINA"),
        };

        using var conn = new SqliteConnection(_connectionString);
        conn.Open();
        foreach (var (key, template, printer) in defaults)
        {
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "INSERT OR IGNORE INTO print_context (key, template, logical_printer) VALUES (@k, @t, @p)";
            cmd.Parameters.AddWithValue("@k", key);
            cmd.Parameters.AddWithValue("@t", template);
            cmd.Parameters.AddWithValue("@p", printer);
            cmd.ExecuteNonQuery();
        }
    }

    public PrintContextInfo? Resolve(string key)
    {
        using var conn = new SqliteConnection(_connectionString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT template, logical_printer, copies FROM print_context WHERE key = @k AND enabled = 1";
        cmd.Parameters.AddWithValue("@k", key);
        using var reader = cmd.ExecuteReader();
        if (reader.Read())
            return new PrintContextInfo(key, reader.GetString(0), reader.GetString(1), reader.GetInt32(2));
        return null;
    }

    public List<PrintContextInfo> GetAll()
    {
        var list = new List<PrintContextInfo>();
        using var conn = new SqliteConnection(_connectionString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT key, template, logical_printer, copies FROM print_context WHERE enabled = 1 ORDER BY key";
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
            list.Add(new PrintContextInfo(reader.GetString(0), reader.GetString(1), reader.GetString(2), reader.GetInt32(3)));
        return list;
    }
}

public sealed record PrintContextInfo(string Key, string Template, string LogicalPrinter, int Copies);
