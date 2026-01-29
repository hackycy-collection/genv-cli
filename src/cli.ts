import { cac } from 'cac'
import { version } from '../package.json'

const cli = cac('genv')

// global options
interface GlobalCLIOptions {
  '--'?: string[]
  'config'?: string
}

cli
  .command('', 'Generate environment files')
  .option('-c, --config <file>', `[string] use specified config file`)
  .action(async (options: GlobalCLIOptions) => {
    const { generateEnvFile } = await import('./index')
    await generateEnvFile(options.config)
  })

cli.help()
cli.version(version)

cli.parse()
