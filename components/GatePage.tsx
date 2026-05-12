'use client'
import { useEffect, useState } from 'react'
import styles from './gate.module.css'

const SITE_PASSWORD_KEY = 'writer_site_auth'

export default function GatePage({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(true)
  const sitePassword = process.env.NEXT_PUBLIC_SITE_PASSWORD

  useEffect(() => {
    if (!sitePassword) { setAuthed(true); setChecking(false); return }
    const stored = sessionStorage.getItem(SITE_PASSWORD_KEY)
    if (stored === sitePassword) { setAuthed(true) }
    setChecking(false)
  }, [sitePassword])

  function handleSubmit() {
    if (input === sitePassword) {
      sessionStorage.setItem(SITE_PASSWORD_KEY, input)
      setAuthed(true)
      setError(false)
    } else {
      setError(true)
      setInput('')
    }
  }

  if (checking) return null
  if (authed) return <>{children}</>

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.brand}>✦ WRITER</div>
        <div className={styles.desc}>비밀번호를 입력해주세요</div>
        <input
          className={`${styles.input} ${error ? styles.inputError : ''}`}
          type="password"
          placeholder="비밀번호"
          value={input}
          onChange={e => { setInput(e.target.value); setError(false) }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />
        {error && <div className={styles.error}>비밀번호가 틀렸어요</div>}
        <button className={styles.btn} onClick={handleSubmit}>입장</button>
      </div>
    </div>
  )
}
