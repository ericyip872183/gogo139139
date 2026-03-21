<template>
  <div class="org-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>组织架构管理</span>
          <el-button type="primary" :icon="Plus" @click="openCreate(null)">新增根节点</el-button>
        </div>
      </template>

      <el-tree
        v-loading="loading"
        :data="treeData"
        :props="{ label: 'name', children: 'children' }"
        default-expand-all
        node-key="id"
      >
        <template #default="{ node, data }">
          <div class="tree-node">
            <span class="node-label">
              <el-tag size="small" :type="levelTag(data.level)" class="level-tag">
                {{ levelName(data.level) }}
              </el-tag>
              {{ data.name }}
            </span>
            <span class="node-actions">
              <el-button
                v-if="data.level < 4"
                link
                type="primary"
                size="small"
                @click.stop="openCreate(data.id)"
              >
                添加子级
              </el-button>
              <el-button link type="primary" size="small" @click.stop="openEdit(data)">编辑</el-button>
              <el-button link type="danger" size="small" @click.stop="handleRemove(data)">删除</el-button>
            </span>
          </div>
        </template>
      </el-tree>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="420px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入组织名称" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="form.sortOrder" :min="0" :max="999" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { organizationsApi, type OrgNode } from '@/api/organizations'

const loading = ref(false)
const treeData = ref<OrgNode[]>([])

const dialogVisible = ref(false)
const dialogTitle = ref('')
const submitting = ref(false)
const editId = ref<string | null>(null)
const parentId = ref<string | null>(null)

const formRef = ref<FormInstance>()
const form = ref({ name: '', sortOrder: 0 })
const rules: FormRules = {
  name: [{ required: true, message: '请输入组织名称', trigger: 'blur' }],
}

const levelNames = ['', '学校', '班级', '老师', '学生']
const levelTags = ['', '', 'success', 'warning', 'info'] as const
const levelName = (level: number) => levelNames[level] ?? `第${level}级`
const levelTag = (level: number) => levelTags[level] ?? ''

async function loadTree() {
  loading.value = true
  try {
    treeData.value = (await organizationsApi.getTree()) as unknown as OrgNode[]
  } finally {
    loading.value = false
  }
}

function openCreate(pid: string | null) {
  editId.value = null
  parentId.value = pid
  form.value = { name: '', sortOrder: 0 }
  dialogTitle.value = pid ? '添加子组织' : '新增根组织'
  dialogVisible.value = true
}

function openEdit(data: OrgNode) {
  editId.value = data.id
  parentId.value = data.parentId
  form.value = { name: data.name, sortOrder: data.sortOrder }
  dialogTitle.value = '编辑组织'
  dialogVisible.value = true
}

async function handleSubmit() {
  await formRef.value?.validate()
  submitting.value = true
  try {
    if (editId.value) {
      await organizationsApi.update(editId.value, form.value)
      ElMessage.success('更新成功')
    } else {
      await organizationsApi.create({ ...form.value, parentId: parentId.value ?? undefined })
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    await loadTree()
  } finally {
    submitting.value = false
  }
}

async function handleRemove(data: OrgNode) {
  await ElMessageBox.confirm(`确定删除「${data.name}」吗？`, '提示', { type: 'warning' })
  await organizationsApi.remove(data.id)
  ElMessage.success('删除成功')
  await loadTree()
}

function resetForm() {
  formRef.value?.resetFields()
}

onMounted(loadTree)
</script>

<style scoped>
.org-page {
  padding: 16px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-right: 8px;
}
.node-label {
  display: flex;
  align-items: center;
  gap: 6px;
}
.level-tag {
  flex-shrink: 0;
}
.node-actions {
  display: none;
}
.tree-node:hover .node-actions {
  display: flex;
  gap: 4px;
}
</style>
