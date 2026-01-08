import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserTable1767850643029 implements MigrationInterface {
    name = 'CreateUserTable1767850643029'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "passwordHashed" TO "password"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "password" TO "passwordHashed"`);
    }

}
