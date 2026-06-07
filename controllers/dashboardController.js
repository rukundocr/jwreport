const Member = require('../models/Member');
const Report = require('../models/Report');

exports.getDashboard = async (req, res) => {
    try {
        const validMonths = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        const currentYear = new Date().getFullYear();
        const currentMonthIndex = new Date().getMonth();

        const selectedMonth = req.query.month || validMonths[currentMonthIndex];
        const selectedYear = req.query.year || currentYear.toString();

        // Generate years list (Example: 4 years back, 1 year forward)
        const years = [];
        for (let i = currentYear - 4; i <= currentYear + 1; i++) {
            years.push(i.toString());
        }

        const reports = await Report.find({ month: selectedMonth, year: selectedYear.toString() })
            .populate('memberId')
            .lean();

        const stats = {
            publisher: { count: 0, studies: 0, hours: 0 },
            auxiliary: { count: 0, studies: 0, hours: 0 },
            regular: { count: 0, studies: 0, hours: 0 },
            totals: { count: 0, studies: 0, hours: 0 }
        };

        const groupStats = {};

        reports.forEach(report => {
            if (!report.memberId) return;

            // Updated to match your exact schema strings:
            const type = report.memberId.type;
            const hours = Number(report.hours) || 0;
            const studies = Number(report.bibleStudies) || 0;
            const groupName = report.memberId.group || 'Unknown';

            // Initialize group stats if not exists
            if (!groupStats[groupName]) {
                groupStats[groupName] = {
                    publisher: { count: 0, studies: 0, hours: 0 },
                    auxiliary: { count: 0, studies: 0, hours: 0 },
                    regular: { count: 0, studies: 0, hours: 0 },
                    totals: { count: 0, studies: 0, hours: 0 }
                };
            }

            const group = groupStats[groupName];

            if (type === 'Regular_Pioneers') {
                stats.regular.count++;
                stats.regular.hours += hours;
                stats.regular.studies += studies;

                group.regular.count++;
                group.regular.hours += hours;
                group.regular.studies += studies;
            } else if (type === 'Auxiliary_pioneer') {
                stats.auxiliary.count++;
                stats.auxiliary.hours += hours;
                stats.auxiliary.studies += studies;

                group.auxiliary.count++;
                group.auxiliary.hours += hours;
                group.auxiliary.studies += studies;
            } else if (type === 'Regular_publisher') {
                stats.publisher.count++;
                stats.publisher.hours += hours;
                stats.publisher.studies += studies;

                group.publisher.count++;
                group.publisher.hours += hours;
                group.publisher.studies += studies;
            }

            // Global totals for the whole congregation
            stats.totals.count++;
            stats.totals.studies += studies;
            stats.totals.hours += hours;

            // Group totals
            group.totals.count++;
            group.totals.studies += studies;
            group.totals.hours += hours;
        });

        // --- Category Reports Logic (Yearly) ---
        const allMembers = await Member.find().sort({ lastName: 1, firstName: 1 }).lean();
        const sYear = parseInt(selectedYear);
        const serviceMonths = [
            { name: "September", year: sYear - 1 },
            { name: "October", year: sYear - 1 },
            { name: "November", year: sYear - 1 },
            { name: "December", year: sYear - 1 },
            { name: "January", year: sYear },
            { name: "February", year: sYear },
            { name: "March", year: sYear },
            { name: "April", year: sYear },
            { name: "May", year: sYear },
            { name: "June", year: sYear },
            { name: "July", year: sYear },
            { name: "August", year: sYear }
        ];

        const yearlyReports = await Report.find({
            $or: serviceMonths.map(m => ({ month: m.name, year: m.year.toString() }))
        }).lean();

        const categoryData = {
            regularPublishers: [],
            auxiliaryPioneers: [],
            regularPioneers: []
        };

        allMembers.forEach(member => {
            const memberReports = yearlyReports.filter(r => r.memberId.toString() === member._id.toString());
            const monthlyData = serviceMonths.map(m => {
                const found = memberReports.find(r => r.month === m.name && r.year.toString() === m.year.toString());
                return {
                    month: m.name.substring(0, 3), // Jan, Feb, etc.
                    participated: found ? found.participated : false,
                    hours: found ? (Number(found.hours) || 0) : 0,
                    studies: found ? (Number(found.bibleStudies) || 0) : 0,
                    hasRecord: !!found
                };
            });

            const dataObj = { member, monthlyData };
            const normalizedType = (member.type || '').toLowerCase().replace(/_/g, ' ');
            
            if (normalizedType.includes('auxiliary')) {
                categoryData.auxiliaryPioneers.push(dataObj);
            } else if (normalizedType.includes('regular pioneer')) {
                categoryData.regularPioneers.push(dataObj);
            } else {
                categoryData.regularPublishers.push(dataObj);
            }
        });

        res.render('dashboard', {
            stats,
            groupStats,
            categoryData,
            serviceMonths: serviceMonths.map(m => m.name.substring(0, 3)), // Pass abbreviated month names for headers
            selectedMonth,
            selectedYear,
            months: validMonths,
            years: years,
            activeDashboard: true
        });
    } catch (err) {
        console.error("Dashboard Error:", err);
        res.status(500).send("Error loading dashboard");
    }
};