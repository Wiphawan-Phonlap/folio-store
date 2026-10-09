"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { isNativeApp } from "@/lib/capacitor-payment";

export default function PaymentDeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativeApp()) return;

    let disposed = false;

    async function handleUrl(url: string) {
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        console.error("[payment] Invalid callback URL");
        return;
      }

      if (parsedUrl.protocol !== "folio:" || parsedUrl.hostname !== "payment-result") {
        return;
      }

      const orderId = parsedUrl.searchParams.get("order_id");
      const sessionId = parsedUrl.searchParams.get("session_id");
      if (!orderId || !sessionId?.startsWith("cs_")) {
        console.error("[payment] Callback is missing payment details");
        return;
      }

      try {
        await Browser.close();
      } catch (error) {
        console.warn("[payment] Could not close the payment browser", error);
      }

      if (!disposed) {
        router.replace(`/checkout/success?order_id=${encodeURIComponent(orderId)}&session_id=${encodeURIComponent(sessionId)}`);
      }
    }

    const listener = App.addListener("appUrlOpen", ({ url }) => {
      void handleUrl(url);
    });

    void App.getLaunchUrl()
      .then((launch) => {
        if (launch?.url) return handleUrl(launch.url);
      })
      .catch((error) => {
        console.error("[payment] Could not read launch URL", error);
      });

    return () => {
      disposed = true;
      void listener.then((handle) => handle.remove());
    };
  }, [router]);

  return null;
}
