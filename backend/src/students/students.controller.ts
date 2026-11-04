import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AssignSubscriptionDto } from '../subscriptions/dto/assign-subscription.dto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentsService } from './students.service';

@Controller('students')
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Get()
  async findAll(
    @Query('q') q?: string,
    @Query('courseId') courseId?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.studentsService.findAll(q, courseId, includeInactive === 'true');
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Post()
  async create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.create(createStudentDto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateStudentDto: UpdateStudentDto,
  ) {
    return this.studentsService.update(id, updateStudentDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.studentsService.remove(id);
  }

  @Post(':id/subscriptions')
  async assignSubscription(
    @Param('id') id: string,
    @Body() assignSubscriptionDto: AssignSubscriptionDto,
  ) {
    return this.subscriptionsService.assignToStudent(id, assignSubscriptionDto);
  }

  @Get(':id/subscriptions')
  async getSubscriptions(@Param('id') id: string) {
    return this.subscriptionsService.getStudentSubscriptions(id);
  }
}

