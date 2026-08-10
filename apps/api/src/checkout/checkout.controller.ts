import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedPrincipal } from '../auth/authenticated-principal';

@ApiTags('Checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('order')
  @ApiOperation({ summary: 'Create an order from a held seat' })
  createOrder(
    @Body()
    body: {
      tripId: string;
      seatNo: string;
      holdId: string;
      passengerFirstName: string;
      passengerLastName: string;
      passengerPhone?: string;
      passengerEmail?: string;
      idempotencyKey?: string;
    },
    @CurrentUser() user: AuthenticatedPrincipal,
  ) {
    return this.checkoutService.createOrder(user.userId, body);
  }

  @Post('order/:orderId/pay')
  @ApiOperation({ summary: 'Process demo payment for an order' })
  processPayment(@Param('orderId') orderId: string, @CurrentUser() user: AuthenticatedPrincipal) {
    return this.checkoutService.processPayment(orderId, user.userId);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get order details' })
  getOrder(@Param('orderId') orderId: string, @CurrentUser() user: AuthenticatedPrincipal) {
    return this.checkoutService.getOrder(orderId, user.userId);
  }
}
