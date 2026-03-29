# AI 智能导入 - 从数据库读取 API 配置

> **更新时间**: 2026-03-27
> **修改内容**: 从统一 AI 配置模块（AiProvider/AiModel 表）读取 API Key，替代环境变量

---

## 一、修改背景

### 问题
之前 AI 导入功能使用环境变量 `VOLCENGINE_AI_KEY` 读取 API Key，存在以下问题：
1. 用户无法在系统中动态切换模型
2. 每次更换 API Key 需要修改 `.env` 文件并重启服务
3. 与项目已有的 AI 平台管理模块脱节

### 解决方案
修改 `ai-import.service.ts`，从数据库的 `AiProvider` 和 `AiModel` 表读取配置。

---

## 二、修改内容

### 文件位置
`packages/backend/src/modules/questions/services/ai-import.service.ts`

### 修改方法
修改 `parseQuestionsWithAI` 方法，新增数据库查询逻辑：

```typescript
private async parseQuestionsWithAI(filePath: string, model?: string): Promise<any[]> {
  const startTime = Date.now()

  // ━━━ 第 1 步：从数据库查询 AI 配置 ━━━
  let apiKey: string
  let endpoint: string
  let aiModel: string

  // 优先根据 model 参数查找对应的 AiModel 和 Provider
  if (model) {
    const aiModelRecord = await this.prisma.aiModel.findFirst({
      where: { modelId: model, isEnabled: true },
      include: { provider: true },
    })

    if (aiModelRecord && aiModelRecord.provider) {
      apiKey = aiModelRecord.provider.apiKey
      endpoint = aiModelRecord.provider.baseUrl
      aiModel = aiModelRecord.modelId
      log(LogLevel.INFO, 'parseQuestionsWithAI_config', '根据 model 参数找到 AI 配置', {
        modelId: aiModel,
        providerName: aiModelRecord.provider.name,
        endpoint,
        apiKeyPrefix: apiKey?.substring(0, 4) + '***',
      })
    } else {
      log(LogLevel.WARN, 'parseQuestionsWithAI_config', '未找到启用的 model，使用默认配置', { modelId: model })
      // 回退到默认配置
      apiKey = this.config.get<string>('VOLCENGINE_AI_KEY') || ''
      endpoint = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
      aiModel = model || 'doubao-seed-2.0-lite'
    }
  } else {
    // 没有传入 model，查找默认启用的火山引擎 Provider
    const defaultProvider = await this.prisma.aiProvider.findFirst({
      where: { isEnabled: true, name: { contains: '火山' } },
      include: { models: { where: { isEnabled: true }, take: 1 } },
    })

    if (defaultProvider) {
      apiKey = defaultProvider.apiKey
      endpoint = defaultProvider.baseUrl
      aiModel = defaultProvider.models[0]?.modelId || 'doubao-seed-2.0-lite'
      log(LogLevel.INFO, 'parseQuestionsWithAI_config', '使用默认火山引擎配置', {
        providerName: defaultProvider.name,
        endpoint,
        modelId: aiModel,
        apiKeyPrefix: apiKey?.substring(0, 4) + '***',
      })
    } else {
      log(LogLevel.WARN, 'parseQuestionsWithAI_config', '未找到默认配置，使用环境变量')
      apiKey = this.config.get<string>('VOLCENGINE_AI_KEY') || ''
      endpoint = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
      aiModel = 'doubao-seed-2.0-lite'
    }
  }

  // 检查 API Key 是否存在
  if (!apiKey) {
    log(LogLevel.ERROR, 'parseQuestionsWithAI_config', 'API Key 缺失')
    throw new BadRequestException('AI API Key 未配置，请联系管理员')
  }

  // ... 后续代码不变
}
```

---

## 三、查询逻辑

### 优先级顺序
1. **用户传入 model 参数** → 查找对应的 `AiModel` → 获取关联的 `AiProvider` → 使用其配置
2. **未传入 model** → 查找名称包含"火山"的启用 Provider → 使用其第一个启用的模型
3. **都找不到** → 回退到环境变量 `VOLCENGINE_AI_KEY`（兜底方案）

### 数据库表结构
```prisma
model AiProvider {
  id          String   @id @default(cuid())
  name        String   @db.VarChar(100)
  baseUrl     String   @db.VarChar(300)
  apiKey      String   @db.VarChar(500)
  apiSecret   String?  @db.VarChar(500)
  supportImageGeneration Boolean @default(false)
  isEnabled   Boolean  @default(false)
  models      AiModel[]
}

model AiModel {
  id          String   @id @default(cuid())
  providerId  String
  modelId     String   @db.VarChar(100)
  name        String   @db.VarChar(200)
  isEnabled   Boolean  @default(false)
  provider    AiProvider @relation(fields: [providerId], references: [id])
}
```

---

## 四、使用方法

### 方式 1：前端传入模型 ID
```typescript
// 前端调用时指定模型
api.post('/api/ai-import/upload', formData, {
  params: { model: 'doubao-seed-1.5' }
})
```

### 方式 2：使用默认配置
不传 `model` 参数，系统自动使用数据库中第一个启用的火山引擎 Provider。

---

## 五、日志输出

### 成功找到数据库配置
```
[AI-IMPORT][INFO][parseQuestionsWithAI_config] 根据 model 参数找到 AI 配置 | {
  "modelId": "doubao-seed-1.5",
  "providerName": "火山引擎",
  "endpoint": "https://ark.cn-beijing.volces.com/api/v3",
  "apiKeyPrefix": "7922***"
}
```

### 未找到配置，使用环境变量
```
[AI-IMPORT][WARN][parseQuestionsWithAI_config] 未找到默认配置，使用环境变量
```

### API Key 缺失（报错）
```
[AI-IMPORT][ERROR][parseQuestionsWithAI_config] API Key 缺失
→ 前端返回：400 Bad Request: AI API Key 未配置，请联系管理员
```

---

## 六、优势

| 维度 | 环境变量方案 | 数据库配置方案 |
|------|-------------|---------------|
| 动态切换 | ❌ 需要修改.env 并重启 | ✅ 管理页面直接修改 |
| 多模型支持 | ❌ 只能固定一个 | ✅ 支持多个 Provider 切换 |
| 权限管理 | ❌ 无 | ✅ 可结合机构配额管理 |
| 可追溯性 | ❌ 无法追踪修改记录 | ✅ 数据库操作日志 |
| 兜底方案 | - | ✅ 环境变量兜底 |

---

## 七、后续扩展建议

### 7.1 配额扣减（可选）
在 AI 调用成功后，记录使用量：
```typescript
// 调用成功后
await this.prisma.aiUsage.create({
  data: {
    tenantId,
    modelId: aiModel,
    tokensUsed: data.usage?.total_tokens || 0,
    taskId,
  }
})
```

### 7.2 前端模型选择器
在 AI 导入页面添加模型下拉框：
```vue
<el-select v-model="selectedModel" placeholder="选择 AI 模型">
  <el-option
    v-for="model in availableModels"
    :key="model.modelId"
    :label="model.name"
    :value="model.modelId"
  />
</el-select>
```

### 7.3 错误处理优化
针对不同错误类型给出更友好的提示：
- API Key 无效 → "API Key 配置错误，请前往 AI 平台管理检查"
- 配额不足 → "当前机构 AI 配额不足，请联系管理员充值"
- 模型未启用 → "该模型已停用，请选择其他可用模型"

---

## 八、验证步骤

### 1. 检查数据库配置
```bash
docker exec -it panlei-mysql mysql -u panlei -ppanlei_dev_2024 panlei_dev

# 查询 Provider 配置
SELECT id, name, baseUrl, LEFT(apiKey, 8) as key_prefix, isEnabled
FROM AiProvider
WHERE name LIKE '%火山%';

# 查询可用模型
SELECT modelId, name, isEnabled FROM AiModel WHERE isEnabled = 1;
```

### 2. 上传测试文件
访问 http://localhost:5173 → 题库管理 → AI 智能导入 → 上传文件

### 3. 查看后端日志
```bash
docker logs -f panlei-backend 2>&1 | grep AI-IMPORT
```

### 4. 预期日志输出
```
[AI-IMPORT][INFO][createImportTask] 开始创建导入任务
[AI-IMPORT][INFO][uploadFile] 文件写入成功
[AI-IMPORT][INFO][parseQuestionsWithAI_config] 使用默认火山引擎配置
[AI-IMPORT][INFO][parseQuestionsWithAI_start] 准备调用 AI API
[AI-IMPORT][INFO][parseQuestionsWithAI_response] AI API 响应
[AI-IMPORT][INFO][parseQuestionsWithAI_json] JSON 解析成功
```

---

## 九、常见问题

### Q1: 看不到日志怎么办？
确保 `docker-compose.dev.yml` 中设置了：
```yaml
environment:
  DEBUG_AI_IMPORT: 'true'
```

### Q2: 提示"API Key 未配置"？
检查数据库：
1. `AiProvider` 表中是否有火山引擎配置
2. `isEnabled` 字段是否为 `true`

### Q3: 如何切换到其他模型？
方式 1：前端调用时传入 `model` 参数
方式 2：在 AI 平台管理页面修改默认 Provider

---

**文档版本**: v1.0
**实施状态**: ✅ 已完成
**测试状态**: ⏳ 待验证
