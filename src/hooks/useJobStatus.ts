import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";

export interface JobStatus {
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  error?: string;
  completedAt?: string;
}

export interface JobResult {
  location?: any;
  trends?: any[];
  ideas?: any[];
  scripts?: any[];
  predictions?: any[];
  meta?: any;
}

export function useJobStatus(jobId: string | null, pollIntervalMs = 2000) {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [result, setResult] = useState<JobResult | null>(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!jobId) return;
    try {
      const resp = await api.get(`/api/jobs/${jobId}/status`);
      if (!resp.ok) return;
      const data = await resp.json();
      setStatus(data);

      // If completed, fetch full result and stop polling
      if (data.status === "completed" || data.status === "failed") {
        if (data.status === "completed") {
          const fullResp = await api.get(`/api/jobs/${jobId}`);
          if (fullResp.ok) {
            const fullData = await fullResp.json();
            setResult(fullData.job?.result || null);
          }
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setLoading(false);
      }
    } catch {
      // Silently ignore polling errors
    }
  }, [jobId]);

  useEffect(() => {
    if (!jobId) {
      setStatus(null);
      setResult(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setStatus(null);
    setResult(null);

    // Initial fetch
    fetchStatus();

    // Start polling
    intervalRef.current = window.setInterval(fetchStatus, pollIntervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [jobId, fetchStatus, pollIntervalMs]);

  return { status, result, loading };
}
