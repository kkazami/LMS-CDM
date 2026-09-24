import { test, expect } from '@playwright/test';
import { createSubmissionSnapshot } from '../../../apps/web/src/lib/github/snapshot-service';
import AdmZip from 'adm-zip';
import * as fs from 'fs';

test.describe('Submission Snapshot Archiving Service', () => {
  test('creates a valid zip archive of submitted repository files', async () => {
    const submissionId = 'sub_test_12345';
    const commitSha = '9f8b7a6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a';
    const files = [
      { path: 'src/index.ts', content: 'console.log("Hello from snapshot test");' },
      { path: 'README.md', content: '# Test Submission\nThis is a test readme.' },
    ];

    const result = await createSubmissionSnapshot(submissionId, commitSha, files);

    expect(result.fileCount).toBe(2);
    expect(result.sizeBytes).toBeGreaterThan(0);
    expect(result.snapshotPath).toBeTruthy();

    if (result.storageType === 'local-filesystem') {
      expect(fs.existsSync(result.snapshotPath)).toBe(true);

      // Verify zip contents using AdmZip
      const zip = new AdmZip(result.snapshotPath);
      const zipEntries = zip.getEntries();
      const entryNames = zipEntries.map((e) => e.entryName);

      expect(entryNames).toContain('src/index.ts');
      expect(entryNames).toContain('README.md');

      const indexContent = zip.readAsText('src/index.ts');
      expect(indexContent).toBe('console.log("Hello from snapshot test");');

      // Cleanup test file
      fs.unlinkSync(result.snapshotPath);
    }
  });
});
