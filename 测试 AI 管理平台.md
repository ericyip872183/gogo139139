# AI 管理平台测试指南

> 本文档说明如何测试 AI 平台管理功能（超管专属）

---

## 一、前置准备

### 1.1 环境启动

```bash
# 启动开发服务器
pnpm run dev
```

- 前端：http://localhost:5173
- 后端：http://localhost:3000

### 1.2 登录账号

使用**超级管理员**账号登录：

| 字段 | 值 |
|------|-----|
| 用户名 | `admin` |
| 密码 | （创建时设置的密码） |
| 机构 | （自动识别） |

> ⚠️ 只有 SUPER_ADMIN 角色可以访问 AI 平台管理

---

## 二、功能测试流程

### 2.1 进入 AI 平台管理

1. 登录后，点击顶部导航 **「AI 平台管理」**
2. 页面包含 5 个 Tab：
   - 服务商配置
   - 模型管理
   - 机构模型配置
   - 配额管理
   - 使用统计

---

### 2.2 服务商配置测试

**路径**：AI 平台管理 → 服务商配置

**测试步骤**：

1. 点击「新增服务商」按钮
2. 填写以下信息：
   ```
   名称：火山引擎豆包
   API 地址：https://ark.cn-beijing.volces.com/api/v3
   认证方式：Bearer Token
   API Key: （你的火山引擎 API Key）
   状态：已启用
   ```
3. 点击「提交」
4. 验证：列表中显示新增的服务商

**预期结果**：
- ✅ 创建成功，列表刷新
- ✅ 可以编辑/删除服务商

**API 验证**：
```bash
curl http://localhost:3000/api/ai/admin/providers \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 2.3 模型管理测试

**路径**：AI 平台管理 → 模型管理

**测试步骤**：

1. 点击「新增模型」按钮
2. 填写以下信息：
   ```
   服务商：火山引擎豆包
   模型名称：豆包轻量版
   模型 ID/EP: doubao-lite-4k
   EP 模式：勾选（如果是火山引擎）
   输入价格：0.0008
   输出价格：0.002
   状态：已启用
   ```
3. 点击「提交」
4. 验证：列表中显示新增的模型

**预期结果**：
- ✅ 创建成功，列表刷新
- ✅ 可以按服务商筛选模型
- ✅ 可以编辑/删除模型

---

### 2.4 机构模型配置测试

**路径**：AI 平台管理 → 机构模型配置

**测试步骤**：

1. 在「选择机构」下拉框中选择机构
2. 点击「配置模型」按钮
3. 填写以下信息：
   ```
   机构：（已选择）
   服务商：火山引擎豆包
   模型：豆包轻量版
   使用场景：模拟病人
   默认模型：勾选
   状态：已启用
   ```
4. 点击「提交」
5. 验证：列表中显示该机构的模型配置

**使用场景说明**：
| 场景 | 说明 |
|------|------|
| 通用场景 | general |
| 模拟病人 | mock_patient |
| 题目导入 | question_import |
| OCR 识别 | ocr |

**预期结果**：
- ✅ 配置成功，列表刷新
- ✅ 每个场景只能有一个默认模型
- ✅ 可以删除机构模型配置

---

### 2.5 配额管理测试

**路径**：AI 平台管理 → 配额管理

**测试步骤**：

1. 点击「分配配额」按钮
2. 填写以下信息：
   ```
   机构：XX 医学院
   服务商：火山引擎豆包
   总配额：1000000
   预警阈值：20（%）
   ```
3. 点击「提交」
4. 验证：
   - 列表中显示机构配额
   - 下方显示平台总配额概览

**预期结果**：
- ✅ 配额分配成功
- ✅ 剩余额度进度条正常显示
- ✅ 平台总配额统计正确

---

### 2.6 使用统计测试

**路径**：AI 平台管理 → 使用统计

**测试步骤**：

1. 选择统计周期（7 天/15 天/30 天/60 天/90 天）
2. 查看以下数据：
   - 总调用次数
   - 总 Token 消耗
   - 总成本（元）
   - 充值金额
3. 查看图表：
   - 按服务商统计（柱状图 + 折线图）
   - 按模块统计（柱状图 + 折线图）

**预期结果**：
- ✅ 统计数据正常显示
- ✅ ECharts 图表正常渲染
- ✅ 切换周期后数据更新

---

## 三、机构端测试（TENANT_ADMIN）

### 3.1 进入 AI 服务中心

1. 使用机构管理员账号登录
2. 点击顶部导航 **「AI 服务中心」**

### 3.2 我的服务

**测试步骤**：
1. 查看本机构可用的 AI 服务列表
2. 查看各服务的模型配置和使用场景

### 3.3 使用统计

**测试步骤**：
1. 选择统计周期
2. 查看本机构的 AI 使用情况

### 3.4 充值管理

**测试步骤**：
1. 点击「申请充值」
2. 输入充值金额
3. 提交申请（模拟支付流程）

### 3.5 配额预警

**测试步骤**：
1. 查看当前配额使用情况
2. 当剩余额度低于预警阈值时，查看预警提示

---

## 四、API 测试

### 4.1 获取 Token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your_password",
    "tenantCode": "your_tenant"
  }'
```

### 4.2 获取服务商列表

```bash
curl http://localhost:3000/api/ai/admin/providers \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4.3 创建服务商

```bash
curl -X POST http://localhost:3000/api/ai/admin/providers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "火山引擎豆包",
    "baseUrl": "https://ark.cn-beijing.volces.com/api/v3",
    "authType": "Bearer",
    "apiKey": "your_api_key",
    "isEnabled": true
  }'
```

### 4.4 获取模型列表

```bash
curl http://localhost:3000/api/ai/admin/models \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4.5 分配配额

```bash
curl -X POST http://localhost:3000/api/ai/admin/quotas \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant_id",
    "providerId": "provider_id",
    "totalQuota": 1000000,
    "alertThreshold": 20
  }'
```

### 4.6 获取平台统计

```bash
curl "http://localhost:3000/api/ai/admin/stats/platform?days=30" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 五、常见问题

### Q1: 点击 AI 平台管理页面空白

**原因**：
- 登录账号不是 SUPER_ADMIN 角色
- Token 失效

**解决**：
- 确认账号角色为 SUPER_ADMIN
- 重新登录

### Q2: 接口返回 401

**原因**：Token 无效或过期

**解决**：
- 重新登录获取新 Token
- 检查请求头是否正确携带 Token

### Q3: 机构模型配置失败

**原因**：
- 该机构未分配配额
- 服务商或模型不存在

**解决**：
- 先在「配额管理」中分配配额
- 确认服务商和模型已创建

### Q4: 使用统计图表不显示

**原因**：
- 没有 AI 使用数据
- ECharts 未正确加载

**解决**：
- 调用 AI 接口产生使用数据
- 检查浏览器控制台是否有错误

---

## 六、测试数据清理

### 6.1 清理测试数据

```sql
-- 清理 AI 使用记录
DELETE FROM ai_usage WHERE tenantId = 'test_tenant';

-- 清理 AI 预警记录
DELETE FROM ai_alerts WHERE tenantId = 'test_tenant';

-- 清理机构配额
DELETE FROM tenant_ai_quotas WHERE tenantId = 'test_tenant';

-- 清理机构模型配置
DELETE FROM tenant_ai_models WHERE tenantId = 'test_tenant';
```

### 6.2 清理服务商和模型

```sql
-- 清理模型
DELETE FROM ai_models WHERE providerId = 'test_provider';

-- 清理服务商
DELETE FROM ai_providers WHERE id = 'test_provider';
```

---

## 七、测试检查清单

| 测试项 | 状态 | 备注 |
|--------|------|------|
| 服务商 CRUD | ☐ | 创建/读取/更新/删除 |
| 模型 CRUD | ☐ | 创建/读取/更新/删除 |
| 机构模型配置 | ☐ | 配置/查看/删除 |
| 配额分配 | ☐ | 分配/编辑/查看 |
| 平台统计 | ☐ | 数据统计/图表展示 |
| 机构端服务查看 | ☐ | 我的服务/使用统计 |
| 机构端充值 | ☐ | 充值申请/记录查看 |
| 配额预警 | ☐ | 预警触发/预警列表 |

---

## 八、相关文档

- `docs/RELEASE-v1.5.0.md` - v1.5.0 版本说明
- `docs/API.md` - API 接口文档
- `docs/DATABASE.md` - 数据库设计
- `docs/AI 大模型配置方案.md` - AI 功能设计方案
