"use client";

import {
  createContext,
  useContext,
  useState,
  useTransition,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { switchOrg } from "@/lib/actions/organizations";

interface OrgContextValue {
  currentOrgId: string | null;
  currentOrgName: string | null;
  currentRole: string | null;
  setCurrentOrg: (orgId: string) => void;
  orgs: Array<{ id: string; name: string; role: string; invite_code: string }>;
  seasonId: string | null;
  genres: Array<{ id: string; name: string }>;
  isSwitching: boolean;
}

const OrgContext = createContext<OrgContextValue>({
  currentOrgId: null,
  currentOrgName: null,
  currentRole: null,
  setCurrentOrg: () => {},
  orgs: [],
  seasonId: null,
  genres: [],
  isSwitching: false,
});

export function useOrg() {
  return useContext(OrgContext);
}

export function OrgProvider({
  children,
  orgs,
  initialOrgId,
  seasonId: initialSeasonId,
  genres: initialGenres,
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
  const [seasonId, setSeasonId] = useState(initialSeasonId);
  const [genres, setGenres] = useState(initialGenres);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const currentOrg = orgs.find((o) => o.id === currentOrgId) ?? null;

  const setCurrentOrg = useCallback(
    (orgId: string) => {
      setCurrentOrgId(orgId);
      startTransition(async () => {
        const result = await switchOrg(orgId);
        if (result) {
          setSeasonId(result.seasonId);
          setGenres(result.genres);
        }
        router.refresh();
      });
    },
    [router]
  );

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
        isSwitching: isPending,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}
