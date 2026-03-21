<template>
  <div class="debug-panel">
    <div class="panel-header">
      <span class="panel-title">硬件调试面板</span>
      <el-tag :type="isConnected ? 'success' : 'danger'" size="small">
        {{ isConnected ? '已连接' : '未连接' }}
      </el-tag>
    </div>

    <!-- 连接配置 -->
    <el-card class="section-card">
      <template #header><span>连接设置</span></template>
      <div class="connect-form">
        <el-radio-group v-model="connType" :disabled="isConnected">
          <el-radio value="serial">串口 (USB)</el-radio>
          <el-radio value="bluetooth">蓝牙 (BLE)</el-radio>
          <el-radio value="simulator">模拟器</el-radio>
        </el-radio-group>

        <div v-if="connType === 'serial'" class="conn-options">
          <el-select v-model="baudRate" style="width:120px" :disabled="isConnected">
            <el-option v-for="b in baudRates" :key="b" :label="b" :value="b" />
          </el-select>
          <span class="opt-label">波特率</span>
        </div>

        <div v-if="connType === 'bluetooth'" class="conn-options">
          <el-input v-model="serviceUUID" placeholder="Service UUID" style="width:300px" :disabled="isConnected" />
        </div>

        <div v-if="connType === 'simulator'" class="conn-options">
          <el-input-number v-model="simInterval" :min="100" :max="5000" :step="100" :disabled="isConnected" />
          <span class="opt-label">推送间隔 (ms)</span>
        </div>

        <div class="connect-btns">
          <el-button v-if="!isConnected" type="primary" @click="connect">连接设备</el-button>
          <el-button v-else type="danger" @click="disconnect">断开</el-button>
        </div>
      </div>
    </el-card>

    <!-- 发送指令 -->
    <el-card class="section-card">
      <template #header><span>发送指令</span></template>
      <div class="send-form">
        <el-input
          v-model="sendHex"
          placeholder="输入十六进制字节，如：AA 55 01 00 01 FF 0D"
          :disabled="!isConnected"
          @keyup.enter="sendCommand"
        />
        <el-button type="primary" :disabled="!isConnected" @click="sendCommand">发送</el-button>
        <el-button
          type="success"
          :disabled="!isConnected"
          @click="sendPing"
        >Ping</el-button>
      </div>
    </el-card>

    <!-- 收发日志 -->
    <el-card class="section-card log-card">
      <template #header>
        <div class="log-header">
          <span>收发日志</span>
          <div>
            <el-checkbox v-model="autoScroll" size="small">自动滚动</el-checkbox>
            <el-button link type="danger" size="small" @click="clearLogs">清空</el-button>
          </div>
        </div>
      </template>
      <div class="log-area" ref="logRef">
        <div
          v-for="(log, idx) in logs"
          :key="idx"
          class="log-entry"
          :class="log.type"
        >
          <span class="log-time">{{ log.time }}</span>
          <span class="log-dir">{{ log.type === 'recv' ? '↓ 收' : log.type === 'send' ? '↑ 发' : '⚠ 错' }}</span>
          <span class="log-data">{{ log.data }}</span>
        </div>
        <div v-if="logs.length === 0" class="log-empty">暂无日志</div>
      </div>
    </el-card>

    <!-- 解析数据帧 -->
    <el-card v-if="parsedFrames.length > 0" class="section-card">
      <template #header><span>解析帧 (最近 20 条)</span></template>
      <el-table :data="parsedFrames" border size="small" max-height="300">
        <el-table-column label="时间" width="90">
          <template #default="{ row }">{{ formatTs(row.timestamp) }}</template>
        </el-table-column>
        <el-table-column label="模块" prop="moduleType" width="110" />
        <el-table-column label="Payload (hex)" min-width="200">
          <template #default="{ row }">{{ toHex(row.payload) }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'

// 动态引入以避免 SSR 问题
let SerialDevice: any, BluetoothDevice: any, DeviceSimulator: any, FrameParser: any

const isConnected = ref(false)
const connType = ref<'serial' | 'bluetooth' | 'simulator'>('simulator')
const baudRate = ref(115200)
const baudRates = [9600, 19200, 38400, 57600, 115200]
const serviceUUID = ref('')
const simInterval = ref(500)
const sendHex = ref('')
const autoScroll = ref(true)
const logRef = ref<HTMLElement>()

interface LogEntry { time: string; type: 'recv' | 'send' | 'error'; data: string }
const logs = ref<LogEntry[]>([])
const parsedFrames = ref<any[]>([])

let device: any = null
let parser: any = null

function addLog(type: LogEntry['type'], data: string) {
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  logs.value.push({ time, type, data })
  if (logs.value.length > 500) logs.value.shift()
  if (autoScroll.value) {
    nextTick(() => {
      if (logRef.value) logRef.value.scrollTop = logRef.value.scrollHeight
    })
  }
}

async function connect() {
  try {
    // 懒加载硬件模块
    const hw = await import('hardware-bridge')
    SerialDevice = hw.SerialDevice
    BluetoothDevice = hw.BluetoothDevice
    FrameParser = hw.FrameParser
    const { DeviceSimulator: DS } = await import('hardware-bridge/src/demo/DeviceSimulator')
    DeviceSimulator = DS

    if (connType.value === 'serial') {
      device = new SerialDevice({ baudRate: baudRate.value })
    } else if (connType.value === 'bluetooth') {
      device = new BluetoothDevice({
        serviceUUID: serviceUUID.value,
        rxCharacteristicUUID: '',
        txCharacteristicUUID: '',
      })
    } else {
      device = new DeviceSimulator(simInterval.value)
    }

    parser = new FrameParser('debug-device', 'unknown')

    device.onData((bytes: Uint8Array) => {
      addLog('recv', toHex(bytes))
      const frames = parser.feed(bytes)
      frames.forEach((f: any) => {
        parsedFrames.value.unshift(f)
        if (parsedFrames.value.length > 20) parsedFrames.value.pop()
      })
    })
    device.onError((err: Error) => addLog('error', err.message))
    device.onDisconnect(() => { isConnected.value = false; addLog('error', '设备已断开') })

    await device.connect()
    isConnected.value = true
    addLog('recv', `已连接 [${connType.value}]`)
  } catch (err: any) {
    ElMessage.error(err.message || '连接失败')
  }
}

async function disconnect() {
  await device?.disconnect()
  device = null
  isConnected.value = false
  addLog('error', '已主动断开')
}

function hexToBytes(hex: string): Uint8Array {
  const parts = hex.trim().split(/\s+/)
  return new Uint8Array(parts.map(h => parseInt(h, 16)))
}

async function sendCommand() {
  if (!sendHex.value.trim()) return
  try {
    const bytes = hexToBytes(sendHex.value)
    await device.send(bytes)
    addLog('send', toHex(bytes))
  } catch (err: any) {
    addLog('error', err.message)
  }
}

async function sendPing() {
  const ping = new Uint8Array([0xAA, 0x55, 0x00, 0x00, 0x00, 0xFF, 0x0D])
  try {
    await device.send(ping)
    addLog('send', toHex(ping) + ' [PING]')
  } catch (err: any) {
    addLog('error', err.message)
  }
}

function clearLogs() { logs.value = [] }

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
}

function formatTs(ts: number): string {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour12: false })
}
</script>

<style scoped>
.debug-panel { display: flex; flex-direction: column; gap: 16px; }
.panel-header { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
.panel-title { font-size: 18px; font-weight: 600; }
.section-card {}
.connect-form { display: flex; flex-direction: column; gap: 12px; }
.conn-options { display: flex; align-items: center; gap: 8px; }
.opt-label { font-size: 13px; color: #909399; }
.connect-btns { display: flex; gap: 8px; }
.send-form { display: flex; gap: 8px; }
.send-form .el-input { flex: 1; }
.log-card {}
.log-header { display: flex; align-items: center; justify-content: space-between; }
.log-area {
  height: 280px; overflow-y: auto; font-family: monospace; font-size: 12px;
  background: #1e1e1e; border-radius: 4px; padding: 8px; color: #d4d4d4;
}
.log-entry { display: flex; gap: 8px; margin-bottom: 2px; line-height: 1.6; }
.log-time { color: #858585; flex-shrink: 0; }
.log-dir { flex-shrink: 0; width: 36px; }
.log-entry.recv .log-dir { color: #4ec9b0; }
.log-entry.send .log-dir { color: #9cdcfe; }
.log-entry.error .log-dir { color: #f44747; }
.log-entry.error .log-data { color: #f44747; }
.log-data { word-break: break-all; }
.log-empty { color: #858585; text-align: center; padding: 20px; }
</style>
