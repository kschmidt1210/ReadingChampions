"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";

export function NavProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "loading" | "complete">("idle");
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const start = useCallback(() => {
    setState("loading");
    setProgress(15);
  }, []);

  const complete = useCallback(() => {
    setState("complete");
    setProgress(100);
    timeoutRef.current = setTimeout(() => {
      setState("idle");
      setProgress(0);
    }, 300);
  }, []);

  useEffect(() => {
    if (state === "loading") {
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + (90 - prev) * 0.08;
        });
      }, 250);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  useEffect(() => {
    if (state === "loading") {
      complete();
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      if (anchor.target === "_blank") return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#")) return;
      if (href === pathname) return;

      start();
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () =>
      document.removeEventListener("click", handleClick, { capture: true });
  }, [pathname, start]);

  if (state === "idle") return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-[3px] pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 shadow-[0_0_8px_rgba(99,102,241,0.4)] transition-all ease-out"
        style={{
          width: `${progress}%`,
          transitionDuration: state === "complete" ? "200ms" : "400ms",
          opacity: state === "complete" ? 0 : 1,
          transitionProperty: "width, opacity",
        }}
      />
    </div>
  );
}
