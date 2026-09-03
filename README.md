<div align="center">

# ⚡ Nexus — Local-First AI Lecture & Meeting Studio

### The open-source, private alternative to Otter.ai & Granola. Audio is transcribed 100% locally on your machine — only clean text is sent for AI synthesis into study guides, Anki decks, and Obsidian notes with zero subscription fees.

<br/>

[![GitHub Stars](https://img.shields.io/github/stars/editorrylix/nexus-ai-lecture-studio?style=for-the-badge&logo=github&color=amber)](https://github.com/editorrylix/nexus-ai-lecture-studio/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/editorrylix/nexus-ai-lecture-studio?style=for-the-badge&logo=github&color=blue)](https://github.com/editorrylix/nexus-ai-lecture-studio/network/members)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Faster-Whisper](https://img.shields.io/badge/Local_STT-Faster--Whisper-00E6FF?style=for-the-badge)](https://github.com/SYSTRAN/faster-whisper)
[![Google Gemini](https://img.shields.io/badge/Gemini_Flash-AI-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev/)
[![Obsidian Ready](https://img.shields.io/badge/Obsidian-Ready-7C3AED?style=for-the-badge&logo=obsidian)](https://obsidian.md/)
[![Anki Export](https://img.shields.io/badge/Anki-Deck_Export-2D3748?style=for-the-badge)](https://apps.ankiweb.net/)

<br/>

> ⭐ **If you find this project useful, please consider starring it on GitHub! It helps students, researchers, and developers discover free, private learning tools.**

<br/>

[Quick Start](#-quick-start-3-minutes) • [Why Nexus?](#-why-nexus-vs-alternatives) • [Architecture](#-hybrid-architecture) • [System Limits](#-system-limits--quotas) • [Key Features](#-core-capabilities) • [Tech Stack](#-tech-stack)

---

</div>

## 💡 Why Nexus? (Vs Alternatives)

Traditional meeting and lecture tools (Otter.ai, Fireflies, Granola) require expensive subscriptions, upload raw microphone and room audio to cloud servers, and intrude on calls with bot avatars.

**Nexus captures audio directly from Windows internal audio channels (WASAPI Loopback) with zero audio uploaded to the cloud:**

| Feature | Otter.ai / Fireflies | Granola | ⚡ **Nexus Studio (Open Source)** |
| :--- | :---: | :---: | :---: |
| **Pricing** | $16.99–$30 / month | $10 / month | **100% Free Forever (MIT)** |
| **Audio Privacy** | Audio uploaded to cloud servers | Cloud Audio Upload | **100% On-Device Transcription (Zero Audio Uploaded)** |
| **Call Bot Intrusion** | Bot joins call & interrupts | Needs mic permission | **Silent Process Loopback (No bot needed)** |
| **Process Audio Isolation** | ❌ Captures all room noise | ❌ Captures mic | **✅ Isolates specific app (Teams/Chrome/Zoom)** |
| **CPU / Resource Usage** | High browser overhead | Heavy desktop app | **Ultra-lightweight (< 2.5% CPU on Ryzen 5 / Intel Core)** |
| **Background Execution** | Web tab must stay open | Desktop window | **Native Win32 System Tray Daemon (12.8MB RAM)** |
| **Anki Deck Export** | ❌ None | ❌ None | **✅ 1-Click `.apkg` Spaced Repetition Decks** |
| **Obsidian Vault Notes** | ❌ None | Manual export | **✅ Direct `.md` with Callouts & Outlines** |
| **Multi-Lecture Stitching**| ❌ No | ❌ No | **✅ Merge multiple segments into Master Study Guide** |
| **Live Captions** | Cloud streamed | Limited | **✅ Real-time On-Device Captions Banner** |

---

## 🏛️ Hybrid Architecture

Nexus uses a **privacy-first, two-tier compute pipeline**:

```
[ Windows Audio (WASAPI) ] ──> [ client-audio-hook.exe (.NET 8) ]
                                            │
                                            ▼
                           [ Local Faster-Whisper (CPU int8) ]
                                            │
                                 (100% Local Transcript)
                                            │
               ┌────────────────────────────┴────────────────────────────┐
               ▼                                                         ▼
    [ Cloud AI Studio: Gemini Flash ]                          [ Offline Fallback ]
        (Text-Only Intelligence)                                (Local Extraction)
   • Markdown Summaries & Takeaways                        • Local Rule-based Notes
   • Spaced-Repetition Anki Cards                          • Offline Anki .apkg
   • Practice Quizzes                                      • Offline Obsidian .md
   • Streaming Conversational Assistant
```

1. **Tier 1: 100% Local Speech-to-Text (Zero Cloud Audio)**
   - Powered by `faster-whisper` (`tiny.en`) with CTranslate2 int8 quantization running locally on CPU.
   - Constrained to 2 worker threads (`beam_size=1`, VAD filtering enabled) to ensure zero impact on system responsiveness (< 2.5% CPU).
   - **Zero voice or audio data is ever transmitted over the network**.
2. **Tier 2: Text-Only Educational Synthesis**
   - Clean transcript text is processed by Gemini Flash for high-speed structured generation (~1.5s).
   - Automatically builds executive summaries, structured course outlines, key term glossaries, practice quizzes, and Anki decks.
   - Powers the streaming lecture Q&A assistant.

---

## 📊 System Limits & Quotas

Nexus is designed to be completely transparent regarding hardware constraints and API allowances:

| Dimension | Specification | Notes & Fallback Behavior |
| :--- | :--- | :--- |
| **Audio Upload Limit** | **Unlimited (0 bytes to cloud)** | Audio is never uploaded to any server; multi-hour lectures process locally without file size caps. |
| **Gemini API Free Tier** | **15 RPM / 1,500 RPD** | Google AI Studio free tier limits. Because only text is sent, requests consume minimal tokens. |
| **LLM Context Window** | **1,000,000 Tokens** | Large context window accommodates 100+ hours of concatenated lecture transcripts in a single session. |
| **Local CPU Footprint** | **< 2.5% CPU / ~180MB RAM** | CTranslate2 int8 optimized with 2 threads and VAD silence skipping for standard mobile/laptop CPUs. |
| **Tray Daemon Footprint**| **12.8MB RAM / 0.0% CPU** | Native Win32 tray orchestrator running directly on the OS message loop. |
| **Transcription Speed** | **~10x real-time on CPU** | A 10-minute lecture audio chunk is transcribed locally in ~20–30 seconds. |
| **Offline Capability** | **Air-Gapped Fallback** | If offline or API key is absent, Nexus synthesizes structured notes and Anki decks locally. |

---

## ✨ Core Capabilities

- **🎙️ Process-Specific Audio Hook**: Captures pure digital audio directly from the sound card using Windows WASAPI loopback. Completely eliminates microphone ambient noise, room reverberation, and keyboard clatter.
- **🔴 Real-Time Local Captions**: Rolling on-device speech captions appear dynamically while lecture recording is active.
- **⚡ Zero-Latency Streaming Lecture Q&A**: Ask questions directly about the lecture. Responses stream token-by-token in real-time (~150ms latency).
- **🗂️ Automated Anki `.apkg` Generator**: Converts the most testable lecture concepts into spaced-repetition flashcards. Download and double-click to import straight into Anki Desktop or AnkiMobile.
- **📝 Obsidian & Notion Markdown Vault**: Structured course modules, key takeaways, and comprehensive glossaries formatted with clean Markdown for your personal second brain.
- **🪡 Multi-Lecture Stitching**: Select multiple lecture segments or workshops and synthesize them into a unified **Master Study Guide**.
- **🎵 Built-In Audio Player**: Re-listen to any recorded lecture with variable speed playback (`1.0x`, `1.25x`, `1.5x`, `2.0x`) and synchronized waveform display.
- **📤 Audio Import**: Have a pre-recorded `.wav` or `.mp3` from your phone or classroom recorder? Drop it in and Nexus will transcribe and synthesize it automatically.
- **🔍 Universal Command Palette (`Ctrl+K` / `⌘K`)**: Rapidly search through all course lectures and execute commands with keyboard shortcuts.

---

## 🚀 Quick Start (3 Minutes)

### 1. Prerequisites
Ensure you have installed:
- [Node.js 18+](https://nodejs.org/)
- [Python 3.11+](https://python.org/)
- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- A free **Google Gemini API Key** from [Google AI Studio](https://aistudio.google.com/) *(1,500 free requests per day)*

### 2. Clone the Repository
```bash
git clone https://github.com/editorrylix/nexus-ai-lecture-studio.git
cd nexus-ai-lecture-studio
```

### 3. Configure API Key
Copy the `.env.example` templates:

```powershell
# For Next.js Web Dashboard
copy web-dashboard\.env.example web-dashboard\.env.local

# For Python Engine
copy local-transcriber-ai\.env.example local-transcriber-ai\.env
```
Inside `.env.local` and `.env`, paste your Gemini API key:
```env
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
```

### 4. Install Dependencies
```powershell
# Setup Python Virtual Environment
cd local-transcriber-ai
python -m venv venv
venv\Scripts\pip.exe install -r requirements.txt

# Setup Web Dashboard
cd ..\web-dashboard
npm install
```

### 5. Launch Nexus Studio
Run the launcher from the project root:
```powershell
.\Start-Nexus.bat
```
*(Starts the background audio daemon, launches the studio dashboard, and opens `http://localhost:3000` in your browser)*.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + K` / `⌘K` | Open Spotlight Command Palette |
| `Space` | Flip Flashcard (Question ↔ Answer) |
| `←` / `→` | Previous / Next Flashcard |
| `?` | Show Keyboard Shortcuts HUD |
| `Esc` | Close Modals & Palettes |

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
Feel free to check the [issues page](https://github.com/editorrylix/nexus-ai-lecture-studio/issues).

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License
Distributed under the **MIT License**. Built with ❤️ for students, educators, and continuous learners.
