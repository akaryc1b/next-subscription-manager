import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const severities = new Set(['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)

/** Missing or malformed scan data is an error, never evidence of zero findings. */
export function blockingFindings(report) {
  if (!isObject(report) || report.SchemaVersion !== 2 || report.ArtifactType !== 'container_image') {
    throw new Error('Expected a Trivy schema-v2 container image report.')
  }
  if (!Array.isArray(report.Results) || report.Results.length === 0) {
    throw new Error('The scan report contains no package scan results.')
  }
  const findings = []
  for (const result of report.Results) {
    if (!isObject(result) || typeof result.Target !== 'string' || !result.Target) {
      throw new Error('Malformed package scan result.')
    }
    const vulnerabilities = result.Vulnerabilities ?? []
    if (!Array.isArray(vulnerabilities)) throw new Error('Malformed vulnerability list.')
    for (const finding of vulnerabilities) {
      if (!isObject(finding) || !severities.has(finding.Severity) ||
          typeof finding.VulnerabilityID !== 'string' || !finding.VulnerabilityID ||
          typeof finding.PkgName !== 'string' || !finding.PkgName) {
        throw new Error('Incomplete vulnerability record.')
      }
      if (finding.Severity === 'HIGH' || finding.Severity === 'CRITICAL') {
        findings.push({ target: result.Target, ...finding })
      }
    }
  }
  return findings
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (!process.argv[2]) throw new Error('Usage: node scripts/check-trivy-report.mjs <report.json>')
    const findings = blockingFindings(JSON.parse(readFileSync(process.argv[2], 'utf8')))
    console.log(`HIGH/CRITICAL findings: ${findings.length}`)
    // Keep untrusted report text on a single line; do not interpret it as commands.
    const cell = value => String(value ?? 'unfixed').replace(/[\r\n\t]/g, ' ')
    for (const finding of findings) {
      console.log([finding.Severity, finding.PkgName, finding.InstalledVersion,
        finding.FixedVersion, finding.VulnerabilityID].map(cell).join('\t'))
    }
    process.exitCode = findings.length ? 1 : 0
  } catch (error) {
    console.error(`Vulnerability gate failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 2
  }
}
