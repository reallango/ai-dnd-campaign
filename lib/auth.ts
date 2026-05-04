// Authentication utilities
import db from '@/lib/db';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'gm';
  created_at: string;
}

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Create first admin user (only if no users exist)
export function createFirstUser(username: string, password: string, email?: string): { success: boolean; error?: string } {
  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    
    if (count.count > 0) {
      return { success: false, error: 'Admin already exists' };
    }
    
    const hash = hashPassword(password);
    db.prepare('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)').run(username, email || null, hash, 'admin');
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create user' };
  }
}

// Check if admin exists
export function hasAdmin(): boolean {
  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin') as { count: number };
    return count.count > 0;
  } catch {
    return false;
  }
}

// Authenticate user
export function authenticateUser(username: string, password: string): User | null {
  try {
    const hash = hashPassword(password);
    const user = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE username = ? AND password_hash = ?').get(username, hash) as User | undefined;
    return user || null;
  } catch {
    return null;
  }
}

// Get all users (admin only)
export function getAllUsers(): User[] {
  return db.prepare('SELECT id, username, email, role, created_at FROM users').all() as User[];
}

// Create user (admin only)
export function createUser(username: string, password: string, role: 'admin' | 'gm', email?: string): { success: boolean; error?: string } {
  try {
    const hash = hashPassword(password);
    db.prepare('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)').run(username, email || null, hash, role);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create user' };
  }
}

// Delete user (admin only)
export function deleteUser(id: number): boolean {
  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return true;
  } catch {
    return false;
  }
}

// Check user is admin
export function isAdmin(userId: number): boolean {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as { role: string } | undefined;
  return user?.role === 'admin';
}

// Get user by ID
export function getUser(userId: number): User | null {
  return db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?').get(userId) as User | null;
}

// Get user from API token or session cookie
export async function getUserFromRequest(request: NextRequest): Promise<{ id: number; username: string; role: string } | null> {
  // Check header first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const result = validateApiToken(token);
    if (result?.valid) {
      const user = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(result.userId) as { id: number; username: string; role: string } | undefined;
      if (user) return user;
    }
  }
  
  // Check query param
  const url = new URL(request.url);
  const queryToken = url.searchParams.get('token');
  if (queryToken) {
    const result = validateApiToken(queryToken);
    if (result?.valid) {
      const user = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(result.userId) as { id: number; username: string; role: string } | undefined;
      if (user) return user;
    }
  }
  
  return null;
}

// Validate API token
export function validateApiToken(token: string): { valid: boolean; userId?: number; expiresAt?: string } | null {
  try {
    const session = db.prepare(`
      SELECT user_id, expires_at 
      FROM api_tokens 
      WHERE token = ? AND expires_at > datetime('now')
    `).get(token) as { user_id: number; expires_at: string } | undefined;
    
    if (!session) return null;
    return { valid: true, userId: session.user_id, expiresAt: session.expires_at };
  } catch {
    return null;
  }
}

// Create API token
export function createApiToken(userId: number, name: string, daysValid: number = 90): { token: string; expiresAt: string } {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000).toISOString();
  
  db.prepare(`
    INSERT INTO api_tokens (user_id, token, name, expires_at) VALUES (?, ?, ?, ?)
  `).run(userId, token, name, expiresAt);
  
  return { token, expiresAt };
}

// Get all API tokens for a user
export function getApiTokens(userId: number): { id: number; name: string; expiresAt: string; createdAt: string }[] {
  return db.prepare(`
    SELECT id, name, expires_at as expiresAt, created_at as createdAt
    FROM api_tokens WHERE user_id = ?
  `).all(userId) as any[];
}

// Revoke API token
export function revokeApiToken(id: number, userId: number): boolean {
  const result = db.prepare('DELETE FROM api_tokens WHERE id = ? AND user_id = ?').run(id, userId);
  return result.changes > 0;
}

// Generate password reset token
export function generatePasswordResetToken(userId: number): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
  
  db.prepare(`
    UPDATE users SET password_reset_token = ?, password_reset_expires = ?
    WHERE id = ?
  `).run(token, expiresAt, userId);
  
  return token;
}

// Validate password reset token
export function validatePasswordResetToken(token: string): { valid: boolean; userId?: number; email?: string; username?: string } {
  try {
    const user = db.prepare(`
      SELECT id, email, username FROM users 
      WHERE password_reset_token = ? AND password_reset_expires > datetime('now')
    `).get(token) as { id: number; email: string; username: string } | undefined;
    
    if (!user) return { valid: false };
    return { valid: true, userId: user.id, email: user.email, username: user.username };
  } catch {
    return { valid: false };
  }
}

// Reset password with token
export function resetPassword(token: string, newPassword: string): { success: boolean; error?: string } {
  try {
    const validation = validatePasswordResetToken(token);
    if (!validation.valid || !validation.userId) {
      return { success: false, error: 'Invalid or expired token' };
    }
    
    const hash = hashPassword(newPassword);
    db.prepare(`
      UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL
      WHERE id = ?
    `).run(hash, validation.userId);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to reset password' };
  }
}

// Get user by email for password reset
export function getUserByEmail(email: string): { id: number; email: string; username: string } | null {
  try {
    const user = db.prepare('SELECT id, email, username FROM users WHERE email = ?').get(email) as { id: number; email: string; username: string } | undefined;
    return user || null;
  } catch {
    return null;
  }
}