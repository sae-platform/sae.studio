using System.Text.Json.Nodes;

namespace SAE.STUDIO.Core.Labels.Printing.Runtime;

/// <summary>
/// Execution context for ticket rendering.
/// Holds all variable sources — user data, company info, customer data, and external datasources.
/// </summary>
public sealed class DocumentContext
{
    /// <summary>User-provided key-value pairs (e.g., from print dialog).</summary>
    public Dictionary<string, object?> Variables { get; init; } = new();

    /// <summary>Company/business info JSON (name, address, phone, logo, etc.).</summary>
    public JsonNode? Company { get; init; }

    /// <summary>Current user/session info JSON (cashier, terminal, shift, etc.).</summary>
    public JsonNode? User { get; init; }

    /// <summary>Customer-specific data JSON.</summary>
    public JsonNode? Customer { get; init; }

    /// <summary>External datasource (Excel rows, API response, JSON list, etc.).</summary>
    public JsonNode? SourceData { get; init; }
}
