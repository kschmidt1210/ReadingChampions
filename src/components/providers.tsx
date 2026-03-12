"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface OrgContextValue {
  currentOrgId: string | null;
  currentOrgName: string | null;
  currentRole: string | null;
  setCurrentOrg: (orgId: string) => void;
  orgs: Array<{ id: string; name: string; role: string; invite_code: string }>;
  seasonId: string | null;
  genres: Array<{ id: string; name: string }>;
}

const OrgContext = createContext<OrgContextValue>({
  currentOrgId: null,
  currentOrgName: null,
  currentRole: null,
  setCurrentOrg: () => {},
  orgs: [],
  seasonId: null,
  genres: [],
});

export function useOrg() {
  return useContext(OrgContext);
}

export function OrgProvider({
  children,
  orgs,
  initialOrgId,
  seasonId,
  genres,
}: {
  children: ReactNode;
  orgs: Array<{ id: string; name: string; role: string; invite_code: string }>;
  initialOrgId: string | null;
  seasonId: string | null;
  genres: Array<{ id: string; name: string }>;
}) {
  const [currentOrgId, setCurrentOrgId] = useState(
    initialOrgId ?? orgs[0]?.id ?? null
  );

  const currentOrg = orgs.find((o) => o.id === currentOrgId) ?? null;

  function setCurrentOrg(orgId: string) {
    setCurrentOrgId(orgId);
    // Persist selection in localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("currentOrgId", orgId);
    }
  }

  return (
    <OrgContext.Provider
      value={{
        currentOrgId,
        currentOrgName: currentOrg?.name ?? null,
        currentRole: currentOrg?.role ?? null,
        setCurrentOrg,
        orgs,
        seasonId,
        genres,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}
