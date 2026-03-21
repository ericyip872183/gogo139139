# 盼蕾项目 — 中医/医学教学在线考试学习系统

> **⚠️ 每次新会话开始，必须按以下顺序操作：**
> 1. 读 `docs/PROGRESS.md` — 了解当前功能完成状态
> 2. 读 `docs/INDEX.md` — 确定本次开发需要查阅哪些文档
> 3. 读对应模块文档，了解设计意图后再动手

---

## AI 开发规范（必须遵守）

### 开发前
- 读 `docs/PROGRESS.md` 确认当前进度，不重复开发已完成内容
- 读对应的 `docs/MODULES_CORE.md` 或 `docs/MODULES_SPECIALTY.md` 了解模块设计
- 读 `docs/DATABASE.md` 确认所需表结构
- 读 `docs/API.md` 确认接口规范

### 开发中
- **每个新建文件顶部必须有该文件的简介注释**（用注释说明文件作用、权限要求、对应接口等）
- 严格遵守 `docs/API.md` 的接口规范（路径/请求/响应格式）
- 严格遵守多租户隔离：所有查询必须带 `tenantId`
- 不得使用 `any` 类型（TypeScript 严格模式）

### 开发完成后（必须做）
- 立即更新 `docs/PROGRESS.md`：将完成的功能从 ❌ 改为 ✅
- 如有计划外新增的功能，在 `docs/PROGRESS.md` 底部「计划外新增」表格中记录并说明原因
- 如新增了数据表，同步更新 `docs/DATABASE.md`
- 如新增了接口，同步更新 `docs/API.md`

### 模块开发顺序
每次只针对一个功能模块开发，开发前明确：
1. 该模块涉及哪些数据表（查 DATABASE.md）
2. 该模块需要哪些接口（查 API.md）
3. 该模块如何与母本对接（查 ARCHITECTURE.md）
4. 该模块的子模块构成（查 MODULES_CORE.md 或 MODULES_SPECIALTY.md）

---

---

## 一、产品概述

**名称**：中医/医学 SaaS 一体化教学考试平台（V4）
**定位**：考试母本系统（全模块共用核心）+ 可插拔专业模块（独立界面）+ 硬件实操对接 + 多维度统一评分
**用户**：中医/医学院校（机构）、教师、学生
**浏览器要求**：Chrome 89+ / Edge 89+（硬件 API 强制要求）

### 角色权限（三级）
| 角色 | 说明 |
|------|------|
| 超级管理员 | 平台总控（你们公司），管理所有机构、模块授权、数据统计 |
| 教师管理员 | 机构教学/出题/评分/管理/模块切换操作 |
| 学生 | 学习/考试/实训操作/跟师/小组协作/模块切换操作 |

---

## 二、技术选型（已定）

| 层级 | 技术 |
|------|------|
| 前端 | Vue3 + TypeScript + Vite + Element Plus + Pinia + Vue Router 4 + ECharts |
| 后端 | NestJS (Node.js + TypeScript) + Prisma + MySQL 8 + Redis + JWT + bcrypt |
| 实时通信 | Socket.io（PBL讨论/实时同步） |
| 文件存储 | 阿里云OSS（部署时对接） |
| 硬件通信 | Web Serial API + Web Bluetooth API |
| 本地开发 | Docker Compose（MySQL + Redis） |
| 部署 | Docker + 阿里云ECS（全部完成后一次性部署） |

### 模块切换方案
Vue Router 动态路由 + Layout切换（不用微前端框架）：
- 母本界面：默认 MainLayout，顶部导航显示已购模块入口
- 模块界面：独立 ModuleLayout，固定「返回母本」+「本模块首页」双导航
- Pinia 保持全局状态，登录态不丢失

---

## 三、项目目录结构

```
panlei/
├── CLAUDE.md
├── packages/
│   ├── frontend/src/
│   │   ├── layouts/          # MainLayout / ModuleLayout
│   │   ├── views/            # 页面（按模块分目录）
│   │   ├── stores/           # Pinia
│   │   ├── router/           # 动态权限路由
│   │   ├── api/              # 接口请求封装
│   │   └── utils/
│   ├── backend/src/
│   │   ├── modules/          # auth/users/organizations/questions/...
│   │   ├── common/           # 全局拦截器/过滤器/装饰器
│   │   └── prisma/
│   ├── shared/src/
│   │   ├── types/            # DTO/接口类型
│   │   └── constants/        # 错误码/枚举
│   └── hardware-bridge/src/
│       ├── core/             # IHardwareDevice / IDataFrame / HardwareManager
│       ├── bluetooth/        # Web Bluetooth 适配器
│       ├── serial/           # Web Serial 适配器
│       ├── protocol/         # 数据帧解析/编码
│       └── demo/             # 调试面板 / 设备模拟器
├── docker-compose.yml
├── .env.example
└── pnpm-workspace.yaml
```

---

## 四、母本核心系统（16个功能模块）

### 详细功能点清单

#### 1. 账号登录与安全验证
- 账号密码登录 / 准考证号登录（一期）
- 微信/钉钉扫码登录（二期）
- 登录限制：指定时间、指定IP/地点
- 角色自动区分：超管/教师/学生
- 登录后自动识别已购模块权限，已购模块入口显式展示
- 所有模块登录态互通，无需重复登录

#### 2. 人员组织与用户管理
- 新增/编辑/删除学生/教师，支持批量操作
- 4级以上自定义组织架构及名称
- 批量导入/导出/删除/激活用户，批量设置密码
- 教师/学员可分属多个组织，权限隔离
- 扫学生码/扫身份证快速添加（二期）

#### 3. 试题库管理
- 题型：单选题、多选题、判断题、填空题
- 题目批量录入/编辑/删除，同时录标准答案
- 中医专用题库（十四五规划教材诊断学全内容：望/闻/问/切诊、八纲辨证等）
- 评分表一键转换成多道考题
- 模块专属题库子分类

#### 4. 试卷发布与考试管理
- 自由从题库组卷，同时发布"理论试卷 + 实训操作任务 + 评分任务"
- 支持正计时/倒计时，指定对象发放任务
- 发布/取消/修改考试/考评任务
- 支持多考官协同考评
- 各外接模块共用组卷、发布、时间设置、考核对象分配等全功能

#### 5. 在线考试答题
- 规定时间内进入考试/考评
- 微信/钉钉扫码进入随时考PLUS系统（二期）
- 防切屏、限时提交，交卷立即出分
- 手动输入/扫码身份认证，拍照上传头像
- 技能操作逐项考评
- 断网续答（本地缓存）

#### 6. 随时考核与多维度评分
- 系统自带标准化评分表，支持Excel/Word等格式导入
- 自主设计新增评分表，导入自动生成二维码（二期）
- 加分制/减分制，自由设置评分间隔
- 技能操作逐项打分，支持离线评分、手写签名
- 各模块拥有独立的专业评分界面

#### 7. 自动阅卷与成绩查询
- 系统全自动阅卷，实训/技能考核手动/半自动评分
- 查看成绩、正确率、排名，自动统计已评人次
- 查看答题/评分明细，成绩多格式导出
- 考试/考评记录永久保存
- 各模块考核/实训成绩统一回传母本

#### 8. SaaS模块化授权与双界面切换
- 平台以"母本+可选模块"方式售卖，按模块/年限/人数授权
- 模块授权与独立界面权限绑定，购买后自动开通
- 支持模块界面权限单独管控（按用户/角色分配）
- 超管统一管理双导航栏功能、界面布局、切换规则

#### 9. PBL讨论小组与临床思维决策（二期）
- 至少2种PBL课程模式，设置小组数量及人数
- 课程生成专属二维码，扫码加入，组长身份可转让
- 组长控制场景切换，全员同步
- 可回顾课程，查看作业、自评互评结果，学生成长曲线

#### 10. 跟师记录与病例管理（二期）
- 审核学生跟师病例，在线批注、提出修改意见
- 合格病例存档并导出Word，丰富案例教学库
- 跟踪病例修改进度，基于病例完成病历书写教学任务

#### 11. 学生交友与讨论小组（二期）
- 添加同学为好友，自主创建讨论小组
- 扫码线上结伴，互评数据同步至教师端
- 可发送试卷、实训记录、PBL作业、跟师病例、视频/图片/文字
- 各模块拥有专属专业讨论区

#### 12. 综合资料与多媒体管理（二期）
- 视频/图片/文档等多格式资料上传/存储/分发
- 按课程/模块/班级分类管理，支持资料收藏
- 母本为全平台资料总仓库，各模块拥有独立专业资料界面

#### 13. 实训硬件对接与操作评分（二期）
- 统一接口对接各类实训硬件，操作数据实时回传
- 系统内置标准化评分规则，支持技能操作逐项打分
- 为各模块独立界面定制化适配硬件交互接口
- 支持操作回放

#### 14. 统一数据中心与统计分析（二期）
- 所有机构、所有模块数据统一汇总
- 理论/实训/评分/离线操作数据统一管理
- 按母本+模块双维度统计，按机构/模块/教师/学生多维度统计
- ECharts 数据可视化展示，支持各模块独立统计导出

#### 15. 外部软件对接（二期）
- 对接考试智能化管理平台
- 评分表、题库跨平台共享共用
- 外部软件/模块可作为独立应用接入，数据统一回传母本

#### 16. 远程升级（部署后）
- 统一远程升级所有机构系统
- 母本系统与外接模块分开升级、独立维护
- 支持热更新、无缝升级，保障离线评分/操作功能不受影响

---

## 五、专业拓展模块（8个）

| # | 模块名称 | 类型 | 分期 | 核心亮点 |
|---|---------|------|------|---------|
| 0 | **硬件通信标准模块** | Web Serial + BLE | 一期Sprint9 | 统一抽象层，上层模块无需关心底层协议 |
| 1 | 体质辨识教学 | 纯软件 | 二期 | 11套问卷、9种体质辨识、雷达图、60+证型辨识 |
| 2 | 耳穴教学 | 3D虚拟仿真 | 二期 | OSCE标准化考核、耳穴埋籽全流程、四诊合参训练 |
| 3 | 经络采集分析 | 硬件+软件 | 三期 | 十二经络电信号采集、多维度诊断报告 |
| 4 | 中医四诊采集分析 | 硬件+软件 | 三期 | 舌诊3D解剖/面诊/脉诊/闻诊/问诊智能分析 |
| 5 | 针刺手法采集 | 硬件+VR | 三期 | 智能针灸模拟盒+传感针具、25种手法、VR取穴考核 |
| 6 | 刮痧手法采集 | 硬件+VR | 三期 | 力反馈机械臂+VR、AI自动评分、竞赛级考核（金砖大赛） |
| 7 | 推拿手法采集 | 硬件+软件 | 三期 | 柔性传感器、800+穴位、多端屏幕同步/远程教学管控 |
| 8 | 人体经络腧穴解剖 | 硬件+3D | 三期 | 穴位触控笔+3D模型联动、虚拟针刺、针灸处方练习 |

---

## 六、开发计划（一期 18周）

| Sprint | 内容 | 周次 | 状态 |
|--------|------|------|------|
| Sprint 1 | 工程搭建 + 认证（Monorepo/Docker/JWT/登录页） | 1-2 | ✅ 完成 |
| Sprint 2 | 用户与组织管理（4级树形/用户CRUD/批量导入） | 3-4 | ✅ 完成 |
| Sprint 3 | 题库管理（CRUD/批量导入/搜索筛选/分类） | 5-6 | ✅ 完成 |
| Sprint 4 | 组卷与考试管理（自由组卷/发布/指定对象） | 7-8 | ✅ 完成 |
| Sprint 5 | 在线考试答题（答题界面/防切屏/断网续答） | 9-10 | ✅ 完成 |
| Sprint 6 | 自动阅卷与成绩（阅卷引擎/成绩统计/导出） | 11-12 | ✅ 完成 |
| Sprint 7 | 随时考核与评分表（评分表管理/打分/离线同步） | 13-14 | ✅ 完成 |
| Sprint 8 | SaaS基础+模块框架（AdminModule/模块授权/超管后台） | 15-16 | ✅ 完成 |
| Sprint 9 | 硬件通信标准模块（WebSerial/WebBluetooth/调试面板） | 17-18 | ✅ 完成 |

---

## 七、各 Sprint 详细任务

### Sprint 3：题库管理

**后端**
- [ ] `QuestionCategory` CRUD（分类树，支持模块专属子分类）
- [ ] `Question` CRUD（单选/多选/判断/填空，含选项和标准答案）
- [ ] 题目搜索（关键词/分类/题型/难度/分页）
- [ ] 批量导入（Excel解析，含选项和答案）
- [ ] 批量删除/移动分类

**前端**
- [ ] 题目分类管理（左侧分类树 + 右侧题目列表）
- [ ] 题目新增/编辑表单（含动态选项，选中正确答案）
- [ ] 批量导入弹窗（下载模板/上传/预览结果）

---

### Sprint 4：组卷与考试管理

**后端**
- [ ] `Paper` CRUD（试卷：标题/总分/时长/题目列表）
- [ ] `PaperQuestion` 关联（题目顺序/分值覆盖）
- [ ] `Exam` CRUD（关联试卷/开始结束时间/指定对象）
- [ ] `ExamParticipant` 批量分配（按用户/组织/角色）
- [ ] 考试状态管理（草稿/进行中/已结束）

**前端**
- [ ] 试卷管理页（列表/新增/编辑）
- [ ] 组卷界面（从题库搜索添加题目，实时预览总分）
- [ ] 考试发布页（关联试卷/设置时间/指定考生）
- [ ] 考试列表页（状态管理）

---

### Sprint 5：在线考试答题

**后端**
- [ ] 学生端获取待考考试列表
- [ ] 进入考试（创建 ExamSession，分发题目）
- [ ] 单题答案实时保存（断网容错）
- [ ] 手动/自动交卷
- [ ] 防切屏记录（超限自动交卷）

**前端**
- [ ] 学生端考试列表页
- [ ] 答题界面（左侧题目导航/顶部计时/右侧答题区）
- [ ] 单选/多选/判断/填空题型渲染
- [ ] 防切屏监听（Page Visibility API）
- [ ] 断网检测 + localStorage 缓存答案
- [ ] 交卷确认/超时自动交卷

---

### Sprint 6：自动阅卷与成绩

**后端**
- [ ] 阅卷引擎（自动对比标准答案，计算得分）
- [ ] `Score` 表写入（总分/各题得分/正确率/排名）
- [ ] 教师端成绩查询（班级列表/统计/排名）
- [ ] 学生端成绩查询（个人历史/答题明细/错题）
- [ ] 成绩导出（Excel）

**前端**
- [ ] 教师端成绩管理页（列表/搜索/导出）
- [ ] 成绩详情页（各题得分/正确率柱图）
- [ ] 学生端成绩查看页（历史列表/答题明细/错题回顾）

---

### Sprint 7：随时考核与评分表

**后端**
- [ ] `ScoreTable` CRUD（评分表：名称/加减分制）
- [ ] `ScoreItem` CRUD（评分项：名称/分值/顺序）
- [ ] `ScoreRecord` 写入（考官打分记录）
- [ ] 离线评分数据批量同步接口

**前端**
- [ ] 评分表管理页（列表/新增/编辑/导入）
- [ ] 评分表编辑器（评分项动态增删/拖拽排序/加减分制切换）
- [ ] 打分界面（手选被评人，逐项打分，实时计算总分）
- [ ] 离线评分（Service Worker 缓存，网络恢复自动上传）

---

### Sprint 8：SaaS基础 + 模块框架

**后端**
- [ ] `Module` 表（模块定义：code/name）
- [ ] `TenantModule` 授权表（机构-模块-有效期-人数）
- [ ] 多租户中间件（tenantId 隔离所有查询）
- [ ] 超管后台接口（机构管理/模块授权/使用统计）

**前端**
- [ ] `ModuleLayout.vue`（独立模块布局，双导航）
- [ ] 超管后台（机构列表/模块授权配置页）
- [ ] 动态模块入口（登录后根据已购模块动态渲染导航）
- [ ] 模块权限路由守卫

---

### Sprint 9：硬件通信标准模块

- [ ] `IHardwareDevice` / `IDataFrame` 抽象接口
- [ ] `HardwareManager` 设备管理器（连接池/重连/事件分发）
- [ ] `BluetoothDevice.ts` / `BluetoothScanner.ts`（Web Bluetooth）
- [ ] `SerialDevice.ts` / `SerialPortSelector.ts`（Web Serial）
- [ ] `FrameParser.ts` / `FrameEncoder.ts`（协议解析/编码）
- [ ] `HardwareDebugPanel.vue`（调试面板：连接/收发日志）
- [ ] `DeviceSimulator.ts`（无硬件时的模拟器）

---

## 八、数据库核心表（Prisma）

```
Sprint 1（已建）：Tenant / User / Organization / UserOrg
Sprint 3：QuestionCategory / Question / QuestionOption
Sprint 4-5：Paper / PaperQuestion / Exam / ExamParticipant / ExamAnswer
Sprint 6：Score
Sprint 7：ScoreTable / ScoreItem / ScoreRecord
Sprint 8：Module / TenantModule
```

---

## 九、接口规范

- RESTful，统一响应：`{ code, message, data, timestamp }`
- 错误码维护在 `packages/shared/src/constants/errors.ts`
- 认证：JWT Bearer Token，所有接口（除登录）需携带
- 多租户：tenantId 从 JWT 提取，不从请求参数传入
- 分页：`?page=1&pageSize=20`，响应 `{ total, list, page, pageSize }`
- TypeScript 严格模式，禁止 any

---

## 十、当前开发进度

### 总体状态：🟢 全部 Sprint 1-9 已完成，待部署

### 已完成
- [x] Sprint 1：工程搭建 + 认证
- [x] Sprint 2：用户与组织管理（后端 + 前端）
- [x] Sprint 3：题库管理（后端 + 前端）
- [x] Sprint 4：组卷与考试管理（PapersModule/ExamsModule/PapersView/ExamsView）
- [x] Sprint 5：在线考试（ExamRoomModule/ExamRoomView/MyExamsView）
- [x] Sprint 6：自动阅卷与成绩（ScoresModule/ScoresView）
- [x] Sprint 7：评分表（ScoreTablesModule/ScoreTablesView/ScoreJudgeView）
- [x] Sprint 8：超管后台（AdminModule/AdminView + 机构/模块授权管理）
- [x] Sprint 9：硬件通信（BluetoothDevice/SerialDevice/FrameParser/DeviceSimulator/HardwareDebugPanel）
- [x] 部署配置（Dockerfile x2 / docker-compose.prod.yml / nginx.conf / deploy.sh）

### Sprint 完成记录

| Sprint | 完成内容 | 完成时间 |
|--------|---------|---------|
| Sprint 1 | 工程搭建+认证（Monorepo/Docker/Prisma/JWT/登录页/MainLayout） | 2026-03-18 |
| Sprint 2 | 用户与组织管理（OrganizationsModule/UsersModule/前端两个页面/路由） | 2026-03-18 |
| Sprint 3 | 题库管理（QuestionsModule/QuestionsView/分类树/题目CRUD/批量导入） | 2026-03-18 |
| Sprint 4 | 组卷考试管理（PapersModule/ExamsModule/PapersView/ExamsView） | 2026-03-18 |
| Sprint 5 | 在线考试（ExamRoomModule+自动阅卷/ExamRoomView/MyExamsView） | 2026-03-18 |
| Sprint 6 | 成绩系统（ScoresModule/ScoresView/答题明细） | 2026-03-18 |
| Sprint 7 | 评分表（ScoreTablesModule/ScoreTablesView/ScoreJudgeView） | 2026-03-18 |
| Sprint 8 | 超管后台（AdminModule/AdminView/机构管理/模块授权/平台统计） | 2026-03-18 |
| Sprint 9 | 硬件通信（BLE/Serial/FrameParser/Simulator/调试面板） | 2026-03-18 |

---

## 十一、部署步骤

1. 服务器准备：阿里云/腾讯云 ECS（建议4核8G起），安装 Docker + Docker Compose
2. 上传代码到服务器
3. `cp .env.production.example .env`，修改所有密码和密钥
4. `chmod +x deploy/deploy.sh && ./deploy/deploy.sh`
5. 配置域名 DNS → 服务器IP，申请 SSL 证书（Web Serial/Bluetooth 强制 HTTPS）
6. 更新 `deploy/nginx.conf` 加入 HTTPS 配置

