# Architecture

## Overview

This project is a Vite React single-page app for an interactive diary cover and book-spread experience. The UI is mostly self-contained in `src/app/App.tsx`, with static domain data, shared hooks, and date formatting split into small support modules.

The app has no backend. User interactions are kept in browser memory through React state and a small module-level photo store.

## Runtime Entry

- `index.html` mounts the app into `#root`.
- `src/main.tsx` creates the React root and imports global styles from `src/styles/index.css`.
- `src/app/App.tsx` owns the top-level page state:
  - `cover`: closed diary cover.
  - `spread`: open two-page diary layout.

## Source Layout

- `src/app/App.tsx`
  - Main app composition and page components.
  - Contains the cover, spread layout, profile, diary, photo album, guestbook, mini room, board, avatar editor, and emoticon room views.
- `src/app/data.ts`
  - Static UI/domain data and shared TypeScript types.
  - Includes tabs, profile fields, avatar items, emoticons, diary entries, guestbook entries, neighbors, board posts, palettes, and photo-booth gradients.
- `src/app/hooks/useSharedPhotos.ts`
  - In-memory shared photo store used by the photo booth and photo album.
  - Uses React effect cleanup so subscribers are removed when components unmount.
- `src/app/utils/date.ts`
  - Date string formatting helpers for dotted dates, ISO dates, and diary display dates.
- `src/app/components/ui/*`
  - Generated shadcn/Radix-style UI primitives. They are currently available but mostly unused by the custom diary UI.
- `src/app/components/figma/ImageWithFallback.tsx`
  - Figma support component for image fallback behavior.
- `src/styles/*`
  - Tailwind entry, theme tokens, font imports, and global CSS.
- `src/imports/image.png`
  - Imported bitmap asset from the original design bundle.

## State Model

Most state is local to each page component:

- `App` switches between cover and spread.
- `SpreadPage` tracks the active bookmark tab.
- `LeftPage`, `HomeLeftPage`, and `HomeBoardSection` keep local edit, BGM, and like state.
- `DiaryPage` keeps in-memory diary entries, privacy, weather, text, and selected stickers.
- `GuestbookPage` keeps in-memory guestbook entries and form state.
- `ProfileAvatarPage` keeps equipped avatar items and pixel editor visibility.
- `EmoticonRoomPage` switches between the room landing, maker, and photo booth.
- `PhotoBoothPage` creates generated gradient shots and pushes them into `useSharedPhotos`.
- `PhotoPage` reads shared shots and local uploaded images.

There is no persistence across page reloads. Adding persistence should be done behind small hooks first, not directly inside the large page components.

## Data Flow

The app is mostly top-down:

1. `App` renders `CoverPage` or `SpreadPage`.
2. `SpreadPage` owns the selected tab and passes it to `RightPage`.
3. `RightPage` selects the tab-specific page component.
4. Tab pages use local state and imported static data from `data.ts`.
5. The photo booth and photo album communicate through `useSharedPhotos`.

## Styling

Styling is currently inline-heavy because the code was exported from a visual design workflow. Tailwind utility classes are used for layout primitives, while gradients, pixel-art details, and animation-specific values stay inline.

When refactoring styles:

- Keep visual behavior stable.
- Move repeated values into small constants only when they are reused meaningfully.
- Avoid changing generated `src/app/components/ui/*` files unless a primitive itself is broken.

## Build And Run

- Install dependencies: `npm i`
- Start development server: `npm run dev`
- Build production bundle: `npm run build`

The Vite config keeps the Figma asset resolver, React plugin, Tailwind plugin, and `@` alias to `src`.

## Extension Guidelines

- Add new static diary/domain data to `src/app/data.ts`.
- Add reusable stateful behavior to `src/app/hooks`.
- Add pure formatting or parsing helpers to `src/app/utils`.
- Keep new feature components small enough to move out of `App.tsx` when they gain their own state or repeated subcomponents.
- Treat `src/app/components/ui` as a generated component library boundary.
