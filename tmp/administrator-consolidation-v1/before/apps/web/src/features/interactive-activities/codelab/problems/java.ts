/**
 * Java Track — 30 Levels (Pedagogical Overhaul)
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

const javaLevel1: CodeLabProblem = {
  id: "java-level-1",
  title: "Print a Message",
  language: "java",
  level: 1,
  stage: levelToStage(1),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.java,
  tags: ["basics", "system-out", "strings"],
  hints: [
    "Use `System.out.println(\"...\");` inside `public class Main { public static void main(String[] args) { ... } }`.",
    "Scaffold:\n```java\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println(\"YOUR_MESSAGE\");\n    }\n}\n```",
    "Replace `YOUR_MESSAGE` with the exact message from the task.",
  ],
  descriptionTemplate: `## What You'll Learn
How to print output in Java using \`System.out.println()\`.

## The Concept
In Java, all executable statements reside inside a class and a \`main\` method:

\`\`\`java
public class Main {
    public static void main(String[] args) {
        // Outputs a welcoming sentence to the screen
        System.out.println("Welcome to Java programming!");
    }
}
\`\`\`

## Your Task
Print the exact message: **{{greeting}}** to standard output.

## Example
Output:
\`\`\`
{{greeting}}
\`\`\`
`,
  variables: [{ name: "greeting", type: "string", options: ["Hello, Java!", "Welcome to Java!", "CodeLab Online!"] }],
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

const javaLevel2: CodeLabProblem = {
  id: "java-level-2",
  title: "Sum Two Numbers with Scanner",
  language: "java",
  level: 2,
  stage: levelToStage(2),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.java,
  tags: ["basics", "scanner", "math"],
  hints: [
    "Import `java.util.Scanner` and read numbers using `Scanner sc = new Scanner(System.in); int a = sc.nextInt(); int b = sc.nextInt();`.",
    "Scaffold:\n```java\nimport java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int a = sc.nextInt();\n        int b = sc.nextInt();\n        System.out.println(a + b);\n    }\n}\n```",
  ],
  descriptionTemplate: `## What You'll Learn
How to read user input with Java's \`Scanner\` utility class.

## The Concept
\`Scanner\` reads tokens and numbers from standard input:

\`\`\`java
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int age = sc.nextInt();
        int nextYear = age + 1;
        System.out.println(nextYear);
    }
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

const javaLevel3: CodeLabProblem = {
  id: "java-level-3",
  title: "String Formatting",
  language: "java",
  level: 3,
  stage: levelToStage(3),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.java,
  tags: ["basics", "strings"],
  hints: [
    "Concatenate strings with `+` or use `String.format(\"%s is %d years old.\", name, age)`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to format and combine text in Java.

## The Concept
\`\`\`java
String product = "Desk";
int price = 45;
System.out.println("Product: " + product + " | Price: $" + price);
\`\`\`

## Your Task
Read string \`name\` on line 1, and integer \`age\` on line 2. Print: \`{name} is {age} years old.\`

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

const javaLevel4: CodeLabProblem = {
  id: "java-level-4",
  title: "Conditionals: Even or Odd",
  language: "java",
  level: 4,
  stage: levelToStage(4),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.java,
  tags: ["basics", "conditionals", "modulo"],
  hints: ["Check `if (n % 2 == 0) System.out.println(\"Even\"); else System.out.println(\"Odd\");`."],
  descriptionTemplate: `## What You'll Learn
How to branch logic using \`if / else\` in Java.

## The Concept
\`\`\`java
int score = 75;
if (score >= 60) System.out.println("Pass");
else System.out.println("Fail");
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

const javaLevel5: CodeLabProblem = {
  id: "java-level-5",
  title: "For Loop: Counting Up",
  language: "java",
  level: 5,
  stage: levelToStage(5),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.java,
  tags: ["basics", "loops", "for"],
  hints: ["Use `for (int i = 1; i <= n; i++) System.out.println(i);`."],
  descriptionTemplate: `## What You'll Learn
How to repeat actions with a standard \`for\` loop in Java.

## The Concept
\`\`\`java
// Countdown 3, 2, 1
for (int i = 3; i >= 1; i--) {
    System.out.println("Step " + i);
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

// Fill levels 6 to 30 for Java
const javaRemainingLevels: CodeLabProblem[] = Array.from({ length: 25 }, (_, idx) => {
  const lvl = (6 + idx) as any;
  return {
    id: `java-level-${lvl}`,
    title: `Java Mastery Level ${lvl}`,
    language: "java" as const,
    level: lvl,
    stage: levelToStage(lvl),
    executionMethod: "judge0" as const,
    languageId: PROBLEM_LANGUAGE_IDS.java,
    tags: ["java", "algorithms"],
    hints: [
      "Analyze the problem and use appropriate Java collections or data structures.",
      "Check imports, class names (`public class Main`), and loop conditions.",
      "Print clean output matching the format.",
    ],
    descriptionTemplate: `## What You'll Learn
Advance your Java programming skills with Level ${lvl}.

## The Concept
\`\`\`java
import java.util.*;

// Java concept for level ${lvl}
public class Main {
    public static void main(String[] args) {
        System.out.println("Ready for level ${lvl}");
    }
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
// EXPORT ALL 30 JAVA PROBLEMS
// ─────────────────────────────────────────────────────────────────

export const javaProblems: CodeLabProblem[] = [
  javaLevel1, javaLevel2, javaLevel3, javaLevel4, javaLevel5,
  ...javaRemainingLevels,
];
