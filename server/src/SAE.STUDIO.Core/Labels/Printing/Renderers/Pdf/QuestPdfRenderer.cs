using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SAE.STUDIO.Core.Labels.Modelos;
using SAE.STUDIO.Core.Labels.Printing.Contracts;
using SAE.STUDIO.Core.Labels.Printing.Document;

namespace SAE.STUDIO.Core.Labels.Printing.Renderers.Pdf;

public class QuestPdfRenderer : IPdfRenderer
{
    private readonly IQrService _qrService;

    public QuestPdfRenderer(IQrService qrService)
    {
        _qrService = qrService;
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public byte[] RenderPdf(TicketDocument document)
    {
        int cols = document.Width > 0 ? document.Width : 42;
        // ~12 chars per cm on 80mm thermal paper; adjust font to fit
        float pageWidthMm = cols <= 32 ? 58 : 80;
        float pageHeightMm = Math.Min(600, document.Elements.Sum(e => e.EstimatedLines) * 4 + 20);

        return QuestPDF.Fluent.Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(pageWidthMm, pageHeightMm, Unit.Millimetre);
                page.Margin(3, Unit.Millimetre);
                page.DefaultTextStyle(TextStyle.Default
                    .FontFamily("Courier New")
                    .FontSize(cols <= 32 ? 8.5f : 8f)
                    .LineHeight(1.3f));

                page.Content().Column(col =>
                {
                    foreach (var element in document.Elements)
                    {
                        RenderElement(col, element, cols);
                    }
                });
            });
        }).GeneratePdf();
    }

    private void RenderElement(ColumnDescriptor col, TicketElement element, int cols)
    {
        switch (element)
        {
            case TextElement text:
                RenderText(col, text, cols);
                break;
            case SeparatorElement sep:
                col.Item().Text(new string(sep.Char, cols));
                break;
            case TotalElement total:
                RenderTotal(col, total, cols);
                break;
            case QrElement qr:
                RenderQr(col, qr, cols);
                break;
            case FeedElement feed:
                for (int i = 0; i < feed.Lines; i++)
                    col.Item().Text(" ");
                break;
            case CutElement:
                col.Item().PaddingVertical(1).LineHorizontal(0.5f).LineColor(Colors.Grey.Medium);
                break;
            case BeepElement:
                col.Item().Text(PadCols("*** BEEP ***", cols, TicketAlignment.Center)).FontColor(Colors.Orange.Darken2);
                break;
            case OpenDrawerElement:
                col.Item().Text(PadCols("*** ABRIR CAJÓN ***", cols, TicketAlignment.Center)).FontColor(Colors.Purple.Darken1);
                break;
            case EachRowElement row:
                RenderEachRow(col, row, cols);
                break;
            case ImageElement img:
                try
                {
                    if (img.Source.StartsWith("data:") || img.Source.Length > 50)
                    {
                        var base64 = img.Source;
                        if (base64.Contains(',')) base64 = base64.Split(',', 2)[1];
                        var imgBytes = Convert.FromBase64String(base64.Replace("\n", "").Replace("\r", ""));
                        col.Item().MaxWidth(Math.Min(img.Width, 200)).Image(imgBytes);
                    }
                    else
                    {
                        col.Item().Text($"[IMG: {img.Source}]").FontColor(Colors.Grey.Medium);
                    }
                }
                catch
                {
                    col.Item().Text("[IMG]").FontColor(Colors.Grey.Medium);
                }
                break;
            case ContainerElement container:
                foreach (var child in container.Children)
                    RenderElement(col, child, cols);
                break;
        }
    }

    private void RenderText(ColumnDescriptor col, TextElement text, int cols)
    {
        var lines = text.Content.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);
        foreach (var rawLine in lines)
        {
            var style = TextStyle.Default;
            if (text.Bold || text.ExtraBold) style = style.Bold();
            if (text.Size == PrinterFontSize.Large) style = style.FontSize(10);
            else if (text.Size == PrinterFontSize.ExtraLarge) style = style.FontSize(12);

            var plain = StripMarkdown(rawLine);
            var padded = PadCols(plain, cols, text.Align);

            col.Item().Text(padded).Style(style);
        }
    }

    private void RenderTotal(ColumnDescriptor col, TotalElement total, int cols)
    {
        var style = total.Bold ? TextStyle.Default.Bold() : TextStyle.Default;
        var combined = $"{total.Label.TrimEnd()} {total.Value.TrimStart()}";
        col.Item().Text(PadCols(combined, cols, total.Align)).Style(style);
    }

    private void RenderQr(ColumnDescriptor col, QrElement qr, int cols)
    {
        try
        {
            using var bmp = _qrService.Generate(qr.Content, 120);
            using var ms = new MemoryStream();
            bmp.Save(ms, System.Drawing.Imaging.ImageFormat.Png);
            var qrBytes = ms.ToArray();

            var offset = qr.Align switch
            {
                TicketAlignment.Center => (cols - 10) / 2,
                TicketAlignment.Right => cols - 10,
                _ => 0
            };

            col.Item().PaddingLeft((uint)(offset * 4)).MaxWidth(80).Image(qrBytes);
        }
        catch
        {
            col.Item().Text("[QR]").FontColor(Colors.Grey.Medium);
        }
    }

    private void RenderEachRow(ColumnDescriptor col, EachRowElement row, int cols)
    {
        var parts = row.Columns;
        if (parts.Count == 0) return;

        var rowText = "";
        for (int i = 0; i < parts.Count; i++)
        {
            var c = parts[i];
            var colWidth = i == parts.Count - 1
                ? cols - rowText.Length - 1
                : Math.Max(1, c.Content.Length + 1);
            rowText += PadCols(StripMarkdown(c.Content), colWidth, c.Align);
            if (i < parts.Count - 1) rowText += " ";
        }

        var style = TextStyle.Default;
        if (parts.Any(p => p.Bold)) style = style.Bold();

        col.Item().Text(rowText).Style(style);
    }

    private static string StripMarkdown(string text)
    {
        if (string.IsNullOrEmpty(text)) return text;
        return System.Text.RegularExpressions.Regex.Replace(text,
            @"\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|####([^#]+)####|###([^#]+)###|##([^#]+)##",
            m =>
            {
                for (int i = 1; i < m.Groups.Count; i++)
                    if (m.Groups[i].Success) return m.Groups[i].Value;
                return m.Value;
            });
    }

    private static string PadCols(string s, int w, TicketAlignment a)
    {
        if (s.Length >= w) return s;
        return a switch
        {
            TicketAlignment.Center => new string(' ', (w - s.Length) / 2) + s + new string(' ', w - s.Length - (w - s.Length) / 2),
            TicketAlignment.Right => new string(' ', w - s.Length) + s,
            _ => s + new string(' ', w - s.Length)
        };
    }
}
