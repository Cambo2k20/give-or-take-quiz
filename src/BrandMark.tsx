import logoUrl from "./assets/brand/give-or-take-logo.svg";

export function BrandMark() {
  return (
    <img
      className="wordmark-mark"
      src={logoUrl}
      alt=""
      aria-hidden="true"
    />
  );
}
