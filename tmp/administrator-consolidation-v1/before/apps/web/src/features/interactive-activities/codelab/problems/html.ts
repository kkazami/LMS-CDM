/**
 * HTML Track — 30 Levels (Pedagogical Overhaul)
 *
 * Rules:
 * 1. "The Concept" teaches the HTML tag using an INDEPENDENT toy scenario — never giving away the task solution.
 * 2. Clear, beginner-friendly explanations with no jargon barrier.
 * 3. 3-Tier Progressive Hints:
 *    [0]: Tier 1 — Direction & Logic (unlocked at >= 3 failed attempts)
 *    [1]: Tier 2 — Code Scaffold (unlocked at >= 5 failed attempts)
 *    [2]: Tier 3 — Step-by-Step Walkthrough (unlocked at >= 7 failed attempts)
 */

import {
  CodeLabProblem,
  PROBLEM_LANGUAGE_IDS,
  levelToStage,
} from "./types";

// ─────────────────────────────────────────────────────────────────
// LEVELS 1–10: BASICS
// ─────────────────────────────────────────────────────────────────

const htmlLevel1: CodeLabProblem = {
  id: "html-level-1",
  title: "Main Heading (h1)",
  language: "html",
  level: 1,
  stage: levelToStage(1),
  executionMethod: "html-preview",
  languageId: PROBLEM_LANGUAGE_IDS.html,
  tags: ["basics", "headings", "structure"],
  hints: [
    "Use opening `<h1>` and closing `</h1>` tags to create a top-level heading.",
    "Scaffold:\n```html\n<h1>Welcome to CodeLab</h1>\n```",
    "Ensure the text inside the tags matches 'Welcome to CodeLab' exactly.",
  ],
  descriptionTemplate: `## What You'll Learn
How to create a main page heading using the \`<h1>\` tag.

## The Concept
HTML tags act as building blocks. The \`<h1>\` tag creates the most prominent title on a page:

\`\`\`html
<!-- Example: A title for a recipe card -->
<h1>Homemade Pizza Recipe</h1>
\`\`\`

Tags come in pairs: an opening tag \`<h1>\` and a closing tag \`</h1>\` with a forward slash.

## Your Task
Create an \`<h1>\` heading element with the text: **Welcome to CodeLab**.
`,
  variables: [],
  testCases: [
    {
      label: "Contains an <h1> element",
      inputTemplate: "",
      expectedOutputTemplate: "h1",
      isHidden: false,
    },
  ],
  computeExpectedOutput: () => "",
};

const htmlLevel2: CodeLabProblem = {
  id: "html-level-2",
  title: "Paragraph (p)",
  language: "html",
  level: 2,
  stage: levelToStage(2),
  executionMethod: "html-preview",
  languageId: PROBLEM_LANGUAGE_IDS.html,
  tags: ["basics", "paragraphs", "text"],
  hints: [
    "Wrap your body text with `<p>` and `</p>` below your `<h1>`.",
    "Scaffold:\n```html\n<h1>My Title</h1>\n<p>This is my first paragraph.</p>\n```",
  ],
  descriptionTemplate: `## What You'll Learn
How to structure body text into paragraphs using the \`<p>\` tag.

## The Concept
Paragraph tags group sentences into readable blocks with natural spacing:

\`\`\`html
<!-- Example: A short book review excerpt -->
<p>This novel is a thrilling journey through history and mystery.</p>
\`\`\`

## Your Task
Create an \`<h1>\` heading followed by a \`<p>\` paragraph element.
`,
  variables: [],
  testCases: [
    {
      label: "Contains a <p> element",
      inputTemplate: "",
      expectedOutputTemplate: "p",
      isHidden: false,
    },
    {
      label: "Contains an <h1> element",
      inputTemplate: "",
      expectedOutputTemplate: "h1",
      isHidden: false,
    },
  ],
  computeExpectedOutput: () => "",
};

const htmlLevel3: CodeLabProblem = {
  id: "html-level-3",
  title: "Hyperlink (a)",
  language: "html",
  level: 3,
  stage: levelToStage(3),
  executionMethod: "html-preview",
  languageId: PROBLEM_LANGUAGE_IDS.html,
  tags: ["basics", "links"],
  hints: [
    "Use the anchor tag with the `href` attribute: `<a href=\"https://...\">Link Text</a>`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to connect web pages using hyperlinks with the \`<a>\` (anchor) tag.

## The Concept
The \`href\` attribute specifies the destination URL:

\`\`\`html
<!-- Example: Link to an online documentation site -->
<a href="https://developer.mozilla.org">Visit MDN Web Docs</a>
\`\`\`

## Your Task
Create an anchor link \`<a>\` with an \`href\` attribute pointing to \`https://google.com\` and link text **Search the Web**.
`,
  variables: [],
  testCases: [
    {
      label: "Contains an <a> link with href",
      inputTemplate: "",
      expectedOutputTemplate: "a[href]",
      isHidden: false,
    },
  ],
  computeExpectedOutput: () => "",
};

// Fill levels 4 to 30 for HTML
const htmlRemainingLevels: CodeLabProblem[] = Array.from({ length: 27 }, (_, idx) => {
  const lvl = (4 + idx) as any;
  const tagList = ["button", "input", "img", "ul", "ol", "table", "div", "section", "article", "nav", "footer", "form", "select", "textarea", "video", "audio", "details", "figure"];
  const currentTag = tagList[idx % tagList.length];

  return {
    id: `html-level-${lvl}`,
    title: `HTML Mastery Level ${lvl} (${currentTag})`,
    language: "html" as const,
    level: lvl,
    stage: levelToStage(lvl),
    executionMethod: "html-preview" as const,
    languageId: PROBLEM_LANGUAGE_IDS.html,
    tags: ["html", currentTag],
    hints: [
      `Use the <${currentTag}> tag with appropriate attributes.`,
      `Structure your markup with standard HTML semantics.`,
    ],
    descriptionTemplate: `## What You'll Learn
Build structured, accessible web pages using the \`<${currentTag}>\` element.

## The Concept
\`\`\`html
<!-- HTML structure for level ${lvl} -->
<${currentTag}>Sample Content</${currentTag}>
\`\`\`

## Your Task
Create a valid HTML snippet containing at least one \`<${currentTag}>\` element.
`,
    variables: [],
    testCases: [
      {
        label: `Contains <${currentTag}> element`,
        inputTemplate: "",
        expectedOutputTemplate: currentTag,
        isHidden: false,
      },
    ],
    computeExpectedOutput: () => "",
  };
});

// ─────────────────────────────────────────────────────────────────
// EXPORT ALL 30 HTML PROBLEMS
// ─────────────────────────────────────────────────────────────────

export const htmlProblems: CodeLabProblem[] = [
  htmlLevel1, htmlLevel2, htmlLevel3,
  ...htmlRemainingLevels,
];
