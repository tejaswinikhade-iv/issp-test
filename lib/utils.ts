/* eslint-disable @typescript-eslint/no-explicit-any */

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function getPermissions(instance: any, userInfo: any) {
	if (userInfo.isAdmin) {
		return { start: true, stop: true, reboot: true }
	}

	const defaultPermissions = {}

	if (!instance || !instance.Tags || !Array.isArray(instance.Tags)) {
		return defaultPermissions
	}

	const accessTag = instance.Tags.find(
		(tag: any) => tag.Key === 'iv:self-service:access',
	)

	if (!accessTag || !accessTag.Value) {
		return defaultPermissions
	}

	try {
		const parsedData = JSON.parse(accessTag.Value)

		if (!parsedData) {
			return defaultPermissions
		}

		const userAccessEntry = parsedData[userInfo.email]

		if (userAccessEntry && userAccessEntry.permittedActions) {
			return userAccessEntry.permittedActions
		} else {
			return defaultPermissions
		}
	} catch (error) {
		console.error(
			"Error parsing 'iv:self-service:access' JSON from tag:",
			error,
		)
		return defaultPermissions
	}
}

export function sortInstances(
	a: any,
	b: any,
	sortBy: string,
	userEmail: string,
) {
	let valA, valB

	switch (sortBy) {
		case 'Name':
			valA = findTag('Name', a, false)
			valB = findTag('Name', b, false)
			break
		case 'Instance ID':
			valA = a.InstanceId
			valB = b.InstanceId
			break
		case 'State':
			valA = a.State.Name
			valB = b.State.Name
			break
		case 'Public IP':
			valA = a?.PublicIpAddress
			valB = b?.PublicIpAddress
			break
		case 'Department':
			valA = findTag('iv:self-service:ownership', a)?.department
			valB = findTag('iv:self-service:ownership', b)?.department
			break
		case 'Project':
			valA = findTag('iv:self-service:ownership', a)?.project
			valB = findTag('iv:self-service:ownership', b)?.project
			break
		case 'Owner':
			valA = findTag('iv:self-service:ownership', a)?.owner
			valB = findTag('iv:self-service:ownership', b)?.owner
			break
		case 'Termination Date':
			valA = findTag('iv:self-service:schedule', a)?.terminationDate
			valB = findTag('iv:self-service:schedule', b)?.terminationDate
			break
		case 'Actions':
			const permittedActionsA = findTag(
				'iv:self-service:access',
				a,
				true,
			)?.[userEmail]?.permittedActions
			const permittedActionsB = findTag(
				'iv:self-service:access',
				b,
				true,
			)?.[userEmail]?.permittedActions

			if (permittedActionsA) {
				valA = -Object.values(permittedActionsA).filter(
					(enabled) => enabled === true,
				).length
			}
			if (permittedActionsB) {
				valB = -Object.values(permittedActionsB).filter(
					(enabled) => enabled === true,
				).length
			}

			break
	}

	if (valA === undefined && valB === undefined) return 0
	if (valA === undefined) return 1
	if (valB === undefined) return -1

	if (valA === valB) return a.InstanceId.localeCompare(b.InstanceId)

	if (typeof valA === 'number' && typeof valB === 'number') {
		return valA - valB
	} else {
		return String(valA).localeCompare(String(valB))
	}
}

export function formatDate(date: string | undefined) {
	if (!date) return null

	try {
		const parsedDate = new Date(date)
		if (isNaN(parsedDate.getTime())) return null

		const formattedDate = parsedDate.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		})

		return formattedDate
	} catch {
		return null
	}
}

export function getName(email: string | null) {
	if (typeof email !== 'string' || !email.includes('@')) return ''

	const [localPart] = email.split('@')
	if (!localPart) return ''

	return localPart
		.split('.')
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ')
}

export function findTag(key: string, instance: any, parseJSON: boolean = true) {
	const value =
		instance?.Tags?.find((tag: any) => tag?.Key === key)?.Value || ''

	if (!parseJSON) return value

	try {
		return JSON.parse(value || '{}')
	} catch {
		console.error(`Malformed JSON for tag "${key}":`, value)
		return {}
	}
}

export function isMobile() {
	const MOBILE_BREAKPOINT = 768
	return window.innerWidth < MOBILE_BREAKPOINT
}

export function resetPreferences() {
	for (const key in localStorage) {
		if (key !== 'googleAccessToken') {
			localStorage.removeItem(key)
		}
	}

	window.location.reload()
}

export function validateCronExpression(cronString: string): boolean {
	if (typeof cronString !== 'string') {
		return false
	}

	if (!/^\S+( \S+){4}$/.test(cronString)) {
		return false
	}

	const parts = cronString.trim().split(' ')
	if (parts.length !== 5) {
		return false
	}

	const [minute, hour, dayOfMonth, month, dayOfWeek] = parts

	if (dayOfMonth !== '*' && dayOfWeek !== '*') {
		return false
	}

	const limits = {
		minute: { min: 0, max: 59 },
		hour: { min: 0, max: 23 },
		dayOfMonth: { min: 1, max: 31 },
		month: { min: 1, max: 12 },
		dayOfWeek: { min: 0, max: 7 },
	}

	const names = {
		month: {
			JAN: 1,
			FEB: 2,
			MAR: 3,
			APR: 4,
			MAY: 5,
			JUN: 6,
			JUL: 7,
			AUG: 8,
			SEP: 9,
			OCT: 10,
			NOV: 11,
			DEC: 12,
		},
		dayOfWeek: { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 },
	}

	const validatePart = (
		expression: string,
		partLimits: { min: number; max: number },
		partNames: Record<string, number> | null = null,
	): boolean => {
		if (partNames) {
			const nameRegex = new RegExp(
				`\\b(${Object.keys(partNames).join('|')})\\b`,
				'gi',
			)
			expression = expression.replace(nameRegex, (match) =>
				String(partNames[match.toUpperCase()]),
			)
		}

		if (/[a-zA-Z]/.test(expression)) {
			return false
		}

		for (const item of expression.split(',')) {
			if (item === '') return false

			const stepParts = item.split('/')
			if (stepParts.length > 2) return false

			const rangePart = stepParts[0]
			const stepValue =
				stepParts.length === 2 ? parseInt(stepParts[1], 10) : null

			if (stepValue !== null && (isNaN(stepValue) || stepValue < 1)) {
				return false
			}

			if (rangePart === '*') {
				continue
			}

			const rangeParts = rangePart.split('-')
			if (rangeParts.length > 2) return false

			const start = parseInt(rangeParts[0], 10)
			const end =
				rangeParts.length === 2 ? parseInt(rangeParts[1], 10) : start

			if (
				isNaN(start) ||
				isNaN(end) ||
				start > end ||
				start < partLimits.min ||
				end > partLimits.max
			) {
				return false
			}
		}

		return true
	}

	return (
		validatePart(minute, limits.minute) &&
		validatePart(hour, limits.hour) &&
		validatePart(dayOfMonth, limits.dayOfMonth) &&
		validatePart(month, limits.month, names.month) &&
		validatePart(dayOfWeek, limits.dayOfWeek, names.dayOfWeek)
	)
}
