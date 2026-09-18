import type { Metadata } from 'next';
import { ProposeThemeForm } from '@/components/ProposeThemeForm';
import { promotionThreshold } from '@/lib/theme-lifecycle';

export const metadata: Metadata = { title: '테마 제안' };

export default function NewThemePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold">테마 제안</h1>
      <p className="mt-2 text-sm text-ink/65">
        어떤 기준으로든 테마를 만들 수 있습니다 — 생애주기(0세·10대·고3), 상황(취준·결혼 준비),
        취향(캠핑·자취·여행) 무엇이든 좋습니다. 팔로워가 {promotionThreshold()}명을 넘으면
        운영자 승인 없이 자동으로 정식 테마가 되고, 위키 작성과 순위 산정이 열립니다.
      </p>
      <div className="mt-6">
        <ProposeThemeForm />
      </div>
    </div>
  );
}
