# 阿里云OSS

> 用途：上传文件获取公网URL，供AI大模型访问（AI导入题库时使用）

## 环境变量

```bash
ALIYUN_OSS_REGION=oss-cn-hangzhou
ALIYUN_OSS_BUCKET=your-bucket-name
ALIYUN_OSS_ACCESS_KEY_ID=your-access-key-id
ALIYUN_OSS_ACCESS_KEY_SECRET=your-access-key-secret
ALIYUN_OSS_CUSTOM_DOMAIN=https://oss.yourdomain.com  # 可选
```

**重要**：Bucket 访问权限必须设置为"公共读"，否则AI无法访问文件URL。

## 安装依赖

```bash
pnpm add ali-oss
```

## 核心服务封装

**路径**：`src/common/services/oss.service.ts`（待创建）

```typescript
@Injectable()
export class OssService implements OnModuleInit {
  private client: OSS

  onModuleInit() {
    this.client = new OSS({
      region: this.config.get('ALIYUN_OSS_REGION'),
      accessKeyId: this.config.get('ALIYUN_OSS_ACCESS_KEY_ID'),
      accessKeySecret: this.config.get('ALIYUN_OSS_ACCESS_KEY_SECRET'),
      bucket: this.config.get('ALIYUN_OSS_BUCKET'),
    })
  }

  // 上传Buffer，返回公网URL
  async uploadFile(buffer: Buffer, filename: string, dir: string = ''): Promise<string> {
    const ossPath = dir ? `${dir}/${Date.now()}-${filename}` : `${Date.now()}-${filename}`
    const result = await this.client.put(ossPath, buffer)
    return this.getFileUrl(result.name)
  }

  getFileUrl(ossPath: string): string {
    const customDomain = this.config.get('ALIYUN_OSS_CUSTOM_DOMAIN')
    if (customDomain) return `${customDomain}/${ossPath}`
    return `https://${bucket}.${region}.aliyuncs.com/${ossPath}`
  }
}
```

## 与火山引擎结合使用

AI导入PDF时的完整流程：

```
用户上传PDF
  → 上传到阿里云OSS（获取公网URL）
  → 用 file_url 方式调用火山引擎Responses API
  → AI直接访问在线PDF并解析题目
  → 返回解析结果
```

```typescript
// 在 ai-import.service.ts 中
const ossUrl = await this.ossService.uploadFile(file.buffer, file.originalname, 'ai-import/pdfs')

const response = await client.responses.create({
  model: 'doubao-seed-2-0-lite-260215',
  input: [{
    role: 'user',
    content: [
      { type: 'input_file', file_url: ossUrl },
      { type: 'input_text', text: '请提取文档中的所有题目，以JSON数组格式返回' }
    ]
  }]
})
```

## 常见问题

**AI无法访问文件URL**：Bucket权限未设为"公共读"，改权限即可。

**中文文件名乱码**：
```typescript
const encodedName = encodeURIComponent(filename)
```

## 配置检查清单

- [ ] Bucket已创建，权限为"公共读"
- [ ] AccessKey已获取并配置到.env
- [ ] Region与服务器同区域（降低延迟）
- [ ] 依赖 `ali-oss` 已安装
