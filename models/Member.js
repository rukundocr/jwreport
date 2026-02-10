const mongoose = require('mongoose');
const MemberSchema = new mongoose.Schema({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true }, // New Field
    group: { type: String, required: true },
    type: { 
        type: String, 
        required: true, 
        // We include all variations found in your CSV to prevent validation errors
        enum: [
            'Regular_publisher', 
            'Auxiliary_pioneer', 
            'Regular_Pioneers',
            'Regular Publisher',
            'Regular Pioneer',
            'Auxiliary Pioneer',
            "Auxiliary_Pioneer"
        ] 
    },
    status: { type: String, default: 'Active' }
});
module.exports = mongoose.model('Member', MemberSchema);