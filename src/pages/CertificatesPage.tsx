import { useEffect, useMemo, useState } from "react";
import { Award, Download } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { CertificateModal } from "@/components/CertificateModal";
import { useDashboard } from "@/hooks/useDashboard";
import { useLibrary } from "@/hooks/useLibrary";
import { useAuth } from "@/context/AuthContext";
import { Course, CourseStatus } from "@/types";
import { claimMyCourseCertificate } from "@/api/certificates";

export default function CertificatesPage() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useDashboard();
  const dashboardCourses = data?.courses ?? [];
  const {
    data: libraryCourses = [],
    isLoading: isLibraryLoading,
    isError: isLibraryError,
  } = useLibrary(dashboardCourses);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCertificate, setSelectedCertificate] = useState<Course | null>(null);
  const [isPreparingCertificate, setIsPreparingCertificate] = useState<string | null>(
    null,
  );
  const [pageMessage, setPageMessage] = useState<string>("");
  const [certificateIssuedState, setCertificateIssuedState] = useState<
    Record<string, "issued_now" | "already_issued" | "reissued">
  >({});

  const allCourses = libraryCourses.length ? libraryCourses : dashboardCourses;
  const completedCourses = useMemo(
    () =>
      allCourses.filter((course) => course.status === CourseStatus.Completed),
    [allCourses],
  );

  const requestedCourseId = searchParams.get("course");

  const openCertificate = async (course: Course) => {
    setPageMessage("");
    setIsPreparingCertificate(course.id);

    try {
      const claimed = await claimMyCourseCertificate(course.id);
      const certificateUrl =
        claimed?.certificate?.certificateUrl ?? claimed?.certificate?.pdfPath;
      setCertificateIssuedState((prev) => ({
        ...prev,
        [course.id]: claimed?.reissued
          ? "reissued"
          : claimed?.issued
            ? "issued_now"
            : "already_issued",
      }));

      setSelectedCertificate({
        ...course,
        certificateUrl,
      });
    } catch (error: any) {
      setPageMessage(error?.message || "Certificate is not ready yet.");
      setSelectedCertificate(null);
    } finally {
      setIsPreparingCertificate(null);
    }
  };

  useEffect(() => {
    if (!requestedCourseId || selectedCertificate) return;

    const requestedCourse = completedCourses.find(
      (course) => course.id === requestedCourseId,
    );

    if (requestedCourse) {
      void openCertificate(requestedCourse);
    }
  }, [completedCourses, requestedCourseId, selectedCertificate]);

  const handleCloseModal = () => {
    setSelectedCertificate(null);
    if (requestedCourseId) {
      setSearchParams({});
    }
  };

  if (!user) return null;

  if (isLoading || isLibraryLoading) {
    return <div className="p-10 text-center text-slate-500">Loading certificates...</div>;
  }

  if (isError || isLibraryError) {
    return (
      <div className="p-10 text-center text-slate-500">
        We could not load your certificates right now.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Your Certificates</h2>
          <p className="mt-2 text-slate-500">
            Download certificates for every completed course.
          </p>
          {pageMessage && (
            <p className="mt-2 text-sm text-amber-700">{pageMessage}</p>
          )}
        </div>

        {!completedCourses.length ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-slate-500 shadow-sm">
            Complete a course to unlock your first certificate.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {completedCourses.map((course) => (
              <div
                key={course.id}
                className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      <Award size={14} />
                      Completed
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-slate-900">
                      {course.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      {course.description}
                    </p>
                    {certificateIssuedState[course.id] === "reissued" && (
                      <p className="mt-2 text-xs font-medium text-amber-700">
                        Updated with the latest certificate template
                      </p>
                    )}
                    {certificateIssuedState[course.id] === "issued_now" && (
                      <p className="mt-2 text-xs font-medium text-emerald-700">
                        Issued now
                      </p>
                    )}
                    {certificateIssuedState[course.id] === "already_issued" && (
                      <p className="mt-2 text-xs font-medium text-brand-primary">
                        Already issued
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openCertificate(course)}
                  disabled={isPreparingCertificate === course.id}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark disabled:cursor-not-allowed disabled:bg-brand-primary/60"
                >
                  <Download size={16} />
                  {isPreparingCertificate === course.id
                    ? "Preparing certificate..."
                    : "Download Certificate"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <CertificateModal
        isOpen={!!selectedCertificate}
        onClose={handleCloseModal}
        onConfirm={handleCloseModal}
        courseId={selectedCertificate?.id}
        courseTitle={selectedCertificate?.title ?? ""}
        recipientName={user.name}
        certificateUrl={selectedCertificate?.certificateUrl}
      />
    </>
  );
}
