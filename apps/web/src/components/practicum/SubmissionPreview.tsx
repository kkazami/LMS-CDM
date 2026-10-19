import { ExternalLink, FileText, Download } from "lucide-react";
import { formatBytes, getExtension, toYouTubeEmbedUrl } from "@/lib/practicum/rules";
import type { SubmissionDTO } from "@/lib/practicum/dto";

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg"];

/** Shows the submitted evidence: a video player, an embedded video link, an image, or a document link. */
export default function SubmissionPreview({ submission }: { submission: SubmissionDTO }) {
  const { fileUrl, fileName, fileSize, videoLink, type, title } = submission;

  if (videoLink) {
    const embed = toYouTubeEmbedUrl(videoLink);
    return (
      <div className="space-y-2">
        {embed ? (
          <div className="aspect-video w-full overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-black">
            <iframe
              src={embed}
              title={`Video: ${title}`}
              className="h-full w-full"
              loading="lazy"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        ) : null}
        <a
          href={videoLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Open video link
        </a>
      </div>
    );
  }

  if (!fileUrl) {
    return <p className="text-sm text-slate-600 dark:text-[#94A3B8]">No file attached.</p>;
  }

  const extension = getExtension(fileName ?? fileUrl);
  const meta = (
    <p className="text-xs text-slate-600 dark:text-[#94A3B8]">
      {fileName}
      {fileSize ? ` · ${formatBytes(fileSize)}` : ""}
    </p>
  );

  if (type === "DEMO_VIDEO") {
    return (
      <div className="space-y-2">
        <video
          controls
          preload="metadata"
          src={fileUrl}
          className="w-full max-h-[70vh] rounded-xl border border-slate-200 dark:border-white/10 bg-black"
        >
          Your browser cannot play this video.{" "}
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">
            Download it instead
          </a>
          .
        </video>
        {meta}
      </div>
    );
  }

  if (IMAGE_EXTENSIONS.includes(extension)) {
    return (
      <div className="space-y-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fileUrl}
          alt={`Evidence: ${title}`}
          className="max-h-[70vh] w-auto max-w-full rounded-xl border border-slate-200 dark:border-white/10"
        />
        {meta}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#181B26] p-3">
      <div className="flex min-w-0 items-center gap-3">
        <FileText className="h-5 w-5 shrink-0 text-slate-500 dark:text-[#94A3B8]" aria-hidden="true" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-[#F0F2F8]">{fileName}</p>
          {fileSize ? <p className="text-xs text-slate-600 dark:text-[#94A3B8]">{formatBytes(fileSize)}</p> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-sm font-medium text-blue-600 dark:text-blue-400">
        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          {extension === "pdf" ? "Preview" : "Open"}
        </a>
        <a href={fileUrl} download={fileName ?? undefined} className="inline-flex items-center gap-1 hover:underline">
          <Download className="h-4 w-4" aria-hidden="true" />
          Download
        </a>
      </div>
    </div>
  );
}
