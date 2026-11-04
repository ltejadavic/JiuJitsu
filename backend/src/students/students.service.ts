import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

export type SubscriptionStatus = 'ACTIVE' | 'FUTURE' | 'EXPIRED' | 'NONE';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  private computeSubscriptionStatus(subscriptions: any[]): {
    status: SubscriptionStatus;
    currentSubscription: any | null;
  } {
    if (!subscriptions || subscriptions.length === 0) {
      return { status: 'NONE', currentSubscription: null };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check for active
    const active = subscriptions.find((sub) => {
      const start = new Date(sub.startDate);
      const end = new Date(sub.endDate);
      return start <= today && end >= today;
    });

    if (active) {
      return { status: 'ACTIVE', currentSubscription: active };
    }

    // Check for future
    const future = subscriptions.find((sub) => {
      const start = new Date(sub.startDate);
      return start > today;
    });

    if (future) {
      return { status: 'FUTURE', currentSubscription: future };
    }

    // Otherwise most recent is expired
    return { status: 'EXPIRED', currentSubscription: subscriptions[0] || null };
  }

  async findAll(q?: string, courseId?: string, includeInactive = false) {
    const students = await this.prisma.student.findMany({
      where: {
        deletedAt: null,
        ...(includeInactive ? {} : { isActive: true }),
        ...(q && {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
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
        subscriptions: {
          include: {
            plan: true,
          },
          orderBy: { endDate: 'desc' },
        },
        _count: {
          select: {
            attendances: true,
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    return students.map((student) => {
      const { status, currentSubscription } = this.computeSubscriptionStatus(student.subscriptions);
      return {
        ...student,
        subscriptionStatus: status,
        currentSubscription,
      };
    });
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findFirst({
      where: { id, deletedAt: null },
      include: {
        courses: {
          include: {
            course: true,
          },
        },
        subscriptions: {
          include: {
            plan: true,
          },
          orderBy: { startDate: 'desc' },
        },
        attendances: {
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
          take: 30,
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }

    // Calculate training metrics
    const attendanceAgg = await this.prisma.classStudent.aggregate({
      where: {
        studentId: id,
        attendanceStatus: 'ATTENDED',
        classSession: {
          status: 'COMPLETED',
        },
      },
      _sum: {
        minutesAttended: true,
      },
      _count: {
        id: true,
      },
    });

    const totalMinutes = attendanceAgg._sum.minutesAttended || 0;
    const attendedClasses = attendanceAgg._count.id;
    const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

    const { status, currentSubscription } = this.computeSubscriptionStatus(student.subscriptions);

    return {
      ...student,
      subscriptionStatus: status,
      currentSubscription,
      metrics: {
        totalMinutes,
        totalHours,
        attendedClasses,
      },
    };
  }

  async create(createStudentDto: CreateStudentDto) {
    const { courseIds, birthDate, ...rest } = createStudentDto;

    return this.prisma.student.create({
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

  async update(id: string, updateStudentDto: UpdateStudentDto) {
    await this.findOne(id);
    const { courseIds, birthDate, ...rest } = updateStudentDto;

    return this.prisma.$transaction(async (tx) => {
      if (courseIds !== undefined) {
        await tx.studentCourse.deleteMany({
          where: { studentId: id },
        });

        if (courseIds.length > 0) {
          await tx.studentCourse.createMany({
            data: courseIds.map((courseId) => ({
              studentId: id,
              courseId,
            })),
          });
        }
      }

      return tx.student.update({
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

    // Soft delete to protect historical attendance records
    return this.prisma.student.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });
  }
}

