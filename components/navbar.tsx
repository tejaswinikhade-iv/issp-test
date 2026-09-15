'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import useUserInfo from '@/hooks/use-user-info'
import { resetPreferences } from '@/lib/utils'
import { googleLogout } from '@react-oauth/google'
import { ChevronDownIcon, SettingsIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import Image from 'next/image'
import Link from 'next/link'

function ThemeSwitch() {
	const { theme, setTheme, resolvedTheme } = useTheme()
	const currentTheme = theme === 'system' ? resolvedTheme : theme

	return (
		<div className="flex w-full items-center justify-between gap-2">
			<Label htmlFor="dark-mode" className="font-normal">
				Dark mode
			</Label>
			<Switch
				checked={currentTheme === 'dark'}
				onCheckedChange={() =>
					setTheme(currentTheme === 'dark' ? 'light' : 'dark')
				}
				id="dark-mode"
			/>
		</div>
	)
}

export default function Navbar() {
	const { userInfo, setUserInfo } = useUserInfo()

	function handleLogout() {
		googleLogout()
		setUserInfo(null)
		localStorage.removeItem('googleAccessToken')
	}

	return (
		<nav>
			<div className="flex items-center justify-between gap-4 p-2">
				<Link href="/" className="flex items-center gap-4 pl-2">
					<Image
						className="mr-[-0.25rem] ml-2"
						src="/issp.svg"
						alt="Logo"
						width={22}
						height={22}
					/>
					<p className="hidden text-xl font-semibold sm:inline">
						Infra Self-Service Portal
					</p>
					<p className="text-xl font-semibold sm:hidden">ISSP</p>
				</Link>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						{userInfo ? (
							<Button variant="ghost" className="has-[>svg]:p-2">
								<Avatar className="size-6">
									<AvatarImage src={userInfo?.picture} />
									<AvatarFallback>
										{userInfo.name
											.split(/\s+/)
											.map((w: string) =>
												w[0].toUpperCase(),
											)
											.join('')}
									</AvatarFallback>
								</Avatar>
								<span>{userInfo.name}</span>
								<ChevronDownIcon />
							</Button>
						) : (
							<Button variant="ghost">
								<SettingsIcon />
							</Button>
						)}
					</DropdownMenuTrigger>
					<DropdownMenuContent className="mx-2 w-56" align="center">
						<DropdownMenuLabel>Settings</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem
								onClick={(e) => e.preventDefault()}
							>
								<ThemeSwitch />
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={(e) => {
									e.preventDefault()
									resetPreferences()
								}}
							>
								Reset preferences
							</DropdownMenuItem>
							<DropdownMenuItem onClick={handleLogout}>
								Log out
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem asChild>
								<Link
									href="https://bitbucket.org/inspiritvision/infra-self-service-portal/"
									target="_blank"
								>
									Bitbucket
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Link
									href="https://bitbucket.org/inspiritvision/infra-self-service-portal/src/main/README.md"
									target="_blank"
								>
									Documentation
								</Link>
							</DropdownMenuItem>
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			<Separator />
		</nav>
	)
}
