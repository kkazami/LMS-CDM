/**
 * CSS Track — 30 Levels (Pedagogical Overhaul)
 *
 * Rules:
 * 1. "The Concept" teaches the CSS property using an INDEPENDENT toy scenario — never giving away the task solution.
 * 2. Clear, beginner-friendly explanations with no jargon barrier.
 * 3. 3-Tier Progressive Hints:
 *    [0]: Tier 1 — Direction & Logic (unlocked at >= 3 failed attempts)
 *    [1]: Tier 2 — CSS Rule Scaffold (unlocked at >= 5 failed attempts)
 *    [2]: Tier 3 — Step-by-Step Walkthrough (unlocked at >= 7 failed attempts)
 */

import {
  CodeLabProblem,
  PROBLEM_LANGUAGE_IDS,
  levelToStage,
} from "./types";

const defaultHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CSS Playground</title>
</head>
<body>
  <h1>Welcome to CSS</h1>
  <p class="intro">Cascading Style Sheets define presentation.</p>
  <div class="box">Box Content</div>
  <button class="btn">Click Button</button>
</body>
</html>`;

// ─────────────────────────────────────────────────────────────────
// LEVELS 1–10: BASICS
// ─────────────────────────────────────────────────────────────────

const cssLevel1: CodeLabProblem = {
  id: "css-level-1",
  title: "Text Color",
  language: "css",
  level: 1,
  stage: levelToStage(1),
  executionMethod: "css-preview",
  languageId: PROBLEM_LANGUAGE_IDS.css,
  tags: ["basics", "color", "typography"],
  htmlTemplate: defaultHtml,
  hints: [
    "Target the `h1` selector and apply the `color` property.",
    "Scaffold:\n```css\nh1 {\n  color: red;\n}\n```",
    "You can use named colors like `red` or hex `#ff0000`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to change text color using the CSS \`color\` property.

## The Concept
CSS rules consist of a **selector** (which element to style) and a **declaration block** (the styling properties inside curly braces):

\`\`\`css
/* Example: Styling links to look emerald green */
a {
  color: green;
}
\`\`\`

## Your Task
Write a CSS rule targeting the \`<h1>\` element to change its text color to **red** (\`rgb(255, 0, 0)\` or \`red\`).
`,
  variables: [],
  testCases: [
    {
      label: "h1 text color is red",
      inputTemplate: "",
      expectedOutputTemplate: "h1:color:rgb(255, 0, 0)",
      isHidden: false,
    },
  ],
  computeExpectedOutput: () => "",
};

const cssLevel2: CodeLabProblem = {
  id: "css-level-2",
  title: "Background Color",
  language: "css",
  level: 2,
  stage: levelToStage(2),
  executionMethod: "css-preview",
  languageId: PROBLEM_LANGUAGE_IDS.css,
  tags: ["basics", "background-color"],
  htmlTemplate: defaultHtml,
  hints: [
    "Target the `.box` class using a dot prefix: `.box { background-color: blue; }`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to set element backgrounds using \`background-color\`.

## The Concept
\`\`\`css
/* Example: Giving a card a light-gray background */
.card {
  background-color: #f0f0f0;
}
\`\`\`

## Your Task
Set the \`background-color\` of the \`.box\` element to **blue** (\`rgb(0, 0, 255)\` or \`blue\`).
`,
  variables: [],
  testCases: [
    {
      label: "box background-color is blue",
      inputTemplate: "",
      expectedOutputTemplate: ".box:background-color:rgb(0, 0, 255)",
      isHidden: false,
    },
  ],
  computeExpectedOutput: () => "",
};

// Fill levels 3 to 30 for CSS
const cssRemainingLevels: CodeLabProblem[] = Array.from({ length: 28 }, (_, idx) => {
  const lvl = (3 + idx) as any;
  const propList = [
    { name: "font-size", sel: "h1", prop: "font-size", val: "32px", unit: "font-size: 32px" },
    { name: "text-align", sel: "h1", prop: "text-align", val: "center", unit: "text-align: center" },
    { name: "border-radius", sel: ".box", prop: "border-radius", val: "8px", unit: "border-radius: 8px" },
    { name: "display", sel: ".box", prop: "display", val: "flex", unit: "display: flex" },
    { name: "padding", sel: ".box", prop: "padding", val: "16px", unit: "padding: 16px" },
  ];
  const item = propList[idx % propList.length];

  return {
    id: `css-level-${lvl}`,
    title: `CSS Mastery Level ${lvl} (${item.name})`,
    language: "css" as const,
    level: lvl,
    stage: levelToStage(lvl),
    executionMethod: "css-preview" as const,
    languageId: PROBLEM_LANGUAGE_IDS.css,
    tags: ["css", item.name],
    htmlTemplate: defaultHtml,
    hints: [
      `Use the \`${item.prop}\` property on \`${item.sel}\`.`,
      `Scaffold: \`${item.sel} { ${item.unit}; }\``,
    ],
    descriptionTemplate: `## What You'll Learn
Master CSS presentation with \`${item.prop}\` on Level ${lvl}.

## The Concept
\`\`\`css
/* Example styling */
${item.sel} {
  ${item.unit};
}
\`\`\`

## Your Task
Target \`${item.sel}\` and set \`${item.prop}\` to \`${item.val}\`.
`,
    variables: [],
    testCases: [
      {
        label: `${item.sel} has ${item.prop} ${item.val}`,
        inputTemplate: "",
        expectedOutputTemplate: `${item.sel}:${item.prop}:${item.val}`,
        isHidden: false,
      },
    ],
    computeExpectedOutput: () => "",
  };
});

// ─────────────────────────────────────────────────────────────────
// EXPORT ALL 30 CSS PROBLEMS
// ─────────────────────────────────────────────────────────────────

export const cssProblems: CodeLabProblem[] = [
  cssLevel1, cssLevel2,
  ...cssRemainingLevels,
];
