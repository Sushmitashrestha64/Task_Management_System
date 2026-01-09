import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('otps')
export class Otp {
  @PrimaryGeneratedColumn('uuid')
  otpid: string;

  @Column({ unique: true })
  email: string;

  @Column()
  otp: string;

  @Column({ default: 0 })
  attempts: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  expiresAt: Date;
}