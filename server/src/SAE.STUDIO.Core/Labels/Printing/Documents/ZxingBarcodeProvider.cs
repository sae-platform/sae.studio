using ZXing;
using ZXing.Common;
using SkiaSharp;

namespace SAE.STUDIO.Core.Labels.Printing.Documents;

/// <summary>
/// Generates barcode/QR images using ZXing.Net.
/// Supports: Code128, Code39, EAN13, EAN8, UPC-A, UPC-E, ITF, QR, PDF417, DataMatrix, Aztec.
/// </summary>
public sealed class ZxingBarcodeProvider
{
    public byte[] GenerateBytes(string symbology, string content, int width, int height, int margin = 1)
    {
        var format = ResolveFormat(symbology);
        using var bitmap = GenerateBitmap(format, content, width, height, margin);
        using var ms = new MemoryStream();
        bitmap.Encode(ms, SKEncodedImageFormat.Png, 100);
        return ms.ToArray();
    }

    public string GenerateSvg(string symbology, string content, int width = 200, int height = 80, int margin = 1)
    {
        var format = ResolveFormat(symbology);
        using var bitmap = GenerateBitmap(format, content, width, height, margin);
        var rects = new System.Text.StringBuilder();
        var pix = bitmap.Pixels;
        var w = bitmap.Width;
        var h = bitmap.Height;

        // Scan for black pixels and convert to SVG rects
        rects.AppendLine($"<svg width=\"{width}\" height=\"{height}\" xmlns=\"http://www.w3.org/2000/svg\">");
        rects.AppendLine($"  <rect x=\"0\" y=\"0\" width=\"{width}\" height=\"{height}\" fill=\"white\"/>");

        for (int y = 0; y < h; y++)
        {
            int runStart = -1;
            for (int x = 0; x < w; x++)
            {
                var pixel = pix[y * w + x];
                var isBlack = IsDark(pixel);
                if (isBlack && runStart < 0) runStart = x;
                else if (!isBlack && runStart >= 0)
                {
                    var runW = (x - runStart) * width / (float)w;
                    var runY = y * height / (float)h;
                    var runH = height / (float)h + 1;
                    rects.AppendLine($"  <rect x=\"{runStart * width / (float)w:F1}\" y=\"{runY:F1}\" width=\"{runW:F1}\" height=\"{runH:F1}\" fill=\"black\"/>");
                    runStart = -1;
                }
            }
            if (runStart >= 0)
            {
                var runW = (w - runStart) * width / (float)w;
                var runY = y * height / (float)h;
                var runH = height / (float)h + 1;
                rects.AppendLine($"  <rect x=\"{runStart * width / (float)w:F1}\" y=\"{runY:F1}\" width=\"{runW:F1}\" height=\"{runH:F1}\" fill=\"black\"/>");
            }
        }

        rects.AppendLine("</svg>");
        return rects.ToString();
    }

    private static SKBitmap GenerateBitmap(BarcodeFormat format, string content, int width, int height, int margin)
    {
        var writer = new BarcodeWriter<SKBitmap>
        {
            Format = format,
            Options = new EncodingOptions
            {
                Width = width,
                Height = height,
                Margin = margin,
                PureBarcode = false,
            },
            Renderer = new ZXing.SkiaSharp.Rendering.SKBitmapRenderer(),
        };
        return writer.Write(content);
    }

    private static bool IsDark(SKColor pixel)
    {
        return pixel.Red < 128 || pixel.Green < 128 || pixel.Blue < 128;
    }

    private static BarcodeFormat ResolveFormat(string symbology)
    {
        return (symbology?.ToUpperInvariant()) switch
        {
            "CODE128" or "CODE-128" => BarcodeFormat.CODE_128,
            "CODE39" or "CODE-39" => BarcodeFormat.CODE_39,
            "EAN13" or "EAN-13" => BarcodeFormat.EAN_13,
            "EAN8" or "EAN-8" => BarcodeFormat.EAN_8,
            "UPCA" or "UPC-A" => BarcodeFormat.UPC_A,
            "UPCE" or "UPC-E" => BarcodeFormat.UPC_E,
            "ITF" => BarcodeFormat.ITF,
            "QR" or "QRCODE" => BarcodeFormat.QR_CODE,
            "PDF417" => BarcodeFormat.PDF_417,
            "DATAMATRIX" => BarcodeFormat.DATA_MATRIX,
            "AZTEC" => BarcodeFormat.AZTEC,
            "CODABAR" => BarcodeFormat.CODABAR,
            _ => BarcodeFormat.CODE_128,
        };
    }
}
