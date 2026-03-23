"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DISMISS_KEY = "pwa-install-dismissed";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SHOW_DELAY_MS = 30_000; // 30 seconds

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface UsePwaInstallResult {
  canInstall: boolean;
  install: () => Promise<void>;
  isDismissed: boolean;
  dismiss: () => void;
}

function isDismissedWithTTL(): boolean {
  if (typeof localStorage === "undefined") return false;
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = parseInt(raw, 10);
  if (isNaN(ts)) return true;
  return Date.now() - ts < DISMISS_TTL_MS;
}

export function usePwaInstall(): UsePwaInstallResult {
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(() => isDismissedWithTTL());

  useEffect(() => {
    // If already dismissed within TTL, do nothing
    if (isDismissedWithTTL()) {
      setIsDismissed(true);
      return;
    }

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      promptRef.current = e as BeforeInstallPromptEvent;

      // Wait 30 seconds before surfacing the install prompt
      timerRef.current = setTimeout(() => {
        if (!isDismissedWithTTL()) {
          setCanInstall(true);
        }
      }, SHOW_DELAY_MS);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const install = useCallback(async (): Promise<void> => {
    if (!promptRef.current) return;
    await promptRef.current.prompt();
    const { outcome } = await promptRef.current.userChoice;
    if (outcome === "accepted") {
      setCanInstall(false);
    }
  }, []);

  const dismiss = useCallback((): void => {
    setCanInstall(false);
    setIsDismissed(true);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }, []);

  return { canInstall, install, isDismissed, dismiss };
}
