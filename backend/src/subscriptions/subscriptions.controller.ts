import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscription-plans')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  async findAll(@Query('includeInactive') includeInactive?: string) {
    return this.subscriptionsService.findAllPlans(includeInactive === 'true');
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.subscriptionsService.findPlanById(id);
  }

  @Post()
  async create(@Body() createPlanDto: CreatePlanDto) {
    return this.subscriptionsService.createPlan(createPlanDto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updatePlanDto: UpdatePlanDto,
  ) {
    return this.subscriptionsService.updatePlan(id, updatePlanDto);
  }
}

