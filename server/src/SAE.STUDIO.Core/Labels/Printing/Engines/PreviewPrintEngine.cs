using SkiaSharp;
using SAE.STUDIO.Core.Labels.Printing.Contracts;
using SAE.STUDIO.Core.Labels.Printing.Parsers;
using SAE.STUDIO.Core.Labels.Printing.Renderers.Image;
using SAE.STUDIO.Core.Labels.Printing.Runtime;

namespace SAE.STUDIO.Core.Labels.Printing.Engines;

/// <summary>
/// Generates a PNG image preview of the ticket.
/// Useful for embeddable previews, email attachments, and non-PDF scenarios.
/// </summary>
public class PreviewPrintEngine : ITicketPrintEngine
{
    private readonly TicketXmlParser _parser;
    private readonly TicketRuntimeEngine _runtime;
    private readonly ImageTicketRenderer _renderer;

    public PreviewPrintEngine(
        TicketXmlParser parser,
        TicketRuntimeEngine runtime,
        ImageTicketRenderer renderer)
    {
        _parser = parser;
        _runtime = runtime;
        _renderer = renderer;
    }

    public async Task<bool> PrintAsync(string xml, Dictionary<string, string> data,
        string printerName, int paperWidth, string docName)
    {
        try
        {
            var ctx = new DocumentContext { Variables = data.ToDictionary(kv => kv.Key, kv => (object?)kv.Value) };
            var document = _parser.Parse(xml);
            var resolved = _runtime.Process(document, ctx);

            using var bitmap = _renderer.Render(resolved);
            using var image = SKImage.FromBitmap(bitmap);
            using var png = image.Encode(SKEncodedImageFormat.Png, 90);

            var path = Path.Combine(Path.GetTempPath(), $"{docName}_preview_{DateTime.Now:yyyyMMddHHmmss}.png");
            await File.WriteAllBytesAsync(path, png.ToArray());

            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
            {
                FileName = path,
                UseShellExecute = true
            });

            return true;
        }
        catch
        {
            return false;
        }
    }
}
