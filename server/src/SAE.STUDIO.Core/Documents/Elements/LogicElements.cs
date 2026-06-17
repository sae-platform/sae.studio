#nullable enable
namespace SAE.STUDIO.Core.Documents.Elements;

/// <summary>
/// Container panel — absolute-positioned children, optional background/border.
/// Similar to a Frame or Panel in Crystal Reports.
/// </summary>
public record PanelElement : DocumentElementBase
{
    public override string Type => "panel";
    public List<DocumentElementBase> Elements { get; init; } = [];
    public string? FillColor { get; init; }
    public string? BorderColor { get; init; }
    public decimal? BorderWidth { get; init; }
    public decimal? BorderRadius { get; init; }
}

/// <summary>Logical grouping of elements that can be moved as a unit.</summary>
public record GroupElement : DocumentElementBase
{
    public override string Type => "group";
    public List<DocumentElementBase> Elements { get; init; } = [];
}

/// <summary>Conditional element — renders ThenElements or ElseElements based on Condition.</summary>
public record IfElement : DocumentElementBase
{
    public override string Type => "if";
    /// <summary>Expression evaluated at render time (e.g. "Cliente.Activo == true").</summary>
    public string Condition { get; init; } = "";
    public List<DocumentElementBase> ThenElements { get; init; } = [];
    public List<DocumentElementBase>? ElseElements { get; init; }
}

/// <summary>Repeats child elements for each row of the specified data source.</summary>
public record RepeatElement : DocumentElementBase
{
    public override string Type => "repeat";
    /// <summary>Dot-path to the data source (e.g. "Factura.Detalles").</summary>
    public string Source { get; init; } = "";
    public List<DocumentElementBase> Elements { get; init; } = [];
    /// <summary>row | column</summary>
    public string? Direction { get; init; }
    public decimal? Gap { get; init; }
}

/// <summary>Forces a page break at this position during rendering.</summary>
public record PageBreakElement : DocumentElementBase
{
    public override string Type => "pagebreak";
}

/// <summary>Forces a section break at this position during rendering.</summary>
public record SectionBreakElement : DocumentElementBase
{
    public override string Type => "sectionbreak";
}
