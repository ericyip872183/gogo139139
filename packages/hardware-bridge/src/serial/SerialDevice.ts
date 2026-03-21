import type { IHardwareDevice } from '../core/IHardwareDevice'

/**
 * Web Serial API 适配器（USB/串口）
 * 需要 Chrome/Edge 89+，且必须是 HTTPS 或 localhost
 *
 * 使用示例：
 *   const device = new SerialDevice({ baudRate: 9600 })
 *   await device.connect()
 *   device.onData(bytes => console.log(bytes))
 */
export interface SerialDeviceOptions {
  /** 波特率（设备厂商提供，常用：9600/115200） */
  baudRate: number
  dataBits?: 7 | 8
  stopBits?: 1 | 2
  parity?: 'none' | 'even' | 'odd'
  /** USB厂商ID（可选，用于过滤特定厂商设备） */
  usbVendorId?: number
  /** USB产品ID（可选） */
  usbProductId?: number
}

export class SerialDevice implements IHardwareDevice {
  readonly type = 'serial' as const
  readonly name: string = 'Serial Device'

  private _isConnected = false
  private port: SerialPort | null = null
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null

  private dataCallbacks: ((data: Uint8Array) => void)[] = []
  private connectCallbacks: (() => void)[] = []
  private disconnectCallbacks: (() => void)[] = []
  private errorCallbacks: ((error: Error) => void)[] = []

  constructor(private options: SerialDeviceOptions) {}

  get isConnected() { return this._isConnected }

  async connect(): Promise<void> {
    if (!('serial' in navigator)) {
      throw new Error('当前浏览器不支持 Web Serial API，请使用 Chrome/Edge 89+')
    }

    try {
      const filters: SerialPortFilter[] = []
      if (this.options.usbVendorId !== undefined) {
        filters.push({
          usbVendorId: this.options.usbVendorId,
          usbProductId: this.options.usbProductId,
        })
      }

      // 弹出串口选择对话框（必须由用户手势触发）
      this.port = await navigator.serial.requestPort({ filters })

      await this.port.open({
        baudRate: this.options.baudRate,
        dataBits: this.options.dataBits ?? 8,
        stopBits: this.options.stopBits ?? 1,
        parity: this.options.parity ?? 'none',
      })

      this._isConnected = true
      this.connectCallbacks.forEach(cb => cb())

      // 启动持续读取循环
      this._startReading()
    } catch (err) {
      this._isConnected = false
      const error = err instanceof Error ? err : new Error(String(err))
      this.errorCallbacks.forEach(cb => cb(error))
      throw error
    }
  }

  private async _startReading() {
    if (!this.port?.readable) return
    this.reader = this.port.readable.getReader()
    try {
      while (this._isConnected) {
        const { value, done } = await this.reader.read()
        if (done) break
        if (value) {
          this.dataCallbacks.forEach(cb => cb(value))
        }
      }
    } catch (err) {
      if (this._isConnected) {
        const error = err instanceof Error ? err : new Error(String(err))
        this.errorCallbacks.forEach(cb => cb(error))
      }
    } finally {
      this.reader?.releaseLock()
      this.reader = null
    }
  }

  async disconnect(): Promise<void> {
    this._isConnected = false
    this.reader?.cancel()
    this.writer?.close()
    await this.port?.close()
    this.port = null
    this.disconnectCallbacks.forEach(cb => cb())
  }

  async send(data: Uint8Array): Promise<void> {
    if (!this._isConnected || !this.port?.writable) {
      throw new Error('设备未连接')
    }
    if (!this.writer) {
      this.writer = this.port.writable.getWriter()
    }
    await this.writer.write(data)
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
