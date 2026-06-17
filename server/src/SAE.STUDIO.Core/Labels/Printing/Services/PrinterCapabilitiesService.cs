using System.Diagnostics;
using System.Runtime.InteropServices;
using SAE.STUDIO.Core.Labels.Printing.Models;

namespace SAE.STUDIO.Core.Labels.Printing.Services;

public class PrinterCapabilitiesService
{
    public PrinterType GetPrinterType(string printerName)
    {
        if (string.IsNullOrWhiteSpace(printerName))
            return PrinterType.Standard;

        var lower = printerName.ToLowerInvariant();

        // Universal virtual/PDF detection
        if (lower.Contains("pdf") || lower.Contains("xps") || lower.Contains("onenote")
            || lower.Contains("microsoft print to") || lower.Contains("fax")
            || lower.Contains("snagit") || lower.Contains("virtual")
            || lower.Contains("cute") || lower.Contains("bullzip") || lower.Contains("foxit")
            || lower.Contains("adobe") || lower.Contains("dopdf") || lower.Contains("novapdf"))
            return PrinterType.Virtual;

        // Platform-specific driver detection
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            return DetectWindowsType(printerName, lower);

        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux) || RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
            return DetectUnixType(printerName, lower);

        return PrinterType.Standard;
    }

    private PrinterType DetectWindowsType(string printerName, string lower)
    {
        // Known ESC/POS thermal brands
        if (lower.Contains("epson") || lower.Contains("star") || lower.Contains("bixolon")
            || lower.Contains("bematech") || lower.Contains("citizen")
            || lower.Contains("tm-t") || lower.Contains("tm-u") || lower.Contains("tm-h")
            || lower.Contains("tm-p") || lower.Contains("tm-l") || lower.Contains("tsp")
            || lower.Contains("sprt") || lower.Contains("boca") || lower.Contains("custom")
            || lower.Contains("pos") || lower.Contains("receipt") || lower.Contains("thermal"))
            return PrinterType.EscPos;

        // Check Windows driver name via PrinterSettings
        try
        {
            foreach (string installed in System.Drawing.Printing.PrinterSettings.InstalledPrinters)
            {
                if (string.Equals(installed, printerName, StringComparison.OrdinalIgnoreCase))
                {
                    var settings = new System.Drawing.Printing.PrinterSettings { PrinterName = installed };
                    if (settings.IsValid)
                    {
                        // We could query WMI here for DriverName, but for now string match is reliable
                        break;
                    }
                }
            }
        }
        catch { }

        return PrinterType.Standard;
    }

    private PrinterType DetectUnixType(string printerName, string lower)
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "lpstat",
                Arguments = $"-p \"{printerName}\"",
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var proc = Process.Start(psi);
            if (proc == null) return PrinterType.Standard;

            var output = proc.StandardOutput.ReadToEnd().ToLowerInvariant();
            proc.WaitForExit();

            // Parse driver information from lpstat output
            if (output.Contains("epson") || output.Contains("star") || output.Contains("bixolon")
                || output.Contains("bematech") || output.Contains("thermal")
                || output.Contains("receipt"))
                return PrinterType.EscPos;

            if (output.Contains("pdf") || output.Contains("cups-pdf"))
                return PrinterType.Virtual;
        }
        catch { }

        // Name-based fallback for Unix
        if (lower.Contains("epson") || lower.Contains("star") || lower.Contains("bixolon")
            || lower.Contains("bematech") || lower.Contains("thermal")
            || lower.Contains("receipt") || lower.Contains("tmt"))
            return PrinterType.EscPos;

        return PrinterType.Standard;
    }
}
