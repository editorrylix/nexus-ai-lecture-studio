import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const { flashcards } = await request.json();

    if (!flashcards || !Array.isArray(flashcards)) {
      return NextResponse.json({ error: 'Invalid flashcards data' }, { status: 400 });
    }

    // Create temporary files
    const tmpDir = os.tmpdir();
    const jsonPath = path.join(tmpDir, `flashcards_${Date.now()}.json`);
    const apkgPath = path.join(tmpDir, `flashcards_${Date.now()}.apkg`);

    await fs.writeFile(jsonPath, JSON.stringify(flashcards));

    // Resolve the python script path assuming standard monorepo structure
    const pythonScript = path.resolve(process.cwd(), '../../local-transcriber-ai/export_anki.py');
    
    // Call python script
    // NOTE: This assumes 'python' is in PATH and has genanki installed.
    const { stdout, stderr } = await execAsync(`python "${pythonScript}" "${jsonPath}" "${apkgPath}"`);
    
    if (stderr && !stderr.includes('Created')) {
        console.warn('Python script warning/error:', stderr);
    }

    // Read the generated .apkg file
    const fileBuffer = await fs.readFile(apkgPath);

    // Clean up temp files
    await fs.unlink(jsonPath).catch(console.error);
    await fs.unlink(apkgPath).catch(console.error);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="flashcards.apkg"',
      },
    });

  } catch (error: any) {
    console.error('Error exporting to Anki:', error);
    return NextResponse.json({ error: error.message || 'Failed to export' }, { status: 500 });
  }
}
