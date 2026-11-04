import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdatePlanDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsInt({ message: 'Duration must be an integer number of months' })
  @Min(1, { message: 'Duration must be at least 1 month' })
  @IsOptional()
  durationMonths?: number;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Price must be a valid number' })
  @Min(0, { message: 'Price cannot be negative' })
  @IsOptional()
  price?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

