<template>
  <div class="model-test">
    <el-card class="test-card">
      <template #header>
        <div class="card-header">
          <span>AI 模型测试</span>
          <el-button type="primary" @click="checkAllModels">批量检测所有模型</el-button>
        </div>
      </template>

      <!-- 选择服务商和模型 -->
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
          <el-select v-model="selectedModelId" placeholder="请选择模型" style="width: 250px" @change="handleModelChange">
            <el-option
              v-for="m in filteredModels"
              :key="m.id"
              :label="m.name"
              :value="m.id"
            >
              <span>{{ m.name }}</span>
              <span v-if="m.type === 'image'" style="margin-left: 8px;" class="model-badge">🎨</span>
              <span v-if="m.lastStatus === 'online'" style="margin-left: 8px; color: #67c23a;">●</span>
              <span v-else-if="m.lastStatus === 'offline'" style="margin-left: 8px; color: #f56c6c;">●</span>
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>

      <!-- 聊天对话区域 -->
      <div class="chat-container">
        <div ref="chatContainerRef" class="chat-messages">
          <div v-for="(msg, index) in chatMessages" :key="index" :class="['message', msg.isUser ? 'user-message' : 'ai-message']">
            <!-- AI 消息 -->
            <template v-if="!msg.isUser">
              <div class="message-avatar ai-avatar">
                <el-icon><Cpu /></el-icon>
              </div>
              <div class="message-content">
                <div class="message-bubble">
                  <!-- 图片生成结果 -->
                  <div v-if="msg.type === 'image'" class="image-result">
                    <div class="image-grid">
                      <div v-for="(img, idx) in msg.images" :key="idx" class="image-item">
                        <img :src="img.url" :alt="img.revisedPrompt || ''" loading="lazy" />
                        <div class="image-actions">
                          <el-button size="small" @click="handleDownloadImage(img)">下载</el-button>
                        </div>
                      </div>
                    </div>
                    <div class="image-meta">
                      <span>⏱ {{ msg.meta?.duration }}ms</span>
                      <span v-if="msg.meta?.tokens">| 💬 {{ msg.meta.tokens }} tokens</span>
                      <span>| 💰 ¥{{ (msg.meta?.cost || 0).toFixed(4) }}</span>
                    </div>
                    <div class="image-actions-bar">
                      <el-button size="small" @click="handleRegenerate">🔄 重新生成</el-button>
                      <el-button size="small" @click="handleCopyPrompt(msg.prompt)">📋 复制提示词</el-button>
                    </div>
                  </div>
                  <!-- 文字消息 -->
                  <div v-else v-html="msg.htmlContent" class="message-text"></div>
                </div>
                <div v-if="msg.meta && msg.type !== 'image'" class="message-meta">
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
                  <div v-if="msg.type === 'image'" class="user-image-tag">🎨 图片生成</div>
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
          <!-- 图片生成参数配置面板 -->
          <div v-if="isImageMode" class="image-config-panel">
            <div class="config-header">
              <span>🎨 图片生成配置</span>
              <el-button link type="primary" size="small" @click="toggleImageMode(false)">收起</el-button>
            </div>
            <div class="config-content">
              <div class="config-row">
                <el-form label-width="70px" size="small">
                  <el-row :gutter="16">
                    <el-col :span="8">
                      <el-form-item label="📐 分辨率">
                        <el-select v-model="imageConfig.size" placeholder="选择尺寸" style="width: 100%">
                          <el-option label="方图 1024×1024" value="1024_1024" />
                          <el-option label="小方图 768×768" value="768_768" />
                          <el-option label="2K 高清" value="2K" />
                          <el-option label="4K 超高清" value="4K" />
                          <el-option label="竖版 1024×1792" value="1024_1792" />
                          <el-option label="横版 1792×1024" value="1792_1024" />
                        </el-select>
                      </el-form-item>
                    </el-col>
                    <el-col :span="8">
                      <el-form-item label="🎨 风格">
                        <el-select v-model="imageConfig.style" placeholder="选择风格" style="width: 100%">
                          <el-option label="🌿 自然" value="natural" />
                          <el-option label="✨ 生动" value="vivid" />
                          <el-option label="📷 写实" value="realistic" />
                          <el-option label="🎭 动漫" value="anime" />
                          <el-option label="🎨 艺术" value="artistic" />
                        </el-select>
                      </el-form-item>
                    </el-col>
                    <el-col :span="8">
                      <el-form-item label="💧 水印">
                        <el-radio-group v-model="imageConfig.watermark">
                          <el-radio :label="true">添加</el-radio>
                          <el-radio :label="false">不添加</el-radio>
                        </el-radio-group>
                      </el-form-item>
                    </el-col>
                  </el-row>
                  <el-row :gutter="16">
                    <el-col :span="8">
                      <el-form-item label="🔢 生成数量">
                        <el-radio-group v-model="imageConfig.n">
                          <el-radio-button :label="1">1</el-radio-button>
                          <el-radio-button :label="2">2</el-radio-button>
                          <el-radio-button :label="4">4</el-radio-button>
                        </el-radio-group>
                      </el-form-item>
                    </el-col>
                    <el-col :span="16">
                      <el-form-item label="💡 创意程度">
                        <el-slider v-model="imageConfig.creativity" :min="0" :max="100" :step="5" show-input />
                      </el-form-item>
                    </el-col>
                  </el-row>
                </el-form>
              </div>

              <!-- 高级选项 -->
              <div class="advanced-options">
                <div class="advanced-header" @click="showAdvanced = !showAdvanced">
                  <span>🔮 高级选项</span>
                  <el-icon><ArrowDown v-if="!showAdvanced" /><ArrowUp v-else /></el-icon>
                </div>
                <div v-show="showAdvanced" class="advanced-content">
                  <el-form label-width="100px" size="small">
                    <el-row :gutter="16">
                      <el-col :span="12">
                        <el-form-item label="🌱 随机种子">
                          <el-input v-model="imageConfig.seed" placeholder="留空为随机" type="number" />
                        </el-form-item>
                      </el-col>
                      <el-col :span="12">
                        <el-form-item label="📤 返回格式">
                          <el-radio-group v-model="imageConfig.responseFormat">
                            <el-radio label="url">URL 链接</el-radio>
                            <el-radio label="b64_json">Base64</el-radio>
                          </el-radio-group>
                        </el-form-item>
                      </el-col>
                    </el-row>
                    <el-form-item label="🚫 负向提示词">
                      <el-input
                        v-model="imageConfig.negativePrompt"
                        placeholder="不希望出现的内容，如：模糊，变形，多余的手指"
                        type="textarea"
                        :rows="2"
                      />
                    </el-form-item>
                    <el-form-item label="🖼️ 参考图 URL">
                      <el-input
                        v-model="imageConfig.referenceImageUrl"
                        placeholder="图片链接地址（可选，用于图生图）"
                      />
                    </el-form-item>
                  </el-form>
                </div>
              </div>
            </div>
          </div>

          <!-- 输入区域 -->
          <div class="input-area">
            <el-button
              v-if="!isImageMode"
              class="mode-trigger"
              size="small"
              type="info"
              @click="toggleImageMode(true)"
            >
              🎨 图片生成
            </el-button>
            <el-input
              v-model="chatInput"
              type="textarea"
              :rows="2"
              :placeholder="inputPlaceholder"
              @keydown.ctrl.enter="handleSendChat"
            />
            <div class="input-actions">
              <span class="input-tip">按 Ctrl+Enter 发送</span>
              <div class="input-buttons">
                <el-button
                  v-if="isImageMode"
                  type="success"
                  :loading="sending"
                  :disabled="!chatInput.trim()"
                  @click="handleSendChat"
                >
                  🎨 生成图片
                </el-button>
                <el-button
                  v-else
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

          <!-- 模式切换 -->
          <div class="mode-switch">
            <el-button
              :type="!isImageMode ? 'primary' : 'info'"
              size="small"
              plain
              @click="toggleImageMode(false)"
            >
              💬 对话模式
            </el-button>
            <el-button
              :type="isImageMode ? 'primary' : 'info'"
              size="small"
              plain
              @click="toggleImageMode(true)"
            >
              🎨 生图模式
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
import { Cpu, User, ArrowDown, ArrowUp } from '@element-plus/icons-vue'
import MarkdownIt from 'markdown-it'
import { aiAdminApi, type AiModel, type AiProvider } from '@/api/ai-admin'

const md = new MarkdownIt()

interface ChatMessage {
  isUser: boolean
  content: string
  type?: 'text' | 'image'
  htmlContent?: string
  images?: Array<{ url: string; revisedPrompt?: string }>
  prompt?: string
  meta?: { duration?: number; tokens?: number; cost?: number }
  loading?: boolean
}

interface ImageConfig {
  size: string
  style: string
  watermark: boolean
  n: number
  creativity: number
  seed?: number
  responseFormat: string
  negativePrompt: string
  referenceImageUrl: string
}

const providers = ref<AiProvider[]>([])
const allModels = ref<AiModel[]>([])
const selectedProviderId = ref<string>('')
const selectedModelId = ref<string>('')
const sending = ref(false)
const chatInput = ref('')
const chatMessages = ref<ChatMessage[]>([])
const chatContainerRef = ref<HTMLElement | null>(null)
const isImageMode = ref(false)
const showAdvanced = ref(false)

// 图片生成配置
const imageConfig = reactive<ImageConfig>({
  size: '1024_1024',
  style: 'natural',
  watermark: true,
  n: 1,
  creativity: 50,
  seed: undefined,
  responseFormat: 'url',
  negativePrompt: '',
  referenceImageUrl: '',
})

const filteredModels = computed(() => {
  if (!selectedProviderId.value) return allModels.value
  return allModels.value.filter(m => m.providerId === selectedProviderId.value)
})

const inputPlaceholder = computed(() => {
  if (isImageMode.value) {
    return '描述你想要生成的图片，例如：一只橘猫在夕阳下的海滩上晒太阳，温暖的光影效果'
  }
  return '请输入你的问题，例如：你好，请介绍一下你自己'
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
  // 如果选择的是图片生成模型，自动切换到生图模式
  const model = allModels.value.find(m => m.id === selectedModelId.value)
  if (model?.type === 'image' && !isImageMode.value) {
    isImageMode.value = true
  }
}

const toggleImageMode = (enable: boolean) => {
  isImageMode.value = enable
  // 切换模式时更新提示词占位符
  if (enable && !chatInput.value) {
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

// 添加风格提示词
const stylePrompts: Record<string, string> = {
  natural: '，自然风格，真实质感',
  vivid: '，生动鲜明，色彩丰富',
  realistic: '，写实风格，照片级真实感',
  anime: '，动漫风格，二次元画风',
  artistic: '，艺术风格，创意绘画',
}

const handleSendChat = async () => {
  if (!selectedModelId.value) {
    ElMessage.warning('请选择模型')
    return
  }
  if (!chatInput.value.trim()) {
    ElMessage.warning('请输入内容')
    return
  }

  const userMessage = chatInput.value.trim()

  // 添加用户消息
  chatMessages.value.push({
    isUser: true,
    content: userMessage,
    type: isImageMode.value ? 'image' : 'text',
  })

  // 添加 AI 消息（初始为 loading 状态）
  chatMessages.value.push({
    isUser: false,
    content: '',
    type: isImageMode.value ? 'image' : 'text',
    loading: true,
  })

  chatInput.value = ''
  scrollToBottom()
  sending.value = true

  const aiMessageIndex = chatMessages.value.length - 1

  try {
    const model = allModels.value.find(m => m.id === selectedModelId.value)

    if (isImageMode.value) {
      // 图片生成模式
      await handleImageGeneration(model!.id, aiMessageIndex, userMessage)
    } else {
      // 对话模式
      await handleChatStream(model!.id, aiMessageIndex)
    }
  } catch (e: any) {
    // 移除 loading 消息
    chatMessages.value.splice(aiMessageIndex, 1)
    chatMessages.value.push({
      isUser: false,
      content: `❌ 错误：${e.message}`,
      type: 'text',
    })
    ElMessage.error(e.message || '请求失败')
  } finally {
    sending.value = false
    scrollToBottom()
  }
}

// 图片生成
const handleImageGeneration = async (modelId: string, aiMessageIndex: number, prompt: string) => {
  const aiMessage = chatMessages.value[aiMessageIndex]
  if (!aiMessage) return

  aiMessage.loading = false
  aiMessage.prompt = prompt

  try {
    const model = allModels.value.find(m => m.id === modelId)

    // 添加风格描述到提示词
    const styleSuffix = stylePrompts[imageConfig.style] || ''
    const finalPrompt = prompt + styleSuffix

    // 构建请求参数（过滤掉 undefined 值）
    const params: any = {
      providerId: selectedProviderId.value,
      model: model?.modelId,
      prompt: finalPrompt,
      size: imageConfig.size,
      style: imageConfig.style,
      n: imageConfig.n,
      watermark: imageConfig.watermark,
    }

    // 只在有值时添加可选参数
    if (imageConfig.seed) {
      params.seed = imageConfig.seed
    }
    if (imageConfig.negativePrompt && imageConfig.negativePrompt.trim()) {
      params.negativePrompt = imageConfig.negativePrompt
    }
    if (imageConfig.referenceImageUrl && imageConfig.referenceImageUrl.trim()) {
      params.referenceImageUrl = imageConfig.referenceImageUrl
    }

    const result = await aiAdminApi.generateImage(params)

    if (result.success && result.images && result.images.length > 0) {
      aiMessage.type = 'image'
      aiMessage.images = result.images
      aiMessage.meta = {
        duration: result.duration,
        cost: result.cost,
      }
      ElMessage.success('图片生成成功')
    } else {
      aiMessage.content = `❌ 生成失败：${result.error || '未知错误'}`
      ElMessage.error(`生成失败：${result.error}`)
    }
  } catch (e: any) {
    aiMessage.content = `❌ 错误：${e.message}`
    throw e
  }
}

// 流式对话（SSE）
const handleChatStream = async (modelId: string, aiMessageIndex: number) => {
  const aiMessage = chatMessages.value[aiMessageIndex]
  if (!aiMessage) return

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
        mode: 'chat',
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
              fullContent += parsed.content
              aiMessage.content = fullContent
              aiMessage.htmlContent = md.render(fullContent)
              scrollToBottom()
            } else if (parsed.type === 'done') {
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

const handleRegenerate = () => {
  // 找到最后一个图片生成请求
  const lastImageMessage = [...chatMessages.value].reverse().find(msg => msg.type === 'image' && msg.prompt)
  if (lastImageMessage && lastImageMessage.prompt) {
    chatInput.value = lastImageMessage.prompt
    handleSendChat()
  } else {
    ElMessage.warning('没有找到可重新生成的图片')
  }
}

const handleCopyPrompt = (prompt?: string) => {
  if (!prompt) {
    ElMessage.warning('没有可复制的提示词')
    return
  }
  navigator.clipboard.writeText(prompt).then(() => {
    ElMessage.success('提示词已复制')
  })
}

const handleDownloadImage = (img: { url: string }) => {
  const link = document.createElement('a')
  link.href = img.url
  link.download = `ai-image-${Date.now()}.png`
  link.target = '_blank'
  link.click()
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
  min-height: 700px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.test-form {
  margin-bottom: 16px;
}

.model-badge {
  font-size: 12px;
}

/* 聊天容器 */
.chat-container {
  display: flex;
  flex-direction: column;
  height: 550px;
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

/* 图片结果 */
.image-result {
  width: 100%;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.image-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
  aspect-ratio: 1;
}

.image-item:hover {
  transform: scale(1.02);
}

.image-item img {
  width: 100%;
  height: 100%;
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
  justify-content: center;
}

.image-meta {
  font-size: 12px;
  color: #909399;
  padding: 8px 0;
  display: flex;
  gap: 12px;
}

.image-actions-bar {
  display: flex;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid #eee;
}

.user-image-tag {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 4px;
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

/* 输入区域 */
.chat-input-wrapper {
  border-top: 1px solid #e4e7ed;
  padding: 16px;
  background: white;
}

.image-config-panel {
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  margin-bottom: 16px;
  overflow: hidden;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 14px;
  font-weight: 500;
}

.config-content {
  padding: 16px;
}

.config-row {
  margin-bottom: 16px;
}

.advanced-options {
  margin-top: 16px;
  border-top: 1px solid #e4e7ed;
  padding-top: 12px;
}

.advanced-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 8px 0;
  color: #667eea;
  font-size: 13px;
}

.advanced-content {
  margin-top: 12px;
}

.input-area {
  position: relative;
}

.mode-trigger {
  position: absolute;
  top: -36px;
  left: 0;
  z-index: 10;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.input-tip {
  font-size: 12px;
  color: #909399;
}

.input-buttons {
  display: flex;
  gap: 8px;
}

.mode-switch {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #eee;
}
</style>
