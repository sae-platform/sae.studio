using SAE.STUDIO.Core.Labels.Modelos;

namespace SAE.STUDIO.Core.Labels.Printing.Document;

public enum GroupDirection { Row, Column }

// ── Base ──

public abstract record TicketElement
{
    public virtual int EstimatedLines => 1;
    public string? ShowIf { get; init; }
}

// ── Leaf elements ──

public record TextElement(
    string Content,
    TicketAlignment Align = TicketAlignment.Left,
    bool Bold = false,
    bool ExtraBold = false,
    PrinterFontSize Size = PrinterFontSize.Normal,
    VerticalAlignment Valign = VerticalAlignment.Top
) : TicketElement;

public record SeparatorElement(
    char Char = '-',
    TicketAlignment Align = TicketAlignment.Left
) : TicketElement;

public record QrElement(
    string Content,
    TicketAlignment Align = TicketAlignment.Center,
    int ModuleSize = 6
) : TicketElement;

public record FeedElement(int Lines = 1) : TicketElement
{
    public override int EstimatedLines => Lines;
}

public record CutElement : TicketElement;

public record BeepElement : TicketElement;

public record OpenDrawerElement : TicketElement;

public record TotalElement(
    string Label,
    string Value,
    bool Bold = false,
    bool ExtraBold = false,
    TicketAlignment Align = TicketAlignment.Left
) : TicketElement;

public record IfElement(
    string Expr,
    string Text,
    TicketAlignment Align = TicketAlignment.Left,
    bool Bold = false,
    bool ExtraBold = false,
    PrinterFontSize Size = PrinterFontSize.Normal
) : TicketElement;

public record IfElseElement(
    string Expr,
    string ThenText,
    string ElseText,
    TicketAlignment Align = TicketAlignment.Left,
    bool Bold = false,
    bool ExtraBold = false,
    PrinterFontSize Size = PrinterFontSize.Normal
) : TicketElement;

public record EachElement(
    string ListVar,
    bool ShowHeader,
    System.Collections.Generic.List<ColumnDef> Columns,
    string? ChildField = null,
    int ChildIndentCol = 0
) : TicketElement;

public record ColumnDef(
    string Field,
    string Label,
    string Width,
    TicketAlignment Align = TicketAlignment.Left,
    bool Bold = false,
    bool ExtraBold = false,
    PrinterFontSize Size = PrinterFontSize.Normal,
    string? ShowIf = null
);

public record ImageElement(
    string Source,
    TicketAlignment Align = TicketAlignment.Center,
    int Width = 100,
    int Height = 100
) : TicketElement;

public record EachRowElement(List<TextElement> Columns) : TicketElement
{
    public override int EstimatedLines => 1;
}

// ── Container elements (future-proof) ──

/// <summary>Base class for all container-type elements that hold children.</summary>
public abstract record ContainerElement : TicketElement
{
    public List<TicketElement> Children { get; init; } = new();
    public override int EstimatedLines => Children.Sum(c => c.EstimatedLines);
}

/// <summary>Flexbox-style group layout for multi-column/complex tickets.</summary>
public record GroupElement(
    GroupDirection Direction = GroupDirection.Row,
    int Gap = 1
) : ContainerElement;

/// <summary>Named section (header, body, footer, etc.).</summary>
public record SectionElement : ContainerElement;

/// <summary>Repeating section bound to a datasource.</summary>
public record RepeatElement : ContainerElement
{
    public string Source { get; init; } = "";
}

/// <summary>Conditionally rendered container.</summary>
public record ConditionalElement : ContainerElement
{
    public string Expression { get; init; } = "";
}
