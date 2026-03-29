# 调试与测试规范

> 本文档规定调试、测试、日志管理的标准流程。**功能完成后必须自测，禁止让用户第一次运行代码。**

---

## 一、核心原则

### 1.1 自主验证原则

**禁止让用户当测试员！**

每次功能开发完成后：
1. 必须自己编写调试脚本
2. 必须自己运行测试
3. 必须记录测试结果
4. 必须修复发现的问题
5. 如发现的问题和解决的办法是重复的，就应该停止并告诉用户原因

### 1.2 日志驱动调试

**问题定位必须看日志**：
- 后端问题 → `docker logs panlei-backend`
- 前端问题 → 浏览器 Console + Network
- 数据库问题 → Prisma 日志
- 容器问题 → `docker logs panlei-xxx`

---

## 二、调试脚本规范

### 2.1 调试脚本模板

在项目根目录创建 `test-xxx.js` 文件：

```javascript
/**
 * 文件：test-xxx.js
 * 说明：XXX 功能调试脚本
 * 使用方法：node test-xxx.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3002/api';

// 模拟登录获取 Token
async function login() {
  const response = await axios.post(`${BASE_URL}/auth/login`, {
    username: 'admin',
    password: 'admin123',
    tenantCode: 'PLATFORM'
  });
  return response.data.data.token;
}

// 测试 XXX 功能
async function testXxx() {
  const token = await login();
  const headers = { Authorization: `Bearer ${token}` };

  try {
    // 测试 1：获取列表
    console.log('测试 1：获取列表...');
    const listRes = await axios.get(`${BASE_URL}/xxx`, { headers });
    console.log('✓ 列表获取成功', listRes.data);

    // 测试 2：创建数据
    console.log('测试 2：创建数据...');
    const createRes = await axios.post(`${BASE_URL}/xxx`, {
      name: '测试数据'
    }, { headers });
    console.log('✓ 创建成功', createRes.data);

    // 测试 3：验证数据
    console.log('测试 3：验证数据...');
    const verifyRes = await axios.get(`${BASE_URL}/xxx/${createRes.data.data.id}`, { headers });
    console.log('✓ 验证成功', verifyRes.data);

    console.log('\n✅ 所有测试通过！');
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    process.exit(1);
  }
}

// 执行测试
testXxx();
```

### 2.2 调试脚本分类

| 类型 | 位置 | 处理方式 | 示例 |
|------|------|----------|------|
| **一次性脚本** | 项目根目录 | 测试通过后删除 | `test-temp-xxx.js` |
| **常用测试脚本** | `tests/manual/` | 保留，可重复合用 | `test-ai-import.js` |
| **回归测试脚本** | `tests/manual/` | 保留，命名规范 | `test-auth.js` |

### 2.3 运行调试脚本

```bash
# 确保后端正在运行
pnpm dev:backend

# 运行调试脚本
node test-xxx.js
```

---

## 三、中间文件清理规范

### 3.1 调试过程中产生的中间文件

| 文件类型 | 位置/模式 | 产生原因 | 清理时机 |
|----------|-----------|----------|----------|
| **调试脚本** | `test-*.js` | 功能调试用 | 分类处理（见下表） |
| **测试数据文件** | `test-*.txt/xlsx` | 上传测试用 | 测试完成后**立即删除** |
| **日志文件** | `logs/*.log` | 后端/前端日志 | 超过 7 天或排查完成后 |
| **临时截图** | `debug-*.png` | 前端调试截图 | 问题修复后 |
| **API 响应缓存** | `.tmp/` 目录 | 接口响应保存 | 调试完成后 |

### 3.2 调试脚本分类处理

| 脚本类型 | 判断标准 | 处理方式 |
|----------|----------|----------|
| 一次性脚本 | 仅用于特定 Bug 调试 | 测试通过后**删除** |
| 常用功能脚本 | 需要反复测试的功能 | 保留，移入 `tests/manual/` |
| 回归测试脚本 | 核心功能，需要定期验证 | 保留，命名规范 |

### 3.3 测试数据文件清理（必须做）

**任何调试脚本中必须包含清理逻辑**：

```javascript
// 模式：使用 try-finally 确保清理
try {
  // 步骤 1：创建测试文件
  const testFilePath = 'test-questions.txt';
  fs.writeFileSync(testFilePath, testContent, 'utf8');

  // 步骤 2：执行测试
  await runTest();

  // 步骤 3：验证结果
  verifyResult();

} finally {
  // 步骤 4：清理测试文件（无论如何都会执行）
  if (fs.existsSync(testFilePath)) {
    fs.unlinkSync(testFilePath);
    console.log('✅ 测试文件已清理');
  }
}
```

### 3.4 日志文件管理

#### 目录结构
```
panlei/logs/
├── backend-2026-03-28.log    # 按日期命名
├── frontend-2026-03-28.log
└── debug-2026-03-28.log
```

#### 清理规则
| 规则 | 说明 |
|------|------|
| 保留最近 7 天 | 超过 7 天的日志自动删除 |
| 问题排查日志 | 问题解决后删除 |
| 重要日志 | 归档到 `logs/archive/` 目录 |

#### 清理命令
```bash
# 删除超过 7 天的日志（Linux/Mac）
find logs/ -name "*.log" -mtime +7 -delete

# Windows PowerShell
Get-ChildItem logs\*.log | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } | Remove-Item
```

### 3.5 临时文件目录 `.tmp/`

**用途**：集中管理调试产生的临时文件

```
panlei/.tmp/
└── debug-2026-03-28/
    ├── api-response.json    # API 响应缓存
    ├── screenshot-1.png     # 调试截图
    └── test-data.json       # 测试数据
```

**清理规则**：
- 每天自动清理超过 3 天的临时文件
- 调试完成后手动清理

### 3.6 .gitignore 配置

```gitignore
# 调试中间文件
test-*.txt
test-*.xlsx
*.log
.tmp/
debug-*.png
debug-*.jpg
```

---

## 四、清理检查清单

### 4.1 每次调试完成后必须检查

```markdown
## 清理检查清单

- [ ] 删除一次性测试数据文件（如 test-questions.txt）
- [ ] 日志是否已分析完成？是 → 删除日志文件
- [ ] 调试脚本是否有保留价值？无 → 删除
- [ ] 问题是否已记录到 07-restart-solutions.md？是 → 清理临时笔记
- [ ] `.tmp/` 目录是否有遗留文件？有 → 清理
```

### 4.2 每周五例行清理

```bash
# 1. 清理超过 7 天的日志
rm -rf logs/*.log  # 或按上面的命令筛选

# 2. 清理 .tmp 目录
rm -rf .tmp/*

# 3. 检查根目录的临时文件
ls -la | grep -E "test-|debug-"  # 查看并手动清理
```

---

## 五、常见问题调试流程

### 5.1 后端接口 500 错误

```bash
# 步骤 1：查看后端日志
docker logs panlei-backend -f --tail 100

# 步骤 2：定位错误行
# 查找 "Error:" 或 "Exception:"

# 步骤 3：检查数据库连接
docker exec panlei-backend sh -c "nc -zv mysql 3306"

# 步骤 4：检查 tenantId
# 确认 JWT Token 中包含 tenantId
```

### 5.2 前端数据不显示

1. **检查 Network 请求**
   - 打开浏览器 DevTools（F12）
   - 查看 Network 标签页
   - 确认请求是否成功（状态码 200）

2. **检查 Console 错误**
   - 查看 Console 标签页
   - 寻找红色错误信息

3. **检查数据结构**
   ```javascript
   // 在组件中添加调试输出
   console.log('响应数据:', response.data)
   console.log('列表数据:', list.value)
   ```

4. **检查权限**
   - 确认用户角色是否匹配
   - 确认 Token 是否有效

### 5.3 容器启动失败

```bash
# 步骤 1：查看容器状态
docker ps -a

# 步骤 2：查看失败容器日志
docker logs panlei-xxx --tail 100

# 步骤 3：检查端口占用
netstat -ano | findstr :3002

# 步骤 4：重启容器
docker-compose down
docker-compose up -d
```

### 5.4 数据库连接失败

```bash
# 步骤 1：检查 MySQL 容器状态
docker ps | grep mysql

# 步骤 2：测试连接
docker exec panlei-backend sh -c "nc -zv mysql 3306"

# 步骤 3：查看 Prisma 连接
docker exec panlei-backend npx prisma studio

# 步骤 4：重启后端
docker restart panlei-backend
```

---

## 六、自动测试建议

### 6.1 单元测试模板

```typescript
// xxx.service.spec.ts
import { Test } from '@nestjs/testing';
import { XxxService } from './xxx.service';
import { PrismaService } from '../prisma/prisma.service';

describe('XxxService', () => {
  let service: XxxService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [XxxService, PrismaService],
    }).compile();

    service = module.get(XxxService);
    prisma = module.get(PrismaService);
  });

  it('应该返回数据列表', async () => {
    const tenantId = 'test-tenant';
    const result = await service.findAll(tenantId, { page: 1, pageSize: 10 });
    expect(Array.isArray(result)).toBe(true);
  });
});
```

### 6.2 接口测试模板

```javascript
// test-api.js
const axios = require('axios');

async function runTests() {
  const tests = [
    { name: 'GET /api/xxx', fn: testGet },
    { name: 'POST /api/xxx', fn: testPost },
    { name: 'PATCH /api/xxx/:id', fn: testPatch },
    { name: 'DELETE /api/xxx/:id', fn: testDelete },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      console.log(`✓ ${test.name}`);
      passed++;
    } catch (error) {
      console.error(`✗ ${test.name}: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n总计：${passed} 通过，${failed} 失败`);
}
```

---

## 七、调试日志记录

> 以下记录每次功能开发后的调试过程和结果

---

### 2026-03-28 - 记忆系统建立

**测试内容**：验证 .claude/memory 文件夹结构

**测试项目**：
- ✓ MEMORY.md 主索引文件创建
- ✓ 01-project-overview.md 项目概述创建
- ✓ 02-development-workflow.md 开发工作流创建
- ✓ 03-debugging-testing.md 调试规范创建

**最终状态**：✅ 全部通过

### 2026-03-28 - 中间文件清理规范建立

**更新内容**：
- 明确调试过程中产生的 5 类中间文件
- 建立调试脚本分类处理机制
- 规范测试数据文件的清理逻辑（try-finally 模式）
- 建立日志文件 7 天清理规则
- 新增 `.tmp/` 目录集中管理临时文件
- 建立清理检查清单

**最终状态**：✅ 完成

---

## 八、调试完成后更新记忆

每次调试完成后，必须：

1. **更新本文档**：记录调试过程和结果
2. **更新 07-restart-solutions.md**：如发现新问题
3. **更新 08-user-preferences.md**：如用户有特殊要求
4. **执行清理检查**：按「清理检查清单」执行
5. **提醒用户查看**：告知用户测试已通过
