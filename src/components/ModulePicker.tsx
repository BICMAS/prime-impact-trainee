import { Lock, PlayCircle, CheckCircle2, XCircle } from "lucide-react";
import type { ModuleAccessItem } from "@/api/moduleAccess";

interface ModulePickerProps {
  courseTitle: string;
  modules: ModuleAccessItem[];
  pacingStartDate: string | null;
  modulePacingDays: number;
  selectedModuleId: string | null;
  isLoading?: boolean;
  onSelectModule: (moduleId: string) => void;
  onBack: () => void;
}

function formatUnlockDate(unlockAt: string | null) {
  if (!unlockAt) return "Soon";
  return new Date(unlockAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(module: ModuleAccessItem) {
  if (!module.unlocked) return `Unlocks ${formatUnlockDate(module.unlockAt)}`;
  if (module.status === "COMPLETED") return "Completed";
  if (module.status === "FAILED") return "Failed — retake available";
  if (module.status === "IN_PROGRESS") return "In progress";
  return "Ready to start";
}

function StatusIcon({ module }: { module: ModuleAccessItem }) {
  if (!module.unlocked) {
    return <Lock className="text-slate-400" size={22} />;
  }
  if (module.status === "COMPLETED") {
    return <CheckCircle2 className="text-green-600" size={22} />;
  }
  if (module.status === "FAILED") {
    return <XCircle className="text-red-500" size={22} />;
  }
  return <PlayCircle className="text-brand-primary" size={22} />;
}

export function ModulePicker({
  courseTitle,
  modules,
  pacingStartDate,
  modulePacingDays,
  selectedModuleId,
  isLoading = false,
  onSelectModule,
  onBack,
}: ModulePickerProps) {
  const cohortLabel = pacingStartDate
    ? new Date(pacingStartDate).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col">
      <header className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
        <button onClick={onBack} className="text-sm hover:underline">
          Back to library
        </button>
        <div className="font-medium">{courseTitle}</div>
        <div className="w-24" />
      </header>

      <main className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Course modules</h1>
          <p className="text-slate-600 text-sm">
            Modules unlock on a fixed cohort calendar
            {cohortLabel ? ` starting ${cohortLabel}` : ""}. One new module opens
            every {modulePacingDays} days. You do not need to finish a module
            before the next one unlocks.
          </p>
        </div>

        {isLoading ? (
          <div className="text-center text-slate-500 py-12">Loading modules...</div>
        ) : (
          <div className="space-y-3">
            {modules.map((module) => {
              const isSelected = selectedModuleId === module.moduleId;
              const isDisabled = !module.unlocked;

              return (
                <button
                  key={module.moduleId}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => onSelectModule(module.moduleId)}
                  className={`w-full text-left rounded-xl border p-4 transition ${
                    isDisabled
                      ? "border-slate-200 bg-slate-100 opacity-70 cursor-not-allowed"
                      : isSelected
                        ? "border-brand-primary bg-white shadow-sm"
                        : "border-slate-200 bg-white hover:border-brand-primary/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <StatusIcon module={module} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900">
                        Week {module.index + 1}: {module.name}
                      </div>
                      <div className="text-sm text-slate-500 mt-1">
                        {statusLabel(module)}
                      </div>
                      {module.unlocked && module.completionPercentage > 0 && (
                        <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-brand-primary"
                            style={{ width: `${module.completionPercentage}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
