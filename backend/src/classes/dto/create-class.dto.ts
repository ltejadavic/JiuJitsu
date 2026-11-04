import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClassType } from '@prisma/client';

export class TeacherAssignmentDto {
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  minutesTaught?: number;
}

export class CreateClassDto {
  @IsString()
  @IsNotEmpty({ message: 'Course is required' })
  courseId: string;

  @IsEnum(ClassType, { message: 'Type must be either GROUP or INDIVIDUAL' })
  @IsOptional()
  type?: ClassType;

  @IsDateString({}, { message: 'Start time must be a valid ISO date-time string' })
  @IsNotEmpty({ message: 'Start time is required' })
  startTime: string;

  @IsInt({ message: 'Duration must be an integer number of minutes' })
  @Min(5, { message: 'Duration must be at least 5 minutes' })
  durationMinutes: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeacherAssignmentDto)
  @ArrayMinSize(1, { message: 'At least one instructor must be assigned to the class' })
  teacherAssignments: TeacherAssignmentDto[];

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'At least one student must be enrolled in the class' })
  studentIds: string[];
}

