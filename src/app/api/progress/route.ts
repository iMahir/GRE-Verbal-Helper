import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";

// GET: Fetch user's progress from DB
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const doc = await db.collection("progress").findOne({ userId: session.userId });

    if (!doc) {
      return NextResponse.json({ progress: null });
    }

    return NextResponse.json({ progress: doc.data });
  } catch (error) {
    console.error("Get progress error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT: Save user's progress to DB
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { progress } = await req.json();

    if (!progress) {
      return NextResponse.json({ error: "Progress data required" }, { status: 400 });
    }

    const db = await getDb();

    await db.collection("progress").updateOne(
      { userId: session.userId },
      {
        $set: {
          userId: session.userId,
          data: progress,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Save progress error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Reset own progress (snapshots current data first)
export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();

    // Snapshot before resetting so it can be reverted
    const existing = await db.collection("progress").findOne({ userId: session.userId });
    if (existing?.data) {
      await db.collection("progress_snapshots").insertOne({
        userId: session.userId,
        data: existing.data,
        savedAt: existing.updatedAt || new Date(),
        createdAt: new Date(),
      });
    }

    await db.collection("progress").deleteOne({ userId: session.userId });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Reset progress error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
