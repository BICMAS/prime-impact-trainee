import { Course, CourseStatus, LearningPath, UserStats } from "../types";
import { getApiV1BaseUrl } from "@/config/api";
import { getAccessToken } from "../utils/auth";
import { fetchWithAuthRetry } from "../utils/fetchWithAuthRetry";

const API_BASE = getApiV1BaseUrl();

/**
 * Raw backend shapes
 * Note: unfinishedCourses are ASSIGNMENTS, not pure courses
 */
interface RawAssignment {
  id: string;
  courseId: string;
  dueDate: string | null;
  course: Course;
  progress?: number | null;
  completionPercentage?: number | null;
  scormCloudCompletion?: number | null;
  status?: string | null;
  progressStatus?: string | null;
  scormPackageId?: string | null;
  attempt?: {
    id?: string | null;
    courseId?: string | null;
    scormPackageId?: string | null;
    completionPercentage?: number | null;
    status?: string | null;
  } | null;
}

export interface RawLearnerDashboardPayload {
  streak: number;
  points: number;
  learningHours: number;
  coursesDone: number;
  averageScore: number;
  learningPaths: LearningPath[];
  learningActivity: Record<string, number>;
  currentCourse: any; // backend returns a complex object, not just Course
  unfinishedCourses: RawAssignment[];
}

export interface LearnerDashboardViewModel {
  courses: Course[];
  stats: UserStats;

  currentCourse?: {
    course: any | null;
    attempt?: {
      id: string;
      courseId?: string | null;
      completionPercentage?: number;
      status?: string;
    } | null;
  };
  
  learningPath: LearningPath | null;
}

export interface RawScormScore {
  id: string;
  scormPackageId?: string | null;
  courseId?: string | null;
  completionPercentage: number;
  scormCloudScoreScaled: number | null;
  displayTitle: string;
  cloudScore?: {
    totalSecondsTracked?: number;
  }
}

function normalizeProgressValue(value?: number | null) {
  if (typeof value !== "number") return 0;
  const percent = value > 0 && value <= 1 ? value * 100 : value;
  return Math.min(100, Math.max(0, Math.round(percent)));
}

function resolveScorePercent(item: any): number | null {
  if (item?.scorePercent != null && Number.isFinite(Number(item.scorePercent))) {
    return Math.min(100, Math.max(0, Math.round(Number(item.scorePercent))));
  }
  const raw = item?.cloudScore?.raw ?? item?.score;
  const max = item?.cloudScore?.max ?? 100;
  const scaled = item?.scormCloudScoreScaled ?? item?.cloudScore?.scaled;
  if (raw != null && Number.isFinite(Number(raw)) && max > 0) {
    return Math.min(100, Math.max(0, Math.round((Number(raw) / max) * 100)));
  }
  if (scaled != null && Number.isFinite(Number(scaled))) {
    const normalized = Number(scaled);
    return Math.min(100, Math.max(0, Math.round(normalized <= 1 ? normalized * 100 : normalized)));
  }
  return null;
}


/**
 * Fetch dashboard and map backend → UI-friendly shape
 */
export async function fetchLearnerDashboard(): Promise<LearnerDashboardViewModel> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("No access token provided");
  }

  const [dashboardRes, scormRes] = await Promise.all([
    fetchWithAuthRetry(`${API_BASE}/dashboard/learner`),
    fetchWithAuthRetry(`${API_BASE}/scorm-packages/user/scorm-scores`),
  ]);

  if (!dashboardRes.ok) throw new Error("Failed to load learner dashboard");
  if (!scormRes.ok) throw new Error("Failed to load SCORM scores");

  const raw: RawLearnerDashboardPayload = await dashboardRes.json();
  const scormJson = await scormRes.json();

  const scormData = Array.isArray(scormJson?.data)
    ? scormJson.data
    : scormJson?.data
      ? [scormJson.data]
      : [];

  /**
   * ---------------------------------------------------
   * 1) Build SCORM lookup by PACKAGE ID (single truth)
   * ---------------------------------------------------
   */
  const scormMap = new Map<
    string,
    {
      completionPercentage: number;
      scaledScore: number | null;
      scorePercent: number | null;
      totalSeconds: number;
    }
  >();
  const scormCourseMap = new Map<string, number>();
  const scormCourseScoreMap = new Map<string, number>();

  scormData.forEach((item: any) => {
    const scorePercent = resolveScorePercent(item);
    if (item?.scormPackageId) {
      scormMap.set(item.scormPackageId, {
        completionPercentage: normalizeProgressValue(
          item.completionPercentage ?? item.scormCloudCompletion ?? 0,
        ),
        scaledScore: item.scormCloudScoreScaled ?? null,
        scorePercent,
        totalSeconds: item.cloudScore?.totalSecondsTracked ?? 0,
      });
    }

    if (item?.courseId) {
      scormCourseMap.set(
        item.courseId,
        normalizeProgressValue(item.completionPercentage ?? item.scormCloudCompletion ?? 0),
      );
      if (scorePercent != null) {
        scormCourseScoreMap.set(item.courseId, scorePercent);
      }
    }
  });

  /**
   * ---------------------------------------------------
   * 2) Helper: extract course-level packageId
   * (because backend doesn't provide it)
   * ---------------------------------------------------
   */
  const getCourseScormPackageId = (
    assignment: RawAssignment,
    course: any,
    activeAttempt: any,
  ): string | null => {
    const direct =
      assignment?.scormPackageId ??
      assignment?.attempt?.scormPackageId ??
      course?.scormPackageId ??
      course?.scormPackage?.id ??
      activeAttempt?.scormPackageId;

    if (direct) return direct;

    if (!course?.modules) return null;

    for (const module of course.modules) {
      for (const lesson of module.lessons ?? []) {
        if (lesson.scormPackageId) {
          return lesson.scormPackageId;
        }
      }
    }

    return null;
  };

  const deriveStatus = (progress: number, rawStatus?: string | null): CourseStatus => {
    if (rawStatus === "FAILED") return CourseStatus.Failed;
    if (progress >= 100) return CourseStatus.Completed;
    if (progress > 0) return CourseStatus.InProgress;
    if (rawStatus === "COMPLETED") return CourseStatus.Completed;
    if (rawStatus === "IN_PROGRESS") return CourseStatus.InProgress;
    return CourseStatus.NotStarted;
  };

  const getModuleCompletion = (modules: any[] = []) => {
    const totalModules = modules.length;
    const completedModules = modules.filter((module: any) => {
      if (module?.isCompleted) return true;
      const lessons = module?.lessons ?? [];
      return lessons.length > 0 && lessons.every((lesson: any) => lesson?.isCompleted);
    }).length;

    const allModulesCompleted = totalModules > 0 && completedModules >= totalModules;
    const moduleProgress =
      totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
    return { totalModules, completedModules, allModulesCompleted, moduleProgress };
  };

  /**
   * ---------------------------------------------------
   * 3) Current attempt fallback
   * ---------------------------------------------------
   */
  const currentAttempt = raw.currentCourse?.attempt;

  /**
   * ---------------------------------------------------
   * 4) Map assignments → Courses
   * Priority:
   *   SCORM score
   *   → current attempt
   *   → 0
   * ---------------------------------------------------
   */
  const courses: Course[] = (raw.unfinishedCourses ?? []).map((assignment) => {
    const course = assignment.course;
    const scormPackageId = getCourseScormPackageId(assignment, course, currentAttempt);
    const { totalModules, completedModules, allModulesCompleted, moduleProgress } =
      getModuleCompletion(
      course?.modules ?? [],
    );

    const progressFromScormPackage = scormPackageId
      ? scormMap.get(scormPackageId)?.completionPercentage ?? 0
      : 0;
    const quizScore = scormPackageId
      ? scormMap.get(scormPackageId)?.scorePercent ?? scormCourseScoreMap.get(course?.id ?? "") ?? null
      : scormCourseScoreMap.get(course?.id ?? "") ?? null;
    const progressFromScormCourseId = course?.id
      ? scormCourseMap.get(course.id) ?? 0
      : 0;
    const progressFromCurrentAttempt =
      currentAttempt?.courseId && course?.id && currentAttempt.courseId === course.id
        ? normalizeProgressValue(
            currentAttempt.completionPercentage ?? currentAttempt.scormCloudCompletion ?? 0,
          )
        : currentAttempt?.courseId &&
            assignment.courseId &&
            currentAttempt.courseId === assignment.courseId
          ? normalizeProgressValue(
              currentAttempt.completionPercentage ?? currentAttempt.scormCloudCompletion ?? 0,
            )
          : currentAttempt?.scormPackageId &&
              scormPackageId &&
              currentAttempt.scormPackageId === scormPackageId
            ? normalizeProgressValue(
                currentAttempt.completionPercentage ?? currentAttempt.scormCloudCompletion ?? 0,
              )
            : 0;
    const progressFromAssignment = normalizeProgressValue(
      assignment.attempt?.completionPercentage ??
        assignment.completionPercentage ??
        assignment.scormCloudCompletion ??
        assignment.progress ??
        0,
    );

    const computedProgress = Math.max(
      progressFromScormPackage,
      progressFromScormCourseId,
      progressFromCurrentAttempt,
      progressFromAssignment,
      0,
    );
    const rawStatus =
      assignment.attempt?.status ??
      assignment.status ??
      assignment.progressStatus ??
      currentAttempt?.status ??
      null;
    const progress = Math.max(
      computedProgress,
      moduleProgress,
      allModulesCompleted ? 100 : 0,
      rawStatus === "COMPLETED" ? 100 : 0,
    );

    return {
      ...course,
      assignmentId: assignment.id,
      dueDate: assignment.dueDate,
      scormPackageId,
      progress,
      quizScore,
      status: deriveStatus(progress, rawStatus),
      totalModules,
      completedModules,
    };
  });

  /**
   * ---------------------------------------------------
   * 5) Stats from SCORM data
   * ---------------------------------------------------
   */
  const totalSeconds = scormData.reduce(
    (sum: number, item: any) =>
      sum + (item.cloudScore?.totalSecondsTracked ?? 0),
    0
  );

  const totalLearningHours = totalSeconds / 3600;

  const scoredItems = scormData
    .map((item: any) => resolveScorePercent(item))
    .filter((value): value is number => value != null);

  const averageScore =
    scoredItems.length > 0
      ? Math.round(scoredItems.reduce((sum, value) => sum + value, 0) / scoredItems.length)
      : raw.averageScore ?? 0;

  const activity = raw.learningActivity || {};
  const normalizeActivityMinutes = (value: unknown): number => {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return 0;
    // Unit-safe fallback: some environments send fractional hours (e.g. 0.5 = 30m).
    if (value > 0 && value < 1) return Math.max(1, Math.round(value * 60));
    return Math.round(value);
  };

  /**
   * ---------------------------------------------------
   * 6) Final ViewModel
   * ---------------------------------------------------
   */
  return {
    courses,

    learningPath: raw.learningPaths?.[0] ?? null,

    currentCourse: {
      course: raw.currentCourse?.course ?? null,
      attempt: currentAttempt ?? null,
    },

    stats: {
      streakDays: raw.streak ?? 0,
      bicmasCoins: raw.points ?? 0,
      totalLearningHours,
      completedCourses: raw.coursesDone ?? 0,
      averageScore,

      weeklyActivity: [
        normalizeActivityMinutes(activity.Mon),
        normalizeActivityMinutes(activity.Tue),
        normalizeActivityMinutes(activity.Wed),
        normalizeActivityMinutes(activity.Thu),
        normalizeActivityMinutes(activity.Fri),
        normalizeActivityMinutes(activity.Sat),
        normalizeActivityMinutes(activity.Sun),
      ],

      scoreTrend: 0,
      completedCoursesTrend: 0,
      badges: [],
    },
  };
}









/**
 * Sync SCORM progress, then reload dashboard
 */
export async function syncProgressAndRefresh(
  attemptId: string,
): Promise<LearnerDashboardViewModel> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("No access token");
  }

  const res = await fetchWithAuthRetry(
    `${API_BASE}/attempts/${attemptId}/sync-progress`,
    {
      method: "PATCH",
    },
  );

  if (!res.ok) {
    throw new Error("Failed to sync progress");
  }

  // After sync, refetch dashboard so aggregates update
  return fetchLearnerDashboard();
}
