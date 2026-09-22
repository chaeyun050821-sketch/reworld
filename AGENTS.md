# Fast feature routing

Keep changes narrowly scoped. Do not read all of `src/app/App.tsx` unless a task crosses feature boundaries.

| Task | Start here |
| --- | --- |
| Item pixel conversion, image loading, content bounds | `src/app/item-pixels.ts` |
| Item creator and avatar fitting UI | `src/app/App.tsx` — `ItemCreatorLeftPage`, `ItemPixelEditor`, `ItemCreatorRightPage` |
| Avatar/inventory persistence and placement constraints | `src/lib/shop-storage.ts` |
| Cloud synchronization | `src/lib/user-sync.ts`, `src/lib/shop-sync.ts` |
| Supabase setup | `src/lib/supabase.ts` |

Before editing, use `rg -n` to locate the named component/function; inspect only its immediate dependencies. Run `npm run build` after TypeScript changes.
