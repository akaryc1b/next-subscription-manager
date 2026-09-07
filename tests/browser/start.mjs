import { cpSync, existsSync } from 'node:fs'

// Run the exact standalone output used by the Docker deployment, with its static assets.
cpSync('.next/static', '.next/standalone/.next/static', { recursive: true })
if (existsSync('public')) cpSync('public', '.next/standalone/public', { recursive: true })
process.env.HOSTNAME = '127.0.0.1'
process.env.PORT = '3000'
await import('../../.next/standalone/server.js')
