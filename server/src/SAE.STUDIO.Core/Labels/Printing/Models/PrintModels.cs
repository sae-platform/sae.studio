namespace SAE.STUDIO.Core.Labels.Printing.Models;

public enum PrintTarget { Auto, PhysicalPrinter, PdfFile, Preview }

public enum RenderFormat { EscPos, Pdf, Image }

public enum PrinterType { EscPos, Pdf, Standard, Virtual }

public class PrinterInfo
{
    public string Name { get; set; } = "";
    public PrinterType Type { get; set; }
    public bool IsDefault { get; set; }
}
