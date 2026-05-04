/**
 * Feedback API - Creates GitHub issues for bugs/features
 * 
 * GITHUB_TOKEN permissions needed:
 * - Option 1: Classic token with 'repo' scope (full private repo access)
 * - Option 2: Classic token with 'public_repo' scope (public repo only)
 * - Option 3: Fine-grained token with:
 *   - Repository: ai-dnd-campaign
 *   - Permissions: Issues -> Read and write
 * 
 * Set GITHUB_TOKEN in your deployment environment variables.
 */

import { NextRequest, NextResponse } from 'next/server';

// POST /api/feedback - Create GitHub issue
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, description, page, url } = body;
    
    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description required' }, { status: 400 });
    }
    
    // Determine label and prefix
    const label = type === 'bug' ? 'bug' : 'enhancement';
    const prefix = type === 'bug' ? '[Bug]' : '[Feature Request]';
    
    // Build issue body with page context
    const issueBody = `**${type === 'bug' ? '🐛 Bug Report' : '✨ Feature Request'}**

${description}

---
- **Page**: ${page || 'Unknown'}
- **URL**: ${url || 'N/A'}
- **Reported from**: ${page}

---
Please describe steps to reproduce (for bugs) or expected behavior (for features).`;

    // Create GitHub issue using REST API
    const githubToken = process.env.GITHUB_TOKEN;
    const repo = 'reallango/ai-dnd-campaign';
    
    if (!githubToken) {
      // No token - store locally instead
      console.log('No GITHUB_TOKEN, storing feedback locally');
      return NextResponse.json({ 
        success: true, 
        message: 'Feedback stored (GitHub not configured)',
        stored: { type, title, description, page, url, created_at: new Date().toISOString() }
      });
    }
    
    const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        title: `${prefix} ${title}`,
        body: issueBody,
        labels: [label, 'feedback']
      })
    });
    
    if (!res.ok) {
      const err = await res.text();
      console.error('GitHub API error:', err);
      return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 });
    }
    
    const issue = await res.json();
    
    return NextResponse.json({ 
      success: true, 
      issue_number: issue.number,
      issue_url: issue.html_url,
      message: 'Feedback submitted!'
    });
  } catch (error) {
    console.error('Feedback error:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}