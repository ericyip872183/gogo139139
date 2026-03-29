# 企业微信 API 对接文档

> 本文档记录企业微信 API 的对接规范、接口列表、实现进度等。

---

## 一、基础信息

| 项目 | 值 |
|------|-----|
| 服务商 | 腾讯企业微信 |
| 官网 | https://work.weixin.qq.com/ |
| 开发者文档 | https://developer.work.weixin.qq.com/document/ |
| API 端点 | `https://qyapi.weixin.qq.com/cgi-bin` |
| 鉴权方式 | access_token（需用 corpid + secret 换取） |

### 1.1 对接目的

| 场景 | 说明 |
|------|------|
| 登录认证 | 用户扫码登录系统 |
| 消息推送 | 考试通知、成绩推送 |
| 通讯录同步 | 同步组织架构和用户信息 |
| 审批流程 | 请假、报销等审批对接 |

---

## 二、对接前的准备

### 2.1 获取企业信息

| 信息 | 说明 | 获取位置 |
|------|------|----------|
| 企业 ID (corpid) | 企业唯一标识 | 管理后台 → 我的企业 |
| AgentId | 应用唯一标识 | 管理后台 → 应用管理 |
| Secret | 应用的密钥 | 管理后台 → 应用管理 |

### 2.2 配置回调域名

```
# 网页授权域名
your-domain.com

# 可信域名（用于 JS-SDK）
your-domain.com
```

---

## 三、核心接口列表

### 3.1 认证相关

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取 access_token | GET | `/gettoken` | 用 corpid + secret 换取 |
| 获取用户身份 | GET | `/auth/getuserinfo` | 通过 code 获取用户信息 |

### 3.2 通讯录相关

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取部门列表 | GET | `/department/list` | 获取组织架构 |
| 获取部门成员 | GET | `/user/list` | 获取部门下所有成员 |
| 获取成员信息 | GET | `/user/get` | 获取单个成员详情 |

### 3.3 消息推送相关

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 发送应用消息 | POST | `/message/send` | 推送文本/卡片等消息 |

---

## 四、鉴权流程

### 4.1 获取 access_token

```typescript
/**
 * 获取企业微信 access_token
 * 有效期 2 小时，需要缓存
 */
async function getAccessToken(corpid: string, secret: string): Promise<string> {
  const response = await fetch(
    `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpid}&corpsecret=${secret}`
  )
  const data = await response.json()

  if (data.errcode !== 0) {
    throw new Error(`获取 access_token 失败: ${data.errmsg}`)
  }

  return data.access_token
}
```

**重要**：
- access_token 有效期 2 小时
- 必须缓存，不要频繁请求
- 建议使用 Redis 存储

### 4.2 网页授权登录流程

```
1. 前端重定向到企业微信授权页面
   ↓
2. 用户扫码确认
   ↓
3. 企业微信回调到 redirect_uri，携带 code
   ↓
4. 后端用 code 换取用户信息
   ↓
5. 创建 JWT Token，返回前端
```

---

## 五、后端实现

### 5.1 服务类模板

```typescript
/**
 * 文件：wechat-work.service.ts
 * 说明：企业微信对接服务
 */
@Injectable()
export class WechatWorkService {
  private readonly corpid: string
  private readonly secret: string
  private readonly agentId: string

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {
    this.corpid = this.configService.get('WECHAT_WORK_CORPID')
    this.secret = this.configService.get('WECHAT_WORK_SECRET')
    this.agentId = this.configService.get('WECHAT_WORK_AGENT_ID')
  }

  /**
   * 获取 access_token（带缓存）
   */
  async getAccessToken(): Promise<string> {
    // 先从 Redis 获取
    const cacheKey = `wechat_work:access_token:${this.corpid}`
    const cached = await this.redis.get(cacheKey)

    if (cached) {
      return cached
    }

    // 缓存不存在，请求新 token
    const response = await fetch(
      `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${this.corpid}&corpsecret=${this.secret}`
    )
    const data = await response.json()

    if (data.errcode !== 0) {
      throw new Error(`获取 access_token 失败: ${data.errmsg}`)
    }

    // 缓存 1.5 小时（提前 30 分钟过期）
    await this.redis.setex(cacheKey, 5400, data.access_token)

    return data.access_token
  }

  /**
   * 通过 code 获取用户信息
   */
  async getUserInfo(code: string): Promise<WechatUserInfo> {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `https://qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo?access_token=${accessToken}&code=${code}`
    )
    const data = await response.json()

    if (data.errcode !== 0) {
      throw new Error(`获取用户信息失败: ${data.errmsg}`)
    }

    return {
      userId: data.UserId,
      openUserId: data.open_userid,
      deviceId: data.DeviceId,
    }
  }

  /**
   * 发送应用消息
   */
  async sendMessage(toUser: string, content: string): Promise<void> {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          touser: toUser,
          msgtype: 'text',
          agentid: this.agentId,
          text: { content },
          safe: 0,
        }),
      }
    )

    const data = await response.json()

    if (data.errcode !== 0) {
      throw new Error(`发送消息失败: ${data.errmsg}`)
    }
  }
}
```

### 5.2 DTO 定义

```typescript
/**
 * 企业微信用户信息
 */
export interface WechatUserInfo {
  userId: string      // 企业内用户 ID
  openUserId: string  // 跨企业用户 ID
  deviceId: string    // 设备 ID
}

/**
 * 企业微信登录回调 DTO
 */
export class WechatWorkCallbackDto {
  @IsString()
  @IsNotEmpty()
  code: string

  @IsString()
  @IsOptional()
  state?: string
}

/**
 * 发送消息 DTO
 */
export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  toUser: string

  @IsString()
  @IsNotEmpty()
  content: string
}
```

### 5.3 Controller 实现

```typescript
/**
 * 文件：wechat-work.controller.ts
 * 说明：企业微信接口控制器
 */
@Controller('wechat-work')
export class WechatWorkController {
  constructor(private wechatWorkService: WechatWorkService) {}

  /**
   * 企业微信登录回调
   */
  @Get('callback')
  async callback(@Query() query: WechatWorkCallbackDto) {
    // 1. 用 code 换取用户信息
    const userInfo = await this.wechatWorkService.getUserInfo(query.code)

    // 2. 查找或创建用户
    // 3. 生成 JWT Token
    // 4. 重定向到前端

    return { userId: userInfo.userId }
  }

  /**
   * 发送消息
   */
  @Post('send-message')
  @UseGuards(AuthGuard('jwt'))
  async sendMessage(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SendMessageDto
  ) {
    await this.wechatWorkService.sendMessage(dto.toUser, dto.content)
    return { success: true }
  }
}
```

---

## 六、前端实现

### 6.1 扫码登录组件

```vue
<!--
  文件：WechatWorkLogin.vue
  说明：企业微信扫码登录组件
-->
<template>
  <div class="wechat-login">
    <div id="wechat-login-qr"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(() => {
  // 引入企业微信 JS-SDK
  const script = document.createElement('script')
  script.src = 'https://res.wx.qq.com/open/js/jweixin-1.2.0.js'
  script.onload = initLogin
  document.head.appendChild(script)
})

function initLogin() {
  // 初始化扫码登录
  // 参考：https://developer.work.weixin.qq.com/document/path/91025
}
</script>
```

### 6.2 配置页面

```vue
<!--
  文件：WechatWorkConfig.vue
  说明：企业微信配置页面
-->
<template>
  <el-form :model="form" label-width="120px">
    <el-form-item label="企业 ID">
      <el-input v-model="form.corpid" />
    </el-form-item>
    <el-form-item label="应用 Secret">
      <el-input v-model="form.secret" type="password" />
    </el-form-item>
    <el-form-item label="AgentId">
      <el-input v-model="form.agentId" />
    </el-form-item>
    <el-form-item>
      <el-button type="primary" @click="onSave">保存配置</el-button>
    </el-form-item>
  </el-form>
</template>
```

---

## 七、测试脚本

```javascript
/**
 * 文件：test-wechat-work.js
 * 说明：企业微信对接测试脚本
 */

const axios = require('axios')

const BASE_URL = 'http://localhost:3002/api'

async function testWechatWork() {
  console.log('========================================')
  console.log('测试企业微信对接')
  console.log('========================================\n')

  try {
    // 测试 1：获取 access_token
    console.log('测试 1：获取 access_token...')
    // ...

    // 测试 2：获取用户信息
    console.log('测试 2：获取用户信息...')
    // ...

    // 测试 3：发送消息
    console.log('测试 3：发送消息...')
    // ...

    console.log('\n✅ 所有测试通过！')
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    process.exit(1)
  }
}

testWechatWork()
```

---

## 八、错误码

| 错误码 | 含义 | 解决方案 |
|--------|------|----------|
| 40001 | 不合法的 secret | 检查 secret 是否正确 |
| 40014 | 不合法的 access_token | 重新获取 access_token |
| 42001 | access_token 已过期 | 刷新 access_token |
| 60011 | 没有权限 | 检查应用权限配置 |
| 60012 | 用户不在应用可见范围内 | 检查应用可见范围设置 |

---

## 九、环境变量配置

```bash
# .env
WECHAT_WORK_CORPID=your_corpid
WECHAT_WORK_SECRET=your_secret
WECHAT_WORK_AGENT_ID=your_agent_id
WECHAT_WORK_CALLBACK_URL=https://your-domain.com/api/wechat-work/callback
```

---

## 十、对接进度

| 功能 | 状态 | 说明 |
|------|------|------|
| access_token 获取与缓存 | ⏸ | 待开发 |
| 网页授权登录 | ⏸ | 待开发 |
| 通讯录同步 | ⏸ | 待开发 |
| 消息推送 | ⏸ | 待开发 |
| 审批流程对接 | ⏸ | 待开发 |

---

## 十一、注意事项

### 11.1 安全规范
- ✅ Secret 必须加密存储
- ✅ 不得在前端暴露 corpid 和 secret
- ✅ access_token 必须缓存，不要频繁请求
- ✅ 回调 URL 必须验证签名

### 11.2 频率限制
- access_token：每 10 分钟请求不超过 100 次
- 消息推送：每分钟不超过 1000 次

### 11.3 开发调试
- 测试环境需要配置可信域名
- 本地开发可使用内网穿透工具（如 ngrok）
