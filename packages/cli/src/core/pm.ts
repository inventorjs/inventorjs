/**
 * 依赖包管理模块
 * @author: sunkeysun
 */
import { execa } from 'execa'
import ora from 'ora'

export const bin = 'yarn'

export async function install({ root }: { root: string }) {
  await execCmd(bin, ['install'], root)
}

export async function addDependencies() {

}

export async function addDevDependencies() {

}

export async function removeDependencies() {

}

export async function removeDevDependencies() {

}

function execCmd(cmd: string, args: string[], cwd: string) {
  const child = execa(cmd, args, { cwd, stdio: ['inherit', 'inherit', 'pipe'] })

  return new Promise((resolve) => {
    const spinner = ora()

    child.stderr?.on('data', (buf) => {
      const str = buf.toString()
      if (/warning/.test(str)) {
        return
      }
      if (/\]\s(\d+)\/(\d+)/.test(str)) {
        !spinner.isSpinning && spinner.start('Installing ...')
        return ;
      }

      spinner.isSpinning && spinner.stop()
      process.stderr.write(buf)
    })

    child.stderr?.on('end', () => {
      process.nextTick(resolve)
    })
  })
}