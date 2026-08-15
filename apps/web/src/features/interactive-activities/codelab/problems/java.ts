/**
 * Java Problems — Levels 7, 8, 17, 18, 27, 28
 *
 * Easy:         L7 (Fibonacci sequence), L8 (Palindrome check)
 * Intermediate: L17 (Recursive factorial), L18 (Merge sort)
 * Hard:         L27 (Thread-safe producer-consumer), L28 (0/1 Knapsack)
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
// Level 7 — Fibonacci Sequence
// ═══════════════════════════════════════════════════════════════════

const javaLevel7: CodeLabProblem = {
  id: "java-fibonacci",
  title: "Fibonacci Sequence",
  language: "java",
  level: 7,
  tier: "easy",
  languageId: PROBLEM_LANGUAGE_IDS.java,
  tags: ["loops", "math", "sequences"],
  descriptionTemplate: `## Fibonacci Sequence

Write a program that prints the first \`n\` terms of the Fibonacci sequence.

The Fibonacci sequence starts with \`0, 1\` and each subsequent term is the sum of the two preceding terms.

### Input
A single integer \`n\` — the number of terms to print.
- For this problem: \`n = {{limit}}\`

### Output
Print \`n\` Fibonacci numbers separated by spaces on a single line.

### Example
\`\`\`
Input:
7

Output:
0 1 1 2 3 5 8
\`\`\`

### Constraints
- \`1 ≤ n ≤ 30\`
`,
  variables: [
    { name: "limit", type: "number", min: 5, max: 15 },
  ],
  testCases: [
    { inputTemplate: "{{limit}}", expectedOutputTemplate: "", isHidden: false },
    { inputTemplate: "7", expectedOutputTemplate: "0 1 1 2 3 5 8", isHidden: false },
    { inputTemplate: "1", expectedOutputTemplate: "0", isHidden: false },
    { inputTemplate: "2", expectedOutputTemplate: "0 1", isHidden: true },
    { inputTemplate: "10", expectedOutputTemplate: "0 1 1 2 3 5 8 13 21 34", isHidden: true },
  ],
  hintTemplate:
    "Start with two variables: a=0, b=1. In a loop, print a, then update: temp=a+b, a=b, b=temp. Repeat n times.",
  computeExpectedOutput: (vars, tc) => {
    const input = sub(tc.inputTemplate, vars).trim();
    const n = parseInt(input, 10);
    if (tc.expectedOutputTemplate && !tc.expectedOutputTemplate.includes("{{") && tc.expectedOutputTemplate !== "") {
      return tc.expectedOutputTemplate;
    }
    if (n <= 0) return "";
    const fibs: number[] = [0];
    if (n >= 2) fibs.push(1);
    for (let i = 2; i < n; i++) {
      fibs.push(fibs[i - 1] + fibs[i - 2]);
    }
    return fibs.join(" ");
  },
};

// ═══════════════════════════════════════════════════════════════════
// Level 8 — Palindrome Check
// ═══════════════════════════════════════════════════════════════════

const javaLevel8: CodeLabProblem = {
  id: "java-palindrome",
  title: "Palindrome Check",
  language: "java",
  level: 8,
  tier: "easy",
  languageId: PROBLEM_LANGUAGE_IDS.java,
  tags: ["strings", "basics"],
  descriptionTemplate: `## Palindrome Check

Write a function that checks if a given word is a **palindrome** (reads the same forwards and backwards).

### Input
A single string \`s\` on one line.
- For this problem: \`s = "{{word}}"\`

### Output
Print \`true\` if the string is a palindrome, \`false\` otherwise.

### Example
\`\`\`
Input:
racecar

Output:
true
\`\`\`

### Constraints
- \`1 ≤ len(s) ≤ 1000\`
- \`s\` contains only lowercase English letters
`,
  variables: [
    {
      name: "word",
      type: "string",
      options: ["madam", "level", "rotor", "civic", "kayak", "algorithm", "computer", "programming", "deified", "repaper"],
    },
  ],
  testCases: [
    { inputTemplate: "{{word}}", expectedOutputTemplate: "", isHidden: false },
    { inputTemplate: "racecar", expectedOutputTemplate: "true", isHidden: false },
    { inputTemplate: "hello", expectedOutputTemplate: "false", isHidden: false },
    { inputTemplate: "a", expectedOutputTemplate: "true", isHidden: true },
    { inputTemplate: "abba", expectedOutputTemplate: "true", isHidden: true },
    { inputTemplate: "abcdef", expectedOutputTemplate: "false", isHidden: true },
  ],
  hintTemplate:
    "Compare the string with its reverse. In Java, you can use new StringBuilder(s).reverse().toString(). Or compare characters from both ends moving inward.",
  computeExpectedOutput: (vars, tc) => {
    const input = sub(tc.inputTemplate, vars).trim();
    if (tc.expectedOutputTemplate && !tc.expectedOutputTemplate.includes("{{") && tc.expectedOutputTemplate !== "") {
      return tc.expectedOutputTemplate;
    }
    const reversed = input.split("").reverse().join("");
    return input === reversed ? "true" : "false";
  },
};

// ═══════════════════════════════════════════════════════════════════
// Level 17 — Recursive Factorial
// ═══════════════════════════════════════════════════════════════════

const javaLevel17: CodeLabProblem = {
  id: "java-factorial",
  title: "Recursive Factorial",
  language: "java",
  level: 17,
  tier: "intermediate",
  languageId: PROBLEM_LANGUAGE_IDS.java,
  tags: ["recursion", "math"],
  descriptionTemplate: `## Recursive Factorial

Write a **recursive** function \`factorial(int n)\` that returns \`n!\` (n factorial).

Recall: \`n! = n × (n-1) × ... × 2 × 1\`, and \`0! = 1\`.

### Input
A single integer \`n\`.
- For this problem: \`n = {{n}}\`

### Output
Print the factorial of \`n\`.

### Example
\`\`\`
Input:
5

Output:
120
\`\`\`

### Constraints
- \`0 ≤ n ≤ 20\`
`,
  variables: [
    { name: "n", type: "number", min: 5, max: 15 },
  ],
  testCases: [
    { inputTemplate: "{{n}}", expectedOutputTemplate: "", isHidden: false },
    { inputTemplate: "5", expectedOutputTemplate: "120", isHidden: false },
    { inputTemplate: "0", expectedOutputTemplate: "1", isHidden: false },
    { inputTemplate: "1", expectedOutputTemplate: "1", isHidden: true },
    { inputTemplate: "10", expectedOutputTemplate: "3628800", isHidden: true },
    { inputTemplate: "{{n}}", expectedOutputTemplate: "", isHidden: true },
  ],
  hintTemplate:
    "The base case is: if n <= 1 return 1. The recursive case is: return n * factorial(n - 1). Make sure you use long (not int) for large factorials.",
  computeExpectedOutput: (vars, tc) => {
    const input = sub(tc.inputTemplate, vars).trim();
    const n = parseInt(input, 10);
    if (tc.expectedOutputTemplate && !tc.expectedOutputTemplate.includes("{{") && tc.expectedOutputTemplate !== "") {
      return tc.expectedOutputTemplate;
    }
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return String(result);
  },
};

// ═══════════════════════════════════════════════════════════════════
// Level 18 — Merge Sort
// ═══════════════════════════════════════════════════════════════════

const javaLevel18: CodeLabProblem = {
  id: "java-merge-sort",
  title: "Merge Sort",
  language: "java",
  level: 18,
  tier: "intermediate",
  languageId: PROBLEM_LANGUAGE_IDS.java,
  tags: ["sorting", "algorithms", "divide-and-conquer"],
  descriptionTemplate: `## Merge Sort

Implement the **merge sort** algorithm to sort an array of integers in ascending order.

### Input
- Line 1: integer \`n\` — the size of the array
- Line 2: \`n\` space-separated integers

For this problem: array size is **{{size}}**.

### Output
Print the sorted array as space-separated integers on a single line.

### Example
\`\`\`
Input:
6
38 27 43 3 9 82

Output:
3 9 27 38 43 82
\`\`\`

### Constraints
- \`1 ≤ n ≤ 10000\`
- \`-10000 ≤ arr[i] ≤ 10000\`
`,
  variables: [
    { name: "size", type: "number", min: 5, max: 12 },
  ],
  testCases: [
    { inputTemplate: "6\n38 27 43 3 9 82", expectedOutputTemplate: "3 9 27 38 43 82", isHidden: false },
    { inputTemplate: "4\n4 3 2 1", expectedOutputTemplate: "1 2 3 4", isHidden: false },
    { inputTemplate: "5\n1 2 3 4 5", expectedOutputTemplate: "1 2 3 4 5", isHidden: false },
    { inputTemplate: "1\n99", expectedOutputTemplate: "99", isHidden: true },
    { inputTemplate: "7\n-5 3 -1 0 2 -3 1", expectedOutputTemplate: "-5 -3 -1 0 1 2 3", isHidden: true },
  ],
  hintTemplate:
    "Divide the array in half recursively until each sub-array has 1 element. Then merge sorted halves: compare front elements, take the smaller, repeat.",
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
// Level 27 — Thread-Safe Producer-Consumer Queue
// ═══════════════════════════════════════════════════════════════════

const javaLevel27: CodeLabProblem = {
  id: "java-producer-consumer",
  title: "Producer-Consumer Queue",
  language: "java",
  level: 27,
  tier: "hard",
  languageId: PROBLEM_LANGUAGE_IDS.java,
  tags: ["concurrency", "data-structures", "design"],
  descriptionTemplate: `## Producer-Consumer Queue

Simulate a bounded queue with producer and consumer operations. The queue has a fixed capacity.

Operations:
- \`produce X\` — add item X to the queue. If full, print \`FULL\`.
- \`consume\` — remove and print the front item (FIFO). If empty, print \`EMPTY\`.
- \`size\` — print the current number of items in the queue.

### Input
- Line 1: integer \`capacity\` — maximum queue size
- Line 2: integer \`n\` — number of operations
- Next \`n\` lines: one operation per line

### Output
For each \`consume\`, \`size\`, or blocked \`produce\` (FULL), print the result on a new line.

### Example
\`\`\`
Input:
2
7
produce 10
produce 20
produce 30
consume
consume
consume
size
\`\`\`

Output:
\`\`\`
FULL
10
20
EMPTY
0
\`\`\`

### Constraints
- \`1 ≤ capacity ≤ 100\`
- \`1 ≤ n ≤ 1000\`
`,
  variables: [
    { name: "cap", type: "number", min: 2, max: 5 },
  ],
  testCases: [
    {
      inputTemplate: "2\n7\nproduce 10\nproduce 20\nproduce 30\nconsume\nconsume\nconsume\nsize",
      expectedOutputTemplate: "FULL\n10\n20\nEMPTY\n0",
      isHidden: false,
    },
    {
      inputTemplate: "3\n5\nproduce 1\nproduce 2\nproduce 3\nsize\nconsume",
      expectedOutputTemplate: "3\n1",
      isHidden: false,
    },
    {
      inputTemplate: "1\n4\nconsume\nproduce 5\nconsume\nsize",
      expectedOutputTemplate: "EMPTY\n5\n0",
      isHidden: true,
    },
    {
      inputTemplate: "2\n6\nproduce 1\nproduce 2\nconsume\nproduce 3\nsize\nconsume",
      expectedOutputTemplate: "1\n2\n2",
      isHidden: true,
    },
  ],
  hintTemplate:
    "Use a queue (LinkedList or ArrayDeque). Check capacity before produce. Check emptiness before consume. This is the sequential simulation version — concurrency primitives (synchronized/wait/notify) are for the real-world extension.",
  computeExpectedOutput: (vars, tc) => {
    const input = sub(tc.inputTemplate, vars).trim();
    if (tc.expectedOutputTemplate && !tc.expectedOutputTemplate.includes("{{") && tc.expectedOutputTemplate !== "") {
      return tc.expectedOutputTemplate;
    }
    const lines = input.split("\n");
    const capacity = parseInt(lines[0], 10);
    const queue: number[] = [];
    const outputs: string[] = [];

    for (let i = 2; i < lines.length; i++) {
      const parts = lines[i].split(" ");
      if (parts[0] === "produce") {
        const val = parseInt(parts[1], 10);
        if (queue.length >= capacity) {
          outputs.push("FULL");
        } else {
          queue.push(val);
        }
      } else if (parts[0] === "consume") {
        if (queue.length === 0) {
          outputs.push("EMPTY");
        } else {
          outputs.push(String(queue.shift()));
        }
      } else if (parts[0] === "size") {
        outputs.push(String(queue.length));
      }
    }
    return outputs.join("\n");
  },
};

// ═══════════════════════════════════════════════════════════════════
// Level 28 — 0/1 Knapsack Problem
// ═══════════════════════════════════════════════════════════════════

const javaLevel28: CodeLabProblem = {
  id: "java-knapsack",
  title: "0/1 Knapsack Problem",
  language: "java",
  level: 28,
  tier: "hard",
  languageId: PROBLEM_LANGUAGE_IDS.java,
  tags: ["dynamic-programming", "algorithms", "optimization"],
  descriptionTemplate: `## 0/1 Knapsack Problem

Given \`n\` items, each with a weight and a value, determine the maximum value that can be put in a knapsack of capacity \`W\`. Each item can be used at most once.

### Input
- Line 1: two integers \`n W\` (number of items and knapsack capacity)
- Next \`n\` lines: two integers \`weight value\` per item

For this problem: **{{items}}** items with capacity **{{cap}}**.

### Output
Print a single integer — the maximum total value.

### Example
\`\`\`
Input:
4 7
1 1
3 4
4 5
5 7

Output:
9
\`\`\`

### Constraints
- \`1 ≤ n ≤ 100\`
- \`1 ≤ W ≤ 1000\`
- \`1 ≤ weight, value ≤ 1000\`
`,
  variables: [
    { name: "items", type: "number", min: 3, max: 6 },
    { name: "cap", type: "number", min: 5, max: 15 },
  ],
  testCases: [
    {
      inputTemplate: "4 7\n1 1\n3 4\n4 5\n5 7",
      expectedOutputTemplate: "9",
      isHidden: false,
    },
    {
      inputTemplate: "3 5\n2 3\n3 4\n4 5",
      expectedOutputTemplate: "7",
      isHidden: false,
    },
    {
      inputTemplate: "1 1\n2 10",
      expectedOutputTemplate: "0",
      isHidden: true,
    },
    {
      inputTemplate: "5 10\n2 6\n2 3\n6 5\n5 4\n4 6",
      expectedOutputTemplate: "15",
      isHidden: true,
    },
  ],
  hintTemplate:
    "Use dynamic programming. Create a 2D array dp[i][w] = max value using items 0..i-1 with capacity w. For each item, decide: skip it (dp[i-1][w]) or take it (dp[i-1][w-weight] + value). Take the max.",
  computeExpectedOutput: (vars, tc) => {
    const input = sub(tc.inputTemplate, vars).trim();
    if (tc.expectedOutputTemplate && !tc.expectedOutputTemplate.includes("{{") && tc.expectedOutputTemplate !== "") {
      return tc.expectedOutputTemplate;
    }
    const lines = input.split("\n");
    const [n, W] = lines[0].split(" ").map(Number);
    const weights: number[] = [];
    const values: number[] = [];
    for (let i = 1; i <= n; i++) {
      const [w, v] = lines[i].split(" ").map(Number);
      weights.push(w);
      values.push(v);
    }

    // DP
    const dp: number[][] = Array.from({ length: n + 1 }, () =>
      new Array(W + 1).fill(0)
    );
    for (let i = 1; i <= n; i++) {
      for (let w = 0; w <= W; w++) {
        dp[i][w] = dp[i - 1][w]; // skip
        if (weights[i - 1] <= w) {
          dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - weights[i - 1]] + values[i - 1]);
        }
      }
    }
    return String(dp[n][W]);
  },
};

export const javaProblems: CodeLabProblem[] = [
  javaLevel7,
  javaLevel8,
  javaLevel17,
  javaLevel18,
  javaLevel27,
  javaLevel28,
];
