const mongoose = require('mongoose');

// Define valid specialties as an enum
const specialties = [
  'Civil Engineer',
  'Architect',
  'Mason',
  'Blacksmith',
  'Glass Specialist',
  'Plumber',
  'Painter',
  'Aluminum Frame Specialist',
  'Carpenter',
  'Tiler',
  'Waterproofing Specialist',
  'Electrician',
  'Stone Cladding Specialist',
  'HVAC Technician',
];



// Mapping of governorates to their valid districts
const districtByGovernorate = {
  'Beirut': ['Beirut'],
  'Mount Lebanon': ['Baabda', 'Aley', 'Chouf', 'Keserwan', 'Metn', 'Jbeil'],
  'North': ['Tripoli', 'Akkar', 'Bcharre', 'Koura', 'Miniyeh-Danniyeh', 'Zgharta', 'Batroun'],
  'Akkar': ['Akkar'],
  'Beqaa': ['Zahle', 'West Beqaa', 'Rashaya'],
  'Baalbek-Hermel': ['Baalbek', 'Hermel'],
  'South': ['Saida', 'Tyre', 'Jezzine'],
  'Nabatieh': ['Nabatieh', 'Marjeyoun', 'Hasbaya', 'Bint Jbeil']
};

// Subdocument schema for client's needed specialists
const neededSpecialistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: specialties,
    trim: true
  },
  isNeeded: {
    type: Boolean,
    default: true
  }
});

const userSchema = new mongoose.Schema({
  fullname: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    index: true
  },
  password: {
    type: String,
    required: true,
    select: false // Never return in queries
  },
  role: {
    type: String,
    required: true,
    enum: ['client', 'specialist', 'admin'],
    index: true
  },
  governorate: {
    type: String,
    required: function() {
      return ['client', 'specialist'].includes(this.role);
    },
    enum: Object.keys(districtByGovernorate),
    trim: true
  },
  district: {
    type: String,
    required: function() {
      return ['client', 'specialist'].includes(this.role);
    },
    validate: {
      validator: function(value) {
        if (this.role === 'admin') return true;
        return districtByGovernorate[this.governorate]?.includes(value);
      },
      message: props => `Invalid district ${props.value} for ${this.governorate}`
    },
    trim: true
  },
  neededSpecialists: {
    type: [neededSpecialistSchema],
    required: function() {
      return this.role === 'client';
    },
    default: undefined
  },
  specialty: {
    type: String,
    required: function() {
      return this.role === 'specialist';
    },
    enum: specialties,
    trim: true,
    default: undefined
  },
  isAvailable: {
    type: Boolean,
    required: function() {
      return this.role === 'specialist';
    },
    default: undefined
  }
}, {
  timestamps: true,
  strict: 'throw',
  minimize: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true
  }
});

// Pre-save hook to clean data
userSchema.pre('save', function(next) {
  if (this.role !== 'specialist') {
    this.specialty = undefined;
    this.isAvailable = undefined;
  }
  if (this.role !== 'client') {
    this.neededSpecialists = undefined;
  }
  next();
});

// Pre-update hook for findOneAndUpdate operations
userSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  const role = update.$set?.role || this._conditions.role;

  if (role && role !== 'specialist') {
    update.$set = update.$set || {};
    update.$set.specialty = undefined;
    update.$set.isAvailable = undefined;
  }
  
  if (role && role !== 'client') {
    update.$set = update.$set || {};
    update.$set.neededSpecialists = undefined;
  }
  
  next();
});

// Indexes for better query performance
userSchema.index({ governorate: 1, district: 1 });
userSchema.index({ role: 1, isAvailable: 1 });
userSchema.index({ specialty: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;