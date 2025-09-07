import { 
  adminRoles, adminUsers, adminPermissions, systemConfig, auditLogs, content,
  media, userActivity, securityLogs, ipBlacklist, backupLogs, users, orders,
  type AdminRole, type InsertAdminRole,
  type AdminUser, type InsertAdminUser,
  type SystemConfig, type InsertSystemConfig,
  type AuditLog, type InsertAuditLog,
  type Content, type InsertContent,
  type Media, type InsertMedia,
  type UserActivity, type InsertUserActivity,
  type SecurityLog, type InsertSecurityLog,
  type IpBlacklist, type InsertIpBlacklist,
  type BackupLog, type InsertBackupLog,
  type User
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, ilike, and, sql, count, or, gte, lte } from "drizzle-orm";
import bcrypt from "bcrypt";

export class AdminStorage {
  // Admin Management
  async createAdminUser(userId: string, adminData: InsertAdminUser): Promise<AdminUser> {
    const [adminUser] = await db.insert(adminUsers).values({
      ...adminData,
      userId
    }).returning();
    return adminUser;
  }

  async getAdminUser(userId: string): Promise<AdminUser | undefined> {
    const [adminUser] = await db.select().from(adminUsers).where(eq(adminUsers.userId, userId));
    return adminUser;
  }

  async updateAdminUser(userId: string, adminData: Partial<InsertAdminUser>): Promise<AdminUser> {
    const [adminUser] = await db.update(adminUsers)
      .set({ ...adminData, updatedAt: new Date() })
      .where(eq(adminUsers.userId, userId))
      .returning();
    return adminUser;
  }

  async deleteAdminUser(userId: string): Promise<void> {
    await db.delete(adminUsers).where(eq(adminUsers.userId, userId));
  }

  async getAdminUsers(): Promise<(AdminUser & { user: User })[]> {
    const result = await db.select()
      .from(adminUsers)
      .innerJoin(users, eq(adminUsers.userId, users.id));
    
    return result.map(row => ({
      ...row.admin_users,
      user: row.users
    }));
  }

  // Roles & Permissions
  async createRole(role: InsertAdminRole): Promise<AdminRole> {
    const [newRole] = await db.insert(adminRoles).values(role).returning();
    return newRole;
  }

  async getRoles(): Promise<AdminRole[]> {
    return await db.select().from(adminRoles).orderBy(adminRoles.name);
  }

  async getRole(id: string): Promise<AdminRole | undefined> {
    const [role] = await db.select().from(adminRoles).where(eq(adminRoles.id, id));
    return role;
  }

  async updateRole(id: string, role: Partial<InsertAdminRole>): Promise<AdminRole> {
    const [updatedRole] = await db.update(adminRoles)
      .set({ ...role, updatedAt: new Date() })
      .where(eq(adminRoles.id, id))
      .returning();
    return updatedRole;
  }

  async deleteRole(id: string): Promise<void> {
    await db.delete(adminRoles).where(eq(adminRoles.id, id));
  }

  async getPermissions(): Promise<any[]> {
    return await db.select().from(adminPermissions).orderBy(adminPermissions.resource, adminPermissions.action);
  }

  async assignRoleToUser(userId: string, roleId: string): Promise<void> {
    const adminUser = await this.getAdminUser(userId);
    if (adminUser) {
      const currentRoles = adminUser.roles || [];
      if (!currentRoles.includes(roleId)) {
        await this.updateAdminUser(userId, {
          roles: [...currentRoles, roleId]
        });
      }
    }
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    const adminUser = await this.getAdminUser(userId);
    if (adminUser) {
      const currentRoles = adminUser.roles || [];
      await this.updateAdminUser(userId, {
        roles: currentRoles.filter(id => id !== roleId)
      });
    }
  }

  // User Management (Admin)
  async getAllUsers(params: {
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  } = {}): Promise<{ users: User[]; total: number }> {
    const { search, sortBy = 'createdAt', sortOrder = 'desc', limit = 50, offset = 0 } = params;

    let query = db.select().from(users);
    let countQuery = db.select({ count: count() }).from(users);

    if (search) {
      const searchCondition = or(
        ilike(users.email, `%${search}%`),
        ilike(users.username, `%${search}%`),
        ilike(users.firstName, `%${search}%`),
        ilike(users.lastName, `%${search}%`)
      );
      query = query.where(searchCondition);
      countQuery = countQuery.where(searchCondition);
    }

    // Apply sorting
    const sortColumn = users[sortBy as keyof typeof users] || users.createdAt;
    const sortDirection = sortOrder === 'asc' ? asc : desc;
    query = query.orderBy(sortDirection(sortColumn));

    // Apply pagination
    query = query.limit(limit).offset(offset);

    const [usersResult, totalResult] = await Promise.all([
      query,
      countQuery
    ]);

    return {
      users: usersResult,
      total: totalResult[0].count
    };
  }

  async suspendUser(userId: string, reason?: string, suspendedBy?: string): Promise<User> {
    const [user] = await db.update(users)
      .set({
        accountLocked: true,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    // Log the action
    await this.createAuditLog({
      action: 'suspend_user',
      resource: 'users',
      resourceId: userId,
      actorId: suspendedBy,
      actorType: 'admin',
      changes: {
        before: { suspended: false },
        after: { suspended: true, reason }
      },
      severity: 'medium'
    });

    return user;
  }

  async unsuspendUser(userId: string): Promise<User> {
    const [user] = await db.update(users)
      .set({
        accountLocked: false,
        lockoutUntil: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    return user;
  }

  async banUser(userId: string, reason?: string, bannedBy?: string): Promise<User> {
    const [user] = await db.update(users)
      .set({
        accountLocked: true,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    // Log the action
    await this.createAuditLog({
      action: 'ban_user',
      resource: 'users',
      resourceId: userId,
      actorId: bannedBy,
      actorType: 'admin',
      changes: {
        before: { banned: false },
        after: { banned: true, reason }
      },
      severity: 'high'
    });

    return user;
  }

  async resetUserPassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.update(users)
      .set({
        passwordHash: hashedPassword,
        lastPasswordChange: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  // Content Management
  async getContent(params: {
    type?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ content: Content[]; total: number }> {
    const { type, status, search, limit = 50, offset = 0 } = params;

    let query = db.select().from(content);
    let countQuery = db.select({ count: count() }).from(content);

    const conditions = [];
    
    if (type) {
      conditions.push(eq(content.type, type));
    }
    
    if (status) {
      conditions.push(eq(content.status, status));
    }
    
    if (search) {
      conditions.push(
        or(
          ilike(content.title, `%${search}%`),
          ilike(content.slug, `%${search}%`),
          ilike(content.body, `%${search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      const whereCondition = conditions.length === 1 ? conditions[0] : and(...conditions);
      query = query.where(whereCondition);
      countQuery = countQuery.where(whereCondition);
    }

    query = query.orderBy(desc(content.createdAt)).limit(limit).offset(offset);

    const [contentResult, totalResult] = await Promise.all([
      query,
      countQuery
    ]);

    return {
      content: contentResult,
      total: totalResult[0].count
    };
  }

  async getContentById(id: string): Promise<Content | undefined> {
    const [contentItem] = await db.select().from(content).where(eq(content.id, id));
    return contentItem;
  }

  async createContent(contentData: InsertContent): Promise<Content> {
    const [newContent] = await db.insert(content).values(contentData).returning();
    return newContent;
  }

  async updateContent(id: string, contentData: Partial<InsertContent>): Promise<Content> {
    const [updatedContent] = await db.update(content)
      .set({ ...contentData, updatedAt: new Date() })
      .where(eq(content.id, id))
      .returning();
    return updatedContent;
  }

  async deleteContent(id: string): Promise<void> {
    await db.delete(content).where(eq(content.id, id));
  }

  async publishContent(id: string): Promise<Content> {
    const [publishedContent] = await db.update(content)
      .set({ 
        status: 'published',
        publishedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(content.id, id))
      .returning();
    return publishedContent;
  }

  async unpublishContent(id: string): Promise<Content> {
    const [unpublishedContent] = await db.update(content)
      .set({ 
        status: 'draft',
        updatedAt: new Date()
      })
      .where(eq(content.id, id))
      .returning();
    return unpublishedContent;
  }

  // Media Management
  async getMedia(params: {
    search?: string;
    mimeType?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ media: Media[]; total: number }> {
    const { search, mimeType, limit = 50, offset = 0 } = params;

    let query = db.select().from(media);
    let countQuery = db.select({ count: count() }).from(media);

    const conditions = [];
    
    if (search) {
      conditions.push(
        or(
          ilike(media.filename, `%${search}%`),
          ilike(media.originalFilename, `%${search}%`),
          ilike(media.alt, `%${search}%`)
        )
      );
    }
    
    if (mimeType) {
      conditions.push(ilike(media.mimeType, `%${mimeType}%`));
    }

    if (conditions.length > 0) {
      const whereCondition = conditions.length === 1 ? conditions[0] : and(...conditions);
      query = query.where(whereCondition);
      countQuery = countQuery.where(whereCondition);
    }

    query = query.orderBy(desc(media.createdAt)).limit(limit).offset(offset);

    const [mediaResult, totalResult] = await Promise.all([
      query,
      countQuery
    ]);

    return {
      media: mediaResult,
      total: totalResult[0].count
    };
  }

  async getMediaById(id: string): Promise<Media | undefined> {
    const [mediaItem] = await db.select().from(media).where(eq(media.id, id));
    return mediaItem;
  }

  async createMedia(mediaData: InsertMedia): Promise<Media> {
    const [newMedia] = await db.insert(media).values(mediaData).returning();
    return newMedia;
  }

  async deleteMedia(id: string): Promise<void> {
    await db.delete(media).where(eq(media.id, id));
  }

  async getStorageUsage(): Promise<{ totalSize: number; totalFiles: number }> {
    const result = await db.select({
      totalSize: sql<number>`SUM(${media.size})`,
      totalFiles: count()
    }).from(media);

    return {
      totalSize: result[0].totalSize || 0,
      totalFiles: result[0].totalFiles || 0
    };
  }

  // System Configuration
  async getSystemConfig(): Promise<SystemConfig[]> {
    return await db.select().from(systemConfig).orderBy(systemConfig.category, systemConfig.key);
  }

  async getSystemConfigByKey(category: string, key: string): Promise<SystemConfig | undefined> {
    const [config] = await db.select().from(systemConfig)
      .where(and(eq(systemConfig.category, category), eq(systemConfig.key, key)));
    return config;
  }

  async updateSystemConfig(category: string, key: string, value: any, updatedBy: string): Promise<SystemConfig> {
    const existing = await this.getSystemConfigByKey(category, key);
    
    if (existing) {
      const [updated] = await db.update(systemConfig)
        .set({
          value,
          updatedAt: new Date(),
          updatedBy
        })
        .where(eq(systemConfig.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(systemConfig)
        .values({
          category,
          key,
          value,
          type: typeof value,
          updatedBy
        })
        .returning();
      return created;
    }
  }

  async clearCache(): Promise<void> {
    // Implementation would depend on your caching strategy
    // For now, this is a placeholder
    console.log('Cache cleared');
  }

  // Audit Logs
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db.insert(auditLogs).values(log).returning();
    return auditLog;
  }

  async getAuditLogs(params: {
    action?: string;
    resource?: string;
    actorId?: string;
    severity?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ logs: AuditLog[]; total: number }> {
    const { action, resource, actorId, severity, startDate, endDate, limit = 50, offset = 0 } = params;

    let query = db.select().from(auditLogs);
    let countQuery = db.select({ count: count() }).from(auditLogs);

    const conditions = [];
    
    if (action) conditions.push(eq(auditLogs.action, action));
    if (resource) conditions.push(eq(auditLogs.resource, resource));
    if (actorId) conditions.push(eq(auditLogs.actorId, actorId));
    if (severity) conditions.push(eq(auditLogs.severity, severity));
    if (startDate) conditions.push(gte(auditLogs.timestamp, startDate));
    if (endDate) conditions.push(lte(auditLogs.timestamp, endDate));

    if (conditions.length > 0) {
      const whereCondition = conditions.length === 1 ? conditions[0] : and(...conditions);
      query = query.where(whereCondition);
      countQuery = countQuery.where(whereCondition);
    }

    query = query.orderBy(desc(auditLogs.timestamp)).limit(limit).offset(offset);

    const [logsResult, totalResult] = await Promise.all([
      query,
      countQuery
    ]);

    return {
      logs: logsResult,
      total: totalResult[0].count
    };
  }

  async getAuditLog(id: string): Promise<AuditLog | undefined> {
    const [log] = await db.select().from(auditLogs).where(eq(auditLogs.id, id));
    return log;
  }

  // Security Monitoring
  async createSecurityLog(log: InsertSecurityLog): Promise<SecurityLog> {
    const [securityLog] = await db.insert(securityLogs).values(log).returning();
    return securityLog;
  }

  async getSecurityLogs(params: {
    type?: string;
    severity?: string;
    resolved?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ logs: SecurityLog[]; total: number }> {
    const { type, severity, resolved, limit = 50, offset = 0 } = params;

    let query = db.select().from(securityLogs);
    let countQuery = db.select({ count: count() }).from(securityLogs);

    const conditions = [];
    
    if (type) conditions.push(eq(securityLogs.type, type));
    if (severity) conditions.push(eq(securityLogs.severity, severity));
    if (resolved !== undefined) conditions.push(eq(securityLogs.resolved, resolved));

    if (conditions.length > 0) {
      const whereCondition = conditions.length === 1 ? conditions[0] : and(...conditions);
      query = query.where(whereCondition);
      countQuery = countQuery.where(whereCondition);
    }

    query = query.orderBy(desc(securityLogs.timestamp)).limit(limit).offset(offset);

    const [logsResult, totalResult] = await Promise.all([
      query,
      countQuery
    ]);

    return {
      logs: logsResult,
      total: totalResult[0].count
    };
  }

  async getFailedLogins(params: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ logs: SecurityLog[]; total: number }> {
    return this.getSecurityLogs({
      type: 'failed_login',
      ...params
    });
  }

  async addToIpBlacklist(ipAddress: string, reason?: string, createdBy?: string): Promise<IpBlacklist> {
    const [blacklistEntry] = await db.insert(ipBlacklist)
      .values({
        ipAddress,
        reason,
        createdBy
      })
      .returning();
    return blacklistEntry;
  }

  async removeFromIpBlacklist(ipAddress: string): Promise<void> {
    await db.delete(ipBlacklist).where(eq(ipBlacklist.ipAddress, ipAddress));
  }

  async getIpBlacklist(): Promise<IpBlacklist[]> {
    return await db.select().from(ipBlacklist).orderBy(desc(ipBlacklist.createdAt));
  }

  async resolveSecurityThreat(id: string, resolvedBy: string): Promise<SecurityLog> {
    const [resolved] = await db.update(securityLogs)
      .set({
        resolved: true,
        resolvedBy,
        resolvedAt: new Date()
      })
      .where(eq(securityLogs.id, id))
      .returning();
    return resolved;
  }

  // Analytics & Dashboard
  async getDashboardOverview(): Promise<{
    totalUsers: number;
    totalActiveUsers: number;
    totalOrders: number;
    totalRevenue: number;
    newUsersToday: number;
    ordersToday: number;
    revenueToday: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsersResult,
      activeUsersResult,
      totalOrdersResult,
      totalRevenueResult,
      newUsersTodayResult,
      ordersTodayResult,
      revenueTodayResult
    ] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(users).where(gte(users.lastLoginAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))),
      db.select({ count: count() }).from(orders),
      db.select({ total: sql<number>`SUM(${orders.total})` }).from(orders),
      db.select({ count: count() }).from(users).where(gte(users.createdAt, today)),
      db.select({ count: count() }).from(orders).where(gte(orders.createdAt, today)),
      db.select({ total: sql<number>`SUM(${orders.total})` }).from(orders).where(gte(orders.createdAt, today))
    ]);

    return {
      totalUsers: totalUsersResult[0].count,
      totalActiveUsers: activeUsersResult[0].count,
      totalOrders: totalOrdersResult[0].count,
      totalRevenue: Number(totalRevenueResult[0].total || 0),
      newUsersToday: newUsersTodayResult[0].count,
      ordersToday: ordersTodayResult[0].count,
      revenueToday: Number(revenueTodayResult[0].total || 0)
    };
  }

  async getUserMetrics(params: {
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<{
    newUsers: number;
    activeUsers: number;
    userGrowth: number;
  }> {
    const { startDate, endDate } = params;
    
    let query = db.select({ count: count() }).from(users);
    
    if (startDate && endDate) {
      query = query.where(and(
        gte(users.createdAt, startDate),
        lte(users.createdAt, endDate)
      ));
    }

    const [newUsersResult] = await query;
    
    return {
      newUsers: newUsersResult.count,
      activeUsers: 0, // Placeholder - would need more complex logic
      userGrowth: 0 // Placeholder - would need comparison with previous period
    };
  }

  async getContentMetrics(): Promise<{
    totalContent: number;
    publishedContent: number;
    draftContent: number;
    totalViews: number;
  }> {
    const [
      totalResult,
      publishedResult,
      draftResult,
      viewsResult
    ] = await Promise.all([
      db.select({ count: count() }).from(content),
      db.select({ count: count() }).from(content).where(eq(content.status, 'published')),
      db.select({ count: count() }).from(content).where(eq(content.status, 'draft')),
      db.select({ total: sql<number>`SUM(${content.viewCount})` }).from(content)
    ]);

    return {
      totalContent: totalResult[0].count,
      publishedContent: publishedResult[0].count,
      draftContent: draftResult[0].count,
      totalViews: Number(viewsResult[0].total || 0)
    };
  }

  async getSystemHealth(): Promise<{
    databaseConnections: number;
    serverUptime: number;
    memoryUsage: number;
    diskUsage: number;
  }> {
    // These would typically come from system monitoring tools
    return {
      databaseConnections: 5, // Placeholder
      serverUptime: process.uptime(),
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      diskUsage: 0 // Placeholder
    };
  }

  // System Operations
  async createBackup(type: string, triggeredBy: string): Promise<BackupLog> {
    const [backup] = await db.insert(backupLogs)
      .values({
        type,
        status: 'pending',
        triggeredBy
      })
      .returning();
    return backup;
  }

  async getBackups(): Promise<BackupLog[]> {
    return await db.select().from(backupLogs).orderBy(desc(backupLogs.startedAt));
  }

  async getSystemLogs(params: {
    level?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<any[]> {
    // This would typically interface with your logging system
    // For now, return audit logs as system logs
    const { logs } = await this.getAuditLogs(params);
    return logs;
  }
}

export const adminStorage = new AdminStorage();