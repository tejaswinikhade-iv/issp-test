'use server'

import { getConfig } from '@/lib/config'

async function sendToSingleWebhook(
	webhookUrl: string,
	payload: { text: string },
	webhookName: string,
) {
	try {
		const response = await fetch(webhookUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		})

		if (response.ok) {
			console.log(
				`Webhook notification to '${webhookName}' sent successfully.`,
			)
		} else {
			const errorText = await response.text()
			console.error(
				`Failed to send webhook notification to '${webhookName}'. Status: ${response.status}. Response: ${errorText}`,
			)
		}
	} catch (error) {
		console.error(
			`An unexpected error occurred while sending to '${webhookName}': ${error}`,
		)
	}
}

export async function sendSlackNotification(
	message: string,
	instanceChannelId?: string,
) {
	const config = await getConfig()

	const orgBaseUrl = config.slack_webhook_url?.org_base
	const globalChannelId = config.slack_webhook_url?.notifications_channel

	if (!orgBaseUrl) {
		console.warn(
			'Slack `org_base` URL not found in config. Notifications cannot be sent.',
		)
		return
	}

	const payload = { text: message }
	const notificationPromises: Promise<void>[] = []

	if (globalChannelId) {
		const globalWebhookUrl = orgBaseUrl + globalChannelId
		notificationPromises.push(
			sendToSingleWebhook(
				globalWebhookUrl,
				payload,
				'Global Notifications Channel',
			),
		)
	}

	if (instanceChannelId) {
		const instanceWebhookUrl = orgBaseUrl + instanceChannelId
		notificationPromises.push(
			sendToSingleWebhook(
				instanceWebhookUrl,
				payload,
				'Instance-Specific Channel',
			),
		)
	}

	if (notificationPromises.length === 0) {
		console.warn(
			'No Slack notification channels were configured or provided. Notification not sent.',
		)
		return
	}

	await Promise.allSettled(notificationPromises)
}
