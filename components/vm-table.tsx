'use client'

import ActionButtons from '@/components/action-buttons'
import InstanceDetailsSheet from '@/components/instance-details-sheet'
import LoadingScreen from '@/components/loading-screen'
import { StateBadge, UserBadge } from '@/components/table-badges'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import useConfig from '@/hooks/use-config'
import useUserInfo from '@/hooks/use-user-info'
import {
	findTag,
	formatDate,
	getPermissions,
	isMobile,
	sortInstances,
} from '@/lib/utils'
import {
	ArrowDownWideNarrowIcon,
	ChevronDownIcon,
	ColumnsIcon,
	FunnelIcon,
	GlobeIcon,
	RotateCwIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function VMTable() {
	const { config } = useConfig()
	const { userInfo } = useUserInfo()
	const [loading, setLoading] = useState(false)
	const [preferencesLoaded, setPreferencesLoaded] = useState(false)
	const [instances, setInstances] = useState<any[] | null>(null)
	const [instanceCache, setInstanceCache] = useState<
		Record<string, { data: any[]; fetchedAt: Date }>
	>({})

	const [selectedProfile, setSelectedProfile] = useState('')
	const [selectedRegion, setSelectedRegion] = useState('')

	const instanceFilters = [
		'all',
		'actionable',
		'running',
		'stopped',
		'terminated',
	]
	const columns = [
		'Name',
		'Instance ID',
		'State',
		'Public IP',
		'Department',
		'Project',
		'Owner',
		'Termination Date',
		'Actions',
	]

	const [selectedColumns, setSelectedColumns] = useState<typeof columns>([])
	const [instanceFilter, setInstanceFilter] =
		useState<(typeof instanceFilters)[number]>('')
	const [instanceSort, setInstanceSort] =
		useState<(typeof columns)[number]>('')

	async function fetchAndCacheInstances() {
		if (!selectedProfile || !selectedRegion) {
			return
		}

		const profileConfig = config.profiles[selectedProfile]
		if (!profileConfig) {
			return
		}

		setLoading(true)
		const token = localStorage.getItem('googleAccessToken')
		const cacheKey = `${selectedProfile}-${selectedRegion}`

		try {
			let fetchedInstances: any[] = []

			if (profileConfig.provider === 'e2e') {
				const requestBody = {
					token,
					projectId: profileConfig.projectId,
					locations: [selectedRegion],
				}

				const res = await fetch('/api/e2e-describe', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(requestBody),
				})

				const data = await res.json()

				if (!res.ok) {
					console.error('E2E describe failed:', data.error || res.status)
				}

				fetchedInstances = data.instances || []
			} else {
				// Default to AWS for any profile without an explicit
				// provider, so existing config.yml entries keep working
				// unchanged.
				// const requestBody = {
				// 	token,
				// 	awsAccount: selectedProfile,
				// 	regions: [selectedRegion],
				// }

				// const res = await fetch('/api/ec2-describe', {
				// 	method: 'POST',
				// 	headers: { 'Content-Type': 'application/json' },
				// 	body: JSON.stringify(requestBody),
				// })

				// const data = await res.json()

				// if (!res.ok) {
				// 	console.error('EC2 describe failed:', data.error || res.status)
				// }

				fetchedInstances = data.instances || []
			}

			setInstanceCache((prevCache) => ({
				...prevCache,
				[cacheKey]: {
					data: fetchedInstances,
					fetchedAt: new Date(),
				},
			}))

			setInstances(fetchedInstances)
		} catch (error) {
			console.error('Failed to fetch instances:', error)
			setInstances([])
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		function loadPreferences() {
			setSelectedProfile(
				localStorage.getItem('selectedProfile') || 'infra',
			)
			setSelectedRegion(
				localStorage.getItem('selectedRegion') || 'ap-south-1',
			)
			setSelectedColumns(
				isMobile()
					? ['Name', 'State', 'Public IP', 'Actions']
					: JSON.parse(
							localStorage.getItem('selectedColumns') ||
								'["Name", "State", "Public IP", "Project", "Owner", "Termination Date", "Actions"]',
						),
			)
			setInstanceFilter(localStorage.getItem('instanceFilter') || 'all')
			setInstanceSort(localStorage.getItem('instanceSort') || 'State')
		}

		loadPreferences()
		setPreferencesLoaded(true)
	}, [])

	useEffect(() => {
		function setPreferences() {
			localStorage.setItem('selectedProfile', selectedProfile)
			localStorage.setItem('selectedRegion', selectedRegion)
			localStorage.setItem(
				'selectedColumns',
				JSON.stringify(selectedColumns),
			)
			localStorage.setItem('instanceFilter', instanceFilter)
			localStorage.setItem('instanceSort', instanceSort)
		}

		if (!preferencesLoaded) return
		setPreferences()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		selectedProfile,
		selectedRegion,
		selectedColumns,
		instanceFilter,
		instanceSort,
	])

	useEffect(() => {
		if (!preferencesLoaded || !selectedProfile || !selectedRegion) {
			return
		}

		const cacheKey = `${selectedProfile}-${selectedRegion}`
		const cachedData = instanceCache[cacheKey]

		if (cachedData) {
			setInstances(cachedData.data)
		} else {
			fetchAndCacheInstances()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedProfile, selectedRegion, preferencesLoaded])

	return (
		<div className="flex h-full flex-col gap-4 overflow-y-scroll p-4">
			<div className="flex items-center justify-between gap-4">
				<div className="flex w-full items-center justify-between gap-4 sm:w-min sm:justify-normal">
					<Tabs
						value={selectedProfile}
						onValueChange={setSelectedProfile as any}
					>
						<TabsList>
							{Object.keys(config.profiles).map((profile) => (
								<TabsTrigger
									key={profile}
									value={profile}
									className="capitalize"
								>
									{profile}
								</TabsTrigger>
							))}
						</TabsList>
					</Tabs>
					<Select
						value={selectedRegion}
						onValueChange={setSelectedRegion}
					>
						<SelectTrigger className="hover:bg-accent">
							<GlobeIcon />
							<SelectValue placeholder="Region" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel>Regions</SelectLabel>
								{config.profiles[selectedProfile]?.regions.map(
									(region: string) => {
										return (
											<SelectItem
												key={region}
												value={region}
											>
												{region}
											</SelectItem>
										)
									},
								)}
							</SelectGroup>
						</SelectContent>
					</Select>
					<Button
						className="hidden shadow-xs sm:inline-flex"
						variant="outline"
						onClick={fetchAndCacheInstances}
					>
						<RotateCwIcon className="text-muted-foreground" />
						<span>Refetch</span>
					</Button>
					{instanceCache[`${selectedProfile}-${selectedRegion}`] && (
						<span className="text-muted-foreground hidden text-sm whitespace-nowrap sm:inline">
							Last fetched at{' '}
							{instanceCache[
								`${selectedProfile}-${selectedRegion}`
							].fetchedAt.toLocaleTimeString('en-US', {
								hour: 'numeric',
								minute: '2-digit',
								hour12: true,
							})}
						</span>
					)}
				</div>
				<div className="hidden items-center gap-4 sm:flex">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" className="shadow-xs">
								<ColumnsIcon className="text-muted-foreground" />
								<span>Columns</span>
								<ChevronDownIcon className="text-neutral-400 dark:text-neutral-600" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							{columns.map((col) => {
								return (
									<DropdownMenuCheckboxItem
										key={col}
										checked={selectedColumns.includes(col)}
										onCheckedChange={(checked) =>
											checked
												? setSelectedColumns([
														col,
														...selectedColumns,
													])
												: setSelectedColumns(
														selectedColumns.filter(
															(value) =>
																value !== col,
														),
													)
										}
									>
										{col}
									</DropdownMenuCheckboxItem>
								)
							})}
						</DropdownMenuContent>
					</DropdownMenu>
					<Select
						value={instanceFilter}
						onValueChange={setInstanceFilter}
					>
						<SelectTrigger className="hover:bg-accent">
							<FunnelIcon />
							<SelectValue placeholder="Filter" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel>Filter by</SelectLabel>
								{instanceFilters.map((state) => {
									return (
										<SelectItem key={state} value={state}>
											{state.replace(
												/\w\S*/g,
												(w) =>
													w[0].toUpperCase() +
													w.slice(1).toLowerCase(),
											)}
										</SelectItem>
									)
								})}
							</SelectGroup>
						</SelectContent>
					</Select>
					<Select
						value={instanceSort}
						onValueChange={setInstanceSort}
					>
						<SelectTrigger className="hover:bg-accent">
							<ArrowDownWideNarrowIcon />
							<SelectValue placeholder="Sort" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel>Sort by</SelectLabel>
								{columns.map((column) => {
									return (
										<SelectItem key={column} value={column}>
											{column}
										</SelectItem>
									)
								})}
							</SelectGroup>
						</SelectContent>
					</Select>
				</div>
			</div>
			{instances && !loading ? (
				<div className="overflow-clip rounded-lg border">
					<Table>
						<TableHeader className="bg-muted">
							<TableRow>
								{selectedColumns
									.sort(
										(a, b) =>
											columns.indexOf(a) -
											columns.indexOf(b),
									)
									.map((col, i) => (
										<TableHead
											className={`${i == 0 ? 'pl-4' : i == selectedColumns.length - 1 ? 'pr-4 text-right' : ''}`}
											key={col}
										>
											{col}
										</TableHead>
									))}
							</TableRow>
						</TableHeader>
						<TableBody>
							{instances
								.filter((instance) => {
									const permissions = getPermissions(
										instance,
										userInfo,
									)
									return (
										instanceFilter == 'all' ||
										(instanceFilter == 'actionable' &&
											(permissions.start ||
												permissions.stop ||
												permissions.reboot)) ||
										instance.State.Name == instanceFilter
									)
								})
								.sort((a, b) =>
									sortInstances(
										a,
										b,
										instanceSort,
										userInfo.email,
									),
								)
								.map((instance) => (
									<TableRow key={instance.InstanceId}>
										{selectedColumns.includes('Name') && (
											<TableCell className="pl-4 font-medium">
												<InstanceDetailsSheet
													instance={instance}
													awsAccount={selectedProfile}
												/>
											</TableCell>
										)}
										{selectedColumns.includes(
											'Instance ID',
										) && (
											<TableCell>
												{instance.InstanceId}
											</TableCell>
										)}
										{selectedColumns.includes('State') && (
											<TableCell>
												<StateBadge
													state={instance.State.Name}
												/>
											</TableCell>
										)}
										{selectedColumns.includes(
											'Public IP',
										) && (
											<TableCell>
												{instance.PublicIpAddress}
											</TableCell>
										)}
										{selectedColumns.includes(
											'Department',
										) && (
											<TableCell>
												{
													findTag(
														'iv:self-service:ownership',
														instance,
													)?.department
												}
											</TableCell>
										)}
										{selectedColumns.includes(
											'Project',
										) && (
											<TableCell>
												{
													findTag(
														'iv:self-service:ownership',
														instance,
													)?.project
												}
											</TableCell>
										)}
										{selectedColumns.includes('Owner') && (
											<TableCell>
												<UserBadge
													email={
														findTag(
															'iv:self-service:ownership',
															instance,
														)?.owner
													}
												/>
											</TableCell>
										)}
										{selectedColumns.includes(
											'Termination Date',
										) && (
											<TableCell>
												<span
													className={
														new Date(
															findTag(
																'iv:self-service:schedule',
																instance,
															)?.terminationDate,
														) <= new Date()
															? 'text-red-500 dark:text-red-400'
															: ''
													}
												>
													{formatDate(
														findTag(
															'iv:self-service:schedule',
															instance,
														)?.terminationDate,
													)}
												</span>
											</TableCell>
										)}
										{selectedColumns.includes(
											'Actions',
										) && (
											<TableCell>
												<ActionButtons
													instance={instance}
													awsAccount={selectedProfile}
												/>
											</TableCell>
										)}
									</TableRow>
								))}
						</TableBody>
					</Table>
				</div>
			) : (
				<LoadingScreen />
			)}
		</div>
	)
}