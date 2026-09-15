'use server'

import { getConfig } from '@/lib/config'
import { type Tag } from '@aws-sdk/client-ec2'

export async function fetchGoogleUserEmail(
	accessToken: string | undefined | null,
): Promise<string | null> {
	if (!accessToken) {
		console.error('Access token not provided for Google user info fetch.')
		return null
	}
	try {
		const userRes = await fetch(
			'https://www.googleapis.com/oauth2/v3/userinfo',
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			},
		)
		if (!userRes.ok) {
			console.error(
				`Failed to fetch Google user info: API returned status ${userRes.status}`,
			)
			return null
		}
		const googleUser = await userRes.json()
		if (typeof googleUser.email !== 'string' || !googleUser.email) {
			console.error(
				'Email not found, not a string, or empty in Google user info response.',
			)
			return null
		}
		return googleUser.email
	} catch (err) {
		console.error('Failed to fetch user info from Google:', err)
		return null
	}
}

export async function isAuthorizedEmail(accessToken: string | undefined) {
	const email = await fetchGoogleUserEmail(accessToken)
	if (!email) {
		return false
	}
	return email.endsWith('@inspiritvision.com')
}

export async function canPerformAction(
	accessToken: string | undefined | null,
	instanceTags: Tag[] | undefined,
	action: 'start' | 'stop' | 'reboot',
): Promise<boolean> {
	const userEmail = await fetchGoogleUserEmail(accessToken)

	if (!userEmail) {
		return false
	}

	try {
		const config = await getConfig()
		const admins = config.admins ?? []
		if (
			admins.some(
				(adminEmail) =>
					adminEmail.toLowerCase() === userEmail.toLowerCase(),
			)
		) {
			console.log(
				`Admin user '${userEmail}' authorized for action '${action}'.`,
			)
			return true // Admins are always authorized.
		}
	} catch (error) {
		console.error(
			'Could not check admin status due to config error. Proceeding with tag-based auth.',
			error,
		)
	}

	if (!instanceTags || !Array.isArray(instanceTags)) {
		return false
	}

	const accessTag = instanceTags.find(
		(tag) => tag.Key === 'iv:self-service:access',
	)

	if (!accessTag || !accessTag.Value) {
		return false
	}

	try {
		const parsedData = JSON.parse(accessTag.Value)
		if (!parsedData) {
			return false
		}
		const userAccessEntry = parsedData[userEmail]
		if (userAccessEntry && userAccessEntry.permittedActions) {
			return userAccessEntry.permittedActions[action] === true
		} else {
			return false
		}
	} catch (error) {
		console.error(
			"Error parsing 'iv:self-service:access' JSON from tag:",
			error,
		)
		return false
	}
}

export async function checkIsAdmin({
	accessToken,
	userEmail,
}: {
	accessToken?: string | undefined | null
	userEmail?: string | undefined | null
}): Promise<boolean> {
	// Using the userEmail property is NOT secure and is intended for client side UI rendering only
	let emailToVerify: string | undefined | null = userEmail

	if (!emailToVerify) {
		if (!accessToken) {
			console.error(
				'checkIsAdmin requires an accessToken when userEmail is not provided.',
			)
			return false
		}
		emailToVerify = await fetchGoogleUserEmail(accessToken)
	}

	if (!emailToVerify) {
		return false
	}

	try {
		const config = await getConfig()
		const admins = config.admins ?? []

		return admins.some(
			(emailFromFile) =>
				emailFromFile.trim().toLowerCase() ===
				emailToVerify!.trim().toLowerCase(),
		)
	} catch (error) {
		console.error(
			'Failed to load or parse configuration for admin check:',
			error,
		)
		return false
	}
}
