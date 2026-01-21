import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTaskAndProjectTables1768990641783 implements MigrationInterface {
    name = 'CreateTaskAndProjectTables1768990641783'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "deletedAt" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "deletedAt"`);
    }

}
