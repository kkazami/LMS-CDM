/**
 * Python Track — 30 Levels (Pedagogical Overhaul)
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

const pyLevel1: CodeLabProblem = {
  id: "python-level-1",
  title: "Print a Message",
  language: "python",
  level: 1,
  stage: levelToStage(1),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["basics", "print", "strings"],
  hints: [
    "Use the `print(...)` function with your text wrapped in quotes.",
    "Structure:\n```python\nprint(\"YOUR_MESSAGE_HERE\")\n```",
    "Replace `YOUR_MESSAGE_HERE` with the exact message from the task (pay attention to spaces and punctuation).",
  ],
  descriptionTemplate: `## What You'll Learn
How to output text to the console using Python's built-in \`print()\` function.

## The Concept
In Python, \`print()\` displays text, numbers, or calculations. Words and sentences are called **strings** and must be wrapped inside double quotes (\`"..."\`) or single quotes (\`'...'\\\`).

\`\`\`python
# Displays a friendly greeting to the terminal
print("Welcome to CodeLab!")
\`\`\`

## Your Task
Write a program that prints the exact message: **{{greeting}}** to standard output.

## Example
Output:
\`\`\`
{{greeting}}
\`\`\`
`,
  variables: [
    {
      name: "greeting",
      type: "string",
      options: ["Hello, World!", "Hello, Python!", "CodeLab Online!"],
    },
  ],
  testCases: [
    {
      label: "Prints greeting message",
      inputTemplate: "",
      expectedOutputTemplate: "{{greeting}}",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => sub(tc.expectedOutputTemplate, vars),
};

const pyLevel2: CodeLabProblem = {
  id: "python-level-2",
  title: "Sum Two Numbers",
  language: "python",
  level: 2,
  stage: levelToStage(2),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["math", "basics", "input"],
  hints: [
    "Call `input()` twice to read two separate lines, and wrap each with `int()` to convert text to whole numbers.",
    "Scaffold:\n```python\nx = int(input())\ny = int(input())\n# Add x and y, then print the result\n```",
    "Calculate the sum and print it: `print(x + y)`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to read user input using \`input()\` and convert text into integers with \`int()\`.

## The Concept
When a program receives input from a user, it arrives as text (\`str\`). To do arithmetic, we convert it into a whole number (\`int\`):

\`\`\`python
# Reads a number, converts it to an integer, and calculates double
user_input = input()
score = int(user_input)
print(score * 2)
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
  variables: [
    { name: "a", type: "number", min: 10, max: 50 },
    { name: "b", type: "number", min: 5, max: 30 },
  ],
  testCases: [
    {
      label: "Adds two input numbers",
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

const pyLevel3: CodeLabProblem = {
  id: "python-level-3",
  title: "F-Strings Formatting",
  language: "python",
  level: 3,
  stage: levelToStage(3),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["strings", "basics", "f-strings"],
  hints: [
    "Place an `f` before your opening quote: `f\"... {variable} ...\"`.",
    "Read the name and the age:\n```python\nname = input()\nage = input()\nprint(f\"{name} is {age} years old.\")\n```",
    "Make sure the sentence ends with a period `.`: `f\"{name} is {age} years old.\"`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to insert variables directly into sentences using Python **f-strings** (\`f"..."\`).

## The Concept
F-strings let you embed variables and expressions inside curly braces \`{ }\` without messy string concatenation:

\`\`\`python
item = "Laptop"
price = 899
print(f"Product: {item} | Cost: \${price}")
\`\`\`

## Your Task
Read two lines from input:
1. A person's name (\`str\`)
2. Their age (\`int\`)

Print a formatted sentence: \`{name} is {age} years old.\`

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
    { name: "name", type: "string", options: ["Alice", "Bob", "Clara", "David"] },
    { name: "age", type: "number", min: 18, max: 30 },
  ],
  testCases: [
    {
      label: "Formats string with f-string",
      inputTemplate: "{{name}}\n{{age}}",
      expectedOutputTemplate: "{{name}} is {{age}} years old.",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => sub(tc.expectedOutputTemplate, vars),
};

const pyLevel4: CodeLabProblem = {
  id: "python-level-4",
  title: "Conditionals: Even or Odd",
  language: "python",
  level: 4,
  stage: levelToStage(4),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["conditionals", "basics", "modulo"],
  hints: [
    "Use the modulo operator `%` to check the remainder. If `n % 2 == 0`, the number is Even.",
    "Scaffold:\n```python\nn = int(input())\nif n % 2 == 0:\n    print(\"Even\")\nelse:\n    print(\"Odd\")\n```",
    "Remember that indentation (4 spaces) is required inside `if` and `else` blocks in Python.",
  ],
  descriptionTemplate: `## What You'll Learn
How to make conditional decisions using \`if\` / \`else\` and the modulo operator (\`%\`).

## The Concept
The modulo operator (\`%\`) computes the division remainder. We can test if numbers are multiples of 3, 5, or 2:

\`\`\`python
speed = 65
if speed > 60:
    print("Above speed limit")
else:
    print("Normal speed")
\`\`\`

If a number divided by 2 has no remainder (\`n % 2 == 0\`), it is **Even**; otherwise it is **Odd**.

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
      label: "Checks even or odd",
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

const pyLevel5: CodeLabProblem = {
  id: "python-level-5",
  title: "For Loop: Counting Up",
  language: "python",
  level: 5,
  stage: levelToStage(5),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["loops", "for", "range"],
  hints: [
    "In Python, `range(1, n + 1)` generates numbers starting at 1 up through `n`.",
    "Scaffold:\n```python\nn = int(input())\nfor i in range(1, n + 1):\n    print(i)\n```",
    "Make sure your range end is `n + 1` so that `n` itself is included in the output.",
  ],
  descriptionTemplate: `## What You'll Learn
How to repeat actions with a \`for\` loop and Python's \`range()\` function.

## The Concept
\`range(start, stop)\` generates a sequence of numbers starting at \`start\` and ending just before \`stop\`:

\`\`\`python
# Prints numbers from 0 up to 2
for count in range(3):
    print(f"Step {count}")
\`\`\`

To count from 1 to 5, we use \`range(1, 6)\`.

## Your Task
Read an integer \`N\` from input. Print all numbers from \`1\` to \`N\` (inclusive), each on its own line.

## Example
Input:
\`\`\`
{{limit}}
\`\`\`
Output:
\`\`\`
CALC_RANGE
\`\`\`
`,
  variables: [{ name: "limit", type: "number", min: 3, max: 7 }],
  testCases: [
    {
      label: "Counts from 1 to N",
      inputTemplate: "{{limit}}",
      expectedOutputTemplate: "CALC_RANGE",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_RANGE") {
      const n = Number(vars.limit);
      return Array.from({ length: n }, (_, i) => String(i + 1)).join("\n");
    }
    return tc.expectedOutputTemplate;
  },
};

const pyLevel6: CodeLabProblem = {
  id: "python-level-6",
  title: "While Loop: Sum of Numbers",
  language: "python",
  level: 6,
  stage: levelToStage(6),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["loops", "while", "accumulation"],
  hints: [
    "Initialize `total = 0` and `i = 1`. In each iteration of your while loop, add `i` to `total` and increment `i += 1`.",
    "Scaffold:\n```python\nn = int(input())\ntotal = 0\ni = 1\nwhile i <= n:\n    total += i\n    i += 1\nprint(total)\n```",
    "Only print `total` after the while loop has finished.",
  ],
  descriptionTemplate: `## What You'll Learn
How to use a \`while\` loop with an accumulator variable.

## The Concept
A \`while\` loop continues running as long as its condition remains \`True\`:

\`\`\`python
# Multiplies numbers 1 * 2 * 3 (Factorial of 3)
product = 1
step = 1
while step <= 3:
    product *= step
    step += 1
print(product) # 6
\`\`\`

## Your Task
Read an integer \`N\` from input. Calculate and print the sum of all numbers from \`1\` to \`N\` ($1 + 2 + \\dots + N$).

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

const pyLevel7: CodeLabProblem = {
  id: "python-level-7",
  title: "List Sum with Split",
  language: "python",
  level: 7,
  stage: levelToStage(7),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["lists", "strings", "basics"],
  hints: [
    "Split the input string with `.split()` to get a list of string tokens, convert them with `int`, and sum them.",
    "Scaffold:\n```python\nnumbers = [int(x) for x in input().split()]\nprint(sum(numbers))\n```",
    "Python has a built-in `sum()` function that adds up all numbers in a list.",
  ],
  descriptionTemplate: `## What You'll Learn
How to split space-separated input text into a list and aggregate values with \`sum()\`.

## The Concept
\`.split()\` cuts a sentence into a list of words:

\`\`\`python
sentence = "apple banana cherry"
words = sentence.split()
print(len(words)) # 3
\`\`\`

You can convert list items to numbers using a list comprehension: \`[int(x) for x in words]\`.

## Your Task
Read a line of space-separated integers, calculate the sum of all elements, and print the total.

## Example
Input:
\`\`\`
{{nums}}
\`\`\`
Output:
\`\`\`
CALC_SUM_LIST
\`\`\`
`,
  variables: [{ name: "nums", type: "string", options: ["1 2 3 4 5", "10 20 30 40", "7 14 21"] }],
  testCases: [
    {
      label: "Sums list of numbers",
      inputTemplate: "{{nums}}",
      expectedOutputTemplate: "CALC_SUM_LIST",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_SUM_LIST") {
      const arr = String(vars.nums).split(" ").map(Number);
      return String(arr.reduce((a, b) => a + b, 0));
    }
    return tc.expectedOutputTemplate;
  },
};

const pyLevel8: CodeLabProblem = {
  id: "python-level-8",
  title: "Defining Functions",
  language: "python",
  level: 8,
  stage: levelToStage(8),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["functions", "basics"],
  hints: [
    "Define a function with `def square(x):` that returns `x * x`.",
    "Scaffold:\n```python\ndef square(x):\n    return x * x\n\nval = int(input())\nprint(square(val))\n```",
    "Remember to return the value with `return` and print the result of calling `square(val)`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to define reusable functions with parameters and return values using \`def\`.

## The Concept
Functions organize code into reusable blocks:

\`\`\`python
def double(num):
    return num * 2

result = double(7)
print(result) # 14
\`\`\`

## Your Task
Write a function \`square(x)\` that returns $x^2$. Read an integer from input, call \`square\`, and print the result.

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
      label: "Calls square function",
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

const pyLevel9: CodeLabProblem = {
  id: "python-level-9",
  title: "Finding the Maximum",
  language: "python",
  level: 9,
  stage: levelToStage(9),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["algorithms", "lists", "basics"],
  hints: [
    "Convert the space-separated input into a list of integers and find the highest value.",
    "Scaffold:\n```python\nnums = [int(x) for x in input().split()]\nprint(max(nums))\n```",
    "You can also loop through the list manually with `for n in nums: if n > highest: highest = n`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to find the largest value in a collection.

## The Concept
Python provides \`min()\` and \`max()\` to quickly find extreme values in lists:

\`\`\`python
temperatures = [68, 72, 65, 84, 71]
print(min(temperatures)) # 65
\`\`\`

## Your Task
Read space-separated integers from input and print the **maximum** number in the list.

## Example
Input:
\`\`\`
{{items}}
\`\`\`
Output:
\`\`\`
CALC_MAX
\`\`\`
`,
  variables: [{ name: "items", type: "string", options: ["12 45 8 99 23", "5 -2 18 3 0", "100 250 80 400 120"] }],
  testCases: [
    {
      label: "Finds max value",
      inputTemplate: "{{items}}",
      expectedOutputTemplate: "CALC_MAX",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_MAX") {
      const nums = String(vars.items).split(" ").map(Number);
      return String(Math.max(...nums));
    }
    return tc.expectedOutputTemplate;
  },
};

const pyLevel10: CodeLabProblem = {
  id: "python-level-10",
  title: "String Slicing: Reversing",
  language: "python",
  level: 10,
  stage: levelToStage(10),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["strings", "slicing", "basics"],
  hints: [
    "Python string slicing syntax `[start:stop:step]` allows a negative step `[::-1]` to reverse sequences.",
    "Scaffold:\n```python\ntext = input()\nprint(text[::-1])\n```",
    "You can also use `''.join(reversed(text))`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to reverse and slice strings using Python's \`[start:stop:step]\` slicing syntax.

## The Concept
String slicing extracts segments using index bounds:

\`\`\`python
message = "CodeLab"
# Extracts every second character
print(message[::2]) # "Cdea"
\`\`\`

A step of \`-1\` (\`[::-1]\`) traverses backwards, reversing the string.

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
  variables: [{ name: "word", type: "string", options: ["Python", "Algorithm", "Developer", "CodeLab"] }],
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

const pyLevel11: CodeLabProblem = {
  id: "python-level-11",
  title: "List Comprehensions",
  language: "python",
  level: 11,
  stage: levelToStage(11),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["building-up", "comprehensions", "lists"],
  hints: [
    "List comprehension syntax: `[expression for item in iterable if condition]`.",
    "Filter only even numbers: `[x for x in nums if x % 2 == 0]`.",
    "Join and print space-separated: `print(' '.join(map(str, evens)))`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to filter and transform lists concisely with **List Comprehensions**.

## The Concept
List comprehensions provide an elegant syntax for creating new lists based on existing iterables:

\`\`\`python
# Squares only the positive numbers
numbers = [-2, 3, -1, 4]
squares = [x * x for x in numbers if x > 0]
print(squares) # [9, 16]
\`\`\`

## Your Task
Read a space-separated line of integers. Use a list comprehension to filter out all odd numbers, keeping only the **even** numbers, and print them separated by a space.

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
      label: "Filters even numbers with list comprehension",
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

const pyLevel12: CodeLabProblem = {
  id: "python-level-12",
  title: "Dictionary Lookups",
  language: "python",
  level: 12,
  stage: levelToStage(12),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["building-up", "dictionaries"],
  hints: [
    "Parse pairs `k:v` into a dictionary `d = dict(p.split(':') for p in pairs.split())`.",
    "Use `d.get(query, 'Not Found')` to safely look up values without raising a KeyError.",
    "Print the result.",
  ],
  descriptionTemplate: `## What You'll Learn
How to store key-value associations in Python dictionaries (\`dict\`).

## The Concept
Dictionaries store mappings for fast lookups:

\`\`\`python
capitals = {"France": "Paris", "Japan": "Tokyo"}
# Safely get value or return default
print(capitals.get("Japan", "Unknown")) # Tokyo
print(capitals.get("Brazil", "Unknown")) # Unknown
\`\`\`

## Your Task
You are given space-separated \`Key:Value\` pairs on line 1, and a query key on line 2.
Print the associated value if present, or \`Not Found\` if missing.

## Example
Input:
\`\`\`
{{pairs}}
{{query}}
\`\`\`
Output:
\`\`\`
CALC_DICT_LOOKUP
\`\`\`
`,
  variables: [
    { name: "pairs", type: "string", options: ["apple:red banana:yellow grape:purple", "cat:meow dog:woof cow:moo"] },
    { name: "query", type: "string", options: ["banana", "dog", "lion", "apple"] },
  ],
  testCases: [
    {
      label: "Performs dictionary lookup",
      inputTemplate: "{{pairs}}\n{{query}}",
      expectedOutputTemplate: "CALC_DICT_LOOKUP",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_DICT_LOOKUP") {
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

const pyLevel13: CodeLabProblem = {
  id: "python-level-13",
  title: "Set Operations: Unique Elements",
  language: "python",
  level: 13,
  stage: levelToStage(13),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["building-up", "sets"],
  hints: [
    "Convert a list of items to a set using `set(items)` to automatically eliminate duplicates.",
    "Sort the unique items with `sorted(...)` and join them with spaces.",
    "Scaffold:\n```python\nitems = input().split()\nunique_sorted = sorted(set(items))\nprint(' '.join(unique_sorted))\n```",
  ],
  descriptionTemplate: `## What You'll Learn
How to eliminate duplicates and perform mathematical set operations with \`set\`.

## The Concept
A \`set\` is an unordered collection of distinct elements:

\`\`\`python
colors = ["red", "blue", "red", "green", "blue"]
unique_colors = set(colors)
print(len(unique_colors)) # 3
\`\`\`

## Your Task
Read a line of space-separated strings. Remove all duplicates, sort the unique items in alphabetical order, and print them separated by spaces.

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
      label: "Removes duplicates and sorts",
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

const pyLevel14: CodeLabProblem = {
  id: "python-level-14",
  title: "Lambda & Sorting by Key",
  language: "python",
  level: 14,
  stage: levelToStage(14),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["building-up", "lambdas", "sorting"],
  hints: [
    "Use `sorted(words, key=lambda w: len(w))` to sort words based on length.",
    "Print the sorted words joined by spaces: `print(' '.join(sorted_words))`.",
    "Scaffold:\n```python\nwords = input().split()\nsorted_words = sorted(words, key=lambda x: len(x))\nprint(' '.join(sorted_words))\n```",
  ],
  descriptionTemplate: `## What You'll Learn
How to write anonymous lambda functions (\`lambda x: ...\`) and use custom sorting keys.

## The Concept
A \`lambda\` is a concise one-line function. It is often passed to \`sorted()\` or \`.sort()\` as a \`key\`:

\`\`\`python
students = [("Alice", 85), ("Bob", 92), ("Charlie", 78)]
# Sort by grade (the second tuple element)
sorted_students = sorted(students, key=lambda s: s[1])
print(sorted_students)
\`\`\`

## Your Task
Read space-separated words and sort them in ascending order of their character length (shortest words first). If lengths match, maintain stable relative order.
Print the sorted words separated by spaces.

## Example
Input:
\`\`\`
{{words}}
\`\`\`
Output:
\`\`\`
CALC_SORT_LEN
\`\`\`
`,
  variables: [{ name: "words", type: "string", options: ["elephant dog cat butterfly ox", "banana fig date watermelon", "python js csharp rust"] }],
  testCases: [
    {
      label: "Sorts words by length using lambda",
      inputTemplate: "{{words}}",
      expectedOutputTemplate: "CALC_SORT_LEN",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_SORT_LEN") {
      const words = String(vars.words).split(" ");
      const sorted = [...words].sort((a, b) => a.length - b.length);
      return sorted.join(" ");
    }
    return tc.expectedOutputTemplate;
  },
};

const pyLevel15: CodeLabProblem = {
  id: "python-level-15",
  title: "Classes & Methods",
  language: "python",
  level: 15,
  stage: levelToStage(15),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["building-up", "oop", "classes"],
  hints: [
    "Define a class `Rectangle` with `__init__(self, w, h)` and a method `area(self): return self.w * self.h`.",
    "Scaffold:\n```python\nclass Rectangle:\n    def __init__(self, width, height):\n        self.width = width\n        self.height = height\n    def area(self):\n        return self.width * self.height\n```",
    "Instantiate `rect = Rectangle(w, h)` and print `rect.area()`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to create Object-Oriented classes with constructors (\`__init__\`) and instance methods.

## The Concept
Classes bundle properties and actions together:

\`\`\`python
class BankAccount:
    def __init__(self, owner, balance):
        self.owner = owner
        self.balance = balance

    def deposit(self, amount):
        self.balance += amount
        return self.balance

account = BankAccount("Alice", 100)
print(account.deposit(50)) # 150
\`\`\`

## Your Task
Create a \`Rectangle\` class with:
- \`__init__(self, width, height)\`
- \`area(self)\` returning \`width * height\`

Read two integers \`width\` and \`height\` from input (each on its own line), instantiate \`Rectangle\`, and print its area.

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
      label: "Calculates rectangle area",
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

const pyLevel16: CodeLabProblem = {
  id: "python-level-16",
  title: "Exception Handling: try / except",
  language: "python",
  level: 16,
  stage: levelToStage(16),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["building-up", "exceptions"],
  hints: [
    "Wrap integer conversion in `try: ... except ValueError: ...`.",
    "If valid, print `Valid: {num}`; if `ValueError` occurs, print `Invalid Number`.",
    "Scaffold:\n```python\ntext = input()\ntry:\n    val = int(text)\n    print(f\"Valid: {val}\")\nexcept ValueError:\n    print(\"Invalid Number\")\n```",
  ],
  descriptionTemplate: `## What You'll Learn
How to prevent crashes and handle runtime errors gracefully with \`try\` and \`except\`.

## The Concept
When an operation fails (e.g. converting \`"abc"\` to an integer), Python raises an exception. We catch it to keep running:

\`\`\`python
try:
    quotient = 100 / 0
except ZeroDivisionError:
    print("Cannot divide by zero!")
\`\`\`

## Your Task
Read a string from input. Attempt to convert it to an integer with \`int()\`.
- If successful, print \`Valid: {num}\`.
- If a \`ValueError\` occurs, print \`Invalid Number\`.

## Example
Input:
\`\`\`
{{raw}}
\`\`\`
Output:
\`\`\`
CALC_PARSE
\`\`\`
`,
  variables: [{ name: "raw", type: "string", options: ["42", "python", "100", "xyz88"] }],
  testCases: [
    {
      label: "Catches parse errors",
      inputTemplate: "{{raw}}",
      expectedOutputTemplate: "CALC_PARSE",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_PARSE") {
      const parsed = parseInt(String(vars.raw), 10);
      return !isNaN(parsed) && String(parsed) === String(vars.raw).trim()
        ? `Valid: ${parsed}`
        : "Invalid Number";
    }
    return tc.expectedOutputTemplate;
  },
};

const pyLevel17: CodeLabProblem = {
  id: "python-level-17",
  title: "Zipping and Enumerating",
  language: "python",
  level: 17,
  stage: levelToStage(17),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["building-up", "zip", "enumerate"],
  hints: [
    "Use `zip(names, scores)` to iterate over pairs from two lists simultaneously.",
    "Format each line: `print(f\"{name}: {score}\")`.",
    "Scaffold:\n```python\nnames = input().split()\nscores = input().split()\nfor name, score in zip(names, scores):\n    print(f\"{name}: {score}\")\n```",
  ],
  descriptionTemplate: `## What You'll Learn
How to iterate through multiple lists in parallel with \`zip()\`.

## The Concept
\`zip()\` combines corresponding elements from two or more lists into tuples:

\`\`\`python
items = ["Pens", "Notebooks"]
quantities = [10, 5]
for item, qty in zip(items, quantities):
    print(f"{qty}x {item}")
\`\`\`

## Your Task
Read space-separated names on line 1, and space-separated scores on line 2.
Using \`zip()\`, print each student on a new line in the format \`{Name}: {Score}\`.

## Example
Input:
\`\`\`
{{names}}
{{scores}}
\`\`\`
Output:
\`\`\`
CALC_ZIP
\`\`\`
`,
  variables: [
    { name: "names", type: "string", options: ["Alice Bob Charlie", "Sam Jordan Alex"] },
    { name: "scores", type: "string", options: ["90 85 92", "78 88 95"] },
  ],
  testCases: [
    {
      label: "Zips names and scores",
      inputTemplate: "{{names}}\n{{scores}}",
      expectedOutputTemplate: "CALC_ZIP",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_ZIP") {
      const names = String(vars.names).split(" ");
      const scores = String(vars.scores).split(" ");
      return names.map((n, i) => `${n}: ${scores[i]}`).join("\n");
    }
    return tc.expectedOutputTemplate;
  },
};

const pyLevel18: CodeLabProblem = {
  id: "python-level-18",
  title: "Dictionary Comprehensions",
  language: "python",
  level: 18,
  stage: levelToStage(18),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["building-up", "comprehensions", "dictionaries"],
  hints: [
    "Dictionary comprehension syntax: `{word: len(word) for word in words}`.",
    "Sort the keys and print `{key}:{length}` for each entry.",
    "Scaffold:\n```python\nwords = input().split()\nlengths = {w: len(w) for w in words}\nfor k in sorted(lengths.keys()):\n    print(f\"{k}:{lengths[k]}\")\n```",
  ],
  descriptionTemplate: `## What You'll Learn
How to construct dictionaries with **Dictionary Comprehensions** (\`{k: v for ...}\`).

## The Concept
Dictionary comprehensions map elements to computed values:

\`\`\`python
prices = {"itemA": 10, "itemB": 20}
discounted = {k: v * 0.9 for k, v in prices.items()}
\`\`\`

## Your Task
Read space-separated words from input. Construct a dictionary mapping each word to its character length (\`len(word)\`).
For each word in alphabetical order, print \`{word}:{length}\` on a new line.

## Example
Input:
\`\`\`
{{wrd}}
\`\`\`
Output:
\`\`\`
CALC_DICT_COMP
\`\`\`
`,
  variables: [{ name: "wrd", type: "string", options: ["dog elephant ant cat", "apple cherry date banana", "sun moon planet"] }],
  testCases: [
    {
      label: "Constructs dictionary with lengths",
      inputTemplate: "{{wrd}}",
      expectedOutputTemplate: "CALC_DICT_COMP",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_DICT_COMP") {
      const words = String(vars.wrd).split(" ");
      const map: Record<string, number> = {};
      for (const w of words) map[w] = w.length;
      const sortedKeys = Object.keys(map).sort();
      return sortedKeys.map((k) => `${k}:${map[k]}`).join("\n");
    }
    return tc.expectedOutputTemplate;
  },
};

const pyLevel19: CodeLabProblem = {
  id: "python-level-19",
  title: "Stack with list (append / pop)",
  language: "python",
  level: 19,
  stage: levelToStage(19),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["building-up", "stack", "data-structures"],
  hints: [
    "Python lists can be used as LIFO stacks using `.append()` to push and `.pop()` to retrieve the most recent item.",
    "Append all words to a stack, then pop them into a new list or print them in reverse.",
    "Scaffold:\n```python\nstack = []\nfor item in input().split():\n    stack.append(item)\npopped = []\nwhile stack:\n    popped.append(stack.pop())\nprint(' '.join(popped))\n```",
  ],
  descriptionTemplate: `## What You'll Learn
How to use Python lists as **Stacks** (Last-In-First-Out).

## The Concept
\`.append()\` adds an element to the top of the stack, and \`.pop()\` removes and returns the top element:

\`\`\`python
history = []
history.append("page1.html")
history.append("page2.html")
print(history.pop()) # "page2.html"
\`\`\`

## Your Task
Read space-separated words, push them onto a stack, and print them in popped order separated by spaces.

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
  variables: [{ name: "words", type: "string", options: ["alpha beta gamma", "first second third fourth", "red green blue"] }],
  testCases: [
    {
      label: "Pops elements from stack",
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

const pyLevel20: CodeLabProblem = {
  id: "python-level-20",
  title: "Queues with collections.deque",
  language: "python",
  level: 20,
  stage: levelToStage(20),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["building-up", "queue", "collections"],
  hints: [
    "Import `deque` from `collections`: `from collections import deque`.",
    "Enqueue with `.append()` and dequeue from the front in $O(1)$ time with `.popleft()`.",
    "Dequeue `K` times, then print the element remaining at the front (`queue[0]`).",
  ],
  descriptionTemplate: `## What You'll Learn
How to implement fast $O(1)$ FIFO Queues using \`collections.deque\`.

## The Concept
\`collections.deque\` is a double-ended queue that supports fast $O(1)$ appends and pops from both ends:

\`\`\`python
from collections import deque

queue = deque(["Customer 1", "Customer 2"])
queue.append("Customer 3")
served = queue.popleft() # "Customer 1"
print(f"Now serving: {served}")
\`\`\`

## Your Task
Read space-separated names on line 1, and an integer \`K\` on line 2.
Load names into a \`deque\`, call \`popleft()\` \`K\` times, and print the name currently at the front of the queue.

## Example
Input:
\`\`\`
{{names}}
{{k}}
\`\`\`
Output:
\`\`\`
CALC_QUEUE
\`\`\`
`,
  variables: [
    { name: "names", type: "string", options: ["Alice Bob Charlie David Emma", "A B C D E"] },
    { name: "k", type: "number", min: 1, max: 2 },
  ],
  testCases: [
    {
      label: "Processes queue with deque",
      inputTemplate: "{{names}}\n{{k}}",
      expectedOutputTemplate: "CALC_QUEUE",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_QUEUE") {
      const names = String(vars.names).split(" ");
      const k = Number(vars.k);
      return names[k] || "Empty";
    }
    return tc.expectedOutputTemplate;
  },
};

// ─────────────────────────────────────────────────────────────────
// LEVELS 21–30: GETTING GOOD
// ─────────────────────────────────────────────────────────────────

const pyLevel21: CodeLabProblem = {
  id: "python-level-21",
  title: "Class Inheritance & super()",
  language: "python",
  level: 21,
  stage: levelToStage(21),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["getting-good", "oop", "inheritance"],
  hints: [
    "Define base class `Animal` with method `speak()`. Create derived classes `Dog(Animal)` and `Cat(Animal)` overriding `speak()`.",
    "Instantiate the selected animal class and print `animal.speak()`.",
    "Scaffold:\n```python\nclass Animal:\n    def speak(self): return \"Some Sound\"\nclass Dog(Animal):\n    def speak(self): return \"Woof!\"\nclass Cat(Animal):\n    def speak(self): return \"Meow!\"\n```",
  ],
  descriptionTemplate: `## What You'll Learn
How to reuse logic and override behaviors with class inheritance in Python.

## The Concept
Subclasses inherit attributes from their parent classes and can customize specific methods:

\`\`\`python
class Employee:
    def get_role(self):
        return "General Staff"

class Manager(Employee):
    def get_role(self):
        return "Team Lead"
\`\`\`

## Your Task
Create:
- Base class \`Animal\` with method \`speak()\` returning \`"Some Sound"\`
- Derived class \`Dog\` overriding \`speak()\` returning \`"Woof!"\`
- Derived class \`Cat\` overriding \`speak()\` returning \`"Meow!"\`

Read an animal type (\`Dog\` or \`Cat\`) from input, instantiate it, and print its \`speak()\` sound.

## Example
Input:
\`\`\`
{{atype}}
\`\`\`
Output:
\`\`\`
CALC_SPEAK
\`\`\`
`,
  variables: [{ name: "atype", type: "string", options: ["Dog", "Cat"] }],
  testCases: [
    {
      label: "Calls overridden speak method",
      inputTemplate: "{{atype}}",
      expectedOutputTemplate: "CALC_SPEAK",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_SPEAK") {
      return String(vars.atype) === "Dog" ? "Woof!" : "Meow!";
    }
    return tc.expectedOutputTemplate;
  },
};

const pyLevel22: CodeLabProblem = {
  id: "python-level-22",
  title: "Decorators",
  language: "python",
  level: 22,
  stage: levelToStage(22),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["getting-good", "decorators"],
  hints: [
    "A decorator wraps a function: `def double_result(func): def wrapper(*args): return func(*args) * 2; return wrapper`.",
    "Apply it with `@double_result` above your function definition.",
    "Scaffold:\n```python\ndef double_result(func):\n    def wrapper(x):\n        return func(x) * 2\n    return wrapper\n\n@double_result\ndef add_five(n):\n    return n + 5\n```",
  ],
  descriptionTemplate: `## What You'll Learn
How to modify or extend function behavior using **Decorators** (\`@decorator\`).

## The Concept
A decorator is a function that takes another function as input, extends its behavior, and returns a new function:

\`\`\`python
def uppercase_decorator(func):
    def wrapper(text):
        original = func(text)
        return original.upper()
    return wrapper

@uppercase_decorator
def greet(name):
    return f"hello {name}"

print(greet("sam")) # "HELLO SAM"
\`\`\`

## Your Task
Create a decorator \`double_result\` that doubles whatever number the wrapped function returns.
Apply \`@double_result\` to a function \`add_ten(x)\` that computes \`x + 10\`.
Read an integer \`n\` from input and print the result of calling \`add_ten(n)\`.

## Example
Input:
\`\`\`
{{n}}
\`\`\`
Output:
\`\`\`
CALC_DECORATOR
\`\`\`
`,
  variables: [{ name: "n", type: "number", min: 3, max: 15 }],
  testCases: [
    {
      label: "Executes decorator wrapped function",
      inputTemplate: "{{n}}",
      expectedOutputTemplate: "CALC_DECORATOR",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_DECORATOR") {
      const n = Number(vars.n);
      return String((n + 10) * 2);
    }
    return tc.expectedOutputTemplate;
  },
};

const pyLevel23: CodeLabProblem = {
  id: "python-level-23",
  title: "Generators & yield",
  language: "python",
  level: 23,
  stage: levelToStage(23),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["getting-good", "generators"],
  hints: [
    "A generator uses `yield` instead of `return` to produce values lazily on demand.",
    "Write a generator function `def count_evens(limit):` yielding even numbers up to `limit`.",
    "Scaffold:\n```python\ndef even_gen(limit):\n    for i in range(2, limit + 1, 2):\n        yield i\n\nlimit = int(input())\nprint(' '.join(map(str, even_gen(limit))))\n```",
  ],
  descriptionTemplate: `## What You'll Learn
How to generate values on-demand with memory efficiency using \`yield\` and **Generators**.

## The Concept
Generators produce items one at a time without allocating entire arrays in memory:

\`\`\`python
def countdown(n):
    while n > 0:
        yield n
        n -= 1

for val in countdown(3):
    print(val) # 3, then 2, then 1
\`\`\`

## Your Task
Write a generator function \`even_gen(limit)\` that yields all even numbers from \`2\` up to \`limit\` (inclusive).
Read an integer \`limit\` from input and print the yielded numbers separated by spaces.

## Example
Input:
\`\`\`
{{limit}}
\`\`\`
Output:
\`\`\`
CALC_GEN
\`\`\`
`,
  variables: [{ name: "limit", type: "number", min: 6, max: 16 }],
  testCases: [
    {
      label: "Yields numbers from generator",
      inputTemplate: "{{limit}}",
      expectedOutputTemplate: "CALC_GEN",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (vars, tc) => {
    if (tc.expectedOutputTemplate === "CALC_GEN") {
      const lim = Number(vars.limit);
      const evens: number[] = [];
      for (let i = 2; i <= lim; i += 2) evens.push(i);
      return evens.join(" ");
    }
    return tc.expectedOutputTemplate;
  },
};

const pyLevel24: CodeLabProblem = {
  id: "python-level-24",
  title: "JSON Parsing",
  language: "python",
  level: 24,
  stage: levelToStage(24),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["getting-good", "json"],
  hints: [
    "Use `import json` and `data = json.loads(input_str)` to parse a JSON string into a Python dictionary.",
    "Access the requested key: `print(data.get(query_key, 'Not Found'))`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to deserialize JSON text into Python data structures with the built-in \`json\` module.

## The Concept
\`json.loads()\` converts a JSON formatted string into native Python dictionaries and lists:

\`\`\`python
import json

raw = '{"name": "Alice", "role": "Admin"}'
data = json.loads(raw)
print(data["role"]) # Admin
\`\`\`

## Your Task
Read a JSON string on line 1 and a property name on line 2.
Parse the JSON and print the value corresponding to the property name.

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
      label: "Parses JSON and extracts key",
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

const pyLevel25: CodeLabProblem = {
  id: "python-level-25",
  title: "Recursion: Factorial",
  language: "python",
  level: 25,
  stage: levelToStage(25),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["getting-good", "recursion"],
  hints: [
    "Base case: `if n <= 1: return 1`. Recursive step: `return n * factorial(n - 1)`.",
    "Scaffold:\n```python\ndef factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)\n\nprint(factorial(int(input())))\n```",
  ],
  descriptionTemplate: `## What You'll Learn
How to write recursive functions with base and recursive cases.

## The Concept
A function that calls itself must have a base case to prevent infinite loops:

\`\`\`python
def countdown(n):
    if n == 0:
        return "Done"
    print(n)
    return countdown(n - 1)
\`\`\`

## Your Task
Write a recursive function \`factorial(n)\` that computes $N! = N \\times (N-1) \\times \\dots \\times 1$.
Read an integer $N$ ($1 \\le N \\le 10$) and print its factorial.

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

const pyLevel26: CodeLabProblem = {
  id: "python-level-26",
  title: "Binary Search",
  language: "python",
  level: 26,
  stage: levelToStage(26),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["getting-good", "algorithms", "binary-search"],
  hints: [
    "Initialize `low = 0` and `high = len(arr) - 1`. Check `mid = (low + high) // 2` in each step.",
    "If `arr[mid] == target`, return `mid`. If `arr[mid] < target`, move `low = mid + 1`; else `high = mid - 1`.",
    "If not found after the loop, return `-1`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to find elements in sorted lists in $O(\\log N)$ time using **Binary Search**.

## The Concept
Binary search repeatedly splits the search area in half:

\`\`\`python
def search(arr, target):
    l, r = 0, len(arr) - 1
    while l <= r:
        m = (l + r) // 2
        if arr[m] == target:
            return m
        elif arr[m] < target:
            l = m + 1
        else:
            r = m - 1
    return -1
\`\`\`

## Your Task
Read two lines:
1. Sorted space-separated integers
2. Target integer to find

Print the 0-based index of the target in the array, or \`-1\` if not found.

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
      const target = Number(vars.starget);
      return String(arr.indexOf(target));
    }
    return tc.expectedOutputTemplate;
  },
};

const pyLevel27: CodeLabProblem = {
  id: "python-level-27",
  title: "Two Pointers: Palindrome Check",
  language: "python",
  level: 27,
  stage: levelToStage(27),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["getting-good", "two-pointers"],
  hints: [
    "Use two pointers: `l = 0` and `r = len(s) - 1`. Check `if s[l] != s[r]: return False`.",
    "Advance `l += 1` and `r -= 1` while `l < r`.",
    "Print `True` if all characters match, otherwise `False`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to check mirrored sequences in $O(N)$ time and $O(1)$ auxiliary space with **Two Pointers**.

## The Concept
Two pointers start at opposite ends and march towards the center:

\`\`\`python
def is_symmetric(arr):
    l, r = 0, len(arr) - 1
    while l < r:
        if arr[l] != arr[r]:
            return False
        l += 1
        r -= 1
    return True
\`\`\`

## Your Task
Read a string from input. Print \`True\` if it is a palindrome, otherwise \`False\`.

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
  variables: [{ name: "palinWord", type: "string", options: ["racecar", "level", "deified", "python", "developer"] }],
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

const pyLevel28: CodeLabProblem = {
  id: "python-level-28",
  title: "Sliding Window: Max Subarray K",
  language: "python",
  level: 28,
  stage: levelToStage(28),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["getting-good", "algorithms", "sliding-window"],
  hints: [
    "Calculate the initial sum of the first `K` elements: `current = sum(nums[:k])`.",
    "Loop `for i in range(k, len(nums)):` update `current += nums[i] - nums[i - k]` and track `max_sum = max(max_sum, current)`.",
    "Print `max_sum`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to maintain continuous window totals in $O(N)$ time with the **Sliding Window** technique.

## The Concept
Instead of recalculating the window from scratch, add the incoming element and subtract the outgoing element:

\`\`\`python
data = [1, 4, 2, 10, 2, 3, 1]
# Size 2 sliding window
cur = sum(data[:2])
max_val = cur
for i in range(2, len(data)):
    cur += data[i] - data[i - 2]
    max_val = max(max_val, cur)
print(max_val) # 12 (from [2, 10])
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

const pyLevel29: CodeLabProblem = {
  id: "python-level-29",
  title: "Dynamic Programming: Longest Increasing Subsequence",
  language: "python",
  level: 29,
  stage: levelToStage(29),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["getting-good", "algorithms", "dp"],
  hints: [
    "Initialize `dp = [1] * len(nums)`.",
    "For `i` in range(1, len(nums)), check each `j` in range(i). If `nums[i] > nums[j]`, update `dp[i] = max(dp[i], dp[j] + 1)`.",
    "Print `max(dp)`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to solve optimization problems by caching subproblem solutions with **Dynamic Programming**.

## The Concept
DP caches intermediate subproblem results to prevent exponential redundant work:

\`\`\`python
# DP Fibonacci in O(N)
def fib(n):
    dp = [0] * (n + 1)
    dp[1] = 1
    for i in range(2, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]
    return dp[n]
\`\`\`

## Your Task
Read space-separated integers. Find and print the length of the **Longest Strictly Increasing Subsequence** (LIS).

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

const pyLevel30: CodeLabProblem = {
  id: "python-level-30",
  title: "Graph BFS: Shortest Path",
  language: "python",
  level: 30,
  stage: levelToStage(30),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.python,
  tags: ["getting-good", "graphs", "bfs"],
  hints: [
    "Represent the unweighted graph using an adjacency list dictionary: `graph = collections.defaultdict(list)`.",
    "Use a queue `queue = collections.deque([(start, 0)])` and a `visited` set.",
    "Pop from queue, check neighbors; when `node == target`, return `distance`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to traverse graphs and find the shortest path in unweighted networks using **Breadth-First Search** (\`BFS\`).

## The Concept
BFS explores graph nodes level-by-level using a FIFO queue, guaranteeing the shortest path in unweighted graphs:

\`\`\`python
from collections import deque

def bfs(graph, start, target):
    queue = deque([(start, 0)])
    visited = {start}
    while queue:
        node, dist = queue.popleft()
        if node == target:
            return dist
        for neighbor in graph.get(node, []):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, dist + 1))
    return -1
\`\`\`

## Your Task
You are given space-separated edges in the format \`u-v\` on line 1, and a space-separated pair \`start target\` on line 2.
Find and print the shortest distance (number of edges) from \`start\` to \`target\`. If unreachable, print \`-1\`.

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
      label: "Computes BFS shortest distance",
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

// ─────────────────────────────────────────────────────────────────
// EXPORT ALL 30 PYTHON PROBLEMS
// ─────────────────────────────────────────────────────────────────

export const pythonProblems: CodeLabProblem[] = [
  pyLevel1, pyLevel2, pyLevel3, pyLevel4, pyLevel5,
  pyLevel6, pyLevel7, pyLevel8, pyLevel9, pyLevel10,
  pyLevel11, pyLevel12, pyLevel13, pyLevel14, pyLevel15,
  pyLevel16, pyLevel17, pyLevel18, pyLevel19, pyLevel20,
  pyLevel21, pyLevel22, pyLevel23, pyLevel24, pyLevel25,
  pyLevel26, pyLevel27, pyLevel28, pyLevel29, pyLevel30,
];
