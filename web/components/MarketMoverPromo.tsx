"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const DISMISS_KEY = "nbl330.marketmover-promo-dismissed";
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 1500;
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const HREF =
  "https://www.marketmover.net?utm_source=nbl33-0&utm_medium=popup&utm_campaign=crosspromo";

/** Home and the main perfect-season game. Trailing slash is on in production. */
function isPromoRoute(pathname: string) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return path === "/" || path === "/play";
}

function dismissedRecently() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    return Number.isFinite(at) && Date.now() - at < DISMISS_MS;
  } catch {
    return false;
  }
}

function rememberDismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* private mode: hide for this visit only */
  }
}

export default function MarketMoverPromo() {
  const pathname = usePathname() ?? "/";
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isPromoRoute(pathname) || dismissedRecently()) {
      setOpen(false);
      return;
    }
    const timer = window.setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        rememberDismiss();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  function dismiss() {
    rememberDismiss();
    setOpen(false);
  }

  return (
    <div className="mm-promo-backdrop" onClick={dismiss}>
      <div
        ref={dialogRef}
        className="mm-promo card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="mm-promo-x" aria-label="Dismiss" onClick={dismiss}>
          ×
        </button>
        <img
          className="mm-promo-logo"
          src={`${BASE}/marketmover-mark.png`}
          alt=""
          width={84}
          height={84}
        />
        <div className="mm-promo-copy">
          <h2 id={titleId}>MarketMover</h2>
          <p>Live prices and model markets in one place. More markets coming.</p>
        </div>
        <a className="btn btn-primary mm-promo-cta" href={HREF} onClick={dismiss}>
          Open MarketMover
        </a>
      </div>
    </div>
  );
}
