import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Otp } from './entity/otp.entity';
import { Repository, LessThan } from 'typeorm';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class OtpService {
    constructor(
        @InjectRepository(Otp) private otpRepo: Repository<Otp>,
        private readonly mailerService: MailerService,
    ) {}
    async generateAndSendOtp(email: string) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    try{
    await this.mailerService.sendMail({
      to: email,
      subject: 'Your OTP Code',
      html: `
          <div style="font-family: Arial, sans-serif; text-align: center;">
            <h2 style="color: #333;">Verification Code</h2>
            <p>Use the code below to verify your account. It expires in 10 minutes.</p>
            <h1 style="background: #f4f4f4; padding: 10px; display: inline-block; letter-spacing: 5px;">${otp}</h1>
          </div>
        `,
    });

     await this.otpRepo.upsert(
      { email, otp, expiresAt, attempts: 0 },
      ['email']
    );
    return { message: 'Verification code sent to email successfully' };
    } catch (error) {
        console.error('--- MAILER ERROR START ---');
        console.error(error);
        console.error('--- MAILER ERROR END ---');
      throw new InternalServerErrorException(`Failed to send OTP email: ${error.message}`);
    }
  }

  async verifyOtp(email: string, otp: string) {
    const record = await this.otpRepo.findOne({ where: { email } });
    if (!record) throw new NotFoundException('OTP not found');

    if (new Date() > record.expiresAt) {
      await this.otpRepo.delete({ email });
      throw new BadRequestException('OTP has expired. Please request a new one');
    }
    if (record.attempts >= 3) {
      await this.otpRepo.delete({ email });
      throw new BadRequestException('Maximum verification attempts exceeded. Please request a new OTP');
    }
    if (record.otp !== otp) {
      await this.otpRepo.update(
        { email },
        { attempts: record.attempts + 1 }
      );
      throw new BadRequestException('Invalid OTP');
    }
    
    await this.otpRepo.delete({ email });
    console.log(`OTP deleted for email: ${email}`);
    
    return true;
  }

  async resendOtp(email: string) {
    return this.generateAndSendOtp(email);
  }

  async deleteOtp(email: string) {
    return this.otpRepo.delete({ email });
  }

  async cleanupExpiredOtps() {
    await this.otpRepo.delete({
      expiresAt: LessThan(new Date())
    });
  }
}

