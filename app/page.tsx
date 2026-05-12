'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import styles from './home.module.css'

type Profile = { id: string; username: string; bio: string }

export default function Home() {
  const router = useRouter()
  const [authors, setAuthors] = useState<Profile[]>([])
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(prof)
      }

      const { data: allProfiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      if (allProfiles) setAuthors(allProfiles)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className={styles.wrap}>
      <div className={styles.topbar}>
        <span className={styles.brand}>✦ WRITER</span>
        <div className={styles.spacer} />
        {user && profile ? (
          <button className={styles.tbBtn} onClick={() => router.push(`/author/${profile.username}`)}>내 페이지</button>
        ) : (
          <>
            <button className={styles.tbBtn} onClick={() => router.push('/login')}>로그인</button>
            <button className={styles.tbBtnAccent} onClick={() => router.push('/login?mode=signup')}>회원가입</button>
          </>
        )}
      </div>

      <div className={styles.inner}>
        <div className={styles.heading}>작가들</div>
        {loading && <div className={styles.empty}>✦</div>}
        {!loading && authors.length === 0 && (
          <div className={styles.empty}>아직 등록된 작가가 없어요</div>
        )}
        <div className={styles.authorList}>
          {authors.map(a => (
            <div key={a.id} className={styles.authorItem} onClick={() => router.push(`/author/${a.username}`)}>
              <div className={styles.authorName}>{a.username}</div>
              <div className={styles.authorBio}>{a.bio || '글을 쓰는 사람'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
