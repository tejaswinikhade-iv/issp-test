'use client'

import LoadingScreen from '@/components/loading-screen'
import VMTable from '@/components/vm-table'
import useConfig from '@/hooks/use-config'
import { getConfig } from '@/lib/config'
import { useEffect, useState } from 'react'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const { setConfig } = useConfig()

  useEffect(() => {
    async function loadConfig() {
      const fetchedConfig = await getConfig()
      setConfig(fetchedConfig)
    }
    loadConfig()
    setMounted(true)
  }, [setConfig])

  return mounted ? <VMTable /> : <LoadingScreen />
}
