"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authToken");
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiAddSkill(skillName: string): Promise<void> {
  const url = `${BASE_URL}/api/v1/candidates/profile/skills`;
  const { data } = await axios.post(
    url,
    {
      skill_name: skillName,
      skill_category: "technical",
      proficiency: "intermediate",
      years_experience: 0,
    },
    { headers: { ...authHeaders() } }
  );
  return data;
}

export function useAddSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (skillName: string) => apiAddSkill(skillName),
    onSuccess: () => {
      // ── FIX 4a : invalider immédiatement toutes les clés concernées ──

      // 1. Skills du profil → EligibilityReasons filtre les skills déjà ajoutés
      queryClient.invalidateQueries({ queryKey: ["candidate", "profile"] });
      queryClient.invalidateQueries({ queryKey: ["candidate", "profile", "skills"] });

      // 2. Eligibilité de chaque job → badge se met à jour via computeEligibility()
      //    (synchrone, lit maintenant les deux sources grâce au Fix 1)
      queryClient.invalidateQueries({ queryKey: ["candidate", "jobs", "eligibility"] });

      // 3. Listes de jobs → recalcule l'éligibilité côté liste aussi
      queryClient.invalidateQueries({ queryKey: ["candidate", "jobs"] });

      // ── Les timeouts ci-dessous sont remplacés par le polling du Fix 4b ──
      // Le polling dans JobCardWithEligibility (refetchInterval: 8s) prend le relais
      // pour mettre à jour le badge après que le worker Python ait recalculé (~5-10s).
      // Plus besoin de setTimeout ici — ils créaient des invalidations fantômes.
    },
  });
}