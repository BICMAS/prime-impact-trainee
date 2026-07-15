import { getApiV1BaseUrl } from "@/config/api";
import { getAccessToken } from "@/utils/auth";
import { fetchWithAuthRetry } from "@/utils/fetchWithAuthRetry";

const BASE_URL = getApiV1BaseUrl();

type AttemptStatus = "IN_PROGRESS" | "COMPLETED" | "FAILED" | "PASSED";

interface SyncAttemptPayload {
  completionPercentage: number;
  status: AttemptStatus;
}

export interface SyncedAttemptResult {
  attemptId: string;
  scormPackageId?: string;
  completionPercentage: number;
  status: AttemptStatus;
  scorePercent?: number | null;
  passingScore?: number;
  passed?: boolean;
  requiresRetake?: boolean;
}

/**
 * Core authenticated request helper
 */
const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = getAccessToken();
  if (!token) {
    throw new Error("No access token");
  }

  const headers = new Headers(options.headers);

  if(!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetchWithAuthRetry(url, {
    ...options,
    headers
  })

  let text: string;
  try {
    text = await res.text();
  } catch {
    text = "<unable to read response body>";
  }

  let data = null;
  let parseError: Error | null = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (err) {
    parseError = err instanceof Error ? err : new Error(String(err));
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[API RESPONSE]", {
      url,
      status: res.status,
      ok: res.ok,
      parseError: parseError ? parseError.message : null,
      responseText: text
    });
  }

  if (!res.ok) {
    console.error("API Error:", {url, status: res.status, text});
    throw new Error(`API request failed: ${res.status} ${text}`);
  }

  if (parseError) {
    throw new Error(`Unexpected non-JSON success response from ${url} (${res.status}): ${text}`);
  }

  return data;
};

/**
 * Update course attempt manually
 */
export const updateAttemptProgress = async (
  attemptId: string,
  completionPercentage: number = 0
) => {
  const status: AttemptStatus =
    completionPercentage >= 100 ? "COMPLETED" : "IN_PROGRESS";

  const payload: SyncAttemptPayload = {
    completionPercentage,
    status
  };

  return authFetch(`${BASE_URL}/attempts/${attemptId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
};

/**
 * Sync SCORM progress from SCORM Cloud
 */
export const syncScormProgress = async (attemptId: string) => {
  return authFetch(
    `${BASE_URL}/attempts/${attemptId}/sync-progress`,
    {
      method: "PATCH"
    }
  );
};

/**
 * Reset a failed course attempt and get a fresh SCORM launch URL.
 */
export const retakeCourse = async (courseId: string) => {
  const res = await authFetch(`${BASE_URL}/attempts/courses/${courseId}/retake`, {
    method: "POST",
  });

  return res?.data ?? res;
};

/**
 * Smart sync:
 * 1. Pull SCORM progress
 * 2. Update local attempt if backend returns percentage
 */
export const syncCourseAttempt = async (attemptId: string): Promise<SyncedAttemptResult> => {
  const res = await syncScormProgress(attemptId);

  if (!res?.data) {
    console.error("[SCORM SYNC] No data returned", res);
    throw new Error("No attempt data returned from sync");
  }

  const computedAttemptId = res.data.attemptId || res.data.attempt?.id;
  if (!computedAttemptId) {
    console.error("[SCORM SYNC] Missing attemptId in response", {data: res.data});
    throw new Error("Missing attemptId in sync response - cannot proceed");
  }

  const isAttemptStatus = (value: any): value is AttemptStatus =>
    value === "IN_PROGRESS"
    || value === "COMPLETED"
    || value === "FAILED"
    || value === "PASSED";

  const rawStatus = res.data.status;
  const status: AttemptStatus = isAttemptStatus(rawStatus)
    ? rawStatus
    : "IN_PROGRESS";

  if (!isAttemptStatus(rawStatus)) {
    console.warn(
      `[SCORM SYNC] Unexpected status value from backend: ${rawStatus}. Defaulting to IN_PROGRESS.`,
    );
  }

  return {
    attemptId: computedAttemptId,
    scormPackageId: res.data.scormPackageId,
    completionPercentage: res.data.completionPercentage ?? 0,
    status,
    scorePercent: res.data.scorePercent ?? null,
    passingScore: res.data.passingScore,
    passed: res.data.passed,
    requiresRetake: res.data.requiresRetake,
  };
};
