const mongoose = require('mongoose');

// Ensure User model is loaded first
require('./user');

const managedRelationshipSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',  // Changed from 'user' to 'User'
    required: true,
    validate: {
      validator: async function(value) {
        const user = await mongoose.model('User').findById(value); // Changed from 'user'
        return user && user.role === 'client';
      },
      message: 'Client must be a valid user with role "client"'
    }
  },
  specialist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',  // Changed from 'user' to 'User'
    required: true,
    validate: {
      validator: async function(value) {
        const user = await mongoose.model('User').findById(value); // Changed from 'user'
        return user && user.role === 'specialist';
      },
      message: 'Specialist must be a valid user with role "specialist"'
    }
  },
  isDone: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes (keep your existing indexes)
managedRelationshipSchema.index({ client: 1, specialist: 1 }, { unique: true });

module.exports = mongoose.model('ManagedRelationship', managedRelationshipSchema);