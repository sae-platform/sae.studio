using SAE.STUDIO.Core.Labels.Printing.Contracts;
using SAE.STUDIO.Core.Labels.Printing.Engines;
using SAE.STUDIO.Core.Labels.Printing.Models;

namespace SAE.STUDIO.Core.Labels.Printing.Services;

public class TicketPrintResolver
{
    private readonly PrinterCapabilitiesService _capabilities;
    private readonly ITicketPrintEngine _escPosEngine;
    private readonly ITicketPrintEngine _pdfEngine;

    public TicketPrintResolver(
        PrinterCapabilitiesService capabilities,
        EscPosPrintEngine escPosEngine,
        PdfPrintEngine pdfEngine)
    {
        _capabilities = capabilities;
        _escPosEngine = escPosEngine;
        _pdfEngine = pdfEngine;
    }

    public ITicketPrintEngine Resolve(string printerName)
    {
        var type = _capabilities.GetPrinterType(printerName);
        return type switch
        {
            PrinterType.EscPos => _escPosEngine,
            _ => _pdfEngine
        };
    }
}
