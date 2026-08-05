export function QaStatusBadge({ label = "QA" }: { label?: string }) {
  return <span className="qa-status-badge">{label}</span>;
}

export function QaModeBanner() {
  return (
    <div className="qa-mode-banner" data-qa-mode="true" role="status">
      <QaStatusBadge />
      <span>QA mode · Results are not saved</span>
    </div>
  );
}
