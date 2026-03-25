<template>
  <div class="model-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>AI 模型管理</span>
          <el-button type="primary" @click="handleAdd">新增模型</el-button>
        </div>
      </template>

      <el-form :inline="true" class="filter-form">
        <el-form-item label="服务商">
          <el-select v-model="filterProviderId" placeholder="全部" clearable @change="loadModels">
            <el-option label="全部" value="" />
            <el-option
              v-for="p in providers"
              :key="p.id"
              :label="p.name"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <el-table :data="models" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="180" />
        <el-table-column label="类型" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.type === 'image'" type="warning" size="small">图片</el-tag>
            <el-tag v-else type="info" size="small">对话</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="连接状态" width="120">
          <template #default="{ row }">
            <div class="status-indicator">
              <span
                class="status-dot"
                :class="getStatusClass(row)"
                :title="getStatusTitle(row)"
              ></span>
              <el-button
                v-if="row.isEnabled"
                link
                type="primary"
                size="small"
                @click="handleCheckStatus(row)"
              >
                <el-icon><Refresh /></el-icon>
              </el-button>
              <el-tag v-if="row.lastStatus === 'error' && row.lastError" type="warning" size="small" class="error-tag">
                <el-tooltip :content="row.lastError" placement="top" :max-width="300">
                  <el-icon><Warning /></el-icon>
                </el-tooltip>
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="模型名称" width="150" />
        <el-table-column prop="modelId" label="模型 ID/EP" min-width="200">
          <template #default="{ row }">
            <el-tag v-if="row.isEp" type="warning" size="small">EP</el-tag>
            {{ row.modelId }}
          </template>
        </el-table-column>
        <el-table-column prop="provider.name" label="服务商" width="120" />
        <el-table-column label="价格 (输入/输出)" width="150">
          <template #default="{ row }">
            ¥{{ row.inputPrice }}/¥{{ row.outputPrice }}
          </template>
        </el-table-column>
        <el-table-column label="启用状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.isEnabled ? 'success' : 'danger'" size="small">
              {{ row.isEnabled ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
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
      :title="isEdit ? '编辑模型' : '新增模型'"
      width="500px"
      @close="handleClose"
    >
      <el-form ref="formRef" :model="formData" :rules="rules" label-width="100px">
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
        <el-form-item label="模型类型" prop="type">
          <el-radio-group v-model="formData.type">
            <el-radio label="chat">文本对话</el-radio>
            <el-radio label="image">图片生成</el-radio>
          </el-radio-group>
          <div class="form-tip">图片生成模型用于文生图功能</div>
        </el-form-item>
        <el-form-item label="模型名称" prop="name">
          <el-input v-model="formData.name" placeholder="例如：豆包轻量大模型" />
        </el-form-item>
        <el-form-item label="模型 ID/EP" prop="modelId">
          <el-input v-model="formData.modelId" placeholder="model-id 或 ep-xxxxx" />
        </el-form-item>
        <el-form-item label="EP 模式">
          <el-switch v-model="formData.isEp" />
          <div class="form-tip">火山引擎豆包大模型使用 EP 模式</div>
        </el-form-item>
        <el-form-item label="输入价格" prop="inputPrice">
          <el-input-number v-model="formData.inputPrice" :min="0" :step="0.000001" placeholder="元/千 tokens" style="width: 100%" />
          <div class="form-tip">单位：元/千 tokens</div>
        </el-form-item>
        <el-form-item label="输出价格" prop="outputPrice">
          <el-input-number v-model="formData.outputPrice" :min="0" :step="0.000001" placeholder="元/千 tokens" style="width: 100%" />
          <div class="form-tip">图片生成模型只需填写输入价格</div>
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
import { ElMessage, ElMessageBox, ElTooltip } from 'element-plus'
import { Refresh, Warning } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { aiAdminApi, type AiModel, type AiProvider } from '@/api/ai-admin'

const models = ref<AiModel[]>([])
const providers = ref<AiProvider[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const filterProviderId = ref<string>('')
const formRef = ref<FormInstance>()

const formData = reactive<Partial<AiModel> & { type?: string }>({
  providerId: '',
  name: '',
  modelId: '',
  type: 'chat',
  isEp: false,
  inputPrice: 0,
  outputPrice: 0,
  isEnabled: true,
})

const rules: FormRules = {
  providerId: [{ required: true, message: '请选择服务商', trigger: 'change' }],
  name: [{ required: true, message: '请输入模型名称', trigger: 'blur' }],
  modelId: [{ required: true, message: '请输入模型 ID 或 EP', trigger: 'blur' }],
  type: [{ required: true, message: '请选择模型类型', trigger: 'change' }],
}

const loadProviders = async () => {
  try {
    providers.value = await aiAdminApi.getProviders()
  } catch (e: any) {
    ElMessage.error(e.message || '加载服务商失败')
    providers.value = []
  }
}

const loadModels = async () => {
  loading.value = true
  try {
    models.value = await aiAdminApi.getModels(filterProviderId.value || undefined)
  } catch (e: any) {
    ElMessage.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  isEdit.value = false
  Object.assign(formData, {
    providerId: providers.value[0]?.id || '',
    name: '',
    modelId: '',
    type: 'chat',
    isEp: false,
    inputPrice: 0,
    outputPrice: 0,
    isEnabled: true,
  })
  dialogVisible.value = true
}

const handleEdit = (row: AiModel) => {
  isEdit.value = true
  Object.assign(formData, {
    id: row.id,
    providerId: row.providerId,
    name: row.name,
    modelId: row.modelId,
    type: row.type || 'chat',
    isEp: row.isEp,
    inputPrice: row.inputPrice,
    outputPrice: row.outputPrice,
    isEnabled: row.isEnabled,
  })
  dialogVisible.value = true
}

const handleDelete = async (row: AiModel) => {
  try {
    await ElMessageBox.confirm(`确定删除模型 "${row.name}" 吗？`, '确认删除', {
      type: 'warning',
    })
    await aiAdminApi.deleteModel(row.id)
    ElMessage.success('删除成功')
    loadModels()
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
    const data: any = {
      providerId: formData.providerId,
      name: formData.name,
      modelId: formData.modelId,
      type: formData.type || 'chat',
      isEp: formData.isEp,
      inputPrice: formData.inputPrice,
      outputPrice: formData.outputPrice,
      isEnabled: formData.isEnabled,
    }
    if (isEdit.value && formData.id) {
      await aiAdminApi.updateModel(formData.id, data)
      ElMessage.success('更新成功')
      // 更新后自动检测状态
      if (formData.isEnabled && formData.type === 'chat') {
        await checkSingleModelStatus(formData.id!)
      }
    } else {
      await aiAdminApi.createModel(data)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadModels()
  } catch (e: any) {
    if (e.message) ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}

// 获取状态灯样式
const getStatusClass = (row: AiModel) => {
  if (!row.isEnabled) return 'disabled'
  if (!row.lastStatus) return 'unknown'
  if (row.lastStatus === 'online') return 'online'
  if (row.lastStatus === 'offline') return 'offline'
  if (row.lastStatus === 'error') return 'error'
  return 'unknown'
}

// 获取状态提示
const getStatusTitle = (row: AiModel) => {
  if (!row.isEnabled) return '已禁用'
  if (!row.lastStatus) return '未检测'
  if (row.lastStatus === 'online') return '连接正常'
  if (row.lastStatus === 'offline') return '连接失败'
  if (row.lastStatus === 'error') return `错误：${row.lastError || '未知错误'}`
  return '未知状态'
}

// 检测单个模型状态
const handleCheckStatus = async (row: AiModel) => {
  try {
    const result = await aiAdminApi.testModel(row.id, {
      providerId: row.providerId,
      message: 'Hello',
    })
    if (result.success) {
      ElMessage.success('模型连接正常')
    } else {
      // 显示详细错误信息
      const errorMsg = result.error || '未知错误'
      ElMessageBox.alert(
        `可能的问题：
1. API Key 无效或已过期
2. 模型 ID/EP 填写错误
3. 服务商 API 地址配置错误
4. 账户余额不足
5. 网络连接问题

详细错误：${errorMsg}`,
        `模型测试失败`,
        {
          dangerouslyUseHTMLString: true,
          confirmButtonText: '确定',
          type: 'error',
        }
      )
    }
    loadModels()
  } catch (e: any) {
    ElMessageBox.alert(
      `可能的问题：
1. 后端服务未启动
2. 接口请求失败
3. 服务商配置不存在

详细错误：${e.message || '未知错误'}`,
      `检测失败`,
      {
        dangerouslyUseHTMLString: true,
        confirmButtonText: '确定',
        type: 'error',
      }
    )
  }
}

// 检测单个模型状态（不显示消息）
const checkSingleModelStatus = async (modelId: string) => {
  try {
    await aiAdminApi.getModelStatus(modelId)
  } catch (e) {
    console.error('检测模型状态失败', e)
  }
}

onMounted(() => {
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
.status-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
}
.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}
.status-dot.online {
  background-color: #67c23a;
  box-shadow: 0 0 6px #67c23a;
}
.status-dot.offline {
  background-color: #f56c6c;
  box-shadow: 0 0 6px #f56c6c;
}
.status-dot.error {
  background-color: #e6a23c;
  box-shadow: 0 0 6px #e6a23c;
}
.status-dot.disabled {
  background-color: #909399;
  box-shadow: 0 0 6px #909399;
}
.status-dot.unknown {
  background-color: #dcdfe6;
  box-shadow: 0 0 6px #dcdfe6;
}
.error-tag {
  cursor: pointer;
}
</style>
