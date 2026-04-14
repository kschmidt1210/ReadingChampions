"use client";

import { useState } from "react";
import { NavSidebar } from "@/components/nav-sidebar";
import { NavBottomTabs } from "@/components/nav-bottom-tabs";
import { NavProgress } from "@/components/nav-progress";
import { BookEntryPanel } from "@/components/book-entry-panel";
import { useOrg } from "@/components/providers";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [addBookOpen, setAddBookOpen] = useState(false);
  const { seasonId, genres, managedPlayers } = useOrg();

  return (
    <div data-app-shell className="flex min-h-screen bg-gradient-to-br from-muted/50 via-background to-indigo-50/30 dark:to-indigo-950/30">
      <NavProgress />
      <div
        aria-hidden
        className="fixed inset-x-0 top-0 z-40 pointer-events-none md:hidden"
        style={{ height: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
      >
        <div className="h-full bg-gradient-to-b from-background via-background/85 to-transparent" />
      </div>
      <NavSidebar onAddBook={() => setAddBookOpen(true)} />
      <main className="flex-1 min-w-0 pt-safe-top md:pt-0 pb-safe-bottom md:pb-0 md:ml-64">
        {children}
        <footer className="px-4 py-6 text-center text-xs text-muted-foreground/70">
          Made with blood, sweat, and cum by Josh Graves and Kody Schmidt. This app is provided
          free of charge.{" "}
          <a
            href="#donate"
            className="underline hover:text-muted-foreground transition-colors"
          >
            Donate
          </a>{" "}
          to help keep the lights on.
        </footer>
      </main>
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
