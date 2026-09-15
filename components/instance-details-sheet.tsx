/* eslint-disable @typescript-eslint/no-explicit-any */

import TagEditForm from '@/components/tag-edit-form'
import { Button } from '@/components/ui/button'
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@/components/ui/sheet'
import { findTag } from '@/lib/utils'
import { useState } from 'react'

export default function InstanceDetailsSheet({
	instance,
	awsAccount,
}: {
	instance: any
	awsAccount: string
}) {
	const name = findTag('Name', instance, false)
	const [isSheetOpen, setIsSheetOpen] = useState(false)

	return (
		<Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
			<SheetTrigger asChild>
				<Button className="px-0" variant="link">
					{name}
				</Button>
			</SheetTrigger>
			<SheetContent className="overflow-y-scroll px-2">
				<SheetHeader>
					<SheetTitle>{name}</SheetTitle>
					<SheetDescription>
						Edit AWS self-service tags for this instance.
					</SheetDescription>
				</SheetHeader>
				<TagEditForm
					instance={instance}
					awsAccount={awsAccount}
					setIsSheetOpen={setIsSheetOpen}
				/>
				{/* <SheetFooter>
					<SheetClose asChild>
						<div className="flex w-full items-center gap-4">
							<Button
								disabled={!isAdmin}
								variant="outline"
								className="grow"
								onClick={getInstanceTags}
							>
								Discard
							</Button>
							<Button
								disabled={!isAdmin}
								className="grow"
								type="submit"
								onClick={handleSubmit}
							>
								Save
							</Button>
						</div>
					</SheetClose>
				</SheetFooter> */}
			</SheetContent>
		</Sheet>
	)
}
