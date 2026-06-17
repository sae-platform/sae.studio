namespace SAE.STUDIO.Core.Labels.Printing.Documents;

/// <summary>
/// Parsed SaeDocument — a page-based document for PDF/print output.
/// Format: <saedocument> with <header>, <body>, <footer> containing text, table, image, line, spacer, qr elements.
/// </summary>
public sealed class SaeDocument
{
    public string PageSize { get; init; } = "A4";
    public string Orientation { get; init; } = "portrait";
    public float MarginTop { get; init; } = 20;
    public float MarginBottom { get; init; } = 20;
    public float MarginLeft { get; init; } = 15;
    public float MarginRight { get; init; } = 15;

    public List<DocElement> Elements { get; init; } = [];
}

public abstract record DocElement(string? ShowIf = null);

public sealed record DocTextElement(
    string Content,
    string? Align = null,
    int? Size = null,
    bool Bold = false,
    string? ShowIf = null,
    string? Color = null) : DocElement(ShowIf);

public sealed record DocTableElement(
    string Source,
    List<DocColumn> Columns,
    bool ShowHeader = true,
    string? ShowIf = null) : DocElement(ShowIf);

public sealed record DocColumn(
    string Field,
    string? Header = null,
    string? Width = null,
    string? Align = null);

public sealed record DocLineElement(
    string? ShowIf = null) : DocElement(ShowIf);

public sealed record DocSpacerElement(
    float Height = 10,
    string? ShowIf = null) : DocElement(ShowIf);

public sealed record DocImageElement(
    string Source,
    float? Width = null,
    float? Height = null,
    string? Align = null,
    string? ShowIf = null) : DocElement(ShowIf);

public sealed record DocQrElement(
    string Content,
    float Size = 80,
    string? Align = null,
    string? ShowIf = null) : DocElement(ShowIf);

public sealed record DocInvoiceSection(
    string Name,
    List<DocElement> Elements,
    string? ShowIf = null) : DocElement(ShowIf);
