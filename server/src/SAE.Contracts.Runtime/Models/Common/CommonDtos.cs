namespace SAE.Contracts.Runtime.Models.Common;

public enum TemplateCategory
{
    Restaurant,
    Retail,
    Pharmacy,
    Hotel,
    Warehouse,
}

public sealed record TemplateInfo(
    string Name,
    TemplateCategory Category,
    string Description,
    int Version,
    string Checksum);

public sealed record LogicalPrinterInfo(
    string Code,
    string Name,
    string Purpose,
    string? PhysicalPrinter,
    bool IsActive);

public sealed record RuntimeError(
    string Code,
    string Message,
    string? Detail = null);
