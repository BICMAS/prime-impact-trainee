import { getApiV1BaseUrl } from "@/config/api";
import { fetchWithAuthRetry } from "@/utils/fetchWithAuthRetry";

const BASE_URL = getApiV1BaseUrl();

export type ModuleAccessStatus =
  | "LOCKED"
  | "UNLOCKED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED";

export interface ModuleAccessItem {
  moduleId: string;
  name: string;
  sortOrder: number;
  scormActivityId: string | null;
  index: number;
  unlocked: boolean;
  unlockAt: string | null;
  status: ModuleAccessStatus;
  completionPercentage: number;
  scorePercent: number | null;
  completedAt: string | null;
}

export interface CourseModuleAccess {
  courseId: string;
  scormPackageId: string | null;
  modulePacingEnabled: boolean;
  pacingStartDate: string | null;
  modulePacingDays: number;
  modules: ModuleAccessItem[];
}

export async function fetchCourseModuleAccess(
  courseId: string,
): Promise<CourseModuleAccess> {
  const res = await fetchWithAuthRetry(
    `${BASE_URL}/courses/${encodeURIComponent(courseId)}/module-access`,
    { headers: { Accept: "application/json" } },
  );

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.error ?? "Failed to load module access");
  }

  const payload = await res.json();
  return payload.data as CourseModuleAccess;
}
