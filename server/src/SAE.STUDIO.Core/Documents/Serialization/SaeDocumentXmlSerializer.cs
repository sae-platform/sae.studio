#nullable enable
using System.Globalization;
using System.Xml.Linq;
using SAE.STUDIO.Core.Documents.Elements;

namespace SAE.STUDIO.Core.Documents.Serialization;

/// <summary>
/// Bidirectional XML serializer for SaeDocumentModel.
/// Parse:     SaeDocumentXmlSerializer.Parse(xmlString) → SaeDocumentModel
/// Serialize: SaeDocumentXmlSerializer.Serialize(model) → xmlString
/// </summary>
public static class SaeDocumentXmlSerializer
{
    // ── Helpers ──────────────────────────────────────────────

    private static string? A(XElement el, string name)      => el.Attribute(name)?.Value;
    private static string  AR(XElement el, string name)     => el.Attribute(name)?.Value ?? "";
    private static decimal AD(XElement el, string name, decimal fallback = 0)
    {
        var v = el.Attribute(name)?.Value;
        return v is not null && decimal.TryParse(v, NumberStyles.Any, CultureInfo.InvariantCulture, out var d) ? d : fallback;
    }
    private static bool AB(XElement el, string name, bool fallback = false)
    {
        var v = el.Attribute(name)?.Value;
        return v is null ? fallback : v is "true" or "1";
    }

    private static XAttribute? Attr(string name, string? value)
        => value is not null and not "" ? new XAttribute(name, value) : null;
    private static XAttribute? Attr(string name, decimal? value)
        => value.HasValue ? new XAttribute(name, value.Value.ToString(CultureInfo.InvariantCulture)) : null;
    private static XAttribute? Attr(string name, bool value)
        => value ? new XAttribute(name, "true") : null;
    private static XAttribute? Attr(string name, int? value)
        => value.HasValue ? new XAttribute(name, value.Value) : null;

    // ── PARSE ─────────────────────────────────────────────────

    public static SaeDocumentModel Parse(string xml)
    {
        var doc = XDocument.Parse(xml.Trim());
        var root = doc.Root ?? throw new InvalidOperationException("No root element.");
        if (root.Name.LocalName != "saedocument")
            throw new InvalidOperationException("Root must be <saedocument>.");

        return new SaeDocumentModel
        {
            Version    = AR(root, "version"),
            Metadata   = ParseMetadata(root.Element("metadata")),
            DataSources = ParseDataSources(root.Element("datasources")),
            Assets     = ParseAssets(root.Element("assets")),
            Variables  = ParseVariables(root.Element("variables")),
            Pages      = root.Elements("page").Select(ParsePage).ToList(),
        };
    }

    private static DocumentMetadata? ParseMetadata(XElement? el)
    {
        if (el is null) return null;
        return new DocumentMetadata
        {
            Title    = A(el, "title"),
            Author   = A(el, "author"),
            Subject  = A(el, "subject"),
            Keywords = A(el, "keywords"),
            Created  = A(el, "created"),
            Version  = A(el, "version") ?? "2.0",
        };
    }

    private static List<DataSourceDef> ParseDataSources(XElement? el) =>
        el?.Elements("datasource").Select(d => new DataSourceDef
        {
            Name       = AR(d, "name"),
            Type       = A(d, "type") ?? "manual",
            Columns    = A(d, "columns")?.Split(',').Select(s => s.Trim()).ToList() ?? [],
            SampleData = A(d, "sampleData"),
        }).ToList() ?? [];

    private static List<AssetDef> ParseAssets(XElement? el) =>
        el?.Elements("asset").Select(a => new AssetDef
        {
            Id     = A(a, "id") ?? Guid.NewGuid().ToString(),
            Name   = AR(a, "name"),
            Type   = A(a, "type") ?? "image",
            Source = AR(a, "source"),
        }).ToList() ?? [];

    private static List<VariableDef> ParseVariables(XElement? el) =>
        el?.Elements("variable").Select(v => new VariableDef
        {
            Name      = AR(v, "name"),
            Type      = A(v, "type") ?? "text",
            Initial   = A(v, "initial"),
            Increment = A(v, "increment"),
            Step      = int.TryParse(A(v, "step"), out var s) ? s : null,
        }).ToList() ?? [];

    private static PageDef ParsePage(XElement el)
    {
        var layersEl = el.Element("layers");
        return new PageDef
        {
            Id     = A(el, "id") ?? Guid.NewGuid().ToString(),
            Width  = AD(el, "width", 210),
            Height = AD(el, "height", 297),
            Unit   = A(el, "unit") ?? "mm",
            Header = ParseBand(el.Element("header"), BandType.Header),
            Body   = ParseBand(el.Element("body"),   BandType.Body),
            Footer = ParseBand(el.Element("footer"),  BandType.Footer),
            Layers = ParseLayers(layersEl),
        };
    }

    private static List<LayerDef> ParseLayers(XElement? el)
    {
        if (el is null) return [new LayerDef { Id = "default", Name = "Content", ZIndex = 0 }];
        var list = el.Elements("layer").Select((l, i) => new LayerDef
        {
            Id      = A(l, "id") ?? Guid.NewGuid().ToString(),
            Name    = A(l, "name") ?? $"Layer {i + 1}",
            Visible = AB(l, "visible", true),
            Locked  = AB(l, "locked"),
            ZIndex  = (int)AD(l, "zIndex", i),
        }).ToList();
        return list.Count > 0 ? list : [new LayerDef { Id = "default", Name = "Content" }];
    }

    private static BandDef? ParseBand(XElement? el, BandType type)
    {
        if (el is null) return null;
        decimal defaultH = type switch { BandType.Header => 40, BandType.Footer => 35, _ => 180 };
        return new BandDef
        {
            Id       = A(el, "id") ?? Guid.NewGuid().ToString(),
            Type     = type,
            Height   = AD(el, "height", defaultH),
            CanGrow  = AB(el, "canGrow", type == BandType.Body),
            CanShrink = AB(el, "canShrink"),
            Elements = ParseElements(el),
        };
    }

    private static readonly HashSet<string> ElementTags =
    [
        "text","image","line","rectangle","ellipse",
        "barcode","qr","table","total","subtotal","variable",
        "panel","group","if","repeat","pagebreak","sectionbreak",
    ];

    private static List<DocumentElementBase> ParseElements(XElement container) =>
        container.Elements()
            .Where(e => ElementTags.Contains(e.Name.LocalName))
            .Select(ParseElement)
            .OfType<DocumentElementBase>()
            .ToList();

    private static DocumentElementBase? ParseElement(XElement el)
    {
        var id = A(el, "id") ?? Guid.NewGuid().ToString();
        var x  = AD(el, "x"); var y = AD(el, "y");
        decimal? w = el.Attribute("width") is not null ? AD(el, "width") : null;
        decimal? h = el.Attribute("height") is not null ? AD(el, "height") : null;

        DocumentElementBase Base(DocumentElementBase b) => b with
        {
            ShowIf  = A(el, "showIf"),
            LayerId = A(el, "layerId"),
            Locked  = AB(el, "locked"),
            Hidden  = AB(el, "hidden"),
            Preset  = A(el, "preset"),
            Anchor  = A(el, "anchor")?.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(s => Enum.TryParse<Anchor>(s.Trim(), ignoreCase: true, out var a) ? a : (Anchor?)null).OfType<Anchor>().ToArray() ?? [],
        };

        return el.Name.LocalName switch
        {
            "text" => Base(new TextElement
            {
                Id = id, X = x, Y = y, Width = w, Height = h,
                Content   = el.Value.Trim(),
                Font      = A(el, "font"),
                Size      = el.Attribute("size") is not null ? AD(el, "size") : null,
                Bold      = AB(el, "bold"),
                Italic    = AB(el, "italic"),
                Underline = AB(el, "underline"),
                Align     = A(el, "align"),
                Color     = A(el, "color"),
            }),

            "image" => Base(new ImageElement
            {
                Id = id, X = x, Y = y, Width = w, Height = h,
                Source = AR(el, "source"),
                Fit    = A(el, "fit"),
            }),

            "line" => Base(new LineElement
            {
                Id = id, X = x, Y = y, Width = w, Height = h,
                X1 = AD(el, "x1"), Y1 = AD(el, "y1"),
                X2 = AD(el, "x2"), Y2 = AD(el, "y2"),
                Color     = A(el, "color"),
                LineWidth = el.Attribute("lineWidth") is not null ? AD(el, "lineWidth") : null,
            }),

            "rectangle" => Base(new RectangleElement
            {
                Id = id, X = x, Y = y, Width = w, Height = h,
                FillColor   = A(el, "fillColor"),
                BorderColor = A(el, "borderColor"),
                BorderWidth = el.Attribute("borderWidth") is not null ? AD(el, "borderWidth") : null,
                BorderRadius = el.Attribute("borderRadius") is not null ? AD(el, "borderRadius") : null,
            }),

            "ellipse" => Base(new EllipseElement
            {
                Id = id, X = x, Y = y, Width = w, Height = h,
                FillColor   = A(el, "fillColor"),
                BorderColor = A(el, "borderColor"),
                BorderWidth = el.Attribute("borderWidth") is not null ? AD(el, "borderWidth") : null,
            }),

            "barcode" => Base(new BarcodeElement
            {
                Id = id, X = x, Y = y, Width = w, Height = h,
                Value    = AR(el, "value"),
                Kind     = A(el, "kind"),
                ShowText = AB(el, "showText", true),
            }),

            "qr" => Base(new QrElement
            {
                Id = id, X = x, Y = y, Width = w, Height = h,
                Value      = AR(el, "value"),
                Size       = el.Attribute("size") is not null ? AD(el, "size") : null,
                ErrorLevel = A(el, "errorLevel"),
            }),

            "table" => Base(new TableElement
            {
                Id = id, X = x, Y = y, Width = w, Height = h,
                Source      = AR(el, "source"),
                ShowHeader  = AB(el, "showHeader", true),
                StripeColor = A(el, "stripeColor"),
                HeaderColor = A(el, "headerColor"),
                HeaderTextColor = A(el, "headerTextColor"),
                Columns = el.Elements("column").Select(c => new TableColumnDef
                {
                    Field  = AR(c, "field"),
                    Header = A(c, "header"),
                    Width  = A(c, "width"),
                    Align  = A(c, "align"),
                    Format = A(c, "format"),
                }).ToList(),
            }),

            "total" => Base(new TotalElement
            {
                Id = id, X = x, Y = y, Width = w, Height = h,
                Label  = A(el, "label"), Field = AR(el, "field"),
                Format = A(el, "format"), Font = A(el, "font"),
                Size   = el.Attribute("size") is not null ? AD(el, "size") : null,
                Bold   = AB(el, "bold"), Align = A(el, "align"), Color = A(el, "color"),
            }),

            "subtotal" => Base(new SubtotalElement
            {
                Id = id, X = x, Y = y, Width = w, Height = h,
                Label  = A(el, "label"), Field = AR(el, "field"),
                Format = A(el, "format"), Font = A(el, "font"),
                Size   = el.Attribute("size") is not null ? AD(el, "size") : null,
                Bold   = AB(el, "bold"), Align = A(el, "align"), Color = A(el, "color"),
            }),

            "variable" => Base(new VariableElement
            {
                Id = id, X = x, Y = y, Width = w, Height = h,
                VariableName = AR(el, "variableName"),
                Font = A(el, "font"),
                Size = el.Attribute("size") is not null ? AD(el, "size") : null,
                Bold = AB(el, "bold"), Align = A(el, "align"), Color = A(el, "color"),
            }),

            "panel" => Base(new PanelElement
            {
                Id = id, X = x, Y = y, Width = w, Height = h,
                Elements    = ParseElements(el),
                FillColor   = A(el, "fillColor"),
                BorderColor = A(el, "borderColor"),
                BorderWidth  = el.Attribute("borderWidth")  is not null ? AD(el, "borderWidth")  : null,
                BorderRadius = el.Attribute("borderRadius") is not null ? AD(el, "borderRadius") : null,
            }),

            "group" => Base(new GroupElement
            {
                Id = id, X = x, Y = y, Width = w, Height = h,
                Elements = ParseElements(el),
            }),

            "if" => Base(new IfElement
            {
                Id = id, X = x, Y = y, Width = w, Height = h,
                Condition    = AR(el, "condition"),
                ThenElements = el.Element("then") is XElement then ? ParseElements(then) : ParseElements(el),
                ElseElements = el.Element("else") is XElement els ? ParseElements(els) : null,
            }),

            "repeat" => Base(new RepeatElement
            {
                Id = id, X = x, Y = y, Width = w, Height = h,
                Source    = AR(el, "source"),
                Elements  = ParseElements(el),
                Direction = A(el, "direction"),
                Gap       = el.Attribute("gap") is not null ? AD(el, "gap") : null,
            }),

            "pagebreak"    => Base(new PageBreakElement    { Id = id, X = x, Y = y }),
            "sectionbreak" => Base(new SectionBreakElement { Id = id, X = x, Y = y }),

            _ => null,
        };
    }

    // ── SERIALIZE ─────────────────────────────────────────────

    public static string Serialize(SaeDocumentModel model)
    {
        var root = new XElement("saedocument",
            new XAttribute("version", model.Version));

        // Metadata
        var meta = new XElement("metadata");
        if (model.Metadata is not null)
        {
            if (model.Metadata.Title    is not null) meta.Add(new XAttribute("title",    model.Metadata.Title));
            if (model.Metadata.Author   is not null) meta.Add(new XAttribute("author",   model.Metadata.Author));
            if (model.Metadata.Subject  is not null) meta.Add(new XAttribute("subject",  model.Metadata.Subject));
            if (model.Metadata.Keywords is not null) meta.Add(new XAttribute("keywords", model.Metadata.Keywords));
            if (model.Metadata.Created  is not null) meta.Add(new XAttribute("created",  model.Metadata.Created));
            meta.Add(new XAttribute("version", model.Metadata.Version));
        }
        root.Add(meta);

        // DataSources
        var ds = new XElement("datasources");
        foreach (var d in model.DataSources)
            ds.Add(new XElement("datasource",
                new XAttribute("name", d.Name),
                new XAttribute("type", d.Type),
                d.Columns.Count > 0 ? new XAttribute("columns", string.Join(",", d.Columns)) : null,
                d.SampleData is not null ? new XAttribute("sampleData", d.SampleData) : null));
        root.Add(ds);

        // Assets
        var assets = new XElement("assets");
        foreach (var a in model.Assets)
            assets.Add(new XElement("asset",
                new XAttribute("id", a.Id), new XAttribute("name", a.Name),
                new XAttribute("type", a.Type), new XAttribute("source", a.Source)));
        root.Add(assets);

        // Variables
        var vars = new XElement("variables");
        foreach (var v in model.Variables)
            vars.Add(new XElement("variable",
                new XAttribute("name", v.Name), new XAttribute("type", v.Type),
                Attr("initial", v.Initial), Attr("increment", v.Increment), Attr("step", v.Step)));
        root.Add(vars);

        // Pages
        foreach (var page in model.Pages)
            root.Add(SerializePage(page));

        return new XDocument(
            new XDeclaration("1.0", "utf-8", null),
            root).ToString();
    }

    private static XElement SerializePage(PageDef page)
    {
        var el = new XElement("page",
            new XAttribute("id",     page.Id),
            new XAttribute("width",  page.Width.ToString(CultureInfo.InvariantCulture)),
            new XAttribute("height", page.Height.ToString(CultureInfo.InvariantCulture)),
            new XAttribute("unit",   page.Unit));

        if (page.Layers.Count > 0)
        {
            var layers = new XElement("layers");
            foreach (var l in page.Layers)
                layers.Add(new XElement("layer",
                    new XAttribute("id",      l.Id),
                    new XAttribute("name",    l.Name),
                    new XAttribute("visible", l.Visible.ToString().ToLower()),
                    Attr("locked",  l.Locked),
                    new XAttribute("zIndex",  l.ZIndex)));
            el.Add(layers);
        }

        if (page.Header is not null) el.Add(SerializeBand(page.Header));
        if (page.Body   is not null) el.Add(SerializeBand(page.Body));
        if (page.Footer is not null) el.Add(SerializeBand(page.Footer));
        return el;
    }

    private static XElement SerializeBand(BandDef band)
    {
        var el = new XElement(band.Type.ToString().ToLower(),
            new XAttribute("id",     band.Id),
            new XAttribute("height", band.Height.ToString(CultureInfo.InvariantCulture)),
            Attr("canGrow",   band.CanGrow),
            Attr("canShrink", band.CanShrink));
        foreach (var item in band.Elements)
        {
            var child = SerializeElement(item);
            if (child is not null) el.Add(child);
        }
        return el;
    }

    private static decimal V(decimal d) => d;
    private static string S(decimal d) => d.ToString(CultureInfo.InvariantCulture);

    private static XElement? SerializeElement(DocumentElementBase item)
    {
        var el = new XElement(item.Type,
            new XAttribute("id", item.Id),
            new XAttribute("x",  S(item.X)),
            new XAttribute("y",  S(item.Y)),
            Attr("width",   item.Width),
            Attr("height",  item.Height),
            Attr("showIf",  item.ShowIf),
            Attr("layerId", item.LayerId),
            Attr("locked",  item.Locked),
            Attr("hidden",  item.Hidden),
            Attr("preset",  item.Preset),
            Attr("anchor",  item.Anchor is { Length: > 0 } ? string.Join(",", item.Anchor) : null));

        switch (item)
        {
            case TextElement t:
                el.Add(Attr("font",      t.Font), Attr("size",      t.Size),
                       Attr("bold",      t.Bold), Attr("italic",    t.Italic),
                       Attr("underline", t.Underline), Attr("align", t.Align),
                       Attr("color",     t.Color));
                el.Value = t.Content;
                break;

            case ImageElement img:
                el.Add(new XAttribute("source", img.Source), Attr("fit", img.Fit));
                break;

            case LineElement line:
                el.Add(new XAttribute("x1", S(line.X1)), new XAttribute("y1", S(line.Y1)),
                       new XAttribute("x2", S(line.X2)), new XAttribute("y2", S(line.Y2)),
                       Attr("color", line.Color), Attr("lineWidth", line.LineWidth));
                break;

            case RectangleElement r:
                el.Add(Attr("fillColor",    r.FillColor),   Attr("borderColor", r.BorderColor),
                       Attr("borderWidth",  r.BorderWidth), Attr("borderRadius", r.BorderRadius));
                break;

            case EllipseElement e:
                el.Add(Attr("fillColor",   e.FillColor),  Attr("borderColor", e.BorderColor),
                       Attr("borderWidth", e.BorderWidth));
                break;

            case BarcodeElement bc:
                el.Add(new XAttribute("value", bc.Value), Attr("kind", bc.Kind),
                       Attr("showText", bc.ShowText));
                break;

            case QrElement qr:
                el.Add(new XAttribute("value", qr.Value), Attr("size", qr.Size),
                       Attr("errorLevel", qr.ErrorLevel));
                break;

            case TableElement tbl:
                el.Add(new XAttribute("source", tbl.Source),
                       Attr("showHeader", tbl.ShowHeader),
                       Attr("stripeColor", tbl.StripeColor),
                       Attr("headerColor", tbl.HeaderColor),
                       Attr("headerTextColor", tbl.HeaderTextColor));
                foreach (var col in tbl.Columns)
                    el.Add(new XElement("column",
                        new XAttribute("field", col.Field),
                        Attr("header", col.Header), Attr("width", col.Width),
                        Attr("align",  col.Align),  Attr("format", col.Format)));
                break;

            case TotalElement tot:
                el.Add(Attr("label", tot.Label), new XAttribute("field", tot.Field),
                       Attr("format", tot.Format), Attr("font", tot.Font),
                       Attr("size", tot.Size), Attr("bold", tot.Bold),
                       Attr("align", tot.Align), Attr("color", tot.Color));
                break;

            case SubtotalElement sub:
                el.Add(Attr("label", sub.Label), new XAttribute("field", sub.Field),
                       Attr("format", sub.Format), Attr("font", sub.Font),
                       Attr("size", sub.Size), Attr("bold", sub.Bold),
                       Attr("align", sub.Align), Attr("color", sub.Color));
                break;

            case VariableElement v:
                el.Add(new XAttribute("variableName", v.VariableName),
                       Attr("font", v.Font), Attr("size", v.Size),
                       Attr("bold", v.Bold), Attr("align", v.Align), Attr("color", v.Color));
                break;

            case PanelElement p:
                el.Add(Attr("fillColor",    p.FillColor),   Attr("borderColor", p.BorderColor),
                       Attr("borderWidth",  p.BorderWidth), Attr("borderRadius", p.BorderRadius));
                foreach (var child in p.Elements) { var c = SerializeElement(child); if (c is not null) el.Add(c); }
                break;

            case GroupElement g:
                foreach (var child in g.Elements) { var c = SerializeElement(child); if (c is not null) el.Add(c); }
                break;

            case IfElement ife:
                el.Add(new XAttribute("condition", ife.Condition));
                var thenEl = new XElement("then");
                foreach (var child in ife.ThenElements) { var c = SerializeElement(child); if (c is not null) thenEl.Add(c); }
                el.Add(thenEl);
                if (ife.ElseElements is { Count: > 0 })
                {
                    var elseEl = new XElement("else");
                    foreach (var child in ife.ElseElements) { var c = SerializeElement(child); if (c is not null) elseEl.Add(c); }
                    el.Add(elseEl);
                }
                break;

            case RepeatElement rep:
                el.Add(new XAttribute("source", rep.Source),
                       Attr("direction", rep.Direction), Attr("gap", rep.Gap));
                foreach (var child in rep.Elements) { var c = SerializeElement(child); if (c is not null) el.Add(c); }
                break;
        }

        return el;
    }
}
