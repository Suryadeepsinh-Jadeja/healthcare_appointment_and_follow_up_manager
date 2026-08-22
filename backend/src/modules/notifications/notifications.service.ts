/**
 * Placeholder until the BullMQ notification queue lands: booking/cancellation
 * flows call these hooks now so their call sites don't need to change later.
 * Real implementations will enqueue jobs and write NotificationLog rows —
 * never send synchronously from here.
 */

export async function enqueueBookingConfirmationNotifications(_appointmentId: string): Promise<void> {}

export async function enqueueCancellationNotifications(_appointmentId: string): Promise<void> {}
