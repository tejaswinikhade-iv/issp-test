/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import useConfig from '@/hooks/use-config'
import useUserInfo from '@/hooks/use-user-info'
import { findTag, validateCronExpression } from '@/lib/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleHelpIcon, LoaderIcon, TrashIcon } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const formSchema = z.object({
	instanceName: z.string(),
	ownership: z.object({
		department: z.string().min(2, { message: 'Department is required.' }),
		project: z.string().min(2, { message: 'Project is required.' }),
		// owner: z
		// 	.string()
		// 	.email({ message: 'A valid owner email is required.' })
		// 	.endsWith('@inspiritvision.com', {
		// 		message: 'Only inspiritvision.com emails are allowed.',
		// 	}),
		notificationsChannel: z
			.string()
			.refine((val) => !val || /^\w+\/\w+$/.test(val), {
				message: 'Invalid channel ID.',
			})
			.optional(),
	}),
	schedule: z
		.object({
			terminationDate: z
				.string()
				.optional()
				.refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), {
					message: 'Date must be in YYYY-MM-DD format.',
				}),
			start: z
				.array(
					z.object({
						cron: z.string().refine(validateCronExpression, {
							message: 'Invalid cron.',
						}),
						expires: z
							.string()
							.optional()
							.refine(
								(val) =>
									!val || /^\d{4}-\d{2}-\d{2}$/.test(val),
								{
									message:
										'Date must be in YYYY-MM-DD format.',
								},
							),
					}),
				)
				.optional(),
			stop: z
				.array(
					z.object({
						cron: z.string().refine(validateCronExpression, {
							message: 'Invalid cron.',
						}),
						expires: z
							.string()
							.optional()
							.refine(
								(val) =>
									!val || /^\d{4}-\d{2}-\d{2}$/.test(val),
								{
									message: 'Invalid date.',
								},
							),
					}),
				)
				.optional(),
		})
		.refine(
			(data) => {
				// If there are start schedules, there MUST be stop schedules.
				const hasStartSchedules = data.start && data.start.length > 0
				const hasStopSchedules = data.stop && data.stop.length > 0
				return !hasStartSchedules || hasStopSchedules
			},
			{
				message:
					'If a start schedule is defined, at least one stop schedule is required.',
				path: ['stop'],
			},
		),

// 	access: z
// 		.array(
// 			z.object({
// 				email: z
// 					.string()
// 					.email({ message: 'Please enter a valid email.' })
// 					.endsWith('@inspiritvision.com', {
// 						message: 'Only @inspiritvision.com emails are allowed.',
// 					}),
// 				permissions: z
// 					.object({
// 						start: z.boolean().default(false),
// 						stop: z.boolean().default(false),
// 						reboot: z.boolean().default(false),
// 					})
// 					.refine((data) => data.start || data.stop || data.reboot, {
// 						message: 'At least one permission must be selected.',
// 					}),
// 			}),
// 		)
// 		.optional()
// 		.refine(
// 			(items) => {
// 				if (!items) return true
// 				const emails = items.map((item) => item.email).filter(Boolean)
// 				return new Set(emails).size === emails.length
// 			},
// 			{
// 				message:
// 					'Each user can only have one access rule. Please remove duplicate emails.',
// 			},
// 		),
// })

export default function TagEditForm({
	instance,
	awsAccount,
	setIsSheetOpen,
}: {
	instance: any
	awsAccount: string
	setIsSheetOpen: Dispatch<SetStateAction<boolean>>
}) {
	const { config } = useConfig()
	const { userInfo } = useUserInfo()
	const [isSaving, setIsSaving] = useState(false)

	const instanceName = findTag('Name', instance, false)
	const ownershipTag = findTag('iv:self-service:ownership', instance)
	const scheduleTag = findTag('iv:self-service:schedule', instance)
	const accessTag = findTag('iv:self-service:access', instance)

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema) as any,
		defaultValues: {
			instanceName,
			ownership: {
				department: ownershipTag?.department || '',
				project: ownershipTag?.project || '',
				owner: ownershipTag?.owner || '',
				notificationsChannel: ownershipTag?.notificationsChannel || '',
			},
			schedule: {
				terminationDate: scheduleTag?.terminationDate || '',
				start: scheduleTag?.start || [],
				stop: scheduleTag?.stop || [],
			},
			access: accessTag
				? Object.entries(accessTag).map(
						([email, value]: [string, any]) => ({
							email,
							permissions: value.permittedActions,
						}),
					)
				: [],
		},
	})

	const {
		fields: accessFields,
		append: appendAccess,
		remove: removeAccess,
	} = useFieldArray({
		control: form.control,
		name: 'access',
	})
	const {
		fields: startFields,
		append: appendStart,
		remove: removeStart,
	} = useFieldArray({
		control: form.control,
		name: 'schedule.start',
	})
	const {
		fields: stopFields,
		append: appendStop,
		remove: removeStop,
	} = useFieldArray({
		control: form.control,
		name: 'schedule.stop',
	})

	useEffect(() => {
		requestAnimationFrame(() => {
			;(document.activeElement as HTMLElement)?.blur()
		})
	}, [])

	async function onSubmit(values: z.infer<typeof formSchema>) {
		setIsSaving(true)
		const apiUrl = '/api/ec2-tags'

		const accessTagValue = (values.access || []).reduce(
			(acc, rule) => {
				if (rule.email) {
					acc[rule.email] = {
						permittedActions: rule.permissions,
					}
				}
				return acc
			},
			{} as Record<string, { permittedActions: any }>,
		)

		const body = {
			// token: localStorage.getItem('googleAccessToken'),
			instanceId: instance.InstanceId,
			region: instance.Region,
			awsAccount,
			tags: [
				{
					Key: 'Name',
					Value: values.instanceName,
				},
				{
					Key: 'iv:self-service:ownership',
					Value: JSON.stringify(values.ownership, null, 0),
				},
				{
					Key: 'iv:self-service:schedule',
					Value: JSON.stringify(values.schedule, null, 0),
				},
				// {
				// 	Key: 'iv:self-service:access',
				// 	Value: JSON.stringify(accessTagValue, null, 0),
				// },
			],
		}

		try {
			const response = await fetch(apiUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(body),
			})

			const data = await response.json()

			if (!response.ok) {
				throw new Error(
					data.error ||
						`API Error: ${response.status} ${response.statusText}`,
				)
			}

			toast.success('Tags updated', {
				description: 'Refetch to see changes',
			})

			setIsSheetOpen((prev) => !prev)

			return data
		} catch (error: any) {
			console.error('Error updating tags:', error)
			toast.error(`Error while updating tags: ${error}:`)
			return {
				message: '',
				error:
					error.message ||
					'Failed to connect to the server or parse response.',
			}
		} finally {
			setIsSaving(false)
		}
	}

	const stopScheduleError =
		form.formState.errors.schedule?.stop?.root?.message ||
		form.formState.errors.schedule?.stop?.message

	const accessArrayError =
		form.formState.errors.access?.root?.message ||
		form.formState.errors.access?.message

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="p-4">
				<fieldset disabled={!userInfo.isAdmin} className="space-y-4">
					<FormField
						name="instanceName"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Instance Name</FormLabel>
								<FormControl>
									<Input placeholder="Stardust" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<Separator className="my-8" />
					{/* iv:self-service:ownership */}

					<FormField
						name="ownership.department"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Department</FormLabel>
								<FormControl>
									<Input
										placeholder="Rebel Alliance Engineering"
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						name="ownership.project"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Project</FormLabel>
								<FormControl>
									<Input
										placeholder="Death Star Sabotage Protocol"
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						name="ownership.owner"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Owner Email</FormLabel>
								<FormControl>
									<Input
										placeholder="leia.organa@rebellion.space"
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						name="ownership.notificationsChannel"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Notifications Channel</FormLabel>
								<FormControl>
									<Input
										placeholder="H3LPME/0B1WAN"
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<Separator className="my-8" />
					{/* iv:self-service:schedule */}

					<div className="space-y-2">
						<FormLabel>Timezone</FormLabel>
						<Input disabled value={config.timezone} />
					</div>
					<FormField
						name="schedule.terminationDate"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Termination Date</FormLabel>
								<FormControl>
									<Input
										placeholder="YYYY-MM-DD"
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<p className="mb-2 font-medium">Start Schedules</p>
					{startFields.map((field, index) => (
						<div
							key={field.id}
							className="relative flex items-start gap-4 rounded-lg border p-4"
						>
							<FormField
								name={`schedule.start.${index}.cron`}
								render={({ field }) => (
									<FormItem className="flex-grow">
										<FormLabel>Cron</FormLabel>
										<div className="inline-flex">
											<FormControl>
												<Input
													className="rounded-r-none"
													placeholder="0 9 * * 1-5"
													{...field}
												/>
											</FormControl>
											<Button
												type="button"
												variant="outline"
												className="rounded-l-none border-l-0 p-2 has-[>svg]:px-0"
											>
												<Link
													href={`https://crontab.guru/#${field.value.replaceAll(' ', '_')}`}
													target="_blank"
												>
													<CircleHelpIcon />
												</Link>
											</Button>
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								name={`schedule.start.${index}.expires`}
								render={({ field }) => (
									<FormItem className="flex-grow">
										<FormLabel>Expires</FormLabel>
										<FormControl>
											<Input
												className="relative"
												placeholder="YYYY-MM-DD"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<Button
								className="absolute -top-2 -right-2 size-7 rounded-full"
								type="button"
								variant="outline"
								size="sm"
								onClick={() => removeStart(index)}
							>
								<TrashIcon className="size-3 text-red-500" />
							</Button>
						</div>
					))}
					<Button
						type="button"
						variant="outline"
						onClick={() => appendStart({ cron: '', expires: '' })}
					>
						Add Start Schedule
					</Button>
					<p className="mb-2 font-medium">Stop Schedules</p>
					{stopScheduleError && (
						<p className="text-destructive text-sm">
							{stopScheduleError}
						</p>
					)}
					{stopFields.map((field, index) => (
						<div
							key={field.id}
							className="relative flex items-start gap-4 rounded-lg border p-4"
						>
							<FormField
								name={`schedule.stop.${index}.cron`}
								render={({ field }) => (
									<FormItem className="flex-grow">
										<FormLabel>Cron</FormLabel>
										<div className="inline-flex">
											<FormControl>
												<Input
													className="rounded-r-none"
													placeholder="0 18 * * 1-5"
													{...field}
												/>
											</FormControl>
											<Button
												type="button"
												variant="outline"
												className="rounded-l-none border-l-0 p-2 has-[>svg]:px-0"
											>
												<Link
													href={`https://crontab.guru/#${field.value.replaceAll(' ', '_')}`}
													target="_blank"
												>
													<CircleHelpIcon />
												</Link>
											</Button>
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								name={`schedule.stop.${index}.expires`}
								render={({ field }) => (
									<FormItem className="flex-grow">
										<FormLabel>Expires</FormLabel>
										<FormControl>
											<Input
												placeholder="YYYY-MM-DD"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<Button
								className="absolute -top-2 -right-2 size-7 rounded-full"
								type="button"
								variant="outline"
								size="sm"
								onClick={() => removeStop(index)}
							>
								<TrashIcon className="text-destructive size-3" />
							</Button>
						</div>
					))}
					<Button
						type="button"
						variant="outline"
						onClick={() => appendStop({ cron: '', expires: '' })}
					>
						Add Stop Schedule
					</Button>

					<Separator className="my-4" />
					{/* iv:self-service:access */}

					<p className="font-medium">Access Control</p>
					{accessArrayError && (
						<p className="text-destructive text-sm">
							{accessArrayError}
						</p>
					)}
					{accessFields.map((field, index) => {
						const permissionsError =
							form.formState.errors.access?.[index]?.permissions
								?.root?.message ||
							form.formState.errors.access?.[index]?.permissions
								?.message

						return (
							<div
								key={field.id}
								className="relative flex gap-4 rounded-lg border p-4"
							>
								<div className="flex-grow space-y-4">
									<FormField
										name={`access.${index}.email`}
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													User Email
												</FormLabel>
												<FormControl>
													<Input
														placeholder="luke.skywalker@rebellion.space"
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<div className="space-y-2">
										<FormLabel>Permissions</FormLabel>
										<div className="flex flex-wrap items-center gap-4">
											<FormField
												name={`access.${index}.permissions.start`}
												render={({ field }) => (
													<FormItem className="flex items-center">
														<FormControl>
															<Checkbox
																checked={
																	field.value
																}
																onCheckedChange={
																	field.onChange
																}
															/>
														</FormControl>
														<FormLabel>
															Start
														</FormLabel>
													</FormItem>
												)}
											/>
											<FormField
												name={`access.${index}.permissions.stop`}
												render={({ field }) => (
													<FormItem className="flex items-center">
														<FormControl>
															<Checkbox
																checked={
																	field.value
																}
																onCheckedChange={
																	field.onChange
																}
															/>
														</FormControl>
														<FormLabel>
															Stop
														</FormLabel>
													</FormItem>
												)}
											/>
											<FormField
												name={`access.${index}.permissions.reboot`}
												render={({ field }) => (
													<FormItem className="flex items-center">
														<FormControl>
															<Checkbox
																checked={
																	field.value
																}
																onCheckedChange={
																	field.onChange
																}
															/>
														</FormControl>
														<FormLabel>
															Reboot
														</FormLabel>
													</FormItem>
												)}
											/>
										</div>
										{permissionsError && (
											<p className="text-destructive text-sm">
												{permissionsError}
											</p>
										)}
									</div>
								</div>
								<Button
									className="absolute -top-2 -right-2 size-7 rounded-full"
									type="button"
									variant="outline"
									size="sm"
									onClick={() => removeAccess(index)}
								>
									<TrashIcon className="size-3 text-red-500" />
								</Button>
							</div>
						)
					})}
					<Button
						type="button"
						variant="outline"
						onClick={() =>
							appendAccess({
								email: '',
								permissions: {
									start: false,
									stop: false,
									reboot: false,
								},
							})
						}
					>
						Add Access Rule
					</Button>

					<div className="flex w-full items-center gap-4 pt-6">
						<Button
							disabled={!userInfo.isAdmin || isSaving}
							variant="outline"
							className="flex-1"
							type="button"
							onClick={() => setIsSheetOpen((prev) => !prev)}
						>
							<span>Discard</span>
						</Button>
						<Button
							disabled={!userInfo.isAdmin || isSaving}
							className="flex-1"
							type="submit"
						>
							{/* span required to avoid resizing issues */}
							<span>
								{isSaving ? (
									<LoaderIcon className="animate-spin" />
								) : (
									'Save'
								)}
							</span>
						</Button>
					</div>
				</fieldset>
			</form>
		</Form>
	)
}
