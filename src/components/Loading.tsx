/** Loading state announced to screen readers via role="status". */
export function Loading({ label }: { label: string }) {
  return (
    <p className="loading" role="status">
      {label}
    </p>
  );
}
