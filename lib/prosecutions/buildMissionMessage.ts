import type { Prosecution } from "@prisma/client";

type MissionCase = Pick<
  Prosecution,
  "caseNumber" | "year" | "issueType" | "clientName"
>;

export function buildMissionMessage(params: {
  policeStation: string;
  lawyerName: string;
  cases: MissionCase[];
}): string {
  const lines = params.cases.map(
    (item, index) =>
      `${index + 1}. محضر رقم ${item.caseNumber}/${item.year} - ${item.issueType} - الخصم: ${item.clientName}`
  );

  return `🚗 *مأمورية مجمعة - نيابة ${params.policeStation}* 🚗

أ. ${params.lawyerName}،
برجاء متابعة المحاضر التالية اليوم في نفس الجهة:

${lines.join("\n")}

مع تمنياتنا بالتوفيق.`;
}
