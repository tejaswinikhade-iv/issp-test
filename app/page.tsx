'use client'

import LoadingScreen from '@/components/loading-screen'
import VMTable from '@/components/vm-table'
import useConfig from '@/hooks/use-config'
import { getConfig } from '@/lib/config'
import { useEffect, useState } from 'react'

type Status = 'loading' | 'ready' | 'error'

export default function Home() {
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const { setConfig } = useConfig()

  useEffect(() => {
    let cancelled = false

    async function loadConfig() {
      try {
        const fetchedConfig = await getConfig()
        if (cancelled) return

        if (!fetchedConfig) {
          throw new Error('getConfig() returned no data.')
        }

        setConfig(fetchedConfig)
        setStatus('ready')
      } catch (err) {
        if (cancelled) return
        console.error('Failed to load config:', err)
        setError(err instanceof Error ? err.message : 'Unknown error loading config.')
        setStatus('error')
      }
    }

    loadConfig()

    return () => {
      cancelled = true
    }
  }, [setConfig])

  if (status === 'loading') {
    return <LoadingScreen />
  }

  if (status === 'error') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-8 text-center">
        <h2 className="text-lg font-semibold">Couldn&apos;t load configuration</h2>
        <p className="text-muted-foreground text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 underline"
        >
          Retry
        </button>
      </div>
    )
  }

  return <VMTable />
}