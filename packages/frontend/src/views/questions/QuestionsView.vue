<template>
  <div class="questions-page">
    <!-- 左侧分类树 -->
    <el-card class="category-panel">
      <template #header>
        <div class="panel-header">
          <span>题目分类</span>
          <el-button link type="primary" :icon="Plus" @click="openCreateCategory(null)" />
        </div>
      </template>
      <el-tree
        ref="treeRef"
        v-loading="catLoading"
        :data="categoryTree"
        :props="{ label: 'name', children: 'children' }"
        node-key="id"
        highlight-current
        default-expand-all
        @node-click="handleCategoryClick"
      >
        <template #default="{ data }">
          <div class="cat-node">
            <span>{{ data.name }}</span>
            <span class="cat-actions">
              <el-button link :icon="Plus" size="small" @click.stop="openCreateCategory(data.id)" />
              <el-button link :icon="Edit" size="small" @click.stop="openEditCategory(data)" />
              <el-button link :icon="Delete" size="small" @click.stop="handleRemoveCategory(data)" />
            </span>
          </div>
        </template>
      </el-tree>
    </el-card>

    <!-- 右侧题目列表 -->
    <el-card class="question-panel">
      <template #header>
        <div class="panel-header">
          <div class="left">
            <el-input
              v-model="query.keyword"
              placeholder="搜索题目内容"
              clearable
              style="width:200px"
              @keyup.enter="handleSearch"
            />
            <el-select v-model="query.type" placeholder="题型" clearable style="width:110px">
              <el-option v-for="t in typeOptions" :key="t.value" :label="t.label" :value="t.value" />
            </el-select>
            <el-select v-model="query.difficulty" placeholder="难度" clearable style="width:100px">
              <el-option v-for="d in diffOptions" :key="d.value" :label="d.label" :value="d.value" />
            </el-select>
            <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </div>
          <div class="right">
            <el-button type="primary" :icon="Plus" @click="openCreate">新增题目</el-button>
            <el-button :icon="Upload" @click="importDialogVisible = true">批量导入</el-button>
            <el-button type="success" :icon="Upload" @click="aiImportDialogVisible = true">AI 智能导入</el-button>
            <el-button :icon="Download" @click="handleExport">导出 Excel</el-button>
            <el-button
              type="danger"
              :disabled="selectedIds.length === 0"
              @click="handleBatchRemove"
            >
              批量删除 ({{ selectedIds.length }})
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="questionList"
        @selection-change="(rows: any[]) => (selectedIds = rows.map(r => r.id))"
        row-key="id"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column label="题目内容" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="question-content-wrapper">
              <span v-html="row.content" class="question-content" />
              <div v-if="row.mediaItems?.length" class="question-media-preview">
                <el-tag v-for="media in row.mediaItems" :key="media.id" size="small" :type="getMediaTypeTag(media.type)">
                  <el-icon style="margin-right: 4px"><component :is="getMediaIcon(media.type)" /></el-icon>
                  {{ media.caption || media.type }}
                </el-tag>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="题型" width="90">
          <template #default="{ row }">
            <el-tag :type="typeTagType(row.type)" size="small">{{ typeLabel(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="难度" width="80">
          <template #default="{ row }">
            <el-tag :type="diffTagType(row.difficulty)" size="small">{{ diffLabel(row.difficulty) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="分值" prop="score" width="70" />
        <el-table-column label="分类" width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.category?.name ?? '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="handleRemove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        class="pagination"
        @change="loadQuestions"
      />
    </el-card>

    <!-- 分类编辑弹窗 -->
    <el-dialog v-model="catDialogVisible" :title="catEditId ? '编辑分类' : '新增分类'" width="380px">
      <el-form ref="catFormRef" :model="catForm" :rules="catRules" label-width="70px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="catForm.name" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="catForm.sortOrder" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="catDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCatSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 题目新增/编辑弹窗 -->
    <el-dialog
      v-model="questionDialogVisible"
      :title="editId ? '编辑题目' : '新增题目'"
      width="900px"
      @close="handleDialogClose"
    >
      <el-form ref="qFormRef" :model="qForm" :rules="qRules" label-width="80px">
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="题型" prop="type">
              <el-select v-model="qForm.type" style="width:100%" :disabled="!!editId">
                <el-option v-for="t in typeOptions" :key="t.value" :label="t.label" :value="t.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="难度">
              <el-select v-model="qForm.difficulty" style="width:100%">
                <el-option v-for="d in diffOptions" :key="d.value" :label="d.label" :value="d.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="分值">
              <el-input-number v-model="qForm.score" :min="0.5" :step="0.5" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="分类">
          <el-select v-model="qForm.categoryId" clearable style="width:100%">
            <el-option
              v-for="cat in categoryList"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="题目内容" prop="content">
          <!-- 原生文本框 - 简洁高效 -->
          <el-input
            v-model="qForm.content"
            type="textarea"
            :rows="6"
            placeholder="请输入题目内容（支持纯文本）"
          />
          <!--
          ─── 旧版富文本编辑器代码（已禁用，需要时可恢复）────────────────────────
          <div class="editor-container">
            <Editor
              v-if="questionDialogVisible"
              :key="editorKey"
              v-model="qForm.content"
              :init="editorInit"
              :disabled="false"
              tag="textarea"
            />
          </div>
          -->
        </el-form-item>

        <!-- 媒体资源管理 -->
        <el-form-item label="媒体资源">
          <!-- 上传区域 -->
          <div class="media-uploader">
            <el-upload
              ref="uploadRef"
              drag
              :http-request="handleMediaUpload"
              :before-upload="beforeMediaUpload"
              :on-change="handleFileChange"
              :show-file-list="false"
              accept="image/*,video/*,audio/*"
              :auto-upload="false"
              multiple
            >
              <el-icon class="el-icon--upload"><Upload-Filled /></el-icon>
              <div class="el-upload__text">
                拖拽文件到此处或<em>点击上传</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  支持图片、视频、音频文件，单个文件最大 50MB
                </div>
              </template>
            </el-upload>
          </div>

          <!-- 待上传文件列表 -->
          <div v-if="pendingMediaFiles.length" class="media-list pending-list">
            <div class="media-list-header">
              <span>待上传 {{ pendingMediaFiles.length }} 个文件（保存题目后上传到服务器）</span>
            </div>
            <div
              v-for="(file, idx) in pendingMediaFiles"
              :key="file.uid || idx"
              class="media-item"
            >
              <div class="media-preview">
                <!-- 图片预览 -->
                <img v-if="file.type.startsWith('image/')" :src="file.previewUrl" class="media-thumb" />
                <!-- 视频预览 -->
                <video v-else-if="file.type.startsWith('video/')" :src="file.previewUrl" class="media-thumb" />
                <!-- 音频预览 -->
                <audio v-else-if="file.type.startsWith('audio/')" :src="file.previewUrl" controls class="media-thumb-audio" />
                <!-- 文件图标 -->
                <div v-else class="media-file-icon">
                  <el-icon :size="48"><Document /></el-icon>
                </div>
              </div>
              <div class="media-info">
                <div class="media-name">{{ file.name }}</div>
                <div class="media-meta">
                  <el-tag size="small" :type="getFileTagType(file.type)">
                    {{ getFileTypeName(file.type) }}
                  </el-tag>
                  <span>{{ formatFileSize(file.size) }}</span>
                </div>
                <el-input
                  v-model="file.caption"
                  placeholder="说明文字（可选）"
                  size="small"
                />
              </div>
              <el-button
                link
                type="danger"
                :icon="Delete"
                circle
                @click="removePendingFile(file)"
              />
            </div>
          </div>

          <!-- 已上传文件列表（从服务器加载的） -->
          <div v-if="mediaItems.length" class="media-list uploaded-list">
            <div class="media-list-header">
              <span>已上传 {{ mediaItems.length }} 个文件</span>
            </div>
            <div
              v-for="(media, idx) in mediaItems"
              :key="media.id || idx"
              class="media-item"
            >
              <div class="media-preview">
                <!-- 图片预览 -->
                <img v-if="media.type === 'image'" :src="media.url" class="media-thumb" />
                <!-- 视频预览 -->
                <video v-else-if="media.type === 'video'" :src="media.url" class="media-thumb" />
                <!-- 音频预览 -->
                <audio v-else-if="media.type === 'audio'" :src="media.url" controls class="media-thumb-audio" />
                <!-- 文件图标 -->
                <div v-else class="media-file-icon">
                  <el-icon :size="48"><Document /></el-icon>
                </div>
              </div>
              <div class="media-info">
                <div class="media-name">{{ media.caption || media.originalName || media.url.split('/').pop() }}</div>
                <div class="media-meta">
                  <el-tag size="small" :type="getMediaTypeTag(media.type)">
                    {{ media.type === 'image' ? '图片' : media.type === 'video' ? '视频' : media.type === 'audio' ? '音频' : '文件' }}
                  </el-tag>
                  <span v-if="media.fileSize">{{ formatFileSize(media.fileSize) }}</span>
                </div>
                <el-input
                  v-model="media.caption"
                  placeholder="说明文字（可选）"
                  size="small"
                  @change="updateMediaCaption(media)"
                />
              </div>
              <el-button
                link
                type="danger"
                :icon="Delete"
                circle
                @click="removeMediaItem(media)"
              />
            </div>
          </div>
        </el-form-item>

        <!-- 选项区域（单选/多选/判断） -->
        <template v-if="qForm.type !== 'FILL'">
          <el-form-item label="选项">
            <div class="options-editor">
              <div class="options-hint">
                <el-icon><Select /></el-icon>
                <span v-if="qForm.type === 'MULTIPLE'">勾选左侧复选框标记<b>正确答案</b>（可多选）</span>
                <span v-else>点击左侧单选按钮标记<b>正确答案</b></span>
              </div>
              <div
                v-for="(opt, idx) in qForm.options"
                :key="idx"
                class="option-row"
                :class="{ 'is-correct': opt.isCorrect }"
              >
                <el-checkbox
                  v-if="qForm.type === 'MULTIPLE'"
                  v-model="opt.isCorrect"
                  class="option-correct"
                />
                <el-radio
                  v-else
                  :model-value="singleCorrectIdx"
                  :value="idx"
                  @change="setSingleCorrect(idx)"
                  class="option-correct"
                />
                <el-tag class="option-label" size="small" :type="opt.isCorrect ? 'success' : 'info'">{{ opt.label }}</el-tag>
                <el-input v-model="opt.content" placeholder="选项内容" class="option-input" />
                <el-button
                  v-if="qForm.type !== 'JUDGE'"
                  link
                  :icon="Delete"
                  type="danger"
                  @click="removeOption(idx)"
                />
              </div>
              <el-button
                v-if="qForm.type !== 'JUDGE'"
                link
                :icon="Plus"
                type="primary"
                @click="addOption"
              >
                添加选项
              </el-button>
            </div>
          </el-form-item>
        </template>

        <!-- 填空题答案 -->
        <template v-if="qForm.type === 'FILL'">
          <el-form-item label="标准答案" required>
            <el-input v-model="fillAnswer" placeholder="输入标准答案（用于自动阅卷对比）" />
          </el-form-item>
        </template>

        <el-form-item label="解析">
          <el-input v-model="qForm.explanation" type="textarea" :rows="2" placeholder="可选，题目解析说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="questionDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleQuestionSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 批量导入弹窗 -->
    <el-dialog v-model="importDialogVisible" title="批量导入题目" width="560px">
      <div class="import-tips">
        <p>支持 Excel (.xlsx) 或 JSON (.json) 格式导入</p>
        <p class="tip-note">Excel 表头：题型 | 题目内容 | 难度 | 分值 | 分类 | 答案 | 解析 | 选项 A | 选项 B | 选项 C | 选项 D</p>
      </div>
      <div class="import-actions">
        <el-upload accept=".json,.xlsx" :auto-upload="false" :show-file-list="false" :on-change="handleImportFile">
          <el-button type="primary" :icon="Upload">选择文件</el-button>
        </el-upload>
        <el-button link type="primary" @click="downloadTemplate">下载 Excel 模板</el-button>
      </div>
      <div v-if="importResult" class="import-result">
        <el-alert
          :title="`导入完成：成功 ${importResult.success} 条，失败 ${importResult.failed} 条`"
          :type="importResult.failed === 0 ? 'success' : 'warning'"
          show-icon :closable="false"
        />
        <ul v-if="importResult.errors.length" class="error-list">
          <li v-for="(e, i) in importResult.errors" :key="i">{{ e }}</li>
        </ul>
      </div>
    </el-dialog>

    <!-- AI 智能导入弹窗 -->
    <el-dialog v-model="aiImportDialogVisible" title="AI 智能导入题目" width="700px" @close="resetAiImportForm">
      <div class="ai-import-tips">
        <p>支持格式：Word (.docx) / PDF / TXT / Excel (.xlsx) / 图片 (JPG/PNG)</p>
        <p class="tip-note">AI 自动识别题目并结构化，识别结果需人工校对后入库</p>
      </div>

      <!-- 模型选择 -->
      <el-form label-width="100px">
        <el-form-item label="大模型选择">
          <el-select v-model="aiImportModel" style="width:100%" filterable>
            <el-option
              v-for="m in availableModels"
              :key="m.id"
              :label="m.name"
              :value="m.modelId"
            >
              <span style="float:left">{{ m.name }}</span>
              <span style="float:right;color:#8492a6;font-size:12px;margin-left:8px">
                {{ m.provider?.name }}
              </span>
            </el-option>
          </el-select>
          <div style="color:#909399;font-size:12px;margin-top:4px">
            💡 模型列表来自 AI 平台管理，请选择适合的模型进行题目识别
          </div>
        </el-form-item>
      </el-form>

      <!-- 文件上传区域 -->
      <el-upload
        ref="aiUploadRef"
        drag
        :http-request="handleAiFileUpload"
        :before-upload="beforeAiUpload"
        :on-change="handleAiFileChange"
        :show-file-list="false"
        :auto-upload="false"
        multiple
        accept=".docx,.pdf,.txt,.xlsx,.xls,.jpg,.jpeg,.png"
        class="ai-upload"
      >
        <el-icon class="el-icon--upload"><Upload-Filled /></el-icon>
        <div class="el-upload__text">
          拖拽文件到此处或<em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持多文件同时上传，单个文件最大 50MB
          </div>
        </template>
      </el-upload>

      <!-- 已选文件列表 -->
      <div v-if="aiImportFiles.length" class="ai-file-list">
        <div v-for="(file, idx) in aiImportFiles" :key="file.uid || idx" class="ai-file-item">
          <el-icon><Document /></el-icon>
          <span class="file-name">{{ file.name }}</span>
          <span class="file-size">{{ formatFileSize(file.size || 0) }}</span>
          <el-tag v-if="file.status === 'ready'" size="small" type="success">就绪</el-tag>
          <el-button link type="danger" :icon="Delete" @click="removeAiFile(idx)" />
        </div>
      </div>

      <!-- 目标分类 -->
      <el-form label-width="100px" style="margin-top:16px">
        <el-form-item label="目标分类">
          <el-select v-model="aiImportCategoryId" clearable filterable style="width:100%">
            <el-option
              v-for="cat in categoryList"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
          <div style="color:#909399;font-size:12px;margin-top:4px">也可在校对时选择分类</div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="aiImportDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="aiImporting" :disabled="aiImportFiles.length === 0" @click="startAiImport">
          开始识别
        </el-button>
      </template>
    </el-dialog>

    <!-- AI 识别进度弹窗 -->
    <el-dialog v-model="aiProgressDialogVisible" title="AI 识别中..." width="600px" :close-on-click-modal="false" :show-close="false">
      <div class="ai-progress-content">
        <el-progress :percentage="aiProgress" :status="aiProgressStatus" />
        <p class="progress-text">{{ progressText }}</p>
        <div class="progress-detail">
          <div v-if="aiTaskStatus === 'processing'" class="processing-animation">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>AI 正在识别题目，请稍候...</span>
          </div>
          <div v-else-if="aiTaskStatus === 'completed'" class="completed-info">
            <el-icon color="#67C23A"><Circle-Check /></el-icon>
            <span>识别完成！共识别 {{ aiTotalCount }} 道题目</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button v-if="aiTaskStatus === 'completed'" type="primary" @click="openAiReview">进入校对</el-button>
        <el-button v-else type="info" @click="aiProgressDialogVisible = false">后台处理</el-button>
      </template>
    </el-dialog>

    <!-- AI 校对确认弹窗 -->
    <el-dialog v-model="aiReviewDialogVisible" title="校对确认" width="900px" :close-on-click-modal="false">
      <div class="ai-review-header">
        <span>识别完成：共 {{ aiImportItems.length }} 题 | 已校对：{{ reviewedCount }}/{{ aiImportItems.length }} | 待确认</span>
        <div class="header-actions">
          <el-select v-model="aiImportCategoryId" placeholder="目标分类" style="width:150px" filterable>
            <el-option
              v-for="cat in categoryList"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
          <el-select v-model="aiImportDifficulty" placeholder="统一难度" style="width:100px">
            <el-option label="易" value="EASY" />
            <el-option label="中" value="MEDIUM" />
            <el-option label="难" value="HARD" />
          </el-select>
          <el-checkbox v-model="showUnreviewedOnly">仅显示未校对</el-checkbox>
        </div>
      </div>

      <!-- 重复题目警告 -->
      <el-alert v-if="duplicateCount > 0" type="warning" show-icon :closable="false" style="margin-bottom:12px">
        <template #title>
          发现 {{ duplicateCount }} 道重复题目，已自动跳过
        </template>
      </el-alert>

      <!-- 题目列表 -->
      <div class="ai-items-list">
        <div
          v-for="item in filteredAiItems"
          :key="item.id"
          class="ai-item"
          :class="{ 'is-duplicate': item.isDuplicate, 'is-error': item.errorMessage }"
        >
          <div class="item-header">
            <el-checkbox v-model="item.selected" :disabled="item.isDuplicate || !!item.errorMessage" />
            <el-tag :type="getTypeTag(item.questionType)" size="small">{{ getTypeLabel(item.questionType) }}</el-tag>
            <span v-if="item.isDuplicate" class="duplicate-warning">
              ⚠️ 发现相似题目（相似度 {{ (item.similarity * 100).toFixed(0) }}%）
            </span>
            <span v-if="item.errorMessage" class="error-message">⚠️ {{ item.errorMessage }}</span>
          </div>
          <div class="item-content">
            <strong>题目：</strong>{{ item.content }}
          </div>
          <div v-if="item.options?.length" class="item-options">
            <strong>选项：</strong>
            <span v-for="opt in item.options" :key="opt.label" class="option" :class="{ correct: opt.isCorrect }">
              {{ opt.label }}. {{ opt.content }}{{ opt.isCorrect ? ' ✓' : '' }}
            </span>
          </div>
          <div class="item-answer">
            <strong>答案：</strong>{{ item.answer }}
            <span v-if="!validateAnswer(item.questionType, item.answer)" class="answer-error">⚠️ 答案格式错误</span>
          </div>
          <div v-if="item.explanation" class="item-explanation">
            <strong>解析：</strong>{{ item.explanation }}
          </div>
          <div class="item-actions">
            <el-button link type="primary" size="small" @click="editAiItem(item)">编辑</el-button>
            <el-button link type="danger" size="small" @click="skipAiItem(item)">跳过</el-button>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="aiReviewDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="aiConfirming" @click="confirmAiImport">
          确认导入选中的 ({{ selectedAiItemCount }})
        </el-button>
      </template>
    </el-dialog>

    <!-- AI 题目编辑弹窗 -->
    <el-dialog v-model="aiEditDialogVisible" title="编辑题目" width="700px">
      <el-form :model="aiEditingItem" label-width="80px">
        <el-form-item label="题型">
          <el-select v-model="aiEditingItem.questionType" style="width:100%">
            <el-option label="单选题" value="SINGLE" />
            <el-option label="多选题" value="MULTIPLE" />
            <el-option label="判断题" value="JUDGE" />
            <el-option label="填空题" value="FILL" />
          </el-select>
        </el-form-item>
        <el-form-item label="题目">
          <el-input v-model="aiEditingItem.content" type="textarea" :rows="3" />
        </el-form-item>
        <!-- 选项编辑（选择题/判断题） -->
        <el-form-item v-if="aiEditingItem.questionType !== 'FILL'" label="选项">
          <div v-if="aiEditingItem.questionType === 'JUDGE'" class="judge-options-edit">
            <el-radio-group v-model="aiEditingItem.correctAnswer">
              <el-radio value="A">A. 正确</el-radio>
              <el-radio value="B">B. 错误</el-radio>
            </el-radio-group>
          </div>
          <div v-else class="options-edit-list">
            <div v-for="(opt, idx) in aiEditingItem.options" :key="idx" class="option-edit-item">
              <el-tag size="small">{{ opt.label }}</el-tag>
              <el-input v-model="opt.content" style="flex:1;margin:0 8px" placeholder="选项内容" />
              <el-checkbox v-model="opt.isCorrect">正确</el-checkbox>
              <el-button link type="danger" :disabled="aiEditingItem.options.length <= 2" @click="removeAiOption(idx)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            <el-button link type="primary" size="small" @click="addAiOption">
              <el-icon><Plus /></el-icon> 添加选项
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="答案">
          <el-input v-model="aiEditingItem.answer" placeholder="答案内容（单选/判断：A/B/C/D；多选：ABCD；填空：答案）" />
        </el-form-item>
        <el-form-item label="解析">
          <el-input v-model="aiEditingItem.explanation" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="难度">
          <el-select v-model="aiEditingItem.difficulty" style="width:100%">
            <el-option label="简单" value="EASY" />
            <el-option label="中等" value="MEDIUM" />
            <el-option label="困难" value="HARD" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="aiEditDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveAiEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Edit, Delete, Search, Upload, Download, Select, UploadFilled, Document, VideoPlay, VideoCamera, Headset, Loading, CircleCheck } from '@element-plus/icons-vue'
import { questionsApi, type Question, type QuestionCategory, type QuestionMedia, type AiImportItem, type AiModel } from '@/api/questions'

// 富文本编辑器导入（已禁用，代码保留以备恢复）
// import Editor from '@tinymce/tinymce-vue'
// import 'tinymce/tinymce'
// import 'tinymce/icons/default'
// import 'tinymce/themes/silver'
// import 'tinymce/models/dom'
// import 'tinymce/plugins/advlist'
// import 'tinymce/plugins/autolink'
// import 'tinymce/plugins/lists'
// import 'tinymce/plugins/link'
// import 'tinymce/plugins/image'
// import 'tinymce/plugins/charmap'
// import 'tinymce/plugins/preview'
// import 'tinymce/plugins/anchor'
// import 'tinymce/plugins/searchreplace'
// import 'tinymce/plugins/visualblocks'
// import 'tinymce/plugins/code'
// import 'tinymce/plugins/fullscreen'
// import 'tinymce/plugins/insertdatetime'
// import 'tinymce/plugins/media'
// import 'tinymce/plugins/table'
// import 'tinymce/plugins/wordcount'
// import 'tinymce/skins/content/default/content.css'
// import 'tinymce/skins/ui/oxide/skin.css'
// import 'tinymce/skins/ui/oxide/skin.min.css'

// ─── 富文本编辑器配置（已禁用，代码保留以备恢复）──────────────────────────
// const editorRef = shallowRef()
// const editorKey = ref(0)
// const editorInit = { ... }

// ─── 分类 ─────────────────────────────────────────────
const catLoading = ref(false)
const categoryTree = ref<QuestionCategory[]>([])
const categoryList = ref<{ id: string; name: string; parentId: string | null }[]>([])
const selectedCategoryId = ref<string>('')

async function loadCategories() {
  catLoading.value = true
  try {
    const [tree, list] = await Promise.all([
      questionsApi.getCategoryTree() as any,
      questionsApi.getCategoryList() as any,
    ])
    categoryTree.value = tree
    categoryList.value = list
  } finally {
    catLoading.value = false
  }
}

function handleCategoryClick(data: QuestionCategory) {
  selectedCategoryId.value = data.id
  query.categoryId = data.id
  query.page = 1
  loadQuestions()
}

// 分类 CRUD
const catDialogVisible = ref(false)
const catEditId = ref<string | null>(null)
const catParentId = ref<string | null>(null)
const submitting = ref(false)
const catFormRef = ref<FormInstance>()
const catForm = reactive({ name: '', sortOrder: 0 })
const catRules: FormRules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
}

function openCreateCategory(parentId: string | null) {
  catEditId.value = null
  catParentId.value = parentId
  catForm.name = ''
  catForm.sortOrder = 0
  catDialogVisible.value = true
}

function openEditCategory(data: any) {
  catEditId.value = data.id
  catForm.name = data.name
  catForm.sortOrder = data.sortOrder
  catDialogVisible.value = true
}

async function handleCatSubmit() {
  await catFormRef.value?.validate()
  submitting.value = true
  try {
    if (catEditId.value) {
      await questionsApi.updateCategory(catEditId.value, catForm)
      ElMessage.success('更新成功')
    } else {
      await questionsApi.createCategory({ ...catForm, parentId: catParentId.value ?? undefined })
      ElMessage.success('创建成功')
    }
    catDialogVisible.value = false
    await loadCategories()
  } finally {
    submitting.value = false
  }
}

async function handleRemoveCategory(data: any) {
  await ElMessageBox.confirm(`确定删除分类「${data.name}」吗？`, '提示', { type: 'warning' })
  await questionsApi.removeCategory(data.id)
  ElMessage.success('删除成功')
  await loadCategories()
}

// ─── 题目 ─────────────────────────────────────────────
const loading = ref(false)
const questionList = ref<Question[]>([])
const total = ref(0)
const selectedIds = ref<string[]>([])
const query = reactive({
  keyword: '',
  categoryId: '',
  type: '' as any,
  difficulty: '' as any,
  page: 1,
  pageSize: 20,
})

const typeOptions = [
  { label: '单选题', value: 'SINGLE' },
  { label: '多选题', value: 'MULTIPLE' },
  { label: '判断题', value: 'JUDGE' },
  { label: '填空题', value: 'FILL' },
]
const diffOptions = [
  { label: '易', value: 'EASY' },
  { label: '中', value: 'MEDIUM' },
  { label: '难', value: 'HARD' },
]
const typeMap: Record<string, string> = { SINGLE: '单选', MULTIPLE: '多选', JUDGE: '判断', FILL: '填空' }
const diffMap: Record<string, string> = { EASY: '易', MEDIUM: '中', HARD: '难' }
const typeTagMap: Record<string, string> = { SINGLE: '', MULTIPLE: 'warning', JUDGE: 'success', FILL: 'info' }
const diffTagMap: Record<string, string> = { EASY: 'success', MEDIUM: '', HARD: 'danger' }
const typeLabel = (t: string) => typeMap[t] ?? t
const diffLabel = (d: string) => diffMap[d] ?? d
const typeTagType = (t: string) => typeTagMap[t] as any ?? ''
const diffTagType = (d: string) => diffTagMap[d] as any ?? ''

// 媒体类型标签和图标
const getMediaTypeTag = (type: string) => {
  const map: Record<string, string> = { image: 'success', video: 'warning', audio: 'info', file: '' }
  return map[type] || ''
}

const getMediaIcon = (type: string) => {
  if (type === 'image') return 'Picture'
  if (type === 'video') return 'VideoCamera'
  if (type === 'audio') return 'Headset'
  return 'Document'
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

async function loadQuestions() {
  loading.value = true
  try {
    const res = await questionsApi.list(query) as any
    questionList.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.page = 1
  loadQuestions()
}

function handleReset() {
  query.keyword = ''
  query.type = '' as any
  query.difficulty = '' as any
  query.categoryId = selectedCategoryId.value
  query.page = 1
  loadQuestions()
}

async function handleRemove(row: Question) {
  await ElMessageBox.confirm('确定删除该题目吗？', '提示', { type: 'warning' })
  await questionsApi.remove(row.id)
  ElMessage.success('删除成功')
  await loadQuestions()
}

async function handleBatchRemove() {
  await ElMessageBox.confirm(`确定删除选中的 ${selectedIds.value.length} 道题目吗？`, '提示', { type: 'warning' })
  await questionsApi.batchRemove(selectedIds.value)
  ElMessage.success('删除成功')
  await loadQuestions()
}

// ─── 题目表单 ──────────────────────────────────────────
const questionDialogVisible = ref(false)
const editId = ref<string | null>(null)
const qFormRef = ref<FormInstance>()
const fillAnswer = ref('')

const qForm = reactive<{
  type: string; difficulty: string; score: number
  categoryId: string; content: string; explanation: string
  options: { label: string; content: string; isCorrect: boolean }[]
}>({
  type: 'SINGLE', difficulty: 'MEDIUM', score: 1,
  categoryId: '', content: '', explanation: '',
  options: [
    { label: 'A', content: '', isCorrect: false },
    { label: 'B', content: '', isCorrect: false },
    { label: 'C', content: '', isCorrect: false },
    { label: 'D', content: '', isCorrect: false },
  ],
})

const qRules: FormRules = {
  type: [{ required: true }],
  content: [{ required: true, message: '请输入题目内容', trigger: 'blur' }],
}

const singleCorrectIdx = computed(() =>
  qForm.options.findIndex((o) => o.isCorrect),
)

function setSingleCorrect(idx: number) {
  qForm.options.forEach((o, i) => { o.isCorrect = i === idx })
}

const optionLabels = 'ABCDEFGHIJ'.split('')
function addOption() {
  const label = optionLabels[qForm.options.length] ?? String(qForm.options.length + 1)
  qForm.options.push({ label, content: '', isCorrect: false })
}

function removeOption(idx: number) {
  qForm.options.splice(idx, 1)
  qForm.options.forEach((o, i) => { o.label = optionLabels[i] ?? String(i + 1) })
}

watch(() => qForm.type, (t) => {
  if (t === 'JUDGE') {
    qForm.options = [
      { label: 'A', content: '正确', isCorrect: false },
      { label: 'B', content: '错误', isCorrect: false },
    ]
  } else if (t === 'FILL') {
    qForm.options = []
  } else if (qForm.options.length < 2) {
    qForm.options = [
      { label: 'A', content: '', isCorrect: false },
      { label: 'B', content: '', isCorrect: false },
      { label: 'C', content: '', isCorrect: false },
      { label: 'D', content: '', isCorrect: false },
    ]
  }
})

// ─── 媒体资源管理 ──────────────────────────────────────────
const uploadRef = ref()

// 待上传文件（本地临时存储，题目保存后才上传到服务器）
interface PendingMediaFile extends File {
  uid: string | number
  caption: string
  previewUrl?: string
}
const pendingMediaFiles = ref<PendingMediaFile[]>([])

// 已上传文件（从服务器加载的）
const mediaItems = ref<QuestionMedia[]>([])

// 文件类型映射
const getFileTypeName = (type: string) => {
  if (type.startsWith('image/')) return '图片'
  if (type.startsWith('video/')) return '视频'
  if (type.startsWith('audio/')) return '音频'
  return '文件'
}

const getFileTagType = (type: string) => {
  if (type.startsWith('image/')) return 'success'
  if (type.startsWith('video/')) return 'warning'
  if (type.startsWith('audio/')) return 'info'
  return ''
}

// 文件改变时直接处理（不等待上传）
function handleFileChange(uploadFile: any) {
  console.log('[媒体上传] handleFileChange 被调用', uploadFile)
  const rawFile = uploadFile.raw as File
  if (!rawFile) {
    console.log('[媒体上传] 没有文件')
    return
  }

  console.log('[媒体上传] 选择文件:', {
    name: rawFile.name,
    size: rawFile.size,
    type: rawFile.type
  })

  // 检查文件大小（50MB 限制）
  if (rawFile.size > 50 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 50MB')
    if (uploadRef.value) {
      uploadRef.value.clearFiles()
    }
    return
  }

  // 生成唯一 ID
  const uid = Date.now() + Math.random()

  // 创建预览 URL
  const previewUrl = URL.createObjectURL(rawFile)

  // 添加到待上传列表
  const pendingFile = rawFile as PendingMediaFile
  pendingFile.uid = uid
  pendingFile.caption = ''
  pendingFile.previewUrl = previewUrl
  pendingMediaFiles.value.push(pendingFile)

  console.log('[媒体上传] 已添加到待上传列表，当前数量:', pendingMediaFiles.value.length)

  ElMessage.success(`已添加：${rawFile.name}`)

  // 清除上传组件的文件列表
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
}

// handleMediaUpload 用于 http-request（当 auto-upload=true 时使用）
async function handleMediaUpload(file: any) {
  console.log('[媒体上传] handleMediaUpload 被调用（备用）')
  handleFileChange(file)
}

function beforeMediaUpload(file: File) {
  const isAllowed = file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/')
  if (!isAllowed) {
    ElMessage.error('只能上传图片、视频或音频文件')
    if (uploadRef.value) {
      uploadRef.value.clearFiles()
    }
    return false
  }
  const isLt50M = file.size / 1024 / 1024 < 50
  if (!isLt50M) {
    ElMessage.error('文件大小不能超过 50MB')
    if (uploadRef.value) {
      uploadRef.value.clearFiles()
    }
    return false
  }
  return true
}

// 删除待上传文件
function removePendingFile(file: PendingMediaFile) {
  // 释放预览 URL
  if (file.previewUrl) {
    URL.revokeObjectURL(file.previewUrl)
  }
  pendingMediaFiles.value = pendingMediaFiles.value.filter(f => f.uid !== file.uid)
}

// 删除已上传文件
async function removeMediaItem(media: QuestionMedia) {
  await ElMessageBox.confirm('确定删除该媒体文件吗？', '提示', { type: 'warning' })
  try {
    await questionsApi.removeMedia(media.id)
    mediaItems.value = mediaItems.value.filter(m => m.id !== media.id)
    ElMessage.success('删除成功')
  } catch (e: any) {
    ElMessage.error(e.message || '删除失败')
  }
}

async function updateMediaCaption(media: QuestionMedia) {
  // 目前 caption 更新需要重新上传或调用更新接口
  // 简化处理：暂时只本地更新，保存题目时一并提交
}

// ─── 表单操作 ──────────────────────────────────────────
function openCreate() {
  editId.value = null
  Object.assign(qForm, {
    type: 'SINGLE', difficulty: 'MEDIUM', score: 1,
    categoryId: selectedCategoryId.value, content: '', explanation: '',
    options: [
      { label: 'A', content: '', isCorrect: false },
      { label: 'B', content: '', isCorrect: false },
      { label: 'C', content: '', isCorrect: false },
      { label: 'D', content: '', isCorrect: false },
    ],
  })
  fillAnswer.value = ''
  mediaItems.value = []
  // 清理待上传文件的预览 URL
  pendingMediaFiles.value.forEach(f => {
    if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
  })
  pendingMediaFiles.value = []
  questionDialogVisible.value = true
}

function openEdit(row: Question) {
  editId.value = row.id
  Object.assign(qForm, {
    type: row.type,
    difficulty: row.difficulty,
    score: row.score,
    categoryId: row.categoryId ?? '',
    content: row.content,
    explanation: row.explanation ?? '',
    options: row.type === 'FILL' ? [] : row.options.map(o => ({ ...o })),
  })
  if (row.type === 'FILL') {
    fillAnswer.value = row.options[0]?.content ?? ''
  }
  // 清理待上传文件的预览 URL
  pendingMediaFiles.value.forEach(f => {
    if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
  })
  pendingMediaFiles.value = []
  mediaItems.value = row.mediaItems ? row.mediaItems.map(m => ({ ...m })) : []
  questionDialogVisible.value = true
}

function resetQuestionForm() {
  qFormRef.value?.resetFields()
}

// 对话框关闭时清理待上传文件
function handleDialogClose() {
  qFormRef.value?.resetFields()
  // 清理待上传文件的预览 URL
  pendingMediaFiles.value.forEach(f => {
    if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
  })
  pendingMediaFiles.value = []
}

async function handleQuestionSubmit() {
  // 选择题必须先选择正确答案
  if (qForm.type === 'SINGLE' || qForm.type === 'MULTIPLE') {
    const hasCorrect = qForm.options.some(o => o.isCorrect)
    if (!hasCorrect) {
      ElMessage.warning('请至少选择一个正确答案')
      return
    }
  }

  await qFormRef.value?.validate()
  submitting.value = true
  try {
    console.log('[题目保存] 开始保存题目，editId:', editId.value)
    console.log('[题目保存] 待上传文件数量:', pendingMediaFiles.value.length)
    console.log('[题目保存] qForm.type:', qForm.type)
    console.log('[题目保存] qForm.options:', qForm.options)
    console.log('[题目保存] payload:', {
      type: qForm.type,
      content: qForm.content,
      options: qForm.type === 'FILL' ? fillAnswer.value : qForm.options
    })

    // 第一步：保存题目（不包含待上传的媒体文件）
    const payload: any = {
      ...qForm,
      mediaItems: mediaItems.value.map(m => ({
        id: m.id,
        type: m.type,
        url: m.url,
        caption: m.caption,
        sortOrder: m.sortOrder,
        fileSize: m.fileSize,
        duration: m.duration,
      })),
    }
    if (qForm.type === 'FILL') {
      payload.options = fillAnswer.value
        ? [{ label: '1', content: fillAnswer.value, isCorrect: true, sortOrder: 0 }]
        : []
    }

    let questionId = editId.value

    if (editId.value) {
      // 编辑：直接更新
      console.log('[题目保存] 更新现有题目')
      await questionsApi.update(editId.value, payload)
      ElMessage.success('更新成功')
    } else {
      // 新增：先创建题目
      console.log('[题目保存] 创建新题目，payload:', JSON.stringify(payload, null, 2))
      const result = await questionsApi.create(payload) as any
      questionId = result.id
      editId.value = result.id
      console.log('[题目保存] 题目创建成功，ID:', questionId)
      ElMessage.success('创建成功')
    }

    // 第二步：上传待上传的媒体文件
    console.log('[媒体上传] 条件检查 - pendingMediaFiles.length:', pendingMediaFiles.value.length, 'questionId:', questionId)
    console.log('[媒体上传] 条件检查结果:', pendingMediaFiles.value.length > 0 && questionId)

    if (pendingMediaFiles.value.length > 0 && questionId) {
      console.log('[媒体上传] 开始上传媒体文件到题目:', questionId)
      console.log('[媒体上传] 待上传文件列表:', pendingMediaFiles.value.map(f => ({ name: f.name, size: f.size, type: f.type })))
      ElMessage.info('正在上传媒体文件...')

      for (let i = 0; i < pendingMediaFiles.value.length; i++) {
        const file = pendingMediaFiles.value[i]
        try {
          console.log(`[媒体上传] 上传第 ${i + 1}/${pendingMediaFiles.value.length} 个文件:`, file.name)
          console.log('[媒体上传] FormData 内容 - file:', file.name, 'caption:', file.caption)

          const formData = new FormData()
          formData.append('file', file)
          if (file.caption) {
            formData.append('caption', file.caption)
          }

          console.log('[媒体上传] 准备调用 API...')
          const uploadResult = await questionsApi.uploadMedia(questionId, formData) as any
          console.log('[媒体上传] API 返回结果:', uploadResult)

          // 保存用户输入的说明文字
          if (file.caption) {
            uploadResult.caption = file.caption
          }
          mediaItems.value.push(uploadResult)

          // 显示进度
          ElMessage.success(`已上传 ${i + 1}/${pendingMediaFiles.value.length}: ${file.name}`)
        } catch (e: any) {
          console.error('[媒体上传] 上传失败:', e)
          ElMessage.error(`文件 ${file.name} 上传失败：${e.message}`)
        }
      }

      ElMessage.success('媒体文件上传完成')
    } else {
      if (pendingMediaFiles.value.length === 0) {
        console.log('[媒体上传] 没有待上传的文件')
      }
      if (!questionId) {
        console.log('[媒体上传] 题目 ID 为空')
      }
    }

    // 第三步：清理待上传文件
    pendingMediaFiles.value.forEach(f => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
    })
    pendingMediaFiles.value = []

    questionDialogVisible.value = false
    await loadQuestions()
  } finally {
    submitting.value = false
  }
}

// ─── 批量导入 ──────────────────────────────────────────
const importDialogVisible = ref(false)
const importResult = ref<{ success: number; failed: number; errors: string[] } | null>(null)

async function handleImportFile(file: any) {
  importResult.value = null
  const rawFile = file.raw as File
  const ext = rawFile.name.split('.').pop()?.toLowerCase()

  if (ext === 'xlsx') {
    const formData = new FormData()
    formData.append('file', rawFile)
    if (selectedCategoryId.value) {
      formData.append('categoryId', selectedCategoryId.value)
    }
    try {
      const res = await questionsApi.importExcel(formData) as any
      importResult.value = res
      await loadQuestions()
    } catch (e: any) {
      ElMessage.error(e.message || 'Excel 导入失败')
    }
  } else if (ext === 'json') {
    const text = await rawFile.text()
    let rows: any[]
    try {
      rows = JSON.parse(text)
      if (!Array.isArray(rows)) throw new Error()
    } catch {
      ElMessage.error('JSON 格式错误')
      return
    }
    importResult.value = null
    const res = await questionsApi.batchImport(rows) as any
    importResult.value = res
    await loadQuestions()
  } else {
    ElMessage.error('仅支持 .xlsx 或 .json 格式')
  }
}

async function handleExport() {
  const params: any = { page: 1, pageSize: 10000 }
  if (query.keyword) params.keyword = query.keyword
  if (query.type) params.type = query.type
  if (query.difficulty) params.difficulty = query.difficulty
  if (selectedCategoryId.value) params.categoryId = selectedCategoryId.value

  const res = await questionsApi.exportExcel(params) as any
  const url = window.URL.createObjectURL(new Blob([res]))
  const a = document.createElement('a')
  a.href = url
  a.download = `题目导出-${new Date().getTime()}.xlsx`
  a.click()
  window.URL.revokeObjectURL(url)
}

function downloadTemplate() {
  const header = '题型，题目内容，难度，分值，分类，答案，解析，选项 A，选项 B，选项 C，选项 D\n'
  const row1 = '单选题，以下哪项属于八纲辨证？，中，2，中医诊断学，A，八纲包括阴阳表里寒热虚实，阴阳表里，气血津液，五行生克，脏腑经络\n'
  const row2 = '判断题，舌红苔黄为热证表现，易，1，中医诊断学，正确，,,,,\n'
  const blob = new Blob(['\uFEFF' + header + row1 + row2], { type: 'text/csv;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '题目导入模板.csv'
  a.click()
  window.URL.revokeObjectURL(url)
}

// ─── AI 智能导入 ──────────────────────────────────────────
const aiImportDialogVisible = ref(false)
const aiProgressDialogVisible = ref(false)
const aiReviewDialogVisible = ref(false)
const aiEditDialogVisible = ref(false)
const aiEditingItem = ref<{
  id: string
  questionType: string
  content: string
  options: { label: string; content: string; isCorrect: boolean }[]
  answer: string
  explanation: string
  difficulty: string
  correctAnswer: string
}>({
  id: '',
  questionType: 'SINGLE',
  content: '',
  options: [],
  answer: '',
  explanation: '',
  difficulty: 'MEDIUM',
  correctAnswer: '',
})
const aiImporting = ref(false)
const aiConfirming = ref(false)
const aiImportModel = ref('')
const aiImportCategoryId = ref<string>('')
const aiImportDifficulty = ref<string>('MEDIUM')
const aiUploadRef = ref()
const aiImportFiles = ref<any[]>([])
const aiTaskId = ref<string>('')
const aiProgress = ref(0)
const aiProgressStatus = ref<'success' | ''>('')
const progressText = ref('')
const aiTaskStatus = ref<'processing' | 'completed'>('processing')
const aiTotalCount = ref(0)
const aiImportItems = ref<(AiImportItem & { selected: boolean })[]>([])
const showUnreviewedOnly = ref(false)

// 可用模型列表
const availableModels = ref<AiModel[]>([])
const aiModelsLoading = ref(false)

// 加载可用模型列表
async function loadAvailableModels() {
  try {
    aiModelsLoading.value = true
    availableModels.value = await questionsApi.getAvailableModels() as any
    // 默认选择第一个模型
    if (availableModels.value.length > 0 && !aiImportModel.value) {
      aiImportModel.value = availableModels.value[0].modelId
    }
  } catch (e: any) {
    console.error('加载模型列表失败:', e)
  } finally {
    aiModelsLoading.value = false
  }
}

// AI 导入文件改变
function handleAiFileChange(uploadFile: any) {
  const rawFile = uploadFile.raw as File
  if (!rawFile) return

  // 检查文件大小
  if (rawFile.size > 50 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 50MB')
    return
  }

  // 检查文件类型
  const ext = rawFile.name.split('.').pop()?.toLowerCase()
  const allowedExts = ['docx', 'pdf', 'jpg', 'jpeg', 'png']
  if (!allowedExts.includes(ext)) {
    ElMessage.error('仅支持 .docx、.pdf、.jpg、.jpeg、.png 格式')
    return
  }

  // 添加到文件列表
  aiImportFiles.value.push({
    uid: Date.now() + Math.random(),
    name: rawFile.name,
    size: rawFile.size,
    status: 'ready',
    raw: rawFile,
  })

  // 清除上传组件
  if (aiUploadRef.value) {
    aiUploadRef.value.clearFiles()
  }

  ElMessage.success(`已添加：${rawFile.name}`)
}

function handleAiFileUpload(file: any) {
  handleAiFileChange(file)
}

function beforeAiUpload(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  const isAllowed = ['docx', 'pdf', 'jpg', 'jpeg', 'png'].includes(ext)
  if (!isAllowed) {
    ElMessage.error('仅支持 .docx、.pdf、.jpg、.jpeg、.png 格式')
  }
  const isLt50M = file.size / 1024 / 1024 < 50
  if (!isLt50M) {
    ElMessage.error('文件大小不能超过 50MB')
  }
  return isAllowed && isLt50M
}

function removeAiFile(idx: number) {
  aiImportFiles.value.splice(idx, 1)
}

function resetAiImportForm() {
  aiImportFiles.value = []
  aiTaskId.value = ''
  aiProgress.value = 0
  aiImportItems.value = []
  aiProgressDialogVisible.value = false
  aiReviewDialogVisible.value = false
  if (aiUploadRef.value) {
    aiUploadRef.value.clearFiles()
  }
  // 重置时重新加载模型列表
  loadAvailableModels()
}

async function startAiImport() {
  if (aiImportFiles.value.length === 0) {
    ElMessage.warning('请选择文件')
    return
  }

  aiImporting.value = true
  try {
    const files = aiImportFiles.value.map(f => f.raw as File)
    // 传递选中的模型 ID（即 AiModel.modelId 字段，火山的 EP 值）
    const res = await questionsApi.aiImportUpload(files, aiImportModel.value) as any
    aiTaskId.value = res.taskId

    // 打开进度弹窗
    aiProgressDialogVisible.value = true
    progressText.value = '正在上传文件...'
    aiProgress.value = 30

    // 轮询任务状态
    pollTaskStatus()
  } catch (e: any) {
    ElMessage.error(e.message || 'AI 识别失败')
  } finally {
    aiImporting.value = false
  }
}

let pollTimer: NodeJS.Timeout | null = null

async function pollTaskStatus() {
  if (pollTimer) clearInterval(pollTimer)

  pollTimer = setInterval(async () => {
    try {
      const res = await questionsApi.getAiImportTaskDetail(aiTaskId.value) as any
      // 使用后端返回的进度，如果没有则根据状态估算
      if (res.progress !== undefined) {
        aiProgress.value = res.progress
      } else {
        aiProgress.value = res.status === 'completed' ? 100 : 60
      }
      aiTotalCount.value = res.totalCount

      if (res.status === 'completed') {
        aiTaskStatus.value = 'completed'
        aiProgressStatus.value = 'success'
        progressText.value = '识别完成！'
        aiImportItems.value = res.items.map((item: AiImportItem) => ({
          ...item,
          selected: !item.isDuplicate && !item.errorMessage,
        }))
        if (pollTimer) {
          clearInterval(pollTimer)
          pollTimer = null
        }
      } else {
        // 根据进度显示不同提示
        if (res.progress < 50) {
          progressText.value = '正在上传文件...'
        } else if (res.progress < 80) {
          progressText.value = 'AI 正在识别题目，请稍候...'
        } else {
          progressText.value = '正在保存题目...'
        }
      }
    } catch (e) {
      console.error('轮询任务状态失败:', e)
    }
  }, 2000)
}

function openAiReview() {
  aiProgressDialogVisible.value = false
  aiReviewDialogVisible.value = true
}

// 获取题型标签
function getTypeTag(type: string) {
  const map: Record<string, string> = {
    SINGLE: '',
    MULTIPLE: 'warning',
    JUDGE: 'success',
    FILL: 'info',
    A1: '',
    A1_N: 'warning',
    A2: '',
    A3: '',
    A4: '',
    C: 'primary',
  }
  return map[type] || ''
}

// 获取题型标签文字
function getTypeLabel(type: string) {
  const map: Record<string, string> = {
    SINGLE: '单选题',
    MULTIPLE: '多选题',
    JUDGE: '判断题',
    FILL: '填空题',
    A1: 'A1 型题',
    A1_N: 'A1 否定题',
    A2: 'A2 型题',
    A3: 'A3 型题',
    A4: 'A4 型题',
    C: 'C 型题',
  }
  return map[type] || type
}

// 验证答案格式
function validateAnswer(type: string, answer: string): boolean {
  if (!answer) return false
  const trimmed = answer.trim()

  if (type === 'SINGLE' || type === 'A1' || type === 'A1_N' || type === 'A2') {
    return /^[A-E]$/.test(trimmed)
  } else if (type === 'MULTIPLE') {
    return /^[A-E]{2,5}$/.test(trimmed)
  } else if (type === 'JUDGE') {
    return /^[AB]$/.test(trimmed)
  } else if (type === 'FILL') {
    return trimmed.length > 0
  } else if (type === 'A3' || type === 'A4') {
    // A3/A4 型题的答案是 JSON 数组，如 ["C", "A", "B"]
    try {
      const ansArray = JSON.parse(answer)
      return Array.isArray(ansArray) && ansArray.every((a: any) => /^[A-E]$/.test(String(a)))
    } catch {
      return false
    }
  } else if (type === 'C') {
    // C 型题的答案是选项对象数组或标签字符串
    return trimmed.length > 0
  }
  return true
}

// 过滤未校对的题目
const filteredAiItems = computed(() => {
  if (showUnreviewedOnly.value) {
    return aiImportItems.value.filter(item => !item.isDuplicate && !item.errorMessage)
  }
  return aiImportItems.value
})

// 重复题目数量
const duplicateCount = computed(() => {
  return aiImportItems.value.filter(item => item.isDuplicate).length
})

// 已校对数量
const reviewedCount = computed(() => {
  return aiImportItems.value.filter(item => item.selected || item.isDuplicate || !!item.errorMessage).length
})

// 选中的题目数量
const selectedAiItemCount = computed(() => {
  return aiImportItems.value.filter(item => item.selected).length
})

function editAiItem(item: AiImportItem) {
  // 初始化编辑数据
  let correctAnswer = item.answer
  // 从选项中提取正确答案
  if (item.options?.length) {
    const correctOpts = item.options.filter(o => o.isCorrect)
    if (correctOpts.length > 0) {
      correctAnswer = correctOpts.map(o => o.label).join('')
    }
  }

  aiEditingItem.value = {
    id: item.id,
    questionType: item.questionType,
    content: item.content,
    options: item.options ? item.options.map(o => ({ ...o })) : [],
    answer: item.answer,
    explanation: item.explanation || '',
    difficulty: item.difficulty || 'MEDIUM',
    correctAnswer,
  }
  aiEditDialogVisible.value = true
}

function addAiOption() {
  const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
  const idx = aiEditingItem.value.options.length
  if (idx < labels.length) {
    aiEditingItem.value.options.push({ label: labels[idx], content: '', isCorrect: false })
  }
}

function removeAiOption(idx: number) {
  aiEditingItem.value.options.splice(idx, 1)
  // 重新设置 label
  const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
  aiEditingItem.value.options.forEach((opt, i) => {
    opt.label = labels[i]
  })
}

function saveAiEdit() {
  const item = aiImportItems.value.find(i => i.id === aiEditingItem.value.id)
  if (!item) return

  // 保存题目内容
  item.content = aiEditingItem.value.content
  item.questionType = aiEditingItem.value.questionType as any
  item.explanation = aiEditingItem.value.explanation
  item.difficulty = aiEditingItem.value.difficulty as any

  // 处理答案和选项
  if (aiEditingItem.value.questionType === 'FILL') {
    // 填空题
    item.answer = aiEditingItem.value.answer
    item.options = []
  } else if (aiEditingItem.value.questionType === 'JUDGE') {
    // 判断题：固定选项
    item.answer = aiEditingItem.value.correctAnswer
    item.options = [
      { label: 'A', content: '正确', isCorrect: aiEditingItem.value.correctAnswer === 'A' },
      { label: 'B', content: '错误', isCorrect: aiEditingItem.value.correctAnswer === 'B' },
    ]
  } else {
    // 单选/多选
    item.answer = aiEditingItem.value.answer || aiEditingItem.value.options
      .filter(o => o.isCorrect)
      .map(o => o.label)
      .join('')
    item.options = aiEditingItem.value.options.map(o => ({ ...o }))
  }

  aiEditDialogVisible.value = false
  ElMessage.success('保存成功')
}

function skipAiItem(item: AiImportItem) {
  item.selected = false
  ElMessage.success('已跳过：' + item.content.slice(0, 20) + '...')
}

async function confirmAiImport() {
  const selectedItems = aiImportItems.value.filter(item => item.selected)
  if (selectedItems.length === 0) {
    ElMessage.warning('请至少选择一道题目')
    return
  }

  if (!aiImportCategoryId.value) {
    ElMessage.warning('请选择目标分类')
    return
  }

  // 校验答案格式（只提示，不拦截）
  const invalidItems = selectedItems.filter(item => !validateAnswer(item.questionType, item.answer))
  if (invalidItems.length > 0) {
    const confirmed = await ElMessageBox.confirm(
      `发现 ${invalidItems.length} 道题目的答案格式可能不正确，是否继续导入？`,
      '提示',
      { type: 'warning', confirmButtonText: '继续', cancelButtonText: '取消' }
    )
    if (!confirmed) {
      aiConfirming.value = false
      return
    }
  }

  aiConfirming.value = true
  try {
    const itemIds = selectedItems.map(item => item.id)
    const res = await questionsApi.confirmAiImport(
      aiTaskId.value,
      itemIds,
      aiImportCategoryId.value,
      aiImportDifficulty.value || undefined,
    ) as any

    ElMessage.success(`导入成功：${res.success} 道题目`)
    aiReviewDialogVisible.value = false
    aiImportDialogVisible.value = false
    await loadQuestions()
  } catch (e: any) {
    ElMessage.error(e.message || '导入失败')
  } finally {
    aiConfirming.value = false
  }
}

onMounted(() => {
  loadCategories()
  loadQuestions()
  loadAvailableModels()
})
</script>

<style scoped>
.questions-page {
  display: flex;
  gap: 16px;
  padding: 16px;
  height: calc(100vh - 80px);
}
.category-panel {
  width: 220px;
  flex-shrink: 0;
  overflow-y: auto;
}
.question-panel {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.cat-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
.cat-actions {
  display: none;
  gap: 2px;
}
.cat-node:hover .cat-actions {
  display: flex;
}
.left, .right {
  display: flex;
  gap: 8px;
  align-items: center;
}
.pagination {
  margin-top: 12px;
  justify-content: flex-end;
}
.question-content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.question-content {
  font-size: 13px;
}
.question-media-preview {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.options-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.options-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
  margin-bottom: 2px;
}
.options-hint b {
  color: #67c23a;
}
.option-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 4px;
  transition: background 0.2s;
}
.option-row.is-correct {
  background: #f0f9eb;
}
.option-correct {
  flex-shrink: 0;
}
.option-label {
  flex-shrink: 0;
  width: 32px;
  text-align: center;
}
.option-input {
  flex: 1;
}
.import-tips {
  margin-bottom: 16px;
}
.import-tips p {
  margin: 4px 0;
  font-size: 13px;
  color: #606266;
}
.tip-note {
  font-size: 12px;
  color: #909399;
}
.import-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.import-result {
  margin-top: 12px;
}
.error-list {
  margin-top: 8px;
  padding-left: 20px;
  font-size: 12px;
  color: #e6a23c;
  max-height: 100px;
  overflow-y: auto;
}

/* 媒体上传样式 */
.media-uploader {
  margin-bottom: 16px;
}
.media-uploader .el-upload {
  width: 100%;
}
.media-uploader .el-upload-dragger {
  width: 100%;
  padding: 20px;
}

/* 媒体列表样式 */
.media-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-height: 400px;
  overflow-y: auto;
  background: #f5f7fa;
  border-radius: 4px;
}
.media-list-header {
  padding: 8px 12px;
  font-size: 13px;
  color: #606266;
  font-weight: 500;
  border-bottom: 1px solid #e4e7ed;
}

/* 待上传列表（蓝色边框） */
.pending-list {
  border: 1px solid #d9ecff;
  background: #f0f9ff;
}
.pending-list .media-list-header {
  color: #409eff;
  border-bottom-color: #d9ecff;
}

/* 已上传列表（绿色边框） */
.uploaded-list {
  border: 1px solid #e1f3d8;
  background: #f0f9eb;
}
.uploaded-list .media-list-header {
  color: #67c23a;
  border-bottom-color: #e1f3d8;
}

.media-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  background: #fff;
}
.media-preview {
  flex-shrink: 0;
}
.media-thumb {
  width: 120px;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
  transition: opacity 0.2s;
}
.media-thumb:hover {
  opacity: 0.8;
}
.media-thumb-audio {
  width: 200px;
}
.media-file-icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 4px;
  color: #909399;
}
.media-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.media-name {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.media-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #909399;
}

/* AI 智能导入样式 */
.ai-import-tips {
  margin-bottom: 16px;
  padding: 12px;
  background: #f0f9ff;
  border-radius: 4px;
  border: 1px solid #d9ecff;
}
.ai-import-tips p {
  margin: 4px 0;
  font-size: 13px;
  color: #606266;
}
.ai-import-tips .tip-note {
  font-size: 12px;
  color: #909399;
}

.ai-upload .el-upload-dragger {
  padding: 40px 20px;
}

.ai-file-list {
  margin-top: 12px;
  max-height: 200px;
  overflow-y: auto;
}
.ai-file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 8px;
}
.ai-file-item .file-name {
  flex: 1;
  font-size: 13px;
  color: #606266;
}
.ai-file-item .file-size {
  font-size: 12px;
  color: #909399;
  margin: 0 8px;
}

/* AI 编辑弹窗 */
.options-edit-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.option-edit-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.judge-options-edit {
  padding: 12px 0;
}

/* AI 进度弹窗 */
.ai-progress-content {
  text-align: center;
  padding: 20px;
}
.progress-text {
  margin: 16px 0 8px;
  font-size: 14px;
  color: #606266;
}
.progress-detail {
  margin-top: 16px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 4px;
}
.processing-animation {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #409eff;
}
.completed-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #67c23a;
  font-size: 14px;
}

/* AI 校对弹窗 */
.ai-review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
}
.ai-review-header .header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.ai-items-list {
  max-height: 500px;
  overflow-y: auto;
}
.ai-item {
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  margin-bottom: 12px;
  background: #fff;
}
.ai-item.is-duplicate {
  border-color: #e6a23c;
  background: #fdf6ec;
}
.ai-item.is-error {
  border-color: #f56c6c;
  background: #fef0f0;
}
.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.duplicate-warning {
  font-size: 12px;
  color: #e6a23c;
}
.error-message {
  font-size: 12px;
  color: #f56c6c;
}
.item-content {
  font-size: 13px;
  color: #303133;
  margin-bottom: 8px;
  line-height: 1.6;
}
.item-content strong {
  color: #909399;
  margin-right: 4px;
}
.item-options {
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
}
.item-options strong {
  color: #909399;
  margin-right: 4px;
}
.item-options .option {
  display: inline-block;
  margin-right: 12px;
}
.item-options .option.correct {
  color: #67c23a;
  font-weight: 500;
}
.item-answer {
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
}
.item-answer strong {
  color: #909399;
  margin-right: 4px;
}
.item-answer .answer-error {
  color: #f56c6c;
  margin-left: 8px;
  font-size: 12px;
}
.item-explanation {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
  padding: 8px;
  background: #fafafa;
  border-radius: 4px;
}
.item-explanation strong {
  color: #909399;
  margin-right: 4px;
}
.item-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
