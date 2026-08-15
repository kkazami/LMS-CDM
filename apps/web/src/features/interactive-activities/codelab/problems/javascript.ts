/**
 * JavaScript Problems — Levels 9, 19, 29
 *
 * Easy:         L9 (Filter array above threshold)
 * Intermediate: L19 (Flatten nested array)
 * Hard:         L29 (Implement Promise.all)
 */

import {
  CodeLabProblem,
  ProblemTestCase,
  PROBLEM_LANGUAGE_IDS,
} from "./types";
import { substituteTemplate } from "../utils/problem-engine";

function sub(
  template: string,
  vars: Record<string, string | number>
): string {
  return substituteTemplate(template, vars);
}

// ═══════════════════════════════════════════════════════════════════
// Level 9 — Filter Array Above Threshold
// ═══════════════════════════════════════════════════════════════════

const jsLevel9: CodeLabProblem = {
  id: "js-filter-array",
  title: "Filter Array Above Threshold",
  language: "javascript",
  level: 9,
  tier: "easy",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["arrays", "filtering", "basics"],
  descriptionTemplate: `## Filter Array Above Threshold

Write a function that takes an array of numbers and a threshold, then returns only the numbers **greater than** the threshold.

### Input
- Line 1: space-separated integers (the array)
- Line 2: the threshold integer

For this problem the array is \`[{{a}}, {{b}}, {{c}}, {{d}}]\` and the threshold is \`{{threshold}}\`.

### Output
Print the filtered numbers separated by spaces on a single line. If no numbers qualify, print \`NONE\`.

### Example
\`\`\`
Input:
10 25 3 47 8 15
20

Output:
25 47
\`\`\`

### Constraints
- \`1 ≤ array length ≤ 100\`
- \`-1000 ≤ values ≤ 1000\`
`,
  variables: [
    { name: "a", type: "number", min: 1, max: 50 },
    { name: "b", type: "number", min: 10, max: 80 },
    { name: "c", type: "number", min: 5, max: 60 },
    { name: "d", type: "number", min: 20, max: 100 },
    { name: "threshold", type: "number", min: 15, max: 45 },
  ],
  testCases: [
    { inputTemplate: "{{a}} {{b}} {{c}} {{d}}\n{{threshold}}", expectedOutputTemplate: "", isHidden: false },
    { inputTemplate: "10 25 3 47 8 15\n20", expectedOutputTemplate: "25 47", isHidden: false },
    { inputTemplate: "1 2 3 4 5\n10", expectedOutputTemplate: "NONE", isHidden: false },
    { inputTemplate: "100 200 300\n0", expectedOutputTemplate: "100 200 300", isHidden: true },
    { inputTemplate: "5 5 5 5\n5", expectedOutputTemplate: "NONE", isHidden: true },
  ],
  hintTemplate:
    "Use Array.filter(num => num > threshold). Read input from stdin, split by spaces, and convert to numbers with map(Number). If the result is empty, print 'NONE'.",
  computeExpectedOutput: (vars, tc) => {
    const input = sub(tc.inputTemplate, vars).trim();
    const lines = input.split("\n");
    if (tc.expectedOutputTemplate && !tc.expectedOutputTemplate.includes("{{") && tc.expectedOutputTemplate !== "") {
      return tc.expectedOutputTemplate;
    }
    const arr = lines[0].split(" ").map(Number);
    const threshold = parseInt(lines[1], 10);
    const filtered = arr.filter(n => n > threshold);
    return filtered.length > 0 ? filtered.join(" ") : "NONE";
  },
};

// ═══════════════════════════════════════════════════════════════════
// Level 19 — Flatten Nested Array
// ═══════════════════════════════════════════════════════════════════

const jsLevel19: CodeLabProblem = {
  id: "js-flatten-array",
  title: "Flatten Nested Array",
  language: "javascript",
  level: 19,
  tier: "intermediate",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["arrays", "recursion", "algorithms"],
  descriptionTemplate: `## Flatten Nested Array

Write a function \`flatten(arr, depth)\` that flattens a nested array up to the given depth.

### Input
- Line 1: a JSON-encoded nested array
- Line 2: an integer \`depth\` — the maximum depth to flatten

For this problem: depth = **{{depth}}**

### Output
Print the flattened array as a JSON array (e.g. \`[1,2,3,4]\`).

### Example
\`\`\`
Input:
[1,[2,[3,[4]],5]]
2

Output:
[1,2,3,[4],5]
\`\`\`

### Constraints
- \`1 ≤ depth ≤ 10\`
- Array nesting depth ≤ 10
- Array elements are integers or sub-arrays
`,
  variables: [
    { name: "depth", type: "number", min: 1, max: 3 },
  ],
  testCases: [
    {
      inputTemplate: "[1,[2,[3,[4]],5]]\n2",
      expectedOutputTemplate: "[1,2,3,[4],5]",
      isHidden: false,
    },
    {
      inputTemplate: "[1,[2,[3,[4]]]]\n1",
      expectedOutputTemplate: "[1,2,[3,[4]]]",
      isHidden: false,
    },
    {
      inputTemplate: "[[1,2],[3,4],[5,6]]\n1",
      expectedOutputTemplate: "[1,2,3,4,5,6]",
      isHidden: false,
    },
    {
      inputTemplate: "[1,[2,[3,[4,[5]]]]]\n10",
      expectedOutputTemplate: "[1,2,3,4,5]",
      isHidden: true,
    },
    {
      inputTemplate: "[1,2,3]\n1",
      expectedOutputTemplate: "[1,2,3]",
      isHidden: true,
    },
  ],
  hintTemplate:
    "Recursively iterate: if an element is an array and depth > 0, recurse with depth-1. Otherwise keep the element. You can also use Array.flat(depth) in modern JS, but implementing it manually is the exercise.",
  computeExpectedOutput: (vars, tc) => {
    const input = sub(tc.inputTemplate, vars).trim();
    if (tc.expectedOutputTemplate && !tc.expectedOutputTemplate.includes("{{") && tc.expectedOutputTemplate !== "") {
      return tc.expectedOutputTemplate;
    }
    const lines = input.split("\n");
    const arr = JSON.parse(lines[0]) as unknown[];
    const depth = parseInt(lines[1], 10);

    function flattenArr(a: unknown[], d: number): unknown[] {
      const result: unknown[] = [];
      for (const item of a) {
        if (Array.isArray(item) && d > 0) {
          result.push(...flattenArr(item, d - 1));
        } else {
          result.push(item);
        }
      }
      return result;
    }

    return JSON.stringify(flattenArr(arr, depth));
  },
};

// ═══════════════════════════════════════════════════════════════════
// Level 29 — Implement Promise.all
// ═══════════════════════════════════════════════════════════════════

const jsLevel29: CodeLabProblem = {
  id: "js-promise-all",
  title: "Implement Promise.all",
  language: "javascript",
  level: 29,
  tier: "hard",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["async", "promises", "advanced"],
  descriptionTemplate: `## Implement Promise.all

Implement a function \`promiseAll(promises)\` that behaves like \`Promise.all\`:
- Takes an array of promises
- Returns a promise that resolves with an array of all resolved values (in order)
- If any promise rejects, the returned promise rejects with that reason

For testing purposes (since Judge0 runs synchronous code), you will simulate this with **synchronous operations**.

### Input
- Line 1: integer \`n\` — number of operations
- Next \`n\` lines: either \`resolve X\` or \`reject X\`

### Output
If all operations resolve: print all values as a JSON array (e.g. \`[1,2,3]\`).
If any rejects: print \`REJECTED: X\` where X is the first rejection value.

### Example
\`\`\`
Input:
3
resolve 10
resolve 20
resolve 30

Output:
[10,20,30]
\`\`\`

### Example 2
\`\`\`
Input:
3
resolve 10
reject ERROR
resolve 30

Output:
REJECTED: ERROR
\`\`\`

### Constraints
- \`1 ≤ n ≤ 20\`
- Values are strings or integers
`,
  variables: [
    { name: "n", type: "number", min: 3, max: 6 },
  ],
  testCases: [
    {
      inputTemplate: "3\nresolve 10\nresolve 20\nresolve 30",
      expectedOutputTemplate: "[10,20,30]",
      isHidden: false,
    },
    {
      inputTemplate: "3\nresolve 10\nreject ERROR\nresolve 30",
      expectedOutputTemplate: "REJECTED: ERROR",
      isHidden: false,
    },
    {
      inputTemplate: "1\nresolve 42",
      expectedOutputTemplate: "[42]",
      isHidden: false,
    },
    {
      inputTemplate: "4\nresolve 1\nresolve 2\nresolve 3\nresolve 4",
      expectedOutputTemplate: "[1,2,3,4]",
      isHidden: true,
    },
    {
      inputTemplate: "2\nreject FAIL\nresolve 10",
      expectedOutputTemplate: "REJECTED: FAIL",
      isHidden: true,
    },
  ],
  hintTemplate:
    "Process each operation sequentially. Track all resolved values in an array. If any operation is a 'reject', immediately output REJECTED: value and stop. Otherwise, output the array as JSON.",
  computeExpectedOutput: (vars, tc) => {
    const input = sub(tc.inputTemplate, vars).trim();
    if (tc.expectedOutputTemplate && !tc.expectedOutputTemplate.includes("{{") && tc.expectedOutputTemplate !== "") {
      return tc.expectedOutputTemplate;
    }
    const lines = input.split("\n");
    const n = parseInt(lines[0], 10);
    const results: (number | string)[] = [];

    for (let i = 1; i <= n; i++) {
      const parts = lines[i].split(" ");
      const action = parts[0];
      const value = parts.slice(1).join(" ");
      if (action === "reject") {
        return `REJECTED: ${value}`;
      }
      // Try to parse as number
      const num = Number(value);
      results.push(isNaN(num) ? value : num);
    }
    return JSON.stringify(results);
  },
};

export const javascriptProblems: CodeLabProblem[] = [
  jsLevel9,
  jsLevel19,
  jsLevel29,
];
