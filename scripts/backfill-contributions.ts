/**
 * 기존 EditHistory → ContributionEvent 백필. editId 가 unique 라 여러 번 돌려도 안전하다.
 * 과거 편집은 새 규칙(최소 변경량·일일 상한)을 소급하지 않고 모두 적립으로 본다.
 * 사용: npx tsx scripts/backfill-contributions.ts [--dry]
 */
import { PrismaClient } from '@prisma/client';
import { recomputeTrust } from '../src/lib/contribution';

const prisma = new PrismaClient();

async function main() {
  const dry = process.argv.includes('--dry');
  const edits = await prisma.editHistory.findMany({
    where: { editorId: { not: null } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, itemId: true, editorId: true, revision: true, revertOfRevision: true, createdAt: true },
  });
  const done = new Set((await prisma.contributionEvent.findMany({ select: { editId: true } })).map((e) => e.editId));
  const todo = edits.filter((e) => !done.has(e.id));
  const users = new Set(todo.map((e) => e.editorId!));
  console.log(`${todo.length}건 추가, 영향 사용자 ${users.size}명${dry ? ' (dry)' : ''}`);
  if (dry) return;
  for (const e of todo) {
    await prisma.contributionEvent.create({
      data: {
        userId: e.editorId!,
        kind: e.revision === 1 ? 'ITEM_CREATE' : 'EDIT',
        itemId: e.itemId,
        editId: e.id,
        credited: e.revertOfRevision == null,
        reason: e.revertOfRevision == null ? null : 'REVERT',
        createdAt: e.createdAt,
      },
    });
  }
  for (const userId of users) {
    const before = await prisma.user.findUnique({ where: { id: userId }, select: { contributionCount: true } });
    const after = await prisma.$transaction((tx) => recomputeTrust(tx, userId));
    console.log(`${userId}: ${before?.contributionCount} → ${after.contributionCount}`);
  }
}

main().finally(() => prisma.$disconnect());
