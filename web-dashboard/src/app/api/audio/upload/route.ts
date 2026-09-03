import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { getStorageDir, readLocalSessions } from '@/lib/storage';

const execPromise = util.promisify(exec);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const storageDir = getStorageDir();
    const recordingsDir = path.join(storageDir, 'recordings');
    if (!fs.existsSync(recordingsDir)) {
      fs.mkdirSync(recordingsDir, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const targetFilePath = path.join(recordingsDir, `upload_${timestamp}_${sanitizedName}`);

    fs.writeFileSync(targetFilePath, buffer);

    // Call Python synthesis script on this file
    const pythonExe = path.resolve(process.cwd(), '../local-transcriber-ai/venv/Scripts/python.exe');
    const synthScript = path.resolve(process.cwd(), '../local-transcriber-ai/ai_synthesis.py');

    const cmd = `"${pythonExe}" "${synthScript}" "${targetFilePath}"`;
    await execPromise(cmd, {
      cwd: path.resolve(process.cwd(), '../local-transcriber-ai')
    });

    // Read the newly saved session
    const sessions = readLocalSessions();
    const newSession = sessions[0] || null;

    return NextResponse.json({
      success: true,
      message: 'Audio imported and synthesized successfully!',
      session: newSession
    });

  } catch (error: any) {
    console.error("Audio upload error:", error);
    return NextResponse.json({ error: error.message || 'Failed to process uploaded audio' }, { status: 500 });
  }
}
