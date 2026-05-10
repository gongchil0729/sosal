'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace('/editor')
      else router.replace('/login')
    })
  }, [router])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--faint)', letterSpacing: 3 }}>✦</span>
    </div>
  )
}
