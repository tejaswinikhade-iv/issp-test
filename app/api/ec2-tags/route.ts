/* eslint-disable @typescript-eslint/no-explicit-any */

// import { checkIsAdmin } from '@/lib/auth'
import { triggerCronfileRegeneration } from '@/lib/scheduler'
import {
	Tag as AwsSdkTag,
	CreateTagsCommand,
	CreateTagsCommandOutput,
	EC2Client,
} from '@aws-sdk/client-ec2'
import { NextRequest, NextResponse } from 'next/server'

interface Tag {
	Key: string
	Value: string
}

interface UpdateTagsRequestBody {
	token: string
	instanceId: string
	region: string
	awsAccount: string
	tags: Tag[]
}

const SCHEDULE_TAG_KEY = 'iv:self-service:schedule'

export async function POST(request: NextRequest) {
	let parsedBody: UpdateTagsRequestBody | null = null

	try {
		const body = await request.json()
		parsedBody = body as UpdateTagsRequestBody

		const { token, instanceId, region, awsAccount, tags } = parsedBody

		if (!token || !instanceId || !region || !awsAccount || !tags) {
			return NextResponse.json(
				{ error: 'Invalid request body. Missing required fields.' },
				{ status: 400 },
			)
		}

		if (
			!Array.isArray(tags) ||
			tags.some(
				(tag) =>
					typeof tag.Key !== 'string' ||
					typeof tag.Value !== 'string',
			)
		) {
			return NextResponse.json(
				{
					error: 'Invalid tags format. Tags must be an array of {Key: string, Value: string} objects.',
				},
				{ status: 400 },
			)
		}

		if (tags.length === 0) {
			return NextResponse.json(
				{
					error: 'Tags array cannot be empty. Provide at least one tag to update.',
				},
				{ status: 400 },
			)
		}

		const ec2Client = new EC2Client({ region, profile: awsAccount })

		const authorized = await checkIsAdmin({ accessToken: token })
		if (!authorized) {
			return NextResponse.json(
				{
					error: 'Forbidden: Not authorized to update tags for this instance.',
				},
				{ status: 403 },
			)
		}

		const awsTagsToApply: AwsSdkTag[] = tags.map((tag) => ({
			Key: tag.Key,
			Value: tag.Value,
		}))

		const createTagsCommand = new CreateTagsCommand({
			Resources: [instanceId],
			Tags: awsTagsToApply,
		})

		const commandResponse: CreateTagsCommandOutput =
			await ec2Client.send(createTagsCommand)

		const isScheduleUpdated = tags.some(
			(tag) => tag.Key === SCHEDULE_TAG_KEY,
		)

		if (isScheduleUpdated) {
			triggerCronfileRegeneration()
		}

		return NextResponse.json({
			message: `Successfully updated tags for instance: ${instanceId}. A background scheduler refresh has been triggered if necessary.`,
			details: commandResponse,
		})
	} catch (error: any) {
		const instanceContext = parsedBody?.instanceId
			? ` for instance ${parsedBody.instanceId}`
			: ''
		const errorMsg = error.message || error.toString()
		console.error(
			`API Error in POST /ec2/update-tags${instanceContext}:`,
			errorMsg,
		)

		if (error instanceof SyntaxError && error.message.includes('JSON')) {
			return NextResponse.json(
				{ error: 'Invalid JSON in request body.' },
				{ status: 400 },
			)
		}

		if (error.name === 'InvalidInstanceID.NotFound') {
			return NextResponse.json(
				{ error: `Instance "${parsedBody?.instanceId}" not found.` },
				{ status: 404 },
			)
		}
		return NextResponse.json(
			{
				error: 'An unexpected error occurred while updating tags.',
				details: errorMsg,
			},
			{ status: 500 },
		)
	}
}