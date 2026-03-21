/**
 * IHardwareDevice — 所有硬件设备的统一抽象接口
 */
export interface IHardwareDevice {
  readonly id: string
  readonly name: string
  readonly type: 'bluetooth' | 'serial'
  readonly isConnected: boolean

  connect(): Promise<void>
  disconnect(): Promise<void>
  send(data: Uint8Array): Promise<void>
  onData(handler: (frame: IDataFrame) => void): void
  offData(handler: (frame: IDataFrame) => void): void
  onDisconnect(handler: () => void): void
}

/**
 * IDataFrame — 数据帧标准格式
 */
export interface IDataFrame {
  deviceId: string
  timestamp: number
  raw: Uint8Array
  parsed?: Record<string, unknown>
}

/**
 * DeviceEvent — 设备事件类型
 */
export type DeviceEvent = 'connected' | 'disconnected' | 'data' | 'error'
