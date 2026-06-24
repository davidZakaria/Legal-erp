import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/auditLogger";
import {
  getLawsuitUploadDir,
  lawsuitAttachmentPublicUrl,
} from "@/lib/lawsuit-uploads";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function extensionForMime(mime: string): string {
  switch (mime) {
    case "application/pdf":
      return ".pdf";
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return "";
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const lawsuit = await prisma.lawsuit.findUnique({ where: { id } });
  if (!lawsuit) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const attachments = await prisma.lawsuitAttachment.findMany({
    where: { lawsuitId: id },
    orderBy: { uploadedAt: "desc" },
  });

  return NextResponse.json({ attachments });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const lawsuit = await prisma.lawsuit.findUnique({ where: { id } });
  if (!lawsuit) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);

  if (!files.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const uploadDir = getLawsuitUploadDir();
  await mkdir(uploadDir, { recursive: true });

  const created = [];

  for (const file of files) {
    if (file.size === 0) continue;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const ext = extensionForMime(file.type) || path.extname(file.name) || "";
    const storedName = `${randomUUID()}${ext}`;
    const diskPath = path.join(uploadDir, storedName);

    await writeFile(diskPath, Buffer.from(await file.arrayBuffer()));

    const attachment = await prisma.lawsuitAttachment.create({
      data: {
        lawsuitId: id,
        fileName: file.name,
        fileUrl: lawsuitAttachmentPublicUrl(storedName),
      },
    });

    created.push(attachment);
  }

  if (!created.length) {
    return NextResponse.json({ error: "No valid files uploaded" }, { status: 400 });
  }

  await logActivity(session.user.id, "UPLOAD_ATTACHMENT", "Lawsuit", id);

  return NextResponse.json({ attachments: created });
}
