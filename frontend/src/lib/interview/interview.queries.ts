import { useEffect, useState, useCallback } from 'react';
import {
  getCompanyInterviews,
  getMyInterviews,
  getInterviewDetails,
  getInterview,
  assignInterview,
  startInterview,
  submitResponse,
  endInterview,
} from './interview.api';
import type {
  RecruiterInterviewListItem,
  CandidateInterviewListItem,
  InterviewDetailedResult,
  InterviewSessionResponse,
  AssignInterviewRequest,
  SubmitResponseRequest,
} from '../../types/interview.types';

// ==================== Recruiter Hooks ====================

/**
 * Hook to fetch all interviews for the company (recruiter view)
 */
export function useCompanyInterviews() {
  const [data, setData] = useState<RecruiterInterviewListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getCompanyInterviews();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch interviews'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    getCompanyInterviews()
      .then((res) => mounted && setData(res))
      .catch((e) => mounted && setError(e instanceof Error ? e : new Error('Failed to fetch interviews')))
      .finally(() => mounted && setIsLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  return { data, isLoading, error, refetch };
}

/**
 * Hook to fetch interview details (recruiter only)
 */
export function useInterviewDetails(interviewId?: string) {
  const [data, setData] = useState<InterviewDetailedResult | null>(null);
  const [isLoading, setIsLoading] = useState(!!interviewId);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!interviewId) return;
    let mounted = true;

    setIsLoading(true);
    setError(null);

    getInterviewDetails(interviewId)
      .then((res) => mounted && setData(res))
      .catch((e) => mounted && setError(e instanceof Error ? e : new Error('Failed to fetch details')))
      .finally(() => mounted && setIsLoading(false));

    return () => {
      mounted = false;
    };
  }, [interviewId]);

  return { data, isLoading, error };
}

/**
 * Hook to assign an interview to a candidate (mutation)
 */
export function useAssignInterview() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (data: AssignInterviewRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await assignInterview(data);
      return result;
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Failed to assign interview');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutate, isLoading, error };
}

// ==================== Candidate Hooks ====================

/**
 * Hook to fetch all interviews for the candidate
 */
export function useMyInterviews() {
  const [data, setData] = useState<CandidateInterviewListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getMyInterviews();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch interviews'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    getMyInterviews()
      .then((res) => mounted && setData(res))
      .catch((e) => mounted && setError(e instanceof Error ? e : new Error('Failed to fetch interviews')))
      .finally(() => mounted && setIsLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  return { data, isLoading, error, refetch };
}

/**
 * Hook to fetch a single interview (candidate view)
 */
export function useInterview(interviewId?: string) {
  const [data, setData] = useState<CandidateInterviewListItem | null>(null);
  const [isLoading, setIsLoading] = useState(!!interviewId);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!interviewId) return;
    let mounted = true;

    setIsLoading(true);
    setError(null);

    getInterview(interviewId)
      .then((res) => mounted && setData(res))
      .catch((e) => mounted && setError(e instanceof Error ? e : new Error('Failed to fetch interview')))
      .finally(() => mounted && setIsLoading(false));

    return () => {
      mounted = false;
    };
  }, [interviewId]);

  return { data, isLoading, error };
}

/**
 * Hook to start an interview (mutation)
 */
export function useStartInterview() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (interviewId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await startInterview(interviewId);
      return result;
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Failed to start interview');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutate, isLoading, error };
}

/**
 * Hook to submit a response (mutation)
 */
export function useSubmitResponse() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (interviewId: string, data: SubmitResponseRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await submitResponse(interviewId, data);
      return result;
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Failed to submit response');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutate, isLoading, error };
}

/**
 * Hook to end an interview (mutation)
 */
export function useEndInterview() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (interviewId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await endInterview(interviewId);
      return result;
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Failed to end interview');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutate, isLoading, error };
}
