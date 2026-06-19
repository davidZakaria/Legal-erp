import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function GafiPage() {
  const t = await getTranslations("gafi");
  const tCommon = await getTranslations("common");

  const tasks = await prisma.gAFITask.findMany({
    orderBy: { deadline: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-start">{t("title")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("taskType")}</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>{t("deadline")}</TableHead>
                <TableHead>{tCommon("status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <Badge variant="secondary">{task.taskType}</Badge>
                  </TableCell>
                  <TableCell>{task.title}</TableCell>
                  <TableCell>{format(task.deadline, "yyyy-MM-dd")}</TableCell>
                  <TableCell>{task.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
