import { mongoStorage } from "./mongo-storage";

// Re-export types from shared/schema for compatibility
export type { 
  AdminRole, InsertAdminRole,
  AdminUser, InsertAdminUser,
  SystemConfig, InsertSystemConfig,
  AuditLog, InsertAuditLog,
  Content, InsertContent,
  Media, InsertMedia,
  UserActivity, InsertUserActivity,
  SecurityLog, InsertSecurityLog,
  IpBlacklist, InsertIpBlacklist,
  BackupLog, InsertBackupLog,
  User
} from "@shared/schema";

// Admin storage that delegates all operations to MongoDB storage
export class AdminStorage {
  // All methods delegate to mongoStorage
  createAdminUser = mongoStorage.createAdminUser.bind(mongoStorage);
  getAdminUser = mongoStorage.getAdminUser.bind(mongoStorage);
  updateAdminUser = mongoStorage.updateAdminUser.bind(mongoStorage);
  deleteAdminUser = mongoStorage.deleteAdminUser.bind(mongoStorage);
  getAdminUsers = mongoStorage.getAdminUsers.bind(mongoStorage);

  createRole = mongoStorage.createRole.bind(mongoStorage);
  getRoles = mongoStorage.getRoles.bind(mongoStorage);
  getRole = mongoStorage.getRole.bind(mongoStorage);
  updateRole = mongoStorage.updateRole.bind(mongoStorage);
  deleteRole = mongoStorage.deleteRole.bind(mongoStorage);
  getPermissions = mongoStorage.getPermissions.bind(mongoStorage);
  assignRoleToUser = mongoStorage.assignRoleToUser.bind(mongoStorage);
  removeRoleFromUser = mongoStorage.removeRoleFromUser.bind(mongoStorage);

  getAllUsers = mongoStorage.getAllUsers.bind(mongoStorage);
  suspendUser = mongoStorage.suspendUser.bind(mongoStorage);
  unsuspendUser = mongoStorage.unsuspendUser.bind(mongoStorage);
  banUser = mongoStorage.banUser.bind(mongoStorage);
  resetUserPassword = mongoStorage.resetUserPassword.bind(mongoStorage);
  getUserActivity = mongoStorage.getUserActivity.bind(mongoStorage);
  getUserSessions = mongoStorage.getUserSessions.bind(mongoStorage);
  deleteUserSession = mongoStorage.deleteUserSession.bind(mongoStorage);

  getContent = mongoStorage.getContent.bind(mongoStorage);
  getContentById = mongoStorage.getContentById.bind(mongoStorage);
  createContent = mongoStorage.createContent.bind(mongoStorage);
  updateContent = mongoStorage.updateContent.bind(mongoStorage);
  deleteContent = mongoStorage.deleteContent.bind(mongoStorage);
  publishContent = mongoStorage.publishContent.bind(mongoStorage);
  unpublishContent = mongoStorage.unpublishContent.bind(mongoStorage);

  getMedia = mongoStorage.getMedia.bind(mongoStorage);
  getMediaById = mongoStorage.getMediaById.bind(mongoStorage);
  createMedia = mongoStorage.createMedia.bind(mongoStorage);
  deleteMedia = mongoStorage.deleteMedia.bind(mongoStorage);
  getStorageUsage = mongoStorage.getStorageUsage.bind(mongoStorage);

  getSystemConfig = mongoStorage.getSystemConfig.bind(mongoStorage);
  getSystemConfigByKey = mongoStorage.getSystemConfigByKey.bind(mongoStorage);
  updateSystemConfig = mongoStorage.updateSystemConfig.bind(mongoStorage);
  clearCache = mongoStorage.clearCache.bind(mongoStorage);

  createAuditLog = mongoStorage.createAuditLog.bind(mongoStorage);
  getAuditLogs = mongoStorage.getAuditLogs.bind(mongoStorage);
  getAuditLog = mongoStorage.getAuditLog.bind(mongoStorage);

  createSecurityLog = mongoStorage.createSecurityLog.bind(mongoStorage);
  getSecurityLogs = mongoStorage.getSecurityLogs.bind(mongoStorage);
  getFailedLogins = mongoStorage.getFailedLogins.bind(mongoStorage);
  addToIpBlacklist = mongoStorage.addToIpBlacklist.bind(mongoStorage);
  removeFromIpBlacklist = mongoStorage.removeFromIpBlacklist.bind(mongoStorage);
  getIpBlacklist = mongoStorage.getIpBlacklist.bind(mongoStorage);
  resolveSecurityThreat = mongoStorage.resolveSecurityThreat.bind(mongoStorage);

  getDashboardOverview = mongoStorage.getDashboardOverview.bind(mongoStorage);
  getUserMetrics = mongoStorage.getUserMetrics.bind(mongoStorage);
  getContentMetrics = mongoStorage.getContentMetrics.bind(mongoStorage);
  getSystemHealth = mongoStorage.getSystemHealth.bind(mongoStorage);

  bulkUpdateUsers = mongoStorage.bulkUpdateUsers.bind(mongoStorage);
  bulkDeleteUsers = mongoStorage.bulkDeleteUsers.bind(mongoStorage);
  exportUsers = mongoStorage.exportUsers.bind(mongoStorage);

  createBackup = mongoStorage.createBackup.bind(mongoStorage);
  getBackups = mongoStorage.getBackups.bind(mongoStorage);
  getSystemLogs = mongoStorage.getSystemLogs.bind(mongoStorage);

  // Order-related methods that might be called by admin routes
  async getAllOrders(params: any = {}) {
    const orders = await mongoStorage.getOrders();
    return {
      orders,
      total: orders.length
    };
  }
}

export const adminStorage = new AdminStorage();
