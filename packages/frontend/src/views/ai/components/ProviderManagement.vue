<template>
  <div class="provider-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>AI 服务商管理</span>
          <el-button type="primary" @click="handleAdd">新增服务商</el-button>
        </div>
      </template>

      <el-table :data="providers" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="180" />
        <el-table-column prop="name" label="名称" width="150" />
        <el-table-column prop="baseUrl" label="API 地址" min-width="200" />
        <el-table-column prop="authType" label="认证方式" width="100" />
        <el-table-column label="API Key" width="150">
          <template #default="{ row }">
            {{ row.apiKey ? '••••••••' : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isEnabled ? 'success' : 'danger'">
              {{ row.isEnabled ? '已启用' : '已禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="模型数" width="80">
          <template #default="{ row }">
            {{ row._count?.models || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑服务商' : '新增服务商'"
      width="500px"
      @close="handleClose"
    >
      <el-form ref="formRef" :model="formData" :rules="rules" label-width="100px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="formData.name" placeholder="例如：火山引擎豆包" />
        </el-form-item>
        <el-form-item label="API 地址" prop="baseUrl">
          <el-input v-model="formData.baseUrl" placeholder="https://ark.cn-beijing.volces.com/api/v3" />
        </el-form-item>
        <el-form-item label="认证方式" prop="authType">
          <el-select v-model="formData.authType">
            <el-option label="Bearer Token" value="Bearer" />
            <el-option label="API Key" value="api_key" />
            <el-option label="HMAC" value="HMAC" />
          </el-select>
        </el-form-item>
        <el-form-item label="API Key" prop="apiKey">
          <el-input v-model="formData.apiKey" type="password" placeholder="请输入 API Key" />
        </el-form-item>
        <el-form-item label="API Secret" prop="apiSecret">
          <el-input v-model="formData.apiSecret" type="password" placeholder="HMAC 认证需要" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="formData.isEnabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { aiAdminApi, type AiProvider } from '@/api/ai-admin'

const providers = ref<AiProvider[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const formData = reactive<Partial<AiProvider>>({
  name: '',
  baseUrl: '',
  authType: 'Bearer',
  apiKey: '',
  apiSecret: '',
  isEnabled: true,
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入服务商名称', trigger: 'blur' }],
  baseUrl: [
    { required: true, message: '请输入 API 地址', trigger: 'blur' },
    { type: 'url', message: '请输入有效的 URL', trigger: 'blur' },
  ],
  apiKey: [{ required: true, message: '请输入 API Key', trigger: 'blur' }],
}

const loadProviders = async () => {
  loading.value = true
  try {
    providers.value = await aiAdminApi.getProviders()
  } catch (e: any) {
    ElMessage.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  isEdit.value = false
  Object.assign(formData, {
    name: '',
    baseUrl: '',
    authType: 'Bearer',
    apiKey: '',
    apiSecret: '',
    isEnabled: true,
  })
  dialogVisible.value = true
}

const handleEdit = (row: AiProvider) => {
  isEdit.value = true
  Object.assign(formData, {
    id: row.id,
    name: row.name,
    baseUrl: row.baseUrl,
    authType: row.authType,
    apiKey: row.apiKey,
    apiSecret: row.apiSecret,
    isEnabled: row.isEnabled,
  })
  dialogVisible.value = true
}

const handleDelete = async (row: AiProvider) => {
  try {
    await ElMessageBox.confirm(`确定删除服务商 "${row.name}" 吗？`, '确认删除', {
      type: 'warning',
    })
    await aiAdminApi.deleteProvider(row.id)
    ElMessage.success('删除成功')
    loadProviders()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '删除失败')
  }
}

const handleClose = () => {
  formRef.value?.resetFields()
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    submitting.value = true
    const data = {
      name: formData.name,
      baseUrl: formData.baseUrl,
      authType: formData.authType,
      apiKey: formData.apiKey,
      apiSecret: formData.apiSecret,
      isEnabled: formData.isEnabled,
    }
    if (isEdit.value && formData.id) {
      await aiAdminApi.updateProvider(formData.id, data)
      ElMessage.success('更新成功')
    } else {
      await aiAdminApi.createProvider(data)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadProviders()
  } catch (e: any) {
    if (e.message) ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadProviders()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
