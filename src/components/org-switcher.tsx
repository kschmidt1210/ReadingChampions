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
  const { orgs, currentOrgId, setCurrentOrg } = useOrg();

  if (orgs.length <= 1) return null;

  return (
    <Select value={currentOrgId ?? undefined} onValueChange={setCurrentOrg}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select competition" />
      </SelectTrigger>
      <SelectContent>
        {orgs.map((org) => (
          <SelectItem key={org.id} value={org.id}>
            {org.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
