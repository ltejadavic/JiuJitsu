import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceStatus, ClassStatus, ClassType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CheckOverlapDto } from './dto/check-overlap.dto';
import { CompleteClassDto } from './dto/complete-class.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { QueryClassesDto } from './dto/query-classes.dto';
import { UpdateClassDto } from './dto/update-class.dto';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async findInWindow(query: QueryClassesDto) {
    const startDate = new Date(query.start);
    const endDate = new Date(query.end);

    return this.prisma.classSession.findMany({
      where: {
        startTime: { lte: endDate },
        endTime: { gte: startDate },
        ...(query.courseId && { courseId: query.courseId }),
        ...(query.status && { status: query.status }),
        ...(query.teacherId && {
          teachers: {
            some: { teacherId: query.teacherId },
          },
        }),
      },
      include: {
        course: true,
        teachers: {
          include: {
            teacher: true,
          },
        },
        students: {
          include: {
            student: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async checkTeacherOverlap(dto: CheckOverlapDto) {
    const teacherIdList = dto.teacherIds.split(',').map((id) => id.trim()).filter(Boolean);
    if (teacherIdList.length === 0) return { hasOverlap: false, overlaps: [] };

    const startTime = new Date(dto.startTime);
    const endTime = new Date(startTime.getTime() + dto.durationMinutes * 60000);

    const conflictingAssignments = await this.prisma.classTeacher.findMany({
      where: {
        teacherId: { in: teacherIdList },
        ...(dto.excludeClassId && { classSessionId: { not: dto.excludeClassId } }),
        classSession: {
          status: { not: ClassStatus.CANCELLED },
          // Overlap condition: startA < endB && endA > startB
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      },
      include: {
        teacher: true,
        classSession: {
          include: {
            course: true,
          },
        },
      },
    });

    if (conflictingAssignments.length === 0) {
      return { hasOverlap: false, overlaps: [] };
    }

    const overlaps = conflictingAssignments.map((assignment) => ({
      teacherId: assignment.teacherId,
      teacherName: `${assignment.teacher.firstName} ${assignment.teacher.lastName}`,
      conflictingClassId: assignment.classSessionId,
      courseName: assignment.classSession.course.name,
      startTime: assignment.classSession.startTime,
      endTime: assignment.classSession.endTime,
    }));

    return {
      hasOverlap: true,
      overlaps,
    };
  }

  async findOne(id: string) {
    const classSession = await this.prisma.classSession.findUnique({
      where: { id },
      include: {
        course: true,
        teachers: {
          include: {
            teacher: true,
          },
        },
        students: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!classSession) {
      throw new NotFoundException(`Class session with ID ${id} not found`);
    }

    return classSession;
  }

  async create(createClassDto: CreateClassDto) {
    const startTime = new Date(createClassDto.startTime);
    const endTime = new Date(startTime.getTime() + createClassDto.durationMinutes * 60000);

    // Validate course exists
    const course = await this.prisma.course.findUnique({
      where: { id: createClassDto.courseId },
    });
    if (!course) {
      throw new NotFoundException(`Course with ID ${createClassDto.courseId} not found`);
    }

    // Clean up studentIds to ensure uniqueness
    const uniqueStudentIds = Array.from(new Set(createClassDto.studentIds || []));
    if (uniqueStudentIds.length === 0) {
      throw new BadRequestException('At least one student must be enrolled in the class.');
    }

    // Clean up teacher assignments to ensure uniqueness
    const seenTeacherIds = new Set<string>();
    const uniqueTeacherAssignments = (createClassDto.teacherAssignments || []).filter((assignment) => {
      if (seenTeacherIds.has(assignment.teacherId)) return false;
      seenTeacherIds.add(assignment.teacherId);
      return true;
    });

    if (uniqueTeacherAssignments.length === 0) {
      throw new BadRequestException('At least one instructor must be assigned to the class.');
    }

    // Verify that all assigned teachers are registered to teach this course
    const teacherIds = uniqueTeacherAssignments.map((a) => a.teacherId);
    const qualifiedTeachers = await this.prisma.teacherCourse.findMany({
      where: {
        courseId: createClassDto.courseId,
        teacherId: { in: teacherIds },
      },
    });

    if (qualifiedTeachers.length !== teacherIds.length) {
      throw new BadRequestException(
        'One or more selected instructors are not qualified to teach the selected course.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const classSession = await tx.classSession.create({
        data: {
          courseId: createClassDto.courseId,
          type: createClassDto.type || ClassType.GROUP,
          status: ClassStatus.SCHEDULED,
          startTime,
          endTime,
          durationMinutes: createClassDto.durationMinutes,
          notes: createClassDto.notes?.trim() || null,
        },
      });

      // Create teacher assignments
      await tx.classTeacher.createMany({
        data: uniqueTeacherAssignments.map((assignment) => ({
          classSessionId: classSession.id,
          teacherId: assignment.teacherId,
          minutesTaught: Math.min(
            assignment.minutesTaught || createClassDto.durationMinutes,
            createClassDto.durationMinutes,
          ),
        })),
      });

      // Create student enrollments
      if (uniqueStudentIds.length > 0) {
        await tx.classStudent.createMany({
          data: uniqueStudentIds.map((studentId) => ({
            classSessionId: classSession.id,
            studentId,
            attendanceStatus: AttendanceStatus.PENDING,
            minutesAttended: 0,
          })),
        });
      }

      return tx.classSession.findUnique({
        where: { id: classSession.id },
        include: {
          course: true,
          teachers: { include: { teacher: true } },
          students: { include: { student: true } },
        },
      });
    });
  }

  async update(id: string, updateClassDto: UpdateClassDto) {
    const existing = await this.findOne(id);

    const durationMinutes = updateClassDto.durationMinutes || existing.durationMinutes;
    const startTime = updateClassDto.startTime ? new Date(updateClassDto.startTime) : existing.startTime;
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
    const targetCourseId = updateClassDto.courseId || existing.courseId;

    // Validate instructors when assignments or course are updated
    let targetTeacherIds: string[] = [];
    let uniqueAssignments: any[] = [];

    if (updateClassDto.teacherAssignments !== undefined) {
      const seenTeacherIds = new Set<string>();
      uniqueAssignments = updateClassDto.teacherAssignments.filter((assignment) => {
        if (seenTeacherIds.has(assignment.teacherId)) return false;
        seenTeacherIds.add(assignment.teacherId);
        return true;
      });

      if (uniqueAssignments.length === 0) {
        throw new BadRequestException('At least one instructor must be assigned to the class.');
      }
      targetTeacherIds = uniqueAssignments.map((a) => a.teacherId);
    } else if (updateClassDto.courseId && updateClassDto.courseId !== existing.courseId) {
      targetTeacherIds = existing.teachers.map((t) => t.teacherId);
    }

    if (targetTeacherIds.length > 0) {
      const qualified = await this.prisma.teacherCourse.findMany({
        where: {
          courseId: targetCourseId,
          teacherId: { in: targetTeacherIds },
        },
      });

      if (qualified.length !== targetTeacherIds.length) {
        throw new BadRequestException(
          'One or more assigned instructors are not qualified to teach the selected course.',
        );
      }
    }

    // Validate students if provided
    let uniqueStudentIds: string[] = [];
    if (updateClassDto.studentIds !== undefined) {
      uniqueStudentIds = Array.from(new Set(updateClassDto.studentIds));
      if (uniqueStudentIds.length === 0) {
        throw new BadRequestException('At least one student must be enrolled in the class.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Update teachers if provided
      if (updateClassDto.teacherAssignments !== undefined) {
        await tx.classTeacher.deleteMany({
          where: { classSessionId: id },
        });

        await tx.classTeacher.createMany({
          data: uniqueAssignments.map((assignment) => ({
            classSessionId: id,
            teacherId: assignment.teacherId,
            minutesTaught: Math.min(assignment.minutesTaught || durationMinutes, durationMinutes),
          })),
        });
      }

      // Update students if provided
      if (updateClassDto.studentIds !== undefined) {
        await tx.classStudent.deleteMany({
          where: { classSessionId: id },
        });

        await tx.classStudent.createMany({
          data: uniqueStudentIds.map((studentId) => ({
            classSessionId: id,
            studentId,
            attendanceStatus: AttendanceStatus.PENDING,
            minutesAttended: 0,
          })),
        });
      }

      return tx.classSession.update({
        where: { id },
        data: {
          ...(updateClassDto.courseId && { courseId: updateClassDto.courseId }),
          ...(updateClassDto.type && { type: updateClassDto.type }),
          durationMinutes,
          startTime,
          endTime,
          ...(updateClassDto.notes !== undefined && { notes: updateClassDto.notes?.trim() || null }),
        },
        include: {
          course: true,
          teachers: { include: { teacher: true } },
          students: { include: { student: true } },
        },
      });
    });
  }

  async complete(id: string, dto: CompleteClassDto) {
    const classSession = await this.findOne(id);
    const duration = classSession.durationMinutes;

    return this.prisma.$transaction(async (tx) => {
      // 1. Update Teachers & Taught Minutes
      await tx.classTeacher.deleteMany({
        where: { classSessionId: id },
      });

      const uniqueTeachers = new Map<string, number>();
      for (const t of dto.teachers) {
        uniqueTeachers.set(t.teacherId, Math.min(t.minutesTaught, duration));
      }

      if (uniqueTeachers.size > 0) {
        await tx.classTeacher.createMany({
          data: Array.from(uniqueTeachers.entries()).map(([teacherId, minutesTaught]) => ({
            classSessionId: id,
            teacherId,
            minutesTaught,
          })),
        });
      }

      // 2. Update Student Attendances & Attended Minutes
      await tx.classStudent.deleteMany({
        where: { classSessionId: id },
      });

      const uniqueStudents = new Map<string, { status: AttendanceStatus; minutes: number }>();
      for (const a of dto.attendances) {
        const isAttended = a.status === AttendanceStatus.ATTENDED;
        const minutes = isAttended ? Math.min(a.minutesAttended || duration, duration) : 0;
        uniqueStudents.set(a.studentId, { status: a.status, minutes });
      }

      if (uniqueStudents.size > 0) {
        await tx.classStudent.createMany({
          data: Array.from(uniqueStudents.entries()).map(([studentId, data]) => ({
            classSessionId: id,
            studentId,
            attendanceStatus: data.status,
            minutesAttended: data.minutes,
          })),
        });
      }

      // Check if session should be flagged as incomplete
      const isIncomplete = uniqueTeachers.size === 0 || uniqueStudents.size === 0;

      return tx.classSession.update({
        where: { id },
        data: {
          status: ClassStatus.COMPLETED,
          isIncomplete,
        },
        include: {
          course: true,
          teachers: { include: { teacher: true } },
          students: { include: { student: true } },
        },
      });
    });
  }

  async cancel(id: string, reason?: string) {
    const classSession = await this.findOne(id);

    const updatedNotes = reason
      ? classSession.notes
        ? `${classSession.notes}\n[Cancelled]: ${reason}`
        : `[Cancelled]: ${reason}`
      : classSession.notes;

    return this.prisma.classSession.update({
      where: { id },
      data: {
        status: ClassStatus.CANCELLED,
        notes: updatedNotes,
      },
      include: {
        course: true,
        teachers: { include: { teacher: true } },
        students: { include: { student: true } },
      },
    });
  }

  async remove(id: string) {
    const classSession = await this.findOne(id);

    if (classSession.status === ClassStatus.COMPLETED) {
      throw new BadRequestException('Completed classes cannot be deleted. You may mark them as cancelled if needed.');
    }

    return this.prisma.classSession.delete({
      where: { id },
    });
  }
}

