using System.Globalization;

namespace SAE.STUDIO.Core.Labels.Printing.Renderers.Shared;

public static class EmojiRenderer
{
    public static bool ContainsEmoji(string text)
    {
        if (string.IsNullOrEmpty(text)) return false;
        foreach (var ch in text)
        {
            var cat = char.GetUnicodeCategory(ch);
            if (cat is UnicodeCategory.OtherSymbol or UnicodeCategory.Surrogate)
                return true;
        }
        return false;
    }
}
