import { test, expect } from '@playwright/test';
import {
  normalizeCode,
  calculateCodeSimilarity,
  compareSubmissions,
} from '../../../apps/web/src/lib/github/similarity-service';

test.describe('Code Similarity & Plagiarism Detection Engine', () => {
  test('strips comments and normalizes code strings', () => {
    const raw = `
      // Single line comment
      function calculateSum(a, b) {
        /* Multi
           line
           comment */
        return a + b; // inline comment
      }
    `;

    const tokens = normalizeCode(raw);
    expect(tokens).toContain('function');
    expect(tokens).toContain('ID_VAR');
    expect(tokens).toContain('return');
    expect(tokens.some((t) => t.includes('Single line comment'))).toBe(false);
    expect(tokens.some((t) => t.includes('Multi'))).toBe(false);
  });

  test('detects high similarity for identical and renamed variable code', () => {
    const codeA = `
      function fibonacci(n) {
        if (n <= 1) return n;
        return fibonacci(n - 1) + fibonacci(n - 2);
      }
    `;

    const codeB = `
      // Student B version with comments
      function fibonacci(num) {
        if (num <= 1) return num;
        return fibonacci(num - 1) + fibonacci(num - 2);
      }
    `;

    const sim = calculateCodeSimilarity(codeA, codeB);
    expect(sim).toBeGreaterThanOrEqual(75.0);
  });

  test('detects low similarity for fundamentally different code', () => {
    const codeA = `
      function bubbleSort(arr) {
        for (let i = 0; i < arr.length; i++) {
          for (let j = 0; j < arr.length - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
              let temp = arr[j];
              arr[j] = arr[j + 1];
              arr[j + 1] = temp;
            }
          }
        }
        return arr;
      }
    `;

    const codeB = `
      async function fetchUserProfile(userId) {
        const response = await fetch('/api/users/' + userId);
        const data = await response.json();
        return data.user.profile;
      }
    `;

    const sim = calculateCodeSimilarity(codeA, codeB);
    expect(sim).toBeLessThan(25.0);
  });

  test('compares multi-file submissions and sets flagged: true when threshold exceeded', () => {
    const subA = [
      {
        path: 'src/math.js',
        content: `
          export function add(a, b) { return a + b; }
          export function subtract(a, b) { return a - b; }
        `,
      },
    ];

    const subB = [
      {
        path: 'src/math.js',
        content: `
          // Copied implementation
          export function add(x, y) { return x + y; }
          export function subtract(x, y) { return x - y; }
        `,
      },
    ];

    const result = compareSubmissions(subA, subB, 80.0);
    expect(result.score).toBeGreaterThanOrEqual(80.0);
    expect(result.flagged).toBe(true);
    expect(result.fileBreakdown.length).toBeGreaterThan(0);
  });
});
