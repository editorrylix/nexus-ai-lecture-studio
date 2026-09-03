import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getStorageDir, readLocalSessions } from '@/lib/storage';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  const filename = searchParams.get('file');

  const storageDir = getStorageDir();
  let targetPath = '';

  if (filename) {
    targetPath = path.join(storageDir, 'recordings', path.basename(filename));
  } else if (sessionId) {
    const sessions = readLocalSessions();
    const session = sessions.find(s => s.id === sessionId);
    if (session?.audio_path && fs.existsSync(session.audio_path)) {
      targetPath = session.audio_path;
    } else {
      // Fallback: search recordings directory for matching timestamp or wav files
      const recordingsDir = path.join(storageDir, 'recordings');
      if (fs.existsSync(recordingsDir)) {
        const files = fs.readdirSync(recordingsDir).filter(f => f.endsWith('.wav'));
        if (files.length > 0) {
          // Sort newest first
          files.sort((a, b) => {
            const statA = fs.statSync(path.join(recordingsDir, a));
            const statB = fs.statSync(path.join(recordingsDir, b));
            return statB.mtimeMs - statA.mtimeMs;
          });
          targetPath = path.join(recordingsDir, files[0]);
        }
      }
    }
  }

  if (!targetPath || !fs.existsSync(targetPath)) {
    return NextResponse.json({ error: 'Audio file not found' }, { status: 404 });
  }

  const stat = fs.statSync(targetPath);
  const fileSize = stat.size;
  const range = req.headers.get('range');

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;
    const fileStream = fs.createReadStream(targetPath, { start, end });

    // Stream partial content
    const responseStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk));
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (err) => controller.error(err));
      }
    });

    return new Response(responseStream, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': `${chunkSize}`,
        'Content-Type': 'audio/wav',
      }
    });
  } else {
    const fileStream = fs.createReadStream(targetPath);
    const responseStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk));
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (err) => controller.error(err));
      }
    });

    return new Response(responseStream, {
      headers: {
        'Content-Length': `${fileSize}`,
        'Content-Type': 'audio/wav',
        'Accept-Ranges': 'bytes',
      }
    });
  }
}
