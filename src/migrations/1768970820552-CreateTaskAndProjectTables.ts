import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTaskAndProjectTables1768970820552 implements MigrationInterface {
    name = 'CreateTaskAndProjectTables1768970820552'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "refreshToken" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "refreshToken"`);
    }

}
