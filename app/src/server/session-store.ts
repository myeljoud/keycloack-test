import { DurableObject } from 'cloudflare:workers'
import { getOidcConfig, client } from './oidc'

/** Refresh the access token when it is within this many ms of expiring. */
const REFRESH_SKEW_MS = 30_000

/**
 * Server-side session record. Tokens never leave the Worker; the browser only
 * ever holds the opaque session id (and we only store its SHA-256 hash).
 */
export type SessionRecord = {
  /** Keycloak `sid` claim, used to match back-channel logout tokens. */
  sid: string
  /** Keycloak `sub` claim. */
  sub: string
  user: {
    name?: string
    email?: string
    preferredUsername?: string
    roles: string[]
  }
  tokens: {
    accessToken: string
    refreshToken?: string
    idToken: string
    /** Unix ms when the access token expires. */
    accessTokenExpiresAt: number
  }
  /** Unix ms absolute session expiry. */
  expiresAt: number
}

type Row = { id: string; sid: string; sub: string; data: string; expires_at: number }

/**
 * One SQLite-backed Durable Object holds every session, so revocation by
 * Keycloak `sid` or `sub` (back-channel logout, "log out everywhere") is a
 * single indexed query. For a backoffice this is plenty; shard by user id if
 * it ever becomes a hotspot.
 */
export class SessionStore extends DurableObject<Env> {
  /** In-flight refreshes keyed by session hash, so concurrent requests share one. */
  private refreshing = new Map<string, Promise<SessionRecord | null>>()

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    ctx.blockConcurrencyWhile(async () => {
      ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          sid TEXT NOT NULL,
          sub TEXT NOT NULL,
          data TEXT NOT NULL,
          expires_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS sessions_sid ON sessions (sid);
        CREATE INDEX IF NOT EXISTS sessions_sub ON sessions (sub);
      `)
      if ((await ctx.storage.getAlarm()) === null) {
        await ctx.storage.setAlarm(Date.now() + 60_000)
      }
    })
  }

  async put(idHash: string, record: SessionRecord): Promise<void> {
    this.ctx.storage.sql.exec(
      `INSERT OR REPLACE INTO sessions (id, sid, sub, data, expires_at) VALUES (?, ?, ?, ?, ?)`,
      idHash,
      record.sid,
      record.sub,
      JSON.stringify(record),
      record.expiresAt,
    )
  }

  async get(idHash: string): Promise<SessionRecord | null> {
    const rows = this.ctx.storage.sql
      .exec<Row>(`SELECT * FROM sessions WHERE id = ? AND expires_at > ?`, idHash, Date.now())
      .toArray()
    return rows[0] ? (JSON.parse(rows[0].data) as SessionRecord) : null
  }

  /**
   * Resolve a session, transparently refreshing the Keycloak tokens when the
   * access token is about to expire. Keycloak rotates refresh tokens, so two
   * parallel refreshes would invalidate each other; this object is the single
   * place refreshes happen, and in-flight ones are deduplicated per session.
   * If Keycloak refuses the refresh (session revoked, user disabled), the
   * local session is dropped.
   */
  async resolve(idHash: string): Promise<SessionRecord | null> {
    const record = await this.get(idHash)
    if (!record) return null
    if (record.tokens.accessTokenExpiresAt - Date.now() > REFRESH_SKEW_MS) return record

    const inFlight = this.refreshing.get(idHash)
    if (inFlight) return inFlight

    const task = this.refresh(idHash, record).finally(() => this.refreshing.delete(idHash))
    this.refreshing.set(idHash, task)
    return task
  }

  private async refresh(idHash: string, record: SessionRecord): Promise<SessionRecord | null> {
    if (!record.tokens.refreshToken) {
      await this.delete(idHash)
      return null
    }
    try {
      const config = await getOidcConfig()
      const tokens = await client.refreshTokenGrant(config, record.tokens.refreshToken)
      const refreshed: SessionRecord = {
        ...record,
        tokens: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? record.tokens.refreshToken,
          idToken: tokens.id_token ?? record.tokens.idToken,
          accessTokenExpiresAt: Date.now() + (tokens.expires_in ?? 60) * 1000,
        },
      }
      await this.put(idHash, refreshed)
      return refreshed
    } catch (err) {
      console.warn('Refresh rejected, dropping session', err)
      await this.delete(idHash)
      return null
    }
  }

  async delete(idHash: string): Promise<void> {
    this.ctx.storage.sql.exec(`DELETE FROM sessions WHERE id = ?`, idHash)
  }

  /** Back-channel logout: Keycloak tells us a `sid` (one browser session) ended. */
  async deleteBySid(sid: string): Promise<number> {
    return this.ctx.storage.sql.exec(`DELETE FROM sessions WHERE sid = ?`, sid).rowsWritten
  }

  /** Back-channel logout without `sid`, or admin "log out everywhere": by user. */
  async deleteBySub(sub: string): Promise<number> {
    return this.ctx.storage.sql.exec(`DELETE FROM sessions WHERE sub = ?`, sub).rowsWritten
  }

  async alarm(): Promise<void> {
    this.ctx.storage.sql.exec(`DELETE FROM sessions WHERE expires_at <= ?`, Date.now())
    await this.ctx.storage.setAlarm(Date.now() + 5 * 60_000)
  }
}
