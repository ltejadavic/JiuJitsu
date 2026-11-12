import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateStudentDto {
  @IsString()
  @IsOptional()
  id?: string;

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

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  courseIds?: string[];
}

