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

// Subdocument schema for client's needed specialists
const neededSpecialistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: {
      values: specialties,
      message: '{VALUE} is not a valid specialty',
    },
    trim: true,
  },
  isNeeded: {
    type: Boolean,
    default: true, // Indicates if client needs this specialty
  },
});

// Mapping of governorates to their valid districts
const districtByGovernorate = {
  'Beirut': ['Beirut'],
  'Mount Lebanon': ['Baabda', 'Aley', 'Chouf', 'Keserwan', 'Metn', 'Jbeil'],
  'North': ['Tripoli', 'Akkar', 'Bcharre', 'Koura', 'Miniyeh-Danniyeh', 'Zgharta', 'Batroun'],
  'Akkar': ['Akkar'],
  'Beqaa': ['Zahle', 'West Beqaa', 'Rashaya'],
  'Baalbek-Hermel': ['Baalbek', 'Hermel'],
  'South': ['Saida', 'Tyre', 'Jezzine'],
  'Nabatieh': ['Nabatieh', 'Marjeyoun', 'Hasbaya', 'Bint Jbeil'],
};

const userSchema = new mongoose.Schema({
  fullname: {
    type: String,
    required: true,
    trim: true,
    unique: true, // Ensure unique usernames
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
    enum: ['client', 'specialist', 'admin'],
  },
  district: {
    type: String,
    required: function () {
      return this.role === 'client' || this.role === 'specialist';
    },
    trim: true,
    validate: {
      validator: function (value) {
        if (this.role === 'admin') return true; // No validation for admins
        const governorate = this.governorate;
        return districtByGovernorate[governorate]?.includes(value);
      },
      message: 'Invalid district for the selected governorate',
    },
  },
  governorate: {
    type: String,
    required: function () {
      return this.role === 'client' || this.role === 'specialist';
    },
    trim: true,
    enum: {
      values: ['Beirut', 'Mount Lebanon', 'North', 'Akkar', 'Beqaa', 'Baalbek-Hermel', 'South', 'Nabatieh'],
      message: '{VALUE} is not a valid governorate',
    },
  },
  neededSpecialists: {
    type: [neededSpecialistSchema],
    required: function () {
      return this.role === 'client';
    },
    default: [], // Only applies to clients
  },
  specialty: {
    type: String,
    required: function () {
      return this.role === 'specialist';
    },
    enum: {
      values: specialties,
      message: '{VALUE} is not a valid specialty',
    },
    trim: true, // Only applies to specialists
  },
  isAvailable: {
    type: Boolean,
    default: true, // Only applies to specialists
    required: function () {
      return this.role === 'specialist';
    },
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('User', userSchema);