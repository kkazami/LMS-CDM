import type { LabDefinition } from './schema';

export const MYSQL_LAB: LabDefinition = {
  title: 'Initialize a MySQL database', category: 'DATABASE', description: 'Create a local database and demonstrate its first table. Your instructor reviews the screenshot and explanation.',
  objective: 'Create and select a MySQL database, create a table, and inspect a sample row.',
  prerequisites: 'MySQL is already installed and running in an instructor-approved environment. Use sample data only.',
  requiredTools: 'MySQL client or MySQL Workbench; a screenshot tool.', estimatedMinutes: 30,
  steps: [
    { key: 'prepare', type: 'INSTRUCTIONS', title: 'Prepare your environment', required: true, config: { body: 'Open your own MySQL client. These instructions run on your computer, not in the LMS. Never share your database password. Include your evidence token in a query comment or label visible in your screenshot.' } },
    { key: 'initialize', type: 'COMMAND', title: 'Create and inspect the database', required: true, config: { body: 'Run these statements in your approved local environment. Use a fresh database name if this one already exists; do not delete existing databases.', language: 'sql', command: "CREATE DATABASE practical_lab;\nUSE practical_lab;\nCREATE TABLE lab_items (id INT PRIMARY KEY, label VARCHAR(80));\nINSERT INTO lab_items VALUES (1, 'My first lab');\nSELECT DATABASE();\nSHOW TABLES;\nSELECT * FROM lab_items;" } },
    { key: 'check', type: 'CHECKLIST', title: 'Check the result', required: true, config: { items: [{ id: 'database', label: 'I created and selected my own lab database.', required: true }, { id: 'table', label: 'The table and sample row are visible.', required: true }, { id: 'token', label: 'My evidence token is visible in the screenshot.', required: true }] } },
    { key: 'explain', type: 'TEXT_RESPONSE', title: 'Explain what changed', required: true, config: { prompt: 'What is the difference between CREATE DATABASE and USE? Explain briefly in your own words.', maxLength: 1500 } },
    { key: 'evidence', type: 'EVIDENCE_UPLOAD', title: 'Show your result', required: true, config: { instructions: 'Upload one screenshot showing the selected database, table, query result, and your evidence token. Exclude passwords and personal data.', minFiles: 1, maxFiles: 1 } },
  ],
};
