"use client";

import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export async function openPaymentUrl(url: string) {
  if (isNativeApp()) {
    await Browser.open({
      url,
      toolbarColor: "#1b3b2b",
    });
    return;
  }

  window.location.assign(url);
}
