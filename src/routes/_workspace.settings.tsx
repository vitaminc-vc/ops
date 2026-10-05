import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentUser } from '@/lib/session'
import { SettingsPage } from '@/components/settings-page'
export const Route=createFileRoute('/_workspace/settings')({beforeLoad:async()=>{if((await getCurrentUser())?.role!=='admin')throw redirect({to:'/'})},component:SettingsPage})
