<template>
  <div class="quota-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>配额管理</span>
          <div>
            <el-button type="primary" @click="handleAllocate">分配配额</el-button>
          </div>
        </div>
      </template>

      <el-form :inline="true" class="filter-form">
        <el-form-item label="选择机构">
          <el-select v-model="filterTenantId" placeholder="全部" clearable @change="loadQuotas" style="width: 300px">
            <el-option label="全部" value="" />
            <el-option
              v-for="tenant in tenants"
              :key="tenant.id"
              :label="tenant.name"
              :value="tenant.id"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <el-table :data="quotas" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="180" />
        <el-table-column prop="tenantId" label="机构 ID" width="180" />
        <el-table-column prop="provider.name" label="服务商" width="120" />
        <el-table-column label="总配额 (tokens)" width="120">
          <template #default="{ row }">
            {{ formatNumber(row.totalQuota) }}
          </template>
        </el-table-column>
        <el-table-column label="已使用 (tokens)" width="120">
          <template #default="{ row }">
            {{ formatNumber(row.usedQuota) }}
          </template>
        </el-table-column>
        <el-table-column label="剩余额度" width="120">
          <template #default="{ row }">
            <el-progress
              :percentage="getRemainingPercent(row)"
              :status="getRemainingPercent(row) < 20 ? 'exception' : ''"
            />
          </template>
        </el-table-column>
        <el-table-column label="预警阈值" width="100">
          <template #default="{ row }">
            {{ row.alertThreshold }}%
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
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 分配/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑配额' : '分配配额'"
      width="500px"
      @close="handleClose"
    >
      <el-form ref="formRef" :model="formData" :rules="rules" label-width="100px">
        <el-form-item label="机构" prop="tenantId">
          <el-select v-model="formData.tenantId" placeholder="请选择机构" style="width: 100%">
            <el-option
              v-for="tenant in tenants"
              :key="tenant.id"
              :label="tenant.name"
              :value="tenant.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="服务商" prop="providerId">
          <el-select v-model="formData.providerId" placeholder="请选择服务商" style="width: 100%">
            <el-option
              v-for="p in providers"
              :key="p.id"
              :label="p.name"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="总配额" prop="totalQuota">
          <el-input-number v-model="formData.totalQuota" :min="0" :step="10000" placeholder="tokens 数量" style="width: 100%" />
          <div class="form-tip">单位：tokens</div>
        </el-form-item>
        <el-form-item label="预警阈值" prop="alertThreshold">
          <el-input-number v-model="formData.alertThreshold" :min="1" :max="100" placeholder="百分比" style="width: 100%" />
          <div class="form-tip">剩余额度低于此百分比时触发预警</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">提交</el-button>
      </template>
    </el-dialog>

    <!-- 平台总配额概览 -->
    <el-card class="platform-quota-card" style="margin-top: 20px">
      <template #header>
        <span>平台总配额概览</span>
      </template>
      <el-table :data="platformQuotas" stripe>
        <el-table-column prop="providerName" label="服务商" width="150" />
        <el-table-column label="总配额" width="150">
          <template #default="{ row }">
            {{ formatNumber(row.totalQuota) }}
          </template>
        </el-table-column>
        <el-table-column label="已使用" width="150">
          <template #default="{ row }">
            {{ formatNumber(row.usedQuota) }}
          </template>
        </el-table-column>
        <el-table-column label="剩余额度" width="150">
          <template #default="{ row }">
            {{ formatNumber(row.remainingQuota) }}
          </template>
        </el-table-column>
        <el-table-column label="使用率" width="150">
          <template #default="{ row }">
            <el-progress
              :percentage="Math.round((row.usedQuota / row.totalQuota) * 100) || 0"
              :status="row.usedQuota / row.totalQuota > 0.8 ? 'warning' : ''"
            />
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { aiAdminApi, type TenantAiQuota, type PlatformQuota, type AiProvider } from '@/api/ai-admin'

interface Tenant {
  id: string
  name: string
}

const quotas = ref<TenantAiQuota[]>([])
const platformQuotas = ref<PlatformQuota[]>([])
const tenants = ref<Tenant[]>([])
const providers = ref<AiProvider[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const filterTenantId = ref<string>('')
const formRef = ref<FormInstance>()

const formData = reactive<Partial<TenantAiQuota>>({
  tenantId: '',
  providerId: '',
  totalQuota: 100000,
  alertThreshold: 20,
})

const rules: FormRules = {
  tenantId: [{ required: true, message: '请选择机构', trigger: 'change' }],
  providerId: [{ required: true, message: '请选择服务商', trigger: 'change' }],
  totalQuota: [{ required: true, message: '请输入总配额', trigger: 'blur' }],
}

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('zh-CN').format(num)
}

const getRemainingPercent = (row: TenantAiQuota) => {
  if (!row.totalQuota) return 0
  return Math.round(((row.totalQuota - row.usedQuota) / row.totalQuota) * 100)
}

const loadTenants = async () => {
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

const loadQuotas = async () => {
  loading.value = true
  try {
    quotas.value = await aiAdminApi.getTenantQuotas(filterTenantId.value || undefined)
    platformQuotas.value = await aiAdminApi.getPlatformQuotas()
  } catch (e: any) {
    ElMessage.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const handleAllocate = () => {
  isEdit.value = false
  Object.assign(formData, {
    tenantId: tenants.value[0]?.id || '',
    providerId: providers.value[0]?.id || '',
    totalQuota: 100000,
    alertThreshold: 20,
  })
  dialogVisible.value = true
}

const handleEdit = (row: TenantAiQuota) => {
  isEdit.value = true
  Object.assign(formData, {
    tenantId: row.tenantId,
    providerId: row.providerId,
    totalQuota: row.totalQuota,
    alertThreshold: row.alertThreshold,
  })
  dialogVisible.value = true
}

const handleClose = () => {
  formRef.value?.resetFields()
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    submitting.value = true
    await aiAdminApi.allocateQuota(formData)
    ElMessage.success('操作成功')
    dialogVisible.value = false
    loadQuotas()
  } catch (e: any) {
    if (e.message) ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadTenants()
  loadProviders()
  loadQuotas()
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
.platform-quota-card {
  margin-top: 20px;
}
</style>
