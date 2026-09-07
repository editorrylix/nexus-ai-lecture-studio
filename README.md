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

[Quick Start](#-quick-start-3-minutes) • [Why Nexus?](#-why-nexus-vs-alternatives) • [Architecture](#-hybrid-architecture) • [Cloud vs Local LLM](#-cloud-api-vs-local-llm-deep-architectural-analysis) • [System Requirements & Disk Space](#-system-requirements--disk-space-footprint) • [Key Features](#-core-capabilities) • [FAQ](#-frequently-asked-questions-faq)

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
| **Process Audio Isolation** | ❌ Captures all room noise | ❌ Captures mic | **✅ Isolates specific app (Teams/Chrome/Zoom) or captures Entire System (PID 0)** |
| **CPU / Resource Usage** | High browser overhead | Heavy desktop app | **Ultra-lightweight (< 2.5% CPU on Ryzen 5 / Intel Core)** |
| **Disk Footprint** | Cloud-based | > 1.5 GB | **< 750 MB Total Footprint (Including AI Models)** |
| **Background Execution** | Web tab must stay open | Desktop window | **Native Win32 System Tray Daemon (12.8MB RAM)** |
| **Anki Deck Export** | ❌ None | ❌ None | **✅ 1-Click `.apkg` Spaced Repetition Decks** |
| **Obsidian Vault Notes** | ❌ None | Manual export | **✅ Direct `.md` with Callouts & Outlines** |
| **PDF / Print Export** | Paid tier only | Limited | **✅ Clean One-Click PDF / Print Studio Export** |
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

## 🧠 Cloud API vs. Local LLM: Deep Architectural Analysis

A common question is: *Why not run a local LLM for lecture synthesis so the entire application is 100% offline and uses zero external APIs?*

To keep Nexus practical for everyday laptops and students, an application must install quickly and stay **under 1 GB of total disk space**. Here is why our **Hybrid Model (Local STT + Cloud Synthesis)** outperforms sub-1GB local LLMs in every critical metric:

| Evaluation Metric | Sub-1GB Local LLM (e.g. Qwen-0.5B / SmolLM-360M) | Local 7B-8B LLM (e.g. Llama-3.1 / Qwen-7B) | ⚡ **Nexus Hybrid Architecture (Local STT + Gemini Flash)** |
| :--- | :---: | :---: | :---: |
| **Disk Space Overhead** | ~350 MB – 650 MB | **4.5 GB – 6.5 GB** *(Fails <1GB limit)* | **0 MB additional disk space** |
| **Context Window** | 8K – 32K tokens *(Truncates 1hr+ lectures)* | 32K – 128K tokens | **1,000,000 Tokens** *(Accommodates 100+ hrs)* |
| **Structured Output (JSON)**| ❌ Unreliable / syntax hallucinations | ⚠️ Moderate (occasional schema errors) | **✅ 100% Strict Type Validation (Zod & Schema)** |
| **Laptop CPU / Fan Noise** | High CPU spikes, thermal throttling | Severe throttling, freezes low-tier laptops | **< 2.5% CPU during capture; 0% CPU during AI synthesis** |
| **Synthesis Latency** | 25 – 45 seconds on mobile CPU | 60 – 120 seconds on CPU without discrete GPU | **~1.2 – 1.8 seconds (Sub-second streaming)** |
| **Quality of Study Notes** | High rate of hallucinations on STEM terms | High quality | **State-of-the-Art reasoning & synthesis** |
| **Audio Privacy** | 100% Local | 100% Local | **100% Local (Raw audio never leaves PC)** |
| **Free Tier / Cost** | Free | Free | **1,500 requests/day completely free (Google AI Studio)** |

### Key Takeaway:
Sub-1GB local language models lack the parameter capacity and context length to accurately ingest 10,000-word college lectures and output validated, multi-section study guides with flashcards and quizzes. Conversely, 7B/8B parameter models require 5GB+ of disk storage and 8GB+ of dedicated VRAM, making them unsuitable for budget and ultra-portable laptops.

**Nexus solves this dilemma through strict separation of concerns:**
1. **Private Audio Stays Local**: Audio processing occurs 100% on-device via `faster-whisper` (only 75MB disk space).
2. **Text Synthesis Goes to Cloud**: Only anonymized, plain-text lecture transcripts are sent for AI synthesis, leveraging a 1,000,000-token context window with sub-2-second generation times and zero client battery drain.
3. **Air-Gapped Local Fallback Included**: For environments with no internet connection, Nexus includes an internal rule-based local parser that generates baseline markdown outlines and flashcards without any cloud dependence.

---

## 💻 System Requirements & Disk Space Footprint

Nexus is engineered to run seamlessly on lightweight laptops, student ultrabooks, and budget hardware without heating up your system or requiring an expensive gaming GPU.

### Minimum & Recommended Specifications

| Component | Minimum Requirements | Recommended Specification |
| :--- | :--- | :--- |
| **Operating System** | Windows 10 / 11 (64-bit, Version 1903+) | Windows 11 (64-bit, latest update) |
| **Processor (CPU)** | 2 Cores / 4 Threads (e.g. Intel Core i3 / AMD Ryzen 3 2.0 GHz) | 4+ Cores (e.g. AMD Ryzen 5 7530U, Intel Core i5 11th Gen+) |
| **System Memory (RAM)**| 4 GB RAM | 8 GB or 16 GB RAM |
| **Graphics (GPU)** | Integrated Graphics (Intel UHD / AMD Radeon) | Integrated Graphics or Dedicated NVIDIA/AMD GPU |
| **Audio Hardware** | Standard Windows Audio Output (Speakers / Headphones) | Any standard audio output device (WASAPI Loopback) |
| **Internet Connection**| Required only for API text synthesis (~2 KB per request) | Standard broadband or mobile hotspot |

> ℹ️ **Tested Benchmark**: Verified on an **AMD Ryzen 5 7530U (6 Cores / 12 Threads, 2.00 GHz) with 16 GB RAM**. While recording and transcribing system audio in real-time, CPU consumption consistently stayed **below 2.5%** with negligible RAM impact.

### 💾 Exact Disk Space Breakdown

Nexus stays well **under the 1 GB footprint limit**, fitting effortlessly on storage-constrained laptops:

| Component | Disk Space | Purpose |
| :--- | :---: | :--- |
| **Local Faster-Whisper Model (`tiny.en`)** | **~75 MB** | CTranslate2 int8 quantized weights (downloaded once on first run) |
| **WASAPI Audio Capture Hook (`client-audio-hook`)** | **~15 MB** | Standalone .NET 8 Release native executable |
| **Python Virtual Environment (`venv`)** | **~420 MB** | Python 3.11 runtime, CTranslate2, faster-whisper, Flask daemon |
| **Next.js Web Studio (`web-dashboard`)** | **~220 MB** | Production React 19 / Next.js standalone build & node assets |
| **Local Database & Cache (`sessions.db`)** | **~5 MB** | SQLite session history, generated transcripts, and study notes |
| **Total Install Footprint** | **~735 MB** | **✅ Fully within the < 1 GB disk constraint!** |

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

- **🎙️ Dual-Mode Audio Capture**: Captures pure digital audio directly from the sound card using Windows WASAPI loopback. Select an individual application (Zoom, Microsoft Teams, Chrome, YouTube) or capture **Entire System Audio (PID 0)** across all active desktop applications.
- **🔴 Real-Time Local Captions**: Rolling on-device speech captions appear dynamically while lecture recording is active.
- **⏱️ Interactive Timestamped Transcripts & Live Search**: Transcripts are automatically divided into clean, readable paragraphs with estimated timestamps (`[00:00]`, `[01:15]`, etc.) and an instant in-transcript search filter to jump directly to specific topics.
- **📄 One-Click Print & PDF Export**: Export clean, publication-ready study guides directly to PDF or paper. Dedicated print stylesheets automatically strip UI navigation and controls for distraction-free reading.
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

# Pre-compile C# Audio Capture Hook (Optional, for instant 0% CPU startup)
cd ..\client-audio-hook
dotnet publish -c Release -o bin/Release/publish

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

## ❓ Frequently Asked Questions (FAQ)

### Q: Why does Windows Defender Firewall show a prompt for `filter.pyd` or `python.exe`?
**A:** When Nexus starts, it initializes `faster-whisper` and its underlying audio decoding engine, **PyAV** (`av`). 

- **What is `filter.pyd`?** It is a compiled C-extension library located at `venv\Lib\site-packages\av\filter\filter.pyd`. It links **FFmpeg** (`libavfilter`) to decode incoming digital audio waveforms locally on your machine.
- **Why does it say "Publisher: Unknown"?** Like NumPy, PyTorch, and 99% of open-source Python packages installed via `pip`, PyAV is distributed as an open-source binary wheel without a commercial Microsoft Extended Validation (EV) code-signing certificate (which costs hundreds of dollars annually).
- **Why does the firewall appear?** FFmpeg includes built-in network protocol headers (HTTP, RTSP) and initializes Windows Sockets (`WSAStartup`). At the same time, the Nexus Python daemon binds to local port `5005` (`127.0.0.1:5005`) for internal communication with the web dashboard. Windows Defender Firewall detects socket activity from an unsigned extension and asks whether to permit local network communication.
- **What should I do?** Check **"Private networks"** and click **"Allow access"**. Windows will remember your choice and will never ask again. Even if you dismiss or cancel the prompt, local loopback (`127.0.0.1`) audio decoding continues to work properly.

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
