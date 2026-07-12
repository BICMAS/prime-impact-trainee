import { getApiV1BaseUrl } from "@/config/api";
import { fetchWithAuthRetry } from "@/utils/fetchWithAuthRetry";

const BASE_URL = getApiV1BaseUrl();

interface CertificatePayload {
  id: string;
  userId: string;
  courseId: string;
  templateId: string;
  issuedAt: string;
  pdfPath?: string;
  certificateUrl?: string;
  verificationHash: string;
  issuedBy?: string;
}

export interface ClaimCertificateResponse {
  certificate: CertificatePayload;
  issued: boolean;
  reissued?: boolean;
}

export const claimMyCourseCertificate = async (
  courseId: string,
): Promise<ClaimCertificateResponse> => {
  const res = await fetchWithAuthRetry(
    `${BASE_URL}/certificates/my-courses/${courseId}/certificate`,
    { method: "POST" },
  );

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = body?.error || "Failed to claim certificate";
    throw new Error(message);
  }

  return body as ClaimCertificateResponse;
};

export const downloadMyCourseCertificate = async (
  courseId: string,
): Promise<Blob> => {
  const res = await fetchWithAuthRetry(
    `${BASE_URL}/certificates/my-courses/${courseId}/certificate/download`,
    { method: "GET" },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body?.error || "Failed to download certificate";
    throw new Error(message);
  }

  return res.blob();
};

export function saveCertificateBlob(blob: Blob, filename: string) {
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  window.URL.revokeObjectURL(objectUrl);
}
