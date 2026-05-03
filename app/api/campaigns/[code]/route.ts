import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET /api/campaigns/[code] - Get campaign by code
// PUT /api/campaigns/[code] - Update campaign
// DELETE /api/campaigns/[code] - Delete campaign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const campaign = db.prepare('SELECT * FROM campaigns WHERE code = ?').get(code);
    
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    
    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { name, description, status } = body;
    
    const campaign = db.prepare('SELECT * FROM campaigns WHERE code = ?').get(code);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    
    const updates: string[] = [];
    const values: any[] = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(code);
    
    db.prepare(`UPDATE campaigns SET ${updates.join(', ')} WHERE code = ?`).run(...values);
    
    const updated = db.prepare('SELECT * FROM campaigns WHERE code = ?').get(code);
    return NextResponse.json({ campaign: updated });
  } catch (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const campaign = db.prepare('SELECT * FROM campaigns WHERE code = ?').get(code);
    
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    
    db.prepare('DELETE FROM campaigns WHERE code = ?').run(code);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }
}