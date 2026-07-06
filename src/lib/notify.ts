import { prisma } from "./prisma";

export async function notify(employeeId: number, type: string, title: string, body: string, link?: string) {
  await prisma.notification.create({
    data: { employeeId, type, title, body, link: link ?? null },
  });
}
