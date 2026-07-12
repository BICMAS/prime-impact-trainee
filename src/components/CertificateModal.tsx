import React, { useEffect, useRef, useState } from 'react';
import { X, Download, Linkedin, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { downloadMyCourseCertificate, saveCertificateBlob } from '@/api/certificates';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  courseId?: string;
  courseTitle: string;
  recipientName: string;
  certificateUrl?: string;
}

type CertificateStatus = 'idle' | 'processing' | 'success' | 'error';

export const CertificateModal: React.FC<CertificateModalProps> = ({
isOpen,
onClose,
onConfirm,
courseId,
courseTitle,
certificateUrl
}) => {
  const [status, setStatus] = useState<CertificateStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const processingTimeoutRef = useRef<number | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  const isProcessing = status === 'processing';
  const isDownloaded = status === 'success';
  const isError = status === 'error';

  const clearTimers = () => {
    if (processingTimeoutRef.current !== null) {
      window.clearTimeout(processingTimeoutRef.current);
     processingTimeoutRef.current = null;
    }

    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const resetState = () => {
    clearTimers();
    setStatus('idle');
    setErrorMessage('');
  };

  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setErrorMessage('');
     return;
   }

    resetState();
  }, [isOpen]);

  useEffect(() => () => {
    clearTimers();
  }, []);

  if (!isOpen) return null;

  const handleClose = () => {
   resetState();
    onClose();
  };

 const handleLinkedInShare = () => {
    const text = `I just successfully completed the "${courseTitle}" course at Prime Impact! #Learning #ProfessionalDevelopment #PrimeImpact`;
    const url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=600');
  };

  const sanitizeFileName = (value: string) => {
    const sanitized = value
     .trim()
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
      .replace(/\s+/g, '_')
     .slice(0, 120);

   return sanitized || 'certificate';
  };

  const completeSuccess = () => {
    setStatus('success');
    setErrorMessage('');

    closeTimeoutRef.current = window.setTimeout(() => {
      resetState();
      onConfirm();
    }, 2000);
  };

  const handleDownload = () => {
    if (isProcessing) return;

    setStatus('processing');
    setErrorMessage('');

   processingTimeoutRef.current = window.setTimeout(async () => {
      try {
        if (courseId) {
          const blob = await downloadMyCourseCertificate(courseId);
          saveCertificateBlob(
            blob,
            `${sanitizeFileName(courseTitle)}_Certificate.pdf`,
          );
          completeSuccess();
          return;
        }

      if (certificateUrl && certificateUrl.startsWith('http')) {
        const response = await fetch(certificateUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch certificate file');
        }
        const blob = await response.blob();
        saveCertificateBlob(
          blob,
          `${sanitizeFileName(courseTitle)}_Certificate.pdf`,
        );
        completeSuccess();
        return;
      }

      throw new Error('Certificate is not available yet.');
      } catch (error) {
        setStatus('error');
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'We could not download your certificate right now. Please try again.',
        );
      } finally {
        processingTimeoutRef.current = null;
      }
    }, 300);
  };

 const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
   if (event.key === 'Escape' && !isProcessing) {
      handleClose();
    }
  };

  return (
    <div
     className="fixed inset-0 z-100 flex items-center justify-center p-4"
     role="dialog"
     aria-modal="true"
     aria-labelledby="certificate-modal-title"
      onKeyDown={handleKeyDown}
    >
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
       onClick={isProcessing ? undefined : handleClose}
      />

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
       <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
        <h3 id="certificate-modal-title" className="font-semibold text-slate-800">
           Download Certificate
         </h3>
         {!isProcessing && (
            <button
              type="button"
             onClick={handleClose}
             className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Close certificate modal"
            >
              <X size={20} />
            </button>
         )}
        </div>

        <div className="p-8 text-center">
         <div
           className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-8 transition-all duration-500 ${
             isDownloaded
                ? 'bg-green-50 text-green-600 ring-green-50/50'
               : isError
                 ? 'bg-red-50 text-red-600 ring-red-50/50'
                 : 'bg-brand-primary/10 text-brand-primary ring-brand-primary/10'
           }`}
         >
            {isProcessing ? (
              <Loader2 size={36} className="animate-spin" />
            ) : isDownloaded ? (
             <CheckCircle size={36} />
            ) : isError ? (
             <AlertCircle size={36} />
            ) : (
              <Download size={36} />
            )}
          </div>

         <h4 className="text-xl font-bold text-slate-900 mb-3">
           {isProcessing
              ? 'Generating Certificate...'
              : isDownloaded
               ? 'Download Complete!'
                : isError
                  ? 'Download Failed'
                  : 'Ready to Download?'}
          </h4>

         <p className="text-slate-500 mb-8 leading-relaxed">
           {isProcessing
              ? 'Please wait while we prepare your personalized PDF document.'
              : isDownloaded
               ? 'Your certificate has been downloaded successfully.'
                : isError
                  ? errorMessage
                  : (
                   <>
                     You are about to download the official certificate for <br />
                     <span className="font-semibold text-slate-800">"{courseTitle}"</span>
                   </>
                 )}
          </p>

          {!isDownloaded && !isProcessing && (
           <div className="space-y-3">
              <button
               type="button"
                onClick={handleDownload}
               className="w-full bg-brand-primary text-white py-3.5 rounded-xl font-semibold hover:bg-brand-primary-dark transition-all hover:shadow-lg hover:shadow-brand-primary/20 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
               {isError ? 'Try Again' : 'Confirm Download'}
              </button>

            <button
                type="button"
               onClick={handleLinkedInShare}
                className="w-full bg-[#0077b5] text-white py-3.5 rounded-xl font-semibold hover:bg-[#006396] transition-all hover:shadow-lg hover:shadow-blue-200 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Linkedin size={20} fill="currentColor" />
                Share on LinkedIn
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="w-full bg-white text-slate-600 border border-slate-200 py-3.5 rounded-xl font-semibold hover:bg-slate-50 transition-colors mt-2"
            >
                Cancel
              </button>
            </div>
         )}
        </div>
     </div>
   </div>
 );
};