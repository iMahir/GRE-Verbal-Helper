import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongodb";

export async function POST() {
  try {
    const db = await getDb();
    const existing = await db.collection("users").findOne({ username: "mahir" });

    if (existing) {
      return NextResponse.json({ message: "Admin user already exists" });
    }

    const passwordHash = await bcrypt.hash("Mahir!13#6", 12);

    await db.collection("users").insertOne({
      username: "mahir",
      passwordHash,
      role: "admin",
      createdAt: new Date(),
    });

    // Create indexes
    await db.collection("users").createIndex({ username: 1 }, { unique: true });
    await db.collection("progress").createIndex({ userId: 1 }, { unique: true });

    return NextResponse.json({ ok: true, message: "Admin user created" });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
