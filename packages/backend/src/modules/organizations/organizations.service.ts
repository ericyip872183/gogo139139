import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/organization.dto'

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  /** 获取机构下完整组织树 */
  async getTree(tenantId: string) {
    const all = await this.prisma.organization.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
    })
    return this._buildTree(all, null)
  }

  /** 获取扁平列表（用于下拉选择） */
  async getList(tenantId: string) {
    return this.prisma.organization.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
      select: { id: true, name: true, parentId: true, level: true },
    })
  }

  async create(tenantId: string, dto: CreateOrganizationDto) {
    let level = 1
    if (dto.parentId) {
      const parent = await this.prisma.organization.findFirst({
        where: { id: dto.parentId, tenantId },
      })
      if (!parent) throw new NotFoundException('父级组织不存在')
      if (parent.level >= 4) throw new BadRequestException('最多支持4级组织架构')
      level = parent.level + 1
    }

    return this.prisma.organization.create({
      data: {
        tenantId,
        name: dto.name,
        parentId: dto.parentId ?? null,
        level,
        sortOrder: dto.sortOrder ?? 0,
      },
    })
  }

  async update(tenantId: string, id: string, dto: UpdateOrganizationDto) {
    await this._findOrFail(tenantId, id)
    return this.prisma.organization.update({
      where: { id },
      data: dto,
    })
  }

  async remove(tenantId: string, id: string) {
    await this._findOrFail(tenantId, id)
    // 检查是否有子节点
    const children = await this.prisma.organization.count({
      where: { parentId: id, isActive: true },
    })
    if (children > 0) throw new BadRequestException('请先删除子组织')
    // 检查是否有用户
    const users = await this.prisma.userOrg.count({
      where: { organizationId: id },
    })
    if (users > 0) throw new BadRequestException('该组织下还有用户，请先移除用户')

    return this.prisma.organization.update({
      where: { id },
      data: { isActive: false },
    })
  }

  private async _findOrFail(tenantId: string, id: string) {
    const org = await this.prisma.organization.findFirst({
      where: { id, tenantId },
    })
    if (!org) throw new NotFoundException('组织不存在')
    return org
  }

  private _buildTree(list: any[], parentId: string | null): any[] {
    return list
      .filter((item) => item.parentId === parentId)
      .map((item) => ({
        ...item,
        children: this._buildTree(list, item.id),
      }))
  }
}
