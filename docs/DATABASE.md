# 盼蕾平台 — 数据库设计

> **本文件记录所有数据表的字段定义、类型、约束及表间关系。新增或修改表结构时必须同步更新本文件，并在 schema.prisma 中对应修改后运行 prisma db push。**

---

## 表关系总览

```
Tenant (机构)
  ├── User (用户) [tenantId]
  │     └── UserOrg (用户-组织) [userId ↔ organizationId]
  ├── Organization (组织架构) [tenantId]
  ├── QuestionCategory (题目分类) [tenantId]
  ├── Question (题目) [tenantId, categoryId]
  │     └── QuestionOption (选项) [questionId]
  ├── Paper (试卷) [tenantId]
  │     └── PaperQuestion (试卷题目) [paperId, questionId]
  ├── Exam (考试) [tenantId, paperId]
  │     ├── ExamParticipant (考生) [examId, userId]
  │     └── ExamAnswer (答题记录) [examId, userId, questionId]
  ├── Score (成绩) [tenantId, examId, userId]
  ├── ScoreTable (评分表) [tenantId]
  │     ├── ScoreItem (评分项) [tableId]
  │     └── ScoreRecord (打分记录) [tableId, judgeId, targetUserId]
  └── TenantModule (模块授权) [tenantId, moduleId]

Module (模块定义，平台级，无tenantId)
```

---

## 表详细设计

### tenants（机构）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, CUID | |
| name | String | NOT NULL | 机构名称 |
| code | String | UNIQUE | 机构编码（登录识别用） |
| logo | String? | | Logo URL |
| isActive | Boolean | DEFAULT true | 是否启用 |
| expiredAt | DateTime? | | 授权到期时间，null=永久 |
| createdAt | DateTime | DEFAULT NOW | |
| updatedAt | DateTime | AUTO UPDATE | |

### users（用户）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, CUID | |
| tenantId | String | FK→tenants | |
| username | String | UNIQUE(tenantId,username) | 同机构内唯一 |
| password | String | | bcrypt 哈希 |
| realName | String? | | 真实姓名 |
| role | Enum | | SUPER_ADMIN / TENANT_ADMIN / CLASS_ADMIN / TEACHER / STUDENT |
| phone | String? | | 手机号 |
| email | String? | | 邮箱 |
| avatar | String? | | 头像 URL |
| studentNo | String? | | 学号/准考证号 |
| isActive | Boolean | DEFAULT true | |
| lastLoginAt | DateTime? | | |
| createdAt | DateTime | DEFAULT NOW | |
| updatedAt | DateTime | AUTO UPDATE | |

### organizations（组织架构）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK | |
| tenantId | String | FK | |
| name | String | | |
| parentId | String? | FK self | 父级（null=根） |
| level | Int | | 层级深度（1-4） |
| code | String? | | 组织编码 |
| order | Int | DEFAULT 0 | 排序 |

### user_orgs（用户-组织多对多）

| 字段 | 类型 | 约束 |
|------|------|------|
| userId | String | FK |
| organizationId | String | FK |
| PRIMARY KEY | (userId, organizationId) | |

### question_categories（题目分类）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | PK |
| tenantId | String | FK |
| name | String | |
| parentId | String? | |
| moduleCode | String? | 模块专属分类 |
| order | Int | |

### questions（题目）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | PK |
| tenantId | String | FK |
| categoryId | String? | FK |
| type | Enum | SINGLE/MULTI/JUDGE/FILL |
| content | String | 题目正文（支持HTML） |
| answer | String? | 标准答案（填空/判断） |
| difficulty | Int | 1-5 |
| score | Float | 默认分值 |
| explanation | String? | 解析 |

### question_options（选项）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | PK |
| questionId | String | FK |
| label | String | A/B/C/D |
| content | String | 选项内容 |
| isCorrect | Boolean | 是否正确答案 |
| order | Int | |

### papers（试卷）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | PK |
| tenantId | String | FK |
| title | String | |
| totalScore | Float | |
| duration | Int | 考试时长（分钟） |
| createdBy | String | FK→users |
| status | Enum | DRAFT/PUBLISHED |

### paper_questions（试卷题目）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | PK |
| paperId | String | FK |
| questionId | String | FK |
| order | Int | 题目顺序 |
| score | Float | 覆盖默认分值 |

### exams（考试）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | PK |
| tenantId | String | FK |
| paperId | String | FK→papers |
| title | String | |
| startAt | DateTime | |
| endAt | DateTime | |
| status | Enum | DRAFT/ACTIVE/ENDED |
| allowLate | Boolean | 是否允许迟交 |
| createdBy | String | FK→users |

### exam_participants（考试指定考生）

| 字段 | 类型 |
|------|------|
| examId | String FK |
| userId | String FK |
| PRIMARY KEY | (examId, userId) |

### exam_answers（答题记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | PK |
| examId | String | FK |
| userId | String | FK |
| questionId | String | FK |
| answer | String | 提交的答案 |
| isCorrect | Boolean? | 自动判分结果 |
| score | Float? | 得分 |
| submittedAt | DateTime | |

### scores（成绩汇总）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | PK |
| tenantId | String | |
| examId | String | FK |
| userId | String | FK |
| moduleCode | String? | 来源模块（专业模块回传用） |
| totalScore | Float | |
| correctRate | Float | 正确率 0-1 |
| rank | Int? | 排名 |
| detail | JSON? | 专业模块详情 |
| createdAt | DateTime | |

### score_tables（评分表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | PK |
| tenantId | String | FK |
| name | String | |
| type | Enum | ADD（加分制）/MINUS（减分制） |
| totalScore | Float | 满分 |
| createdBy | String | FK |

### score_items（评分项）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | PK |
| tableId | String | FK→score_tables |
| name | String | |
| score | Float | 项目分值 |
| order | Int | |
| required | Boolean | 是否必须评分 |

### score_records（打分记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | PK |
| tableId | String | FK |
| judgeId | String | FK→users（考官） |
| targetUserId | String | FK→users（被评人） |
| scores | JSON | {itemId: score, ...} |
| total | Float | 汇总分 |
| note | String? | 备注 |
| createdAt | DateTime | |

### modules（平台模块定义）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | PK |
| code | String | UNIQUE，如 TCM_CONSTITUTION |
| name | String | 模块名称 |
| description | String? | |
| phase | String? | 分期标注，如「二期」「三期」|
| isActive | Boolean | |

### tenant_modules（机构模块授权）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | PK |
| tenantId | String | FK |
| moduleId | String | FK |
| expiredAt | DateTime? | 到期时间 |
| maxUsers | Int? | 授权人数 |
| createdAt | DateTime | |

---

## 修改表结构流程

```bash
# 1. 修改 packages/backend/prisma/schema.prisma
# 2. 同步到数据库
docker exec panlei-backend sh -c "cd /app/packages/backend && prisma db push"
# 3. 更新本文件对应的表定义
```
