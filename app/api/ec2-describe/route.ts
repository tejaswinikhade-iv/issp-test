// import { isAuthorizedEmail } from '@/lib/auth'
import {
	type Instance,
	DescribeInstancesCommand,
	EC2Client,
} from '@aws-sdk/client-ec2'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
	let token: string | undefined
	let awsAccount: string | undefined
	let regions: string[] | undefined

	try {
		const body = await request.json()
		token = body.token
		awsAccount = body.awsAccount
		regions = body.regions
	} catch {
		return NextResponse.json(
			{ error: 'Invalid request body.' },
			{ status: 400 },
		)
	}

	if (!token || !awsAccount || !regions) {
		return NextResponse.json(
			{ error: 'Unauthorized: Token missing.' },
			{ status: 401 },
		)
	}

	// const authorized = await isAuthorizedEmail(token)

	// if (!authorized) {
	// 	return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	// }
	console.log(`Fetching instances from regions: ${regions.join(', ')}`)

	// const regionDiscoveryClient = new EC2Client({
	// 	region: 'ap-south-1',
	// 	credentials,
	// })

	try {
		// const describeRegionsCommand = new DescribeRegionsCommand({})
		// const regionsResponse = await regionDiscoveryClient.send(
		// 	describeRegionsCommand,
		// )
		// const regionNames =
		// 	regionsResponse.Regions?.map((region) => region.RegionName).filter(
		// 		(name): name is string => typeof name === 'string',
		// 	) || []

		// if (regionNames.length === 0) {
		// 	console.warn('No regions found or accessible.')
		// 	return NextResponse.json({ instances: [] })
		// }

		console.log(`Fetching instances from regions: ${regions.join(', ')}`)

		const allInstancesPromises = regions.map(async (regionName) => {
			const regionalEc2Client = new EC2Client({
				region: regionName,
				profile: awsAccount,
			})

			try {
				const command = new DescribeInstancesCommand({})
				const response = await regionalEc2Client.send(command)
				const instancesInRegion =
					response.Reservations?.flatMap(
						(res) => res.Instances || [],
					) || []

				return instancesInRegion.map((instance) => ({
					...instance,
					Region: regionName,
				}))
			} catch (regionError) {
				console.error(
					`Error fetching instances from region ${regionName}:`,
					regionError,
				)
				return []
			}
		})

		const resultsPerRegion = await Promise.all(allInstancesPromises)
		const allInstances = resultsPerRegion.flat() as (Instance & {
			Region?: string
		})[]

		return NextResponse.json({
			instances: allInstances,
			count: allInstances.length,
		})
	} catch (error) {
		console.error('EC2 global fetch error:', error)
		return NextResponse.json(
			{ error: 'Failed to fetch EC2 instances from all regions' },
			{ status: 500 },
		)
	}
}
