using System.Xml.Linq;

namespace SAE.STUDIO.Core.Labels.Printing.Documents;

/// <summary>
/// Parses <saedocument> XML into SaeDocument domain model.
/// </summary>
public sealed class SaeDocumentParser
{
    public SaeDocument Parse(string xml)
    {
        var doc = XDocument.Parse(xml);
        var root = doc.Root ?? throw new InvalidDataException("Missing root element");
        if (root.Name.LocalName != "saedocument")
            throw new InvalidDataException("Root element must be <saedocument>");

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
        _ => new DocSpacerElement(0) // skip unknown
    };

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

    private static string? Attr(XElement el, string name) => el.Attribute(name)?.Value;
    private static float? ParseFloat(string? s) => s is not null && float.TryParse(s.Replace("mm", "").Replace("px", ""), out var v) ? v : null;
}
