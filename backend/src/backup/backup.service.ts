import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BackupService {
  constructor(private readonly prisma: PrismaService) {}

  async generateFullDatabaseBackup() {
    const timestamp = new Date();

    const [
      academySettings,
      users,
      courses,
      teachers,
      teacherCourses,
      students,
      studentCourses,
      subscriptionPlans,
      studentSubscriptions,
      classSessions,
      classTeachers,
      classStudents,
    ] = await Promise.all([
      this.prisma.academySetting.findMany(),
      this.prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          role: true,
          passwordHash: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.course.findMany(),
      this.prisma.teacher.findMany(),
      this.prisma.teacherCourse.findMany(),
      this.prisma.student.findMany(),
      this.prisma.studentCourse.findMany(),
      this.prisma.subscriptionPlan.findMany(),
      this.prisma.studentSubscription.findMany(),
      this.prisma.classSession.findMany(),
      this.prisma.classTeacher.findMany(),
      this.prisma.classStudent.findMany(),
    ]);

    const totalRecords =
      academySettings.length +
      users.length +
      courses.length +
      teachers.length +
      teacherCourses.length +
      students.length +
      studentCourses.length +
      subscriptionPlans.length +
      studentSubscriptions.length +
      classSessions.length +
      classTeachers.length +
      classStudents.length;

    const backupPayload = {
      exportMetadata: {
        application: 'Arte Suave BJJ Academy Management System',
        schemaVersion: '1.0.0',
        exportedAt: timestamp.toISOString(),
        totalTables: 12,
        totalRecords,
        summary: {
          academySettings: academySettings.length,
          users: users.length,
          courses: courses.length,
          teachers: teachers.length,
          teacherCourses: teacherCourses.length,
          students: students.length,
          studentCourses: studentCourses.length,
          subscriptionPlans: subscriptionPlans.length,
          studentSubscriptions: studentSubscriptions.length,
          classSessions: classSessions.length,
          classTeachers: classTeachers.length,
          classStudents: classStudents.length,
        },
      },
      data: {
        academySettings,
        users,
        courses,
        teachers,
        teacherCourses,
        students,
        studentCourses,
        subscriptionPlans,
        studentSubscriptions,
        classSessions,
        classTeachers,
        classStudents,
      },
    };

    return {
      filename: `bjj-academy-backup-${timestamp.toISOString().replace(/[:.]/g, '-')}.json`,
      content: JSON.stringify(backupPayload, null, 2),
    };
  }
}

