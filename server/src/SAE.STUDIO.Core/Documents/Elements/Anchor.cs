#nullable enable

namespace SAE.STUDIO.Core.Documents.Elements;

/// <summary>
/// Defines the anchor points for a document element, controlling how it is
/// attached to its parent container when the container is resized.
/// </summary>
public enum Anchor
{
    /// <summary>Anchor to the left edge of the parent.</summary>
    Left,

    /// <summary>Anchor to the right edge of the parent.</summary>
    Right,

    /// <summary>Anchor to the top edge of the parent.</summary>
    Top,

    /// <summary>Anchor to the bottom edge of the parent.</summary>
    Bottom,

    /// <summary>Anchor to the horizontal center of the parent.</summary>
    HCenter,

    /// <summary>Anchor to the vertical center of the parent.</summary>
    VCenter
}
