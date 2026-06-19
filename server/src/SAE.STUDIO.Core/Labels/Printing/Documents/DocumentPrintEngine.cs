using System.Diagnostics;

namespace SAE.STUDIO.Core.Labels.Printing.Documents;

/// <summary>
/// Print engine — sends rendered PDFs to physical printers.
/// Uses platform-specific commands: Windows PrintTo, Linux lp, macOS lpr.
/// </summary>
public sealed class DocumentPrintEngine
{
    /// <summary>
    /// Print PDF bytes to the specified printer.
    /// </summary>
    public async Task<bool> PrintAsync(byte[] pdfBytes, string printerName, int copies = 1, string? paperSize = null)
    {
        if (pdfBytes.Length == 0) return false;

        var tempFile = Path.Combine(Path.GetTempPath(), $"sae_print_{Guid.NewGuid():N}.pdf");
        try
        {
            await File.WriteAllBytesAsync(tempFile, pdfBytes);

            if (OperatingSystem.IsWindows())
                return PrintWindows(tempFile, printerName, copies);
            else if (OperatingSystem.IsLinux())
                return await PrintLinuxAsync(tempFile, printerName, copies);
            else if (OperatingSystem.IsMacOS())
                return PrintMac(tempFile, printerName, copies);

            return false;
        }
        finally
        {
            try { File.Delete(tempFile); } catch { }
        }
    }

    private static bool PrintWindows(string filePath, string printerName, int copies)
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "print",
                Arguments = $"/D:\"{printerName}\" \"{filePath}\"",
                CreateNoWindow = true,
                UseShellExecute = false,
            };
            using var process = Process.Start(psi);
            process?.WaitForExit(5000);
            return true;
        }
        catch { return false; }
    }

    private static async Task<bool> PrintLinuxAsync(string filePath, string printerName, int copies)
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "lp",
                Arguments = $"-d \"{printerName}\" -n {copies} \"{filePath}\"",
                CreateNoWindow = true,
                UseShellExecute = false,
            };
            using var process = Process.Start(psi);
            if (process is not null)
                await process.WaitForExitAsync();
            return process?.ExitCode == 0;
        }
        catch { return false; }
    }

    private static bool PrintMac(string filePath, string printerName, int copies)
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "lpr",
                Arguments = $"-P \"{printerName}\" -# {copies} \"{filePath}\"",
                CreateNoWindow = true,
                UseShellExecute = false,
            };
            using var process = Process.Start(psi);
            process?.WaitForExit(5000);
            return true;
        }
        catch { return false; }
    }

    /// <summary>
    /// List available printers on the system.
    /// </summary>
    public static List<string> GetPrinters()
    {
        var printers = new List<string>();
        try
        {
            if (OperatingSystem.IsWindows())
            {
                using var process = Process.Start(new ProcessStartInfo
                {
                    FileName = "wmic",
                    Arguments = "printer get name",
                    RedirectStandardOutput = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                });
                if (process is not null)
                {
                    var output = process.StandardOutput.ReadToEnd();
                    process.WaitForExit();
                    foreach (var line in output.Split('\n'))
                    {
                        var trimmed = line.Trim();
                        if (!string.IsNullOrEmpty(trimmed) && !trimmed.Equals("Name", StringComparison.OrdinalIgnoreCase))
                            printers.Add(trimmed);
                    }
                }
            }
            else
            {
                // Linux/macOS
                using var process = Process.Start(new ProcessStartInfo
                {
                    FileName = "lpstat",
                    Arguments = "-p -d",
                    RedirectStandardOutput = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                });
                if (process is not null)
                {
                    var output = process.StandardOutput.ReadToEnd();
                    process.WaitForExit();
                    foreach (var line in output.Split('\n'))
                    {
                        var trimmed = line.Trim();
                        if (trimmed.StartsWith("printer "))
                            printers.Add(trimmed.Substring(8).Trim());
                    }
                }
            }
        }
        catch { }
        return printers;
    }
}
