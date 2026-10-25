"use client";

import type { ReportDocument, ReportLine, ReportTableBlock, StatementMeta } from "@/lib/financial-statements/types";
import { formatCents } from "@/lib/financial-statements/format";
import { Edit3 } from "lucide-react";

interface StatementReportPreviewProps {
  document: ReportDocument;
  onDownloadPdf?: () => void;
  canDownloadPdf?: boolean;
  onUpdateMeta?: (field: "preparedByName" | "preparedByTitle" | "approvedByName" | "approvedByTitle", value: string) => void;
  meta?: StatementMeta;
}

export default function StatementReportPreview({
  document: doc,
  onDownloadPdf,
  canDownloadPdf = false,
  onUpdateMeta,
  meta,
}: StatementReportPreviewProps) {
  return (
    <div className="space-y-6">
      {/* Paper-styled Statement Sheet */}
      <div className="bg-white dark:bg-[#11141D] rounded-3xl border border-slate-200 dark:border-white/10 p-6 sm:p-10 shadow-lg print:shadow-none print:border-none">
        {/* Document Header */}
        <div className="text-center space-y-2 pb-6 border-b border-slate-200 dark:border-white/10">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-[#555C72]">
            Official Financial Statement
          </p>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#F0F2F8] tracking-tight">
            {doc.businessName || "(Business Name Not Specified)"}
          </h2>
          <p className="text-base font-bold text-amber-600 dark:text-amber-400">
            {doc.title}
          </p>
          <p className="text-xs text-slate-500 dark:text-[#8B92A5] font-medium">
            {doc.periodText}
          </p>

          {doc.options && doc.options.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {doc.options.map((opt) => (
                <span
                  key={opt.label}
                  className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-[11px] font-semibold text-slate-600 dark:text-[#8B92A5]"
                >
                  {opt.label}: <strong className="text-slate-900 dark:text-[#F0F2F8]">{opt.value}</strong>
                </span>
              ))}
            </div>
          )}

          <p className="text-[10px] text-slate-400 dark:text-[#555C72] italic pt-1">
            Amounts in Philippine Peso (PHP)
          </p>
        </div>

        {/* Content Blocks */}
        <div className="py-6 space-y-8">
          {doc.blocks.map((block, idx) => {
            if (block.type === "lines") {
              return (
                <div key={idx} className="space-y-2">
                  {block.title && (
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 border-b border-slate-200 dark:border-white/10 pb-1 mb-2">
                      {block.title}
                    </h3>
                  )}
                  <div className="space-y-1 font-mono text-xs">
                    {block.lines.map((line, lIdx) => (
                      <ReportLineRow key={lIdx} line={line} />
                    ))}
                  </div>
                </div>
              );
            }

            if (block.type === "table") {
              return <ReportTableComponent key={idx} block={block} />;
            }

            return null;
          })}
        </div>



        {/* Prepared By and Certification Block */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/10">
          {onUpdateMeta && (
            <div className="flex justify-end mb-3">
              <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Edit3 className="w-3 h-3" />
                <span>Editable signature details</span>
              </span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/2 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Prepared By:
              </p>
              <div className="h-9 border-b border-dashed border-slate-300 dark:border-white/20 flex items-end pb-1 font-serif text-sm italic text-slate-800 dark:text-slate-200">
                {onUpdateMeta ? (
                  <input
                    type="text"
                    value={meta?.preparedByName ?? doc.preparedBy ?? ""}
                    placeholder="Enter preparer / proponent name"
                    onChange={(e) => onUpdateMeta("preparedByName", e.target.value)}
                    className="w-full bg-transparent border-none outline-none font-serif text-sm italic text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-0 p-0"
                  />
                ) : (
                  doc.preparedBy || "Student Preparer"
                )}
              </div>
              <div>
                {onUpdateMeta ? (
                  <input
                    type="text"
                    value={meta?.preparedByTitle ?? doc.preparedByTitle ?? ""}
                    placeholder="Student / Accounting Preparer"
                    onChange={(e) => onUpdateMeta("preparedByTitle", e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-[10px] text-slate-500 dark:text-slate-400 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-0 p-0"
                  />
                ) : (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    {doc.preparedByTitle || "Student / Accounting Preparer"}
                  </p>
                )}
              </div>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/2 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Reviewed & Approved By:
              </p>
              <div className="h-9 border-b border-dashed border-slate-300 dark:border-white/20 flex items-end pb-1 font-serif text-sm italic text-slate-800 dark:text-slate-200">
                {onUpdateMeta ? (
                  <input
                    type="text"
                    value={meta?.approvedByName ?? doc.approvedBy ?? ""}
                    placeholder="Enter reviewer / approver name"
                    onChange={(e) => onUpdateMeta("approvedByName", e.target.value)}
                    className="w-full bg-transparent border-none outline-none font-serif text-sm italic text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-0 p-0"
                  />
                ) : (
                  doc.approvedBy || "Faculty Instructor / Supervisor"
                )}
              </div>
              <div>
                {onUpdateMeta ? (
                  <input
                    type="text"
                    value={meta?.approvedByTitle ?? doc.approvedByTitle ?? ""}
                    placeholder="Faculty Instructor / Supervisor"
                    onChange={(e) => onUpdateMeta("approvedByTitle", e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-[10px] text-slate-500 dark:text-slate-400 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-0 p-0"
                  />
                ) : (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    {doc.approvedByTitle || "Institute of Business and Entrepreneurship (IBE)"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-end text-[10px] text-slate-400 dark:text-[#555C72]">
          <span>Page 1 of 1</span>
        </div>
      </div>
    </div>
  );
}

function ReportLineRow({ line }: { line: ReportLine }) {
  const isHeading = line.kind === "heading";
  const isSubtotal = line.kind === "subtotal";
  const isTotal = line.kind === "total";
  const isGrand = line.kind === "grand";

  const indentClass =
    line.indent === 2 ? "pl-8" : line.indent === 1 ? "pl-4" : "pl-0";

  if (isHeading) {
    return (
      <div className={`pt-3 pb-1 font-sans font-bold text-xs uppercase tracking-wide text-slate-800 dark:text-[#E0E4EE] ${indentClass}`}>
        {line.label}
      </div>
    );
  }

  return (
    <div
      className={`flex items-baseline justify-between py-1 transition-colors ${indentClass} ${
        isGrand
          ? "pt-2 font-bold text-sm text-slate-900 dark:text-[#F0F2F8]"
          : isTotal
          ? "pt-1.5 font-bold text-xs text-slate-900 dark:text-[#F0F2F8]"
          : isSubtotal
          ? "font-semibold text-xs text-slate-700 dark:text-slate-300"
          : "text-slate-600 dark:text-[#8B92A5]"
      }`}
    >
      <span className="truncate pr-4">{line.label}</span>
      {line.cents !== undefined && (
        <span
          className={`shrink-0 font-mono ${
            isGrand
              ? "border-t border-slate-400 dark:border-white/20 border-b-2 pb-0.5"
              : isTotal || isSubtotal
              ? "border-t border-slate-300 dark:border-white/10"
              : ""
          }`}
        >
          {formatCents(line.cents)}
        </span>
      )}
    </div>
  );
}

function ReportTableComponent({ block }: { block: ReportTableBlock }) {
  return (
    <div className="space-y-2">
      {block.title && (
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 border-b border-slate-200 dark:border-white/10 pb-1">
          {block.title}
        </h3>
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
        <table className="w-full text-xs font-mono border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-white/3 border-b border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-sans font-semibold">
              {block.columns.map((col, i) => (
                <th
                  key={i}
                  className={`p-2.5 ${
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                      ? "text-center"
                      : "text-left"
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {block.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={block.columns.length}
                  className="p-4 text-center text-slate-400 italic font-sans"
                >
                  No items recorded.
                </td>
              </tr>
            ) : (
              block.rows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className={rIdx % 2 === 1 ? "bg-slate-50/50 dark:bg-white/1" : ""}
                >
                  {row.map((cell, cIdx) => {
                    const col = block.columns[cIdx];
                    return (
                      <td
                        key={cIdx}
                        className={`p-2.5 text-slate-700 dark:text-slate-300 ${
                          col?.align === "right"
                            ? "text-right"
                            : col?.align === "center"
                            ? "text-center"
                            : "text-left"
                        }`}
                      >
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
          {block.footer && block.footer.length > 0 && (
            <tfoot>
              {block.footer.map((fRow, fIdx) => (
                <tr
                  key={fIdx}
                  className="bg-slate-50 dark:bg-white/3 border-t-2 border-slate-300 dark:border-white/20 font-bold text-slate-900 dark:text-[#F0F2F8]"
                >
                  {fRow.map((cell, cIdx) => {
                    const col = block.columns[cIdx];
                    return (
                      <td
                        key={cIdx}
                        className={`p-2.5 ${
                          col?.align === "right"
                            ? "text-right"
                            : col?.align === "center"
                            ? "text-center"
                            : "text-left"
                        }`}
                      >
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
