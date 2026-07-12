import { useQueryClient } from "@tanstack/react-query";
import { syncCourseAttempt } from "@/api/attempts";
import { claimMyCourseCertificate } from "@/api/certificates";
import { CourseStatus } from "@/types";

const mapStatus = (status: string, pct: number): CourseStatus => {
  if (pct >= 100 || status === "COMPLETED") return CourseStatus.Completed;
  if (pct > 0 || status === "IN_PROGRESS") return CourseStatus.InProgress;
  return CourseStatus.NotStarted;
};

const normalizeProgress = (progress?: number) => {
  if (typeof progress !== "number") return 0;
  const percent = progress > 0 && progress <= 1 ? progress * 100 : progress;
  return Math.min(100, Math.max(0, Math.round(percent)));
};

export const useAttemptSync = () => {
  const queryClient = useQueryClient();

  const syncAttempt = async (attemptId: string, courseId: string) => {
    const data = await syncCourseAttempt(attemptId);

    const pct = normalizeProgress(data.completionPercentage ?? 0);
    const status = data.status;

    // Update dashboard cache immediately (single source of truth)
    queryClient.setQueriesData({ queryKey: ["dashboard"] }, (old: any) => {
      if (!old?.courses) return old;

      return {
        ...old,
        courses: old.courses.map((course: any) => {
          if (course.id !== courseId) return course;

          return {
            ...course,
            progress: pct,
            status: mapStatus(status, pct),
          };
        }),
      };
    });

    // ❗ Do NOT invalidate immediately
    // Backend may still be stale
    if (pct >= 100 || status === "COMPLETED") {
      try {
        const claimed = await claimMyCourseCertificate(courseId);
        const certificateUrl =
          claimed?.certificate?.certificateUrl ?? claimed?.certificate?.pdfPath;

        if (certificateUrl) {
          queryClient.setQueriesData({ queryKey: ["dashboard"] }, (old: any) => {
            if (!old?.courses) return old;

            return {
              ...old,
              courses: old.courses.map((course: any) =>
                course.id === courseId
                  ? {
                      ...course,
                      certificateUrl,
                    }
                  : course,
              ),
            };
          });
        }
      } catch (error) {
        console.warn("[CERTIFICATE] Claim skipped/failed", error);
      }

      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["assignedCourses"] });
      }, 1500);
    }

    return data;
  };

  return syncAttempt;
};
