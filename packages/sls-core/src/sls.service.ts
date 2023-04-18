/**
 * sls service
 */
import type { RunOptions, ResultInstance, SlsConfig } from './types/index.js'
import { ApiService, type ListInstancesParams } from './api.service.js'
import chokidar from 'chokidar'
import { Observable, debounceTime } from 'rxjs'
import { COMPONENT_SCF } from './constants.js'
import { InstanceService } from './instance.service.js'

export class SlsService {
  private apiService: ApiService
  private instanceService: InstanceService

  constructor(config: SlsConfig) {
    this.apiService = new ApiService(config)
    this.instanceService = new InstanceService(config)
  }

  private async getScfInstances(options: RunOptions) {
    const resolvedInstances = await this.instanceService.resolve('deploy', options)
    const scfInstances = resolvedInstances?.filter?.(
      (instance) => instance.component === COMPONENT_SCF,
    )
    if (!scfInstances?.length) {
      throw new Error('there is no scf instance to update')
    }
    return scfInstances
  }

  async deploy(options: Partial<RunOptions> = {}) {
    return this.instanceService.runAll('deploy', options)
  }

  async remove(options: Partial<RunOptions> = {}) {
    return this.instanceService.runAll('remove', options)
  }

  async info(options: Partial<RunOptions> = {}) {
    const runOptions = this.instanceService.getRunOptions(options)
    const resolvedInstances = await this.instanceService.resolve('deploy', runOptions)
    if (!resolvedInstances.length) {
      throw new Error('there is no serverless instance to show')
    }

    const infoOptions = {
      ...runOptions,
      pollInterval: 0,
      pollTimeout: 0,
    }

    const infoPromises = resolvedInstances.map((instance) =>
      this.instanceService.poll(instance, infoOptions).catch((err) => err),
    )
    const resultList = await Promise.all(infoPromises)
    const infoList = resultList.map((result) =>
      result instanceof Error ? result : result,
    ) as Array<ResultInstance | Error>

    return infoList
  }

  async list(params: ListInstancesParams = {}) {
    const result = await this.apiService.listInstances(params)
    return result.Response?.instances
  }

  async dev(options: Partial<RunOptions> = {}) {
    const runOptions = this.instanceService.getRunOptions(options)
    const scfInstances = await this.getScfInstances(runOptions)
    for (const instance of scfInstances) {
      const src = instance.$src?.src
      if (!src) continue
      const watcher = chokidar.watch(src)
      const watch$ = new Observable<{ event: string; file: string }>(
        (observer) => {
          watcher.on('all', async (event, file) => {
            observer.next({ event, file })
          })
        },
      )
      watch$
        .pipe(debounceTime(runOptions.devServer.updateDebounceTime))
        .subscribe(() => {
          this.instanceService.updateFunctionCode(instance, runOptions)
        })
      this.instanceService.pollFunctionLogs(instance, runOptions)
    }
  }

  async logs(options: Partial<RunOptions> = {}) {
    const runOptions = this.instanceService.getRunOptions(options)
    const scfInstances = await this.getScfInstances(runOptions)

    for (const instance of scfInstances) {
      this.instanceService.pollFunctionLogs(instance, runOptions)
    }
  }
}