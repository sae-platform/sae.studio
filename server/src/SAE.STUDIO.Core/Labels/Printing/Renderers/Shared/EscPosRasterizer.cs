using SkiaSharp;

namespace SAE.STUDIO.Core.Labels.Printing.Renderers.Shared;

/// <summary>Converts a bitmap to ESC/POS raster image bytes using GS v 0 command.</summary>
public static class EscPosRasterizer
{
    public static byte[] Convert(SKBitmap bitmap)
    {
        int width = bitmap.Width;
        int height = bitmap.Height;

        // Luminance buffer
        var pixels = new float[width, height];
        for (int y = 0; y < height; y++)
        for (int x = 0; x < width; x++)
        {
            var c = bitmap.GetPixel(x, y);
            pixels[x, y] = c.Red * 0.299f + c.Green * 0.587f + c.Blue * 0.114f;
            if (c.Alpha < 128) pixels[x, y] = 255;
        }

        // Floyd-Steinberg dithering
        for (int y = 0; y < height; y++)
        for (int x = 0; x < width; x++)
        {
            float old = pixels[x, y];
            float newVal = old < 128 ? 0 : 255;
            pixels[x, y] = newVal;
            float err = old - newVal;

            if (x + 1 < width) pixels[x + 1, y] += err * 7f / 16f;
            if (x - 1 >= 0 && y + 1 < height) pixels[x - 1, y + 1] += err * 3f / 16f;
            if (y + 1 < height) pixels[x, y + 1] += err * 5f / 16f;
            if (x + 1 < width && y + 1 < height) pixels[x + 1, y + 1] += err * 1f / 16f;
        }

        // Pad width to multiple of 8
        int padW = width;
        if (padW % 8 != 0) padW += 8 - padW % 8;

        var bytes = new System.Collections.Generic.List<byte>();

        // GS v 0 command
        bytes.Add(0x1D); bytes.Add(0x76); bytes.Add(0x30); bytes.Add(0x00);
        bytes.Add((byte)(padW / 8)); bytes.Add(0x00);
        bytes.Add((byte)(height & 0xFF)); bytes.Add((byte)((height >> 8) & 0xFF));

        for (int y = 0; y < height; y++)
        for (int x = 0; x < padW; x += 8)
        {
            byte b = 0;
            for (int bit = 0; bit < 8; bit++)
            {
                int px = x + bit;
                if (px < width && pixels[px, y] < 128)
                    b |= (byte)(1 << (7 - bit));
            }
            bytes.Add(b);
        }

        return bytes.ToArray();
    }
}
