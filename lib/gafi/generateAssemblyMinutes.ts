import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  BorderStyle,
} from "docx";
import { format } from "date-fns";

type GafiTaskForMinutes = {
  id: string;
  title: string;
  deadline: Date;
  taskType: string;
};

function rtlTextRun(
  text: string,
  options?: { bold?: boolean; size?: number }
): TextRun {
  return new TextRun({
    text,
    font: "Arial",
    bold: options?.bold,
    size: options?.size,
    rightToLeft: true,
  });
}

function rtlParagraph(options: {
  children: TextRun[];
  alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
  spacing?: { after?: number; before?: number };
}): Paragraph {
  return new Paragraph({
    bidirectional: true,
    alignment: options.alignment ?? AlignmentType.RIGHT,
    spacing: options.spacing,
    children: options.children,
  });
}

const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

export async function buildAssemblyMinutesBuffer(
  task: GafiTaskForMinutes
): Promise<Buffer> {
  const deadlineFormatted = format(task.deadline, "yyyy-MM-dd");

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: [
          rtlParagraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              rtlTextRun("محضر اجتماع الجمعية العامة العادية", {
                bold: true,
                size: 64,
              }),
            ],
          }),
          rtlParagraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              rtlTextRun(
                "لشركة نيوجيرسي للتطوير العقاري (New Jersey Developments)",
                { bold: true, size: 52 }
              ),
            ],
          }),
          rtlParagraph({
            spacing: { after: 400 },
            children: [rtlTextRun("")],
          }),
          rtlParagraph({
            spacing: { after: 300 },
            children: [
              rtlTextRun(
                `إنه في يوم الموافق ${deadlineFormatted}، وبناءً على الدعوة الموجهة من السيد رئيس مجلس الإدارة، انعقدت الجمعية العامة العادية للشركة بمقرها الرئيسي.`
              ),
            ],
          }),
          rtlParagraph({
            spacing: { after: 300 },
            children: [
              rtlTextRun(
                `وذلك للنظر في جدول الأعمال الآتي: ${task.title}`
              ),
            ],
          }),
          rtlParagraph({
            spacing: { after: 400 },
            children: [
              rtlTextRun(
                "وبعد تلاوة جدول الأعمال ومناقشته، قررت الجمعية بإجماع الحاضرين الموافقة على ما جاء به، وتفويض السيد مدير الشئون القانونية في اتخاذ كافة الإجراءات اللازمة أمام الهيئة العامة للاستثمار والمناطق الحرة (GAFI) للتصديق على هذا المحضر."
              ),
            ],
          }),
          rtlParagraph({
            spacing: { after: 800 },
            children: [rtlTextRun("")],
          }),
          new Table({
            visuallyRightToLeft: true,
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorders,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    borders: noBorders,
                    width: { size: 33, type: WidthType.PERCENTAGE },
                    children: [
                      rtlParagraph({
                        alignment: AlignmentType.CENTER,
                        children: [rtlTextRun("رئيس مجلس الإدارة", { bold: true })],
                      }),
                    ],
                  }),
                  new TableCell({
                    borders: noBorders,
                    width: { size: 34, type: WidthType.PERCENTAGE },
                    children: [
                      rtlParagraph({
                        alignment: AlignmentType.CENTER,
                        children: [rtlTextRun("أمين السر", { bold: true })],
                      }),
                    ],
                  }),
                  new TableCell({
                    borders: noBorders,
                    width: { size: 33, type: WidthType.PERCENTAGE },
                    children: [
                      rtlParagraph({
                        alignment: AlignmentType.CENTER,
                        children: [rtlTextRun("فارزي الأصوات", { bold: true })],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
