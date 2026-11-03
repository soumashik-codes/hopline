import Link from "next/link";
import { Icon } from "./Icon";

/** Screen header. The title is the page's single <h1>. */
export function TopBar({ title, backHref, backLabel = "Back" }: { title: string; backHref?: string; backLabel?: string }) {
  return (
    <header className="topbar">
      {backHref && (
        <Link className="iconbtn" href={backHref} aria-label={backLabel}>
          <Icon name="back" />
        </Link>
      )}
      <h1 className="title" tabIndex={-1}>
        {title}
      </h1>
    </header>
  );
}
