import { NextResponse } from 'next/server';
import { z } from 'zod';

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function handleError(error: unknown) {
  if (error instanceof z.ZodError) {
    return fail(400, '입력값이 올바르지 않습니다.', { issues: (error as z.ZodError).issues });
  }
  if ((error as { code?: string })?.code === 'P2002') {
    return fail(409, '동시에 같은 변경이 발생했습니다. 새로고침 후 다시 시도해 주세요.');
  }
  console.error(error);
  return fail(500, '서버 오류가 발생했습니다.');
}

/** 배치(cron) 엔드포인트 보호 */
export function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get('authorization');
  return header === `Bearer ${secret}`;
}

export async function countSince(
  model: { count: (args: { where: Record<string, unknown> }) => Promise<number> },
  where: Record<string, unknown>,
  seconds: number,
): Promise<number> {
  return model.count({ where: { ...where, createdAt: { gte: new Date(Date.now() - seconds * 1000) } } });
}

/** 사용자가 입력하는 외부 링크(구매 링크·이미지)는 http(s) 만 허용한다. javascript:/data:/file: 차단. */
export const httpUrl = z
  .string()
  .url()
  .refine((u) => /^https?:\/\//i.test(u), 'http(s) 주소만 쓸 수 있습니다.');
