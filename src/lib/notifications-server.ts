import { prisma } from '@/lib/prisma';

export async function createNotification(
  userId: string,
  type: string,
  titre: string,
  message: string,
  courrierId?: string
) {
  await prisma.notification.create({
    data: {
      userId,
      type,
      titre,
      message,
      courrierId: courrierId ?? null,
    },
  });
}
