'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { TIERS, TIER_LABELS, type Tier } from '@/lib/tier';
import { draftKey, readDraft, writeDraft } from '@/lib/draft';
import { MarkdownEditor } from './MarkdownEditor';

export type ItemFormValues = {
  name: string;
  tier: Tier;
  priceKrw: number | null;
  description: string;
  specSummary: string | null;
  recommendReason: string | null;
  imageUrl: string | null;
  purchaseLinks: { label: string; url: string }[];
};

type Props =
  | { mode: 'create'; themeSlug: string; initial?: undefined; itemId?: undefined; baseRevision?: undefined }
  | {
      mode: 'edit';
      themeSlug: string;
      itemSlug: string;
      itemId: string;
      baseRevision: number;
      initial: ItemFormValues;
    };

const EMPTY: ItemFormValues = {
  name: '',
  tier: 'MID',
  priceKrw: null,
  description: '',
  specSummary: null,
  recommendReason: null,
  imageUrl: null,
  purchaseLinks: [],
};

export function ItemForm(props: Props) {
  const { status } = useSession();
  const router = useRouter();
  const [values, setValues] = useState<ItemFormValues>(props.initial ?? EMPTY);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tierWarning, setTierWarning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** 편집 필터(W4): 확인이 필요한 사유와 확인 체크 */
  const [filterWarning, setFilterWarning] = useState<string[] | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  /** 저장은 됐지만 안내(hint)를 보여 줘야 해서 아직 이동하지 않은 상태 */
  const [saved, setSaved] = useState<{ href: string; hint: string[] } | null>(null);

  // 임시 저장(W5). localStorage 가 막힌 브라우저에서도 폼은 동작해야 하므로 모두 try/catch.
  const storageKey = draftKey(
    props.mode === 'create' ? { mode: 'create', themeSlug: props.themeSlug } : { mode: 'edit', itemId: props.itemId },
  );
  const baseRevision = props.mode === 'edit' ? props.baseRevision : 0;
  const [draft, setDraft] = useState<ReturnType<typeof readDraft>>(null);
  const dirty = useRef(false);

  useEffect(() => {
    // 서버 렌더와 어긋나지 않게 마운트 뒤에 읽는다.
    try {
      setDraft(readDraft(window.localStorage.getItem(storageKey), baseRevision));
    } catch {}
  }, [storageKey, baseRevision]);

  useEffect(() => {
    // 저장본을 쓸지 정하기 전에는 덮어쓰지 않는다. 서버 저장이 끝난 뒤(saved)에도 남기지 않는다.
    if (!dirty.current || draft || saved) return;
    try {
      window.localStorage.setItem(storageKey, writeDraft(baseRevision, values, summary));
    } catch {}
  }, [values, summary, draft, saved, storageKey, baseRevision]);

  function clearDraft() {
    dirty.current = false;
    try {
      window.localStorage.removeItem(storageKey);
    } catch {}
  }

  function set<K extends keyof ItemFormValues>(key: K, value: ItemFormValues[K]) {
    dirty.current = true;
    setValues((previous) => ({ ...previous, [key]: value }));
    // 값이 바뀌면 이전 확인은 무효다.
    setFilterWarning(null);
    setConfirmed(false);
  }

  async function submit(event: React.FormEvent, confirmTier = false) {
    event.preventDefault();
    if (status !== 'authenticated') {
      void signIn();
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);

    const endpoint =
      props.mode === 'create' ? '/api/items' : `/api/items/${props.itemId}/edit`;

    const payload =
      props.mode === 'create'
        ? { ...values, themeSlug: props.themeSlug, priceKrw: values.priceKrw ?? undefined, confirmTier }
        : { ...values, baseRevision: props.baseRevision, summary: summary || undefined, confirmed };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    setBusy(false);

    if (!response.ok) {
      if (data.needsTierConfirmation) {
        setTierWarning(data.error);
        return;
      }
      if (data.error === 'confirm') {
        setFilterWarning([...(data.confirm as string[]), ...((data.hint as string[] | undefined) ?? [])]);
        return;
      }
      if (data.error === 'blocked') {
        setError((data.block as string[]).join(' '));
        return;
      }
      if (data.conflict) {
        setError(
          `${data.error} 충돌 필드: ${(data.conflictingFields as string[]).join(', ')}. ` +
            '페이지를 새로고침해 최신 내용을 확인한 뒤 다시 저장해 주세요.',
        );
        return;
      }
      setError(data.error ?? '저장에 실패했습니다.');
      return;
    }

    if (data.autoMerged) {
      setNotice(`다른 사용자가 수정한 ${(data.alsoChangedByOthers as string[]).join(', ')} 항목과 자동 병합되었습니다.`);
    }

    // 슬러그는 생성 시점에 고정되므로 편집 후에도 같은 URL 로 돌아간다.
    const slug = props.mode === 'create' ? data.item.slug : props.itemSlug;
    const href = `/theme/${props.themeSlug}/item/${slug}`;
    // 불러올지 정하지 않은 저장본은 지우지 않는다.
    if (!draft) clearDraft();
    dirty.current = false;
    if (data.hint?.length) {
      // 바로 이동하면 안내를 볼 수 없다.
      setFilterWarning(null);
      setSaved({ href, hint: data.hint });
      return;
    }
    router.push(href);
    router.refresh();
  }

  return (
    <form onSubmit={(event) => submit(event)} className="card flex flex-col gap-4">
      {draft ? (
        <div role="status" className="rounded-lg border border-mid/40 bg-mid/5 p-3 text-sm">
          <p>이 브라우저에 저장하지 않은 작성 내용이 있습니다. 불러오거나 버리기 전에는 새로 임시 저장하지 않습니다.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                dirty.current = true;
                setValues(draft.values);
                setSummary(draft.summary);
                setFilterWarning(null);
                setConfirmed(false);
                setDraft(null);
              }}
            >
              불러오기
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                clearDraft();
                setDraft(null);
              }}
            >
              버리기
            </button>
          </div>
        </div>
      ) : null}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">제품명</span>
        <input className="field" value={values.name} onChange={(e) => set('name', e.target.value)} required maxLength={80} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">가격대</span>
          <select className="field" value={values.tier} onChange={(e) => set('tier', e.target.value as Tier)}>
            {TIERS.map((tier) => (
              <option key={tier} value={tier}>{TIER_LABELS[tier]}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">대표 가격 (원) <span className="font-normal text-ink/40">(선택)</span></span>
          <input
            className="field"
            type="number"
            min={0}
            value={values.priceKrw ?? ''}
            onChange={(e) => set('priceKrw', e.target.value === '' ? null : Number(e.target.value))}
          />
        </label>
      </div>

      {tierWarning ? (
        <div className="rounded-lg border border-mid/40 bg-mid/5 p-3 text-sm">
          <p>{tierWarning}</p>
          <button type="button" className="btn-ghost mt-2" onClick={(event) => submit(event, true)} disabled={busy}>
            그래도 이 가격대로 등록
          </button>
        </div>
      ) : null}

      <MarkdownEditor
        label="제품 위키 설명"
        value={values.description}
        onChange={(val) => set('description', val)}
        required
        maxLength={20000}
        placeholder="어떤 제품인지, 어떤 점이 좋은지 자유롭게 적어 주세요. [[연관테마]]로 다른 갤러리와 연결할 수 있습니다."
      />

      <MarkdownEditor
        label="추천 이유 (선택)"
        value={values.recommendReason ?? ''}
        onChange={(val) => set('recommendReason', val || null)}
        rows={4}
        maxLength={5000}
        placeholder="왜 이 제품이 저/중/고가 1위로 추천될 만한지 이유를 설명해 주세요."
      />

      <MarkdownEditor
        label="상세 스펙 요약 (선택)"
        value={values.specSummary ?? ''}
        onChange={(val) => set('specSummary', val || null)}
        rows={4}
        maxLength={5000}
        placeholder="| 항목 | 내용 | 형식의 마크다운 표나 스펙을 자유롭게 작성하세요."
      />

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">이미지 URL <span className="font-normal text-ink/40">(선택)</span></span>
        <input
          className="field"
          type="url"
          value={values.imageUrl ?? ''}
          onChange={(e) => set('imageUrl', e.target.value || null)}
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">구매 링크 <span className="font-normal text-ink/40">(선택, 최대 8개)</span></legend>
        {values.purchaseLinks.map((link, index) => (
          <div key={index} className="flex gap-2">
            <input
              className="field w-1/3"
              placeholder="쇼핑몰"
              value={link.label}
              onChange={(e) => {
                const next = [...values.purchaseLinks];
                next[index] = { ...link, label: e.target.value };
                set('purchaseLinks', next);
              }}
            />
            <input
              className="field flex-1"
              type="url"
              placeholder="https://"
              value={link.url}
              onChange={(e) => {
                const next = [...values.purchaseLinks];
                next[index] = { ...link, url: e.target.value };
                set('purchaseLinks', next);
              }}
            />
            <button
              type="button"
              className="btn-ghost"
              onClick={() => set('purchaseLinks', values.purchaseLinks.filter((_, i) => i !== index))}
            >
              삭제
            </button>
          </div>
        ))}
        {values.purchaseLinks.length < 8 ? (
          <button
            type="button"
            className="btn-ghost self-start"
            onClick={() => set('purchaseLinks', [...values.purchaseLinks, { label: '', url: '' }])}
          >
            링크 추가
          </button>
        ) : null}
      </fieldset>

      {props.mode === 'edit' ? (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">편집 요약</span>
          <input
            className="field"
            value={summary}
            onChange={(e) => {
              dirty.current = true;
              setSummary(e.target.value);
            }}
            placeholder="무엇을 왜 바꿨는지 한 줄로"
            maxLength={200}
          />
        </label>
      ) : null}

      {notice ? <p className="text-sm text-accent-fg">{notice}</p> : null}
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}

      {filterWarning ? (
        <div role="alert" className="rounded-lg border border-mid/40 bg-mid/5 p-3 text-sm">
          <ul className="list-disc pl-4">
            {filterWarning.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <label className="mt-2 flex items-center gap-2">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            확인했습니다. 체크한 뒤 다시 저장해 주세요.
          </label>
        </div>
      ) : null}

      {saved ? (
        <p role="status" className="text-sm text-warn-fg">
          저장했습니다. {saved.hint.join(' ')} <a href={saved.href}>문서 보기</a>
        </p>
      ) : null}

      <button type="submit" className="btn-primary self-start" disabled={busy || saved !== null || (filterWarning !== null && !confirmed)}>
        {busy ? '저장 중…' : props.mode === 'create' ? '문서 만들기' : '저장'}
      </button>
    </form>
  );
}
