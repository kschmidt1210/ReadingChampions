"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/players", label: "Players" },
  { href: "/admin/genres", label: "Genres" },
  { href: "/admin/scoring", label: "Scoring" },
  { href: "/admin/flagged", label: "Flagged" },
];

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 mb-6 overflow-x-auto border-b">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
            pathname === tab.href
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
