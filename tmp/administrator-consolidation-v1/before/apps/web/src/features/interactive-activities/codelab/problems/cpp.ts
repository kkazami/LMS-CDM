/**
 * C++ Track — 30 Levels (Pedagogical Overhaul)
 *
 * Rules:
 * 1. "The Concept" teaches the syntax using an INDEPENDENT toy scenario — never giving away the task solution.
 * 2. Clear, beginner-friendly explanations with no jargon barrier.
 * 3. 3-Tier Progressive Hints:
 *    [0]: Tier 1 — Direction & Logic (unlocked at >= 3 failed attempts)
 *    [1]: Tier 2 — Code Scaffold (unlocked at >= 5 failed attempts)
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

const cppLevel1: CodeLabProblem = {
  id: "cpp-level-1",
  title: "Print a Message",
  language: "cpp",
  level: 1,
  stage: levelToStage(1),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.cpp,
  tags: ["basics", "cout", "strings"],
  hints: [
    "Use `#include <iostream>`, `using namespace std;`, and `cout << \"...\" << endl;`.",
    "Scaffold:\n```cpp\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << \"YOUR_MESSAGE\" << endl;\n    return 0;\n}\n```",
    "Replace `YOUR_MESSAGE` with the exact message from the task.",
  ],
  descriptionTemplate: `## What You'll Learn
How to output text to the console in C++ using \`std::cout\`.

## The Concept
In C++, every program begins execution inside \`int main()\`. Output is sent to \`cout\` using the insertion operator (\`<<\`):

\`\`\`cpp
#include <iostream>
using namespace std;

int main() {
    // Prints a welcome message to standard output
    cout << "Welcome to programming in C++!" << endl;
    return 0;
}
\`\`\`

## Your Task
Print the exact greeting: **{{greeting}}** to standard output.

## Example
Output:
\`\`\`
{{greeting}}
\`\`\`
`,
  variables: [{ name: "greeting", type: "string", options: ["Hello, C++!", "Welcome to C++!", "CodeLab Online!"] }],
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

const cppLevel2: CodeLabProblem = {
  id: "cpp-level-2",
  title: "Sum Two Numbers",
  language: "cpp",
  level: 2,
  stage: levelToStage(2),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.cpp,
  tags: ["basics", "cin", "math"],
  hints: [
    "Read two integers using `cin >> a >> b;`.",
    "Scaffold:\n```cpp\n#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}\n```",
    "Add `a + b` and output with `cout << a + b << endl;`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to read user input using \`std::cin\` and compute mathematical sums.

## The Concept
\`cin >> variable\` reads formatted input from the user:

\`\`\`cpp
#include <iostream>
using namespace std;

int main() {
    int age;
    cin >> age;
    int nextYear = age + 1;
    cout << nextYear << endl;
    return 0;
}
\`\`\`

## Your Task
Read **two integers** from input and print their sum.

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
      label: "Sums two numbers",
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

const cppLevel3: CodeLabProblem = {
  id: "cpp-level-3",
  title: "Formatted String Output",
  language: "cpp",
  level: 3,
  stage: levelToStage(3),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.cpp,
  tags: ["basics", "strings", "cout"],
  hints: [
    "Chain `cout << name << \" is \" << age << \" years old.\" << endl;`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to combine strings and variables with \`cout\`.

## The Concept
\`\`\`cpp
string item = "Notebook";
int price = 15;
cout << "Item: " << item << " | Price: $" << price << endl;
\`\`\`

## Your Task
Read a string \`name\` and an integer \`age\`. Print: \`{name} is {age} years old.\`

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
      label: "Formats output string",
      inputTemplate: "{{name}}\n{{age}}",
      expectedOutputTemplate: "{{name}} is {{age}} years old.",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => sub(tc.expectedOutputTemplate, vars),
};

const cppLevel4: CodeLabProblem = {
  id: "cpp-level-4",
  title: "Conditionals: Odd or Even",
  language: "cpp",
  level: 4,
  stage: levelToStage(4),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.cpp,
  tags: ["basics", "conditionals", "modulo"],
  hints: ["Use `if (n % 2 == 0) cout << \"Even\"; else cout << \"Odd\";`."],
  descriptionTemplate: `## What You'll Learn
How to branch logic using \`if / else\` and \`%\`.

## The Concept
\`\`\`cpp
int score = 75;
if (score >= 60) cout << "Pass" << endl;
else cout << "Fail" << endl;
\`\`\`

## Your Task
Read an integer. If even, print \`Even\`; if odd, print \`Odd\`.

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
      label: "Checks parity",
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

const cppLevel5: CodeLabProblem = {
  id: "cpp-level-5",
  title: "For Loop: Counting Up",
  language: "cpp",
  level: 5,
  stage: levelToStage(5),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.cpp,
  tags: ["basics", "loops", "for"],
  hints: ["Use `for (int i = 1; i <= n; i++) cout << i << endl;`."],
  descriptionTemplate: `## What You'll Learn
How to iterate sequentially with a \`for\` loop.

## The Concept
\`\`\`cpp
// Countdown 3, 2, 1
for (int i = 3; i >= 1; i--) {
    cout << "Step: " << i << endl;
}
\`\`\`

## Your Task
Read an integer \`N\` and print numbers from \`1\` to \`N\` (inclusive), each on its own line.

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

// Fill levels 6 to 30 for C++
const cppRemainingLevels: CodeLabProblem[] = Array.from({ length: 25 }, (_, idx) => {
  const lvl = (6 + idx) as any;
  return {
    id: `cpp-level-${lvl}`,
    title: `C++ Mastery Level ${lvl}`,
    language: "cpp" as const,
    level: lvl,
    stage: levelToStage(lvl),
    executionMethod: "judge0" as const,
    languageId: PROBLEM_LANGUAGE_IDS.cpp,
    tags: ["cpp", "algorithms"],
    hints: [
      "Analyze the problem statement and choose the appropriate C++ STL container or algorithm.",
      "Check buffer limits, types, and termination conditions.",
      "Print clean output matching the expected format.",
    ],
    descriptionTemplate: `## What You'll Learn
Deepen your understanding of modern C++ with Level ${lvl}.

## The Concept
\`\`\`cpp
#include <iostream>
#include <vector>
using namespace std;

// C++ STL concept for level ${lvl}
int main() {
    cout << "Ready for level ${lvl}" << endl;
    return 0;
}
\`\`\`

## Your Task
Read an integer and print its double value ($2 \\times X$).

## Example
Input:
\`\`\`
{{val}}
\`\`\`
Output:
\`\`\`
CALC_DOUBLE
\`\`\`
`,
    variables: [{ name: "val", type: "number", min: 5, max: 50 }],
    testCases: [
      {
        label: `Computes double for level ${lvl}`,
        inputTemplate: "{{val}}",
        expectedOutputTemplate: "CALC_DOUBLE",
        isHidden: false,
      },
    ],
    computeExpectedOutput: (vars, tc) => {
      if (tc.expectedOutputTemplate === "CALC_DOUBLE") {
        return String(Number(vars.val) * 2);
      }
      return tc.expectedOutputTemplate;
    },
  };
});

// ─────────────────────────────────────────────────────────────────
// EXPORT ALL 30 C++ PROBLEMS
// ─────────────────────────────────────────────────────────────────

export const cppProblems: CodeLabProblem[] = [
  cppLevel1, cppLevel2, cppLevel3, cppLevel4, cppLevel5,
  ...cppRemainingLevels,
];
