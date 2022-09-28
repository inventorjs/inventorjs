/**
 * action 入口
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/core'
import webpack, { type Configuration } from 'webpack'
import detectPort from 'detect-port';
import webpackDevServer from 'webpack-dev-server'
import webpackFactory from '../config/webpackFactory.js'
export default class DevAction extends Action {
  description = '启动开发服务器'
  options = []
  async action() {
    const pluginConfig = await this.getPluginConfig('app')
    const { type } = pluginConfig

    if (type === 'react-webpack-js') {
      const port = await detectPort(8089)
      const baseConfig = webpackFactory({ root: this.pwd, release: false, port })
      const webpackConfig: Configuration = pluginConfig?.webpack?.(baseConfig) ?? baseConfig
      const devServerConfig = webpackConfig.devServer;

      const compiler = webpack(webpackConfig)
      compiler.hooks.done.tap('done', (stats) => {
        const statJson = stats.toJson({
          all: false,
          warnings: true,
          errors: true,
        })
        if (statJson.errors?.length) {
          this.log.error('Compile failed.')
          return 
        }
        if (statJson.warnings?.length) {
          this.log.error('Compile with warnings.')
        }
      })
      compiler.hooks.invalid.tap('invalid', (modulePath) => {
        this.log.info(`Compiling...[${this.color.yellow(modulePath)}]`)
      })

      const devServer = new webpackDevServer({ ...devServerConfig }, compiler)
      await devServer.startCallback(() => {
        this.log.clear()
        this.log.success(`Development server started
    ServerHost: ${devServerConfig?.server}://localhost:${port}
    StaticPath: ${devServerConfig?.static?.directory}
    HistoryApiFallback: ${devServerConfig?.historyApiFallback}
        `)
      })
    }
  }
}