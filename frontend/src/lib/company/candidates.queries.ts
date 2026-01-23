import { useEffect, useMemo, useState } from "react";
import {
  getExternalCandidateDetails,
  getInternalCandidateDetails,
  listExternalCandidates,
  listInternalCandidates,
} from "./candidates.api";

export function useInternalCandidates(filters?: { q?: string; minScore?: number }) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const key = useMemo(() => JSON.stringify(filters ?? {}), [filters]);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError(null);

    listInternalCandidates(filters)
      .then((res) => mounted && setData(res))
      .catch((e) => mounted && setError(e))
      .finally(() => mounted && setIsLoading(false));

    return () => {
      mounted = false;
    };
  }, [key]);

  return { data, isLoading, error };
}

export function useExternalCandidates(filters?: { q?: string; minScore?: number; source?: string }) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const key = useMemo(() => JSON.stringify(filters ?? {}), [filters]);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError(null);

    listExternalCandidates(filters)
      .then((res) => mounted && setData(res))
      .catch((e) => mounted && setError(e))
      .finally(() => mounted && setIsLoading(false));

    return () => {
      mounted = false;
    };
  }, [key]);

  return { data, isLoading, error };
}

export function useInternalCandidateDetails(candidateId?: string) {
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(!!candidateId);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!candidateId) return;
    let mounted = true;

    setIsLoading(true);
    setError(null);

    getInternalCandidateDetails(candidateId)
      .then((res) => mounted && setData(res))
      .catch((e) => mounted && setError(e))
      .finally(() => mounted && setIsLoading(false));

    return () => {
      mounted = false;
    };
  }, [candidateId]);

  return { data, isLoading, error };
}

export function useExternalCandidateDetails(sourceId?: string) {
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(!!sourceId);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!sourceId) return;
    let mounted = true;

    setIsLoading(true);
    setError(null);

    getExternalCandidateDetails(sourceId)
      .then((res) => mounted && setData(res))
      .catch((e) => mounted && setError(e))
      .finally(() => mounted && setIsLoading(false));

    return () => {
      mounted = false;
    };
  }, [sourceId]);

  return { data, isLoading, error };
}

export async function getCandidatesRankingForJob(params: {
  jobId: string;
  pool: "internal" | "external";
  q?: string;
  minScore?: number;
  source?: string;
}) {
  const qs = new URLSearchParams();
  qs.set("pool", params.pool);
  if (params.q) qs.set("search", params.q);
  if (params.minScore) qs.set("minScore", String(params.minScore));
  if (params.pool === "external" && params.source) qs.set("source", params.source);

  // IMPORTANT: adapte baseUrl selon ton wrapper
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/company/jobs/${params.jobId}/candidates-ranking?${qs.toString()}`,
    { credentials: "include" } // ou Authorization header si tu l’utilises
  );

  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();

  // si backend renvoie {items:[]}
  return json.items ?? json;
}
