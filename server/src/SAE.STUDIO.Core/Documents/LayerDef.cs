#nullable enable
namespace SAE.STUDIO.Core.Documents;

/// <summary>
/// A visual layer on a page (like Photoshop layers).
/// Allows watermarks, backgrounds, overlays, and content to be managed independently.
/// </summary>
public record LayerDef
{
    public string Id { get; init; } = Guid.NewGuid().ToString();
    public string Name { get; init; } = "Content";
    public bool Visible { get; init; } = true;
    public bool Locked { get; init; }
    /// <summary>Higher ZIndex = rendered on top.</summary>
    public int ZIndex { get; init; }
}
