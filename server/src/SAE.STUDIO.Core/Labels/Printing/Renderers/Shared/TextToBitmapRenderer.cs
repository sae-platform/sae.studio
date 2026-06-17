using SkiaSharp;
using SAE.STUDIO.Core.Labels.Modelos;

namespace SAE.STUDIO.Core.Labels.Printing.Renderers.Shared;

/// <summary>Renders text to SKBitmap using SkiaSharp. Cross-platform, emoji-capable.</summary>
public static class TextToBitmapRenderer
{
    public static SKBitmap Render(string text, int width, string fontFamily = "Arial", int fontSize = 20,
        TicketAlignment alignment = TicketAlignment.Left, bool bold = false)
    {
        using var typeface = SKTypeface.FromFamilyName(fontFamily);
        using var paint = new SKPaint
        {
            Typeface = typeface,
            TextSize = fontSize,
            IsAntialias = true,
            FakeBoldText = bold,
            Color = SKColors.Black
        };

        var align = alignment switch
        {
            TicketAlignment.Center => SKTextAlign.Center,
            TicketAlignment.Right => SKTextAlign.Right,
            _ => SKTextAlign.Left
        };

        // Measure text height
        var bounds = new SKRect();
        paint.MeasureText(text, ref bounds);

        float lineHeight = paint.FontSpacing;
        int height = (int)Math.Ceiling(lineHeight) + 10;
        if (height < 10) height = 10;

        var bmp = new SKBitmap(width, height);
        using var canvas = new SKCanvas(bmp);
        canvas.Clear(SKColors.White);

        float x = alignment switch
        {
            TicketAlignment.Center => width / 2f,
            TicketAlignment.Right => width - 4,
            _ => 4
        };
        float y = lineHeight * 0.85f;

        paint.TextAlign = align;
        canvas.DrawText(text, x, y, paint);
        return bmp;
    }
}
