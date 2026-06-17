interface LabelPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  description: string;
}

export const LABEL_PRESETS: LabelPreset[] = [
  { id: "custom", name: "Personalizado", widthMm: 0, heightMm: 0, description: "El documento manda el tamaño" },
  { id: "avery-5160", name: "Avery 5160 (Dirección)", widthMm: 66.7, heightMm: 25.4, description: "30 etiquetas por hoja" },
  { id: "avery-5163", name: "Avery 5163 (Envío)", widthMm: 101.6, heightMm: 50.8, description: "10 etiquetas por hoja" },
  { id: "avery-5164", name: "Avery 5164 (Envío)", widthMm: 101.6, heightMm: 84.7, description: "6 etiquetas por hoja" },
  { id: "dymo-30252", name: "DYMO 30252 (Dirección)", widthMm: 54, heightMm: 25, description: "Rollo DYMO" },
  { id: "brother-dk-11201", name: "Brother DK-11201", widthMm: 29, heightMm: 90, description: "Rollo Brother" },
  { id: "zebra-4x6", name: "Zebra 4×6 Envío", widthMm: 101.6, heightMm: 152.4, description: "Rollo Zebra estándar" },
];
