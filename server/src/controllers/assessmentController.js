const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const AssessmentCandidate = require('../models/AssessmentCandidate');
const Interview = require('../models/Interview');
const assessmentData = require('../data/assessmentQuestions.json');
const AppError = require('../utils/AppError');
const { sendSystemEmail } = require('../services/mailService');
const logger = require('../utils/logger');

const POSITION_TITLES = {
  digital_marketing: 'Digital Marketing Executive',
  content_creator: 'Content Creator',
  video_editor: 'Video Editor',
  data_analyst: 'Data Analyst',
  business_development_associate: 'Business Development Associate',
  customer_support_associate: 'Customer Support Associate',
  frontend_developer: 'Frontend Developer',
  it_sales_executive: 'IT Sales Executive',
  fullstack_developer: 'Fullstack Developer',
  backend_developer: 'Backend Developer',
  graphic_designer: 'Graphic Designer',
};

const getOtpEmailHtml = (fullName, candidateCode, otp, driveLocation, position) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Assessment Verification Code - Vahlay Consulting</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f3f4f6; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03); border: 1px solid #e5e7eb;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%); padding: 36px 32px 30px 32px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <!-- Badge -->
                    <div style="display: inline-block; padding: 5px 14px; background-color: rgba(255, 255, 255, 0.16); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">
                      Recruitment Drive · ${driveLocation || 'Ahmedabad'}
                    </div>
                    <!-- Brand Title -->
                    <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: 1px; line-height: 1.2;">
                      VAHLAY CONSULTING
                    </h1>
                    <p style="margin: 6px 0 0 0; color: rgba(255, 255, 255, 0.85); font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">
                      Bespoke Solutions · Since 2022
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 14px 0; font-size: 17px; font-weight: 700; color: #111827;">
                Dear ${fullName || 'Candidate'},
              </p>
              
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #4b5563;">
                Thank you for applying for the <strong style="color: #111827;">${position || 'Executive'}</strong> position at Vahlay Consulting. Please use the verification code below to verify your email address and unlock your assessment desk.
              </p>

              <!-- Candidate Summary Strip -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f9fafb; border-radius: 12px; border: 1px solid #edf2f7; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 14px 18px; border-right: 1px solid #edf2f7; width: 50%;">
                    <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600; letter-spacing: 0.5px;">Candidate ID</div>
                    <div style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 13px; font-weight: 700; color: #111827; margin-top: 3px;">
                      ${candidateCode}
                    </div>
                  </td>
                  <td style="padding: 14px 18px; width: 50%;">
                    <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600; letter-spacing: 0.5px;">Applied Role</div>
                    <div style="font-size: 13px; font-weight: 700; color: #111827; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      ${position || 'Technical Assessment'}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- OTP Verification Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(180deg, #f8fafc 0%, #eff6ff 100%); border: 2px dashed #93c5fd; border-radius: 16px; margin-bottom: 28px; text-align: center;">
                <tr>
                  <td style="padding: 28px 20px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #2563eb; margin-bottom: 10px;">
                      Your 6-Digit Verification Code
                    </div>
                    
                    <!-- Digits -->
                    <div style="font-family: 'SF Mono', Consolas, Monaco, 'Courier New', monospace; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #1d4ed8; padding-left: 12px; margin: 8px 0 12px 0;">
                      ${otp}
                    </div>

                    <!-- Expiry Note -->
                    <div style="display: inline-block; padding: 4px 12px; background-color: #ffffff; border: 1px solid #bfdbfe; border-radius: 9999px; font-size: 12px; font-weight: 600; color: #475569;">
                      ⏱ Code valid for <strong style="color: #111827;">15 minutes</strong>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Stepwise Assessment Pipeline -->
              <div style="margin-bottom: 24px; padding: 18px 20px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #334155; letter-spacing: 0.5px; margin-bottom: 10px;">
                  Assessment Journey Overview
                </div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 12px; color: #475569; line-height: 1.8;">
                  <tr>
                    <td style="padding: 2px 0;"><span style="color: #16a34a; font-weight: bold;">✓ Step 1:</span> Candidate Registration Completed</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 0;"><span style="color: #8B1D2C; font-weight: bold;">● Step 2:</span> Email Verification <em style="color: #64748b;">(Enter the code above)</em></td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 0;"><span style="color: #64748b;">○ Step 3:</span> Assessment Desk Sign In</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 0;"><span style="color: #64748b;">○ Step 4:</span> Rules & Declaration</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 0;"><span style="color: #64748b;">○ Step 5:</span> Live Examination (30 questions · 50 minutes)</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 0;"><span style="color: #64748b;">○ Step 6:</span> Final Registration Completed</td>
                  </tr>
                </table>
              </div>

              <!-- Important Rules -->
              <div style="border-left: 3px solid #8B1D2C; padding-left: 14px; margin-bottom: 28px;">
                <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #4b5563;">
                  <strong>Important:</strong> Never share this code with anyone. Make sure to complete the assessment in one sitting on a desktop or laptop for the best experience.
                </p>
              </div>

              <p style="margin: 0; font-size: 13px; color: #4b5563;">
                Best regards,<br>
                <strong style="color: #111827;">Vahlay Consulting Recruitment Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; border-top: 1px solid #f3f4f6; padding: 22px 36px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #6b7280;">
                Vahlay Consulting · Bespoke Solutions
              </p>
              <p style="margin: 0 0 10px 0; font-size: 11px; color: #9ca3af;">
                Ahmedabad · Surat · Vadodara · Rajkot · Mumbai · Pune · Bangalore
              </p>
              <p style="margin: 0; font-size: 11px; color: #9ca3af; line-height: 1.4;">
                This is an automated system email generated for your candidate recruitment application.<br>
                © 2026 Vahlay Consulting. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Helper: Generate a cryptographically secure 6-digit numeric OTP
const generateSecureOtp = () => crypto.randomInt(100000, 1000000).toString();

/**
 * Normalizes phone numbers to standard 10-digit comparable format
 */
const normalizePhone = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

/**
 * Finds candidate in RecruitmentManagement / Interview by verifying BOTH email AND mobileNumber
 */
const findMatchingDailyCandidate = async (email, mobileNumber) => {
  if (!email || !mobileNumber) return null;
  const normalizedEmail = String(email).trim().toLowerCase();
  const phone10 = normalizePhone(mobileNumber);
  if (!normalizedEmail || !phone10) return null;

  // 1. Search by email first
  const candidatesByEmail = await Interview.find({ email: normalizedEmail }).sort({ updatedAt: -1 });
  for (const c of candidatesByEmail) {
    const cPhone10 = normalizePhone(c.phoneNumber || c.mobileNumber);
    if (cPhone10 === phone10) {
      return c;
    }
  }

  // 2. Fallback search by phone number ending in the 10 digits
  const phoneRegex = new RegExp(phone10 + '$');
  const candidatesByPhone = await Interview.find({ phoneNumber: phoneRegex }).sort({ updatedAt: -1 });
  for (const c of candidatesByPhone) {
    if (String(c.email || '').trim().toLowerCase() === normalizedEmail) {
      return c;
    }
  }

  return null;
};

const getDepartmentForPosition = (posValue) => {
  if (['business_development_associate', 'customer_support_associate'].includes(posValue)) {
    return 'Business Development & Support';
  }
  if (['digital_marketing', 'content_creator', 'video_editor', 'graphic_designer'].includes(posValue)) {
    return 'Marketing & Creative';
  }
  if (['frontend_developer', 'backend_developer', 'fullstack_developer'].includes(posValue)) {
    return 'Technology';
  }
  if (posValue === 'data_analyst') {
    return 'Analytics & Data';
  }
  if (posValue === 'it_sales_executive') {
    return 'IT Sales';
  }
  return 'General';
};

// Synchronize candidate record into Recruitment Management
const syncCandidateToRecruitment = async (candidate) => {
  if (!candidate) return null;
  try {
    const postTitle = POSITION_TITLES[candidate.positionAppliedFor] || candidate.positionAppliedFor;
    const resolvedDept = candidate.department || getDepartmentForPosition(candidate.positionAppliedFor);

    let status = candidate.colorCategory || 'Pending';
    if (candidate.status === 'Running' && (!candidate.colorCategory || candidate.colorCategory === 'Pending')) {
      status = 'Running';
    } else if (candidate.status === 'Completed') {
      status = candidate.colorCategory || 'Red';
    } else if (candidate.status === 'Pending') {
      status = 'Pending';
    }

    const targetQuestions = candidate.totalQuestions || 30;
    const scoreStr = candidate.status === 'Completed'
      ? `${candidate.score}/${targetQuestions} · ${candidate.colorCategory || 'Red'}`
      : (candidate.status === 'Running' ? 'Running...' : 'Pending');

    const auditText = candidate.status === 'Completed'
      ? `Assessment Evaluated: Score ${scoreStr}. Tab switches: ${candidate.tabSwitchCount || 0}. Completed at ${candidate.completedAt ? new Date(candidate.completedAt).toLocaleTimeString() : new Date().toLocaleTimeString()}.`
      : (candidate.status === 'Running'
        ? `Assessment Started at ${candidate.startedAt ? new Date(candidate.startedAt).toLocaleTimeString() : new Date().toLocaleTimeString()}. Candidate Code: ${candidate.candidateCode}. Status: Running.`
        : `Registered at ${candidate.driveLocation || 'Ahmedabad'} portal. Candidate Code: ${candidate.candidateCode}. Department: ${resolvedDept}. Status: Pending.`);

    // If candidate does not have interviewId, verify and link to existing Daily Candidate by email + phone
    if (!candidate.interviewId) {
      const dailyMatch = await findMatchingDailyCandidate(candidate.email, candidate.mobileNumber);
      if (dailyMatch) {
        candidate.interviewId = dailyMatch._id;
        await AssessmentCandidate.updateOne({ _id: candidate._id }, { interviewId: dailyMatch._id });
      }
    }

    const filter = candidate.interviewId
      ? { _id: candidate.interviewId }
      : {
          $or: [
            { candidateReference: candidate.candidateCode },
            { candidateCode: candidate.candidateCode },
            { email: candidate.email },
          ],
        };

    const updateDoc = {
      candidateName: candidate.fullName.trim(),
      email: candidate.email.trim().toLowerCase(),
      phoneNumber: (candidate.mobileNumber || '').trim(),
      candidatePost: postTitle,
      candidateReference: candidate.candidateCode,
      candidateCode: candidate.candidateCode,
      branch: (candidate.driveLocation || 'Ahmedabad').trim(),
      department: resolvedDept,
      stage: 'Assessment Update',
      status,
      interviewDate: candidate.startedAt || candidate.createdAt || new Date(),
      interviewTime: '10:00 AM',
      experience: candidate.totalExperience || (candidate.course ? `Course: ${candidate.course} (${candidate.college || 'N/A'})` : '') || 'Fresher',
      experienceType: candidate.candidateType || 'Fresher',
      cvUrl: candidate.cvUrl || '',
      address: candidate.currentLocation || '',
      interviewScore: scoreStr,
      assessmentScore: scoreStr,
      score: candidate.score || 0,
      totalQuestions: targetQuestions,
      percentage: candidate.percentage || 0,
      colorCategory: candidate.colorCategory || 'Pending',
      tabSwitchCount: candidate.tabSwitchCount || 0,
      startedAt: candidate.startedAt,
      completedAt: candidate.completedAt,
      assessmentKey: candidate.assessmentKey,
      comments: auditText,
      remarks: auditText,
      'stageNotes.assessment': auditText,
    };

    const interviewDoc = await Interview.findOneAndUpdate(
      filter,
      { $set: updateDoc },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (interviewDoc && (!candidate.interviewId || String(candidate.interviewId) !== String(interviewDoc._id))) {
      candidate.interviewId = interviewDoc._id;
      await AssessmentCandidate.updateOne({ _id: candidate._id }, { interviewId: interviewDoc._id });
    }

    return interviewDoc;
  } catch (err) {
    logger.error('Error syncing candidate to Recruitment Management: ' + err.message);
    return null;
  }
};

// 1. Get Assessment Form Metadata (options, positions, drive locations)
const getMetadata = async (_req, res, next) => {
  try {
    const { assessmentForm, assessments = {} } = assessmentData;
    const posField = assessmentForm?.step2_positionDetails?.fields?.find(
      (f) => f.fieldName === 'positionAppliedFor'
    );

    const rawPositions = posField?.options || [];
    const mapping = assessmentForm?.step2_positionDetails?.positionToAssessmentKey || {};

    const posMap = new Map();
    rawPositions.forEach((p) => {
      posMap.set(p.value, {
        value: p.value,
        label: p.label,
        department: getDepartmentForPosition(p.value),
      });
    });

    Object.keys(mapping).forEach((val) => {
      if (!posMap.has(val)) {
        posMap.set(val, {
          value: val,
          label: POSITION_TITLES[val] || val.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          department: getDepartmentForPosition(val),
        });
      }
    });

    Object.keys(assessments).forEach((key) => {
      if (!posMap.has(key) && key !== 'business_development_customer_support') {
        posMap.set(key, {
          value: key,
          label: POSITION_TITLES[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          department: getDepartmentForPosition(key),
        });
      }
    });

    const positions = Array.from(posMap.values());
    const uniqueDepts = Array.from(new Set(positions.map((p) => p.department)));
    const departmentList = uniqueDepts;

    const departmentDetails = departmentList.map((deptName) => ({
      name: deptName,
      positions: positions.filter((p) => p.department === deptName),
    }));

    return res.status(200).json({
      success: true,
      data: {
        formConfig: assessmentForm,
        driveLocations: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Remote', 'Mumbai', 'Pune', 'Bangalore'],
        departments: departmentList,
        departmentDetails,
        positions,
        scoring: {
          marksPerQuestion: 1,
          passingPercentage: 50,
          categories: {
            Green: { minPercentage: 75, label: 'Qualified' },
            Yellow: { minPercentage: 50, label: 'Average' },
            Red: { minPercentage: 0, label: 'Below Criteria' },
          },
        },
      },
    });
  } catch (err) {
    return next(err);
  }
};

// 1b. Verify & Lookup candidate in Daily Candidate Update by Email + Mobile Number
const lookupDailyCandidate = async (req, res, next) => {
  try {
    const { email, mobileNumber } = req.body;
    if (!email || !mobileNumber) {
      return res.status(200).json({
        success: true,
        found: false,
        message: 'Email and mobile number are required to verify existing candidate record.',
      });
    }

    const dailyCandidate = await findMatchingDailyCandidate(email, mobileNumber);
    if (!dailyCandidate) {
      return res.status(200).json({
        success: true,
        found: false,
        message: 'No matching Daily Candidate record found with this email and mobile number.',
      });
    }

    // Map candidatePost to positionAppliedFor
    let positionValue = '';
    if (dailyCandidate.positionAppliedFor) {
      positionValue = dailyCandidate.positionAppliedFor;
    } else if (dailyCandidate.candidatePost) {
      const postLower = dailyCandidate.candidatePost.trim().toLowerCase();
      const foundKey = Object.keys(POSITION_TITLES).find(
        (k) => POSITION_TITLES[k].toLowerCase() === postLower || k.toLowerCase() === postLower
      );
      positionValue = foundKey || dailyCandidate.candidatePost;
    }

    const resolvedDept = dailyCandidate.department || getDepartmentForPosition(positionValue);

    return res.status(200).json({
      success: true,
      found: true,
      message: 'Candidate verified from Daily Candidate Update! Existing details retrieved.',
      candidate: {
        _id: dailyCandidate._id,
        fullName: dailyCandidate.candidateName,
        email: dailyCandidate.email,
        mobileNumber: dailyCandidate.phoneNumber,
        driveLocation: dailyCandidate.branch || 'Ahmedabad',
        department: resolvedDept,
        positionAppliedFor: positionValue,
        candidatePost: dailyCandidate.candidatePost,
        candidateType: dailyCandidate.candidateType || dailyCandidate.experienceType || 'Fresher',
        totalExperience: dailyCandidate.totalExperience || dailyCandidate.experience || '',
        religion: dailyCandidate.religion || '',
        gender: dailyCandidate.gender || '',
        maritalStatus: dailyCandidate.maritalStatus || '',
        course: dailyCandidate.course || '',
        college: dailyCandidate.college || '',
        currentLocation: dailyCandidate.currentLocation || dailyCandidate.address || '',
        cvUrl: dailyCandidate.cvUrl || '',
        candidateCode: dailyCandidate.candidateCode || dailyCandidate.candidateReference || '',
        stage: dailyCandidate.stage,
        status: dailyCandidate.status,
      },
    });
  } catch (err) {
    return next(err);
  }
};

// 2. Candidate Registration
const registerCandidate = async (req, res, next) => {
  try {
    let {
      fullName,
      email,
      password,
      mobileNumber,
      religion,
      driveLocation = 'Ahmedabad',
      department = 'Technology',
      positionAppliedFor,
      candidateType = 'Fresher',
      course,
      college,
      totalExperience,
      currentLocation,
    } = req.body;

    if (!fullName || !email || !password || !mobileNumber || !positionAppliedFor) {
      return next(new AppError('Please fill in all required fields.', 400));
    }

    if (password.length < 10) {
      return next(new AppError('Password must be at least 10 characters long.', 400));
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Verify if candidate data already exists in Daily Candidate Update by matching BOTH mobile number AND email
    const dailyCandidate = await findMatchingDailyCandidate(normalizedEmail, mobileNumber);
    if (dailyCandidate) {
      logger.info(`Matched existing Daily Candidate for ${normalizedEmail} (ID: ${dailyCandidate._id})`);
      // Pull missing/complementary fields from Daily Candidate record
      if (!religion && dailyCandidate.religion) religion = dailyCandidate.religion;
      if (!course && dailyCandidate.course) course = dailyCandidate.course;
      if (!college && dailyCandidate.college) college = dailyCandidate.college;
      if (!totalExperience && (dailyCandidate.totalExperience || dailyCandidate.experience)) {
        totalExperience = dailyCandidate.totalExperience || dailyCandidate.experience;
      }
      if (!currentLocation && (dailyCandidate.currentLocation || dailyCandidate.address)) {
        currentLocation = dailyCandidate.currentLocation || dailyCandidate.address;
      }
      if (!candidateType && (dailyCandidate.candidateType || dailyCandidate.experienceType)) {
        candidateType = dailyCandidate.candidateType || dailyCandidate.experienceType;
      }
      if (!department && dailyCandidate.department) {
        department = dailyCandidate.department;
      }
      if (!driveLocation && dailyCandidate.branch) {
        driveLocation = dailyCandidate.branch;
      }
    }

    // Check if candidate already registered with this email in AssessmentCandidate
    let candidate = await AssessmentCandidate.findOne({ email: normalizedEmail });
    if (candidate) {
      if (dailyCandidate && !candidate.interviewId) {
        candidate.interviewId = dailyCandidate._id;
      }
      // Refresh OTP and dispatch email so candidate always receives their code
      const newOtp = generateSecureOtp();
      candidate.verificationOtp = newOtp;
      candidate.otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      if (fullName) candidate.fullName = fullName.trim();
      if (mobileNumber) candidate.mobileNumber = mobileNumber.trim();
      if (password && password.length >= 10) {
        const salt = await bcrypt.genSalt(10);
        candidate.password = await bcrypt.hash(password, salt);
      }
      await candidate.save();
      await syncCandidateToRecruitment(candidate);

      let emailSent = false;
      try {
        await sendSystemEmail({
          to: normalizedEmail,
          subject: `Your Vahlay Assessment Verification Code: ${newOtp}`,
          text: `Dear ${candidate.fullName},\n\nYour 6-digit email verification code is: ${newOtp}\n\nCandidate ID: ${candidate.candidateCode}\nThis code is valid for 15 minutes. Enter this code on the assessment portal to confirm your email address.\n\nBest regards,\nVahlay Consulting Recruitment Team`,
          html: getOtpEmailHtml(candidate.fullName, candidate.candidateCode, newOtp, candidate.driveLocation, candidate.positionAppliedFor),
        });
        emailSent = true;
      } catch (err) {
        logger.warn('SMTP verification email resend on re-registration failed: ' + err.message);
      }

      return res.status(200).json({
        success: true,
        message: emailSent
          ? 'A fresh verification code has been sent to your Gmail.'
          : 'Registration found. Enter the verification code sent to your Gmail.',
        data: {
          candidateCode: candidate.candidateCode,
          fullName: candidate.fullName,
          email: candidate.email,
          positionAppliedFor: candidate.positionAppliedFor,
          driveLocation: candidate.driveLocation,
          isEmailVerified: false,
          status: candidate.status,
          devOtp: process.env.NODE_ENV !== 'production' ? newOtp : undefined,
        },
      });
    }

    // Determine assessmentKey from mapping
    const mapping = assessmentData.assessmentForm?.step2_positionDetails?.positionToAssessmentKey || {};
    let assessmentKey = mapping[positionAppliedFor] || positionAppliedFor;
    if (!assessmentData.assessments[assessmentKey]) {
      const matchedKey = Object.keys(POSITION_TITLES).find(
        k => POSITION_TITLES[k].toLowerCase() === String(positionAppliedFor).trim().toLowerCase()
      );
      if (matchedKey) {
        assessmentKey = mapping[matchedKey] || matchedKey;
      }
    }
    const assessmentConfig = assessmentData.assessments[assessmentKey];

    if (!assessmentConfig) {
      return next(new AppError(`No assessment questionnaire found for role: ${positionAppliedFor}`, 400));
    }

    // Count total questions in this assessment as defined in JSON file
    const totalQuestions = assessmentConfig.totalQuestions || 30;

    // Generate unique code: WK-XXXXXXXXXXXX-2026 or reuse existing WK code from Daily Candidate
    const randomHex = crypto.randomBytes(6).toString('hex').toUpperCase();
    const candidateCode = (dailyCandidate && dailyCandidate.candidateCode && dailyCandidate.candidateCode.startsWith('WK-'))
      ? dailyCandidate.candidateCode
      : `WK-${randomHex}-2026`;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Uploaded CV URL if uploaded, or pull from Daily Candidate
    let cvUrl = '';
    if (req.file) {
      cvUrl = `/uploads/documents/${req.file.filename}`;
    } else if (dailyCandidate && dailyCandidate.cvUrl) {
      cvUrl = dailyCandidate.cvUrl;
    }

    // Generate 6-digit verification OTP
    const verificationOtp = generateSecureOtp();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const resolvedDepartment = (department && department !== 'All Departments')
      ? department.trim()
      : getDepartmentForPosition(positionAppliedFor);

    // Create Candidate Record
    candidate = new AssessmentCandidate({
      candidateCode,
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      mobileNumber: mobileNumber.trim(),
      religion: religion ? religion.trim() : '',
      driveLocation: driveLocation.trim(),
      department: resolvedDepartment,
      positionAppliedFor,
      assessmentKey,
      candidateType,
      course: course ? course.trim() : '',
      college: college ? college.trim() : '',
      totalExperience: totalExperience ? totalExperience.trim() : '',
      currentLocation: currentLocation ? currentLocation.trim() : '',
      cvUrl,
      isEmailVerified: false,
      verificationOtp,
      otpExpiresAt,
      status: 'Pending',
      totalQuestions,
      colorCategory: 'Pending',
      interviewId: dailyCandidate ? dailyCandidate._id : undefined,
    });
    await candidate.save();

    // If candidate was matched in Daily Candidate Update, update the existing record with assessment fields
    if (dailyCandidate) {
      dailyCandidate.candidateCode = candidateCode;
      dailyCandidate.candidateReference = candidateCode;
      dailyCandidate.assessmentKey = assessmentKey;
      dailyCandidate.stage = 'Assessment Update';
      dailyCandidate.status = 'Pending';
      dailyCandidate.colorCategory = 'Pending';
      dailyCandidate.totalQuestions = totalQuestions;
      dailyCandidate.score = 0;
      dailyCandidate.percentage = 0;
      dailyCandidate.interviewScore = 'Pending';
      dailyCandidate.assessmentScore = 'Pending';
      dailyCandidate.tabSwitchCount = 0;
      if (cvUrl) dailyCandidate.cvUrl = cvUrl;

      const currentNotes = (dailyCandidate.stageNotes && typeof dailyCandidate.stageNotes === 'object')
        ? { ...dailyCandidate.stageNotes }
        : {};
      currentNotes.daily = currentNotes.daily || dailyCandidate.comments || '';
      currentNotes.assessment = `Registered for Assessment Desk. Data verified & pulled from Daily Candidate Update on ${new Date().toLocaleDateString()}. Candidate Code: ${candidateCode}.`;
      dailyCandidate.stageNotes = currentNotes;
      dailyCandidate.comments = `[Assessment Linked] Verified and matched via Mobile (${mobileNumber}) & Email (${normalizedEmail}). Pulled data from Daily Candidate Update. Candidate Code: ${candidateCode}.`;
      dailyCandidate.remarks = dailyCandidate.comments;

      await dailyCandidate.save();
    }

    await syncCandidateToRecruitment(candidate);

    // Send confirmation email via SMTP
    let emailSent = false;
    try {
      await sendSystemEmail({
        to: normalizedEmail,
        subject: `Your Vahlay Assessment Verification Code: ${verificationOtp}`,
        text: `Dear ${fullName},\n\nThank you for registering for the Vahlay Consulting recruitment drive (${driveLocation}).\n\nYour Candidate ID is: ${candidateCode}\nYour 6-digit email verification code is: ${verificationOtp}\n\nThis verification code is valid for 15 minutes. Enter this code on the assessment portal to confirm your email address.\n\nBest regards,\nVahlay Consulting Recruitment Team`,
        html: getOtpEmailHtml(fullName, candidateCode, verificationOtp, driveLocation, positionAppliedFor),
      });
      emailSent = true;
    } catch (mailErr) {
      logger.warn('Assessment SMTP verification email delivery failed: ' + mailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: emailSent
        ? 'Registration complete. Verification code sent to your Gmail.'
        : 'Registration recorded. Please enter verification code to verify Gmail.',
      data: {
        candidateCode: candidate.candidateCode,
        fullName: candidate.fullName,
        email: candidate.email,
        positionAppliedFor: candidate.positionAppliedFor,
        driveLocation: candidate.driveLocation,
        isEmailVerified: false,
        status: candidate.status,
        devOtp: process.env.NODE_ENV !== 'production' ? verificationOtp : undefined,
      },
    });
  } catch (err) {
    return next(err);
  }
};

// 3. Confirm / Verify Gmail via OTP (Assessment Stage 2)
const verifyEmail = async (req, res, next) => {
  try {
    const { candidateCode, email, otp } = req.body;
    const cleanCode = candidateCode ? String(candidateCode).trim().toUpperCase() : '';
    const cleanEmail = email ? String(email).trim().toLowerCase() : '';

    if (!cleanCode && !cleanEmail) {
      return next(new AppError('Please provide your Candidate ID or registered email address.', 400));
    }
    if (!otp) {
      return next(new AppError('Please provide the 6-digit verification code.', 400));
    }

    const query = cleanCode ? { candidateCode: cleanCode } : { email: cleanEmail };
    const candidate = await AssessmentCandidate.findOne(query);
    if (!candidate) {
      return next(new AppError('Candidate registration record not found. Please register first.', 404));
    }

    if (candidate.isEmailVerified) {
      return res.status(200).json({
        success: true,
        message: 'Gmail is already verified.',
        data: {
          candidateCode: candidate.candidateCode,
          fullName: candidate.fullName,
          email: candidate.email,
          positionAppliedFor: candidate.positionAppliedFor,
          driveLocation: candidate.driveLocation,
          isEmailVerified: true,
        },
      });
    }

    if (candidate.verificationOtp !== String(otp).trim()) {
      return next(new AppError('Invalid verification code. Please check and try again.', 400));
    }

    if (candidate.otpExpiresAt && new Date() > new Date(candidate.otpExpiresAt)) {
      return next(new AppError('Verification code has expired. Please request a new code.', 400));
    }

    candidate.isEmailVerified = true;
    candidate.verificationOtp = '';
    candidate.otpExpiresAt = null;
    await candidate.save();

    // Update linked ERP Interview record
    if (candidate.interviewId) {
      await Interview.findByIdAndUpdate(candidate.interviewId, {
        comments: `Gmail Verified. Candidate Code: ${candidate.candidateCode}. Drive: ${candidate.driveLocation}.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Gmail verified successfully.',
      data: {
        candidateCode: candidate.candidateCode,
        fullName: candidate.fullName,
        email: candidate.email,
        positionAppliedFor: candidate.positionAppliedFor,
        driveLocation: candidate.driveLocation,
        isEmailVerified: true,
      },
    });
  } catch (err) {
    return next(err);
  }
};

// 4. Resend Verification OTP via SMTP
const resendVerificationOtp = async (req, res, next) => {
  try {
    const { candidateCode, email } = req.body;
    const cleanCode = candidateCode ? String(candidateCode).trim().toUpperCase() : '';
    const cleanEmail = email ? String(email).trim().toLowerCase() : '';

    if (!cleanCode && !cleanEmail) {
      return next(new AppError('Please provide your Candidate ID or registered email address to resend verification code.', 400));
    }

    const query = cleanCode ? { candidateCode: cleanCode } : { email: cleanEmail };
    const candidate = await AssessmentCandidate.findOne(query);
    if (!candidate) {
      return next(new AppError(`No candidate registration record found for ${cleanCode || cleanEmail}. Please complete registration first.`, 404));
    }

    const verificationOtp = generateSecureOtp();
    candidate.verificationOtp = verificationOtp;
    candidate.otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await candidate.save();

    let emailSent = false;
    try {
      await sendSystemEmail({
        to: candidate.email,
        subject: `Your Vahlay Assessment Verification Code: ${verificationOtp}`,
        text: `Dear ${candidate.fullName},\n\nYour new 6-digit email verification code is: ${verificationOtp}\n\nCandidate ID: ${candidate.candidateCode}\nThis verification code is valid for 15 minutes. Enter this code on the assessment portal to confirm your email address.\n\nBest regards,\nVahlay Consulting Recruitment Team`,
        html: getOtpEmailHtml(candidate.fullName, candidate.candidateCode, verificationOtp, candidate.driveLocation, candidate.positionAppliedFor),
      });
      emailSent = true;
    } catch (mailErr) {
      logger.warn('Assessment SMTP verification email resend failed: ' + mailErr.message);
    }

    return res.status(200).json({
      success: true,
      message: emailSent
        ? 'A new verification code has been sent to your Gmail address.'
        : 'New verification code generated.',
      data: {
        devOtp: process.env.NODE_ENV !== 'production' ? verificationOtp : undefined,
      },
    });
  } catch (err) {
    return next(err);
  }
};

// 5. Desk Sign-In with Gmail & Password
const loginCandidate = async (req, res, next) => {
  try {
    const { email, password, smtpCode, accessCode } = req.body;
    const credential = String(password || smtpCode || accessCode || '').trim();

    if (!email || !credential) {
      return next(new AppError('Please provide both your Gmail address and password.', 400));
    }

    const candidate = await AssessmentCandidate.findOne({ email: String(email).trim().toLowerCase() });
    if (!candidate) {
      return next(new AppError('No candidate registration found with this email.', 404));
    }

    const isPasswordMatch = await bcrypt.compare(credential, candidate.password).catch(() => false);
    const isOtpMatch = Boolean(candidate.verificationOtp && candidate.verificationOtp === credential);

    if (!isPasswordMatch && !isOtpMatch) {
      return next(new AppError('Invalid credentials. Please verify your password.', 401));
    }

    if (!candidate.isEmailVerified) {
      if (isOtpMatch) {
        candidate.isEmailVerified = true;
        candidate.verificationOtp = null;
        candidate.otpExpiresAt = null;
        await candidate.save();
      } else {
        return res.status(403).json({
          success: false,
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Please verify your Gmail address before signing in.',
          data: {
            candidateCode: candidate.candidateCode,
            email: candidate.email,
          },
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      data: {
        candidateCode: candidate.candidateCode,
        fullName: candidate.fullName,
        email: candidate.email,
        positionAppliedFor: candidate.positionAppliedFor,
        status: candidate.status,
        driveLocation: candidate.driveLocation,
      },
    });
  } catch (err) {
    return next(err);
  }
};

// 4. Get Candidate Assessment Details & Rules (Intro screen)
const getAssessmentIntro = async (req, res, next) => {
  try {
    const { candidateCode } = req.params;
    const candidate = await AssessmentCandidate.findOne({ candidateCode: candidateCode.toUpperCase() });
    if (!candidate) {
      return next(new AppError('Invalid candidate code.', 404));
    }

    const assessmentConfig = assessmentData.assessments[candidate.assessmentKey] || {};

    return res.status(200).json({
      success: true,
      data: {
        candidateCode: candidate.candidateCode,
        fullName: candidate.fullName,
        email: candidate.email,
        positionAppliedFor: candidate.positionAppliedFor,
        driveLocation: candidate.driveLocation,
        status: candidate.status,
        assessmentTitle: assessmentConfig.assessmentTitle || 'Technical & Aptitude Assessment',
        totalQuestions: candidate.totalQuestions || assessmentConfig.totalQuestions || 30,
        timeMinutes: assessmentConfig.timeMinutes || 50,
        rules: [
          'The timer starts when you select Begin assessment.',
          'Your answers and current question are restored after a refresh.',
          'Multiple-choice answers are locked after Save & Next.',
          'The assessment submits automatically when time expires.',
          'Warning: switching tabs 3 times automatically submits the assessment.',
        ],
      },
    });
  } catch (err) {
    return next(err);
  }
};

// 5. Start Assessment / Get Examination Questions
const startOrGetExam = async (req, res, next) => {
  try {
    const { candidateCode } = req.params;
    const candidate = await AssessmentCandidate.findOne({ candidateCode: candidateCode.toUpperCase() });
    if (!candidate) {
      return next(new AppError('Invalid candidate code.', 404));
    }

    const assessmentConfig = assessmentData.assessments[candidate.assessmentKey];
    if (!assessmentConfig) {
      return next(new AppError('Assessment questionnaire not configured.', 404));
    }

    // If candidate status is Pending, move to Running and record startedAt
    if (candidate.status === 'Pending') {
      candidate.status = 'Running';
      candidate.startedAt = new Date();
      await candidate.save();
    }
    await syncCandidateToRecruitment(candidate);

    // Build question list up to totalQuestions defined in JSON file
    const targetCount = assessmentConfig.totalQuestions || 30;
    const flatQuestions = [];
    if (Array.isArray(assessmentConfig.sections)) {
      assessmentConfig.sections.forEach(sec => {
        const secTitle = sec.section || sec.sectionTitle || 'General';
        if (Array.isArray(sec.questions)) {
          sec.questions.forEach(q => {
            if (q.questionNumber <= targetCount) {
              flatQuestions.push({
                questionNumber: q.questionNumber,
                section: secTitle,
                question: q.question,
                options: q.options,
              });
            }
          });
        }
      });
    }

    // Sort questions by questionNumber
    flatQuestions.sort((a, b) => a.questionNumber - b.questionNumber);

    // Calculate remaining seconds
    const totalDurationSeconds = (assessmentConfig.timeMinutes || 50) * 60;
    let remainingSeconds = totalDurationSeconds;
    if (candidate.startedAt) {
      const elapsedSeconds = Math.floor((Date.now() - new Date(candidate.startedAt).getTime()) / 1000);
      remainingSeconds = Math.max(0, totalDurationSeconds - elapsedSeconds);
    }

    // Convert candidate answers map to plain object
    const savedAnswers = {};
    if (candidate.answers) {
      for (const [key, value] of candidate.answers.entries()) {
        savedAnswers[key] = value;
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        candidateCode: candidate.candidateCode,
        fullName: candidate.fullName,
        assessmentTitle: assessmentConfig.assessmentTitle || 'Assessment',
        totalQuestions: flatQuestions.length,
        timeMinutes: assessmentConfig.timeMinutes || 50,
        remainingSeconds,
        tabSwitchCount: candidate.tabSwitchCount || 0,
        status: candidate.status,
        savedAnswers,
        questions: flatQuestions,
      },
    });
  } catch (err) {
    return next(err);
  }
};

// 6. Save Answer to individual question
const saveAnswer = async (req, res, next) => {
  try {
    const { candidateCode } = req.params;
    const qNum = req.body.questionNumber ?? req.body.questionId;
    const selOpt = req.body.selectedOption ?? req.body.option;

    if (qNum === undefined || qNum === null || !selOpt) {
      return next(new AppError('Missing questionNumber or selectedOption', 400));
    }

    const candidate = await AssessmentCandidate.findOne({ candidateCode: candidateCode.toUpperCase() });
    if (!candidate) {
      return next(new AppError('Candidate not found', 404));
    }

    if (candidate.status === 'Completed') {
      return next(new AppError('Assessment is already completed and answers cannot be modified.', 400));
    }

    if (!candidate.answers) {
      candidate.answers = new Map();
    }
    candidate.answers.set(String(qNum), String(selOpt).toUpperCase());
    await candidate.save();

    return res.status(200).json({
      success: true,
      message: 'Answer saved.',
      answeredCount: candidate.answers.size,
    });
  } catch (err) {
    return next(err);
  }
};

// 7. Record Tab Switch (Anti-cheat)
const recordTabSwitch = async (req, res, next) => {
  try {
    const { candidateCode } = req.params;
    const candidate = await AssessmentCandidate.findOne({ candidateCode: candidateCode.toUpperCase() });
    if (!candidate) {
      return next(new AppError('Candidate not found', 404));
    }

    if (candidate.status === 'Completed') {
      return res.status(200).json({
        success: true,
        tabSwitchCount: candidate.tabSwitchCount,
        autoSubmitted: true,
      });
    }

    candidate.tabSwitchCount = (candidate.tabSwitchCount || 0) + 1;
    let autoSubmitted = false;
    await candidate.save();
    await syncCandidateToRecruitment(candidate);

    if (candidate.tabSwitchCount >= 3) {
      autoSubmitted = true;
      // Auto submit assessment
      return await performSubmission(candidate, res, next);
    }

    await candidate.save();
    return res.status(200).json({
      success: true,
      tabSwitchCount: candidate.tabSwitchCount,
      autoSubmitted: false,
    });
  } catch (err) {
    return next(err);
  }
};

// Helper: Perform evaluation & submit
const performSubmission = async (candidate, res, next) => {
  try {
    const assessmentConfig = assessmentData.assessments[candidate.assessmentKey];
    if (!assessmentConfig) {
      return next(new AppError('Assessment config not found for grading', 500));
    }

    // Build answer key according to totalQuestions defined in JSON file
    const targetCount = assessmentConfig.totalQuestions || 30;
    const answerKey = {};
    if (Array.isArray(assessmentConfig.sections)) {
      assessmentConfig.sections.forEach(sec => {
        if (Array.isArray(sec.questions)) {
          sec.questions.forEach(q => {
            if (q.questionNumber <= targetCount) {
              answerKey[String(q.questionNumber)] = String(q.correctAnswer).trim().toUpperCase();
            }
          });
        }
      });
    }

    // Calculate score
    let score = 0;
    if (candidate.answers) {
      for (const [qNum, selOpt] of candidate.answers.entries()) {
        const correct = answerKey[String(qNum)];
        if (correct && String(selOpt).trim().toUpperCase() === correct) {
          score += 1;
        }
      }
    }

    const percentage = Math.round((score / targetCount) * 100);

    let colorCategory = 'Red';
    if (percentage >= 75) {
      colorCategory = 'Green';
    } else if (percentage >= 50) {
      colorCategory = 'Yellow';
    }

    candidate.score = score;
    candidate.totalQuestions = targetCount;
    candidate.percentage = percentage;
    candidate.colorCategory = colorCategory;
    candidate.status = 'Completed';
    candidate.completedAt = new Date();
    await candidate.save();

    // Reliably sync to Recruitment Management
    await syncCandidateToRecruitment(candidate);

    return res.status(200).json({
      success: true,
      message: 'Assessment submitted successfully.',
      data: {
        candidateCode: candidate.candidateCode,
        fullName: candidate.fullName,
        score,
        totalQuestions: targetCount,
        percentage,
        colorCategory,
        tabSwitchCount: candidate.tabSwitchCount,
        status: candidate.status,
      },
    });
  } catch (err) {
    return next(err);
  }
};

// 8. Submit Assessment Endpoint
const submitAssessment = async (req, res, next) => {
  try {
    const { candidateCode } = req.params;
    const { answers } = req.body;

    const candidate = await AssessmentCandidate.findOne({ candidateCode: candidateCode.toUpperCase() });
    if (!candidate) {
      return next(new AppError('Candidate not found', 404));
    }

    // Merge any final answers received in body
    if (answers && typeof answers === 'object') {
      if (!candidate.answers) candidate.answers = new Map();
      Object.entries(answers).forEach(([k, v]) => {
        if (v) candidate.answers.set(String(k), String(v).toUpperCase());
      });
    }

    if (candidate.status === 'Completed') {
      return res.status(200).json({
        success: true,
        message: 'Assessment was already submitted.',
        data: {
          candidateCode: candidate.candidateCode,
          fullName: candidate.fullName,
          score: candidate.score,
          totalQuestions: candidate.totalQuestions,
          percentage: candidate.percentage,
          colorCategory: candidate.colorCategory,
          tabSwitchCount: candidate.tabSwitchCount,
          status: candidate.status,
        },
      });
    }

    return await performSubmission(candidate, res, next);
  } catch (err) {
    return next(err);
  }
};

// 9. Get Assessment Result
const getAssessmentResult = async (req, res, next) => {
  try {
    const { candidateCode } = req.params;
    const candidate = await AssessmentCandidate.findOne({ candidateCode: candidateCode.toUpperCase() });
    if (!candidate) {
      return next(new AppError('Candidate not found', 404));
    }

    return res.status(200).json({
      success: true,
      data: {
        candidateCode: candidate.candidateCode,
        fullName: candidate.fullName,
        positionAppliedFor: candidate.positionAppliedFor,
        driveLocation: candidate.driveLocation,
        score: candidate.score,
        totalQuestions: candidate.totalQuestions,
        percentage: candidate.percentage,
        colorCategory: candidate.colorCategory,
        status: candidate.status,
        completedAt: candidate.completedAt,
      },
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getMetadata,
  registerCandidate,
  verifyEmail,
  resendVerificationOtp,
  loginCandidate,
  getAssessmentIntro,
  startOrGetExam,
  saveAnswer,
  recordTabSwitch,
  submitAssessment,
  getAssessmentResult,
  syncCandidateToRecruitment,
  lookupDailyCandidate,
  findMatchingDailyCandidate,
};
