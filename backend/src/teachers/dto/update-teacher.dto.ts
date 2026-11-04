import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateTeacherDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  firstName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  lastName?: string;

  @IsEmail({}, { message: 'Invalid email address' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @IsDateString({}, { message: 'Birth date must be a valid ISO date string' })
  @IsOptional()
  birthDate?: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Hourly rate must be a valid number' })
  @Min(0, { message: 'Hourly rate must be greater than or equal to 0' })
  @IsOptional()
  hourlyRate?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  courseIds?: string[];
}

