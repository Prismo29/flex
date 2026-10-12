"use client";

import { useEffect, useState } from "react";

/** Chrome/Edge/Android install prompt event (not in TS DOM lib). */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "flex:install-dismissed";

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* storage unavailable (private mode etc.) — ignore */
  }
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  // Other iOS browsers (Chrome, Firefox, Edge...) can't add to home screen the same way.
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(ua);
  return iOS && safari;
}

/**
 * Registers /sw.js (production only) and shows a small "Install app" banner:
 * - Chromium: captures beforeinstallprompt and offers an Install button.
 * - iOS Safari: shows "Tap Share → Add to Home Screen" instructions.
 * Dismissal is remembered in localStorage.
 */
export default function RegisterSW() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      const register = () => {
        navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
          /* SW is a progressive enhancement; ignore failures */
        });
      };
      if (document.readyState === "complete") register();
      else window.addEventListener("load", register, { once: true });
    }

    if (isStandalone() || wasDismissed()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setHidden(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // iOS never fires beforeinstallprompt; delay slightly so it doesn't flash on load.
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isIosSafari()) timer = setTimeout(() => setShowIos(true), 1500);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    rememberDismissed();
    setHidden(true);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "dismissed") dismiss();
    else setHidden(true);
  };

  if (hidden || (!deferred && !showIos)) return null;

  return (
    <div
      role="dialog"
      aria-label="Install FLEX"
      className="fixed inset-x-0 bottom-[calc(80px+env(safe-area-inset-bottom))] z-50 px-4 md:bottom-6"
    >
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-gold/40 bg-surface/95 p-3 shadow-[0_8px_30px_rgba(212,175,55,0.18)] backdrop-blur">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 text-sm leading-snug">
          <p className="font-semibold text-gold-bright">Install FLEX</p>
          {deferred ? (
            <p className="text-muted">Get the app on your home screen.</p>
          ) : (
            <p className="text-muted">
              Tap <span className="font-semibold text-foreground">Share</span> →{" "}
              <span className="font-semibold text-foreground">Add to Home Screen</span>
            </p>
          )}
        </div>
        {deferred && (
          <button
            type="button"
            onClick={install}
            className="shrink-0 rounded-full bg-gradient-to-br from-gold-bright to-gold px-4 py-2 text-sm font-bold text-background active:scale-95"
          >
            Install
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-full p-2 text-muted hover:text-foreground"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
