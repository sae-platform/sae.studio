namespace SAE.Contracts.Runtime.Models.Print;

using SAE.Contracts.Runtime.Models.Common;

public sealed record PrintRequest(
    string Template,
    string LogicalPrinter,
    Dictionary<string, object?> Data,
    int Copies = 1);

public sealed record PrintResponse(
    bool Success,
    string? PhysicalPrinter,
    long ExecutionTimeMs,
    RuntimeError? Error = null);
