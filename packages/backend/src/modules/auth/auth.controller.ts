import { Controller, Post, Body, Get, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AuthService } from './auth.service'
import { LoginDto, SendCodeDto, LoginByCodeDto, ResetPasswordDto } from './dto/login.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @Post('send-code')
  sendCode(@Body() dto: SendCodeDto) {
    return this.authService.sendCode(dto)
  }

  @Post('login-by-code')
  loginByCode(@Body() dto: LoginByCodeDto) {
    return this.authService.loginByCode(dto)
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto)
  }

  @Get('lookup-by-username')
  lookupByUsername(@Query('username') username: string) {
    return this.authService.lookupByUsername(username ?? '')
  }

  @Get('lookup-by-contact')
  lookupByContact(@Query('contact') contact: string) {
    return this.authService.lookupByContact(contact ?? '')
  }

  @Get('my-modules')
  @UseGuards(AuthGuard('jwt'))
  getMyModules(@CurrentUser() user: { tenantId: string }) {
    return this.authService.getMyModules(user.tenantId)
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@CurrentUser() user: { id: string }) {
    return this.authService.getProfile(user.id)
  }
}
