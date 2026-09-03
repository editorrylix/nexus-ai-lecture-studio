import { NextResponse } from 'next/server';

const DAEMON_URL = 'http://127.0.0.1:5005';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'status';

  try {
    const endpoint = action === 'processes' ? `${DAEMON_URL}/processes` : `${DAEMON_URL}/status`;
    const res = await fetch(endpoint, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ online: false, error: `Daemon status ${res.status}` }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json({ online: true, ...data });
  } catch (error: any) {
    return NextResponse.json({ 
      online: false, 
      error: "Audio Daemon is offline. Please start audio_daemon.py in local-transcriber-ai." 
    });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, pid, name } = body;

    const endpoint = action === 'start' ? `${DAEMON_URL}/record/start` : `${DAEMON_URL}/record/stop`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pid, name }),
      cache: 'no-store'
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Daemon responded with ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ 
      error: "Could not reach local Audio Daemon on port 5005." 
    }, { status: 503 });
  }
}
