# 阿里云 OSS 对象存储对接文档

> 本文档记录阿里云 OSS 对象存储的对接方法，用于上传文件并获取在线 URL，供 AI 大模型访问。

---

## 一、开通 OSS 服务

1. 登录 [阿里云控制台](https://oss.console.aliyun.com/)
2. 开通 OSS 服务（如未开通）
3. 创建 Bucket（存储空间）：
   - **地域**：选择与服务器相同的区域（如：华东1（杭州））
   - **存储类型**：标准存储
   - **访问权限**：**公共读**（重要！否则 AI 无法访问文件 URL）
   - **Endpoint**：记下地域对应的 Endpoint（如：`oss-cn-hangzhou.aliyuncs.com`）

---

## 二、获取 AccessKey

1. 登录阿里云控制台
2. 点击右上角头像 → AccessKey 管理
3. 创建 AccessKey，记录：
   - `AccessKeyId`
   - `AccessKeySecret`

---

## 三、安装依赖

```bash
pnpm add ali-oss
```

---

## 四、配置环境变量

在 `.env` 文件中添加：

```env
# 阿里云 OSS 配置
ALIYUN_OSS_REGION=oss-cn-hangzhou
ALIYUN_OSS_BUCKET=your-bucket-name
ALIYUN_OSS_ACCESS_KEY_ID=your-access-key-id
ALIYUN_OSS_ACCESS_KEY_SECRET=your-access-key-secret
# 自定义域名（可选，配置后使用自定义域名）
ALIYUN_OSS_CUSTOM_DOMAIN=https://oss.yourdomain.com
```

---

## 五、OSS 服务封装

### 5.1 创建 OSS 服务类

```typescript
// src/common/services/oss.service.ts

import { Injectable, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import OSS from 'ali-oss'

@Injectable()
export class OssService implements OnModuleInit {
  private client: OSS
  private bucket: string
  private customDomain: string

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const region = this.config.get('ALIYUN_OSS_REGION')
    const accessKeyId = this.config.get('ALIYUN_OSS_ACCESS_KEY_ID')
    const accessKeySecret = this.config.get('ALIYUN_OSS_ACCESS_KEY_SECRET')
    this.bucket = this.config.get('ALIYUN_OSS_BUCKET')
    this.customDomain = this.config.get('ALIYUN_OSS_CUSTOM_DOMAIN')

    this.client = new OSS({
      region,
      accessKeyId,
      accessKeySecret,
      bucket: this.bucket,
    })
  }

  /**
   * 上传文件到 OSS
   * @param buffer 文件 Buffer
   * @param filename 文件名（包含扩展名）
   * @param dir 存储目录（可选，如 'ai-import/'）
   * @returns 文件的在线 URL
   */
  async uploadFile(buffer: Buffer, filename: string, dir: string = ''): Promise<string> {
    // 生成唯一文件名，防止冲突
    const timestamp = Date.now()
    const uniqueName = `${timestamp}-${filename}`
    const ossPath = dir ? `${dir}/${uniqueName}` : uniqueName

    // 上传到 OSS
    const result = await this.client.put(ossPath, buffer)

    console.log('[OSS] 文件上传成功:', result.name)

    // 返回文件 URL
    return this.getFileUrl(result.name)
  }

  /**
   * 上传本地文件到 OSS
   * @param localFilePath 本地文件路径
   * @param ossPath OSS 存储路径
   * @returns 文件的在线 URL
   */
  async uploadLocalFile(localFilePath: string, ossPath: string): Promise<string> {
    const result = await this.client.put(ossPath, localFilePath)
    return this.getFileUrl(result.name)
  }

  /**
   * 获取文件 URL
   * 优先使用自定义域名，否则使用 OSS 内网/外网地址
   */
  getFileUrl(ossPath: string): string {
    if (this.customDomain) {
      return `${this.customDomain}/${ossPath}`
    }
    // 使用外网地址
    return `https://${this.bucket}.${this.config.get('ALIYUN_OSS_REGION')}.aliyuncs.com/${ossPath}`
  }

  /**
   * 生成签名 URL（用于私有文件访问，有效期默认 1 小时）
   */
  async getSignedUrl(ossPath: string, expires: number = 3600): Promise<string> {
    return this.client.signatureUrl(ossPath, { expires })
  }

  /**
   * 删除 OSS 文件
   */
  async deleteFile(ossPath: string): Promise<void> {
    await this.client.delete(ossPath)
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(ossPath: string): Promise<boolean> {
    try {
      await this.client.head(ossPath)
      return true
    } catch {
      return false
    }
  }
}
```

### 5.2 注册 Module

```typescript
// src/common/common.module.ts

import { Module, Global } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { OssService } from './services/oss.service'

@Global()
@Module({
  imports: [ConfigModule],
  providers: [OssService],
  exports: [OssService],
})
export class CommonModule {}
```

```typescript
// src/app.module.ts

import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { CommonModule } from './common/common.module'
// ... 其他模块

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,  // 添加这一行
    // ... 其他模块
  ],
})
export class AppModule {}
```

---

## 六、使用示例

### 6.1 在 AI 导入服务中使用

```typescript
// src/modules/questions/services/ai-import.service.ts

import { Injectable } from '@nestjs/common'
import { OssService } from '../../../common/services/oss.service'

@Injectable()
export class AiImportService {
  constructor(
    private prisma: PrismaService,
    private ossService: OssService,  // 注入 OSS 服务
  ) {}

  async processPdf(file: Express.Multer.File) {
    // 1. 上传到 OSS
    const fileUrl = await this.ossService.uploadFile(
      file.buffer,
      file.originalname,
      'ai-import/pdfs'  // 存储目录
    )

    console.log('[OSS] 文件 URL:', fileUrl)

    // 2. 用 text 类型传递 URL 给 AI
    const response = await this.callAIWithUrl(fileUrl)
  }

  private async callAIWithUrl(fileUrl: string) {
    // 使用 text 类型传递 URL
    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `请分析这个 PDF 文件中的题目：${fileUrl}`
          }
        ]
      }
    ]

    // 调用 AI ...
  }
}
```

### 6.2 直接上传文件

```typescript
// 上传 Buffer
const buffer = fs.readFileSync('test.pdf')
const url = await ossService.uploadFile(buffer, 'test.pdf', 'documents')

// 上传本地文件
const url = await ossService.uploadLocalFile('/path/to/test.pdf', 'documents/test.pdf')

console.log('文件 URL:', url)
// 输出: https://your-bucket.oss-cn-hangzhou.aliyuncs.com/documents/1743158400000-test.pdf
```

---

## 七、与火山引擎结合使用

### 7.1 完整流程

```
1. 用户上传 PDF 文件
   ↓
2. 将 PDF 上传到阿里云 OSS
   ↓
3. 获取文件在线 URL（公共读）
   ↓
4. 用 text 类型 + URL 调用火山引擎 AI
   ↓
5. AI 直接访问在线 PDF 并解析
   ↓
6. 返回解析结果
```

### 7.2 代码示例

```typescript
async parsePdfQuestions(file: Express.Multer.File) {
  // 步骤 1: 上传到 OSS
  const ossUrl = await this.ossService.uploadFile(
    file.buffer,
    file.originalname,
    'ai-import/pdfs'
  )

  // 步骤 2: 构建 AI 请求（用 text 类型）
  const requestBody = {
    model: 'ep-20260315163053-ns7kz',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `你是一个专业的题目解析助手。请分析这个 PDF 文件（${ossUrl}）中的所有题目，并以 JSON 数组格式返回。`
          }
        ]
      }
    ],
    temperature: 0.1,
    max_tokens: 32000
  }

  // 步骤 3: 调用火山引擎 AI
  const response = await this.httpsPost(endpoint, apiKey, requestBody)

  // 步骤 4: 解析结果
  const content = response.choices[0].message.content
  const questions = JSON.parse(content)

  return questions
}
```

---

## 八、常见问题

### 8.1 AI 无法访问文件 URL

**原因**：OSS Bucket 访问权限设置为"私有"

**解决方案**：
1. 将 Bucket 访问权限改为"公共读"
2. 或者使用签名 URL（但签名 URL 有时效性，不适合 AI 调用）

### 8.2 文件名中文乱码

**解决方案**：
```typescript
// 对中文文件名进行 URL 编码
const encodedName = encodeURIComponent(filename)
const ossPath = `documents/${timestamp}-${encodedName}`
```

### 8.3 文件类型判断

```typescript
// 根据文件扩展名判断类型
const getContentType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase()
  const types: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
  }
  return types[ext || ''] || 'application/octet-stream'
}
```

---

## 九、自定义域名（可选）

### 9.1 配置 CNAME

1. 在阿里云 OSS 控制台添加自定义域名（如 `oss.yourdomain.com`）
2. 添加 CNAME 记录指向 OSS 域名

### 9.2 开启 HTTPS

1. 在阿里云购买 SSL 证书
2. 在 OSS 控制台绑定证书

### 9.3 使用自定义域名

配置后，文件 URL 会变成：
```
https://oss.yourdomain.com/documents/test.pdf
```

---

## 十、配置检查清单

| 配置项 | 说明 | 示例 |
|--------|------|------|
| `ALIYUN_OSS_REGION` | OSS 地域 | `oss-cn-hangzhou` |
| `ALIYUN_OSS_BUCKET` | Bucket 名称 | `panlei-questions` |
| `ALIYUN_OSS_ACCESS_KEY_ID` | AccessKey ID | `LTAI...` |
| `ALIYUN_OSS_ACCESS_KEY_SECRET` | AccessKey Secret | `...` |
| `ALIYUN_OSS_CUSTOM_DOMAIN` | 自定义域名（可选） | `https://oss.panlei.com` |

**Bucket 权限必须设置为"公共读"！**

---

## 十一、相关文档

- [阿里云 OSS Node.js SDK 官方文档](https://help.aliyun.com/zh/sdk/developer-reference/v2-manage-node-js-access-credentials)
- [OSS JavaScript SDK GitHub](https://github.com/ali-sdk/ali-oss)
- [创建 Bucket](https://help.aliyun.com/zh/oss/user-guide/create-a-bucket-2)
- [设置 Bucket 访问权限](https://help.aliyun.com/zh/oss/user-guide/set-bucket-Acl)