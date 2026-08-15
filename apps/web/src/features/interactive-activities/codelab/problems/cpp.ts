/**
 * C++ Problems — Levels 3, 4, 13, 14, 23, 24
 *
 * Easy:         L3 (Even or Odd), L4 (Maximum of Three)
 * Intermediate: L13 (Bubble Sort), L14 (GCD and LCM)
 * Hard:         L23 (Red-Black Tree Insertion), L24 (KMP String Search)
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
// Level 3 — Even or Odd
// ═══════════════════════════════════════════════════════════════════

const cppLevel3: CodeLabProblem = {
  id: "cpp-even-odd",
  title: "Even or Odd",
  language: "cpp",
  level: 3,
  tier: "easy",
  languageId: PROBLEM_LANGUAGE_IDS.cpp,
  tags: ["conditionals", "basics", "math"],
  descriptionTemplate: `## Even or Odd

Write a function \`checkEvenOdd(int n)\` that returns the string \`"Even"\` if \`n\` is even, or \`"Odd"\` if \`n\` is odd.

### Input
A single integer \`n\`.
- For this problem: \`n = {{n}}\`

### Output
Print \`Even\` or \`Odd\`.

### Example
\`\`\`
Input:
4

Output:
Even
\`\`\`

### Constraints
- \`-10000 ≤ n ≤ 10000\`
`,
  variables: [
    { name: "n", type: "number", min: 1, max: 999 },
  ],
  testCases: [
    { inputTemplate: "{{n}}", expectedOutputTemplate: "", isHidden: false },
    { inputTemplate: "4", expectedOutputTemplate: "Even", isHidden: false },
    { inputTemplate: "7", expectedOutputTemplate: "Odd", isHidden: false },
    { inputTemplate: "0", expectedOutputTemplate: "Even", isHidden: true },
    { inputTemplate: "-3", expectedOutputTemplate: "Odd", isHidden: true },
    { inputTemplate: "1000", expectedOutputTemplate: "Even", isHidden: true },
  ],
  hintTemplate:
    "Use the modulo operator (%). If n % 2 == 0, the number is even. Remember to handle negative numbers correctly.",
  computeExpectedOutput: (vars, tc) => {
    const input = sub(tc.inputTemplate, vars).trim();
    const n = parseInt(input, 10);
    if (tc.expectedOutputTemplate && !tc.expectedOutputTemplate.includes("{{") && tc.expectedOutputTemplate !== "") {
      return tc.expectedOutputTemplate;
    }
    return n % 2 === 0 ? "Even" : "Odd";
  },
};

// ═══════════════════════════════════════════════════════════════════
// Level 4 — Maximum of Three Numbers
// ═══════════════════════════════════════════════════════════════════

const cppLevel4: CodeLabProblem = {
  id: "cpp-max-three",
  title: "Maximum of Three Numbers",
  language: "cpp",
  level: 4,
  tier: "easy",
  languageId: PROBLEM_LANGUAGE_IDS.cpp,
  tags: ["conditionals", "basics", "math"],
  descriptionTemplate: `## Maximum of Three Numbers

Write a function \`maxOfThree(int x, int y, int z)\` that returns the largest of the three integers.

### Input
Three integers \`x\`, \`y\`, \`z\` on separate lines.
- For this problem: \`x = {{x}}\`, \`y = {{y}}\`, \`z = {{z}}\`

### Output
Print the maximum value.

### Example
\`\`\`
Input:
3
7
5

Output:
7
\`\`\`

### Constraints
- \`-10000 ≤ x, y, z ≤ 10000\`
`,
  variables: [
    { name: "x", type: "number", min: 1, max: 500 },
    { name: "y", type: "number", min: 1, max: 500 },
    { name: "z", type: "number", min: 1, max: 500 },
  ],
  testCases: [
    { inputTemplate: "{{x}}\n{{y}}\n{{z}}", expectedOutputTemplate: "", isHidden: false },
    { inputTemplate: "3\n7\n5", expectedOutputTemplate: "7", isHidden: false },
    { inputTemplate: "10\n10\n10", expectedOutputTemplate: "10", isHidden: false },
    { inputTemplate: "1\n2\n3", expectedOutputTemplate: "3", isHidden: true },
    { inputTemplate: "-5\n-3\n-1", expectedOutputTemplate: "-1", isHidden: true },
  ],
  hintTemplate:
    "You can use if-else chains to compare three values, or use the std::max function: max(x, max(y, z)).",
  computeExpectedOutput: (vars, tc) => {
    const input = sub(tc.inputTemplate, vars).trim();
    const lines = input.split("\n").map(Number);
    if (tc.expectedOutputTemplate && !tc.expectedOutputTemplate.includes("{{") && tc.expectedOutputTemplate !== "") {
      return tc.expectedOutputTemplate;
    }
    return String(Math.max(...lines));
  },
};

// ═══════════════════════════════════════════════════════════════════
// Level 13 — Bubble Sort
// ═══════════════════════════════════════════════════════════════════

const cppLevel13: CodeLabProblem = {
  id: "cpp-bubble-sort",
  title: "Bubble Sort",
  language: "cpp",
  level: 13,
  tier: "intermediate",
  languageId: PROBLEM_LANGUAGE_IDS.cpp,
  tags: ["sorting", "algorithms", "arrays"],
  descriptionTemplate: `## Bubble Sort

Implement bubble sort to sort an array of integers in ascending order.

### Input
- Line 1: an integer \`n\` — the size of the array
- Line 2: \`n\` space-separated integers

For this problem: array size is **{{size}}**.

### Output
Print the sorted array as space-separated integers on a single line.

### Example
\`\`\`
Input:
5
64 34 25 12 22

Output:
12 22 25 34 64
\`\`\`

### Constraints
- \`1 ≤ n ≤ 1000\`
- \`-10000 ≤ arr[i] ≤ 10000\`
`,
  variables: [
    { name: "size", type: "number", min: 5, max: 10 },
  ],
  testCases: [
    { inputTemplate: "5\n64 34 25 12 22", expectedOutputTemplate: "12 22 25 34 64", isHidden: false },
    { inputTemplate: "3\n3 1 2", expectedOutputTemplate: "1 2 3", isHidden: false },
    { inputTemplate: "6\n5 4 3 2 1 0", expectedOutputTemplate: "0 1 2 3 4 5", isHidden: false },
    { inputTemplate: "1\n42", expectedOutputTemplate: "42", isHidden: true },
    { inputTemplate: "4\n-3 -1 -4 -2", expectedOutputTemplate: "-4 -3 -2 -1", isHidden: true },
  ],
  hintTemplate:
    "Bubble sort repeatedly steps through the list, compares adjacent elements, and swaps them if they are in the wrong order. Repeat until no swaps are needed.",
  computeExpectedOutput: (vars, tc) => {
    const input = sub(tc.inputTemplate, vars).trim();
    if (tc.expectedOutputTemplate && !tc.expectedOutputTemplate.includes("{{") && tc.expectedOutputTemplate !== "") {
      return tc.expectedOutputTemplate;
    }
    const lines = input.split("\n");
    const arr = lines[1].split(" ").map(Number);
    arr.sort((a, b) => a - b);
    return arr.join(" ");
  },
};

// ═══════════════════════════════════════════════════════════════════
// Level 14 — GCD and LCM
// ═══════════════════════════════════════════════════════════════════

const cppLevel14: CodeLabProblem = {
  id: "cpp-gcd-lcm",
  title: "GCD and LCM",
  language: "cpp",
  level: 14,
  tier: "intermediate",
  languageId: PROBLEM_LANGUAGE_IDS.cpp,
  tags: ["math", "algorithms", "number-theory"],
  descriptionTemplate: `## GCD and LCM

Write functions to compute the **Greatest Common Divisor (GCD)** and **Least Common Multiple (LCM)** of two positive integers.

### Input
Two positive integers \`a\` and \`b\` on separate lines.
- For this problem: \`a = {{a}}\`, \`b = {{b}}\`

### Output
Print two integers on a single line separated by a space: the GCD followed by the LCM.

### Example
\`\`\`
Input:
12
8

Output:
4 24
\`\`\`

### Constraints
- \`1 ≤ a, b ≤ 10000\`
`,
  variables: [
    { name: "a", type: "number", min: 10, max: 200 },
    { name: "b", type: "number", min: 10, max: 200 },
  ],
  testCases: [
    { inputTemplate: "{{a}}\n{{b}}", expectedOutputTemplate: "", isHidden: false },
    { inputTemplate: "12\n8", expectedOutputTemplate: "4 24", isHidden: false },
    { inputTemplate: "7\n13", expectedOutputTemplate: "1 91", isHidden: false },
    { inputTemplate: "100\n100", expectedOutputTemplate: "100 100", isHidden: true },
    { inputTemplate: "36\n24", expectedOutputTemplate: "12 72", isHidden: true },
  ],
  hintTemplate:
    "Use the Euclidean algorithm for GCD: gcd(a, b) = gcd(b, a % b) with base case gcd(a, 0) = a. Then LCM = (a * b) / GCD.",
  computeExpectedOutput: (vars, tc) => {
    const input = sub(tc.inputTemplate, vars).trim();
    const lines = input.split("\n");
    const a = parseInt(lines[0], 10);
    const b = parseInt(lines[1], 10);
    if (tc.expectedOutputTemplate && !tc.expectedOutputTemplate.includes("{{") && tc.expectedOutputTemplate !== "") {
      return tc.expectedOutputTemplate;
    }
    function gcd(x: number, y: number): number {
      while (y !== 0) {
        const t = y;
        y = x % y;
        x = t;
      }
      return x;
    }
    const g = gcd(a, b);
    const l = (a * b) / g;
    return `${g} ${l}`;
  },
};

// ═══════════════════════════════════════════════════════════════════
// Level 23 — Red-Black Tree Insertion (count nodes)
// ═══════════════════════════════════════════════════════════════════

const cppLevel23: CodeLabProblem = {
  id: "cpp-rbt-insertion",
  title: "Red-Black Tree Insertion",
  language: "cpp",
  level: 23,
  tier: "hard",
  languageId: PROBLEM_LANGUAGE_IDS.cpp,
  tags: ["trees", "data-structures", "algorithms"],
  descriptionTemplate: `## Red-Black Tree Insertion

Given a sequence of integers, insert them into a Red-Black Tree in order. After all insertions, perform an **in-order traversal** and print the elements.

A Red-Black Tree is a self-balancing BST where:
1. Each node is red or black
2. Root is always black
3. No two adjacent red nodes
4. Every path from root to NULL has the same number of black nodes

### Input
- Line 1: integer \`n\` — number of elements
- Line 2: \`n\` space-separated integers to insert

### Output
Print the in-order traversal of the resulting tree as space-separated integers.

### Example
\`\`\`
Input:
5
3 1 5 2 4

Output:
1 2 3 4 5
\`\`\`

### Constraints
- \`1 ≤ n ≤ 100\`
- All elements are distinct
`,
  variables: [
    { name: "n", type: "number", min: 5, max: 10 },
  ],
  testCases: [
    { inputTemplate: "5\n3 1 5 2 4", expectedOutputTemplate: "1 2 3 4 5", isHidden: false },
    { inputTemplate: "7\n7 3 18 10 22 8 11", expectedOutputTemplate: "3 7 8 10 11 18 22", isHidden: false },
    { inputTemplate: "3\n3 2 1", expectedOutputTemplate: "1 2 3", isHidden: true },
    { inputTemplate: "6\n10 20 30 15 25 5", expectedOutputTemplate: "5 10 15 20 25 30", isHidden: true },
  ],
  hintTemplate:
    "The in-order traversal of any BST (including RBT) is always sorted. Focus on implementing the insertion with proper rotations and recoloring to maintain RBT properties.",
  computeExpectedOutput: (vars, tc) => {
    const input = sub(tc.inputTemplate, vars).trim();
    if (tc.expectedOutputTemplate && !tc.expectedOutputTemplate.includes("{{") && tc.expectedOutputTemplate !== "") {
      return tc.expectedOutputTemplate;
    }
    const lines = input.split("\n");
    const arr = lines[1].split(" ").map(Number);
    // In-order traversal of any BST is sorted
    arr.sort((a, b) => a - b);
    return arr.join(" ");
  },
};

// ═══════════════════════════════════════════════════════════════════
// Level 24 — KMP String Search
// ═══════════════════════════════════════════════════════════════════

const cppLevel24: CodeLabProblem = {
  id: "cpp-kmp-search",
  title: "KMP String Search",
  language: "cpp",
  level: 24,
  tier: "hard",
  languageId: PROBLEM_LANGUAGE_IDS.cpp,
  tags: ["strings", "algorithms", "pattern-matching"],
  descriptionTemplate: `## KMP String Search

Implement the **Knuth-Morris-Pratt (KMP)** algorithm to find all occurrences of a pattern in a text string.

### Input
- Line 1: the text string
- Line 2: the pattern to search for

### Output
Print the **0-based starting indices** of all occurrences, space-separated. If the pattern is not found, print \`-1\`.

### Example
\`\`\`
Input:
AABAACAADAABAABA
AABA

Output:
0 9 12
\`\`\`

### Constraints
- \`1 ≤ len(text) ≤ 10000\`
- \`1 ≤ len(pattern) ≤ 1000\`
- \`len(pattern) ≤ len(text)\`
`,
  variables: [
    {
      name: "pattern",
      type: "string",
      options: ["ABA", "ABC", "AAA", "ABAB", "XYZ"],
    },
  ],
  testCases: [
    { inputTemplate: "AABAACAADAABAABA\nAABA", expectedOutputTemplate: "0 9 12", isHidden: false },
    { inputTemplate: "ABABABAB\nABAB", expectedOutputTemplate: "0 2 4", isHidden: false },
    { inputTemplate: "HELLO WORLD\nXYZ", expectedOutputTemplate: "-1", isHidden: true },
    { inputTemplate: "AAAAAA\nAA", expectedOutputTemplate: "0 1 2 3 4", isHidden: true },
  ],
  hintTemplate:
    "Build the failure function (partial match table) for the pattern first. Then use it to avoid unnecessary comparisons when a mismatch occurs during the search.",
  computeExpectedOutput: (vars, tc) => {
    const input = sub(tc.inputTemplate, vars).trim();
    if (tc.expectedOutputTemplate && !tc.expectedOutputTemplate.includes("{{") && tc.expectedOutputTemplate !== "") {
      return tc.expectedOutputTemplate;
    }
    const lines = input.split("\n");
    const text = lines[0];
    const pattern = lines[1];

    // KMP search
    const lps = new Array(pattern.length).fill(0);
    let len = 0;
    let i = 1;
    while (i < pattern.length) {
      if (pattern[i] === pattern[len]) {
        len++;
        lps[i] = len;
        i++;
      } else {
        if (len !== 0) {
          len = lps[len - 1];
        } else {
          lps[i] = 0;
          i++;
        }
      }
    }

    const indices: number[] = [];
    let ti = 0;
    let pi = 0;
    while (ti < text.length) {
      if (pattern[pi] === text[ti]) {
        ti++;
        pi++;
      }
      if (pi === pattern.length) {
        indices.push(ti - pi);
        pi = lps[pi - 1];
      } else if (ti < text.length && pattern[pi] !== text[ti]) {
        if (pi !== 0) {
          pi = lps[pi - 1];
        } else {
          ti++;
        }
      }
    }

    return indices.length > 0 ? indices.join(" ") : "-1";
  },
};

export const cppProblems: CodeLabProblem[] = [
  cppLevel3,
  cppLevel4,
  cppLevel13,
  cppLevel14,
  cppLevel23,
  cppLevel24,
];
