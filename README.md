# ✦ WRITER — 배포 가이드

나만의 글쓰기 사이트입니다. Next.js + Supabase + Vercel 조합으로 만들어졌어요.

---

## 1단계 — Supabase 설정 (데이터베이스)

1. https://supabase.com 에서 가입 (무료)
2. **New Project** 클릭 → 프로젝트 이름 입력 → 비밀번호 설정 → Create
3. 프로젝트 생성 후 왼쪽 메뉴 **SQL Editor** 클릭
4. `supabase-schema.sql` 파일 내용을 전체 복붙 → **Run** 클릭
5. 왼쪽 메뉴 **Settings → API** 에서:
   - `Project URL` 복사
   - `anon public` key 복사

---

## 2단계 — GitHub에 코드 올리기

1. https://github.com 가입 (없으면)
2. **New Repository** 클릭 → 이름 입력 → Create
3. 이 폴더(writer-app) 전체를 GitHub에 업로드

> 코딩 모르셔도 GitHub Desktop 앱 쓰면 드래그앤드롭으로 올릴 수 있어요.
> https://desktop.github.com

---

## 3단계 — Vercel 배포

1. https://vercel.com 에서 GitHub 계정으로 가입
2. **New Project** → GitHub 저장소 선택 → Import
3. **Environment Variables** 에 추가:
   ```
   NEXT_PUBLIC_SUPABASE_URL = (1단계에서 복사한 URL)
   NEXT_PUBLIC_SUPABASE_ANON_KEY = (1단계에서 복사한 key)
   ```
4. **Deploy** 클릭

배포 완료! `https://프로젝트이름.vercel.app` 주소로 접속 가능해요.

---

## 이후 수정하는 방법

코드를 수정하고 GitHub에 다시 올리면 → Vercel이 자동으로 사이트를 업데이트해요.

Claude Code (https://claude.ai/code) 를 쓰면 "이 버튼 색 바꿔줘" 같이 말로 수정할 수 있어요.

---

## 파일 구조

```
writer-app/
├── app/
│   ├── page.tsx          # 홈 (로그인 여부에 따라 리다이렉트)
│   ├── login/            # 로그인 / 회원가입
│   ├── editor/           # 글쓰기 에디터
│   ├── author/[username] # 작가 공개 페이지
│   └── viewer/[id]       # 글 뷰어
├── lib/
│   └── supabase.ts       # Supabase 연결
├── supabase-schema.sql   # DB 테이블 설정
└── .env.local.example    # 환경변수 템플릿
```
