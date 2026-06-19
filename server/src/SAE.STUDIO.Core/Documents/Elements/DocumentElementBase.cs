#nullable enable
using System.Xml.Linq;

namespace SAE.STUDIO.Core.Documents;

/// <summary>Anchor constraint for an element relative to its band or page edge.</summary>
public enum Anchor { Left, Right, Top, Bottom, HCenter, VCenter }

/// <summary>Base properties shared by all positioned document elements.</summary>
public abstract record DocumentElementBase
{
    /// <summary>Unique identifier for this element.</summary>
    public string Id { get; init; } = Guid.NewGuid().ToString();

    /// <summary>Element type discriminator.</summary>
    public abstract string Type { get; }

    /// <summary>X position in band coordinates (mm by default).</summary>
    public decimal X { get; init; }

    /// <summary>Y position in band coordinates (mm by default).</summary>
    public decimal Y { get; init; }

    public decimal? Width  { get; init; }
    public decimal? Height { get; init; }

    /// <summary>Anchor constraints for responsive positioning.</summary>
    public Anchor[] Anchor { get; init; } = [];

    /// <summary>Expression evaluated at render time; hides element if false.</summary>
    public string? ShowIf { get; init; }

    /// <summary>Layer this element belongs to.</summary>
    public string? LayerId { get; init; }

    public bool Locked { get; init; }
    public bool Hidden { get; init; }

    /// <summary>Theme preset name for inheritable styles.</summary>
    public string? Preset { get; init; }
}
