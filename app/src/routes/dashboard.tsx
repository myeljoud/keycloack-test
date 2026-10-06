import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentUser } from '#/server/auth.fns'

export const Route = createFileRoute('/dashboard')({
  // UX guard only. Real enforcement is in the server functions and routes,
  // which resolve the session themselves on every call.
  beforeLoad: async ({ location }) => {
    const user = await getCurrentUser()
    if (!user) {
      throw redirect({ href: `/auth/login?returnTo=${encodeURIComponent(location.href)}` })
    }
    return { user }
  },
  component: Dashboard,
})

function Dashboard() {
  const { user } = Route.useRouteContext()
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <form method="post" action="/auth/logout">
          <button
            type="submit"
            className="rounded-md border border-[#dddee1] bg-white px-3 py-1.5 text-sm font-medium hover:bg-[#f3f4f6]"
          >
            Log out
          </button>
        </form>
      </header>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl border border-[#dddee1] bg-white p-5 text-sm shadow-sm">
        <dt className="text-[#6b6d76]">Name</dt>
        <dd>{user.name ?? '—'}</dd>
        <dt className="text-[#6b6d76]">Username</dt>
        <dd>{user.preferredUsername ?? '—'}</dd>
        <dt className="text-[#6b6d76]">Email</dt>
        <dd>{user.email ?? '—'}</dd>
        <dt className="text-[#6b6d76]">Roles</dt>
        <dd>{user.roles.join(', ') || '—'}</dd>
        <dt className="text-[#6b6d76]">Subject</dt>
        <dd className="break-all font-mono text-xs">{user.sub}</dd>
        <dt className="text-[#6b6d76]">Access token</dt>
        <dd>held by the Worker, expires in {user.accessTokenExpiresInSeconds}s</dd>
      </dl>
      <p className="text-xs text-[#6b6d76]">
        Reload after the access token expires to watch the server refresh it silently. Log the
        session out from the Keycloak admin console to see back-channel logout end it here.
      </p>
    </main>
  )
}
