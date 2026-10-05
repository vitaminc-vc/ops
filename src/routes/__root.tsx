import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { MotionConfig } from 'motion/react'
import '@/styles.css'

export const Route = createRootRoute({
  head: () => ({ meta: [
    { charSet: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { title: 'Vitamin-C' },
    { name: 'description', content: 'Vitamin-C brain, portfolio management, and LP Engine.' },
  ] }),
  component: Root,
  notFoundComponent: () => <div className="page"><h1>Page not found</h1><a href="/">Return to Vitamin-C brain</a></div>,
  errorComponent: ({ reset }) => <div className="page"><h1>Something went wrong</h1><p>Unable to open the workspace. Please try again.</p><button className="button primary" onClick={reset}>Try again</button></div>,
})

function Root() {
  return <html lang="en"><head><HeadContent /></head><body>
    <MotionConfig reducedMotion="user"><Outlet /></MotionConfig>
    <Scripts />
  </body></html>
}
