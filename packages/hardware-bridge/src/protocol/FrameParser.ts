import type { IDataFrame, ModuleType } from '../core/IDataFrame'
import { FRAME_HEADER, FRAME_TAIL } from '../core/IDataFrame'

/**
 * 数据帧解析器
 * 将设备原始字节流按标准帧格式解析为 IDataFrame
 *
 * 标准帧格式：
 * [0xAA][0x55][模块码1B][数据长度2B(大端)][数据NB][校验1B(XOR)][0x0D]
 */
export class FrameParser {
  private buffer = new Uint8Array(0)
  private deviceId: string
  private moduleType: ModuleType

  constructor(deviceId: string, moduleType: ModuleType) {
    this.deviceId = deviceId
    this.moduleType = moduleType
  }

  /**
   * 喂入原始字节，返回解析出的完整帧列表
   * 支持粘包和半包处理
   */
  feed(incoming: Uint8Array): IDataFrame[] {
    // 合并缓冲区
    const merged = new Uint8Array(this.buffer.length + incoming.length)
    merged.set(this.buffer)
    merged.set(incoming, this.buffer.length)
    this.buffer = merged

    const frames: IDataFrame[] = []

    while (this.buffer.length >= 7) { // 最小帧长度：2+1+2+0+1+1=7
      // 查找帧头
      const headerIdx = this._findHeader(this.buffer)
      if (headerIdx === -1) {
        // 没有帧头，保留最后1字节（可能是帧头第一个字节）
        this.buffer = this.buffer.slice(-1)
        break
      }
      if (headerIdx > 0) {
        // 丢弃帧头之前的无效数据
        this.buffer = this.buffer.slice(headerIdx)
      }

      if (this.buffer.length < 7) break

      // 读取数据长度（字节3-4，大端）
      const dataLen = (this.buffer[3] << 8) | this.buffer[4]
      const frameLen = 2 + 1 + 2 + dataLen + 1 + 1 // header+moduleCode+len+data+checksum+tail

      if (this.buffer.length < frameLen) break // 数据不足，等待更多数据

      // 验证帧尾
      if (this.buffer[frameLen - 1] !== FRAME_TAIL) {
        // 帧尾不对，跳过这个帧头，继续查找
        this.buffer = this.buffer.slice(1)
        continue
      }

      // 验证校验和（XOR，帧头到数据末尾）
      const checksumByte = this.buffer[frameLen - 2]
      let xor = 0
      for (let i = 0; i < frameLen - 2; i++) xor ^= this.buffer[i]
      if (xor !== checksumByte) {
        this.buffer = this.buffer.slice(1)
        continue
      }

      // 提取payload
      const payload = this.buffer.slice(5, 5 + dataLen)

      frames.push({
        deviceId: this.deviceId,
        moduleType: this.moduleType,
        timestamp: Date.now(),
        payload: new Uint8Array(payload),
      })

      this.buffer = this.buffer.slice(frameLen)
    }

    return frames
  }

  private _findHeader(buf: Uint8Array): number {
    for (let i = 0; i < buf.length - 1; i++) {
      if (buf[i] === FRAME_HEADER[0] && buf[i + 1] === FRAME_HEADER[1]) {
        return i
      }
    }
    return -1
  }

  reset() { this.buffer = new Uint8Array(0) }
}

/**
 * 指令编码器
 * 将指令数据按标准帧格式编码为字节数组，发送给设备
 */
export class FrameEncoder {
  static encode(moduleCode: number, data: Uint8Array): Uint8Array {
    const frameLen = 2 + 1 + 2 + data.length + 1 + 1
    const frame = new Uint8Array(frameLen)
    let i = 0

    frame[i++] = FRAME_HEADER[0]  // 0xAA
    frame[i++] = FRAME_HEADER[1]  // 0x55
    frame[i++] = moduleCode
    frame[i++] = (data.length >> 8) & 0xff  // 数据长度高字节
    frame[i++] = data.length & 0xff          // 数据长度低字节
    data.forEach(b => frame[i++] = b)

    // 计算校验和（XOR）
    let xor = 0
    for (let j = 0; j < i; j++) xor ^= frame[j]
    frame[i++] = xor
    frame[i++] = FRAME_TAIL

    return frame
  }
}
