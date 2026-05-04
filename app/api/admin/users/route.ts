import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db';
import { getAllUsers, createUser, deleteUser } from '@/lib/auth';

// GET /api/admin/users - list all users (admin only)
// POST /api/admin/users - create user (admin only)
// DELETE /api/admin/users?id=X - delete user (admin only)
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const session = db.prepare(`
      SELECT u.role FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `).get(sessionToken) as any;
    
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    
    const users = getAllUsers();
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const session = db.prepare(`
      SELECT u.role FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `).get(sessionToken) as any;
    
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    
    const body = await request.json();
    const { username, password, role } = body;
    
    const result = createUser(username, password, role);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const session = db.prepare(`
      SELECT u.role FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `).get(sessionToken) as any;
    
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url || '');
    const userId = searchParams.get('id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    
    deleteUser(parseInt(userId));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}