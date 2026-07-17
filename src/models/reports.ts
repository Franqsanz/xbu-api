import pkg from 'mongoose';
const { Schema, model } = pkg;

const REPORT_TYPES = ['copyright', 'inappropriate', 'spam', 'other'] as const;
const REPORT_STATUSES = ['open', 'reviewed', 'dismissed', 'actioned'] as const;

const reportsSchema = new Schema(
  {
    bookId: { type: String, required: true, index: true },
    reporterId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: REPORT_TYPES,
      required: true,
    },
    description: { type: String, maxlength: 2000 },
    contactEmail: { type: String, maxlength: 200 },
    status: {
      type: String,
      enum: REPORT_STATUSES,
      default: 'open',
      index: true,
    },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
    reviewNote: { type: String, maxlength: 2000 },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

// Un usuario no puede tener 2 reportes "open" sobre el mismo libro.
reportsSchema.index(
  { bookId: 1, reporterId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'open' } }
);

reportsSchema.set('toJSON', {
  transform: (_, returnedObject) => {
    const { _id, ...rest } = returnedObject;
    return { id: _id, ...rest };
  },
});

export default model('reports', reportsSchema);
export { REPORT_TYPES, REPORT_STATUSES };
