import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCommentTable1768985444425 implements MigrationInterface {
    name = 'CreateCommentTable1768985444425'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "task_comments" ("commentId" uuid NOT NULL DEFAULT uuid_generate_v4(), "content" text NOT NULL, "taskId" uuid NOT NULL, "authorId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0a08e541be849855708b51348d3" PRIMARY KEY ("commentId"))`);
        await queryRunner.query(`ALTER TABLE "task_comments" ADD CONSTRAINT "FK_ba265816ca1d93f51083e06c520" FOREIGN KEY ("taskId") REFERENCES "tasks"("taskId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_comments" ADD CONSTRAINT "FK_a57898470720b4fa4fa5064b501" FOREIGN KEY ("authorId") REFERENCES "users"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_comments" DROP CONSTRAINT "FK_a57898470720b4fa4fa5064b501"`);
        await queryRunner.query(`ALTER TABLE "task_comments" DROP CONSTRAINT "FK_ba265816ca1d93f51083e06c520"`);
        await queryRunner.query(`DROP TABLE "task_comments"`);
    }

}
