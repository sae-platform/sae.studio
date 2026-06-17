namespace SAE.STUDIO.Core.Labels.Printing.Contracts;

public interface ITicketPrintEngine
{
    Task<bool> PrintAsync(string xml, Dictionary<string, string> data,
        string printerName, int paperWidth, string docName);
}
