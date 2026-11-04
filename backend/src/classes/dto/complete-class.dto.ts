import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '@prisma/client';

export class TeacherCompletionDto {
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @IsInt()
  @Min(0)
  minutesTaught: number;
}

export class StudentAttendanceDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsInt()
  @Min(0)
  minutesAttended: number;
}

export class CompleteClassDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeacherCompletionDto)
  @ArrayMinSize(1, { message: 'At least one instructor must be confirmed' })
  teachers: TeacherCompletionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentAttendanceDto)
  attendances: StudentAttendanceDto[];
}

