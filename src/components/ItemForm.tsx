'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { TIERS, TIER_LABELS, type Tier } from '@/lib/tier';

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

  function set<K extends keyof ItemFormValues>(key: K, value: ItemFormValues[K]) {
    setValues((previous) => ({ ...previous, [key]: value }));
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
        : { ...values, baseRevision: props.baseRevision, summary: summary || undefined };

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
    router.push(`/theme/${props.themeSlug}/item/${slug}`);
    router.refresh();
  }

  return (
    <form onSubmit={(event) => submit(event)} className="card flex flex-col gap-4">
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

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">설명</span>
        <textarea
          className="field min-h-40"
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          required
          minLength={10}
          maxLength={20000}
          placeholder="어떤 제품인지, 어떤 점이 좋은지 자유롭게 적어 주세요."
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">추천 이유 <span className="font-normal text-ink/40">(선택)</span></span>
        <textarea
          className="field min-h-24"
          value={values.recommendReason ?? ''}
          onChange={(e) => set('recommendReason', e.target.value || null)}
          maxLength={5000}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">스펙 요약 <span className="font-normal text-ink/40">(선택)</span></span>
        <textarea
          className="field min-h-24"
          value={values.specSummary ?? ''}
          onChange={(e) => set('specSummary', e.target.value || null)}
          maxLength={5000}
        />
      </label>

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
            onChange={(e) => setSummary(e.target.value)}
            placeholder="무엇을 왜 바꿨는지 한 줄로"
            maxLength={200}
          />
        </label>
      ) : null}

      {notice ? <p className="text-sm text-accent">{notice}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button type="submit" className="btn-primary self-start" disabled={busy}>
        {busy ? '저장 중…' : props.mode === 'create' ? '문서 만들기' : '저장'}
      </button>
    </form>
  );
}
