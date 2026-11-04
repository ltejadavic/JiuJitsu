import { IsHexColor, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty({ message: 'Course name is required' })
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsHexColor({ message: 'Color must be a valid hex color code (e.g. #3B82F6)' })
  @IsOptional()
  colorHex?: string;
}

