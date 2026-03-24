<template>
  <div class="recharge-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>充值管理</span>
          <el-button type="primary" @click="handleRecharge">在线充值</el-button>
        </div>
      </template>

      <el-table :data="recharges" v-loading="loading" stripe>
        <el-table-column prop="id" label="订单 ID" width="180" />
        <el-table-column prop="orderNo" label="订单号" width="180" />
        <el-table-column label="服务商" width="120">
          <template #default="{ row }">
            {{ getProviderName(row.providerId) }}
          </template>
        </el-table-column>
        <el-table-column label="充值金额" width="100">
          <template #default="{ row }">
            ¥{{ row.amount }}
          </template>
        </el-table-column>
        <el-table-column label="Token 数量" width="120">
          <template #default="{ row }">
            {{ formatNumber(row.tokens) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="paidAt" label="支付时间" width="180" />
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending' && row.payUrl"
              link
              type="primary"
              @click="handlePay(row)"
            >
              去支付
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 充值对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="在线充值"
      width="400px"
    >
      <el-form ref="formRef" :model="formData" :rules="rules" label-width="100px">
        <el-form-item label="服务商" prop="providerId">
          <el-select v-model="formData.providerId" placeholder="请选择服务商" style="width: 100%">
            <el-option
              v-for="service in services"
              :key="service.provider.id"
              :label="service.provider.name"
              :value="service.provider.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="充值金额" prop="amount">
          <el-input-number v-model="formData.amount" :min="1" :step="10" placeholder="元" style="width: 100%" />
          <div class="form-tip">
            参考汇率：1 元 = 250,000 tokens<br />
            充值 {{ formData.amount }} 元 ≈ {{ formatNumber(formData.amount * 250000) }} tokens
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">创建订单</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { aiAdminApi, type AiRecharge } from '@/api/ai-admin'

const recharges = ref<AiRecharge[]>([])
const services = ref<any[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const formData = reactive({
  providerId: '',
  amount: 100,
})

const rules: FormRules = {
  providerId: [{ required: true, message: '请选择服务商', trigger: 'change' }],
  amount: [{ required: true, message: '请输入充值金额', trigger: 'blur' }],
}

const getStatusType = (status: string) => {
  const map: Record<string, any> = {
    pending: 'warning',
    paid: 'success',
    failed: 'danger',
  }
  return map[status] || 'info'
}

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    pending: '待支付',
    paid: '已支付',
    failed: '支付失败',
  }
  return map[status] || status
}

const getProviderName = (providerId: string) => {
  const service = services.value.find(s => s.provider.id === providerId)
  return service?.provider.name || providerId
}

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('zh-CN').format(num)
}

const loadRecharges = async () => {
  loading.value = true
  try {
    recharges.value = await aiAdminApi.getRecharges()
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
    if (services.value.length > 0 && !formData.providerId) {
      formData.providerId = services.value[0].provider.id
    }
  } catch (e: any) {
    console.error('加载服务列表失败', e)
  }
}

const handleRecharge = () => {
  dialogVisible.value = true
}

const handlePay = (row: AiRecharge) => {
  if (row.payUrl) {
    window.open(row.payUrl, '_blank')
  }
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    submitting.value = true
    const result = await aiAdminApi.createRecharge(formData)
    ElMessage.success('订单创建成功')
    dialogVisible.value = false
    loadRecharges()

    // 如果有支付链接，直接跳转
    if (result.payUrl) {
      setTimeout(() => {
        window.open(result.payUrl, '_blank')
      }, 1000)
    }
  } catch (e: any) {
    if (e.message) ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadRecharges()
  loadServices()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.form-tip {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
</style>
