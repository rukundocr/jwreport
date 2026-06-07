const Member = require('../models/Member');
const fs = require('fs');
const csv = require('csv-parser');
const Joi = require('joi');

// @desc    Update Member (The logic that handles the Edit Modal)
exports.updateMember = async (req, res) => {
    // 1. Define Joi Validation Schema
    const schema = Joi.object({
        firstName: Joi.string().min(3).trim().required().label('First Name'),
        lastName: Joi.string().min(3).trim().required().label('Last Name'),
        phone: Joi.string().length(10).pattern(/^[0-9]+$/).required().label('Phone Number')
            .messages({ 'string.pattern.base': 'Phone Number must contain only digits.' }),
        group: Joi.string().trim().required().label('Group'),
        type: Joi.string().trim().required().label('Type'),
        status: Joi.string().trim().required().label('Status')
    });

    // 2. Validate Input
    // We allow unknown fields like '_method' which might be passed by method-override, but usually that's in query or header. 
    // Actually method-override uses query string or hidden input. `req.body` might have `_method`? No, usually not if in query. 
    // Let's strip unknown just in case.
    const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });

    if (error) {
        try {
            const members = await Member.find().sort({ lastName: 1 }).lean();
            return res.render('registry', { 
                members, 
                activeMembers: true,
                editErrors: error.details.map(detail => detail.message),
                submittedData: req.body,
                editingId: req.params.id,
                showEditModal: true
            });
        } catch (err) {
            return res.status(500).send("Server Error");
        }
    }

    try {
        await Member.findByIdAndUpdate(req.params.id, req.body);
        res.redirect('/members');
    } catch (err) {
        console.error(err);
        res.redirect('/members?error=update_failed');
    }
};

// @desc    Upload CSV and Bulk Insert (Updated to include Phone)
exports.uploadCSV = async (req, res) => {
    if (!req.file) return res.redirect('/members?error=no_file');

    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv({
            mapHeaders: ({ header }) => header.trim().toLowerCase() 
        }))
        .on('data', (data) => {
            results.push({
                firstName: data['firstname'],
                lastName: data['lastname'],
                phone: data['phone'] || '', // New: Maps 'phone' column from CSV
                group: data['group'],
                type: data['type'] ? data['type'].trim() : '',
                status: data['status'] || 'Active'
            });
        })
        .on('end', async () => {
            try {
                const cleanResults = results.filter(r => r.firstName && r.lastName);
                await Member.insertMany(cleanResults);
                fs.unlinkSync(req.file.path); 
                res.redirect('/members?success=uploaded');
            } catch (err) {
                console.error("CSV Import Error:", err);
                res.redirect('/members?error=import_failed');
            }
        });
};

// @desc    Create Member (Add New)
exports.createMember = async (req, res) => {
    // 1. Define Joi Validation Schema
    const schema = Joi.object({
        firstName: Joi.string().min(3).trim().required().label('First Name'),
        lastName: Joi.string().min(3).trim().required().label('Last Name'),
        phone: Joi.string().length(10).pattern(/^[0-9]+$/).required().label('Phone Number')
            .messages({ 'string.pattern.base': 'Phone Number must contain only digits.' }),
        group: Joi.string().trim().required().label('Group'),
        type: Joi.string().trim().required().label('Type')
    });

    // 2. Validate Input
    const { error } = schema.validate(req.body, { abortEarly: false });

    // 3. If Error, Re-render Form with Messages
    if (error) {
        try {
            const members = await Member.find().sort({ lastName: 1 }).lean();
            return res.render('registry', { 
                members, 
                activeMembers: true,
                errors: error.details.map(detail => detail.message),
                submittedData: req.body,
                showAddModal: true // Flag to re-open modal
            });
        } catch (err) {
            return res.status(500).send("Server Error");
        }
    }

    try {
        // This takes all fields from the "Add New" form, including 'phone'
        await Member.create(req.body);
        res.redirect('/members');
    } catch (err) {
        res.redirect('/members?error=add_failed');
    }
};

// @desc    Get Members (For the table)
exports.getMembers = async (req, res) => {
    try {
        const members = await Member.find().sort({ lastName: 1 }).lean();
        res.render('registry', { members, activeMembers: true });
    } catch (err) {
        res.status(500).send("Server Error");
    }
};

// @desc    Delete Member
exports.deleteMember = async (req, res) => {
    try {
        await Member.findByIdAndDelete(req.params.id);
        res.redirect('/members');
    } catch (err) {
        res.redirect('/members?error=delete_failed');
    }
};

// @desc    Search Members (AJAX)
exports.searchMembers = async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.json([]);
        }
        
        const members = await Member.find({
            $or: [
                { firstName: { $regex: query, $options: 'i' } },
                { lastName: { $regex: query, $options: 'i' } }
            ]
        }).sort({ firstName: 1 }).lean().limit(20);
        
        res.json(members);
    } catch (err) {
        console.error("Search error:", err);
        res.status(500).json({ error: "Server Error" });
    }
};