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

``` ts
import ExtraAppConfigPlugin from 'genv-cli'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    ExtraAppConfigPlugin({
      isBuild: true,
      globalVarName: '__APP_ENV__',
      envPrefixMatch: 'VITE_GLOB',
      configFile: '_app.config.js',
    }),
  ],
})
```

**辅助函数获取**

``` ts
import { getEnvConfig } from 'genv-cli/helper'

console.log('Env Config:', getEnvConfig('__APP_ENV__'))
```

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
