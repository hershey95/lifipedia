import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function handleError(error: unknown) {
  if (error instanceof ZodError) {
    return fail(400, '입력값이 올바르지 않습니다.', { issues: error.issues });
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
