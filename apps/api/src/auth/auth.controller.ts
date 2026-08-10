import { Controller, Post, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDtoSchema, LoginDtoSchema } from './dto/auth.dto';
import { Public } from './decorators/public.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedPrincipal } from './authenticated-principal';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() dto: any) {
    const validatedDto = RegisterDtoSchema.parse(dto);
    return this.authService.register(validatedDto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  async login(@Body() dto: any) {
    const validatedDto = LoginDtoSchema.parse(dto);
    return this.authService.login(validatedDto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser() user: AuthenticatedPrincipal) {
    return this.authService.me(user.userId);
  }
}
