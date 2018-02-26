import mongoose from 'mongoose';

const EventSchema = new mongoose.Schema({
  article_id: { type: String, required: true },
  from: { type: Date, required: true },
  to: { type: Date },
  responsible: { type: Array },
  abstract: { type: String },
  state: {
    type: String,
    lowercase: true,
    trim: true,
    required: true,
    enum: [
      'planned',
      'permission_requested',
      'permission_granted',
      'permission_denied',
      'translation',
      'translated',
      'editorial',
      'edited',
      'published_for_subscribers',
      'published',
      'outdated',
      'freezed',
      'canceled',
    ],
  },
});

const Event = mongoose.model('events', EventSchema);
export default Event;
