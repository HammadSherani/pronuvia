import { prisma }    from "@/lib/db/prisma";
import type { Role } from "@/generated/prisma/enums";

/**
 * Keeps the PENDING auto-withdraw request amount in sync with the user's
 * current wallet balance whenever the balance changes outside the monthly cron.
 * Auto-requests are identified by a note that starts with "Auto withdrawal".
 * If the new balance is zero or negative the stale request is deleted.
 */
export async function syncPendingAutoWithdraw(
  userId:     string,
  userRole:   Role,
  newBalance: number,
) {
  const pending = await prisma.withdrawRequest.findFirst({
    where:  { userId, userRole, status: "PENDING", note: { startsWith: "Auto withdrawal" } },
    select: { id: true },
  });
  if (!pending) return;

  if (newBalance <= 0) {
    await prisma.withdrawRequest.delete({ where: { id: pending.id } });
  } else {
    await prisma.withdrawRequest.update({ where: { id: pending.id }, data: { amount: newBalance } });
  }
}
