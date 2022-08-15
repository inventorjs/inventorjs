/**
 * 获取当前环境信息
 * @author: sunkeysun
 */
import os from 'node:os'
import { fileURLToPath } from 'node:url'

export function pwd() {
  return process.cwd()
}

export function homedir() {
  return os.homedir()
}

export function username() {
  return os.userInfo().username
}

export function uid() {
  return os.userInfo().uid
}

export function dirname(metaUrl: string) {
  const dirUrl = new URL('.', metaUrl)
  return fileURLToPath(dirUrl)
}

export function filename(metaUrl: string) {
  return fileURLToPath(metaUrl)
}