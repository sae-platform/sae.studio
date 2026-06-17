using System.Diagnostics;
using SAE.STUDIO.Core.Labels.Printing.Contracts;

namespace SAE.STUDIO.Core.Labels.Printing.Providers;

/// <summary>macOS raw print provider using CUPS lp command (identical to Linux).</summary>
public class MacRawPrintProvider : IRawPrintProvider
{
    public async Task PrintAsync(byte[] data, string printerName)
    {
        try
        {
            var tempFile = Path.GetTempFileName();
            await File.WriteAllBytesAsync(tempFile, data);

            var psi = new ProcessStartInfo
            {
                FileName = "lp",
                Arguments = $"-d \"{printerName}\" -o raw \"{tempFile}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var proc = Process.Start(psi);
            if (proc == null) return;
            await proc.WaitForExitAsync();

            try { File.Delete(tempFile); } catch { }
        }
        catch { }
    }
}
