'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import styles from './editor.module.css'

const BG_COLORS = ['#ffffff','#faf8f5','#f5f0e8','#fdf6e3','#f0f4f0','#1a1a1a','#2d2d2d','#1a1f2e']
const FONTS = [
  { label: '나눔명조', value: "'Nanum Myeongjo', serif" },
  { label: '노토 세리프', value: "'Noto Serif KR', serif" },
  { label: '함렛', value: "'Hahmlet', serif" },
  { label: '고운돋움', value: "'Gowun Dodum', sans-serif" },
]
const PAGE_LIMIT = 500

type Episode = {
  id?: string
  ep_number: number
  title: string
  content: string
  is_published: boolean
  password?: string
  series_id?: string
}

type Series = {
  id?: string
  title: string
  category: string
  episodes?: Episode[]
}

function splitPages(text: string): string[] {
  const pages: string[] = []
  let remaining = text
  while (remaining.length > 0) {
    if (remaining.length <= PAGE_LIMIT) { pages.push(remaining); break }
    let cut = PAGE_LIMIT
    while (cut > 0 && remaining[cut] && remaining[cut] !== ' ' && remaining[cut] !== '\n') cut--
    if (cut === 0) cut = PAGE_LIMIT
    pages.push(remaining.slice(0, cut))
    remaining = remaining.slice(cut).trimStart()
  }
  return pages.length > 0 ? pages : ['']
}

export default function EditorPage() {
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const autoSaveTimer = useRef<NodeJS.Timeout>()

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [currentSeries, setCurrentSeries] = useState<Series | null>(null)
  const [currentEp, setCurrentEp] = useState<Episode | null>(null)
  const [fullText, setFullText] = useState('')
  const [pages, setPages] = useState<string[]>([''])
  const [currentPage, setCurrentPage] = useState(0)
  const [saveState, setSaveState] = useState('저장됨')

  const [font, setFont] = useState(FONTS[0].value)
  const [fontSize, setFontSize] = useState(16)
  const [lineHeight, setLineHeight] = useState(2.0)
  const [bgColor, setBgColor] = useState('#faf8f5')
  const [vigIntensity, setVigIntensity] = useState(0)

  const [showPublish, setShowPublish] = useState(false)
  const [showNewSeries, setShowNewSeries] = useState(false)
  const [showNewEp, setShowNewEp] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [pubType, setPubType] = useState<'public' | 'password'>('public')
  const [pubPassword, setPubPassword] = useState('')
  const [newSeriesTitle, setNewSeriesTitle] = useState('')
  const [newSeriesCategory, setNewSeriesCategory] = useState('소설 시리즈')
  const [newEpTitle, setNewEpTitle] = useState('')
  const [profileUsername, setProfileUsername] = useState('')
  const [profileBio, setProfileBio] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace('/login'); return }
      setUser(data.user)
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
      setProfile(prof)
      setProfileUsername(prof?.username || '')
      setProfileBio(prof?.bio || '')
      loadSeries(data.user.id)
    })
  }, [router])

  async function loadSeries(userId: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('series').select('*, episodes(*)')
      .eq('author_id', userId).order('created_at', { ascending: true })
    if (data) {
      const sorted = data.map(s => ({
        ...s,
        episodes: (s.episodes || []).sort((a: Episode, b: Episode) => a.ep_number - b.ep_number)
      }))
      setSeriesList(sorted)
      if (sorted.length > 0 && sorted[0].episodes?.length > 0) {
        setCurrentSeries(sorted[0])
        loadEpisode(sorted[0].episodes[0])
      }
    }
  }

  function loadEpisode(ep: Episode) {
    setCurrentEp(ep)
    const raw = ep.content?.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ') || ''
    setFullText(raw)
    const ps = splitPages(raw)
    setPages(ps)
    setCurrentPage(0)
  }

  const autoSave = useCallback((text: string, epId?: string) => {
    setSaveState('저장 중...')
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      const id = epId || currentEp?.id
      if (!id) return
      const supabase = createClient()
      await supabase.from('episodes').update({ content: text, updated_at: new Date().toISOString() }).eq('id', id)
      setSaveState('저장됨')
    }, 1500)
  }, [currentEp])

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newPageText = e.target.value
    // Rebuild full text: pages before + current + pages after
    const before = pages.slice(0, currentPage).join(' ')
    const after = pages.slice(currentPage + 1).join(' ')
    const newFull = [before, newPageText, after].filter(Boolean).join(' ')
    setFullText(newFull)
    const newPages = splitPages(newFull)
    setPages(newPages)
    autoSave(newFull)
  }

  function changePage(dir: number) {
    const next = currentPage + dir
    if (next < 0 || next >= pages.length) return
    setCurrentPage(next)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  async function createSeries() {
    if (!user || !newSeriesTitle.trim()) return
    const supabase = createClient()
    const { data } = await supabase.from('series').insert({
      author_id: user.id, title: newSeriesTitle.trim(), category: newSeriesCategory,
    }).select().single()
    if (data) {
      setSeriesList(prev => [...prev, { ...data, episodes: [] }])
      setCurrentSeries({ ...data, episodes: [] })
      setCurrentEp(null); setFullText(''); setPages(['']); setCurrentPage(0)
      setShowNewSeries(false); setNewSeriesTitle('')
    }
  }

  async function createEpisode() {
    if (!user || !currentSeries?.id || !newEpTitle.trim()) return
    const supabase = createClient()
    const epNum = (currentSeries.episodes?.length || 0) + 1
    const { data } = await supabase.from('episodes').insert({
      series_id: currentSeries.id, author_id: user.id,
      ep_number: epNum, title: newEpTitle.trim(), content: '', is_published: false,
    }).select().single()
    if (data) {
      const updated = { ...currentSeries, episodes: [...(currentSeries.episodes || []), data] }
      setCurrentSeries(updated)
      setSeriesList(prev => prev.map(s => s.id === updated.id ? updated : s))
      loadEpisode(data); setShowNewEp(false); setNewEpTitle('')
    }
  }

  async function deleteEpisode() {
    if (!currentEp?.id) return
    if (!confirm(`"${currentEp.title}"을 삭제할까요?`)) return
    const supabase = createClient()
    await supabase.from('episodes').delete().eq('id', currentEp.id)
    const updatedEps = (currentSeries?.episodes || []).filter(e => e.id !== currentEp.id)
    const updated = { ...currentSeries!, episodes: updatedEps }
    setCurrentSeries(updated)
    setSeriesList(prev => prev.map(s => s.id === updated.id ? updated : s))
    if (updatedEps.length > 0) loadEpisode(updatedEps[0])
    else { setCurrentEp(null); setFullText(''); setPages(['']); setCurrentPage(0) }
  }

  async function deleteSeries() {
    if (!currentSeries?.id) return
    if (!confirm(`"${currentSeries.title}" 시리즈 전체를 삭제할까요?`)) return
    const supabase = createClient()
    await supabase.from('series').delete().eq('id', currentSeries.id)
    const updatedList = seriesList.filter(s => s.id !== currentSeries.id)
    setSeriesList(updatedList)
    if (updatedList.length > 0) {
      setCurrentSeries(updatedList[0])
      if (updatedList[0].episodes?.length) loadEpisode(updatedList[0].episodes[0])
      else { setCurrentEp(null); setFullText(''); setPages(['']); setCurrentPage(0) }
    } else {
      setCurrentSeries(null); setCurrentEp(null); setFullText(''); setPages(['']); setCurrentPage(0)
    }
  }

  async function saveProfile() {
    if (!user) return
    const supabase = createClient()
    await supabase.from('profiles').update({ username: profileUsername.trim(), bio: profileBio.trim() }).eq('id', user.id)
    setProfile((prev: any) => ({ ...prev, username: profileUsername, bio: profileBio }))
    setShowProfile(false)
  }

  async function publishEpisode() {
    if (!currentEp?.id) return
    const supabase = createClient()
    await supabase.from('episodes').update({
      is_published: true,
      password: pubType === 'password' ? pubPassword : null,
    }).eq('id', currentEp.id)
    setCurrentEp(prev => prev ? { ...prev, is_published: true } : prev)
    setShowPublish(false); setPubPassword('')
    alert('발행되었습니다!')
  }

  const isDark = ['#1a1a1a','#2d2d2d','#1a1f2e'].includes(bgColor)
  const vigStyle = vigIntensity > 0
    ? `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${vigIntensity / 100}) 100%)`
    : 'none'
  const pct = pages.length > 0 ? Math.round(((currentPage + 1) / pages.length) * 100) : 0

  return (
    <div className={styles.app}>
      <div className={styles.topbar}>
        <span className={styles.brand}>✦ WRITER</span>
        <div className={styles.sep} />
        <button className={styles.tbBtn} onClick={() => router.push(`/author/${profile?.username}`)}>내 페이지</button>
        <div className={styles.spacer} />
        <span className={styles.saveState}>{saveState}</span>
        <div className={styles.sep} />
        <button className={styles.tbBtn} onClick={() => setShowProfile(true)}>프로필</button>
        <button className={styles.tbBtnAccent} onClick={() => setShowPublish(true)}>발행</button>
      </div>

      <div className={styles.main}>
        <div className={styles.sidebar}>
          <div className={styles.sSec}>
            <div className={styles.sTitle}>내 글</div>
            {seriesList.map(s => (
              <div key={s.id} className={styles.seriesGroup}>
                <div className={styles.seriesNameRow}>
                  <div className={styles.seriesName} onClick={() => setCurrentSeries(s)}>
                    <span className={styles.seriesCat}>{s.category}</span>
                    <span>{s.title}</span>
                  </div>
                  <button className={styles.delBtn} onClick={deleteSeries}>✕</button>
                </div>
                {s.episodes?.map(ep => (
                  <div key={ep.id}
                    className={`${styles.epItem} ${currentEp?.id === ep.id ? styles.epActive : ''}`}
                    onClick={() => { setCurrentSeries(s); loadEpisode(ep) }}>
                    <span className={styles.epNum}>{ep.ep_number}화</span>
                    <span className={styles.epTitle}>{ep.title}</span>
                    {ep.is_published && <span className={styles.epPub}>●</span>}
                  </div>
                ))}
              </div>
            ))}
            <button className={styles.newBtn} onClick={() => setShowNewSeries(true)}>+ 새 시리즈</button>
            {currentSeries && <button className={styles.newBtn} onClick={() => setShowNewEp(true)}>+ 새 화</button>}
            {currentEp && <button className={`${styles.newBtn} ${styles.delEpBtn}`} onClick={deleteEpisode}>− 현재 화 삭제</button>}
          </div>

          <div className={styles.sSec}>
            <div className={styles.sTitle}>폰트</div>
            <select className={styles.sel} value={font} onChange={e => setFont(e.target.value)}>
              {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <div className={styles.sRow}>
              <span className={styles.sLabel}>크기</span>
              <input type="range" min={13} max={24} value={fontSize} onChange={e => setFontSize(Number(e.target.value))} />
              <span className={styles.sVal}>{fontSize}px</span>
            </div>
            <div className={styles.sRow}>
              <span className={styles.sLabel}>줄간격</span>
              <input type="range" min={14} max={30} value={lineHeight * 10} onChange={e => setLineHeight(Number(e.target.value) / 10)} />
              <span className={styles.sVal}>{lineHeight.toFixed(1)}</span>
            </div>
          </div>

          <div className={styles.sSec}>
            <div className={styles.sTitle}>배경</div>
            <div className={styles.colorGrid}>
              {BG_COLORS.map(c => (
                <div key={c}
                  className={`${styles.cdot} ${bgColor === c ? styles.cdotSel : ''}`}
                  style={{ background: c, outline: c === '#ffffff' ? '0.5px solid #eee' : 'none' }}
                  onClick={() => setBgColor(c)} />
              ))}
            </div>
          </div>

          <div className={styles.sSec}>
            <div className={styles.sTitle}>어두운 테두리</div>
            <div className={styles.sRow}>
              <span className={styles.sLabel}>강도</span>
              <input type="range" min={0} max={100} value={vigIntensity} onChange={e => setVigIntensity(Number(e.target.value))} />
              <span className={styles.sVal}>{vigIntensity}%</span>
            </div>
          </div>
        </div>

        {/* Page Editor */}
        <div className={styles.canvasWrap} style={{ background: bgColor }}>
          <div className={styles.vignette} style={{ background: vigStyle }} />

          <button className={`${styles.pageArrow} ${styles.pageArrowLeft}`}
            onClick={() => changePage(-1)} disabled={currentPage === 0}>‹</button>

          <div className={styles.pageArea}>
            <textarea
              ref={textareaRef}
              className={styles.pageTextarea}
              value={pages[currentPage] || ''}
              onChange={handleTextChange}
              placeholder={currentEp ? '여기에 글을 쓰세요...' : '왼쪽에서 시리즈와 화를 만들어주세요'}
              style={{
                fontFamily: font,
                fontSize: fontSize,
                lineHeight: lineHeight,
                color: isDark ? '#e8e4dc' : '#2a2318',
              }}
            />
          </div>

          <button className={`${styles.pageArrow} ${styles.pageArrowRight}`}
            onClick={() => changePage(1)} disabled={currentPage === pages.length - 1}>›</button>

          <div className={styles.pageFooter}>
            <span className={styles.pagePct}>{pct}%</span>
            <span className={styles.pageNum}>{currentPage + 1} / {pages.length}</span>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showPublish && (
        <div className={styles.modalBg} onClick={() => setShowPublish(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>글 발행</h3>
            <select className={styles.mSel} value={pubType} onChange={e => setPubType(e.target.value as any)}>
              <option value="public">공개</option>
              <option value="password">비밀번호 보호</option>
            </select>
            {pubType === 'password' && (
              <input className={styles.mInput} type="password" placeholder="비밀번호" value={pubPassword} onChange={e => setPubPassword(e.target.value)} />
            )}
            <div className={styles.mBtns}>
              <button onClick={() => setShowPublish(false)}>취소</button>
              <button className={styles.primary} onClick={publishEpisode}>발행하기</button>
            </div>
          </div>
        </div>
      )}

      {showNewSeries && (
        <div className={styles.modalBg} onClick={() => setShowNewSeries(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>새 시리즈</h3>
            <input className={styles.mInput} placeholder="시리즈 제목" value={newSeriesTitle}
              onChange={e => setNewSeriesTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && createSeries()} />
            <select className={styles.mSel} value={newSeriesCategory} onChange={e => setNewSeriesCategory(e.target.value)}>
              <option>소설 시리즈</option><option>단편 시리즈</option>
              <option>에세이 시리즈</option><option>시 시리즈</option><option>기타</option>
            </select>
            <div className={styles.mBtns}>
              <button onClick={() => setShowNewSeries(false)}>취소</button>
              <button className={styles.primary} onClick={createSeries}>만들기</button>
            </div>
          </div>
        </div>
      )}

      {showNewEp && (
        <div className={styles.modalBg} onClick={() => setShowNewEp(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>새 화</h3>
            <input className={styles.mInput} placeholder="화 제목" value={newEpTitle}
              onChange={e => setNewEpTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && createEpisode()} />
            <div className={styles.mBtns}>
              <button onClick={() => setShowNewEp(false)}>취소</button>
              <button className={styles.primary} onClick={createEpisode}>만들기</button>
            </div>
          </div>
        </div>
      )}

      {showProfile && (
        <div className={styles.modalBg} onClick={() => setShowProfile(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>프로필 설정</h3>
            <input className={styles.mInput} placeholder="닉네임" value={profileUsername}
              onChange={e => setProfileUsername(e.target.value)} />
            <textarea className={styles.mTextarea} placeholder="소개글" value={profileBio}
              onChange={e => setProfileBio(e.target.value)} rows={3} />
            <div className={styles.mBtns}>
              <button onClick={() => setShowProfile(false)}>취소</button>
              <button className={styles.primary} onClick={saveProfile}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
