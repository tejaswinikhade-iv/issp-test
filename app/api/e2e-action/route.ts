/* eslint-disable @typescript-eslint/no-explicit-any */

import { sendSlackNotification } from '@/lib/notifications'
import { getName } from '@/lib/utils'
import { E2EActionType, performE2EAction } from '@/lib/e2e'
import { NextRequest, NextResponse } from 'next/server'

interface ActionRequestBody {
	token: string
	action: 'start' | 'stop' | 'reboot'
	nodeId: string
	nodeName?: string
	projectId: string
	location: string
	notificationsChannel?: string
}

const ACTION_MAP: Record<ActionRequestBody['action'], E2EActionType> = {
	start: 'power_on',
	stop: 'power_off',
	reboot: 'reboot',
}

export async function POST(request: NextRequest) {
	let parsedBody: ActionRequestBody | null = null

	try {
		parsedBody = (await request.json()) as ActionRequestBody
		const { action, nodeId, nodeName, projectId, location, notificationsChannel } =
			parsedBody

		if (!token || !action || !nodeId || !projectId || !location) {
			return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
		}

		if (!(action in ACTION_MAP)) {
			return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 })
		}

		const userEmail = 'system-user'

		const e2eAction = ACTION_MAP[action]
		const result = await performE2EAction(nodeId, e2eAction, projectId, location)

		const displayName = nodeName ? `*${nodeName}* (${nodeId})` : `*${nodeId}*`

		try {
			await sendSlackNotification(
				`*${getName(userEmail) || userEmail}* initiated *${action}* for ${displayName} [E2E].`,
				notificationsChannel,
			)
		} catch (slackError) {
			console.error('Slack notification failed:', slackError)
		}

		return NextResponse.json({
			message: `Successfully initiated ${action} for node: ${nodeId}`,
			details: result,
		})
	} catch (error: any) {
		console.error('Error during E2E action handler:', error)

		if (error instanceof SyntaxError) {
			return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 })
		}

		return NextResponse.json(
			{ error: error.message || 'An unexpected error occurred.' },
			{ status: 500 },
		)
	}
}