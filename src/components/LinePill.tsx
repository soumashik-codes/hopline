import { getLineInfo } from "@/lib/transport/lines";

/** Coloured line badge. The visible short name plus a hidden full name means colour never carries meaning alone. */
export function LinePill({ line, busNumber }: { line: string; busNumber?: string }) {
  const info = getLineInfo(line);
  const visible = busNumber ?? info.short;
  const spoken = busNumber ? `Bus ${busNumber}` : info.spoken;
  return (
    <span className="pill" style={{ background: info.colour, color: info.textColour }}>
      <span aria-hidden="true">{visible}</span>
      <span className="visually-hidden">{spoken}</span>
    </span>
  );
}
