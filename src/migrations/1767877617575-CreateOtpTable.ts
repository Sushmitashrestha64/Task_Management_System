import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateOtpTable1767877617575 implements MigrationInterface {
    name = 'CreateOtpTable1767877617575'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "otps" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "otp" character varying NOT NULL, "attempts" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "expiresAt" TIMESTAMP NOT NULL, CONSTRAINT "UQ_9bd09e59708ea02bb49081961c5" UNIQUE ("email"), CONSTRAINT "PK_91fef5ed60605b854a2115d2410" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "otps"`);
    }

}
