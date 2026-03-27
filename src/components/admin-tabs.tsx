"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Users, BookOpen, Calculator, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const tabs: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/players", label: "Players", icon: Users },
  { href: "/admin/genres", label: "Genres", icon: BookOpen },
  { href: "/admin/scoring", label: "Scoring", icon: Calculator },
  { href: "/admin/flagged", label: "Flagged", icon: Flag },
];

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 mb-6 overflow-x-auto pb-px border-b border-gray-200">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px",
              isActive
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <tab.icon className={cn("h-4 w-4", isActive ? "text-indigo-500" : "text-gray-400")} />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
