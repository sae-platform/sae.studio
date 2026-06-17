using System.Text.Json.Nodes;
using SAE.STUDIO.Core.Labels.Modelos;
using SAE.STUDIO.Core.Labels.Printing.Document;

namespace SAE.STUDIO.Core.Labels.Printing.Runtime;

public class TicketRuntimeEngine
{
    public TicketDocument Process(TicketDocument document, DocumentContext context)
    {
        var resolved = new TicketDocument
        {
            Width = document.Width,
            Printers = document.Printers
        };

        foreach (var element in document.Elements)
        {
            ProcessElement(element, resolved, context);
        }

        return resolved;
    }

    private void ProcessElement(TicketElement element, TicketDocument output, DocumentContext ctx)
    {
        if (!string.IsNullOrEmpty(element.ShowIf) && IsFalsy(Resolve(element.ShowIf, ctx)))
            return;

        switch (element)
        {
            case TextElement text:
                output.Elements.Add(text with { Content = Resolve(text.Content, ctx) });
                break;

            case SeparatorElement sep:
                output.Elements.Add(sep);
                break;

            case TotalElement total:
                output.Elements.Add(total with
                {
                    Label = Resolve(total.Label, ctx),
                    Value = Resolve(total.Value, ctx)
                });
                break;

            case QrElement qr:
                output.Elements.Add(qr with { Content = Resolve(qr.Content, ctx) });
                break;

            case FeedElement feed:
                output.Elements.Add(feed);
                break;

            case CutElement:
            case BeepElement:
            case OpenDrawerElement:
                output.Elements.Add(element);
                break;

            case IfElement ifEl:
                if (!IsFalsy(Resolve(ifEl.Expr, ctx)))
                    output.Elements.Add(ifEl with { Text = Resolve(ifEl.Text, ctx) });
                break;

            case IfElseElement ifElse:
            {
                var expr = Resolve(ifElse.Expr, ctx);
                var text = !IsFalsy(expr)
                    ? Resolve(ifElse.ThenText, ctx)
                    : Resolve(ifElse.ElseText, ctx);
                output.Elements.Add(new TextElement(text, ifElse.Align, ifElse.Bold, ifElse.ExtraBold, ifElse.Size));
                break;
            }

            case EachElement each:
                ProcessEach(each, output, ctx);
                break;

            case ImageElement img:
                output.Elements.Add(img with { Source = Resolve(img.Source, ctx) });
                break;

            case ContainerElement container:
                foreach (var child in container.Children)
                    ProcessElement(child, output, ctx);
                break;
        }
    }

    private void ProcessEach(EachElement each, TicketDocument output, DocumentContext ctx)
    {
        int count = 0;
        var listVar = each.ListVar;

        if (ctx.Variables.TryGetValue($"{listVar}_COUNT", out var cObj) &&
            int.TryParse(cObj?.ToString(), out var cParsed))
            count = cParsed;
        else
        {
            var firstField = each.Columns.FirstOrDefault()?.Field ?? "";
            while (ctx.Variables.ContainsKey($"{listVar}_{count}_{firstField}")) count++;
        }

        if (count == 0) return;

        if (each.ShowHeader)
        {
            var headerBlocks = new List<TextElement>();
            foreach (var col in each.Columns)
                headerBlocks.Add(new TextElement(col.Label, col.Align, col.Bold, col.ExtraBold, col.Size));
            output.Elements.Add(new EachRowElement(headerBlocks));
            output.Elements.Add(new SeparatorElement('-'));
        }

        for (int i = 0; i < count; i++)
        {
            var rowBlocks = new List<TextElement>();
            foreach (var col in each.Columns)
            {
                if (!string.IsNullOrEmpty(col.ShowIf))
                {
                    var rowCtx = new Dictionary<string, object?>(ctx.Variables);
                    foreach (var c in each.Columns)
                    {
                        var k = $"{listVar}_{i}_{c.Field}";
                        if (ctx.Variables.TryGetValue(k, out var v)) rowCtx[c.Field] = v;
                    }
                    if (IsFalsy(Resolve(col.ShowIf, new DocumentContext
                    {
                        Variables = rowCtx,
                        Company = ctx.Company,
                        User = ctx.User
                    })))
                    {
                        rowBlocks.Add(new TextElement("", col.Align));
                        continue;
                    }
                }

                var key = $"{listVar}_{i}_{col.Field}";
                var val = ctx.Variables.TryGetValue(key, out var fv) ? fv?.ToString() ?? "" : "";
                rowBlocks.Add(new TextElement(
                    Resolve(val, ctx), col.Align, col.Bold, col.ExtraBold, col.Size));
            }
            output.Elements.Add(new EachRowElement(rowBlocks));
        }
    }

    // ── Variable resolution ──

    private string Resolve(string? input, DocumentContext ctx)
    {
        if (string.IsNullOrEmpty(input)) return string.Empty;

        // First resolve special variables (!prefix) including company/user
        input = ResolveSpecialVars(input, ctx);

        // Then resolve user-provided ${VARS}
        input = System.Text.RegularExpressions.Regex.Replace(input, @"\$\{([^}]+)\}", m =>
        {
            var key = m.Groups[1].Value;
            if (ctx.Variables.TryGetValue(key, out var val) && val != null)
                return val.ToString()!;
            return m.Value;
        });

        return input;
    }

    private static string ResolveSpecialVars(string input, DocumentContext ctx)
    {
        var now = DateTime.Now;
        return System.Text.RegularExpressions.Regex.Replace(input, @"\$\{!([A-Za-z_]+)(?::([^}]+))?\}", m =>
        {
            var key = m.Groups[1].Value.ToUpper();
            var format = m.Groups[2].Success ? m.Groups[2].Value : null;

            // ── Date/Time ──
            if (key == "DATE") return FormatDate(now, format ?? "dd/MM/yyyy");
            if (key == "TIME") return FormatTime(now, format ?? "HH:mm");
            if (key == "NOW" || key == "DATETIME") return $"{FormatDate(now, "dd/MM/yyyy")} {FormatTime(now, "HH:mm")}";
            if (key == "YEAR") return now.Year.ToString();
            if (key == "MONTH") return now.Month.ToString();
            if (key == "DAY") return now.Day.ToString();
            if (key == "DAYNAME") return now.ToString("dddd");
            if (key == "WEEKMONTH") return ((now.Day - 1) / 7 + 1).ToString();
            if (key == "WEEKYEAR") return System.Globalization.ISOWeek.GetWeekOfYear(now).ToString();

            // ── Company info ──
            var company = ctx.Company;
            if (company != null)
            {
                var val = key switch
                {
                    "EMPRESA" or "NOMBRE" => TryGetStr(company, "nombre", "empresa", "name"),
                    "DIRECCION" => TryGetStr(company, "direccion", "address"),
                    "TELEFONO" => TryGetStr(company, "telefono", "phone"),
                    "NIT" => TryGetStr(company, "nit", "taxId"),
                    "RAZON_SOCIAL" => TryGetStr(company, "razonSocial"),
                    "CORREO" => TryGetStr(company, "correo", "email"),
                    "PROVINCIA" => TryGetStr(company, "provincia"),
                    "CANTON" => TryGetStr(company, "canton"),
                    "DISTRITO" => TryGetStr(company, "distrito"),
                    "CUENTASBANCOS" => TryGetStr(company, "cuentasBanco", "cuentasBancos"),
                    "ACTIVIDAD_ECONOMICA" => TryGetStr(company, "actividadEconomica"),
                    "CODIGO_ACTIVIDAD" or "ACTIVIDAD_CODIGO" => TryGetStr(company, "codigoActividad"),
                    "LOGO" => TryGetStr(company, "logoBase64", "logo"),
                    "CEDULA" => TryGetStr(company, "cedula"),
                    _ => null
                };
                if (val != null) return val;
            }

            // ── User/Session info ──
            var user = ctx.User;
            if (user != null)
            {
                var val = key switch
                {
                    "USUARIO" => TryGetStr(user, "usuario", "nombre"),
                    "CAJERO" => TryGetStr(user, "cajero"),
                    "CAJA" => TryGetStr(user, "caja"),
                    "TERMINAL" => TryGetStr(user, "terminal"),
                    "SUCURSAL" => TryGetStr(user, "sucursal"),
                    "TURNO" => TryGetStr(user, "turno"),
                    _ => null
                };
                if (val != null) return val;
            }

            return m.Value;
        });
    }

    private static string? TryGetStr(JsonNode? node, params string[] keys)
    {
        if (node == null) return null;
        foreach (var k in keys)
        {
            var val = node[k]?.ToString();
            if (!string.IsNullOrWhiteSpace(val) && val != "(Sin definir)")
                return val;
        }
        return null;
    }

    private static string FormatDate(DateTime dt, string fmt)
    {
        return fmt.Replace("YYYY", dt.Year.ToString("D4"))
                  .Replace("YY", dt.Year.ToString().Substring(2))
                  .Replace("MM", dt.Month.ToString("D2"))
                  .Replace("M", dt.Month.ToString())
                  .Replace("DD", dt.Day.ToString("D2"))
                  .Replace("D", dt.Day.ToString());
    }

    private static string FormatTime(DateTime dt, string fmt)
    {
        var h24 = dt.Hour;
        var h12 = h24 % 12 == 0 ? 12 : h24 % 12;
        return fmt.Replace("HH", h24.ToString("D2"))
                  .Replace("H", h24.ToString())
                  .Replace("hh", h12.ToString("D2"))
                  .Replace("h", h12.ToString())
                  .Replace("mm", dt.Minute.ToString("D2"))
                  .Replace("ss", dt.Second.ToString("D2"))
                  .Replace("tt", h24 >= 12 ? "PM" : "AM");
    }

    private static bool IsFalsy(string? val) =>
        string.IsNullOrWhiteSpace(val) || val == "0" || val == "false" || val == "False"
        || val == "no" || val == "No" || val.StartsWith("${");
}
