# lifegarden

A to-do list application with a twist: finish your work, and grow your garden.  The next best time to plant a tree is ten years ago, and the next best day was yesterday, so you'd best get started, etc.  

Each project gets a zone (biome). Each week you plant a tree — the tree is that week's work. The more tasks you finish the larger the tree grows. Keep working more to plant more trees.

Designed from scratch and vibecoded in a few weekends for personal use as as an experiment. I don't need another generic to-do list app, but wanted one with a visual representation that tracks my life in a way that doesn't feel painfully gameified. I also have a very specific aesthetic to cater to (my own). :) 

The canvas is Three.js with an orthographic isometric camera. Trees are generated procedurally from a seeded PRNG — same tree every time for a given project and week. Biome boundaries are Perlin-warped ellipses that shift slowly as you watch.

**Stack:** React 19, Vite, TypeScript, Tailwind v4, Zustand, Three.js, Framer Motion, Supabase (auth + Postgres), deployed on Vercel.

**Live:** [lifegrdn.vercel.app](https://lifegrdn.vercel.app)

---

To run locally, copy `app/.env.example` to `app/.env.local` and fill in your Supabase credentials, then:

```bash
cd app
npm install
npm run dev
```

The Supabase schema is in `supabase/migrations/`. Run them in order against your project.
