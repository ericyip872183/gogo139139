/**
 * 硬件设备统一抽象接口
 * 所有硬件模块（针灸/推拿/脉象等）必须实现此接口
 * 上层业务代码只依赖此接口，不感知底层是蓝牙还是串口
 */
export interface IHardwareDevice {
  /** 连接类型 */
  readonly type: 'bluetooth' | 'serial'
  /** 设备名称/标识 */
  readonly name: string
  /** 当前连接状态 */
  readonly isConnected: boolean

  /** 建立连接 */
  connect(): Promise<void>
  /** 断开连接 */
  disconnect(): Promise<void>
  /** 发送数据到设备 */
  send(data: Uint8Array): Promise<void>

  /** 注册数据接收回调 */
  onData(callback: (data: Uint8Array) => void): void
  /** 注册连接成功回调 */
  onConnect(callback: () => void): void
  /** 注册断开连接回调 */
  onDisconnect(callback: () => void): void
  /** 注册错误回调 */
  onError(callback: (error: Error) => void): void

  /** 移除所有监听器 */
  removeAllListeners(): void
}
