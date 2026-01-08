import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entity/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password';

@Injectable()
export class UsersService {
    constructor( @InjectRepository(User) private userRepo: Repository<User> ) {}
   
    async createUser(createUserDto: CreateUserDto){
        const { name, email, password } = createUserDto;
        const hash = await bcrypt.hash(password,10);
        const user = this.userRepo.create({name, email, password:hash});
        return this.userRepo.save(user);
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
      select: ['userId', 'email', 'password', 'status', 'verified'],
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
}
