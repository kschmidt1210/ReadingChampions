"use client";

import { useState } from "react";
import { NavSidebar } from "@/components/nav-sidebar";
import { NavBottomTabs } from "@/components/nav-bottom-tabs";
import { NavProgress } from "@/components/nav-progress";
import { BookEntryPanel } from "@/components/book-entry-panel";
import { useOrg } from "@/components/providers";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [addBookOpen, setAddBookOpen] = useState(false);
  const { seasonId, genres } = useOrg();

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <NavProgress />
      <NavSidebar onAddBook={() => setAddBookOpen(true)} />
      <main className="flex-1 pb-20 md:pb-0 md:ml-64">{children}</main>
      <NavBottomTabs onAddBook={() => setAddBookOpen(true)} />
      <BookEntryPanel
        open={addBookOpen}
        onClose={() => setAddBookOpen(false)}
        genres={genres}
        seasonId={seasonId ?? undefined}
      />
    </div>
  );
}
