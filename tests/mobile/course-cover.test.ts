import assert from 'node:assert/strict';
import { test } from 'node:test';
import { courseCoverSource, courseCoverUploadFile } from '../../apps/mobile/src/lib/course-cover';

test('course covers resolve banners, legacy data photos and private uploads without leaking credentials', () => {
  const base = 'https://lms.example.invalid';
  assert.deepEqual(courseCoverSource('/course-banners/webdev.svg', base, 'secret'), { uri: `${base}/course-banners/webdev.svg` });
  assert.deepEqual(courseCoverSource('/api/assets/image-123', base, 'secret'), { uri: `${base}/api/assets/image-123`, headers: { Authorization: 'Bearer secret' } });
  assert.deepEqual(courseCoverSource('https://photos.example.invalid/api/assets/image', base, 'secret'), { uri: 'https://photos.example.invalid/api/assets/image' });
  assert.deepEqual(courseCoverSource('data:image/png;base64,AAAA', base, 'secret'), { uri: 'data:image/png;base64,AAAA' });
  for (const value of [null, '', 'javascript:alert(1)', 'file:///private/photo', 'https://user:password@photos.example.invalid/photo']) assert.equal(courseCoverSource(value, base, 'secret'), null);
});

test('cropped photos keep a filename extension matching the uploaded MIME, including missing metadata', () => {
  assert.deepEqual(courseCoverUploadFile({ uri: 'file:///crop.png', mimeType: 'image/png' }), { fileName: 'class-cover.png', mimeType: 'image/png' });
  assert.deepEqual(courseCoverUploadFile({ uri: 'file:///crop.jpeg', mimeType: null }), { fileName: 'class-cover.jpg', mimeType: 'image/jpeg' });
  assert.deepEqual(courseCoverUploadFile({ uri: 'file:///crop.webp' }), { fileName: 'class-cover.webp', mimeType: 'image/webp' });
  assert.deepEqual(courseCoverUploadFile({ uri: 'file:///converted.jpg', mimeType: 'IMAGE/JPEG' }), { fileName: 'class-cover.jpg', mimeType: 'image/jpeg' });
  assert.throws(() => courseCoverUploadFile({ uri: 'file:///image.heic', mimeType: 'image/heic' }), /JPEG, PNG, WebP, or GIF/);
});
