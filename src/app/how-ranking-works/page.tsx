import Link from 'next/link';
import type { Metadata } from 'next';
import { RANKING_CONSTANTS } from '@/lib/ranking';
import { ABUSE_LIMITS } from '@/lib/abuse';
import { BADGE_THRESHOLDS } from '@/lib/trust';
import { THEME_LIFECYCLE, promotionThreshold } from '@/lib/theme-lifecycle';

export const metadata: Metadata = {
  title: '순위는 어떻게 정해지나요',
  description: 'Lifipedia 의 랭킹 산정식과 어뷰징 방지 기준을 전부 공개합니다. 운영자는 순위에 개입하지 않습니다.',
};

export default function HowRankingWorksPage() {
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <h1 className="text-3xl font-extrabold">순위는 어떻게 정해지나요</h1>
        <p className="mt-3 text-ink/70">
          Lifipedia 에는 &lsquo;편집장&rsquo;이 없습니다. 운영자는 어떤 제품에도 가점을 줄 수 없고,
          Top 1을 지정하는 버튼도 존재하지 않습니다. 순위는 아래 공개된 식에 유저 활동을 넣어 나온 결과일 뿐입니다.
        </p>
      </header>

      <Section title="1. 점수 계산식">
        <pre className="overflow-x-auto rounded-lg bg-black/[0.04] p-4 text-sm leading-6">
{`점수 = Wilson하한(유효찬성, 유효전체) × log10(1 + 유효전체) × 100

유효찬성 = Σ (추천표의 가중치 × 시간감쇠)
유효비추천 = Σ (비추천표의 가중치 × 시간감쇠)
유효전체 = 유효찬성 + 유효비추천
시간감쇠 = 0.5 ^ (표의 나이(일) / ${RANKING_CONSTANTS.VOTE_HALF_LIFE_DAYS})`}
        </pre>
      </Section>

      <Section title="2. 왜 이렇게 계산하나요">
        <dl className="flex flex-col gap-4">
          <Item term="시간 감쇠 — 오래된 표는 가벼워집니다">
            표는 {RANKING_CONSTANTS.VOTE_HALF_LIFE_DAYS}일마다 영향력이 절반이 됩니다. 3년 전에 1위였던 제품이
            신제품을 영원히 막아서는 일을 방지하고, 순위가 지금의 트렌드를 반영하게 합니다.
          </Item>
          <Item term="Wilson 하한 — 표가 적으면 보수적으로">
            추천 3개짜리 만장일치(100%)가 추천 300개짜리 90% 지지를 이기면 안 됩니다. Wilson 신뢰구간의
            하한을 쓰면 표본이 작을수록 점수가 자동으로 깎여, 표가 쌓여야만 제 실력이 드러납니다.
          </Item>
          <Item term="참여 보정 — 많은 사람이 지지할수록">
            유효 표수에 로그를 취해 곱합니다. 참여가 많을수록 유리하되, 로그라서 표 수만으로 무한히
            치고 올라가지는 못합니다.
          </Item>
          <Item term="최소 참여 인원 — 아니면 '미정'">
            참여자가 {RANKING_CONSTANTS.MIN_DISTINCT_VOTERS}명 미만인 가격대의 Top 1은 확정하지 않고
            &lsquo;미정&rsquo;으로 둡니다. 소수의 표로 1위가 결정되는 것보다 비워두는 편이 정직합니다.
          </Item>
          <Item term="동점 처리">
            점수가 같으면 참여 인원이 많은 쪽, 그다음 먼저 등록된 쪽이 앞섭니다. 완전히 같으면
            내부 ID 순으로 정렬해 누가 다시 계산해도 같은 결과가 나오게 합니다.
          </Item>
        </dl>
      </Section>

      <Section title="3. 한 표의 무게 — 유저 신뢰도">
        <p className="text-ink/75">
          모든 표가 똑같지는 않습니다. 기여 이력이 쌓인 유저의 표는 조금 더 무겁습니다.
          단, 가중치는 <strong>투표한 그 순간에 고정</strong>되므로 나중에 신뢰도가 바뀌어도
          과거 순위는 그대로 재현됩니다.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-black/[0.04] p-4 text-sm leading-6">
{`신뢰도 = min(1 + log10(1 + 기여수), ${RANKING_CONSTANTS.MAX_VOTE_WEIGHT})
가입 ${RANKING_CONSTANTS.NEW_ACCOUNT_DAYS}일 미만 계정의 표 = 신뢰도 × ${RANKING_CONSTANTS.NEW_ACCOUNT_MULTIPLIER}`}
        </pre>
        <p className="mt-3 text-sm text-ink/65">
          가중치 상한이 {RANKING_CONSTANTS.MAX_VOTE_WEIGHT}인 이유는, 고신뢰 유저 몇 명이 다수의 의견을
          뒤집지 못하게 하기 위해서입니다. 신뢰도는 오직 기여로만 오르며 운영자가 손댈 수 없습니다.
        </p>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-ink/50">
              <th className="py-1 font-medium">뱃지</th>
              <th className="py-1 font-medium">필요 기여 수</th>
            </tr>
          </thead>
          <tbody>
            {[...BADGE_THRESHOLDS].reverse().map((badge) => (
              <tr key={badge.level} className="border-b border-black/5">
                <td className="py-1">{badge.level}</td>
                <td className="py-1 tabular-nums">{badge.minContributions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="4. 어뷰징 방지">
        <ul className="flex list-disc flex-col gap-2 pl-5 text-ink/75">
          <li>한 유저는 한 항목에 한 표만 가집니다. 같은 버튼을 다시 누르면 투표가 취소됩니다.</li>
          <li>시간당 투표 {ABUSE_LIMITS.VOTES_PER_HOUR}회, 편집 {ABUSE_LIMITS.EDITS_PER_HOUR}회, 하루 테마 제안 {ABUSE_LIMITS.THEME_PROPOSALS_PER_DAY}회로 제한합니다.</li>
          <li>
            가입 {RANKING_CONSTANTS.NEW_ACCOUNT_DAYS}일 미만 계정의 표는 {RANKING_CONSTANTS.NEW_ACCOUNT_MULTIPLIER}배로 축소됩니다.
            계정을 대량 생성해도 순위를 흔들 수 없습니다.
          </li>
          <li>
            {ABUSE_LIMITS.BURST_WINDOW_MINUTES}분 내 {ABUSE_LIMITS.BURST_VOTE_THRESHOLD}회 이상 몰아서 투표하면 검토 큐에 기록됩니다.
            차단하지는 않습니다 — 오탐으로 정상 참여를 막지 않기 위해서입니다.
          </li>
          <li>운영자가 제재하는 대상은 &lsquo;규칙 위반&rsquo;뿐이며, 콘텐츠가 마음에 드는지 여부는 제재 사유가 될 수 없습니다.</li>
        </ul>
      </Section>

      <Section title="5. 테마는 어떻게 정식이 되나요">
        <p className="text-ink/75">
          누구나 테마를 제안할 수 있습니다. 팔로워가 <strong>{promotionThreshold()}명</strong>에 도달하는 순간
          운영자 승인 없이 자동으로 정식 테마가 되고, 위키 작성·투표·순위 산정이 열립니다.
          {THEME_LIFECYCLE.dormantAfterDays}일 동안 활동이 없으면 휴면 처리되어 읽기 전용이 됩니다.
        </p>
      </Section>

      <Section title="6. 순위는 언제 박제되나요">
        <p className="text-ink/75">
          매달 1일에 지난달 순위가, 매년 1월 1일에 지난해 순위가 스냅샷으로 저장됩니다. 스냅샷은
          <strong> 그 기간에 들어온 표만으로 </strong>다시 계산되므로, &lsquo;2024년의 1위&rsquo;와 &lsquo;지금의 1위&rsquo;는
          서로 독립적인 기록입니다. <Link href="/rankings">아카이브 보기</Link>
        </p>
      </Section>

      <p className="rounded-xl bg-accent/5 p-4 text-sm text-ink/70">
        이 문서에 적힌 상수는 실제 코드(<code>src/lib/ranking.ts</code>)에서 직접 읽어와 표시됩니다.
        문서와 구현이 어긋날 수 없습니다.
      </p>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 border-b border-black/10 pb-2 text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Item({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-semibold">{term}</dt>
      <dd className="mt-1 text-ink/75">{children}</dd>
    </div>
  );
}
