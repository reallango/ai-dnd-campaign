import { NextRequest, NextResponse } from 'next/server';
import { getUser, hashPassword, isAdmin as checkIsAdmin } from '@/lib/auth';
import db from '@/lib/db';

// PUT /api/auth/users/[id] - Update user
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: userIdStr } = await params;
    const userId = parseInt(userIdStr);
    
    const adminId = request.headers.get('x-user-id');
    if (!adminId || !checkIsAdmin(parseInt(adminId))) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    
    const body = await request.json();
    const { username, email, role, password } = body;
    
    // Get target user
    const targetUser = getUser(userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Update user
    const updates: string[] = [];
    const values: any[] = [];
    
    if (username && username !== targetUser.username) {
      updates.push('username = ?');
      values.push(username);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (role && role !== targetUser.role) {
      updates.push('role = ?');
      values.push(role);
    }
    if (password) {
      updates.push('password_hash = ?');
      values.push(hashPassword(password));
    }
    
    if (updates.length > 0) {
      values.push(userId);
      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}