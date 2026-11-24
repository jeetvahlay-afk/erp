const env = require('../config/env');
const { sendSystemEmail } = require('./mailService');
const logger = require('../utils/logger');

/**
 * Builds standard header for Vahlay Consulting branded emails
 */
const getBrandEmailHeader = (headline, badgeText = 'Official Notification') => `
  <tr>
    <td style="background-color: #0f172a; padding: 28px 32px; text-align: center; border-radius: 12px 12px 0 0;">
      <div style="display: inline-block; padding: 4px 12px; background: rgba(220, 38, 38, 0.2); border: 1px solid #dc2626; border-radius: 20px; color: #f87171; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">
        ${badgeText}
      </div>
      <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; margin: 0 0 4px 0; text-transform: uppercase;">
        VAHLAY CONSULTING INC.
      </h1>
      <p style="color: #94a3b8; font-size: 12px; margin: 0; font-weight: 500; letter-spacing: 0.5px;">
        ${headline || 'Human Resources & Corporate Governance'}
      </p>
    </td>
  </tr>
`;

/**
 * Builds standard footer for Vahlay Consulting emails
 */
const getBrandEmailFooter = () => `
  <tr>
    <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px; text-align: center;">
      <p style="color: #64748b; font-size: 11px; margin: 0 0 6px 0; line-height: 1.5;">
        <strong>Vahlay Consulting Inc.</strong> · Human Resources & Compliance Directorate
      </p>
      <p style="color: #94a3b8; font-size: 10px; margin: 0; line-height: 1.4;">
        This automated notification is transmitted in confidence for the named recipient only.<br/>
        If you received this in error, please contact HR immediately at compliance@vahlayconsulting.com.
      </p>
    </td>
  </tr>
`;

/**
 * SEND WAY: Dispatches an official agreement notification to candidate/employee via SMTP
 */
const sendAgreementDispatchEmail = async ({ agreement, signingUrl }) => {
  const recipientEmail = String(agreement?.candidateEmail || '').trim().toLowerCase();
  if (!recipientEmail || !recipientEmail.includes('@')) {
    logger.warn('Skipping agreement dispatch email: no valid recipient email provided', {
      agreementId: agreement?._id,
      recipientEmail,
    });
    return { ok: false, error: 'Recipient email is missing or invalid' };
  }

  const candidateName = agreement.candidateName || 'Valued Colleague';
  const docTitle = agreement.documentTitle || agreement.templateName || 'Official Employment Agreement';
  const jobTitle = agreement.jobTitle || 'Associate';
  const department = agreement.department || 'Operations';
  const officeLocation = agreement.officeLocation || 'Ahmedabad';
  const targetUrl = signingUrl || `${env.appBaseUrl}/candidate-agreement/${agreement._id}`;

  const subject = `Action Required: Please Review & Sign Your ${docTitle} — Vahlay Consulting`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          ${getBrandEmailHeader('Official Document Execution Portal', 'Signature Required')}
          
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h2 style="color: #0f172a; font-size: 18px; font-weight: 700; margin: 0 0 16px 0;">
                Dear ${candidateName},
              </h2>
              
              <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                Human Resources has issued your official <strong>${docTitle}</strong> for review and digital signature.
                Please examine the terms, policies, and compensation details through our secure digital signing portal.
              </p>

              <!-- Document Parameters Summary Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px;">
                      <tr>
                        <td style="padding: 6px 0; color: #64748b; width: 140px; font-weight: 500;">Document:</td>
                        <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${docTitle}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Recipient:</td>
                        <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${candidateName} (${recipientEmail})</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Role / Post:</td>
                        <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${jobTitle}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Department:</td>
                        <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${department}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Branch Office:</td>
                        <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${officeLocation} Office</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action Call to Action Button -->
              <div style="text-align: center; margin: 28px 0 24px 0;">
                <a href="${targetUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);">
                  👉 Review &amp; Digitally Sign Document
                </a>
              </div>

              <!-- Direct Link Box -->
              <div style="background-color: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 12px; margin: 20px 0 20px 0;">
                <p style="color: #64748b; font-size: 11px; margin: 0 0 6px 0; font-weight: 600;">
                  If the button does not open directly, copy and paste this link in your browser:
                </p>
                <p style="color: #0284c7; font-size: 11px; margin: 0; word-break: break-all; font-family: monospace;">
                  ${targetUrl}
                </p>
              </div>

              <!-- Security Notice -->
              <div style="border-left: 3px solid #dc2626; padding-left: 12px; margin-top: 24px;">
                <p style="color: #64748b; font-size: 11px; margin: 0; line-height: 1.5;">
                  <strong>Digital Signature Compliance:</strong> This document is protected by digital audit logging.
                  Once signed, your digital signature, timestamp, and IP address will be legally bound to this record.
                </p>
              </div>
            </td>
          </tr>

          ${getBrandEmailFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const text = `
VAHLAY CONSULTING INC. — OFFICIAL CANDIDATE NOTIFICATION
Action Required: Please Review & Sign Your ${docTitle}

Dear ${candidateName},

Human Resources has issued your official ${docTitle} for review and digital signature.

DOCUMENT DETAILS:
- Document: ${docTitle}
- Recipient: ${candidateName} (${recipientEmail})
- Role: ${jobTitle}
- Department: ${department}
- Office: ${officeLocation} Office

Please click the secure link below to review and complete your digital signature:
${targetUrl}

This document is protected by digital audit logging.
Vahlay Consulting Inc. · Human Resources & Corporate Governance
`;

  try {
    const result = await sendSystemEmail({
      to: recipientEmail,
      subject,
      text,
      html,
    });
    logger.info(`Agreement dispatch email sent via SMTP to ${recipientEmail}`, {
      messageId: result.messageId,
      agreementId: agreement._id,
    });
    return { ok: true, messageId: result.messageId };
  } catch (err) {
    logger.error(`Failed to send agreement dispatch email to ${recipientEmail}`, {
      error: err.message,
      agreementId: agreement._id,
    });
    return { ok: false, error: err.message || 'SMTP delivery failed' };
  }
};

/**
 * RECEIVE WAY (Part 1): Sends execution confirmation copy to the recipient
 */
const sendAgreementSignedConfirmationToRecipient = async ({ agreement }) => {
  const recipientEmail = String(agreement?.candidateEmail || '').trim().toLowerCase();
  if (!recipientEmail || !recipientEmail.includes('@')) return { ok: false };

  const candidateName = agreement.candidateName || 'Valued Colleague';
  const docTitle = agreement.documentTitle || agreement.templateName || 'Official Employment Agreement';
  const targetUrl = `${env.appBaseUrl}/candidate-agreement/${agreement._id}`;
  const signedDateStr = new Date(agreement.signedAt || Date.now()).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const subject = `Executed Copy: Your ${docTitle} has been Digitally Signed — Vahlay Consulting`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          ${getBrandEmailHeader('Executed Document Confirmation', 'Verified & Signed ✓')}
          
          <tr>
            <td style="padding: 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 50%; background-color: #dcfce7; color: #16a34a; font-size: 24px; font-weight: bold;">
                  ✓
                </div>
                <h2 style="color: #0f172a; font-size: 18px; font-weight: 700; margin: 12px 0 4px 0;">
                  Agreement Successfully Executed!
                </h2>
                <p style="color: #16a34a; font-size: 13px; font-weight: 600; margin: 0;">
                  Your digital signature has been verified and permanently bound.
                </p>
              </div>

              <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear ${candidateName},<br/><br/>
                Thank you for completing the signing process for your <strong>${docTitle}</strong>.
                An executed copy has been logged with Vahlay Consulting Human Resources and safely archived in the corporate vault.
              </p>

              <!-- Audit Summary -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 0 0 24px 0; font-size: 13px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 5px 0; color: #64748b; width: 140px;">Document:</td>
                        <td style="padding: 5px 0; color: #0f172a; font-weight: 700;">${docTitle}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; color: #64748b;">Signer Name:</td>
                        <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">${candidateName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; color: #64748b;">Signed Timestamp:</td>
                        <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">${signedDateStr}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; color: #64748b;">Verified IP:</td>
                        <td style="padding: 5px 0; color: #0f172a; font-family: monospace;">${agreement.signedIp || 'Recorded'}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <div style="text-align: center; margin: 24px 0;">
                <a href="${targetUrl}" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 13px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px;">
                  View Executed Document Online
                </a>
              </div>
            </td>
          </tr>

          ${getBrandEmailFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  try {
    const result = await sendSystemEmail({
      to: recipientEmail,
      subject,
      text: `Dear ${candidateName},\n\nYour ${docTitle} has been successfully executed on ${signedDateStr}.\nView executed document: ${targetUrl}`,
      html,
    });
    return { ok: true, messageId: result.messageId };
  } catch (err) {
    logger.warn(`Could not deliver signed confirmation to recipient ${recipientEmail}: ${err.message}`);
    return { ok: false, error: err.message };
  }
};

/**
 * RECEIVE WAY (Part 2): Sends execution alert email to HR / Admin mailbox
 */
const sendAgreementSignedAlertToHR = async ({ agreement }) => {
  const adminEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'jeet.vahlay@gmail.com';
  const candidateName = agreement.candidateName || 'Candidate';
  const docTitle = agreement.documentTitle || agreement.templateName || 'Agreement';
  const office = agreement.officeLocation || 'Ahmedabad';
  const signedDateStr = new Date(agreement.signedAt || Date.now()).toLocaleString('en-US');
  const erpVaultUrl = `${env.appBaseUrl}/manage-interviews?section=agreements&tab=vault`;

  const subject = `[Agreement Executed] ${candidateName} has Signed ${docTitle} (${office} Office)`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          ${getBrandEmailHeader('TeamHub ERP Administration Alert', 'Agreement Executed')}
          
          <tr>
            <td style="padding: 32px;">
              <h2 style="color: #0f172a; font-size: 17px; font-weight: 700; margin: 0 0 16px 0;">
                Candidate Digital Agreement Signed
              </h2>
              
              <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                The recipient <strong>${candidateName}</strong> has completed the online review and signed their <strong>${docTitle}</strong>.
              </p>

              <!-- Audit Details -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 0 0 24px 0; font-size: 13px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 5px 0; color: #64748b; width: 140px;">Signer:</td>
                        <td style="padding: 5px 0; color: #0f172a; font-weight: 700;">${candidateName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; color: #64748b;">Email Address:</td>
                        <td style="padding: 5px 0; color: #0f172a;">${agreement.candidateEmail || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; color: #64748b;">Role &amp; Branch:</td>
                        <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">${agreement.jobTitle || 'Associate'} · ${office} Office</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; color: #64748b;">Document:</td>
                        <td style="padding: 5px 0; color: #2563eb; font-weight: 700;">${docTitle} (${agreement.templateId})</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; color: #64748b;">Signed At:</td>
                        <td style="padding: 5px 0; color: #0f172a;">${signedDateStr}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; color: #64748b;">IP Address:</td>
                        <td style="padding: 5px 0; color: #0f172a; font-family: monospace;">${agreement.signedIp || 'Logged'}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <div style="text-align: center; margin: 24px 0;">
                <a href="${erpVaultUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 13px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px;">
                  Open Signed Vault in TeamHub ERP
                </a>
              </div>
            </td>
          </tr>

          ${getBrandEmailFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  try {
    const result = await sendSystemEmail({
      to: adminEmail,
      subject,
      text: `[Agreement Executed]\n\nRecipient: ${candidateName} (${agreement.candidateEmail})\nDocument: ${docTitle}\nBranch: ${office}\nSigned At: ${signedDateStr}\n\nReview in TeamHub ERP: ${erpVaultUrl}`,
      html,
    });
    return { ok: true, messageId: result.messageId };
  } catch (err) {
    logger.warn(`Could not deliver signed alert to HR mailbox ${adminEmail}: ${err.message}`);
    return { ok: false, error: err.message };
  }
};

module.exports = {
  sendAgreementDispatchEmail,
  sendAgreementSignedConfirmationToRecipient,
  sendAgreementSignedAlertToHR,
};
