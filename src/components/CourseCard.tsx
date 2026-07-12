import React from "react";
import { Course, CourseStatus } from "../types";
import {
  Play,
  CheckCircle,
  Download,
  Trash2,
  Award,
  Clock,
} from "lucide-react";
import { hasCourseBeenStartedLocally, markCourseStartedLocally } from "@/utils/courseStartState";

interface CourseCardProps {
  course: Course;
  progress: number;
  status?: CourseStatus | string | null;
  onStart: (id: string) => void;
  onViewCertificate?: (id: string) => void;
  onDownload: (id: string) => void;
  onRemoveDownload: (id: string) => void;
  isOfflineMode: boolean;
}

/**
 * ---------------------------------------
 * Normalize incoming status safely
 * React Query + backend + SCORM can send:
 * - undefined
 * - null
 * - "IN_PROGRESS"
 * - enum value
 * ---------------------------------------
 */
const normalizeStatus = (
  rawStatus: any,
  progress: number,
  startedLocally: boolean,
): CourseStatus => {
  // Progress is the strongest signal
  if (progress >= 100) return CourseStatus.Completed;
  if (progress > 0) return CourseStatus.InProgress;

  // Backend strings
  if (rawStatus === "COMPLETED") return CourseStatus.Completed;
  if (rawStatus === "IN_PROGRESS") return CourseStatus.InProgress;

  // Frontend enum values
  if (rawStatus === CourseStatus.Completed) return CourseStatus.Completed;
  if (rawStatus === CourseStatus.InProgress) return CourseStatus.InProgress;
  if (rawStatus === CourseStatus.NotStarted) return CourseStatus.NotStarted;
  if (startedLocally) return CourseStatus.InProgress;

  return CourseStatus.NotStarted;
};

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  progress,
  status,
  onStart,
  onViewCertificate,
  onDownload,
  onRemoveDownload,
  isOfflineMode,
}) => {
  // ----------------------------
  // Safe derived values
  // ----------------------------
  const normalizedProgress = Math.round(
    Math.min(100, Math.max(0, progress || 0)),
  );

  const startedLocally = hasCourseBeenStartedLocally(course.id);
  const safeStatus = normalizeStatus(status, normalizedProgress, startedLocally);

  const isCompleted = safeStatus === CourseStatus.Completed;
  const isDisabled = isOfflineMode && !course.isDownloaded;

  // ----------------------------
  // Status UI (always safe now)
  // ----------------------------
  const statusConfig: Record<
    CourseStatus,
    { label: string; badge: string; bar: string }
  > = {
    [CourseStatus.NotStarted]: {
      label: "Not started",
      badge: "bg-slate-100 text-slate-600",
      bar: "bg-slate-300",
    },
    [CourseStatus.InProgress]: {
      label: "In progress",
      badge: "bg-brand-primary/10 text-brand-primary",
      bar: "bg-brand-primary",
    },
    [CourseStatus.Completed]: {
      label: "Completed",
      badge: "bg-green-100 text-green-700",
      bar: "bg-green-500",
    },
  };

  // Default fallback UI in case statusUI is undefined
  const defaultStatusUI = {
    label: "Unknown",
    badge: "bg-gray-100 text-gray-600",
    bar: "bg-gray-300",
  };

  const statusUI = statusConfig[safeStatus] || defaultStatusUI;

  // Debug safety net (optional) - log if fallback is used
  if (!statusConfig[safeStatus]) {
    console.warn("[CourseCard] Invalid status, using fallback", {
      receivedStatus: status,
      normalized: safeStatus,
      progress,
      courseId: course.id,
    });
  }

  const buttonLabel =
    safeStatus === CourseStatus.Completed
      ? "Completed"
      : safeStatus === CourseStatus.InProgress
        ? "Resume"
        : "Start Course";

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await onDownload(course.id);
  };

  const handleStart = () => {
    markCourseStartedLocally(course.id);
    onStart(course.id);
  };

   // console.log("Course image:", course.thumbnail, course);

  // ----------------------------
  // UI
  // ----------------------------
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col transition-all hover:shadow-md ${
        isDisabled ? "opacity-50 grayscale" : ""
      }`}
    >
      {/* Thumbnail */}
      <div className="relative h-40 overflow-hidden group">
        <img
          src={
            course.thumbnail ||
            `https://picsum.photos/seed/${course.id}/600/400`
          }
          alt={course.title}
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            const fallbackUrl = `https://picsum.photos/seed/${course.id}/600/400`;
            // Only set fallback if not already applied
            if (img.src !== fallbackUrl && !img.dataset.fallbackApplied) {
              img.src = fallbackUrl;
              img.dataset.fallbackApplied = "true";
            }
          }}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {!isDisabled && (
            <button
              onClick={handleStart}
              className="bg-white text-slate-900 rounded-full p-3 hover:scale-110 transition-transform"
            >
              <Play size={24} fill="currentColor" />
            </button>
          )}
        </div>

        {course.category === "Mandatory" && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
            MANDATORY
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2 gap-2">
          <h3 className="font-semibold text-slate-900 line-clamp-2 leading-tight">
            {course.title}
          </h3>

          {isCompleted && (
            <CheckCircle size={18} className="text-green-500 shrink-0" />
          )}
        </div>

        {/* Status badge */}
        <div className="mb-2">
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${statusUI.badge}`}
          >
            {statusUI.label}
          </span>
        </div>

        <p className="text-slate-500 text-sm mb-4 line-clamp-2 flex-1">
          {course.description}
        </p>

        <div className="mt-auto space-y-3">
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all ${statusUI.bar}`}
              style={{ width: `${normalizedProgress}%` }}
            />
          </div>

          <div className="flex justify-between text-xs text-slate-500">
            <span>{normalizedProgress}% Complete</span>
            {course.deadline && (
              <span>Due: {new Date(course.deadline).toLocaleDateString()}</span>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <button
              onClick={handleStart}
              disabled={isDisabled}
              className={`text-sm font-medium ${
                isDisabled
                  ? "cursor-not-allowed text-slate-400"
                  : "text-brand-primary hover:text-brand-primary-dark"
              }`}
            >
              {buttonLabel}
            </button>

            <div className="flex items-center gap-2">
              {isCompleted && (
                <div className="text-yellow-600 flex items-center gap-1 text-xs font-medium bg-yellow-50 px-2 py-1 rounded-full">
                  <Award size={12} /> Certified
                </div>
              )}
              {isCompleted && onViewCertificate && (
                <button
                  onClick={() => onViewCertificate(course.id)}
                  className="text-xs font-medium text-brand-primary hover:text-brand-primary-dark"
                  title="Download Certificate"
                >
                  Certificate
                </button>
              )}

              {course.isDownloaded ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveDownload(course.id);
                  }}
                  className="text-green-600 hover:text-red-500 transition-colors p-1"
                  title="Remove Download"
                >
                  <Trash2 size={16} />
                </button>
              ) : (
                <button
                  onClick={handleDownload}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                  title="Download for Offline"
                  disabled={isOfflineMode}
                >
                  {isOfflineMode ? <Clock size={16} /> : <Download size={16} />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
