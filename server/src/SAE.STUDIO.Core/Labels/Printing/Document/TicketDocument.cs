namespace SAE.STUDIO.Core.Labels.Printing.Document;

public class TicketDocument
{
    public int Width { get; set; }
    public string? Printers { get; set; }
    public List<TicketElement> Elements { get; set; } = new();
}
