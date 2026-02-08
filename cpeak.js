import cpeak, { parseJSON } from "cpeak";
import crypto from "crypto";
import { redis } from "./database/redis.js";
import { generateCode, getMaxId } from "./utils.js";
import {
  createCodeRawSql,
  getRandomCodeV1RawSql,
  getCodesCountRawSql,
  getCodeByIdRawSql,
  getMaxCodeIdRawSql,
} from "./orm/raw-sql.js";
import * as supabaseOrm from "./orm/supabase-sdk.js";
import * as kyselyOrm from "./orm/kysely.js";

const app = cpeak();

process.title = "node-cpeak";

app.beforeEach(parseJSON({ limit: 1024 * 1024 }));

app.route("get", `/simple`, (req, res) => {
  res.json({ message: "hi" });
});

app.route("patch", `/update-something/:id/:name`, (req, res) => {
  const { id, name } = req.params;
  const { value1, value2 } = req.query;

  // Validate id and name
  if (isNaN(Number(id))) {
    return res.status(400).json({ error: "id must be a number" });
  } else if (!name || name.length < 3) {
    return res
      .status(400)
      .json({ error: "name is required and must be at least 3 characters" });
  }

  const formattedFooValues = [];

  for (let i = 1; i <= 10; i++) {
    const val = req.body[`foo${i}`];
    const formattedVal = typeof val === "string" ? `${val}. ` : val;
    formattedFooValues.push(formattedVal);
  }

  // Adding all the formatted foo values together
  const totalFoo = formattedFooValues.join("");

  // Generating a few kilobytes of dummy data
  const dummyHistory = Array.from({ length: 100 }).map((_, i) => ({
    event_id: Number(id) + i,
    timestamp: new Date().toISOString(),
    action: `Action performed by ${name}`,
    metadata:
      "This is a string intended to take up space to simulate a medium-sized production API response object.".repeat(
        2,
      ),
    status: i % 2 === 0 ? "success" : "pending",
  }));

  res.json({
    id,
    name,
    value1,
    value2,
    total_foo: String(totalFoo).toUpperCase(),
    history: dummyHistory,
  });
});

// --- SQL (Raw) Routes ---

// Inserts a simple record to the database
app.route("post", "/sql/code", async (req, res) => {
  const code = generateCode();

  // Create a new code record
  try {
    const result = await createCodeRawSql(code);
    res.status(201).json({ created_code: result });
  } catch (err) {
    if (err.code === "23505") {
      // Unique violation
      return res.status(409).json({ error: "Code already exists." });
    }

    throw err;
  }
});

// Reads a simple random code from the database and returns it
app.route("get", "/sql/code-v1", async (req, res) => {
  // This is Big O(n) - Full Table Scan
  const result = await getRandomCodeV1RawSql();

  if (!result) {
    return res.status(404).json({ error: "No codes found." });
  }

  res.json({ data: result });
});

app.route("get", "/sql/code-v2", async (req, res) => {
  const count = await getCodesCountRawSql();

  if (count === 0) return res.status(404).json({ error: "No codes found." });

  // Generate a random ID between 1 and Count
  const randomId = crypto.randomInt(1, count + 1);

  // Fetch the record by ID (Index Lookup)
  const result = await getCodeByIdRawSql(randomId);

  if (!result) {
    return res.status(404).json({ error: "record not found" });
  }

  res.json({ data: result });
});

app.route("get", "/sql/code-v3", async (req, res) => {
  const maxId = await getMaxCodeIdRawSql();

  if (maxId === null) return res.status(404).json({ error: "No codes found." });

  // Generate random ID up to Max
  const randomId = crypto.randomInt(1, maxId + 1);

  // Fetch (Index Lookup)
  const result = await getCodeByIdRawSql(randomId);

  if (!result) {
    return res.status(404).json({ error: "record not found" });
  }

  res.json({ data: result });
});

app.route("get", "/sql/code-v4", async (req, res) => {
  const randomId = crypto.randomInt(1, 10_000_000 + 1); // kinda like cheating

  // Fetch the record by ID (Index Lookup). This is Big O(1)
  const result = await getCodeByIdRawSql(randomId);

  if (!result) {
    // Changed from result.length === 0 to !result
    return res.status(404).json({ error: "record not found" });
  }

  res.json({ data: result }); // Changed from result[0] to result
});

// --- Supabase SDK Routes ---

app.route("post", "/supabase/code", async (req, res) => {
  const code = generateCode();
  try {
    const result = await supabaseOrm.createCodeSupabase(code);
    res.status(201).json({ created_code: result });
  } catch (err) {
    if (err.code === "23505")
      return res.status(409).json({ error: "Code already exists." });
    throw err;
  }
});

app.route("get", "/supabase/code-v1", async (req, res) => {
  const result = await supabaseOrm.getRandomCodeV1Supabase();
  if (!result) return res.status(404).json({ error: "No codes found." });
  res.json({ data: result });
});

app.route("get", "/supabase/code-v2", async (req, res) => {
  const count = await supabaseOrm.getCodesCountSupabase();
  if (count === 0) return res.status(404).json({ error: "No codes found." });
  const randomId = crypto.randomInt(1, count + 1);
  const result = await supabaseOrm.getCodeByIdSupabase(randomId);
  if (!result) return res.status(404).json({ error: "record not found" });
  res.json({ data: result });
});

app.route("get", "/supabase/code-v3", async (req, res) => {
  const maxId = await supabaseOrm.getMaxCodeIdSupabase();
  if (maxId === null) return res.status(404).json({ error: "No codes found." });
  const randomId = crypto.randomInt(1, maxId + 1);
  const result = await supabaseOrm.getCodeByIdSupabase(randomId);
  if (!result) return res.status(404).json({ error: "record not found" });
  res.json({ data: result });
});

app.route("get", "/supabase/code-v4", async (req, res) => {
  const randomId = crypto.randomInt(1, 10_000_000 + 1);
  const result = await supabaseOrm.getCodeByIdSupabase(randomId);
  if (!result) return res.status(404).json({ error: "record not found" });
  res.json({ data: result });
});

// --- Kysely Routes ---

app.route("post", "/kysely/code", async (req, res) => {
  const code = generateCode();
  try {
    const result = await kyselyOrm.createCodeKysely(code);
    res.status(201).json({ created_code: result });
  } catch (err) {
    if (err.code === "23505")
      return res.status(409).json({ error: "Code already exists." });
    throw err;
  }
});

app.route("get", "/kysely/code-v1", async (req, res) => {
  const result = await kyselyOrm.getRandomCodeV1Kysely();
  if (!result) return res.status(404).json({ error: "No codes found." });
  res.json({ data: result });
});

app.route("get", "/kysely/code-v2", async (req, res) => {
  const count = await kyselyOrm.getCodesCountKysely();
  if (count === 0) return res.status(404).json({ error: "No codes found." });
  const randomId = crypto.randomInt(1, count + 1);
  const result = await kyselyOrm.getCodeByIdKysely(randomId);
  if (!result) return res.status(404).json({ error: "record not found" });
  res.json({ data: result });
});

app.route("get", "/kysely/code-v3", async (req, res) => {
  const maxId = await kyselyOrm.getMaxCodeIdKysely();
  if (maxId === null) return res.status(404).json({ error: "No codes found." });
  const randomId = crypto.randomInt(1, maxId + 1);
  const result = await kyselyOrm.getCodeByIdKysely(randomId);
  if (!result) return res.status(404).json({ error: "record not found" });
  res.json({ data: result });
});

app.route("get", "/kysely/code-v4", async (req, res) => {
  const randomId = crypto.randomInt(1, 10_000_000 + 1);
  const result = await kyselyOrm.getCodeByIdKysely(randomId);
  if (!result) return res.status(404).json({ error: "record not found" });
  res.json({ data: result });
});

// Inserts a simple record to the database through Redis for super fast O(1) operations
app.route("post", "/code-fast", async (req, res) => {
  const code = generateCode();

  // Check uniqueness (O(1))
  // SADD returns 1 if added (new), 0 if exists (duplicate)
  const isNew = await redis.sadd("codes:unique", code);

  if (isNew === 0) {
    return res.status(409).json({ error: "Code already exists." });
  }

  // Generate ID (Incrementing Sequence O(1))
  const id = await redis.incr("codes:seq");
  const created_at = new Date().toISOString();

  // Pipeline these for speed (1 network round trip instead of 2)
  const pipeline = redis.pipeline();
  // Store Data (O(1) Hash Set)
  pipeline.hset(`code:${id}`, { id, code, created_at });

  // We will add the ids to a queue so that later a background worker can sync to Postgres
  pipeline.lpush("codes:sync_queue", id);

  await pipeline.exec();

  res.status(201).json({
    created_code: { id, code, created_at },
  });
});

app.route("post", "/code-ultra-fast", async (req, res) => {
  const id = crypto.randomUUID(); // generates a 122-bit random UUID

  const code = generateCode();
  const created_at = new Date().toISOString();

  const record = JSON.stringify({ id, code, created_at });

  await redis.set(`code:{${id}}`, record);

  // The sync queue
  const shard = Math.floor(Math.random() * 100) + 1;
  await redis.lpush(`codes:sync_queue:{${shard}}`, id);

  res.status(201).json({ created_code: { id, code, created_at } });
});

// Gets a code but through Redis for super fast O(1) lookups
app.route("get", "/code-fast", async (req, res) => {
  // Get max ID
  const maxId = await getMaxId();
  if (maxId === 0) return res.status(404).json({ error: "No codes found." });

  // Generating a random ID
  const randomId = crypto.randomInt(1, maxId + 1);

  // Fetch the code (O(1) Hash Lookup)
  const result = await redis.hgetall(`code:${randomId}`);

  if (Object.keys(result).length === 0) {
    return res.status(404).json({ error: "record not found" });
  }

  res.json({ data: result });
});

app.handleErr((error, req, res) => {
  console.error(error);
  res.status(500).json({
    error: "Sorry, something unexpected happened on our side.",
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Cpeak server running at http://localhost:${PORT}`);
});
