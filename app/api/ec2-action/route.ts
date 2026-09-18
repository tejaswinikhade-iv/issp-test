/* eslint-disable @typescript-eslint/no-explicit-any */

// import { canPerformAction, fetchGoogleUserEmail } from '@/lib/auth'
import { sendSlackNotification } from '@/lib/notifications'
import { findTag, getName } from '@/lib/utils'
import {
	type RebootInstancesCommandOutput,
	type StartInstancesCommandOutput,
	type StopInstancesCommandOutput,
	DescribeInstancesCommand,
	EC2Client,
	RebootInstancesCommand,
	StartInstancesCommand,
	StopInstancesCommand,
} from '@aws-sdk/client-ec2'
import { NextRequest, NextResponse } from 'next/server'

interface ActionRequestBody {
	token: string
	action: 'start' | 'stop' | 'reboot'
	instanceId: string
	region: string
	awsAccount: string
}

async function getInstanceDetails(ec2Client: EC2Client, instanceId: string) {
	const command = new DescribeInstancesCommand({ InstanceIds: [instanceId] })
	const { Reservations = [] } = await ec2Client.send(command)

	const instance = Reservations[0]?.Instances?.[0]
	if (!instance) {
		throw new Error(`Instance "${instanceId}" not found.`)
	}

	const name = findTag('Name', instance, false)
	const displayName = name ? `*${name}* (${instanceId})` : `*${instanceId}*`

	const ownershipInfo = findTag('iv:self-service:ownership', instance)
	const notificationsChannel = ownershipInfo.notificationsChannel

	return {
		displayName,
		notificationsChannel,
		tags: instance.Tags || [],
	}
}

export async function POST(request: NextRequest) {
	let parsedBody: ActionRequestBody | null = null

	try {
		parsedBody = (await request.json()) as ActionRequestBody
		const { token, action, instanceId, region, awsAccount } = parsedBody

		if (!token || !action || !instanceId || !region || !awsAccount) {
			return NextResponse.json(
				{ error: 'Invalid request.' },
				{ status: 400 },
			)
		}

		const userEmail = 'system-user'
		// const userEmail = await fetchGoogleUserEmail(token).catch(() => {
		// 	console.warn('Could not fetch user email from token.')
		// 	return 'unknown user'
		// })

		const ec2Client = new EC2Client({ region, profile: awsAccount })

		const {
			displayName,
			notificationsChannel,
			tags: instanceTags,
		} = await getInstanceDetails(ec2Client, instanceId)

		// if (!(await canPerformAction(token, instanceTags, action))) {
		// 	return NextResponse.json(
		// 		{ error: 'Forbidden: Not authorized.' },
		// 		{ status: 403 },
		// 	)
		// }

		let commandResponse:
			| StartInstancesCommandOutput
			| StopInstancesCommandOutput
			| RebootInstancesCommandOutput

		switch (action) {
			case 'start':
				commandResponse = await ec2Client.send(
					new StartInstancesCommand({ InstanceIds: [instanceId] }),
				)
				break
			case 'stop':
				commandResponse = await ec2Client.send(
					new StopInstancesCommand({ InstanceIds: [instanceId] }),
				)
				break
			case 'reboot':
				commandResponse = await ec2Client.send(
					new RebootInstancesCommand({ InstanceIds: [instanceId] }),
				)
				break
		}

		await sendSlackNotification(
			`*${getName(userEmail) || userEmail}* initiated *${action}* for ${displayName}.`,
			notificationsChannel,
		)

		return NextResponse.json({
			message: `Successfully initiated ${action} for instance: ${instanceId}`,
			details: commandResponse,
		})
	} catch (error: any) {
		console.error(`Error during action handler:`, error)

		if (error.message?.includes('not found')) {
			return NextResponse.json({ error: error.message }, { status: 404 })
		}
		if (error instanceof SyntaxError) {
			return NextResponse.json(
				{ error: 'Invalid JSON in request body.' },
				{ status: 400 },
			)
		}
		return NextResponse.json(
			{ error: 'An unexpected error occurred.' },
			{ status: 500 },
		)
	}
}
