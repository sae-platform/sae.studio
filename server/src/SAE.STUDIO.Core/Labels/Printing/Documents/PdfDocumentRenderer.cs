using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SAE.STUDIO.Core.Labels.Printing.Contracts;

namespace SAE.STUDIO.Core.Labels.Printing.Documents;

/// <summary>
/// Renders a SaeDocument to PDF bytes using QuestPDF.
/// Supports A4, Letter, and custom page sizes with headers, body tables, and footers.
/// </summary>
public sealed class PdfDocumentRenderer
{
    private readonly IQrService _qrService;
    private readonly ZxingBarcodeProvider _barcodeProvider;

    public PdfDocumentRenderer(IQrService qrService, ZxingBarcodeProvider barcodeProvider)
    {
        _qrService = qrService;
        _barcodeProvider = barcodeProvider;
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public byte[] Render(SaeDocument doc, Dictionary<string, object?> data)
    {
        var pageSize = ResolvePageSize(doc.PageSize, doc.Orientation);
        var headerSections = doc.Elements.OfType<DocInvoiceSection>().Where(s => s.Name == "header").ToList();
        var footerSections = doc.Elements.OfType<DocInvoiceSection>().Where(s => s.Name == "footer").ToList();
        var contentElements = doc.Elements.Where(e => e is not DocInvoiceSection s || (s.Name != "header" && s.Name != "footer")).ToList();

        return global::QuestPDF.Fluent.Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(pageSize);
                page.MarginTop(doc.MarginTop, Unit.Millimetre);
                page.MarginBottom(doc.MarginBottom, Unit.Millimetre);
                page.MarginLeft(doc.MarginLeft, Unit.Millimetre);
                page.MarginRight(doc.MarginRight, Unit.Millimetre);

                // Repeating header
                if (headerSections.Count > 0)
                {
                    page.Header().Column(hdrCol =>
                    {
                        foreach (var hs in headerSections)
                            RenderSection(hdrCol, hs, data);
                    });
                }

                // Repeating footer
                if (footerSections.Count > 0)
                {
                    page.Footer().Column(ftrCol =>
                    {
                        foreach (var fs in footerSections)
                            RenderSection(ftrCol, fs, data);
                    });
                }

                // Render watermarks as foreground overlay
                if (doc.Watermarks.Count > 0)
                {
                    page.Foreground().Padding(0).AlignCenter().AlignMiddle().Column(wmCol =>
                    {
                        foreach (var wm in doc.Watermarks)
                        {
                            if (wm.Text is not null)
                                wmCol.Item().Text(wm.Text).FontSize(48).FontColor(Colors.Grey.Lighten3);
                        }
                    });
                }

                // Content (auto-paginates by QuestPDF)
                page.Content().Column(column =>
                {
                    foreach (var element in contentElements)
                    {
                        if (element is DocInvoiceSection section)
                            RenderSection(column, section, data);
                        else
                            RenderElement(column.Item(), element, data);
                    }
                });
            });
        }).GeneratePdf();
    }

    private void RenderSection(ColumnDescriptor column, DocInvoiceSection section, Dictionary<string, object?> data)
    {
        foreach (var el in section.Elements)
        {
            RenderElement(column.Item(), el, data);
        }
    }

    private void RenderElement(QuestPDF.Infrastructure.IContainer container, DocElement element, Dictionary<string, object?> data)
    {
        switch (element)
        {
            case DocTextElement t:
                var c = container;
                if (t.PX.HasValue) c = c.PaddingLeft(t.PX.Value, Unit.Millimetre);
                if (t.PWidth.HasValue) c = c.Width(t.PWidth.Value, Unit.Millimetre);
                var text = c.Text(t.Content);
                if (t.Align == "center") text.AlignCenter();
                else if (t.Align == "right") text.AlignRight();
                if (t.Bold) text.Bold();
                if (t.Italic) text.Italic();
                if (t.Underline) text.Underline();
                if (t.Strikethrough) text.Strikethrough();
                if (t.Size.HasValue) text.FontSize(t.Size.Value);
                if (t.Color is not null) text.FontColor(t.Color);
                if (t.Font is not null) text.FontFamily(t.Font);
                if (t.BackgroundColor is not null) text.BackgroundColor(t.BackgroundColor);
                if (t.LineHeight.HasValue) text.LineHeight(t.LineHeight.Value);
                if (t.LetterSpacing.HasValue) text.LetterSpacing(t.LetterSpacing.Value);
                break;

            case DocLineElement:
                container.PaddingVertical(2).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
                break;

            case DocSpacerElement s:
                container.Height(s.Height, Unit.Millimetre);
                break;

            case DocTableElement tbl:
                RenderTable(container, tbl, data);
                break;

            case DocQrElement qr:
                var qrBytes = GenerateQrImage(qr.Content);
                if (qrBytes is not null)
                {
                    var qrAlign = qr.Align == "center" ? container.AlignCenter() :
                                  qr.Align == "right" ? container.AlignRight() : container;
                    var qrContainer = qrAlign;
                    if (qr.Size > 0)
                        qrContainer = qrContainer.Width(qr.Size, Unit.Millimetre).Height(qr.Size, Unit.Millimetre);
                    qrContainer.Image(qrBytes).FitArea();
                }
                break;

            case DocImageElement img:
                var imgBytes = data.TryGetValue(img.Source, out var imgData) ? imgData as byte[] : null;
                if (imgBytes is not null)
                    container.Image(imgBytes).FitWidth();
                break;

            case DocRectangleElement rect:
                var rc = container;
                if (rect.PWidth.HasValue) rc = rc.Width(rect.PWidth.Value, Unit.Millimetre);
                if (rect.PHeight.HasValue) rc = rc.Height(rect.PHeight.Value, Unit.Millimetre);
                if (rect.FillColor is not null) rc = rc.Background(rect.FillColor);
                if (rect.BorderColor is not null)
                    rc = rc.Border(rect.BorderWidth ?? 0.5f).BorderColor(rect.BorderColor);
                break;

            case DocEllipseElement ellipse:
                var ew = ellipse.PWidth ?? ellipse.PHeight ?? 30;
                var eh = ellipse.PHeight ?? ellipse.PWidth ?? 30;
                var fill = ellipse.FillColor ?? "#FFFFFF";
                var strokeClr = ellipse.BorderColor ?? "transparent";
                var sw = ellipse.BorderWidth ?? 0;
                var rx = ew / 2f - sw / 2f;
                var ry = eh / 2f - sw / 2f;

                var ellipseSvg = $@"<svg width=""{ew}mm"" height=""{eh}mm"" xmlns=""http://www.w3.org/2000/svg"">
  <ellipse cx=""{ew / 2f}mm"" cy=""{eh / 2f}mm"" rx=""{rx}mm"" ry=""{ry}mm""
    fill=""{fill}"" stroke=""{strokeClr}"" stroke-width=""{sw}mm""/>
</svg>";
                container
                    .Width(ew, Unit.Millimetre)
                    .Height(eh, Unit.Millimetre)
                    .Svg(ellipseSvg);
                break;

            case DocBarcodeElement bc:
                var bw = bc.PWidth ?? 55;
                var bh = bc.PHeight ?? 18;
                var kind = bc.Kind ?? "Code128";
                var wPx = (int)(bw * 3.78f);
                var hPx = (int)(bh * 3.78f);
                var svg = _barcodeProvider.GenerateSvg(kind, bc.Content, wPx, hPx, bc.ShowText ? 1 : 0);
                container
                    .Width(bw, Unit.Millimetre)
                    .Height(bh, Unit.Millimetre)
                    .Svg(svg);
                break;
        }
    }

    private void RenderTable(QuestPDF.Infrastructure.IContainer container, DocTableElement table, Dictionary<string, object?> data)
    {
        var rows = GetTableData(table.Source, data, table.Columns.Count);
        if (rows.Count == 0) return;

        container.Table(tbl =>
        {
            tbl.ColumnsDefinition(cols =>
            {
                foreach (var c in table.Columns)
                {
                    if (float.TryParse(c.Width?.Replace("mm", "").Replace("*", "100"), out var w))
                        cols.ConstantColumn(w, Unit.Millimetre);
                    else
                        cols.RelativeColumn();
                }
            });

            if (table.ShowHeader)
            {
                tbl.Header(header =>
                {
                    header.Cell().Background(Colors.Grey.Lighten3);
                    foreach (var c in table.Columns)
                    {
                        var cell = header.Cell().Padding(3).Text(c.Header ?? c.Field);
                        if (c.Align == "right") cell.AlignRight();
                        else if (c.Align == "center") cell.AlignCenter();
                        cell.Bold().FontSize(9);
                    }
                });
            }

            foreach (var row in rows)
            {
                foreach (var c in table.Columns)
                {
                    var val = row.TryGetValue(c.Field, out var v) ? v?.ToString() ?? "" : "";
                    var cell = tbl.Cell().Padding(2).Text(val).FontSize(8);
                    if (c.Align == "right") cell.AlignRight();
                    else if (c.Align == "center") cell.AlignCenter();
                }
            }
        });
    }

    private List<Dictionary<string, object?>> GetTableData(string source, Dictionary<string, object?> data, int cols)
    {
        var result = new List<Dictionary<string, object?>>();
        if (!data.TryGetValue($"{source}_COUNT", out var countObj)) return result;
        var count = Convert.ToInt32(countObj);

        for (var i = 0; i < count; i++)
        {
            var row = new Dictionary<string, object?>();
            for (var j = 0; j < 50; j++) // scan up to 50 columns per row
            {
                var key = $"{source}_{i}";
                var matching = data.Keys.Where(k => k.StartsWith($"{key}_"));
                foreach (var mk in matching)
                {
                    var field = mk.Substring(key.Length + 1);
                    row[field] = data[mk];
                }
            }
            if (row.Count > 0) result.Add(row);
        }
        return result;
    }

    private byte[]? GenerateQrImage(string content)
    {
        try
        {
            using var bitmap = _qrService.Generate(content, 300);
            using var ms = new MemoryStream();
            bitmap.Save(ms, System.Drawing.Imaging.ImageFormat.Png);
            return ms.ToArray();
        }
        catch { return null; }
    }

    private static PageSize ResolvePageSize(string size, string orientation)
    {
        var isLandscape = orientation?.ToLower() == "landscape";

        // Try standard sizes
        var baseSize = size?.ToUpper() switch
        {
            "LETTER" or "CARTA" => PageSizes.Letter,
            "LEGAL" or "OFICIO" => PageSizes.Legal,
            "A5" => PageSizes.A5,
            "A3" => PageSizes.A3,
            "A4" => PageSizes.A4,
            _ => null
        };

        if (baseSize is not null)
            return isLandscape ? baseSize.Landscape() : baseSize.Portrait();

        // Try custom size like "210x297" or "80x297"
        var match = System.Text.RegularExpressions.Regex.Match(size ?? "A4", @"^(\d+\.?\d*)\s*x\s*(\d+\.?\d*)$", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        if (match.Success && float.TryParse(match.Groups[1].Value, out var w) && float.TryParse(match.Groups[2].Value, out var h))
        {
            if (isLandscape) (w, h) = (h, w);
            return new PageSize(w, h, Unit.Millimetre);
        }

        // Fallback to A4
        var a4 = PageSizes.A4;
        return isLandscape ? a4.Landscape() : a4.Portrait();
    }
}
