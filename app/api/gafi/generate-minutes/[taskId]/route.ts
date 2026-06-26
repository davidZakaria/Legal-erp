import { NextRequest, NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { buildAssemblyMinutesBuffer } from "@/lib/gafi/generateAssemblyMinutes";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const gate = await requireApiPermission("GAFI_UPDATE");
  if ("response" in gate) return gate.response;
  const session = gate.session;

  const { taskId } = await params;

  const task = await prisma.gAFITask.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (task.taskType !== "ASSEMBLY") {
    return NextResponse.json(
      { error: "Only ASSEMBLY tasks support minutes generation" },
      { status: 400 }
    );
  }

  await logActivity(session.user.id, "GENERATE_MINUTES", "GAFITask", taskId);

  const buffer = await buildAssemblyMinutesBuffer({
    id: task.id,
    title: task.title,
    deadline: task.deadline,
    taskType: task.taskType,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="Assembly_Minutes.docx"',
    },
  });
}
