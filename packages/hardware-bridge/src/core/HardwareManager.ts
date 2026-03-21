import type { IHardwareDevice } from './IHardwareDevice'
import type { IDataFrame } from './IDataFrame'
import { FrameParser } from '../protocol/FrameParser'
import type { ModuleType } from './IDataFrame'

/**
 * 硬件设备管理器
 * 统一管理设备连接、数据分发、自动重连
 */
export class HardwareManager {
  private device: IHardwareDevice | null = null
  private parser: FrameParser | null = null
  private frameCallbacks: ((frame: IDataFrame) => void)[] = []
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private autoReconnect = false

  /**
   * 连接设备
   * @param device 已实例化的设备（BluetoothDevice 或 SerialDevice）
   * @param moduleType 当前模块类型（用于数据帧标注）
   * @param autoReconnect 断线后是否自动重连
   */
  async connect(
    device: IHardwareDevice,
    moduleType: ModuleType,
    autoReconnect = true,
  ): Promise<void> {
    this.device = device
    this.autoReconnect = autoReconnect
    this.parser = new FrameParser(device.name, moduleType)

    device.onData((raw) => {
      const frames = this.parser!.feed(raw)
      frames.forEach(frame => this.frameCallbacks.forEach(cb => cb(frame)))
    })

    device.onDisconnect(() => {
      if (this.autoReconnect) {
        console.warn('[HardwareManager] 设备断连，3秒后尝试重连...')
        this.reconnectTimer = setTimeout(() => this._reconnect(), 3000)
      }
    })

    device.onError((err) => {
      console.error('[HardwareManager] 设备错误:', err.message)
    })

    await device.connect()
  }

  private async _reconnect() {
    if (!this.device || this.device.isConnected) return
    try {
      await this.device.connect()
      console.info('[HardwareManager] 重连成功')
    } catch {
      this.reconnectTimer = setTimeout(() => this._reconnect(), 3000)
    }
  }

  async disconnect(): Promise<void> {
    this.autoReconnect = false
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    await this.device?.disconnect()
    this.device?.removeAllListeners()
    this.device = null
    this.parser?.reset()
  }

  /** 注册帧数据回调（业务层使用此方法接收解析好的帧） */
  onFrame(callback: (frame: IDataFrame) => void) {
    this.frameCallbacks.push(callback)
  }

  /** 发送指令到设备 */
  async send(data: Uint8Array): Promise<void> {
    if (!this.device?.isConnected) throw new Error('设备未连接')
    await this.device.send(data)
  }

  get isConnected() { return this.device?.isConnected ?? false }
  get deviceType() { return this.device?.type }
}
