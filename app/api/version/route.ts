import { NextResponse } from "next/server";

// The webpack plugin injects this global variable at build time
declare const NEXT_PUBLIC_BUILD_HASH: string;

export async function GET() {
  const buildHash = typeof NEXT_PUBLIC_BUILD_HASH !== 'undefined' 
    ? NEXT_PUBLIC_BUILD_HASH 
    : 'unknown';
  
  return NextResponse.json({
    version: '0.0.1',
    build: buildHash,
    buildHash: buildHash
  });
}
