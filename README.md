# reworld

`reworld`는 다이어리 커버를 열면 Y2K 감성의 개인 미니홈피처럼 펼쳐지는 인터랙티브 웹 앱입니다. 프로필, 다이어리, 사진첩, 미니룸, 방명록, 이모티콘룸을 한 권의 다이어리 UI 안에서 탐색할 수 있습니다.

## Features

- 클릭해서 열리는 다이어리 커버 인터랙션
- 양쪽 페이지로 구성된 북 스프레드 레이아웃
- 프로필 정보 수정 UI와 픽셀 아바타 꾸미기
- 다이어리 작성, 공개/비공개 토글, 날씨/스티커 선택
- 사진 업로드와 포토부스 샷 공유
- 방명록 작성 및 게시판 좋아요 인터랙션
- 미니룸, 이웃 방문, 이모티콘 생성/촬영 화면

## Tech Stack

| Area | Stack |
| --- | --- |
| Framework | React 18 |
| Build Tool | Vite 6 |
| Language | TypeScript, TSX |
| Styling | Tailwind CSS 4, CSS variables, inline visual styles |
| Animation | Motion |
| UI Primitives | Radix UI, shadcn-style components |
| Icons / UI Assets | MUI Icons, Lucide React |
| Package Manager | npm |

## Getting Started

### 1. Install dependencies

```bash
npm i
```

### 2. Run dev server

```bash
npm run dev
```

기본 개발 서버 주소:

```text
http://localhost:5173/
```

### 3. Build

```bash
npm run build
```

빌드 결과물은 `dist/`에 생성됩니다.

## Project Structure

```text
.
├── AGENTS/
│   └── architecture.md
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── data.ts
│   │   ├── hooks/
│   │   │   └── useSharedPhotos.ts
│   │   ├── utils/
│   │   │   └── date.ts
│   │   └── components/
│   ├── imports/
│   ├── styles/
│   └── main.tsx
├── index.html
├── package.json
└── vite.config.ts
```

## Architecture Notes

- `src/app/App.tsx`는 전체 화면 구성과 페이지 전환을 담당합니다.
- `src/app/data.ts`는 탭, 다이어리, 방명록, 이웃, 아바타 아이템 같은 정적 데이터를 관리합니다.
- `src/app/hooks/useSharedPhotos.ts`는 사진첩과 포토부스가 공유하는 인메모리 사진 저장소입니다.
- `src/app/utils/date.ts`는 날짜 문자열 포맷 유틸입니다.
- 자세한 구조는 `AGENTS/architecture.md`에 정리되어 있습니다.

## Original Design Source

This project started from a Figma Make bundle:

https://www.figma.com/design/dBSaAXuaTaYEG113fZUkBP/Create-diary-cover-design
