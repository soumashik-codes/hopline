import Link from "next/link";
import { TopBar } from "@/components/TopBar";

export default function NotFound() {
  return (
    <>
      <TopBar title="Not found" backHref="/" />
      <p className="empty">
        We couldn’t find that page or route. <Link href="/" style={{ textDecoration: "underline" }}>Plan a new journey</Link>.
      </p>
    </>
  );
}
