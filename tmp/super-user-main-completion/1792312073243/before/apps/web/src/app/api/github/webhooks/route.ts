import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { invalidateRepoCache } from '@/lib/github/octokit-client';

export async function POST(req: NextRequest) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET || 'dev_test_webhook_secret';


  const rawBody = await req.text();
  const signature = req.headers.get('x-hub-signature-256');

  if (!signature) {
    return NextResponse.json({ error: 'Missing x-hub-signature-256 header' }, { status: 401 });
  }

  // 1. Timing-safe HMAC validation
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const expectedSignature = `sha256=${hmac.digest('hex')}`;

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  const deliveryId = req.headers.get('x-github-delivery') || crypto.randomUUID();
  const eventType = req.headers.get('x-github-event') || 'unknown';

  // 2. Deduplication
  const existing = await db.githubWebhookEvent.findUnique({
    where: { deliveryId },
  });

  if (existing) {
    return NextResponse.json({ message: 'Duplicate delivery' }, { status: 200 });
  }

  let payload: any = {};
  try {
    payload = JSON.parse(rawBody);
  } catch {
    // Malformed JSON
  }

  const repoFullName = payload.repository?.full_name || 'unknown';

  // 3. Persist raw event
  await db.githubWebhookEvent.create({
    data: {
      deliveryId,
      eventType,
      repoFullName,
      payload: rawBody,
      processed: true,
    },
  });

  // 4. Process event handlers
  try {
    if (eventType === 'push' && payload.repository) {
      const owner = payload.repository.owner?.login || payload.repository.owner?.name;
      const repo = payload.repository.name;
      if (owner && repo) {
        invalidateRepoCache(owner, repo);
      }
    } else if (eventType === 'check_run' && payload.check_run && payload.repository) {
      const checkRun = payload.check_run;
      const owner = payload.repository.owner?.login || payload.repository.owner?.name;
      const repo = payload.repository.name;

      if (owner && repo) {
        const links = await db.githubRepoLink.findMany({
          where: { owner, repo },
        });

        for (const link of links) {
          await db.githubCiResult.create({
            data: {
              repoLinkId: link.id,
              commitSha: checkRun.head_sha,
              workflowName: checkRun.name,
              status: checkRun.status === 'completed' ? 'success' : 'pending',
              conclusion: checkRun.conclusion,
              runUrl: checkRun.html_url,
            },
          });
        }
      }
    }
  } catch (error) {
    console.error('Error handling webhook event processing:', error);
  }

  return NextResponse.json({ success: true, deliveryId });
}
