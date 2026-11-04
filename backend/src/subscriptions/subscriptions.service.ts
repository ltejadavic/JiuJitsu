import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssignSubscriptionDto } from './dto/assign-subscription.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  calculateEndDate(startDate: Date, durationMonths: number): Date {
    const date = new Date(startDate);
    const day = date.getDate();
    date.setMonth(date.getMonth() + durationMonths);
    // If the month overflowed past target month due to 28/30/31 days
    if (date.getDate() !== day) {
      date.setDate(0);
    }
    return date;
  }

  async findAllPlans(includeInactive = false) {
    return this.prisma.subscriptionPlan.findMany({
      where: includeInactive ? undefined : { isActive: true },
      include: {
        _count: {
          select: {
            studentSubscriptions: true,
          },
        },
      },
      orderBy: { durationMonths: 'asc' },
    });
  }

  async findPlanById(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });
    if (!plan) {
      throw new NotFoundException(`Subscription plan with ID ${id} not found`);
    }
    return plan;
  }

  async createPlan(createPlanDto: CreatePlanDto) {
    return this.prisma.subscriptionPlan.create({
      data: {
        name: createPlanDto.name.trim(),
        durationMonths: createPlanDto.durationMonths,
        price: createPlanDto.price,
      },
    });
  }

  async updatePlan(id: string, updatePlanDto: UpdatePlanDto) {
    await this.findPlanById(id);
    return this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...(updatePlanDto.name && { name: updatePlanDto.name.trim() }),
        ...(updatePlanDto.durationMonths !== undefined && { durationMonths: updatePlanDto.durationMonths }),
        ...(updatePlanDto.price !== undefined && { price: updatePlanDto.price }),
        ...(updatePlanDto.isActive !== undefined && { isActive: updatePlanDto.isActive }),
      },
    });
  }

  async assignToStudent(studentId: string, dto: AssignSubscriptionDto) {
    const plan = await this.findPlanById(dto.planId);

    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : this.calculateEndDate(startDate, plan.durationMonths);

    return this.prisma.studentSubscription.create({
      data: {
        studentId,
        planId: plan.id,
        startDate,
        endDate,
        notes: dto.notes?.trim(),
      },
      include: {
        plan: true,
      },
    });
  }

  async getStudentSubscriptions(studentId: string) {
    return this.prisma.studentSubscription.findMany({
      where: { studentId },
      include: {
        plan: true,
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async getStudentActiveSubscription(studentId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const subscription = await this.prisma.studentSubscription.findFirst({
      where: {
        studentId,
        startDate: { lte: today },
        endDate: { gte: today },
      },
      include: {
        plan: true,
      },
      orderBy: { endDate: 'desc' },
    });

    return subscription;
  }
}

