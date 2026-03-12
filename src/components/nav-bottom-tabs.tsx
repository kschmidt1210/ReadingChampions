"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, BookOpen, BarChart3, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrg } from "./providers";

export function NavBottomTabs({ onAddBook }: { onAddBook: () => void }) {
  const pathname = usePathname();
  const { currentRole } = useOrg();

  const tabs = [
    { href: "/leaderboard", label: "Board", icon: Trophy },
    { href: "/my-books", label: "Books", icon: BookOpen },
    { label: "Add", icon: Plus, isAction: true as const },
    { href: "/progress", label: "Progress", icon: BarChart3 },
    ...(currentRole === "admin"
      ? [{ href: "/admin/settings", label: "Admin", icon: Settings }]
      : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white md:hidden">
      <div className="flex items-center justify-around py-1">
        {tabs.map((tab) =>
          "isAction" in tab && tab.isAction ? (
            <button
              key="add"
              onClick={onAddBook}
              className="flex flex-col items-center gap-0.5 px-3 py-2"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white">
                <Plus className="h-5 w-5" />
              </div>
            </button>
          ) : (
            <Link
              key={"href" in tab ? tab.href : tab.label}
              href={"href" in tab ? tab.href! : "/"}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 text-xs",
                "href" in tab &&
                  (pathname === tab.href ||
                    pathname.startsWith(tab.href + "/"))
                  ? "text-indigo-600"
                  : "text-gray-500"
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
