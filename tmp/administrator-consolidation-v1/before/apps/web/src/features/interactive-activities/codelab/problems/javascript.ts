/**
 * JavaScript Track — 30 Levels (Pedagogical Overhaul)
 *
 * Rules:
 * 1. "The Concept" teaches the syntax using an INDEPENDENT toy scenario — never giving away the task solution.
 * 2. Clear, beginner-friendly explanations with no jargon barrier.
 * 3. 3-Tier Progressive Hints:
 *    [0]: Tier 1 — Direction & Logic (unlocked at >= 3 failed attempts)
 *    [1]: Tier 2 — Code Structure / Scaffold (unlocked at >= 5 failed attempts)
 *    [2]: Tier 3 — Step-by-Step Walkthrough (unlocked at >= 7 failed attempts)
 */

import {
  CodeLabProblem,
  ProblemTestCase,
  PROBLEM_LANGUAGE_IDS,
  levelToStage,
} from "./types";
import { substituteTemplate } from "../utils/problem-engine";

function sub(template: string, vars: Record<string, string | number>): string {
  return substituteTemplate(template, vars);
}

// ─────────────────────────────────────────────────────────────────
// LEVELS 1–10: BASICS
// ─────────────────────────────────────────────────────────────────

const jsLevel1: CodeLabProblem = {
  id: "javascript-level-1",
  title: "Print a Message",
  language: "javascript",
  level: 1,
  stage: levelToStage(1),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["basics", "console-log", "strings"],
  hints: [
    "Use `console.log(...)` with your message enclosed in double quotes or single quotes.",
    "Scaffold:\n```javascript\nconsole.log(\"YOUR_MESSAGE_HERE\");\n```",
    "Replace `YOUR_MESSAGE_HERE` with the exact text requested in the task.",
  ],
  descriptionTemplate: `## What You'll Learn
How to display output in the console using JavaScript's \`console.log()\`.

## The Concept
In JavaScript, \`console.log()\` prints text or variables to the terminal:

\`\`\`javascript
// Displays a friendly message
console.log("Welcome to JavaScript!");
\`\`\`

## Your Task
Print the exact message: **{{greeting}}** to standard output.

## Example
Output:
\`\`\`
{{greeting}}
\`\`\`
`,
  variables: [{ name: "greeting", type: "string", options: ["Hello, JavaScript!", "Welcome to JS!", "CodeLab Online!"] }],
  testCases: [
    {
      label: "Prints greeting",
      inputTemplate: "",
      expectedOutputTemplate: "{{greeting}}",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => sub(tc.expectedOutputTemplate, vars),
};

const jsLevel2: CodeLabProblem = {
  id: "javascript-level-2",
  title: "Sum Two Numbers",
  language: "javascript",
  level: 2,
  stage: levelToStage(2),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["basics", "math", "variables"],
  hints: [
    "Read lines from input using `readline()` or `fs.readFileSync(0, 'utf-8').trim().split('\\n')` and convert to `Number()`.",
    "Scaffold:\n```javascript\nconst fs = require('fs');\nconst [a, b] = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/).map(Number);\nconsole.log(a + b);\n```",
    "Add `a + b` and print with `console.log(a + b)`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to perform addition on numbers using the \`+\` operator.

## The Concept
Numbers in JavaScript support standard math operations (\`+\`, \`-\`, \`*\`, \`/\`). When reading text input, convert text to numbers with \`Number()\` or \`parseInt()\`:

\`\`\`javascript
const input = "25";
const age = Number(input);
const nextYear = age + 1;
console.log(nextYear); // 26
\`\`\`

## Your Task
Read two integers from input and print their sum.

## Example
Input:
\`\`\`
{{a}}
{{b}}
\`\`\`
Output:
\`\`\`
CALC_SUM
\`\`\`
`,
  variables: [{ name: "a", type: "number", min: 10, max: 50 }, { name: "b", type: "number", min: 5, max: 30 }],
  testCases: [
    {
      label: "Calculates sum of two numbers",
      inputTemplate: "{{a}}\n{{b}}",
      expectedOutputTemplate: "CALC_SUM",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_SUM") {
      return String(Number(vars.a) + Number(vars.b));
    }
    return tc.expectedOutputTemplate;
  },
};

const jsLevel3: CodeLabProblem = {
  id: "javascript-level-3",
  title: "Template Literals",
  language: "javascript",
  level: 3,
  stage: levelToStage(3),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["basics", "strings", "template-literals"],
  hints: [
    "Use backticks `` ` `` to enclose your string and `${variable}` to insert values.",
    "Scaffold:\n```javascript\nconst fs = require('fs');\nconst [name, age] = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);\nconsole.log(`${name} is ${age} years old.`);\n```",
    "Make sure the sentence ends with a period `.`: `${name} is ${age} years old.`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to interpolate variables cleanly using JavaScript **Template Literals** (\`\${var}\`).

## The Concept
Backtick strings allow you to inject JavaScript expressions directly inside \`\${ }\`:

\`\`\`javascript
const product = "Desk Lamp";
const cost = 29;
console.log("Product: " + product + " | Cost: $" + cost);
\`\`\`

## Your Task
Read two lines:
1. Name (\`string\`)
2. Age (\`number\`)

Print: \`{name} is {age} years old.\`

## Example
Input:
\`\`\`
{{name}}
{{age}}
\`\`\`
Output:
\`\`\`
{{name}} is {{age}} years old.
\`\`\`
`,
  variables: [
    { name: "name", type: "string", options: ["Alice", "Liam", "Maya", "Noah"] },
    { name: "age", type: "number", min: 18, max: 30 },
  ],
  testCases: [
    {
      label: "Formats template string",
      inputTemplate: "{{name}}\n{{age}}",
      expectedOutputTemplate: "{{name}} is {{age}} years old.",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => sub(tc.expectedOutputTemplate, vars),
};

const jsLevel4: CodeLabProblem = {
  id: "javascript-level-4",
  title: "Conditionals: Even or Odd",
  language: "javascript",
  level: 4,
  stage: levelToStage(4),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["basics", "conditionals", "modulo"],
  hints: [
    "Check `if (num % 2 === 0)` to test if the number is even.",
    "Scaffold:\n```javascript\nconst fs = require('fs');\nconst num = Number(fs.readFileSync(0, 'utf-8').trim());\nif (num % 2 === 0) {\n    console.log(\"Even\");\n} else {\n    console.log(\"Odd\");\n}\n```",
    "Ensure the output matches `Even` or `Odd` with a capital first letter.",
  ],
  descriptionTemplate: `## What You'll Learn
How to use \`if / else\` conditions and the modulo operator (\`%\`).

## The Concept
The modulo operator (\`%\`) returns the remainder of division:

\`\`\`javascript
const score = 75;
if (score >= 60) {
    console.log("Passed");
} else {
    console.log("Needs improvement");
}
\`\`\`

If \`num % 2 === 0\`, the number divides evenly into pairs (**Even**); otherwise it is **Odd**.

## Your Task
Read an integer from input. If even, print \`Even\`; if odd, print \`Odd\`.

## Example
Input:
\`\`\`
{{num}}
\`\`\`
Output:
\`\`\`
CALC_PARITY
\`\`\`
`,
  variables: [{ name: "num", type: "number", min: 1, max: 99 }],
  testCases: [
    {
      label: "Determines parity",
      inputTemplate: "{{num}}",
      expectedOutputTemplate: "CALC_PARITY",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_PARITY") {
      return Number(vars.num) % 2 === 0 ? "Even" : "Odd";
    }
    return tc.expectedOutputTemplate;
  },
};

const jsLevel5: CodeLabProblem = {
  id: "javascript-level-5",
  title: "For Loop: Counting Up",
  language: "javascript",
  level: 5,
  stage: levelToStage(5),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["basics", "loops", "for"],
  hints: [
    "Use a loop: `for (let i = 1; i <= n; i++) console.log(i);`.",
    "Scaffold:\n```javascript\nconst fs = require('fs');\nconst limit = Number(fs.readFileSync(0, 'utf-8').trim());\nfor (let i = 1; i <= limit; i++) {\n    console.log(i);\n}\n```",
    "Ensure your loop starts at 1 and includes `limit`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to loop through numbers sequentially with a \`for\` loop.

## The Concept
A \`for\` loop repeats a code block while incrementing a counter:

\`\`\`javascript
// Count down 3, 2, 1
for (let i = 3; i >= 1; i--) {
    console.log("Step " + i);
}
\`\`\`

## Your Task
Read a positive integer \`N\` from input. Print all numbers from \`1\` to \`N\` (inclusive), each on its own line.

## Example
Input:
\`\`\`
{{limit}}
\`\`\`
Output:
\`\`\`
CALC_COUNT
\`\`\`
`,
  variables: [{ name: "limit", type: "number", min: 3, max: 7 }],
  testCases: [
    {
      label: "Counts 1 to N",
      inputTemplate: "{{limit}}",
      expectedOutputTemplate: "CALC_COUNT",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_COUNT") {
      const n = Number(vars.limit);
      return Array.from({ length: n }, (_, i) => String(i + 1)).join("\n");
    }
    return tc.expectedOutputTemplate;
  },
};

const jsLevel6: CodeLabProblem = {
  id: "javascript-level-6",
  title: "While Loop: Accumulation",
  language: "javascript",
  level: 6,
  stage: levelToStage(6),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["basics", "loops", "while"],
  hints: [
    "Initialize `let total = 0; let i = 1;`. Inside `while (i <= n)`, add `total += i; i++;`.",
    "Print `total` after the loop completes.",
  ],
  descriptionTemplate: `## What You'll Learn
How to accumulate values using a \`while\` loop.

## The Concept
A \`while\` loop runs as long as its condition evaluates to \`true\`:

\`\`\`javascript
// Multiplies numbers 1 * 2 * 3 (Factorial of 3)
let product = 1;
let count = 1;
while (count <= 3) {
    product *= count;
    count++;
}
console.log(product); // 6
\`\`\`

## Your Task
Read an integer \`N\` from input. Compute and print the sum of all integers from \`1\` to \`N\` ($1 + 2 + \\dots + N$).

## Example
Input:
\`\`\`
{{n}}
\`\`\`
Output:
\`\`\`
CALC_ACCUM
\`\`\`
`,
  variables: [{ name: "n", type: "number", min: 4, max: 12 }],
  testCases: [
    {
      label: "Accumulates sum 1 to N",
      inputTemplate: "{{n}}",
      expectedOutputTemplate: "CALC_ACCUM",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_ACCUM") {
      const n = Number(vars.n);
      return String((n * (n + 1)) / 2);
    }
    return tc.expectedOutputTemplate;
  },
};

const jsLevel7: CodeLabProblem = {
  id: "javascript-level-7",
  title: "Array Sum with reduce",
  language: "javascript",
  level: 7,
  stage: levelToStage(7),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["basics", "arrays", "reduce"],
  hints: [
    "Split the input string by spaces: `const nums = str.split(' ').map(Number);`.",
    "Use `.reduce((acc, curr) => acc + curr, 0)` or a `for...of` loop to sum them.",
    "Print the total sum with `console.log(sum)`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to split strings into arrays and aggregate values with array methods like \`.reduce()\`.

## The Concept
Arrays store sequences of items. You can iterate with \`for...of\` or aggregate with \`.reduce()\`:

\`\`\`javascript
const scores = [10, 20, 30];
const total = scores.reduce((sum, val) => sum + val, 0);
console.log(total); // 60
\`\`\`

## Your Task
Read space-separated integers, compute the sum of all array elements, and print the total.

## Example
Input:
\`\`\`
{{nums}}
\`\`\`
Output:
\`\`\`
CALC_ARRAY_SUM
\`\`\`
`,
  variables: [{ name: "nums", type: "string", options: ["2 4 6 8", "10 20 30 40", "1 3 5 7 9"] }],
  testCases: [
    {
      label: "Sums array elements",
      inputTemplate: "{{nums}}",
      expectedOutputTemplate: "CALC_ARRAY_SUM",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_ARRAY_SUM") {
      const arr = String(vars.nums).split(" ").map(Number);
      return String(arr.reduce((acc, v) => acc + v, 0));
    }
    return tc.expectedOutputTemplate;
  },
};

const jsLevel8: CodeLabProblem = {
  id: "javascript-level-8",
  title: "Writing Functions & Arrow Functions",
  language: "javascript",
  level: 8,
  stage: levelToStage(8),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["basics", "functions", "arrow-functions"],
  hints: [
    "Define an arrow function: `const square = x => x * x;`.",
    "Read the integer, invoke `square(val)`, and print the returned value.",
  ],
  descriptionTemplate: `## What You'll Learn
How to write concise arrow functions in JavaScript (\`const fn = x => ...\`).

## The Concept
Arrow functions provide a clean shorthand for declaring functions:

\`\`\`javascript
const double = x => x * 2;
console.log(double(7)); // 14
\`\`\`

## Your Task
Create a function \`square(x)\` that returns $x^2$. Read an integer from input, call \`square\`, and print the result.

## Example
Input:
\`\`\`
{{val}}
\`\`\`
Output:
\`\`\`
CALC_SQUARE
\`\`\`
`,
  variables: [{ name: "val", type: "number", min: 3, max: 12 }],
  testCases: [
    {
      label: "Computes square",
      inputTemplate: "{{val}}",
      expectedOutputTemplate: "CALC_SQUARE",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_SQUARE") {
      const v = Number(vars.val);
      return String(v * v);
    }
    return tc.expectedOutputTemplate;
  },
};

const jsLevel9: CodeLabProblem = {
  id: "javascript-level-9",
  title: "Finding the Maximum: Math.max",
  language: "javascript",
  level: 9,
  stage: levelToStage(9),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["basics", "math", "spread"],
  hints: [
    "Use the spread operator `...` with `Math.max(...nums)`.",
    "Scaffold:\n```javascript\nconst fs = require('fs');\nconst nums = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/).map(Number);\nconsole.log(Math.max(...nums));\n```",
  ],
  descriptionTemplate: `## What You'll Learn
How to find extreme values using \`Math.max()\` and the spread operator (\`...\`).

## The Concept
\`Math.min()\` and \`Math.max()\` find minimum and maximum numbers from a list of arguments:

\`\`\`javascript
const prices = [45, 12, 89, 23];
console.log(Math.min(...prices)); // 12
\`\`\`

## Your Task
Read space-separated integers and print the **maximum** value in the list.

## Example
Input:
\`\`\`
{{arr}}
\`\`\`
Output:
\`\`\`
CALC_MAX
\`\`\`
`,
  variables: [{ name: "arr", type: "string", options: ["14 82 45 99 23", "5 -2 18 3 0", "100 250 80 400 120"] }],
  testCases: [
    {
      label: "Finds max number",
      inputTemplate: "{{arr}}",
      expectedOutputTemplate: "CALC_MAX",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_MAX") {
      const nums = String(vars.arr).split(" ").map(Number);
      return String(Math.max(...nums));
    }
    return tc.expectedOutputTemplate;
  },
};

const jsLevel10: CodeLabProblem = {
  id: "javascript-level-10",
  title: "Reversing a String",
  language: "javascript",
  level: 10,
  stage: levelToStage(10),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["basics", "strings", "arrays"],
  hints: [
    "Split the string into characters with `.split('')`, reverse with `.reverse()`, and rejoin with `.join('')`.",
    "Scaffold:\n```javascript\nconst text = fs.readFileSync(0, 'utf-8').trim();\nconsole.log(text.split('').reverse().join(''));\n```",
  ],
  descriptionTemplate: `## What You'll Learn
How to manipulate strings by chaining \`.split()\`, \`.reverse()\`, and \`.join()\`.

## The Concept
Strings in JavaScript can be converted to arrays of characters, transformed, and joined back into text:

\`\`\`javascript
const letters = "c-a-b".split('-');
letters.sort();
console.log(letters.join('')); // "abc"
\`\`\`

## Your Task
Read a string from input and print it reversed.

## Example
Input:
\`\`\`
{{word}}
\`\`\`
Output:
\`\`\`
CALC_REV
\`\`\`
`,
  variables: [{ name: "word", type: "string", options: ["CodeLab", "JavaScript", "Algorithm", "Developer"] }],
  testCases: [
    {
      label: "Reverses string",
      inputTemplate: "{{word}}",
      expectedOutputTemplate: "CALC_REV",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_REV") {
      return String(vars.word).split("").reverse().join("");
    }
    return tc.expectedOutputTemplate;
  },
};

// ─────────────────────────────────────────────────────────────────
// LEVELS 11–20: BUILDING UP
// ─────────────────────────────────────────────────────────────────

const jsLevel11: CodeLabProblem = {
  id: "javascript-level-11",
  title: "Array.prototype.filter",
  language: "javascript",
  level: 11,
  stage: levelToStage(11),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["building-up", "arrays", "filter"],
  hints: [
    "Use `.filter(n => n % 2 === 0)` to select only even numbers.",
    "Join with space: `console.log(evens.join(' '))`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to filter array elements conditionally using \`.filter()\`.

## The Concept
\`.filter()\` creates a new array containing only the elements that satisfy a predicate function:

\`\`\`javascript
const numbers = [10, 25, 30, 45];
const aboveTwenty = numbers.filter(n => n > 20);
console.log(aboveTwenty); // [25, 30, 45]
\`\`\`

## Your Task
Read space-separated integers. Use \`.filter()\` to keep only the **even** numbers, and print them separated by spaces.

## Example
Input:
\`\`\`
{{nums}}
\`\`\`
Output:
\`\`\`
CALC_EVENS
\`\`\`
`,
  variables: [{ name: "nums", type: "string", options: ["1 2 3 4 5 6 7 8", "11 14 17 20 23 26", "5 10 15 20"] }],
  testCases: [
    {
      label: "Filters even numbers",
      inputTemplate: "{{nums}}",
      expectedOutputTemplate: "CALC_EVENS",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_EVENS") {
      const nums = String(vars.nums).split(" ").map(Number);
      return nums.filter((x) => x % 2 === 0).join(" ");
    }
    return tc.expectedOutputTemplate;
  },
};

const jsLevel12: CodeLabProblem = {
  id: "javascript-level-12",
  title: "Object Lookups & Map",
  language: "javascript",
  level: 12,
  stage: levelToStage(12),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["building-up", "objects", "map"],
  hints: [
    "Parse pairs `k:v` into an Object or `Map`: `const map = Object.fromEntries(pairs.map(p => p.split(':')));`.",
    "Print `map[query] || 'Not Found'`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to store and look up data by key using JavaScript Objects and Maps.

## The Concept
Objects store key-value mappings:

\`\`\`javascript
const capitals = { France: "Paris", Japan: "Tokyo" };
console.log(capitals["Japan"] || "Unknown"); // Tokyo
console.log(capitals["Brazil"] || "Unknown"); // Unknown
\`\`\`

## Your Task
You are given space-separated \`Key:Value\` pairs on line 1, and a query key on line 2.
Print the associated value, or \`Not Found\` if the key is missing.

## Example
Input:
\`\`\`
{{pairs}}
{{query}}
\`\`\`
Output:
\`\`\`
CALC_LOOKUP
\`\`\`
`,
  variables: [
    { name: "pairs", type: "string", options: ["apple:red banana:yellow grape:purple", "cat:meow dog:woof cow:moo"] },
    { name: "query", type: "string", options: ["banana", "dog", "lion", "apple"] },
  ],
  testCases: [
    {
      label: "Performs key-value lookup",
      inputTemplate: "{{pairs}}\n{{query}}",
      expectedOutputTemplate: "CALC_LOOKUP",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_LOOKUP") {
      const pairs = String(vars.pairs).split(" ");
      const map: Record<string, string> = {};
      for (const p of pairs) {
        const [k, v] = p.split(":");
        map[k] = v;
      }
      return map[String(vars.query)] || "Not Found";
    }
    return tc.expectedOutputTemplate;
  },
};

const jsLevel13: CodeLabProblem = {
  id: "javascript-level-13",
  title: "Set: Unique Elements",
  language: "javascript",
  level: 13,
  stage: levelToStage(13),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["building-up", "sets"],
  hints: [
    "Pass an array into `new Set(items)` to strip duplicates.",
    "Convert back to array `[...new Set(items)]`, sort with `.sort()`, and join with spaces.",
  ],
  descriptionTemplate: `## What You'll Learn
How to eliminate duplicates using JavaScript's \`Set\` collection.

## The Concept
A \`Set\` automatically enforces uniqueness among its elements:

\`\`\`javascript
const tags = ["js", "node", "js", "react", "node"];
const unique = [...new Set(tags)];
console.log(unique.length); // 3
\`\`\`

## Your Task
Read space-separated strings, eliminate all duplicates, sort in alphabetical order, and print separated by spaces.

## Example
Input:
\`\`\`
{{items}}
\`\`\`
Output:
\`\`\`
CALC_UNIQUE
\`\`\`
`,
  variables: [{ name: "items", type: "string", options: ["dog cat bird dog cat fish", "b a c b a d", "apple orange banana apple"] }],
  testCases: [
    {
      label: "Extracts sorted unique elements",
      inputTemplate: "{{items}}",
      expectedOutputTemplate: "CALC_UNIQUE",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_UNIQUE") {
      const words = String(vars.items).split(" ");
      const u = Array.from(new Set(words)).sort();
      return u.join(" ");
    }
    return tc.expectedOutputTemplate;
  },
};

const jsLevel14: CodeLabProblem = {
  id: "javascript-level-14",
  title: "Destructuring & Rest Parameters",
  language: "javascript",
  level: 14,
  stage: levelToStage(14),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["building-up", "destructuring", "rest"],
  hints: [
    "Use array destructuring with rest syntax: `const [first, ...rest] = items;`.",
    "Print `First: ${first}, Remaining: ${rest.length}`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to unpack arrays and objects using destructuring and rest syntax (\`...rest\`).

## The Concept
Destructuring unpacks values directly into named variables:

\`\`\`javascript
const [head, ...tail] = ["Apple", "Banana", "Cherry"];
console.log("Head: " + head + " | Tail items: " + tail.length);
\`\`\`

## Your Task
Read space-separated words. Unpack the first item as \`first\`, and the rest as \`rest\`.
Print in this format: \`First: {first}, Remaining: {rest.length}\`

## Example
Input:
\`\`\`
{{words}}
\`\`\`
Output:
\`\`\`
CALC_DEST
\`\`\`
`,
  variables: [{ name: "words", type: "string", options: ["Alpha Beta Gamma Delta", "One Two Three", "Sun Moon Stars Galaxy"] }],
  testCases: [
    {
      label: "Unpacks with destructuring",
      inputTemplate: "{{words}}",
      expectedOutputTemplate: "CALC_DEST",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_DEST") {
      const [first, ...rest] = String(vars.words).split(" ");
      return `First: ${first}, Remaining: ${rest.length}`;
    }
    return tc.expectedOutputTemplate;
  },
};

const jsLevel15: CodeLabProblem = {
  id: "javascript-level-15",
  title: "ES6 Classes & Methods",
  language: "javascript",
  level: 15,
  stage: levelToStage(15),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["building-up", "oop", "classes"],
  hints: [
    "Define `class Rectangle { constructor(w, h) { this.w = w; this.h = h; } getArea() { return this.w * this.h; } }`.",
    "Instantiate with `new Rectangle(w, h)` and call `getArea()`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to define Object-Oriented classes and methods with ES6 \`class\`.

## The Concept
ES6 classes provide a clean blueprint for objects:

\`\`\`javascript
class BankAccount {
    constructor(owner, balance) {
        this.owner = owner;
        this.balance = balance;
    }
    deposit(amount) {
        this.balance += amount;
        return this.balance;
    }
}
\`\`\`

## Your Task
Create a \`Rectangle\` class with \`constructor(width, height)\` and a method \`getArea()\` returning \`width * height\`.
Read two integers (each on its own line), instantiate \`Rectangle\`, and print its area.

## Example
Input:
\`\`\`
{{w}}
{{h}}
\`\`\`
Output:
\`\`\`
CALC_AREA
\`\`\`
`,
  variables: [{ name: "w", type: "number", min: 4, max: 15 }, { name: "h", type: "number", min: 3, max: 10 }],
  testCases: [
    {
      label: "Computes rectangle area via class",
      inputTemplate: "{{w}}\n{{h}}",
      expectedOutputTemplate: "CALC_AREA",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_AREA") {
      return String(Number(vars.w) * Number(vars.h));
    }
    return tc.expectedOutputTemplate;
  },
};

// ─────────────────────────────────────────────────────────────────
// LEVELS 16–30: INTERMEDIATE & ADVANCED
// ─────────────────────────────────────────────────────────────────

const jsLevel16: CodeLabProblem = {
  id: "javascript-level-16",
  title: "JSON Serialization & Parsing",
  language: "javascript",
  level: 16,
  stage: levelToStage(16),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["building-up", "json"],
  hints: ["Use `JSON.parse(str)` to parse a JSON string into an object and access the queried key."],
  descriptionTemplate: `## What You'll Learn
How to parse and access JSON data structures using \`JSON.parse()\`.

## The Concept
\`JSON.parse()\` converts a JSON string into a JavaScript object:

\`\`\`javascript
const raw = '{"title": "LMS", "version": 2}';
const obj = JSON.parse(raw);
console.log(obj.title); // LMS
\`\`\`

## Your Task
Read a JSON string on line 1, and a property key on line 2. Parse the JSON and print the property value.

## Example
Input:
\`\`\`
{{jsonStr}}
{{key}}
\`\`\`
Output:
\`\`\`
CALC_JSON
\`\`\`
`,
  variables: [
    { name: "jsonStr", type: "string", options: ['{"title": "CodeLab", "rating": 5}', '{"user": "Kirby", "status": "active"}'] },
    { name: "key", type: "string", options: ["title", "rating", "user", "status"] },
  ],
  testCases: [
    {
      label: "Parses JSON property",
      inputTemplate: "{{jsonStr}}\n{{key}}",
      expectedOutputTemplate: "CALC_JSON",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_JSON") {
      try {
        const obj = JSON.parse(String(vars.jsonStr));
        return String(obj[String(vars.key)] ?? "Not Found");
      } catch {
        return "Not Found";
      }
    }
    return tc.expectedOutputTemplate;
  },
};

const jsLevel17: CodeLabProblem = {
  id: "javascript-level-17",
  title: "Closures: Counter Function",
  language: "javascript",
  level: 17,
  stage: levelToStage(17),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["getting-good", "closures"],
  hints: ["A closure is an inner function that remembers the outer scope variables."],
  descriptionTemplate: `## What You'll Learn
How JavaScript functions retain access to their outer scope through **Closures**.

## The Concept
\`\`\`javascript
function createMultiplier(multiplier) {
    return function(num) {
        return num * multiplier;
    };
}
const triple = createMultiplier(3);
console.log(triple(5)); // 15
\`\`\`

## Your Task
Write a function \`createCounter(start)\` that returns a function which increments and returns \`start\` each time it is called.
Read \`start\` and \`times\`, invoke the counter \`times\` times, and print the final value.

## Example
Input:
\`\`\`
{{start}}
{{times}}
\`\`\`
Output:
\`\`\`
CALC_CLOSURE
\`\`\`
`,
  variables: [{ name: "start", type: "number", min: 1, max: 10 }, { name: "times", type: "number", min: 2, max: 5 }],
  testCases: [
    {
      label: "Tests closure counter",
      inputTemplate: "{{start}}\n{{times}}",
      expectedOutputTemplate: "CALC_CLOSURE",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_CLOSURE") {
      return String(Number(vars.start) + Number(vars.times));
    }
    return tc.expectedOutputTemplate;
  },
};

const jsLevel18: CodeLabProblem = {
  id: "javascript-level-18",
  title: "Regular Expressions (RegEx)",
  language: "javascript",
  level: 18,
  stage: levelToStage(18),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["getting-good", "regex"],
  hints: ["Use `text.match(/\\d+/g)` to extract all digit sequences from a string."],
  descriptionTemplate: `## What You'll Learn
How to pattern-match text using Regular Expressions (\`RegExp\`).

## The Concept
\`\`\`javascript
const text = "Item 45 costs 99 dollars";
const numbers = text.match(/\\d+/g);
console.log(numbers); // ["45", "99"]
\`\`\`

## Your Task
Read a string containing mixed words and numbers. Extract all numbers and print their sum.

## Example
Input:
\`\`\`
{{rawText}}
\`\`\`
Output:
\`\`\`
CALC_REGEX_SUM
\`\`\`
`,
  variables: [{ name: "rawText", type: "string", options: ["order 10 and 20 items", "score 5 plus 15 and 25", "val 100 extra 50"] }],
  testCases: [
    {
      label: "Extracts and sums digits",
      inputTemplate: "{{rawText}}",
      expectedOutputTemplate: "CALC_REGEX_SUM",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_REGEX_SUM") {
      const matches = String(vars.rawText).match(/\d+/g) || [];
      return String(matches.map(Number).reduce((a, b) => a + b, 0));
    }
    return tc.expectedOutputTemplate;
  },
};

const jsLevel19: CodeLabProblem = {
  id: "javascript-level-19",
  title: "Stack (LIFO)",
  language: "javascript",
  level: 19,
  stage: levelToStage(19),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["getting-good", "data-structures", "stack"],
  hints: ["Push items onto an array with `.push()` and retrieve in reverse with `.pop()`."],
  descriptionTemplate: `## What You'll Learn
How to use JavaScript arrays as Last-In-First-Out stacks.

## The Concept
\`\`\`javascript
const s = [];
s.push("A"); s.push("B");
console.log(s.pop()); // "B"
\`\`\`

## Your Task
Read space-separated words, push them onto a stack, and print them popped one by one.

## Example
Input:
\`\`\`
{{words}}
\`\`\`
Output:
\`\`\`
CALC_STACK
\`\`\`
`,
  variables: [{ name: "words", type: "string", options: ["alpha beta gamma", "first second third", "red green blue"] }],
  testCases: [
    {
      label: "Pops in LIFO order",
      inputTemplate: "{{words}}",
      expectedOutputTemplate: "CALC_STACK",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_STACK") {
      return String(vars.words).split(" ").reverse().join(" ");
    }
    return tc.expectedOutputTemplate;
  },
};

const jsLevel20: CodeLabProblem = {
  id: "javascript-level-20",
  title: "Queue (FIFO)",
  language: "javascript",
  level: 20,
  stage: levelToStage(20),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["getting-good", "data-structures", "queue"],
  hints: ["Enqueue with `.push()` and dequeue with `.shift()`."],
  descriptionTemplate: `## What You'll Learn
How to process items in First-In-First-Out queue order.

## The Concept
\`\`\`javascript
const q = ["Customer 1", "Customer 2"];
q.push("Customer 3");
console.log(q.shift()); // "Customer 1"
\`\`\`

## Your Task
Read space-separated names on line 1 and integer \`K\` on line 2. Dequeue \`K\` times and print the item at the front.

## Example
Input:
\`\`\`
{{qItems}}
{{k}}
\`\`\`
Output:
\`\`\`
CALC_Q_FRONT
\`\`\`
`,
  variables: [
    { name: "qItems", type: "string", options: ["Alice Bob Charlie David Emma", "A B C D E"] },
    { name: "k", type: "number", min: 1, max: 2 },
  ],
  testCases: [
    {
      label: "Dequeues K items and prints next",
      inputTemplate: "{{qItems}}\n{{k}}",
      expectedOutputTemplate: "CALC_Q_FRONT",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_Q_FRONT") {
      const items = String(vars.qItems).split(" ");
      const k = Number(vars.k);
      return items[k] || "Empty";
    }
    return tc.expectedOutputTemplate;
  },
};

const jsLevel21: CodeLabProblem = {
  id: "javascript-level-21",
  title: "OOP: Inheritance with extends",
  language: "javascript",
  level: 21,
  stage: levelToStage(21),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["getting-good", "oop", "inheritance"],
  hints: ["Use `class Dog extends Animal` and call `super()` in constructor if overriding."],
  descriptionTemplate: `## What You'll Learn
How to extend classes with inheritance in ES6.

## The Concept
\`\`\`javascript
class Vehicle { start() { return "Engine on"; } }
class ElectricCar extends Vehicle { start() { return "Silent start"; } }
\`\`\`

## Your Task
Create base class \`Animal\` with \`speak()\` returning \`"Some Sound"\`, \`Dog\` returning \`"Woof!"\`, and \`Cat\` returning \`"Meow!"\`.
Read an animal type and print its \`speak()\` sound.

## Example
Input:
\`\`\`
{{atype}}
\`\`\`
Output:
\`\`\`
CALC_SOUND
\`\`\`
`,
  variables: [{ name: "atype", type: "string", options: ["Dog", "Cat"] }],
  testCases: [
    {
      label: "Calls overridden speak",
      inputTemplate: "{{atype}}",
      expectedOutputTemplate: "CALC_SOUND",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_SOUND") {
      return String(vars.atype) === "Dog" ? "Woof!" : "Meow!";
    }
    return tc.expectedOutputTemplate;
  },
};

const jsLevel22: CodeLabProblem = {
  id: "javascript-level-22",
  title: "Higher-Order Functions: Composition",
  language: "javascript",
  level: 22,
  stage: levelToStage(22),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["getting-good", "functional"],
  hints: ["Function composition combines `f(g(x))` into a pipeline."],
  descriptionTemplate: `## What You'll Learn
How to compose pure functions together into pipelines.

## The Concept
\`\`\`javascript
const addTwo = x => x + 2;
const triple = x => x * 3;
const pipeline = x => triple(addTwo(x));
console.log(pipeline(4)); // (4 + 2) * 3 = 18
\`\`\`

## Your Task
Create a pipeline that adds 5 to a number, then squares the result: $(x + 5)^2$.
Read an integer and print the computed pipeline value.

## Example
Input:
\`\`\`
{{x}}
\`\`\`
Output:
\`\`\`
CALC_PIPE
\`\`\`
`,
  variables: [{ name: "x", type: "number", min: 2, max: 8 }],
  testCases: [
    {
      label: "Evaluates functional pipeline",
      inputTemplate: "{{x}}",
      expectedOutputTemplate: "CALC_PIPE",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_PIPE") {
      const v = Number(vars.x) + 5;
      return String(v * v);
    }
    return tc.expectedOutputTemplate;
  },
};

const jsLevel23: CodeLabProblem = {
  id: "javascript-level-23",
  title: "Recursion: Factorial",
  language: "javascript",
  level: 23,
  stage: levelToStage(23),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["getting-good", "recursion"],
  hints: ["Base case: `if (n <= 1) return 1; return n * factorial(n - 1);`."],
  descriptionTemplate: `## What You'll Learn
How to solve problems recursively by calling a function from itself.

## The Concept
\`\`\`javascript
function countdown(n) {
    if (n <= 0) return;
    console.log(n);
    countdown(n - 1);
}
\`\`\`

## Your Task
Implement a recursive \`factorial(n)\` function that calculates $N!$. Read $N$ and print its factorial.

## Example
Input:
\`\`\`
{{factN}}
\`\`\`
Output:
\`\`\`
CALC_FACT
\`\`\`
`,
  variables: [{ name: "factN", type: "number", min: 4, max: 9 }],
  testCases: [
    {
      label: "Computes factorial recursively",
      inputTemplate: "{{factN}}",
      expectedOutputTemplate: "CALC_FACT",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_FACT") {
      let n = Number(vars.factN);
      let res = 1;
      for (let i = 2; i <= n; i++) res *= i;
      return String(res);
    }
    return tc.expectedOutputTemplate;
  },
};

const jsLevel24: CodeLabProblem = {
  id: "javascript-level-24",
  title: "Binary Search",
  language: "javascript",
  level: 24,
  stage: levelToStage(24),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["getting-good", "algorithms", "binary-search"],
  hints: ["Split search space with `mid = Math.floor((left + right) / 2)`."],
  descriptionTemplate: `## What You'll Learn
How to search sorted arrays in $O(\\log N)$ time with Binary Search.

## The Concept
\`\`\`javascript
function bSearch(arr, t) {
    let l = 0, r = arr.length - 1;
    while (l <= r) {
        let m = Math.floor((l + r) / 2);
        if (arr[m] === t) return m;
        if (arr[m] < t) l = m + 1;
        else r = m - 1;
    }
    return -1;
}
\`\`\`

## Your Task
Read sorted integers on line 1, and target on line 2. Print the 0-based index or \`-1\`.

## Example
Input:
\`\`\`
{{sarr}}
{{starget}}
\`\`\`
Output:
\`\`\`
CALC_BSEARCH
\`\`\`
`,
  variables: [
    { name: "sarr", type: "string", options: ["2 5 8 12 16 23 38 56", "10 20 30 40 50"] },
    { name: "starget", type: "number", min: 12, max: 38 },
  ],
  testCases: [
    {
      label: "Finds index via binary search",
      inputTemplate: "{{sarr}}\n{{starget}}",
      expectedOutputTemplate: "CALC_BSEARCH",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_BSEARCH") {
      const arr = String(vars.sarr).split(" ").map(Number);
      return String(arr.indexOf(Number(vars.starget)));
    }
    return tc.expectedOutputTemplate;
  },
};

const jsLevel25: CodeLabProblem = {
  id: "javascript-level-25",
  title: "Two Pointers: Palindrome Check",
  language: "javascript",
  level: 25,
  stage: levelToStage(25),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["getting-good", "two-pointers"],
  hints: ["Compare `s[l] !== s[r]` with two pointers advancing inward."],
  descriptionTemplate: `## What You'll Learn
How to check symmetry with $O(1)$ space using Two Pointers.

## The Concept
\`\`\`javascript
function isSymmetric(arr) {
    let l = 0, r = arr.length - 1;
    while (l < r) {
        if (arr[l] !== arr[r]) return false;
        l++; r--;
    }
    return true;
}
\`\`\`

## Your Task
Read a string and print \`True\` if it is a palindrome, otherwise \`False\`.

## Example
Input:
\`\`\`
{{palinWord}}
\`\`\`
Output:
\`\`\`
CALC_PALIN
\`\`\`
`,
  variables: [{ name: "palinWord", type: "string", options: ["racecar", "level", "deified", "javascript", "developer"] }],
  testCases: [
    {
      label: "Checks palindrome",
      inputTemplate: "{{palinWord}}",
      expectedOutputTemplate: "CALC_PALIN",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_PALIN") {
      const s = String(vars.palinWord);
      return s === s.split("").reverse().join("") ? "True" : "False";
    }
    return tc.expectedOutputTemplate;
  },
};

const jsLevel26: CodeLabProblem = {
  id: "javascript-level-26",
  title: "Sliding Window: Max Subarray K",
  language: "javascript",
  level: 26,
  stage: levelToStage(26),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["getting-good", "algorithms", "sliding-window"],
  hints: ["Update the window in $O(1)$ by adding the incoming element and subtracting the outgoing element."],
  descriptionTemplate: `## What You'll Learn
How to find maximum subarray sums in $O(N)$ with Sliding Window.

## The Concept
\`\`\`javascript
const arr = [1, 4, 2, 10, 2, 3];
let cur = arr[0] + arr[1];
let max = cur;
for (let i = 2; i < arr.length; i++) {
    cur += arr[i] - arr[i - 2];
    max = Math.max(max, cur);
}
console.log(max); // 12
\`\`\`

## Your Task
Read space-separated integers on line 1, and integer \`K\` on line 2. Print maximum subarray sum of size \`K\`.

## Example
Input:
\`\`\`
{{wArr}}
{{wSize}}
\`\`\`
Output:
\`\`\`
CALC_SLIDING_MAX
\`\`\`
`,
  variables: [
    { name: "wArr", type: "string", options: ["2 1 5 1 3 2", "1 9 -1 -2 7 3", "10 20 30 40 50"] },
    { name: "wSize", type: "number", min: 2, max: 3 },
  ],
  testCases: [
    {
      label: "Computes max subarray sum",
      inputTemplate: "{{wArr}}\n{{wSize}}",
      expectedOutputTemplate: "CALC_SLIDING_MAX",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_SLIDING_MAX") {
      const arr = String(vars.wArr).split(" ").map(Number);
      const k = Number(vars.wSize);
      let cur = 0;
      for (let i = 0; i < k; i++) cur += arr[i];
      let max = cur;
      for (let i = k; i < arr.length; i++) {
        cur += arr[i] - arr[i - k];
        if (cur > max) max = cur;
      }
      return String(max);
    }
    return tc.expectedOutputTemplate;
  },
};

const jsLevel27: CodeLabProblem = {
  id: "javascript-level-27",
  title: "Dynamic Programming: Longest Increasing Subsequence",
  language: "javascript",
  level: 27,
  stage: levelToStage(27),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["getting-good", "algorithms", "dp"],
  hints: ["Initialize `dp = new Array(N).fill(1)` and update `dp[i] = Math.max(dp[i], dp[j] + 1)`."],
  descriptionTemplate: `## What You'll Learn
How to solve optimization problems with Dynamic Programming.

## The Concept
\`\`\`javascript
const dp = [0, 1];
for (let i = 2; i <= 6; i++) dp[i] = dp[i - 1] + dp[i - 2];
console.log(dp[6]); // 8
\`\`\`

## Your Task
Read space-separated integers. Find and print the length of the Longest Strictly Increasing Subsequence.

## Example
Input:
\`\`\`
{{lisArr}}
\`\`\`
Output:
\`\`\`
CALC_LIS
\`\`\`
`,
  variables: [
    { name: "lisArr", type: "string", options: ["10 9 2 5 3 7 101 18", "0 1 0 3 2 3", "7 7 7 7 7"] },
  ],
  testCases: [
    {
      label: "Computes LIS length",
      inputTemplate: "{{lisArr}}",
      expectedOutputTemplate: "CALC_LIS",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_LIS") {
      const nums = String(vars.lisArr).split(" ").map(Number);
      if (nums.length === 0) return "0";
      const dp = new Array(nums.length).fill(1);
      for (let i = 1; i < nums.length; i++) {
        for (let j = 0; j < i; j++) {
          if (nums[i] > nums[j]) {
            dp[i] = Math.max(dp[i], dp[j] + 1);
          }
        }
      }
      return String(Math.max(...dp));
    }
    return tc.expectedOutputTemplate;
  },
};

const jsLevel28: CodeLabProblem = {
  id: "javascript-level-28",
  title: "Graph BFS: Shortest Path",
  language: "javascript",
  level: 28,
  stage: levelToStage(28),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["getting-good", "graphs", "bfs"],
  hints: ["Use a queue and visited set to explore nodes layer-by-layer."],
  descriptionTemplate: `## What You'll Learn
How to find shortest distances in unweighted graphs with Breadth-First Search (BFS).

## The Concept
\`\`\`javascript
const q = [[start, 0]];
const visited = new Set([start]);
\`\`\`

## Your Task
Read space-separated edges \`u-v\` on line 1, and \`start target\` on line 2. Print shortest distance or \`-1\`.

## Example
Input:
\`\`\`
{{edges}}
{{query}}
\`\`\`
Output:
\`\`\`
CALC_BFS
\`\`\`
`,
  variables: [
    { name: "edges", type: "string", options: ["A-B B-C C-D A-C", "1-2 2-3 3-4 1-4"] },
    { name: "query", type: "string", options: ["A D", "1 3"] },
  ],
  testCases: [
    {
      label: "Computes BFS distance",
      inputTemplate: "{{edges}}\n{{query}}",
      expectedOutputTemplate: "CALC_BFS",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_BFS") {
      const edges = String(vars.edges).split(" ");
      const [start, target] = String(vars.query).split(" ");
      const adj: Record<string, string[]> = {};
      for (const e of edges) {
        const [u, v] = e.split("-");
        if (!adj[u]) adj[u] = [];
        if (!adj[v]) adj[v] = [];
        adj[u].push(v);
        adj[v].push(u);
      }
      const q: Array<[string, number]> = [[start, 0]];
      const visited = new Set<string>([start]);
      while (q.length > 0) {
        const [node, dist] = q.shift()!;
        if (node === target) return String(dist);
        for (const nxt of adj[node] || []) {
          if (!visited.has(nxt)) {
            visited.add(nxt);
            q.push([nxt, dist + 1]);
          }
        }
      }
      return "-1";
    }
    return tc.expectedOutputTemplate;
  },
};

const jsLevel29: CodeLabProblem = {
  id: "javascript-level-29",
  title: "Trie (Prefix Tree) Insert & Search",
  language: "javascript",
  level: 29,
  stage: levelToStage(29),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["getting-good", "data-structures", "trie"],
  hints: ["A Trie stores string prefixes in nested objects."],
  descriptionTemplate: `## What You'll Learn
How to efficiently insert and search word prefixes using a **Trie**.

## The Concept
\`\`\`javascript
class TrieNode {
    constructor() { this.children = {}; this.isEnd = false; }
}
\`\`\`

## Your Task
Read space-separated words on line 1, and query prefix on line 2. Print \`true\` if any word starts with the prefix, else \`false\`.

## Example
Input:
\`\`\`
{{words}}
{{prefix}}
\`\`\`
Output:
\`\`\`
CALC_TRIE
\`\`\`
`,
  variables: [
    { name: "words", type: "string", options: ["apple app application apt", "cat car carbon care", "code coder coding codelab"] },
    { name: "prefix", type: "string", options: ["app", "car", "dog", "cod"] },
  ],
  testCases: [
    {
      label: "Checks prefix in Trie",
      inputTemplate: "{{words}}\n{{prefix}}",
      expectedOutputTemplate: "CALC_TRIE",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_TRIE") {
      const words = String(vars.words).split(" ");
      const pref = String(vars.prefix);
      return words.some((w) => w.startsWith(pref)) ? "true" : "false";
    }
    return tc.expectedOutputTemplate;
  },
};

const jsLevel30: CodeLabProblem = {
  id: "javascript-level-30",
  title: "Merge Intervals",
  language: "javascript",
  level: 30,
  stage: levelToStage(30),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.javascript,
  tags: ["getting-good", "algorithms", "intervals"],
  hints: ["Sort intervals by start time, then merge overlapping ranges where `current.start <= previous.end`."],
  descriptionTemplate: `## What You'll Learn
How to merge overlapping intervals in $O(N \\log N)$ time.

## The Concept
\`\`\`javascript
// Intervals [1, 3] and [2, 6] merge into [1, 6]
\`\`\`

## Your Task
Read intervals formatted as \`start-end\` separated by spaces. Merge all overlapping intervals and print in ascending start order separated by spaces.

## Example
Input:
\`\`\`
{{intervals}}
\`\`\`
Output:
\`\`\`
CALC_MERGE
\`\`\`
`,
  variables: [
    { name: "intervals", type: "string", options: ["1-3 2-6 8-10 15-18", "1-4 4-5", "1-5 2-3 4-8"] },
  ],
  testCases: [
    {
      label: "Merges intervals",
      inputTemplate: "{{intervals}}",
      expectedOutputTemplate: "CALC_MERGE",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_MERGE") {
      const raw = String(vars.intervals).split(" ");
      const intervals = raw.map((r) => r.split("-").map(Number) as [number, number]);
      intervals.sort((a, b) => a[0] - b[0]);
      const merged: Array<[number, number]> = [];
      for (const curr of intervals) {
        if (merged.length === 0 || merged[merged.length - 1][1] < curr[0]) {
          merged.push(curr);
        } else {
          merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], curr[1]);
        }
      }
      return merged.map((m) => `${m[0]}-${m[1]}`).join(" ");
    }
    return tc.expectedOutputTemplate;
  },
};

// ─────────────────────────────────────────────────────────────────
// EXPORT ALL 30 JAVASCRIPT PROBLEMS
// ─────────────────────────────────────────────────────────────────

export const javascriptProblems: CodeLabProblem[] = [
  jsLevel1, jsLevel2, jsLevel3, jsLevel4, jsLevel5,
  jsLevel6, jsLevel7, jsLevel8, jsLevel9, jsLevel10,
  jsLevel11, jsLevel12, jsLevel13, jsLevel14, jsLevel15,
  jsLevel16, jsLevel17, jsLevel18, jsLevel19, jsLevel20,
  jsLevel21, jsLevel22, jsLevel23, jsLevel24, jsLevel25,
  jsLevel26, jsLevel27, jsLevel28, jsLevel29, jsLevel30,
];
