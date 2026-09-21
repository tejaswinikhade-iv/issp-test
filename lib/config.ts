export interface VMProfile {
	provider: 'aws' | 'e2e'
	regions: string[] // AWS: region codes. E2E: location names (e.g. "Delhi")
	projectId?: string // required when provider === 'e2e'
}

export interface Config {
	timezone: string
	slack_webhook_url: { org_base: string; notifications_channel: string }
	profiles: Record<string, VMProfile>
	admins: string[]
}

export async function getConfig(): Promise<Config> {
	const res = await fetch('/api/config')
	if (!res.ok) {
		throw new Error('Failed to load configuration.')
	}
	return res.json()
}