import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { fieldTask } from "../api/fieldTask";

type MediaType = "image" | "video" | null;

const MAX_IMAGES = 4;

export const FieldAssessmentPage: React.FC = () => {
  const [mediaType, setMediaType] = useState<MediaType>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [urls, setUrls] = useState<string[]>([]);
  const [moduleTopic, setModuleTopic] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Create preview URLs */
  useEffect(() => {
    const previewUrls = files.map((file) => URL.createObjectURL(file));
    setUrls(previewUrls);

    return () => previewUrls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  /* Handle media selection */
  const handleMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.currentTarget.files;
    if (!fileList) return;

    const selected = Array.from<File>(fileList);

    const video = selected.find((f) => f.type.startsWith("video/"));
    const images = selected.filter((f) => f.type.startsWith("image/"));

    if (video) {
      setMediaType("video");
      setFiles([video]);
    } else if (images.length) {
      setMediaType("image");
      setFiles((prev) => [...prev, ...images].slice(0, MAX_IMAGES));
    }

    e.currentTarget.value = "";
  };

  /* Remove media */
  const removeMedia = (index?: number) => {
    if (mediaType === "video") {
      setFiles([]);
      setMediaType(null);
      return;
    }

    if (index !== undefined) {
      const updated = files.filter((_, i) => i !== index);
      setFiles(updated);
      if (!updated.length) setMediaType(null);
    }
  };

  /* Submit */
  const handleSubmit = async () => {
    if (!files.length) {
      alert("Upload up to 4 images or one video.");
      return;
    }

    if (!moduleTopic.trim()) {
      alert("Module topic is required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      /* Upload each file individually (API expects one file) */
      const uploadResults = await Promise.allSettled(
        files.map((file) => fieldTask(moduleTopic, note, file)),
      );

      const failed = uploadResults.filter(
        (result) => result.status === "rejected",
      ) as PromiseRejectedResult[];

      if (failed.length) {
        const messages = failed
          .map((f) => (f.reason instanceof Error ? f.reason.message : String(f.reason)))
          .filter(Boolean);
        const message = `Some uploads failed (${failed.length}): ${messages.join(", ")}`;
        setError(message);
        console.error("Assessment submission failed:", message);
        alert(message);
        return;
      }

      alert("Assessment submitted successfully!");

      setFiles([]);
      setUrls([]);
      setMediaType(null);
      setModuleTopic("");
      setNote("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      console.error("Assessment submission failed:", message);
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white border rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-bold">Field Task</h2>

        <p className="text-slate-500">
          Upload up to 4 photos or one video as proof of field activity.
        </p>

        <input
          type="text"
          placeholder="Module Topic"
          value={moduleTopic}
          onChange={(e) => setModuleTopic(e.target.value)}
          className="w-full border rounded-lg p-3"
        />

        <textarea
          placeholder="Describe what you did..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full border rounded-lg p-3"
        />

        <input
          type="file"
          accept="image/*,video/*"
          multiple={mediaType !== "video"}
          disabled={
            mediaType === "video" ||
            (mediaType === "image" && files.length >= MAX_IMAGES)
          }
          onChange={handleMedia}
        />

        {/* Image preview */}
        {mediaType === "image" && (
          <div className="flex gap-3 flex-wrap">
            {urls.map((url, i) => (
              <div key={i} className="relative">
                <img
                  src={url}
                  alt={`Field image ${i + 1}`}
                  className="w-24 h-24 object-cover rounded-lg border"
                />
                <button
                  onClick={() => removeMedia(i)}
                  className="absolute -top-2 -right-2 bg-black text-white rounded-full p-1"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Video preview */}
        {mediaType === "video" && urls[0] && (
          <div className="relative">
            <video
              src={urls[0]}
              controls
              className="w-full max-h-64 rounded-lg border"
            />
            <button
              onClick={() => removeMedia()}
              className="absolute top-2 right-2 bg-black text-white rounded-full p-1"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-4 py-2 bg-brand-accent hover:bg-brand-accent-dark text-white rounded-lg transition-colors"
        >
          {loading ? "Submitting..." : "Submit Assessment"}
        </button>

        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
    </div>
  );
};