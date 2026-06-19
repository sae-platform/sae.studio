using System.Globalization;
using System.Text.RegularExpressions;
using SAE.STUDIO.Core.Labels.Printing.Runtime;

namespace SAE.STUDIO.Core.Labels.Printing.Documents;

public sealed class SaeDocumentRuntimeEngine
{
    private int _pageNumber = 1;
    private int _totalPages = 1;

    public SaeDocument Process(SaeDocument document, DocumentContext context, int pageNumber = 1, int totalPages = 1)
    {
        _pageNumber = pageNumber;
        _totalPages = totalPages;
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
            DocTextElement t => ProcessText(t, context),
            DocQrElement q => q with { Content = Resolve(q.Content, context) },
            DocImageElement i => i with { Source = Resolve(i.Source, context) },
            DocInvoiceSection s => new DocInvoiceSection(s.Name,
                s.Elements.Select(e2 => ProcessElement(e2, context)).Where(e2 => e2 is not null).Select(e2 => e2!).ToList(), s.ShowIf),
            _ => element
        };
    }

    private DocTextElement ProcessText(DocTextElement t, DocumentContext context)
    {
        var raw = t.Content;
        var resolved = Resolve(raw, context);

        if (t.Format is not null)
        {
            resolved = FormatValue(resolved, t.Format, t.FormatString);
        }

        return t with { Content = resolved };
    }

    private string Resolve(string text, DocumentContext ctx)
    {
        if (!text.Contains('$')) return text;

        // Replace variables
        var result = text;
        foreach (var (key, value) in ctx.Variables)
        {
            if (value is null) continue;
            result = result.Replace($"${{{key}}}", value.ToString());
        }

        // Replace builtins
        result = ReplaceBuiltins(result);

        // Evaluate formulas: ${SUM(Items.Total)}, ${COUNT(Items)}, etc.
        result = Regex.Replace(result, @"\$\{(\w+)\(([^)]*)\)\}", m =>
        {
            var func = m.Groups[1].Value.ToUpperInvariant();
            var arg = m.Groups[2].Value.Trim();

            // Try to find the array in the context
            object? array = null;
            var parts = arg.Split('.');
            var root = parts[0];
            if (ctx.Variables.TryGetValue(root, out var arrVal) && arrVal is System.Collections.IEnumerable enumerable)
            {
                array = enumerable;
            }

            if (array is not System.Collections.IEnumerable en) return m.Value;

            var list = en.Cast<object?>().Where(x => x is not null).Cast<Dictionary<string, object?>>().ToList();
            if (list.Count == 0) return func == "COUNT" ? "0" : "";

            var field = parts.Length > 1 ? parts[^1] : null;
            var values = list.Select(item =>
            {
                if (field is not null && item.TryGetValue(field, out var fv))
                    return Convert.ToDouble(fv ?? 0, CultureInfo.InvariantCulture);
                return 1.0;
            }).ToList();

            return func switch
            {
                "SUM" => values.Sum().ToString(CultureInfo.InvariantCulture),
                "AVG" => (values.Sum() / values.Count).ToString(CultureInfo.InvariantCulture),
                "COUNT" => list.Count.ToString(),
                "MAX" => values.Max().ToString(CultureInfo.InvariantCulture),
                "MIN" => values.Min().ToString(CultureInfo.InvariantCulture),
                _ => m.Value
            };
        });

        return result;
    }

    private string ReplaceBuiltins(string text)
    {
        var now = DateTime.Now;
        return text
            .Replace("${!DATE}", now.ToString("dd/MM/yyyy"))
            .Replace("${!TIME}", now.ToString("HH:mm"))
            .Replace("${!DATETIME}", now.ToString("dd/MM/yyyy HH:mm"))
            .Replace("${!YEAR}", now.Year.ToString())
            .Replace("${!MONTH}", now.Month.ToString("D2"))
            .Replace("${!DAY}", now.Day.ToString("D2"))
            .Replace("${!PAGE}", _pageNumber.ToString())
            .Replace("${!TOTAL_PAGES}", _totalPages.ToString());
    }

    private static string FormatValue(string value, string format, string? formatString)
    {
        if (double.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var num))
        {
            return format switch
            {
                "currency" => num.ToString("C2", new CultureInfo("es-CR")),
                "number" => num.ToString("N2", new CultureInfo("es-CR")),
                "percent" => $"{num * 100:N2}%",
                "custom" when formatString is not null => FormatCustom(num, formatString),
                _ => value
            };
        }

        if (format is "date" or "datetime")
        {
            if (DateTime.TryParse(value, out var dt))
            {
                return format == "date" ? dt.ToString("dd/MM/yyyy") : dt.ToString("dd/MM/yyyy HH:mm");
            }
        }

        return value;
    }

    private static string FormatCustom(double value, string formatString)
    {
        // Simple #,##0.00 formatting
        var decimals = 0;
        var match = Regex.Match(formatString, @"0\.(0+)");
        if (match.Success) decimals = match.Groups[1].Length;
        return value.ToString($"N{decimals}", new CultureInfo("es-CR"));
    }

    private static bool IsFalsy(string? value) =>
        string.IsNullOrWhiteSpace(value) || value is "0" or "false" or "False" or "no" or "No" || value.Contains("${");
}
