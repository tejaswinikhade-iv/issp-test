/* eslint-disable @typescript-eslint/no-explicit-any */

const E2E_BASE_URL = 'https://api.e2enetworks.com/myaccount/api/v1'

// Shape returned by GET /nodes/ — trimmed to the fields we actually use.
// E2E's real response has more fields (plan, disk, image, etc.); add as needed.
export interface E2ENode {
	id: number
	name: string
	status: string // e.g. "Running", "Powered off", "Rebooting"
	public_ip_address?: string
	location?: string
	project?: { id: number; name?: string }
	tags?: Record<string, string> | string[]
}

export type E2EActionType = 'power_on' | 'power_off' | 'reboot'

interface E2ECredentials {
	apiKey: string
	token: string
}

function getCredentials(): E2ECredentials {
	const apiKey = process.env.E2E_API_KEY
	const token = process.env.E2E_AUTH_TOKEN

	if (!apiKey || !token) {
		throw new Error(
			'E2E_API_KEY and E2E_AUTH_TOKEN must be set in the server environment.',
		)
	}

	return { apiKey, token }
}

function buildUrl(
	path: string,
	params: Record<string, string | number | undefined>,
) {
	const { apiKey } = getCredentials()
	const url = new URL(`${E2E_BASE_URL}${path}`)
	url.searchParams.set('apikey', apiKey)

	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined) {
			url.searchParams.set(key, String(value))
		}
	}

	return url.toString()
}

function authHeaders() {
	const { token } = getCredentials()
	return {
		Authorization: `Bearer ${token}`,
		'Content-Type': 'application/json',
	}
}

/**
 * Lists all nodes for a project/location. E2E's list endpoint is paginated;
 * this walks all pages. Adjust `per_page` if E2E's default differs.
 */
export async function listE2ENodes(
	projectId: string,
	location: string,
): Promise<E2ENode[]> {
	const allNodes: E2ENode[] = []
	let page = 1
	const perPage = 100

	while (true) {
		const url = buildUrl('/nodes/', {
			project_id: projectId,
			location,
			page_no: page,
			per_page: perPage,
		})

		const res = await fetch(url, { headers: authHeaders() })

		if (!res.ok) {
			const body = await res.text().catch(() => '')
			throw new Error(
				`E2E list nodes failed (${res.status}) for location "${location}": ${body}`,
			)
		}

		const json = await res.json()
		const pageNodes: E2ENode[] = json.data ?? []
		allNodes.push(...pageNodes)

		// Stop when a page comes back short of a full page, or empty.
		if (pageNodes.length < perPage) break
		page += 1

		// Safety valve so a malformed API response can't loop forever.
		if (page > 50) break
	}

	return allNodes
}

/**
 * Performs a power action on a single node.
 *
 * NOTE: verify the HTTP method against your own E2E API examples — docs are
 * inconsistent between PUT (lock_vm, recovery mode) and POST (enable_backup)
 * for different action types. Currently set to PUT; change the `method`
 * value below if your working curl commands use POST instead.
 */
export async function performE2EAction(
	nodeId: string,
	action: E2EActionType,
	projectId: string,
	location: string,
): Promise<any> {
	const url = buildUrl(`/nodes/${nodeId}/actions/`, {
		project_id: projectId,
		location,
	})

	const res = await fetch(url, {
		method: 'PUT', // <-- change to 'POST' here if your API examples use POST
		headers: authHeaders(),
		body: JSON.stringify({ type: action }),
	})

	if (!res.ok) {
		const body = await res.text().catch(() => '')
		throw new Error(
			`E2E action "${action}" on node ${nodeId} failed (${res.status}): ${body}`,
		)
	}

	return res.json()
}

/**
 * Maps E2E's raw node status strings to the same state vocabulary the
 * AWS EC2 side uses, so a shared VMTable component can render both
 * providers without provider-specific branching.
 */
export function normalizeE2EStatus(status: string): string {
	const s = status.toLowerCase()
	if (s.includes('running')) return 'running'
	if (s.includes('power') && s.includes('off')) return 'stopped'
	if (s.includes('reboot')) return 'rebooting'
	if (s.includes('progress') || s.includes('pending')) return 'pending'
	return s
}