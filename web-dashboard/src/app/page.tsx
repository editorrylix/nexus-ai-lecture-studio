/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
'use client'

import React, { useEffect, useState, useRef, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { 
  MessageSquare, 
  Layout, 
  FileText, 
  BrainCircuit, 
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
  ExternalLink,
  ChevronDown,
  Monitor,
  Globe,
  Headphones,
  Music,
  Code
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Helper to render recognized app icons
function AppIcon({ appType }: { appType: string }) {
  const type = (appType || '').toLowerCase()
  if (type === 'chrome') return <Globe className="w-4 h-4 text-amber-400" />
  if (type === 'teams') return <Monitor className="w-4 h-4 text-blue-400" />
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

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ type, text })
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Initial Load
  useEffect(() => {
    fetchSessions()
    checkAudioStatus()
    const sessionInterval = setInterval(fetchSessions, 6000)
    const audioInterval = setInterval(checkAudioStatus, 1500)
    setMounted(true)
    return () => {
      clearInterval(sessionInterval)
      clearInterval(audioInterval)
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
          showToast(`Found ${data.processes.length} active audio apps.`, "info")
          addDiagnostic(`Scanned ${data.processes.length} active audio processes.`)
        } else {
          setProcesses([])
          showToast("No active audio playing. Start audio in your app first.", "info")
        }
      }
    } catch (err: any) {
      showToast(`Process scan failed: ${err.message}`, "error")
    }
  }

  const addDiagnostic = (msg: string) => {
    const time = new Date().toLocaleTimeString()
    setDiagnosticLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 49)])
  }

  // Start In-Browser Recording
  const handleStartRecording = async () => {
    if (!selectedPid) {
      showToast("Please select an active audio app first.", "error")
      return
    }

    addDiagnostic(`Starting capture for ${selectedAppName} (PID: ${selectedPid})...`)
    try {
      const res = await fetch('/api/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', pid: selectedPid, name: selectedAppName })
      })
      const data = await res.json()
      if (data.success) {
        setIsRecording(true)
        showToast(`Recording started for ${selectedAppName}`, "success")
        addDiagnostic("Recording stream established via WASAPI loopback.")
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
        showToast("Audio stopped! Gemini is synthesizing lecture notes...", "info")
        // Poll for newly created session
        setTimeout(fetchSessions, 4000)
        setTimeout(fetchSessions, 8000)
      }
    } catch (err: any) {
      showToast(`Stop failed: ${err.message}`, "error")
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
        showToast("Lecture removed from local library.", "success")
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
  const saveRename = async (id: string) => {
    if (!editTitleValue.trim()) {
      setEditingTitleId(null)
      return
    }
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename', id, title: editTitleValue.trim() })
      })
      if (res.ok) {
        setSessions(prev => prev.map(s => s.id === id ? { ...s, title: editTitleValue.trim() } : s))
        if (selectedSession?.id === id) {
          setSelectedSession((prev: any) => ({ ...prev, title: editTitleValue.trim() }))
        }
        showToast("Session renamed.", "success")
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
        showToast("Master Study Guide created successfully!", "success")
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

  const handleCopySummary = () => {
    if (!selectedSession?.summary) return
    navigator.clipboard.writeText(selectedSession.summary)
    setCopiedText(true)
    showToast("Summary copied to clipboard.", "success")
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
    showToast("Exported notes as Markdown for Obsidian/Notion.", "success")
  }

  if (!mounted) return null

  return (
    <div className="flex h-screen w-full bg-[#08090C] text-[#F3F4F6] font-sans overflow-hidden selection:bg-blue-500/25 selection:text-blue-100">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-5 right-6 z-50 px-4 py-2.5 rounded-2xl text-xs font-medium shadow-2xl backdrop-blur-xl border flex items-center gap-2.5 ${
              toastMessage.type === 'error' 
                ? 'bg-red-950/80 border-red-500/30 text-red-200' 
                : toastMessage.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200'
                : 'bg-zinc-900/90 border-white/[0.1] text-zinc-200'
            }`}
          >
            {toastMessage.type === 'error' && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
            {toastMessage.type === 'success' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- APPLE-GRADE SIDEBAR --- */}
      <aside className="w-84 flex-shrink-0 bg-[#0C0D12]/95 backdrop-blur-3xl border-r border-white/[0.07] flex flex-col z-20">
        
        {/* Brand Header */}
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-blue-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-[#0C0D12] rounded-[11px] flex items-center justify-center">
                <BrainCircuit className="w-4 h-4 text-blue-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm tracking-tight text-white">Nexus</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Local</span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-none mt-0.5">All-in-One Studio</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button 
              onClick={() => {
                setStitchMode(!stitchMode)
                setSelectedForStitch([])
              }}
              title="Stitch / Merge multiple sessions"
              className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                stitchMode ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <GitMerge className="w-4 h-4" />
            </button>
            <button 
              onClick={fetchSessions}
              title="Refresh local storage"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] active:scale-95 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stitch Mode Alert Pill */}
        {stitchMode && (
          <div className="px-3.5 pt-2.5 pb-1">
            <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-2.5 text-xs text-indigo-300 flex items-center justify-between">
              <span>Select sessions to stitch ({selectedForStitch.length} selected)</span>
              <button 
                onClick={() => setStitchMode(false)}
                className="text-indigo-400 hover:text-white text-[11px]"
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
              placeholder="Search lectures, topics, notes..."
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all"
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
                    ? 'bg-blue-600/[0.12] border-blue-500/30 shadow-[0_2px_12px_rgba(37,99,235,0.12)]' 
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
                        className="w-3.5 h-3.5 rounded border-white/20 text-indigo-600 focus:ring-0 mr-1"
                      />
                    )}
                    {s.pinned && <Pin className="w-3 h-3 text-amber-400 rotate-45" />}
                    <span className={isSelected ? 'text-blue-300' : 'text-zinc-200'}>{dateStr}</span>
                    <span className="text-zinc-600 text-[10px]">•</span>
                    <span className="text-zinc-500 text-[11px]">{timeStr}</span>
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

                {/* Session Title (with inline rename support) */}
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
                      className="flex-1 bg-white/[0.08] border border-blue-500 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
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
                    className="text-xs font-semibold text-zinc-200 line-clamp-1 leading-snug tracking-tight"
                  >
                    {displayTitle}
                  </h4>
                )}

                <p className="text-[11px] text-zinc-400 line-clamp-1 leading-relaxed mt-1">
                  {s.summary || 'No summary generated.'}
                </p>

                {flashcardCount > 0 && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.04] text-zinc-400 border border-white/[0.05] flex items-center gap-1 font-mono">
                      <Layers className="w-2.5 h-2.5 text-blue-400" />
                      {flashcardCount} cards
                    </span>
                    {s.tags?.includes("Stitched Master Guide") && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                        Master Guide
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {filteredSessions.length === 0 && (
            <div className="text-center py-12 px-4 text-zinc-600">
              <div className="w-9 h-9 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mx-auto mb-3">
                <BrainCircuit className="w-4 h-4 text-zinc-600" />
              </div>
              <p className="text-xs font-medium text-zinc-400">No sessions found</p>
              <p className="text-[11px] text-zinc-600 mt-1">Click "Record New Lecture" at the top to begin.</p>
            </div>
          )}
        </div>

        {/* Floating Stitch Action Button when in Stitch Mode */}
        {stitchMode && selectedForStitch.length >= 2 && (
          <div className="p-3 bg-indigo-950/70 border-t border-indigo-500/30">
            <button
              onClick={handleStitchSessions}
              disabled={isStitching}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {isStitching ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Master Guide...</span>
                </>
              ) : (
                <>
                  <GitMerge className="w-3.5 h-3.5" />
                  <span>Stitch {selectedForStitch.length} Meetings</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Sidebar Footer with Settings */}
        <div className="p-3 border-t border-white/[0.06] bg-[#090A0E]/60 flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
            <span>Local Storage Active</span>
          </div>
          <button 
            onClick={() => setShowSettings(true)}
            title="Local Storage Settings"
            className="p-1 hover:text-white hover:bg-white/[0.06] rounded-md transition-all"
          >
            <Settings className="w-3.5 h-3.5 text-zinc-400" />
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT CANVAS --- */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#08090C] relative">
        
        {/* --- ALL-IN-ONE RECORDING STUDIO HEADER PILL --- */}
        <div className="border-b border-white/[0.06] bg-[#0C0D12]/90 backdrop-blur-2xl px-8 py-3.5 flex items-center justify-between z-20">
          
          {/* Studio Toggle / Recording Pill */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setShowStudio(!showStudio)
                if (!showStudio) scanProcesses()
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-all active:scale-[0.97] ${
                isRecording 
                  ? 'bg-red-500/10 border-red-500/30 text-red-300 animate-pulse' 
                  : showStudio
                  ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                  : 'bg-white/[0.05] border-white/[0.08] text-zinc-200 hover:bg-white/[0.08]'
              }`}
            >
              {isRecording ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
                  <span>Recording Audio ({Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')})</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-blue-400" />
                  <span>{showStudio ? "Hide Studio" : "Record New Lecture"}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showStudio ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>

            {/* Real-time live audio activity waveform indicator */}
            {isRecording && (
              <div className="flex items-center gap-1 px-3 py-1 bg-white/[0.03] border border-white/[0.06] rounded-full">
                <div className="flex items-center gap-0.5 h-3">
                  {[0.3, 0.7, 1.0, 0.5, 0.8, 0.4].map((scale, i) => (
                    <motion.div
                      key={i}
                      className="w-0.5 bg-emerald-400 rounded-full"
                      animate={{ height: `${Math.max(3, vuLevel * 12 * scale)}px` }}
                      transition={{ duration: 0.1 }}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-zinc-400 font-mono ml-1">{selectedAppName}</span>
              </div>
            )}

            {isProcessingAI && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs text-blue-300">
                <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
                <span>Synthesizing with Gemini 3.6 Flash...</span>
              </div>
            )}
          </div>

          {/* Segmented Control Pill */}
          {selectedSession && (
            <div className="flex p-1 bg-white/[0.04] border border-white/[0.08] rounded-xl relative shadow-inner">
              {[
                { id: 'summary', icon: Layout, label: 'Summary' },
                { id: 'flashcards', icon: Layers, label: 'Flashcards' },
                { id: 'quiz', icon: GraduationCap, label: 'Quiz' },
                { id: 'transcript', icon: FileText, label: 'Transcript' },
                { id: 'chat', icon: MessageSquare, label: 'Assistant' }
              ].map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`relative flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-colors z-10 ${
                      isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="activeTabPill"
                        className="absolute inset-0 bg-white/[0.12] border border-white/[0.15] rounded-lg shadow-sm"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <tab.icon className="w-3.5 h-3.5 relative z-10" />
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Export Utilities */}
          {selectedSession && (
            <div className="flex items-center gap-2">
              <button 
                onClick={handleExportMarkdown}
                title="Export notes as Markdown (.md) for Obsidian / Notion"
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-xs font-medium text-zinc-300 transition-all active:scale-95"
              >
                <FileDown className="w-3.5 h-3.5 text-zinc-400" />
                <span>Markdown</span>
              </button>

              <button 
                onClick={handleCopySummary}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-xs font-medium text-zinc-300 transition-all active:scale-95"
              >
                {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                <span>{copiedText ? 'Copied' : 'Copy'}</span>
              </button>

              {selectedSession.flashcards_json?.anki_url && (
                <a 
                  href={selectedSession.flashcards_json.anki_url} 
                  download
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-medium shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Anki</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* --- IN-BROWSER RECORDING STUDIO DRAWER --- */}
        <AnimatePresence>
          {showStudio && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-white/[0.08] bg-[#0E1017]/95 backdrop-blur-2xl z-10"
            >
              <div className="max-w-4xl mx-auto px-8 py-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-semibold text-white tracking-tight">Audio Capture Studio</h3>
                    <span className="text-[10px] text-zinc-500 font-mono">WASAPI Direct Loopback</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={scanProcesses}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Rescan Apps
                    </button>
                    <button 
                      onClick={() => setShowDiagnostics(!showDiagnostics)}
                      className="text-xs text-zinc-500 hover:text-zinc-300"
                    >
                      {showDiagnostics ? "Hide Diagnostics" : "Show Diagnostics"}
                    </button>
                  </div>
                </div>

                {/* Target Audio App Selection Grid */}
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
                        className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-blue-600/15 border-blue-500/50 shadow-md shadow-blue-500/10' 
                            : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
                        } ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                          <AppIcon appType={p.appType} />
                        </div>
                        <div className="overflow-hidden">
                          <div className="text-xs font-semibold text-white truncate">{p.name}</div>
                          <div className="text-[10px] text-zinc-500 font-mono truncate">PID: {p.pid}</div>
                        </div>
                      </div>
                    )
                  })}

                  {processes.length === 0 && (
                    <div className="col-span-3 text-center py-6 bg-white/[0.01] border border-dashed border-white/[0.08] rounded-xl text-zinc-500 text-xs">
                      No active audio apps detected. Start playing sound in Chrome, Teams, Zoom, or YouTube, then click "Rescan Apps".
                    </div>
                  )}
                </div>

                {/* Recording Controls Bar */}
                <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
                  <div className="flex items-center gap-4">
                    {/* Live VU Amplitude Progress Bar */}
                    <div className="w-36 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-400 transition-all duration-100 rounded-full"
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
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-2"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>Start Recording</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleStopRecording}
                        className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-red-600/20 active:scale-95 transition-all flex items-center gap-2"
                      >
                        <Square className="w-3.5 h-3.5" />
                        <span>Stop & Process AI</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Collapsible Diagnostics Console */}
                {showDiagnostics && (
                  <div className="mt-4 p-3 bg-black/50 border border-white/[0.06] rounded-xl font-mono text-[11px] text-zinc-400 max-h-32 overflow-y-auto space-y-1">
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
                    onRename={(newTitle: string) => saveRename(selectedSession.id)}
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
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] flex items-center justify-center mb-4 shadow-xl">
                <BrainCircuit className="w-8 h-8 text-zinc-500" />
              </div>
              <h3 className="text-base font-semibold text-zinc-200">No Lecture Selected</h3>
              <p className="text-xs text-zinc-500 max-w-sm mt-1.5 leading-relaxed">
                Click "Record New Lecture" at the top to record live audio from Teams, Chrome, or Zoom, or select an existing lecture from the sidebar.
              </p>
            </div>
          )}
        </div>
      </main>

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
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              className="relative w-full max-w-md bg-[#10121A] border border-white/[0.1] rounded-3xl p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-white">Local Storage Preferences</h3>
                </div>
                <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white">
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs text-zinc-300">
                <div>
                  <label className="text-zinc-400 block mb-1">Local Storage Folder on Disk:</label>
                  <div className="p-2.5 bg-black/50 border border-white/[0.08] rounded-xl font-mono text-[11px] text-zinc-300 break-all select-all">
                    {storageDir || 'd:\\Projects\\transcribe-edtech\\storage'}
                  </div>
                </div>

                <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-1 text-zinc-400 text-[11px]">
                  <div>✓ 100% Offline & Local-First (No Supabase required)</div>
                  <div>✓ All Markdown notes formatted for Obsidian / Notion</div>
                  <div>✓ Automatic backup of transcripts and Anki flashcards</div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/[0.06] flex justify-end">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-xl text-xs font-medium"
                >
                  Close
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
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              className="relative w-full max-w-md bg-[#10121A] border border-white/[0.1] rounded-3xl p-6 shadow-2xl z-10"
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white tracking-tight">Delete Lecture Notes?</h3>
                  <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                    This action cannot be undone. All structured notes, transcripts, and study flashcards for this session will be permanently deleted from your local storage.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-white/[0.06]">
                <button
                  onClick={() => setSessionToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-red-600 hover:bg-red-500 active:scale-95 text-white transition-all shadow-lg shadow-red-600/20 flex items-center gap-1.5"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete Lecture</span>
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
    <div className="max-w-4xl mx-auto space-y-10 pb-16">
      
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
                className="text-2xl font-bold bg-white/[0.08] border border-blue-500 rounded-lg px-3 py-1 text-white focus:outline-none w-full"
              />
              <button 
                onClick={() => onRename(editTitleValue)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg"
              >
                Save
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => {
              setEditingTitleId(session.id)
              setEditTitleValue(session.title || 'Untitled Lecture')
            }}>
              <h1 className="text-2xl font-bold tracking-tight text-white hover:text-blue-200 transition-colors">
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

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            <Sparkles className="w-3 h-3" />
            Gemini 3.6 Flash
          </span>
        </div>
      </div>

      {/* 1. Executive Summary */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <BookOpen className="w-4 h-4 text-blue-400" />
          <span>Executive Summary</span>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-6 shadow-sm shadow-black/20 text-sm leading-relaxed text-zinc-300 prose prose-invert max-w-none prose-p:my-2 prose-headings:text-white">
          <ReactMarkdown>{session.summary || 'No summary available.'}</ReactMarkdown>
        </div>
      </section>

      {/* 2. Action Items & Takeaways */}
      {actionItems.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>Key Takeaways & Action Items</span>
            </div>
            <span className="text-[11px] text-zinc-500 font-mono">Click item to check off</span>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-5 space-y-2 shadow-sm">
            {actionItems.map((item: string, i: number) => {
              const isChecked = !!completedItems[i]
              return (
                <div 
                  key={i}
                  onClick={() => toggleItem(i)}
                  className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                    isChecked ? 'bg-white/[0.01] opacity-50' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <button className="mt-0.5 text-zinc-500 hover:text-blue-400 transition-colors">
                    {isChecked ? (
                      <CheckCircle2 className="w-4 h-4 text-blue-400" />
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
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <Layout className="w-4 h-4 text-emerald-400" />
            <span>Structured Course Modules</span>
          </div>
          <div className="grid gap-3.5">
            {outline.map((section: any, i: number) => (
              <div 
                key={i} 
                className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-5 shadow-sm hover:border-white/[0.1] transition-all"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="font-mono text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                    MODULE {String(i + 1).padStart(2, '0')}
                  </span>
                  <h4 className="text-sm font-semibold text-white tracking-tight">{section.title}</h4>
                </div>
                <ul className="space-y-1.5 pl-2">
                  {section.bullet_points?.map((pt: string, j: number) => (
                    <li key={j} className="flex items-start gap-2.5 text-xs text-zinc-300 leading-relaxed">
                      <span className="text-emerald-500/50 mt-0.5">•</span>
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
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <HelpCircle className="w-4 h-4 text-purple-400" />
            <span>Key Terminology & Glossary</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {glossary.map((g: any, i: number) => (
              <div 
                key={i} 
                className="bg-white/[0.02] border border-white/[0.07] rounded-xl p-4 hover:border-purple-500/30 transition-all"
              >
                <div className="font-semibold text-xs text-purple-300 font-mono mb-1">{g.term}</div>
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
        <h3 className="text-sm font-semibold text-zinc-300">No Flashcards Generated</h3>
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
    <div className="max-w-xl mx-auto flex flex-col items-center pt-6 pb-12 select-none">
      
      {/* Top Header & Progress */}
      <div className="w-full mb-6">
        <div className="flex items-center justify-between text-xs font-medium text-zinc-400 mb-2">
          <span>Flashcard {currentIndex + 1} of {cards.length}</span>
          <span className="text-[11px] text-zinc-500">Space to flip • Arrow keys to navigate</span>
        </div>
        <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
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
          <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] bg-gradient-to-b from-[#161820] to-[#0E1015] border border-white/[0.1] rounded-3xl p-8 flex flex-col justify-between shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono font-bold tracking-widest px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
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
              <span className="flex items-center gap-1 text-zinc-500">
                <RotateCw className="w-3 h-3" /> Tap to flip
              </span>
            </div>
          </div>

          {/* BACK: ANSWER */}
          <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-gradient-to-b from-[#111927] to-[#0D121B] border border-blue-500/30 rounded-3xl p-8 flex flex-col justify-between shadow-2xl shadow-blue-900/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Answer
              </span>
              <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                <RotateCw className="w-3 h-3" /> Tap to flip
              </span>
            </div>

            <div className="my-auto text-center px-4">
              <p className="text-base text-zinc-200 leading-relaxed font-normal">
                {currentCard.back}
              </p>
            </div>

            <div className="text-center text-[11px] text-zinc-500 font-mono">
              Knowledge Verification
            </div>
          </div>
        </motion.div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-4">
        <button 
          onClick={prevCard}
          className="w-11 h-11 rounded-full bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/[0.08] flex items-center justify-center text-zinc-300 transition-all shadow-md"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button 
          onClick={() => setIsFlipped(!isFlipped)}
          className="px-5 py-2.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] active:scale-95 border border-white/[0.1] text-xs font-medium text-zinc-200 transition-all"
        >
          Flip Card
        </button>

        <button 
          onClick={nextCard}
          className="w-11 h-11 rounded-full bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/[0.08] flex items-center justify-center text-zinc-300 transition-all shadow-md"
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
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-indigo-400" />
          Lecture Mastery Quiz
        </h2>
        <p className="text-xs text-zinc-400 mt-1">Test your recall of key concepts from this session.</p>
      </div>

      <div className="space-y-4">
        {cards.map((card: any, idx: number) => {
          const isAnswerShown = !!revealed[idx]
          return (
            <div key={idx} className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-6 transition-all hover:border-white/[0.12]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="font-mono text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                    QUESTION {idx + 1}
                  </span>
                  <h4 className="text-sm font-semibold text-white mt-2 leading-relaxed">{card.front}</h4>
                </div>

                <button
                  onClick={() => setRevealed(prev => ({ ...prev, [idx]: !prev[idx] }))}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] text-xs font-medium text-zinc-300 border border-white/[0.08] transition-all"
                >
                  {isAnswerShown ? 'Hide Answer' : 'Reveal Answer'}
                </button>
              </div>

              {isAnswerShown && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 pt-4 border-t border-white/[0.06] text-xs leading-relaxed text-emerald-300 bg-emerald-950/20 rounded-xl p-4 border border-emerald-500/20"
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
          <span>~{Math.ceil(wordCount / 150)} min estimated speaking time</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={downloadText}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-zinc-300 active:scale-95 transition-all"
          >
            <FileDown className="w-3.5 h-3.5 text-zinc-400" />
            <span>Download .txt</span>
          </button>
          <button
            onClick={copyTranscript}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-zinc-300 active:scale-95 transition-all"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy All</span>
          </button>
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-7 flex-1 overflow-y-auto leading-relaxed font-sans text-sm text-zinc-300 whitespace-pre-wrap select-text">
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
    <div className="max-w-3xl mx-auto h-[calc(100vh-140px)] flex flex-col bg-white/[0.02] border border-white/[0.07] rounded-3xl overflow-hidden shadow-2xl">
      
      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-blue-400" />
            </div>
            <h4 className="text-sm font-semibold text-white">Ask your Study Assistant</h4>
            <p className="text-xs text-zinc-500 max-w-xs mt-1 leading-relaxed">
              Powered by Gemini 3.6 Flash. Grounded exclusively on your lecture transcript with instant token streaming.
            </p>

            {/* Suggestions Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 w-full max-w-md">
              {promptSuggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(s)}
                  className="p-3 text-left text-xs bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] rounded-xl text-zinc-300 transition-all active:scale-95 leading-tight"
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
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 rounded-br-sm'
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
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-100"></div>
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Pill */}
      <div className="p-4 bg-[#090A0E]/80 backdrop-blur-xl border-t border-white/[0.06]">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }} 
          className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 py-2 focus-within:border-blue-500/50 focus-within:bg-white/[0.07] transition-all"
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
            className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all active:scale-95 shadow-sm"
          >
            <SendHorizontal className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
