'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import styles from './editor.module.css'

const BG_COLORS = ['#ffffff','#faf8f5','#f5f0e8','#fdf6e3','#f0f4f0','#f5f5ff','#1a1a1a','#2d2d2d','#1a1f2e','#1f1a10']
const FONTS = [
  { label: '나눔명조', value: "'Nanum Myeongjo', serif" },
  { label: '노토 세리프', value: "'Noto Serif KR', serif" },
  { label: '함렛', value: "'Hahmlet', serif" },
  { label: '고운돋움', value: "'Gowun Dodum', sans-serif" },
]

type Episode = {
  id?: string
  ep_number: number
  title: string
  content: string
  is_published: boolean
  password?: string
  series_id?: string
  updated_at?: string
}

type Series = {
  id?: string
  title: string
  category: string
  episodes?: Episode[]
}

export default function EditorPage() {
  const router = useRouter()
  const editorRef = useRef<HTMLDivElement>(null)
  const autoSaveTimer = useRef<NodeJS.Timeout>()
  const savedRangeRef = useRef<Range | null>(null)

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [currentSeries, setCurrentSeries] = useState<Series | null>(null)
  const [currentEp, setCurrentEp] = useState<Episode | null>(null)
  const [saveState, setSaveState] = useState('저장됨')

  // Style state
  const [font, setFont] = useState(FONTS[0].value)
  const [fontSize, setFontSize] = useState(16)
  const [lineHeight, setLineHeight] = useState(2.0)
  const [bgColor, setBgColor] = useState('#ffffff')
  const [textColor, setTextColor] = useState('#2a2318')
  const [vigIntensity, setVigIntensity] = useState(0)
  const [pagePadding, setPagePadding] = useState(48)

  // Modal state
  const [showPublish, setShowPublish] = useState(false)
  const [showNewSeries, setShowNewSeries] = useState(false)
  const [showNewEp, setShowNewEp] = useState(false)
  const [showImgModal, setShowImgModal] = useState(false)
  const [pubType, setPubType] = useState<'public' | 'password'>('public')
  const [pubPassword, setPubPassword] = useState('')
  const [newSeriesTitle, setNewSeriesTitle] = useState('')
  const [newSeriesCategory, setNewSeriesCategory] = useState('소설 시리즈')
  const [newEpTitle, setNewEpTitle] = useState('')
  const [imgUrl, setImgUrl] = useState('')
  const [wordCount, setWordCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace('/login'); return }
      setUser(data.user)
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
      setProfile(prof)
      loadSeries(data.user.id)
    })
  }, [router])

  async function loadSeries(userId: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('series')
      .select('*, episodes(*)')
      .eq('author_id', userId)
      .order('created_at', { ascending: true })
    if (data) {
      setSeriesList(data)
      if (data.length > 0 && data[0].episodes?.length > 0) {
        setCurrentSeries(data[0])
        loadEpisode(data[0].episodes[0])
      }
    }
  }

  function loadEpisode(ep: Episode) {
    setCurrentEp(ep)
    if (editorRef.current) editorRef.current.innerHTML = ep.content || ''
    updateWordCount()
  }

  function updateWordCount() {
    if (editorRef.current) {
      setWordCount(editorRef.current.innerText.replace(/\s/g, '').length)
    }
  }

  const autoSave = useCallback(() => {
    setSaveState('저장 중...')
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      if (!currentEp?.id || !editorRef.current) return
      const supabase = createClient()
      await supabase.from('episodes').update({
        content: editorRef.current.innerHTML,
        updated_at: new Date().toISOString()
      }).eq('id', currentEp.id)
      setSaveState('저장됨')
    }, 1500)
  }, [currentEp])

  async function createSeries() {
    if (!user || !newSeriesTitle.trim()) return
    const supabase = createClient()
    const { data } = await supabase.from('series').insert({
      author_id: user.id,
      title: newSeriesTitle.trim(),
      category: newSeriesCategory,
    }).select().single()
    if (data) {
      setSeriesList(prev => [...prev, { ...data, episodes: [] }])
      setCurrentSeries({ ...data, episodes: [] })
      setShowNewSeries(false)
      setNewSeriesTitle('')
    }
  }

  async function createEpisode() {
    if (!user || !currentSeries?.id || !newEpTitle.trim()) return
    const supabase = createClient()
    const epNum = ((currentSeries.episodes?.length || 0) + 1)
    const { data } = await supabase.from('episodes').insert({
      series_id: currentSeries.id,
      author_id: user.id,
      ep_number: epNum,
      title: newEpTitle.trim(),
      content: '',
      is_published: false,
    }).select().single()
    if (data) {
      const updated = { ...currentSeries, episodes: [...(currentSeries.episodes || []), data] }
      setCurrentSeries(updated)
      setSeriesList(prev => prev.map(s => s.id === updated.id ? updated : s))
      loadEpisode(data)
      setShowNewEp(false)
      setNewEpTitle('')
    }
  }

  async function publishEpisode() {
    if (!currentEp?.id) return
    const supabase = createClient()
    await supabase.from('episodes').update({
      is_published: true,
      password: pubType === 'password' ? pubPassword : null,
    }).eq('id', currentEp.id)
    setCurrentEp(prev => prev ? { ...prev, is_published: true } : prev)
    setShowPublish(false)
    setPubPassword('')
    alert('발행되었습니다!')
  }

  function fmt(cmd: string) { document.execCommand(cmd, false, undefined) }

  function insertQuote() {
    document.execCommand('insertHTML', false, '<blockquote style="border-left:2px solid #c9a96e;padding-left:16px;margin:16px 0;color:#aaa;font-style:italic">인용구를 입력하세요</blockquote>')
  }

  function insertHeading() {
    document.execCommand('insertHTML', false, '<h2 style="font-size:1.4em;font-weight:600;margin:20px 0 6px;font-family:var(--font-serif)">제목</h2>')
  }

  function insertHR() {
    document.execCommand('insertHTML', false, '<hr style="border:none;border-top:0.5px solid #d8d0c4;margin:24px 0">')
  }

  function saveRange() {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0)
  }

  function restoreRange() {
    if (!savedRangeRef.current) return
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(savedRangeRef.current)
  }

  function confirmImg() {
    if (!imgUrl.trim()) return
    const ed = editorRef.current
    if (!ed) return
    ed.focus()
    restoreRange()
    document.execCommand('insertHTML', false, `<img src="${imgUrl}" style="max-width:100%;border-radius:4px;margin:16px 0;display:block" alt="">`)
    setImgUrl('')
    setShowImgModal(false)
  }

  const vigStyle = vigIntensity > 0
    ? `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${vigIntensity / 100}) 100%)`
    : 'none'

  const isDark = ['#1a1a1a','#2d2d2d','#1a1f2e','#1f1a10'].includes(bgColor)

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <div className={styles.app}>
      {/* Topbar */}
      <div className={styles.topbar}>
        <span className={styles.brand}>✦ WRITER</span>
        <div className={styles.sep} />
        <button className={styles.tbBtn} onClick={() => router.push(`/author/${profile?.username}`)}>작가 페이지</button>
        <div className={styles.spacer} />
        <span className={styles.saveState}>{saveState}</span>
        <div className={styles.sep} />
        <button className={styles.tbBtnAccent} onClick={() => setShowPublish(true)}>발행</button>
        <button className={styles.tbBtn} onClick={logout}>로그아웃</button>
      </div>

      <div className={styles.main}>
        {/* Sidebar */}
        <div className={styles.sidebar}>

          {/* Series & Episode List */}
          <div className={styles.sSec}>
            <div className={styles.sTitle}>내 글</div>
            {seriesList.map(s => (
              <div key={s.id} className={styles.seriesGroup}>
                <div className={styles.seriesName} onClick={() => setCurrentSeries(s)}>
                  <span className={styles.seriesCat}>{s.category}</span>
                  <span>{s.title}</span>
                </div>
                {s.episodes?.map(ep => (
                  <div
                    key={ep.id}
                    className={`${styles.epItem} ${currentEp?.id === ep.id ? styles.epActive : ''}`}
                    onClick={() => { setCurrentSeries(s); loadEpisode(ep) }}
                  >
                    <span className={styles.epNum}>{ep.ep_number}화</span>
                    <span className={styles.epTitle}>{ep.title}</span>
                    {ep.is_published && <span className={styles.epPub}>●</span>}
                  </div>
                ))}
              </div>
            ))}
            <button className={styles.newBtn} onClick={() => setShowNewSeries(true)}>+ 새 시리즈</button>
            {currentSeries && (
              <button className={styles.newBtn} onClick={() => setShowNewEp(true)}>+ 새 화 추가</button>
            )}
          </div>

          {/* Font */}
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

          {/* Layout */}
          <div className={styles.sSec}>
            <div className={styles.sTitle}>레이아웃</div>
            <div className={styles.sRow}>
              <span className={styles.sLabel}>여백</span>
              <input type="range" min={24} max={80} value={pagePadding} onChange={e => setPagePadding(Number(e.target.value))} />
              <span className={styles.sVal}>{pagePadding}px</span>
            </div>
          </div>

          {/* Background */}
          <div className={styles.sSec}>
            <div className={styles.sTitle}>배경</div>
            <div className={styles.colorGrid}>
              {BG_COLORS.map(c => (
                <div
                  key={c}
                  className={`${styles.cdot} ${bgColor === c ? styles.cdotSel : ''}`}
                  style={{ background: c, outline: c === '#ffffff' ? '0.5px solid #eee' : 'none' }}
                  onClick={() => { setBgColor(c); setTextColor(isDark ? '#2a2318' : '#e8e4dc') }}
                />
              ))}
            </div>
          </div>

          {/* Vignette */}
          <div className={styles.sSec}>
            <div className={styles.sTitle}>어두운 테두리</div>
            <div className={styles.sRow}>
              <span className={styles.sLabel}>강도</span>
              <input type="range" min={0} max={100} value={vigIntensity} onChange={e => setVigIntensity(Number(e.target.value))} />
              <span className={styles.sVal}>{vigIntensity}%</span>
            </div>
          </div>

        </div>

        {/* Editor Canvas */}
        <div className={styles.canvasWrap}>
          <div className={styles.page} style={{ background: bgColor }}>
            <div className={styles.vignette} style={{ background: vigStyle }} />
            <div className={styles.fmtBar}>
              <button className={styles.fmtBtn} onClick={() => fmt('bold')}><b>B</b></button>
              <button className={styles.fmtBtn} onClick={() => fmt('italic')}><i>I</i></button>
              <button className={styles.fmtBtn} onClick={() => fmt('underline')}><u>U</u></button>
              <button className={styles.fmtBtn} onClick={() => fmt('strikeThrough')}><s>S</s></button>
              <button className={styles.fmtBtn} onClick={insertHeading}>H 제목</button>
              <button className={styles.fmtBtn} onClick={insertQuote}>❝ 인용</button>
              <button className={styles.fmtBtn} onClick={insertHR}>— 구분선</button>
              <button className={styles.fmtBtn} onClick={() => { saveRange(); setShowImgModal(true) }}>🖼 이미지</button>
            </div>
            <div style={{ padding: pagePadding }}>
              <div
                ref={editorRef}
                className={styles.editor}
                contentEditable
                suppressContentEditableWarning
                data-placeholder={currentEp ? '여기에 글을 쓰세요...' : '왼쪽에서 시리즈와 화를 만들어보세요'}
                style={{
                  fontFamily: font,
                  fontSize: fontSize,
                  lineHeight: lineHeight,
                  color: isDark ? '#e8e4dc' : '#2a2318',
                }}
                onInput={() => { updateWordCount(); autoSave() }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className={styles.statusBar}>
        <span>{wordCount}자</span>
        <span>{currentEp?.title || '—'}</span>
        <span>{currentEp?.is_published ? '● 발행됨' : '○ 미발행'}</span>
      </div>

      {/* Publish Modal */}
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

      {/* New Series Modal */}
      {showNewSeries && (
        <div className={styles.modalBg} onClick={() => setShowNewSeries(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>새 시리즈</h3>
            <input className={styles.mInput} placeholder="시리즈 제목" value={newSeriesTitle} onChange={e => setNewSeriesTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && createSeries()} />
            <select className={styles.mSel} value={newSeriesCategory} onChange={e => setNewSeriesCategory(e.target.value)}>
              <option>소설 시리즈</option>
              <option>단편 시리즈</option>
              <option>에세이 시리즈</option>
              <option>시 시리즈</option>
              <option>기타</option>
            </select>
            <div className={styles.mBtns}>
              <button onClick={() => setShowNewSeries(false)}>취소</button>
              <button className={styles.primary} onClick={createSeries}>만들기</button>
            </div>
          </div>
        </div>
      )}

      {/* New Episode Modal */}
      {showNewEp && (
        <div className={styles.modalBg} onClick={() => setShowNewEp(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>새 화</h3>
            <input className={styles.mInput} placeholder="화 제목" value={newEpTitle} onChange={e => setNewEpTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && createEpisode()} />
            <div className={styles.mBtns}>
              <button onClick={() => setShowNewEp(false)}>취소</button>
              <button className={styles.primary} onClick={createEpisode}>만들기</button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImgModal && (
        <div className={styles.modalBg} onClick={() => setShowImgModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>이미지 삽입</h3>
            <input className={styles.mInput} placeholder="이미지 URL (https://...)" value={imgUrl} onChange={e => setImgUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmImg()} />
            <div className={styles.mBtns}>
              <button onClick={() => setShowImgModal(false)}>취소</button>
              <button className={styles.primary} onClick={confirmImg}>삽입</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
