// Vercel hosting, the owner's copy at app.catan.silachev.com: the same static build, served the way
// docker/nginx.conf serves it. Import the repo into Vercel and this file is the whole setup.
import { routes, type VercelConfig } from '@vercel/config/v1'

/** The headers docker/security-headers.inc sends, plus noindex: the landing page is the public face. */
const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value:
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; manifest-src 'self'; worker-src 'self'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'",
  },
  { key: 'X-Robots-Tag', value: 'noindex' },
]

export const config: VercelConfig = {
  framework: 'vite',
  installCommand: 'npm ci',
  buildCommand: 'npm run build',
  outputDirectory: 'dist',
  headers: [
    routes.header('/(.*)', SECURITY_HEADERS),
    // The app shell, the service worker and the manifest are always revalidated, so updates
    // reach players.
    routes.cacheControl('/((?!assets/).*)', { noCache: true }),
    // Content-hashed build output never changes.
    routes.cacheControl('/assets/(.*)', { public: true, maxAge: '1year', immutable: true }),
  ],
  // Unknown paths fall back to the single-page app (files that exist are served first). A missing
  // build or service-worker file stays a 404, as in docker/nginx.conf: served as the page, it
  // would be cached for a year under /assets/.
  rewrites: [
    routes.rewrite(
      '/((?!assets/|sw\\.js|registerSW\\.js|workbox-|manifest\\.webmanifest).*)',
      '/index.html',
    ),
  ],
}
