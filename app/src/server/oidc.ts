import * as client from 'openid-client'
import { env } from 'cloudflare:workers'

let configPromise: Promise<client.Configuration> | undefined

/**
 * Discover Keycloak once per isolate and cache the Configuration.
 * The client secret only ever lives here, on the Worker.
 */
export function getOidcConfig(): Promise<client.Configuration> {
  configPromise ??= client
    .discovery(
      new URL(env.KEYCLOAK_ISSUER),
      env.KEYCLOAK_CLIENT_ID,
      undefined,
      client.ClientSecretPost(env.KEYCLOAK_CLIENT_SECRET),
      {
        // Local Keycloak runs on plain http. Never set this in production.
        execute: env.KEYCLOAK_ISSUER.startsWith('http://') ? [client.allowInsecureRequests] : [],
      },
    )
    .catch((err) => {
      configPromise = undefined
      throw err
    })
  return configPromise
}

export { client }
