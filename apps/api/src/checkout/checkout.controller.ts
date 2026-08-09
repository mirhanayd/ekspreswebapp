import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { Public } from '../auth/decorators/public.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Public() // For demo purposes
  @Post('order')
  @ApiOperation({ summary: 'Create an order from a held seat' })
  createOrder(
    @Body()
    body: {
      userId: string;
      tripId: string;
      seatNo: string;
      holdId: string;
      passengerFirstName: string;
      passengerLastName: string;
      passengerPhone?: string;
      passengerEmail?: string;
      idempotencyKey?: string;
    },
  ) {
    return this.checkoutService.createOrder(body);
  }

  @Public()
  @Post('order/:orderId/pay')
  @ApiOperation({ summary: 'Process demo payment for an order' })
  processPayment(
    @Param('orderId') orderId: string,
    @Body() body: { userId: string },
  ) {
    return this.checkoutService.processPayment(orderId, body.userId);
  }

  @Public()
  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get order details' })
  getOrder(@Param('orderId') orderId: string) {
    return this.checkoutService.getOrder(orderId);
  }
}
