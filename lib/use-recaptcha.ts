"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReCaptchaAction } from "@/lib/recaptcha-actions";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export function useRecaptcha() {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE?.trim() || "";
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!siteKey || typeof window === "undefined") return;

    let cancelled = false;
    const checkReady = () => {
      if (!window.grecaptcha) {
        window.setTimeout(checkReady, 200);
        return;
      }
      window.grecaptcha.ready(() => {
        if (!cancelled) {
          setIsReady(true);
        }
      });
    };

    checkReady();
    return () => {
      cancelled = true;
    };
  }, [siteKey]);

  const runRecaptcha = useCallback(
    async (action: ReCaptchaAction) => {
      if (!siteKey || !window.grecaptcha) {
        throw new Error("Security check is not ready.");
      }

      return window.grecaptcha.execute(siteKey, { action });
    },
    [siteKey]
  );

  return {
    siteKey,
    isReady,
    runRecaptcha,
  };
}
