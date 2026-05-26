import { ActivityLogRepository, ActivityLogType } from '../repositories/activityLogRepository';

export const ActivityLogService = {
  async record(userId: string, type: ActivityLogType, bookId: string) {
    try {
      return await ActivityLogRepository.record(userId, type, bookId);
    } catch (err) {
      console.error('Error registrando activity log:', err);
      return null;
    }
  },

  async remove(userId: string, type: ActivityLogType, bookId: string) {
    try {
      return await ActivityLogRepository.remove(userId, type, bookId);
    } catch (err) {
      console.error('Error eliminando activity log:', err);
      return null;
    }
  },
};
