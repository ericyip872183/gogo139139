# AI 浏览器自动化配置指南

> 本文档记录如何配置 AI 能够通过浏览器读取技术文档，解决网页反爬虫导致无法获取内容的问题。

---

## 一、解决的问题

| 传统方式 | 问题 | 浏览器方式 |
|---------|------|-----------|
| curl/WebFetch | 反爬虫、JavaScript 渲染 | ✅ 可获取渲染后的完整内容 |
| 复制粘贴 | 效率低、容易遗漏 | ✅ AI 直接读取 |
| 截图识别 | 精度低、格式丢失 | ✅ 文本可直接复制 |

---

## 二、安装步骤

### 2.1 安装依赖

```bash
# 在项目根目录安装 Playwright
pnpm add -D playwright @playwright/mcp
```

### 2.2 安装浏览器

```bash
# 安装 Chromium 浏览器（推荐）
pnpm exec playwright install chromium
```

### 2.3 配置 Claude Code

在 `.claude/settings.json` 中添加：

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp"]
    }
  }
}
```

---

## 三、使用方法

### 3.1 直接让我读取网页

告诉我：**"请用浏览器打开 XXX 页面，提取关于YYY的内容"**

示例：
- "请用浏览器打开 https://www.volcengine.com/docs/82379/1902647 页面，提取关于多模态文件上传的内容"
- "打开阿里云 OSS 文档，提取 Node.js SDK 的使用方法"

### 3.2 注意事项

1. **重启 Claude Code 后生效**：配置完成后必须重启 VS Code
2. **页面加载时间**：复杂页面可能需要等待几秒
3. **滚动页面**：如果页面有懒加载，需要我处理滚动
4. **登录状态**：如果页面需要登录，提前告诉我

---

## 四、常用命令（供 AI 使用）

```bash
# 测试 MCP 是否正常工作
npx @playwright/mcp --help

# 打开页面并获取内容
# （由 AI 自动调用，不需要用户操作）
```

---

## 五、快速复制模板

### 5.1 新项目快速配置

在项目根目录执行：

```bash
# 1. 安装依赖
pnpm add -D playwright @playwright/mcp

# 2. 安装浏览器
pnpm exec playwright install chromium

# 3. 配置 .claude/settings.json（添加 mcpServers 配置）

# 4. 重启 VS Code
```

### 5.2 settings.json 完整模板

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp"]
    }
  }
}
```

---

## 六、沟通模板

### 6.1 读取官方文档

```
请用浏览器打开 [URL] 页面，提取关于 [主题] 的内容。
```

示例：
```
请用浏览器打开 https://www.volcengine.com/docs/82379/1902647 页面，
提取关于多模态模型文件上传的完整说明，包括支持的文件类型和调用格式。
```

### 6.2 读取多个页面

```
请用浏览器依次打开以下页面，提取相关内容：
1. [URL1] - 关于 XXX
2. [URL2] - 关于 YYY
```

### 6.3 读取特定章节

```
请打开 [URL]，找到 [章节名称] 章节，提取其中的代码示例和参数说明。
```

---

## 七、常见问题

### Q1: 重启后还是不能用？

确保：
1. `playwright` 和 `@playwright/mcp` 已添加到 package.json
2. Chromium 浏览器已安装（`pnpm exec playwright install chromium`）
3. settings.json 格式正确（JSON 不能有注释）

### Q2: 页面加载太慢？

可以告诉我：
```
请打开 [URL]，等待页面完全加载后再提取内容
```

### Q3: 需要登录的页面怎么办？

目前不支持登录后的页面。如果必须读取，可以：
1. 手动复制内容给我
2. 找不需要登录的替代文档

---

## 八、相关文档

- [Playwright MCP 官方文档](https://github.com/microsoft/playwright)
- [@playwright/mcp npm](https://www.npmjs.com/package/@playwright/mcp)

---

## 九、版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-03-29 | 初始版本 |