"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const DocumentViewerDynamic = dynamic(
  () => import("@/components/learning-materials/DocumentViewer"),
  { 
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center rounded-3xl border border-gray-200 bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm font-medium text-gray-500">Loading document viewer...</p>
        </div>
      </div>
    )
  }
);

export default DocumentViewerDynamic;
