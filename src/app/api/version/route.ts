// Version route - build hash injected at build time via webpack
export async function GET() {
  const buildHash = process.env.NEXT_PUBLIC_BUILD_HASH || 'dev';
  return Response.json({
    version: '0.0.1',
    build: buildHash
  });
}