# genv-cli

A CLI tool for managing environment variables.

## Features

- **Load configuration from multiple file formats**: Supports `env.config.js`, `env.config.ts`, and `env.config.json` files using `unconfig`
- **Multiple environment configurations**: Define multiple named configurations with different output files
- **Interactive selection**: Choose which configuration to write when multiple are available
- **Simple CLI interface**: Use `-e` flag to specify configuration directory

## Installation

```bash
npm install -g genv-cli
```

## Usage

```bash
genv --help
```

### Basic Usage

1. Create an `env.config.js` file in your project:
```javascript
export default {
  configs: [
    {
      name: 'Development',
      output: '.env.development',
      variables: {
        API_URL: 'http://localhost:3000',
        DEBUG: 'true'
      }
    },
    {
      name: 'Production',
      output: '.env.production',
      variables: {
        API_URL: 'https://api.example.com',
        DEBUG: 'false'
      }
    }
  ]
}
```

2. Run the CLI:
```bash
# If env.config.js is in current directory
genv

# Or specify config directory
genv -e ./config
```

3. If multiple configurations are defined, you'll be prompted to select one.

4. The selected environment variables will be written to the specified output file.

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm run build

# Test
pnpm run test

# Lint
pnpm run lint

# Type checking
pnpm run typecheck
```

## License

[MIT](./LICENSE) License
