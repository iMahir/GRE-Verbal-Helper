import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";

// GET: List snapshots for a user (admin only)
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const db = await getDb();

    // Get current progress summary
    const current = await db.collection("progress").findOne({ userId });

    // Get snapshots (created only on resets)
    const snapshots = await db
      .collection("progress_snapshots")
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    const snapshotList = snapshots.map((s) => ({
      id: s._id.toString(),
      savedAt: s.savedAt,
      createdAt: s.createdAt,
      wordCount: s.data?.words ? Object.keys(s.data.words).length : 0,
      learnedCount: s.data?.words
        ? Object.values(s.data.words as Record<string, { known?: boolean }>).filter((w) => w.known).length
        : 0,
    }));

    return NextResponse.json({
      current: current
        ? {
            wordCount: current.data?.words ? Object.keys(current.data.words).length : 0,
            learnedCount: current.data?.words
              ? Object.values(current.data.words as Record<string, { known?: boolean }>).filter((w) => w.known).length
              : 0,
            updatedAt: current.updatedAt,
          }
        : null,
      snapshots: snapshotList,
    });
  } catch (error) {
    console.error("Admin progress error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Revert a user's progress to a snapshot (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { userId, snapshotId } = await req.json();
    if (!userId || !snapshotId) {
      return NextResponse.json({ error: "userId and snapshotId required" }, { status: 400 });
    }

    const db = await getDb();
    const { ObjectId } = await import("mongodb");

    const snapshot = await db
      .collection("progress_snapshots")
      .findOne({ _id: new ObjectId(snapshotId), userId });

    if (!snapshot) {
      return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
    }

    // Replace current progress with snapshot data
    await db.collection("progress").updateOne(
      { userId },
      {
        $set: {
          userId,
          data: snapshot.data,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    // Remove the snapshot that was just restored
    await db.collection("progress_snapshots").deleteOne({ _id: new ObjectId(snapshotId) });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Revert progress error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Reset a user's progress (admin only, snapshots current data first)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const db = await getDb();

    // Snapshot before resetting so it can be reverted
    const existing = await db.collection("progress").findOne({ userId });
    if (existing?.data) {
      await db.collection("progress_snapshots").insertOne({
        userId,
        data: existing.data,
        savedAt: existing.updatedAt || new Date(),
        createdAt: new Date(),
      });
    }

    await db.collection("progress").deleteOne({ userId });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin reset error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
