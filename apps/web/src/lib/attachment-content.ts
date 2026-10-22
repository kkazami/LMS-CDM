import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import { realpath, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { AccessError } from './super-user-v1/actor';
import { db } from './db';

const maxBytes = 25 * 1024 * 1024;
const denied = new BlockList();
for (const [ip, prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]] as const) denied.addSubnet(ip, prefix);
const globalV6 = new BlockList();
globalV6.addSubnet('2000::', 3, 'ipv6');
for (const [ip, prefix] of [['2001:db8::',32], ['2002::',16], ['2001::',32]] as const) denied.addSubnet(ip, prefix, 'ipv6');

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !denied.check(address, 'ipv4');
  return family === 6 && globalV6.check(address, 'ipv6') && !denied.check(address, 'ipv6');
}

export function attachmentUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new AccessError(400, 'Invalid attachment URL.'); }
  const hosts = (process.env.ATTACHMENT_STORAGE_HOSTS || '').split(',').map(host => host.trim().toLowerCase()).filter(Boolean);
  if (process.env.NEXT_PUBLIC_APP_URL) hosts.push(new URL(process.env.NEXT_PUBLIC_APP_URL).hostname.toLowerCase());
  const blob = /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/i.test(url.hostname);
  if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443' || (!blob && !hosts.includes(url.hostname))) throw new AccessError(400, 'Attachment storage host is not allowed.');
  return url;
}

/** Only call after authorizing the persisted Attachment → Item → Course relationship. */
export async function readAttachment(value: string): Promise<Buffer> {
  const privateId = /^\/api\/assets\/([a-zA-Z0-9-]{1,100})$/.exec(value)?.[1];
  if (privateId) {
    const asset = await db.privateAsset.findFirst({ where: { id: privateId, scanStatus: 'CLEAN' } });
    if (!asset || asset.size > maxBytes) throw new AccessError(404, 'Attachment unavailable.');
    return Buffer.from(asset.content);
  }
  const inline = /^data:(?:application\/(?:pdf|vnd\.[a-z0-9.+-]+)|image\/(?:png|jpeg|gif|webp)|text\/(?:plain|csv));base64,([a-z0-9+/]+={0,2})$/i.exec(value);
  if (inline) {
    if (inline[1].length > Math.ceil(maxBytes / 3) * 4) throw new AccessError(413, 'Attachment is too large.');
    const bytes = Buffer.from(inline[1], 'base64');
    if (bytes.length > maxBytes) throw new AccessError(413, 'Attachment is too large.');
    return bytes;
  }
  if (/^\/uploads\/[a-z0-9._-]+$/i.test(value)) {
    const root = await realpath(path.join(process.cwd(), 'public', 'uploads'));
    const file = await realpath(path.join(root, path.basename(value)));
    if (!file.startsWith(root + path.sep)) throw new AccessError(400, 'Invalid attachment path.');
    if ((await stat(file)).size > maxBytes) throw new AccessError(413, 'Attachment is too large.');
    const bytes = await readFile(file);
    if (bytes.length > maxBytes) throw new AccessError(413, 'Attachment is too large.');
    return bytes;
  }
  const url = attachmentUrl(value);
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(address => !isPublicAddress(address.address))) throw new AccessError(400, 'Attachment destination is not allowed.');
  // Pin the verified address for this connection, retaining hostname/certificate checks.
  const address = addresses[0];
  return new Promise((resolve, reject) => {
    const request = https.get(url, { lookup: (_host, options, callback) => options.all ? callback(null, [address]) : callback(null, address.address, address.family), signal: AbortSignal.timeout(15000) }, response => {
      if (response.statusCode !== 200 || Number(response.headers['content-length'] || 0) > maxBytes) {
        response.destroy(); reject(new AccessError(400, 'Attachment could not be fetched.')); return;
      }
      const chunks: Buffer[] = []; let size = 0;
      response.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > maxBytes) response.destroy(new AccessError(413, 'Attachment is too large.'));
        else chunks.push(chunk);
      });
      response.on('error', reject);
      response.on('end', () => resolve(Buffer.concat(chunks)));
    });
    request.on('error', () => reject(new AccessError(502, 'Attachment storage unavailable.')));
  });
}
