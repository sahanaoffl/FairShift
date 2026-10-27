"use client";

import { useEffect } from "react";

export function PwaRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/service-worker.js").catch(() => {
        console.error("FairShift offline shell could not be registered.");
      });
    }
  }, []);
  return null;
}
