import type { Metadata } from 'next'
import './globals.css'
import GatePage from '@/components/GatePage'

export const metadata: Metadata = {
  title: '✦ WRITER',
  description: '나만의 글쓰기 공간',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <GatePage>{children}</GatePage>
      </body>
    </html>
  )
}
