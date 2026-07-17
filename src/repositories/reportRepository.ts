import reportsModel from '../models/reports';

export type ReportType = 'copyright' | 'inappropriate' | 'spam' | 'other';

export type CreateReportInput = {
  bookId: string;
  reporterId: string;
  type: ReportType;
  description?: string;
  contactEmail?: string;
};

export const ReportRepository = {
  async create(input: CreateReportInput) {
    const doc = new reportsModel(input);
    return await doc.save();
  },

  async findOpenByReporterAndBook(reporterId: string, bookId: string) {
    return await reportsModel.findOne({ reporterId, bookId, status: 'open' }).lean().exec();
  },

  async countByReporterSince(reporterId: string, since: Date) {
    return await reportsModel.countDocuments({ reporterId, createdAt: { $gte: since } }).exec();
  },

  async deleteAllByBookIds(bookIds: string[]) {
    if (bookIds.length === 0) return { deletedCount: 0 };
    return await reportsModel.deleteMany({ bookId: { $in: bookIds } }).exec();
  },

  async deleteAllByReporterId(reporterId: string) {
    return await reportsModel.deleteMany({ reporterId }).exec();
  },
};
