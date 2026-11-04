import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(includeInactive = false) {
    return this.prisma.course.findMany({
      where: includeInactive ? undefined : { isActive: true },
      include: {
        _count: {
          select: {
            students: true,
            teachers: true,
            classSessions: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            students: true,
            teachers: true,
            classSessions: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return course;
  }

  async create(createCourseDto: CreateCourseDto) {
    const existing = await this.prisma.course.findUnique({
      where: { name: createCourseDto.name.trim() },
    });

    if (existing) {
      throw new ConflictException(`Course '${createCourseDto.name}' already exists`);
    }

    return this.prisma.course.create({
      data: {
        name: createCourseDto.name.trim(),
        description: createCourseDto.description?.trim(),
        colorHex: createCourseDto.colorHex || '#3B82F6',
      },
    });
  }

  async update(id: string, updateCourseDto: UpdateCourseDto) {
    await this.findOne(id);

    if (updateCourseDto.name) {
      const conflict = await this.prisma.course.findFirst({
        where: {
          name: updateCourseDto.name.trim(),
          id: { not: id },
        },
      });

      if (conflict) {
        throw new ConflictException(`Course '${updateCourseDto.name}' already exists`);
      }
    }

    return this.prisma.course.update({
      where: { id },
      data: {
        ...(updateCourseDto.name && { name: updateCourseDto.name.trim() }),
        ...(updateCourseDto.description !== undefined && { description: updateCourseDto.description?.trim() }),
        ...(updateCourseDto.colorHex && { colorHex: updateCourseDto.colorHex }),
        ...(updateCourseDto.isActive !== undefined && { isActive: updateCourseDto.isActive }),
      },
    });
  }

  async remove(id: string) {
    const course = await this.findOne(id);

    const classesCount = await this.prisma.classSession.count({
      where: { courseId: id },
    });

    if (classesCount > 0) {
      // Soft disable if it has classes to maintain history
      return this.prisma.course.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return this.prisma.course.delete({
      where: { id },
    });
  }
}

