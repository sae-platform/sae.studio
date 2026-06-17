using SAE.STUDIO.Core.Labels.Printing.Contracts;
using SAE.STUDIO.Core.Labels.Printing.Parsers;
using SAE.STUDIO.Core.Labels.Printing.Renderers.EscPos;
using SAE.STUDIO.Core.Labels.Printing.Runtime;

namespace SAE.STUDIO.Core.Labels.Printing.Engines;

public class EscPosPrintEngine : ITicketPrintEngine
{
    private readonly TicketXmlParser _parser;
    private readonly TicketRuntimeEngine _runtime;
    private readonly EscPosTicketRenderer _renderer;
    private readonly IRawPrintProvider _rawPrintProvider;

    public EscPosPrintEngine(
        TicketXmlParser parser,
        TicketRuntimeEngine runtime,
        EscPosTicketRenderer renderer,
        IRawPrintProvider rawPrintProvider)
    {
        _parser = parser;
        _runtime = runtime;
        _renderer = renderer;
        _rawPrintProvider = rawPrintProvider;
    }

    public async Task<bool> PrintAsync(string xml, Dictionary<string, string> data,
        string printerName, int paperWidth, string docName)
    {
        try
        {
            var ctx = new DocumentContext { Variables = data.ToDictionary(kv => kv.Key, kv => (object?)kv.Value) };
            var document = _parser.Parse(xml);
            var resolved = _runtime.Process(document, ctx);
            var bytes = _renderer.Render(resolved);

            await _rawPrintProvider.PrintAsync(bytes, printerName);
            return true;
        }
        catch
        {
            return false;
        }
    }
}
