using System.Xml.Linq;
using SAE.STUDIO.Core.Labels.Modelos;
using SAE.STUDIO.Core.Labels.Printing.Document;

namespace SAE.STUDIO.Core.Labels.Printing.Parsers;

public class TicketXmlParser
{
    public TicketDocument Parse(string xml)
    {
        var doc = XDocument.Parse(xml);
        var root = doc.Root;
        if (root?.Name.LocalName != "saetickets")
            throw new InvalidDataException("El XML no es un formato saetickets válido.");

        var setup = root.Element("setup");
        var width = (int?)setup?.Attribute("width") ?? 42;
        var printers = setup?.Attribute("printers")?.Value;

        var document = new TicketDocument { Width = width, Printers = printers };
        var commands = root.Element("commands")?.Elements();
        if (commands == null) return document;

        foreach (var cmd in commands)
        {
            var element = ParseElement(cmd);
            if (element != null)
                document.Elements.Add(element);
        }

        return document;
    }

    private TicketElement? ParseElement(XElement cmd)
    {
        var showIf = cmd.Attribute("showIf")?.Value;

        return cmd.Name.LocalName switch
        {
            "text" => new TextElement(
                Content: cmd.Value,
                Align: ParseAlign(cmd.Attribute("align")?.Value),
                Bold: (bool?)cmd.Attribute("bold") ?? false,
                ExtraBold: (bool?)cmd.Attribute("extraBold") ?? false,
                Size: ParseFontSize(cmd.Attribute("size")?.Value),
                Valign: ParseValign(cmd.Attribute("valign")?.Value)
            ) { ShowIf = showIf },

            "separator" => new SeparatorElement(
                Char: (cmd.Attribute("char")?.Value ?? "-")[0],
                Align: ParseAlign(cmd.Attribute("align")?.Value)
            ) { ShowIf = showIf },

            "total" => new TotalElement(
                Label: cmd.Attribute("label")?.Value ?? "TOTAL",
                Value: cmd.Attribute("value")?.Value ?? "0",
                Bold: (bool?)cmd.Attribute("bold") ?? false,
                ExtraBold: (bool?)cmd.Attribute("extraBold") ?? false,
                Align: ParseAlign(cmd.Attribute("align")?.Value)
            ) { ShowIf = showIf },

            "qr" => new QrElement(
                Content: cmd.Value,
                Align: ParseAlign(cmd.Attribute("align")?.Value),
                ModuleSize: int.TryParse(cmd.Attribute("size")?.Value, out var ms) ? ms : 6
            ) { ShowIf = showIf },

            "feed" => new FeedElement((int?)cmd.Attribute("lines") ?? 1) { ShowIf = showIf },
            "cut" => new CutElement(),
            "beep" => new BeepElement(),
            "open-drawer" => new OpenDrawerElement(),

            "if" => new IfElement(
                Expr: cmd.Attribute("expr")?.Value ?? "",
                Text: cmd.Value,
                Align: ParseAlign(cmd.Attribute("align")?.Value),
                Bold: (bool?)cmd.Attribute("bold") ?? false,
                ExtraBold: (bool?)cmd.Attribute("extraBold") ?? false,
                Size: ParseFontSize(cmd.Attribute("size")?.Value)
            ) { ShowIf = showIf },

            "ifelse" => new IfElseElement(
                Expr: cmd.Attribute("expr")?.Value ?? "",
                ThenText: cmd.Element("then")?.Value ?? "",
                ElseText: cmd.Element("else")?.Value ?? "",
                Align: ParseAlign(cmd.Attribute("align")?.Value),
                Bold: (bool?)cmd.Attribute("bold") ?? false,
                ExtraBold: (bool?)cmd.Attribute("extraBold") ?? false,
                Size: ParseFontSize(cmd.Attribute("size")?.Value)
            ) { ShowIf = showIf },

            "each" => ParseEachElement(cmd, showIf),

            "image" => new ImageElement(
                Source: cmd.Attribute("src")?.Value ?? cmd.Value,
                Align: ParseAlign(cmd.Attribute("align")?.Value),
                Width: (int?)cmd.Attribute("width") ?? 100,
                Height: (int?)cmd.Attribute("height") ?? 100
            ) { ShowIf = showIf },

            "group" => ParseGroupElement(cmd, showIf),

            _ => null
        };
    }

    private GroupElement ParseGroupElement(XElement cmd, string? showIf)
    {
        var direction = (cmd.Attribute("direction")?.Value ?? "row").ToLower() switch
        {
            "column" => GroupDirection.Column,
            _ => GroupDirection.Row
        };
        var gap = (int?)cmd.Attribute("gap") ?? 1;

        var group = new GroupElement(direction, gap) { ShowIf = showIf };
        foreach (var child in cmd.Elements())
        {
            var el = ParseElement(child);
            if (el != null) group.Children.Add(el);
        }
        return group;
    }

    private EachElement ParseEachElement(XElement cmd, string? showIf)
    {
        var listVar = cmd.Attribute("listVar")?.Value ?? "ITEMS";
        var showHeader = cmd.Attribute("header")?.Value?.ToLower() != "false";
        var childField = cmd.Attribute("childField")?.Value;
        var childIndentCol = (int?)cmd.Attribute("childIndentCol") ?? 0;

        var cols = cmd.Elements("column").Select(c => new ColumnDef(
            Field: c.Attribute("field")?.Value ?? "",
            Label: c.Attribute("label")?.Value ?? "",
            Width: c.Attribute("width")?.Value ?? "auto",
            Align: ParseAlign(c.Attribute("align")?.Value),
            Bold: (bool?)c.Attribute("bold") ?? false,
            ExtraBold: (bool?)c.Attribute("extraBold") ?? false,
            Size: ParseFontSize(c.Attribute("size")?.Value),
            ShowIf: c.Attribute("showIf")?.Value
        )).ToList();

        return new EachElement(listVar, showHeader, cols, childField, childIndentCol) { ShowIf = showIf };
    }

    // ── Helpers ──

    private static TicketAlignment ParseAlign(string? val) => val?.ToLower() switch
    {
        "center" => TicketAlignment.Center,
        "right" => TicketAlignment.Right,
        _ => TicketAlignment.Left
    };

    private static PrinterFontSize ParseFontSize(string? val) => val?.ToLower() switch
    {
        "small" => PrinterFontSize.Small,
        "medium" => PrinterFontSize.Medium,
        "large" => PrinterFontSize.Large,
        "extra-large" => PrinterFontSize.ExtraLarge,
        _ => PrinterFontSize.Normal
    };

    private static VerticalAlignment ParseValign(string? val) => val?.ToLower() switch
    {
        "middle" or "center" => VerticalAlignment.Middle,
        "bottom" => VerticalAlignment.Bottom,
        _ => VerticalAlignment.Top
    };
}
