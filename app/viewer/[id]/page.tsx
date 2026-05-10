'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import styles from './viewer.module.css'

function splitPages(text: string, limit = 500): string[] {
  const pages: string[] = []
  let remaining = text
  while (remaining.length > 0) {
    if (remaining.length <= limit) { pages.push(remaining.trim()); break }
    let cut = limit
    while (cut > 0 && remaining[cut] && remaining[cut] !== ' ' && remaining[cut] !== '\n') cut--
    if (cut === 0) cut = limit
    pages.push(remaining.slice(0, cut).trim())
    remaining = remaining.slice(cut).trimStart()
  }
  return pages
}

export default function ViewerPage() {
  const params = useParams()
  const router = useRouter()
  const episodeId = params.id as string

  const [pages, setPages] = useState<string[]>([])
  const [current, setCurrent] = useState(0)
  const [episode, setEpisode] = useState<any>(null)
  const [series, setSeries] = useState<any>(null)
  const [allEps, setAllEps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showHud, setShowHud] = useState(false)
  const hudTimer = useRef<NodeJS.Timeout>()
  const touchStartX = useRef(0)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: ep } = await supabase
        .from('episodes')
        .select('*, series(*)')
        .eq('id', episodeId)
        .single()

      if (!ep) { setLoading(false); return }
      setEpisode(ep)
      setSeries(ep.series)

      const rawText = ep.content?.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ') || ''
      setPages(splitPages(rawText))

      // Load other episodes in same series
      const { data: eps } = await supabase
        .from('episodes')
        .select('id, ep_number, title')
        .eq('series_id', ep.series_id)
        .eq('is_published', true)
        .order('ep_number', { ascending: true })
      if (eps) setAllEps(eps)

      setLoading(false)
    }
    load()
  }, [episodeId])

  const changePage = useCallback((dir: number) => {
    setCurrent(prev => {
      const next = prev + dir
      if (next < 0 || next >= pages.length) return prev
      return next
    })
  }, [pages.length])

  function triggerHud() {
    setShowHud(true)
    clearTimeout(hudTimer.current)
    hudTimer.current = setTimeout(() => setShowHud(false), 2000)
  }

  function goToEp(id: string) {
    router.push(`/viewer/${id}`)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') changePage(1)
      if (e.key === 'ArrowLeft') changePage(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [changePage])

  if (loading) return (
    <div className={styles.loading}>✦</div>
  )

  if (!episode) return (
    <div className={styles.loading}>글을 찾을 수 없어요</div>
  )

  const pct = pages.length > 0 ? Math.round(((current + 1) / pages.length) * 100) : 0
  const currentEpIdx = allEps.findIndex(e => e.id === episodeId)
  const prevEp = allEps[currentEpIdx - 1]
  const nextEp = allEps[currentEpIdx + 1]

  return (
    <div
      className={styles.viewer}
      onClick={triggerHud}
      onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        const dx = e.changedTouches[0].clientX - touchStartX.current
        if (Math.abs(dx) > 40) { changePage(dx < 0 ? 1 : -1); return }
        triggerHud()
      }}
    >
      {/* Left / Right click zones */}
      <div className={styles.leftZone} onClick={e => { e.stopPropagation(); changePage(-1) }} />
      <div className={styles.rightZone} onClick={e => { e.stopPropagation(); changePage(1) }} />

      <div className={styles.pageArea}>
        <p className={styles.pageText}>{pages[current]}</p>
      </div>

      {/* HUD */}
      <div className={`${styles.hud} ${showHud ? styles.hudShow : ''}`}>
        <button
          className={styles.hudNav}
          disabled={!prevEp}
          onClick={e => { e.stopPropagation(); prevEp && goToEp(prevEp.id) }}
        >← 이전 화</button>
        <span className={styles.hudPct}>{pct}%</span>
        <button
          className={styles.hudNav}
          disabled={!nextEp}
          onClick={e => { e.stopPropagation(); nextEp && goToEp(nextEp.id) }}
        >다음 화 →</button>
      </div>
    </div>
  )
}
