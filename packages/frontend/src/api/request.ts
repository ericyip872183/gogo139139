import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

const request = axios.create({
  baseURL: '/api',
  timeout: 15000,  // 默认 15 秒
})

// 图片生成接口需要更长时间，单独创建实例
const imageRequest = axios.create({
  baseURL: '/api',
  timeout: 120000,  // 120 秒（2 分钟），生图可能需要很长时间
})

// 请求拦截：自动携带 Token，清除空字符串参数
const setupRequestInterceptor = (req: typeof request) => {
  req.interceptors.request.use((config) => {
    // 直接从 localStorage 读取 token，避免在拦截器中使用 useAuthStore()
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // 过滤掉值为空字符串的 query 参数，避免触发后端枚举校验错误
    if (config.params) {
      const cleaned: Record<string, any> = {}
      for (const [k, v] of Object.entries(config.params)) {
        if (v !== '' && v !== null && v !== undefined) cleaned[k] = v
      }
      config.params = cleaned
    }

    // ━━━ AI 导入调试日志：在 F12 显示发送给豆包的请求内容 ━━━
    if (config.url?.includes('/ai-import/upload')) {
      console.log('\n' + '='.repeat(80))
      console.log('【AI 导入 - 发送给豆包的请求】')
      console.log('时间:', new Date().toLocaleString('zh-CN'))
      console.log('接口:', config.url)
      console.log('方法:', config.method?.toUpperCase())

      // 如果是 FormData，显示文件信息
      if (config.data instanceof FormData) {
        const files: File[] = []
        const otherFields: Record<string, any> = {}
        config.data.forEach((value, key) => {
          if (value instanceof File) {
            files.push({
              name: value.name,
              size: value.size,
              type: value.type,
            })
          } else {
            otherFields[key] = value
          }
        })
        console.log('文件信息:', files)
        console.log('其他字段:', otherFields)
      } else {
        console.log('请求体:', config.data)
      }

      console.log('='.repeat(80) + '\n')
    }

    return config
  })
  return req
}

setupRequestInterceptor(request)
setupRequestInterceptor(imageRequest)

// 响应拦截：统一错误处理
const setupResponseInterceptor = (req: typeof request) => {
  req.interceptors.response.use(
    (response) => response.data.data,  // 直接返回 data 字段
    (error) => {
      const status = error.response?.status
      const message = error.response?.data?.message ?? '请求失败'
      const errors = error.response?.data?.errors // NestJS 可能返回 errors 数组

      console.error('[API 错误]', {
        status,
        message,
        errors,
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data
      })

      if (status === 401) {
        // 直接清理 localStorage 并跳转登录页
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('modules')
        router.push('/login')
        ElMessage.error('登录已失效，请重新登录')
      } else {
        // 400 错误时显示详细错误信息
        if (status === 400 && errors) {
          ElMessage.error(`验证失败：${errors.join(', ')}`)
        } else {
          ElMessage.error(message)
        }
      }
      return Promise.reject(error)
    },
  )
  return req
}

setupResponseInterceptor(request)
setupResponseInterceptor(imageRequest)

// 添加导出长超时请求实例的方法
export function getImageRequest() {
  return imageRequest
}

export default request
