"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useTransition,
  type ReactNode,
} from "react";
import type { ViewMode } from "@/types/database";
import { updateDefaultView } from "@/lib/actions/profile";

interface ViewModeContextValue {
  viewMode: ViewMode;
  savedDefault: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  saveAsDefault: (mode: ViewMode) => void;
  isSaving: boolean;
}

const ViewModeContext = createContext<ViewModeContextValue>({
  viewMode: "default",
  savedDefault: "default",
  setViewMode: () => {},
  saveAsDefault: () => {},
  isSaving: false,
});

export function useViewMode() {
  return useContext(ViewModeContext);
}

export function ViewModeProvider({
  children,
  initialMode,
}: {
  children: ReactNode;
  initialMode: ViewMode;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialMode);
  const [savedDefault, setSavedDefault] = useState<ViewMode>(initialMode);
  const [isPending, startTransition] = useTransition();

  const saveAsDefault = useCallback(
    (mode: ViewMode) => {
      setSavedDefault(mode);
      startTransition(async () => {
        await updateDefaultView(mode);
      });
    },
    []
  );

  return (
    <ViewModeContext.Provider
      value={{
        viewMode,
        savedDefault,
        setViewMode,
        saveAsDefault,
        isSaving: isPending,
      }}
    >
      {children}
    </ViewModeContext.Provider>
  );
}
