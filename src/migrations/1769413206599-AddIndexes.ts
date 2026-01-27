import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIndexes1769413206599 implements MigrationInterface {
    name = 'AddIndexes1769413206599'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_c7816020c07746ebe50fb6ad8c" ON "tasks" ("assignedToId", "isDeleted") `);
        await queryRunner.query(`CREATE INDEX "IDX_40a808e0bb945f645f434c4454" ON "tasks" ("projectId", "isDeleted") `);
        await queryRunner.query(`CREATE INDEX "IDX_c92df15ffd618c57d2a6e4eb8d" ON "projects" ("ownerId", "isDeleted") `);
        await queryRunner.query(`CREATE INDEX "IDX_d19892d8f03928e5bfc7313780" ON "project_members" ("projectId") `);
        await queryRunner.query(`CREATE INDEX "IDX_4fdf5f552fcfe06082a35e9728" ON "users" ("refreshToken") `);
        await queryRunner.query(`CREATE INDEX "IDX_2afebf0234962331e12c59c592" ON "otps" ("expiresAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_66181ab26ce83746f858e62c34" ON "activity_logs" ("projectId", "createdAt") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_66181ab26ce83746f858e62c34"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2afebf0234962331e12c59c592"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4fdf5f552fcfe06082a35e9728"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d19892d8f03928e5bfc7313780"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c92df15ffd618c57d2a6e4eb8d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_40a808e0bb945f645f434c4454"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c7816020c07746ebe50fb6ad8c"`);
    }

}
