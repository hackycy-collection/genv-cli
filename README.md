# genv-cli

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![License][license-src]][license-href]

配置化的方式生成dotenv文件小工具

> 当你的项目一套代码但拥有多套生产环境配置时却想只保持一个`.env.prodction`配置时的解决方案

## 安装

``` bash
pnpm add -D genv-cli
```

## 配置

默认读取项目根目录的 `genv.config.*`（支持 ts/js/json）。

示例配置：

```ts
import { defineConfig } from 'genv-cli'

export default defineConfig({
  // environments 的 tag 作为环境名，output 为输出文件路径（可相对路径 / 仅文件名）
  // 不同环境可以输出到同一个 env 文件
  environments: [
    {
      tag: '生产环境1',
      output: '.env.production',
      config: {
        API_BASE_URL: 'http://localhost:3000',
      },
    },
    {
      tag: '生产环境2',
      output: '.env.production',
      config: {
        API_BASE_URL: 'https://api.example.com',
      },
    },
  ],
})
```

## 使用

生成环境变量文件：

```bash
npx genv
```

指定配置文件：

```bash
genv -c ./genv.config.ts
```

运行后会提示选择环境，并写入对应的`env`文件路径。

## License

[MIT](./LICENSE) License © [hackycy](https://github.com/hackycy)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/genv-cli?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/genv-cli
[npm-downloads-src]: https://img.shields.io/npm/dm/genv-cli?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/genv-cli
[bundle-src]: https://img.shields.io/bundlephobia/minzip/genv-cli?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=genv-cli
[license-src]: https://img.shields.io/github/license/hackycy-collection/genv-cli.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/hackycy-collection/genv-cli/blob/main/LICENSE
