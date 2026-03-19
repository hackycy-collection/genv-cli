import type { Dirent } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { cancel, confirm, intro, isCancel, log, outro, select, text } from '@clack/prompts'
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

const CONFIG_EXTENSIONS = ['ts', 'mts', 'cts', 'js', 'mjs', 'cjs', 'json']
const CONFIG_NAMES = CONFIG_EXTENSIONS.map(ext => `genv.config.${ext}`)
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', '.cache'])

async function hasPackageJson(dir: string): Promise<boolean> {
  try {
    await fs.access(path.join(dir, 'package.json'))
    return true
  }
  catch {
    return false
  }
}

export async function findAllConfigFiles(cwd: string): Promise<string[]> {
  const results: string[] = []

  async function walk(dir: string): Promise<void> {
    let entries: Dirent[]
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    }
    catch {
      return
    }

    const names = entries.map(e => e.name)
    const configName = names.find(n => CONFIG_NAMES.includes(n))
    if (configName && await hasPackageJson(dir))
      results.push(path.join(dir, configName))

    for (const entry of entries) {
      if (entry.isDirectory() && !IGNORE_DIRS.has(entry.name))
        await walk(path.join(dir, entry.name))
    }
  }

  await walk(cwd)
  return results
}

export async function loadConfigFromFile(configFile: string): Promise<LoadedConfigResult> {
  const { config, sources } = await loadConfig<UserConfig>({
    cwd: path.dirname(configFile),
    sources: [{ files: path.basename(configFile) }],
    defaults: { environments: [] },
  })

  return {
    config: config || { environments: [] },
    configFile: sources[0] ?? configFile,
  }
}

export async function resolveConfigFile(explicitConfig?: string): Promise<string | undefined> {
  if (explicitConfig)
    return path.resolve(explicitConfig)

  const cwd = process.cwd()
  const found = await findAllConfigFiles(cwd)

  if (found.length === 0)
    return undefined

  if (found.length === 1) {
    const dir = path.dirname(found[0])
    const rel = path.relative(cwd, dir) || '.'
    let pkgName: string | undefined
    try {
      const raw = await fs.readFile(path.join(dir, 'package.json'), 'utf8')
      pkgName = JSON.parse(raw).name
    }
    catch {}
    const label = pkgName ?? path.basename(dir)
    log.info(`Workspace: ${label} (${rel})`)
    return found[0]
  }

  // multiple workspaces — let user pick
  const options = await Promise.all(found.map(async (f) => {
    const dir = path.dirname(f)
    const rel = path.relative(cwd, dir) || '.'
    let pkgName: string | undefined
    try {
      const raw = await fs.readFile(path.join(dir, 'package.json'), 'utf8')
      pkgName = JSON.parse(raw).name
    }
    catch {}
    const label = pkgName ?? path.basename(dir)
    return { label, hint: rel, value: f }
  }))

  const selected = await select({
    message: 'Select workspace',
    options,
  })

  if (isCancel(selected))
    return undefined

  return selected as string
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

  const resolvedConfigFile = await resolveConfigFile(configFilePath)
  if (!resolvedConfigFile) {
    cancel('No genv config file found.')
    return
  }

  const { config, configFile } = await loadConfigFromFile(resolvedConfigFile)
  const configDir = path.dirname(configFile!)
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
    : path.resolve(configDir, outputFile)

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
