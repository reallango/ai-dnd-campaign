import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, createUser, deleteUser, isAdmin as checkIsAdmin } from '@/lib/auth';

// GET /api/auth/users - list all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    const userId = request.headers.get('x-user-id');
    
    if (!userId || !checkIsAdmin(parseInt(userId))) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    
    const users = getAllUsers();
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get users' }, { status: 500 });
  }
}

// POST /api/auth/users - create user (admin only)
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const body = await request.json();
    const { username, password, role } = body;
    
    if (!userId || !checkIsAdmin(parseInt(userId))) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    
    const result = createUser(username, password, role);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

// DELETE /api/auth/users - delete user (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0');
    
    if (!userId || !checkIsAdmin(parseInt(userId))) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    
    deleteUser(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}