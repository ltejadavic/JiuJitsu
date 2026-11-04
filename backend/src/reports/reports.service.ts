import { Injectable } from '@nestjs/common';
import { ClassStatus, AttendanceStatus, ClassType } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { ExportExcelDto } from './dto/export-excel.dto';
import { QueryReportsDto } from './dto/query-reports.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(query: QueryReportsDto) {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    const baseWhere = {
      status: ClassStatus.COMPLETED,
      startTime: { gte: startDate, lte: endDate },
      ...(query.courseId && { courseId: query.courseId }),
      ...(query.teacherId && {
        teachers: {
          some: { teacherId: query.teacherId },
        },
      }),
    };

    // 1. Total Completed Classes & Class Hours
    const classAgg = await this.prisma.classSession.aggregate({
      where: baseWhere,
      _count: { id: true },
      _sum: { durationMinutes: true },
    });

    const totalClasses = classAgg._count.id;
    const totalClassMinutes = classAgg._sum.durationMinutes || 0;
    const totalClassHours = Math.round((totalClassMinutes / 60) * 100) / 100;

    // 2. Teaching Hours & Active Teachers
    const teachersInClasses = await this.prisma.classTeacher.findMany({
      where: {
        classSession: baseWhere,
        minutesTaught: { gt: 0 },
      },
      include: {
        teacher: true,
      },
    });

    const totalTeachingMinutes = teachersInClasses.reduce((sum, item) => sum + item.minutesTaught, 0);
    const totalTeachingHours = Math.round((totalTeachingMinutes / 60) * 100) / 100;
    const uniqueTeacherIds = new Set(teachersInClasses.map((item) => item.teacherId));
    const activeTeachersCount = uniqueTeacherIds.size;

    // 3. Estimated Teaching Cost
    let estimatedTeachingCost = 0;
    let unratedTeachingMinutes = 0;

    for (const item of teachersInClasses) {
      if (item.teacher.hourlyRate !== null) {
        const rate = Number(item.teacher.hourlyRate);
        estimatedTeachingCost += (item.minutesTaught / 60) * rate;
      } else {
        unratedTeachingMinutes += item.minutesTaught;
      }
    }

    estimatedTeachingCost = Math.round(estimatedTeachingCost * 100) / 100;
    const unratedTeachingHours = Math.round((unratedTeachingMinutes / 60) * 100) / 100;

    // 4. Student Hours & Unique Attending Students
    const studentAttendances = await this.prisma.classStudent.findMany({
      where: {
        attendanceStatus: AttendanceStatus.ATTENDED,
        classSession: baseWhere,
      },
    });

    const totalStudentMinutes = studentAttendances.reduce((sum, item) => sum + item.minutesAttended, 0);
    const totalStudentHours = Math.round((totalStudentMinutes / 60) * 100) / 100;
    const uniqueStudentIds = new Set(studentAttendances.map((item) => item.studentId));
    const uniqueAttendingStudents = uniqueStudentIds.size;

    // 5. Average Attendance per Class (Mat Density)
    const totalAttendances = studentAttendances.length;
    const averageAttendancePerClass =
      totalClasses > 0 ? Math.round((totalAttendances / totalClasses) * 10) / 10 : 0;

    // 6. Disciplines & Course Breakdown
    const completedClassesInPeriod = await this.prisma.classSession.findMany({
      where: baseWhere,
      select: {
        id: true,
        type: true,
        courseId: true,
        course: { select: { id: true, name: true, colorHex: true } },
      },
    });

    let groupClassesCount = 0;
    let individualClassesCount = 0;
    const courseFrequency = new Map<string, { id: string; name: string; colorHex: string; count: number }>();

    for (const session of completedClassesInPeriod) {
      if (session.type === ClassType.GROUP) {
        groupClassesCount++;
      } else {
        individualClassesCount++;
      }

      const existing = courseFrequency.get(session.courseId) || {
        id: session.course.id,
        name: session.course.name,
        colorHex: session.course.colorHex,
        count: 0,
      };
      existing.count++;
      courseFrequency.set(session.courseId, existing);
    }

    const sortedCourses = Array.from(courseFrequency.values()).sort((a, b) => b.count - a.count);
    const topCourse = sortedCourses[0]
      ? {
          name: sortedCourses[0].name,
          classesCount: sortedCourses[0].count,
          percentage: totalClasses > 0 ? Math.round((sortedCourses[0].count / totalClasses) * 100) : 0,
        }
      : null;

    // 7. Top Coach / Instructor
    const teacherMinutesMap = new Map<string, { id: string; name: string; minutes: number; classesCount: number }>();
    for (const item of teachersInClasses) {
      const existing = teacherMinutesMap.get(item.teacherId) || {
        id: item.teacher.id,
        name: `${item.teacher.firstName} ${item.teacher.lastName}`,
        minutes: 0,
        classesCount: 0,
      };
      existing.minutes += item.minutesTaught;
      existing.classesCount += 1;
      teacherMinutesMap.set(item.teacherId, existing);
    }

    const sortedInstructors = Array.from(teacherMinutesMap.values()).sort((a, b) => b.minutes - a.minutes);
    const topInstructor = sortedInstructors[0]
      ? {
          name: sortedInstructors[0].name,
          totalHours: Math.round((sortedInstructors[0].minutes / 60) * 100) / 100,
          classesCount: sortedInstructors[0].classesCount,
        }
      : null;

    // 8. Registered Active Students & Activation Rate
    const totalRegisteredActiveStudents = await this.prisma.student.count({
      where: { isActive: true, deletedAt: null },
    });
    const studentActivationRate =
      totalRegisteredActiveStudents > 0
        ? Math.round((uniqueAttendingStudents / totalRegisteredActiveStudents) * 1000) / 10
        : 0;

    // 9. Previous Period MoM Comparison
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth();
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    const isFullMonth =
      startDay === 1 &&
      new Date(startYear, startMonth + 1, 0).getDate() === endDay &&
      startDate.getMonth() === endDate.getMonth();

    let prevStartDate: Date;
    let prevEndDate: Date;
    if (isFullMonth) {
      prevStartDate = new Date(startYear, startMonth - 1, 1);
      prevEndDate = new Date(startYear, startMonth, 0, 23, 59, 59, 999);
    } else {
      const spanMs = endDate.getTime() - startDate.getTime();
      prevEndDate = new Date(startDate.getTime() - 1);
      prevStartDate = new Date(prevEndDate.getTime() - spanMs);
    }

    const prevBaseWhere = {
      status: ClassStatus.COMPLETED,
      startTime: { gte: prevStartDate, lte: prevEndDate },
      ...(query.courseId && { courseId: query.courseId }),
      ...(query.teacherId && {
        teachers: { some: { teacherId: query.teacherId } },
      }),
    };

    const prevClassAgg = await this.prisma.classSession.aggregate({
      where: prevBaseWhere,
      _count: { id: true },
      _sum: { durationMinutes: true },
    });
    const prevTotalClasses = prevClassAgg._count.id;
    const prevClassHours = Math.round(((prevClassAgg._sum.durationMinutes || 0) / 60) * 100) / 100;

    const prevTeachersInClasses = await this.prisma.classTeacher.findMany({
      where: { classSession: prevBaseWhere, minutesTaught: { gt: 0 } },
      include: { teacher: true },
    });
    let prevEstimatedCost = 0;
    for (const item of prevTeachersInClasses) {
      if (item.teacher.hourlyRate !== null) {
        prevEstimatedCost += (item.minutesTaught / 60) * Number(item.teacher.hourlyRate);
      }
    }
    prevEstimatedCost = Math.round(prevEstimatedCost * 100) / 100;

    const prevStudentAttendances = await this.prisma.classStudent.findMany({
      where: { attendanceStatus: AttendanceStatus.ATTENDED, classSession: prevBaseWhere },
    });
    const prevUniqueStudents = new Set(prevStudentAttendances.map((s) => s.studentId)).size;
    const prevAvgAttendance =
      prevTotalClasses > 0 ? Math.round((prevStudentAttendances.length / prevTotalClasses) * 10) / 10 : 0;

    const calcComparison = (current: number, previous: number) => {
      const diff = Math.round((current - previous) * 100) / 100;
      if (previous === 0) {
        return {
          diff,
          percentage: null,
          label: current > 0 ? 'New / Initial' : 'No change',
          direction: current > 0 ? ('up' as const) : ('neutral' as const),
          previousValue: previous,
        };
      }
      const pct = Math.round(((current - previous) / previous) * 1000) / 10;
      return {
        diff,
        percentage: pct,
        label: `${pct >= 0 ? '+' : ''}${pct}%`,
        direction: pct > 0 ? ('up' as const) : pct < 0 ? ('down' as const) : ('neutral' as const),
        previousValue: previous,
      };
    };

    return {
      period: {
        startDate: query.startDate,
        endDate: query.endDate,
        previousStartDate: prevStartDate.toISOString().split('T')[0],
        previousEndDate: prevEndDate.toISOString().split('T')[0],
      },
      kpis: {
        totalClasses,
        classHours: totalClassHours,
        teachingHours: totalTeachingHours,
        studentHours: totalStudentHours,
        uniqueAttendingStudents,
        activeTeachers: activeTeachersCount,
        estimatedTeachingCost,
        unratedTeachingHours,
        averageAttendancePerClass,
        totalAttendances,
        topCourse,
        formatBreakdown: {
          group: groupClassesCount,
          individual: individualClassesCount,
        },
        topInstructor,
        totalRegisteredActiveStudents,
        studentActivationRate,
      },
      comparisons: {
        totalClasses: calcComparison(totalClasses, prevTotalClasses),
        classHours: calcComparison(totalClassHours, prevClassHours),
        uniqueStudents: calcComparison(uniqueAttendingStudents, prevUniqueStudents),
        estimatedCost: calcComparison(estimatedTeachingCost, prevEstimatedCost),
        averageAttendance: calcComparison(averageAttendancePerClass, prevAvgAttendance),
      },
    };
  }

  async getTimeSeries(query: QueryReportsDto) {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    const completedClasses = await this.prisma.classSession.findMany({
      where: {
        status: ClassStatus.COMPLETED,
        startTime: { gte: startDate, lte: endDate },
        ...(query.courseId && { courseId: query.courseId }),
        ...(query.teacherId && {
          teachers: { some: { teacherId: query.teacherId } },
        }),
      },
      include: {
        teachers: true,
        students: {
          where: { attendanceStatus: AttendanceStatus.ATTENDED },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const grouping = query.groupBy || 'week';
    const seriesMap = new Map<
      string,
      {
        label: string;
        date: string;
        classes: number;
        classHours: number;
        teachingHours: number;
        studentHours: number;
      }
    >();

    for (const session of completedClasses) {
      const date = new Date(session.startTime);
      let key: string;
      let label: string;

      if (grouping === 'day') {
        key = session.startTime.toISOString().split('T')[0];
        label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      } else if (grouping === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      } else {
        // week grouping
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
        key = `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
        label = `Week ${weekNum} (${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
      }

      const existing = seriesMap.get(key) || {
        label,
        date: session.startTime.toISOString().split('T')[0],
        classes: 0,
        classHours: 0,
        teachingHours: 0,
        studentHours: 0,
      };

      existing.classes += 1;
      existing.classHours += session.durationMinutes / 60;
      existing.teachingHours += session.teachers.reduce((sum, t) => sum + t.minutesTaught / 60, 0);
      existing.studentHours += session.students.reduce((sum, s) => sum + s.minutesAttended / 60, 0);

      seriesMap.set(key, existing);
    }

    const sortedEntries = Array.from(seriesMap.entries())
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([, val]) => val);

    let cumClasses = 0;
    let cumClassHours = 0;
    let cumTeachingHours = 0;
    let cumStudentHours = 0;

    return sortedEntries.map((item) => {
      cumClasses += item.classes;
      cumClassHours += item.classHours;
      cumTeachingHours += item.teachingHours;
      cumStudentHours += item.studentHours;

      return {
        ...item,
        classHours: Math.round(item.classHours * 100) / 100,
        teachingHours: Math.round(item.teachingHours * 100) / 100,
        studentHours: Math.round(item.studentHours * 100) / 100,
        cumulativeClasses: cumClasses,
        cumulativeClassHours: Math.round(cumClassHours * 100) / 100,
        cumulativeTeachingHours: Math.round(cumTeachingHours * 100) / 100,
        cumulativeStudentHours: Math.round(cumStudentHours * 100) / 100,
      };
    });
  }

  async getTeacherRanking(query: QueryReportsDto) {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    const teachers = await this.prisma.teacher.findMany({
      where: { deletedAt: null },
      include: {
        classSessions: {
          where: {
            classSession: {
              status: ClassStatus.COMPLETED,
              startTime: { gte: startDate, lte: endDate },
              ...(query.courseId && { courseId: query.courseId }),
            },
          },
          include: {
            classSession: true,
          },
        },
      },
    });

    return teachers
      .map((teacher) => {
        const completedClasses = teacher.classSessions.length;
        const totalMinutes = teacher.classSessions.reduce((sum, item) => sum + item.minutesTaught, 0);
        const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
        const hourlyRate = teacher.hourlyRate ? Number(teacher.hourlyRate) : null;
        const estimatedCost = hourlyRate !== null ? Math.round(totalHours * hourlyRate * 100) / 100 : null;

        return {
          id: teacher.id,
          name: `${teacher.firstName} ${teacher.lastName}`,
          email: teacher.email,
          completedClasses,
          totalMinutes,
          totalHours,
          hourlyRate,
          estimatedCost,
        };
      })
      .filter((t) => t.completedClasses > 0)
      .sort((a, b) => b.totalHours - a.totalHours);
  }

  async getStudentRanking(query: QueryReportsDto) {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    const students = await this.prisma.student.findMany({
      where: { deletedAt: null },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { endDate: 'desc' },
          take: 1,
        },
        attendances: {
          where: {
            attendanceStatus: AttendanceStatus.ATTENDED,
            classSession: {
              status: ClassStatus.COMPLETED,
              startTime: { gte: startDate, lte: endDate },
              ...(query.courseId && { courseId: query.courseId }),
            },
          },
        },
      },
    });

    return students
      .map((student) => {
        const attendedClasses = student.attendances.length;
        const totalMinutes = student.attendances.reduce((sum, item) => sum + item.minutesAttended, 0);
        const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
        const latestPlan = student.subscriptions[0]?.plan.name || 'None';

        return {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          email: student.email,
          attendedClasses,
          totalMinutes,
          totalHours,
          activePlan: latestPlan,
        };
      })
      .filter((s) => s.attendedClasses > 0)
      .sort((a, b) => b.totalHours - a.totalHours);
  }

  async generateExcelWorkbook(dto: ExportExcelDto): Promise<Buffer> {
    const [summary, timeSeries, teacherRanking, studentRanking, setting] = await Promise.all([
      this.getSummary(dto),
      this.getTimeSeries(dto),
      this.getTeacherRanking(dto),
      this.getStudentRanking(dto),
      this.prisma.academySetting.findFirst(),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Arte Suave BJJ Academy Manager';
    workbook.created = new Date();

    // -------------------------------------------------------------
    // SHEET 1: Executive Summary
    // -------------------------------------------------------------
    const summarySheet = workbook.addWorksheet('Executive Summary', {
      views: [{ showGridLines: true }],
    });

    summarySheet.columns = [
      { width: 5 },
      { width: 30 },
      { width: 22 },
      { width: 22 },
      { width: 22 },
      { width: 22 },
      { width: 5 },
    ];

    // Academy Header
    summarySheet.mergeCells('B2:F2');
    const headerCell = summarySheet.getCell('B2');
    headerCell.value = `${setting?.academyName || 'Jiu-Jitsu Academy'} — Analytics & Operations Report`;
    headerCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1E3A8A' } };

    summarySheet.getCell('B3').value = `Reporting Window: ${dto.startDate} to ${dto.endDate}`;
    summarySheet.getCell('B3').font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF64748B' } };
    summarySheet.getCell('B4').value = `Generated On: ${new Date().toLocaleString()}`;
    summarySheet.getCell('B4').font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF64748B' } };

    // KPI Cards Table
    summarySheet.getCell('B6').value = 'Primary Operational KPIs';
    summarySheet.getCell('B6').font = { name: 'Arial', size: 12, bold: true };

    const kpiRows = [
      ['Total Completed Classes', summary.kpis.totalClasses],
      ['Total Class Mat Hours', `${summary.kpis.classHours} h`],
      ['Average Attendance per Class', `${summary.kpis.averageAttendancePerClass} students/class`],
      ['Total Student Training Hours', `${summary.kpis.studentHours} h`],
      ['Unique Attending Students', summary.kpis.uniqueAttendingStudents],
      ['Student Activation Rate', `${summary.kpis.studentActivationRate}% (${summary.kpis.uniqueAttendingStudents}/${summary.kpis.totalRegisteredActiveStudents})`],
      ['Top Course / Discipline', summary.kpis.topCourse ? `${summary.kpis.topCourse.name} (${summary.kpis.topCourse.classesCount} classes)` : 'N/A'],
      ['Top Coach', summary.kpis.topInstructor ? `${summary.kpis.topInstructor.name} (${summary.kpis.topInstructor.totalHours} h)` : 'N/A'],
      ['Active Instructors', summary.kpis.activeTeachers],
      ['Estimated Instructor Payout', `€${summary.kpis.estimatedTeachingCost.toFixed(2)}`],
    ];

    let startRow = 8;
    for (const [metric, val] of kpiRows) {
      const row = summarySheet.getRow(startRow);
      row.getCell(2).value = metric;
      row.getCell(2).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };
      row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };

      row.getCell(3).value = val;
      row.getCell(3).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      row.getCell(3).alignment = { horizontal: 'right' };
      startRow++;
    }

    if (summary.kpis.unratedTeachingHours > 0) {
      summarySheet.getCell(`B${startRow + 1}`).value = `* Note: ${summary.kpis.unratedTeachingHours} teaching hours were taught by instructors with no configured hourly rate.`;
      summarySheet.getCell(`B${startRow + 1}`).font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FFD97706' } };
    }

    // Embed Captured Chart Image if provided
    if (dto.chartImageBase64) {
      try {
        const cleanBase64 = dto.chartImageBase64.replace(/^data:image\/\w+;base64,/, '');
        const imageId = workbook.addImage({
          base64: cleanBase64,
          extension: 'png',
        });

        summarySheet.addImage(imageId, {
          tl: { col: 1, row: startRow + 3 },
          ext: { width: 620, height: 320 },
        });
      } catch (imgErr) {
        console.error('Failed to embed chart image in Excel:', imgErr);
      }
    }

    // -------------------------------------------------------------
    // SHEET 2: Timeline & Evolution
    // -------------------------------------------------------------
    const timeSheet = workbook.addWorksheet('Timeline Evolution');
    timeSheet.columns = [
      { header: 'Period', key: 'label', width: 25 },
      { header: 'Date', key: 'date', width: 16 },
      { header: 'Classes', key: 'classes', width: 14 },
      { header: 'Class Hours (h)', key: 'classHours', width: 18 },
      { header: 'Teaching Hours (h)', key: 'teachingHours', width: 20 },
      { header: 'Student Hours (h)', key: 'studentHours', width: 18 },
      { header: 'Cumul. Teaching (h)', key: 'cumulativeTeachingHours', width: 20 },
      { header: 'Cumul. Mat Hours (h)', key: 'cumulativeClassHours', width: 20 },
    ];
    timeSheet.getRow(1).font = { bold: true };
    timeSheet.addRows(timeSeries);

    // -------------------------------------------------------------
    // SHEET 3: Instructor Rankings
    // -------------------------------------------------------------
    const teacherSheet = workbook.addWorksheet('Instructor Rankings');
    teacherSheet.columns = [
      { header: 'Instructor Name', key: 'name', width: 26 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Classes Taught', key: 'completedClasses', width: 16 },
      { header: 'Taught Hours (h)', key: 'totalHours', width: 18 },
      { header: 'Rate (€/h)', key: 'hourlyRate', width: 14 },
      { header: 'Estimated Payout (€)', key: 'estimatedCost', width: 22 },
    ];
    teacherSheet.getRow(1).font = { bold: true };
    teacherSheet.addRows(
      teacherRanking.map((t) => ({
        ...t,
        hourlyRate: t.hourlyRate !== null ? `€${t.hourlyRate.toFixed(2)}` : 'Not Set',
        estimatedCost: t.estimatedCost !== null ? `€${t.estimatedCost.toFixed(2)}` : 'N/A',
      })),
    );

    // -------------------------------------------------------------
    // SHEET 4: Student Rankings
    // -------------------------------------------------------------
    const studentSheet = workbook.addWorksheet('Student Rankings');
    studentSheet.columns = [
      { header: 'Student Name', key: 'name', width: 26 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Active Membership', key: 'activePlan', width: 24 },
      { header: 'Classes Attended', key: 'attendedClasses', width: 18 },
      { header: 'Attended Hours (h)', key: 'totalHours', width: 20 },
    ];
    studentSheet.getRow(1).font = { bold: true };
    studentSheet.addRows(studentRanking);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

