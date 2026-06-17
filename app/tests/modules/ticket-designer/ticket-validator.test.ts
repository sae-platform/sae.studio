import { describe, it, expect } from "vitest";
import { validateTicketXml } from "@/modules/ticket-designer/services/ticket-validator.service";

describe("Ticket XML Validator", () => {
  describe("validateTicketXml", () => {
    it("XML vacío produce error", () => {
      const r = validateTicketXml("");
      expect(r.valid).toBe(false);
      expect(r.errors[0].message).toContain("vacío");
    });

    it("XML mal formado produce error", () => {
      const r = validateTicketXml("<saetickets><setup</saetickets>");
      expect(r.valid).toBe(false);
      expect(r.errors[0].message).toContain("mal formado");
    });

    it("raíz inválida produce error", () => {
      const r = validateTicketXml("<foo><setup width='42'/><commands/></foo>");
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.message.includes("Raíz"))).toBe(true);
    });

    it("<saetickets> sin version produce error", () => {
      const r = validateTicketXml("<saetickets><setup width='42'/><commands/></saetickets>");
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.message.includes("version"))).toBe(true);
    });

    it("<ticket> sin version es válido (backward compat)", () => {
      const r = validateTicketXml("<ticket><setup width='42'/><commands/></ticket>");
      expect(r.valid).toBe(true);
    });

    it("falta <setup> produce error", () => {
      const r = validateTicketXml("<saetickets version='1.0'><commands/></saetickets>");
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.message.includes("setup"))).toBe(true);
    });

    it("setup sin width produce error", () => {
      const r = validateTicketXml("<saetickets version='1.0'><setup/><commands/></saetickets>");
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.message.includes("width"))).toBe(true);
    });

    it("setup width no numérico produce error", () => {
      const r = validateTicketXml("<saetickets version='1.0'><setup width='abc'/><commands/></saetickets>");
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.message.includes("número"))).toBe(true);
    });

    it("setup width=0 produce error", () => {
      const r = validateTicketXml("<saetickets version='1.0'><setup width='0'/><commands/></saetickets>");
      expect(r.valid).toBe(false);
    });

    it("falta <commands> produce error", () => {
      const r = validateTicketXml("<saetickets version='1.0'><setup width='42'/></saetickets>");
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.message.includes("commands"))).toBe(true);
    });

    it("tag no reconocido produce error", () => {
      const r = validateTicketXml("<saetickets version='1.0'><setup width='42'/><commands><unknown/></commands></saetickets>");
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.message.includes("no reconocido"))).toBe(true);
    });

    it("<text> sin align produce error", () => {
      const r = validateTicketXml("<saetickets version='1.0'><setup width='42'/><commands><text>Hola</text></commands></saetickets>");
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.message.includes("align"))).toBe(true);
    });

    it("<text> con align inválido produce error", () => {
      const r = validateTicketXml("<saetickets version='1.0'><setup width='42'/><commands><text align='top'>Hola</text></commands></saetickets>");
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.message.includes("align"))).toBe(true);
    });

    it("<text> con size inválido produce error", () => {
      const r = validateTicketXml("<saetickets version='1.0'><setup width='42'/><commands><text align='left' size='huge'>Hola</text></commands></saetickets>");
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.message.includes("size"))).toBe(true);
    });

    it("<if> sin expr produce error", () => {
      const r = validateTicketXml("<saetickets version='1.0'><setup width='42'/><commands><if align='left'>texto</if></commands></saetickets>");
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.message.includes("expr"))).toBe(true);
    });

    it("<ifelse> sin expr produce error", () => {
      const r = validateTicketXml("<saetickets version='1.0'><setup width='42'/><commands><ifelse align='left'><then>A</then><else>B</else></ifelse></commands></saetickets>");
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.message.includes("expr"))).toBe(true);
    });

    it("<ifelse> sin <then> produce error", () => {
      const r = validateTicketXml("<saetickets version='1.0'><setup width='42'/><commands><ifelse expr='x' align='left'><else>B</else></ifelse></commands></saetickets>");
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.message.includes("then"))).toBe(true);
    });

    it("<ifelse> sin <else> produce error", () => {
      const r = validateTicketXml("<saetickets version='1.0'><setup width='42'/><commands><ifelse expr='x' align='left'><then>A</then></ifelse></commands></saetickets>");
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.message.includes("else"))).toBe(true);
    });

    it("<each> sin listVar produce error", () => {
      const r = validateTicketXml("<saetickets version='1.0'><setup width='42'/><commands><each align='left'><column field='x' label='X' width='auto'/></each></commands></saetickets>");
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.message.includes("listVar"))).toBe(true);
    });

    it("<each> sin columnas produce error", () => {
      const r = validateTicketXml("<saetickets version='1.0'><setup width='42'/><commands><each listVar='ITEMS' align='left'/></commands></saetickets>");
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.message.includes("menos un"))).toBe(true);
    });

    it("<column> sin field produce error", () => {
      const r = validateTicketXml("<saetickets version='1.0'><setup width='42'/><commands><each listVar='ITEMS' align='left'><column label='X' width='auto'/></each></commands></saetickets>");
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.message.includes("field"))).toBe(true);
    });

    it("<column> sin label produce error", () => {
      const r = validateTicketXml("<saetickets version='1.0'><setup width='42'/><commands><each listVar='ITEMS' align='left'><column field='x' width='auto'/></each></commands></saetickets>");
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.message.includes("label"))).toBe(true);
    });

    it("<feed> con lines inválido produce error", () => {
      const r = validateTicketXml("<saetickets version='1.0'><setup width='42'/><commands><feed lines='abc'/></commands></saetickets>");
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.message.includes("lines"))).toBe(true);
    });

    it("showIf con llaves no balanceadas produce error", () => {
      const r = validateTicketXml("<saetickets version='1.0'><setup width='42'/><commands><text align='left' showIf='${activo'>texto</text></commands></saetickets>");
      expect(r.valid).toBe(false);
    });

    it("showIf con llaves balanceadas es válido", () => {
      const r = validateTicketXml("<saetickets version='1.0'><setup width='42'/><commands><text align='left' showIf='${activo}'>texto</text></commands></saetickets>");
      expect(r.valid).toBe(true);
    });

    it("XML completo y válido retorna valid:true", () => {
      const xml = `<saetickets version="1.0">
  <setup width="42" printers="Cocina"/>
  <commands>
    <text align="center" bold="true" size="large">**Mi Empresa**</text>
    <separator char="-"/>
    <each listVar="ITEMS" header="true" align="left">
      <column field="DESC" label="Descripción" width="auto" align="left"/>
      <column field="QTY" label="Cant" width="6" align="right"/>
    </each>
    <total label="TOTAL" value="\${TOTAL}" bold="true" extraBold="false" align="left"/>
    <feed lines="3"/>
    <cut/>
    <if expr="total>100" bold="true" size="normal" align="left" showIf="activo">CARO</if>
    <ifelse expr="activo" bold="false" extraBold="false" size="normal" align="left">
      <then>SI</then>
      <else>NO</else>
    </ifelse>
  </commands>
</saetickets>`;
      const r = validateTicketXml(xml);
      expect(r.valid).toBe(true);
      expect(r.errors).toHaveLength(0);
    });
  });
});
