import { Badge } from '@/components/ui/badge'
import { getName } from '@/lib/utils'
import { CircleCheckIcon, LoaderIcon, PauseIcon, TrashIcon } from 'lucide-react'

export function StateBadge({ state }: { state: string }) {
	return (
		<Badge
			variant="outline"
			className="pl-1.5 text-[0.75rem] text-neutral-700 dark:text-neutral-300"
		>
			{state === 'running' ? (
				<CircleCheckIcon className="text-green-500 dark:text-green-400" />
			) : state === 'stopped' ? (
				<PauseIcon className="text-yellow-500 dark:text-yellow-400" />
			) : state === 'terminated' ? (
				<TrashIcon className="text-red-500 dark:text-red-400" />
			) : (
				<LoaderIcon />
			)}
			{state}
		</Badge>
	)
}

export function UserBadge({ email }: { email: string | undefined }) {
	return (
		email && (
			<Badge
				variant="outline"
				className={`text-[0.75rem] text-neutral-700 dark:text-neutral-300 ${email.endsWith('@inspiritvision.com') ? '' : 'text-yellow-500 dark:text-yellow-400'}`}
			>
				{getName(email) || email}
			</Badge>
		)
	)
}
