/**
 * Client-side test runner for HTML and CSS tracks.
 * Injects the student's code into a temporary sandboxed iframe and evaluates
 * test case selectors or computed property checks against the rendered DOM.
 *
 * Security: the iframe uses sandbox="allow-scripts" to prevent navigation/network calls.
 */

export interface HTMLTestResult {
  label: string;
  passed: boolean;
  error?: string;
}

/**
 * Evaluates HTML test cases against student HTML code.
 * @param studentHtml - The student's HTML code
 * @param testCases - Array of { label, expectedOutputTemplate (CSS selector), isHidden }
 */
export async function runHtmlTests(
  studentHtml: string,
  testCases: Array<{ label: string; expectedOutputTemplate: string; isHidden: boolean }>
): Promise<HTMLTestResult[]> {
  if (typeof document === "undefined") {
    return testCases.map((tc) => ({ label: tc.label, passed: false, error: "DOM not available" }));
  }

  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.left = "-9999px";
  iframe.style.top = "-9999px";
  iframe.style.width = "800px";
  iframe.style.height = "600px";
  iframe.sandbox.add("allow-scripts");
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve) => {
      iframe.onload = () => resolve();
      iframe.srcdoc = studentHtml;
      // Fallback timeout in case onload does not trigger
      setTimeout(resolve, 300);
    });

    const results: HTMLTestResult[] = testCases.map((tc) => {
      try {
        const selector = tc.expectedOutputTemplate.trim();
        if (!selector) {
          return { label: tc.label, passed: true };
        }
        const doc = iframe.contentDocument;
        if (!doc) {
          return { label: tc.label, passed: false, error: "Failed to access iframe DOM" };
        }
        const found = doc.querySelector(selector) !== null;
        return {
          label: tc.label,
          passed: found,
          error: found ? undefined : `Element matching "${selector}" was not found in rendered DOM.`,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Invalid selector";
        return { label: tc.label, passed: false, error: msg };
      }
    });

    return results;
  } finally {
    if (iframe.parentNode) {
      document.body.removeChild(iframe);
    }
  }
}

/**
 * Evaluates CSS test cases against an HTML template with student CSS injected.
 * @param studentCss - The student's CSS code
 * @param htmlTemplate - The base HTML document
 * @param testCases - Array of { label, expectedOutputTemplate ("selector:property:expectedValue"), isHidden }
 */
export async function runCssTests(
  studentCss: string,
  htmlTemplate: string,
  testCases: Array<{ label: string; expectedOutputTemplate: string; isHidden: boolean }>
): Promise<HTMLTestResult[]> {
  if (typeof document === "undefined") {
    return testCases.map((tc) => ({ label: tc.label, passed: false, error: "DOM not available" }));
  }

  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.left = "-9999px";
  iframe.style.top = "-9999px";
  iframe.style.width = "800px";
  iframe.style.height = "600px";
  iframe.sandbox.add("allow-scripts");
  document.body.appendChild(iframe);

  const baseHtml = htmlTemplate || `<!DOCTYPE html><html><head></head><body></body></html>`;
  const srcdoc = baseHtml.includes("</head>")
    ? baseHtml.replace("</head>", `<style>${studentCss}</style></head>`)
    : `<html><head><style>${studentCss}</style></head><body>${baseHtml}</body></html>`;

  try {
    await new Promise<void>((resolve) => {
      iframe.onload = () => resolve();
      iframe.srcdoc = srcdoc;
      setTimeout(resolve, 300);
    });

    const results: HTMLTestResult[] = testCases.map((tc) => {
      try {
        const raw = tc.expectedOutputTemplate.trim();
        const parts = raw.split(":");
        if (parts.length < 3) {
          return { label: tc.label, passed: false, error: "Invalid test case format" };
        }

        const selector = parts[0];
        const property = parts[1];
        const expectedValue = parts.slice(2).join(":").trim().toLowerCase();

        const doc = iframe.contentDocument;
        const win = iframe.contentWindow;
        if (!doc || !win) {
          return { label: tc.label, passed: false, error: "Unable to inspect preview document" };
        }

        const el = doc.querySelector(selector);
        if (!el) {
          return { label: tc.label, passed: false, error: `Element "${selector}" not found in template` };
        }

        const computed = win.getComputedStyle(el).getPropertyValue(property).trim().toLowerCase();
        
        // Normalize comparison (e.g. quotes or color representation)
        const normalize = (val: string) => val.replace(/['"]/g, "").trim();
        const passed = normalize(computed) === normalize(expectedValue) || computed.includes(expectedValue);

        return {
          label: tc.label,
          passed,
          error: passed
            ? undefined
            : `Expected ${property} to be "${expectedValue}", but got "${computed}"`,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Evaluation error";
        return { label: tc.label, passed: false, error: msg };
      }
    });

    return results;
  } finally {
    if (iframe.parentNode) {
      document.body.removeChild(iframe);
    }
  }
}
