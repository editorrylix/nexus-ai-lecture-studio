/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
'use client'

import React, { useEffect, useState, useRef, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { 
  MessageSquare, 
  Layout, 
  FileText, 
  ChevronRight, 
  ChevronLeft, 
  Download, 
  RefreshCw, 
  Search, 
  Trash2, 
  Copy, 
  Check, 
  Sparkles, 
  Layers, 
  BookOpen, 
  CheckCircle2, 
  Circle, 
  HelpCircle, 
  RotateCw, 
  SendHorizontal, 
  FileDown, 
  AlertTriangle, 
  GraduationCap, 
  Clock, 
  CheckCheck,
  Radio,
  Mic,
  Square,
  Volume2,
  Folder,
  Settings,
  Pin,
  Edit2,
  GitMerge,
  ChevronDown,
  Monitor,
  Globe,
  Headphones,
  Music,
  Code,
  UploadCloud,
  Play,
  Pause,
  FastForward,
  HardDrive,
  Cpu
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

// Helper to render recognized app icons
function AppIcon({ appType }: { appType: string }) {
  const type = (appType || '').toLowerCase()
  if (type === 'chrome') return <Globe className="w-4 h-4 text-amber-400" />
  if (type === 'teams') return <Monitor className="w-4 h-4 text-cyan-400" />
  if (type === 'discord') return <Headphones className="w-4 h-4 text-indigo-400" />
  if (type === 'spotify') return <Music className="w-4 h-4 text-emerald-400" />
  if (type === 'ide') return <Code className="w-4 h-4 text-purple-400" />
  return <Volume2 className="w-4 h-4 text-zinc-400" />
}

export default function Dashboard() {
  // Session State
  const [sessions, setSessions] = useState<any[]>([])
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'summary' | 'flashcards' | 'quiz' | 'transcript' | 'chat'>('summary')
  const [mounted, setMounted] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sessionToDelete, setSessionToDelete] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [toastMessage, setToastMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null)
  const [copiedText, setCopiedText] = useState(false)
  const [storageDir, setStorageDir] = useState<string>('')
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('')

  // Renaming State
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [editTitleValue, setEditTitleValue] = useState('')

  // Multi-Session Stitching State
  const [stitchMode, setStitchMode] = useState(false)
  const [selectedForStitch, setSelectedForStitch] = useState<string[]>([])
  const [isStitching, setIsStitching] = useState(false)

  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false)

  // Integrated Audio Studio State
  const [showStudio, setShowStudio] = useState(false)
  const [audioOnline, setAudioOnline] = useState(false)
  const [processes, setProcesses] = useState<any[]>([])
  const [selectedPid, setSelectedPid] = useState<number | null>(null)
  const [selectedAppName, setSelectedAppName] = useState<string>('')
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessingAI, setIsProcessingAI] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [vuLevel, setVuLevel] = useState(0)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([])

  // Audio Upload / Import State
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingAudio, setIsUploadingAudio] = useState(false)

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ type, text })
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Initial Load & Ambient Clock
  useEffect(() => {
    fetchSessions()
    checkAudioStatus()
    const sessionInterval = setInterval(fetchSessions, 6000)
    const audioInterval = setInterval(checkAudioStatus, 1500)
    
    // Live ticking clock inspired by akashawal.com
    const clockInterval = setInterval(() => {
      const now = new Date()
      setCurrentTimeStr(now.toLocaleTimeString([], { hour12: false }))
    }, 1000)

    setMounted(true)
    return () => {
      clearInterval(sessionInterval)
      clearInterval(audioInterval)
      clearInterval(clockInterval)
    }
  }, [])

  // Load Sessions from Local Storage
  const fetchSessions = async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch('/api/sessions', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
        setStorageDir(data.storageDir || '')
        setSelectedSession((prev: any) => {
          if (!prev && data.sessions?.length > 0) return data.sessions[0]
          if (prev) {
            const updated = data.sessions?.find((s: any) => s.id === prev.id)
            if (updated) return updated
          }
          return prev
        })
      }
    } catch (err) {
      console.error("Local session fetch error:", err)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Audio Engine Bridge Status
  const checkAudioStatus = async () => {
    try {
      const res = await fetch('/api/audio?action=status', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setAudioOnline(data.online)
        if (data.online) {
          setIsRecording(data.isRecording)
          setIsProcessingAI(data.isProcessing)
          setRecordingSeconds(data.elapsed || 0)
          setVuLevel(data.vuLevel || 0)
          if (data.lastError) {
            addDiagnostic(`[ERROR] ${data.lastError}`)
          }
        }
      }
    } catch {
      setAudioOnline(false)
    }
  }

  // Scan Audio Processes
  const scanProcesses = async () => {
    try {
      const res = await fetch('/api/audio?action=processes', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (data.processes && data.processes.length > 0) {
          setProcesses(data.processes)
          if (!selectedPid) {
            setSelectedPid(data.processes[0].pid)
            setSelectedAppName(data.processes[0].name)
          }
          showToast(`Discovered ${data.processes.length} active audio processes.`, "info")
          addDiagnostic(`Scanned ${data.processes.length} active audio processes.`)
        } else {
          setProcesses([])
          showToast("No audio currently streaming. Start playing sound in your app first.", "info")
        }
      }
    } catch (err: any) {
      showToast(`Process scan error: ${err.message}`, "error")
    }
  }

  const addDiagnostic = (msg: string) => {
    const time = new Date().toLocaleTimeString()
    setDiagnosticLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 49)])
  }

  // Start In-Browser Recording
  const handleStartRecording = async () => {
    if (!selectedPid) {
      showToast("Please choose an active audio source first.", "error")
      return
    }

    addDiagnostic(`Initiating WASAPI loopback capture for ${selectedAppName} (PID: ${selectedPid})...`)
    try {
      const res = await fetch('/api/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', pid: selectedPid, name: selectedAppName })
      })
      const data = await res.json()
      if (data.success) {
        setIsRecording(true)
        showToast(`Recording ${selectedAppName}`, "success")
        addDiagnostic("Direct loopback stream active via AudioCapturePipe.")
      } else {
        showToast(`Failed: ${data.message || 'Unknown error'}`, "error")
      }
    } catch (err: any) {
      showToast(`Start failed: ${err.message}`, "error")
    }
  }

  // Stop In-Browser Recording
  const handleStopRecording = async () => {
    addDiagnostic("Stopping capture. Triggering Gemini 3.6 Flash synthesis...")
    try {
      const res = await fetch('/api/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      })
      const data = await res.json()
      if (data.success) {
        setIsRecording(false)
        setIsProcessingAI(true)
        showToast("Recording stopped! Gemini is synthesizing notes & flashcards...", "info")
        setTimeout(fetchSessions, 4000)
        setTimeout(fetchSessions, 8000)
      }
    } catch (err: any) {
      showToast(`Stop failed: ${err.message}`, "error")
    }
  }

  // Handle Audio File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingAudio(true)
    showToast(`Uploading ${file.name} for AI synthesis...`, "info")

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/audio/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (data.success && data.session) {
        showToast("Audio processed & synthesized successfully!", "success")
        await fetchSessions()
        setSelectedSession(data.session)
      } else {
        throw new Error(data.error || "Upload processing failed.")
      }
    } catch (err: any) {
      showToast(`Import error: ${err.message}`, "error")
    } finally {
      setIsUploadingAudio(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Delete Local Session
  const confirmDelete = async () => {
    if (!sessionToDelete) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/sessions?id=${sessionToDelete.id}`, { method: 'DELETE' })
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionToDelete.id))
        if (selectedSession?.id === sessionToDelete.id) {
          setSelectedSession(sessions.find(s => s.id !== sessionToDelete.id) || null)
        }
        showToast("Lecture removed from local vault.", "success")
      } else {
        throw new Error("Failed to delete from local disk.")
      }
    } catch (err: any) {
      showToast(err.message, "error")
    } finally {
      setIsDeleting(false)
      setSessionToDelete(null)
    }
  }

  // Rename Local Session
  const saveRename = async (id: string, newTitle?: string) => {
    const titleToSave = newTitle || editTitleValue
    if (!titleToSave.trim()) {
      setEditingTitleId(null)
      return
    }
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename', id, title: titleToSave.trim() })
      })
      if (res.ok) {
        setSessions(prev => prev.map(s => s.id === id ? { ...s, title: titleToSave.trim() } : s))
        if (selectedSession?.id === id) {
          setSelectedSession((prev: any) => ({ ...prev, title: titleToSave.trim() }))
        }
        showToast("Title updated.", "success")
      }
    } catch (err: any) {
      showToast(`Rename failed: ${err.message}`, "error")
    } finally {
      setEditingTitleId(null)
    }
  }

  // Pin Local Session
  const handleTogglePin = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pin', id })
      })
      if (res.ok) {
        fetchSessions()
      }
    } catch (err: any) {
      showToast(`Pin failed: ${err.message}`, "error")
    }
  }

  // Stitch Selected Sessions
  const handleStitchSessions = async () => {
    if (selectedForStitch.length < 2) {
      showToast("Select at least 2 sessions to stitch together.", "error")
      return
    }

    setIsStitching(true)
    showToast("Stitching sessions with Gemini 3.6 Flash...", "info")

    try {
      const res = await fetch('/api/sessions/stitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionIds: selectedForStitch })
      })

      const data = await res.json()
      if (data.success && data.session) {
        showToast("Master Study Guide synthesized successfully!", "success")
        setStitchMode(false)
        setSelectedForStitch([])
        await fetchSessions()
        setSelectedSession(data.session)
      } else {
        throw new Error(data.error || "Stitching failed.")
      }
    } catch (err: any) {
      showToast(err.message, "error")
    } finally {
      setIsStitching(false)
    }
  }

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions
    const q = searchQuery.toLowerCase()
    return sessions.filter(s => 
      s.title?.toLowerCase().includes(q) ||
      s.summary?.toLowerCase().includes(q) || 
      s.raw_transcript?.toLowerCase().includes(q)
    )
  }, [sessions, searchQuery])

  // Total statistics across sessions
  const totalCardsCount = useMemo(() => {
    return sessions.reduce((acc, s) => {
      const data = s.flashcards_json || {}
      return acc + (Array.isArray(data) ? data.length : (data.flashcards?.length || 0))
    }, 0)
  }, [sessions])

  const handleCopySummary = () => {
    if (!selectedSession?.summary) return
    navigator.clipboard.writeText(selectedSession.summary)
    setCopiedText(true)
    showToast("Executive summary copied to clipboard.", "success")
    setTimeout(() => setCopiedText(false), 2000)
  }

  const handleExportMarkdown = () => {
    if (!selectedSession) return
    const data = selectedSession.flashcards_json || {}
    const outline = data.course_outline || []
    const glossary = data.glossary || []
    const actionItems = data.action_items || selectedSession.action_items || []

    let md = `# ${selectedSession.title || 'Lecture Notes'}\n\n*Recorded on ${new Date(selectedSession.created_at).toLocaleString()}*\n\n`
    md += `## Executive Summary\n${selectedSession.summary}\n\n`
    
    if (actionItems.length > 0) {
      md += `## Action Items & Key Takeaways\n`
      actionItems.forEach((item: string) => { md += `- [ ] ${item}\n` })
      md += `\n`
    }

    if (outline.length > 0) {
      md += `## Structured Outline\n`
      outline.forEach((sec: any, idx: number) => {
        md += `### ${idx + 1}. ${sec.title}\n`
        sec.bullet_points?.forEach((pt: string) => { md += `- ${pt}\n` })
        md += `\n`
      })
    }

    if (glossary.length > 0) {
      md += `## Glossary of Terms\n`
      glossary.forEach((g: any) => {
        md += `- **${g.term}**: ${g.definition}\n`
      })
      md += `\n`
    }

    md += `## Full Transcript\n\`\`\`\n${selectedSession.raw_transcript}\n\`\`\`\n`

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${(selectedSession.title || 'lecture').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`
    link.click()
    URL.revokeObjectURL(url)
    showToast("Exported notes as Markdown for Obsidian / Notion.", "success")
  }

  if (!mounted) return null

  return (
    <div className="flex flex-col h-screen w-full bg-[#060709] text-[#F3F4F6] font-sans overflow-hidden selection:bg-cyan-400 selection:text-black">
      
      {/* Hidden File Input for Audio Import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="audio/*" 
        className="hidden" 
      />

      {/* --- TOP AMBIENT LIVE STATUS TICKER (Inspired by akashawal.com) --- */}
      <div className="h-7 w-full border-b border-white/[0.06] bg-[#090B10] px-4 flex items-center justify-between text-[10px] font-mono select-none tracking-wider text-zinc-400 z-30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${audioOnline ? 'bg-cyan-400' : 'bg-red-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${audioOnline ? 'bg-cyan-400' : 'bg-red-500'}`}></span>
            </span>
            <span className="font-bold text-zinc-300">
              {audioOnline ? 'WASAPI LOOPBACK READY' : 'AUDIO ENGINE OFFLINE'}
            </span>
          </div>

          <span className="text-zinc-700">|</span>
          <span className="hidden sm:inline text-zinc-500">ACCELERATION: <strong className="text-cyan-400 font-semibold">GEMINI 3.6 FLASH</strong></span>
          <span className="text-zinc-700 hidden sm:inline">|</span>
          <span className="hidden md:inline text-zinc-500">VAULT: <strong className="text-emerald-400 font-semibold">100% LOCAL DISK</strong></span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 text-zinc-500">
            <span>VAULT REPO:</span>
            <span className="text-zinc-300 font-mono bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.05]">
              {sessions.length} LECTURES • {totalCardsCount} FLASHCARDS
            </span>
          </div>
          <span className="text-zinc-700 hidden lg:inline">|</span>
          <div className="text-zinc-400 font-mono flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 text-cyan-400" />
            <span>{currentTimeStr || '--:--:--'}</span>
          </div>
        </div>
      </div>

      {/* --- TOAST NOTIFICATION --- */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-10 right-6 z-50 px-4 py-2.5 rounded-2xl text-xs font-semibold shadow-2xl backdrop-blur-2xl border flex items-center gap-2.5 ${
              toastMessage.type === 'error' 
                ? 'bg-red-950/90 border-red-500/40 text-red-200' 
                : toastMessage.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                : 'bg-[#0F131C]/95 border-cyan-500/30 text-cyan-200'
            }`}
          >
            {toastMessage.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-400" />}
            {toastMessage.type === 'success' && <Check className="w-4 h-4 text-emerald-400" />}
            {toastMessage.type === 'info' && <Sparkles className="w-4 h-4 text-cyan-400" />}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 overflow-hidden">
        
        {/* --- PROFESSIONAL SIDEBAR WITH CUSTOM BRAND LOGO --- */}
        <aside className="w-88 flex-shrink-0 bg-[#090B10]/95 backdrop-blur-3xl border-r border-white/[0.07] flex flex-col z-20">
          
          {/* Custom Brand Logo Header */}
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Custom Vector Brand Logo */}
              <div className="relative group">
                <div className="w-9 h-9 rounded-xl overflow-hidden p-[1px] bg-gradient-to-tr from-cyan-400 via-sky-500 to-indigo-500 shadow-[0_0_15px_rgba(34,211,238,0.25)] flex items-center justify-center">
                  <div className="w-full h-full bg-[#090B10] rounded-[11px] flex items-center justify-center p-1">
                    <Image src="/nexus-logo.svg" alt="Nexus Logo" width={28} height={28} priority />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base tracking-wider text-white font-mono">NEXUS</span>
                  <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-cyan-400 text-black font-mono">STUDIO</span>
                </div>
                <p className="text-[10px] text-zinc-500 tracking-wider font-mono uppercase mt-0.5">Local Lecture Vault</p>
              </div>
            </div>

            {/* Header Utilities */}
            <div className="flex items-center gap-1">
              <button 
                onClick={() => {
                  setStitchMode(!stitchMode)
                  setSelectedForStitch([])
                }}
                title="Stitch / Merge multiple sessions"
                className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                  stitchMode ? 'bg-cyan-400 text-black font-bold shadow-md shadow-cyan-400/20' : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <GitMerge className="w-4 h-4" />
              </button>

              <button 
                onClick={fetchSessions}
                title="Refresh local storage"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] active:scale-95 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Interactive Campus Sticker Badge (Inspired by Akash's playful stickers) */}
          <div className="px-4 pt-3 pb-1">
            <div className="flex items-center justify-between">
              <div 
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold text-black bg-amber-300 shadow-sm select-none cursor-default font-mono tracking-wide"
                style={{ transform: 'rotate(-2deg)' }}
              >
                <span>⚡ ZERO CLOUD SUBSCRIPTION</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">v2.4 PRO</span>
            </div>
          </div>

          {/* Stitch Mode Alert Pill */}
          {stitchMode && (
            <div className="px-3.5 pt-2.5 pb-1">
              <div className="bg-indigo-950/40 border border-indigo-500/40 rounded-xl p-2.5 text-xs text-indigo-300 flex items-center justify-between">
                <span>Select sessions to stitch ({selectedForStitch.length} selected)</span>
                <button 
                  onClick={() => setStitchMode(false)}
                  className="text-indigo-400 hover:text-white text-[11px] font-semibold"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Search Box */}
          <div className="px-3.5 pt-3 pb-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search lectures, topics, concepts..."
                className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-400/50 focus:bg-white/[0.07] transition-all font-sans"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
            {filteredSessions.map((s) => {
              const isSelected = selectedSession?.id === s.id
              const isCheckedForStitch = selectedForStitch.includes(s.id)
              const dateStr = new Date(s.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })
              const timeStr = new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              const data = s.flashcards_json || {}
              const flashcardCount = Array.isArray(data) ? data.length : (data.flashcards?.length || 0)
              const displayTitle = s.title || (s.summary ? s.summary.substring(0, 40) : 'Untitled Lecture')

              return (
                <div 
                  key={s.id}
                  onClick={() => {
                    if (stitchMode) {
                      setSelectedForStitch(prev => 
                        prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]
                      )
                    } else {
                      setSelectedSession(s)
                    }
                  }}
                  className={`group relative p-3 rounded-xl cursor-pointer transition-all duration-150 border active:scale-[0.99] ${
                    isSelected && !stitchMode
                      ? 'bg-cyan-500/[0.08] border-cyan-400/30 shadow-[0_2px_14px_rgba(34,211,238,0.12)]' 
                      : isCheckedForStitch
                      ? 'bg-indigo-600/[0.15] border-indigo-500/40'
                      : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.05] hover:border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      {stitchMode && (
                        <input 
                          type="checkbox"
                          checked={isCheckedForStitch}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 rounded border-white/20 text-cyan-400 focus:ring-0 mr-1"
                        />
                      )}
                      {s.pinned && <Pin className="w-3 h-3 text-amber-400 rotate-45" />}
                      <span className={isSelected ? 'text-cyan-300 font-semibold' : 'text-zinc-200'}>{dateStr}</span>
                      <span className="text-zinc-600 text-[10px]">•</span>
                      <span className="text-zinc-500 text-[11px] font-mono">{timeStr}</span>
                    </div>

                    {!stitchMode && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => handleTogglePin(e, s.id)}
                          title={s.pinned ? "Unpin" : "Pin to top"}
                          className="p-1 text-zinc-500 hover:text-amber-400 hover:bg-white/[0.06] rounded-md transition-all"
                        >
                          <Pin className={`w-3 h-3 ${s.pinned ? 'text-amber-400' : ''}`} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            setSessionToDelete(s)
                          }}
                          title="Delete session"
                          className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title (Inline Rename Support) */}
                  {editingTitleId === s.id ? (
                    <div className="my-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="text"
                        value={editTitleValue}
                        onChange={(e) => setEditTitleValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRename(s.id)
                          if (e.key === 'Escape') setEditingTitleId(null)
                        }}
                        autoFocus
                        className="flex-1 bg-white/[0.08] border border-cyan-400 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
                      />
                      <button onClick={() => saveRename(s.id)} className="p-1 text-cyan-400 hover:text-cyan-300">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <h4 
                      onDoubleClick={(e) => {
                        e.stopPropagation()
                        setEditingTitleId(s.id)
                        setEditTitleValue(s.title || displayTitle)
                      }}
                      className="text-xs font-semibold text-zinc-200 line-clamp-1 leading-snug tracking-tight"
                    >
                      {displayTitle}
                    </h4>
                  )}

                  <p className="text-[11px] text-zinc-400 line-clamp-1 leading-relaxed mt-1">
                    {s.summary || 'No summary generated.'}
                  </p>

                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    {flashcardCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.04] text-zinc-400 border border-white/[0.05] flex items-center gap-1 font-mono">
                        <Layers className="w-2.5 h-2.5 text-cyan-400" />
                        {flashcardCount} cards
                      </span>
                    )}
                    {s.audio_path && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono flex items-center gap-1">
                        <Volume2 className="w-2.5 h-2.5" /> Audio Ready
                      </span>
                    )}
                    {s.tags?.includes("Stitched Master Guide") && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                        Master Guide
                      </span>
                    )}
                  </div>
                </div>
              )
            })}

            {filteredSessions.length === 0 && (
              <div className="text-center py-12 px-4 text-zinc-600">
                <div className="w-10 h-10 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mx-auto mb-3">
                  <Radio className="w-5 h-5 text-zinc-600" />
                </div>
                <p className="text-xs font-medium text-zinc-400">No sessions recorded yet</p>
                <p className="text-[11px] text-zinc-600 mt-1">Click "Record Lecture" at the top or import an audio file.</p>
              </div>
            )}
          </div>

          {/* Floating Stitch Action Button */}
          {stitchMode && selectedForStitch.length >= 2 && (
            <div className="p-3 bg-indigo-950/70 border-t border-indigo-500/30">
              <button
                onClick={handleStitchSessions}
                disabled={isStitching}
                className="w-full py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-black rounded-xl text-xs font-bold shadow-lg shadow-cyan-400/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isStitching ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                    <span>Synthesizing Master Guide...</span>
                  </>
                ) : (
                  <>
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>Stitch {selectedForStitch.length} Lectures</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Sidebar Footer with Storage & Import */}
          <div className="p-3 border-t border-white/[0.06] bg-[#07080C]/80 flex items-center justify-between text-[11px] text-zinc-500">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAudio}
                title="Import .wav or .mp3 audio file"
                className="flex items-center gap-1.5 text-zinc-400 hover:text-cyan-300 transition-colors"
              >
                <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isUploadingAudio ? 'Synthesizing...' : 'Import Audio'}</span>
              </button>
            </div>

            <button 
              onClick={() => setShowSettings(true)}
              title="Storage & Engine Settings"
              className="p-1 hover:text-white hover:bg-white/[0.06] rounded-md transition-all flex items-center gap-1"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>
        </aside>

        {/* --- MAIN CONTENT CANVAS --- */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#060709] relative">
          
          {/* --- HIGH-ENERGY MODERN HEADBAR (Inspired by akashawal.com) --- */}
          <div className="border-b border-white/[0.07] bg-[#090B10]/95 backdrop-blur-2xl px-8 py-3.5 flex items-center justify-between z-20">
            
            {/* Left Controls: Record Studio Pill & Import */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  setShowStudio(!showStudio)
                  if (!showStudio) scanProcesses()
                }}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold tracking-wide transition-all active:scale-[0.96] shadow-sm ${
                  isRecording 
                    ? 'bg-red-500/10 border-red-500/40 text-red-300 animate-pulse' 
                    : showStudio
                    ? 'bg-cyan-400 text-black border-cyan-400 shadow-md shadow-cyan-400/20'
                    : 'bg-cyan-400 hover:bg-cyan-300 text-black border-cyan-400 shadow-md shadow-cyan-400/15'
                }`}
              >
                {isRecording ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
                    <span>RECORDING ({Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')})</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-current" />
                    <span>{showStudio ? "CLOSE STUDIO" : "RECORD LECTURE"}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${showStudio ? 'rotate-180' : ''}`} />
                  </>
                )}
              </button>

              {/* Real-time live audio activity waveform indicator */}
              {isRecording && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-white/[0.04] border border-white/[0.08] rounded-full">
                  <div className="flex items-center gap-0.5 h-3">
                    {[0.3, 0.7, 1.0, 0.5, 0.8, 0.4].map((scale, i) => (
                      <motion.div
                        key={i}
                        className="w-0.5 bg-cyan-400 rounded-full"
                        animate={{ height: `${Math.max(3, vuLevel * 12 * scale)}px` }}
                        transition={{ duration: 0.1 }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-zinc-300 font-mono ml-1">{selectedAppName}</span>
                </div>
              )}

              {isProcessingAI && (
                <div className="flex items-center gap-2 px-3.5 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-xs text-cyan-300 font-medium">
                  <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                  <span>Synthesizing with Gemini 3.6 Flash...</span>
                </div>
              )}
            </div>

            {/* Middle: Segmented Navigation Control */}
            {selectedSession && (
              <div className="flex p-1 bg-white/[0.03] border border-white/[0.08] rounded-2xl relative shadow-inner">
                {[
                  { id: 'summary', icon: Layout, label: 'Summary' },
                  { id: 'flashcards', icon: Layers, label: 'Flashcards' },
                  { id: 'quiz', icon: GraduationCap, label: 'Quiz' },
                  { id: 'transcript', icon: FileText, label: 'Transcript' },
                  { id: 'chat', icon: MessageSquare, label: 'Study AI' }
                ].map((tab) => {
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`relative flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-xl transition-colors z-10 ${
                        isActive ? 'text-black font-bold' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {isActive && (
                        <motion.div 
                          layoutId="activeTabPill"
                          className="absolute inset-0 bg-cyan-400 rounded-xl shadow-md shadow-cyan-400/20"
                          transition={{ type: "spring", stiffness: 420, damping: 32 }}
                        />
                      )}
                      <tab.icon className="w-3.5 h-3.5 relative z-10" />
                      <span className="relative z-10">{tab.label}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Right: Export Utilities */}
            {selectedSession && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleExportMarkdown}
                  title="Export notes as Markdown (.md) for Obsidian / Notion"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-zinc-200 transition-all active:scale-95"
                >
                  <FileDown className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Markdown</span>
                </button>

                <button 
                  onClick={handleCopySummary}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-zinc-200 transition-all active:scale-95"
                >
                  {copiedText ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                  <span>{copiedText ? 'Copied' : 'Copy'}</span>
                </button>

                {selectedSession.flashcards_json?.anki_url && (
                  <a 
                    href={selectedSession.flashcards_json.anki_url} 
                    download
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-500/25 active:scale-95 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Anki</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* --- IN-BROWSER AUDIO RECORDING STUDIO DRAWER --- */}
          <AnimatePresence>
            {showStudio && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b border-white/[0.08] bg-[#0A0D14]/95 backdrop-blur-3xl z-10"
              >
                <div className="max-w-4xl mx-auto px-8 py-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-sm font-bold text-white tracking-tight font-mono">WASAPI AUDIO HOOK</h3>
                      <span className="text-[10px] text-zinc-500 font-mono bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                        Direct Process Capture
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={scanProcesses}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 font-mono"
                      >
                        <RefreshCw className="w-3 h-3" /> Rescan Apps
                      </button>
                      <button 
                        onClick={() => setShowDiagnostics(!showDiagnostics)}
                        className="text-xs text-zinc-500 hover:text-zinc-300 font-mono"
                      >
                        {showDiagnostics ? "Hide Diagnostics" : "Show Diagnostics"}
                      </button>
                    </div>
                  </div>

                  {/* Audio App Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
                    {processes.map((p) => {
                      const isSelected = selectedPid === p.pid
                      return (
                        <div
                          key={p.pid}
                          onClick={() => {
                            if (!isRecording) {
                              setSelectedPid(p.pid)
                              setSelectedAppName(p.name)
                            }
                          }}
                          className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-cyan-500/[0.12] border-cyan-400/50 shadow-md shadow-cyan-400/10' 
                              : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
                          } ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                            <AppIcon appType={p.appType} />
                          </div>
                          <div className="overflow-hidden">
                            <div className="text-xs font-bold text-white truncate">{p.name}</div>
                            <div className="text-[10px] text-zinc-500 font-mono truncate">PID: {p.pid}</div>
                          </div>
                        </div>
                      )
                    })}

                    {processes.length === 0 && (
                      <div className="col-span-3 text-center py-6 bg-white/[0.01] border border-dashed border-white/[0.08] rounded-2xl text-zinc-500 text-xs font-mono">
                        No active audio streams detected. Play sound in Teams, Chrome, Zoom, or YouTube, then click "Rescan Apps".
                      </div>
                    )}
                  </div>

                  {/* Recording Controls Bar */}
                  <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
                    <div className="flex items-center gap-4">
                      {/* Live VU Amplitude Progress Bar */}
                      <div className="w-40 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-cyan-400 transition-all duration-100 rounded-full"
                          style={{ width: `${Math.min(100, vuLevel * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-400 font-mono">
                        {isRecording ? `REC: ${Math.floor(recordingSeconds / 60)}:${(recordingSeconds % 60).toString().padStart(2, '0')}` : 'Ready to capture'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {!isRecording ? (
                        <button
                          onClick={handleStartRecording}
                          disabled={!selectedPid}
                          className="px-5 py-2 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed text-black rounded-xl text-xs font-extrabold tracking-wide shadow-lg shadow-cyan-400/20 active:scale-95 transition-all flex items-center gap-2"
                        >
                          <Mic className="w-3.5 h-3.5 text-black" />
                          <span>START RECORDING</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleStopRecording}
                          className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold tracking-wide shadow-lg shadow-red-600/25 active:scale-95 transition-all flex items-center gap-2"
                        >
                          <Square className="w-3.5 h-3.5" />
                          <span>STOP & SYNTHESIZE</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Collapsible Diagnostics Console */}
                  {showDiagnostics && (
                    <div className="mt-4 p-3 bg-black/60 border border-white/[0.06] rounded-xl font-mono text-[11px] text-zinc-400 max-h-32 overflow-y-auto space-y-1">
                      {diagnosticLogs.map((log, i) => (
                        <div key={i}>{log}</div>
                      ))}
                      {diagnosticLogs.length === 0 && <div>[INFO] No diagnostic events logged yet.</div>}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* --- TAB CONTENT AREA --- */}
          <div className="flex-1 overflow-y-auto px-10 py-8">
            {selectedSession ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab + selectedSession.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="h-full"
                >
                  {activeTab === 'summary' && (
                    <SummaryTab 
                      session={selectedSession} 
                      onRename={(newTitle: string) => saveRename(selectedSession.id, newTitle)}
                      editTitleValue={editTitleValue}
                      setEditTitleValue={setEditTitleValue}
                      editingTitleId={editingTitleId}
                      setEditingTitleId={setEditingTitleId}
                    />
                  )}
                  {activeTab === 'flashcards' && <FlashcardsTab session={selectedSession} />}
                  {activeTab === 'quiz' && <QuizTab session={selectedSession} />}
                  {activeTab === 'transcript' && <TranscriptTab session={selectedSession} showToast={showToast} />}
                  {activeTab === 'chat' && <ChatTab session={selectedSession} showToast={showToast} />}
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center mt-20">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] flex items-center justify-center mb-5 shadow-2xl p-4">
                  <Image src="/nexus-logo.svg" alt="Nexus" width={48} height={48} />
                </div>
                <h3 className="text-lg font-bold text-white font-mono">No Lecture Selected</h3>
                <p className="text-xs text-zinc-400 max-w-sm mt-2 leading-relaxed">
                  Click <strong className="text-cyan-400">"RECORD LECTURE"</strong> at the top to record live sound from Teams, Chrome, or Zoom, or select an existing lecture from the sidebar.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* --- SETTINGS MODAL --- */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              className="relative w-full max-w-md bg-[#0D1017] border border-white/[0.1] rounded-3xl p-6 shadow-2xl z-10 font-sans"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white font-mono">LOCAL STORAGE VAULT</h3>
                </div>
                <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white">
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs text-zinc-300">
                <div>
                  <label className="text-zinc-400 block mb-1 font-mono text-[11px]">Active Storage Directory:</label>
                  <div className="p-2.5 bg-black/60 border border-white/[0.08] rounded-xl font-mono text-[11px] text-zinc-300 break-all select-all">
                    {storageDir || 'd:\\Projects\\transcribe-edtech\\storage'}
                  </div>
                </div>

                <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-1.5 text-zinc-400 text-[11px]">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-cyan-400" />
                    <span>100% Offline & Local-First (No Supabase required)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-cyan-400" />
                    <span>All Markdown notes formatted for Obsidian & Notion</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Automated Anki .apkg spaced repetition exports</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/[0.06] flex justify-end">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-black font-bold rounded-xl text-xs"
                >
                  Close Settings
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- APPLE FROSTED DELETE CONFIRMATION MODAL --- */}
      <AnimatePresence>
        {sessionToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setSessionToDelete(null)}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              className="relative w-full max-w-md bg-[#0F121A] border border-white/[0.1] rounded-3xl p-6 shadow-2xl z-10"
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Delete Lecture Notes?</h3>
                  <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                    This action is permanent. All transcripts, study summaries, and flashcards for this lecture will be removed from your local vault.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-white/[0.06]">
                <button
                  onClick={() => setSessionToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 active:scale-95 text-white transition-all shadow-lg shadow-red-600/20 flex items-center gap-1.5"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete Permanently</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ==========================================
// EMBEDDED MINI AUDIO PLAYER COMPONENT
// ==========================================
function MiniAudioPlayer({ session }: { session: any }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1.0)

  const audioSrc = `/api/audio/stream?sessionId=${session.id}`

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const cycleRate = () => {
    if (!audioRef.current) return
    const rates = [1.0, 1.25, 1.5, 2.0]
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length
    const nextRate = rates[nextIdx]
    audioRef.current.playbackRate = nextRate
    setPlaybackRate(nextRate)
  }

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${mins}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="p-3.5 bg-[#0C0F17] border border-cyan-500/25 rounded-2xl flex items-center justify-between gap-4 shadow-lg shadow-cyan-950/20">
      <audio 
        ref={audioRef}
        src={audioSrc}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="flex items-center gap-3">
        <button 
          onClick={togglePlay}
          className="w-8 h-8 rounded-full bg-cyan-400 hover:bg-cyan-300 text-black flex items-center justify-center font-bold shadow-md shadow-cyan-400/20 active:scale-95 transition-all"
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        <div className="text-xs">
          <div className="font-semibold text-white flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Lecture Audio Recording</span>
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">
            {formatTime(currentTime)} / {formatTime(duration || 0)}
          </div>
        </div>
      </div>

      {/* Scrub Bar */}
      <div className="flex-1 max-w-xs flex items-center gap-2">
        <input 
          type="range" 
          min={0} 
          max={duration || 100} 
          value={currentTime} 
          onChange={(e) => {
            const time = Number(e.target.value)
            setCurrentTime(time)
            if (audioRef.current) audioRef.current.currentTime = time
          }}
          className="w-full h-1 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />
      </div>

      {/* Speed Multiplier Pill */}
      <button 
        onClick={cycleRate}
        className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] text-[11px] font-mono font-bold text-cyan-300 border border-white/[0.08] active:scale-95 transition-all"
      >
        {playbackRate}x
      </button>
    </div>
  )
}

// ==========================================
// TAB 1: EXECUTIVE SUMMARY & OUTLINE
// ==========================================
function SummaryTab({ 
  session, 
  onRename, 
  editTitleValue, 
  setEditTitleValue, 
  editingTitleId, 
  setEditingTitleId 
}: any) {
  const data = session.flashcards_json || {}
  const outline = data.course_outline || []
  const glossary = data.glossary || []
  const actionItems = data.action_items || session.action_items || []

  const [completedItems, setCompletedItems] = useState<Record<number, boolean>>({})

  const toggleItem = (idx: number) => {
    setCompletedItems(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  const isEditing = editingTitleId === session.id

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      
      {/* Session Header Card with Rename Support */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
        <div className="flex-1 mr-4">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input 
                type="text"
                value={editTitleValue}
                onChange={(e) => setEditTitleValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onRename(editTitleValue)
                  if (e.key === 'Escape') setEditingTitleId(null)
                }}
                autoFocus
                className="text-2xl font-bold bg-white/[0.08] border border-cyan-400 rounded-xl px-3 py-1 text-white focus:outline-none w-full font-mono"
              />
              <button 
                onClick={() => onRename(editTitleValue)}
                className="px-3 py-1 bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold rounded-xl"
              >
                Save
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => {
              setEditingTitleId(session.id)
              setEditTitleValue(session.title || 'Untitled Lecture')
            }}>
              <h1 className="text-2xl font-bold tracking-tight text-white hover:text-cyan-300 transition-colors">
                {session.title || 'Untitled Lecture'}
              </h1>
              <Edit2 className="w-4 h-4 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}

          <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2 font-mono">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Recorded {new Date(session.created_at).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-cyan-400/10 text-cyan-400 border border-cyan-400/25 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Gemini 3.6 Flash
          </span>
        </div>
      </div>

      {/* Mini Audio Player (if audio recording exists) */}
      <MiniAudioPlayer session={session} />

      {/* 1. Executive Summary */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-white tracking-wide font-mono">
          <BookOpen className="w-4 h-4 text-cyan-400" />
          <span>EXECUTIVE SUMMARY</span>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.07] rounded-3xl p-6 shadow-sm shadow-black/30 text-sm leading-relaxed text-zinc-300 prose prose-invert max-w-none prose-p:my-2 prose-headings:text-white prose-headings:font-mono">
          <ReactMarkdown>{session.summary || 'No summary available.'}</ReactMarkdown>
        </div>
      </section>

      {/* 2. Action Items & Takeaways */}
      {actionItems.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-white tracking-wide font-mono">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>KEY TAKEAWAYS & ACTION ITEMS</span>
            </div>
            <span className="text-[11px] text-zinc-500 font-mono">Click item to check off</span>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.07] rounded-3xl p-5 space-y-2 shadow-sm">
            {actionItems.map((item: string, i: number) => {
              const isChecked = !!completedItems[i]
              return (
                <div 
                  key={i}
                  onClick={() => toggleItem(i)}
                  className={`flex items-start gap-3 p-2.5 rounded-2xl cursor-pointer transition-all ${
                    isChecked ? 'bg-white/[0.01] opacity-50' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <button className="mt-0.5 text-zinc-500 hover:text-cyan-400 transition-colors">
                    {isChecked ? (
                      <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-zinc-500" />
                    )}
                  </button>
                  <span className={`text-xs leading-relaxed ${isChecked ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                    {item}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 3. Structured Course Outline */}
      {outline.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white tracking-wide font-mono">
            <Layout className="w-4 h-4 text-emerald-400" />
            <span>STRUCTURED COURSE MODULES</span>
          </div>
          <div className="grid gap-3.5">
            {outline.map((section: any, i: number) => (
              <div 
                key={i} 
                className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-5 shadow-sm hover:border-cyan-500/20 transition-all"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="font-mono text-[10px] font-bold text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 rounded-md">
                    MODULE {String(i + 1).padStart(2, '0')}
                  </span>
                  <h4 className="text-sm font-bold text-white tracking-tight">{section.title}</h4>
                </div>
                <ul className="space-y-1.5 pl-2">
                  {section.bullet_points?.map((pt: string, j: number) => (
                    <li key={j} className="flex items-start gap-2.5 text-xs text-zinc-300 leading-relaxed">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Glossary of Terms */}
      {glossary.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white tracking-wide font-mono">
            <HelpCircle className="w-4 h-4 text-purple-400" />
            <span>KEY TERMINOLOGY & GLOSSARY</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {glossary.map((g: any, i: number) => (
              <div 
                key={i} 
                className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-4 hover:border-purple-500/30 transition-all"
              >
                <div className="font-bold text-xs text-purple-300 font-mono mb-1">{g.term}</div>
                <p className="text-xs text-zinc-400 leading-relaxed">{g.definition}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ==========================================
// TAB 2: INTERACTIVE 3D FLASHCARDS
// ==========================================
function FlashcardsTab({ session }: { session: any }) {
  const data = session.flashcards_json || {}
  const cards = Array.isArray(data) ? data : (data.flashcards || [])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [masteredCards, setMasteredCards] = useState<Record<number, boolean>>({})

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        setIsFlipped(f => !f)
      } else if (e.key === 'ArrowRight') {
        nextCard()
      } else if (e.key === 'ArrowLeft') {
        prevCard()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cards.length])

  if (!cards || cards.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <Layers className="w-12 h-12 text-zinc-600 mb-3" />
        <h3 className="text-sm font-semibold text-zinc-300">No Flashcards Available</h3>
      </div>
    )
  }

  const nextCard = () => {
    setIsFlipped(false)
    setTimeout(() => setCurrentIndex(i => (i + 1) % cards.length), 160)
  }

  const prevCard = () => {
    setIsFlipped(false)
    setTimeout(() => setCurrentIndex(i => (i - 1 + cards.length) % cards.length), 160)
  }

  const markMastered = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMasteredCards(prev => ({ ...prev, [currentIndex]: !prev[currentIndex] }))
  }

  const currentCard = cards[currentIndex]
  const isMastered = !!masteredCards[currentIndex]
  const progressPercent = ((currentIndex + 1) / cards.length) * 100

  return (
    <div className="max-w-xl mx-auto flex flex-col items-center pt-6 pb-12 select-none font-sans">
      
      {/* Top Header & Progress */}
      <div className="w-full mb-6">
        <div className="flex items-center justify-between text-xs font-mono font-bold text-zinc-400 mb-2">
          <span>CARD {currentIndex + 1} OF {cards.length}</span>
          <span className="text-[11px] text-zinc-500 font-sans">Space to flip • Arrow keys to navigate</span>
        </div>
        <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ ease: "easeOut", duration: 0.3 }}
          />
        </div>
      </div>

      {/* 3D Flip Card Container */}
      <div 
        className="w-full aspect-[16/10] cursor-pointer [perspective:1200px] mb-8"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <motion.div
          className="w-full h-full relative [transform-style:preserve-3d]"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 260, damping: 24 }}
        >
          {/* FRONT: QUESTION */}
          <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] bg-gradient-to-b from-[#11141C] to-[#0A0D14] border border-white/[0.1] rounded-3xl p-8 flex flex-col justify-between shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono font-extrabold tracking-widest px-2.5 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400 border border-cyan-400/25">
                Question
              </span>
              <button 
                onClick={markMastered}
                className={`text-[11px] font-mono flex items-center gap-1 px-2.5 py-0.5 rounded-full border transition-all ${
                  isMastered ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'text-zinc-500 border-white/[0.06] hover:text-zinc-300'
                }`}
              >
                <CheckCheck className="w-3 h-3" />
                <span>{isMastered ? 'Mastered' : 'Mark Learned'}</span>
              </button>
            </div>
            
            <div className="my-auto text-center px-4">
              <h3 className="text-xl font-semibold tracking-tight text-white leading-snug">
                {currentCard.front}
              </h3>
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
              <span>Card {currentIndex + 1} / {cards.length}</span>
              <span className="flex items-center gap-1 text-zinc-400">
                <RotateCw className="w-3 h-3" /> Tap to flip
              </span>
            </div>
          </div>

          {/* BACK: ANSWER */}
          <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-gradient-to-b from-[#0F1626] to-[#080D18] border border-cyan-400/35 rounded-3xl p-8 flex flex-col justify-between shadow-2xl shadow-cyan-950/25">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono font-extrabold tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Model Answer
              </span>
              <span className="text-[11px] text-zinc-500 flex items-center gap-1 font-mono">
                <RotateCw className="w-3 h-3" /> Tap to flip
              </span>
            </div>

            <div className="my-auto text-center px-4">
              <p className="text-base text-zinc-200 leading-relaxed font-normal">
                {currentCard.back}
              </p>
            </div>

            <div className="text-center text-[11px] text-zinc-500 font-mono">
              Recall Verification
            </div>
          </div>
        </motion.div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-4">
        <button 
          onClick={prevCard}
          className="w-11 h-11 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/[0.08] flex items-center justify-center text-zinc-300 transition-all shadow-md"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button 
          onClick={() => setIsFlipped(!isFlipped)}
          className="px-6 py-2.5 rounded-2xl bg-cyan-400 hover:bg-cyan-300 active:scale-95 text-xs font-bold text-black transition-all shadow-md shadow-cyan-400/20 font-mono"
        >
          FLIP CARD
        </button>

        <button 
          onClick={nextCard}
          className="w-11 h-11 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/[0.08] flex items-center justify-center text-zinc-300 transition-all shadow-md"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

// ==========================================
// TAB 3: PRACTICE QUIZ
// ==========================================
function QuizTab({ session }: { session: any }) {
  const data = session.flashcards_json || {}
  const cards = Array.isArray(data) ? data : (data.flashcards || [])
  const [revealed, setRevealed] = useState<Record<number, boolean>>({})

  if (!cards || cards.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <GraduationCap className="w-12 h-12 text-zinc-600 mb-3" />
        <h3 className="text-sm font-semibold text-zinc-300">No Quiz Items Available</h3>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <div className="border-b border-white/[0.06] pb-4">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2 font-mono">
          <GraduationCap className="w-5 h-5 text-cyan-400" />
          LECTURE MASTERY QUIZ
        </h2>
        <p className="text-xs text-zinc-400 mt-1">Test your recall of key concepts from this session.</p>
      </div>

      <div className="space-y-4">
        {cards.map((card: any, idx: number) => {
          const isAnswerShown = !!revealed[idx]
          return (
            <div key={idx} className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-6 transition-all hover:border-cyan-500/30">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="font-mono text-[10px] uppercase font-bold text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 rounded">
                    QUESTION {idx + 1}
                  </span>
                  <h4 className="text-sm font-semibold text-white mt-2 leading-relaxed">{card.front}</h4>
                </div>

                <button
                  onClick={() => setRevealed(prev => ({ ...prev, [idx]: !prev[idx] }))}
                  className="flex-shrink-0 px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-xs font-bold text-zinc-200 border border-white/[0.08] transition-all font-mono active:scale-95"
                >
                  {isAnswerShown ? 'Hide Answer' : 'Reveal Answer'}
                </button>
              </div>

              {isAnswerShown && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 pt-4 border-t border-white/[0.06] text-xs leading-relaxed text-emerald-300 bg-emerald-950/20 rounded-2xl p-4 border border-emerald-500/20"
                >
                  <span className="font-bold text-[10px] uppercase block mb-1 text-emerald-400 font-mono">Model Solution:</span>
                  {card.back}
                </motion.div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ==========================================
// TAB 4: TRANSCRIPT VIEW
// ==========================================
function TranscriptTab({ session, showToast }: { session: any, showToast: any }) {
  const text = session.raw_transcript || ''
  const wordCount = useMemo(() => text.split(/\s+/).filter(Boolean).length, [text])
  const [filterQuery, setFilterQuery] = useState('')

  const copyTranscript = () => {
    navigator.clipboard.writeText(text)
    showToast("Full transcript copied to clipboard.", "success")
  }

  const downloadText = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `transcript_${new Date(session.created_at).toISOString().slice(0, 10)}.txt`
    link.click()
    URL.revokeObjectURL(url)
    showToast("Transcript downloaded as text file.", "success")
  }

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col pb-12">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="font-mono bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
            {wordCount} words
          </span>
          <span>•</span>
          <span className="font-mono">~{Math.ceil(wordCount / 150)} min speaking time</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={downloadText}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-zinc-200 active:scale-95 transition-all"
          >
            <FileDown className="w-3.5 h-3.5 text-zinc-400" />
            <span>Download .txt</span>
          </button>
          <button
            onClick={copyTranscript}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-zinc-200 active:scale-95 transition-all"
          >
            <Copy className="w-3.5 h-3.5 text-cyan-400" />
            <span>Copy All</span>
          </button>
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/[0.07] rounded-3xl p-7 flex-1 overflow-y-auto leading-relaxed font-sans text-sm text-zinc-300 whitespace-pre-wrap select-text">
        {text || 'No transcript text available for this session.'}
      </div>
    </div>
  )
}

// ==========================================
// TAB 5: REAL-TIME STREAMING STUDY CHAT
// ==========================================
function ChatTab({ session, showToast }: { session: any, showToast: any }) {
  const [messages, setMessages] = useState<{role: string, content: string}[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input
    if (!textToSend.trim() || isLoading) return

    const userMessage = { role: 'user', content: textToSend }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    const assistantIndex = updatedMessages.length
    setMessages([...updatedMessages, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          transcript: session.raw_transcript
        })
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || `Server responded with status ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("Could not initialize text stream reader.")
      const decoder = new TextDecoder()
      let accumulated = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setMessages(prev => {
          const next = [...prev]
          next[assistantIndex] = { role: 'assistant', content: accumulated }
          return next
        })
      }

    } catch (err: any) {
      console.error("Streaming error:", err)
      showToast(err.message, "error")
      setMessages(prev => {
        const next = [...prev]
        next[assistantIndex] = { 
          role: 'assistant', 
          content: `⚠️ Error: ${err.message || 'Failed to reach study assistant.'}` 
        }
        return next
      })
    } finally {
      setIsLoading(false)
    }
  }

  const promptSuggestions = [
    "Summarize this in 3 bullet points",
    "What are the most testable concepts?",
    "Give me a 3-question practice quiz",
    "Explain any difficult concepts simply"
  ]

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-170px)] flex flex-col bg-white/[0.02] border border-white/[0.07] rounded-3xl overflow-hidden shadow-2xl">
      
      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400/20 to-blue-500/20 border border-cyan-400/30 flex items-center justify-center mb-3">
              <Sparkles className="w-7 h-7 text-cyan-400" />
            </div>
            <h4 className="text-base font-bold text-white font-mono">Ask your Study Assistant</h4>
            <p className="text-xs text-zinc-400 max-w-xs mt-1 leading-relaxed">
              Powered by Gemini 3.6 Flash. Grounded exclusively on your lecture transcript with instant token streaming.
            </p>

            {/* Suggestions Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 w-full max-w-md">
              {promptSuggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(s)}
                  className="p-3 text-left text-xs bg-white/[0.03] hover:bg-cyan-400/10 hover:border-cyan-400/30 border border-white/[0.06] rounded-2xl text-zinc-300 transition-all active:scale-95 leading-tight"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-xs leading-relaxed ${
              m.role === 'user'
                ? 'bg-cyan-400 text-black font-medium shadow-md shadow-cyan-400/20 rounded-br-sm'
                : 'bg-white/[0.05] text-zinc-200 border border-white/[0.08] shadow-sm rounded-bl-sm'
            }`}>
              {m.role === 'assistant' ? (
                <div className="prose prose-invert prose-xs max-w-none prose-p:my-1.5 prose-headings:text-white">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <p>{m.content}</p>
              )}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.content === '' && (
          <div className="flex justify-start">
            <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 py-3 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce delay-100"></div>
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Pill */}
      <div className="p-4 bg-[#07090F]/90 backdrop-blur-xl border-t border-white/[0.06]">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }} 
          className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 py-2 focus-within:border-cyan-400/50 focus-within:bg-white/[0.07] transition-all"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about this lecture..."
            disabled={isLoading}
            className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="w-8 h-8 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed text-black flex items-center justify-center transition-all active:scale-95 shadow-sm"
          >
            <SendHorizontal className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
