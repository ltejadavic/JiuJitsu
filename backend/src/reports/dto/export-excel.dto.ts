import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ExportExcelDto {
  @IsDateString({}, { message: 'startDate must be a valid ISO date string' })
  @IsNotEmpty({ message: 'startDate is required' })
  startDate: string;

  @IsDateString({}, { message: 'endDate must be a valid ISO date string' })
  @IsNotEmpty({ message: 'endDate is required' })
  endDate: string;

  @IsString()
  @IsOptional()
  courseId?: string;

  @IsString()
  @IsOptional()
  teacherId?: string;

  @IsString()
  @IsOptional()
  chartImageBase64?: string;
}

