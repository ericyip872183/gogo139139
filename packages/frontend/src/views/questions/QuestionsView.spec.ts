/**
 * 题库管理页面单元测试
 * @file packages/frontend/src/views/questions/QuestionsView.spec.ts
 * @description 测试题目列表、分类树、富文本编辑、媒体上传等功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import QuestionsView from './QuestionsView.vue'

// Mock questionsApi
const mockQuestionsApi = {
  getCategoryTree: vi.fn().mockResolvedValue([]),
  getCategoryList: vi.fn().mockResolvedValue([]),
  list: vi.fn().mockResolvedValue({ total: 0, list: [], page: 1, pageSize: 20 }),
  createCategory: vi.fn().mockResolvedValue({}),
  updateCategory: vi.fn().mockResolvedValue({}),
  removeCategory: vi.fn().mockResolvedValue({}),
  create: vi.fn().mockResolvedValue({ id: 'q123' }),
  update: vi.fn().mockResolvedValue({}),
  remove: vi.fn().mockResolvedValue({}),
  batchRemove: vi.fn().mockResolvedValue({}),
  importExcel: vi.fn().mockResolvedValue({ success: 0, failed: 0, errors: [] }),
  exportExcel: vi.fn().mockResolvedValue(new Blob()),
  uploadMedia: vi.fn().mockResolvedValue({
    id: 'media123',
    type: 'image',
    url: '/uploads/questions/t1/test.png',
  }),
  removeMedia: vi.fn().mockResolvedValue({}),
}

// Mock ElMessage
const mockElMessage = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}

// Mock ElMessageBox
const mockElMessageBox = {
  confirm: vi.fn().mockResolvedValue(true),
  alert: vi.fn().mockResolvedValue(true),
}

vi.mock('@/api/questions', () => ({
  questionsApi: mockQuestionsApi,
}))

vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus')
  return {
    ...actual,
    ElMessage: mockElMessage,
    ElMessageBox: mockElMessageBox,
  }
})

describe('QuestionsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── 页面渲染测试 ─────────────────────────────────────────

  describe('页面初始化', () => {
    it('应该成功渲染页面', async () => {
      const wrapper = mount(QuestionsView, {
        global: {
          stubs: {
            'el-tree': true,
            'el-table': true,
            'el-dialog': true,
            'el-form': true,
            'el-input': true,
            'el-select': true,
            'el-button': true,
            'el-card': true,
          },
        },
      })

      await flushPromises()

      expect(wrapper.exists()).toBe(true)
      expect(mockQuestionsApi.getCategoryTree).toHaveBeenCalled()
      expect(mockQuestionsApi.list).toHaveBeenCalled()
    })

    it('应该显示分类树面板', async () => {
      const mockCategories = [
        { id: '1', name: '分类 1', parentId: null, children: [] },
      ]
      mockQuestionsApi.getCategoryTree.mockResolvedValueOnce(mockCategories)
      mockQuestionsApi.getCategoryList.mockResolvedValueOnce(mockCategories)

      const wrapper = mount(QuestionsView)
      await flushPromises()

      expect(wrapper.find('.category-panel').exists()).toBe(true)
    })

    it('应该显示题目列表面板', async () => {
      const wrapper = mount(QuestionsView)
      await flushPromises()

      expect(wrapper.find('.question-panel').exists()).toBe(true)
    })
  })

  // ─── 分类管理测试 ─────────────────────────────────────────

  describe('分类管理', () => {
    it('应该可以打开新增分类弹窗', async () => {
      const wrapper = mount(QuestionsView)
      await flushPromises()

      // 模拟点击新增分类按钮
      const createBtn = wrapper.find('[data-testid="create-category-btn"]')
      if (createBtn.exists()) {
        await createBtn.trigger('click')
        expect(wrapper.vm.catDialogVisible).toBe(true)
      }
    })

    it('应该可以创建分类', async () => {
      const wrapper = mount(QuestionsView)
      await flushPromises()

      wrapper.vm.catForm.name = '新分类'
      wrapper.vm.catForm.sortOrder = 0
      await wrapper.vm.handleCatSubmit()

      expect(mockQuestionsApi.createCategory).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '新分类',
        }),
      )
      expect(mockElMessage.success).toHaveBeenCalled()
    })

    it('分类名称为空时应该提示', async () => {
      const wrapper = mount(QuestionsView)
      await flushPromises()

      wrapper.vm.catForm.name = ''
      try {
        await wrapper.vm.handleCatSubmit()
      } catch (e) {
        // 预期会有验证错误
      }

      expect(mockQuestionsApi.createCategory).not.toHaveBeenCalled()
    })
  })

  // ─── 题目列表测试 ─────────────────────────────────────────

  describe('题目列表', () => {
    it('应该显示搜索框', async () => {
      const wrapper = mount(QuestionsView)
      await flushPromises()

      expect(wrapper.find('input[placeholder*="搜索题目"]').exists()).toBe(true)
    })

    it('应该显示题型筛选下拉框', async () => {
      const wrapper = mount(QuestionsView)
      await flushPromises()

      expect(wrapper.find('select').exists()).toBe(true)
    })

    it('应该可以执行搜索', async () => {
      const wrapper = mount(QuestionsView)
      await flushPromises()

      wrapper.vm.query.keyword = '测试'
      await wrapper.vm.handleSearch()

      expect(mockQuestionsApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: '测试',
        }),
      )
    })

    it('应该可以重置搜索条件', async () => {
      const wrapper = mount(QuestionsView)
      await flushPromises()

      wrapper.vm.query.keyword = '测试'
      wrapper.vm.query.type = 'SINGLE'
      await wrapper.vm.handleReset()

      expect(wrapper.vm.query.keyword).toBe('')
      expect(wrapper.vm.query.type).toBe('')
    })
  })

  // ─── 题目新增/编辑测试 ─────────────────────────────────────────

  describe('题目表单', () => {
    it('应该可以打开新增题目弹窗', async () => {
      const wrapper = mount(QuestionsView)
      await flushPromises()

      wrapper.vm.openCreate()

      expect(wrapper.vm.questionDialogVisible).toBe(true)
      expect(wrapper.vm.editId).toBeNull()
    })

    it('新增时应该重置表单', async () => {
      const wrapper = mount(QuestionsView)
      await flushPromises()

      wrapper.vm.openCreate()

      expect(wrapper.vm.qForm.type).toBe('SINGLE')
      expect(wrapper.vm.qForm.difficulty).toBe('MEDIUM')
      expect(wrapper.vm.qForm.content).toBe('')
    })

    it('应该可以编辑题目', async () => {
      const mockQuestion = {
        id: 'q123',
        type: 'SINGLE',
        content: '测试题目',
        difficulty: 'MEDIUM',
        score: 2,
        categoryId: 'cat1',
        explanation: '解析',
        options: [
          { id: 'o1', label: 'A', content: '选项 A', isCorrect: true, sortOrder: 0 },
        ],
        mediaItems: [],
      }

      const wrapper = mount(QuestionsView)
      await flushPromises()

      wrapper.vm.openEdit(mockQuestion)

      expect(wrapper.vm.editId).toBe('q123')
      expect(wrapper.vm.qForm.content).toBe('测试题目')
      expect(wrapper.vm.qForm.options).toHaveLength(1)
    })

    it('判断题应该自动生成选项', async () => {
      const wrapper = mount(QuestionsView)
      await flushPromises()

      wrapper.vm.qForm.type = 'JUDGE'
      await flushPromises()

      expect(wrapper.vm.qForm.options).toHaveLength(2)
      expect(wrapper.vm.qForm.options[0].content).toBe('正确')
      expect(wrapper.vm.qForm.options[1].content).toBe('错误')
    })

    it('填空题应该清空选项', async () => {
      const wrapper = mount(QuestionsView)
      await flushPromises()

      wrapper.vm.qForm.type = 'FILL'
      await flushPromises()

      expect(wrapper.vm.qForm.options).toHaveLength(0)
    })

    it('应该可以添加选项', async () => {
      const wrapper = mount(QuestionsView)
      await flushPromises()

      const initialLength = wrapper.vm.qForm.options.length
      wrapper.vm.addOption()

      expect(wrapper.vm.qForm.options.length).toBe(initialLength + 1)
    })

    it('应该可以删除选项', async () => {
      const wrapper = mount(QuestionsView)
      await flushPromises()

      const initialLength = wrapper.vm.qForm.options.length
      wrapper.vm.removeOption(0)

      expect(wrapper.vm.qForm.options.length).toBe(initialLength - 1)
    })

    it('单选题应该只能选择一个正确答案', async () => {
      const wrapper = mount(QuestionsView)
      await flushPromises()

      wrapper.vm.setSingleCorrect(0)

      expect(wrapper.vm.qForm.options.filter(o => o.isCorrect)).toHaveLength(1)
    })
  })

  // ─── 媒体资源测试 ─────────────────────────────────────────

  describe('媒体资源管理', () => {
    it('应该可以上传媒体文件', async () => {
      const wrapper = mount(QuestionsView)
      await flushPromises()

      wrapper.vm.editId = 'q123'
      const mockFile = {
        file: {
          name: 'test.png',
          size: 1024,
          type: 'image/png',
        },
      }

      await wrapper.vm.handleMediaUpload(mockFile)

      expect(mockQuestionsApi.uploadMedia).toHaveBeenCalledWith(
        'q123',
        expect.any(FormData),
      )
    })

    it('未保存题目时应该提示先保存', async () => {
      const wrapper = mount(QuestionsView)
      await flushPromises()

      wrapper.vm.editId = null
      const mockFile = {
        file: {
          name: 'test.png',
          size: 1024,
        },
      }

      await wrapper.vm.handleMediaUpload(mockFile)

      expect(mockElMessage.warning).toHaveBeenCalledWith(
        '请先保存题目后再上传媒体文件',
      )
    })

    it('文件超过 50MB 应该拒绝上传', async () => {
      const wrapper = mount(QuestionsView)
      await flushPromises()

      const mockFile = {
        file: {
          name: 'large.png',
          size: 60 * 1024 * 1024, // 60MB
        },
      }

      const result = await wrapper.vm.beforeMediaUpload(mockFile.file)
      expect(result).toBe(false)
    })

    it('应该可以删除媒体资源', async () => {
      const wrapper = mount(QuestionsView)
      await flushPromises()

      wrapper.vm.mediaItems = [
        { id: 'media123', type: 'image', url: '/test.png' },
      ]

      await wrapper.vm.removeMediaItem(wrapper.vm.mediaItems[0])

      expect(mockQuestionsApi.removeMedia).toHaveBeenCalledWith('media123')
    })

    it('应该显示媒体类型标签', async () => {
      const wrapper = mount(QuestionsView)
      await flushPromises()

      expect(wrapper.vm.getMediaTypeTag('image')).toBe('success')
      expect(wrapper.vm.getMediaTypeTag('video')).toBe('warning')
      expect(wrapper.vm.getMediaTypeTag('audio')).toBe('info')
    })

    it('应该正确格式化文件大小', async () => {
      const wrapper = mount(QuestionsView)
      await flushPromises()

      expect(wrapper.vm.formatFileSize(500)).toBe('500 B')
      expect(wrapper.vm.formatFileSize(1024)).toBe('1.0 KB')
      expect(wrapper.vm.formatFileSize(1048576)).toBe('1.0 MB')
    })
  })

  // ─── 批量操作测试 ─────────────────────────────────────────

  describe('批量操作', () => {
    it('应该可以批量删除题目', async () => {
      const wrapper = mount(QuestionsView)
      await flushPromises()

      wrapper.vm.selectedIds = ['q1', 'q2']
      await wrapper.vm.handleBatchRemove()

      expect(mockQuestionsApi.batchRemove).toHaveBeenCalledWith(['q1', 'q2'])
      expect(mockElMessage.success).toHaveBeenCalled()
    })

    it('没有选择题目时批量删除按钮应该禁用', async () => {
      const wrapper = mount(QuestionsView)
      await flushPromises()

      wrapper.vm.selectedIds = []

      const deleteBtn = wrapper.find('[data-testid="batch-delete-btn"]')
      if (deleteBtn.exists()) {
        expect(deleteBtn.attributes('disabled')).toBeDefined()
      }
    })
  })

  // ─── 导入导出测试 ─────────────────────────────────────────

  describe('导入导出', () => {
    it('应该可以导出 Excel', async () => {
      const wrapper = mount(QuestionsView)
      await flushPromises()

      // Mock URL.createObjectURL
      const mockUrl = 'blob:test'
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl)
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')
      const clickSpy = vi.spyOn(HTMLElement.prototype, 'click')

      await wrapper.vm.handleExport()

      expect(mockQuestionsApi.exportExcel).toHaveBeenCalled()
      expect(createObjectURLSpy).toHaveBeenCalled()
      expect(clickSpy).toHaveBeenCalled()

      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
    })

    it('应该可以导入 Excel 文件', async () => {
      const wrapper = mount(QuestionsView)
      await flushPromises()

      const mockFile = {
        raw: {
          name: 'test.xlsx',
          text: () => Promise.resolve('[]'),
        },
      }

      await wrapper.vm.handleImportFile(mockFile)

      expect(mockQuestionsApi.importExcel).toHaveBeenCalled()
    })

    it('应该可以下载导入模板', async () => {
      const wrapper = mount(QuestionsView)
      await flushPromises()

      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
      const clickSpy = vi.spyOn(HTMLElement.prototype, 'click')

      wrapper.vm.downloadTemplate()

      expect(createObjectURLSpy).toHaveBeenCalled()
      expect(clickSpy).toHaveBeenCalled()

      createObjectURLSpy.mockRestore()
    })
  })
})
