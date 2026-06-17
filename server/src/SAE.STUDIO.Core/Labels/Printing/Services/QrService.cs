using System.Drawing;
using ZXing;
using ZXing.Common;
using ZXing.QrCode;
using SAE.STUDIO.Core.Labels.Printing.Contracts;

namespace SAE.STUDIO.Core.Labels.Printing.Services;

public class QrService : IQrService
{
    public Bitmap Generate(string content, int size)
    {
        var writer = new BarcodeWriter<Bitmap>
        {
            Format = BarcodeFormat.QR_CODE,
            Options = new QrCodeEncodingOptions
            {
                Width = size,
                Height = size,
                Margin = 1
            },
            Renderer = new ZXing.Windows.Compatibility.BitmapRenderer()
        };

        return writer.Write(string.IsNullOrWhiteSpace(content) ? "https://example.com" : content);
    }
}
