# 盼蕾平台 — 专业拓展模块详解

> **本文件描述8个专业拓展模块的定位、子模块构成、独立界面规范及与母本对接的接口约定。开发专业模块时查阅。**

---

## 模块总览

| # | 模块名称 | Code | 类型 | 状态 | 分期 |
|---|---------|------|------|------|------|
| 0 | 硬件通信标准模块 | HARDWARE_BRIDGE | Web Serial + BLE | ✅ | 一期 Sprint9 |
| 1 | 体质辨识教学 | TCM_CONSTITUTION | 纯软件 | ⏸ | 二期 |
| 2 | 耳穴教学 | TCM_EAR | 3D虚拟仿真 | ⏸ | 二期 |
| 3 | 经络采集分析 | TCM_MERIDIAN | 硬件+软件 | ⏸ | 三期 |
| 4 | 中医四诊采集分析 | TCM_FOURDIAG | 硬件+软件 | ⏸ | 三期 |
| 5 | 针刺手法采集 | TCM_ACUPUNCTURE | 硬件+VR | ⏸ | 三期 |
| 6 | 刮痧手法采集 | TCM_GUASHA | 硬件+VR | ⏸ | 三期 |
| 7 | 推拿手法采集 | TCM_MASSAGE | 硬件+软件 | ⏸ | 三期 |
| 8 | 人体经络腧穴解剖 | TCM_ANATOMY | 硬件+3D | ⏸ | 三期 |

---

## 模块 0：硬件通信标准模块（已完成）

### 位置
`packages/hardware-bridge/src/`

### 子模块
```
core/
  IHardwareDevice.ts    # 设备抽象接口
  IDataFrame.ts         # 数据帧抽象接口
  HardwareManager.ts    # 设备管理器（连接池/重连/事件）

bluetooth/
  BluetoothDevice.ts    # Web Bluetooth 实现
  BluetoothScanner.ts   # 蓝牙设备扫描

serial/
  SerialDevice.ts       # Web Serial 实现
  SerialPortSelector.ts # 串口选择器

protocol/
  FrameParser.ts        # 数据帧解析
  FrameEncoder.ts       # 数据帧编码

demo/
  HardwareDebugPanel.vue # 调试面板（Vue组件）
  DeviceSimulator.ts     # 无硬件模拟器
```

### 上层模块使用方式
```typescript
import { HardwareManager } from '@panlei/hardware-bridge'
const manager = new HardwareManager()
await manager.connect('bluetooth', deviceId)
manager.on('data', (frame: IDataFrame) => { /* 处理数据 */ })
```

---

## 专业模块开发规范

### 1. 模块注册

在超管后台 → 模块管理中注册：
```sql
INSERT INTO modules (id, code, name, description)
VALUES ('mod_tcm_pulse', 'TCM_CONSTITUTION', '体质辨识教学', '11套问卷、9种体质辨识');
```

### 2. 目录结构

```
packages/frontend/src/views/modules/{module-code}/
├── index.vue          # 模块首页
├── components/        # 模块专属组件
└── stores/            # 模块专属状态（可选）

packages/backend/src/modules/{module-code}/
├── {module}.module.ts
├── {module}.controller.ts
├── {module}.service.ts
└── dto/
```

### 3. 独立界面规范

- 必须使用 `ModuleLayout` 作为父布局（含「返回母本」按钮）
- 路由路径格式：`/modules/{module-code}/...`
- 路由 meta 必须包含：
```typescript
{
  layout: 'module',
  moduleCode: 'TCM_CONSTITUTION',
  moduleName: '体质辨识教学'
}
```

### 4. 与母本对接接口

#### 成绩回传
```typescript
// 所有专业模块考核结果必须写入母本成绩表
POST /api/scores
{
  examId: string,        // 关联的考试ID（可选）
  userId: string,
  moduleCode: string,    // 来源模块
  totalScore: number,
  detail: object         // 模块专属详情（JSON）
}
```

#### 用户信息获取
```typescript
// 使用母本统一认证，不需要独立登录
GET /api/auth/profile  // 获取当前用户信息
```

#### 资料访问
```typescript
// 二期：模块专属资料库
GET /api/media?moduleCode=TCM_CONSTITUTION
```

### 5. 硬件对接（三期模块）

```typescript
import { HardwareManager } from '@panlei/hardware-bridge'

// 每个硬件模块需实现自己的数据处理逻辑
class PulseAnalyzer {
  constructor(private hw: HardwareManager) {}

  startCapture() {
    this.hw.on('data', (frame) => {
      // 解析脉象数据帧
      const pulseData = this.parseFrame(frame)
      // 上传到后端
    })
  }
}
```

---

## 模块 1：体质辨识教学（二期规划）

### 功能点
- 11套标准化问卷（平和质、气虚质、阳虚质…共9种体质）
- 60+证型辨识
- 体质雷达图可视化（ECharts）
- 支持批量测评、结果存档

### 预计子模块
- `ConstitutionSurvey.vue`：问卷答题界面
- `ConstitutionResult.vue`：体质雷达图 + 调养建议
- 后端：`/api/constitution/submit`、`/api/constitution/history`

---

## 模块 2：耳穴教学（二期规划）

### 功能点
- OSCE 标准化考核
- 耳穴埋籽全流程操作指导
- 3D 耳廓模型展示穴位
- 四诊合参训练

### 预计子模块
- `EarModel3D.vue`：Three.js/WebGL 3D 耳廓
- `AcupointSelector.vue`：穴位选择与评分
- 后端：`/api/ear-acupoint/...`
