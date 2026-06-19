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
    public List<DocWatermarkElement> Watermarks { get; init; } = [];
    public List<DocInvoiceSection> DataBands { get; init; } = [];
}

public abstract record DocElement(string? ShowIf = null);

public sealed record DocTextElement(
    string Content,
    string? Align = null,
    float? Size = null,
    bool Bold = false,
    string? ShowIf = null,
    string? Color = null,
    string? Font = null,
    bool Italic = false,
    bool Underline = false,
    string? VerticalAlign = null,
    float? LineHeight = null,
    float? LetterSpacing = null,
    string? TextTransform = null,
    bool Strikethrough = false,
    bool Overline = false,
    string? BackgroundColor = null,
    float? Padding = null,
    bool AutoGrow = false,
    string? Format = null,
    string? FormatString = null,
    float? PX = null,
    float? PY = null,
    float? PWidth = null,
    float? PHeight = null) : DocElement(ShowIf);

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

public sealed record DocWatermarkElement(
    string? Text = null,
    string? Image = null,
    float Opacity = 0.08f,
    string? ShowIf = null) : DocElement(ShowIf);

public sealed record DocRectangleElement(
    string? FillColor = null,
    string? BorderColor = null,
    float? BorderWidth = null,
    float? BorderRadius = null,
    string? ShowIf = null,
    float? PX = null,
    float? PY = null,
    float? PWidth = null,
    float? PHeight = null) : DocElement(ShowIf);

public sealed record DocEllipseElement(
    string? FillColor = null,
    string? BorderColor = null,
    float? BorderWidth = null,
    string? ShowIf = null,
    float? PX = null,
    float? PY = null,
    float? PWidth = null,
    float? PHeight = null) : DocElement(ShowIf);

public sealed record DocBarcodeElement(
    string Content,
    string? Kind = "code128",
    bool ShowText = false,
    string? ShowIf = null,
    float? PX = null,
    float? PY = null,
    float? PWidth = null,
    float? PHeight = null) : DocElement(ShowIf);
