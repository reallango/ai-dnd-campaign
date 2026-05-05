import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db';
import { APP_VERSION, APP_BRANCH } from '@/lib/version';

async function getSession() {
  const sessionCookie = (await cookies()).get('session');
  if (!sessionCookie) return null;
  try {
    return JSON.parse(sessionCookie.value);
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const OWNER = 'reallango';
    const REPO = 'ai-dnd-campaign';
    const branch = APP_BRANCH;

    // Fetch latest commit on the branch
    const response = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/branches/${branch}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'ai-dnd-campaign',
        },
      }
    );

    if (!response.ok) {
      console.error('GitHub API error:', response.status);
      return NextResponse.json(
        { error: 'Failed to check version' },
        { status: 500 }
      );
    }

    const branchData = await response.json();
    const latestCommit = branchData.commit.sha;
    const lastUpdated = branchData.commit.commit.author.date;

    return NextResponse.json({
      currentVersion: APP_VERSION,
      currentBranch: APP_BRANCH,
      latestCommit,
      lastUpdated,
      message: 'Store deployed commit in settings to enable update checking.',
      buildHash: process.env.NEXT_PUBLIC_BUILD_HASH || "unknown",
    });
  } catch (error) {
    console.error('Error checking version:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}