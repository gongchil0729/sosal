'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import styles from './author.module.css'

type Episode = { id: string; ep_number: number; title: string; created_at: string; password: string | null }
type Series = { id: string; title: string; category: string; episodes: Episode[] }
type Profile = { id: string; username: string; bio: string }

export default function AuthorPage() {
  const params = useParams()
  const router = useRouter()
  const username = params.username as string

  const [profile, setProfile] = useState<Profile | null>(null)
  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [openSeries, setOpenSeries] = useState<string[]>([])
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: prof } = await supabase.from('profiles').select('*').eq('username', username).single()
      if (!prof) { setNotFound(true); return }
      setProfile(prof)

      const { data: series } = await supabase
        .from('series')
        .select('*, episodes(*)')
        .eq('author_id', prof.id)
        .order('created_at', { ascending: true })

      if (series) {
        // Only show published episodes to public
        const filtered = series.map(s => ({
          ...s,
          episodes: (s.episodes || []).filter((e: Episode) => true).sort((a: Episode, b: Episode) => a.ep_number - b.ep_number)
        })).filter(s => s.episodes.length > 0)
        setSeriesList(filtered)
      }
    }
    load()
  }, [username])

  function toggleSeries(id: string) {
    setOpenSeries(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  function openEpisode(seriesId: string, ep: Episode) {
    if (ep.password) {
      const input = prompt('비밀번호를 입력하세요')
      if (input !== ep.password) { alert('비밀번호가 틀렸어요'); return }
    }
    router.push(`/viewer/${ep.id}`)
  }

  if (notFound) return (
    <div className={styles.wrap}>
      <div className={styles.notFound}>존재하지 않는 작가예요</div>
    </div>
  )

  if (!profile) return (
    <div className={styles.wrap}>
      <div className={styles.loading}>✦</div>
    </div>
  )

  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <div className={styles.name}>{profile.username}</div>
          <div className={styles.divider} />
          <div className={styles.bio}>{profile.bio || '글을 쓰는 사람'}</div>
        </div>

        <div className={styles.seriesList}>
          {seriesList.length === 0 && (
            <div className={styles.empty}>아직 발행된 글이 없어요</div>
          )}
          {seriesList.map(s => (
            <div key={s.id} className={styles.seriesBlock}>
              <div className={styles.seriesHead} onClick={() => toggleSeries(s.id)}>
                <div className={styles.sLeft}>
                  <span className={styles.sCat}>{s.category}</span>
                  <span className={styles.sTitle}>{s.title}</span>
                  <span className={styles.sCount}>{s.episodes.length}화</span>
                </div>
                <span className={`${styles.arrow} ${openSeries.includes(s.id) ? styles.arrowOpen : ''}`}>∨</span>
              </div>
              <div className={`${styles.epList} ${openSeries.includes(s.id) ? styles.epListOpen : ''}`}>
                {s.episodes.map(ep => (
                  <div key={ep.id} className={styles.epItem} onClick={() => openEpisode(s.id, ep)}>
                    <span className={styles.epNum}>{ep.ep_number}화</span>
                    <span className={styles.epTitle}>{ep.title}</span>
                    <span className={styles.epDate}>{ep.created_at?.slice(0, 10).replace(/-/g, '.')}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
