import { listE2ENodes, normalizeE2EStatus } from '@/lib/e2e'
import { NextRequest, NextResponse } from 'next/server'

interface DescribeRequestBody {
	token: string
	projectId: string
	locations: string[]
}

export async function POST(request: NextRequest) {
	let body: DescribeRequestBody

	try {
		body = await request.json()
	} catch {
		return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
	}

	const { token: _token, projectId, locations } = body

	// TODO: reinstate `!token` once real auth is wired up for this route too.
	if (!projectId || !locations?.length) {
		return NextResponse.json(
			{ error: 'Missing required fields: projectId, locations.' },
			{ status: 400 },
		)
	}

	// TODO: replace with real token verification once auth is wired back up
	// (see the commented-out canPerformAction / isAuthorizedEmail pattern in
	// the AWS routes — this should follow the same pattern for consistency).

	try {
		const perLocation = await Promise.all(
			locations.map(async (location) => {
				try {
					const nodes = await listE2ENodes(projectId, location)
					// Shaped to match the AWS EC2 `Instance` object VMTable
					// already knows how to render (InstanceId, State.Name,
					// PublicIpAddress, Tags[]) so no per-provider branching
					// is needed in the table itself. E2E has no equivalent
					// of the iv:self-service:* tags AWS instances carry, so
					// Department/Owner/Termination Date will render blank
					// for these rows until/unless E2E's own label system is
					// mapped in here.
					return nodes.map((node) => ({
						InstanceId: String(node.id),
						State: { Name: normalizeE2EStatus(node.status) },
						PublicIpAddress: node.public_ip_address ?? null,
						Tags: [{ Key: 'Name', Value: node.name }],
						Region: location,
						Provider: 'e2e' as const,
						ProjectId: node.project?.id
							? String(node.project.id)
							: projectId,
					}))
				} catch (err) {
					console.error(`E2E fetch failed for location ${location}:`, err)
					return []
				}
			}),
		)

		const instances = perLocation.flat()

		return NextResponse.json({ instances, count: instances.length })
	} catch (error) {
		console.error('E2E describe error:', error)
		return NextResponse.json(
			{ error: 'Failed to fetch E2E nodes.' },
			{ status: 500 },
		)
	}
}