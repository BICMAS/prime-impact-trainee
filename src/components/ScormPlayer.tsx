import React, { useState, useEffect, useRef } from "react";
import { Course } from "../types";
import { Award, Download, ArrowLeft, RotateCcw, XCircle } from "lucide-react";
import { fetchScormLaunchUrl } from "@/api/scorm";
import { retakeCourse } from "@/api/attempts";
import { useAttemptSync } from "@/hooks/useAttemptSync";
import { getApiV1BaseUrl } from "@/config/api";
import { getAccessToken } from "@/utils/auth";
import {
  fetchCourseModuleAccess,
  type CourseModuleAccess,
  type ModuleAccessItem,
} from "@/api/moduleAccess";
import { ModulePicker } from "@/components/ModulePicker";

const ALLOWED_SCORM_ORIGINS = [
  "https://cloud.scorm.com",
  "https://engine.scorm.com",
];

interface ScormPlayerProps {
  course: Course;
  onBack: () => void;
  onUpdateProgress: (
    courseId: string,
    progress: number,
    completedLessons: number
  ) => void;
  onViewCertificate: () => void;
}

export const ScormPlayer: React.FC<ScormPlayerProps> = ({
  course,
  onBack,
  onUpdateProgress,
  onViewCertificate,
}) => {
  const resolvedLessonWithScorm =
    course.modules
      ?.flatMap((module: any) =>
        (module.lessons ?? []).map((lesson: any) => ({
          moduleId: module.id ?? null,
          lessonId: lesson.id ?? null,
          scormPackageId: lesson.scormPackageId ?? null,
        })),
      )
      ?.find((entry: any) => entry.scormPackageId) ?? null;

  const resolvedScormPackageId =
    course.scormPackageId ??
    resolvedLessonWithScorm?.scormPackageId ??
    null;

  // ----------------------------
  // UI state
  // ----------------------------
  const [launchUrl, setLaunchUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ----------------------------
  // SCORM state (source of truth)
  // ----------------------------
  const [scormAttemptId, setScormAttemptId] = useState<string | null>(null);
  const [scormProgress, setScormProgress] = useState(0);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [sessionPassed, setSessionPassed] = useState<boolean | null>(null);
  const [sessionScorePercent, setSessionScorePercent] = useState<number | null>(null);
  const [sessionPassingScore, setSessionPassingScore] = useState<number>(
    course.passingScore ?? 70,
  );
  const [isRetaking, setIsRetaking] = useState(false);
  const [isCompletionSyncing, setIsCompletionSyncing] = useState(false);
  const [completionSyncMessage, setCompletionSyncMessage] = useState<string | null>(null);
  const [moduleAccess, setModuleAccess] = useState<CourseModuleAccess | null>(null);
  const [moduleAccessLoading, setModuleAccessLoading] = useState(false);
  const [selectedModule, setSelectedModule] = useState<ModuleAccessItem | null>(null);
  const [showModulePicker, setShowModulePicker] = useState(
    Boolean(course.modulePacingEnabled),
  );

  const scormAttemptIdRef = useRef<string | null>(null);
  const lastReportedProgress = useRef<number>(0);
  const lastSavedProgress = useRef<number>(0);
  const completionTriggered = useRef(false);

  const onUpdateProgressRef = useRef(onUpdateProgress);
  const syncTimeoutRef = useRef<number | null>(null);

  const syncAttempt = useAttemptSync();

  useEffect(() => {
    scormAttemptIdRef.current = scormAttemptId;
  }, [scormAttemptId]);

  useEffect(() => {
    onUpdateProgressRef.current = onUpdateProgress;
  }, [onUpdateProgress]);

  // ----------------------------
  // Helpers
  // ----------------------------
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);
  const scheduleCloudSync = (attemptId: string) => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = window.setTimeout(() => {
      syncAttempt(attemptId, course.id).catch(console.error);
    }, 5000);
  };

  const syncCompletionState = async () => {
    const attemptId = scormAttemptIdRef.current;
    if (!attemptId) {
      setIsCompletionSyncing(false);
      setCompletionSyncMessage(null);
      return null;
    }

    setIsCompletionSyncing(true);
    setCompletionSyncMessage("Checking your quiz score...");

    try {
      const updated = await syncAttempt(attemptId, course.id);
      if (updated?.attemptId && updated.attemptId !== scormAttemptIdRef.current) {
        scormAttemptIdRef.current = updated.attemptId;
        setScormAttemptId(updated.attemptId);
      }

      const passed = updated?.passed ?? (updated?.status === "COMPLETED" || updated?.status === "PASSED");
      const requiresRetake = Boolean(updated?.requiresRetake || updated?.status === "FAILED");

      setSessionScorePercent(
        typeof updated?.scorePercent === "number" ? updated.scorePercent : null,
      );
      setSessionPassingScore(updated?.passingScore ?? course.passingScore ?? 70);
      setSessionPassed(passed && !requiresRetake);
      setCompletionSyncMessage(
        passed && !requiresRetake
          ? "Course passed"
          : "Quiz score below the required cutoff",
      );
      return updated;
    } catch (e) {
      console.error("Completion sync failed", e);
      setSessionPassed(null);
      setCompletionSyncMessage("Score sync delayed. Check your library shortly.");
      return null;
    } finally {
      window.setTimeout(() => {
        setIsCompletionSyncing(false);
      }, 1200);
    }
  };

  const triggerCompletion = async (syncAfterCompletion = true) => {
    if (completionTriggered.current) return;
    completionTriggered.current = true;

    setShowEndScreen(true);
    if (syncAfterCompletion) {
      await syncCompletionState();
    }
  };

  const handleRetake = async () => {
    try {
      setIsRetaking(true);
      setError(null);
      const result = await retakeCourse(course.id);

      completionTriggered.current = false;
      setShowEndScreen(false);
      setSessionPassed(null);
      setSessionScorePercent(null);
      setScormProgress(0);
      lastReportedProgress.current = 0;
      lastSavedProgress.current = 0;

      if (result?.launchUrl) {
        setLaunchUrl(result.launchUrl);
      }
      if (result?.scormAttemptId) {
        scormAttemptIdRef.current = result.scormAttemptId;
        setScormAttemptId(result.scormAttemptId);
      }
      if (result?.passingScore != null) {
        setSessionPassingScore(result.passingScore);
      }
    } catch (e) {
      console.error("Retake failed", e);
      setError(e instanceof Error ? e.message : "Failed to start retake");
    } finally {
      setIsRetaking(false);
    }
  };

  const handleSessionEnded = async () => {
    let syncSucceeded = false;
    try {
      if (scormAttemptIdRef.current) {
        const updated = await syncAttempt(scormAttemptIdRef.current, course.id);
        console.log("[PLAYER] Sync returned", updated);
        syncSucceeded = true;

        if (
          updated?.attemptId &&
          updated.attemptId !== scormAttemptIdRef.current
        ) {
          console.log("[SCORM] AttemptId updated (final)", {
            old: scormAttemptIdRef.current,
            new: updated.attemptId,
          });

          scormAttemptIdRef.current = updated.attemptId;
          setScormAttemptId(updated.attemptId);
        }
      }
    } catch (e) {
      console.error("Final sync failed", e);
    }

    await triggerCompletion(!syncSucceeded);
  };

  // ----------------------------
  // Load module access (cohort calendar pacing)
  // ----------------------------
  useEffect(() => {
    if (!course.modulePacingEnabled) return;

    const loadAccess = async () => {
      try {
        setModuleAccessLoading(true);
        const access = await fetchCourseModuleAccess(course.id);
        setModuleAccess(access);

        const firstUnlocked = access.modules.find((module) => module.unlocked);
        if (firstUnlocked && !selectedModule) {
          setSelectedModule(firstUnlocked);
        }
      } catch (err) {
        console.error("Failed to load module access", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load module schedule",
        );
        setShowModulePicker(false);
      } finally {
        setModuleAccessLoading(false);
      }
    };

    void loadAccess();
  }, [course.id, course.modulePacingEnabled]);

  // ----------------------------
  // Load SCORM launch URL
  // ----------------------------
  useEffect(() => {
    const load = async () => {
      if (!resolvedScormPackageId) {
        setError("No SCORM package configured for this course.");
        setLoading(false);
        return;
      }

      if (course.modulePacingEnabled) {
        if (showModulePicker || !selectedModule) {
          setLoading(false);
          return;
        }
      }

      try {
        setLoading(true);
        setError(null);

        completionTriggered.current = false;
        setShowEndScreen(false);
        setSessionPassed(null);
        setIsCompletionSyncing(false);
        setCompletionSyncMessage(null);
        setScormProgress(0);
        lastReportedProgress.current = 0;
        lastSavedProgress.current = 0;

        const res = await fetchScormLaunchUrl(resolvedScormPackageId, {
          courseId: course.id,
          assignmentId: course.assignmentId ?? (course as any).assignmentId ?? null,
          lessonId: resolvedLessonWithScorm?.lessonId ?? null,
          moduleId: selectedModule?.moduleId ?? resolvedLessonWithScorm?.moduleId ?? null,
        });

        setLaunchUrl(res.launchUrl);
        setScormAttemptId(res.scormAttemptId);
      } catch (err) {
        setError(
          err instanceof Error && err.message
            ? `Failed to load SCORM package: ${err.message}`
            : "Failed to load SCORM package",
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [
    course.id,
    course.modulePacingEnabled,
    course.assignmentId,
    resolvedScormPackageId,
    selectedModule?.moduleId,
    showModulePicker,
  ]);

  // ----------------------------
  // SCORM message listener
  // ----------------------------
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      // Allow only approved SCORM Cloud origins to prevent host-based spoofing
      if (!ALLOWED_SCORM_ORIGINS.includes(event.origin)) return;
      if (!event.data) return;
      if (!scormAttemptIdRef.current) return;

      let data = event.data;

      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }

      if (!data.messageType) return;

      switch (data.messageType) {
        case "ScoProgress":
        case "CourseProgress": {
          const pct = Math.round((data.progress || 0) * 100);

          if (pct <= lastReportedProgress.current) return;

          lastReportedProgress.current = pct;
          setScormProgress(pct);

          onUpdateProgressRef.current(course.id, pct, 0);
          scheduleCloudSync(scormAttemptIdRef.current);
          break;
        }

        case "ScoCompleted":
        case "CourseCompleted":
        case "CoursePassed": {
          lastReportedProgress.current = 100;
          setScormProgress(100);

          onUpdateProgressRef.current(course.id, 100, 0);
          scheduleCloudSync(scormAttemptIdRef.current);

          void triggerCompletion();
          break;
        }

        case "CourseFailed": {
          lastReportedProgress.current = 100;
          setScormProgress(100);
          onUpdateProgressRef.current(course.id, 100, 0);
          scheduleCloudSync(scormAttemptIdRef.current);
          void triggerCompletion();
          break;
        }

        case "PlayerExit":
        case "SessionEnded": {
          await handleSessionEnded();
          break;
        }
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [course.id]);

  // ----------------------------
  // Save on tab close (important)
  // ----------------------------
  useEffect(() => {
    const onUnload = () => {
      const attemptId = scormAttemptIdRef.current;
      if (!attemptId) return;

      const token = getAccessToken();
      if (!token) return;

      const pct = lastReportedProgress.current;
      const payload = JSON.stringify({
        completionPercentage: pct,
        status: pct >= 100 ? "COMPLETED" : "IN_PROGRESS",
      });

      const url = `${getApiV1BaseUrl()}/attempts/${attemptId}`;
      fetch(url, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    };

    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  const handleSelectModule = (moduleId: string) => {
    const module = moduleAccess?.modules.find((item) => item.moduleId === moduleId);
    if (!module?.unlocked) return;
    setSelectedModule(module);
    setShowModulePicker(false);
    setLaunchUrl(null);
    setError(null);
  };

  if (course.modulePacingEnabled && showModulePicker && moduleAccess) {
    return (
      <ModulePicker
        courseTitle={course.title}
        modules={moduleAccess.modules}
        pacingStartDate={moduleAccess.pacingStartDate}
        modulePacingDays={moduleAccess.modulePacingDays}
        selectedModuleId={selectedModule?.moduleId ?? null}
        isLoading={moduleAccessLoading}
        onSelectModule={handleSelectModule}
        onBack={onBack}
      />
    );
  }

  // ----------------------------
  // Completion screen
  // ----------------------------
  if (showEndScreen) {
    const failed = sessionPassed === false;
    return (
      <div className="fixed inset-0 bg-slate-50 flex flex-col">
        <header className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
          <button
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            Back
          </button>

          <div className="font-medium">{course.title}</div>
          <div className="w-16" />
        </header>

        <main className="flex-1 flex items-center justify-center">
          <div className="bg-white p-12 rounded-xl shadow text-center max-w-lg">
            {failed ? (
              <XCircle size={64} className="mx-auto mb-6 text-red-500" />
            ) : (
              <Award size={64} className="mx-auto mb-6 text-green-600" />
            )}
            <h1 className="text-3xl font-bold mb-4">
              {failed ? "Quiz not passed" : "Course completed"}
            </h1>
            {failed && (
              <p className="text-slate-600 mb-4">
                You scored{" "}
                <strong>{sessionScorePercent ?? "—"}%</strong>. The minimum
                required score is <strong>{sessionPassingScore}%</strong>.
                Please retake the course to try again.
              </p>
            )}
            {completionSyncMessage && (
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                {isCompletionSyncing && (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                )}
                <span>{completionSyncMessage}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {failed ? (
                <button
                  onClick={() => void handleRetake()}
                  className="bg-brand-primary text-white px-6 py-3 rounded flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:bg-brand-primary/60"
                  disabled={isCompletionSyncing || isRetaking}
                >
                  <RotateCcw size={18} />
                  {isRetaking ? "Starting retake..." : "Retake Course"}
                </button>
              ) : (
                <button
                  onClick={onViewCertificate}
                  className="bg-brand-primary text-white px-6 py-3 rounded flex items-center gap-2 disabled:cursor-not-allowed disabled:bg-brand-primary/60"
                  disabled={isCompletionSyncing || sessionPassed !== true}
                >
                  <Download size={18} />
                  {isCompletionSyncing ? "Syncing..." : "Certificate"}
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ----------------------------
  // Player UI
  // ----------------------------
  return (
    <div className="fixed inset-0 flex flex-col">
      <header className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
        <button
          onClick={async () => {
            try {
              if (scormAttemptIdRef.current) {
                await syncAttempt(scormAttemptIdRef.current, course.id);
              }
            } catch (e) {
              console.error("Final sync failed", e);
            }

            if (course.modulePacingEnabled) {
              setShowModulePicker(true);
              setLaunchUrl(null);
              try {
                const access = await fetchCourseModuleAccess(course.id);
                setModuleAccess(access);
              } catch (e) {
                console.error("Failed to refresh module access", e);
              }
              return;
            }

            onBack();
          }}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={20} />
          {course.modulePacingEnabled ? "Back to modules" : "Back to Course Library"}
        </button>

        <div className="font-medium">
          {course.title}
          {selectedModule ? ` — ${selectedModule.name}` : ""}
        </div>
        <div className="w-16" />
      </header>

      <div className="flex-1 bg-black">
        {loading && (
          <div className="h-full flex items-center justify-center text-white">
            Loading lesson...
          </div>
        )}

        {error && (
          <div className="h-full flex items-center justify-center text-red-500">
            {error}
          </div>
        )}

        {!loading && !error && launchUrl && (
          <iframe
            src={launchUrl}
            className="w-full h-full border-0"
            allow="autoplay; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        )}
      </div>
    </div>
  );
};
