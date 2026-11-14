"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { PrintablePlanData } from "@/lib/lesson-plans/rules";

interface LessonPlanPrintPortalProps {
  planData: PrintablePlanData;
  onPrinted: () => void;
}

export default function LessonPlanPrintPortal({
  planData,
  onPrinted,
}: LessonPlanPrintPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let animFrame1: number;
    let animFrame2: number;

    const handleAfterPrint = () => {
      onPrinted();
    };

    window.addEventListener("afterprint", handleAfterPrint);

    // Give DOM two animation frames to render portal content before opening print dialog
    animFrame1 = requestAnimationFrame(() => {
      animFrame2 = requestAnimationFrame(() => {
        window.print();
      });
    });

    return () => {
      cancelAnimationFrame(animFrame1);
      cancelAnimationFrame(animFrame2);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [mounted, onPrinted]);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div id="lesson-plan-print-root">
      <style>{`
        @media screen {
          #lesson-plan-print-root {
            display: none !important;
          }
        }
        @media print {
          body > *:not(#lesson-plan-print-root) {
            display: none !important;
          }
          #lesson-plan-print-root {
            display: block !important;
            position: static !important;
            background: #fff !important;
            color: #000 !important;
            font: 12pt/1.5 Georgia, "Times New Roman", serif !important;
          }
          html, body {
            background: #fff !important;
            color: #000 !important;
            height: auto !important;
            overflow: visible !important;
          }
          #lesson-plan-print-root h1 {
            font-size: 18pt !important;
            margin: 0 0 8pt 0 !important;
          }
          #lesson-plan-print-root h2 {
            font-size: 13pt !important;
            margin-top: 14pt !important;
            break-after: avoid !important;
          }
          #lesson-plan-print-root section {
            break-inside: avoid-page !important;
          }
          @page {
            margin: 18mm;
          }
        }
      `}</style>

      {/* Semantic Printable Document */}
      <article style={{ background: "#ffffff", color: "#000000" }}>
        <header
          style={{
            borderBottom: "1.5pt solid #000000",
            paddingBottom: "8pt",
            marginBottom: "12pt",
          }}
        >
          <div
            style={{
              fontSize: "10pt",
              textTransform: "uppercase",
              letterSpacing: "0.5pt",
              color: "#333333",
            }}
          >
            {planData.frameworkName} • Lesson Plan
          </div>
          <h1
            style={{
              fontSize: "18pt",
              fontWeight: "bold",
              marginTop: "4pt",
              marginBottom: "0",
            }}
          >
            {planData.topic}
          </h1>
        </header>

        {/* Lesson Metadata Table */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "12pt",
            fontSize: "11pt",
          }}
        >
          <tbody>
            <tr>
              <td style={{ width: "50%", padding: "2.5pt 0", verticalAlign: "top" }}>
                <strong>Subject:</strong> {planData.subject}
              </td>
              <td style={{ width: "50%", padding: "2.5pt 0", verticalAlign: "top" }}>
                <strong>Grade / Year Level:</strong> {planData.gradeLevel}
              </td>
            </tr>
            <tr>
              <td style={{ width: "50%", padding: "2.5pt 0", verticalAlign: "top" }}>
                <strong>Date:</strong> {planData.date}
              </td>
              <td style={{ width: "50%", padding: "2.5pt 0", verticalAlign: "top" }}>
                <strong>Prepared by:</strong> {planData.preparedBy}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Curriculum Alignment & Objectives */}
        <section style={{ marginBottom: "14pt" }}>
          <h2
            style={{
              fontSize: "13pt",
              fontWeight: "bold",
              borderBottom: "1pt solid #cccccc",
              paddingBottom: "3pt",
              marginTop: "8pt",
            }}
          >
            Curriculum Alignment &amp; Objectives
          </h2>
          <div style={{ marginTop: "6pt", fontSize: "11pt" }}>
            <p style={{ margin: "4pt 0" }}>
              <strong>Learning Competency:</strong> {planData.learningCompetency}
            </p>
            <p style={{ margin: "4pt 0", whiteSpace: "pre-wrap" }}>
              <strong>Learning Objectives:</strong>
              <br />
              {planData.learningObjectives}
            </p>
            <p style={{ margin: "4pt 0" }}>
              <strong>Instructional Materials:</strong> {planData.materials}
            </p>
          </div>
        </section>

        {/* Instructional Procedure Stages */}
        <section style={{ marginBottom: "14pt" }}>
          <h2
            style={{
              fontSize: "13pt",
              fontWeight: "bold",
              borderBottom: "1pt solid #cccccc",
              paddingBottom: "3pt",
              marginTop: "12pt",
            }}
          >
            Instructional Procedure ({planData.frameworkName})
          </h2>

          {planData.sections.map((sec, idx) => (
            <div
              key={sec.stageId}
              style={{
                marginTop: "10pt",
                pageBreakInside: "avoid",
                breakInside: "avoid-page",
              }}
            >
              <h3
                style={{
                  fontSize: "11.5pt",
                  fontWeight: "bold",
                  margin: "6pt 0 2pt 0",
                }}
              >
                Stage {idx + 1}: {sec.stageName}
              </h3>
              <div
                style={{
                  fontSize: "9.5pt",
                  fontStyle: "italic",
                  color: "#555555",
                  marginBottom: "3pt",
                }}
              >
                Purpose: {sec.purpose}
              </div>
              <div
                style={{
                  whiteSpace: "pre-wrap",
                  fontSize: "11pt",
                  lineHeight: "1.5",
                }}
              >
                {sec.content}
              </div>
            </div>
          ))}
        </section>

        <footer
          style={{
            borderTop: "1pt solid #cccccc",
            paddingTop: "8pt",
            marginTop: "16pt",
            fontSize: "9pt",
            color: "#666666",
            textAlign: "center",
          }}
        >
          Prepared with CdM LMS • Templates for practice. Follow your instructor&apos;s required format and the latest DepEd guidelines.
        </footer>
      </article>
    </div>,
    document.body
  );
}

