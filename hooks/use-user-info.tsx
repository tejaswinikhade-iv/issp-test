/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { createContext, useContext, useState } from 'react'

interface UserInfoProps {
	userInfo: any
	setUserInfo: React.Dispatch<React.SetStateAction<any>>
}

const UserInfoContext = createContext({})

export function UserInfoContextProvider({
	children,
}: {
	children: React.ReactNode
}) {
	const [userInfo, setUserInfo] = useState<any | null>(null)

	return (
		<UserInfoContext.Provider value={{ userInfo, setUserInfo }}>
			{children}
		</UserInfoContext.Provider>
	)
}

export default function useUserInfo() {
	return useContext(UserInfoContext) as UserInfoProps
}
