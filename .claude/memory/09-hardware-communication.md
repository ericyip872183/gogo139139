# 硬件通信模块记忆

> 本文档记录硬件通信模块的架构、使用经验、常见问题。**涉及硬件相关开发时必须参考。**

---

## 一、架构概述

### 1.1 核心接口

**IHardwareDevice（统一设备抽象）**
```typescript
interface IHardwareDevice {
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
```

**IDataFrame（数据帧标准）**
```typescript
interface IDataFrame {
  deviceId: string
  timestamp: number
  raw: Uint8Array
  parsed?: Record<string, unknown>
}
```

### 1.2 架构层次

```
HardwareManager（管理器）
├── IHardwareDevice（设备接口）
│   ├── BluetoothDevice（蓝牙设备）
│   ├── SerialDevice（串口设备）
│   └── DeviceSimulator（模拟器）
├── FrameParser（协议解析）
└── FrameEncoder（协议编码）
```

### 1.3 核心类说明

| 类名 | 位置 | 作用 |
|------|------|------|
| **HardwareManager** | `core/HardwareManager.ts` | 统一管理连接、重连、数据分发 |
| **BluetoothDevice** | `bluetooth/BluetoothDevice.ts` | Web Bluetooth API 封装 |
| **SerialDevice** | `serial/SerialDevice.ts` | Web Serial API 封装 |
| **DeviceSimulator** | `demo/DeviceSimulator.ts` | 无硬件时的模拟器 |
| **FrameParser** | `protocol/FrameParser.ts` | 数据帧解析器 |
| **FrameEncoder** | `protocol/FrameParser.ts` | 数据帧编码器 |

---

## 二、Web Serial 使用场景

### 2.1 适用设备

- USB 转串口设备（如 CH340、CP2102）
- Arduino、ESP32 等开发板
- 医疗采集设备（经络、四诊等）

### 2.2 连接流程

```typescript
// 1. 用户选择串口
const port = await navigator.serial.requestPort()

// 2. 打开串口
await port.open({ baudRate: 115200 })

// 3. 读取数据
const reader = port.readable.getReader()
while (true) {
  const { value, done } = await reader.read()
  if (done) break
  // value 是 Uint8Array
}
```

### 2.3 权限要求

- **必须用户手动触发**（点击按钮）
- 页面必须是 HTTPS 或 localhost
- Chrome 89+ 才支持

### 2.4 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| `navigator.serial is undefined` | 浏览器不支持 | 提示用户升级浏览器 |
| `Failed to open port` | 设备被占用 | 检查是否被其他程序打开 |
| `Permission denied` | 用户拒绝授权 | 引导用户重新授权 |
| 连接后无数据 | 波特率不匹配 | 确认设备波特率配置 |

---

## 三、Web Bluetooth 使用场景

### 3.1 适用设备

- 蓝牙低功耗（BLE）设备
- 蓝牙血压计、血糖仪
- 蓝牙传感器设备

### 3.2 连接流程

```typescript
// 1. 扫描设备
const device = await navigator.bluetooth.requestDevice({
  filters: [{ services: ['heart_rate'] }],
  optionalServices: ['battery_service']
})

// 2. 连接设备
const server = await device.gatt.connect()

// 3. 获取服务
const service = await server.getPrimaryService('heart_rate')

// 4. 获取特征值
const characteristic = await service.getCharacteristic('heart_rate_measurement')

// 5. 启用通知
await characteristic.startNotifications()
characteristic.addEventListener('characteristicvaluechanged', (event) => {
  const value = event.target.value // DataView
})
```

### 3.3 权限要求

- **必须用户手动触发**（点击按钮）
- 页面必须是 HTTPS
- Chrome 56+ 才支持
- 需要知道设备的 Service UUID

### 3.4 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| `navigator.bluetooth is undefined` | 浏览器不支持 | 提示用户升级浏览器 |
| `User cancelled` | 用户取消扫描 | 提示用户重新扫描 |
| `Device not found` | 设备未开启或距离太远 | 检查设备状态 |
| `GATT Error` | 服务 UUID 错误 | 确认设备的 Service UUID |
| 连接后断开 | 信号不稳定 | 实现自动重连 |

---

## 四、调试面板使用

### 4.1 访问地址

**仅超管可见**：`/hardware-debug`

### 4.2 功能清单

| 功能 | 说明 |
|------|------|
| 串口连接 | 选择并连接串口设备 |
| 蓝牙扫描 | 扫描并连接蓝牙设备 |
| 数据显示 | 实时显示接收的数据帧 |
| 数据发送 | 向设备发送指令 |
| 日志记录 | 显示连接/断开/错误日志 |
| 模拟器 | 无硬件时使用模拟器测试 |

### 4.3 使用流程

1. 点击「连接串口」或「扫描蓝牙」
2. 选择设备并确认
3. 查看实时数据
4. 需要时发送指令
5. 点击「断开」结束

---

## 五、硬件模拟器

### 5.1 使用场景

- 开发阶段无真实硬件
- 前端功能测试
- 演示和培训

### 5.2 启动模拟器

```typescript
import { DeviceSimulator } from '@panlei/hardware-bridge'

const simulator = new DeviceSimulator(500, 0x01) // 每 500ms 推送一次
await simulator.connect()

simulator.onData((data) => {
  console.log('收到模拟数据:', data)
})
```

### 5.3 模拟数据格式

- 默认推送 4 字节随机数据
- 可根据模块类型自定义数据生成逻辑

---

## 六、HardwareManager 自动重连

### 6.1 重连机制

```typescript
// 连接时启用自动重连
await manager.connect(device, 'ACUPUNCTURE', true) // 第三个参数

// 设备断开后 3 秒自动重连
device.onDisconnect(() => {
  setTimeout(() => this._reconnect(), 3000)
})
```

### 6.2 重连配置

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `autoReconnect` | 是否启用自动重连 | `true` |
| 重连间隔 | 断线后多久重连 | 3 秒 |

### 6.3 手动断开

```typescript
// 手动断开时禁用自动重连
await manager.disconnect()
```

---

## 七、数据帧协议

### 7.1 标准帧结构

```
[帧头 2字节] [模块代码 1字节] [数据长度 2字节] [数据 N字节] [校验 1字节]
```

### 7.2 模块代码

| 模块 | 代码 |
|------|------|
| 经络采集 | `0x01` |
| 四诊采集 | `0x02` |
| 针刺手法 | `0x03` |
| 刮痧手法 | `0x04` |
| 推拿手法 | `0x05` |

### 7.3 帧解析示例

```typescript
const parser = new FrameParser('设备名', 'ACUPUNCTURE')

// 不断喂入原始数据
const frames = parser.feed(rawData)

// 返回解析好的帧数组
frames.forEach(frame => {
  console.log('帧:', frame.parsed)
})
```

---

## 八、常见问题汇总

### 8.1 连接问题

| 问题 | 排查步骤 | 解决方案 |
|------|----------|----------|
| 浏览器提示不支持 | 检查浏览器版本 | 提示用户升级 Chrome 89+ |
| 用户拒绝授权 | 检查是否有引导 | 添加明确的操作提示 |
| 设备列表为空 | 检查设备是否开启 | 引导用户检查设备状态 |
| 连接后立即断开 | 查看日志 | 检查波特率/UUID 配置 |

### 8.2 数据问题

| 问题 | 排查步骤 | 解决方案 |
|------|----------|----------|
| 无数据显示 | 检查 onData 回调 | 确认已注册监听器 |
| 数据乱码 | 检查波特率 | 确认与设备配置一致 |
| 帧解析失败 | 查看原始数据 | 检查帧协议配置 |
| 数据延迟 | 检查缓冲区 | 优化读取频率 |

### 8.3 断线问题

| 问题 | 排查步骤 | 解决方案 |
|------|----------|----------|
| 频繁断线 | 检查信号强度 | 靠近设备或更换环境 |
| 无法重连 | 检查 autoReconnect | 确认已启用自动重连 |
| 重连失败 | 查看日志 | 检查设备状态 |

---

## 九、调试经验记录

> 记录每次硬件调试的过程和结果

---

### 2026-03-28 - 硬件模块记忆建立

**创建内容**：
- 硬件通信架构概述
- Web Serial/Bluetooth 使用场景
- 调试面板和模拟器使用
- 常见问题汇总

**最终状态**：✅ 完成

---

### （待更新）

> 此处记录后续硬件调试中发现的问题和解决方案

---

## 十、安全规范

### 10.1 权限控制

- ✅ 硬件调试页面仅超管可见
- ✅ 连接必须用户手动触发
- ✅ 不在无人值守时自动连接

### 10.2 数据安全

- ✅ 设备数据不暴露给前端
- ✅ 通过 HardwareManager 统一管理
- ✅ 断开连接时清理资源

### 10.3 异常处理

```typescript
try {
  await device.connect()
} catch (error) {
  if (error.name === 'NotFoundError') {
    // 用户取消选择
  } else if (error.name === 'SecurityError') {
    // 权限被拒绝
  } else {
    // 其他错误
  }
}
```

---

## 十一、开发建议

### 11.1 新增硬件设备

1. 实现 `IHardwareDevice` 接口
2. 在 `HardwareDebugPanel.vue` 中添加连接选项
3. 更新本文档的「模块代码」章节

### 11.2 新增协议解析

1. 在 `FrameParser` 中添加新协议
2. 更新本文档的「数据帧协议」章节
3. 添加单元测试

### 11.3 性能优化

- 使用 `requestAnimationFrame` 节流数据显示
- 避免频繁更新 DOM
- 大数据量时使用虚拟列表
