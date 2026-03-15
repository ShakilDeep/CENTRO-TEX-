
import { prisma } from '../lib/prisma';

export interface AuditContext {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Audit Context Manager
 * 
 * Provides utilities to set and manage the current user context for audit triggers.
 * The application should call setCurrentUser before performing database operations
 * that need to be audited with the actual user ID.
 * 
 * Usage Example:
 * ```typescript
 * await setCurrentUser({
 *   userId: 'user_123',
 *   ipAddress: '192.168.1.1',
 *   userAgent: 'Mozilla/5.0...'
 * });
 * 
 * // Perform database operations - triggers will use the context
 * await prisma.samples.create({...});
 * 
 * // Clear context when done (optional, will be overwritten next time)
 * await clearCurrentUser();
 * ```
 */

/**
 * Set the current user context for audit triggers
 * This updates the single-row current_user table that triggers read from
 * @param context The audit context containing user ID and optional metadata
 */
export async function setCurrentUser(context: AuditContext): Promise<void> {
  try {
    await prisma.$executeRaw`
      DELETE FROM current_user
    `;
    await prisma.$executeRaw`
      INSERT INTO current_user (id, user_id, ip_address, user_agent, created_at, updated_at)
      VALUES (lower(hex(randomblob(16))), ${context.userId}, ${context.ipAddress}, ${context.userAgent}, datetime('now'), datetime('now'))
    `;
  } catch (error) {
    console.error('Failed to set current user context:', error);
    throw new Error('Failed to set audit context');
  }
}

/**
 * Clear the current user context
 * This resets the context to SYSTEM user
 */
export async function clearCurrentUser(): Promise<void> {
  try {
    await prisma.$executeRaw`
      DELETE FROM current_user
    `;
  } catch (error) {
    console.error('Failed to clear current user context:', error);
    throw new Error('Failed to clear audit context');
  }
}

/**
 * Get the current user context
 * Useful for debugging or when application needs to know current audit context
 * @returns The current audit context or null if not set
 */
export async function getCurrentUser(): Promise<AuditContext | null> {
  try {
    const result = await prisma.$queryRaw<Array<{
      user_id: string;
      ip_address: string | null;
      user_agent: string | null;
    }>>`
      SELECT user_id, ip_address, user_agent
      FROM current_user
      LIMIT 1
    `;

    if (result.length === 0) {
      return null;
    }

    return {
      userId: result[0].user_id,
      ipAddress: result[0].ip_address ?? undefined,
      userAgent: result[0].user_agent ?? undefined,
    };
  } catch (error) {
    console.error('Failed to get current user context:', error);
    return null;
  }
}

/**
 * Execute a database operation with audit context
 * This is a convenience wrapper that sets the context, executes the operation, and clears the context
 * 
 * @param context The audit context to use
 * @param operation A function that performs database operations
 * @returns The result of the operation
 */
export async function withAuditContext<T>(
  context: AuditContext,
  operation: () => Promise<T>
): Promise<T> {
  await setCurrentUser(context);
  try {
    return await operation();
  } finally {
    await clearCurrentUser();
  }
}

/**
 * Middleware function to extract audit context from Fastify request
 * This can be used in route handlers to automatically set audit context
 * 
 * @param request Fastify request object
 * @returns Audit context extracted from the request
 */
export function extractAuditContextFromRequest(request: any): AuditContext {
  const userId = request.user?.id || 'ANONYMOUS';
  const ipAddress = request.ip || request.headers['x-forwarded-for']?.split(',')[0] || request.socket.remoteAddress;
  const userAgent = request.headers['user-agent'];

  return {
    userId,
    ipAddress,
    userAgent,
  };
}
