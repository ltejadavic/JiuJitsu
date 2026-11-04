import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ClassStatus } from '@prisma/client';

export class QueryClassesDto {
  @IsDateString({}, { message: 'Start parameter must be a valid ISO date-time string' })
  @IsNotEmpty({ message: 'Start parameter is required' })
  start: string;

  @IsDateString({}, { message: 'End parameter must be a valid ISO date-time string' })
  @IsNotEmpty({ message: 'End parameter is required' })
  end: string;

  @IsString()
  @IsOptional()
  courseId?: string;

  @IsString()
  @IsOptional()
  teacherId?: string;

  @IsEnum(ClassStatus)
  @IsOptional()
  status?: ClassStatus;
}

