namespace SAE.Contracts.Runtime.Models.Export;

using SAE.Contracts.Runtime.Models.Common;

public sealed record PdfExportRequest(
    string Template,
    Dictionary<string, object?> Data);

public sealed record PdfExportResponse(
    string FileName,
    string ContentType,
    string PdfBase64,
    RuntimeError? Error = null);

public sealed record EscPosExportRequest(
    string Template,
    Dictionary<string, object?> Data);

public sealed record EscPosExportResponse(
    string Hex,
    string Base64,
    RuntimeError? Error = null);
