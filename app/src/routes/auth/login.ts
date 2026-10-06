import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { getOidcConfig, client } from '#/server/oidc'
import { FLOW_COOKIE, safeReturnTo, serializeCookie, type AuthFlow } from '#/server/session'

/**
 * Start the Authorization Code + PKCE flow. The Worker builds the request,
 * pushes it to Keycloak (PAR) and redirects the browser to the themed
 * Keycloak login page. No password ever touches this app.
 */
export const Route = createFileRoute('/auth/login')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const config = await getOidcConfig()
        const url = new URL(request.url)

        const flow: AuthFlow = {
          state: client.randomState(),
          nonce: client.randomNonce(),
          codeVerifier: client.randomPKCECodeVerifier(),
          returnTo: safeReturnTo(url.searchParams.get('returnTo')),
        }

        const params: Record<string, string> = {
          redirect_uri: new URL('/auth/callback', env.APP_URL).href,
          scope: 'openid profile email',
          state: flow.state,
          nonce: flow.nonce,
          code_challenge: await client.calculatePKCECodeChallenge(flow.codeVerifier),
          code_challenge_method: 'S256',
        }
        const loginHint = url.searchParams.get('login_hint')
        if (loginHint) params.login_hint = loginHint

        // PAR: the browser only ever sees an opaque request_uri.
        const authorizationUrl = config.serverMetadata().pushed_authorization_request_endpoint
          ? await client.buildAuthorizationUrlWithPAR(config, params)
          : client.buildAuthorizationUrl(config, params)

        return new Response(null, {
          status: 302,
          headers: {
            Location: authorizationUrl.href,
            'Set-Cookie': serializeCookie(FLOW_COOKIE, btoa(JSON.stringify(flow)), 600),
            'Cache-Control': 'no-store',
          },
        })
      },
    },
  },
})
