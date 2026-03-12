import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "";

if (!MONGODB_URI) {
  throw new Error("Please define MONGODB_URI in .env.local");
}

let cached: { client: MongoClient; db: Db } | null = null;

export async function getDb(): Promise<Db> {
  if (cached) return cached.db;

  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(); // uses db name from URI ("verbal-helper")
  cached = { client, db };
  return db;
}
