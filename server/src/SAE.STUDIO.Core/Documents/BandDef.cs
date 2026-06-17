#nullable enable
using SAE.STUDIO.Core.Documents.Elements;

namespace SAE.STUDIO.Core.Documents;

/// <summary>Band type within a page.</summary>
public enum BandType { Header, Body, Footer }

/// <summary>
/// A horizontal band within a page. Contains absolutely-positioned elements.
/// Inspired by Crystal Reports / FastReport band model.
/// </summary>
public record BandDef
{
    public string Id { get; init; } = Guid.NewGuid().ToString();
    public BandType Type { get; init; }
    /// <summary>Band height in the document's unit (default: mm).</summary>
    public decimal Height { get; init; }
    /// <summary>Allow band to grow vertically if content overflows.</summary>
    public bool CanGrow { get; init; }
    /// <summary>Allow band to shrink if content is shorter than Height.</summary>
    public bool CanShrink { get; init; }
    public List<DocumentElementBase> Elements { get; init; } = [];
}
