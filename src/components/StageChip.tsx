import { stageColor, stageLabel, type Stage } from "@/lib/stages";

export function StageChip({ stage }: { stage: Stage }) {
  return (
    <span
      className="stage-chip"
      style={{
        backgroundColor: `color-mix(in oklch, ${stageColor(stage)} 18%, transparent)`,
        color: `color-mix(in oklch, ${stageColor(stage)} 60%, oklch(0.20 0.03 155))`,
        border: `1px solid color-mix(in oklch, ${stageColor(stage)} 35%, transparent)`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: stageColor(stage) }} />
      {stageLabel(stage)}
    </span>
  );
}
