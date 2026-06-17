using Microsoft.AspNetCore.Mvc;
using SAE.STUDIO.Api.Services;

namespace SAE.STUDIO.Api.Controllers;

[ApiController]
[Tags("Assets")]
[Route("api/v1/assets")]
public sealed class AssetController : ControllerBase
{
    private readonly AssetStore _assets;

    public AssetController(AssetStore assets) => _assets = assets;

    [HttpGet]
    public IActionResult List() => Ok(_assets.ListAll().Select(a => new
    {
        a.Name, a.ContentType, a.SizeBytes, a.CreatedAt
    }));

    [HttpGet("{**name}")]
    public IActionResult Get(string name)
    {
        var data = _assets.Get(name);
        if (data is null) return NotFound(new { error = $"Asset '{name}' not found" });
        var contentType = _assets.GetContentType(name) ?? "application/octet-stream";
        return File(data, contentType);
    }

    [HttpPost("{**name}")]
    public async Task<IActionResult> Upload(string name, IFormFile file)
    {
        if (file.Length == 0) return BadRequest(new { error = "Empty file" });
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        _assets.Save(name, ms.ToArray(), file.ContentType);
        return Ok(new { name, size = file.Length, contentType = file.ContentType });
    }

    [HttpDelete("{**name}")]
    public IActionResult Delete(string name)
    {
        var ok = _assets.Delete(name);
        return ok ? Ok(new { deleted = name }) : NotFound(new { error = $"Asset '{name}' not found" });
    }
}
