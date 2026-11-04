import { Body, Controller, Get, Header, HttpCode, HttpStatus, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ExportExcelDto } from './dto/export-excel.dto';
import { QueryReportsDto } from './dto/query-reports.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  async getSummary(@Query() query: QueryReportsDto) {
    return this.reportsService.getSummary(query);
  }

  @Get('time-series')
  async getTimeSeries(@Query() query: QueryReportsDto) {
    return this.reportsService.getTimeSeries(query);
  }

  @Get('teachers')
  async getTeacherRanking(@Query() query: QueryReportsDto) {
    return this.reportsService.getTeacherRanking(query);
  }

  @Get('students')
  async getStudentRanking(@Query() query: QueryReportsDto) {
    return this.reportsService.getStudentRanking(query);
  }

  @Post('export/excel')
  @HttpCode(HttpStatus.OK)
  async exportExcel(@Body() dto: ExportExcelDto, @Res() res: Response) {
    const buffer = await this.reportsService.generateExcelWorkbook(dto);

    const filename = `jiujitsu-report-${dto.startDate}-to-${dto.endDate}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }
}

