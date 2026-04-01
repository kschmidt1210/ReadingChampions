"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, BookOpen, Settings, Plus, LogOut, Sparkles, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { OrgSwitcher } from "./org-switcher";
import { useOrg } from "./providers";
import { logout } from "@/lib/actions/auth";

const navItems = [
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy, color: "text-amber-500" },
  { href: "/my-books", label: "My Books", icon: BookOpen, color: "text-indigo-500" },
  { href: "/rules", label: "Rules & Points", icon: Scale, color: "text-teal-500" },
];

const adminItems = [
  { href: "/admin/settings", label: "Admin Settings", icon: Settings, color: "text-rose-500" },
];

export function NavSidebar({ onAddBook }: { onAddBook: () => void }) {
  const pathname = usePathname();
  const { currentRole } = useOrg();

  return (
    <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:flex-col md:border-r md:border-gray-200/80 md:bg-white md:z-40">
      <div className="flex h-16 items-center gap-2.5 px-5 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
          <Sparkles className="h-4.5 w-4.5 text-white" />
        </div>
        <span className="text-lg font-bold text-white tracking-tight">Super Reader</span>
      </div>
      <div className="px-3 py-3">
        <OrgSwitcher />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive ? "text-white" : item.color)} />
              {item.label}
            </Link>
          );
        })}
        {currentRole === "admin" &&
          adminItems.map((item) => {
            const isActive = pathname.startsWith("/admin");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-white" : item.color)} />
                {item.label}
              </Link>
            );
          })}
      </nav>
      <div className="border-t border-gray-200/80 p-3 space-y-2">
        <button
          onClick={onAddBook}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:brightness-110 transition-all duration-200"
        >
          <Plus className="h-4 w-4" />
          Add Book
        </button>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </form>
      </div>
    </aside>
  );
}
