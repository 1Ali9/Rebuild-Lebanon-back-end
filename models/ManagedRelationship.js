const mongoose = require('mongoose');

const managedRelationshipSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
    validate: {
      validator: async function (value) {
        const user = await mongoose.model('user').findById(value);
        return user && user.role === 'client';
      },
      message: 'Client must be a valid user with role "client"',
    },
  },
  specialist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
    validate: {
      validator: async function (value) {
        const user = await mongoose.model('user').findById(value);
        return user && user.role === 'specialist';
      },
      message: 'Specialist must be a valid user with role "specialist"',
    },
  },
  isDone: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

managedRelationshipSchema.index({ client: 1, specialist: 1 }, { unique: true });
managedRelationshipSchema.index({ client: 1 });
managedRelationshipSchema.index({ specialist: 1 });

const ManagedRelationship = mongoose.model('ManagedRelationship', managedRelationshipSchema);
module.exports = ManagedRelationship;