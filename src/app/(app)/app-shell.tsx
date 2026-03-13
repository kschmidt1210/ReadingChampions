"use client";

import { useState } from "react";
import { NavSidebar } from "@/components/nav-sidebar";
import { NavBottomTabs } from "@/components/nav-bottom-tabs";
import { AddBookPanel } from "@/components/add-book-panel";
import { useOrg } from "@/components/providers";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [addBookOpen, setAddBookOpen] = useState(false);
  const { seasonId, genres } = useOrg();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <NavSidebar onAddBook={() => setAddBookOpen(true)} />
      <main className="flex-1 pb-20 md:pb-0 md:ml-64">{children}</main>
      <NavBottomTabs onAddBook={() => setAddBookOpen(true)} />
      <AddBookPanel
        open={addBookOpen}
        onClose={() => setAddBookOpen(false)}
        genres={genres}
        seasonId={seasonId ?? undefined}
      />
    </div>
  );
}
