import { fromUnit, toUnit } from "@/modules/label-designer/object";

type Unit = "mm" | "cm" | "in" | "pt";
type Guideline = { id: string; orientation: "horizontal" | "vertical"; posPt: number };

type RulerProps = {
  orientation: "horizontal" | "vertical";
  lengthPt: number;
  zoom: number;
  unit: Unit;
  offsetPt?: number;
  onStartGuideline?: (e: React.MouseEvent) => void;
  guidelines?: Guideline[];
};

export function Ruler({
  orientation,
  lengthPt,
  zoom,
  unit,
  offsetPt = 0,
  onStartGuideline,
  guidelines = [],
}: RulerProps) {
  const isH = orientation === "horizontal";
  const stepPt = fromUnit(10, unit === "in" ? "in" : unit);
  const subStepPt = stepPt / 10;

  const ticks = [];
  const startPt = Math.floor(-offsetPt / stepPt) * stepPt;
  const endPt = startPt + 5000;

  for (let pt = startPt; pt <= endPt; pt += subStepPt) {
    const pos = (pt + offsetPt) * zoom;
    const i = Math.round(pt / subStepPt);
    const isMajor = i % 10 === 0;
    const isMid = i % 5 === 0 && !isMajor;
    const val = Math.round(toUnit(pt, unit));

    ticks.push(
      <div key={pt} className={`rulerTick ${isMajor ? "major" : isMid ? "mid" : "small"}`} style={{ [isH ? "left" : "top"]: pos }}>
        {isMajor && <span className="rulerLabel">{val}</span>}
      </div>
    );
  }

  return (
    <div className={`ruler ${orientation}`} onMouseDown={onStartGuideline}>
      {ticks}
      {guidelines.filter((g) => g.orientation === orientation).map((g) => (
        <div key={g.id} className="rulerIndicator" style={{ [isH ? "left" : "top"]: (g.posPt + offsetPt) * zoom }} />
      ))}
    </div>
  );
}
