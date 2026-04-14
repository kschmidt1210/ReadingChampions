"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import type { ThemePreference } from "@/types/database";

export function ThemeSync({ preference }: { preference: ThemePreference }) {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme(preference);
  }, [preference, setTheme]);

  return null;
}
