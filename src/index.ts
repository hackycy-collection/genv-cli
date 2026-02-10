import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { cancel, confirm, intro, isCancel, outro, select, text } from '@clack/prompts'
import { loadConfig } from 'unconfig'

export type EnvPrimitive = string | number | boolean | bigint | Date | null | undefined
export type EnvValue = EnvPrimitive | Record<string, unknown> | unknown[]
export type EnvConfig = Record<string, EnvValue>

export interface EnvironmentItem {
  output: string
  config: EnvConfig
  tag: string
}

export type EnvironmentsMap = Record<string, EnvironmentItem>

export interface UserConfig {
  environments: EnvironmentItem[]
}

export interface LoadedConfigResult {
  config: UserConfig
  configFile?: string
}

export function defineConfig(config: UserConfig): UserConfig {
  return config
}

export async function loadConfigFromFile(configFile?: string): Promise<LoadedConfigResult> {
  const resolvedPath = configFile ? path.resolve(configFile) : undefined
  const extensions = ['ts', 'mts', 'cts', 'js', 'mjs', 'cjs', 'json']
  const sources = resolvedPath
    ? [
        { files: resolvedPath },
      ]
    : [
        { files: 'genv.config', extensions },
      ]

  const { config } = await loadConfig<UserConfig>({
    cwd: process.cwd(),
    sources,
    defaults: {
      environments: [],
    },
  })

  return {
    config: config || { environments: [] },
    configFile: resolvedPath,
  }
}

/**
 * 将配置映射为环境变量列表
 *
 * @example
 * ``` ts
 * const cfg = { key: 'value' }
 * const envVars = mapConfigToEnvVariables(cfg)
 * console.log(envVars) // ['KEY=VALUE']
 * ```
 *
 * @param cfg 配置对象
 * @returns 变量列表
 */
export function mapConfigToEnvVariables(cfg: Record<string, any>): string[] {
  const envVars: string[] = []

  const normalizeKey = (key: string): string =>
    key
      .trim()
      .replace(/\W/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '')
      .toUpperCase()

  const stringifyValue = (value: unknown): string => {
    if (value === null)
      return ''
    if (value === undefined)
      return ''

    if (value instanceof Date)
      return value.toISOString()

    switch (typeof value) {
      case 'string':
        return value
      case 'number':
      case 'bigint':
      case 'boolean':
        return String(value)
      case 'object':
        return JSON.stringify(value)
      case 'function':
      case 'symbol':
        return ''
      default:
        return String(value)
    }
  }

  const quoteIfNeeded = (value: string): string => {
    if (value === '')
      return '""'

    const needsQuotes = /[\s#'"\\]/.test(value)
    if (!needsQuotes)
      return value

    const escaped = value
      .replace(/\\/g, '\\\\')
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n')
      .replace(/"/g, '\\"')

    return `"${escaped}"`
  }

  for (const [rawKey, rawValue] of Object.entries(cfg)) {
    const key = normalizeKey(rawKey)
    if (!key)
      continue

    const value = stringifyValue(rawValue)
    const safeValue = quoteIfNeeded(value)

    envVars.push(`${key}=${safeValue}`)
  }

  return envVars
}

export async function generateEnvFile(configFilePath?: string): Promise<void> {
  intro('genv')

  const { config } = await loadConfigFromFile(configFilePath)
  const envTags = (config.environments || []).map(env => env.tag)

  // 是否需要二次确认，避免CI环境下卡住
  let needConfirm = true

  // duplicate tags check
  const tagSet = new Set<string>(Array.from(envTags))
  if (tagSet.size < envTags.length) {
    // find duplicate tags
    const duplicates = envTags.filter((item, index) => envTags.indexOf(item) !== index)
    cancel(`Duplicate environment tags found: ${duplicates.join(', ')}`)
    return
  }

  if (envTags.length === 0) {
    cancel('No environments found in config.')
    return
  }

  let envTag: string | undefined

  // for ci
  if (process.env.GENV_CI_TAG) {
    envTag = process.env.GENV_CI_TAG
    needConfirm = false
  }
  else if (envTags.length > 1) {
    const selected = await select({
      message: 'Select environment',
      options: envTags.map(name => ({
        label: name,
        value: name,
      })),
    })

    if (isCancel(selected)) {
      cancel('Operation cancelled.')
      return
    }

    envTag = selected as string
  }
  else if (envTags.length === 1) {
    envTag = envTags[0]
  }

  if (!envTag) {
    cancel('No environment selected.')
    return
  }

  const envItem = config.environments.find(env => env.tag === envTag)
  if (!envItem) {
    cancel(`Environment not found: ${envTag}`)
    return
  }

  let outputFile = envItem.output
  if (!outputFile) {
    const input = await text({
      message: 'Output env file path',
      placeholder: 'e.g. .env.production',
    })

    if (isCancel(input)) {
      cancel('Operation cancelled.')
      return
    }

    outputFile = (input as string)
  }

  if (outputFile.trim() === '') {
    cancel('Output file path cannot be empty.')
    return
  }

  if (Object.keys(envItem.config || {}).length === 0) {
    cancel(`No config found for environment: ${envTag}`)
    return
  }

  const envLines = mapConfigToEnvVariables(envItem.config)
  const content = envLines.join('\n').concat('\n')

  // const baseDir = configFile ? path.dirname(configFile) : process.cwd()
  const outputPath = path.isAbsolute(outputFile)
    ? outputFile
    : path.resolve(process.cwd(), outputFile)

  // 二次确认
  if (needConfirm) {
    const shouldWrite = await confirm({
      message: `Generate env for "${envTag}" and write to "${outputPath}"?`,
    })

    if (isCancel(shouldWrite) || !shouldWrite) {
      cancel('Operation cancelled.')
      return
    }
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, content, 'utf8')

  outro(`Env file generated: ${outputPath}`)
}
