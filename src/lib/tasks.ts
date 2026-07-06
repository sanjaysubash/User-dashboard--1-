import { prisma } from "./prisma";
import { notify } from "./notify";
import { formatDate } from "./format";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

const STATUS_LABELS: Record<string, string> = {
  todo: "To Do",
  "in-progress": "In Progress",
  review: "In Review",
  done: "Done",
};

export function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

// Reminders for tasks assigned to this employee: due tomorrow, due today, or
// overdue. Each fires once (deduped against existing notifications), checked
// opportunistically on notification poll rather than via a midnight cron.
export async function checkTaskDueReminders(employeeId: number) {
  const today = startOfDay(new Date());
  const tomorrow = new Date(today.getTime() + 86400000);

  const tasks = await prisma.task.findMany({
    where: { assigneeId: employeeId, status: { not: "done" }, dueDate: { not: null } },
  });

  for (const task of tasks) {
    const due = startOfDay(task.dueDate!);
    let title: string | null = null;
    if (due.getTime() === tomorrow.getTime()) title = "Task due tomorrow";
    else if (due.getTime() === today.getTime()) title = "Task due today";
    else if (due.getTime() < today.getTime()) title = "Task overdue";
    if (!title) continue;

    const already = await prisma.notification.findFirst({
      where: { employeeId, type: "task", title, body: { contains: task.title } },
    });
    if (already) continue;

    await notify(employeeId, "task", title, `"${task.title}" ${title === "Task overdue" ? "was due" : "is due"} ${formatDate(task.dueDate!)}.`, "tasks");
  }
}
