const Member = require('../models/Member');
const Report = require('../models/Report');

// @desc    Get members who haven't submitted a report yet
exports.getReportingForm = async (req, res) => {
    try {
        const { group, month, year } = req.query;
        const selectedMonth = month || new Date().toLocaleString('default', { month: 'long' });
        const selectedYear = year || 2026;

        let members = [];
        if (group) {
            const allGroupMembers = await Member.find({ group, status: 'Active' }).sort({ lastName: 1 }).lean();
            
            // Find anyone who has ALREADY reported (whether they participated or not)
            const existingReports = await Report.find({ month: selectedMonth, year: selectedYear }).select('memberId').lean();
            const submittedMemberIds = existingReports.map(r => r.memberId.toString());

            // Only show those who are truly "Missing"
            members = allGroupMembers.filter(m => !submittedMemberIds.includes(m._id.toString()));
        }

        res.render('submit-report', {
            members,
            selectedGroup: group,
            selectedMonth,
            selectedYear,
            activeReports: true
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading reporting form");
    }
};

// @desc    Save reports (Handles Scenario: Reported vs Participated)
exports.submitBulkReports = async (req, res) => {
    try {
        const { month, year, reports } = req.body; 

        if (!reports || typeof reports !== 'object') {
            return res.redirect('/reports/submit?error=no_data');
        }

        const reportPromises = Object.keys(reports).map(async (memberId) => {
            const data = reports[memberId];
            
            // Only save if the "Reported" checkbox was checked
            if (data.reported === 'on') {
                return Report.findOneAndUpdate(
                    { memberId, month, year },
                    {
                        memberId,
                        month,
                        year,
                        participated: data.participated === 'on', 
                        hours: parseFloat(data.hours) || 0,
                        bibleStudies: parseInt(data.bibleStudies) || 0,
                        remarks: data.remarks || ''
                    },
                    { upsert: true, new: true }
                );
            }
            return null;
        });

        await Promise.all(reportPromises);
        res.redirect('/reports/view?month=' + month + '&year=' + year);
    } catch (err) {
        console.error("Bulk Submission Error:", err);
        res.redirect('/reports/submit?error=failed');
    }
};

// @desc    View combined status report


// @desc    View combined status report
exports.viewReports = async (req, res) => {
    try {
        const selectedMonth = req.query.month || new Date().toLocaleString('default', { month: 'long' });
        const selectedYear = req.query.year || 2026;

        // 1. Fetch ALL active members (this ensures we show "Missing" people)
        const allMembers = await Member.find({ status: 'Active' }).sort({ lastName: 1 }).lean();

        // 2. Fetch all reports for the specific period
        // We MUST use both Month and Year to filter correctly
        const reports = await Report.find({ 
            month: selectedMonth, 
            year: selectedYear.toString() // Ensure string comparison if stored as string
        }).populate('memberId').lean();

        // 3. Map reports by Member ID for O(1) lookup
        const reportMap = new Map();
        reports.forEach(r => {
            if (r.memberId) {
                // Handle cases where memberId might be populated or just an ID string
                const id = r.memberId._id ? r.memberId._id.toString() : r.memberId.toString();
                reportMap.set(id, r);
            }
        });

        const summary = { totalHours: 0, totalStudies: 0, activeCount: 0, noActivityCount: 0, missingCount: 0 };
        
        // 4. Merge Member data with Report data
        const finalRecords = allMembers.map(member => {
            const memberIdStr = member._id.toString();
            const report = reportMap.get(memberIdStr);
            
            if (report) {
                // They submitted a report (could be participated: true or false)
                if (report.participated) {
                    summary.activeCount++;
                    summary.totalHours += (Number(report.hours) || 0);
                    summary.totalStudies += (Number(report.bibleStudies) || 0);
                    return { 
                        ...report, 
                        memberId: member, // Ensure member data is attached even if populate failed
                        status: 'Active' 
                    };
                } else {
                    summary.noActivityCount++;
                    return { 
                        ...report, 
                        memberId: member, 
                        status: 'No Activity', 
                        hours: 0, 
                        bibleStudies: 0 
                    };
                }
            } else {
                // No record found in the Report collection
                summary.missingCount++;
                return { 
                    memberId: member, 
                    status: 'Missing', 
                    hours: 0, 
                    bibleStudies: 0, 
                    remarks: 'Pending' 
                };
            }
        });

        res.render('view-reports', {
            reports: finalRecords,
            summary,
            selectedMonth,
            selectedYear,
            activeReports: true
        });
    } catch (err) {
        console.error("View Reports Error:", err);
        res.status(500).send("Error loading reports overview");
    }
};
exports.getIndividualReport = async (req, res) => {
    try {
        const { memberId } = req.params;
        const serviceYear = parseInt(req.query.year) || 2026;

        // 1. FETCH ALL MEMBERS (For the dropdown)
        const allMembers = await Member.find().sort({ firstName: 1 }).lean();

        // 2. FETCH THE SELECTED MEMBER
        const member = await Member.findById(memberId).lean();
        if (!member) return res.status(404).send("Member not found");

        // 3. DEFINE THE 12 MONTHS (Sept Previous Year to Aug Current Year)
        const months = [
            { name: "September", year: serviceYear - 1 },
            { name: "October", year: serviceYear - 1 },
            { name: "November", year: serviceYear - 1 },
            { name: "December", year: serviceYear - 1 },
            { name: "January", year: serviceYear },
            { name: "February", year: serviceYear },
            { name: "March", year: serviceYear },
            { name: "April", year: serviceYear },
            { name: "May", year: serviceYear },
            { name: "June", year: serviceYear },
            { name: "July", year: serviceYear },
            { name: "August", year: serviceYear }
        ];

        // 4. FETCH REPORTS
        const reports = await Report.find({
            memberId,
            $or: months.map(m => ({ month: m.name, year: m.year.toString() }))
        }).lean();

        // 5. MAP DATA FOR THE TABLE
        const yearlyData = months.map(m => {
            const found = reports.find(r => r.month === m.name && r.year == m.year);
            return {
                _id: found ? found._id : null,
                month: m.name,
                year: m.year,
                participated: found ? found.participated : false,
                hours: found ? (Number(found.hours) || 0) : 0,
                bibleStudies: found ? (Number(found.bibleStudies) || 0) : 0,
                remarks: found ? found.remarks : '',
                hasRecord: !!found
            };
        });

        // 6. CALCULATE TOTALS
        const totals = yearlyData.reduce((acc, curr) => {
            acc.hours += curr.hours;
            acc.studies += curr.bibleStudies;
            if (curr.participated) acc.monthsActive++;
            return acc;
        }, { hours: 0, studies: 0, monthsActive: 0 });

        // 7. RENDER
        res.render('individual-report', {
            member,
            allMembers, // This makes the dropdown work
            yearlyData,
            totals,
            serviceYear,
            isPioneer: member.type !== 'Regular_publisher'
        });
    } catch (err) {
        console.error("Individual Report Error:", err);
        res.status(500).send("Error loading individual record");
    }
};

// This allows the "Individual Records" menu item to actually go somewhere
exports.getInitialIndividualReport = async (req, res) => {
    try {
        const firstMember = await Member.findOne().sort({ firstName: 1 });
        if (!firstMember) {
            return res.redirect('/members?error=no_members');
        }
        res.redirect(`/reports/individual/${firstMember._id}`);
    } catch (err) {
        res.redirect('/dashboard');
    }
};

// @desc    Update a single monthly report record manually
exports.updateReport = async (req, res) => {
    try {
        const { reportId, participated, hours, bibleStudies, remarks } = req.body;

        // Basic sanity check
        const updateData = {
            participated: participated === 'on',
            hours: parseFloat(hours) || 0,
            bibleStudies: parseInt(bibleStudies) || 0,
            remarks: remarks || ''
        };

        // If hours or studies are negative, we reset them to 0 as a safety measure
        if (updateData.hours < 0) updateData.hours = 0;
        if (updateData.bibleStudies < 0) updateData.bibleStudies = 0;

        const updatedReport = await Report.findByIdAndUpdate(reportId, updateData, { new: true });

        if (!updatedReport) {
            return res.status(404).json({ success: false, message: "Report not found" });
        }

        res.json({ success: true, message: "Report updated successfully" });
    } catch (err) {
        console.error("Update Report Error:", err);
        res.status(500).json({ success: false, message: "Error updating report" });
    }
};