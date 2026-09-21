import fs from 'node:fs/promises'
import path from 'node:path'
import YAML from 'yaml'
import { NextResponse } from 'next/server'
import type { Config } from '@/lib/config'

export async function GET() {
	try {
		const fileContents = await fs.readFile(path.join(process.cwd(), 'config.yml'), 'utf8')
		return NextResponse.json(YAML.parse(fileContents) as Config)
	} catch (error) {
		console.error('Error reading or parsing config.yml:', error)
		return NextResponse.json({ error: 'Failed to load configuration.' }, { status: 500 })
	}
}