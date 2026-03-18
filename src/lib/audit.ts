import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/api-utils';

export async function logAudit(
  action: string,
  courrierId: string | null,
  details?: Record<string, unknown>
) {
  const userId = await getCurrentUserId();
  if (!userId) return;
  await prisma.auditLog.create({
    data: {
      userId,
      courrierId,
      action,
      details: details ? JSON.parse(JSON.stringify(details)) : null,
    },
  });
}
