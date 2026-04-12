"use client";

import { useState } from "react";
import { NavSidebar } from "@/components/nav-sidebar";
import { NavBottomTabs } from "@/components/nav-bottom-tabs";
import { NavProgress } from "@/components/nav-progress";
import { BookEntryPanel } from "@/components/book-entry-panel";
import { DismissSplash } from "@/components/dismiss-splash";
import { useOrg } from "@/components/providers";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [addBookOpen, setAddBookOpen] = useState(false);
  const { seasonId, genres, managedPlayers } = useOrg();

  return (
    <div data-app-shell className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <DismissSplash />
      <NavProgress />
      <div
        aria-hidden
        className="fixed inset-x-0 top-0 z-40 pointer-events-none md:hidden"
        style={{ height: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
      >
        <div className="h-full bg-gradient-to-b from-white via-white/85 to-transparent" />
      </div>
      <NavSidebar onAddBook={() => setAddBookOpen(true)} />
      <main className="flex-1 min-w-0 pt-safe-top md:pt-0 pb-safe-bottom md:pb-0 md:ml-64">{children}</main>
      <NavBottomTabs onAddBook={() => setAddBookOpen(true)} />
      <BookEntryPanel
        open={addBookOpen}
        onClose={() => setAddBookOpen(false)}
        genres={genres}
        seasonId={seasonId ?? undefined}
        managedPlayers={managedPlayers}
      />
    </div>
  );
}
