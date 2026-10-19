/**
 * C# Track — 30 Levels (Pedagogical Overhaul)
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

const csLevel1: CodeLabProblem = {
  id: "csharp-level-1",
  title: "Print a Message",
  language: "csharp",
  level: 1,
  stage: levelToStage(1),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["basics", "console", "strings"],
  hints: [
    "To display text on the screen, use `Console.WriteLine(\"...\");` with your exact message enclosed in double quotes.",
    "Put your print statement inside the `Main` method:\n```csharp\npublic class Program {\n    public static void Main() {\n        Console.WriteLine(\"YOUR_MESSAGE_HERE\");\n    }\n}\n```",
    "Replace `YOUR_MESSAGE_HERE` with the exact text requested in the task (don't forget the semicolon at the end of the line).",
  ],
  descriptionTemplate: `## What You'll Learn
How to display text in the console using C#'s \`Console.WriteLine()\` statement.

## The Concept
In C#, all executable code lives inside a **class** and a **Main method**. To output a line of text to the screen, we pass a string of characters inside double quotes to \`Console.WriteLine()\`:

\`\`\`csharp
using System;

public class Program {
    public static void Main() {
        // Displays a welcoming sentence to the console
        Console.WriteLine("Welcome to programming!");
    }
}
\`\`\`

Notice that every C# statement must end with a semicolon (\`;\`).

## Your Task
Write a program that prints the exact message: **{{greeting}}** to the console.

## Example
Output:
\`\`\`
{{greeting}}
\`\`\`
`,
  variables: [{ name: "greeting", type: "string", options: ["Hello, C#!", "Welcome to C#!", "CodeLab Online!"] }],
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

const csLevel2: CodeLabProblem = {
  id: "csharp-level-2",
  title: "Sum Two Numbers",
  language: "csharp",
  level: 2,
  stage: levelToStage(2),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["basics", "math", "input"],
  hints: [
    "You need to read two separate lines with `Console.ReadLine()`, convert each into a number using `int.Parse()`, and store them in integer variables.",
    "Here is how you can set up the structure:\n```csharp\nint num1 = int.Parse(Console.ReadLine());\nint num2 = int.Parse(Console.ReadLine());\n// Now calculate the sum and print it!\n```",
    "Add `num1 + num2` and print the result with `Console.WriteLine(num1 + num2);`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to read user input from the console and convert text into integers using \`int.Parse()\`.

## The Concept
When a user types into the console, \`Console.ReadLine()\` captures it as **text** (\`string\`). To do arithmetic, we convert the text into an integer (\`int\`) using \`int.Parse()\`:

\`\`\`csharp
using System;

public class Program {
    public static void Main() {
        // Reads an age, converts it to a number, and prints next year's age
        string input = Console.ReadLine();
        int age = int.Parse(input);
        int nextYear = age + 1;
        Console.WriteLine(nextYear);
    }
}
\`\`\`

## Your Task
Read **two integers** from the input (each on its own line), add them together, and print their sum.

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
  variables: [{ name: "a", type: "number", min: 10, max: 40 }, { name: "b", type: "number", min: 5, max: 25 }],
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

const csLevel3: CodeLabProblem = {
  id: "csharp-level-3",
  title: "String Interpolation",
  language: "csharp",
  level: 3,
  stage: levelToStage(3),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["basics", "strings", "interpolation"],
  hints: [
    "In C#, place a dollar sign `$` directly before the opening quote to insert variables inside curly braces: `$\"... {variable} ...\"`.",
    "Read the name and the age:\n```csharp\nstring name = Console.ReadLine();\nstring age = Console.ReadLine();\nConsole.WriteLine($\"...\");\n```",
    "Format the output line: `Console.WriteLine($\"{name} is {age} years old.\");`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to cleanly insert variables into text using string interpolation (\`$\"\"\`).

## The Concept
String interpolation allows you to embed variable values directly inside a string by prefixing the string with \`$\` and wrapping variable names in curly braces \`{ }\`:

\`\`\`csharp
using System;

public class Program {
    public static void Main() {
        string item = "Notebook";
        int price = 15;
        // The variables {item} and {price} are substituted automatically
        Console.WriteLine($"Item: {item} | Price: \${price}");
    }
}
\`\`\`

## Your Task
Read two lines from input:
1. A person's name (\`string\`)
2. Their age (\`int\`)

Print a single line in this exact format: \`{name} is {age} years old.\`

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
    { name: "name", type: "string", options: ["Alice", "Liam", "Sophia", "Noah"] },
    { name: "age", type: "number", min: 18, max: 28 },
  ],
  testCases: [
    {
      label: "Formats interpolated string",
      inputTemplate: "{{name}}\n{{age}}",
      expectedOutputTemplate: "{{name}} is {{age}} years old.",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => sub(tc.expectedOutputTemplate, vars),
};

const csLevel4: CodeLabProblem = {
  id: "csharp-level-4",
  title: "Conditionals: Odd or Even",
  language: "csharp",
  level: 4,
  stage: levelToStage(4),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["basics", "control-flow", "modulo"],
  hints: [
    "Use the modulo operator `%` to get the remainder when dividing by 2. If `num % 2 == 0`, it's Even; otherwise, it's Odd.",
    "Structure an `if / else` statement:\n```csharp\nint n = int.Parse(Console.ReadLine());\nif (n % 2 == 0) {\n    Console.WriteLine(\"Even\");\n} else {\n    Console.WriteLine(\"Odd\");\n}\n```",
    "Make sure the casing matches: print `\"Even\"` or `\"Odd\"` with a capital first letter.",
  ],
  descriptionTemplate: `## What You'll Learn
How to use \`if / else\` statements and the modulo operator (\`%\`) to make decisions in code.

## The Concept
The modulo operator (\`%\`) gives the remainder of a division. For instance, testing whether a number is divisible by 5:

\`\`\`csharp
using System;

public class Program {
    public static void Main() {
        int count = 15;
        if (count % 5 == 0) {
            Console.WriteLine("Divisible by 5");
        } else {
            Console.WriteLine("Not divisible by 5");
        }
    }
}
\`\`\`

If a number divided by 2 has a remainder of 0 (\`num % 2 == 0\`), it is **Even**. Otherwise, it is **Odd**.

## Your Task
Read an integer from input. If the number is even, print \`Even\`. If it is odd, print \`Odd\`.

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

const csLevel5: CodeLabProblem = {
  id: "csharp-level-5",
  title: "For Loop: Counting Up",
  language: "csharp",
  level: 5,
  stage: levelToStage(5),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["basics", "loops", "for"],
  hints: [
    "A `for` loop takes three parts: `for (int i = 1; i <= n; i++)` to count from 1 up to `n`.",
    "Read the limit `n` first, then run a loop:\n```csharp\nint limit = int.Parse(Console.ReadLine());\nfor (int i = 1; i <= limit; i++) {\n    Console.WriteLine(i);\n}\n```",
    "Ensure your loop starts at `1` and includes `n` using `<= n`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to repeat actions sequentially using a \`for\` loop.

## The Concept
A \`for\` loop repeats a block of code a specific number of times using a counter variable:

\`\`\`csharp
using System;

public class Program {
    public static void Main() {
        // Counts down from 3 to 1
        for (int i = 3; i >= 1; i--) {
            Console.WriteLine($"Countdown: {i}");
        }
    }
}
\`\`\`

The loop initializes \`i\`, checks the condition before every step, and updates \`i\` at the end of each iteration.

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
      label: "Counts from 1 to N",
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

const csLevel6: CodeLabProblem = {
  id: "csharp-level-6",
  title: "While Loop: Accumulator Sum",
  language: "csharp",
  level: 6,
  stage: levelToStage(6),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["basics", "loops", "while"],
  hints: [
    "Maintain a `sum` variable initialized to 0 and an index counter `i = 1`. In each while iteration, add `i` to `sum` and increment `i`.",
    "Scaffold:\n```csharp\nint n = int.Parse(Console.ReadLine());\nint sum = 0;\nint i = 1;\nwhile (i <= n) {\n    sum += i;\n    i++;\n}\nConsole.WriteLine(sum);\n```",
    "Print only the final `sum` after the loop completes.",
  ],
  descriptionTemplate: `## What You'll Learn
How to use a \`while\` loop and an accumulator variable to aggregate values.

## The Concept
A \`while\` loop keeps running as long as its condition is true. We often use it with an accumulator to calculate running totals:

\`\`\`csharp
using System;

public class Program {
    public static void Main() {
        // Multiply numbers from 1 to 4 (Factorial of 4)
        int product = 1;
        int current = 1;
        while (current <= 4) {
            product *= current;
            current++;
        }
        Console.WriteLine(product); // 24
    }
}
\`\`\`

## Your Task
Read an integer \`N\` from input. Calculate and print the sum of all integers from \`1\` to \`N\` (i.e. $1 + 2 + 3 + \\dots + N$).

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
      label: "Sums 1 to N",
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

const csLevel7: CodeLabProblem = {
  id: "csharp-level-7",
  title: "Array Basics & Sum",
  language: "csharp",
  level: 7,
  stage: levelToStage(7),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["basics", "arrays"],
  hints: [
    "Split the input string with `.Split(' ')` to separate space-delimited numbers, then parse each element into an array.",
    "Scaffold:\n```csharp\nstring[] parts = Console.ReadLine().Split(' ');\nint sum = 0;\nforeach (string part in parts) {\n    sum += int.Parse(part);\n}\nConsole.WriteLine(sum);\n```",
    "Loop through each item, convert it to integer, accumulate, and print the total sum.",
  ],
  descriptionTemplate: `## What You'll Learn
How to store multiple values in an array and iterate through them using \`foreach\`.

## The Concept
An array holds a fixed number of items of the same type. You can split space-separated text and iterate over elements with \`foreach\`:

\`\`\`csharp
using System;

public class Program {
    public static void Main() {
        string[] fruits = { "Apple", "Banana", "Cherry" };
        foreach (string fruit in fruits) {
            Console.WriteLine($"Fruit: {fruit}");
        }
    }
}
\`\`\`

## Your Task
Read a single line of space-separated integers. Calculate and print the sum of all the numbers in the array.

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
      label: "Calculates sum of array elements",
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

const csLevel8: CodeLabProblem = {
  id: "csharp-level-8",
  title: "Writing Methods",
  language: "csharp",
  level: 8,
  stage: levelToStage(8),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["basics", "methods", "functions"],
  hints: [
    "Define a helper method `static int Square(int x)` that returns `x * x`.",
    "Call the method inside `Main` and print the returned value:\n```csharp\npublic class Program {\n    static int Square(int x) {\n        return x * x;\n    }\n    public static void Main() {\n        int val = int.Parse(Console.ReadLine());\n        Console.WriteLine(Square(val));\n    }\n}\n```",
    "Return the calculated value using the `return` keyword.",
  ],
  descriptionTemplate: `## What You'll Learn
How to write reusable methods with parameters and return values.

## The Concept
Methods encapsulate logic into reusable blocks. A method specifies its return type, name, and parameter list:

\`\`\`csharp
using System;

public class Program {
    // A method that doubles an integer and returns it
    static int DoubleNumber(int x) {
        return x * 2;
    }

    public static void Main() {
        int result = DoubleNumber(7);
        Console.WriteLine(result); // 14
    }
}
\`\`\`

## Your Task
Create a static method named \`Square\` that takes an \`int x\` and returns $x^2$ ($x \\times x$).
In \`Main\`, read an integer from input, call \`Square\`, and print the result.

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
      label: "Computes square via method",
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

const csLevel9: CodeLabProblem = {
  id: "csharp-level-9",
  title: "Find the Maximum",
  language: "csharp",
  level: 9,
  stage: levelToStage(9),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["basics", "algorithms", "arrays"],
  hints: [
    "Initialize `max` to the first number in the list. Loop through the rest of the numbers; whenever a number is greater than `max`, update `max`.",
    "Scaffold:\n```csharp\nstring[] parts = Console.ReadLine().Split(' ');\nint max = int.Parse(parts[0]);\nforeach (string p in parts) {\n    int cur = int.Parse(p);\n    if (cur > max) max = cur;\n}\nConsole.WriteLine(max);\n```",
    "Alternatively, you can use `Math.Max(max, current)` in each loop step.",
  ],
  descriptionTemplate: `## What You'll Learn
How to track and identify peak values in a sequence.

## The Concept
To find a minimum or maximum, we start by assuming the first element is our candidate, then compare each subsequent element:

\`\`\`csharp
using System;

public class Program {
    public static void Main() {
        // Tracking the smallest price
        int[] prices = { 45, 12, 89, 23 };
        int minPrice = prices[0];
        foreach (int p in prices) {
            if (p < minPrice) {
                minPrice = p;
            }
        }
        Console.WriteLine($"Lowest: {minPrice}"); // 12
    }
}
\`\`\`

## Your Task
Read a space-separated line of integers and print the **maximum** number in the list.

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
      label: "Finds max element",
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

const csLevel10: CodeLabProblem = {
  id: "csharp-level-10",
  title: "Reverse a String",
  language: "csharp",
  level: 10,
  stage: levelToStage(10),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["basics", "strings"],
  hints: [
    "Convert the string to a character array using `.ToCharArray()`, call `Array.Reverse(...)`, and construct a new string: `new string(chars)`.",
    "Scaffold:\n```csharp\nstring s = Console.ReadLine();\nchar[] chars = s.ToCharArray();\nArray.Reverse(chars);\nConsole.WriteLine(new string(chars));\n```",
    "You can also build the reversed string backwards with a loop from `s.Length - 1` down to `0`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to manipulate strings by converting them to character arrays (\`char[]\`).

## The Concept
Strings in C# are immutable sequences of characters. You can convert a string to a \`char[]\` to perform array operations like sorting or reversing:

\`\`\`csharp
using System;

public class Program {
    public static void Main() {
        char[] letters = { 'c', 'a', 'b' };
        Array.Sort(letters);
        string sorted = new string(letters);
        Console.WriteLine(sorted); // "abc"
    }
}
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
  variables: [{ name: "word", type: "string", options: ["CodeLab", "CSharp", "Algorithm", "Developer"] }],
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

const csLevel11: CodeLabProblem = {
  id: "csharp-level-11",
  title: "List<T> Operations",
  language: "csharp",
  level: 11,
  stage: levelToStage(11),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["building-up", "collections", "list"],
  hints: [
    "Use `List<int>` from `System.Collections.Generic`. Add numbers with `.Add()`, remove with `.Remove()`, and inspect `.Count`.",
    "Scaffold:\n```csharp\nusing System;\nusing System.Collections.Generic;\n\npublic class Program {\n    public static void Main() {\n        List<int> list = new List<int>();\n        // add numbers, remove target, print count\n    }\n}\n```",
    "Print `list.Count` to standard output.",
  ],
  descriptionTemplate: `## What You'll Learn
How to use dynamic resizing collections with \`List<T>\`.

## The Concept
Unlike fixed-size arrays, a \`List<T>\` grows and shrinks as you add or remove elements:

\`\`\`csharp
using System;
using System.Collections.Generic;

public class Program {
    public static void Main() {
        List<string> tasks = new List<string>();
        tasks.Add("Write tests");
        tasks.Add("Build UI");
        tasks.Remove("Write tests");
        Console.WriteLine($"Remaining tasks: {tasks.Count}"); // 1
    }
}
\`\`\`

## Your Task
Read two lines from input:
1. Space-separated integers to populate into a \`List<int>\`
2. A single integer \`target\` to remove from the list (remove the first occurrence)

Print the final count (\`.Count\`) of the list after removal.

## Example
Input:
\`\`\`
{{items}}
{{removeVal}}
\`\`\`
Output:
\`\`\`
CALC_LIST_COUNT
\`\`\`
`,
  variables: [
    { name: "items", type: "string", options: ["10 20 30 40 50", "5 10 15 20", "1 2 3 4 5 6"] },
    { name: "removeVal", type: "number", min: 10, max: 30 },
  ],
  testCases: [
    {
      label: "Removes item and returns count",
      inputTemplate: "{{items}}\n{{removeVal}}",
      expectedOutputTemplate: "CALC_LIST_COUNT",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_LIST_COUNT") {
      const list = String(vars.items).split(" ").map(Number);
      const idx = list.indexOf(Number(vars.removeVal));
      if (idx !== -1) list.splice(idx, 1);
      return String(list.length);
    }
    return tc.expectedOutputTemplate;
  },
};

const csLevel12: CodeLabProblem = {
  id: "csharp-level-12",
  title: "Dictionary Key-Value Lookup",
  language: "csharp",
  level: 12,
  stage: levelToStage(12),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["building-up", "collections", "dictionary"],
  hints: [
    "Use `Dictionary<string, int> dict = new Dictionary<string, int>();` to associate keys with values.",
    "Check if key exists using `dict.ContainsKey(query)` before accessing it.",
    "If present, print the value; otherwise print `Not Found`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to store and look up data by key using \`Dictionary<TKey, TValue>\`.

## The Concept
Dictionaries store associations between unique keys and their values for fast $O(1)$ lookups:

\`\`\`csharp
using System;
using System.Collections.Generic;

public class Program {
    public static void Main() {
        Dictionary<string, string> capitalCities = new Dictionary<string, string> {
            { "France", "Paris" },
            { "Japan", "Tokyo" }
        };

        if (capitalCities.TryGetValue("Japan", out string city)) {
            Console.WriteLine(city); // Tokyo
        }
    }
}
\`\`\`

## Your Task
You are given student grade pairs in the format \`Name:Grade\` separated by spaces on line 1, and a student name to query on line 2.
Print the student's grade if found, or print \`Not Found\` if the student is not in the dictionary.

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
    { name: "pairs", type: "string", options: ["Alice:95 Bob:88 Charlie:92", "Sam:78 Alex:85 Jordan:90"] },
    { name: "query", type: "string", options: ["Alice", "Bob", "Dan", "Sam"] },
  ],
  testCases: [
    {
      label: "Performs dictionary lookup",
      inputTemplate: "{{pairs}}\n{{query}}",
      expectedOutputTemplate: "CALC_LOOKUP",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_LOOKUP") {
      const pairs = String(vars.pairs).split(" ");
      const map = new Map<string, string>();
      for (const p of pairs) {
        const [k, v] = p.split(":");
        map.set(k, v);
      }
      return map.get(String(vars.query)) || "Not Found";
    }
    return tc.expectedOutputTemplate;
  },
};

const csLevel13: CodeLabProblem = {
  id: "csharp-level-13",
  title: "LINQ: Filtering Even Numbers",
  language: "csharp",
  level: 13,
  stage: levelToStage(13),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["building-up", "linq"],
  hints: [
    "Include `using System.Linq;` at the top of your file to use `.Where()`.",
    "Filter using a lambda: `numbers.Where(x => x % 2 == 0)` and join with `string.Join(\" \", evens)`.",
    "Scaffold:\n```csharp\nusing System;\nusing System.Linq;\n\npublic class Program {\n    public static void Main() {\n        int[] nums = Console.ReadLine().Split(' ').Select(int.Parse).ToArray();\n        var evens = nums.Where(n => n % 2 == 0);\n        Console.WriteLine(string.Join(\" \", evens));\n    }\n}\n```",
  ],
  descriptionTemplate: `## What You'll Learn
How to query and transform collections elegantly with C# **LINQ** (\`Language Integrated Query\`).

## The Concept
LINQ allows you to filter and transform sequences declaratively using methods like \`.Where()\` and \`.Select()\`:

\`\`\`csharp
using System;
using System.Linq;

public class Program {
    public static void Main() {
        int[] scores = { 45, 82, 95, 60, 78 };
        // Select scores that are 70 or above
        var passing = scores.Where(s => s >= 70);
        Console.WriteLine(string.Join(", ", passing)); // 82, 95, 78
    }
}
\`\`\`

## Your Task
Read a line of space-separated integers. Use LINQ to filter and print only the **even** numbers, separated by a single space.

## Example
Input:
\`\`\`
{{nums}}
\`\`\`
Output:
\`\`\`
CALC_LINQ_EVEN
\`\`\`
`,
  variables: [{ name: "nums", type: "string", options: ["1 2 3 4 5 6 7 8", "11 14 17 20 23 26", "5 10 15 20 25 30"] }],
  testCases: [
    {
      label: "Filters even numbers with LINQ",
      inputTemplate: "{{nums}}",
      expectedOutputTemplate: "CALC_LINQ_EVEN",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_LINQ_EVEN") {
      const arr = String(vars.nums).split(" ").map(Number);
      return arr.filter((x) => x % 2 === 0).join(" ");
    }
    return tc.expectedOutputTemplate;
  },
};

const csLevel14: CodeLabProblem = {
  id: "csharp-level-14",
  title: "String Methods: Substring & Replace",
  language: "csharp",
  level: 14,
  stage: levelToStage(14),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["building-up", "strings"],
  hints: [
    "Use `.Replace(oldChar, newChar)` to substitute characters in a string.",
    "Read the string and two characters from input, call `str.Replace(target, replacement)`, and print the result.",
    "Example:\n```csharp\nstring text = Console.ReadLine();\nchar from = char.Parse(Console.ReadLine());\nchar to = char.Parse(Console.ReadLine());\nConsole.WriteLine(text.Replace(from, to));\n```",
  ],
  descriptionTemplate: `## What You'll Learn
How to manipulate text using built-in methods like \`.Replace()\` and \`.ToUpper()\`.

## The Concept
C# provides rich string manipulation utilities:

\`\`\`csharp
using System;

public class Program {
    public static void Main() {
        string original = "red-green-blue";
        // Replaces all hyphens with commas
        string updated = original.Replace('-', ',');
        Console.WriteLine(updated); // "red,green,blue"
    }
}
\`\`\`

## Your Task
Read three lines of input:
1. A string \`text\`
2. A character \`fromChar\` to find
3. A character \`toChar\` to replace with

Print the transformed string with all occurrences replaced.

## Example
Input:
\`\`\`
{{text}}
{{from}}
{{to}}
\`\`\`
Output:
\`\`\`
CALC_REPLACE
\`\`\`
`,
  variables: [
    { name: "text", type: "string", options: ["banana", "success", "mississippi"] },
    { name: "from", type: "string", options: ["s", "a", "i"] },
    { name: "to", type: "string", options: ["$", "*", "#"] },
  ],
  testCases: [
    {
      label: "Replaces characters in string",
      inputTemplate: "{{text}}\n{{from}}\n{{to}}",
      expectedOutputTemplate: "CALC_REPLACE",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_REPLACE") {
      return String(vars.text).replaceAll(String(vars.from), String(vars.to));
    }
    return tc.expectedOutputTemplate;
  },
};

const csLevel15: CodeLabProblem = {
  id: "csharp-level-15",
  title: "Creating a Class & Properties",
  language: "csharp",
  level: 15,
  stage: levelToStage(15),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["building-up", "oop", "classes"],
  hints: [
    "Declare a class `Rectangle` with `{ get; set; }` properties for `Width` and `Height`, and a method `GetArea()`.",
    "Scaffold:\n```csharp\npublic class Rectangle {\n    public int Width { get; set; }\n    public int Height { get; set; }\n    public int GetArea() => Width * Height;\n}\n```",
    "In `Main`, instantiate `Rectangle`, assign properties, and print `GetArea()`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to define a class with auto-implemented properties and methods.

## The Concept
Classes bundle data (properties) and behaviors (methods) together into a single blueprint:

\`\`\`csharp
using System;

public class Circle {
    public int Radius { get; set; }

    public double GetCircumference() {
        return 2 * Math.PI * Radius;
    }
}

public class Program {
    public static void Main() {
        Circle c = new Circle { Radius = 5 };
        Console.WriteLine(Math.Round(c.GetCircumference(), 2));
    }
}
\`\`\`

## Your Task
Create a class \`Rectangle\` with:
- \`public int Width { get; set; }\`
- \`public int Height { get; set; }\`
- A method \`public int GetArea()\` that returns \`Width * Height\`.

Read \`Width\` and \`Height\` from input, instantiate a \`Rectangle\`, and print its area.

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

const csLevel16: CodeLabProblem = {
  id: "csharp-level-16",
  title: "Class Constructors",
  language: "csharp",
  level: 16,
  stage: levelToStage(16),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["building-up", "oop", "constructors"],
  hints: [
    "A constructor is a special method named identically to the class with no return type: `public Person(string name, int age) { ... }`.",
    "Assign the parameters to your properties inside the constructor body.",
    "Scaffold:\n```csharp\npublic class Person {\n    public string Name { get; set; }\n    public int Age { get; set; }\n    public Person(string name, int age) {\n        Name = name;\n        Age = age;\n    }\n}\n```",
  ],
  descriptionTemplate: `## What You'll Learn
How to initialize objects reliably using constructors.

## The Concept
A constructor runs automatically when an object is created with \`new\`, allowing you to require mandatory initial data:

\`\`\`csharp
using System;

public class Car {
    public string Model { get; }
    public int Year { get; }

    public Car(string model, int year) {
        Model = model;
        Year = year;
    }
}
\`\`\`

## Your Task
Create a \`Person\` class with a constructor accepting \`name\` and \`age\`. Provide a method \`GetSummary()\` that returns \`$"Person: {Name}, Age: {Age}"\`.
Read name and age from input, construct the \`Person\`, and print the summary.

## Example
Input:
\`\`\`
{{pname}}
{{page}}
\`\`\`
Output:
\`\`\`
Person: {{pname}}, Age: {{page}}
\`\`\`
`,
  variables: [
    { name: "pname", type: "string", options: ["Elena", "Marcus", "Chloe"] },
    { name: "page", type: "number", min: 20, max: 35 },
  ],
  testCases: [
    {
      label: "Initializes object via constructor",
      inputTemplate: "{{pname}}\n{{page}}",
      expectedOutputTemplate: "Person: {{pname}}, Age: {{page}}",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => sub(tc.expectedOutputTemplate, vars),
};

const csLevel17: CodeLabProblem = {
  id: "csharp-level-17",
  title: "Exception Handling: Try / Catch",
  language: "csharp",
  level: 17,
  stage: levelToStage(17),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["building-up", "exceptions"],
  hints: [
    "Wrap risky code in `try { ... } catch (FormatException) { ... }`.",
    "If parsing succeeds, print `Valid: {number}`. If an exception occurs, print `Invalid Number`.",
    "Scaffold:\n```csharp\ntry {\n    int num = int.Parse(Console.ReadLine());\n    Console.WriteLine($\"Valid: {num}\");\n} catch (Exception) {\n    Console.WriteLine(\"Invalid Number\");\n}\n```",
  ],
  descriptionTemplate: `## What You'll Learn
How to prevent crashes and handle runtime errors gracefully using \`try / catch\`.

## The Concept
When an operation fails (like attempting to parse letters as numbers), C# throws an exception. We catch it to maintain control:

\`\`\`csharp
using System;

public class Program {
    public static void Main() {
        try {
            int result = 100 / int.Parse("0");
            Console.WriteLine(result);
        } catch (DivideByZeroException) {
            Console.WriteLine("Cannot divide by zero!");
        }
    }
}
\`\`\`

## Your Task
Read a string from input. Attempt to parse it as an integer using \`int.Parse()\`.
- If successful, print \`Valid: {num}\`.
- If it fails, catch the exception and print \`Invalid Number\`.

## Example
Input:
\`\`\`
{{raw}}
\`\`\`
Output:
\`\`\`
CALC_PARSE_CHECK
\`\`\`
`,
  variables: [{ name: "raw", type: "string", options: ["42", "hello", "100", "xyz99"] }],
  testCases: [
    {
      label: "Handles valid and invalid integer inputs",
      inputTemplate: "{{raw}}",
      expectedOutputTemplate: "CALC_PARSE_CHECK",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_PARSE_CHECK") {
      const parsed = parseInt(String(vars.raw), 10);
      return !isNaN(parsed) && String(parsed) === String(vars.raw).trim()
        ? `Valid: ${parsed}`
        : "Invalid Number";
    }
    return tc.expectedOutputTemplate;
  },
};

const csLevel18: CodeLabProblem = {
  id: "csharp-level-18",
  title: "Enum Types",
  language: "csharp",
  level: 18,
  stage: levelToStage(18),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["building-up", "enums"],
  hints: [
    "Define `enum TrafficLight { Red, Yellow, Green }`.",
    "Use `Enum.Parse<TrafficLight>(input)` or a `switch` statement to print the matching action.",
    "Scaffold:\n```csharp\npublic enum Light { Red, Yellow, Green }\n// Read string, parse enum, check value\n```",
  ],
  descriptionTemplate: `## What You'll Learn
How to create strongly-typed sets of named constants using \`enum\`.

## The Concept
Enums represent a choice from a fixed collection of options:

\`\`\`csharp
using System;

public enum Difficulty {
    Easy,
    Medium,
    Hard
}

public class Program {
    public static void Main() {
        Difficulty d = Difficulty.Medium;
        Console.WriteLine($"Selected difficulty: {d}");
    }
}
\`\`\`

## Your Task
Create an enum \`TrafficLight\` with values \`Red\`, \`Yellow\`, \`Green\`.
Read a color string from input, match it to the enum, and print:
- \`Red\` $\\rightarrow$ \`Stop\`
- \`Yellow\` $\\rightarrow$ \`Caution\`
- \`Green\` $\\rightarrow$ \`Go\`

## Example
Input:
\`\`\`
{{color}}
\`\`\`
Output:
\`\`\`
CALC_LIGHT
\`\`\`
`,
  variables: [{ name: "color", type: "string", options: ["Red", "Yellow", "Green"] }],
  testCases: [
    {
      label: "Maps enum to traffic action",
      inputTemplate: "{{color}}",
      expectedOutputTemplate: "CALC_LIGHT",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_LIGHT") {
      const c = String(vars.color);
      if (c === "Red") return "Stop";
      if (c === "Yellow") return "Caution";
      return "Go";
    }
    return tc.expectedOutputTemplate;
  },
};

const csLevel19: CodeLabProblem = {
  id: "csharp-level-19",
  title: "Stack (LIFO) Push and Pop",
  language: "csharp",
  level: 19,
  stage: levelToStage(19),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["building-up", "collections", "stack"],
  hints: [
    "A `Stack<T>` operates in Last-In-First-Out order using `.Push()` and `.Pop()`.",
    "Push all elements from input onto the stack, then pop and print them one by one.",
    "Scaffold:\n```csharp\nStack<string> stack = new Stack<string>();\nforeach (var item in items) stack.Push(item);\nwhile (stack.Count > 0) Console.Write(stack.Pop() + \" \");\n```",
  ],
  descriptionTemplate: `## What You'll Learn
How to use Last-In-First-Out data structures with \`Stack<T>\`.

## The Concept
A Stack adds items to the top (\`Push\`) and retrieves items from the top (\`Pop\`), naturally reversing order:

\`\`\`csharp
using System;
using System.Collections.Generic;

public class Program {
    public static void Main() {
        Stack<int> s = new Stack<int>();
        s.Push(10);
        s.Push(20);
        Console.WriteLine(s.Pop()); // 20
        Console.WriteLine(s.Pop()); // 10
    }
}
\`\`\`

## Your Task
Read space-separated words, push them onto a \`Stack<string>\`, and print them in popped order separated by spaces.

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
  variables: [{ name: "words", type: "string", options: ["one two three", "alpha beta gamma delta", "first second third"] }],
  testCases: [
    {
      label: "Pops stack elements in LIFO order",
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

const csLevel20: CodeLabProblem = {
  id: "csharp-level-20",
  title: "Queue (FIFO) Order Processing",
  language: "csharp",
  level: 20,
  stage: levelToStage(20),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["building-up", "collections", "queue"],
  hints: [
    "A `Queue<T>` processes items in First-In-First-Out order using `.Enqueue()` and `.Dequeue()`.",
    "Enqueue all items, dequeue the first `K` items, and print the next item at the front with `.Peek()`.",
    "Scaffold:\n```csharp\nQueue<string> q = new Queue<string>(items);\n// Dequeue K times, then print q.Peek()\n```",
  ],
  descriptionTemplate: `## What You'll Learn
How to use First-In-First-Out queues with \`Queue<T>\`.

## The Concept
A Queue places items at the end (\`Enqueue\`) and removes them from the front (\`Dequeue\`):

\`\`\`csharp
using System;
using System.Collections.Generic;

public class Program {
    public static void Main() {
        Queue<string> line = new Queue<string>();
        line.Enqueue("First");
        line.Enqueue("Second");
        Console.WriteLine(line.Dequeue()); // "First"
    }
}
\`\`\`

## Your Task
Read space-separated names on line 1, and an integer \`K\` on line 2.
Enqueue the names into a \`Queue<string>\`, dequeue \`K\` times, and print the name currently at the front of the queue.

## Example
Input:
\`\`\`
{{queueItems}}
{{k}}
\`\`\`
Output:
\`\`\`
CALC_QUEUE_FRONT
\`\`\`
`,
  variables: [
    { name: "queueItems", type: "string", options: ["Alice Bob Charlie David Emma", "A B C D E F"] },
    { name: "k", type: "number", min: 1, max: 2 },
  ],
  testCases: [
    {
      label: "Dequeues K items and prints next front",
      inputTemplate: "{{queueItems}}\n{{k}}",
      expectedOutputTemplate: "CALC_QUEUE_FRONT",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_QUEUE_FRONT") {
      const items = String(vars.queueItems).split(" ");
      const k = Number(vars.k);
      return items[k] || "Empty";
    }
    return tc.expectedOutputTemplate;
  },
};

// ─────────────────────────────────────────────────────────────────
// LEVELS 21–30: GETTING GOOD
// ─────────────────────────────────────────────────────────────────

const csLevel21: CodeLabProblem = {
  id: "csharp-level-21",
  title: "OOP: Class Inheritance",
  language: "csharp",
  level: 21,
  stage: levelToStage(21),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["getting-good", "oop", "inheritance"],
  hints: [
    "Use the colon `:` syntax for inheritance: `public class Dog : Animal`.",
    "Mark base methods as `virtual` and override them in derived classes with `override`.",
    "Scaffold:\n```csharp\npublic class Animal { public virtual void Speak() => Console.WriteLine(\"...\"); }\npublic class Dog : Animal { public override void Speak() => Console.WriteLine(\"Woof\"); }\n```",
  ],
  descriptionTemplate: `## What You'll Learn
How to reuse and specialize behaviors using class inheritance and the \`override\` keyword.

## The Concept
Inheritance lets a derived class inherit fields and methods from a base class:

\`\`\`csharp
using System;

public class Vehicle {
    public virtual void Start() {
        Console.WriteLine("Vehicle engine starting...");
    }
}

public class ElectricCar : Vehicle {
    public override void Start() {
        Console.WriteLine("Silent electric startup!");
    }
}
\`\`\`

## Your Task
Create:
- Base class \`Animal\` with virtual method \`Speak()\` returning \`"Some Sound"\`
- Derived class \`Dog\` that overrides \`Speak()\` returning \`"Woof!"\`
- Derived class \`Cat\` that overrides \`Speak()\` returning \`"Meow!"\`

Read an animal type (\`Dog\` or \`Cat\`) from input, instantiate it, and print its \`Speak()\` sound.

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
      label: "Calls overridden Speak method",
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

const csLevel22: CodeLabProblem = {
  id: "csharp-level-22",
  title: "Interfaces: Contracts",
  language: "csharp",
  level: 22,
  stage: levelToStage(22),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["getting-good", "oop", "interfaces"],
  hints: [
    "Define `public interface IShape { int Area(); }` without implementation bodies.",
    "Implement the interface on `Square` class: `public class Square : IShape { public int Side; public int Area() => Side * Side; }`.",
    "Read the side length, compute `Area()`, and print.",
  ],
  descriptionTemplate: `## What You'll Learn
How to define strict API contracts with interfaces (\`interface\`).

## The Concept
Interfaces define contracts that implementing classes must satisfy:

\`\`\`csharp
using System;

public interface ILogger {
    void Log(string message);
}

public class ConsoleLogger : ILogger {
    public void Log(string msg) {
        Console.WriteLine($"[LOG]: {msg}");
    }
}
\`\`\`

## Your Task
Create an interface \`IShape\` with \`int Area()\`.
Implement it in a \`Square\` class that has a property \`int Side\`.
Read an integer side length from input, instantiate a \`Square\` via the \`IShape\` interface, and print its area.

## Example
Input:
\`\`\`
{{side}}
\`\`\`
Output:
\`\`\`
CALC_SQ_AREA
\`\`\`
`,
  variables: [{ name: "side", type: "number", min: 4, max: 12 }],
  testCases: [
    {
      label: "Implements IShape contract",
      inputTemplate: "{{side}}",
      expectedOutputTemplate: "CALC_SQ_AREA",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_SQ_AREA") {
      const s = Number(vars.side);
      return String(s * s);
    }
    return tc.expectedOutputTemplate;
  },
};

const csLevel23: CodeLabProblem = {
  id: "csharp-level-23",
  title: "Generics: Swapping Values",
  language: "csharp",
  level: 23,
  stage: levelToStage(23),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["getting-good", "generics"],
  hints: [
    "Declare a generic method with `<T>`: `static void Swap<T>(ref T a, ref T b)`.",
    "Use a temporary variable: `T temp = a; a = b; b = temp;`.",
    "Read two space-separated words, swap them using your generic method, and print the swapped result.",
  ],
  descriptionTemplate: `## What You'll Learn
How to write type-safe reusable algorithms with **Generics** (\`<T>\`).

## The Concept
Generics allow you to write a single method or class that works with any data type while keeping strong compile-time type safety:

\`\`\`csharp
using System;

public class Program {
    // Generic method that wraps any item into a formatted box
    static void PrintBoxed<T>(T item) {
        Console.WriteLine($"[{item}]");
    }

    public static void Main() {
        PrintBoxed(123);      // [123]
        PrintBoxed("Hello");  // [Hello]
    }
}
\`\`\`

## Your Task
Create a generic method \`Swap<T>(ref T a, ref T b)\`.
Read two space-separated string values, swap them, and print them separated by a space.

## Example
Input:
\`\`\`
{{first}} {{second}}
\`\`\`
Output:
\`\`\`
{{second}} {{first}}
\`\`\`
`,
  variables: [
    { name: "first", type: "string", options: ["Alpha", "Sun", "Left", "North"] },
    { name: "second", type: "string", options: ["Beta", "Moon", "Right", "South"] },
  ],
  testCases: [
    {
      label: "Swaps generic values",
      inputTemplate: "{{first}} {{second}}",
      expectedOutputTemplate: "{{second}} {{first}}",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => sub("{{second}} {{first}}", vars),
};

const csLevel24: CodeLabProblem = {
  id: "csharp-level-24",
  title: "Delegates & Anonymous Functions",
  language: "csharp",
  level: 24,
  stage: levelToStage(24),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["getting-good", "delegates"],
  hints: [
    "Use the built-in `Func<int, int>` delegate type which represents a function taking an `int` and returning an `int`.",
    "Assign a lambda expression: `Func<int, int> triple = x => x * 3;`.",
    "Read an integer, invoke the delegate, and print the output.",
  ],
  descriptionTemplate: `## What You'll Learn
How to pass and store functions as variables using delegates and \`Func<>\`.

## The Concept
Delegates act as type-safe function pointers. \`Func<T, TResult>\` represents a function taking a parameter of type \`T\` and returning \`TResult\`:

\`\`\`csharp
using System;

public class Program {
    public static void Main() {
        Func<int, int> square = x => x * x;
        Console.WriteLine(square(6)); // 36
    }
}
\`\`\`

## Your Task
Create a delegate \`Func<int, int> triple = x => x * 3;\`.
Read an integer from input, pass it to \`triple\`, and print the result.

## Example
Input:
\`\`\`
{{n}}
\`\`\`
Output:
\`\`\`
CALC_TRIPLE
\`\`\`
`,
  variables: [{ name: "n", type: "number", min: 4, max: 20 }],
  testCases: [
    {
      label: "Evaluates lambda delegate",
      inputTemplate: "{{n}}",
      expectedOutputTemplate: "CALC_TRIPLE",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_TRIPLE") {
      return String(Number(vars.n) * 3);
    }
    return tc.expectedOutputTemplate;
  },
};

const csLevel25: CodeLabProblem = {
  id: "csharp-level-25",
  title: "LINQ GroupBy & Aggregation",
  language: "csharp",
  level: 25,
  stage: levelToStage(25),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["getting-good", "linq", "groupby"],
  hints: [
    "Use `.GroupBy(w => w.Length)` and order by key `.OrderBy(g => g.Key)`.",
    "For each group, print `Length {g.Key}: {g.Count()}`.",
    "Scaffold:\n```csharp\nvar groups = words.GroupBy(w => w.Length).OrderBy(g => g.Key);\nforeach (var g in groups) Console.WriteLine($\"{g.Key}:{g.Count()}\");\n```",
  ],
  descriptionTemplate: `## What You'll Learn
How to bucket and count records with LINQ \`GroupBy()\`.

## The Concept
\`GroupBy()\` clusters elements sharing a common attribute:

\`\`\`csharp
using System;
using System.Linq;

public class Program {
    public static void Main() {
        string[] names = { "Sam", "Ann", "Alex", "Chloe" };
        var grouped = names.GroupBy(n => n.Length);
        foreach (var group in grouped) {
            Console.WriteLine($"Length {group.Key}: {group.Count()} items");
        }
    }
}
\`\`\`

## Your Task
Read space-separated words from input. Group the words by their character length.
For each length in ascending order, print \`{Length}:{Count}\` on a new line.

## Example
Input:
\`\`\`
{{wlist}}
\`\`\`
Output:
\`\`\`
CALC_GROUP_COUNT
\`\`\`
`,
  variables: [{ name: "wlist", type: "string", options: ["cat dog elephant bear wolf ant", "a bb ccc ddd ee f", "sun moon planet star galaxy"] }],
  testCases: [
    {
      label: "Groups words by length",
      inputTemplate: "{{wlist}}",
      expectedOutputTemplate: "CALC_GROUP_COUNT",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_GROUP_COUNT") {
      const words = String(vars.wlist).split(" ");
      const counts: Record<number, number> = {};
      for (const w of words) counts[w.length] = (counts[w.length] || 0) + 1;
      const sortedKeys = Object.keys(counts).map(Number).sort((a, b) => a - b);
      return sortedKeys.map((k) => `${k}:${counts[k]}`).join("\n");
    }
    return tc.expectedOutputTemplate;
  },
};

const csLevel26: CodeLabProblem = {
  id: "csharp-level-26",
  title: "Recursion: Factorial",
  language: "csharp",
  level: 26,
  stage: levelToStage(26),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["getting-good", "recursion"],
  hints: [
    "A recursive function calls itself with a smaller input until it reaches a base case.",
    "Base case: if `n <= 1`, return `1`. Recursive step: return `n * Factorial(n - 1)`.",
    "Scaffold:\n```csharp\nstatic long Factorial(long n) {\n    if (n <= 1) return 1;\n    return n * Factorial(n - 1);\n}\n```",
  ],
  descriptionTemplate: `## What You'll Learn
How to solve problems by calling a function from within itself (**Recursion**).

## The Concept
Every recursive function requires a **base case** to terminate and a **recursive step** that moves closer to the base case:

\`\`\`csharp
using System;

public class Program {
    // Recursive countdown
    static void Countdown(int n) {
        if (n <= 0) {
            Console.WriteLine("Liftoff!");
            return;
        }
        Console.WriteLine(n);
        Countdown(n - 1);
    }

    public static void Main() {
        Countdown(3);
    }
}
\`\`\`

## Your Task
Implement a recursive method \`static long Factorial(long n)\` that calculates $N! = N \\times (N - 1) \\times \\dots \\times 1$.
Read $N$ from input ($1 \\le N \\le 12$) and print its factorial.

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

const csLevel27: CodeLabProblem = {
  id: "csharp-level-27",
  title: "Binary Search",
  language: "csharp",
  level: 27,
  stage: levelToStage(27),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["getting-good", "algorithms", "binary-search"],
  hints: [
    "Maintain `left = 0` and `right = arr.Length - 1`. Calculate `mid = (left + right) / 2` in each step.",
    "If `arr[mid] == target`, return `mid`. If `arr[mid] < target`, move `left = mid + 1`; else move `right = mid - 1`.",
    "If not found after loop, return `-1`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to find elements in $O(\\log N)$ time using the **Binary Search** algorithm.

## The Concept
Binary search efficiently locates a target in a sorted list by repeatedly halving the search space:

\`\`\`csharp
using System;

public class Program {
    public static void Main() {
        int[] sorted = { 10, 20, 30, 40, 50 };
        int idx = Array.BinarySearch(sorted, 30);
        Console.WriteLine($"Found at index: {idx}"); // 2
    }
}
\`\`\`

## Your Task
Read two lines:
1. Sorted space-separated integers
2. Target integer to find

Print the 0-based index of the target in the array, or \`-1\` if not present.

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
    { name: "sarr", type: "string", options: ["2 5 8 12 16 23 38 56 72 91", "10 20 30 40 50"] },
    { name: "starget", type: "number", min: 12, max: 38 },
  ],
  testCases: [
    {
      label: "Finds element index via binary search",
      inputTemplate: "{{sarr}}\n{{starget}}",
      expectedOutputTemplate: "CALC_BSEARCH",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_BSEARCH") {
      const arr = String(vars.sarr).split(" ").map(Number);
      const target = Number(vars.starget);
      return String(arr.indexOf(target));
    }
    return tc.expectedOutputTemplate;
  },
};

const csLevel28: CodeLabProblem = {
  id: "csharp-level-28",
  title: "Two Pointers: Palindrome Checker",
  language: "csharp",
  level: 28,
  stage: levelToStage(28),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["getting-good", "two-pointers"],
  hints: [
    "Use two integer indices: `left = 0` and `right = s.Length - 1`.",
    "While `left < right`, check if `s[left] == s[right]`. If unequal, print `false`; otherwise advance `left++` and decrement `right--`.",
    "Print `true` if all mirrored characters match.",
  ],
  descriptionTemplate: `## What You'll Learn
How to use the **Two Pointers** pattern to verify mirrored properties in $O(N)$ time with $O(1)$ memory.

## The Concept
Two pointers move towards each other from opposite ends of a collection:

\`\`\`csharp
using System;

public class Program {
    public static void Main() {
        int[] nums = { 1, 2, 3, 2, 1 };
        int l = 0, r = nums.Length - 1;
        bool isSymmetric = true;
        while (l < r) {
            if (nums[l] != nums[r]) { isSymmetric = false; break; }
            l++; r--;
        }
        Console.WriteLine(isSymmetric); // True
    }
}
\`\`\`

## Your Task
Read an alphanumeric string from input (lowercase). Print \`True\` if it is a palindrome (reads same forward and backward), otherwise \`False\`.

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
  variables: [{ name: "palinWord", type: "string", options: ["racecar", "level", "deified", "computer", "algorithm"] }],
  testCases: [
    {
      label: "Checks palindrome with two pointers",
      inputTemplate: "{{palinWord}}",
      expectedOutputTemplate: "CALC_PALIN",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_PALIN") {
      const s = String(vars.palinWord);
      const isP = s === s.split("").reverse().join("");
      return isP ? "True" : "False";
    }
    return tc.expectedOutputTemplate;
  },
};

const csLevel29: CodeLabProblem = {
  id: "csharp-level-29",
  title: "Sliding Window: Max Sum of Subarray K",
  language: "csharp",
  level: 29,
  stage: levelToStage(29),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["getting-good", "algorithms", "sliding-window"],
  hints: [
    "Compute the sum of the first `K` elements. Then slide the window by adding the incoming element and subtracting the outgoing element.",
    "Track `maxSum = Math.Max(maxSum, currentSum)`.",
    "Scaffold:\n```csharp\nint window = 0;\nfor (int i = 0; i < k; i++) window += nums[i];\nint max = window;\nfor (int i = k; i < nums.Length; i++) {\n    window += nums[i] - nums[i - k];\n    if (window > max) max = window;\n}\nConsole.WriteLine(max);\n```",
  ],
  descriptionTemplate: `## What You'll Learn
How to optimize contiguous subarray computations from $O(N \\times K)$ to $O(N)$ using the **Sliding Window** technique.

## The Concept
Instead of recalculating the window from scratch, add the new element entering the right edge and subtract the element leaving the left edge:

\`\`\`csharp
using System;

public class Program {
    public static void Main() {
        int[] data = { 1, 4, 2, 10, 2, 3, 1, 0, 20 };
        // Sliding window of size 2
        int current = data[0] + data[1];
        int max = current;
        for (int i = 2; i < data.Length; i++) {
            current += data[i] - data[i - 2];
            max = Math.Max(max, current);
        }
        Console.WriteLine(max); // 12
    }
}
\`\`\`

## Your Task
Read space-separated integers on line 1, and an integer \`K\` on line 2.
Find and print the maximum sum of any contiguous subarray of size \`K\`.

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
      label: "Computes max subarray sum with sliding window",
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

const csLevel30: CodeLabProblem = {
  id: "csharp-level-30",
  title: "Dynamic Programming: Longest Increasing Subsequence",
  language: "csharp",
  level: 30,
  stage: levelToStage(30),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.csharp,
  tags: ["getting-good", "algorithms", "dynamic-programming"],
  hints: [
    "Create an array `dp` of size `N`, filled with `1` (since every single element is an increasing subsequence of length 1).",
    "For each `i` from 1 to `N - 1`, check all previous elements `j` from 0 to `i - 1`. If `nums[i] > nums[j]`, update `dp[i] = Math.Max(dp[i], dp[j] + 1)`.",
    "Return the maximum value in the `dp` array.",
  ],
  descriptionTemplate: `## What You'll Learn
How to solve optimization problems by breaking them into overlapping subproblems using **Dynamic Programming** (\`DP\`).

## The Concept
Dynamic Programming stores solutions to subproblems in a table to avoid redundant calculations:

\`\`\`csharp
using System;

public class Program {
    public static void Main() {
        // DP Fibonacci in O(N)
        int n = 6;
        int[] dp = new int[n + 1];
        dp[0] = 0; dp[1] = 1;
        for (int i = 2; i <= n; i++) {
            dp[i] = dp[i - 1] + dp[i - 2];
        }
        Console.WriteLine($"Fib({n}) = {dp[n]}"); // 8
    }
}
\`\`\`

## Your Task
Read a space-separated list of integers. Find and print the length of the **Longest Strictly Increasing Subsequence** (LIS).
A subsequence is derived from the array by deleting zero or more elements without changing the order of the remaining elements.

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
      label: "Finds length of longest increasing subsequence",
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

// ─────────────────────────────────────────────────────────────────
// EXPORT ALL 30 C# PROBLEMS
// ─────────────────────────────────────────────────────────────────

export const csharpProblems: CodeLabProblem[] = [
  csLevel1, csLevel2, csLevel3, csLevel4, csLevel5,
  csLevel6, csLevel7, csLevel8, csLevel9, csLevel10,
  csLevel11, csLevel12, csLevel13, csLevel14, csLevel15,
  csLevel16, csLevel17, csLevel18, csLevel19, csLevel20,
  csLevel21, csLevel22, csLevel23, csLevel24, csLevel25,
  csLevel26, csLevel27, csLevel28, csLevel29, csLevel30,
];
