import { env } from 'cloudflare:workers'
import type { SessionRecord } from './session-store'

const isHttps = env.APP_URL.startsWith('https://')
// `__Host-` locks the cookie to this origin and path and requires Secure.
// Safari refuses Secure cookies on plain http://localhost, so only use the
// prefix when the app itself is served over https.
export const SESSION_COOKIE = isHttps ? '__Host-session' : 'session'
export const FLOW_COOKIE = isHttps ? '__Host-auth_flow' : 'auth_flow'

/** Short-lived state carried between /auth/login and /auth/callback. */
export type AuthFlow = {
  state: string
  nonce: string
  codeVerifier: string
  returnTo: string
}

const base = `Path=/; HttpOnly; SameSite=Lax${isHttps ? '; Secure' : ''}`

export function serializeCookie(name: string, value: string, maxAgeSeconds: number): string {
  return `${name}=${value}; Max-Age=${maxAgeSeconds}; ${base}`
}

export function expireCookie(name: string): string {
  return `${name}=; Max-Age=0; ${base}`
}

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie')
  if (!header) return undefined
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return undefined
}

const encoder = new TextEncoder()

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function randomToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return toBase64Url(bytes)
}

/** The store only ever sees the hash, so a dumped table cannot forge cookies. */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(token))
  return toBase64Url(new Uint8Array(digest))
}

function store() {
  return env.SESSIONS.getByName('global')
}

export async function createSession(record: SessionRecord): Promise<string> {
  const token = randomToken()
  await store().put(await hashToken(token), record)
  return token
}

export async function destroySession(token: string): Promise<void> {
  await store().delete(await hashToken(token))
}

export async function destroySessionsBySid(sid: string): Promise<number> {
  return store().deleteBySid(sid)
}

export async function destroySessionsBySub(sub: string): Promise<number> {
  return store().deleteBySub(sub)
}

/** Resolve the session behind a cookie token (refreshing tokens if needed). */
export async function resolveSession(token: string | undefined): Promise<SessionRecord | null> {
  if (!token) return null
  return store().resolve(await hashToken(token))
}

/** Only forward a request to a mutating endpoint if it came from our own origin. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin') ?? request.headers.get('referer')
  if (!origin) return false
  return new URL(origin).origin === new URL(env.APP_URL).origin
}

/** Keep `returnTo` on-site: a relative path only, never an absolute URL. */
export function safeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/'
  return value
}
