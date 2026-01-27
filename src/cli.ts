import { cac } from 'cac'
import { version } from '../package.json'

const cli = cac('genv')

// global options
interface GlobalCLIOptions {
  '--'?: string[]
  'config'?: string
  'base'?: string
}

cli
  .command('', 'Generate environment files')
  .option('-c, --config <file>', `[string] use specified config file`)
  .action((options: GlobalCLIOptions) => {
    console.log('gg', options)
    console.log('Generating environment files...')
  })

cli.help()
cli.version(version)

cli.parse()
