// import {
//     type Instance,
//     DescribeInstancesCommand,
//     EC2Client,
// } from '@aws-sdk/client-ec2'
// import { NextRequest, NextResponse } from 'next/server'

// export async function POST(request: NextRequest) {
//     let awsAccount: string | undefined
//     let regions: string[] | undefined

//     try {
//         const body = await request.json()

//         awsAccount = body.awsAccount
//         regions = body.regions
//     } catch {
//         return NextResponse.json(
//             { error: 'Invalid request body.' },
//             { status: 400 },
//         )
//     }

//     if (
//         !awsAccount ||
//         !Array.isArray(regions) ||
//         regions.length === 0
//     ) {
//         return NextResponse.json(
//             {
//                 error:
//                     'Invalid request: awsAccount and a non-empty regions array are required.',
//             },
//             { status: 400 },
//         )
//     }

//     console.log(
//         `Fetching instances for account ${awsAccount} from regions: ${regions.join(', ')}`,
//     )

//     try {
//         const allInstancesPromises = regions.map(async (regionName) => {
//             const regionalEc2Client = new EC2Client({
//                 region: regionName,
//             })

//             try {
//                 const regionInstances: (Instance & {
//                     Region?: string
//                 })[] = []

//                 let nextToken: string | undefined

//                 do {
//                     const response = await regionalEc2Client.send(
//                         new DescribeInstancesCommand({
//                             NextToken: nextToken,
//                         }),
//                     )

//                     const instances =
//                         response.Reservations?.flatMap(
//                             (reservation) =>
//                                 reservation.Instances || [],
//                         ) || []

//                     regionInstances.push(
//                         ...instances.map((instance) => ({
//                             ...instance,
//                             Region: regionName,
//                         })),
//                     )

//                     nextToken = response.NextToken
//                 } while (nextToken)

//                 return regionInstances
//             } catch (regionError) {
//                 console.error(
//                     `Error fetching instances from region ${regionName}:`,
//                     regionError,
//                 )

//                 return []
//             }
//         })

//         const resultsPerRegion = await Promise.all(
//             allInstancesPromises,
//         )

//         const allInstances = resultsPerRegion.flat()

//         return NextResponse.json({
//             instances: allInstances,
//             count: allInstances.length,
//         })
//     } catch (error) {
//         console.error('EC2 global fetch error:', error)

//         return NextResponse.json(
//             {
//                 error:
//                     'Failed to fetch EC2 instances from all regions.',
//             },
//             { status: 500 },
//         )
//     }
// }