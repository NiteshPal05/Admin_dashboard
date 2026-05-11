import mongoose from 'mongoose';

const dashboardSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    summary: Array,
    revenue: Object,
    profit: Object,
    sessions: Object,
    deviceUsers: Array,
    orders: Array,
    countries: Array
  },
  { timestamps: true, minimize: false }
);

dashboardSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.key;
    return ret;
  }
});

export const Dashboard = mongoose.model('Dashboard', dashboardSchema);
