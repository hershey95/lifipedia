/**
 * 콘텐츠 JSON 제출 전 검사. 오류가 있으면 종료 코드 1.
 *   npm run content:check                       # content/*.json 전체
 *   npm run content:check -- content/camping.json
 * 이 검사는 형식·출처 규칙만 본다. 가격·스펙이 실제와 맞는지는 사람(또는 Claude 샘플 검수)이 확인한다.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { checkContent } from '../src/lib/content-check';

const galleries = [...readFileSync('prisma/seed.ts', 'utf8').matchAll(/name: '([^']*갤러리)'/g)].map((m) => m[1]);
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync('content').filter((f) => f.endsWith('.json')).map((f) => `content/${f}`);

let errors = 0;
for (const file of files) {
  let issues;
  try {
    issues = checkContent(JSON.parse(readFileSync(file, 'utf8')), galleries);
  } catch (e) {
    issues = [{ level: 'error' as const, msg: `JSON 을 읽을 수 없음: ${(e as Error).message}` }];
  }
  const errs = issues.filter((i) => i.level === 'error');
  errors += errs.length;
  console.log(`\n${errs.length ? '✗' : '✓'} ${file}  (오류 ${errs.length}, 경고 ${issues.length - errs.length})`);
  for (const i of issues) console.log(`  ${i.level === 'error' ? 'ERROR' : 'warn '} ${i.item ? `[${i.item}] ` : ''}${i.msg}`);
}
process.exit(errors ? 1 : 0);
