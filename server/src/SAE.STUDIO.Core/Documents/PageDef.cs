#nullable enable
namespace SAE.STUDIO.Core.Documents;

/// <summary>A single page within a SaeDocumentModel.</summary>
public record PageDef
{
    public string Id { get; init; } = Guid.NewGuid().ToString();
    /// <summary>Page width in the specified unit.</summary>
    public decimal Width { get; init; } = 210;
    /// <summary>Page height in the specified unit.</summary>
    public decimal Height { get; init; } = 297;
    /// <summary>Measurement unit: mm | cm | in | pt</summary>
    public string Unit { get; init; } = "mm";
    public BandDef? Header { get; init; }
    public BandDef? Body   { get; init; }
    public BandDef? Footer { get; init; }
    /// <summary>Layers ordered by ZIndex ascending.</summary>
    public List<LayerDef> Layers { get; init; } = [new LayerDef { Id = "default", Name = "Content", ZIndex = 0 }];
}

/// <summary>Common page size presets in mm.</summary>
public static class PagePresets
{
    public static readonly (decimal Width, decimal Height) A4          = (210,    297);
    public static readonly (decimal Width, decimal Height) A5          = (148,    210);
    public static readonly (decimal Width, decimal Height) Letter      = (215.9m, 279.4m);
    public static readonly (decimal Width, decimal Height) Legal       = (215.9m, 355.6m);
    public static readonly (decimal Width, decimal Height) HalfLetter  = (139.7m, 215.9m);
    public static readonly (decimal Width, decimal Height) Rollo80mm   = (80,     297);
    public static readonly (decimal Width, decimal Height) Rollo58mm   = (58,     297);
}
