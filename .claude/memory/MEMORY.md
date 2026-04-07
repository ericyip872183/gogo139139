# 盼蕾项目 - 记忆索引

> 每次新会话开始必须先读本文件，再按需读取子文件。

## Core（每次必读）

- [项目概览](core/项目概览.md) — 技术栈、架构、端口、角色体系、模块清单
- [开发规范](core/开发规范.md) — 强制规则、代码规范、多租户要求、响应格式
- [用户偏好](core/用户偏好.md) — 协作习惯、禁止事项、沟通风格

## Domain（按需读）

- [后端模块](domain/后端模块.md) — 11个模块功能、数据库Schema、JWT结构、AI架构
- [前端架构](domain/前端架构.md) — 路由、页面、状态管理、API层、权限控制
- [部署运维](domain/部署运维.md) — Docker容器、服务器信息、nginx、Git规范

## Integrations（对接时读）

- [豆包大模型](integrations/豆包大模型.md) — 火山引擎API、EP接入点、Responses API、常见错误
- [企业微信](integrations/企业微信.md) — 企业微信API对接方案（待开发）
- [阿里云OSS](integrations/阿里云OSS.md) — OSS上传、获取在线URL供AI访问

## Ops（操作时读）

- [会话检查清单](ops/会话检查清单.md) — 开始/结束检查项
- [常见问题速查](ops/常见问题速查.md) — 启动错误、容器重启、API错误
- [Bug修复经验](ops/Bug修复经验.md) — 已知Bug和修复方案
