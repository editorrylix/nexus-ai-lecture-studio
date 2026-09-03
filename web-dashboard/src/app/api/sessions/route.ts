import { NextResponse } from 'next/server';
import { 
  readLocalSessions, 
  saveOrUpdateSession, 
  deleteLocalSession, 
  renameLocalSession,
  togglePinSession,
  getStorageDir 
} from '@/lib/storage';

export async function GET() {
  try {
    const sessions = readLocalSessions();
    // Sort: pinned first, then newest first
    sessions.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return NextResponse.json({
      sessions,
      storageDir: getStorageDir()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, id, title, session } = body;

    if (action === 'rename' && id && title) {
      const success = renameLocalSession(id, title.trim());
      if (!success) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      return NextResponse.json({ success: true, title: title.trim() });
    }

    if (action === 'pin' && id) {
      const success = togglePinSession(id);
      return NextResponse.json({ success });
    }

    if (session) {
      const saved = saveOrUpdateSession(session);
      return NextResponse.json({ success: true, session: saved });
    }

    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
    }

    const success = deleteLocalSession(id);
    if (!success) {
      return NextResponse.json({ error: 'Session not found or already deleted' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
