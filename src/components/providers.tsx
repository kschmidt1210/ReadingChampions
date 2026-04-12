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

export interface ManagedPlayerInfo {
  userId: string;
  displayName: string;
}

interface OrgContextValue {
  currentOrgId: string | null;
  currentOrgName: string | null;
  currentRole: string | null;
  setCurrentOrg: (orgId: string) => void;
  orgs: Array<{ id: string; name: string; role: string; invite_code: string }>;
  seasonId: string | null;
  genres: Array<{ id: string; name: string }>;
  managedPlayers: ManagedPlayerInfo[];
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
  managedPlayers: [],
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
  managedPlayers: initialManagedPlayers = [],
}: {
  children: ReactNode;
  orgs: Array<{ id: string; name: string; role: string; invite_code: string }>;
  initialOrgId: string | null;
  seasonId: string | null;
  genres: Array<{ id: string; name: string }>;
  managedPlayers?: ManagedPlayerInfo[];
}) {
  const [currentOrgId, setCurrentOrgId] = useState(
    initialOrgId ?? orgs[0]?.id ?? null
  );
  const [seasonId, setSeasonId] = useState(initialSeasonId);
  const [genres, setGenres] = useState(initialGenres);
  const [managedPlayers, setManagedPlayers] = useState(initialManagedPlayers);
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
          setManagedPlayers(result.managedPlayers);
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
        managedPlayers,
        isSwitching: isPending,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}
