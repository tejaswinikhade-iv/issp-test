import { LoaderIcon } from 'lucide-react'

export default function LoadingScreen() {
	return (
		<div className="flex h-full w-full items-center justify-center">
			<LoaderIcon className="animate-spin" />
		</div>
	)
}
