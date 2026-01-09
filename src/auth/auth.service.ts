import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
    constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    ) {}

    async login(email: string, password: string) {
        const isValidUser = await this.usersService.validatePassword(email, password);
        if (!isValidUser) {
            throw new UnauthorizedException('Invalid input credentials');
        }
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new UnauthorizedException('Invalid input credentials');
        }
        
        const payload = {
            sub: user.userId,
            email: user.email,
            name: user.name,
        };
        
        return {
            access_token: this.jwtService.sign(payload),
        };
    }
}
