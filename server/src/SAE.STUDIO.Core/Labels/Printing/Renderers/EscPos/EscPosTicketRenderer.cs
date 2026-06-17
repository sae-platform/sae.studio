using SAE.STUDIO.Core.Labels.Helpers;
using SAE.STUDIO.Core.Labels.Modelos;
using SAE.STUDIO.Core.Labels.Printing.Document;
using SAE.STUDIO.Core.Labels.Printing.Renderers.Shared;

namespace SAE.STUDIO.Core.Labels.Printing.Renderers.EscPos;

public class EscPosTicketRenderer
{
    public byte[] Render(TicketDocument document)
    {
        var builder = new TicketBuilder(document.Width);

        foreach (var element in document.Elements)
        {
            RenderElement(element, builder, document.Width);
        }

        return builder.Build();
    }

    private void RenderElement(TicketElement element, TicketBuilder builder, int width)
    {
        switch (element)
        {
            case TextElement text:
                RenderText(text, builder, width);
                break;

            case SeparatorElement sep:
                builder.Separator(sep.Char);
                break;

            case TotalElement total:
                RenderTotal(total, builder, width);
                break;

            case QrElement qr:
                builder.QrCode(qr.Content, qr.Align, qr.ModuleSize);
                break;

            case FeedElement feed:
                builder.Feed(feed.Lines);
                break;

            case CutElement:
                builder.Cut();
                break;

            case BeepElement:
                builder.Beep();
                break;

            case OpenDrawerElement:
                builder.OpenDrawer();
                break;

            case EachRowElement row:
                RenderEachRow(row, builder, width);
                break;

            case ContainerElement container:
                foreach (var child in container.Children)
                    RenderElement(child, builder, width);
                break;

            case ImageElement img:
            {
                if (img.Source.StartsWith("data:") || img.Source.Length > 100)
                {
                    try
                    {
                        var base64 = img.Source;
                        if (base64.Contains(',')) base64 = base64.Split(',', 2)[1];
                        var imgBytes = Convert.FromBase64String(base64);
                        // Use raw bytes — bitmap rendering handled separately
                        builder.SendRaw(imgBytes);
                    }
                    catch { /* ignore invalid base64 */ }
                }
                break;
            }
        }
    }

    private void RenderText(TextElement text, TicketBuilder builder, int width)
    {
        // Check for emojis — render as bitmap if present
        if (EmojiRenderer.ContainsEmoji(text.Content))
        {
            var bmp = TextToBitmapRenderer.Render(text.Content, width * 10, "Segoe UI Emoji", 20, text.Align, text.Bold);
            var rasterBytes = EscPosRasterizer.Convert(bmp);
            builder.SendRaw(rasterBytes);
            builder.NewLine();
            return;
        }

        var rawLines = text.Content.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);
        foreach (var rl in rawLines)
        {
            var lines = WrapLine(rl, width, text.Size);
            foreach (var line in lines)
            {
                builder.TextPart(
                    PadStr(line, width, text.Align, text.Size),
                    text.Bold, text.Size, text.ExtraBold);
                builder.NewLine();
            }
        }
    }

    private void RenderTotal(TotalElement total, TicketBuilder builder, int width)
    {
        if (total.Align == TicketAlignment.Right || total.Align == TicketAlignment.Center)
        {
            var combined = $"{total.Label.TrimEnd()} {total.Value.TrimStart()}";
            var lines = WrapLine(combined, width, PrinterFontSize.Normal);
            foreach (var line in lines)
            {
                builder.TextPart(PadStr(line, width, total.Align), total.Bold, PrinterFontSize.Normal, total.ExtraBold);
                builder.NewLine();
            }
        }
        else
        {
            int valueLen = GetRealLength(total.Value);
            int labelWidth = Math.Max(5, width - valueLen);
            var labelLines = WrapLine(total.Label, labelWidth, PrinterFontSize.Normal);

            for (int i = 0; i < labelLines.Count; i++)
            {
                string line = labelLines[i];
                if (i == 0)
                {
                    builder.TextPart(PadStr(line, labelWidth, TicketAlignment.Left), total.Bold, PrinterFontSize.Normal, total.ExtraBold);
                    builder.TextPart(total.Value, total.Bold, PrinterFontSize.Normal, total.ExtraBold);
                }
                else
                {
                    builder.TextPart(PadStr(line, width, TicketAlignment.Left), total.Bold, PrinterFontSize.Normal, total.ExtraBold);
                }
                builder.NewLine();
            }
        }
    }

    private void RenderEachRow(EachRowElement row, TicketBuilder builder, int width)
    {
        var cols = row.Columns;
        int sep = Math.Max(0, cols.Count - 1);
        int totalWidth = 0;
        var widths = new List<int>();

        foreach (var col in cols)
        {
            var colWidth = Math.Max(1, col.Content.Length);
            widths.Add(colWidth);
            totalWidth += colWidth;
        }

        // Scale columns to fit available width
        if (totalWidth > width)
        {
            for (int i = 0; i < widths.Count; i++)
                widths[i] = Math.Max(1, widths[i] * width / totalWidth);
        }
        else
        {
            // Distribute remaining space to last auto-sized column
            widths[widths.Count - 1] += Math.Max(0, width - totalWidth - sep);
        }

        for (int i = 0; i < cols.Count; i++)
        {
            var col = cols[i];
            builder.TextPart(PadStr(col.Content, widths[i], col.Align), col.Bold, col.Size, col.ExtraBold);
            if (i < cols.Count - 1)
                builder.TextPart(" ");
        }
        builder.NewLine();
    }

    private static List<string> WrapLine(string text, int maxWidth, PrinterFontSize size)
    {
        var result = new List<string>();
        if (string.IsNullOrEmpty(text)) { result.Add(""); return result; }

        string currentLine = "";
        int currentLen = 0;
        var words = text.Split(' ');

        foreach (var word in words)
        {
            int wordLen = GetRealLength(word);
            int spaceLen = currentLen > 0 ? GetRealLength(" ") : 0;

            if (currentLen + spaceLen + wordLen <= maxWidth)
            {
                if (currentLen > 0) { currentLine += " "; currentLen += spaceLen; }
                currentLine += word;
                currentLen += wordLen;
            }
            else
            {
                if (!string.IsNullOrEmpty(currentLine))
                    result.Add(currentLine);

                if (wordLen > maxWidth)
                {
                    string remaining = word;
                    while (GetRealLength(remaining) > maxWidth)
                    {
                        int cut = maxWidth;
                        result.Add(remaining[..cut]);
                        remaining = remaining[cut..];
                    }
                    currentLine = remaining;
                    currentLen = GetRealLength(remaining);
                }
                else
                {
                    currentLine = word;
                    currentLen = wordLen;
                }
            }
        }

        if (!string.IsNullOrEmpty(currentLine))
            result.Add(currentLine);

        return result.Count > 0 ? result : new List<string> { "" };
    }

    private static int GetRealLength(string s)
    {
        if (string.IsNullOrEmpty(s)) return 0;
        int size = PrinterFontSize.Normal switch { _ => 1 };
        return s.Length; // Simplified: 1 char = 1 unit for monospace receipt
    }

    private static string PadStr(string s, int w, TicketAlignment a, PrinterFontSize size = PrinterFontSize.Normal)
    {
        int realLen = s.Length;
        if (realLen >= w) return s;
        int diff = w - realLen;
        return a switch
        {
            TicketAlignment.Center => new string(' ', diff / 2) + s + new string(' ', diff - diff / 2),
            TicketAlignment.Right => new string(' ', diff) + s,
            _ => s + new string(' ', diff)
        };
    }
}
