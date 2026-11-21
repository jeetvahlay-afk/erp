const RecruitmentManagement = require('../models/RecruitmentManagement');
const User = require('../models/User');
const Role = require('../models/Role');
const { notifyActiveRoles, dispatchNotifications } = require('./notificationService');
const { sanitizeRoutes, permissionsForRoutes } = require('../utils/routePermissions');
const logger = require('../utils/logger');

/**
 * Converts a candidate into an active Employee with employmentType: 'Probation'.
 * Sets probation period for 3 months with probationStartDate.
 */
const convertCandidateToProbationEmployee = async (candidate, performedByUser) => {
  const probationStart = candidate.probationStartDate || new Date();

  // 1. Check if user already exists
  let user = null;
  if (candidate.convertedUserId) {
    user = await User.findById(candidate.convertedUserId);
  }
  if (!user && candidate.email) {
    user = await User.findOne({ email: candidate.email.trim().toLowerCase(), deletedAt: null });
  }
  if (!user && candidate.phoneNumber) {
    user = await User.findOne({ phone: candidate.phoneNumber.trim(), deletedAt: null });
  }

  if (user) {
    user.employmentType = 'Probation';
    user.probationStartDate = probationStart;
    user.probationDurationMonths = 3;
    user.probationStatus = 'In Probation';
    user.probation3MonthNotified = false;
    user.probationCandidateId = candidate._id;
    if (!user.designation && candidate.candidatePost) user.designation = candidate.candidatePost;
    if (!user.department && (candidate.department || candidate.branch)) user.department = candidate.department || candidate.branch;
    await user.save({ validateBeforeSave: false });
    return user;
  }

  // 2. Create new employee user
  const fullName = String(candidate.candidateName || 'Candidate').trim();
  const nameParts = fullName.split(/\s+/);
  const firstName = nameParts[0] || 'Employee';
  const lastName = nameParts.slice(1).join(' ') || '';

  const baseUsername = fullName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) || 'emp';
  let username = baseUsername;
  let counter = 1;
  while (await User.exists({ username })) {
    username = `${baseUsername}${counter++}`;
  }

  let email = candidate.email ? candidate.email.trim().toLowerCase() : '';
  if (!email || (await User.exists({ email }))) {
    email = `${username}@erp.local`;
  }

  const defaultRole = 'user';
  const roleDoc = await Role.findOne({ name: defaultRole, isActive: true });
  const allowedRoutes = roleDoc?.allowedRoutes || [];
  const permissions = roleDoc?.permissions || permissionsForRoutes(allowedRoutes);

  user = await User.create({
    name: fullName,
    firstName,
    lastName,
    username,
    email,
    password: 'Welcome@123',
    role: defaultRole,
    phone: candidate.phoneNumber || '',
    department: candidate.department || candidate.branch || 'Operations',
    designation: candidate.candidatePost || 'Probation Trainee',
    joiningDate: probationStart,
    employmentType: 'Probation',
    probationStartDate: probationStart,
    probationDurationMonths: 3,
    probationStatus: 'In Probation',
    probation3MonthNotified: false,
    probationCandidateId: candidate._id,
    allowedRoutes: sanitizeRoutes(allowedRoutes),
    permissions: [...new Set(permissions)],
    isActive: true,
  });

  return user;
};

/**
 * Checks all active candidates in the training period.
 * If 8 days have elapsed from the start of training (or on the 8th day),
 * generates an actionable notification for HR and Admin:
 * "this {candidateName} candidate completed the 8 days of the training period do you want to move him/her into probation period or not"
 */
const checkTrainingDay8Milestones = async () => {
  try {
    const now = new Date();
    const trainees = await RecruitmentManagement.find({
      $or: [
        { stage: 'Training Candidates' },
        { status: { $in: ['Ongoing', 'ongoing', 'In Training', 'Training', 'All Trainees'] } },
        { trainingStatus: { $in: ['Ongoing', 'ongoing', 'In Training', 'Training'] } },
      ],
      trainingDay8Notified: { $ne: true },
      status: {
        $nin: [
          'Completed',
          'completed',
          'Moved to Probation',
          'moved to probation',
          'Probation',
          'probation',
          'Left',
          'left',
          'Ineligible',
          'ineligible',
          'Discontinued',
          'discontinued',
          'Rejected',
          'rejected',
        ],
      },
    });

    for (const candidate of trainees) {
      const startDate =
        candidate.trainingStartDate ||
        candidate.candidateJoinedOn ||
        candidate.joiningDateProvided ||
        candidate.entryDate ||
        candidate.createdAt;
      if (!startDate) continue;

      const diffMs = now.getTime() - new Date(startDate).getTime();
      const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

      // Check if candidate has reached or completed 8 days of training
      if (diffDays >= 8) {
        const candidateName = candidate.candidateName || 'Trainee';
        const notificationTitle = `Training Milestone: ${candidateName} (8 Days Completed)`;
        const notificationMessage = `this ${candidateName} candidate completed the 8 days of the training period do you want to move him/her into probation period or not`;

        await notifyActiveRoles(['admin', 'super admin', 'hr'], {
          title: notificationTitle,
          message: notificationMessage,
          type: 'action',
          link: `/interview/${candidate._id}?action=probation-decision`,
          metadata: {
            category: 'training_probation_check',
            candidateId: candidate._id,
            candidateName,
            daysInTraining: diffDays,
            trainingStartDate: startDate,
            actionRequired: true,
          },
        });

        candidate.trainingStartDate = startDate;
        candidate.trainingDay8Notified = true;
        candidate.trainingDay8NotifiedAt = now;
        await candidate.save();

        logger.info(`8-day training notification dispatched for ${candidateName} (ID: ${candidate._id})`);
      }
    }
  } catch (error) {
    logger.error('Failed to execute training milestone check', { error: error.message });
  }
};

/**
 * Checks all active employees in the probation period (employmentType: 'Probation').
 * When 3 months have elapsed from probationStartDate (diffDays >= 90),
 * generates an actionable notification for the reporting manager, HR and Admin:
 * "this {employeeName} candidate completed 3 months of the probation period do you want to convert him/her into the official employee or not"
 */
const checkProbation3MonthMilestones = async () => {
  try {
    const now = new Date();
    const probationEmployees = await User.find({
      deletedAt: null,
      isActive: true,
      employmentType: 'Probation',
      probation3MonthNotified: { $ne: true },
    }).populate('reportingManager', 'name email role');

    for (const emp of probationEmployees) {
      const startDate = emp.probationStartDate || emp.joiningDate || emp.createdAt;
      if (!startDate) continue;

      const diffMs = now.getTime() - new Date(startDate).getTime();
      const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
      const requiredMonths = emp.probationDurationMonths || 3;
      const requiredDays = requiredMonths * 30; // standard 3-month cycle (90 days)

      if (diffDays >= requiredDays) {
        const empName = emp.name || 'Employee';
        const notificationTitle = `Probation Milestone: ${empName} (3 Months Completed)`;
        const notificationMessage = `this ${empName} candidate completed 3 months of the probation period do you want to convert him/her into the official employee or not`;

        // 1. Notify Admins, Super Admins, and HR
        await notifyActiveRoles(['admin', 'super admin', 'hr'], {
          title: notificationTitle,
          message: notificationMessage,
          type: 'action',
          link: `/employee/${emp._id}?action=official-conversion`,
          metadata: {
            category: 'probation_official_check',
            userId: emp._id,
            employeeName: empName,
            daysInProbation: diffDays,
            probationStartDate: startDate,
            actionRequired: true,
          },
        });

        // 2. Also notify direct Reporting Manager if assigned and not in admin/hr
        if (emp.reportingManager?._id) {
          const mgrRole = String(emp.reportingManager.role || '').toLowerCase();
          if (!['admin', 'super admin', 'hr'].includes(mgrRole)) {
            await dispatchNotifications({
              recipients: emp.reportingManager._id,
              title: notificationTitle,
              message: notificationMessage,
              type: 'action',
              link: `/employee/${emp._id}?action=official-conversion`,
              metadata: {
                category: 'probation_official_check',
                userId: emp._id,
                employeeName: empName,
                daysInProbation: diffDays,
                probationStartDate: startDate,
                actionRequired: true,
              },
            });
          }
        }

        emp.probation3MonthNotified = true;
        emp.probation3MonthNotifiedAt = now;
        await emp.save({ validateBeforeSave: false });

        if (emp.probationCandidateId) {
          await RecruitmentManagement.findByIdAndUpdate(emp.probationCandidateId, {
            $set: {
              probation3MonthNotified: true,
              probation3MonthNotifiedAt: now,
            },
          });
        }

        logger.info(`3-month probation notification dispatched for ${empName} (ID: ${emp._id})`);
      }
    }
  } catch (error) {
    logger.error('Failed to execute probation milestone check', { error: error.message });
  }
};

module.exports = {
  checkTrainingDay8Milestones,
  checkProbation3MonthMilestones,
  convertCandidateToProbationEmployee,
};
