using System.Xml.Linq;

namespace SAE.STUDIO.Core.Labels.Printing.Documents;

/// <summary>
/// Parses <saedocument> XML into SaeDocument domain model.
/// Supports both design-time format (with <page>) and runtime format (with <setup>).
/// </summary>
public sealed class SaeDocumentParser
{
    public SaeDocument Parse(string xml)
    {
        var doc = XDocument.Parse(xml);
        var root = doc.Root ?? throw new InvalidDataException("Missing root element");
        if (root.Name.LocalName != "saedocument")
            throw new InvalidDataException("Root element must be <saedocument>");

        // Detect format: <page> → design-time, <setup> → runtime
        var hasPage = root.Elements("page").Any();
        return hasPage ? ParseDesignTime(root) : ParseRuntime(root);
    }

    // ── Runtime format: <saedocument><setup .../><header>...</header><body>...</body><footer>...</footer></saedocument>
    private SaeDocument ParseRuntime(XElement root)
    {
        var setup = root.Element("setup");
        var result = new SaeDocument
        {
            PageSize = setup?.Attribute("pageSize")?.Value ?? "A4",
            Orientation = setup?.Attribute("orientation")?.Value ?? "portrait",
            MarginTop = ParseFloat(setup?.Attribute("marginTop")?.Value) ?? 20,
            MarginBottom = ParseFloat(setup?.Attribute("marginBottom")?.Value) ?? 20,
            MarginLeft = ParseFloat(setup?.Attribute("marginLeft")?.Value) ?? 15,
            MarginRight = ParseFloat(setup?.Attribute("marginRight")?.Value) ?? 15,
            Elements = new()
        };

        foreach (var section in root.Elements())
        {
            if (section.Name.LocalName is "setup") continue;
            result.Elements.Add(ParseElement(section));
        }

        return result;
    }

    // ── Design-time format: <saedocument version="2.0"><page ...><header>...</header><body>...</body><footer>...</footer></page></saedocument>
    private SaeDocument ParseDesignTime(XElement root)
    {
        // Use first page (multi-page support: render first page only for now)
        var page = root.Elements("page").FirstOrDefault();
        if (page is null)
            throw new InvalidDataException("No <page> element found in design-time format.");

        // Extract page dimensions
        var pageWidth  = ParseFloat(page.Attribute("width")?.Value) ?? 210;
        var pageHeight = ParseFloat(page.Attribute("height")?.Value) ?? 297;
        var orientation = page.Attribute("orientation")?.Value ?? (pageWidth > pageHeight ? "landscape" : "portrait");
        var pageSize = ResolvePageSizeName(pageWidth, pageHeight);

        var result = new SaeDocument
        {
            PageSize = pageSize,
            Orientation = orientation,
            MarginTop = ParseFloat(page.Attribute("marginTop")?.Value) ?? 15,
            MarginBottom = ParseFloat(page.Attribute("marginBottom")?.Value) ?? 15,
            MarginLeft = ParseFloat(page.Attribute("marginLeft")?.Value) ?? 12,
            MarginRight = ParseFloat(page.Attribute("marginRight")?.Value) ?? 12,
            Elements = new()
        };

        // Parse bands in order
        foreach (var bandName in new[] { "header", "body", "footer" })
        {
            var band = page.Element(bandName);
            if (band is null) continue;

            var elements = band.Elements()
                .Select(ParseDesignElement)
                .Where(e => e is not null)
                .Cast<DocElement>()
                .ToList();

            if (elements.Count > 0)
                result.Elements.Add(new DocInvoiceSection(bandName, elements));
        }

        return result;
    }

    // ── Element parsers ──────────────────────────────────────

    private DocElement ParseElement(XElement el) => el.Name.LocalName switch
    {
        "text" => ParseText(el),
        "table" => ParseTable(el),
        "line" => new DocLineElement(Attr(el, "showIf")),
        "spacer" => new DocSpacerElement(ParseFloat(Attr(el, "height")) ?? 10, Attr(el, "showIf")),
        "image" => new DocImageElement(Attr(el, "source") ?? "", ParseFloat(Attr(el, "width")), ParseFloat(Attr(el, "height")), Attr(el, "align"), Attr(el, "showIf")),
        "qr" => new DocQrElement(el.Value.Trim(), ParseFloat(Attr(el, "size")) ?? 80, Attr(el, "align"), Attr(el, "showIf")),
        "header" or "body" or "footer" or "section" => new DocInvoiceSection(
            el.Name.LocalName,
            el.Elements().Select(ParseElement).ToList(),
            Attr(el, "showIf")),
        _ => new DocSpacerElement(0)
    };

    /// <summary>
    /// Parse design-time elements (from page/band hierarchy).
    /// Design-time elements have attributes x/y/width/height; runtime elements have src/align etc.
    /// </summary>
    private DocElement? ParseDesignElement(XElement el)
    {
        var showIf = Attr(el, "showIf");
        var tag = el.Name.LocalName;

        // Skip layout-only elements (no runtime rendering)
        if (tag is "layers" or "layer") return null;

        return tag switch
        {
            "text" => new DocTextElement(
                el.Value.Trim(),
                Attr(el, "align") ?? "left",
                (int?)ParseFloat(Attr(el, "size")),
                Attr(el, "bold")?.ToLower() == "true",
                showIf,
                Attr(el, "color")),

            "table" => new DocTableElement(
                Attr(el, "source") ?? "ITEMS",
                el.Elements("column").Select(c => new DocColumn(
                    Attr(c, "field") ?? "",
                    Attr(c, "header"),
                    Attr(c, "width"),
                    Attr(c, "align"))).ToList(),
                Attr(el, "showHeader")?.ToLower() != "false",
                showIf),

            "line" => new DocLineElement(showIf),

            "image" => new DocImageElement(
                Attr(el, "source") ?? "",
                ParseFloat(Attr(el, "width")),
                ParseFloat(Attr(el, "height")),
                Attr(el, "align"),
                showIf),

            "qr" => new DocQrElement(
                Attr(el, "value") ?? Attr(el, "content") ?? "",
                ParseFloat(Attr(el, "size")) ?? 30,
                Attr(el, "align"),
                showIf),

            "barcode" => new DocTextElement(
                Attr(el, "value") ?? "",
                Attr(el, "align") ?? "center",
                (int?)ParseFloat(Attr(el, "size")),
                Bold: false,
                showIf),

            "total" or "subtotal" => new DocTextElement(
                "${" + (Attr(el, "field") ?? Attr(el, "value")?.Replace("${", "").Replace("}", "") ?? "") + "}",
                Attr(el, "align") ?? "right",
                (int?)ParseFloat(Attr(el, "size")),
                Attr(el, "bold")?.ToLower() == "true" || tag == "total",
                showIf,
                Attr(el, "color")),

            "variable" => new DocTextElement(
                "${" + (Attr(el, "variableName") ?? "") + "}",
                Attr(el, "align") ?? "left",
                (int?)ParseFloat(Attr(el, "size")),
                Attr(el, "bold")?.ToLower() == "true",
                showIf,
                Attr(el, "color")),

            "rectangle" => new DocSpacerElement(ParseFloat(Attr(el, "height")) ?? ParseFloat(Attr(el, "height")) ?? 10, showIf),

            "spacer" or "ellipse" or "panel" or "group" => new DocSpacerElement(
                ParseFloat(Attr(el, "height")) ?? 8, showIf),

            // Sections (for nested header/body/footer sections)
            "header" or "body" or "footer" => new DocInvoiceSection(
                tag,
                el.Elements().Select(ParseDesignElement).Where(e => e is not null).Cast<DocElement>().ToList(),
                showIf),

            "pagebreak" => new DocSpacerElement(4, showIf),

            _ => null // skip unknown
        };
    }

    // ── Legacy element parsers (runtime format) ──────────────

    private DocTextElement ParseText(XElement el) => new(
        el.Value.Trim(),
        Attr(el, "align"),
        (int?)ParseFloat(Attr(el, "size")),
        Attr(el, "bold")?.ToLower() == "true",
        Attr(el, "showIf"),
        Attr(el, "color"));

    private DocTableElement ParseTable(XElement el) => new(
        Attr(el, "source") ?? "ITEMS",
        el.Elements("column").Select(c => new DocColumn(
            Attr(c, "field") ?? "",
            Attr(c, "header"),
            Attr(c, "width"),
            Attr(c, "align"))).ToList(),
        Attr(el, "showHeader")?.ToLower() != "false",
        Attr(el, "showIf"));

    // ── Helpers ──────────────────────────────────────────────

    private static string? Attr(XElement el, string name) => el.Attribute(name)?.Value;

    private static float? ParseFloat(string? s)
    {
        if (s is null) return null;
        s = s.Replace("mm", "").Replace("px", "").Replace("pt", "");
        return float.TryParse(s, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var v) ? v : null;
    }

    private static string ResolvePageSizeName(float widthMm, float heightMm)
    {
        var (w, h) = (Math.Round(widthMm, 1), Math.Round(heightMm, 1));
        if (w == 210 && h == 297) return "A4";
        if (w == 148 && h == 210) return "A5";
        if (w == 215.9d && h == 279.4d) return "Letter";
        if (w == 215.9d && h == 355.6d) return "Legal";
        // Custom: use dimensions
        return $"{widthMm}x{heightMm}";
    }
}
