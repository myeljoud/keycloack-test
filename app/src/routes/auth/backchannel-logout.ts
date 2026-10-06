import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import * as jose from 'jose'
import { getOidcConfig } from '#/server/oidc'
import { destroySessionsBySid, destroySessionsBySub } from '#/server/session'

const BACKCHANNEL_EVENT = 'http://schemas.openid.net/event/backchannel-logout'

let jwks: ReturnType<typeof jose.createRemoteJWKSet> | undefined

/**
 * OIDC Back-Channel Logout. Keycloak POSTs a signed logout_token here when an
 * admin ends a session, disables a user, or the user logs out elsewhere. We
 * verify it against Keycloak's JWKS and drop the matching local sessions, so
 * revocation is immediate rather than "when the cookie expires".
 */
export const Route = createFileRoute('/auth/backchannel-logout')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData().catch(() => null)
        const logoutToken = form?.get('logout_token')
        if (typeof logoutToken !== 'string') return bad('missing logout_token')

        const config = await getOidcConfig()
        const jwksUri = config.serverMetadata().jwks_uri
        if (!jwksUri) return bad('issuer has no jwks_uri')
        jwks ??= jose.createRemoteJWKSet(new URL(jwksUri))

        let payload: jose.JWTPayload
        try {
          ;({ payload } = await jose.jwtVerify(logoutToken, jwks, {
            issuer: env.KEYCLOAK_ISSUER,
            audience: env.KEYCLOAK_CLIENT_ID,
            maxTokenAge: '2 minutes',
            requiredClaims: ['iat', 'jti', 'events'],
          }))
        } catch (err) {
          console.warn('Rejected logout_token', err)
          return bad('invalid logout_token')
        }

        const events = payload.events as Record<string, unknown> | undefined
        if (!events || !(BACKCHANNEL_EVENT in events)) return bad('not a logout event')
        if ('nonce' in payload) return bad('logout_token must not contain nonce')
        if (typeof payload.sid !== 'string' && typeof payload.sub !== 'string') {
          return bad('logout_token needs sid or sub')
        }

        const removed =
          typeof payload.sid === 'string'
            ? await destroySessionsBySid(payload.sid)
            : await destroySessionsBySub(payload.sub as string)
        console.info(`Back-channel logout: removed ${removed} session(s)`)

        return new Response(null, { status: 200, headers: { 'Cache-Control': 'no-store' } })
      },
    },
  },
})

function bad(reason: string): Response {
  return new Response(JSON.stringify({ error: 'invalid_request', error_description: reason }), {
    status: 400,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}
