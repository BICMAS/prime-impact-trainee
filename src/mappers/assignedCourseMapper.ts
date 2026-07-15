import { Course, CourseStatus } from "@/types";

function normalizeProgress(value?: number) {
  if (typeof value !== "number") return 0;
  const percent = value > 0 && value <= 1 ? value * 100 : value;
  return Math.min(100, Math.max(0, Math.round(percent)));
}

function deriveStatus(
  progress: number,
  rawStatus?: string | null,
  hasAttempt?: boolean,
  requiresRetake?: boolean,
): CourseStatus {
  if (requiresRetake || rawStatus === "FAILED") return CourseStatus.Failed;
  if (progress >= 100 && rawStatus !== "FAILED") return CourseStatus.Completed;
  if (progress > 0) return CourseStatus.InProgress;
  if (rawStatus === "COMPLETED") return CourseStatus.Completed;
  if (rawStatus === "IN_PROGRESS") return CourseStatus.InProgress;
  if (hasAttempt) return CourseStatus.InProgress;
  return CourseStatus.NotStarted;
}

function getModuleCompletion(modules: any[]) {
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
}

export function mapAssignedCourse(assignment: any): Course {
  const course = assignment.course;
  const modules = course.modules ?? [];
  const { totalModules, completedModules, allModulesCompleted, moduleProgress } =
    getModuleCompletion(modules);

  const baseProgress = normalizeProgress(
    assignment.attempt?.completionPercentage ??
      assignment.completionPercentage ??
      assignment.scormCloudCompletion ??
      assignment.progress ??
      0,
  );
  const rawStatus =
    assignment.status ??
    assignment.attempt?.status ??
    assignment.progressStatus ??
    assignment.scormStatus;
  const progress = Math.max(
    baseProgress,
    moduleProgress,
    allModulesCompleted ? 100 : 0,
    rawStatus === "COMPLETED" ? 100 : 0,
  );
  const hasAttempt = Boolean(
    assignment.attempt?.id ??
      assignment.attemptId ??
      assignment.scormCloudRegistrationId,
  );

  // 🔑 Extract a course-level scormPackageId
  const scormPackageId =
    assignment.scormPackageId ??
    assignment.scormPackage?.id ??
    assignment.attempt?.scormPackageId ??
    course.scormPackageId ??
    course.scormPackage?.id ??
    modules
      ?.flatMap((m: any) => m.lessons ?? [])
      ?.find((l: any) => l.scormPackageId)
      ?.scormPackageId ?? null;

  return {
    id: assignment.course.id,
    scormPackageId, // <-- CRITICAL

    title: course.title,
    description: course.description ?? "",
    thumbnail: course.imageUrl ?? null,

    category: "Mandatory",
    status: deriveStatus(
      progress,
      rawStatus,
      hasAttempt,
      assignment.requiresRetake,
    ),
    progress,

    totalModules,
    completedModules,

    deadline: assignment.dueDate,
    isDownloaded: false,
    passingScore: assignment.passingScore ?? assignment.course?.passingScore ?? 70,
    requiresRetake: Boolean(assignment.requiresRetake),
    modulePacingEnabled: Boolean(course.modulePacingEnabled),
    pacingStartDate: course.pacingStartDate ?? null,
    modulePacingDays: course.modulePacingDays ?? 7,
    assignmentId: assignment.id ?? assignment.assignmentId ?? null,
    quizScore:
      assignment.scorePercent ??
      assignment.quizScore ??
      null,

    modules: modules.map((m: any) => ({
      id: m.id,
      title: m.name,
      lessons: (m.lessons ?? []).map((l: any) => ({
        id: l.id,
        title: l.title,
        scormPackageId: l.scormPackageId,
      })),
    })),
  };
}

