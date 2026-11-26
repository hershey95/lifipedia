import { prisma } from '@/lib/db';
import { backlinkWhere } from '@/lib/wikilinks';

/** 문서 정보(W49 W5)의 계산값. 저장하지 않으며 점수·인기에 쓰지 않는다. */
export async function loadDocInfo(item: { id: string; name: string }) {
  const [editors, backlinkCount] = await Promise.all([
    prisma.editHistory.findMany({
      where: { itemId: item.id, editorId: { not: null } },
      distinct: ['editorId'],
      select: { editorId: true },
    }),
    prisma.item.count({ where: backlinkWhere(item) }),
  ]);
  return { editorCount: editors.length, backlinkCount };
}
