import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'
import type { getAuth } from '../server/auth'

// Relative URLs keep cookies on the same origin as the TanStack Start app.
export const authClient = createAuthClient({ plugins: [inferAdditionalFields<ReturnType<typeof getAuth>>() ] })
