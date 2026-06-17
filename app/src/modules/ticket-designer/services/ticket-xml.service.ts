import type { TicketBlock, EachColumn, Align, FontSize } from "../stores/ticket.store";
import { ticketUid, resetTicketUid } from "../stores/ticket.store";

function esc(s?: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function xmlToBlocks(xml: string): { blocks: TicketBlock[]; width: number; printers: string } {
  resetTicketUid();
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml || "", "application/xml");
    const root = doc.documentElement;
    const rootName = root.nodeName?.toLowerCase() ?? "";

    if (!["saetickets", "ticket"].includes(rootName)) {
      return { blocks: [], width: 42, printers: "" };
    }

    const setup = root.querySelector("setup");
    const width = parseInt(setup?.getAttribute("width") ?? "42");
    const printers = setup?.getAttribute("printers") ?? "";
    const cmds = root.querySelector("commands");
    const blocks: TicketBlock[] = [];
    if (!cmds) return { blocks, width, printers };

    const si = (el: Element, a: string) => el.getAttribute(a) ?? "";
    const parseAl = (s: string): Align =>
      (["left", "center", "right"].includes(s) ? s : "left") as Align;

    Array.from(cmds.children).forEach((el) => {
      const t = el.tagName;
      const sif = si(el, "showIf") || undefined;

      if (t === "text") {
        blocks.push({
          id: ticketUid(), type: "text", text: el.textContent ?? "",
          align: parseAl(si(el, "align")), bold: si(el, "bold") === "true",
          extraBold: si(el, "extraBold") === "true",
          size: (si(el, "size") || "normal") as FontSize, showIf: sif,
        });
      } else if (t === "separator") {
        blocks.push({
          id: ticketUid(), type: "separator",
          char: si(el, "char") || "-", align: parseAl(si(el, "align")), showIf: sif,
        });
      } else if (t === "total") {
        blocks.push({
          id: ticketUid(), type: "total",
          label: si(el, "label") || "TOTAL", value: si(el, "value") || "0",
          bold: si(el, "bold") === "true", extraBold: si(el, "extraBold") === "true",
          align: parseAl(si(el, "align")), showIf: sif,
        });
      } else if (t === "qr") {
        blocks.push({
          id: ticketUid(), type: "qr", content: el.textContent ?? "",
          align: (si(el, "align") || "center") as Align,
          qrSize: parseInt(si(el, "size") || "80"), showIf: sif,
        });
      } else if (t === "feed") {
        blocks.push({ id: ticketUid(), type: "feed", lines: parseInt(si(el, "lines") || "1"), showIf: sif });
      } else if (t === "cut") {
        blocks.push({ id: ticketUid(), type: "cut" });
      } else if (t === "beep") {
        blocks.push({ id: ticketUid(), type: "beep" });
      } else if (t === "open-drawer") {
        blocks.push({ id: ticketUid(), type: "open-drawer" });
      } else if (t === "if") {
        blocks.push({
          id: ticketUid(), type: "if", expr: si(el, "expr"),
          text: el.textContent ?? "", bold: si(el, "bold") === "true",
          extraBold: si(el, "extraBold") === "true",
          size: (si(el, "size") || "normal") as FontSize,
          align: (si(el, "align") || "left") as Align, showIf: sif,
        });
      } else if (t === "ifelse") {
        blocks.push({
          id: ticketUid(), type: "ifelse", expr: si(el, "expr"),
          thenText: el.querySelector("then")?.textContent ?? "",
          elseText: el.querySelector("else")?.textContent ?? "",
          bold: si(el, "bold") === "true",
          extraBold: si(el, "extraBold") === "true",
          size: (si(el, "size") || "normal") as FontSize,
          align: parseAl(si(el, "align")), showIf: sif,
        });
      } else if (t === "each") {
        const cols: EachColumn[] = Array.from(el.querySelectorAll("column")).map((c: Element) => ({
          field: si(c, "field"), label: si(c, "label"),
          width: si(c, "width") === "auto" ? "auto" : parseInt(si(c, "width") || "10"),
          align: (si(c, "align") || "left") as Align,
          showIf: si(c, "showIf") || undefined,
          bold: si(c, "bold") === "true", extraBold: si(c, "extraBold") === "true",
          size: (si(c, "size") || "normal") as FontSize,
        }));
        blocks.push({
          id: ticketUid(), type: "each", listVar: si(el, "listVar") || "ITEMS",
          columns: cols, showHeader: si(el, "header") !== "false",
          childField: si(el, "childField") || undefined,
          childIndentCol: parseInt(si(el, "childIndentCol") || "0"),
          align: parseAl(si(el, "align")), showIf: sif,
        });
      }
    });

    return { blocks, width, printers };
  } catch {
    return { blocks: [], width: 42, printers: "" };
  }
}

export function blocksToXml(blocks: TicketBlock[], width: number, printers: string): string {
  const pAttr = printers ? ` printers="${esc(printers)}"` : "";
  const lines: string[] = [];

  for (const b of blocks) {
    const si = b.showIf ? ` showIf="${esc(b.showIf)}"` : "";
    switch (b.type) {
      case "text":
        lines.push(`    <text align="${b.align}" bold="${b.bold}" extraBold="${b.extraBold || false}" size="${b.size}"${si}>${esc(b.text)}</text>`);
        break;
      case "separator":
        lines.push(`    <separator char="${esc(b.char)}" align="${b.align || "left"}"${si}/>`);
        break;
      case "total":
        lines.push(`    <total label="${esc(b.label)}" value="${esc(b.value)}" bold="${b.bold}" extraBold="${b.extraBold || false}" align="${b.align || "left"}"${si}/>`);
        break;
      case "qr":
        lines.push(`    <qr align="${b.align}" size="${b.qrSize}"${si}>${esc(b.content)}</qr>`);
        break;
      case "feed":
        lines.push(`    <feed lines="${b.lines}"${si}/>`);
        break;
      case "cut":
        lines.push(`    <cut/>`);
        break;
      case "beep":
        lines.push(`    <beep/>`);
        break;
      case "open-drawer":
        lines.push(`    <open-drawer/>`);
        break;
      case "if":
        lines.push(`    <if expr="${esc(b.expr)}" bold="${b.bold}" extraBold="${b.extraBold || false}" size="${b.size || "normal"}" align="${b.align}"${si}>${esc(b.text)}</if>`);
        break;
      case "ifelse":
        lines.push(`    <ifelse expr="${esc(b.expr)}" bold="${b.bold || false}" extraBold="${b.extraBold || false}" size="${b.size || "normal"}" align="${b.align}"${si}><then>${esc(b.thenText)}</then><else>${esc(b.elseText)}</else></ifelse>`);
        break;
      case "each": {
        const colLines = b.columns.map((c) => {
          const cs = c.showIf ? ` showIf="${esc(c.showIf)}"` : "";
          return `      <column field="${esc(c.field)}" label="${esc(c.label)}" width="${c.width}" align="${c.align}" bold="${c.bold || false}" extraBold="${c.extraBold || false}" size="${c.size || "normal"}"${cs}/>`;
        });
        const ci = b.childField ? ` childField="${esc(b.childField)}" childIndentCol="${b.childIndentCol ?? 0}"` : "";
        lines.push(`    <each listVar="${esc(b.listVar)}" header="${b.showHeader}"${ci} align="${b.align || "left"}"${si}>\n${colLines.join("\n")}\n    </each>`);
        break;
      }
    }
  }

  return `<saetickets version="1.0">\n  <setup width="${width}"${pAttr}/>\n  <commands>\n${lines.join("\n")}\n  </commands>\n</saetickets>`;
}

const DEFAULT_BLOCKS: TicketBlock[] = [
  { id: "hdr", type: "text", text: "**MI EMPRESA**", align: "center", bold: false, size: "large", showIf: undefined },
  { id: "sep1", type: "separator", char: "-", align: "left", showIf: undefined },
  { id: "date", type: "text", text: "Fecha: ${!date}", align: "left", bold: false, size: "normal", showIf: undefined },
  { id: "sep2", type: "separator", char: "-", align: "left", showIf: undefined },
  {
    id: "items", type: "each", listVar: "ITEMS", showHeader: true,
    columns: [
      { field: "DESC", label: "Descripción", width: "auto", align: "left" },
      { field: "QTY", label: "Cant", width: 6, align: "right" },
      { field: "TOTAL", label: "Total", width: 10, align: "right" },
    ],
    childField: undefined, childIndentCol: 0, align: "left", showIf: undefined,
  },
  { id: "sep3", type: "separator", char: "-", align: "left", showIf: undefined },
  { id: "tot", type: "total", label: "TOTAL", value: "${TOTAL}", bold: true, align: "left", showIf: undefined },
  { id: "feed1", type: "feed", lines: 3 },
  { id: "cut1", type: "cut" },
];

export function getDefaultBlocks(): TicketBlock[] {
  return DEFAULT_BLOCKS.map((b) => ({ ...b, id: ticketUid() }));
}
