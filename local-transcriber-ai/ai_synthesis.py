import os
import json
import glob
import time
import datetime
import genanki
from google import genai
from pydantic import BaseModel
from typing import List
from supabase import create_client, Client

# Load env manually just in case
try:
    with open('.env', 'r') as env_file:
        for line in env_file:
            if '=' in line and not line.startswith('#'):
                k, v = line.strip().split('=', 1)
                os.environ[k] = v
except: pass

class Flashcard(BaseModel):
    front: str
    back: str
    
class GlossaryTerm(BaseModel):
    term: str
    definition: str

class CourseSection(BaseModel):
    title: str
    bullet_points: List[str]

class MeetingSynthesis(BaseModel):
    raw_transcript: str
    summary: str
    action_items: List[str]
    flashcards: List[Flashcard]
    glossary: List[GlossaryTerm]
    course_outline: List[CourseSection]

def get_latest_audio() -> str:
    list_of_files = glob.glob('recording_*.wav')
    if not list_of_files:
        return None
    return max(list_of_files, key=os.path.getctime)

def process_audio(audio_path: str) -> MeetingSynthesis:
    if not os.path.exists(audio_path) or os.path.getsize(audio_path) < 2048:
        raise ValueError(f"Recording file '{audio_path}' is virtually empty ({os.path.getsize(audio_path) if os.path.exists(audio_path) else 0} bytes). Make sure the selected application was playing audible sound during the recording.")

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is missing from your .env file! Please add GEMINI_API_KEY=<your_key> to local-transcriber-ai/.env.")
    
    client = genai.Client(api_key=api_key)
    print(f"Uploading {audio_path} ({os.path.getsize(audio_path) / (1024*1024):.2f} MB) to Google Gemini API...")
    uploaded_file = client.files.upload(file=audio_path)
    
    print("Sending audio to Gemini 3.6 Flash for transcription and synthesis...")
    prompt = """
    You are an expert AI assistant for education and meeting analysis. 
    Listen to the following meeting/lecture audio recording and generate:
    1. A full text transcript of what was said.
    2. A high-level markdown summary.
    3. A list of action items or key takeaways.
    4. A structured course outline breaking the meeting down into logical sections.
    5. A glossary of important technical or specific terms mentioned.
    6. A set of study flashcards capturing the most important concepts.
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-3.6-flash',
            contents=[uploaded_file, prompt],
            config={
                'response_mime_type': 'application/json',
                'response_schema': MeetingSynthesis,
                'temperature': 0.2
            }
        )
        print("Received synthesis from Gemini API.")
        return response.parsed
    finally:
        try:
            print("Cleaning up file from Gemini servers...")
            client.files.delete(name=uploaded_file.name)
        except Exception as e:
            print(f"Failed to delete file from Gemini: {e}")

def generate_anki_deck(synthesis: MeetingSynthesis, session_id: str) -> str:
    print("Generating Anki deck...")
    deck_id = hash(session_id) % (10**10)
    model_id = hash(session_id + "model") % (10**10)
    
    my_model = genanki.Model(
      model_id,
      'Simple Model',
      fields=[
        {'name': 'Question'},
        {'name': 'Answer'},
      ],
      templates=[
        {
          'name': 'Card 1',
          'qfmt': '{{Question}}',
          'afmt': '{{FrontSide}}<hr id="answer">{{Answer}}',
        },
      ])

    my_deck = genanki.Deck(deck_id, f'Lecture Notes - {session_id[:8]}')

    for card in synthesis.flashcards:
        note = genanki.Note(
          model=my_model,
          fields=[card.front, card.back]
        )
        my_deck.add_note(note)

    exports_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../web-dashboard/public/exports'))
    os.makedirs(exports_dir, exist_ok=True)
    
    filename = f"meeting_{session_id}.apkg"
    filepath = os.path.join(exports_dir, filename)
    genanki.Package(my_deck).write_to_file(filepath)
    print(f"Saved Anki deck to {filepath}")
    
    return f"/exports/{filename}"

def save_session_local(synthesis: MeetingSynthesis, audio_path: str = None) -> dict:
    storage_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../storage'))
    os.makedirs(storage_dir, exist_ok=True)
    os.makedirs(os.path.join(storage_dir, 'recordings'), exist_ok=True)
    os.makedirs(os.path.join(storage_dir, 'exports'), exist_ok=True)
    os.makedirs(os.path.join(storage_dir, 'markdown'), exist_ok=True)
    
    session_id = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    anki_url = generate_anki_deck(synthesis, session_id)
    
    summary_lines = [l.strip() for l in synthesis.summary.split('\n') if l.strip() and not l.startswith('#')]
    title = summary_lines[0][:60] if summary_lines else f"Lecture - {datetime.datetime.now().strftime('%b %d, %I:%M %p')}"
    
    advanced_json = {
        "flashcards": [f.model_dump() for f in synthesis.flashcards],
        "course_outline": [c.model_dump() for c in synthesis.course_outline],
        "glossary": [g.model_dump() for g in synthesis.glossary],
        "action_items": synthesis.action_items,
        "anki_url": anki_url
    }
    
    session_obj = {
        "id": f"session_{session_id}",
        "title": title,
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "summary": synthesis.summary,
        "action_items": synthesis.action_items,
        "raw_transcript": synthesis.raw_transcript,
        "flashcards_json": advanced_json,
        "audio_path": audio_path or "",
        "pinned": False,
        "tags": ["Local Recording"]
    }
    
    sessions_file = os.path.join(storage_dir, 'sessions.json')
    sessions = []
    if os.path.exists(sessions_file):
        try:
            with open(sessions_file, 'r', encoding='utf-8') as f:
                sessions = json.load(f)
        except Exception:
            sessions = []
            
    sessions.insert(0, session_obj)
    with open(sessions_file, 'w', encoding='utf-8') as f:
        json.dump(sessions, f, indent=2, ensure_ascii=False)
        
    print(f"Successfully saved session locally to {sessions_file}")
    
    # Save Obsidian/Notion markdown
    md_file = os.path.join(storage_dir, 'markdown', f"lecture_{session_id}.md")
    with open(md_file, 'w', encoding='utf-8') as f:
        f.write(f"# {title}\n\n## Executive Summary\n{synthesis.summary}\n\n")
        f.write("## Action Items\n" + "\n".join(f"- [ ] {i}" for i in synthesis.action_items) + "\n\n")
        f.write("## Full Transcript\n" + synthesis.raw_transcript + "\n")

    return session_obj

if __name__ == "__main__":
    audio_file = get_latest_audio()
    if audio_file:
        try:
            synthesis = process_audio(audio_file)
            print("\n--- Summary ---")
            print(synthesis.summary)
            save_session_local(synthesis, audio_file)
        except Exception as e:
            print(f"Error processing audio: {e}")
    else:
        print("No audio (.wav) files found.")
