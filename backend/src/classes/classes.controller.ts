import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CheckOverlapDto } from './dto/check-overlap.dto';
import { CompleteClassDto } from './dto/complete-class.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { QueryClassesDto } from './dto/query-classes.dto';
import { UpdateClassDto } from './dto/update-class.dto';

@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  async findInWindow(@Query() query: QueryClassesDto) {
    return this.classesService.findInWindow(query);
  }

  @Get('check-overlap')
  async checkOverlap(@Query() query: CheckOverlapDto) {
    return this.classesService.checkTeacherOverlap(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.classesService.findOne(id);
  }

  @Post()
  async create(@Body() createClassDto: CreateClassDto) {
    return this.classesService.create(createClassDto);
  }

  @Post(':id/complete')
  async complete(
    @Param('id') id: string,
    @Body() completeClassDto: CompleteClassDto,
  ) {
    return this.classesService.complete(id, completeClassDto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateClassDto: UpdateClassDto,
  ) {
    return this.classesService.update(id, updateClassDto);
  }

  @Patch(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.classesService.cancel(id, reason);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.classesService.remove(id);
  }
}

