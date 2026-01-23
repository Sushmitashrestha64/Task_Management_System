import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entity/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password';
import { OtpService } from 'src/otp/otp.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UsersService {
    constructor( 
      @InjectRepository(User) private userRepo: Repository<User>,
      private readonly otpService: OtpService,
      private readonly jwtService: JwtService,
      ) {}
   
    async createUser(createUserDto: CreateUserDto){
        const { name, email, password } = createUserDto;
        const existingUser =  await this.userRepo.findOne({ where: { email } });
        if(existingUser){
            throw new BadRequestException('User with this email already exists');
        }
      
        const hash = await bcrypt.hash(password,10);
        const user = this.userRepo.create({name, email, password:hash});
        const savedUser = await this.userRepo.save(user);
        //generate and send OTP
        await this.otpService.generateAndSendOtp(email);

        const payload = { 
          userId: savedUser.userId, 
          email: savedUser.email,
          name: savedUser.name,
          verified: savedUser.verified,
          status: savedUser.status
        };
        return {
          ...payload,
          access_token: this.jwtService.sign(payload),
          message: 'User registered successfully. Please verify your email using the OTP sent.',
        };
    }

    async verifyUserEmail(email: string, otp: string){
      await this.otpService.verifyOtp(email, otp);
      const user = await this.userRepo.findOne({ where: { email } });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      user.verified = true;
      const savedUser = await this.userRepo.save(user);
      return { 
        savedUser,
        message: 'Email verified successfully' };
    }

    async findMeById( userId:string){
        const user = await this.userRepo.findOne({
            where:{ userId: userId },
            select: ['userId', 'name', 'email', 'verified', 'status', 'createdAt', 'updatedAt']
        });
        if(!user){
            throw new NotFoundException('User not found');
        }
        return user;    
    }

    async updateProfile(userId: string, updateUserDto: UpdateUserDto){
    const user = await this.findMeById(userId); 
    Object.assign(user, updateUserDto);
    return await this.userRepo.save(user);
  }

   async findByEmail(email: string) {
    const user = await this.userRepo.findOne({
      where: { email },
      select: ['userId','name', 'email', 'password', 'status', 'verified'],
    });
    return user;
  }

   async delete(id: string) {
    const result = await this.userRepo.delete(id);
    if (result.affected === 0) {
        throw new NotFoundException('User not found');
    }
    return { message: 'User deleted successfully' };
  }

  async updatePassword(
    id: string,
    updatePasswordDto: UpdatePasswordDto
  ) {
    const { currentPassword, newPassword } = updatePasswordDto;
    const user = await this.userRepo.findOne({ where: { userId: id }, select: ['userId','password'] });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(
        currentPassword, 
        user.password 
      );
    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect');
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await this.userRepo.save(user);
    return { message: 'Password updated successfully' };
  }

  async validatePassword(email: string, password: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    if (!user || !user.password) {
      return false;
    }
    if (user.status !== 'ACTIVE' || !user.verified) {
      return false;
    }
    return await bcrypt.compare(password, user.password);
 } 

  async updateRefreshToken(userId: string, refreshToken: string) {
    await this.userRepo.update(userId, { refreshToken });
 }

 async findUserWithToken(userId: string) {
  const user = await this.userRepo.findOne({
    where: { userId },
    select: ['userId', 'email', 'refreshToken', 'status', 'verified'], 
  });
  
  if (!user) {
    throw new NotFoundException('User not found');
  }
  
  return user;
 }
}