# AI 服务商和模型数据同步提示词

> **使用说明**：当你需要同步数据库中的 AI 服务商和模型数据到记忆文档时，将以下内容发送给 Claude。

---

## 同步提示词模板

```
请执行以下任务：

1. 查询数据库中的 AI 服务商和模型数据：
   - 表：ai_providers, ai_models
   - 字段：服务商名称、基础端点、模型名称、模型ID、价格、状态等

2. 使用以下命令查询数据：
```bash
cd c:\\项目\\panlei\\packages\\backend && node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const providers = await prisma.aiProvider.findMany({
    include: {
      models: {
        orderBy: [{ type: 'asc' }, { createdAt: 'asc' }]
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(JSON.stringify({
    exportTime: new Date().toISOString(),
    providers: providers
  }, null, 2));
}

main().catch(console.error).finally(() => prisma.\$disconnect());
"
```

3. 将查询结果同步更新到以下文档：
   - `.claude/memory/05a-doubao-integration.md` 第二章「模型矩阵」
   - 更新：服务商信息、模型列表、EP接入点ID、价格、状态

4. 同步规则：
   - 以数据库实际数据为准
   - 删除文档中过时的模型信息
   - 新增数据库中新添加的模型
   - 更新模型价格和状态
   - 更新数据导出时间戳

请开始执行。
```

---

## 使用场景

| 场景 | 说明 |
|------|------|
| **新增模型** | 数据库添加了新的 AI 模型，需要同步到文档 |
| **价格调整** | 模型价格发生变化，需要更新文档中的价格信息 |
| **模型下线** | 某个模型停用，需要从文档中删除或标注状态 |
| **新增服务商** | 接入了新的 AI 服务商，需要新增服务商文档 |
| **定期同步** | 每月或每季度定期同步，确保文档与数据库一致 |

---

## 执行频率建议

| 频率 | 场景 |
|------|------|
| **即时同步** | 新增模型、价格调整、模型上下线时 |
| **定期同步** | 每月1日同步一次，确保数据一致性 |
| **按需同步** | 发现文档数据与实际不符时 |

---

## 数据库表结构参考

### ai_providers 表（服务商）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 服务商 ID |
| name | String | 服务商名称 |
| baseUrl | String | API 基础端点 |
| authType | String | 鉴权方式（Bearer） |
| supportImageGeneration | Boolean | 是否支持图片生成 |
| isEnabled | Boolean | 是否启用 |

### ai_models 表（模型）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 模型 ID |
| providerId | String | 所属服务商 ID |
| name | String | 模型名称 |
| modelId | String | EP 接入点 ID |
| type | String | 类型（chat/image） |
| isEp | Boolean | 是否为 EP 接入点 |
| inputPrice | Decimal | 输入价格（元/千tokens） |
| outputPrice | Decimal | 输出价格（元/千tokens） |
| isEnabled | Boolean | 是否启用 |
| lastStatus | String | 最后状态（online/offline/error） |

---

## 同步检查清单

同步完成后，请检查：

- [ ] 服务商信息是否正确
- [ ] 模型列表是否完整
- [ ] EP 接入点 ID 是否正确
- [ ] 价格信息是否准确
- [ ] 模型状态是否最新
- [ ] 数据导出时间戳是否更新

---

## 注意事项

1. **EP 接入点 ID 的重要性**：
   - 文档中的模型 ID 必须是 EP 接入点 ID（如 `ep-20260315163053-ns7kz`）
   - 不能使用模型名称（如 `doubao-lite-4k`）
   - EP 接入点需要用户在火山方舟控制台创建

2. **价格单位**：
   - 数据库中价格单位：元/千 tokens
   - 文档中显示格式：¥0.8/千tokens

3. **数据一致性**：
   - 始终以数据库为准
   - 如发现数据库数据错误，应先修正数据库

4. **文档更新范围**：
   - 仅更新数据部分（模型矩阵、价格、状态等）
   - 不修改使用方法、代码示例等部分
