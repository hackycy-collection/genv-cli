#!/usr/bin/env node

import { writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { cac } from 'cac'
import prompts from 'prompts'
import { loadConfig } from 'unconfig'

interface EnvConfig {
  name: string
  output: string
  variables: Record<string, string>
}

interface ConfigFile {
  configs: EnvConfig[]
}

async function loadEnvConfig(configDir?: string): Promise<ConfigFile | null> {
  const { config } = await loadConfig<ConfigFile>({
    sources: [
      {
        files: 'env.config',
        extensions: ['js', 'ts', 'json'],
      },
    ],
    cwd: configDir ? resolve(configDir) : process.cwd(),
    defaults: {
      configs: [],
    },
  })

  return config || null
}

function escapeEnvValue(value: any): string {
  // Convert other non-string types to string
  const stringValue = typeof value === 'string' ? value : String(value)

  if (stringValue === '') {
    return '""'
  }

  // Escape special characters
  let escaped = stringValue
    .replace(/\\/g, '\\\\') // Escape backslashes first
    .replace(/\n/g, '\\n') // Escape newlines
    .replace(/\r/g, '\\r') // Escape carriage returns
    .replace(/"/g, '\\"') // Escape double quotes

  // Check if value needs quotes
  const needsQuotes = /[\s#=${}]/.test(escaped) || escaped.startsWith(' ') || escaped.endsWith(' ')

  if (needsQuotes) {
    escaped = `"${escaped}"`
  }

  return escaped
}

function formatDotEnv(variables: Record<string, any>): string {
  return Object.entries(variables)
    .map(([key, value]) => `${key}=${escapeEnvValue(value)}`)
    .join('\n')
}

async function selectConfig(configs: EnvConfig[]): Promise<EnvConfig | null> {
  if (configs.length === 0) {
    console.error('No configurations found in env.config file')
    return null
  }

  if (configs.length === 1) {
    const singleConfig = configs[0]
    // eslint-disable-next-line no-console
    console.log(`Using single configuration: ${singleConfig.name}`)
    return singleConfig
  }

  const { selected } = await prompts({
    type: 'select',
    name: 'selected',
    message: 'Select a configuration to write:',
    choices: configs.map(config => ({
      title: config.name,
      description: `Output: ${config.output}`,
      value: config,
    })),
  })

  return selected || null
}

async function writeEnvFile(config: EnvConfig, configDir?: string): Promise<void> {
  const outputPath = configDir ? join(resolve(configDir), config.output) : config.output
  const content = formatDotEnv(config.variables)

  await writeFile(outputPath, content, 'utf-8')
  // eslint-disable-next-line no-console
  console.log(`✓ Environment variables written to ${outputPath}`)
}

async function main(): Promise<void> {
  const cli = cac('genv')

  cli
    .command('', 'Generate environment files from configuration')
    .option('-e, --config-dir <dir>', 'Directory containing env.config file')
    .action(async (options: { configDir?: string }) => {
      try {
        const config = await loadEnvConfig(options.configDir)

        if (!config) {
          console.error('No env.config file found')
          process.exit(1)
        }

        if (!config.configs || config.configs.length === 0) {
          console.error('No configurations defined in env.config file')
          process.exit(1)
        }

        const selected = await selectConfig(config.configs)

        if (!selected) {
          console.error('No configuration selected')
          process.exit(1)
        }

        await writeEnvFile(selected, options.configDir)
      }
      catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    })

  cli.help()
  cli.version('0.0.0')

  cli.parse()
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
