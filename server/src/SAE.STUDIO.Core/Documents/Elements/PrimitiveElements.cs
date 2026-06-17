#nullable enable
namespace SAE.STUDIO.Core.Documents.Elements;

public record TextElement : DocumentElementBase
{
    public override string Type => "text";
    public string Content { get; init; } = "";
    public string? Font { get; init; }
    public decimal? Size { get; init; }
    public bool Bold { get; init; }
    public bool Italic { get; init; }
    public bool Underline { get; init; }
    /// <summary>left | center | right | justify</summary>
    public string? Align { get; init; }
    public string? Color { get; init; }
}

public record ImageElement : DocumentElementBase
{
    public override string Type => "image";
    public string Source { get; init; } = "";
    /// <summary>contain | cover | fill</summary>
    public string? Fit { get; init; }
}

public record LineElement : DocumentElementBase
{
    public override string Type => "line";
    public decimal X1 { get; init; }
    public decimal Y1 { get; init; }
    public decimal X2 { get; init; }
    public decimal Y2 { get; init; }
    public string? Color { get; init; }
    public decimal? LineWidth { get; init; }
}

public record RectangleElement : DocumentElementBase
{
    public override string Type => "rectangle";
    public string? FillColor { get; init; }
    public string? BorderColor { get; init; }
    public decimal? BorderWidth { get; init; }
    public decimal? BorderRadius { get; init; }
}

public record EllipseElement : DocumentElementBase
{
    public override string Type => "ellipse";
    public string? FillColor { get; init; }
    public string? BorderColor { get; init; }
    public decimal? BorderWidth { get; init; }
}

public record BarcodeElement : DocumentElementBase
{
    public override string Type => "barcode";
    public string Value { get; init; } = "";
    /// <summary>code128 | code39 | ean13 | ean8 | upca | itf</summary>
    public string? Kind { get; init; }
    public bool ShowText { get; init; } = true;
}

public record QrElement : DocumentElementBase
{
    public override string Type => "qr";
    public string Value { get; init; } = "";
    public decimal? Size { get; init; }
    /// <summary>L | M | Q | H</summary>
    public string? ErrorLevel { get; init; }
}
