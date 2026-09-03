import fs from 'fs';
import path from 'path';

export interface Flashcard {
  front: string;
  back: string;
}

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface CourseSection {
  title: string;
  bullet_points: string[];
}

export interface SessionData {
  id: string;
  title: string;
  created_at: string;
  summary: string;
  action_items: string[];
  raw_transcript: string;
  flashcards_json: {
    flashcards: Flashcard[];
    course_outline: CourseSection[];
    glossary: GlossaryTerm[];
    action_items?: string[];
    anki_url?: string;
  };
  audio_path?: string;
  pinned?: boolean;
  tags?: string[];
}

// Default storage directory on local disk
const DEFAULT_STORAGE_PATH = path.resolve(process.cwd(), '../storage');

export function getStorageDir(): string {
  const dir = process.env.LOCAL_STORAGE_PATH || DEFAULT_STORAGE_PATH;
  if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) {
    fs.mkdirSync(dir, { recursive: true });
    fs.mkdirSync(path.join(dir, 'recordings'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'exports'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'markdown'), { recursive: true });
  }
  return dir;
}

export function getSessionsFilePath(): string {
  const dir = getStorageDir();
  return path.join(dir, 'sessions.json');
}

export function readLocalSessions(): SessionData[] {
  const filePath = getSessionsFilePath();
  if (!fs.existsSync(filePath)) {
    // Initial empty state or migrate from Supabase
    fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf-8');
    return [];
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("Error reading sessions.json:", e);
    return [];
  }
}

export function writeLocalSessions(sessions: SessionData[]) {
  const filePath = getSessionsFilePath();
  fs.writeFileSync(filePath, JSON.stringify(sessions, null, 2), 'utf-8');
}

export function saveOrUpdateSession(session: SessionData): SessionData {
  const sessions = readLocalSessions();
  const existingIdx = sessions.findIndex(s => s.id === session.id);
  
  if (existingIdx >= 0) {
    sessions[existingIdx] = { ...sessions[existingIdx], ...session };
  } else {
    sessions.unshift(session);
  }
  
  writeLocalSessions(sessions);
  return session;
}

export function deleteLocalSession(id: string): boolean {
  const sessions = readLocalSessions();
  const filtered = sessions.filter(s => s.id !== id);
  if (filtered.length === sessions.length) return false;
  writeLocalSessions(filtered);
  return true;
}

export function renameLocalSession(id: string, newTitle: string): boolean {
  const sessions = readLocalSessions();
  const session = sessions.find(s => s.id === id);
  if (!session) return false;
  session.title = newTitle;
  writeLocalSessions(sessions);
  return true;
}

export function togglePinSession(id: string): boolean {
  const sessions = readLocalSessions();
  const session = sessions.find(s => s.id === id);
  if (!session) return false;
  session.pinned = !session.pinned;
  writeLocalSessions(sessions);
  return true;
}
