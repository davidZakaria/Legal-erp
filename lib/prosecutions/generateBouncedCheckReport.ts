import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { format } from "date-fns";

type ProsecutionForReport = {
  policeStation: string;
  clientName: string;
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

export async function buildBouncedCheckReportBuffer(
  prosecution: ProsecutionForReport
): Promise<Buffer> {
  const today = format(new Date(), "yyyy-MM-dd");

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
            spacing: { after: 400 },
            children: [
              rtlTextRun(
                `السيد الأستاذ المستشار / المحامي العام لنيابات ${prosecution.policeStation}`,
                { bold: true, size: 56 }
              ),
            ],
          }),
          rtlParagraph({
            spacing: { after: 240 },
            children: [
              rtlTextRun(
                "مقدمه لسيادتكم / بصفته وكيلاً عن شركة نيو جيرسي للتطوير العقاري (New Jersey Developments)."
              ),
            ],
          }),
          rtlParagraph({
            spacing: { after: 240 },
            children: [rtlTextRun(`ضد السيد / ${prosecution.clientName}`)],
          }),
          rtlParagraph({
            spacing: { after: 240 },
            children: [
              rtlTextRun(
                `الموضوع: بتاريخ ${today} أصدر المشكو في حقه لصالح الشركة الشاكية شيكاً بنكياً، وعند التقدم للبنك أفاد برفض الصرف لعدم وجود رصيد، مما يشكل جريمة إصدار شيك بدون رصيد.`
              ),
            ],
          }),
          rtlParagraph({
            spacing: { before: 240 },
            children: [rtlTextRun("لذلك، نلتمس تحريك الدعوى الجنائية.")],
          }),
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
