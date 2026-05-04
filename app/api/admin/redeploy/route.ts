import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function getSession() {
  const sessionCookie = (await cookies()).get('session');
  if (!sessionCookie) return null;
  try {
    return JSON.parse(sessionCookie.value);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    // Check admin auth
    const session = await getSession();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // Get Portainer config from environment
    const portainerUrl = process.env.PORTAINER_URL;
    const portainerApiKey = process.env.PORTAINER_API_KEY;
    const portainerStackId = process.env.PORTAINER_STACK_ID;

    if (!portainerUrl || !portainerApiKey || !portainerStackId) {
      return NextResponse.json(
        { error: 'Portainer not configured. Set PORTAINER_URL, PORTAINER_API_KEY, and PORTAINER_STACK_ID environment variables.' },
        { status: 400 }
      );
    }

    if (action === 'redeploy') {
      // Trigger stack redeploy via Portainer API
      const response = await fetch(
        `${portainerUrl}/api/stacks/${portainerStackId}/upstack`,
        {
          method: 'POST',
          headers: {
            'X-Api-Key': portainerApiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Portainer redeploy error:', errorText);
        return NextResponse.json(
          { error: 'Failed to trigger redeploy' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: 'Redeploy triggered' });
    }

    if (action === 'status') {
      // Get stack status
      const response = await fetch(
        `${portainerUrl}/api/stacks/${portainerStackId}`,
        {
          method: 'GET',
          headers: {
            'X-Api-Key': portainerApiKey,
          },
        }
      );

      if (!response.ok) {
        return NextResponse.json({ error: 'Failed to get stack status' }, { status: 500 });
      }

      const stack = await response.json();
      return NextResponse.json({
        status: stack.status,
        updatedAt: stack.updatedAt,
        name: stack.name,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Error in /api/admin/redeploy:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}