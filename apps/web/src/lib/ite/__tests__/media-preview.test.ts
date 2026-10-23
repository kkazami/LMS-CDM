import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMediaEmbed,
  validateMediaUrl,
  classifyAttachmentMedia,
  ALLOWED_EMBED_HOSTS,
  isSafeInlineMime,
  buildFileHeaders,
  SAFE_INLINE_MIME_TYPES,
  getFriendlyAttachmentTitle,
  getSecondaryAttachmentLabel,
} from '../media-preview';

describe('Media Preview - URL Validation & Security Allowlist', () => {
  it('allows valid HTTPS URLs from the explicit allowlist', () => {
    const validUrls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://youtube-nocookie.com/embed/dQw4w9WgXcQ',
      'https://vimeo.com/76979871',
      'https://player.vimeo.com/video/76979871',
      'https://drive.google.com/file/d/1234567890abcdef/view',
      'https://docs.google.com/document/d/1234567890abcdef/edit',
    ];

    for (const url of validUrls) {
      const res = validateMediaUrl(url);
      assert.equal(res.ok, true, `Expected ${url} to be valid`);
    }
  });

  it('rejects insecure http:// URLs', () => {
    const res = validateMediaUrl('http://www.youtube.com/watch?v=dQw4w9WgXcQ');
    assert.equal(res.ok, false);
    assert.match((res as { reason: string }).reason, /https:/);
  });

  it('rejects malicious schemes like javascript:, data:, file:', () => {
    assert.equal(validateMediaUrl('javascript:alert(1)').ok, false);
    assert.equal(validateMediaUrl('data:text/html,<script>alert(1)</script>').ok, false);
    assert.equal(validateMediaUrl('file:///etc/passwd').ok, false);
    assert.equal(validateMediaUrl('vbscript:msgbox').ok, false);
  });

  it('rejects URLs containing embedded credentials', () => {
    const res = validateMediaUrl('https://user:password@www.youtube.com/watch?v=dQw4w9WgXcQ');
    assert.equal(res.ok, false);
    assert.match((res as { reason: string }).reason, /credentials/);
  });

  it('rejects lookalike, spoofed, or sub-domain attacker hosts', () => {
    const lookalikes = [
      'https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ',
      'https://evil-youtube.com/watch?v=dQw4w9WgXcQ',
      'https://notyoutu.be/dQw4w9WgXcQ',
      'https://vimeo.com.attacker.org/12345',
      'https://drive.google.com.phishing.io/file/d/123',
      'https://docs.google.com.malicious.net/document/d/123',
    ];

    for (const badUrl of lookalikes) {
      const res = validateMediaUrl(badUrl);
      assert.equal(res.ok, false, `Expected lookalike ${badUrl} to be rejected`);
    }
  });

  it('rejects completely unknown hosts', () => {
    assert.equal(validateMediaUrl('https://example.com/video.mp4').ok, false);
    assert.equal(validateMediaUrl('https://tiktok.com/@user/video/123').ok, false);
  });
});

describe('Media Preview - Embed Parser Transformation', () => {
  it('transforms YouTube watch link to privacy-friendly embed', () => {
    const res = parseMediaEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.provider, 'youtube');
      assert.equal(res.embedUrl, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    }
  });

  it('transforms youtu.be short link to privacy-friendly embed', () => {
    const res = parseMediaEmbed('https://youtu.be/dQw4w9WgXcQ');
    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.provider, 'youtube');
      assert.equal(res.embedUrl, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    }
  });

  it('transforms YouTube shorts link to privacy-friendly embed', () => {
    const res = parseMediaEmbed('https://www.youtube.com/shorts/dQw4w9WgXcQ');
    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.provider, 'youtube');
      assert.equal(res.embedUrl, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    }
  });

  it('transforms YouTube embed link to privacy-friendly embed', () => {
    const res = parseMediaEmbed('https://www.youtube.com/embed/dQw4w9WgXcQ');
    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.provider, 'youtube');
      assert.equal(res.embedUrl, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    }
  });

  it('rejects invalid YouTube ID lengths or characters', () => {
    const res = parseMediaEmbed('https://www.youtube.com/watch?v=short');
    assert.equal(res.ok, false);
  });

  it('transforms Vimeo video links to official player embed', () => {
    const res = parseMediaEmbed('https://vimeo.com/76979871');
    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.provider, 'vimeo');
      assert.equal(res.embedUrl, 'https://player.vimeo.com/video/76979871');
    }
  });

  it('transforms Vimeo unlisted link with hash parameter', () => {
    const res = parseMediaEmbed('https://vimeo.com/76979871?h=abcdef123');
    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.provider, 'vimeo');
      assert.equal(res.embedUrl, 'https://player.vimeo.com/video/76979871?h=abcdef123');
    }
  });

  it('transforms Google Drive file links to /preview', () => {
    const res1 = parseMediaEmbed('https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view?usp=sharing');
    assert.equal(res1.ok, true);
    if (res1.ok) {
      assert.equal(res1.provider, 'google-drive');
      assert.equal(res1.embedUrl, 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/preview');
    }

    const res2 = parseMediaEmbed('https://drive.google.com/open?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
    assert.equal(res2.ok, true);
    if (res2.ok) {
      assert.equal(res2.provider, 'google-drive');
      assert.equal(res2.embedUrl, 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/preview');
    }
  });

  it('transforms Google Docs, Slides, and Sheets links to /preview', () => {
    const doc = parseMediaEmbed('https://docs.google.com/document/d/1abc123XYZ456/edit?usp=sharing');
    assert.equal(doc.ok, true);
    if (doc.ok) {
      assert.equal(doc.provider, 'google-docs');
      assert.equal(doc.embedUrl, 'https://docs.google.com/document/d/1abc123XYZ456/preview');
    }

    const slide = parseMediaEmbed('https://docs.google.com/presentation/d/1slideXYZ789/edit#slide=id.p');
    assert.equal(slide.ok, true);
    if (slide.ok) {
      assert.equal(slide.provider, 'google-docs');
      assert.equal(slide.embedUrl, 'https://docs.google.com/presentation/d/1slideXYZ789/preview');
    }

    const sheet = parseMediaEmbed('https://docs.google.com/spreadsheets/d/1sheetXYZ123/edit#gid=0');
    assert.equal(sheet.ok, true);
    if (sheet.ok) {
      assert.equal(sheet.provider, 'google-docs');
      assert.equal(sheet.embedUrl, 'https://docs.google.com/spreadsheets/d/1sheetXYZ123/preview');
    }
  });
});

describe('Media Preview - Attachment Classification', () => {
  it('classifies YouTube link attachment', () => {
    const res = classifyAttachmentMedia({
      type: 'LINK',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      fileName: 'Tutorial Video',
    });
    assert.equal(res.kind, 'embed');
    assert.equal(res.provider, 'youtube');
    assert.equal(res.previewUrl, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    assert.equal(res.isExternalLink, false);
  });

  it('classifies unapproved link as external_link', () => {
    const res = classifyAttachmentMedia({
      type: 'LINK',
      url: 'https://example.com/guide.html',
      fileName: 'Reference Guide',
    });
    assert.equal(res.kind, 'external_link');
    assert.equal(res.isExternalLink, true);
  });

  it('classifies uploaded video with ?inline=1', () => {
    const res = classifyAttachmentMedia({
      type: 'FILE',
      url: '/api/assets/asset-1234',
      fileName: 'lecture.mp4',
    });
    assert.equal(res.kind, 'video');
    assert.equal(res.previewUrl, '/api/assets/asset-1234?inline=1');
    assert.equal(res.downloadUrl, '/api/assets/asset-1234');
  });

  it('classifies uploaded audio with ?inline=1', () => {
    const res = classifyAttachmentMedia({
      type: 'FILE',
      url: '/api/assets/asset-5678',
      fileName: 'podcast.mp3',
    });
    assert.equal(res.kind, 'audio');
    assert.equal(res.previewUrl, '/api/assets/asset-5678?inline=1');
  });

  it('classifies uploaded PDF with ?inline=1', () => {
    const res = classifyAttachmentMedia({
      type: 'FILE',
      url: '/api/assets/asset-pdf',
      fileName: 'syllabus.pdf',
    });
    assert.equal(res.kind, 'pdf');
    assert.equal(res.previewUrl, '/api/assets/asset-pdf?inline=1');
  });

  it('classifies uploaded image with ?inline=1', () => {
    const res = classifyAttachmentMedia({
      type: 'FILE',
      url: '/api/assets/asset-img',
      fileName: 'diagram.png',
    });
    assert.equal(res.kind, 'image');
    assert.equal(res.previewUrl, '/api/assets/asset-img?inline=1');
  });

  it('classifies Office document without external viewers', () => {
    const res = classifyAttachmentMedia({
      type: 'FILE',
      url: '/api/assets/asset-doc',
      fileName: 'assignment.docx',
    });
    assert.equal(res.kind, 'office');
    assert.equal(res.downloadUrl, '/api/assets/asset-doc');
  });

  it('classifies unsupported file as unsupported_file with download link', () => {
    const res = classifyAttachmentMedia({
      type: 'FILE',
      url: '/api/assets/asset-zip',
      fileName: 'project.zip',
    });
    assert.equal(res.kind, 'unsupported_file');
    assert.equal(res.downloadUrl, '/api/assets/asset-zip');
  });
});

describe('Server-side Inline MIME Decision & File Response (assets.ts)', () => {
  it('allows pdf, png, and mp4 as safe inline mime types', () => {
    assert.equal(isSafeInlineMime('application/pdf'), true);
    assert.equal(isSafeInlineMime('image/png'), true);
    assert.equal(isSafeInlineMime('image/jpeg'), true);
    assert.equal(isSafeInlineMime('image/webp'), true);
    assert.equal(isSafeInlineMime('video/mp4'), true);
    assert.equal(isSafeInlineMime('video/webm'), true);
    assert.equal(isSafeInlineMime('audio/mpeg'), true);
  });

  it('rejects svg, html, and docx from inline (they must remain attachment)', () => {
    assert.equal(isSafeInlineMime('image/svg+xml'), false);
    assert.equal(isSafeInlineMime('text/html'), false);
    assert.equal(isSafeInlineMime('application/xhtml+xml'), false);
    assert.equal(isSafeInlineMime('text/xml'), false);
    assert.equal(isSafeInlineMime('application/xml'), false);
    assert.equal(isSafeInlineMime('application/vnd.openxmlformats-officedocument.wordprocessingml.document'), false);
    assert.equal(isSafeInlineMime('application/vnd.openxmlformats-officedocument.presentationml.presentation'), false);
    assert.equal(isSafeInlineMime('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'), false);
  });

  it('rejects unknown, arbitrary, or missing MIME types from inline', () => {
    assert.equal(isSafeInlineMime('application/octet-stream'), false);
    assert.equal(isSafeInlineMime('application/x-msdownload'), false);
    assert.equal(isSafeInlineMime('text/javascript'), false);
    assert.equal(isSafeInlineMime(''), false);
    assert.equal(isSafeInlineMime(null), false);
    assert.equal(isSafeInlineMime(undefined), false);
  });

  it('buildFileHeaders sets Content-Disposition: inline and sandbox CSP for safe inline files', () => {
    const headers = buildFileHeaders({ mime: 'application/pdf', name: 'document.pdf', length: 1234 }, true);
    assert.equal(headers['Content-Disposition'], 'inline; filename="document.pdf"');
    assert.equal(headers['Content-Type'], 'application/pdf');
    assert.equal(headers['Content-Length'], '1234');
    assert.equal(headers['X-Content-Type-Options'], 'nosniff');
    assert.equal(headers['X-Frame-Options'], 'SAMEORIGIN');
    assert.equal(headers['Content-Security-Policy'], "default-src 'none'; sandbox; frame-ancestors 'self'");
  });

  it('buildFileHeaders sets Content-Disposition: attachment for svg, html, and docx even when inline=true requested', () => {
    const svgHeaders = buildFileHeaders({ mime: 'image/svg+xml', name: 'vector.svg' }, true);
    assert.equal(svgHeaders['Content-Disposition'], 'attachment; filename="vector.svg"');

    const htmlHeaders = buildFileHeaders({ mime: 'text/html', name: 'page.html' }, true);
    assert.equal(htmlHeaders['Content-Disposition'], 'attachment; filename="page.html"');

    const docxHeaders = buildFileHeaders({ mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', name: 'doc.docx' }, true);
    assert.equal(docxHeaders['Content-Disposition'], 'attachment; filename="doc.docx"');
  });

  it('buildFileHeaders sets Content-Disposition: attachment when inline=false even for safe types', () => {
    const headers = buildFileHeaders({ mime: 'application/pdf', name: 'document.pdf' }, false);
    assert.equal(headers['Content-Disposition'], 'attachment; filename="document.pdf"');
  });
});

describe('Friendly Attachment Titles and Secondary Labels (W5c)', () => {
  it('derives friendly title and secondary label for Google Drive links with empty title or URL title', () => {
    const driveUrl = 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view?usp=sharing';
    
    // Empty title
    assert.equal(
      getFriendlyAttachmentTitle({ url: driveUrl, fileName: '' }),
      'Google Drive file'
    );
    // null title
    assert.equal(
      getFriendlyAttachmentTitle({ url: driveUrl, fileName: null }),
      'Google Drive file'
    );
    // Title identical to raw URL
    assert.equal(
      getFriendlyAttachmentTitle({ url: driveUrl, fileName: driveUrl }),
      'Google Drive file'
    );
    // Google Drive folder
    assert.equal(
      getFriendlyAttachmentTitle({ url: 'https://drive.google.com/drive/folders/1234567890abcdef', fileName: '' }),
      'Google Drive folder'
    );
    // Secondary label
    assert.equal(
      getSecondaryAttachmentLabel({ url: driveUrl, type: 'LINK' }),
      'Google Drive'
    );
  });

  it('derives friendly title and secondary label for Google Docs, Slides, and Sheets', () => {
    const docUrl = 'https://docs.google.com/document/d/1234567890/edit?usp=sharing';
    const slidesUrl = 'https://docs.google.com/presentation/d/1234567890/edit';
    const sheetsUrl = 'https://docs.google.com/spreadsheets/d/1234567890/edit';
    const formsUrl = 'https://docs.google.com/forms/d/1234567890/viewform';

    assert.equal(getFriendlyAttachmentTitle({ url: docUrl, fileName: '' }), 'Google Docs document');
    assert.equal(getFriendlyAttachmentTitle({ url: slidesUrl, fileName: '' }), 'Google Slides presentation');
    assert.equal(getFriendlyAttachmentTitle({ url: sheetsUrl, fileName: '' }), 'Google Sheets spreadsheet');
    assert.equal(getFriendlyAttachmentTitle({ url: formsUrl, fileName: '' }), 'Google Forms');

    assert.equal(getSecondaryAttachmentLabel({ url: docUrl, type: 'LINK' }), 'Google Docs');
    assert.equal(getSecondaryAttachmentLabel({ url: slidesUrl, type: 'LINK' }), 'Google Slides');
    assert.equal(getSecondaryAttachmentLabel({ url: sheetsUrl, type: 'LINK' }), 'Google Sheets');
  });

  it('derives friendly title and secondary label for YouTube links', () => {
    const watchUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const shortUrl = 'https://youtu.be/dQw4w9WgXcQ';

    assert.equal(getFriendlyAttachmentTitle({ url: watchUrl, fileName: '' }), 'YouTube video');
    assert.equal(getFriendlyAttachmentTitle({ url: shortUrl, fileName: shortUrl }), 'YouTube video');

    assert.equal(getSecondaryAttachmentLabel({ url: watchUrl, type: 'LINK' }), 'YouTube');
    assert.equal(getSecondaryAttachmentLabel({ url: shortUrl, type: 'LINK' }), 'YouTube');
  });

  it('derives friendly title and secondary label for Vimeo links', () => {
    const vimeoUrl = 'https://vimeo.com/76979871';

    assert.equal(getFriendlyAttachmentTitle({ url: vimeoUrl, fileName: '' }), 'Vimeo video');
    assert.equal(getFriendlyAttachmentTitle({ url: vimeoUrl, fileName: vimeoUrl }), 'Vimeo video');

    assert.equal(getSecondaryAttachmentLabel({ url: vimeoUrl, type: 'LINK' }), 'Vimeo');
  });

  it('derives clean host name for plain external web links', () => {
    const siteUrl = 'https://example.com/deep/path/to/resource.html';
    const githubUrl = 'https://github.com/facebook/react';

    assert.equal(getFriendlyAttachmentTitle({ url: siteUrl, fileName: '' }), 'example.com');
    assert.equal(getFriendlyAttachmentTitle({ url: githubUrl, fileName: githubUrl }), 'github.com');

    assert.equal(getSecondaryAttachmentLabel({ url: siteUrl, type: 'LINK' }), 'Link');
    assert.equal(getSecondaryAttachmentLabel({ url: githubUrl, type: 'LINK' }), 'Link');
  });

  it('preserves real, meaningful titles as is', () => {
    const realTitle = 'Week 4 Lecture Notes: Database Security';
    const driveUrl = 'https://drive.google.com/file/d/12345/view';

    assert.equal(
      getFriendlyAttachmentTitle({ url: driveUrl, fileName: realTitle }),
      'Week 4 Lecture Notes: Database Security'
    );
  });

  it('handles empty titles, missing URLs, and malformed URLs gracefully without crashing', () => {
    assert.equal(getFriendlyAttachmentTitle({ url: '', fileName: '' }), 'Attached file');
    assert.equal(getFriendlyAttachmentTitle({ url: '   ', fileName: null }), 'Attached file');
    assert.equal(getFriendlyAttachmentTitle({ url: 'not a valid url @@', fileName: '' }), 'Attached link');
    assert.equal(getFriendlyAttachmentTitle({ url: 'https://', fileName: '' }), 'Attached link');

    // Local / API assets
    assert.equal(getFriendlyAttachmentTitle({ url: '/api/assets/xyz.pdf', fileName: '' }), 'PDF file');
    assert.equal(getFriendlyAttachmentTitle({ url: '/api/assets/abc', fileName: '' }), 'Attached file');
  });

  it('provides consistent, properly-cased secondary labels across all media types', () => {
    assert.equal(getSecondaryAttachmentLabel({ url: '/api/assets/doc.pdf', fileName: 'doc.pdf' }), 'PDF');
    assert.equal(getSecondaryAttachmentLabel({ url: '/api/assets/clip.mp4', fileName: 'clip.mp4' }), 'Video');
    assert.equal(getSecondaryAttachmentLabel({ url: '/api/assets/audio.mp3', fileName: 'audio.mp3' }), 'Audio');
    assert.equal(getSecondaryAttachmentLabel({ url: '/api/assets/photo.png', fileName: 'photo.png' }), 'Image');
    assert.equal(getSecondaryAttachmentLabel({ url: '/api/assets/notes.docx', fileName: 'notes.docx' }), 'File');
    assert.equal(getSecondaryAttachmentLabel({ url: '/api/assets/archive.zip', fileName: 'archive.zip' }), 'File');
    assert.equal(getSecondaryAttachmentLabel({ url: 'https://some-external-site.org/info', type: 'LINK' }), 'Link');
  });
});

