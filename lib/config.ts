export interface Config {
	timezone: string
	slack_webhook_url: { org_base: string; notifications_channel: string }
	profiles: Record<string, { regions: string[] }>
	admins: string[]
}

export async function getConfig(): Promise<Config> {
	const res = await fetch('/api/config')
	if (!res.ok) {
		throw new Error('Failed to load configuration.')
	}
	return res.json()
}