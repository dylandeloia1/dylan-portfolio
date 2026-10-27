# Portfolio Starter

A clean Next.js + TypeScript + Tailwind starting point.

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Structure

- `app/` — pages (App Router): home, `/projects`, `/projects/[slug]`, `/about`
- `components/` — `Nav`, `Footer`, `ProjectCard`
- `lib/projects.ts` — your project data; add entries here to add cards + detail pages

## Next steps

1. Replace placeholder name, email, and GitHub link in `Nav.tsx` / `Footer.tsx`.
2. Add real projects to `lib/projects.ts`.
3. Fill in `app/about/page.tsx` with your actual bio.
4. Drop in the golf game (`golf.html` logic) as a client component under
   `app/projects/putting-green/` once you're ready to make it interactive
   on its own page.
5. Layer in animation (Framer Motion / GSAP) and any 3D work once the
   structure and content are solid — see prior discussion for direction.
