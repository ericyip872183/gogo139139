import type { IHardwareDevice } from '../core/IHardwareDevice'

/**
 * Web Bluetooth API 适配器
 * 需要 Chrome/Edge 56+，且必须是 HTTPS 或 localhost
 *
 * 使用示例：
 *   const device = new BluetoothDevice({ serviceUUID: '...', rxUUID: '...', txUUID: '...' })
 *   await device.connect()
 *   device.onData(bytes => console.log(bytes))
 */
export interface BluetoothDeviceOptions {
  /** GATT Service UUID（设备厂商提供） */
  serviceUUID: string
  /** 接收数据的 Characteristic UUID（Notify） */
  rxCharacteristicUUID: string
  /** 发送数据的 Characteristic UUID（Write） */
  txCharacteristicUUID: string
  /** 设备名称过滤（可选，不填则弹出所有蓝牙设备） */
  namePrefix?: string
}

export class BluetoothDevice implements IHardwareDevice {
  readonly type = 'bluetooth' as const
  readonly name: string

  private _isConnected = false
  private bleDevice: BluetoothDevice_ | null = null
  private txCharacteristic: BluetoothRemoteGATTCharacteristic | null = null

  private dataCallbacks: ((data: Uint8Array) => void)[] = []
  private connectCallbacks: (() => void)[] = []
  private disconnectCallbacks: (() => void)[] = []
  private errorCallbacks: ((error: Error) => void)[] = []

  constructor(private options: BluetoothDeviceOptions) {
    this.name = options.namePrefix ?? 'Bluetooth Device'
  }

  get isConnected() { return this._isConnected }

  async connect(): Promise<void> {
    if (!navigator.bluetooth) {
      throw new Error('当前浏览器不支持 Web Bluetooth API，请使用 Chrome/Edge')
    }

    try {
      const filters: BluetoothRequestDeviceFilter[] = this.options.namePrefix
        ? [{ namePrefix: this.options.namePrefix }]
        : [{ services: [this.options.serviceUUID] }]

      // 弹出设备选择对话框（必须由用户手势触发）
      this.bleDevice = await navigator.bluetooth.requestDevice({
        filters,
        optionalServices: [this.options.serviceUUID],
      }) as unknown as BluetoothDevice_

      this.bleDevice.addEventListener('gattserverdisconnected', () => {
        this._isConnected = false
        this.disconnectCallbacks.forEach(cb => cb())
      })

      const server = await this.bleDevice.gatt!.connect()
      const service = await server.getPrimaryService(this.options.serviceUUID)

      // 订阅 Notify（接收数据）
      const rxChar = await service.getCharacteristic(this.options.rxCharacteristicUUID)
      await rxChar.startNotifications()
      rxChar.addEventListener('characteristicvaluechanged', (event) => {
        const value = (event.target as BluetoothRemoteGATTCharacteristic).value!
        const bytes = new Uint8Array(value.buffer)
        this.dataCallbacks.forEach(cb => cb(bytes))
      })

      // 获取 Write Characteristic（发送数据）
      this.txCharacteristic = await service.getCharacteristic(this.options.txCharacteristicUUID)

      this._isConnected = true
      this.connectCallbacks.forEach(cb => cb())
    } catch (err) {
      this._isConnected = false
      const error = err instanceof Error ? err : new Error(String(err))
      this.errorCallbacks.forEach(cb => cb(error))
      throw error
    }
  }

  async disconnect(): Promise<void> {
    this.bleDevice?.gatt?.disconnect()
    this._isConnected = false
  }

  async send(data: Uint8Array): Promise<void> {
    if (!this._isConnected || !this.txCharacteristic) {
      throw new Error('设备未连接')
    }
    await this.txCharacteristic.writeValueWithResponse(data)
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

// 类型补丁（Web Bluetooth API 类型）
type BluetoothDevice_ = {
  gatt?: BluetoothRemoteGATTServer
  addEventListener(type: string, listener: EventListener): void
}
