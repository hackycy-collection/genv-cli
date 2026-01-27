import path from 'node:path'

export function loadConfigFromFile(configFile?: string): string | void {
  let resolvedPath: string | undefined

  if (configFile) {
    resolvedPath = path.resolve(configFile)
  }

  return resolvedPath
}
