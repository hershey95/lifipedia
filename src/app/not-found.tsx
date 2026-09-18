import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-lg text-center">
      <h1 className="text-2xl font-extrabold">문서를 찾을 수 없습니다</h1>
      <p className="mt-2 text-sm text-ink/60">
        주소가 바뀌었거나, 아직 아무도 작성하지 않은 문서일 수 있습니다.
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <Link href="/themes" className="btn-primary no-underline">테마 둘러보기</Link>
        <Link href="/themes/new" className="btn-ghost no-underline">테마 제안</Link>
      </div>
    </div>
  );
}
