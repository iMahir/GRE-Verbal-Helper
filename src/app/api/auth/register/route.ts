import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const db = await getDb();
    const existing = await db.collection("users").findOne({
      username: username.toLowerCase(),
    });

    if (existing) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.collection("users").insertOne({
      username: username.toLowerCase(),
      passwordHash,
      role: "user",
      createdAt: new Date(),
      createdBy: session.username,
    });

    return NextResponse.json({ ok: true, username: username.toLowerCase() });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// List all users (admin only)
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const db = await getDb();
    const users = await db
      .collection("users")
      .find({}, { projection: { passwordHash: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ users });
  } catch (error) {
    console.error("List users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
