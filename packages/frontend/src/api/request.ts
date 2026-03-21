import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

const request = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

// 请求拦截：自动携带 Token，清除空字符串参数
request.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`
  }
  // 过滤掉值为空字符串的 query 参数，避免触发后端枚举校验错误
  if (config.params) {
    const cleaned: Record<string, any> = {}
    for (const [k, v] of Object.entries(config.params)) {
      if (v !== '' && v !== null && v !== undefined) cleaned[k] = v
    }
    config.params = cleaned
  }
  return config
})

// 响应拦截：统一错误处理
request.interceptors.response.use(
  (response) => response.data.data,  // 直接返回 data 字段
  (error) => {
    const status = error.response?.status
    const message = error.response?.data?.message ?? '请求失败'

    if (status === 401) {
      const auth = useAuthStore()
      auth.logout()
      router.push('/login')
      ElMessage.error('登录已失效，请重新登录')
    } else {
      ElMessage.error(message)
    }
    return Promise.reject(error)
  },
)

export default request
