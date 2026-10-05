import { useCallback, useEffect, useState } from 'react'
import type { ConnectorOverview } from './integration-types'

export async function integrationAction<T>(action: string, values: Record<string,unknown> = {}): Promise<T> {
  const response=await fetch('/api/integrations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...values})})
  const data=await response.json();if(!response.ok)throw Error(data.error || 'The action failed. Please retry.');return data as T
}
export function useIntegrationOverview() {
  const [data,setData]=useState<ConnectorOverview | null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true)
  const refresh=useCallback(async()=>{setLoading(true);setError('');try{const response=await fetch('/api/integrations');const data=await response.json();if(!response.ok)throw Error(data.error);setData(data)}catch(error){setError(error instanceof Error?error.message:'Unable to load settings.')}finally{setLoading(false)}},[])
  useEffect(()=>{void refresh()},[refresh])
  return {data,setData,error,loading,refresh}
}
