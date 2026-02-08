import { Kysely, PostgresDialect, sql } from "kysely";
import { pool } from "../database/index.js";

export const db = new Kysely({
  dialect: new PostgresDialect({
    pool,
  }),
});

export const createCodeKysely = async (code) => {
  return await db
    .insertInto("codes")
    .values({ code })
    .returning(["id", "code", "created_at"])
    .executeTakeFirstOrThrow();
};

export const getRandomCodeV1Kysely = async () => {
  return await db
    .selectFrom("codes")
    .selectAll()
    .orderBy(sql`random()`)
    .limit(1)
    .executeTakeFirst();
};

export const getCodesCountKysely = async () => {
  const result = await db
    .selectFrom("codes")
    .select(db.fn.count("id").as("count"))
    .executeTakeFirst();
  return parseInt(result.count, 10);
};

export const getCodeByIdKysely = async (id) => {
  return await db
    .selectFrom("codes")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
};

export const getMaxCodeIdKysely = async () => {
  const result = await db
    .selectFrom("codes")
    .select("id")
    .orderBy("id", "desc")
    .limit(1)
    .executeTakeFirst();
  return result ? result.id : null;
};
