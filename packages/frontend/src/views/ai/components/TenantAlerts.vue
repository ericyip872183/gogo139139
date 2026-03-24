<template>
  <div class="tenant-alerts">
    <el-card>
      <template #header>
        <span>预警记录</span>
      </template>

      <el-alert
        v-if="!alerts || alerts.length === 0"
        title="暂无预警记录"
        type="success"
        :closable="false"
        show-icon
      />

      <el-table v-else :data="alerts" v-loading="loading" stripe>
        <el-table-column prop="id" label="预警 ID" width="180" />
        <el-table-column prop="providerId" label="服务商 ID" width="150" />
        <el-table-column label="剩余额度" width="100">
          <template #default="{ row }">
            <span :class="{ warning: row.remainingPercent < 20 }">
              {{ row.remainingPercent > 0 ? row.remainingPercent + '%' : '-' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="notifiedAt" label="通知时间" width="180" />
        <el-table-column prop="resolvedAt" label="解决时间" width="180" />
        <el-table-column prop="createdAt" label="创建时间" width="180" />
      </el-table>
    </el-card>

    <!-- 配额申请对话框 -->
    <el-dialog
      v-model="requestDialogVisible"
      title="申请增加配额"
      width="400px"
    >
      <el-form ref="formRef" :model="requestForm" :rules="rules" label-width="100px">
        <el-form-item label="服务商" prop="providerId">
          <el-select v-model="requestForm.providerId" placeholder="请选择服务商" style="width: 100%">
            <el-option
              v-for="service in services"
              :key="service.provider.id"
              :label="service.provider.name"
              :value="service.provider.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="申请原因" prop="reason">
          <el-input
            v-model="requestForm.reason"
            type="textarea"
            :rows="4"
            placeholder="请说明申请原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="requestDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleRequest">提交申请</el-button>
      </template>
    </el-dialog>

    <div style="margin-top: 20px; text-align: right">
      <el-button type="primary" @click="requestDialogVisible = true">申请增加配额</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { aiAdminApi, type AiAlert } from '@/api/ai-admin'

const alerts = ref<AiAlert[]>([])
const services = ref<any[]>([])
const loading = ref(false)
const requestDialogVisible = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const requestForm = reactive({
  providerId: '',
  reason: '',
})

const rules: FormRules = {
  providerId: [{ required: true, message: '请选择服务商', trigger: 'change' }],
  reason: [{ required: true, message: '请输入申请原因', trigger: 'blur' }],
}

const getStatusType = (status: string) => {
  const map: Record<string, any> = {
    active: 'danger',
    notified: 'warning',
    resolved: 'success',
    quota_request: 'info',
  }
  return map[status] || 'info'
}

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    active: '活跃',
    notified: '已通知',
    resolved: '已解决',
    quota_request: '配额申请',
  }
  return map[status] || status
}

const loadAlerts = async () => {
  loading.value = true
  try {
    alerts.value = await aiAdminApi.getTenantAlerts()
  } catch (e: any) {
    ElMessage.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const loadServices = async () => {
  try {
    const res = await aiAdminApi.getTenantServices()
    services.value = res.services || []
    if (services.value.length > 0 && !requestForm.providerId) {
      requestForm.providerId = services.value[0].provider.id
    }
  } catch (e: any) {
    console.error('加载服务列表失败', e)
  }
}

const handleRequest = async () => {
  try {
    await formRef.value?.validate()
    submitting.value = true
    await aiAdminApi.requestQuota({
      providerId: requestForm.providerId,
      reason: requestForm.reason,
    })
    ElMessage.success('申请已提交，请联系平台管理员审批')
    requestDialogVisible.value = false
    loadAlerts()
  } catch (e: any) {
    if (e.message) ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadAlerts()
  loadServices()
})
</script>

<style scoped>
.warning {
  color: #f56c6c;
  font-weight: bold;
}
</style>
