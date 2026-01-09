import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateOtpTable1767880001752 implements MigrationInterface {
    name = 'CreateOtpTable1767880001752'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "otps" RENAME COLUMN "id" TO "otpid"`);
        await queryRunner.query(`ALTER TABLE "otps" RENAME CONSTRAINT "PK_91fef5ed60605b854a2115d2410" TO "PK_d354f18fcabaeb72954bb31b703"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "otps" RENAME CONSTRAINT "PK_d354f18fcabaeb72954bb31b703" TO "PK_91fef5ed60605b854a2115d2410"`);
        await queryRunner.query(`ALTER TABLE "otps" RENAME COLUMN "otpid" TO "id"`);
    }

}
