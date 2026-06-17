using System.Diagnostics;
using System.Runtime.InteropServices;
using SAE.STUDIO.Core.Labels.Printing.Contracts;
using SAE.STUDIO.Core.Labels.Printing.Models;

namespace SAE.STUDIO.Core.Labels.Printing.Services;

public class PrinterDiscoveryService : IPrinterDiscoveryService
{
    private readonly PrinterCapabilitiesService _capabilities;

    public PrinterDiscoveryService(PrinterCapabilitiesService capabilities)
    {
        _capabilities = capabilities;
    }

    public List<PrinterInfo> GetPrinters()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            return GetWindowsPrinters();

        return GetLinuxPrinters();
    }

    private List<PrinterInfo> GetWindowsPrinters()
    {
        var printers = new List<PrinterInfo>();
        try
        {
            // Use System.Drawing.Printing (already referenced)
            foreach (string name in System.Drawing.Printing.PrinterSettings.InstalledPrinters)
            {
                printers.Add(new PrinterInfo
                {
                    Name = name,
                    Type = _capabilities.GetPrinterType(name),
                    IsDefault = IsDefaultPrinter(name)
                });
            }
        }
        catch
        {
            // Fallback: empty list
        }
        return printers;
    }

    private List<PrinterInfo> GetLinuxPrinters()
    {
        var printers = new List<PrinterInfo>();
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "lpstat",
                Arguments = "-p",
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var proc = Process.Start(psi);
            if (proc == null) return printers;

            var output = proc.StandardOutput.ReadToEnd();
            proc.WaitForExit();

            // Parse lpstat -p output: "printer NAME is idle..."
            foreach (var line in output.Split('\n', StringSplitOptions.RemoveEmptyEntries))
            {
                if (line.StartsWith("printer "))
                {
                    var parts = line.Split(' ');
                    if (parts.Length >= 2)
                    {
                        var name = parts[1].TrimEnd('.');
                        printers.Add(new PrinterInfo
                        {
                            Name = name,
                            Type = _capabilities.GetPrinterType(name),
                            IsDefault = line.Contains("default")
                        });
                    }
                }
            }
        }
        catch
        {
            // Fallback: empty list
        }
        return printers;
    }

    private static bool IsDefaultPrinter(string name)
    {
        try
        {
            var settings = new System.Drawing.Printing.PrinterSettings();
            return string.Equals(settings.PrinterName, name, StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            return false;
        }
    }
}
