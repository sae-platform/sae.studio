import { describe, it, expect } from "vitest";
import { xmlToBlocks, blocksToXml, getDefaultBlocks } from "@/modules/ticket-designer/services/ticket-xml.service";
import { resetTicketUid } from "@/modules/ticket-designer/stores/ticket.store";

describe("Ticket XML Service", () => {
  describe("xmlToBlocks", () => {
    it("parsea XML básico con texto y separador", () => {
      const xml = `<saetickets version="1.0"><setup width="42"/><commands><text align="center" bold="true" size="large">HOLA</text><separator char="-"/></commands></saetickets>`;
      const result = xmlToBlocks(xml);
      expect(result.width).toBe(42);
      expect(result.blocks).toHaveLength(2);
      expect(result.blocks[0].type).toBe("text");
      expect((result.blocks[0] as any).text).toBe("HOLA");
      expect(result.blocks[1].type).toBe("separator");
    });

    it("parsea each block con columnas", () => {
      const xml = `<saetickets version="1.0"><setup width="32"/><commands><each listVar="ITEMS" header="true"><column field="DESC" label="Descripción" width="auto" align="left"/><column field="QTY" label="Cant" width="6" align="right"/></each></commands></saetickets>`;
      const result = xmlToBlocks(xml);
      expect(result.width).toBe(32);
      const each = result.blocks[0] as any;
      expect(each.type).toBe("each");
      expect(each.listVar).toBe("ITEMS");
      expect(each.columns).toHaveLength(2);
      expect(each.columns[0].field).toBe("DESC");
    });

    it("parsea if y ifelse", () => {
      const xml = `<saetickets version="1.0"><setup width="42"/><commands><if expr="total>100" align="left" bold="true">CARO</if><ifelse expr="activo" align="left"><then>SI</then><else>NO</else></ifelse></commands></saetickets>`;
      const result = xmlToBlocks(xml);
      expect(result.blocks).toHaveLength(2);
      expect(result.blocks[0].type).toBe("if");
      expect((result.blocks[0] as any).text).toBe("CARO");
      expect(result.blocks[1].type).toBe("ifelse");
      expect((result.blocks[1] as any).thenText).toBe("SI");
    });

    it("parsea showIf en bloques", () => {
      const xml = `<saetickets version="1.0"><setup width="42"/><commands><text align="left" showIf="activo">Visible</text></commands></saetickets>`;
      const result = xmlToBlocks(xml);
      expect((result.blocks[0] as any).showIf).toBe("activo");
    });

    it("XML malformado retorna defaults", () => {
      const result = xmlToBlocks("not xml");
      expect(result.blocks).toEqual([]);
      expect(result.width).toBe(42);
    });

    it("XML sin raíz válida retorna defaults", () => {
      const result = xmlToBlocks('<other><setup width="42"/><commands/></other>');
      expect(result.blocks).toEqual([]);
    });

    it("XML sin commands retorna vacío", () => {
      const result = xmlToBlocks('<saetickets version="1.0"><setup width="42"/></saetickets>');
      expect(result.blocks).toEqual([]);
    });

    it("acepta root <ticket> para backward compat", () => {
      const result = xmlToBlocks('<ticket><setup width="42"/><commands/></ticket>');
      expect(result.blocks).toEqual([]);
      expect(result.width).toBe(42);
    });
  });

  describe("blocksToXml", () => {
    it("serializa bloques a XML", () => {
      resetTicketUid();
      const blocks = getDefaultBlocks();
      const xml = blocksToXml(blocks, 42, "");
      expect(xml).toContain("<saetickets version=\"1.0\">");
      expect(xml).toContain("<setup");
      expect(xml).toContain("<commands>");
      expect(xml).toContain("<text");
      expect(xml).toContain("<each");
      expect(xml).toContain("<total");
    });

    it("incluye atributo printers cuando hay impresoras", () => {
      const blocks = [{ id: "t1", type: "text" as const, text: "H", align: "left" as const, bold: false, size: "normal" as const }];
      const xml = blocksToXml(blocks, 42, "Cocina, Barra");
      expect(xml).toContain('printers="Cocina, Barra"');
    });

    it("serializa showIf", () => {
      const blocks = [{ id: "t1", type: "text" as const, text: "H", align: "left" as const, bold: false, size: "normal" as const, showIf: "activo" }];
      const xml = blocksToXml(blocks, 42, "");
      expect(xml).toContain('showIf="activo"');
    });

    it("escapa caracteres especiales en XML", () => {
      const blocks = [{ id: "t1", type: "text" as const, text: "A & B < C", align: "left" as const, bold: false, size: "normal" as const }];
      const xml = blocksToXml(blocks, 42, "");
      expect(xml).toContain("A &amp; B &lt; C");
    });

    it("idempotencia: xmlToBlocks -> blocksToXml produce XML válido", () => {
      const original = `<saetickets version="1.0"><setup width="42"/><commands><text align="center" bold="true" size="large">TEST</text><separator char="-"/><total label="TOTAL" value="100" bold="true" align="left"/></commands></saetickets>`;
      const parsed = xmlToBlocks(original);
      const regenerated = blocksToXml(parsed.blocks, parsed.width, parsed.printers);
      const reparsed = xmlToBlocks(regenerated);
      expect(reparsed.width).toBe(42);
      expect(reparsed.blocks).toHaveLength(3);
    });

    it("soporta XML legacy <ticket> y regenera como <saetickets>", () => {
      const original = `<ticket><setup width="42"/><commands><text align="left" bold="false" size="normal">Hola</text></commands></ticket>`;
      const parsed = xmlToBlocks(original);
      const regenerated = blocksToXml(parsed.blocks, parsed.width, parsed.printers);
      expect(regenerated).toContain("<saetickets");
      expect(regenerated).not.toContain("<ticket>");
    });
  });

  describe("getDefaultBlocks", () => {
    it("retorna bloques por defecto con each y total", () => {
      resetTicketUid();
      const blocks = getDefaultBlocks();
      expect(blocks.length).toBeGreaterThan(3);
      const types = blocks.map((b) => b.type);
      expect(types).toContain("text");
      expect(types).toContain("each");
      expect(types).toContain("total");
      expect(types).toContain("cut");
    });
  });
});
