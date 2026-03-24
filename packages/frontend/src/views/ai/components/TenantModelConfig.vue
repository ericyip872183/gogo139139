<template>
  <div class="tenant-model-config">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>机构模型配置</span>
          <el-button type="primary" @click="handleAdd">配置模型</el-button>
        </div>
      </template>

      <el-form :inline="true" class="filter-form">
        <el-form-item label="选择机构">
          <el-select v-model="selectedTenantId" placeholder="请选择机构" style="width: 300px" @change="loadTenantModels">
            <el-option
              v-for="tenant in tenants"
              :key="tenant.id"
              :label="tenant.name"
              :value="tenant.id"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <el-alert
        v-if="!selectedTenantId"
        title="请先选择机构"
        type="info"
        :closable="false"
        show-icon
      />

      <el-table v-else :data="tenantModels" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="180" />
        <el-table-column prop="tenantId" label="机构 ID" width="180" />
        <el-table-column label="服务商" width="120">
          <template #default="{ row }">
            {{ row.model.provider.name }}
          </template>
        </el-table-column>
        <el-table-column label="模型" width="150">
          <template #default="{ row }">
            <el-tag v-if="row.model.isEp" type="warning" size="small">EP</el-tag>
            {{ row.model.name }}
          </template>
        </el-table-column>
        <el-table-column label="场景" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ getSceneLabel(row.scene) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="默认模型" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.isDefault" type="success" size="small">是</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.isEnabled ? 'success' : 'danger'" size="small">
              {{ row.isEnabled ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 配置对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="配置机构模型"
      width="500px"
      @close="handleClose"
    >
      <el-form ref="formRef" :model="formData" :rules="rules" label-width="100px">
        <el-form-item label="机构" prop="tenantId">
          <el-select v-model="formData.tenantId" placeholder="请选择机构" style="width: 100%" @change="handleTenantChange">
            <el-option
              v-for="tenant in tenants"
              :key="tenant.id"
              :label="tenant.name"
              :value="tenant.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="服务商" prop="providerId">
          <el-select v-model="formData.providerId" placeholder="请选择服务商" style="width: 100%" @change="handleProviderChange">
            <el-option
              v-for="p in providers"
              :key="p.id"
              :label="p.name"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="模型" prop="modelId">
          <el-select v-model="formData.modelId" placeholder="请选择模型" style="width: 100%">
            <el-option
              v-for="m in filteredModels"
              :key="m.id"
              :label="m.name"
              :value="m.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="使用场景" prop="scene">
          <el-select v-model="formData.scene" placeholder="请选择使用场景" style="width: 100%">
            <el-option label="通用场景" value="general" />
            <el-option label="模拟病人" value="mock_patient" />
            <el-option label="题目导入" value="question_import" />
            <el-option label="OCR 识别" value="ocr" />
          </el-select>
        </el-form-item>
        <el-form-item label="默认模型">
          <el-switch v-model="formData.isDefault" />
          <div class="form-tip">每个场景只能有一个默认模型</div>
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
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { aiAdminApi, type TenantAiModel, type AiProvider, type AiModel } from '@/api/ai-admin'

interface Tenant {
  id: string
  name: string
}

const tenantModels = ref<TenantAiModel[]>([])
const tenants = ref<Tenant[]>([])
const providers = ref<AiProvider[]>([])
const allModels = ref<AiModel[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const submitting = ref(false)
const selectedTenantId = ref<string>('')
const formRef = ref<FormInstance>()

const formData = reactive<Partial<TenantAiModel>>({
  tenantId: '',
  providerId: '',
  modelId: '',
  scene: 'general',
  isDefault: false,
  isEnabled: true,
})

const filteredModels = computed(() => {
  if (!formData.providerId) return []
  return allModels.value.filter(m => m.providerId === formData.providerId)
})

const rules: FormRules = {
  tenantId: [{ required: true, message: '请选择机构', trigger: 'change' }],
  providerId: [{ required: true, message: '请选择服务商', trigger: 'change' }],
  modelId: [{ required: true, message: '请选择模型', trigger: 'change' }],
  scene: [{ required: true, message: '请选择使用场景', trigger: 'change' }],
}

const getSceneLabel = (scene: string) => {
  const map: Record<string, string> = {
    general: '通用',
    mock_patient: '模拟病人',
    question_import: '题目导入',
    ocr: 'OCR 识别',
  }
  return map[scene] || scene
}

const loadTenants = async () => {
  // 复用现有 API - 需要从 super-admin 获取机构列表
  try {
    const auth = useAuthStore()
    const res = await fetch('/api/admin/tenants', {
      headers: {
        'Authorization': `Bearer ${auth.token}`,
      },
    })
    if (res.ok) {
      tenants.value = await res.json()
    }
  } catch (e) {
    console.error('加载机构列表失败', e)
  }
}

const loadProviders = async () => {
  providers.value = await aiAdminApi.getProviders()
}

const loadModels = async () => {
  allModels.value = await aiAdminApi.getModels()
}

const loadTenantModels = async () => {
  if (!selectedTenantId.value) return
  loading.value = true
  try {
    tenantModels.value = await aiAdminApi.getTenantModels(selectedTenantId.value)
  } catch (e: any) {
    ElMessage.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  Object.assign(formData, {
    tenantId: selectedTenantId.value || '',
    providerId: providers.value[0]?.id || '',
    modelId: '',
    scene: 'general',
    isDefault: false,
    isEnabled: true,
  })
  dialogVisible.value = true
}

const handleDelete = async (row: TenantAiModel) => {
  try {
    await ElMessageBox.confirm(`确定移除该模型配置吗？`, '确认删除', { type: 'warning' })
    await aiAdminApi.removeTenantModel({
      tenantId: row.tenantId,
      providerId: row.providerId,
      modelId: row.modelId,
      scene: row.scene,
    })
    ElMessage.success('删除成功')
    loadTenantModels()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '删除失败')
  }
}

const handleTenantChange = (val: string) => {
  formData.tenantId = val
}

const handleProviderChange = () => {
  formData.modelId = ''
}

const handleClose = () => {
  formRef.value?.resetFields()
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    submitting.value = true
    await aiAdminApi.setTenantModel(formData)
    ElMessage.success('配置成功')
    dialogVisible.value = false
    if (selectedTenantId.value === formData.tenantId) {
      loadTenantModels()
    }
  } catch (e: any) {
    if (e.message) ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadTenants()
  loadProviders()
  loadModels()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.filter-form {
  margin-bottom: 16px;
}
.form-tip {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
</style>
