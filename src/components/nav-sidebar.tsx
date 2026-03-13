"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, BookOpen, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { OrgSwitcher } from "./org-switcher";
import { useOrg } from "./providers";

const navItems = [
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/my-books", label: "My Books", icon: BookOpen },
];

const adminItems = [
  { href: "/admin/settings", label: "Admin Settings", icon: Settings },
];

export function NavSidebar({ onAddBook }: { onAddBook: () => void }) {
  const pathname = usePathname();
  const { currentRole } = useOrg();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:bg-white">
      <div className="flex h-14 items-center border-b px-4">
        <span className="text-lg font-bold">Super Reader</span>
      </div>
      <div className="px-3 py-2">
        <OrgSwitcher />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-indigo-50 text-indigo-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
        {currentRole === "admin" &&
          adminItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
      </nav>
      <div className="border-t p-3">
        <button
          onClick={onAddBook}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Book
        </button>
      </div>
    </aside>
  );
}
