import { Link, createFileRoute } from '@tanstack/react-router'
import { getCurrentUser } from '#/server/auth.fns'

export const Route = createFileRoute('/')({
  loader: () => getCurrentUser(),
  component: Home,
})

function Home() {
  const user = Route.useLoaderData()
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Next Console</h1>
      <p className="text-center text-sm text-[#6b6d76]">
        Backend-for-frontend proof of concept: Keycloak hosts the login, the Worker holds the tokens,
        the browser only gets an opaque cookie.
      </p>
      {user ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm">
            Signed in as <strong>{user.preferredUsername ?? user.email}</strong>
          </p>
          <Link to="/dashboard" className="text-sm text-[#1140a4] underline">
            Open the dashboard
          </Link>
        </div>
      ) : (
        <a
          href="/auth/login?returnTo=/dashboard"
          className="rounded-md bg-[#5b5b5b] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a4a4a]"
        >
          Sign in with Keycloak
        </a>
      )}
    </main>
  )
}
