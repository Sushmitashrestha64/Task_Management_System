import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTaskAndProjectTables1768539847639 implements MigrationInterface {
    name = 'CreateTaskAndProjectTables1768539847639'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" RENAME COLUMN "servirity" TO "severity"`);
        await queryRunner.query(`ALTER TYPE "public"."tasks_servirity_enum" RENAME TO "tasks_severity_enum"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."tasks_severity_enum" RENAME TO "tasks_servirity_enum"`);
        await queryRunner.query(`ALTER TABLE "tasks" RENAME COLUMN "severity" TO "servirity"`);
    }

}
