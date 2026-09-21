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
		let fetchedInstances = []

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
			fetchedInstances = data.instances || []
		} else {
			// Default to AWS for any profile without an explicit provider,
			// so existing config.yml entries keep working unchanged.
			const requestBody = {
				token,
				awsAccount: selectedProfile,
				regions: [selectedRegion],
			}

			const res = await fetch('/api/ec2-describe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody),
			})

			const data = await res.json()
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