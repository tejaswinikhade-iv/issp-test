'use server'

import fs from 'node:fs/promises'
import path from 'node:path'
import { cache } from 'react'
import YAML from 'yaml'

export interface Config {
	timezone: string
	slack_webhook_url: { org_base: string; notifications_channel: string }
	profiles: Record<string, { regions: string[] }>
	admins: string[]
}

export const getConfig = cache(async (): Promise<Config> => {
	const filePath = path.join(process.cwd(), 'config.yml')

	try {
		const fileContents = await fs.readFile(filePath, 'utf8')
		const data = YAML.parse(fileContents) as Config
		return data
	} catch (error) {
		console.error('Error reading or parsing config.yml:', error)
		throw new Error('Failed to load configuration.')
	}
})
