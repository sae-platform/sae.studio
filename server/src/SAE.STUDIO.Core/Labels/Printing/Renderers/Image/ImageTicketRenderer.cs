using SkiaSharp;
using SAE.STUDIO.Core.Labels.Modelos;
using SAE.STUDIO.Core.Labels.Printing.Contracts;
using SAE.STUDIO.Core.Labels.Printing.Document;

namespace SAE.STUDIO.Core.Labels.Printing.Renderers.Image;

public class ImageTicketRenderer : ITicketRenderer<SKBitmap>
{
    private readonly IQrService _qrService;

    public ImageTicketRenderer(IQrService qrService)
    {
        _qrService = qrService;
    }

    public SKBitmap Render(TicketDocument document)
    {
        int cols = document.Width > 0 ? document.Width : 42;
        float fontSize = 16f;
        float charWidth = fontSize * 0.55f;
        float lineHeight = fontSize * 1.4f;
        float padding = 16f;

        int totalLines = document.Elements.Sum(e => e.EstimatedLines) + 5;
        float contentWidth = cols * charWidth;
        float totalWidth = contentWidth + padding * 2;
        float totalHeight = totalLines * lineHeight + padding * 2;

        int w = (int)Math.Ceiling(totalWidth);
        int h = (int)Math.Ceiling(totalHeight);

        using var surface = SKSurface.Create(new SKImageInfo(w, h));
        var canvas = surface.Canvas;
        canvas.Clear(SKColors.White);

        using var paint = new SKPaint
        {
            Color = SKColors.Black,
            IsAntialias = true,
            TextSize = fontSize,
            Typeface = SKTypeface.FromFamilyName("Courier New")
        };

        float yPos = padding;
        foreach (var element in document.Elements)
        {
            yPos += RenderElement(canvas, element, paint, padding, yPos, cols, charWidth, lineHeight);
        }

        return SKBitmap.FromImage(surface.Snapshot());
    }

    private float RenderElement(SKCanvas canvas, TicketElement element, SKPaint paint,
        float x, float y, int cols, float charWidth, float lineHeight)
    {
        switch (element)
        {
            case TextElement text:
                return RenderText(canvas, text, paint, x, y, cols, charWidth, lineHeight);

            case SeparatorElement sep:
                canvas.DrawText(new string(sep.Char, cols), x, y + lineHeight * 0.8f, paint);
                return lineHeight;

            case TotalElement total:
                var combined = $"{total.Label.TrimEnd()} {total.Value.TrimStart()}";
                paint.FakeBoldText = total.Bold || total.ExtraBold;
                canvas.DrawText(PadCols(combined, cols, total.Align), x, y + lineHeight * 0.8f, paint);
                paint.FakeBoldText = false;
                return lineHeight;

            case QrElement qr:
                try
                {
                    using var bmp = _qrService.Generate(qr.Content, 120);
                    // Convert System.Drawing bitmap to SKBitmap
                    using var ms = new MemoryStream();
                    bmp.Save(ms, System.Drawing.Imaging.ImageFormat.Png);
                    ms.Position = 0;
                    using var skBmp = SKBitmap.Decode(ms);
                    var size = Math.Min(80, cols * charWidth * 0.4f);
                    var qrX = qr.Align switch
                    {
                        TicketAlignment.Center => x + (cols * charWidth - size) / 2,
                        TicketAlignment.Right => x + cols * charWidth - size,
                        _ => x
                    };
                    canvas.DrawBitmap(skBmp, new SKRect(qrX, y, qrX + size, y + size));
                    return size + 4;
                }
                catch
                {
                    canvas.DrawText("[QR]", x, y + lineHeight * 0.8f, paint);
                    return lineHeight;
                }

            case FeedElement feed:
                return lineHeight * feed.Lines;

            case CutElement:
                paint.Color = SKColors.Gray;
                canvas.DrawLine(x, y + 4, x + cols * charWidth, y + 4, paint);
                paint.Color = SKColors.Black;
                return lineHeight;

            case BeepElement:
                paint.Color = new SKColor(180, 100, 20);
                canvas.DrawText(PadCols("*** BEEP ***", cols, TicketAlignment.Center), x, y + lineHeight * 0.8f, paint);
                paint.Color = SKColors.Black;
                return lineHeight;

            case OpenDrawerElement:
                paint.Color = new SKColor(100, 30, 180);
                canvas.DrawText(PadCols("*** ABRIR CAJÓN ***", cols, TicketAlignment.Center), x, y + lineHeight * 0.8f, paint);
                paint.Color = SKColors.Black;
                return lineHeight;

            case EachRowElement row:
                return RenderEachRow(canvas, row, paint, x, y, cols, charWidth, lineHeight);

            case ContainerElement container:
                float containerHeight = 0;
                foreach (var child in container.Children)
                    containerHeight += RenderElement(canvas, child, paint, x, y + containerHeight, cols, charWidth, lineHeight);
                return containerHeight;

            default:
                return 0;
        }
    }

    private float RenderText(SKCanvas canvas, TextElement text, SKPaint paint,
        float x, float y, int cols, float charWidth, float lineHeight)
    {
        var lines = text.Content.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);
        float total = 0;
        paint.FakeBoldText = text.Bold || text.ExtraBold;
        if (text.Size == PrinterFontSize.Large) paint.TextSize = 20f;
        else if (text.Size == PrinterFontSize.ExtraLarge) paint.TextSize = 24f;

        foreach (var line in lines)
        {
            var plain = StripMarkdown(line);
            canvas.DrawText(PadCols(plain, cols, text.Align), x, y + total + lineHeight * 0.8f, paint);
            total += lineHeight;
        }

        paint.TextSize = 16f;
        paint.FakeBoldText = false;
        return total;
    }

    private float RenderEachRow(SKCanvas canvas, EachRowElement row, SKPaint paint,
        float x, float y, int cols, float charWidth, float lineHeight)
    {
        var parts = row.Columns;
        if (parts.Count == 0) return lineHeight;

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

        paint.FakeBoldText = parts.Any(p => p.Bold);
        canvas.DrawText(rowText, x, y + lineHeight * 0.8f, paint);
        paint.FakeBoldText = false;
        return lineHeight;
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
