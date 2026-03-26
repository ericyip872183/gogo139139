# AI 虚拟病人功能设计方案

> 文档版本：v1.0
> 创建时间：2026-03-25
> 状态：待开发

---

## 一、功能概述

### 1.1 需求背景

中医/医学教学需要大量的临床问诊练习，但真实病人难找，SP（标准化病人）培训成本高。AI 虚拟病人可以：

| 需求 | 说明 | 痛点 |
|------|------|------|
| **问诊练习** | 学生需要大量临床病例练习 | 真实病人难找，配合度低 |
| **标准化考核** | 统一病例，公平评分 | 真人 SP 状态不稳定 |
| **反复练习** | 同一病例可多次问诊 | SP 人力成本高 |
| ** instant 反馈** | 问诊后立即评分 | 教师批改工作量大 |

### 1.2 功能目标

**AI 虚拟病人**需要模拟真实患者的多维度特征：

| 维度 | 要求 | 技术实现 |
|------|------|----------|
| **语言** | 自然对话，口语化，有情绪 | AI 大模型 + 精心 Prompt |
| **语音** | 语音输入/输出，真实人声 | TTS/STT 服务 |
| **视觉** | 有人物形象，会动，有表情 | 2D 数字人/3D 模型 |
| **口型** | 说话时口型同步 | Lip Sync 技术 |
| **病例** | 多种疾病，症状准确 | 病例库 + AI 角色扮演 |

---

## 二、技术方案对比

### 方案 A：2D 视频驱动（最简单，推荐一期使用）

**技术**：上传人物照片/视频 → AI 生成说话视频

| 服务商 | 价格 | 特点 | API |
|--------|------|------|-----|
| **HeyGen** | $29/月起，约¥200/月 | 效果最好，支持中文 | ✅ 有 API |
| **D-ID** | $6/月起，约¥50/月 | 性价比高 | ✅ 有 API |
| **腾讯智影** | 按量付费 | 国产，中文好 | ✅ 有 API |
| **硅基智能** | 定制报价 | 国内领先 | ⚠️ 需商务对接 |

**HeyGen API 调用示例**：

```typescript
// 1. 创建视频任务
const response = await fetch('https://api.heygen.com/v2/video/generate', {
  method: 'POST',
  headers: {
    'X-API-Key': 'YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    video_inputs: [{
      character: {
        type: 'avatar',
        avatar_id: 'predefined_avatar_001', // 预设虚拟人 ID
      },
      voice: {
        type: 'text',
        input_text: '医生您好，我最近感觉胃不太舒服...',
        voice_id: 'zh-CN-XiaoxiaoNeural', // 中文女声
      },
    }],
  }),
})

// 2. 查询生成进度
// GET /v2/video/status?video_id=xxx

// 3. 获取视频 URL 播放
// video_url: "https://cdn.heygen.com/videos/xxx.mp4"
```

**优点**：
- 效果逼真，口型自然
- 开发成本低，直接调用 API
- 无需前端 3D 渲染

**缺点**：
- 按视频时长收费，成本较高
- 无法实时交互，需预生成
- 网络依赖强

---

### 方案 B：3D 实时渲染（推荐二期使用）

**技术栈**：Three.js + Ready Player Me + Rhubarb Lip Sync

| 组件 | 技术方案 | 说明 |
|------|---------|------|
| **3D 引擎** | Three.js / Babylon.js | Web 端 3D 渲染 |
| **人物模型** | Ready Player Me | 免费 3D 头像生成 |
| **口型同步** | Rhubarb Lip Sync | 开源口型驱动 |
| **语音合成** | Azure TTS / 阿里 TTS | 文字转语音 |
| **语音识别** | 讯飞 / 百度 STT | 语音转文字 |

**Three.js 3D 人物渲染示例**：

```typescript
// 1. 加载 3D 人物模型（glTF 格式）
const loader = new GLTFLoader()
loader.load('/models/patient-avatar.glb', (gltf) => {
  const avatar = gltf.scene
  scene.add(avatar)

  // 获取面部骨骼（用于口型）
  const morphTargets = avatar.morphTargetDictionary
  // 口型形态：mouthOpen, mouthSmile, lipsTogether 等
})

// 2. 语音播放时驱动口型
function updateMouthShape(audioData: Float32Array) {
  const openness = calculateMouthOpenness(audioData)
  avatar.morphTargetInfluences[mouthOpen] = openness
}
```

**优点**：
- 实时交互，延迟低
- 一次性开发，无持续 API 成本
- 可定制表情、动作

**缺点**：
- 前端开发成本高
- 需要 3D 渲染能力
- 模型文件较大（10-50MB）

---

### 方案 C：Live2D 2D 模型（折中方案）

**技术**：Live2D Cubism（Vtuber 同款技术）

| 组件 | 技术方案 |
|------|---------|
| **模型** | Live2D 官方免费模型 / 定制 |
| **渲染** | Live2D Web SDK |
| **口型** | 音频音量驱动 mouth_y 参数 |
| **动作** | 预设动作切换（idle/talking/thinking） |

**优点**：
- 文件小（2-5MB）
- 效果好，二次元风格
- 开发成本适中

**缺点**：
- 2D 风格，不够写实
- 需要购买商业授权（约¥3000/年）

---

## 三、推荐方案（分阶段）

| 阶段 | 方案 | 目标 | 周期 |
|------|------|------|------|
| **一期** | 文字对话 + 静态头像 | 实现 AI 问诊核心功能 | 3 天 |
| **二期** | HeyGen 视频驱动 | 增加视频口播，更真实 | 2 天 |
| **三期** | Three.js 3D 实时渲染 | 完全实时交互 | 5 天 |

---

## 四、一期实现（文字对话 + 静态头像）

### 4.1 界面设计

```
┌─────────────────────────────────────────────────────────────┐
│  AI 虚拟病人 - 张某某，男，45 岁                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────────┐                                   │
│   │                     │                                   │
│   │    [病人头像]        │                                   │
│   │   (静态图片/简单    │                                   │
│   │    表情切换)        │                                   │
│   │                     │                                   │
│   └─────────────────────┘                                   │
│                                                             │
│  病人：医生您好，我最近感觉胃不太舒服...                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [语音输入] 请输入您的问诊内容...                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [发送] [提示词：请描述症状 / 什么时候开始的 / 有什么诱因]   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 实现要点

1. 使用现有 AI 服务 (`ai.service.ts`) 的 `chat()` 方法
2. 预设病例 Prompt（胃痛、感冒、头痛等）
3. 头像使用 emoji 或简单图片，根据情绪切换表情
4. 可选：接入 TTS 语音播放

---

## 五、二期实现（HeyGen 视频驱动）

### 5.1 流程

```
1. 后端预设常见回复视频（HeyGen 生成）
   - "医生您好，我最近感觉胃不舒服..."
   - "大概有 3 个月了吧，时好时坏"
   - "吃了东西会好一点，饿的时候更疼"
   ...

2. 学生语音/文字输入

3. AI 判断病情阶段，播放对应视频

4. 问诊结束，给出评估报告
```

### 5.2 成本估算（HeyGen）

| 套餐 | 价格 | 包含时长 | 可生成视频数（每条 30 秒） |
|------|------|----------|--------------------------|
| Creator | $29/月 | 15 分钟 | 30 条 |
| Team | $89/月 | 60 分钟 | 120 条 |

**优化方案**：只生成开场白和常见回复（约 20 条），其他用文字回复。

---

## 六、三期实现（3D 实时数字人）

### 6.1 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│  前端（Vue3 + Three.js）                                     │
├─────────────────────────────────────────────────────────────┤
│  Three.js 场景                                               │
│  ├── 3D 人物模型（glTF）                                      │
│  ├── 表情控制器（Morph Targets）                             │
│  ├── 口型同步（Rhubarb Lip Sync）                            │
│  └── 动作系统（Mixamo 动画）                                 │
│                                                             │
│  Web Audio API → 实时音频分析 → 口型驱动                     │
│  WebSocket → 后端 AI 服务 → 实时对话                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  后端（NestJS）                                              │
├─────────────────────────────────────────────────────────────┤
│  AI 服务（豆包大模型） → 生成回复文本                        │
│  TTS 服务（Azure） → 文字转语音                             │
│  语音流 → WebSocket → 前端播放                               │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 核心代码

```typescript
// 前端：3D 人物组件 (VirtualPatient.vue)
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

// 加载 3D 人物
function loadAvatar(url: string) {
  const loader = new GLTFLoader()
  loader.load(url, (gltf) => {
    const avatar = gltf.scene

    // 获取面部表情形态
    const mesh = avatar.getObjectByName('Head') as THREE.SkinnedMesh
    const morphTargets = mesh.morphTargetDictionary

    // 关键口型形态索引
    const mouthOpenIdx = morphTargets['mouthOpen']
    const lipsTogetherIdx = morphTargets['lipsTogether']
    const mouthSmileIdx = morphTargets['mouthSmile']

    // 存储到全局
    state.avatar = { mesh, mouthOpenIdx, lipsTogetherIdx, mouthSmileIdx }
  })
}

// 音频驱动口型
function setupLipSync(audioStream: MediaStream) {
  const audioContext = new AudioContext()
  const analyser = audioContext.createAnalyser()
  const microphone = audioContext.createMediaStreamSource(audioStream)

  microphone.connect(analyser)
  analyser.fftSize = 256
  const dataArray = new Uint8Array(analyser.frequencyBinCount)

  function animate() {
    requestAnimationFrame(animate)
    analyser.getByteFrequencyData(dataArray)

    // 计算音量（RMS）
    const volume = Math.sqrt(
      dataArray.reduce((sum, val) => sum + val * val, 0) / dataArray.length
    ) / 255

    // 驱动口型开合
    if (state.avatar) {
      state.avatar.mesh.morphTargetInfluences[state.avatar.mouthOpenIdx] = volume
    }
  }
  animate()
}
```

---

## 七、数据库设计

```prisma
// 虚拟病人病例
model VirtualPatientCase {
  id           String   @id @default(cuid())
  tenantId     String
  name         String   // 病人姓名
  age          Int      // 年龄
  gender       String   // MALE / FEMALE
  avatarUrl    String?  // 头像 URL（2D/3D 模型）
  voiceId      String?  // TTS 声音 ID

  // 病例信息
  chiefComplaint String @db.Text  // 主诉
  history        String @db.Text  // 现病史
  symptoms       Json            // 症状列表
  diagnosis      String @db.Text // 标准诊断
  treatment      String? @db.Text // 治疗方案

  // AI 配置
  systemPrompt   String @db.Text  // 角色设定 Prompt
  model          String @default("doubao-pro-4k")

  // 统计
  playCount      Int    @default(0)  // 被问诊次数
  avgScore       Float  @default(0)  // 平均评分

  isActive       Boolean @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@map("virtual_patient_cases")
}

// 问诊记录
model PatientConsultation {
  id           String   @id @default(cuid())
  tenantId     String
  userId       String   // 学生 ID
  caseId       String

  // 对话记录
  messages     Json     @db.Text  // 完整对话历史

  // 评估
  score        Float?   // 问诊评分
  feedback     String?  @db.Text  // AI 反馈
  userDiagnosis String? @db.Text // 学生给出的诊断

  // 耗时
  duration     Int      // 问诊时长（秒）
  messageCount Int      // 对话轮数

  createdAt    DateTime @default(now())

  @@index([userId, caseId])
  @@map("patient_consultations")
}
```

---

## 八、后端接口设计

### 8.1 接口列表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/virtual-patient/cases` | 获取病例列表 |
| GET | `/virtual-patient/cases/:id` | 获取病例详情 |
| POST | `/virtual-patient/chat` | 对话接口 |
| POST | `/virtual-patient/consultations` | 创建问诊记录 |
| GET | `/virtual-patient/consultations/:id` | 获取问诊记录 |
| POST | `/virtual-patient/consultations/:id/evaluate` | 提交评估 |

---

## 九、前端界面设计

```
┌───────────────────────────────────────────────────────────────────┐
│  AI 虚拟病人问诊练习                                  [结束问诊]    │
├───────────────────────────────────────────────────────────────────┤
│  病人：张某某，男，45 岁    │  主诉：反复胃脘部隐痛 3 个月          │
│                          │                                        │
│  ┌────────────────────┐  │  ┌──────────────────────────────────┐ │
│  │                    │  │  │ 医生：请问您哪里不舒服？           │ │
│  │    [3D/2D 人物]     │  │  │                                  │ │
│  │   表情：痛苦       │  │  │ 病人：医生您好，我最近胃不太舒服...│ │
│  │   动作：捂肚子     │  │  │                                  │ │
│  │                    │  │  │ 医生：什么时候开始的？            │ │
│  │                    │  │  │                                  │ │
│  └────────────────────┘  │  │ 病人：大概有 3 个月了吧，时好时坏    │ │
│                          │  │                                  │ │
│  [病例信息] [问诊记录]    │  │ 医生：疼痛有什么规律吗？           │ │
│                          │  │                                  │ │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ [语音输入] 请输入您的问诊内容...                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [发送] [提示：请描述症状 / 持续时间 / 诱因 / 缓解因素]           │
└───────────────────────────────────────────────────────────────────┘
```

---

## 十、AI 平台配置指南

### 10.1 火山引擎豆包大模型配置

#### 获取 API Key 步骤

1. 访问火山引擎控制台：https://console.volcengine.com/ark
2. 注册/登录账号（支持手机号/微信）
3. 进入「方舟·大模型」服务
4. 点击「创建应用」
5. 填写应用名称（如：若容考试平台）
6. 获取 **API Key**（一串以 `eyJ` 开头的字符）

#### 在系统中配置

进入系统后，点击导航栏 **AI 大模型** 菜单，填写以下配置：

| 字段 | 填写示例 | 说明 |
|------|----------|------|
| **API Key** | `eyJhbGci...`（你的真实 Key） | 从火山引擎控制台获取 |
| **API Secret** | 留空 | 豆包不需要 |
| **API 端点** | `https://ark.cn-beijing.volces.com/api/v3/chat/completions` | 默认已填好 |
| **使用模型** | `doubao-pro-4k` | Pro 能力强，Lite 便宜 |
| **最大 Token** | `2000` | 默认值 |
| **启用状态** | ✅ 开启 | 启用 AI |
| **系统提示词** | （默认内置了胃病患者的提示词） | 可自定义病人剧本 |

#### 模型选择建议

| 场景 | 推荐模型 | 价格（元/千 tokens） | 说明 |
|------|----------|---------------------|------|
| 虚拟病人对话 | doubao-pro-4k | 输入 0.0008 / 输出 0.002 | 推理能力强，回复自然 |
| 低成本场景 | doubao-lite-4k | 输入 0.0003 / 输出 0.0006 | 最便宜 |

#### 成本估算

**虚拟病人对话**（按 doubao-pro-4k 计算）：
- 单次对话：输入 100 tokens + 输出 150 tokens = 250 tokens
- 成本：250 / 1000 × 0.002 ≈ ¥0.0005
- 1000 次对话：约 ¥0.5

---

### 10.2 TTS 语音服务配置（虚拟病人语音）

#### 推荐：Azure Cognitive Services

**价格**：¥77/月起（标准版）

**配置**：
| 字段 | 值 |
|------|-----|
| API Key | `xxx`（Azure 门户获取） |
| Region | `eastasia`（东亚） |
| Voice | `zh-CN-XiaoxiaoNeural`（温柔女声） |

**调用示例**：

```typescript
// 文字转语音
async function textToSpeech(text: string): Promise<Blob> {
  const response = await fetch(
    'https://eastasia.api.speech.microsoft.com/cognitiveservices/v1',
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': 'YOUR_KEY',
        'Content-Type': 'application/ssml+xml',
      },
      body: `
        <speak version="1.0" xml:lang="zh-CN">
          <voice name="zh-CN-XiaoxiaoNeural">
            ${text}
          </voice>
        </speak>
      `,
    }
  )
  return response.blob()
}
```

#### 备选：阿里云智能语音

**价格**：¥0.005/次（按量付费）

---

## 十一、测试方案

### 11.1 AI 虚拟病人测试

| 测试项 | 目标值 | 测试方法 |
|--------|--------|----------|
| 对话自然度 | ≥4 分/5 分 | 10 名学生主观评分 |
| 响应延迟 | ≤2 秒 | 计时测试 |
| TTS 自然度 | ≥4 分/5 分 | 主观评分 |
| 3D 渲染帧率 | ≥30 FPS | 性能测试 |
| 口型同步误差 | ≤200ms | 音视频对比 |

---

## 十二、开发任务

### Phase 1: AI 虚拟病人 - 一期（5 天）

| 任务 | 工期 | 说明 |
|------|------|------|
| 病例数据表 | 0.5 天 | Prisma 模型 |
| 对话接口 | 1 天 | 复用现有 ai.service.ts |
| 问诊记录 | 0.5 天 | 存储对话历史 |
| 病例管理界面 | 1 天 | CRUD |
| 问诊界面 | 2 天 | 对话 UI+ 静态头像 |

### Phase 2: AI 虚拟病人 - 二期（5 天）

| 任务 | 工期 | 说明 |
|------|------|------|
| HeyGen API 对接 | 1 天 | 视频生成 |
| TTS 服务对接 | 1 天 | Azure/阿里 |
| STT 服务对接 | 1 天 | 讯飞/百度 |
| 视频播放组件 | 1 天 | 前端 |
| 评估系统 | 1 天 | AI 评分 + 反馈 |

### Phase 3: AI 虚拟病人 - 三期（7 天）

| 任务 | 工期 | 说明 |
|------|------|------|
| Three.js 场景搭建 | 1 天 | 基础渲染 |
| 3D 人物加载 | 1 天 | Ready Player Me |
| 口型同步实现 | 2 天 | Web Audio + Lip Sync |
| 表情/动作系统 | 1 天 | Mixamo 动画 |
| WebSocket 实时对话 | 1 天 | 低延迟 |
| 性能优化 | 1 天 | 模型压缩/LOD |

---

## 附录 A：AI Prompt 模板

### 虚拟病人 Prompt（胃病患者）

```
你是一名标准化病人（SP），正在配合中医学生进行问诊练习。

【基本信息】
- 姓名：张某某
- 性别：男
- 年龄：45 岁
- 职业：公司职员

【主诉】
反复胃脘部隐痛 3 个月

【现病史】
3 个月前因饮食不规律出现胃脘部隐痛，喜温喜按，进食后缓解，空腹时加重。
伴随神疲乏力，食欲不振，大便溏薄。

【回答要求】
1. 以患者第一人称口吻回答，如"我最近感觉..."
2. 口语化表达，不要使用专业术语
3. 不要直接说出中医诊断
4. 症状描述要具体，如"疼痛大概在肚脐上方这个地方"
5. 如果学生问到关键症状，可以适当补充细节
6. 每次回复控制在 50 字以内

【禁忌】
- 不要说"根据中医理论..."
- 不要说"我的证型是..."
- 不要主动提供诊断信息
```

---

## 附录 B：相关资源

### 官方文档
- 火山引擎：https://www.volcengine.com/docs/ark
- HeyGen API：https://docs.heygen.com/
- Azure TTS：https://learn.microsoft.com/azure/cognitive-services/speech-service/
- Three.js：https://threejs.org/docs/
- Ready Player Me：https://readyplayer.me/developers

### 开源项目
- Rhubarb Lip Sync：https://github.com/DanielSWolf/rhubarb-lip-sync
- Live2D Web SDK：https://github.com/dylanNew/live2d
- VSeeFace（免费虚拟人）：https://www.vseeface.icu/
