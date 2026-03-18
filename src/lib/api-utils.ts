import { NextResponse } from 'next/server';
import { getCurrentUserId as getAuthUserId } from '@/lib/auth';

export type ApiErrorCode = 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL_ERROR';

export function apiError(message: string, status: number = 400, code?: ApiErrorCode) {
  return NextResponse.json(
    { error: message, code: code ?? 'BAD_REQUEST' },
    { status }
  );
}

export function apiSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

/** Current user id from NextAuth session (async). */
export async function getCurrentUserId(): Promise<string | null> {
  return getAuthUserId();
}
