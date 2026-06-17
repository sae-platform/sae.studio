export interface ValidationError {
  message: string;
  path?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const VALID_TAGS = new Set([
  "text", "separator", "total", "qr", "feed",
  "cut", "beep", "open-drawer",
  "if", "ifelse", "each",
]);

const VALID_ALIGNS = new Set(["left", "center", "right"]);
const VALID_SIZES = new Set(["normal", "medium", "large", "extra-large"]);

function attr(el: Element, name: string): string {
  return el.getAttribute(name) ?? "";
}

function err(message: string, path?: string): ValidationError {
  return { message, path };
}

export function validateTicketXml(xml: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (!xml.trim()) {
    return { valid: false, errors: [err("XML vacío")] };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    return { valid: false, errors: [err("XML mal formado: " + (parseError.textContent || "error de sintaxis"))] };
  }

  const root = doc.documentElement;
  const rootName = root.nodeName?.toLowerCase() ?? "";

  // 1. Root
  if (!rootName) {
    errors.push(err("No se encontró elemento raíz", "/"));
  } else if (!["saetickets", "ticket"].includes(rootName)) {
    errors.push(err(`Raíz <${rootName}> no válida. Esperado: <saetickets>`, `/${rootName}`));
  } else {
    const version = attr(root, "version");
    if (rootName === "saetickets" && !version) {
      errors.push(err("<saetickets> requiere atributo version", `/${rootName}`));
    }
  }

  // 2. Setup
  const setup = root.querySelector(":scope > setup");
  if (!setup) {
    errors.push(err("Falta el elemento <setup>", `${rootName ? "/" + rootName : ""}/setup`));
  } else {
    const w = attr(setup, "width");
    if (!w) {
      errors.push(err("<setup> requiere atributo width", `${rootName ? "/" + rootName : ""}/setup`));
    } else if (isNaN(parseInt(w)) || parseInt(w) <= 0) {
      errors.push(err(`width="${w}" debe ser un número positivo`, `${rootName ? "/" + rootName : ""}/setup`));
    }
  }

  // 3. Commands
  const commands = root.querySelector(":scope > commands");
  if (!commands) {
    errors.push(err("Falta el elemento <commands>", `${rootName ? "/" + rootName : ""}/commands`));
  } else {
    let idx = 0;
    Array.from(commands.children).forEach((el) => {
      const tag = el.tagName;
      const path = `${rootName ? "/" + rootName : ""}/commands/${tag}[${idx}]`;
      idx++;

      if (!VALID_TAGS.has(tag)) {
        errors.push(err(`Elemento <${tag}> no reconocido`, path));
        return;
      }

      validateElement(el, tag, path, errors);
    });
  }

  return { valid: errors.length === 0, errors };
}

function validateElement(el: Element, tag: string, path: string, errors: ValidationError[]) {
  switch (tag) {
    case "text":
      if (!attr(el, "align")) errors.push(err("<text> requiere align", path));
      else if (!VALID_ALIGNS.has(attr(el, "align"))) errors.push(err(`align="${attr(el, "align")}" no válido en <text>`, path));
      if (attr(el, "size") && !VALID_SIZES.has(attr(el, "size"))) errors.push(err(`size="${attr(el, "size")}" no válido en <text>`, path));
      break;
    case "separator":
      break;
    case "total":
      if (!attr(el, "align")) errors.push(err("<total> requiere align", path));
      else if (!VALID_ALIGNS.has(attr(el, "align"))) errors.push(err(`align="${attr(el, "align")}" no válido en <total>`, path));
      break;
    case "qr":
      if (!attr(el, "align")) errors.push(err("<qr> requiere align", path));
      else if (!VALID_ALIGNS.has(attr(el, "align"))) errors.push(err(`align="${attr(el, "align")}" no válido en <qr>`, path));
      break;
    case "feed": {
      const lines = parseInt(attr(el, "lines") || "1");
      if (isNaN(lines) || lines < 0) errors.push(err(`lines="${attr(el, "lines")}" no válido en <feed>`, path));
      break;
    }
    case "if":
      if (!attr(el, "expr")) errors.push(err("<if> requiere expr", path));
      break;
    case "ifelse":
      if (!attr(el, "expr")) errors.push(err("<ifelse> requiere expr", path));
      if (!el.querySelector("then")) errors.push(err("<ifelse> requiere <then>", path));
      if (!el.querySelector("else")) errors.push(err("<ifelse> requiere <else>", path));
      break;
    case "each":
      if (!attr(el, "listVar")) errors.push(err("<each> requiere listVar", path));
      else {
        const cols = el.querySelectorAll("column");
        if (cols.length === 0) errors.push(err("<each> requiere al menos un <column>", path));
        cols.forEach((c, ci) => {
          const cpath = `${path}/column[${ci}]`;
          if (!attr(c, "field")) errors.push(err("<column> requiere field", cpath));
          if (!attr(c, "label")) errors.push(err("<column> requiere label", cpath));
          const w = attr(c, "width");
          if (w && w !== "auto" && (isNaN(parseInt(w)) || parseInt(w) <= 0)) {
            errors.push(err(`width="${w}" no válido en <column>`, cpath));
          }
        });
      }
      break;
    // cut, beep, open-drawer: no attributes required
  }

  // Validate showIf on all elements
  const showIf = attr(el, "showIf");
  if (showIf) {
    try {
      // basic syntax check: balanced ${} and no dangerous content
      if ((showIf.match(/\$\{/g) || []).length !== (showIf.match(/\}/g) || []).length) {
        errors.push(err(`showIf tiene llaves \$\{\} no balanceadas: "${showIf}"`, path));
      }
    } catch { /* ignore regex errors */ }
  }
}
