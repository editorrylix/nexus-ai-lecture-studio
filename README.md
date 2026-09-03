<div align="center">

# ⚡ Nexus — Local-First AI Lecture & Meeting Studio

### The open-source, 100% private alternative to Otter.ai & Granola. Turn live Zoom, Teams, and Chrome audio into structured study guides, Anki decks, and Obsidian notes — entirely offline on your PC with zero subscription fees.

<br/>

[![GitHub Stars](https://img.shields.io/github/stars/editorrylix/nexus-ai-lecture-studio?style=for-the-badge&logo=github&color=amber)](https://github.com/editorrylix/nexus-ai-lecture-studio/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/editorrylix/nexus-ai-lecture-studio?style=for-the-badge&logo=github&color=blue)](https://github.com/editorrylix/nexus-ai-lecture-studio/network/members)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Google Gemini](https://img.shields.io/badge/Gemini_3.6_Flash-AI-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev/)
[![Obsidian Ready](https://img.shields.io/badge/Obsidian-Ready-7C3AED?style=for-the-badge&logo=obsidian)](https://obsidian.md/)
[![Anki Export](https://img.shields.io/badge/Anki-Deck_Export-2D3748?style=for-the-badge)](https://apps.ankiweb.net/)

<br/>

> ⭐ **If you like this project, please consider giving it a star on GitHub! It helps more students, researchers, and developers discover free, private lecture tools.**

<br/>

[Quick Start (3 Mins)](#-quick-start-3-minutes) • [Why Nexus?](#-why-nexus-vs-alternatives) • [System Tray Flyout](#-native-windows-11-system-tray) • [Key Features](#-key-features) • [Local Model Roadmap](#-local-transcriber-models--offline-roadmap) • [Architecture](#-architecture--data-flow) • [Tech Stack](#-tech-stack)

---

</div>

## 💡 Why Nexus? (Vs Alternatives)

Traditional AI meeting notetakers like Otter.ai, Fireflies.ai, or Granola come with serious drawbacks: expensive monthly subscriptions, privacy risks, creepy bot avatars joining your call, and cloud lock-in.

**Nexus fixes this by capturing audio directly from Windows internal audio channels (WASAPI Loopback):**

| Feature | Otter.ai / Fireflies | Granola | ⚡ **Nexus Studio (Open Source)** |
| :--- | :---: | :---: | :---: |
| **Pricing** | $16.99–$30 / month | $10 / month | **100% Free Forever (MIT)** |
| **Data Privacy** | Cloud Servers (Stored Remotely) | Cloud Backend | **100% Local Hard Drive (Zero Tracking)** |
| **Call Bot Intrusion** | Bot joins call & interrupts | Needs mic permission | **Silent Process Loopback (No bot needed)** |
| **Background Running** | Web Tab must stay open | Desktop App | **Native Windows Tray Flyout (0 CMD Windows)** |
| **Command Palette** | ❌ None | Limited | **✅ Spotlight `⌘K` Quick Action & Search** |
| **Process Audio Isolation** | ❌ Captures all room noise | ❌ Captures mic | **✅ Isolates specific app (Teams/Chrome/Zoom)** |
| **Anki Deck Export** | ❌ None | ❌ None | **✅ 1-Click `.apkg` Spaced Repetition Decks** |
| **Obsidian Vault Notes** | ❌ None | Manual export | **✅ Direct `.md` with Callouts & Outlines** |
| **Multi-Lecture Stitching**| ❌ No | ❌ No | **✅ Merge Part 1 & Part 2 into Master Guide** |
| **Built-in Audio Player** | Web Only | Limited | **✅ Scrubber + Animated Waveform + Speed** |

---

## 🪟 Native Windows 11 System Tray

Nexus runs completely in the background without leaving open command prompt windows on your screen.

- **Zero Console Clutter**: Launching `Start-Nexus.bat` or `Start-Nexus.vbs` immediately hides terminal windows and sits as a sleek glowing icon in your Windows Taskbar Notification Area.
- **Modern Acrylic Dark Flyout Widget**: Right-clicking or clicking the tray icon pops up a native dark glass card with live status, recording timer, one-click studio launch, and direct shortcuts to your Obsidian & Anki vault folders.

---

## ✨ Key Features

- **🎙️ Process-Specific Audio Hook**: Captures pure digital audio directly from the sound card using Windows WASAPI. Zero microphone background noise, room echoes, or fan hum.
- **🍎 Apple-Grade Glassmorphic UI**: Minimalist, distraction-free study environment built with frosted glass materials, subtle depth lighting, 3D interactive tilt cards, and a custom color-inverting pointer.
- **🔍 Universal Spotlight Command Palette (`⌘K` / `Ctrl+K`)**: Rapidly search through all course lectures and execute commands (record, flashcards, quiz, export) with pure keyboard navigation.
- **⚡ Zero-Latency Streaming AI Study Assistant**: Ask questions directly about the lecture. Answers stream token-by-token in real-time (~150ms latency) powered by Google Gemini 3.6 Flash.
- **🗂️ Automated Anki `.apkg` Generator**: Converts the most testable lecture concepts into spaced-repetition flashcards. Download and double-click to import straight into Anki Desktop or Mobile.
- **📝 Obsidian & Notion Markdown Vault**: Structured course modules, key takeaways, and comprehensive glossaries formatted with clean Markdown for your personal second brain.
- **🪡 Multi-Lecture Stitching**: Select multiple lecture segments or workshops and synthesize them into a unified **Master Study Guide**.
- **🎵 Floating Audio Player**: Re-listen to any recorded lecture with variable speed playback (`1.0x`, `1.25x`, `1.5x`, `2.0x`) and live animated canvas waveforms.
- **📤 Drag-and-Drop Audio Import**: Have a pre-recorded `.wav` or `.mp3` from your phone or classroom recording? Drop it in and Nexus will synthesize it instantly.

---

## 🎙️ Local Transcriber Models & Offline Roadmap

While Nexus currently accelerates synthesis using Google Gemini 3.6 Flash, we are implementing a **Dual Hybrid Engine** to support 100% offline, air-gapped study environments:

| Model | Footprint | CPU Speed | Latency / Windowing | Purpose in Nexus |
| :--- | :--- | :--- | :--- | :--- |
| **Moonshine (Useful Sensors)** | ~245MB (ONNX) | **~5x faster than Whisper** | **Sub-200ms**, dynamic windowing | 🥇 Live real-time audio loopback streaming |
| **Faster-Whisper (`tiny.en`)** | 75MB (CTranslate2 int8) | **~10x real-time on standard CPU** | 30s chunk batch inference | 🥈 Offline post-lecture batch transcription |
| **Ollama / Gemma 2 2B (`Q4_K_M`)** | ~1.8GB RAM | ~35 tokens/sec | Local Air-Gapped LLM | 🥉 100% Offline Flashcard & Summary Synthesis |

---

## 🏗 Architecture & Data Flow

```mermaid
graph TD
    A[Teams / Chrome / Zoom / Spotify] -->|Windows Core Audio Loopback| B[client-audio-hook.exe - C# .NET 8]
    B -->|Named Pipe Float32 Stream| C[tray_app.py - Python System Tray]
    C -->|Stores Audio Locally| D[storage/recordings/*.wav]
    C -->|Hybrid Fast Inference| E[Google Gemini 3.6 Flash / Local Whisper]
    E -->|Structured JSON Output| F[Local Vault Manager]
    F -->|Persists Index| G[storage/sessions.json]
    F -->|Generates Obsidian Note| H[storage/markdown/lecture_*.md]
    F -->|Generates Anki Deck| I[storage/exports/meeting_*.apkg]
    G -->|Local IPC Bridge| J[Next.js 16 Frosted Glass Studio]
    J -->|Spotlight Palette & Streaming AI| K[Cmd+K & Vercel AI SDK]
```

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
Inside `.env.local` and `.env`, paste your free Gemini API key:
```env
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...
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
Run the silent one-click launcher from the project root:
```powershell
.\Start-Nexus.bat
```
*(Runs silently in the system tray, starts the web studio headless, and opens `http://localhost:3000` in your browser)*.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `⌘K` / `Ctrl + K` | Open Spotlight Command Palette |
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

## ⭐ Show Your Support

Give a ⭐️ if this project helped you study better or saved you money on meeting subscriptions!

---

## 📄 License
Distributed under the **MIT License**. See `LICENSE` for more information. Built with ❤️ for students, educators, and continuous learners.
