'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import styles from './login.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError('')
    setLoading(true)
    const supabase = createClient()

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('이메일 또는 비밀번호가 틀렸어요')
      else router.replace('/editor')
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError('가입 중 문제가 생겼어요: ' + error.message)
      else setError('가입 완료! 이메일을 확인해주세요.')
    }
    setLoading(false)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.brand}>✦ WRITER</div>
        <div className={styles.tagline}>나만의 글쓰기 공간</div>

        <div className={styles.tabs}>
          <button className={mode === 'login' ? styles.tabActive : styles.tab} onClick={() => setMode('login')}>로그인</button>
          <button className={mode === 'signup' ? styles.tabActive : styles.tab} onClick={() => setMode('signup')}>회원가입</button>
        </div>

        <input
          className={styles.input}
          type="email"
          placeholder="이메일"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />
        <input
          className={styles.input}
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />

        {error && <div className={styles.error}>{error}</div>}

        <button className={styles.submit} onClick={handleSubmit} disabled={loading}>
          {loading ? '...' : mode === 'login' ? '로그인' : '가입하기'}
        </button>
      </div>
    </div>
  )
}
