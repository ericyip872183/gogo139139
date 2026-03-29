/**
 * 文件：export-ai-providers.js
 * 说明：导出 AI 服务商和模型数据，用于同步到记忆文档
 * 使用方法：node scripts/export-ai-providers.js
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function exportAiProviders() {
  try {
    console.log('📊 开始导出 AI 服务商和模型数据...\n')

    // 查询所有服务商
    const providers = await prisma.aiProvider.findMany({
      include: {
        models: {
          orderBy: [
            { type: 'asc' },
            { createdAt: 'asc' }
          ]
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    console.log(`✅ 找到 ${providers.length} 个服务商\n`)

    // 格式化输出
    const output = {
      exportTime: new Date().toISOString(),
      providers: providers.map(provider => ({
        id: provider.id,
        name: provider.name,
        baseUrl: provider.baseUrl,
        imageEndpoint: provider.imageEndpoint,
        authType: provider.authType,
        supportImageGeneration: provider.supportImageGeneration,
        isEnabled: provider.isEnabled,
        models: provider.models.map(model => ({
          id: model.id,
          name: model.name,
          modelId: model.modelId,
          type: model.type,
          isEp: model.isEp,
          inputPrice: model.inputPrice.toString(),
          outputPrice: model.outputPrice.toString(),
          isEnabled: model.isEnabled,
          lastStatus: model.lastStatus
        }))
      }))
    }

    // 输出到控制台
    console.log('📄 服务商和模型数据：')
    console.log(JSON.stringify(output, null, 2))

    // 保存到文件
    const outputPath = path.join(__dirname, '..', 'ai-providers-export.json')
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8')
    console.log(`\n✅ 数据已保存到: ${outputPath}`)

    return output
  } catch (error) {
    console.error('❌ 导出失败:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 执行导出
exportAiProviders()
