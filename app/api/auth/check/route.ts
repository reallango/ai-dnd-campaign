import { NextResponse } from 'next/server';
import { hasAdmin } from '@/lib/auth';

// GET /api/auth/check
export async function GET() {
  try {
    const needsSetup = !hasAdmin();
    return NextResponse.json({ needsSetup });
  } catch (error) {
    return NextResponse.json({ needsSetup: true });
  }
}