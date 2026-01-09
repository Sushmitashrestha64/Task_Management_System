import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiBody } from '@nestjs/swagger';
import { OtpService } from './otp.service';
import { GenerateOtpDto } from './dto/generate-otp.dto';
import { ResendOtpDto } from './dto/resent-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@ApiTags('OTP')
@Controller('otp')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Post('generate')
  @ApiBody({ type: GenerateOtpDto })
  async generateOtp(@Body() generateOtpDto: GenerateOtpDto) {
    return this.otpService.generateAndSendOtp(generateOtpDto.email);
  }

  @Post('resend')
  @ApiBody({ type: ResendOtpDto })
  async resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    return this.otpService.resendOtp(resendOtpDto.email);
  }

  @Post('verify')
  @ApiBody({ type: VerifyOtpDto })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    await this.otpService.verifyOtp(
      verifyOtpDto.email,
      verifyOtpDto.otp,
    );
    return {
      success: true,
      message: 'OTP verified successfully',
    };
  }
}