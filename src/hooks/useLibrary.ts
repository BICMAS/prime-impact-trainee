import { useQuery } from "@tanstack/react-query";
import { fetchAssignedCourses } from "@/api/assignedCourses";
import { getApiV1BaseUrl } from "@/config/api";
import { mapAssignedCourse } from "@/mappers/assignedCourseMapper";
import { getDownloadedCourses } from "@/utils/offlineCourses";
import { fetchWithAuthRetry } from "@/utils/fetchWithAuthRetry";
import { Course, CourseStatus } from "@/types";

const BASE_URL = getApiV1BaseUrl();

const normalizeProgress = (progress?: number) => {
  if (typeof progress !== "number") return 0;
  const percent = progress > 0 && progress <= 1 ? progress * 100 : progress;
  return Math.min(100, Math.max(0, Math.round(percent)));
};

const deriveStatus = (progress: number): CourseStatus => {
  if (progress >= 100) return CourseStatus.Completed;
  if (progress > 0) return CourseStatus.InProgress;
  return CourseStatus.NotStarted;
};

const statusRank: Record<CourseStatus, number> = {
  [CourseStatus.NotStarted]: 0,
  [CourseStatus.InProgress]: 1,
  [CourseStatus.Failed]: 2,
  [CourseStatus.Completed]: 3,
};

const pickMostAdvancedStatus = (
  ...statuses: Array<CourseStatus | undefined>
): CourseStatus => {
  let best = CourseStatus.NotStarted;
  for (const status of statuses) {
    if (status && statusRank[status] > statusRank[best]) {
      best = status;
    }
  }
  return best;
};

export const useLibrary = (dashboardCourses: Course[] = []) => {
  return useQuery({
    queryKey: ["assignedCourses"],
    queryFn: async () => {
      const assignments = await fetchAssignedCourses();

      let scormScores: any[] = [];
      try {
        const scormRes = await fetchWithAuthRetry(
          `${BASE_URL}/scorm-packages/user/scorm-scores`,
        );
        if (scormRes.ok) {
          const scormJson = await scormRes.json();
          const raw = scormJson?.data;
          scormScores = Array.isArray(raw) ? raw : raw ? [raw] : [];
        }
      } catch {
        // Keep library usable even if SCORM scores endpoint fails.
      }

      return { assignments, scormScores };
    },
    enabled: true,
    select: ({ assignments, scormScores }) => {
      const downloadedIds = getDownloadedCourses();
      const scormByPackageId = new Map<string, number>();
      const scormByCourseId = new Map<string, number>();
      const scormByTitle = new Map<string, number>();
      const quizByPackageId = new Map<string, number>();
      const quizByCourseId = new Map<string, number>();

      const resolveQuizScore = (item: any): number | null => {
        if (item?.scorePercent != null) return Math.round(Number(item.scorePercent));
        const raw = item?.cloudScore?.raw ?? item?.score;
        const max = item?.cloudScore?.max ?? 100;
        if (raw != null && max > 0) return Math.round((Number(raw) / max) * 100);
        if (item?.scormCloudScoreScaled != null) {
          const scaled = Number(item.scormCloudScoreScaled);
          return Math.round(scaled <= 1 ? scaled * 100 : scaled);
        }
        return null;
      };

      scormScores.forEach((item: any) => {
        const progress = normalizeProgress(
          item?.completionPercentage ?? item?.scormCloudCompletion ?? 0,
        );
        const quizScore = resolveQuizScore(item);
        if (item?.scormPackageId) {
          scormByPackageId.set(item.scormPackageId, progress);
          if (quizScore != null) quizByPackageId.set(item.scormPackageId, quizScore);
        }
        if (item?.courseId) {
          scormByCourseId.set(item.courseId, progress);
          if (quizScore != null) quizByCourseId.set(item.courseId, quizScore);
        }
        const titleKey = String(item?.displayTitle ?? "")
          .trim()
          .toLowerCase();
        if (titleKey) {
          scormByTitle.set(titleKey, progress);
        }
      });

      return assignments.map(mapAssignedCourse).map((course) => {
        const match = dashboardCourses.find((c) => c.id === course.id);
        const scormProgressByPackage = course.scormPackageId
          ? scormByPackageId.get(course.scormPackageId) ?? 0
          : 0;
        const scormProgressByCourse = scormByCourseId.get(course.id) ?? 0;
        const scormProgressByTitle = scormByTitle.get(course.title.trim().toLowerCase()) ?? 0;

        // Keep the highest known progress from both APIs.
        const progress = normalizeProgress(
          Math.max(
            course.progress ?? 0,
            match?.progress ?? 0,
            scormProgressByPackage,
            scormProgressByCourse,
            scormProgressByTitle,
          ),
        );
        const status = pickMostAdvancedStatus(
          course.status,
          match?.status,
          course.requiresRetake || match?.requiresRetake
            ? CourseStatus.Failed
            : deriveStatus(progress),
        );

        const quizScore =
          match?.quizScore ??
          (course.scormPackageId ? quizByPackageId.get(course.scormPackageId) : undefined) ??
          quizByCourseId.get(course.id) ??
          null;

        return {
          ...course,
          progress,
          status,
          quizScore,
          isDownloaded: downloadedIds.includes(course.id),
        };
      });
    },
  });
};
