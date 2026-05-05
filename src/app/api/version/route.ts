// Version route - build hash injected at build time via webpack
import { NextResponse } from "next/server";

export async function GET() {
  const buildHash = process.env.NEXT_PUBLIC_BUILD_HASH || 'dev';
  return NextResponse.json({
    version: '0.0.1',
    build: buildHash,
    buildHash: process.env.NEXT_PUBLIC_BUILD_HASH || "unknown"
  });
}