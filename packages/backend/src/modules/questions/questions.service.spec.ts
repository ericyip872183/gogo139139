/**
 * 题库管理模块单元测试
 * @file packages/backend/src/modules/questions/questions.service.spec.ts
 * @description 测试题目 CRUD、媒体资源上传等功能
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto, CreateQuestionDto } from './dto/question.dto';
import { QuestionType, Difficulty } from '@prisma/client';

// Mock PrismaService
const mockPrismaService = {
  questionCategory: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  question: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  questionOption: {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  questionMedia: {
    create: jest.fn(),
    delete: jest.fn(),
    findUnique: jest.fn(),
    createMany: jest.fn(),
  },
  $transaction: jest.fn((fn) => fn(mockPrismaService)),
};

describe('QuestionsService', () => {
  let service: QuestionsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<QuestionsService>(QuestionsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── 分类管理测试 ─────────────────────────────────────────

  describe('getCategoryTree', () => {
    it('应该返回树形分类结构', async () => {
      const mockCategories = [
        { id: '1', name: '分类 1', parentId: null, sortOrder: 0 },
        { id: '2', name: '子分类 1', parentId: '1', sortOrder: 0 },
        { id: '3', name: '分类 2', parentId: null, sortOrder: 1 },
      ];

      jest.spyOn(prisma.questionCategory, 'findMany').mockResolvedValue(mockCategories as any);

      const result = await service.getCategoryTree('tenant123');

      expect(result).toHaveLength(2); // 两个根节点
      expect(result[0].children).toHaveLength(1); // 第一个根节点有 1 个子节点
    });
  });

  describe('createCategory', () => {
    it('应该成功创建分类', async () => {
      const dto: CreateCategoryDto = {
        name: '新分类',
        parentId: null,
        sortOrder: 0,
      };

      const mockCategory = { id: 'cat123', ...dto, tenantId: 'tenant123' };

      jest.spyOn(prisma.questionCategory, 'create').mockResolvedValue(mockCategory as any);

      const result = await service.createCategory('tenant123', dto);

      expect(result.name).toBe('新分类');
      expect(prisma.questionCategory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant123',
          name: '新分类',
        }),
      });
    });

    it('父分类不存在时应该抛出异常', async () => {
      const dto: CreateCategoryDto = {
        name: '新分类',
        parentId: 'non-existent',
        sortOrder: 0,
      };

      jest.spyOn(prisma.questionCategory, 'findFirst').mockResolvedValue(null);

      await expect(service.createCategory('tenant123', dto))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('removeCategory', () => {
    it('有子分类时应该禁止删除', async () => {
      jest.spyOn(prisma.questionCategory, 'count').mockResolvedValue(1);

      await expect(service.removeCategory('tenant123', 'cat123'))
        .rejects
        .toThrow('请先删除子分类');
    });

    it('有题目时应该禁止删除', async () => {
      jest.spyOn(prisma.questionCategory, 'count').mockResolvedValue(0);
      jest.spyOn(prisma.question, 'count').mockResolvedValue(1);

      await expect(service.removeCategory('tenant123', 'cat123'))
        .rejects
        .toThrow('该分类下还有题目');
    });
  });

  // ─── 题目管理测试 ─────────────────────────────────────────

  describe('findAll', () => {
    it('应该返回分页题目列表', async () => {
      const mockQuestions = [
        {
          id: 'q1',
          type: QuestionType.SINGLE,
          content: '题目 1',
          difficulty: Difficulty.MEDIUM,
          score: 2,
          options: [],
          mediaItems: [],
        },
      ];

      jest.spyOn(prisma.question, 'findMany').mockResolvedValue(mockQuestions as any);
      jest.spyOn(prisma.question, 'count').mockResolvedValue(1);

      const result = await service.findAll('tenant123', { page: 1, pageSize: 20 });

      expect(result.total).toBe(1);
      expect(result.list).toHaveLength(1);
      expect(result.page).toBe(1);
    });

    it('应该支持关键词搜索', async () => {
      jest.spyOn(prisma.question, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.question, 'count').mockResolvedValue(0);

      await service.findAll('tenant123', { keyword: '测试' });

      expect(prisma.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            content: expect.objectContaining({ contains: '测试' }),
          }),
        }),
      );
    });
  });

  describe('create', () => {
    it('应该成功创建单选题', async () => {
      const dto: CreateQuestionDto & { mediaItems?: any[] } = {
        type: QuestionType.SINGLE,
        content: '测试题目',
        difficulty: Difficulty.MEDIUM,
        score: 2,
        options: [
          { label: 'A', content: '选项 A', isCorrect: true, sortOrder: 0 },
          { label: 'B', content: '选项 B', isCorrect: false, sortOrder: 1 },
        ],
      };

      const mockQuestion = { id: 'q123', ...dto };

      jest.spyOn(prisma.question, 'create').mockResolvedValue(mockQuestion as any);
      jest.spyOn(prisma.questionOption, 'createMany').mockResolvedValue({} as any);

      const result = await service.create('tenant123', dto);

      expect(result.type).toBe('SINGLE');
      expect(prisma.question.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant123',
            type: 'SINGLE',
            content: '测试题目',
          }),
        }),
      );
    });

    it('没有正确选项时应该抛出异常', async () => {
      const dto: CreateQuestionDto & { mediaItems?: any[] } = {
        type: QuestionType.SINGLE,
        content: '测试题目',
        options: [
          { label: 'A', content: '选项 A', isCorrect: false },
          { label: 'B', content: '选项 B', isCorrect: false },
        ],
      };

      await expect(service.create('tenant123', dto))
        .rejects
        .toThrow('必须至少指定一个正确选项');
    });

    it('应该支持创建带媒体资源的题目', async () => {
      const dto: CreateQuestionDto & { mediaItems?: any[] } = {
        type: QuestionType.SINGLE,
        content: '带图片的题目',
        difficulty: Difficulty.MEDIUM,
        score: 2,
        options: [
          { label: 'A', content: '选项 A', isCorrect: true, sortOrder: 0 },
        ],
        mediaItems: [
          { type: 'image', url: '/uploads/questions/t1/img.png', caption: '示意图', sortOrder: 0 },
        ],
      };

      jest.spyOn(prisma.question, 'create').mockResolvedValue({ id: 'q123' } as any);
      jest.spyOn(prisma.questionOption, 'createMany').mockResolvedValue({} as any);
      jest.spyOn(prisma.questionMedia, 'createMany').mockResolvedValue({} as any);

      await service.create('tenant123', dto);

      expect(prisma.questionMedia.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              type: 'image',
              url: '/uploads/questions/t1/img.png',
            }),
          ]),
        }),
      );
    });
  });

  // ─── 媒体资源测试 ─────────────────────────────────────────

  describe('uploadMedia', () => {
    it('应该成功上传媒体文件', async () => {
      const mockFile = {
        originalname: 'test.png',
        mimetype: 'image/png',
        size: 1024,
        buffer: Buffer.from('test'),
      };

      jest.spyOn(service as any, '_findOrFail').mockResolvedValue({ id: 'q123' });
      jest.spyOn(prisma.questionMedia, 'create').mockResolvedValue({
        id: 'media123',
        questionId: 'q123',
        type: 'image',
        url: '/uploads/questions/tenant123/uuid.png',
        fileSize: 1024,
      } as any);

      // Mock fs.mkdir
      jest.spyOn(require('fs/promises'), 'mkdir').mockResolvedValue(undefined);

      const result = await service.uploadMedia('tenant123', 'q123', mockFile as any);

      expect(result.type).toBe('image');
      expect(result.fileSize).toBe(1024);
    });

    it('应该自动识别媒体类型', async () => {
      const mockFile = {
        originalname: 'video.mp4',
        mimetype: 'video/mp4',
        size: 10240,
        buffer: Buffer.from('test'),
      };

      jest.spyOn(service as any, '_findOrFail').mockResolvedValue({ id: 'q123' });
      jest.spyOn(prisma.questionMedia, 'create').mockResolvedValue({
        id: 'media123',
        type: 'video',
      } as any);
      jest.spyOn(require('fs/promises'), 'mkdir').mockResolvedValue(undefined);

      const result = await service.uploadMedia('tenant123', 'q123', mockFile as any);

      expect(result.type).toBe('video');
    });

    it('题目不存在时应该抛出异常', async () => {
      jest.spyOn(service as any, '_findOrFail').mockRejectedValue(
        new NotFoundException('题目不存在'),
      );

      const mockFile = {
        originalname: 'test.png',
        mimetype: 'image/png',
        size: 1024,
        buffer: Buffer.from('test'),
      };

      await expect(
        service.uploadMedia('tenant123', 'non-existent', mockFile as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeMedia', () => {
    it('应该成功删除媒体资源', async () => {
      const mockMedia = {
        id: 'media123',
        questionId: 'q123',
        url: '/uploads/questions/tenant123/test.png',
        question: { tenantId: 'tenant123' },
      };

      jest.spyOn(prisma.questionMedia, 'findUnique').mockResolvedValue(mockMedia as any);
      jest.spyOn(service as any, '_findOrFail').mockResolvedValue({ id: 'q123' });
      jest.spyOn(prisma.questionMedia, 'delete').mockResolvedValue(mockMedia as any);
      jest.spyOn(require('fs/promises'), 'unlink').mockResolvedValue(undefined);

      const result = await service.removeMedia('tenant123', 'media123');

      expect(result.id).toBe('media123');
      expect(prisma.questionMedia.delete).toHaveBeenCalledWith({
        where: { id: 'media123' },
      });
    });

    it('媒体不存在时应该抛出异常', async () => {
      jest.spyOn(prisma.questionMedia, 'findUnique').mockResolvedValue(null);

      await expect(service.removeMedia('tenant123', 'non-existent'))
        .rejects
        .toThrow('媒体资源不存在');
    });
  });

  // ─── 辅助方法测试 ─────────────────────────────────────────

  describe('_validateOptions', () => {
    it('单选题没有选项时应该抛出异常', () => {
      expect(() => {
        (service as any)._validateOptions(QuestionType.SINGLE, []);
      }).toThrow('选择题必须填写选项');
    });

    it('多选题没有正确选项时应该抛出异常', () => {
      expect(() => {
        (service as any)._validateOptions(QuestionType.MULTIPLE, [
          { label: 'A', content: 'A', isCorrect: false },
          { label: 'B', content: 'B', isCorrect: false },
        ]);
      }).toThrow('必须至少指定一个正确选项');
    });

    it('判断题应该通过验证', () => {
      expect(() => {
        (service as any)._validateOptions(QuestionType.JUDGE, []);
      }).not.toThrow();
    });
  });
});
