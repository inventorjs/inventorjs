/**
 * 插件模块
 * @author: sunkeysun
 */
import { createRequire } from 'node:module'
import path from 'node:path'
import { readdir } from 'node:fs/promises'
import { Command } from 'commander'
import * as rc from '../rc.js'
import Plugin from './Plugin.js'
import Action, { type ActionOption } from './Action.js'

type PluginType = new () => Plugin

type PluginConfig = {
  pluginName: string
  packageName: string
  options?: Record<string, unknown>
}

const require = createRequire(import.meta.url)

const internalPlugins = [ 'plugin' ]

function getInternalPluginPackageName(pluginName: string) {
  return `../../plugins/${pluginName}/index.ts`
}

async function loadActions(packageName: string) {
  const entry = require.resolve(packageName)
  const root = path.dirname(entry)
  const actionDir = path.resolve(path.dirname(entry), 'actions')
  const actionFiles = await readdir(actionDir)
  const actions: Action[] = []

  for (const actionFile of actionFiles) {
    const actionPath = path.resolve(actionDir, actionFile)
    const { default: Action } = await import(actionPath)
    const action = new Action({ root })
    if (!(action instanceof Action)) {
      throw new Error('action must extends from Action base class!')
    }
    actions.push(action)
  }
  return actions
}

async function registerPlugin(cli: Command, pluginName: string, packageName: string) {
  const { default: Plugin } = await import(packageName) as { default: PluginType }
  const plugin = new Plugin()
  if (!(plugin instanceof Plugin)) {
    throw new Error('plugin must extends from Plugin base class!')
  }
  const actions = await loadActions(packageName)

  const cmd = cli.command(pluginName)
  cmd.description(plugin.description)

  for (const action of actions) {
    const actionCmd = cmd.command(action.name)
                      .description(action.description)
    if (action.options) {
      action.options.forEach((option: ActionOption) => actionCmd.option(option.option, option.description))
    }
    actionCmd.action(async (options) => await action.action(options))
  }
}

async function init(cli: Command) {
  for (const pluginName of internalPlugins) {
    const packageName = getInternalPluginPackageName(pluginName)
    await registerPlugin(cli, pluginName, packageName)
  }

  const globalVendorPlugins  = (await rc.getGlobal('plugins') ?? []) as PluginConfig[]
  const localVendorPlugins = (await rc.getLocal('plugins') ?? []) as PluginConfig[]

  for (const plugin of localVendorPlugins.concat(globalVendorPlugins)) {
    await registerPlugin(cli, plugin.pluginName, plugin.packageName)
  }
}

export { Plugin, Action, init }