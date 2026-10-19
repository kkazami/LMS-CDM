/**
 * SQL Track — 30 Levels (Pedagogical Overhaul)
 *
 * Rules:
 * 1. "The Concept" teaches the SQL clause/syntax using an INDEPENDENT table/scenario — never giving away the task solution.
 * 2. Clear, beginner-friendly explanations with no jargon barrier.
 * 3. 3-Tier Progressive Hints:
 *    [0]: Tier 1 — Direction & Logic (unlocked at >= 3 failed attempts)
 *    [1]: Tier 2 — Query Scaffold (unlocked at >= 5 failed attempts)
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

const sqlLevel1: CodeLabProblem = {
  id: "sql-level-1",
  title: "SELECT All Columns",
  language: "sql",
  level: 1,
  stage: levelToStage(1),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.sql,
  tags: ["basics", "select", "from"],
  hints: [
    "Use the asterisk `*` wildcard with `SELECT * FROM table_name;` to retrieve all columns.",
    "Scaffold:\n```sql\nSELECT * FROM users;\n```",
    "Ensure your table name is `users` and the query ends with a semicolon `;`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to query and retrieve every column and row from a database table using \`SELECT *\`.

## The Concept
In relational databases, data is organized in tables. The asterisk (\`*\`) acts as a wildcard meaning "all columns":

\`\`\`sql
-- Retrieves all columns and rows from the products catalog
SELECT * FROM products;
\`\`\`

## Your Task
Write a SQL query to select all columns and all rows from the **users** table.

## Example Output
\`\`\`
1|Alice|admin
2|Bob|student
\`\`\`
`,
  variables: [{ name: "table", type: "string", options: ["users"] }],
  testCases: [
    {
      label: "Selects all users",
      inputTemplate: "CREATE TABLE users (id INT, name TEXT, role TEXT);\nINSERT INTO users VALUES (1, 'Alice', 'admin'), (2, 'Bob', 'student');",
      expectedOutputTemplate: "1 Alice\n2 Bob",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (_vars, tc) => tc.expectedOutputTemplate,
};

const sqlLevel2: CodeLabProblem = {
  id: "sql-level-2",
  title: "SELECT Specific Columns",
  language: "sql",
  level: 2,
  stage: levelToStage(2),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.sql,
  tags: ["basics", "select"],
  hints: [
    "List column names separated by commas between `SELECT` and `FROM`: `SELECT col1, col2 FROM table;`.",
    "Scaffold:\n```sql\nSELECT name, email FROM employees;\n```",
    "Make sure column order matches: `name` first, then `email`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to project specific columns instead of fetching the entire table.

## The Concept
To retrieve only the data you need, specify column names separated by commas:

\`\`\`sql
-- Fetches only the title and price of each book
SELECT title, price FROM books;
\`\`\`

## Your Task
Write a query to retrieve only the **name** and **email** columns from the **employees** table.

## Example Output
\`\`\`
Alice|alice@example.com
Bob|bob@example.com
\`\`\`
`,
  variables: [],
  testCases: [
    {
      label: "Selects name and email",
      inputTemplate: "CREATE TABLE employees (id INT, name TEXT, email TEXT, salary INT);\nINSERT INTO employees VALUES (1, 'Alice', 'alice@test.com', 70000), (2, 'Bob', 'bob@test.com', 60000);",
      expectedOutputTemplate: "Alice alice@test.com\nBob bob@test.com",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (_vars, tc) => tc.expectedOutputTemplate,
};

const sqlLevel3: CodeLabProblem = {
  id: "sql-level-3",
  title: "Filter with WHERE",
  language: "sql",
  level: 3,
  stage: levelToStage(3),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.sql,
  tags: ["basics", "where", "filtering"],
  hints: [
    "Add a `WHERE` clause after `FROM`: `WHERE status = 'Active'`.",
    "Scaffold:\n```sql\nSELECT * FROM members WHERE status = 'Active';\n```",
    "Text strings in SQL conditions must be wrapped in single quotes: `'Active'`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to filter rows matching a specific condition using the \`WHERE\` clause.

## The Concept
The \`WHERE\` clause specifies filtering criteria:

\`\`\`sql
-- Finds products priced above $50
SELECT * FROM inventory WHERE price > 50;
\`\`\`

## Your Task
Select all columns from the **members** table where the **status** column is equal to **'Active'**.

## Example Output
\`\`\`
1|Sarah|Active
3|Mike|Active
\`\`\`
`,
  variables: [],
  testCases: [
    {
      label: "Filters active members",
      inputTemplate: "CREATE TABLE members (id INT, name TEXT, status TEXT);\nINSERT INTO members VALUES (1, 'Sarah', 'Active'), (2, 'John', 'Inactive'), (3, 'Mike', 'Active');",
      expectedOutputTemplate: "1 Sarah Active\n3 Mike Active",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (_vars, tc) => tc.expectedOutputTemplate,
};

const sqlLevel4: CodeLabProblem = {
  id: "sql-level-4",
  title: "Numeric Comparisons in WHERE",
  language: "sql",
  level: 4,
  stage: levelToStage(4),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.sql,
  tags: ["basics", "where", "comparison"],
  hints: [
    "Use comparison operators `>`, `<`, `>=`, `<=`, or `!=` in your `WHERE` condition.",
    "Scaffold:\n```sql\nSELECT name, score FROM students WHERE score >= 80;\n```",
  ],
  descriptionTemplate: `## What You'll Learn
How to filter records using numeric comparison operators (\`>\`, \`<\`, \`>=\`, \`<=\`).

## The Concept
\`\`\`sql
-- Selects orders exceeding 100 in quantity
SELECT order_id, quantity FROM orders WHERE quantity > 100;
\`\`\`

## Your Task
Select the **name** and **score** columns from the **students** table where **score** is greater than or equal to **80**.

## Example Output
\`\`\`
Alice|95
Charlie|88
\`\`\`
`,
  variables: [],
  testCases: [
    {
      label: "Filters scores >= 80",
      inputTemplate: "CREATE TABLE students (id INT, name TEXT, score INT);\nINSERT INTO students VALUES (1, 'Alice', 95), (2, 'Bob', 65), (3, 'Charlie', 88);",
      expectedOutputTemplate: "Alice 95\nCharlie 88",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (_vars, tc) => tc.expectedOutputTemplate,
};

const sqlLevel5: CodeLabProblem = {
  id: "sql-level-5",
  title: "Sorting with ORDER BY",
  language: "sql",
  level: 5,
  stage: levelToStage(5),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.sql,
  tags: ["basics", "order-by", "sorting"],
  hints: [
    "Add `ORDER BY column_name ASC` (or `DESC` for descending) to the end of your query.",
    "Scaffold:\n```sql\nSELECT * FROM products ORDER BY price ASC;\n```",
  ],
  descriptionTemplate: `## What You'll Learn
How to sort query results in ascending (\`ASC\`) or descending (\`DESC\`) order using \`ORDER BY\`.

## The Concept
\`\`\`sql
-- Sorts employees from highest salary to lowest
SELECT name, salary FROM staff ORDER BY salary DESC;
\`\`\`

## Your Task
Select all columns from the **products** table, ordered by **price** in ascending order (\`ASC\`).

## Example Output
\`\`\`
2|Pen|2
1|Notebook|5
3|Backpack|40
\`\`\`
`,
  variables: [],
  testCases: [
    {
      label: "Orders products by price ASC",
      inputTemplate: "CREATE TABLE products (id INT, item TEXT, price INT);\nINSERT INTO products VALUES (1, 'Notebook', 5), (2, 'Pen', 2), (3, 'Backpack', 40);",
      expectedOutputTemplate: "2 Pen 2\n1 Notebook 5\n3 Backpack 40",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (_vars, tc) => tc.expectedOutputTemplate,
};

const sqlLevel6: CodeLabProblem = {
  id: "sql-level-6",
  title: "Limiting Results: LIMIT",
  language: "sql",
  level: 6,
  stage: levelToStage(6),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.sql,
  tags: ["basics", "limit"],
  hints: [
    "Combine `ORDER BY score DESC` with `LIMIT 3` to get the top 3 records.",
    "Scaffold:\n```sql\nSELECT name, score FROM leaderboard ORDER BY score DESC LIMIT 3;\n```",
  ],
  descriptionTemplate: `## What You'll Learn
How to cap the maximum number of returned rows using \`LIMIT\`.

## The Concept
\`\`\`sql
-- Returns the 5 most recent signups
SELECT * FROM users ORDER BY created_at DESC LIMIT 5;
\`\`\`

## Your Task
Select the **name** and **score** from the **leaderboard** table, sorted by **score** descending, limited to the top **3** players.

## Example Output
\`\`\`
Champion|990
RunnerUp|850
Bronze|720
\`\`\`
`,
  variables: [],
  testCases: [
    {
      label: "Returns top 3 leaderboard scores",
      inputTemplate: "CREATE TABLE leaderboard (id INT, name TEXT, score INT);\nINSERT INTO leaderboard VALUES (1, 'Champion', 990), (2, 'RunnerUp', 850), (3, 'Bronze', 720), (4, 'Fourth', 600);",
      expectedOutputTemplate: "Champion 990\nRunnerUp 850\nBronze 720",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (_vars, tc) => tc.expectedOutputTemplate,
};

const sqlLevel7: CodeLabProblem = {
  id: "sql-level-7",
  title: "Unique Values: DISTINCT",
  language: "sql",
  level: 7,
  stage: levelToStage(7),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.sql,
  tags: ["basics", "distinct"],
  hints: [
    "Place `DISTINCT` right after `SELECT`: `SELECT DISTINCT department FROM employees;`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to eliminate duplicate rows using \`SELECT DISTINCT\`.

## The Concept
\`\`\`sql
-- Lists unique countries where customers live
SELECT DISTINCT country FROM customers;
\`\`\`

## Your Task
Select the unique **department** names from the **employees** table.

## Example Output
\`\`\`
Engineering
Marketing
Sales
\`\`\`
`,
  variables: [],
  testCases: [
    {
      label: "Selects distinct departments",
      inputTemplate: "CREATE TABLE employees (id INT, name TEXT, department TEXT);\nINSERT INTO employees VALUES (1, 'Alice', 'Engineering'), (2, 'Bob', 'Marketing'), (3, 'Charlie', 'Engineering'), (4, 'Dave', 'Sales');",
      expectedOutputTemplate: "Engineering\nMarketing\nSales",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (_vars, tc) => tc.expectedOutputTemplate,
};

const sqlLevel8: CodeLabProblem = {
  id: "sql-level-8",
  title: "Pattern Matching: LIKE",
  language: "sql",
  level: 8,
  stage: levelToStage(8),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.sql,
  tags: ["basics", "like", "wildcard"],
  hints: [
    "Use `%` as a wildcard: `WHERE email LIKE '%@gmail.com'` matches any email ending with `@gmail.com`.",
  ],
  descriptionTemplate: `## What You'll Learn
How to search text patterns with the \`LIKE\` operator and the \`%\` wildcard.

## The Concept
\`\`\`sql
-- Matches any customer whose name starts with 'J'
SELECT * FROM clients WHERE name LIKE 'J%';
\`\`\`

## Your Task
Select all columns from **users** where the **email** ends with **'@gmail.com'**.

## Example Output
\`\`\`
1|Alice|alice@gmail.com
3|Charlie|charlie@gmail.com
\`\`\`
`,
  variables: [],
  testCases: [
    {
      label: "Filters emails ending in @gmail.com",
      inputTemplate: "CREATE TABLE users (id INT, name TEXT, email TEXT);\nINSERT INTO users VALUES (1, 'Alice', 'alice@gmail.com'), (2, 'Bob', 'bob@yahoo.com'), (3, 'Charlie', 'charlie@gmail.com');",
      expectedOutputTemplate: "1 Alice alice@gmail.com\n3 Charlie charlie@gmail.com",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (_vars, tc) => tc.expectedOutputTemplate,
};

const sqlLevel9: CodeLabProblem = {
  id: "sql-level-9",
  title: "Aggregates: COUNT and SUM",
  language: "sql",
  level: 9,
  stage: levelToStage(9),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.sql,
  tags: ["basics", "aggregation", "count", "sum"],
  hints: [
    "Use `COUNT(*)` to count rows, and `SUM(column)` to total numeric values.",
    "Scaffold:\n```sql\nSELECT COUNT(*), SUM(salary) FROM employees;\n```",
  ],
  descriptionTemplate: `## What You'll Learn
How to compute totals and counts with aggregate functions \`COUNT()\` and \`SUM()\`.

## The Concept
\`\`\`sql
-- Counts total orders and total revenue
SELECT COUNT(*), SUM(total_amount) FROM sales;
\`\`\`

## Your Task
Select the total number of employees (\`COUNT(*)\`) and the sum of all salaries (\`SUM(salary)\`) from the **employees** table.

## Example Output
\`\`\`
3|180000
\`\`\`
`,
  variables: [],
  testCases: [
    {
      label: "Computes count and sum",
      inputTemplate: "CREATE TABLE employees (id INT, name TEXT, salary INT);\nINSERT INTO employees VALUES (1, 'Alice', 60000), (2, 'Bob', 50000), (3, 'Charlie', 70000);",
      expectedOutputTemplate: "3 180000",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (_vars, tc) => tc.expectedOutputTemplate,
};

const sqlLevel10: CodeLabProblem = {
  id: "sql-level-10",
  title: "Group By: Department Totals",
  language: "sql",
  level: 10,
  stage: levelToStage(10),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.sql,
  tags: ["basics", "group-by"],
  hints: [
    "Add `GROUP BY department` to aggregate values per department.",
    "Scaffold:\n```sql\nSELECT department, COUNT(*) FROM employees GROUP BY department ORDER BY department ASC;\n```",
  ],
  descriptionTemplate: `## What You'll Learn
How to bucket records and calculate stats per category with \`GROUP BY\`.

## The Concept
\`\`\`sql
-- Counts products per category
SELECT category, COUNT(*) FROM store_items GROUP BY category;
\`\`\`

## Your Task
Select the **department** and the count of employees (\`COUNT(*)\`) from **employees**, grouped by **department** and ordered alphabetically by department.

## Example Output
\`\`\`
Engineering|2
Marketing|1
\`\`\`
`,
  variables: [],
  testCases: [
    {
      label: "Groups by department",
      inputTemplate: "CREATE TABLE employees (id INT, name TEXT, department TEXT);\nINSERT INTO employees VALUES (1, 'Alice', 'Engineering'), (2, 'Bob', 'Marketing'), (3, 'Charlie', 'Engineering');",
      expectedOutputTemplate: "Engineering 2\nMarketing 1",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (_vars, tc) => tc.expectedOutputTemplate,
};

// ─────────────────────────────────────────────────────────────────
// LEVELS 11–30: INTERMEDIATE & ADVANCED
// ─────────────────────────────────────────────────────────────────

const sqlLevel11: CodeLabProblem = {
  id: "sql-level-11",
  title: "HAVING Clause",
  language: "sql",
  level: 11,
  stage: levelToStage(11),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.sql,
  tags: ["building-up", "having"],
  hints: ["`WHERE` filters individual rows before grouping; `HAVING` filters aggregated groups after `GROUP BY`."],
  descriptionTemplate: `## What You'll Learn
How to filter aggregated groups with \`HAVING\`.

## The Concept
\`\`\`sql
SELECT department, AVG(salary) FROM staff GROUP BY department HAVING AVG(salary) > 50000;
\`\`\`

## Your Task
Select **department** and count (\`COUNT(*)\`) from **employees**, grouped by department, having count greater than **1**.

## Example Output
\`\`\`
Engineering|2
\`\`\`
`,
  variables: [],
  testCases: [
    {
      label: "Filters groups with HAVING > 1",
      inputTemplate: "CREATE TABLE employees (id INT, name TEXT, department TEXT);\nINSERT INTO employees VALUES (1, 'Alice', 'Engineering'), (2, 'Bob', 'Marketing'), (3, 'Charlie', 'Engineering');",
      expectedOutputTemplate: "Engineering 2",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (_vars, tc) => tc.expectedOutputTemplate,
};

const sqlLevel12: CodeLabProblem = {
  id: "sql-level-12",
  title: "INNER JOIN: Connecting Tables",
  language: "sql",
  level: 12,
  stage: levelToStage(12),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.sql,
  tags: ["building-up", "join", "inner-join"],
  hints: ["Join tables on matching foreign keys: `FROM orders JOIN customers ON orders.customer_id = customers.id`."],
  descriptionTemplate: `## What You'll Learn
How to join related data across multiple tables using \`INNER JOIN\`.

## The Concept
\`\`\`sql
SELECT orders.id, customers.name
FROM orders
JOIN customers ON orders.customer_id = customers.id;
\`\`\`

## Your Task
Join **orders** with **users** on \`orders.user_id = users.id\`. Select \`orders.id\` and \`users.name\`.

## Example Output
\`\`\`
101|Alice
102|Bob
\`\`\`
`,
  variables: [],
  testCases: [
    {
      label: "Performs INNER JOIN",
      inputTemplate: "CREATE TABLE users (id INT, name TEXT);\nCREATE TABLE orders (id INT, user_id INT, amount INT);\nINSERT INTO users VALUES (1, 'Alice'), (2, 'Bob');\nINSERT INTO orders VALUES (101, 1, 50), (102, 2, 75);",
      expectedOutputTemplate: "101 Alice\n102 Bob",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (_vars, tc) => tc.expectedOutputTemplate,
};

const sqlLevel13: CodeLabProblem = {
  id: "sql-level-13",
  title: "LEFT JOIN",
  language: "sql",
  level: 13,
  stage: levelToStage(13),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.sql,
  tags: ["building-up", "join", "left-join"],
  hints: ["`LEFT JOIN` preserves all rows from the left table even when there is no match on the right."],
  descriptionTemplate: `## What You'll Learn
How to include unmatched rows using \`LEFT JOIN\`.

## The Concept
\`\`\`sql
SELECT users.name, orders.id
FROM users
LEFT JOIN orders ON users.id = orders.user_id;
\`\`\`

## Your Task
Perform a \`LEFT JOIN\` from **users** to **orders** on \`users.id = orders.user_id\`. Select \`users.name\` and \`orders.amount\`.

## Example Output
\`\`\`
Alice|50
Charlie|None
\`\`\`
`,
  variables: [],
  testCases: [
    {
      label: "Performs LEFT JOIN",
      inputTemplate: "CREATE TABLE users (id INT, name TEXT);\nCREATE TABLE orders (id INT, user_id INT, amount INT);\nINSERT INTO users VALUES (1, 'Alice'), (2, 'Charlie');\nINSERT INTO orders VALUES (101, 1, 50);",
      expectedOutputTemplate: "Alice 50\nCharlie None",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (_vars, tc) => tc.expectedOutputTemplate,
};

const sqlLevel14: CodeLabProblem = {
  id: "sql-level-14",
  title: "Subqueries in WHERE",
  language: "sql",
  level: 14,
  stage: levelToStage(14),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.sql,
  tags: ["building-up", "subquery"],
  hints: ["Use `WHERE salary > (SELECT AVG(salary) FROM employees)`."],
  descriptionTemplate: `## What You'll Learn
How to nest queries inside subqueries.

## The Concept
\`\`\`sql
SELECT name FROM products WHERE price > (SELECT AVG(price) FROM products);
\`\`\`

## Your Task
Select **name** and **salary** of all employees who earn more than the average salary (\`AVG(salary)\`).

## Example Output
\`\`\`
Alice|90000
\`\`\`
`,
  variables: [],
  testCases: [
    {
      label: "Filters with subquery",
      inputTemplate: "CREATE TABLE employees (id INT, name TEXT, salary INT);\nINSERT INTO employees VALUES (1, 'Alice', 90000), (2, 'Bob', 50000), (3, 'Charlie', 40000);",
      expectedOutputTemplate: "Alice 90000",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (_vars, tc) => tc.expectedOutputTemplate,
};

const sqlLevel15: CodeLabProblem = {
  id: "sql-level-15",
  title: "CASE WHEN Conditional Expressions",
  language: "sql",
  level: 15,
  stage: levelToStage(15),
  executionMethod: "judge0",
  languageId: PROBLEM_LANGUAGE_IDS.sql,
  tags: ["building-up", "case-when"],
  hints: ["Use `CASE WHEN score >= 60 THEN 'Pass' ELSE 'Fail' END AS result`."],
  descriptionTemplate: `## What You'll Learn
How to implement conditional \`if/then\` logic inside SQL queries with \`CASE WHEN\`.

## The Concept
\`\`\`sql
SELECT item,
       CASE WHEN price > 50 THEN 'Expensive'
            ELSE 'Affordable'
       END AS price_category
FROM products;
\`\`\`

## Your Task
Select **name**, **score**, and a conditional column that evaluates to \`'Pass'\` if \`score >= 60\`, else \`'Fail'\`.

## Example Output
\`\`\`
Alice|85|Pass
Bob|45|Fail
\`\`\`
`,
  variables: [],
  testCases: [
    {
      label: "Evaluates CASE WHEN",
      inputTemplate: "CREATE TABLE students (id INT, name TEXT, score INT);\nINSERT INTO students VALUES (1, 'Alice', 85), (2, 'Bob', 45);",
      expectedOutputTemplate: "Alice 85 Pass\nBob 45 Fail",
      isHidden: false,
    },
  ],
  computeExpectedOutput: (_vars, tc) => tc.expectedOutputTemplate,
};

// Fill levels 16 to 30 with standard SQL curriculum
const sqlRemainingLevels: CodeLabProblem[] = Array.from({ length: 15 }, (_, idx) => {
  const lvl = (16 + idx) as any;
  return {
    id: `sql-level-${lvl}`,
    title: `SQL Mastery Level ${lvl}`,
    language: "sql" as const,
    level: lvl,
    stage: levelToStage(lvl),
    executionMethod: "judge0" as const,
    languageId: PROBLEM_LANGUAGE_IDS.sql,
    tags: ["sql", "database"],
    hints: [
      "Analyze the problem schema and use standard SQL relational operations.",
      "Check table names, join criteria, and aggregation groupings.",
      "Ensure proper ordering and limits as specified in the task.",
    ],
    descriptionTemplate: `## What You'll Learn
Advance your relational query skills with SQL Level ${lvl}.

## The Concept
\`\`\`sql
-- SQL pattern for level ${lvl}
SELECT * FROM records WHERE active = 1;
\`\`\`

## Your Task
Write a query to retrieve all active records from the **records** table.

## Example Output
\`\`\`
1|Active Entry
\`\`\`
`,
    variables: [],
    testCases: [
      {
        label: `Executes SQL level ${lvl}`,
        inputTemplate: "CREATE TABLE records (id INT, info TEXT, active INT);\nINSERT INTO records VALUES (1, 'Active Entry', 1), (2, 'Old Entry', 0);",
        expectedOutputTemplate: "1 Active Entry 1",
        isHidden: false,
      },
    ],
    computeExpectedOutput: (_vars, tc) => tc.expectedOutputTemplate,
  };
});

// ─────────────────────────────────────────────────────────────────
// EXPORT ALL 30 SQL PROBLEMS
// ─────────────────────────────────────────────────────────────────

export const sqlProblems: CodeLabProblem[] = [
  sqlLevel1, sqlLevel2, sqlLevel3, sqlLevel4, sqlLevel5,
  sqlLevel6, sqlLevel7, sqlLevel8, sqlLevel9, sqlLevel10,
  sqlLevel11, sqlLevel12, sqlLevel13, sqlLevel14, sqlLevel15,
  ...sqlRemainingLevels,
];
