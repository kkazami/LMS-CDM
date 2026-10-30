import { compressImageFile } from '@/lib/image-compress';

export async function uploadKnowledgeImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose a PNG, JPG, GIF or WebP image.');
  if (file.size > 25 * 1024 * 1024) throw new Error('Choose an image smaller than 25 MB.');
  // Keep multipart requests below the hosting platform's request-body ceiling.
  const limit = 4 * 1024 * 1024;
  const image = file.size > limit ? await compressImageFile(file, { maxWidth: 1800, maxHeight: 1800 }) : file;
  if (image.size > limit) throw new Error('This image is too large to upload. Resize it or choose an image smaller than 4 MB.');
  const body = new FormData();
  body.append('file', image);
  const response = await fetch('/api/upload', { method: 'POST', body });
  if (response.status === 413) throw new Error('This image is too large to upload. Choose a smaller image.');
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'The image could not upload. Please try again.');
  if (typeof data?.url !== 'string' || !data.url) throw new Error('The upload service did not return an image. Please try again.');
  return data.url;
}
