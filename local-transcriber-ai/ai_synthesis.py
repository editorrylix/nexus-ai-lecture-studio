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

def process_audio_locally(audio_path: str) -> MeetingSynthesis:
    """Fallback offline processing using faster-whisper with CTranslate2."""
    import local_stt
    print(f"[OFFLINE] Transcribing {audio_path} with local Faster-Whisper model...")
    stt_res = local_stt.transcribe_audio_file(audio_path, model_size="tiny.en")
    transcript = stt_res.get("text", "").strip()
    if not transcript:
        transcript = "No audible speech was detected in this recording."
        
    sentences = [s.strip() for s in transcript.split('.') if len(s.strip()) > 8]
    
    summary = f"### Local Lecture Summary (Processed Offline)\n\n"
    if sentences:
        summary += f"This lecture covered: {sentences[0]}.\n\n"
        for s in sentences[1:4]:
            summary += f"- {s}.\n"
    else:
        summary += transcript
        
    action_items = [f"Review key point: {s[:70]}..." for s in sentences[:3]] if sentences else ["Review lecture recording."]
    
    flashcards = []
    for i, s in enumerate(sentences[:5]):
        words = s.split()
        if len(words) >= 4:
            flashcards.append(Flashcard(
                front=f"What was explained regarding '{' '.join(words[:3])}...'?",
                back=s
            ))
            
    if not flashcards:
        flashcards.append(Flashcard(front="Lecture Overview", back=transcript[:140]))
        
    glossary = []
    words = transcript.split()
    seen = set()
    for w in words:
        clean = w.strip('.,!?:;"()').capitalize()
        if len(clean) > 4 and clean not in seen and clean.isalpha():
            seen.add(clean)
            glossary.append(GlossaryTerm(term=clean, definition="Key term identified in local audio transcript."))
            if len(glossary) >= 4:
                break
                
    course_outline = [
        CourseSection(title="1. Introduction", bullet_points=sentences[:2] if sentences else [transcript[:60]]),
        CourseSection(title="2. Core Content", bullet_points=sentences[2:5] if len(sentences) > 2 else ["Full discussion recorded."]),
        CourseSection(title="3. Review & Summary", bullet_points=action_items)
    ]
    
    return MeetingSynthesis(
        raw_transcript=transcript,
        summary=summary,
        action_items=action_items,
        flashcards=flashcards,
        glossary=glossary,
        course_outline=course_outline
    )

def process_audio(audio_path: str) -> MeetingSynthesis:
    if not os.path.exists(audio_path) or os.path.getsize(audio_path) < 2048:
        raise ValueError(f"Recording file '{audio_path}' is virtually empty ({os.path.getsize(audio_path) if os.path.exists(audio_path) else 0} bytes). Make sure the selected application was playing audible sound during the recording.")

    # 1. Always Transcribe 100% Locally (Zero Audio Uploaded to Cloud)
    import local_stt
    print(f"[LOCAL STT] Transcribing {audio_path} locally on CPU via Faster-Whisper...")
    stt_res = local_stt.transcribe_audio_file(audio_path, model_size="tiny.en")
    transcript = stt_res.get("text", "").strip()
    
    if not transcript:
        print("[LOCAL STT] No audible speech detected in audio file.")
        transcript = "No audible speech was detected in this recording."

    print(f"[LOCAL STT] Local transcript generated ({len(transcript)} chars). Zero audio sent to cloud.")

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("[AI] GEMINI_API_KEY not set. Using 100% offline local notes synthesis.")
        return process_audio_locally(audio_path)
    
    # 2. Use Gemini API ONLY for Text Intelligence (Summary, Outline, Flashcards, Glossary)
    try:
        client = genai.Client(api_key=api_key)
        print("Sending clean transcript to Gemini 3.6 Flash for education synthesis & study tools...")
        prompt = f"""
        You are an expert AI tutor and lecture study synthesizer.
        Below is the verbatim transcript of a recorded meeting/lecture:

        ---
        {transcript}
        ---

        Generate a comprehensive, structured study package based on this lecture:
        1. raw_transcript: Use the exact transcript provided above.
        2. summary: A structured, high-level executive summary in Markdown format with key sections.
        3. action_items: Practical takeaways, study recommendations, or exam preparation points.
        4. course_outline: Logical course sections with clear topic titles and sub-bullet points.
        5. glossary: Essential technical terms or domain concepts with concise definitions.
        6. flashcards: High-yield Question and Answer flashcard pairs for spaced repetition study.
        """
        
        response = client.models.generate_content(
            model='gemini-3.6-flash',
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'response_schema': MeetingSynthesis,
                'temperature': 0.2
            }
        )
        print("[AI] Received structured synthesis from Gemini API successfully.")
        parsed = response.parsed
        # Ensure the transcript from local model is preserved
        parsed.raw_transcript = transcript
        return parsed
    except Exception as e:
        print(f"[AI] Gemini API text synthesis error or offline ({e}). Falling back to local synthesis.")
        return process_audio_locally(audio_path)

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
    audio_file = sys.argv[1] if len(sys.argv) > 1 and os.path.exists(sys.argv[1]) else get_latest_audio()
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
