/**
 * 标准数据帧协议
 * 所有硬件设备的数据统一转换为此格式，再传递给业务层
 */
export interface IDataFrame {
  /** 设备唯一ID */
  deviceId: string
  /** 模块类型（acupuncture | pulse | tuina | scraping | meridian | fourdiagnosis） */
  moduleType: ModuleType
  /** 采集时间戳（ms） */
  timestamp: number
  /** 原始字节数据 */
  payload: Uint8Array
  /** 解析后的键值对数据（由各模块协议解析器填充） */
  parsed?: Record<string, number | string>
}

export type ModuleType =
  | 'acupuncture'   // 针刺手法
  | 'pulse'         // 脉象采集
  | 'tuina'         // 推拿手法
  | 'scraping'      // 刮痧手法
  | 'meridian'      // 经络采集
  | 'fourdiagnosis' // 四诊采集
  | 'unknown'

/**
 * 标准帧格式（建议厂商遵循）
 * [帧头2B][模块码1B][数据长度2B][数据NB][校验1B][帧尾1B]
 * 帧头: 0xAA 0x55
 * 帧尾: 0x0D
 */
export const FRAME_HEADER = new Uint8Array([0xaa, 0x55])
export const FRAME_TAIL = 0x0d
