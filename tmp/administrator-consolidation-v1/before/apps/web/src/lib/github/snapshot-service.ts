import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as path from 'path';
import { put } from '@vercel/blob';

export interface SnapshotFileInput {
  path: string;
  content: string | Buffer;
}

export interface SnapshotResult {
  snapshotPath: string; // Vercel Blob URL or local file path
  sizeBytes: number;
  fileCount: number;
  storageType: 'vercel-blob' | 'local-filesystem';
}

/**
 * Creates an immutable zip snapshot of a repository submission at a specific commit SHA.
 * Uploads to Vercel Blob if configured, or falls back to local storage directory.
 */
export async function createSubmissionSnapshot(
  submissionId: string,
  commitSha: string,
  files: SnapshotFileInput[]
): Promise<SnapshotResult> {
  const zip = new AdmZip();

  let fileCount = 0;
  for (const file of files) {
    if (!file.path) continue;
    const buffer = typeof file.content === 'string' ? Buffer.from(file.content, 'utf8') : file.content;
    zip.addFile(file.path, buffer);
    fileCount++;
  }

  const zipBuffer = zip.toBuffer();
  const fileName = `submissions/${submissionId}-${commitSha.substring(0, 8)}.zip`;

  // 1. Attempt Vercel Blob upload if token is present
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await put(fileName, zipBuffer, {
        access: 'public',
        addRandomSuffix: false,
      });

      return {
        snapshotPath: blob.url,
        sizeBytes: zipBuffer.length,
        fileCount,
        storageType: 'vercel-blob',
      };
    } catch (error) {
      console.warn('Vercel Blob upload failed, falling back to local filesystem:', error);
    }
  }

  // 2. Local filesystem fallback
  const storageDir = process.env.SNAPSHOT_DIR || path.join(process.cwd(), 'storage', 'snapshots');
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  const localFilePath = path.join(storageDir, `submission-${submissionId}-${commitSha.substring(0, 8)}.zip`);
  fs.writeFileSync(localFilePath, zipBuffer);

  return {
    snapshotPath: localFilePath,
    sizeBytes: zipBuffer.length,
    fileCount,
    storageType: 'local-filesystem',
  };
}
