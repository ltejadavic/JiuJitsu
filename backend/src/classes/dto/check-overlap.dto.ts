import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CheckOverlapDto {
  @IsString({ message: 'teacherIds must be comma-separated IDs' })
  @IsNotEmpty({ message: 'teacherIds is required' })
  teacherIds: string;

  @IsDateString({}, { message: 'startTime must be a valid ISO date-time string' })
  @IsNotEmpty({ message: 'startTime is required' })
  startTime: string;

  @Type(() => Number)
  @IsInt()
  @Min(5)
  durationMinutes: number;

  @IsString()
  @IsOptional()
  excludeClassId?: string;
}

