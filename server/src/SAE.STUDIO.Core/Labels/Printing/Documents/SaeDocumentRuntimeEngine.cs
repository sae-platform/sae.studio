using SAE.STUDIO.Core.Labels.Printing.Runtime;

namespace SAE.STUDIO.Core.Labels.Printing.Documents;

/// <summary>
/// Resolves ${VARIABLES} in a SaeDocument using a DocumentContext,
/// similar to TicketRuntimeEngine but for page-based documents.
/// </summary>
public sealed class SaeDocumentRuntimeEngine
{
    public SaeDocument Process(SaeDocument document, DocumentContext context)
    {
        var elements = document.Elements
            .Select(e => ProcessElement(e, context))
            .Where(e => e is not null)
            .Select(e => e!)
            .ToList();

        return new SaeDocument
        {
            PageSize = document.PageSize,
            Orientation = document.Orientation,
            MarginTop = document.MarginTop,
            MarginBottom = document.MarginBottom,
            MarginLeft = document.MarginLeft,
            MarginRight = document.MarginRight,
            Elements = elements,
        };
    }

    private DocElement? ProcessElement(DocElement element, DocumentContext context)
    {
        if (element.ShowIf is not null && IsFalsy(Resolve(element.ShowIf, context)))
            return null;

        return element switch
        {
            DocTextElement t => t with { Content = Resolve(t.Content, context) },
            DocQrElement q => q with { Content = Resolve(q.Content, context) },
            DocImageElement i => i with { Source = Resolve(i.Source, context) },
            DocInvoiceSection s => new DocInvoiceSection(s.Name,
                s.Elements.Select(e2 => ProcessElement(e2, context)).Where(e2 => e2 is not null).Select(e2 => e2!).ToList(), s.ShowIf),
            _ => element
        };
    }

    private static string Resolve(string text, DocumentContext ctx)
    {
        if (!text.Contains('$')) return text;
        var result = text;
        foreach (var (key, value) in ctx.Variables)
        {
            if (value is null) continue;
            result = result.Replace($"${{{key}}}", value.ToString());
        }
        result = ReplaceBuiltins(result);
        return result;
    }

    private static string ReplaceBuiltins(string text)
    {
        var now = DateTime.Now;
        return text
            .Replace("${!DATE}", now.ToString("dd/MM/yyyy"))
            .Replace("${!TIME}", now.ToString("HH:mm"))
            .Replace("${!DATETIME}", now.ToString("dd/MM/yyyy HH:mm"))
            .Replace("${!YEAR}", now.Year.ToString())
            .Replace("${!MONTH}", now.Month.ToString("D2"))
            .Replace("${!DAY}", now.Day.ToString("D2"));
    }

    private static bool IsFalsy(string? value) =>
        string.IsNullOrWhiteSpace(value) || value is "0" or "false" or "False" or "no" or "No" || value.Contains("${");
}
