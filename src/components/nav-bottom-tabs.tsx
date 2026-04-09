"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, BookOpen, Plus, Settings, Scale, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrg } from "./providers";
import type { LucideIcon } from "lucide-react";

type NavTab = { href: string; label: string; icon: LucideIcon; activeColor: string; isAction?: never };
type ActionTab = { label: string; icon: LucideIcon; isAction: true };
type Tab = NavTab | ActionTab;

export function NavBottomTabs({ onAddBook }: { onAddBook: () => void }) {
  const pathname = usePathname();
  const { currentRole } = useOrg();

  const tabs: Tab[] = [
    { href: "/leaderboard", label: "Board", icon: Trophy, activeColor: "text-amber-500" },
    { href: "/my-books", label: "Books", icon: BookOpen, activeColor: "text-indigo-600" },
    { label: "Add", icon: Plus, isAction: true },
    { href: "/rules", label: "Rules", icon: Scale, activeColor: "text-teal-500" },
    ...(currentRole === "admin"
      ? [{ href: "/admin/settings", label: "Admin", icon: Settings, activeColor: "text-rose-500" } as NavTab]
      : []),
    { href: "/settings", label: "Account", icon: UserCog, activeColor: "text-gray-600" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200/80 bg-white/95 backdrop-blur-sm shadow-[0_-2px_10px_rgba(0,0,0,0.06)] md:hidden">
      <div className="flex items-center justify-around py-1.5">
        {tabs.map((tab) =>
          "isAction" in tab ? (
            <button
              key="add"
              onClick={onAddBook}
              aria-label="Add book"
              className="flex flex-col items-center gap-0.5 px-3 py-1"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 transition-all duration-200">
                <Plus className="h-5 w-5" />
              </div>
            </button>
          ) : (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium transition-colors",
                pathname === tab.href || pathname.startsWith(tab.href + "/")
                  ? tab.activeColor
                  : "text-gray-400"
              )}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </Link>
          )
        )}
      </div>
    </nav>
  );
}
