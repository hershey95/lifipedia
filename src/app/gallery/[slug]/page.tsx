import { permanentRedirect } from 'next/navigation';

/** 갤러리 화면은 /theme/[slug] 로 통합됐다(308). */
export default async function GalleryRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  permanentRedirect(`/theme/${encodeURIComponent(decodeURIComponent(slug))}`);
}
