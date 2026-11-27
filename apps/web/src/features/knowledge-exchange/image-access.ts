import { db } from '@/lib/db';
import { ELIGIBLE_KX_INSTITUTE_CODE } from '@/lib/kx-eligibility';
import { inlineKnowledgeImage, knowledgeImages } from './images';

export async function isSharedKnowledgeImage(instituteId: string, ownerId: string, url: string) {
  const visiblePost = {
    instituteId,
    institute: { code: { equals: ELIGIBLE_KX_INSTITUTE_CODE, mode: 'insensitive' as const } },
    isDeleted: false,
  };
  const reference = { authorId: ownerId, body: { contains: url }, isDeleted: false };
  const select = { body: true } as const;
  const [posts, answers, comments] = await Promise.all([
    db.kxPost.findMany({ where: { ...visiblePost, ...reference }, select }),
    db.kxAnswer.findMany({ where: { ...reference, post: visiblePost }, select }),
    db.kxComment.findMany({
      where: {
        ...reference,
        OR: [
          { post: visiblePost, answerId: null },
          { answer: { isDeleted: false, post: visiblePost } },
        ],
      },
      select,
    }),
  ]);
  const preview = inlineKnowledgeImage(url);
  return [...posts, ...answers, ...comments].some(({ body }) =>
    knowledgeImages(body).some(image => image.url === preview));
}
