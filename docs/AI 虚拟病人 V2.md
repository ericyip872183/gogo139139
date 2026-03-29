# AI 虚拟病人 V2 — 智能病例生成与多模态问诊系统

> 文档版本：v2.2
> 创建时间：2026-03-26
> 最后更新：2026-03-26
> 状态：待确认
> 对接模型：火山引擎豆包大模型（已接入）
> 语音服务：火山引擎智能语音
> 形象方案：Three.js + MakeHuman 写实模型

---

## 一、功能概述

### 1.1 需求背景

现有 AI 虚拟病人（v1.0）存在以下局限：

| 问题 | 说明 | 痛点 |
|------|------|------|
| **固定病例** | Prompt 硬编码，无法自定义 | 教师无法创建自己的病例 |
| **单一交互** | 仅支持文字对话 | 缺少真实问诊的语音交互 |
| **无知识来源** | 无法基于教材生成 | 病例与教学内容脱节 |
| **无表情动作** | 静态头像 | 缺乏真实感 |
| **无评分机制** | 问诊后无反馈 | 学生不知道问诊质量 |
| **反应太快** | 立即回复 | 不像真人在思考 |

### 1.2 功能目标

**AI 虚拟病人 V2** 核心能力：

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI 虚拟病人 V2 系统架构                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│  │  病例配置层   │────▶│  AI 引擎层    │────▶│  交互呈现层   │   │
│  │              │     │              │     │              │   │
│  │ • 手动配置   │     │ • Prompt 生成 │     │ • 文字对话   │   │
│  │ • 书籍导入   │     │ • 多轮对话   │     │ • 语音对话   │   │
│  │ • 批量生成   │     │ • 评分反馈   │     │ • 表情/动作  │   │
│  └──────────────┘     └──────────────┘     └──────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 核心特性

| 特性 | 说明 | 优先级 |
|------|------|--------|
| **自定义病例** | 机构/教师可配置病人信息、症状、反应规则 | P0 |
| **书籍导入学习** | 上传医学书籍/病例集，AI 自动生成标准化病例 | P0 |
| **多模态交互** | 支持文字输入 + 语音输入，支持 TTS 语音输出 | P0 |
| **表情/动作** | 根据情绪切换表情（痛苦/疲惫/放松等） | P1 |
| **智能评分** | 问诊结束后 AI 给出评分和反馈 | P1 |
| **病例库管理** | 按科室/疾病分类管理，支持批量生成 | P1 |
| **拟真延迟** | 模拟思考过程，智能填充语 + 表情过渡 | P1 |

---

## 二、技术选型与原因说明

### 2.1 3D 模型来源

#### 方案对比

| 方案 | 来源 | 格式 | 成本 | 写实度 | 推荐度 | 原因 |
|------|------|------|------|--------|--------|------|
| **MakeHuman** | makehumancommunity.org | .fbx/.glb | 免费 | ⭐⭐⭐⭐⭐ | ✅ 首选 | 开源免费、参数化调节年龄/性别/体型、专为医学可视化设计 |
| **Renderpeople** | renderpeople.com | .fbx | $99/个 | ⭐⭐⭐⭐⭐ | 备选 | 质量高但付费、单模型成本高 |
| **CGTrader** | cgtrader.com | .fbx/.obj | ¥0-400 | ⭐⭐⭐ | 备选 | 质量参差不齐、版权需确认 |
| **VRM 模型** | Booth/VRoid | .vrm | 免费 | ⭐⭐ | ❌ 不推荐 | 动漫风格，不适合医学教学场景 |

#### 为什么推荐 MakeHuman？

**核心优势**：
1. **医学教学适配** - 可调节体型（偏瘦/正常/偏胖）、肌肉量（模拟虚弱状态）、肤色（模拟病态）
2. **参数化生成** - 同一模型可生成不同年龄段（20-80 岁），无需重新建模
3. **开源免费** - GPL 许可，商用无版权风险
4. **导出格式友好** - FBX 带完整骨骼，直接兼容 Mixamo 动画

**技术流程**：
```
MakeHuman 建模 → 导出 FBX → Mixamo 绑定动画 → 导入 Three.js
     ↓              ↓           ↓              ↓
  调节参数       带骨骼      自动绑定       前端渲染
  (年龄/性别)    (骨骼)      (动画库)      (表情/动作)
```

---

### 2.2 大模型使用策略（可配置）

#### 为什么需要分级使用模型？

**问题分析**：
- 问诊对话中，60% 是简单回复（"嗯"、"好的"、"然后呢"）
- 如果用同一模型，成本高且响应慢
- 填充语/简单回复不需要高质量

**分级策略**：

| 等级 | 模型 | 响应时间 | 成本 | 适用场景 | 为什么这样选 |
|------|------|---------|------|---------|-------------|
| **L1 - 快速响应** | doubao-lite-4k | <500ms | ¥0.0003/千 tokens | 填充语生成、简单回复 | 填充语不需要质量，快速便宜即可 |
| **L2 - 标准对话** | doubao-pro-4k | 1-2s | ¥0.0008/千 tokens | 日常问诊对话 | 主力模型，平衡速度与质量 |
| **L3 - 高质量** | doubao-pro-32k | 2-4s | ¥0.006/千 tokens | 复杂病例、书籍解析 | 长上下文支持，适合解析书籍 |
| **L4 - 评分反馈** | doubao-pro-32k | 3-5s | ¥0.006/千 tokens | 问诊评分、详细反馈 | 需要专业分析，非实时可接受慢速 |

**成本对比**（月 5000 次问诊×10 轮）：
```
统一用 doubao-pro-4k: ¥400/月
分级使用 (60% L1 + 40% L2): ¥150 + ¥160 = ¥310/月
节省：22.5%
```

---

### 2.3 拟真延迟与智能填充语方案

#### 问题背景

**为什么要模拟延迟和微反应？**
1. 大模型响应太快（1-2s），真人思考需要 3-5s
2. 真人对话中，听者会即时给出微反应（点头、"嗯"）
3. 立即回复 + 无微反应会破坏"病人"的真实感

---

#### 方案总览：三级响应机制

```
┌─────────────────────────────────────────────────────────────────┐
│                    智能响应层级架构                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Level 1: 微反应 (0-200ms)                                      │
│  ├── 触发时机：用户开始输入/输入关键词                          │
│  ├── 响应内容：点头、"嗯"、皱眉                                 │
│  ├── 实现方式：规则引擎（关键词匹配）                           │
│  └── 特点：零 AI、超快、反射式                                  │
│                                                                 │
│  Level 2: 填充语 (200-800ms)                                    │
│  ├── 触发时机：用户说完，准备回应                               │
│  ├── 响应内容："呃...让我想想"、"胃疼啊..."                     │
│  ├── 实现方式：轻量 LLM + 上下文                               │
│  └── 特点：自然、有上下文关联                                   │
│                                                                 │
│  Level 3: 正式回复 (1500-3000ms)                                │
│  ├── 触发时机：填充语之后                                       │
│  ├── 响应内容：完整病例回复                                     │
│  ├── 实现方式：标准 LLM + Prompt                               │
│  └── 特点：专业、符合病例设定                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**时间线示例**：
```
用户："医生，我最近胃不太舒服"
────────────────────────────────────────────▶ 时间

[0ms]     检测到用户开始输入 → 病人身体前倾（倾听姿态）

[150ms]   检测到关键词"胃" → 病人轻微皱眉 + 手摸胃部（微反应）

[500ms]   用户说完 → 播放"嗯..."音频 + 点头（Level 1）

[700ms]   填充语："胃不舒服啊...让我想想"（Level 2, LLM 生成）

[2000ms]  正式回复："大概是三个月前开始的，那时候饮食不太规律..."（Level 3）
```

---

### 2.3.1 Level 1: 微反应引擎

#### 为什么不用 LLM 做微反应？

| 对比项 | 规则引擎 | 轻量 LLM |
|--------|---------|---------|
| 响应时间 | <50ms | 300-500ms |
| 成本 | ¥0 | ¥0.0003/次 |
| 适用场景 | 反射式反应 | 需要上下文的回复 |
| 推荐度 | ✅ 微反应首选 | ❌ 太慢 |

**结论**：微反应需要<100ms 响应，规则引擎是唯一选择

#### 微反应规则引擎

```typescript
// 关键词 → 微反应映射
const MICRO_REACTION_RULES = {
  // 疼痛相关词
  pain: {
    keywords: ['疼', '痛', '绞', '刺'],
    reaction: {
      emotion: 'pain',
      action: 'flinch',      // 退缩动作
      audio: 'en_pain.mp3',  // 嗯...疼的声音
      duration: 800          // 持续时间 ms
    },
  },

  // 时间询问
  time: {
    keywords: ['什么时候', '多久', '何时'],
    reaction: {
      emotion: 'thinking',
      action: 'touch_chin',  // 摸下巴思考
      audio: 'en_thinking.mp3',
      duration: 1000,
    },
  },

  // 严重程度
  severity: {
    keywords: ['严重', '厉害', '厉害吗'],
    reaction: {
      emotion: 'worry',
      action: 'lean_forward', // 身体前倾
      audio: 'en_worry.mp3',
      duration: 800,
    },
  },

  // 肯定/否定
  polarity: {
    positive: ['好', '对', '是', '有'],
    negative: ['不', '没', '无'],
  },
};

// 微反应生成器
function generateMicroReaction(
  input: string,
  symptoms: string[]
): MicroReaction {
  // Step 1: 症状词检测（优先级最高）
  for (const symptom of symptoms) {
    if (input.includes(symptom)) {
      return getSymptomReaction(symptom); // 返回对应症状反应
    }
  }

  // Step 2: 关键词匹配
  for (const [category, rule] of Object.entries(MICRO_REACTION_RULES)) {
    if ('keywords' in rule) {
      for (const keyword of rule.keywords) {
        if (input.includes(keyword)) {
          return rule.reaction; // 50ms 内返回
        }
      }
    }
  }

  // Step 3: 情感极性检测
  const polarity = detectPolarity(input);
  if (polarity === 'positive') {
    return { emotion: 'relaxed', action: 'nod', audio: 'en_yes.mp3' };
  }
  if (polarity === 'negative') {
    return { emotion: 'serious', action: 'shake_head', audio: 'en_no.mp3' };
  }

  // Step 4: 默认倾听状态
  return { emotion: 'neutral', action: 'listen', audio: null };
}
```

#### 微反应动作库

| 动作名称 | 说明 | 触发条件 | 时长 |
|---------|------|---------|------|
| `flinch` | 身体退缩 | 疼痛词 | 0.8s |
| `touch_chin` | 摸下巴思考 | 时间询问 | 1.0s |
| `lean_forward` | 身体前倾 | 严重/担忧 | 0.8s |
| `nod` | 点头 | 肯定词 | 0.5s |
| `shake_head` | 摇头 | 否定词 | 0.5s |
| `listen` | 倾听姿态 | 默认 | 持续 |
| `blink` | 眨眼 | 定期 | 0.2s |

---

### 2.3.2 Level 2: 智能填充语生成

#### 为什么用轻量 LLM？

| 对比项 | 预设短语 | 轻量 LLM | 标准 LLM |
|--------|---------|---------|---------|
| 响应时间 | <50ms | 300-500ms | 1000-2000ms |
| 成本 | ¥0 | ¥0.0003/次 | ¥0.0008/次 |
| 自然度 | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 上下文关联 | ❌ | ✅ | ✅ |
| 推荐场景 | Level 1 | Level 2 | Level 3 |

**结论**：填充语需要上下文关联但不需要深度推理，轻量 LLM 性价比最高

#### 填充语 Prompt 模板

```typescript
const FILLER_PROMPTS = {
  // Level 2: 上下文相关（轻量 LLM）
  context_aware: `
你是一名病人，正在和医生对话。

【病人设定】
- 姓名：{name}
- 年龄：{age}岁
- 主诉：{chiefComplaint}

【医生问】{userMessage}

请生成病人的自然口语反应：
- 5 个字以内
- 可以带语气词（呃、嗯、这个嘛）
- 不要专业术语
- 符合病人身份和知识水平

【示例】
医生："你哪里不舒服？" → "呃...胃这里"
医生："什么时候开始的？" → "大概...三个月前"
医生："疼得厉害吗？" → "嗯...一阵一阵的"
`,

  // Level 3: 深度回忆（标准 LLM）
  deep_recall: `
你是一名病人，正在回忆病情。

【病历信息】
- 主诉：{chiefComplaint}
- 现病史：{history}
- 关键症状：{symptoms}

【医生问】{userMessage}

请生成病人的回忆过程：
1. 先思考（"让我想想..."）
2. 尝试回忆具体时间/细节
3. 给出答案

要求：
- 口语化
- 可以有停顿
- 符合病人知识水平
- 不直接说诊断
`,
};
```

#### 填充语缓存策略

```
┌─────────────────────────────────────────────────────────────────┐
│                      填充语缓存策略                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  缓存键设计：                                                   │
│  filler:{caseId}:{userMessageHash}:{symptomContext}            │
│                                                                 │
│  缓存层级：                                                     │
│  L1: 内存缓存（热点数据，100 条） → 命中率 30%                 │
│  L2: Redis 缓存（全量数据） → 命中率 50%                        │
│  L3: LLM 生成（缓存未命中）                                     │
│                                                                 │
│  过期策略：                                                     │
│  - 内存缓存：LRU，超过 100 条淘汰最旧                           │
│  - Redis 缓存：24 小时                                           │
│                                                                 │
│  预期效果：                                                     │
│  - 平均响应时间：从 500ms 降至 200ms                            │
│  - LLM 调用减少：80%                                            │
│  - 成本节省：¥0.0003 × 5000 次 × 80% = ¥12/天                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 2.3.3 Level 3: 正式回复生成

```
填充语播放完成后 → 调用标准 LLM 生成正式回复
│
├── 使用模型：doubao-pro-4k
├── 响应时间：1500-2500ms
├── 成本：¥0.0008/次
└── 特点：专业、完整、符合病例设定
```

---

### 2.3.4 闲时行为模拟（等待问诊状态）

#### 问题背景

问诊开始前，3D 模型如果只是站着会很假。需要模拟真人的等待行为。

#### 闲时行为架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    闲时行为状态机                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  基础层（持续运行）：                                           │
│  ├── breathing: 呼吸动画                                        │
│  ├── eyeBlink: 随机眨眼（3-6 秒/次）                            │
│  └── postureMicro: 微调姿势（5 秒/次）                          │
│                                                                 │
│  中间层（循环播放）：                                           │
│  ├── scratch_head: 挠头 (权重 0.3)                              │
│  ├── adjust_clothes: 整理衣服 (权重 0.2)                        │
│  ├── look_around: 环顾四周 (权重 0.3)                           │
│  └── check_watch: 看手表 (权重 0.2)                             │
│                                                                 │
│  高层（LLM 驱动，30 秒更新）：                                   │
│  ├── 根据病例设定生成行为序列                                    │
│  ├── 考虑当前症状（胃痛会摸肚子）                               │
│  └── 避免行为重复                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### LLM 驱动的闲时行为生成

```typescript
// 每 30 秒调用轻量 LLM 生成下一个行为
async function generateNextIdleBehavior(
  case_: VirtualPatientCase,
  lastBehavior: string
): Promise<IdleBehavior> {

  const prompt = `
你是一名虚拟病人，在诊室等待医生问诊。

【病人设定】
- 姓名：{name}
- 年龄：{age}岁
- 主要症状：{chiefComplaint}
- 当前情绪：{currentEmotion}

【上一个行为】{lastBehavior}

请从以下行为中选择一个自然的下一步行为：
A. 调整坐姿/站姿
B. 环顾四周（看诊室环境）
C. 轻微咳嗽
D. 叹气
E. 摸摸疼痛部位
F. 看手表/手机
G. 深呼吸
H. 打哈欠

【选择要求】
- 不要与上一个行为重复
- 考虑症状影响（如胃痛会摸肚子）
- 符合病人情绪状态
- 返回字母选项 + 持续时间
`;

  // 用 doubao-lite 快速生成
  const response = await callLLM({
    model: 'doubao-lite-4k',
    prompt,
    temperature: 0.8, // 高创造性
  });

  return parseBehavior(response);
}
```

#### 闲时行为时间线示例

```
时间 (秒)   行为                      触发原因
──────────────────────────────────────────────────
0          自然站立，自然呼吸         初始状态
5          微调站姿，重心换脚         基础层（姿势微调）
10         眨眼 2 次                   基础层（眨眼）
15         环顾四周                   中间层（随机选择）
20         轻微咳嗽一声              症状相关（咳嗽症状）
25         摸摸胃部                  症状相关（胃痛）
30         [LLM 生成] 叹气            高层（等待焦虑）
35         调整衣领                  中间层（随机选择）
40         深呼吸                    高层（LLM 生成）
45         看诊室挂钟                高层（期待问诊）
50         [问诊开始] → 切换倾听姿态  状态切换
```

#### 闲时行为成本估算

```
LLM 调用频率：每 30 秒 1 次 → 2 次/分钟 → 120 次/小时
模型：doubao-lite-4k
单次成本：¥0.0003
小时成本：120 × ¥0.0003 = ¥0.036/小时
天成本 (8 小时)：¥0.29/天
月成本 (22 天)：¥6.38/月

结论：闲时行为模拟成本极低，可显著提升真实感
```

---

### 2.4 完整技术栈与选型原因

#### 前端技术

| 功能 | 技术选型 | 替代方案 | 为什么选这个 |
|------|---------|---------|-------------|
| 3D 渲染引擎 | **Three.js** | Babylon.js | 文档更丰富、社区活跃、案例多 |
| 模型加载 | **GLTFLoader** | FBXLoader | GLB 格式更小、Web 优化更好 |
| 模型来源 | **MakeHuman** | VRoid | 写实风格适合医学、免费开源 |
| 动画系统 | **AnimationMixer** | - | Three.js 内置，无需额外依赖 |
| 表情系统 | **MorphTarget** | 骨骼动画 | 更自然、Blender 支持好 |
| UI 框架 | **Element Plus** | Ant Design Vue | 团队熟悉、与现有系统一致 |
| 状态管理 | **Pinia** | Vuex | Vue3 官方推荐、更简洁 |

#### 后端技术

| 功能 | 技术选型 | 替代方案 | 为什么选这个 |
|------|---------|---------|-------------|
| 框架 | **NestJS** | Express | 项目统一、IoC 容器、易维护 |
| ORM | **Prisma** | TypeORM | 类型安全好、迁移工具完善 |
| AI 对话 | **火山引擎豆包** | 通义千问 | 项目已接入、中文优化好 |
| TTS | **火山引擎语音** | Azure | 与豆包同平台、管理方便 |
| STT | **火山引擎语音** | 讯飞 | 同上 |
| PDF 解析 | **pdf-parse** | pdfjs-dist | 纯 Node、无需浏览器环境 |
| Word 解析 | **mammoth** | office-parser | 轻量、专注于文本提取 |
| 缓存 | **Redis** | 内存缓存 | 支持分布式、过期策略 |

#### 工具链

| 用途 | 工具 | 原因 |
|------|------|------|
| 3D 建模 | **MakeHuman** | 免费开源、参数化、医学适用 |
| 动画制作 | **Mixamo** | Adobe 免费资源、自动绑定骨骼 |
| 表情制作 | **Blender** | 开源免费、Morph Target 支持好 |
| 模型压缩 | **gltf-pipeline** | 减小 GLB 文件大小 |

---

## 三、数据库设计

### 3.1 数据表结构

```prisma
// 虚拟病人病例
model VirtualPatientCase {
  id              String   @id @default(cuid())
  tenantId        String
  name            String   // 病人姓名
  age             Int      // 年龄
  gender          String   // MALE / FEMALE
  occupation      String?  // 职业

  // 形象配置
  modelId         String?  // 3D 模型 ID (middle-age-male 等)
  voiceId         String?  // TTS 声音 ID
  voiceName       String?  // 声音名称

  // 病例核心信息
  chiefComplaint  String   @db.Text         // 主诉
  history         String   @db.Text         // 现病史
  symptoms        Json                     // [{name, severity, description}]
  tonguePulse     String?  @db.Text         // 舌脉
  diagnosis       String   @db.Text         // 标准诊断（中医）
  syndrome        String?  @db.Text         // 证型
  westernDiagnosis String? @db.Text         // 西医诊断
  treatment       String?  @db.Text         // 治疗方案

  // AI 配置（可配置模型策略）
  dialogModel       String  @default("doubao-pro-4k")
  dialogModelTemp   String  @default("doubao-lite-4k")
  evaluationModel   String  @default("doubao-pro-32k")
  systemPrompt    String   @db.Text
  temperature     Float    @default(0.7)
  responseDelay   Int      @default(1500)   // 基础延迟 ms
  enableFiller    Boolean  @default(true)   // 是否启用填充语

  // 分类与统计
  categoryId      String?
  difficulty      String   @default("MEDIUM") // EASY/MEDIUM/HARD
  playCount       Int      @default(0)
  avgScore        Float    @default(0)
  tags            Json?    // ["胃病", "脾胃虚寒"]

  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([tenantId, categoryId])
  @@map("virtual_patient_cases")
}

// 病例分类
model VirtualPatientCategory {
  id           String   @id @default(cuid())
  tenantId     String
  name         String
  parentId     String?
  children     VirtualPatientCategory[] @relation("CategoryChildren")
  parent       VirtualPatientCategory?  @relation("CategoryChildren", fields: [parentId], references: [id])
  cases        VirtualPatientCase[]
  sortOrder    Int      @default(0)
  createdAt    DateTime @default(now())

  @@index([tenantId, parentId])
  @@map("virtual_patient_categories")
}

// 问诊记录
model PatientConsultation {
  id              String   @id @default(cuid())
  tenantId        String
  userId          String
  caseId          String
  case            VirtualPatientCase @relation(fields: [caseId], references: [id])

  messages        Json     @db.Text       // [{role, content, timestamp, emotion}]
  userDiagnosis   String?  @db.Text
  userSyndrome    String?  @db.Text
  userTreatment   String?  @db.Text

  score           Float?
  feedback        String?  @db.Text
  evaluationDetail Json?

  duration        Int      // 时长 (秒)
  messageCount    Int      // 对话轮数
  voiceEnabled    Boolean  @default(false)

  createdAt       DateTime @default(now())
  finishedAt      DateTime?

  @@index([userId, caseId])
  @@map("patient_consultations")
}

// 书籍知识库
model MedicalBook {
  id              String   @id @default(cuid())
  tenantId        String
  title           String
  author          String?
  fileUrl         String
  fileSize        Int
  pageCount       Int
  status          String   // pending / processing / completed / failed

  extractedData   Json?
  diseaseList     Json?
  generatedCases  VirtualPatientCase[]

  createdAt       DateTime @default(now())
  completedAt     DateTime?

  @@index([tenantId, status])
  @@map("medical_books")
}
```

---

## 四、核心工作流程

### 4.1 病例配置流程

```
创建新病例
    │
    ├── 方式 A：手动配置
    │   1. 基本信息：姓名、年龄、性别、职业
    │   2. 选择形象：从预设模型库选择 (middle-age-male 等)
    │   3. 选择声音：TTS 音色
    │   4. 病例信息：主诉、现病史、症状、诊断
    │   5. AI 配置：选择对话模型、启用填充语
    │   6. 自动生成 Prompt
    │
    ├── 方式 B：书籍导入
    │   1. 上传 PDF/Word
    │   2. AI 解析提取疾病知识 (doubao-pro-32k)
    │   3. 自动生成病例草稿
    │   4. 人工校对确认
    │
    └── 方式 C：AI 批量生成
        1. 选择疾病类别
        2. 输入生成数量
        3. AI 自动生成 (doubao-pro-4k)
        4. 批量保存

保存后 → 生成系统 Prompt 存储到数据库
```

### 4.2 问诊对话流程（含拟真延迟）

```
学生端                后端服务                 AI 服务
  │                      │                       │
  │ 发送问诊消息          │                       │
  ├─────────────────────▶│                       │
  │                      │                       │
  │ [等待响应]            │ 检测问题复杂度         │
  │                      │                       │
  │ ◀───────────────────┤ 返回填充语             │
  │ 显示"呃...让我想想"    │ (0-500ms)             │
  │ 病人显示思考表情       │                       │
  │                      │                       │
  │                      │ 调用大模型             │
  │                      ├──────────────────────▶│
  │                      │                       │
  │                      │◀──────────────────────┤
  │                      │ 返回回复文本 (1-2s)     │
  │                      │                       │
  │                      │ 调用 TTS               │
  │                      ├──────────────────────▶│
  │                      │                       │
  │                      │◀──────────────────────┤
  │                      │ 返回音频 (0.5s)         │
  │                      │                       │
  │ ◀───────────────────┤ 返回完整回复 (2-3s)     │
  │ 显示文字 + 播放音频    │                       │
  │ 切换对应表情          │                       │
  │                      │                       │
```

### 4.3 评分流程

```
问诊结束 → 学生提交诊断
         │
         ▼
    调用评分接口 (doubao-pro-32k)
         │
         ▼
    AI 分析问诊记录 + 对比标准诊断
         │
         ▼
    生成评分报告：
    - 问诊完整度 (30 分)
    - 诊断准确率 (40 分)
    - 知识覆盖度 (20 分)
    - 沟通技巧 (10 分)
         │
         ▼
    返回详细反馈 + 改进建议
```

---

## 五、后端接口设计

### 5.1 接口列表

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| **病例管理** |
| GET | `/virtual-patient/cases` | 获取病例列表 | 教师 + |
| GET | `/virtual-patient/cases/:id` | 获取病例详情 | 教师 + |
| POST | `/virtual-patient/cases` | 创建病例 | 教师 + |
| PATCH | `/virtual-patient/cases/:id` | 更新病例 | 教师 + |
| DELETE | `/virtual-patient/cases/:id` | 删除病例 | 教师 + |
| POST | `/virtual-patient/cases/batch-generate` | 批量生成 | 教师 + |
| **分类管理** |
| GET | `/virtual-patient/categories` | 获取分类树 | 教师 + |
| POST | `/virtual-patient/categories` | 创建分类 | 教师 + |
| PATCH | `/virtual-patient/categories/:id` | 更新分类 | 教师 + |
| DELETE | `/virtual-patient/categories/:id` | 删除分类 | 教师 + |
| **书籍导入** |
| POST | `/virtual-patient/books/upload` | 上传书籍 | 教师 + |
| GET | `/virtual-patient/books` | 获取书籍列表 | 教师 + |
| GET | `/virtual-patient/books/:id` | 获取书籍详情 | 教师 + |
| POST | `/virtual-patient/books/:id/generate` | 生成病例 | 教师 + |
| **问诊对话** |
| POST | `/virtual-patient/chat` | 对话接口 | 所有用户 |
| POST | `/virtual-patient/chat/voice` | 语音对话 | 所有用户 |
| POST | `/virtual-patient/consultations/:id/submit` | 提交诊断 | 所有用户 |
| GET | `/virtual-patient/my-consultations` | 我的问诊列表 | 所有用户 |

### 5.2 核心接口设计

#### 对话接口（含填充语）

```typescript
// POST /virtual-patient/chat
// Request:
{
  caseId: string,
  message: string,
  conversationId?: string
}

// Response:
{
  code: 0,
  data: {
    filler?: {           // 填充语（可选）
      text: string,
      audioUrl?: string,
      emotion: string
    },
    reply: string,       // AI 回复
    emotion: string,     // 最终表情
    delay: number,       // 延迟时间 (ms)
    conversationId: string,
    tokens: number
  }
}
```

---

## 六、前端界面设计

### 6.1 病例配置界面

```
┌─────────────────────────────────────────────────────────────────┐
│  AI 虚拟病人 - 病例配置                              [保存] [取消] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  基本信息                                                        │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 姓名：[张某某]  年龄：[45] 岁  性别：○ 男 ● 女            │ │
│  │ 职业：[公司职员]                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  选择形象（3D 模型）                                            │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  ○ 中年男性  ○ 中年女性  ○ 老年男性  ○ 老年女性           │ │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                        │ │
│  │  │ 👨  │ │ 👩  │ │ 👴  │ │ 👵  │                        │ │
│  │  └─────┘ └─────┘ └─────┘ └─────┘                        │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  选择声音                                                        │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ [温柔女声 ▼]  [试听 🔊]                                    │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  病例信息                                                        │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 主诉：[反复胃脘部隐痛 3 个月]                                │ │
│  │ 现病史：[3 个月前因饮食不规律出现...]                       │ │
│  │ 伴随症状：[神疲乏力] [食欲不振] [大便溏薄] [+ 添加]        │ │
│  │ 中医诊断：[胃痛]  证型：[脾胃虚寒证]                       │ │
│  │ 舌脉：[舌淡苔白，脉细弱]                                   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  AI 配置                                                         │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 对话模型：[doubao-pro-4k ▼]                               │ │
│  │ 响应延迟：[1500   ] ms   ☑ 启用填充语（模拟思考）          │ │
│  │ 温度参数：[0.7    ]    0=保守  1=创造性                    │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│                              [取消]  [保存]                     │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 问诊对话界面

```
┌─────────────────────────────────────────────────────────────────┐
│  AI 虚拟病人问诊练习                                  [结束问诊]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  病人：张某某，男，45 岁，公司职员   │  主诉：反复胃脘部隐痛 3 个月  │
│  诊断：待问诊                      │  已问诊：5 分 32 秒          │
│                                                                 │
│  ┌────────────────────────────┐  │  ┌────────────────────────┐ │
│  │                            │  │  │ [AI] 医生您好...       │ │
│  │      [3D 人物模型]          │  │  │                       │ │
│  │                            │  │  │ [我] 请问哪里不舒服？  │ │
│  │    表情：思考中 🤔         │  │  │                       │ │
│  │    动作：自然站立          │  │  │ [AI] 呃...让我想想... │ │
│  │                            │  │  │      (思考中)         │ │
│  └────────────────────────────┘  │  │                       │ │
│                                  │  └────────────────────────┘ │
│  [查看病史]                      │                              │
│                                  │  ┌────────────────────────┐ │
│                                  │  │ [🎤] 按住说话           │ │
│                                  │  │ [请输入问诊内容...  ]  │ │
│                                  │  └────────────────────────┘ │
│                                  │                              │
│                                  │  状态：● 思考中 (1.2s)       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 七、核心服务实现

### 7.1 对话服务（含延迟模拟）

```typescript
// backend/src/modules/virtual-patient/services/consultation.service.ts

@Injectable()
export class ConsultationService {
  constructor(
    private prisma: PrismaService,
    private llmService: LlmService,
    private voiceService: VoiceService,
    private emotionService: EmotionService,
  ) {}

  async chat(caseId: string, message: string, userId: string) {
    // 获取病例配置
    const case_ = await this.prisma.virtualPatientCase.findUnique({
      where: { id: caseId },
    });

    // Step 1: 选择填充语（思考类）
    const filler = this.getFillerPhrase('thinking');

    // Step 2: 计算延迟时间
    const delay = case_.responseDelay + Math.random() * 1000;

    // Step 3: 后台调用大模型
    const replyPromise = this.llmService.generate({
      model: case_.dialogModel,
      prompt: buildPrompt(case_, message),
      temperature: case_.temperature,
    });

    // Step 4: 返回填充语（立即）
    return {
      filler: {
        text: filler.text,
        emotion: 'thinking',  // 皱眉表情
        delay: 0,
      },
      reply: await replyPromise,
      totalDelay: delay,
    };
  }

  private getFillerPhrase(type: 'thinking' | 'uncertain' | 'pain') {
    const phrases = FILLER_PHRASES[type];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }
}
```

### 7.2 表情引擎服务

```typescript
// backend/src/modules/virtual-patient/services/emotion-engine.service.ts

const SYMPTOM_EMOTION_MAP: Record<string, string> = {
  '剧烈疼痛': 'pain',
  '隐痛': 'discomfort',
  '乏力': 'fatigue',
  '疲惫': 'fatigue',
  '担心': 'anxiety',
};

@Injectable()
export class EmotionEngineService {
  analyzeEmotion(
    message: string,
    symptoms: Array<{ name: string }>,
  ): string {
    // 检查症状映射
    for (const symptom of symptoms) {
      if (SYMPTOM_EMOTION_MAP[symptom.name]) {
        return SYMPTOM_EMOTION_MAP[symptom.name];
      }
    }

    // 检查关键词
    if (message.includes('疼') || message.includes('痛')) return 'pain';
    if (message.includes('累') || message.includes('乏')) return 'fatigue';
    if (message.includes('担心') || message.includes('害怕')) return 'anxiety';

    return 'neutral';
  }
}
```

---

## 八、开发任务清单

### Phase 1: 核心功能（7 天）

| 任务 | 工期 | 说明 |
|------|------|------|
| **数据库** | 0.5 天 | 创建 4 张表 |
| **MakeHuman 模型准备** | 1 天 | 生成 4 个基础模型（中老年男女） |
| **Blender 表情** | 1 天 | 创建 3 个 Morph Target |
| **病例管理服务** | 1.5 天 | CRUD + Prompt 生成 |
| **问诊对话服务** | 1.5 天 | 含填充语逻辑 |
| **评分服务** | 1 天 | AI 评分 + 反馈 |
| **前端 - 病例配置** | 1.5 天 | 表单 + 模型选择 |
| **前端 - 问诊对话** | 2 天 | 3D 显示 + 对话 UI |
| **前端 - 评分反馈** | 1 天 | 评分报告展示 |

### Phase 2: 增强功能（5 天）

| 任务 | 工期 | 说明 |
|------|------|------|
| **书籍导入** | 2 天 | 上传 + 解析 + 校对 |
| **批量生成** | 1 天 | AI 批量生成病例 |
| **语音功能** | 1.5 天 | TTS/STT对接 |
| **动作系统** | 0.5 天 | Mixamo 动画导入 |

### Phase 3: 优化与测试（3 天）

| 任务 | 工期 | 说明 |
|------|------|------|
| **填充语调优** | 1 天 | 调整延迟参数 |
| **Prompt 调优** | 1 天 | 测试 + 优化 |
| **功能测试** | 1 天 | 完整测试 |

**预计总工期**：15 个工作日

---

## 九、成本估算

### 9.1 月度成本（1000 名学生，每人 5 次问诊）

#### AI 对话成本（分级计算）

| 层级 | 场景 | 调用次数 | 单次成本 | 月成本 |
|------|------|---------|---------|--------|
| **L1 微反应** | 关键词触发 | 5000×10×0.3=15000 | ¥0 | ¥0（规则引擎） |
| **L2 填充语** | 上下文填充语 | 5000×10=50000 | ¥0.0003 | ¥150 |
| **L2 标准对话** | 日常问诊 | 5000×10×0.6=30000 | ¥0.0008 | ¥240 |
| **L3 复杂病情** | 复杂问诊 | 5000×10×0.4=20000 | ¥0.006 | ¥120 |
| **L4 评分反馈** | 问诊评分 | 5000×1=5000 | ¥0.006 | ¥30 |

#### 其他服务成本

| 项目 | 月成本 | 说明 |
|------|-------|------|
| 书籍解析（10 本/月） | ¥600 | doubao-pro-32k，每本 30k tokens |
| TTS 语音 | ¥10 | 缓存后 80% 命中，从¥50 降至¥10 |
| STT 语音 | ¥50 | 按量付费，假设 30% 用户用语音 |
| 闲时行为模拟 | ¥7 | 120 次/小时×8 小时×22 天×¥0.0003 |
| 3D 模型 | ¥0 | MakeHuman 免费 |
| **合计** | **¥1,207/月** | - |

---

### 9.2 成本优化效果

```
优化前（统一模型 + 预录音频）：
├── AI 对话（统一 doubao-pro-4k）: ¥400/月
├── TTS（无缓存）: ¥50/月
├── 配音录制（一次性）: ¥500
└── 合计：¥950/月 + ¥500 一次性

优化后（三级响应 + 智能填充语+TTS 缓存）：
├── L1 微反应（规则引擎）: ¥0
├── L2 填充语（doubao-lite）: ¥150/月
├── L2 标准对话（doubao-pro-4k）: ¥240/月
├── L3 复杂病情（doubao-pro-32k）: ¥120/月
├── L4 评分（doubao-pro-32k）: ¥30/月
├── 书籍解析：¥600/月
├── TTS（缓存 80% 命中）: ¥10/月
├── STT: ¥50/月
├── 闲时行为：¥7/月
└── 合计：¥1,207/月

额外功能获得：
✅ 智能微反应（<100ms 响应）
✅ 上下文填充语（自然不重复）
✅ 闲时行为模拟（更真实）
✅ TTS 缓存（成本降 80%）
```

### 9.3 按规模估算

| 学生数 | 月成本 | 人均成本 |
|--------|-------|---------|
| 500 | ¥707 | ¥1.41/人 |
| 1000 | ¥1,207 | ¥1.21/人 |
| 2000 | ¥2,207 | ¥1.10/人 |
| 5000 | ¥5,207 | ¥1.04/人 |

**规模效应**：用户越多，人均成本越低（固定成本摊薄）

## 十、技术选型总结

### 10.1 核心选型决策

| 决策点 | 选择 | 原因 | 备选方案 |
|--------|------|------|---------|
| **3D 模型** | MakeHuman | 免费开源、写实风格、参数化调节、医学适用 | Renderpeople(付费) |
| **表情系统** | Morph Target | 更自然、Blender 支持好、运行时性能佳 | 面部骨骼动画 |
| **动画来源** | Mixamo | Adobe 免费、自动绑定骨骼、1000+ 动画库 | 手动制作 |
| **填充语生成** | 轻量 LLM | 上下文感知、无限变化、维护成本低 | 预录音频/规则模板 |
| **对话模型** | doubao-pro-4k | 速度质量平衡、中文优化好 | doubao-lite/pro-32k |
| **填充语模型** | doubao-lite-4k | 快速响应、成本低 (¥0.0003/次) | 规则模板 |
| **TTS 服务** | 火山引擎 | 与豆包同平台、中文优化、管理方便 | Azure/阿里云 |
| **缓存策略** | Redis | 支持分布式、过期策略、命中率高 (80%) | 内存缓存 |

### 10.2 为什么这样设计？

**核心设计原则**：
1. **真实感优先** - 写实模型、拟真延迟、智能填充语，都是为增强沉浸感
2. **成本可控** - 分级使用模型，填充语用便宜模型，TTS 用缓存
3. **可维护性** - 智能生成替代预录，减少人工维护成本
4. **可扩展性** - 模块化设计，可轻松替换模型/服务

**成本优化效果**：
```
优化前（统一模型 + 预录音频）：
- AI 对话：¥400/月
- TTS: ¥50/月
- 配音录制：¥500(一次性)
- 合计：¥950/月 + 维护成本

优化后（分级模型 + 智能填充语+TTS 缓存）：
- AI 对话 (L1 填充语): ¥150/月
- AI 对话 (L2 标准): ¥240/月
- AI 评分 (L4): ¥60/月
- TTS(缓存后): ¥10/月
- 合计：¥460/月
- 节省：52%
```

---

## 十一、需要确认的问题

| 问题 | 选项 A（推荐） | 选项 B | 原因说明 |
|------|--------------|-------|---------|
| **模型风格** | 写实 (MakeHuman) | 动漫 (VRM) | 医学教学需要写实风格，动漫风格不够严肃 |
| **表情实现** | Blender Morph Target | 面部骨骼动画 | Morph Target 更自然，制作流程简单 |
| **填充语方案** | 轻量 LLM 实时生成 | 规则模板 + 缓存 | LLM 生成变化多、可结合上下文，成本仅¥0.0003/次 |
| **模型数量** | 4 个基础（中老年男女） | 8 个（增加青年 + 儿童） | 4 个可覆盖主要病例场景，后期可扩展 |
| **TTS 缓存** | Redis 缓存 7 天 | 本地缓存 | Redis 支持分布式部署，适合多服务器场景 |

---

> 文档结束
