import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export async function GET() {
  let buildHash = "unknown";
  
  // Try to read from build-info.json (written by webpack during build)
  const buildInfoPath = join(process.cwd(), "build-info.json");
  if (existsSync(buildInfoPath)) {
    try {
      const buildInfo = JSON.parse(readFileSync(buildInfoPath, "utf8"));
      buildHash = buildInfo.buildHash || "unknown";
    } catch (e) {
      // ignore
    }
  }
  
  return NextResponse.json({
    version: '0.0.1',
    build: buildHash,
    buildHash: buildHash
  });
}
