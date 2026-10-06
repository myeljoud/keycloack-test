import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Next Console' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  // Pages may contain per-user data; never let a shared cache keep them.
  headers: () => ({ 'Cache-Control': 'private, no-store' }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-[#f9fafb] font-sans text-[#121314] antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
