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

    public PdfDocumentRenderer(IQrService qrService)
    {
        _qrService = qrService;
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public byte[] Render(SaeDocument doc, Dictionary<string, object?> data)
    {
        var pageSize = ResolvePageSize(doc.PageSize, doc.Orientation);

        return global::QuestPDF.Fluent.Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(pageSize);
                page.MarginTop(doc.MarginTop, Unit.Millimetre);
                page.MarginBottom(doc.MarginBottom, Unit.Millimetre);
                page.MarginLeft(doc.MarginLeft, Unit.Millimetre);
                page.MarginRight(doc.MarginRight, Unit.Millimetre);

                page.Content().Column(column =>
                {
                    foreach (var element in doc.Elements)
                    {
                        // Flatten sections
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
            RenderElement(column.Item(), el, data);
    }

    private void RenderElement(QuestPDF.Infrastructure.IContainer container, DocElement element, Dictionary<string, object?> data)
    {
        switch (element)
        {
            case DocTextElement t:
                var text = container.Text(t.Content);
                if (t.Align == "center") text.AlignCenter();
                else if (t.Align == "right") text.AlignRight();
                if (t.Bold) text.Bold();
                if (t.Size.HasValue) text.FontSize(t.Size.Value);
                break;

            case DocLineElement:
                container.PaddingVertical(5).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
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
                    qrAlign.Image(qrBytes);
                }
                break;

            case DocImageElement img:
                var imgBytes = data.TryGetValue(img.Source, out var imgData) ? imgData as byte[] : null;
                if (imgBytes is not null)
                    container.Image(imgBytes).FitWidth();
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
        var baseSize = size.ToUpper() switch
        {
            "LETTER" or "CARTA" => PageSizes.Letter,
            "LEGAL" or "OFICIO" => PageSizes.Legal,
            "A5" => PageSizes.A5,
            "A3" => PageSizes.A3,
            _ => PageSizes.A4,
        };
        return isLandscape ? baseSize.Landscape() : baseSize.Portrait();
    }
}
