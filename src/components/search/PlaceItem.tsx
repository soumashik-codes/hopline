import { Icon, type IconName } from "@/components/Icon";
import { placeIcon, placeSummary, servedBy } from "@/lib/places";
import type { Place } from "@/lib/transport/types";

/** The inside of a place row: icon, name, type as text, and the lines that serve it when known. */
export function PlaceItem({ place, icon, label }: { place: Place; icon?: IconName; label?: string }) {
  const lines = servedBy(place);
  return (
    <>
      <span className="ico">
        <Icon name={icon ?? placeIcon(place)} />
      </span>
      <span className="meta">
        <b>{place.name}</b>
        <small className="wrap">{label ? `${label} · ${placeSummary(place)}` : placeSummary(place)}</small>
        {lines && <small className="stopline">{lines}</small>}
      </span>
    </>
  );
}
