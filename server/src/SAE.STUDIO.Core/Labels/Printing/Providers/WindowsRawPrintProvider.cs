using System.Runtime.InteropServices;
using SAE.STUDIO.Core.Labels.Helpers;
using SAE.STUDIO.Core.Labels.Printing.Contracts;

namespace SAE.STUDIO.Core.Labels.Printing.Providers;

/// <summary>Windows raw print provider using winspool.drv via RawPrinterHelper.</summary>
public class WindowsRawPrintProvider : IRawPrintProvider
{
    public Task PrintAsync(byte[] data, string printerName)
    {
        try
        {
            var ok = RawPrinterHelper.SendBytesToPrinter(printerName, data, "SaeTicket");
            return Task.FromResult(ok);
        }
        catch
        {
            return Task.FromResult(false);
        }
    }
}
