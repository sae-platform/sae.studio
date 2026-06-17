#nullable enable
namespace SAE.STUDIO.Core.Documents.Elements;

/// <summary>Column definition for a TableElement.</summary>
public record TableColumnDef
{
    public string Field { get; init; } = "";
    public string? Header { get; init; }
    /// <summary>Width as string (e.g. "25mm", "20%", or plain number for mm).</summary>
    public string? Width { get; init; }
    /// <summary>left | center | right</summary>
    public string? Align { get; init; }
    /// <summary>Format string, e.g. "#,##0.00"</summary>
    public string? Format { get; init; }
}

/// <summary>Data-bound repeating table with column definitions.</summary>
public record TableElement : DocumentElementBase
{
    public override string Type => "table";
    /// <summary>Dot-path to the data source (e.g. "Factura.Detalles").</summary>
    public string Source { get; init; } = "";
    public List<TableColumnDef> Columns { get; init; } = [];
    public bool ShowHeader { get; init; } = true;
    public string? StripeColor { get; init; }
    public string? HeaderColor { get; init; }
    public string? HeaderTextColor { get; init; }
}

/// <summary>Summary total element with label + expression field.</summary>
public record TotalElement : DocumentElementBase
{
    public override string Type => "total";
    public string? Label { get; init; }
    public string Field { get; init; } = "";
    public string? Format { get; init; }
    public string? Font { get; init; }
    public decimal? Size { get; init; }
    public bool Bold { get; init; }
    public string? Align { get; init; }
    public string? Color { get; init; }
}

/// <summary>Sub-total element — same shape as Total, different semantic.</summary>
public record SubtotalElement : DocumentElementBase
{
    public override string Type => "subtotal";
    public string? Label { get; init; }
    public string Field { get; init; } = "";
    public string? Format { get; init; }
    public string? Font { get; init; }
    public decimal? Size { get; init; }
    public bool Bold { get; init; }
    public string? Align { get; init; }
    public string? Color { get; init; }
}

/// <summary>Renders the value of a runtime variable.</summary>
public record VariableElement : DocumentElementBase
{
    public override string Type => "variable";
    public string VariableName { get; init; } = "";
    public string? Font { get; init; }
    public decimal? Size { get; init; }
    public bool Bold { get; init; }
    public string? Align { get; init; }
    public string? Color { get; init; }
}
