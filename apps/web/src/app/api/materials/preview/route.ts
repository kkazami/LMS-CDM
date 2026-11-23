import { getSession } from '@/lib/auth-session';
import { readAttachment } from '@/lib/attachment-content';
import { requireMaterialAttachment } from '@/lib/material-access';
import { supportsOfficePreview } from '@/lib/material-preview';
import { AccessError } from '@/lib/super-user-v1/actor';
import { getFileExtension } from '@/lib/ite/media-preview';

const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
const maxPreviewLength = 120_000;

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) throw new AccessError(401, 'Sign in again to preview this file.');
    const attachmentId = new URL(request.url).searchParams.get('attachmentId');
    if (!attachmentId || attachmentId.length > 200) throw new AccessError(400, 'Missing or invalid attachment ID.');

    const attachment = await requireMaterialAttachment(session.user, attachmentId);
    const extension = getFileExtension(attachment.fileName);
    if (extension !== 'pdf' && !supportsOfficePreview(extension)) throw new AccessError(415, 'This file type cannot be previewed.');
    const bytes = await readAttachment(attachment.url);

    if (extension === 'pdf') {
      return new Response(new Uint8Array(bytes), { headers: { ...headers, 'Content-Type': 'application/pdf' } });
    }

    const { parseOffice } = require('officeparser') as typeof import('officeparser');
    const document = await parseOffice(bytes, {
      fileType: extension,
      abortSignal: AbortSignal.any([request.signal, AbortSignal.timeout(10_000)]),
      decompressionLimits: { maxUncompressedBytes: 100 * 1024 * 1024, maxZipEntries: 5_000 },
    });
    const text = document.toText().trim();
    return Response.json({ text: text.slice(0, maxPreviewLength), truncated: text.length > maxPreviewLength }, { headers });
  } catch (error) {
    if (error instanceof AccessError) return Response.json({ message: error.message }, { status: error.status, headers });
    return Response.json({ message: 'The preview could not be opened.' }, { status: 503, headers });
  }
}
