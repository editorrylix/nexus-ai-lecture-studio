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
  Command,
  Sparkles,
  CornerDownLeft
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

// ==========================================
// 1. CUSTOM COLOR-INVERTING GEOMETRIC CURSOR (Zero Circles)
// ==========================================
function ModernCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 })
  const [isInteractive, setIsInteractive] = useState(false)
  const [isText, setIsText] = useState(false)
  const [isClicking, setIsClicking] = useState(false)

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY })
      const target = e.target as HTMLElement
      if (!target) return

      // Text detection: inputs, textareas, or paragraph/sentence text elements
      const isTextInput = target.closest('input, textarea')
      const isParagraphText = target.closest('p, span, li, h1, h2, h3, h4, pre, code, [role="article"]') && !target.closest('button, a, [role="button"]')
      
      if (isTextInput || isParagraphText) {
        setIsText(true)
        setIsInteractive(false)
      } else {
        setIsText(false)
        const clickable = target.closest('button, a, [role="button"], .interactive-element')
        setIsInteractive(!!clickable)
      }
    }

    const handleDown = () => setIsClicking(true)
    const handleUp = () => setIsClicking(false)

    window.addEventListener('mousemove', handleMove, { passive: true })
    window.addEventListener('mousedown', handleDown)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mousedown', handleDown)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [])

  return (
    <div 
      className="pointer-events-none fixed top-0 left-0 z-[999999] will-change-transform mix-blend-difference hidden md:block select-none"
      style={{
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        transition: 'transform 0.04s linear'
      }}
    >
      {/* State A: Inverted Text Beam (Unobstructed Sentence Reading) */}
      <div 
        className={`absolute -top-2 left-0 transition-opacity duration-150 ${
          isText ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="w-[1.5px] h-4 bg-white shadow-sm" />
      </div>

      {/* State B: Compact Stealth Arrow (Zero Circles, Zero Text Occlusion) */}
      <div 
        className={`absolute -top-0.5 -left-0.5 transition-all duration-150 ${
          !isText ? 'opacity-100' : 'opacity-0 pointer-events-none'
        } ${isClicking ? 'scale-90' : isInteractive ? 'scale-110' : 'scale-100'}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" className="fill-white drop-shadow-sm">
          <path d="M2 2L18 10L11 12L8.5 19L2 2Z" />
        </svg>
      </div>
    </div>
  )
}

// ==========================================
// 2. INTERACTIVE 3D TILT CARD WRAPPER
// ==========================================
function Card3D({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  const [rotate, setRotate] = useState({ x: 0, y: 0 })
  const [glow, setGlow] = useState({ x: 50, y: 50 })
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const rotX = ((y - centerY) / centerY) * -4
    const rotY = ((x - centerX) / centerX) * 4

    setRotate({ x: rotX, y: rotY })
    setGlow({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 })
  }

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 })
  }

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ rotateX: rotate.x, rotateY: rotate.y }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      style={{ transformStyle: "preserve-3d", perspective: 1200 }}
      className={`relative group interactive-element ${className}`}
    >
      {/* Specular Light Reflection */}
      <div 
        className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${glow.x}% ${glow.y}%, rgba(255,255,255,0.06) 0%, transparent 65%)`
        }}
      />
      {children}
    </motion.div>
  )
}

// ==========================================
// 3. ANIMATED AUDIO CANVAS WAVEFORM
// ==========================================
function CanvasWaveform({ isPlaying }: { isPlaying: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let phase = 0

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const bars = 22
      const barWidth = 3
      const gap = 3
      const totalWidth = bars * (barWidth + gap)
      const startX = (canvas.width - totalWidth) / 2

      for (let i = 0; i < bars; i++) {
        let height = 3
        if (isPlaying) {
          height = 3 + Math.sin(phase + i * 0.45) * 7 + Math.cos(phase * 1.3 + i * 0.3) * 5
          height = Math.max(3, Math.min(18, height))
        }
        const x = startX + i * (barWidth + gap)
        const y = (canvas.height - height) / 2

        ctx.fillStyle = isPlaying ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.2)'
        ctx.fillRect(x, y, barWidth, height)
      }

      if (isPlaying) phase += 0.15
      animationId = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animationId)
  }, [isPlaying])

  return <canvas ref={canvasRef} width={135} height={24} className="hidden sm:block" />
}

// App icons
function AppIcon({ appType }: { appType: string }) {
  const type = (appType || '').toLowerCase()
  if (type === 'chrome') return <Globe className="w-4 h-4 text-sky-400" />
  if (type === 'teams') return <Monitor className="w-4 h-4 text-blue-400" />
  if (type === 'discord') return <Headphones className="w-4 h-4 text-indigo-400" />
  if (type === 'spotify') return <Music className="w-4 h-4 text-emerald-400" />
  if (type === 'ide') return <Code className="w-4 h-4 text-purple-400" />
  return <Volume2 className="w-4 h-4 text-zinc-400" />
}

export default function Dashboard() {
  // State
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

  // Renaming State
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [editTitleValue, setEditTitleValue] = useState('')

  // Multi-Session Stitching State
  const [stitchMode, setStitchMode] = useState(false)
  const [selectedForStitch, setSelectedForStitch] = useState<string[]>([])
  const [isStitching, setIsStitching] = useState(false)

  // Settings & Command Palette State
  const [showSettings, setShowSettings] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  const [commandIndex, setCommandIndex] = useState(0)
  const [showShortcuts, setShowShortcuts] = useState(false)

  // Audio Studio State
  const [showStudio, setShowStudio] = useState(false)
  const [processes, setProcesses] = useState<any[]>([])
  const [selectedPid, setSelectedPid] = useState<number | null>(null)
  const [selectedAppName, setSelectedAppName] = useState<string>('')
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessingAI, setIsProcessingAI] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [vuLevel, setVuLevel] = useState(0)

  // Audio Upload / Import State
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingAudio, setIsUploadingAudio] = useState(false)

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ type, text })
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Initial Load & Global Keyboard Shortcuts
  useEffect(() => {
    fetchSessions()
    checkAudioStatus()
    const sessionInterval = setInterval(fetchSessions, 6000)
    const audioInterval = setInterval(checkAudioStatus, 1500)
    setMounted(true)

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K (Spotlight Command Palette)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowCommandPalette(prev => !prev)
      } else if (e.key === 'Escape') {
        setShowCommandPalette(false)
        setShowShortcuts(false)
        setShowSettings(false)
      } else if (e.key === '?' && !['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) {
        e.preventDefault()
        setShowShortcuts(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)

    return () => {
      clearInterval(sessionInterval)
      clearInterval(audioInterval)
      window.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, [])

  // Load Sessions
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

  // Audio Status
  const checkAudioStatus = async () => {
    try {
      const res = await fetch('/api/audio?action=status', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (data.online) {
          setIsRecording(data.isRecording)
          setIsProcessingAI(data.isProcessing)
          setRecordingSeconds(data.elapsed || 0)
          setVuLevel(data.vuLevel || 0)
        }
      }
    } catch {
      // quiet
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
        } else {
          setProcesses([])
          showToast("No active audio streams detected.", "info")
        }
      }
    } catch (err: any) {
      showToast(`Scan error: ${err.message}`, "error")
    }
  }

  // Start In-Browser Recording
  const handleStartRecording = async () => {
    if (!selectedPid) {
      showToast("Please choose an active audio source first.", "error")
      return
    }

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
      } else {
        showToast(`Failed: ${data.message || 'Unknown error'}`, "error")
      }
    } catch (err: any) {
      showToast(`Start failed: ${err.message}`, "error")
    }
  }

  // Stop In-Browser Recording
  const handleStopRecording = async () => {
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
        showToast("Recording stopped. Synthesizing notes...", "info")
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
    showToast(`Importing ${file.name}...`, "info")

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/audio/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (data.success && data.session) {
        showToast("Lecture imported successfully", "success")
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
        showToast("Session deleted.", "success")
      } else {
        throw new Error("Failed to delete session.")
      }
    } catch (err: any) {
      showToast(err.message, "error")
    } finally {
      setIsDeleting(false)
      setSessionToDelete(null)
    }
  }

  // Rename Session
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
        showToast("Renamed", "success")
      }
    } catch (err: any) {
      showToast(`Rename failed: ${err.message}`, "error")
    } finally {
      setEditingTitleId(null)
    }
  }

  // Pin Session
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
      showToast(`Pin error: ${err.message}`, "error")
    }
  }

  // Stitch Selected Sessions
  const handleStitchSessions = async () => {
    if (selectedForStitch.length < 2) {
      showToast("Select at least 2 sessions to stitch together.", "error")
      return
    }

    setIsStitching(true)
    showToast("Stitching sessions...", "info")

    try {
      const res = await fetch('/api/sessions/stitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionIds: selectedForStitch })
      })

      const data = await res.json()
      if (data.success && data.session) {
        showToast("Master Study Guide created!", "success")
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

  // Command Palette Items
  const commandItems = useMemo(() => {
    const q = commandQuery.toLowerCase().trim()
    const actions = [
      { id: 'act-record', title: isRecording ? 'Stop Recording' : 'Start Lecture Recording', category: 'Actions', icon: Mic, run: () => { setShowStudio(true); if (!showStudio) scanProcesses() } },
      { id: 'act-summary', title: 'View Executive Summary', category: 'Navigate', icon: Layout, run: () => setActiveTab('summary') },
      { id: 'act-flashcards', title: 'Study Flashcards', category: 'Navigate', icon: Layers, run: () => setActiveTab('flashcards') },
      { id: 'act-quiz', title: 'Take Practice Quiz', category: 'Navigate', icon: GraduationCap, run: () => setActiveTab('quiz') },
      { id: 'act-transcript', title: 'Read Full Transcript', category: 'Navigate', icon: FileText, run: () => setActiveTab('transcript') },
      { id: 'act-chat', title: 'Ask AI Study Assistant', category: 'Navigate', icon: MessageSquare, run: () => setActiveTab('chat') },
      { id: 'act-import', title: 'Import Audio File', category: 'Actions', icon: UploadCloud, run: () => fileInputRef.current?.click() },
      { id: 'act-markdown', title: 'Export Markdown for Obsidian', category: 'Export', icon: FileDown, run: () => handleExportMarkdown() },
      { id: 'act-stitch', title: 'Stitch Multiple Sessions', category: 'Actions', icon: GitMerge, run: () => setStitchMode(true) },
    ]

    const sessionMatches = sessions.map(s => ({
      id: `session-${s.id}`,
      title: s.title || 'Untitled Lecture',
      category: 'Lectures',
      icon: BookOpen,
      run: () => setSelectedSession(s)
    }))

    const all = [...actions, ...sessionMatches]
    if (!q) return all
    return all.filter(item => item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q))
  }, [commandQuery, sessions, isRecording, showStudio])

  const handleCopySummary = () => {
    if (!selectedSession?.summary) return
    navigator.clipboard.writeText(selectedSession.summary)
    setCopiedText(true)
    showToast("Summary copied to clipboard", "success")
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
    showToast("Exported as Markdown for Obsidian / Notion", "success")
  }

  if (!mounted) return null

  return (
    <div className="flex flex-col h-screen w-full bg-[#07080B] text-[#F3F4F6] font-sans overflow-hidden selection:bg-white/20 selection:text-white relative">
      
      {/* 1. Inverted Geometric Custom Cursor (Zero Circles) */}
      <ModernCursor />

      {/* 2. Ambient Depth Lights */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[350px] bg-gradient-to-br from-cyan-500/8 via-indigo-500/5 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] bg-gradient-to-tl from-purple-500/6 via-blue-500/4 to-transparent rounded-full blur-[130px] pointer-events-none" />

      {/* Hidden File Input for Audio Import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="audio/*" 
        className="hidden" 
      />

      {/* --- TOAST NOTIFICATION --- */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-8 z-[100] px-4 py-2 rounded-2xl text-xs font-medium shadow-2xl backdrop-blur-2xl border border-white/[0.12] bg-[#12151E]/90 text-zinc-200 flex items-center gap-2.5"
          >
            {toastMessage.type === 'error' && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
            {toastMessage.type === 'success' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
            {toastMessage.type === 'info' && <Circle className="w-3 h-3 text-cyan-400 fill-current" />}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 overflow-hidden z-10">
        
        {/* --- SLEEK APPLE GLASS SIDEBAR --- */}
        <aside className="w-80 flex-shrink-0 bg-[#0A0C11]/80 backdrop-blur-3xl border-r border-white/[0.08] flex flex-col z-20">
          
          {/* Brand Header */}
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl overflow-hidden p-[1px] bg-gradient-to-tr from-white/20 to-white/5 border border-white/[0.1] flex items-center justify-center shadow-sm">
                <Image src="/nexus-logo.svg" alt="Nexus" width={20} height={20} priority />
              </div>
              <span className="font-semibold text-sm tracking-tight text-white/90">Nexus</span>
            </div>

            <div className="flex items-center gap-1">
              <button 
                onClick={() => {
                  setStitchMode(!stitchMode)
                  setSelectedForStitch([])
                }}
                title="Stitch multiple sessions"
                className={`p-1.5 rounded-lg text-xs transition-all ${
                  stitchMode ? 'bg-white/20 text-white font-medium shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <GitMerge className="w-3.5 h-3.5" />
              </button>

              <button 
                onClick={fetchSessions}
                title="Refresh sessions"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] active:scale-95 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-white' : ''}`} />
              </button>
            </div>
          </div>

          {/* Stitch Mode Alert */}
          {stitchMode && (
            <div className="px-3.5 pt-2.5 pb-1">
              <div className="bg-white/[0.04] border border-white/[0.1] rounded-xl p-2.5 text-xs text-zinc-300 flex items-center justify-between">
                <span>Select sessions ({selectedForStitch.length})</span>
                <button 
                  onClick={() => setStitchMode(false)}
                  className="text-white hover:underline text-[11px]"
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
                placeholder="Search lectures & notes..."
                className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
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
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
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
                  className={`group relative p-3 rounded-2xl cursor-pointer transition-all duration-150 border active:scale-[0.99] ${
                    isSelected && !stitchMode
                      ? 'bg-white/[0.08] border-white/[0.18] shadow-[0_4px_20px_rgba(0,0,0,0.3)]' 
                      : isCheckedForStitch
                      ? 'bg-white/[0.06] border-white/[0.15]'
                      : 'bg-transparent border-transparent hover:bg-white/[0.03] hover:border-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      {stitchMode && (
                        <input 
                          type="checkbox"
                          checked={isCheckedForStitch}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 rounded border-white/20 text-white focus:ring-0 mr-1"
                        />
                      )}
                      {s.pinned && <Pin className="w-3 h-3 text-amber-300 rotate-45" />}
                      <span className={isSelected ? 'text-white font-medium' : 'text-zinc-300'}>{dateStr}</span>
                      <span className="text-zinc-600 text-[10px]">•</span>
                      <span className="text-zinc-500 text-[11px]">{timeStr}</span>
                    </div>

                    {!stitchMode && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => handleTogglePin(e, s.id)}
                          title={s.pinned ? "Unpin" : "Pin to top"}
                          className="p-1 text-zinc-500 hover:text-amber-300 hover:bg-white/[0.06] rounded-md transition-all"
                        >
                          <Pin className={`w-3 h-3 ${s.pinned ? 'text-amber-300' : ''}`} />
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

                  {/* Title (Inline Rename) */}
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
                        className="flex-1 bg-white/[0.08] border border-white/20 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none"
                      />
                      <button onClick={() => saveRename(s.id)} className="p-1 text-emerald-400 hover:text-emerald-300">
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
                      className="text-xs font-medium text-zinc-100 line-clamp-1 leading-snug tracking-tight"
                    >
                      {displayTitle}
                    </h4>
                  )}

                  <p className="text-[11px] text-zinc-400 line-clamp-1 leading-relaxed mt-1">
                    {s.summary || 'No summary available.'}
                  </p>

                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    {flashcardCount > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-zinc-400 border border-white/[0.06] flex items-center gap-1">
                        <Layers className="w-2.5 h-2.5 text-zinc-300" />
                        {flashcardCount} cards
                      </span>
                    )}
                    {s.audio_path && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-zinc-400 border border-white/[0.06] flex items-center gap-1">
                        <Volume2 className="w-2.5 h-2.5 text-zinc-300" /> Audio
                      </span>
                    )}
                  </div>
                </div>
              )
            })}

            {filteredSessions.length === 0 && (
              <div className="text-center py-12 px-4 text-zinc-600">
                <p className="text-xs font-medium text-zinc-400">No sessions recorded yet</p>
                <p className="text-[11px] text-zinc-600 mt-1">Click "Record" at the top to begin.</p>
              </div>
            )}
          </div>

          {/* Stitch Button */}
          {stitchMode && selectedForStitch.length >= 2 && (
            <div className="p-3 bg-white/[0.03] border-t border-white/[0.08]">
              <button
                onClick={handleStitchSessions}
                disabled={isStitching}
                className="w-full py-2 bg-white text-black rounded-xl text-xs font-medium transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-white/10"
              >
                {isStitching ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                    <span>Stitching...</span>
                  </>
                ) : (
                  <>
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>Stitch {selectedForStitch.length} Sessions</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-white/[0.06] bg-[#0A0C11]/50 flex items-center justify-between text-[11px] text-zinc-500">
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAudio}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{isUploadingAudio ? 'Importing...' : 'Import Audio'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowShortcuts(true)}
                title="Keyboard Shortcuts (?)"
                className="p-1 hover:text-white hover:bg-white/[0.06] rounded-md transition-all text-[11px] font-mono"
              >
                ?
              </button>
              <button 
                onClick={() => setShowSettings(true)}
                className="p-1 hover:text-white hover:bg-white/[0.06] rounded-md transition-all"
              >
                <Settings className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            </div>
          </div>
        </aside>

        {/* --- MAIN WORKSPACE CANVAS --- */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#07080B] relative">
          
          {/* --- FLOATING APPLE FROSTED GLASS NAVIGATION BAR --- */}
          <header className="sticky top-0 z-30 px-8 py-3.5 border-b border-white/[0.06] bg-[#07080B]/60 backdrop-blur-2xl flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
            
            {/* Left: Record Drawer Button & Quick Actions */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  setShowStudio(!showStudio)
                  if (!showStudio) scanProcesses()
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all active:scale-[0.97] border ${
                  isRecording 
                    ? 'bg-red-500/10 border-red-500/30 text-red-300 animate-pulse' 
                    : showStudio
                    ? 'bg-white text-black border-white shadow-md'
                    : 'bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border-white/[0.08]'
                }`}
              >
                {isRecording ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
                    <span>Recording ({Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')})</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5" />
                    <span>{showStudio ? "Close Studio" : "Record"}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${showStudio ? 'rotate-180' : ''}`} />
                  </>
                )}
              </button>

              {/* Quick Spotlight Trigger Pill */}
              <button 
                onClick={() => setShowCommandPalette(true)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] text-xs text-zinc-400 hover:text-white transition-all active:scale-95"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="text-[11px]">Command Palette</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/[0.1] text-[10px] font-mono text-zinc-300">⌘K</kbd>
              </button>

              {/* Dynamic VU Audio Waveform */}
              {isRecording && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-white/[0.04] border border-white/[0.08] rounded-full">
                  <div className="flex items-center gap-0.5 h-3">
                    {[0.3, 0.7, 1.0, 0.5, 0.8, 0.4].map((scale, i) => (
                      <motion.div
                        key={i}
                        className="w-0.5 bg-white rounded-full"
                        animate={{ height: `${Math.max(3, vuLevel * 12 * scale)}px` }}
                        transition={{ duration: 0.1 }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-zinc-400 ml-1">{selectedAppName}</span>
                </div>
              )}

              {isProcessingAI && (
                <div className="flex items-center gap-2 px-3 py-1 bg-white/[0.04] border border-white/[0.08] rounded-full text-xs text-zinc-300">
                  <RefreshCw className="w-3 h-3 animate-spin text-white" />
                  <span>Synthesizing notes...</span>
                </div>
              )}
            </div>

            {/* Middle: Apple Segmented Pill */}
            {selectedSession && (
              <div className="flex p-1 bg-white/[0.04] border border-white/[0.08] rounded-2xl relative shadow-inner">
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
                      className={`relative flex items-center gap-1.5 px-3.5 py-1 text-xs font-medium rounded-xl transition-colors z-10 ${
                        isActive ? 'text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {isActive && (
                        <motion.div 
                          layoutId="activeTabPill"
                          className="absolute inset-0 bg-white/[0.12] border border-white/[0.14] rounded-xl shadow-sm"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <tab.icon className="w-3.5 h-3.5 relative z-10" />
                      <span className="relative z-10">{tab.label}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Right: Actions */}
            {selectedSession && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleExportMarkdown}
                  title="Export notes as Markdown for Obsidian / Notion"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-zinc-300 transition-all active:scale-95"
                >
                  <FileDown className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Markdown</span>
                </button>

                <button 
                  onClick={handleCopySummary}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-zinc-300 transition-all active:scale-95"
                >
                  {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                  <span>{copiedText ? 'Copied' : 'Copy'}</span>
                </button>

                {selectedSession.flashcards_json?.anki_url && (
                  <a 
                    href={selectedSession.flashcards_json.anki_url} 
                    download
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-black font-medium text-xs shadow-md shadow-white/10 active:scale-95 transition-all"
                  >
                    <Download className="w-3.5 h-3.5 text-black" />
                    <span>Anki</span>
                  </a>
                )}
              </div>
            )}
          </header>

          {/* --- IN-BROWSER RECORDING STUDIO DRAWER --- */}
          <AnimatePresence>
            {showStudio && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b border-white/[0.08] bg-[#0A0D14]/90 backdrop-blur-3xl z-20"
              >
                <div className="max-w-4xl mx-auto px-8 py-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-white tracking-tight">Audio Capture Source</h3>
                    </div>
                    <button 
                      onClick={scanProcesses}
                      className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" /> Rescan Apps
                    </button>
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
                              ? 'bg-white/[0.1] border-white/[0.25] shadow-lg shadow-black/40' 
                              : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
                          } ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                            <AppIcon appType={p.appType} />
                          </div>
                          <div className="overflow-hidden">
                            <div className="text-xs font-medium text-white truncate">{p.name}</div>
                            <div className="text-[10px] text-zinc-500 font-mono truncate">PID: {p.pid}</div>
                          </div>
                        </div>
                      )
                    })}

                    {processes.length === 0 && (
                      <div className="col-span-3 text-center py-6 bg-white/[0.01] border border-dashed border-white/[0.08] rounded-2xl text-zinc-500 text-xs">
                        No audio playing. Start playback in Teams, Chrome, Zoom, or Spotify, then click Rescan Apps.
                      </div>
                    )}
                  </div>

                  {/* Recording Controls */}
                  <div className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-white transition-all duration-100 rounded-full"
                          style={{ width: `${Math.min(100, vuLevel * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-400 font-mono">
                        {isRecording ? `REC: ${Math.floor(recordingSeconds / 60)}:${(recordingSeconds % 60).toString().padStart(2, '0')}` : 'Ready'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {!isRecording ? (
                        <button
                          onClick={handleStartRecording}
                          disabled={!selectedPid}
                          className="px-5 py-2 bg-white hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed text-black rounded-xl text-xs font-semibold shadow-md active:scale-95 transition-all flex items-center gap-2"
                        >
                          <Mic className="w-3.5 h-3.5 text-black" />
                          <span>Start Recording</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleStopRecording}
                          className="px-5 py-2 bg-red-500 hover:bg-red-400 text-white rounded-xl text-xs font-semibold shadow-md active:scale-95 transition-all flex items-center gap-2"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Stop & Process</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* --- TAB CONTENT CANVAS --- */}
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
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center mt-24">
                <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-4 shadow-xl">
                  <BookOpen className="w-6 h-6 text-zinc-500" />
                </div>
                <h3 className="text-base font-semibold text-white/90">No Lecture Selected</h3>
                <p className="text-xs text-zinc-500 max-w-sm mt-1.5 leading-relaxed">
                  Select a session from the sidebar or click "Record" above to begin.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* --- SPOTLIGHT COMMAND PALETTE MODAL (Cmd+K) --- */}
      <AnimatePresence>
        {showCommandPalette && (
          <div className="fixed inset-0 z-[200] flex items-start justify-center pt-24 px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCommandPalette(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              className="relative w-full max-w-xl bg-[#0F1118]/95 border border-white/[0.14] rounded-3xl overflow-hidden shadow-2xl z-10 backdrop-blur-2xl"
            >
              {/* Command Search Bar */}
              <div className="p-4 border-b border-white/[0.08] flex items-center gap-3">
                <Search className="w-4 h-4 text-zinc-400" />
                <input 
                  type="text"
                  value={commandQuery}
                  onChange={(e) => {
                    setCommandQuery(e.target.value)
                    setCommandIndex(0)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      setCommandIndex(i => Math.min(commandItems.length - 1, i + 1))
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      setCommandIndex(i => Math.max(0, i - 1))
                    } else if (e.key === 'Enter') {
                      e.preventDefault()
                      if (commandItems[commandIndex]) {
                        commandItems[commandIndex].run()
                        setShowCommandPalette(false)
                        setCommandQuery('')
                      }
                    }
                  }}
                  autoFocus
                  placeholder="Type a command or search lectures..."
                  className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
                />
                <kbd className="px-2 py-0.5 rounded-lg bg-white/[0.08] border border-white/[0.1] text-[10px] font-mono text-zinc-400">
                  ESC
                </kbd>
              </div>

              {/* Command List */}
              <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                {commandItems.map((item, idx) => {
                  const isHighlighted = idx === commandIndex
                  const Icon = item.icon
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        item.run()
                        setShowCommandPalette(false)
                        setCommandQuery('')
                      }}
                      onMouseEnter={() => setCommandIndex(idx)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl cursor-pointer transition-all ${
                        isHighlighted 
                          ? 'bg-white text-black font-medium shadow-md' 
                          : 'text-zinc-300 hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isHighlighted ? 'text-black' : 'text-zinc-400'}`} />
                        <span className="text-xs">{item.title}</span>
                      </div>
                      <span className={`text-[10px] font-mono ${isHighlighted ? 'text-black/60' : 'text-zinc-500'}`}>
                        {item.category}
                      </span>
                    </div>
                  )
                })}

                {commandItems.length === 0 && (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    No results found for "{commandQuery}"
                  </div>
                )}
              </div>

              <div className="px-4 py-2 bg-black/40 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                <div className="flex items-center gap-2">
                  <span>Navigate: ↑ ↓</span>
                  <span>•</span>
                  <span>Select: ↵</span>
                </div>
                <span>Nexus Spotlight</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- KEYBOARD SHORTCUTS HUD MODAL (?) --- */}
      <AnimatePresence>
        {showShortcuts && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShortcuts(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="relative w-full max-w-sm bg-[#0F1118] border border-white/[0.12] rounded-3xl p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <h3 className="text-sm font-semibold text-white">Keyboard Shortcuts</h3>
                <button onClick={() => setShowShortcuts(false)} className="text-zinc-500 hover:text-white text-xs">
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-2.5 text-xs text-zinc-300">
                <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                  <span>Command Palette</span>
                  <kbd className="px-2 py-0.5 rounded bg-white/[0.08] font-mono text-[11px] text-zinc-300">⌘K / Ctrl+K</kbd>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                  <span>Flip Flashcard</span>
                  <kbd className="px-2 py-0.5 rounded bg-white/[0.08] font-mono text-[11px] text-zinc-300">Space</kbd>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                  <span>Next / Prev Flashcard</span>
                  <kbd className="px-2 py-0.5 rounded bg-white/[0.08] font-mono text-[11px] text-zinc-300">← / →</kbd>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                  <span>Shortcuts HUD</span>
                  <kbd className="px-2 py-0.5 rounded bg-white/[0.08] font-mono text-[11px] text-zinc-300">?</kbd>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                  <span>Close Modals</span>
                  <kbd className="px-2 py-0.5 rounded bg-white/[0.08] font-mono text-[11px] text-zinc-300">ESC</kbd>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- SETTINGS MODAL --- */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="relative w-full max-w-md bg-[#0F1118] border border-white/[0.1] rounded-3xl p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-white" />
                  <h3 className="text-sm font-semibold text-white">Local Vault Storage</h3>
                </div>
                <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white">
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs text-zinc-300">
                <div>
                  <label className="text-zinc-500 block mb-1">Storage Path on Disk:</label>
                  <div className="p-2.5 bg-black/40 border border-white/[0.08] rounded-xl font-mono text-[11px] text-zinc-300 break-all select-all">
                    {storageDir || 'd:\\Projects\\transcribe-edtech\\storage'}
                  </div>
                </div>

                <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-1.5 text-zinc-400 text-[11px]">
                  <div>✓ Stored locally on disk for 100% privacy</div>
                  <div>✓ Native Obsidian vault integration</div>
                  <div>✓ Automated Anki .apkg packages</div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/[0.06] flex justify-end">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 bg-white text-black font-medium rounded-xl text-xs"
                >
                  Done
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
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="relative w-full max-w-md bg-[#0F1118] border border-white/[0.1] rounded-3xl p-6 shadow-2xl z-10"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white tracking-tight">Delete Lecture?</h3>
                  <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                    This will permanently delete this session's transcripts, notes, and study cards from your local vault.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-white/[0.06]">
                <button
                  onClick={() => setSessionToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-500 hover:bg-red-400 text-white transition-all shadow-md active:scale-95"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
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
// EMBEDDED APPLE GLASS AUDIO PLAYER WITH LIVE CANVAS WAVEFORM
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
    <Card3D className="w-full">
      <div className="p-4 bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-3xl flex items-center justify-between gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
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
            className="w-9 h-9 rounded-2xl bg-white text-black flex items-center justify-center font-bold shadow-md hover:bg-zinc-200 active:scale-95 transition-all"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          <div className="text-xs">
            <div className="font-medium text-white/90">Lecture Audio</div>
            <div className="text-[11px] text-zinc-500 font-mono">
              {formatTime(currentTime)} / {formatTime(duration || 0)}
            </div>
          </div>
        </div>

        {/* Live Animated Waveform */}
        <CanvasWaveform isPlaying={isPlaying} />

        {/* Scrub Bar */}
        <div className="flex-1 max-w-sm flex items-center gap-2">
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
            className="w-full h-1 bg-white/[0.1] rounded-lg appearance-none cursor-pointer accent-white"
          />
        </div>

        {/* Speed Pill */}
        <button 
          onClick={cycleRate}
          className="px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-mono font-medium text-zinc-200 border border-white/[0.08] active:scale-95 transition-all"
        >
          {playbackRate}x
        </button>
      </div>
    </Card3D>
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
      
      {/* Session Title Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
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
                className="text-2xl font-semibold bg-white/[0.08] border border-white/20 rounded-xl px-3 py-1 text-white focus:outline-none w-full"
              />
              <button 
                onClick={() => onRename(editTitleValue)}
                className="px-3 py-1 bg-white text-black text-xs font-medium rounded-xl"
              >
                Save
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => {
              setEditingTitleId(session.id)
              setEditTitleValue(session.title || 'Untitled Lecture')
            }}>
              <h1 className="text-2xl font-semibold tracking-tight text-white/95 hover:text-white transition-colors">
                {session.title || 'Untitled Lecture'}
              </h1>
              <Edit2 className="w-4 h-4 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}

          <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span>Recorded {new Date(session.created_at).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}</span>
          </p>
        </div>
      </div>

      {/* Mini Audio Player (if recorded) */}
      <MiniAudioPlayer session={session} />

      {/* 1. Executive Summary */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
          <BookOpen className="w-4 h-4 text-zinc-400" />
          <span>Executive Summary</span>
        </div>
        <Card3D>
          <div className="bg-white/[0.025] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-7 shadow-[0_8px_32px_rgba(0,0,0,0.25)] text-sm leading-relaxed text-zinc-300 prose prose-invert max-w-none prose-p:my-2 prose-headings:text-white">
            <ReactMarkdown>{session.summary || 'No summary available.'}</ReactMarkdown>
          </div>
        </Card3D>
      </section>

      {/* 2. Action Items & Takeaways */}
      {actionItems.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-zinc-400" />
              <span>Key Takeaways & Action Items</span>
            </div>
            <span className="text-[11px] text-zinc-500">Click item to check off</span>
          </div>
          <Card3D>
            <div className="bg-white/[0.025] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 space-y-2 shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
              {actionItems.map((item: string, i: number) => {
                const isChecked = !!completedItems[i]
                return (
                  <div 
                    key={i}
                    onClick={() => toggleItem(i)}
                    className={`flex items-start gap-3 p-2.5 rounded-2xl cursor-pointer transition-all ${
                      isChecked ? 'bg-white/[0.01] opacity-40' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <button className="mt-0.5 text-zinc-500 hover:text-white transition-colors">
                      {isChecked ? (
                        <CheckCircle2 className="w-4 h-4 text-white" />
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
          </Card3D>
        </section>
      )}

      {/* 3. Structured Course Modules */}
      {outline.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <Layout className="w-4 h-4 text-zinc-400" />
            <span>Course Modules</span>
          </div>
          <div className="grid gap-3.5">
            {outline.map((section: any, i: number) => (
              <Card3D key={i}>
                <div className="bg-white/[0.025] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="text-[10px] font-semibold text-zinc-300 bg-white/[0.06] border border-white/[0.08] px-2.5 py-0.5 rounded-full font-mono">
                      Module {String(i + 1).padStart(2, '0')}
                    </span>
                    <h4 className="text-sm font-medium text-white tracking-tight">{section.title}</h4>
                  </div>
                  <ul className="space-y-1.5 pl-2">
                    {section.bullet_points?.map((pt: string, j: number) => (
                      <li key={j} className="flex items-start gap-2.5 text-xs text-zinc-300 leading-relaxed">
                        <span className="text-zinc-500 mt-0.5">•</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card3D>
            ))}
          </div>
        </section>
      )}

      {/* 4. Glossary of Terms */}
      {glossary.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <HelpCircle className="w-4 h-4 text-zinc-400" />
            <span>Terminology & Concepts</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {glossary.map((g: any, i: number) => (
              <Card3D key={i}>
                <div className="bg-white/[0.025] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-5 h-full">
                  <div className="font-semibold text-xs text-white mb-1">{g.term}</div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{g.definition}</p>
                </div>
              </Card3D>
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
        <h3 className="text-sm font-medium text-zinc-300">No Flashcards Available</h3>
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
        <div className="flex items-center justify-between text-xs font-medium text-zinc-400 mb-2">
          <span>Card {currentIndex + 1} of {cards.length}</span>
          <span className="text-[11px] text-zinc-500">Space to flip • Arrow keys to navigate</span>
        </div>
        <div className="w-full h-1 bg-white/[0.08] rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-white rounded-full"
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
          <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] bg-white/[0.03] backdrop-blur-3xl border border-white/[0.12] rounded-3xl p-8 flex flex-col justify-between shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono font-medium tracking-wider px-2.5 py-0.5 rounded-full bg-white/[0.08] text-zinc-300 border border-white/[0.1]">
                Question
              </span>
              <button 
                onClick={markMastered}
                className={`text-[11px] flex items-center gap-1 px-2.5 py-0.5 rounded-full border transition-all ${
                  isMastered ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'text-zinc-500 border-white/[0.06] hover:text-zinc-300'
                }`}
              >
                <CheckCheck className="w-3 h-3" />
                <span>{isMastered ? 'Mastered' : 'Mark Learned'}</span>
              </button>
            </div>
            
            <div className="my-auto text-center px-4">
              <h3 className="text-xl font-medium tracking-tight text-white leading-snug">
                {currentCard.front}
              </h3>
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
              <span>Card {currentIndex + 1} / {cards.length}</span>
              <span className="flex items-center gap-1 text-zinc-400">
                <RotateCw className="w-3 h-3" /> Click to flip
              </span>
            </div>
          </div>

          {/* BACK: ANSWER */}
          <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-white/[0.05] backdrop-blur-3xl border border-white/[0.16] rounded-3xl p-8 flex flex-col justify-between shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono font-medium tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Answer
              </span>
              <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                <RotateCw className="w-3 h-3" /> Click to flip
              </span>
            </div>

            <div className="my-auto text-center px-4">
              <p className="text-base text-zinc-200 leading-relaxed font-normal">
                {currentCard.back}
              </p>
            </div>

            <div className="text-center text-[11px] text-zinc-500 font-mono">
              Active Recall
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
          className="px-6 py-2.5 rounded-2xl bg-white hover:bg-zinc-200 active:scale-95 text-xs font-semibold text-black transition-all shadow-md"
        >
          Flip Card
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
        <h3 className="text-sm font-medium text-zinc-300">No Quiz Items Available</h3>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <div className="border-b border-white/[0.06] pb-4">
        <h2 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-zinc-300" />
          Practice Quiz
        </h2>
        <p className="text-xs text-zinc-400 mt-1">Self-test your knowledge of key lecture concepts.</p>
      </div>

      <div className="space-y-4">
        {cards.map((card: any, idx: number) => {
          const isAnswerShown = !!revealed[idx]
          return (
            <Card3D key={idx}>
              <div className="bg-white/[0.025] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 transition-all shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="font-mono text-[10px] font-semibold text-zinc-400 bg-white/[0.06] border border-white/[0.08] px-2.5 py-0.5 rounded-full">
                      Question {idx + 1}
                    </span>
                    <h4 className="text-sm font-medium text-white mt-2 leading-relaxed">{card.front}</h4>
                  </div>

                  <button
                    onClick={() => setRevealed(prev => ({ ...prev, [idx]: !prev[idx] }))}
                    className="flex-shrink-0 px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-zinc-200 border border-white/[0.08] transition-all active:scale-95"
                  >
                    {isAnswerShown ? 'Hide Answer' : 'Reveal Answer'}
                  </button>
                </div>

                {isAnswerShown && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 pt-4 border-t border-white/[0.06] text-xs leading-relaxed text-zinc-200 bg-white/[0.02] rounded-2xl p-4 border border-white/[0.06]"
                  >
                    <span className="font-semibold text-[10px] uppercase block mb-1 text-emerald-400 font-mono">Model Solution:</span>
                    {card.back}
                  </motion.div>
                )}
              </div>
            </Card3D>
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

  const copyTranscript = () => {
    navigator.clipboard.writeText(text)
    showToast("Transcript copied to clipboard", "success")
  }

  const downloadText = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `transcript_${new Date(session.created_at).toISOString().slice(0, 10)}.txt`
    link.click()
    URL.revokeObjectURL(url)
    showToast("Transcript downloaded as text file", "success")
  }

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col pb-12">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-white/[0.06]">
            {wordCount} words
          </span>
          <span>•</span>
          <span>~{Math.ceil(wordCount / 150)} min speaking time</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={downloadText}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-zinc-200 active:scale-95 transition-all"
          >
            <FileDown className="w-3.5 h-3.5 text-zinc-400" />
            <span>Download .txt</span>
          </button>
          <button
            onClick={copyTranscript}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-zinc-200 active:scale-95 transition-all"
          >
            <Copy className="w-3.5 h-3.5 text-zinc-300" />
            <span>Copy All</span>
          </button>
        </div>
      </div>

      <div className="bg-white/[0.025] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-7 flex-1 overflow-y-auto leading-relaxed font-sans text-sm text-zinc-300 whitespace-pre-wrap select-text shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
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
    <div className="max-w-3xl mx-auto h-[calc(100vh-140px)] flex flex-col bg-white/[0.025] backdrop-blur-3xl border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl">
      
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-3">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <h4 className="text-base font-medium text-white">Study Assistant</h4>
            <p className="text-xs text-zinc-400 max-w-xs mt-1 leading-relaxed">
              Grounded on your lecture transcript with instant token streaming.
            </p>

            {/* Suggestions Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 w-full max-w-md">
              {promptSuggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(s)}
                  className="p-3 text-left text-xs bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-2xl text-zinc-300 transition-all active:scale-95 leading-tight"
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
                ? 'bg-white text-black font-medium shadow-md rounded-br-sm'
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
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce delay-100"></div>
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      <div className="p-4 bg-[#07090F]/80 backdrop-blur-xl border-t border-white/[0.06]">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }} 
          className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 py-2 focus-within:border-white/25 focus-within:bg-white/[0.07] transition-all"
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
            className="w-8 h-8 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed text-black flex items-center justify-center transition-all active:scale-95 shadow-sm"
          >
            <SendHorizontal className="w-4 h-4 text-black" />
          </button>
        </form>
      </div>
    </div>
  )
}
