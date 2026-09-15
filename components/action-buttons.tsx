/* eslint-disable @typescript-eslint/no-explicit-any */

import { Button } from '@/components/ui/button'
import useUserInfo from '@/hooks/use-user-info'
import { findTag, getPermissions } from '@/lib/utils'
import { LoaderIcon, PauseIcon, PlayIcon, RotateCcwIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export default function ActionButtons({
	instance,
	awsAccount,
}: {
	instance: any
	awsAccount: string
}) {
	const { userInfo } = useUserInfo()
	const [pendingActions, setPendingActions] = useState<Set<string>>(new Set())
	const permissions = getPermissions(instance, userInfo)

	async function handleAction(action: 'start' | 'stop' | 'reboot') {
		setPendingActions((prev) => new Set(prev).add(action))

		try {
			const token = localStorage.getItem('googleAccessToken')
			if (!token) throw new Error('Authentication token not found.')

			if (!instance.Region)
				throw new Error(
					'Instance region is required to perform the action.',
				)

			const requestBody = {
				token,
				action,
				instanceId: instance.InstanceId,
				region: instance.Region,
				awsAccount,
			}

			const response = await fetch('/api/ec2-action', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody),
			})

			const responseData = await response.json()

			if (!response.ok) {
				const errorMessage =
					responseData.error ||
					`Request failed with status ${response.status}`
				throw new Error(errorMessage)
			}

			toast.success(
				`Initiated ${action} for ${findTag('Name', instance, false) || instance.InstanceId}`,
				{
					description: 'Refetch to see changes',
				},
			)
			return responseData
		} catch (error) {
			toast.error(
				`An unexpected error occurred during ${action} for ${findTag('Name', instance, false) || instance.InstanceId}:`,
			)
			throw error instanceof Error
				? error
				: new Error(`An unexpected error occurred during ${action}`)
		} finally {
			setPendingActions((prev) => {
				const next = new Set(prev)
				next.delete(action)
				return next
			})
		}
	}

	return (
		<div className="inline-flex w-full items-center justify-end">
			<Button
				variant="ghost"
				size="icon"
				disabled={!permissions.start || pendingActions.has('start')}
				onClick={() => handleAction('start')}
			>
				{pendingActions.has('start') ? (
					<LoaderIcon className="animate-spin" />
				) : (
					<PlayIcon className="size-4" />
				)}
			</Button>
			<Button
				variant="ghost"
				size="icon"
				disabled={!permissions.stop || pendingActions.has('stop')}
				onClick={() => handleAction('stop')}
			>
				{pendingActions.has('stop') ? (
					<LoaderIcon className="animate-spin" />
				) : (
					<PauseIcon className="size-4" />
				)}
			</Button>
			<Button
				variant="ghost"
				size="icon"
				disabled={!permissions.reboot || pendingActions.has('reboot')}
				onClick={() => handleAction('reboot')}
			>
				{pendingActions.has('reboot') ? (
					<LoaderIcon className="animate-spin" />
				) : (
					<RotateCcwIcon className="size-4" />
				)}
			</Button>
		</div>
	)
}
