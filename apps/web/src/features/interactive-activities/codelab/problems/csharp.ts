/**
 * C# Problems — Levels 5, 6, 15, 16, 25, 26
 *
 * Easy:         L5 (Count char occurrences), L6 (Celsius to Fahrenheit)
 * Intermediate: L15 (Stack using array), L16 (Simple calculator)
 * Hard:         L25 (Priority queue / binary heap), L26 (LRU Cache)
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
// Level 5 — Count Character Occurrences
// ═══════════════════════════════════════════════════════════════════

const csLevel5: CodeLabProblem = {
  id: "cs-count-char",
  title: "Count Character Occurrences",
  language: "csharp",
  level: 5,
  tier: "easy",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["strings", "loops", "basics"],
  descriptionTemplate: `## Count Character Occurrences

Write a function \`CountChar(string s, char c)\` that returns the number of times character \`c\` appears in string \`s\`.

### Input
- Line 1: a string \`s\`
- Line 2: a single character \`c\`

For this problem: count \`'{{char}}'\` in \`"{{sentence}}"\`.

### Output
Print a single integer — the count.

### Example
\`\`\`
Input:
hello world
l

Output:
3
\`\`\`

### Constraints
- \`1 ≤ len(s) ≤ 1000\`
- \`c\` is a lowercase letter
`,
  variables: [
    {
      name: "sentence",
      type: "string",
      options: [
        "programming is fun and educational",
        "computer science is fascinating",
        "algorithms and data structures",
        "the quick brown fox jumps over the lazy dog",
        "software engineering principles",
      ],
    },
    {
      name: "char",
      type: "string",
      options: ["a", "e", "i", "o", "s", "t"],
    },
  ],
  testCases: [
    { inputTemplate: "{{sentence}}\n{{char}}", expectedOutputTemplate: "", isHidden: false },
    { inputTemplate: "hello world\nl", expectedOutputTemplate: "3", isHidden: false },
    { inputTemplate: "aabbcc\na", expectedOutputTemplate: "2", isHidden: false },
    { inputTemplate: "xyz\na", expectedOutputTemplate: "0", isHidden: true },
    { inputTemplate: "aaaa\na", expectedOutputTemplate: "4", isHidden: true },
  ],
  hintTemplate:
    "Loop through each character in the string and increment a counter whenever you find a match. In C#, you can also use LINQ: s.Count(x => x == c).",
  computeExpectedOutput: (vars, tc) => {
    const input = sub(tc.inputTemplate, vars).trim();
    const lines = input.split("\n");
    if (tc.expectedOutputTemplate && !tc.expectedOutputTemplate.includes("{{") && tc.expectedOutputTemplate !== "") {
      return tc.expectedOutputTemplate;
    }
    const s = lines[0];
    const c = lines[1];
    let count = 0;
    for (const ch of s) {
      if (ch === c) count++;
    }
    return String(count);
  },
};

// ═══════════════════════════════════════════════════════════════════
// Level 6 — Celsius to Fahrenheit
// ═══════════════════════════════════════════════════════════════════

const csLevel6: CodeLabProblem = {
  id: "cs-celsius-fahrenheit",
  title: "Celsius to Fahrenheit",
  language: "csharp",
  level: 6,
  tier: "easy",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["math", "basics", "conversion"],
  descriptionTemplate: `## Celsius to Fahrenheit

Write a function \`CelsiusToFahrenheit(double celsius)\` that converts a temperature from Celsius to Fahrenheit.

**Formula:** \`F = C × 9/5 + 32\`

### Input
A single number (the temperature in Celsius).
- For this problem: \`{{temp}}\` °C

### Output
Print the temperature in Fahrenheit, formatted to **2 decimal places**.

### Example
\`\`\`
Input:
100

Output:
212.00
\`\`\`

### Constraints
- \`-100 ≤ C ≤ 1000\`
`,
  variables: [
    { name: "temp", type: "number", min: 0, max: 100 },
  ],
  testCases: [
    { inputTemplate: "{{temp}}", expectedOutputTemplate: "", isHidden: false },
    { inputTemplate: "0", expectedOutputTemplate: "32.00", isHidden: false },
    { inputTemplate: "100", expectedOutputTemplate: "212.00", isHidden: false },
    { inputTemplate: "-40", expectedOutputTemplate: "-40.00", isHidden: true },
    { inputTemplate: "37", expectedOutputTemplate: "98.60", isHidden: true },
  ],
  hintTemplate:
    "Apply the formula F = C * 9.0 / 5.0 + 32. Use string formatting to get 2 decimal places: result.ToString(\"F2\") in C#.",
  computeExpectedOutput: (vars, tc) => {
    const input = sub(tc.inputTemplate, vars).trim();
    const c = parseFloat(input);
    if (tc.expectedOutputTemplate && !tc.expectedOutputTemplate.includes("{{") && tc.expectedOutputTemplate !== "") {
      return tc.expectedOutputTemplate;
    }
    const f = c * 9.0 / 5.0 + 32;
    return f.toFixed(2);
  },
};

// ═══════════════════════════════════════════════════════════════════
// Level 15 — Stack Using Array
// ═══════════════════════════════════════════════════════════════════

const csLevel15: CodeLabProblem = {
  id: "cs-stack-array",
  title: "Stack Using Array",
  language: "csharp",
  level: 15,
  tier: "intermediate",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["data-structures", "stack", "arrays"],
  descriptionTemplate: `## Stack Using Array

Implement a stack data structure using an array. Support these operations:
- \`push X\` — push integer X onto the stack
- \`pop\` — pop the top element and print it (print \`-1\` if empty)
- \`top\` — print the top element without removing it (print \`-1\` if empty)

### Input
- Line 1: integer \`n\` — number of operations
- Next \`n\` lines: one operation per line

### Output
For each \`pop\` or \`top\` operation, print the result on a new line.

### Example
\`\`\`
Input:
6
push 5
push 10
top
pop
pop
pop

Output:
10
10
5
-1
\`\`\`

### Constraints
- \`1 ≤ n ≤ 1000\`
`,
  variables: [
    { name: "n", type: "number", min: 5, max: 10 },
  ],
  testCases: [
    {
      inputTemplate: "6\npush 5\npush 10\ntop\npop\npop\npop",
      expectedOutputTemplate: "10\n10\n5\n-1",
      isHidden: false,
    },
    {
      inputTemplate: "4\npush 1\npush 2\npush 3\ntop",
      expectedOutputTemplate: "3",
      isHidden: false,
    },
    {
      inputTemplate: "3\npop\ntop\npush 42",
      expectedOutputTemplate: "-1\n-1",
      isHidden: true,
    },
    {
      inputTemplate: "5\npush 10\npush 20\npop\npush 30\ntop",
      expectedOutputTemplate: "20\n30",
      isHidden: true,
    },
  ],
  hintTemplate:
    "Use an array and a top pointer (integer index). Push increments the pointer and stores the value. Pop reads the value and decrements. Check for empty stack (top < 0) before pop/top.",
  computeExpectedOutput: (vars, tc) => {
    const input = sub(tc.inputTemplate, vars).trim();
    if (tc.expectedOutputTemplate && !tc.expectedOutputTemplate.includes("{{") && tc.expectedOutputTemplate !== "") {
      return tc.expectedOutputTemplate;
    }
    const lines = input.split("\n");
    const stack: number[] = [];
    const outputs: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(" ");
      if (parts[0] === "push") {
        stack.push(parseInt(parts[1], 10));
      } else if (parts[0] === "pop") {
        outputs.push(stack.length > 0 ? String(stack.pop()) : "-1");
      } else if (parts[0] === "top") {
        outputs.push(stack.length > 0 ? String(stack[stack.length - 1]) : "-1");
      }
    }
    return outputs.join("\n");
  },
};

// ═══════════════════════════════════════════════════════════════════
// Level 16 — Simple Calculator
// ═══════════════════════════════════════════════════════════════════

const csLevel16: CodeLabProblem = {
  id: "cs-calculator",
  title: "Simple Calculator",
  language: "csharp",
  level: 16,
  tier: "intermediate",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["conditionals", "math", "parsing"],
  descriptionTemplate: `## Simple Calculator

Write a calculator that takes two numbers and an operator, then prints the result.

### Input
- Line 1: first number (double)
- Line 2: operator (\`+\`, \`-\`, \`*\`, \`/\`)
- Line 3: second number (double)

### Output
Print the result formatted to **2 decimal places**. If dividing by zero, print \`Error\`.

### Example
\`\`\`
Input:
10
/
3

Output:
3.33
\`\`\`

### Constraints
- \`-10000 ≤ numbers ≤ 10000\`
- Operator is one of \`+\`, \`-\`, \`*\`, \`/\`
`,
  variables: [
    { name: "a", type: "number", min: 1, max: 100 },
    { name: "b", type: "number", min: 1, max: 100 },
  ],
  testCases: [
    { inputTemplate: "10\n/\n3", expectedOutputTemplate: "3.33", isHidden: false },
    { inputTemplate: "5\n+\n3", expectedOutputTemplate: "8.00", isHidden: false },
    { inputTemplate: "{{a}}\n*\n{{b}}", expectedOutputTemplate: "", isHidden: false },
    { inputTemplate: "10\n/\n0", expectedOutputTemplate: "Error", isHidden: true },
    { inputTemplate: "7\n-\n12", expectedOutputTemplate: "-5.00", isHidden: true },
  ],
  hintTemplate:
    "Use a switch or if-else on the operator string. Remember to check for division by zero before computing the result.",
  computeExpectedOutput: (vars, tc) => {
    const input = sub(tc.inputTemplate, vars).trim();
    const lines = input.split("\n");
    if (tc.expectedOutputTemplate && !tc.expectedOutputTemplate.includes("{{") && tc.expectedOutputTemplate !== "") {
      return tc.expectedOutputTemplate;
    }
    const a = parseFloat(lines[0]);
    const op = lines[1];
    const b = parseFloat(lines[2]);
    if (op === "/" && b === 0) return "Error";
    let result: number;
    switch (op) {
      case "+": result = a + b; break;
      case "-": result = a - b; break;
      case "*": result = a * b; break;
      case "/": result = a / b; break;
      default: return "Error";
    }
    return result.toFixed(2);
  },
};

// ═══════════════════════════════════════════════════════════════════
// Level 25 — Priority Queue (Binary Heap)
// ═══════════════════════════════════════════════════════════════════

const csLevel25: CodeLabProblem = {
  id: "cs-priority-queue",
  title: "Priority Queue (Min-Heap)",
  language: "csharp",
  level: 25,
  tier: "hard",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["data-structures", "heap", "priority-queue"],
  descriptionTemplate: `## Priority Queue Using Binary Min-Heap

Implement a min-heap priority queue supporting:
- \`insert X\` — insert integer X
- \`extractMin\` — remove and print the minimum element (print \`-1\` if empty)
- \`peekMin\` — print the minimum element without removing (print \`-1\` if empty)

### Input
- Line 1: integer \`n\` — number of operations
- Next \`n\` lines: one operation per line

### Output
For each \`extractMin\` or \`peekMin\`, print the result on a new line.

### Example
\`\`\`
Input:
6
insert 5
insert 3
insert 8
peekMin
extractMin
peekMin

Output:
3
3
5
\`\`\`
`,
  variables: [
    { name: "n", type: "number", min: 5, max: 10 },
  ],
  testCases: [
    {
      inputTemplate: "6\ninsert 5\ninsert 3\ninsert 8\npeekMin\nextractMin\npeekMin",
      expectedOutputTemplate: "3\n3\n5",
      isHidden: false,
    },
    {
      inputTemplate: "4\nextractMin\ninsert 10\ninsert 1\nextractMin",
      expectedOutputTemplate: "-1\n1",
      isHidden: false,
    },
    {
      inputTemplate: "5\ninsert 7\ninsert 2\ninsert 9\nextractMin\nextractMin",
      expectedOutputTemplate: "2\n7",
      isHidden: true,
    },
    {
      inputTemplate: "3\ninsert 1\nextractMin\nextractMin",
      expectedOutputTemplate: "1\n-1",
      isHidden: true,
    },
  ],
  hintTemplate:
    "Store elements in an array. Insert at the end and bubble up. ExtractMin swaps root with last element, removes last, and bubbles down. Parent of i is (i-1)/2, children are 2i+1 and 2i+2.",
  computeExpectedOutput: (vars, tc) => {
    const input = sub(tc.inputTemplate, vars).trim();
    if (tc.expectedOutputTemplate && !tc.expectedOutputTemplate.includes("{{") && tc.expectedOutputTemplate !== "") {
      return tc.expectedOutputTemplate;
    }
    const lines = input.split("\n");
    const heap: number[] = [];
    const outputs: string[] = [];

    function bubbleUp(i: number): void {
      while (i > 0) {
        const parent = Math.floor((i - 1) / 2);
        if (heap[parent] > heap[i]) {
          [heap[parent], heap[i]] = [heap[i], heap[parent]];
          i = parent;
        } else break;
      }
    }
    function bubbleDown(i: number): void {
      const n = heap.length;
      while (true) {
        let smallest = i;
        const l = 2 * i + 1;
        const r = 2 * i + 2;
        if (l < n && heap[l] < heap[smallest]) smallest = l;
        if (r < n && heap[r] < heap[smallest]) smallest = r;
        if (smallest !== i) {
          [heap[smallest], heap[i]] = [heap[i], heap[smallest]];
          i = smallest;
        } else break;
      }
    }

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(" ");
      if (parts[0] === "insert") {
        heap.push(parseInt(parts[1], 10));
        bubbleUp(heap.length - 1);
      } else if (parts[0] === "extractMin") {
        if (heap.length === 0) {
          outputs.push("-1");
        } else {
          outputs.push(String(heap[0]));
          heap[0] = heap[heap.length - 1];
          heap.pop();
          if (heap.length > 0) bubbleDown(0);
        }
      } else if (parts[0] === "peekMin") {
        outputs.push(heap.length > 0 ? String(heap[0]) : "-1");
      }
    }
    return outputs.join("\n");
  },
};

// ═══════════════════════════════════════════════════════════════════
// Level 26 — LRU Cache
// ═══════════════════════════════════════════════════════════════════

const csLevel26: CodeLabProblem = {
  id: "cs-lru-cache",
  title: "LRU Cache",
  language: "csharp",
  level: 26,
  tier: "hard",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["data-structures", "cache", "design"],
  descriptionTemplate: `## LRU Cache

Implement a **Least Recently Used (LRU) Cache** with a given capacity.

Operations:
- \`put K V\` — insert or update key K with value V
- \`get K\` — return the value for key K, or \`-1\` if not found

When the cache exceeds capacity, evict the least recently used item.

### Input
- Line 1: integer \`capacity\`
- Line 2: integer \`n\` — number of operations
- Next \`n\` lines: one operation per line

For this problem: capacity = **{{cap}}**

### Output
For each \`get\` operation, print the result on a new line.

### Example
\`\`\`
Input:
2
6
put 1 10
put 2 20
get 1
put 3 30
get 2
get 3

Output:
10
-1
30
\`\`\`
`,
  variables: [
    { name: "cap", type: "number", min: 2, max: 5 },
  ],
  testCases: [
    {
      inputTemplate: "2\n6\nput 1 10\nput 2 20\nget 1\nput 3 30\nget 2\nget 3",
      expectedOutputTemplate: "10\n-1\n30",
      isHidden: false,
    },
    {
      inputTemplate: "1\n4\nput 1 100\nget 1\nput 2 200\nget 1",
      expectedOutputTemplate: "100\n-1",
      isHidden: false,
    },
    {
      inputTemplate: "3\n7\nput 1 1\nput 2 2\nput 3 3\nget 1\nput 4 4\nget 2\nget 4",
      expectedOutputTemplate: "1\n-1\n4",
      isHidden: true,
    },
    {
      inputTemplate: "2\n5\nput 1 1\nput 2 2\nput 1 10\nget 1\nget 2",
      expectedOutputTemplate: "10\n2",
      isHidden: true,
    },
  ],
  hintTemplate:
    "Use a combination of a Dictionary (for O(1) lookup) and a doubly-linked list (for O(1) eviction). The most recently used item goes to the front; the least recently used is at the back.",
  computeExpectedOutput: (vars, tc) => {
    const input = sub(tc.inputTemplate, vars).trim();
    if (tc.expectedOutputTemplate && !tc.expectedOutputTemplate.includes("{{") && tc.expectedOutputTemplate !== "") {
      return tc.expectedOutputTemplate;
    }
    const lines = input.split("\n");
    const capacity = parseInt(lines[0], 10);
    const cache = new Map<number, number>();
    const order: number[] = [];
    const outputs: string[] = [];

    function touch(key: number): void {
      const idx = order.indexOf(key);
      if (idx !== -1) order.splice(idx, 1);
      order.push(key);
    }

    for (let i = 2; i < lines.length; i++) {
      const parts = lines[i].split(" ");
      if (parts[0] === "put") {
        const k = parseInt(parts[1], 10);
        const v = parseInt(parts[2], 10);
        if (cache.has(k)) {
          cache.set(k, v);
          touch(k);
        } else {
          if (cache.size >= capacity) {
            const evict = order.shift()!;
            cache.delete(evict);
          }
          cache.set(k, v);
          order.push(k);
        }
      } else if (parts[0] === "get") {
        const k = parseInt(parts[1], 10);
        if (cache.has(k)) {
          outputs.push(String(cache.get(k)));
          touch(k);
        } else {
          outputs.push("-1");
        }
      }
    }
    return outputs.join("\n");
  },
};

export const csharpProblems: CodeLabProblem[] = [
  csLevel5,
  csLevel6,
  csLevel15,
  csLevel16,
  csLevel25,
  csLevel26,
];
