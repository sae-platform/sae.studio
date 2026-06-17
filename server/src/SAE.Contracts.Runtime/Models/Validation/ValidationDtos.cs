namespace SAE.Contracts.Runtime.Models.Validation;

using SAE.Contracts.Runtime.Models.Common;

public sealed record ValidateRequest(
    string Template,
    Dictionary<string, object?> Data);

public sealed record ValidateResponse(
    bool Valid,
    List<string> Errors,
    List<string> Warnings,
    RuntimeError? Error = null);
