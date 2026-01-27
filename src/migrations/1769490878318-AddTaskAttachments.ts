import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTaskAttachments1769490878318 implements MigrationInterface {
    name = 'AddTaskAttachments1769490878318'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "task_attachments" ("attachmentId" uuid NOT NULL DEFAULT uuid_generate_v4(), "fileName" character varying NOT NULL, "fileUrl" character varying NOT NULL, "mimeType" character varying NOT NULL, "fileSize" integer NOT NULL, "taskId" uuid NOT NULL, "uploaderId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bb707c759415849a7c955a01457" PRIMARY KEY ("attachmentId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_47d3c46e4edb30cdaf97ccdb8d" ON "task_attachments" ("taskId") `);
        await queryRunner.query(`ALTER TABLE "task_attachments" ADD CONSTRAINT "FK_47d3c46e4edb30cdaf97ccdb8d8" FOREIGN KEY ("taskId") REFERENCES "tasks"("taskId") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_attachments" ADD CONSTRAINT "FK_4070df3ea94ef8eb1fc86192174" FOREIGN KEY ("uploaderId") REFERENCES "users"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_attachments" DROP CONSTRAINT "FK_4070df3ea94ef8eb1fc86192174"`);
        await queryRunner.query(`ALTER TABLE "task_attachments" DROP CONSTRAINT "FK_47d3c46e4edb30cdaf97ccdb8d8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_47d3c46e4edb30cdaf97ccdb8d"`);
        await queryRunner.query(`DROP TABLE "task_attachments"`);
    }

}
