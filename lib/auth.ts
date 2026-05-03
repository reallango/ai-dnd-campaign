// Authentication utilities
import db from '@/lib/db';
import crypto from 'crypto';

export interface User {
  id: number;
  username: string;
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
export function createFirstUser(username: string, password: string): { success: boolean; error?: string } {
  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    
    if (count.count > 0) {
      return { success: false, error: 'Admin already exists' };
    }
    
    const hash = hashPassword(password);
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, hash, 'admin');
    
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
    const user = db.prepare('SELECT id, username, role, created_at FROM users WHERE username = ? AND password_hash = ?').get(username, hash) as User | undefined;
    return user || null;
  } catch {
    return null;
  }
}

// Get all users (admin only)
export function getAllUsers(): User[] {
  return db.prepare('SELECT id, username, role, created_at FROM users').all() as User[];
}

// Create user (admin only)
export function createUser(username: string, password: string, role: 'admin' | 'gm'): { success: boolean; error?: string } {
  try {
    const hash = hashPassword(password);
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, hash, role);
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