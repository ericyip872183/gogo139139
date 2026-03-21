import type { IHardwareDevice } from '../core/IHardwareDevice'
import { FrameEncoder } from '../protocol/FrameParser'

/**
 * DeviceSimulator — 无真实硬件时的模拟器
 * 定时推送模拟数据帧，用于前端调试
 */
export class DeviceSimulator implements IHardwareDevice {
  readonly type = 'serial' as const
  readonly name = '[模拟器] 虚拟设备'

  private _isConnected = false
  private intervalId: ReturnType<typeof setInterval> | null = null

  private dataCallbacks: ((data: Uint8Array) => void)[] = []
  private connectCallbacks: (() => void)[] = []
  private disconnectCallbacks: (() => void)[] = []
  private errorCallbacks: ((error: Error) => void)[] = []

  /** intervalMs: 推送间隔毫秒数，moduleCode: 模块代码 */
  constructor(
    private intervalMs = 500,
    private moduleCode = 0x01,
  ) {}

  get isConnected() { return this._isConnected }

  async connect(): Promise<void> {
    this._isConnected = true
    this.connectCallbacks.forEach(cb => cb())
    // 定时推送模拟帧
    this.intervalId = setInterval(() => {
      const mockData = this._generateMockData()
      const frame = FrameEncoder.encode(this.moduleCode, mockData)
      this.dataCallbacks.forEach(cb => cb(frame))
    }, this.intervalMs)
  }

  async disconnect(): Promise<void> {
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null }
    this._isConnected = false
    this.disconnectCallbacks.forEach(cb => cb())
  }

  async send(_data: Uint8Array): Promise<void> {
    // 模拟器忽略发送命令
  }

  private _generateMockData(): Uint8Array {
    // 推送 4 字节随机传感器数据
    return new Uint8Array([
      Math.floor(Math.random() * 256),
      Math.floor(Math.random() * 256),
      Math.floor(Math.random() * 256),
      Math.floor(Math.random() * 256),
    ])
  }

  onData(cb: (data: Uint8Array) => void) { this.dataCallbacks.push(cb) }
  onConnect(cb: () => void) { this.connectCallbacks.push(cb) }
  onDisconnect(cb: () => void) { this.disconnectCallbacks.push(cb) }
  onError(cb: (error: Error) => void) { this.errorCallbacks.push(cb) }
  removeAllListeners() {
    this.dataCallbacks = []
    this.connectCallbacks = []
    this.disconnectCallbacks = []
    this.errorCallbacks = []
  }
}
