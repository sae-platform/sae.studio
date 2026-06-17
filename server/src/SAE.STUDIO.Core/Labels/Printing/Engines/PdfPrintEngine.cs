using SAE.STUDIO.Core.Labels.Printing.Contracts;
using SAE.STUDIO.Core.Labels.Printing.Parsers;
using SAE.STUDIO.Core.Labels.Printing.Runtime;

namespace SAE.STUDIO.Core.Labels.Printing.Engines;

public class PdfPrintEngine : ITicketPrintEngine
{
    private readonly TicketXmlParser _parser;
    private readonly TicketRuntimeEngine _runtime;
    private readonly IPdfRenderer _renderer;

    public PdfPrintEngine(
        TicketXmlParser parser,
        TicketRuntimeEngine runtime,
        IPdfRenderer renderer)
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
            var pdfBytes = _renderer.RenderPdf(resolved);

            // Save to temp file and open, or return bytes
            var path = Path.Combine(Path.GetTempPath(), $"{docName}_{DateTime.Now:yyyyMMddHHmmss}.pdf");
            await File.WriteAllBytesAsync(path, pdfBytes);

            // Open with default PDF viewer
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
