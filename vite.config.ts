import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tripSlugs } from './src/tripSlugs'

interface FirestoreField {
  stringValue?: string
  integerValue?: string
}

// The public trip list (app/data, readable without signing in), as the live site uses it
async function fetchTrips(projectId: string) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/app/data`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Firestore responded ${res.status}`)
  const doc = (await res.json()) as {
    fields?: { trips?: { arrayValue?: { values?: { mapValue: { fields: Record<string, FirestoreField> } }[] } } }
  }
  return (doc.fields?.trips?.arrayValue?.values ?? [])
    .map(({ mapValue: { fields: f } }) => ({
      id: f.id?.stringValue ?? '',
      year: Number(f.year?.integerValue),
      month: Number(f.month?.integerValue ?? 0),
      location: f.location?.stringValue ?? '',
    }))
    .filter((trip) => trip.id && trip.location && trip.year)
}

// GitHub Pages only serves files. After building, copy index.html to each trip's guide
// address (e.g. 2026-columbia/guide/index.html) so shared links return 200 and get link
// previews, and to 404.html so any other address still loads the app. Trips added later get
// their page on the next deploy; until then their links still work through 404.html.
function guidePages(): Plugin {
  let outDir = 'dist'
  let projectId: string | undefined
  return {
    name: 'ugl-guide-pages',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
      projectId = loadEnv(config.mode, config.root, 'VITE_').VITE_FIREBASE_PROJECT_ID
    },
    async closeBundle() {
      const html = await readFile(join(outDir, 'index.html'), 'utf8')
      await writeFile(join(outDir, '404.html'), html)
      if (!projectId) {
        this.warn('VITE_FIREBASE_PROJECT_ID is not set; skipping guide pages')
        return
      }
      try {
        const slugs = [...tripSlugs(await fetchTrips(projectId)).values()]
        for (const slug of slugs) {
          await mkdir(join(outDir, slug, 'guide'), { recursive: true })
          await writeFile(join(outDir, slug, 'guide', 'index.html'), html)
        }
        console.log(`guide pages: ${slugs.map((slug) => `${slug}/guide`).join(', ') || 'none'}`)
      } catch (err) {
        this.warn(`Couldn't load trips for guide pages (links still work via 404.html): ${err}`)
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/ugl-selector/',
  plugins: [react(), tailwindcss(), guidePages()],
})
