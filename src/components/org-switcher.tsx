"use client";

import { useOrg } from "./providers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function OrgSwitcher() {
  const { orgs, currentOrgId, currentOrgName, setCurrentOrg } = useOrg();

  if (orgs.length <= 1) {
    if (!currentOrgName) return null;
    return (
      <div className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Competition</p>
        <p className="text-sm font-semibold text-gray-700 truncate">{currentOrgName}</p>
      </div>
    );
  }

  return (
    <Select
      value={currentOrgId ?? undefined}
      onValueChange={(value) => {
        if (value) setCurrentOrg(value);
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select competition" />
      </SelectTrigger>
      <SelectContent>
        {orgs.map((org) => (
          <SelectItem key={org.id} value={org.id} label={org.name}>
            {org.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
