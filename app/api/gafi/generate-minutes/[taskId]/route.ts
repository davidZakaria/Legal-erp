import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import { canManageGafiTasks } from "@/lib/rbac";
import { buildAssemblyMinutesBuffer } from "@/lib/gafi/generateAssemblyMinutes";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageGafiTasks(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
