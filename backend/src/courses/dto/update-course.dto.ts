import { IsBoolean, IsHexColor, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCourseDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsHexColor({ message: 'Color must be a valid hex color code' })
  @IsOptional()
  colorHex?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

