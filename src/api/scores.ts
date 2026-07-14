import { getApiV1BaseUrl } from "@/config/api";
import { fetchWithAuthRetry } from "@/utils/fetchWithAuthRetry";

const API_BASE = getApiV1BaseUrl();

export type ScoreRecord = {
  scormAttemptId: string;
  scormPackageId: string;
  courseId?: string | null;
  courseTitle?: string | null;
  title: string;
  completionPercent: number;
  scorePercent: number | null;
  scoreRaw: number | null;
  passed: boolean;
  status: string;
  lastSyncedAt?: string;
};

export type LeaderboardEntry = {
  rank: number;
  id: string;
  name: string;
  department?: string | null;
  value: number;
  label: string;
  points?: number;
};

export async function fetchMyScores(): Promise<{
  scores: ScoreRecord[];
  averageScore: number;
}> {
  const res = await fetchWithAuthRetry(`${API_BASE}/scores/me`);
  if (!res.ok) throw new Error("Failed to load quiz scores");
  const data = await res.json();
  return {
    scores: data.scores ?? [],
    averageScore: data.averageScore ?? 0,
  };
}

export async function fetchLeaderboard(
  metric: "points" | "score" | "completion" = "score",
  limit = 10,
): Promise<{ enabled: boolean; entries: LeaderboardEntry[] }> {
  const res = await fetchWithAuthRetry(
    `${API_BASE}/scores/leaderboard?metric=${metric}&limit=${limit}`,
  );
  if (!res.ok) throw new Error("Failed to load leaderboard");
  const data = await res.json();
  return {
    enabled: data.enabled ?? true,
    entries: data.entries ?? [],
  };
}
