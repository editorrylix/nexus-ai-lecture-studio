import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

const DAEMON_URL = 'http://127.0.0.1:5005';
let lastSpawnTime = 0;

function autoStartDaemon() {
  const now = Date.now();
  if (now - lastSpawnTime < 10000) return; // Debounce 10s
  lastSpawnTime = now;

  try {
    const pythonExe = path.resolve(process.cwd(), '../local-transcriber-ai/venv/Scripts/pythonw.exe');
    const daemonScript = path.resolve(process.cwd(), '../local-transcriber-ai/audio_daemon.py');
    const child = spawn(pythonExe, [daemonScript], {
      detached: true,
      stdio: 'ignore',
      cwd: path.resolve(process.cwd(), '../local-transcriber-ai')
    });
    child.unref();
  } catch (e) {
    console.error('Auto-start daemon failed:', e);
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'status';

  const endpoint = action === 'processes' ? `${DAEMON_URL}/processes` : `${DAEMON_URL}/status`;

  try {
    const res = await fetch(endpoint, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ online: false, error: `Daemon status ${res.status}` }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json({ online: true, ...data });
  } catch (error: any) {
    // Self-heal: auto-spawn daemon and retry once after short pause
    autoStartDaemon();
    try {
      await new Promise(r => setTimeout(r, 800));
      const retryRes = await fetch(endpoint, { cache: 'no-store' });
      if (retryRes.ok) {
        const retryData = await retryRes.json();
        return NextResponse.json({ online: true, ...retryData });
      }
    } catch { }

    return NextResponse.json({ 
      online: false, 
      error: "Audio Daemon is initializing. Please click Rescan Apps in 2 seconds." 
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
