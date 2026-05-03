import { NextRequest, NextResponse } from 'next/server';

// Debug test endpoint
export async function POST(request: NextRequest) {
  const body = await request.json();
  console.log('Debug test received:', JSON.stringify(body));
  
  return NextResponse.json({ 
    success: true, 
    message: 'Debug endpoint works!',
    received: body 
  });
}