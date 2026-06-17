using Microsoft.AspNetCore.Mvc;
using SAE.Contracts.Runtime.Models.Print;
using SAE.Contracts.Runtime.Models.Preview;
using SAE.Contracts.Runtime.Models.Export;
using SAE.Contracts.Runtime.Models.Validation;
using SAE.Contracts.Runtime.Models.Common;
using SAE.STUDIO.Api.Services;
using SAE.STUDIO.Core.Labels.Printing.Services;
using SAE.STUDIO.Core.Labels.Printing.Engines;
using SAE.STUDIO.Core.Labels.Printing.Renderers.EscPos;
using SAE.STUDIO.Core.Labels.Printing.Renderers.Pdf;
using SAE.STUDIO.Core.Labels.Printing.Contracts;
using SAE.STUDIO.Core.Labels.Printing.Renderers.Image;
using SAE.STUDIO.Core.Labels.Printing.Parsers;
using SAE.STUDIO.Core.Labels.Printing.Runtime;
using SAE.STUDIO.Core.Labels.Printing.Documents;
using SAE.STUDIO.Core.Labels.Servicios;

namespace SAE.STUDIO.Api.Controllers;

[ApiController]
[Tags("Runtime")]
[Route("api/v1/runtime")]
public sealed class RuntimeController : ControllerBase
{
    private readonly TemplateRepository _templates;
    private readonly TicketPrintResolver _resolver;
    private readonly TicketXmlParser _parser;
    private readonly TicketRuntimeEngine _runtime;
    private readonly EscPosTicketRenderer _escPosRenderer;
    private readonly ImageTicketRenderer _imageRenderer;
    private readonly IPdfRenderer _pdfRenderer;
    private readonly ILogicalPrinterStore _printerStore;
    private readonly PrintContextStore _contextStore;
    private readonly SaeDocumentParser _docParser;
    private readonly SaeDocumentRuntimeEngine _docRuntime;
    private readonly PdfDocumentRenderer _docRenderer;
    private readonly SaeLabelsTemplateService _glabels;
    private readonly ILabelRenderer _labelRenderer;

    public RuntimeController(
        TemplateRepository templates,
        TicketPrintResolver resolver,
        TicketXmlParser parser,
        TicketRuntimeEngine runtime,
        EscPosTicketRenderer escPosRenderer,
        ImageTicketRenderer imageRenderer,
        IPdfRenderer pdfRenderer,
        ILogicalPrinterStore printerStore,
        PrintContextStore contextStore,
        SaeDocumentParser docParser,
        SaeDocumentRuntimeEngine docRuntime,
        PdfDocumentRenderer docRenderer,
        SaeLabelsTemplateService glabels,
        ILabelRenderer labelRenderer)
    {
        _templates = templates;
        _resolver = resolver;
        _parser = parser;
        _runtime = runtime;
        _escPosRenderer = escPosRenderer;
        _imageRenderer = imageRenderer;
        _pdfRenderer = pdfRenderer;
        _printerStore = printerStore;
        _contextStore = contextStore;
        _docParser = docParser;
        _docRuntime = docRuntime;
        _docRenderer = docRenderer;
        _glabels = glabels;
        _labelRenderer = labelRenderer;
    }

    // ════════════════════════════════════════════════════
    // Print
    // ════════════════════════════════════════════════════
    [HttpPost("print")]
    public async Task<IActionResult> Print([FromBody] PrintRequest request)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        try
        {
            var template = _templates.Resolve(request.Template);
            if (template is null)
                return NotFound(new PrintResponse(false, null, sw.ElapsedMilliseconds,
                    new RuntimeError("TEMPLATE_NOT_FOUND", $"Template '{request.Template}' not found")));

            var lp = _printerStore.GetByName(request.LogicalPrinter) ?? _printerStore.GetById(request.LogicalPrinter);
            var physicalPrinter = lp?.Printers.FirstOrDefault()?.Name ?? request.LogicalPrinter;

            // Auto-detect format from XML
            var format = DetectFormat(template.Xml);
            var stringData = ToStringDictionary(request.Data);
            bool ok;

            switch (format)
            {
                case "saelabels":
                    var labelTemplate = _glabels.ParseTemplateXml(template.Xml);
                    ok = await _labelRenderer.PrintToPrinterAsync(labelTemplate,
                        request.Data.ToDictionary(k => k.Key, k => k.Value?.ToString() ?? ""),
                        physicalPrinter, request.Copies);
                    break;

                case "saedocument":
                    var sdoc = _docParser.Parse(template.Xml);
                    var docCtx = new DocumentContext { Variables = request.Data };
                    var resolvedDoc = _docRuntime.Process(sdoc, docCtx);
                    var pdfBytes = _docRenderer.Render(resolvedDoc, request.Data);
                    // Save PDF to temp and send to printer (or just return success)
                    var pdfPath = Path.Combine(Path.GetTempPath(), $"{request.Template}_{Guid.NewGuid():N}.pdf");
                    await System.IO.File.WriteAllBytesAsync(pdfPath, pdfBytes);
                    try { System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(pdfPath) { UseShellExecute = true }); }
                    catch { /* no PDF viewer available */ }
                    ok = true;
                    break;

                default: // saetickets
                    var context = new DocumentContext { Variables = stringData.ToDictionary(k => k.Key, k => (object?)k.Value) };
                    var doc = _parser.Parse(template.Xml);
                    var resolved = _runtime.Process(doc, context);
                    var engine = _resolver.Resolve(physicalPrinter);
                    ok = await engine.PrintAsync(template.Xml, stringData, physicalPrinter, 42, template.Name);
                    break;
            }

            sw.Stop();
            return Ok(new PrintResponse(ok, physicalPrinter, sw.ElapsedMilliseconds,
                ok ? null : new RuntimeError("PRINT_FAILED", "Print engine returned failure")));
        }
        catch (Exception ex)
        {
            sw.Stop();
            return StatusCode(500, new PrintResponse(false, null, sw.ElapsedMilliseconds,
                new RuntimeError("INTERNAL_ERROR", ex.Message)));
        }
    }

    private static string DetectFormat(string xml)
    {
        if (xml.Contains("<saelabels")) return "saelabels";
        if (xml.Contains("<saedocument")) return "saedocument";
        return "saetickets";
    }

    // ════════════════════════════════════════════════════
    // Preview (PNG)
    // ════════════════════════════════════════════════════
    [HttpPost("preview")]
    public IActionResult Preview([FromBody] PreviewRequest request)
    {
        try
        {
            var template = _templates.Resolve(request.Template);
            if (template is null)
                return NotFound(new PreviewResponse("", 0, 0,
                    new RuntimeError("TEMPLATE_NOT_FOUND", $"Template '{request.Template}' not found")));

            var doc = _parser.Parse(template.Xml);
            var context = new DocumentContext { Variables = request.Data ?? new() };
            var resolved = _runtime.Process(doc, context);

            using var bitmap = _imageRenderer.Render(resolved);
            using var ms = new MemoryStream();
            using var skStream = new SkiaSharp.SKManagedWStream(ms);
            if (!bitmap.Encode(skStream, SkiaSharp.SKEncodedImageFormat.Png, 90))
                throw new InvalidOperationException("Failed to encode preview image");
            skStream.Flush();
            var base64 = Convert.ToBase64String(ms.ToArray());

            return Ok(new PreviewResponse(base64, bitmap.Width, bitmap.Height));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new PreviewResponse("", 0, 0,
                new RuntimeError("INTERNAL_ERROR", ex.Message)));
        }
    }

    // ════════════════════════════════════════════════════
    // Export PDF
    // ════════════════════════════════════════════════════
    [HttpPost("export/pdf")]
    public IActionResult ExportPdf([FromBody] PdfExportRequest request)
    {
        try
        {
            var template = _templates.Resolve(request.Template);
            if (template is null)
                return NotFound(new PdfExportResponse("", "", "",
                    new RuntimeError("TEMPLATE_NOT_FOUND", $"Template '{request.Template}' not found")));

            var doc = _parser.Parse(template.Xml);
            var context = new DocumentContext { Variables = request.Data ?? new() };
            var resolved = _runtime.Process(doc, context);

            var pdfBytes = _pdfRenderer.RenderPdf(resolved);
            var base64 = Convert.ToBase64String(pdfBytes);
            var fileName = $"{request.Template}.pdf";

            return Ok(new PdfExportResponse(fileName, "application/pdf", base64));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new PdfExportResponse("", "", "",
                new RuntimeError("INTERNAL_ERROR", ex.Message)));
        }
    }

    // ════════════════════════════════════════════════════
    // Export ESC/POS
    // ════════════════════════════════════════════════════
    [HttpPost("export/escpos")]
    public IActionResult ExportEscPos([FromBody] EscPosExportRequest request)
    {
        try
        {
            var template = _templates.Resolve(request.Template);
            if (template is null)
                return NotFound(new EscPosExportResponse("", "",
                    new RuntimeError("TEMPLATE_NOT_FOUND", $"Template '{request.Template}' not found")));

            var doc = _parser.Parse(template.Xml);
            var context = new DocumentContext { Variables = request.Data ?? new() };
            var resolved = _runtime.Process(doc, context);

            var bytes = _escPosRenderer.Render(resolved);
            var hex = Convert.ToHexStringLower(bytes);
            var base64 = Convert.ToBase64String(bytes);

            return Ok(new EscPosExportResponse(hex, base64));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new EscPosExportResponse("", "",
                new RuntimeError("INTERNAL_ERROR", ex.Message)));
        }
    }

    // ════════════════════════════════════════════════════
    // Validate
    // ════════════════════════════════════════════════════
    [HttpPost("validate")]
    public IActionResult Validate([FromBody] ValidateRequest request)
    {
        try
        {
            var template = _templates.Resolve(request.Template);
            if (template is null)
                return Ok(new ValidateResponse(false,
                    new List<string> { $"Template '{request.Template}' not found" }, new()));

            var errors = new List<string>();
            var warnings = new List<string>();

            // Validate XML parseability
            try { _parser.Parse(template.Xml); }
            catch (Exception ex) { errors.Add($"XML parse error: {ex.Message}"); }
            if (errors.Count > 0) return Ok(new ValidateResponse(false, errors, warnings));

            // Validate data resolution
            try
            {
                var doc = _parser.Parse(template.Xml);
                var context = new DocumentContext { Variables = request.Data ?? new() };
                _runtime.Process(doc, context);
            }
            catch (Exception ex) { warnings.Add($"Runtime warning: {ex.Message}"); }

            return Ok(new ValidateResponse(errors.Count == 0, errors, warnings));
        }
        catch (Exception ex)
        {
            return Ok(new ValidateResponse(false,
                new List<string> { ex.Message }, new()));
        }
    }

    // ════════════════════════════════════════════════════
    // List Templates
    // ════════════════════════════════════════════════════
    [HttpGet("templates")]
    public IActionResult ListTemplates() => Ok(_templates.ListAll());

    [HttpGet("templates/{name}")]
    public IActionResult GetTemplate(string name)
    {
        var template = _templates.Resolve(name);
        if (template is null) return NotFound(new { error = $"Template '{name}' not found" });
        return Ok(new { template.Name, template.Category, template.Xml, template.Description });
    }

    // ════════════════════════════════════════════════════
    // Publish / Delete Templates (Designer → Runtime)
    // ════════════════════════════════════════════════════
    [HttpPost("templates")]
    public IActionResult PublishTemplate([FromBody] PublishTemplateRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Xml))
            return BadRequest(new { error = "Name and Xml are required" });

        _templates.Save(request.Name, request.Category ?? TemplateCategory.Restaurant, request.Xml, request.Version);
        return Ok(new { published = true, name = request.Name, category = request.Category ?? TemplateCategory.Restaurant });
    }

    [HttpDelete("templates/{name}")]
    public IActionResult DeleteTemplate(string name, [FromQuery] TemplateCategory? category = null)
    {
        var ok = _templates.Delete(name, category ?? TemplateCategory.Restaurant);
        return ok ? Ok(new { deleted = name }) : NotFound(new { error = $"Template '{name}' not found" });
    }

    // ════════════════════════════════════════════════════
    // Printers & Health
    // ════════════════════════════════════════════════════
    [HttpGet("printers")]
    public IActionResult ListPrinters()
    {
        var printers = _printerStore.GetAll();
        var result = printers.Select(p => new LogicalPrinterInfo(
            p.Id, p.Name, p.Description ?? "", p.Printers.FirstOrDefault()?.Name, p.IsActive));
        return Ok(result);
    }

    // ════════════════════════════════════════════════════
    // Print Contexts (template → logical printer mapping)
    // ════════════════════════════════════════════════════
    [HttpGet("contexts")]
    public IActionResult ListContexts() => Ok(_contextStore.GetAll());

    [HttpGet("contexts/{key}")]
    public IActionResult GetContext(string key)
    {
        var ctx = _contextStore.Resolve(key);
        if (ctx is null) return NotFound(new { error = $"Context '{key}' not found" });
        return Ok(ctx);
    }

    [HttpGet("health")]
    public IActionResult Health()
    {
        var templates = _templates.ListAll();
        var printers = _printerStore.GetAll();
        return Ok(new
        {
            status = "healthy",
            version = "1.0",
            templateCount = templates.Count,
            printerCount = printers.Count,
            uptime = Environment.TickCount64 / 1000
        });
    }

    // ════════════════════════════════════════════════════
    // Documents (SaeDocument — A4/Letter PDF generation)
    // ════════════════════════════════════════════════════
    [HttpPost("documents/pdf")]
    public IActionResult GenerateDocumentPdf([FromBody] PdfExportRequest request)
    {
        try
        {
            string xml;

            // Accept raw XML directly if provided in data
            if (request.Data?.TryGetValue("xml", out var rawXml) == true && rawXml is string rawStr && rawStr.Contains("<saedocument"))
            {
                xml = rawStr;
            }
            else
            {
                var template = _templates.Resolve(request.Template);
                if (template is null)
                    return NotFound(new PdfExportResponse("", "", "",
                        new RuntimeError("TEMPLATE_NOT_FOUND", $"Template '{request.Template}' not found")));
                xml = template.Xml;
            }

            var doc = _docParser.Parse(xml);
            var context = new DocumentContext { Variables = request.Data ?? new() };
            var resolved = _docRuntime.Process(doc, context);
            var pdfBytes = _docRenderer.Render(resolved, request.Data ?? new());
            var base64 = Convert.ToBase64String(pdfBytes);

            return Ok(new PdfExportResponse($"{request.Template}.pdf", "application/pdf", base64));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new PdfExportResponse("", "", "",
                new RuntimeError("INTERNAL_ERROR", ex.Message)));
        }
    }

    private static Dictionary<string, string> ToStringDictionary(Dictionary<string, object?> source)
    {
        var result = new Dictionary<string, string>();
        foreach (var (key, value) in source)
        {
            if (value is null) continue;
            if (value is System.Text.Json.JsonElement je)
            {
                result[key] = je.ValueKind == System.Text.Json.JsonValueKind.Number ? je.GetDecimal().ToString("N0") : je.ToString();
            }
            else
            {
                result[key] = value is decimal d ? d.ToString("N0") : value.ToString() ?? "";
            }
        }
        return result;
    }
}

public sealed record PublishTemplateRequest(
    string Name, string Xml,
    SAE.Contracts.Runtime.Models.Common.TemplateCategory? Category = null,
    int Version = 1);
