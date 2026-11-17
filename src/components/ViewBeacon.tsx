'use client';
import { useEffect } from 'react';

/** 조회 1회 기록. 보조 신호라 실패는 조용히 무시한다. */
export function ViewBeacon({ targetType, targetId }: { targetType: 'THEME' | 'ITEM' | 'POST'; targetId: string }) {
  useEffect(() => {
    fetch('/api/views', {
      method: 'POST',
      keepalive: true,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ targetType, targetId }),
    }).catch(() => {});
  }, [targetType, targetId]);
  return null;
}
