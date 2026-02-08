import { DB } from "../database/index.js";

export const createCodeRawSql = async (code) => {
  const result = await DB.query(
    `
    INSERT INTO codes (code)
    VALUES ($1)
    RETURNING id, code, created_at
  `,
    [code],
  );
  return result[0];
};

export const getRandomCodeV1RawSql = async () => {
  const result = await DB.query(
    `
      SELECT id, code, created_at
      FROM codes
      ORDER BY RANDOM()
      LIMIT 1
    `,
  );
  return result[0];
};

export const getCodesCountRawSql = async () => {
  const countResult = await DB.query(`SELECT COUNT(*) FROM codes`);
  return parseInt(countResult[0].count, 10);
};

export const getCodeByIdRawSql = async (id) => {
  const result = await DB.query(
    `
      SELECT id, code, created_at
      FROM codes
      WHERE id = $1
    `,
    [id],
  );
  return result[0];
};

export const getMaxCodeIdRawSql = async () => {
  const maxResult = await DB.query(
    `SELECT id FROM codes ORDER BY id DESC LIMIT 1`,
  );
  return maxResult.length > 0 ? maxResult[0].id : null;
};
