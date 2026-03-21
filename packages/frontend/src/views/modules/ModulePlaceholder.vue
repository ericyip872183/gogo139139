<!--
  文件：views/modules/ModulePlaceholder.vue
  说明：专业模块占位页，8个模块共用此组件，根据路由 code 动态展示模块信息
  权限：已购该模块的机构用户
-->
<template>
  <div class="module-placeholder">
    <div v-if="info" class="module-card">
      <!-- 头部 -->
      <div class="card-header">
        <div class="title-row">
          <h1 class="module-title">{{ info.name }}</h1>
          <el-tag :type="info.phase === '二期' ? 'warning' : 'danger'" size="large">
            {{ info.phase }}
          </el-tag>
          <el-tag type="info" size="large">{{ info.type }}</el-tag>
        </div>
        <div class="status-badge">
          <el-icon class="spin"><Loading /></el-icon>
          <span>模块开发中，即将上线</span>
        </div>
      </div>

      <!-- 功能介绍 -->
      <el-divider />
      <div class="section">
        <h3 class="section-title">核心功能</h3>
        <ul class="feature-list">
          <li v-for="(f, i) in info.features" :key="i">
            <el-icon color="#67c23a"><CircleCheck /></el-icon>
            <span>{{ f }}</span>
          </li>
        </ul>
      </div>

      <!-- 发布计划 -->
      <el-divider />
      <div class="section">
        <h3 class="section-title">发布计划</h3>
        <el-timeline>
          <el-timeline-item
            v-for="item in info.timeline"
            :key="item.label"
            :type="item.done ? 'success' : 'primary'"
            :hollow="!item.done"
          >
            <span :class="{ done: item.done }">{{ item.label }}</span>
          </el-timeline-item>
        </el-timeline>
      </div>

      <!-- 底部提示 -->
      <el-alert
        type="info"
        :closable="false"
        class="bottom-alert"
        title="您的机构已获得此模块授权，模块上线后将自动开通完整功能。"
        show-icon
      />
    </div>

    <!-- 未找到模块 -->
    <el-empty v-else description="未找到该模块信息" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Loading, CircleCheck } from '@element-plus/icons-vue'

interface ModuleInfo {
  name: string
  phase: string
  type: string
  features: string[]
  timeline: { label: string; done: boolean }[]
}

const MODULE_INFO: Record<string, ModuleInfo> = {
  TCM_CONSTITUTION: {
    name: '体质辨识教学',
    phase: '二期',
    type: '纯软件',
    features: [
      '11套标准化问卷，覆盖平和质、气虚质等9种体质',
      '60+证型辨识，智能分析体质偏颇程度',
      '体质雷达图可视化（ECharts）',
      '支持批量测评、历史记录存档',
      '个性化调养建议与健康指导输出',
    ],
    timeline: [
      { label: '一期：母本考试系统（已完成）', done: true },
      { label: '二期：体质辨识教学模块（开发中）', done: false },
      { label: '二期：耳穴教学模块', done: false },
    ],
  },
  TCM_EAR: {
    name: '耳穴教学',
    phase: '二期',
    type: '3D虚拟仿真',
    features: [
      'OSCE标准化考核流程',
      '耳穴埋籽全流程操作指导',
      '3D耳廓模型展示穴位精准分布',
      '四诊合参综合训练',
      '考核成绩自动回传母本成绩系统',
    ],
    timeline: [
      { label: '一期：母本考试系统（已完成）', done: true },
      { label: '二期：耳穴教学模块（开发中）', done: false },
    ],
  },
  TCM_MERIDIAN: {
    name: '经络采集分析',
    phase: '三期',
    type: '硬件+软件',
    features: [
      '十二经络电信号实时采集',
      '多维度诊断报告自动生成',
      '硬件设备无缝对接（Web Serial/Bluetooth）',
      '采集数据可视化与历史对比分析',
      '考核成绩自动回传母本成绩系统',
    ],
    timeline: [
      { label: '一期：母本考试系统（已完成）', done: true },
      { label: '二期：纯软件模块', done: false },
      { label: '三期：经络采集分析模块（规划中）', done: false },
    ],
  },
  TCM_FOURDIAG: {
    name: '中医四诊采集分析',
    phase: '三期',
    type: '硬件+软件',
    features: [
      '舌诊3D解剖智能分析',
      '面诊/脉诊/闻诊/问诊多模态采集',
      '四诊合参综合诊断报告',
      '硬件采集设备统一对接',
      'AI辅助诊断与评分',
    ],
    timeline: [
      { label: '一期：母本考试系统（已完成）', done: true },
      { label: '二期：纯软件模块', done: false },
      { label: '三期：中医四诊采集分析模块（规划中）', done: false },
    ],
  },
  TCM_ACUPUNCTURE: {
    name: '针刺手法采集',
    phase: '三期',
    type: '硬件+VR',
    features: [
      '智能针灸模拟盒+传感针具',
      '25种针刺手法自动识别与评分',
      'VR取穴考核，沉浸式训练',
      '操作数据实时回传分析',
      '手法规范性量化评估',
    ],
    timeline: [
      { label: '一期：母本考试系统（已完成）', done: true },
      { label: '二期：纯软件模块', done: false },
      { label: '三期：针刺手法采集模块（规划中）', done: false },
    ],
  },
  TCM_GUASHA: {
    name: '刮痧手法采集',
    phase: '三期',
    type: '硬件+VR',
    features: [
      '力反馈机械臂+VR交互技术',
      'AI自动评分，毫秒级精度',
      '竞赛级考核标准（金砖大赛规范）',
      '手法数据录制与回放',
      '多维度手法质量分析报告',
    ],
    timeline: [
      { label: '一期：母本考试系统（已完成）', done: true },
      { label: '二期：纯软件模块', done: false },
      { label: '三期：刮痧手法采集模块（规划中）', done: false },
    ],
  },
  TCM_MASSAGE: {
    name: '推拿手法采集',
    phase: '三期',
    type: '硬件+软件',
    features: [
      '柔性传感器实时手法采集',
      '800+穴位教学库',
      '多端屏幕同步（教师实时监控）',
      '远程教学管控功能',
      '手法标准化评分体系',
    ],
    timeline: [
      { label: '一期：母本考试系统（已完成）', done: true },
      { label: '二期：纯软件模块', done: false },
      { label: '三期：推拿手法采集模块（规划中）', done: false },
    ],
  },
  TCM_ANATOMY: {
    name: '人体经络腧穴解剖',
    phase: '三期',
    type: '硬件+3D',
    features: [
      '穴位触控笔+3D模型精准联动',
      '虚拟针刺仿真训练',
      '针灸处方练习系统',
      '解剖结构立体展示',
      '穴位定位精度智能评估',
    ],
    timeline: [
      { label: '一期：母本考试系统（已完成）', done: true },
      { label: '二期：纯软件模块', done: false },
      { label: '三期：人体经络腧穴解剖模块（规划中）', done: false },
    ],
  },
}

const route = useRoute()
const info = computed(() => MODULE_INFO[route.params.code as string] ?? null)
</script>

<style scoped>
.module-placeholder {
  max-width: 760px;
  margin: 40px auto;
  padding: 0 16px;
}
.module-card {
  background: #fff;
  border-radius: 8px;
  padding: 32px 36px;
  box-shadow: 0 2px 12px rgba(0,0,0,.06);
}
.card-header { margin-bottom: 4px; }
.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.module-title { font-size: 26px; font-weight: 700; margin: 0; color: #303133; }
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #909399;
  font-size: 13px;
}
.spin { animation: spin 2s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.section { margin: 16px 0; }
.section-title { font-size: 15px; font-weight: 600; color: #303133; margin: 0 0 14px; }
.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.feature-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #606266;
}
.done { color: #909399; }
.bottom-alert { margin-top: 20px; }
</style>
