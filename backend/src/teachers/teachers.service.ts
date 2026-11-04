import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';

@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(q?: string, courseId?: string, includeInactive = false) {
    return this.prisma.teacher.findMany({
      where: {
        deletedAt: null,
        ...(includeInactive ? {} : { isActive: true }),
        ...(q && {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { email: { contains: q } },
          ],
        }),
        ...(courseId && {
          courses: {
            some: { courseId },
          },
        }),
      },
      include: {
        courses: {
          include: {
            course: true,
          },
        },
        _count: {
          select: {
            classSessions: true,
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async findOne(id: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id, deletedAt: null },
      include: {
        courses: {
          include: {
            course: true,
          },
        },
        classSessions: {
          include: {
            classSession: {
              include: {
                course: true,
              },
            },
          },
          orderBy: {
            classSession: {
              startTime: 'desc',
            },
          },
          take: 20,
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException(`Instructor with ID ${id} not found`);
    }

    // Compute total taught minutes
    const taughtMinutesAgg = await this.prisma.classTeacher.aggregate({
      where: {
        teacherId: id,
        classSession: {
          status: 'COMPLETED',
        },
      },
      _sum: {
        minutesTaught: true,
      },
      _count: {
        id: true,
      },
    });

    const totalMinutes = taughtMinutesAgg._sum.minutesTaught || 0;
    const completedClasses = taughtMinutesAgg._count.id;
    const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
    const hourlyRate = teacher.hourlyRate ? Number(teacher.hourlyRate) : null;
    const estimatedCost = hourlyRate !== null ? Math.round(totalHours * hourlyRate * 100) / 100 : null;

    return {
      ...teacher,
      metrics: {
        totalMinutes,
        totalHours,
        completedClasses,
        estimatedCost,
      },
    };
  }

  async create(createTeacherDto: CreateTeacherDto) {
    const { courseIds, birthDate, ...rest } = createTeacherDto;

    return this.prisma.teacher.create({
      data: {
        ...rest,
        birthDate: birthDate ? new Date(birthDate) : null,
        ...(courseIds && courseIds.length > 0 && {
          courses: {
            create: courseIds.map((courseId) => ({
              course: { connect: { id: courseId } },
            })),
          },
        }),
      },
      include: {
        courses: {
          include: { course: true },
        },
      },
    });
  }

  async update(id: string, updateTeacherDto: UpdateTeacherDto) {
    await this.findOne(id);
    const { courseIds, birthDate, ...rest } = updateTeacherDto;

    return this.prisma.$transaction(async (tx) => {
      if (courseIds !== undefined) {
        // Reset course relations
        await tx.teacherCourse.deleteMany({
          where: { teacherId: id },
        });

        if (courseIds.length > 0) {
          await tx.teacherCourse.createMany({
            data: courseIds.map((courseId) => ({
              teacherId: id,
              courseId,
            })),
          });
        }
      }

      return tx.teacher.update({
        where: { id },
        data: {
          ...rest,
          ...(birthDate !== undefined && {
            birthDate: birthDate ? new Date(birthDate) : null,
          }),
        },
        include: {
          courses: {
            include: { course: true },
          },
        },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    // Soft delete to protect historical class sessions
    return this.prisma.teacher.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });
  }
}

