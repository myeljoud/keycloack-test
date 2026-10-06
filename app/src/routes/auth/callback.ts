import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { getOidcConfig, client } from '#/server/oidc'
import {
  FLOW_COOKIE,
  SESSION_COOKIE,
  createSession,
  expireCookie,
  readCookie,
  serializeCookie,
  type AuthFlow,
} from '#/server/session'
import type { SessionRecord } from '#/server/session-store'

/**
 * Keycloak sends the browser back here with `code` and `state`. The Worker
 * exchanges the code (client secret + PKCE verifier), verifies the ID token
 * (signature, iss, aud, nonce, exp) and mints an opaque session cookie.
 */
export const Route = createFileRoute('/auth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const raw = readCookie(request, FLOW_COOKIE)
        if (!raw) return deny('Login flow expired. Please try again.')
        let flow: AuthFlow
        try {
          flow = JSON.parse(atob(raw))
        } catch {
          return deny('Invalid login flow cookie.')
        }

        const config = await getOidcConfig()
        let tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
        try {
          tokens = await client.authorizationCodeGrant(config, new URL(request.url), {
            pkceCodeVerifier: flow.codeVerifier,
            expectedState: flow.state,
            expectedNonce: flow.nonce,
            idTokenExpected: true,
          })
        } catch (err) {
          console.error('Token exchange failed', err)
          return deny('Sign-in could not be completed.')
        }

        const claims = tokens.claims()
        if (!claims?.sub || !tokens.id_token) return deny('Missing ID token claims.')

        const realmAccess = claims.realm_access as { roles?: string[] } | undefined
        const ttlMs = Number(env.SESSION_TTL_SECONDS) * 1000
        const record: SessionRecord = {
          sid: typeof claims.sid === 'string' ? claims.sid : '',
          sub: claims.sub,
          user: {
            name: typeof claims.name === 'string' ? claims.name : undefined,
            email: typeof claims.email === 'string' ? claims.email : undefined,
            preferredUsername:
              typeof claims.preferred_username === 'string' ? claims.preferred_username : undefined,
            roles: realmAccess?.roles ?? [],
          },
          tokens: {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            idToken: tokens.id_token,
            accessTokenExpiresAt: Date.now() + (tokens.expires_in ?? 60) * 1000,
          },
          expiresAt: Date.now() + ttlMs,
        }

        const token = await createSession(record)
        const headers = new Headers({ Location: flow.returnTo, 'Cache-Control': 'no-store' })
        headers.append('Set-Cookie', serializeCookie(SESSION_COOKIE, token, Number(env.SESSION_TTL_SECONDS)))
        headers.append('Set-Cookie', expireCookie(FLOW_COOKIE))
        return new Response(null, { status: 302, headers })
      },
    },
  },
})

function deny(message: string): Response {
  const headers = new Headers({ 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
  headers.append('Set-Cookie', expireCookie(FLOW_COOKIE))
  return new Response(message, { status: 400, headers })
}
