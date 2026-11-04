import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AssignSubscriptionDto {
  @IsString()
  @IsNotEmpty({ message: 'Plan ID is required' })
  planId: string;

  @IsDateString({}, { message: 'Start date must be an ISO date string' })
  @IsNotEmpty({ message: 'Start date is required' })
  startDate: string;

  @IsDateString({}, { message: 'End date must be an ISO date string' })
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

