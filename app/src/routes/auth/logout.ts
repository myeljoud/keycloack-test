import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { getOidcConfig, client } from '#/server/oidc'
import {
  SESSION_COOKIE,
  destroySession,
  expireCookie,
  hashToken,
  isSameOrigin,
  readCookie,
} from '#/server/session'

/**
 * RP-initiated logout. POST only (CSRF): kill the server session, revoke the
 * refresh token, then send the browser to Keycloak so its SSO session ends too.
 */
export const Route = createFileRoute('/auth/logout')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isSameOrigin(request)) return new Response('Forbidden', { status: 403 })

        const token = readCookie(request, SESSION_COOKIE)
        const headers = new Headers({ 'Cache-Control': 'no-store' })
        headers.append('Set-Cookie', expireCookie(SESSION_COOKIE))

        let location = '/'
        if (token) {
          const record = await env.SESSIONS.getByName('global').get(await hashToken(token))
          await destroySession(token)
          if (record) {
            const config = await getOidcConfig()
            if (record.tokens.refreshToken) {
              await client.tokenRevocation(config, record.tokens.refreshToken).catch(() => {})
            }
            location = client.buildEndSessionUrl(config, {
              id_token_hint: record.tokens.idToken,
              post_logout_redirect_uri: new URL('/', env.APP_URL).href,
            }).href
          }
        }

        headers.set('Location', location)
        return new Response(null, { status: 303, headers })
      },
    },
  },
})
