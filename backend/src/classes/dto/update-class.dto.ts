import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClassType } from '@prisma/client';
import { TeacherAssignmentDto } from './create-class.dto';

export class UpdateClassDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  courseId?: string;

  @IsEnum(ClassType)
  @IsOptional()
  type?: ClassType;

  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsInt()
  @Min(5)
  @IsOptional()
  durationMinutes?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeacherAssignmentDto)
  @ArrayMinSize(1, { message: 'At least one instructor must be assigned to the class' })
  @IsOptional()
  teacherAssignments?: TeacherAssignmentDto[];

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'At least one student must be enrolled in the class' })
  @IsOptional()
  studentIds?: string[];
}

