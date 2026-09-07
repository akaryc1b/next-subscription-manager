import { createServer } from 'node:https'
import { request } from 'node:http'
import { readFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

if (process.env.WORKSPACE_E2E !== '1') throw new Error('TLS fixture is for isolated browser acceptance only.')
mkdirSync('tests/browser/.auth', { recursive: true })
const key = 'tests/browser/.auth/localhost-key.pem'
const cert = 'tests/browser/.auth/localhost-cert.pem'
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert, '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1'], { stdio: 'ignore' })
createServer({ key: readFileSync(key), cert: readFileSync(cert) }, (incoming, outgoing) => {
  const upstream = request({
    hostname: '127.0.0.1', port: 3000, method: incoming.method, path: incoming.url,
    headers: { ...incoming.headers, 'x-forwarded-proto': 'https', 'x-forwarded-host': incoming.headers.host },
  }, response => {
    outgoing.writeHead(response.statusCode || 502, response.headers)
    response.pipe(outgoing)
  })
  upstream.on('error', () => { if (!outgoing.headersSent) outgoing.writeHead(502); outgoing.end('Test upstream unavailable') })
  incoming.on('aborted', () => upstream.destroy())
  incoming.pipe(upstream)
}).listen(3443, '127.0.0.1')
