<template>
  <div class="model-test">
    <el-card class="test-card">
      <template #header>
        <div class="card-header">
          <span>AI 模型测试</span>
          <el-button type="primary" @click="checkAllModels">批量检测所有模型</el-button>
        </div>
      </template>

      <!-- 选择模型 -->
      <el-form :inline="true" class="test-form">
        <el-form-item label="服务商">
          <el-select v-model="selectedProviderId" placeholder="请选择服务商" style="width: 200px" @change="handleProviderChange">
            <el-option
              v-for="p in providers"
              :key="p.id"
              :label="p.name"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="模型">
          <el-select v-model="selectedModelId" placeholder="请选择模型" style="width: 200px" @change="handleModelChange">
            <el-option
              v-for="m in filteredModels"
              :key="m.id"
              :label="m.name"
              :value="m.id"
            >
              <span>{{ m.name }}</span>
              <span v-if="m.lastStatus === 'online'" style="margin-left: 8px; color: #67c23a;">●</span>
              <span v-else-if="m.lastStatus === 'offline'" style="margin-left: 8px; color: #f56c6c;">●</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="测试模式">
          <el-select v-model="testMode" placeholder="请选择模式" style="width: 150px" @change="handleModeChange">
            <el-option label="普通对话" value="chat" />
            <el-option label="模拟病人" value="mock_patient" />
            <el-option label="图片生成" value="image" />
          </el-select>
        </el-form-item>
      </el-form>

      <!-- System Prompt 提示 -->
      <el-alert
        v-if="testMode === 'mock_patient'"
        title="模拟病人模式"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 16px"
      >
        <template #default>
          你是一名标准化病人（SP），主诉：反复胃脘部隐痛 3 个月，伴随神疲乏力、食欲不振。请以患者口吻回答。
        </template>
      </el-alert>

      <!-- 图片生成配置面板 -->
      <div v-if="testMode === 'image'" class="image-config">
        <el-card class="config-card">
          <template #header>
            <div class="config-header">
              <span>🎨 图片生成配置</span>
            </div>
          </template>
          <el-form label-width="80px" size="small">
            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="尺寸">
                  <el-select v-model="imageConfig.size" style="width: 100%">
                    <el-option label="1024×1024" value="1024x1024" />
                    <el-option label="1024×1792 (竖版)" value="1024x1792" />
                    <el-option label="1792×1024 (横版)" value="1792x1024" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="质量">
                  <el-select v-model="imageConfig.quality" style="width: 100%">
                    <el-option label="标准" value="standard" />
                    <el-option label="高清" value="hd" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="风格">
                  <el-select v-model="imageConfig.style" style="width: 100%">
                    <el-option label="自然" value="natural" />
                    <el-option label="生动" value="vivid" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="生成数量">
                  <el-radio-group v-model="imageConfig.n">
                    <el-radio-button :label="1">1</el-radio-button>
                    <el-radio-button :label="2">2</el-radio-button>
                    <el-radio-button :label="4">4</el-radio-button>
                  </el-radio-group>
                </el-form-item>
              </el-col>
              <el-col :span="16">
                <el-form-item label="提示词">
                  <el-input
                    v-model="imageConfig.prompt"
                    placeholder="详细描述你想要生成的图片，包括主体、背景、风格、色彩等..."
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
          <div style="margin-top: 16px; text-align: right;">
            <el-button
              type="primary"
              :loading="sending"
              :disabled="!imageConfig.prompt.trim()"
              @click="handleGenerateImage"
            >
              生成图片
            </el-button>
          </div>
        </el-card>

        <!-- 图片生成结果 -->
        <div v-if="generatedImages.length > 0" class="image-results">
          <div class="results-header">
            <span>✅ 生成成功</span>
            <span>⏱ {{ imageDuration }}ms | 💰 ¥{{ imageCost?.toFixed(4) }}</span>
            <div>
              <el-button size="small" @click="handleDownloadAll">下载全部</el-button>
              <el-button size="small" @click="handleRegenerate">重新生成</el-button>
            </div>
          </div>
          <div class="image-grid">
            <div v-for="(img, idx) in generatedImages" :key="idx" class="image-item">
              <img :src="img.url" :alt="img.revisedPrompt || ''" loading="lazy" />
              <div class="image-actions">
                <el-button size="small" @click="handleDownloadImage(img)">下载</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 聊天对话区域 -->
      <div v-else class="chat-container">
        <div ref="chatContainerRef" class="chat-messages">
          <div v-for="(msg, index) in chatMessages" :key="index" :class="['message', msg.isUser ? 'user-message' : 'ai-message']">
            <!-- AI 消息 -->
            <template v-if="!msg.isUser">
              <div class="message-avatar ai-avatar">
                <el-icon><Cpu /></el-icon>
              </div>
              <div class="message-content">
                <div class="message-bubble">
                  <div v-html="msg.htmlContent" class="message-text"></div>
                </div>
                <div v-if="msg.meta" class="message-meta">
                  <span>⏱ {{ msg.meta.duration }}ms</span>
                  <span v-if="msg.meta.tokens">| 💬 {{ msg.meta.tokens }} tokens</span>
                  <span>| 💰 ¥{{ (msg.meta.cost || 0).toFixed(6) }}</span>
                </div>
                <div v-if="msg.loading" class="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </template>
            <!-- 用户消息 -->
            <template v-else>
              <div class="message-content">
                <div class="message-bubble user-bubble">
                  <div class="message-text">{{ msg.content }}</div>
                </div>
              </div>
              <div class="message-avatar user-avatar">
                <el-icon><User /></el-icon>
              </div>
            </template>
          </div>
        </div>

        <!-- 输入框 -->
        <div class="chat-input-wrapper">
          <el-input
            v-model="chatInput"
            type="textarea"
            :rows="3"
            :placeholder="inputPlaceholder"
            @keydown.ctrl.enter="handleSendChat"
          />
          <div class="chat-input-actions">
            <span class="input-tip">按 Ctrl+Enter 发送</span>
            <el-button
              type="primary"
              :loading="sending"
              :disabled="!chatInput.trim()"
              @click="handleSendChat"
            >
              发送
            </el-button>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Cpu, User } from '@element-plus/icons-vue'
import MarkdownIt from 'markdown-it'
import { aiAdminApi, type AiModel, type AiProvider } from '@/api/ai-admin'

const md = new MarkdownIt()

interface ChatMessage {
  isUser: boolean
  content: string
  htmlContent?: string
  meta?: { duration?: number; tokens?: number; cost?: number }
  loading?: boolean
}

const providers = ref<AiProvider[]>([])
const allModels = ref<AiModel[]>([])
const selectedProviderId = ref<string>('')
const selectedModelId = ref<string>('')
const testMode = ref<'chat' | 'mock_patient' | 'image'>('chat')
const sending = ref(false)
const chatInput = ref('')
const chatMessages = ref<ChatMessage[]>([])
const chatContainerRef = ref<HTMLElement | null>(null)

// 图片生成相关
const imageConfig = reactive({
  size: '1024x1024',
  quality: 'standard',
  style: 'natural',
  n: 1,
  prompt: '',
})
const generatedImages = ref<Array<{ url: string; revisedPrompt?: string }>>([])
const imageDuration = ref(0)
const imageCost = ref(0)

const filteredModels = computed(() => {
  if (!selectedProviderId.value) return allModels.value
  return allModels.value.filter(m => m.providerId === selectedProviderId.value)
})

const inputPlaceholder = computed(() => {
  if (testMode.value === 'mock_patient') {
    return '请输入问诊问题，例如：你好，我最近胃痛，帮我分析一下可能是什么原因？'
  }
  return '请输入测试问题，例如：你好，请介绍一下你自己'
})

const loadProviders = async () => {
  providers.value = await aiAdminApi.getProviders()
  if (providers.value.length > 0) {
    selectedProviderId.value = providers.value[0].id
    loadModels()
  }
}

const loadModels = async () => {
  try {
    allModels.value = await aiAdminApi.getModels()
  } catch (e: any) {
    ElMessage.error(e.message || '加载模型失败')
  }
}

const handleProviderChange = () => {
  selectedModelId.value = ''
  if (selectedProviderId.value) {
    const models = filteredModels.value
    if (models.length > 0) {
      selectedModelId.value = models[0].id
    }
  }
}

const handleModelChange = () => {
  // 选择模型后，自动填充一些测试问题
  if (testMode.value === 'mock_patient') {
    chatInput.value = '你好，我最近胃痛，帮我分析一下可能是什么原因？'
  } else {
    chatInput.value = '你好，请介绍一下你自己'
  }
}

const handleModeChange = () => {
  // 切换模式时清空对话
  chatMessages.value = []
  generatedImages.value = []
  if (testMode.value === 'mock_patient') {
    chatInput.value = '你好，我最近胃痛，帮我分析一下可能是什么原因？'
  } else {
    chatInput.value = ''
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainerRef.value) {
      chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
    }
  })
}

const handleSendChat = async () => {
  if (!selectedModelId.value) {
    ElMessage.warning('请选择模型')
    return
  }
  if (!chatInput.value.trim()) {
    ElMessage.warning('请输入问题')
    return
  }

  const userMessage = chatInput.value.trim()

  // 添加用户消息
  chatMessages.value.push({
    isUser: true,
    content: userMessage,
  })

  // 添加 AI 消息（初始为 loading 状态）
  chatMessages.value.push({
    isUser: false,
    content: '',
    loading: true,
  })

  chatInput.value = ''
  scrollToBottom()
  sending.value = true

  const aiMessageIndex = chatMessages.value.length - 1

  try {
    const model = allModels.value.find(m => m.id === selectedModelId.value)

    // 检查是否为图片模型
    if (model?.type === 'image') {
      ElMessage.warning('该模型为图片生成模型，请在图片生成模式下使用')
      chatMessages.value.pop()
      chatMessages.value.push({
        isUser: false,
        content: '❌ 该模型为图片生成模型，不支持对话测试。请选择文本对话模型或在图片生成模式下使用。',
      })
      sending.value = false
      return
    }

    // 使用流式对话（SSE）
    await handleChatStream(model!.id, aiMessageIndex)
  } catch (e: any) {
    // 移除 loading 消息
    chatMessages.value.splice(aiMessageIndex, 1)
    chatMessages.value.push({
      isUser: false,
      content: `❌ 请求失败：${e.message}`,
    })
    ElMessage.error(e.message || '请求失败')
  } finally {
    sending.value = false
    scrollToBottom()
  }
}

// 流式对话（SSE）
const handleChatStream = async (modelId: string, aiMessageIndex: number) => {
  const aiMessage = chatMessages.value[aiMessageIndex]
  if (!aiMessage) return

  // 移除 loading 状态
  aiMessage.loading = false

  try {
    const token = localStorage.getItem('token')
    const response = await fetch('/api/ai/admin/models/' + modelId + '/chat-stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        providerId: selectedProviderId.value,
        message: chatMessages.value[chatMessages.value.length - 2]?.content || '',
        mode: testMode.value,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '请求失败' }))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法读取响应流')
    }

    const decoder = new TextDecoder()
    let fullContent = ''
    let stats: { duration?: number; tokens?: number; cost?: number } = {}

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)

            if (parsed.type === 'content') {
              // 追加内容
              fullContent += parsed.content
              aiMessage.content = fullContent
              aiMessage.htmlContent = md.render(fullContent)
              scrollToBottom()
            } else if (parsed.type === 'done') {
              // 完成，显示统计
              stats = {
                duration: parsed.duration,
                tokens: parsed.tokens,
                cost: parsed.cost,
              }
              aiMessage.meta = stats
            } else if (parsed.type === 'error') {
              throw new Error(parsed.error)
            }
          } catch (e) {
            // 忽略 JSON 解析错误
          }
        }
      }
    }

    if (!fullContent) {
      aiMessage.content = '无回复内容'
      aiMessage.htmlContent = md.render('无回复内容')
    }
  } catch (e: any) {
    aiMessage.content = `❌ 错误：${e.message}`
    aiMessage.htmlContent = md.render(`❌ 错误：${e.message}`)
    throw e
  }
}

// 图片生成
const handleGenerateImage = async () => {
  if (!selectedProviderId.value) {
    ElMessage.warning('请选择服务商')
    return
  }
  if (!imageConfig.prompt.trim()) {
    ElMessage.warning('请输入图片描述')
    return
  }

  generatedImages.value = []
  sending.value = true

  try {
    const result = await aiAdminApi.generateImage({
      providerId: selectedProviderId.value,
      prompt: imageConfig.prompt,
      size: imageConfig.size,
      quality: imageConfig.quality,
      style: imageConfig.style,
      n: imageConfig.n,
    })

    if (result.success && result.images) {
      generatedImages.value = result.images
      imageDuration.value = result.duration || 0
      imageCost.value = result.cost || 0
      ElMessage.success('图片生成成功')
    } else {
      ElMessage.error(`生成失败：${result.error}`)
    }
  } catch (e: any) {
    ElMessage.error(e.message || '生成失败')
  } finally {
    sending.value = false
  }
}

const handleRegenerate = () => {
  handleGenerateImage()
}

const handleDownloadImage = (img: { url: string }) => {
  const link = document.createElement('a')
  link.href = img.url
  link.download = `ai-image-${Date.now()}.png`
  link.target = '_blank'
  link.click()
}

const handleDownloadAll = () => {
  generatedImages.value.forEach((img, idx) => {
    setTimeout(() => {
      handleDownloadImage(img)
    }, idx * 200)
  })
}

// 批量检测所有模型
const checkAllModels = async () => {
  const loading = ElMessageBox.alert('正在检测所有模型状态，请稍候...', '检测中', {
    closeOnClickModal: false,
    showClose: false,
  })
  try {
    await aiAdminApi.checkAllModels()
    await loadModels()
    ElMessage.success('模型状态检测完成')
    loading.close()
  } catch (e: any) {
    ElMessage.error(e.message || '检测失败')
    loading.close()
  }
}

onMounted(() => {
  loadProviders()
  loadModels()
})
</script>

<style scoped>
.model-test {
  padding: 0;
}

.test-card {
  min-height: 600px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.test-form {
  margin-bottom: 16px;
}

/* 图片生成配置 */
.image-config {
  margin-bottom: 20px;
}

.config-card {
  margin-bottom: 16px;
}

.config-header {
  font-size: 14px;
  font-weight: 500;
}

.image-results {
  margin-top: 16px;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: linear-gradient(135deg, #67c23a1a 0%, #67c23a0d 100%);
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #606266;
}

.results-header span:first-child {
  font-weight: 500;
  color: #67c23a;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.image-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.image-item:hover {
  transform: translateY(-4px);
}

.image-item img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
}

.image-actions {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  display: flex;
  justify-content: flex-end;
}

/* 聊天容器 */
.chat-container {
  display: flex;
  flex-direction: column;
  height: 500px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f5f7fa;
}

.message {
  display: flex;
  margin-bottom: 20px;
  gap: 12px;
}

.message.user-message {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 20px;
}

.ai-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.user-avatar {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.message-content {
  max-width: 70%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-message .message-content {
  align-items: flex-end;
}

.message-bubble {
  padding: 12px 16px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.user-bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.message-text {
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.message-text :deep(p) {
  margin: 0;
}

.message-text :deep(pre) {
  background: #282c34;
  color: #abb2bf;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 8px 0;
}

.message-text :deep(code) {
  font-family: 'Consolas', 'Monaco', monospace;
}

.message-text :deep(:not(pre) > code) {
  background: rgba(0, 0, 0, 0.1);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 13px;
}

.user-bubble .message-text :deep(:not(pre) > code) {
  background: rgba(255, 255, 255, 0.2);
}

.message-meta {
  font-size: 12px;
  color: #909399;
  display: flex;
  gap: 8px;
}

.user-message .message-meta {
  color: #909399;
}

/* 打字动画 */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #909399;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.7;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
}

/* 输入框 */
.chat-input-wrapper {
  border-top: 1px solid #e4e7ed;
  padding: 16px;
  background: white;
}

.chat-input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.input-tip {
  font-size: 12px;
  color: #909399;
}
</style>
