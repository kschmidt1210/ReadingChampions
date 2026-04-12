"use client";

import { useEffect } from "react";

export function DismissSplash() {
  useEffect(() => {
    const splash = document.getElementById("__splash");
    if (!splash) return;
    splash.style.transition = "opacity 0.2s ease-out";
    splash.style.opacity = "0";
    const timer = setTimeout(() => {
      splash.style.display = "none";
    }, 200);
    return () => clearTimeout(timer);
  }, []);
  return null;
}
