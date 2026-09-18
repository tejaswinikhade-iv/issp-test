'use client'

import LoadingScreen from '@/components/loading-screen'
import { Button } from '@/components/ui/button'
import VMTable from '@/components/vm-table'
import useConfig from '@/hooks/use-config'
import useUserInfo from '@/hooks/use-user-info'
import { checkIsAdmin } from '@/lib/auth'
import { getConfig } from '@/lib/config'
import { type TokenResponse, useGoogleLogin } from '@react-oauth/google'
import Image from 'next/image'
import { useEffect, useState } from 'react'

export default function Home() {
	const [mounted, setMounted] = useState(false)
	const { setConfig } = useConfig()
	const { userInfo, setUserInfo } = useUserInfo()

	// async function handleLoginSuccess(tokenResponse: TokenResponse) {
	// 	localStorage.setItem('googleAccessToken', tokenResponse.access_token)
	// 	await fetchUserInfo(tokenResponse.access_token)
	// }

	// const login = useGoogleLogin({
	// 	onSuccess: handleLoginSuccess,
	// })

	// async function fetchUserInfo(accessToken: string) {
	// 	try {
	// 		const res = await fetch(
	// 			'https://www.googleapis.com/oauth2/v3/userinfo',
	// 			{
	// 				headers: {
	// 					Authorization: `Bearer ${accessToken}`,
	// 				},
	// 			},
	// 		)

	// 		if (!res.ok) {
	// 			throw new Error('Failed to fetch user info')
	// 		}

	// 		const data = await res.json()
	// 		const isAdmin = await checkIsAdmin({ userEmail: data.email })

	// 		setUserInfo({ ...data, isAdmin })
	// 		console.log('Auto-logged in user:', data.email)
	// 	} catch (err) {
	// 		console.error('Error fetching user info:', err)
	// 		localStorage.removeItem('googleAccessToken')
	// 	}
	// }

	useEffect(() => {
		async function checkLogin() {
			// const token = localStorage.getItem('googleAccessToken')
			// if (token) {
			// 	await fetchUserInfo(token)
			// }
			setMounted(true)
		}

		async function loadConfig() {
			const fetchedConfig = await getConfig()
			setConfig(fetchedConfig)
		}

		loadConfig()
		checkLogin()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	// useEffect(() => {
	// 	async function init() {
	// 		try {
	// 			const configPromise = getConfig().then(setConfig)
	// 			// const token = localStorage.getItem('googleAccessToken')
	// 			const loginPromise = token
	// 				? fetchUserInfo(token)
	// 				: Promise.resolve()

	// 			await Promise.all([configPromise, loginPromise])
	// 		} catch (error) {
	// 			console.error('Failed to initialize component:', error)
	// 		} finally {
	// 			setMounted(true)
	// 		}
	// 	}

	// 	init()
	// 	// eslint-disable-next-line react-hooks/exhaustive-deps
	// }, [])

	// return mounted ? (
		userInfo?.email ? (
			<VMTable />
	// 	) : (
	// 		<div className="flex h-full w-full items-center justify-center">
	// 			<Button
	// 				className="h-[40px] gap-[10px] border-1 border-[#747775] bg-white px-[12px] text-[#1F1F1F] hover:bg-white hover:shadow dark:border-[#E3E3E3] dark:bg-[#131314] dark:text-[#E3E3E3]"
	// 				onClick={() => login()}
	// 			>
	// 				<Image
	// 					alt="Google logo"
	// 					height={20}
	// 					src="/google-g.svg"
	// 					width={20}
	// 				/>
	// 				<span>Sign in with Google</span>
	// 			</Button>
	// 		</div>
	// 	)
	// ) : (
	// 	<LoadingScreen />
	// )
}