namespace SAE.Contracts.Runtime.Models.Preview;

using SAE.Contracts.Runtime.Models.Common;

public sealed record PreviewRequest(
    string Template,
    Dictionary<string, object?> Data);

public sealed record PreviewResponse(
    string ImageBase64,
    int Width,
    int Height,
    RuntimeError? Error = null);
