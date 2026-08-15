/**
 * SQL Problems — Levels 10, 20, 30
 *
 * Easy:         L10 (SELECT with WHERE)
 * Intermediate: L20 (JOIN with aggregate)
 * Hard:         L30 (Recursive CTE)
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
// Level 10 — SELECT with WHERE
// ═══════════════════════════════════════════════════════════════════

const sqlLevel10: CodeLabProblem = {
  id: "sql-select-where",
  title: "SELECT with WHERE Clause",
  language: "sql",
  level: 10,
  tier: "easy",
  languageId: PROBLEM_LANGUAGE_IDS.sql,
  tags: ["sql", "basics", "select", "where"],
  descriptionTemplate: `## SELECT with WHERE Clause

You have a \`students\` table with the following schema:

\`\`\`sql
CREATE TABLE students (
  id INTEGER PRIMARY KEY,
  name TEXT,
  grade INTEGER
);
\`\`\`

The table contains sample data:

| id | name      | grade |
|----|-----------|-------|
| 1  | Alice     | 85    |
| 2  | Bob       | 72    |
| 3  | Charlie   | 91    |
| 4  | Diana     | 68    |
| 5  | Eve       | 95    |
| 6  | Frank     | 78    |
| 7  | Grace     | 88    |

Write a SQL query that selects the **name** and **grade** of all students whose grade is **greater than {{minGrade}}**.

### Output
Rows should be ordered by **grade descending**. Each row should have name and grade separated by \`|\` (pipe character).

### Example (if minGrade = 80)
\`\`\`
Eve|95
Charlie|91
Grace|88
Alice|85
\`\`\`

### Constraints
- Use only SELECT, WHERE, ORDER BY
- Do not modify the table structure
`,
  variables: [
    { name: "minGrade", type: "number", min: 70, max: 90 },
  ],
  testCases: [
    { inputTemplate: "{{minGrade}}", expectedOutputTemplate: "", isHidden: false },
    { inputTemplate: "80", expectedOutputTemplate: "Eve|95\nCharlie|91\nGrace|88\nAlice|85", isHidden: false },
    { inputTemplate: "90", expectedOutputTemplate: "Eve|95\nCharlie|91", isHidden: false },
    { inputTemplate: "60", expectedOutputTemplate: "Eve|95\nCharlie|91\nGrace|88\nAlice|85\nFrank|78\nBob|72\nDiana|68", isHidden: true },
    { inputTemplate: "95", expectedOutputTemplate: "NONE", isHidden: true },
  ],
  hintTemplate:
    "Use SELECT name, grade FROM students WHERE grade > threshold ORDER BY grade DESC. Remember the pipe separator format for output.",
  computeExpectedOutput: (vars, tc) => {
    const input = sub(tc.inputTemplate, vars).trim();
    const minGrade = parseInt(input, 10);
    if (tc.expectedOutputTemplate && !tc.expectedOutputTemplate.includes("{{") && tc.expectedOutputTemplate !== "") {
      return tc.expectedOutputTemplate;
    }

    // Simulate the students table
    const students = [
      { name: "Alice", grade: 85 },
      { name: "Bob", grade: 72 },
      { name: "Charlie", grade: 91 },
      { name: "Diana", grade: 68 },
      { name: "Eve", grade: 95 },
      { name: "Frank", grade: 78 },
      { name: "Grace", grade: 88 },
    ];

    const filtered = students
      .filter(s => s.grade > minGrade)
      .sort((a, b) => b.grade - a.grade);

    if (filtered.length === 0) return "NONE";
    return filtered.map(s => `${s.name}|${s.grade}`).join("\n");
  },
};

// ═══════════════════════════════════════════════════════════════════
// Level 20 — JOIN with Aggregate
// ═══════════════════════════════════════════════════════════════════

const sqlLevel20: CodeLabProblem = {
  id: "sql-join-aggregate",
  title: "JOIN with Average Grade",
  language: "sql",
  level: 20,
  tier: "intermediate",
  languageId: PROBLEM_LANGUAGE_IDS.sql,
  tags: ["sql", "join", "aggregate", "group-by"],
  descriptionTemplate: `## JOIN with Average Grade

You have two tables:

\`\`\`sql
CREATE TABLE students (
  id INTEGER PRIMARY KEY,
  name TEXT
);

CREATE TABLE grades (
  id INTEGER PRIMARY KEY,
  student_id INTEGER,
  subject TEXT,
  score INTEGER
);
\`\`\`

**students:**

| id | name    |
|----|---------|
| 1  | Alice   |
| 2  | Bob     |
| 3  | Charlie |
| 4  | Diana   |

**grades:**

| id | student_id | subject    | score |
|----|------------|------------|-------|
| 1  | 1          | Math       | 90    |
| 2  | 1          | Science    | 85    |
| 3  | 1          | English    | 78    |
| 4  | 2          | Math       | 72    |
| 5  | 2          | Science    | 68    |
| 6  | 2          | English    | 74    |
| 7  | 3          | Math       | 95    |
| 8  | 3          | Science    | 92    |
| 9  | 3          | English    | 88    |
| 10 | 4          | Math       | 60    |
| 11 | 4          | Science    | 55    |
| 12 | 4          | English    | 70    |

Write a SQL query that JOINs the tables and returns students whose **average grade** is above **{{minAvg}}**.

### Output
Print \`name|avg_score\` per row, with avg_score rounded to 1 decimal place. Order by avg_score descending.

### Example (if minAvg = 80)
\`\`\`
Charlie|91.7
Alice|84.3
\`\`\`

### Constraints
- Use JOIN, GROUP BY, HAVING, ROUND()
`,
  variables: [
    { name: "minAvg", type: "number", min: 65, max: 85 },
  ],
  testCases: [
    { inputTemplate: "{{minAvg}}", expectedOutputTemplate: "", isHidden: false },
    { inputTemplate: "80", expectedOutputTemplate: "Charlie|91.7\nAlice|84.3", isHidden: false },
    { inputTemplate: "70", expectedOutputTemplate: "Charlie|91.7\nAlice|84.3\nBob|71.3", isHidden: false },
    { inputTemplate: "60", expectedOutputTemplate: "Charlie|91.7\nAlice|84.3\nBob|71.3\nDiana|61.7", isHidden: true },
    { inputTemplate: "92", expectedOutputTemplate: "NONE", isHidden: true },
  ],
  hintTemplate:
    "Use SELECT s.name, ROUND(AVG(g.score), 1) as avg_score FROM students s JOIN grades g ON s.id = g.student_id GROUP BY s.id HAVING avg_score > threshold ORDER BY avg_score DESC.",
  computeExpectedOutput: (vars, tc) => {
    const input = sub(tc.inputTemplate, vars).trim();
    const minAvg = parseFloat(input);
    if (tc.expectedOutputTemplate && !tc.expectedOutputTemplate.includes("{{") && tc.expectedOutputTemplate !== "") {
      return tc.expectedOutputTemplate;
    }

    // Simulate the tables
    const studentGrades: Array<{ name: string; avg: number }> = [
      { name: "Alice", avg: (90 + 85 + 78) / 3 },
      { name: "Bob", avg: (72 + 68 + 74) / 3 },
      { name: "Charlie", avg: (95 + 92 + 88) / 3 },
      { name: "Diana", avg: (60 + 55 + 70) / 3 },
    ];

    const filtered = studentGrades
      .filter(s => s.avg > minAvg)
      .sort((a, b) => b.avg - a.avg);

    if (filtered.length === 0) return "NONE";
    return filtered.map(s => `${s.name}|${s.avg.toFixed(1)}`).join("\n");
  },
};

// ═══════════════════════════════════════════════════════════════════
// Level 30 — Recursive CTE (Self-Referencing Hierarchy)
// ═══════════════════════════════════════════════════════════════════

const sqlLevel30: CodeLabProblem = {
  id: "sql-recursive-cte",
  title: "Recursive CTE — Employee Hierarchy",
  language: "sql",
  level: 30,
  tier: "hard",
  languageId: PROBLEM_LANGUAGE_IDS.sql,
  tags: ["sql", "cte", "recursion", "hierarchy"],
  descriptionTemplate: `## Recursive CTE — Employee Hierarchy

You have a self-referencing \`employees\` table:

\`\`\`sql
CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name TEXT,
  manager_id INTEGER
);
\`\`\`

**employees:**

| id | name       | manager_id |
|----|------------|------------|
| 1  | CEO        | NULL       |
| 2  | VP Eng     | 1          |
| 3  | VP Sales   | 1          |
| 4  | Eng Lead   | 2          |
| 5  | Sales Lead | 3          |
| 6  | Dev A      | 4          |
| 7  | Dev B      | 4          |
| 8  | Sales A    | 5          |
| 9  | Sales B    | 5          |
| 10 | Intern     | 6          |

Write a SQL query using a **recursive CTE** to find all descendants (direct and indirect reports) of the employee with id = **{{rootId}}**.

### Output
Print \`id|name|depth\` per row, where depth is the distance from the root node (root's direct reports = depth 1, their reports = depth 2, etc.). Order by depth ascending, then id ascending.

### Example (if rootId = 2)
\`\`\`
4|Eng Lead|1
6|Dev A|2
7|Dev B|2
10|Intern|3
\`\`\`

### Constraints
- Use WITH RECURSIVE
- Do not include the root node itself in the output
`,
  variables: [
    { name: "rootId", type: "number", min: 1, max: 5 },
  ],
  testCases: [
    { inputTemplate: "{{rootId}}", expectedOutputTemplate: "", isHidden: false },
    { inputTemplate: "2", expectedOutputTemplate: "4|Eng Lead|1\n6|Dev A|2\n7|Dev B|2\n10|Intern|3", isHidden: false },
    { inputTemplate: "1", expectedOutputTemplate: "2|VP Eng|1\n3|VP Sales|1\n4|Eng Lead|2\n5|Sales Lead|2\n6|Dev A|3\n7|Dev B|3\n8|Sales A|3\n9|Sales B|3\n10|Intern|4", isHidden: false },
    { inputTemplate: "4", expectedOutputTemplate: "6|Dev A|1\n7|Dev B|1\n10|Intern|2", isHidden: true },
    { inputTemplate: "3", expectedOutputTemplate: "5|Sales Lead|1\n8|Sales A|2\n9|Sales B|2", isHidden: true },
    { inputTemplate: "6", expectedOutputTemplate: "10|Intern|1", isHidden: true },
  ],
  hintTemplate:
    "Use WITH RECURSIVE cte AS (base case: SELECT where manager_id = rootId, depth 1; UNION ALL recursive case: JOIN employees ON employees.manager_id = cte.id, depth + 1). SELECT from cte ORDER BY depth, id.",
  computeExpectedOutput: (vars, tc) => {
    const input = sub(tc.inputTemplate, vars).trim();
    const rootId = parseInt(input, 10);
    if (tc.expectedOutputTemplate && !tc.expectedOutputTemplate.includes("{{") && tc.expectedOutputTemplate !== "") {
      return tc.expectedOutputTemplate;
    }

    // Simulate the employees table
    const employees = [
      { id: 1, name: "CEO", managerId: null as number | null },
      { id: 2, name: "VP Eng", managerId: 1 },
      { id: 3, name: "VP Sales", managerId: 1 },
      { id: 4, name: "Eng Lead", managerId: 2 },
      { id: 5, name: "Sales Lead", managerId: 3 },
      { id: 6, name: "Dev A", managerId: 4 },
      { id: 7, name: "Dev B", managerId: 4 },
      { id: 8, name: "Sales A", managerId: 5 },
      { id: 9, name: "Sales B", managerId: 5 },
      { id: 10, name: "Intern", managerId: 6 },
    ];

    // BFS to find descendants
    const result: Array<{ id: number; name: string; depth: number }> = [];
    const queue: Array<{ id: number; depth: number }> = [{ id: rootId, depth: 0 }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = employees.filter(e => e.managerId === current.id);
      for (const child of children) {
        const depth = current.depth + 1;
        result.push({ id: child.id, name: child.name, depth });
        queue.push({ id: child.id, depth });
      }
    }

    // Sort by depth asc, then id asc
    result.sort((a, b) => a.depth - b.depth || a.id - b.id);

    if (result.length === 0) return "NONE";
    return result.map(r => `${r.id}|${r.name}|${r.depth}`).join("\n");
  },
};

export const sqlProblems: CodeLabProblem[] = [
  sqlLevel10,
  sqlLevel20,
  sqlLevel30,
];
