const mongoose = require('mongoose');

const managedRelationshipSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    validate: {
      validator: async function (value) {
        const user = await mongoose.model('User').findById(value);
        return user && user.role === 'client';
      },
      message: 'Client must be a valid user with role "client"',
    },
  },
  specialist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    validate: {
      validator: async function (value) {
        const user = await mongoose.model('User').findById(value);
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

// Ensure unique client-specialist pairs
managedRelationshipSchema.index({ client: 1, specialist: 1 }, { unique: true });

// Indexes for efficient querying
managedRelationshipSchema.index({ client: 1 });
managedRelationshipSchema.index({ specialist: 1 });

const ManagedRelationship = mongoose.model('ManagedRelationship', managedRelationshipSchema);
module.exports = ManagedRelationship;