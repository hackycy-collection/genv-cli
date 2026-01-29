# genv-cli

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![License][license-src]][license-href]

用于将配置文件抽离出来并注入到项目中的Vite Plugin

## 安装

``` bash
pnpm add -D genv-cli
```

## 使用

### 配置文件

默认读取项目根目录的 genv.config.* 或 genv.*（支持 ts/js/json）。

示例配置：

```ts
import { defineConfig } from './src/index'

export default defineConfig({
  // environments 的 key 直接作为输出文件路径（可相对路径 / 仅文件名）
  environments: {
    '.env': {
      NODE_ENV: 'development',
      API_BASE_URL: 'http://localhost:3000',
    },
    '.env.production': {
      NODE_ENV: 'production',
      API_BASE_URL: 'https://api.example.com',
    },
  },
  // 可选
  defaultEnvironment: '.env',
})
```

### 命令行

生成环境变量文件：

```bash
genv
```

指定配置文件：

```bash
genv -c ./genv.config.ts
```

运行后会提示选择环境，并写入对应的 env 文件路径。

## License

[MIT](./LICENSE) License © [hackycy](https://github.com/hackycy)

## Credits

This project also partially contains code derived or copied from the following projects:

- [Vben](https://github.com/vbenjs/vue-vben-admin/)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/genv-cli?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/genv-cli
[npm-downloads-src]: https://img.shields.io/npm/dm/genv-cli?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/genv-cli
[bundle-src]: https://img.shields.io/bundlephobia/minzip/genv-cli?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=genv-cli
[license-src]: https://img.shields.io/github/license/hackycy-collection/genv-cli.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/hackycy-collection/genv-cli/blob/main/LICENSE
