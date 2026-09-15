/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { Config } from '@/lib/config'
import { createContext, useContext, useState } from 'react'

interface ConfigProps {
	config: Config
	setConfig: React.Dispatch<React.SetStateAction<Config>>
}

const ConfigContext = createContext({})

export function ConfigContextProvider({
	children,
}: {
	children: React.ReactNode
}) {
	const [config, setConfig] = useState<any | null>(null)

	return (
		<ConfigContext.Provider value={{ config, setConfig }}>
			{children}
		</ConfigContext.Provider>
	)
}

export default function useConfig() {
	return useContext(ConfigContext) as ConfigProps
}
