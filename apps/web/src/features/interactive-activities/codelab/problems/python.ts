/**
 * Python Problems — Levels 1, 2, 11, 12, 21, 22
 *
 * Easy:         L1 (Sum two numbers), L2 (Reverse string)
 * Intermediate: L11 (Sieve of Eratosthenes), L12 (Binary search)
 * Hard:         L21 (N-Queens), L22 (Dijkstra's algorithm)
 */

import {
  CodeLabProblem,
  ProblemTestCase,
  PROBLEM_LANGUAGE_IDS,
} from "./types";
import { substituteTemplate } from "../utils/problem-engine";

// ─── Helper: substitute simple template vars in expected output ───
function sub(
  template: string,
  vars: Record<string, string | number>
): string {
  return substituteTemplate(template, vars);
}

// ═══════════════════════════════════════════════════════════════════
// Level 1 — Sum Two Numbers
// ═══════════════════════════════════════════════════════════════════

const pyLevel1: CodeLabProblem = {
  id: "py-sum-two-numbers",
  title: "Sum Two Numbers",
  language: "python",
  level: 1,
  tier: "easy",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["math", "basics", "functions"],
  descriptionTemplate: `## Sum Two Numbers

Write a function \`add(a, b)\` that returns the sum of two integers.

### Input
Two integers **a** and **b**, each on a separate line.
- For this problem: \`a = {{a}}\`, \`b = {{b}}\`

### Output
Print a single integer — the sum of \`a\` and \`b\`.

### Example
\`\`\`
Input:
3
5

Output:
8
\`\`\`

### Constraints
- \`1 ≤ a, b ≤ 9999\`
`,
  variables: [
    { name: "a", type: "number", min: 10, max: 999 },
    { name: "b", type: "number", min: 10, max: 999 },
  ],
  testCases: [
    { inputTemplate: "{{a}}\n{{b}}", expectedOutputTemplate: "", isHidden: false },
    { inputTemplate: "1\n1", expectedOutputTemplate: "2", isHidden: false },
    { inputTemplate: "100\n200", expectedOutputTemplate: "300", isHidden: false },
    { inputTemplate: "{{b}}\n{{a}}", expectedOutputTemplate: "", isHidden: true },
    { inputTemplate: "999\n999", expectedOutputTemplate: "1998", isHidden: true },
  ],
  hintTemplate:
    "Think about what operator adds two numbers in Python. Your function should return the result, and your main code should print it.",
  computeExpectedOutput: (vars, tc) => {
    const input = sub(tc.inputTemplate, vars);
    const lines = input.trim().split("\n");
    const x = parseInt(lines[0], 10);
    const y = parseInt(lines[1], 10);
    if (tc.expectedOutputTemplate && !tc.expectedOutputTemplate.includes("{{")) {
      return tc.expectedOutputTemplate;
    }
    return String(x + y);
  },
};

// ═══════════════════════════════════════════════════════════════════
// Level 2 — Reverse a String
// ═══════════════════════════════════════════════════════════════════

const pyLevel2: CodeLabProblem = {
  id: "py-reverse-string",
  title: "Reverse a String",
  language: "python",
  level: 2,
  tier: "easy",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["strings", "basics"],
  descriptionTemplate: `## Reverse a String

Write a function \`reverse_string(s)\` that returns the reverse of the given string.

### Input
A single string \`s\` on one line.
- For this problem: \`s = "{{word}}"\`

### Output
Print the reversed string.

### Example
\`\`\`
Input:
hello

Output:
olleh
\`\`\`

### Constraints
- \`1 ≤ len(s) ≤ 1000\`
- \`s\` contains only lowercase English letters
`,
  variables: [
    {
      name: "word",
      type: "string",
      options: ["algorithm", "computer", "database", "function", "variable", "keyboard", "network", "program", "software", "terminal"],
    },
  ],
  testCases: [
    { inputTemplate: "{{word}}", expectedOutputTemplate: "", isHidden: false },
    { inputTemplate: "hello", expectedOutputTemplate: "olleh", isHidden: false },
    { inputTemplate: "racecar", expectedOutputTemplate: "racecar", isHidden: false },
    { inputTemplate: "abcdef", expectedOutputTemplate: "fedcba", isHidden: true },
    { inputTemplate: "{{word}}", expectedOutputTemplate: "", isHidden: true },
  ],
  hintTemplate:
    "Python strings can be reversed using slicing: s[::-1]. Make sure to print the result.",
  computeExpectedOutput: (vars, tc) => {
    const input = sub(tc.inputTemplate, vars).trim();
    if (tc.expectedOutputTemplate && !tc.expectedOutputTemplate.includes("{{") && tc.expectedOutputTemplate !== "") {
      return tc.expectedOutputTemplate;
    }
    return input.split("").reverse().join("");
  },
};

// ═══════════════════════════════════════════════════════════════════
// Level 11 — Sieve of Eratosthenes
// ═══════════════════════════════════════════════════════════════════

const pyLevel11: CodeLabProblem = {
  id: "py-sieve-primes",
  title: "Sieve of Eratosthenes",
  language: "python",
  level: 11,
  tier: "intermediate",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["math", "algorithms", "primes"],
  descriptionTemplate: `## Sieve of Eratosthenes

Write a function \`find_primes(n)\` that returns all prime numbers up to \`n\` (inclusive) using the Sieve of Eratosthenes algorithm.

### Input
A single integer \`n\` on one line.
- For this problem: \`n = {{n}}\`

### Output
Print all prime numbers up to \`n\`, separated by spaces, on a single line.

### Example
\`\`\`
Input:
20

Output:
2 3 5 7 11 13 17 19
\`\`\`

### Constraints
- \`2 ≤ n ≤ 200\`
`,
  variables: [
    { name: "n", type: "number", min: 30, max: 100 },
  ],
  testCases: [
    { inputTemplate: "{{n}}", expectedOutputTemplate: "", isHidden: false },
    { inputTemplate: "10", expectedOutputTemplate: "2 3 5 7", isHidden: false },
    { inputTemplate: "30", expectedOutputTemplate: "2 3 5 7 11 13 17 19 23 29", isHidden: false },
    { inputTemplate: "2", expectedOutputTemplate: "2", isHidden: true },
    { inputTemplate: "50", expectedOutputTemplate: "2 3 5 7 11 13 17 19 23 29 31 37 41 43 47", isHidden: true },
    { inputTemplate: "{{n}}", expectedOutputTemplate: "", isHidden: true },
  ],
  hintTemplate:
    "Create a boolean array of size n+1, initially all True. Starting from 2, mark all multiples of each prime as False. The remaining True indices are primes.",
  computeExpectedOutput: (vars, tc) => {
    const input = sub(tc.inputTemplate, vars).trim();
    const n = parseInt(input, 10);
    if (tc.expectedOutputTemplate && !tc.expectedOutputTemplate.includes("{{") && tc.expectedOutputTemplate !== "") {
      return tc.expectedOutputTemplate;
    }
    // Sieve of Eratosthenes
    const sieve = new Array(n + 1).fill(true);
    sieve[0] = false;
    sieve[1] = false;
    for (let i = 2; i * i <= n; i++) {
      if (sieve[i]) {
        for (let j = i * i; j <= n; j += i) {
          sieve[j] = false;
        }
      }
    }
    const primes: number[] = [];
    for (let i = 2; i <= n; i++) {
      if (sieve[i]) primes.push(i);
    }
    return primes.join(" ");
  },
};

// ═══════════════════════════════════════════════════════════════════
// Level 12 — Binary Search
// ═══════════════════════════════════════════════════════════════════

const pyLevel12: CodeLabProblem = {
  id: "py-binary-search",
  title: "Binary Search",
  language: "python",
  level: 12,
  tier: "intermediate",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["algorithms", "searching", "arrays"],
  descriptionTemplate: `## Binary Search

Write a function \`binary_search(arr, target)\` that implements binary search on a sorted list. Return the **0-based index** of the target element, or \`-1\` if it is not found.

### Input
- Line 1: space-separated sorted integers (the array)
- Line 2: the target integer to search for

For this problem the target is **{{target}}**.

### Output
Print the 0-based index of the target, or \`-1\` if not found.

### Example
\`\`\`
Input:
1 3 5 7 9 11
7

Output:
3
\`\`\`

### Constraints
- \`1 ≤ len(arr) ≤ 10000\`
- Array is sorted in ascending order
- All elements are unique integers
`,
  variables: [
    { name: "target", type: "number", min: 10, max: 50 },
  ],
  testCases: [
    { inputTemplate: "2 5 8 12 16 23 38 42 56 72 91\n23", expectedOutputTemplate: "5", isHidden: false },
    { inputTemplate: "1 3 5 7 9 11 13\n7", expectedOutputTemplate: "3", isHidden: false },
    { inputTemplate: "10 20 30 40 50\n{{target}}", expectedOutputTemplate: "", isHidden: false },
    { inputTemplate: "1 2 3 4 5\n6", expectedOutputTemplate: "-1", isHidden: true },
    { inputTemplate: "5 10 15 20 25 30 35 40 45 50\n{{target}}", expectedOutputTemplate: "", isHidden: true },
  ],
  hintTemplate:
    "Maintain two pointers (low and high). Compare the middle element to the target. If equal, return the index. If target is smaller, search the left half. If larger, search the right half.",
  computeExpectedOutput: (vars, tc) => {
    const input = sub(tc.inputTemplate, vars).trim();
    const lines = input.split("\n");
    const arr = lines[0].split(" ").map(Number);
    const target = parseInt(lines[1], 10);
    if (tc.expectedOutputTemplate && !tc.expectedOutputTemplate.includes("{{") && tc.expectedOutputTemplate !== "") {
      return tc.expectedOutputTemplate;
    }
    const idx = arr.indexOf(target);
    return String(idx);
  },
};

// ═══════════════════════════════════════════════════════════════════
// Level 21 — N-Queens
// ═══════════════════════════════════════════════════════════════════

const pyLevel21: CodeLabProblem = {
  id: "py-n-queens",
  title: "N-Queens Problem",
  language: "python",
  level: 21,
  tier: "hard",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["backtracking", "recursion", "algorithms"],
  descriptionTemplate: `## N-Queens Problem

Given an **{{n}} × {{n}}** chessboard, find the **number of distinct solutions** to place {{n}} queens such that no two queens attack each other (no two queens share the same row, column, or diagonal).

### Input
A single integer \`n\` — the board size.

### Output
Print a single integer — the total number of valid arrangements.

### Example
\`\`\`
Input:
4

Output:
2
\`\`\`

### Known Values
| n | Solutions |
|---|-----------|
| 1 | 1         |
| 4 | 2         |
| 5 | 10        |
| 6 | 4         |
| 7 | 40        |
| 8 | 92        |

### Constraints
- \`1 ≤ n ≤ 10\`
`,
  variables: [
    { name: "n", type: "number", min: 4, max: 8 },
  ],
  testCases: [
    { inputTemplate: "{{n}}", expectedOutputTemplate: "", isHidden: false },
    { inputTemplate: "4", expectedOutputTemplate: "2", isHidden: false },
    { inputTemplate: "1", expectedOutputTemplate: "1", isHidden: true },
    { inputTemplate: "5", expectedOutputTemplate: "10", isHidden: true },
    { inputTemplate: "8", expectedOutputTemplate: "92", isHidden: true },
  ],
  hintTemplate:
    "Use backtracking: place queens row by row. For each row, try each column. Check if placing a queen conflicts with already-placed queens on the same column or diagonals. Track diagonals using (row-col) and (row+col).",
  computeExpectedOutput: (vars, tc) => {
    const input = sub(tc.inputTemplate, vars).trim();
    const n = parseInt(input, 10);
    if (tc.expectedOutputTemplate && !tc.expectedOutputTemplate.includes("{{") && tc.expectedOutputTemplate !== "") {
      return tc.expectedOutputTemplate;
    }
    // Solve N-Queens
    let count = 0;
    const cols = new Set<number>();
    const diag1 = new Set<number>(); // row - col
    const diag2 = new Set<number>(); // row + col

    function solve(row: number): void {
      if (row === n) {
        count++;
        return;
      }
      for (let col = 0; col < n; col++) {
        if (cols.has(col) || diag1.has(row - col) || diag2.has(row + col)) continue;
        cols.add(col);
        diag1.add(row - col);
        diag2.add(row + col);
        solve(row + 1);
        cols.delete(col);
        diag1.delete(row - col);
        diag2.delete(row + col);
      }
    }
    solve(0);
    return String(count);
  },
};

// ═══════════════════════════════════════════════════════════════════
// Level 22 — Dijkstra's Algorithm
// ═══════════════════════════════════════════════════════════════════

const pyLevel22: CodeLabProblem = {
  id: "py-dijkstra",
  title: "Dijkstra's Shortest Path",
  language: "python",
  level: 22,
  tier: "hard",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["graphs", "algorithms", "shortest-path"],
  descriptionTemplate: `## Dijkstra's Shortest Path

Implement Dijkstra's algorithm to find the shortest distance from node **0** to node **{{target}}** in a weighted directed graph.

### Input
- Line 1: two integers \`V E\` (number of vertices and edges)
- Next \`E\` lines: three integers \`u v w\` (edge from \`u\` to \`v\` with weight \`w\`)
- Last line: the target vertex

### Output
Print the shortest distance from vertex 0 to the target vertex. If unreachable, print \`-1\`.

### Example
\`\`\`
Input:
5 6
0 1 4
0 2 1
2 1 2
1 3 1
2 3 5
3 4 3
4

Output:
7
\`\`\`

### Constraints
- \`2 ≤ V ≤ 100\`, \`1 ≤ E ≤ 1000\`
- \`0 ≤ w ≤ 1000\`
`,
  variables: [
    { name: "target", type: "number", min: 3, max: 5 },
  ],
  testCases: [
    {
      inputTemplate: "5 6\n0 1 4\n0 2 1\n2 1 2\n1 3 1\n2 3 5\n3 4 3\n4",
      expectedOutputTemplate: "7",
      isHidden: false,
    },
    {
      inputTemplate: "4 4\n0 1 1\n1 2 2\n2 3 3\n0 3 10\n3",
      expectedOutputTemplate: "6",
      isHidden: false,
    },
    {
      inputTemplate: "3 1\n0 1 5\n2",
      expectedOutputTemplate: "-1",
      isHidden: true,
    },
    {
      inputTemplate: "6 7\n0 1 2\n0 2 4\n1 2 1\n1 3 7\n2 4 3\n3 5 1\n4 5 5\n5",
      expectedOutputTemplate: "8",
      isHidden: true,
    },
  ],
  hintTemplate:
    "Use a priority queue (min-heap). Start with distance 0 at vertex 0, infinity everywhere else. Repeatedly extract the minimum-distance vertex and relax its neighbors.",
  computeExpectedOutput: (vars, tc) => {
    const input = sub(tc.inputTemplate, vars).trim();
    if (tc.expectedOutputTemplate && !tc.expectedOutputTemplate.includes("{{") && tc.expectedOutputTemplate !== "") {
      return tc.expectedOutputTemplate;
    }
    // Parse graph and run Dijkstra
    const lines = input.split("\n");
    const [V] = lines[0].split(" ").map(Number);
    const E = parseInt(lines[0].split(" ")[1], 10);
    const adj: Array<Array<{ to: number; w: number }>> = Array.from({ length: V }, () => []);
    for (let i = 1; i <= E; i++) {
      const [u, v, w] = lines[i].split(" ").map(Number);
      adj[u].push({ to: v, w });
    }
    const target = parseInt(lines[E + 1], 10);

    const dist = new Array(V).fill(Infinity);
    dist[0] = 0;
    const visited = new Array(V).fill(false);

    for (let iter = 0; iter < V; iter++) {
      let u = -1;
      for (let i = 0; i < V; i++) {
        if (!visited[i] && (u === -1 || dist[i] < dist[u])) {
          u = i;
        }
      }
      if (u === -1 || dist[u] === Infinity) break;
      visited[u] = true;
      for (const edge of adj[u]) {
        if (dist[u] + edge.w < dist[edge.to]) {
          dist[edge.to] = dist[u] + edge.w;
        }
      }
    }
    return dist[target] === Infinity ? "-1" : String(dist[target]);
  },
};

export const pythonProblems: CodeLabProblem[] = [
  pyLevel1,
  pyLevel2,
  pyLevel11,
  pyLevel12,
  pyLevel21,
  pyLevel22,
];
