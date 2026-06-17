using SAE.STUDIO.Core.Labels.Printing.Contracts;
using SAE.STUDIO.Core.Labels.Printing.Document;

namespace SAE.STUDIO.Core.Labels.Printing.Contracts;

public interface ITicketRenderer<out TOutput>
{
    TOutput Render(TicketDocument document);
}

public interface IPdfRenderer
{
    byte[] RenderPdf(TicketDocument document);
}

public interface IRawPrintProvider
{
    Task PrintAsync(byte[] data, string printerName);
}

public interface IPrinterDiscoveryService
{
    List<Models.PrinterInfo> GetPrinters();
}
