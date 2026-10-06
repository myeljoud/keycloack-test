import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import { resolveSession, SESSION_COOKIE } from './session'

export type CurrentUser = {
  sub: string
  name?: string
  email?: string
  preferredUsername?: string
  roles: string[]
  /** Demo only: shows that the server, not the browser, holds the token. */
  accessTokenExpiresInSeconds: number
}

/** The one place UI code asks "who is logged in?". Tokens are never returned. */
export const getCurrentUser = createServerFn({ method: 'GET' }).handler(
  async (): Promise<CurrentUser | null> => {
    const session = await resolveSession(getCookie(SESSION_COOKIE))
    if (!session) return null
    return {
      sub: session.sub,
      ...session.user,
      accessTokenExpiresInSeconds: Math.max(
        0,
        Math.round((session.tokens.accessTokenExpiresAt - Date.now()) / 1000),
      ),
    }
  },
)
