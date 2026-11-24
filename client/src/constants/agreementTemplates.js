/**
 * Agreement & Policy Module Template Registry
 * Canonical definitions from legacy system with full dynamic placeholders
 */

export const DOC_TYPES = [
  { key: "offer", label: "Official Employment Offer Letter", shortLabel: "Offer Letter", category: "onboarding" },
  { key: "appointment", label: "Formal Employment Appointment Letter", shortLabel: "Appointment Letter", category: "onboarding" },
  { key: "policy", label: "Training & Company Policy", shortLabel: "Policy & Undertaking", category: "onboarding" },
  { key: "assessment", label: "Training Completion Assessment", shortLabel: "Assessment & Approval", category: "onboarding" },
  { key: "salary", label: "Salary, Target & Responsibilities", shortLabel: "Salary & Targets", category: "onboarding" },
  { key: "revision", label: "Salary & Role Revision Letter", shortLabel: "Revision Letter", category: "onboarding" },
  { key: "nda", label: "Non-Disclosure Agreement (NDA)", shortLabel: "NDA Agreement", category: "compliance", isCompliance: true },
  { key: "relieving", label: "Formal Resignation Acceptance & Relieving Letter", shortLabel: "Resignation & Relieving", category: "compliance", isCompliance: true },
  { key: "fnf", label: "Full & Final Settlement (FNF)", shortLabel: "FNF Settlement", category: "compliance", isCompliance: true },
  {
    key: "acknowledgement",
    label: "Final Candidate Acknowledgement of Receiving All Documents",
    shortLabel: "Doc Receipt Undertaking",
    category: "compliance",
    isCompliance: true,
    isAcknowledgement: true,
  },
];

export const DEFAULT_TEMPLATES = {
  offer: `<p><strong>FORMAL JOB OFFER LETTER</strong></p>
<p><em>[Official Corporate Talent Acquisition - {{companyName}}]</em></p>
<table style="width: 100%; border-collapse: collapse; margin: 12px 0; border: 1px solid #cbd5e1;">
  <tbody>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Offer Date:</strong> {{agreementDate}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Reference No:</strong> VC/OFR/2026</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Location:</strong> {{officeLocation}} Office</td>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Candidate Name:</strong> {{candidateName}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Proposed Designation:</strong> {{jobTitle}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Department:</strong> {{department}}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Proposed Joining Date:</strong> {{joiningDate}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Candidate Email:</strong> {{candidateEmail}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Offer Validity:</strong> {{offerExpiryDate}}</td>
    </tr>
  </tbody>
</table>
<p>Dear <strong>{{candidateName}}</strong>,</p>
<p>Following your successful performance in our recruitment and interview process, we are delighted to extend this formal offer of employment to you for the position of <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong>.</p>
<p><strong>1. POSITION &amp; COMMENCEMENT</strong><br>
Your formal appointment shall commence on <strong>{{joiningDate}}</strong>. You will be reporting to <strong>{{managerName}}</strong> and stationed at our <strong>{{officeLocation}}</strong> office facility. Your working hours shall adhere to the official business shift schedule established by management.</p>
<p><strong>2. COMPENSATION &amp; REMUNERATION</strong><br>
Your compensation package is structured as follows:<br>
- <strong>Fixed Base Gross Salary:</strong> ₹{{baseSalary}} per month<br>
- <strong>Performance &amp; Attendance Incentive:</strong> Up to ₹{{performanceIncentive}} per month<br>
- <strong>Total Annual Cost to Company (CTC):</strong> ₹{{fullPackage}} per annum<br>
Detailed breakdown and statutory deductions (TDS, PT, PF if applicable) will be administered per governing regulations.</p>
<p><strong>3. PROBATION &amp; CODE OF CONDUCT</strong><br>
You will undergo an initial probationary assessment period of three (3) months. Confirmation is subject to satisfactory performance and ethics. You will also execute our Corporate Non-Disclosure Agreement (NDA).</p>
<p>Please review and sign this offer letter prior to the offer validity date of <strong>{{offerExpiryDate}}</strong> to formally accept this employment offer.</p>
<p>Sincerely,<br>
<strong>{{managerName}}</strong><br>
Head of Human Resources &amp; Corporate Talent Acquisition<br>
<strong>{{companyName}}</strong></p>
<div style="margin: 16px 0; padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
  <p style="margin: 0 0 8px 0; font-weight: bold; color: #1e293b;">Candidate Declaration &amp; Acceptance:</p>
  <p style="margin: 0 0 10px 0; font-size: 13px; color: #475569;">I, {{candidateName}}, hereby confirm that I have reviewed, understood, and accept all terms, compensation, and conditions outlined in this offer letter.</p>
  <p style="margin: 0; font-weight: bold; color: #b91c1c;">Agreement: Yes / No</p>
</div>`,

  appointment: `<p><strong>FORMAL EMPLOYMENT APPOINTMENT LETTER</strong></p>
<p><em>[Directorate of Human Resources &amp; Corporate Operations - {{companyName}}]</em></p>
<table style="width: 100%; border-collapse: collapse; margin: 12px 0; border: 1px solid #cbd5e1;">
  <tbody>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Appointment Date:</strong> {{agreementDate}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Reference No:</strong> VC/APPT/2026</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Office Location:</strong> {{officeLocation}} Office</td>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Employee Name:</strong> {{candidateName}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Official Designation:</strong> {{jobTitle}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Department:</strong> {{department}}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Effective Joining Date:</strong> {{joiningDate}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Employee Email:</strong> {{candidateEmail}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Reporting Authority:</strong> {{managerName}}</td>
    </tr>
  </tbody>
</table>
<p>Dear <strong>{{candidateName}}</strong>,</p>
<p>Following the successful acceptance of our offer letter and completion of onboarding formalities, the management of <strong>{{companyName}}</strong> is pleased to formally appoint you to the position of <strong>{{jobTitle}}</strong> in the <strong>{{department}}</strong> Department, effective from <strong>{{joiningDate}}</strong>.</p>
<p><strong>1. DUTIES &amp; RESPONSIBILITIES</strong><br>
You will perform all assignments assigned by {{managerName}} and leadership with professional diligence and integrity.</p>
<p><strong>2. REMUNERATION</strong><br>
Your total annual CTC is ₹{{fullPackage}} per annum (Gross ₹{{baseSalary}} per month). Payouts occur between the 7th and 10th of every month.</p>
<p><strong>3. CODE OF CONDUCT &amp; TERMINATION NOTICE</strong><br>
You shall strictly abide by all organizational policies, security rules, and non-disclosure obligations. Notice period post probation is 30 calendar days.</p>
<p>Authorized Signatory:<br>
<strong>{{managerName}}</strong><br>
Director of Talent Operations &amp; Strategy<br>
<strong>{{companyName}}</strong></p>
<div style="margin: 16px 0; padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
  <p style="margin: 0 0 8px 0; font-weight: bold; color: #1e293b;">Employee Acceptance:</p>
  <p style="margin: 0 0 10px 0; font-size: 13px; color: #475569;">I have read, understood, and accept all the terms, conditions, and regulations governing my appointment.</p>
  <p style="margin: 0; font-weight: bold; color: #b91c1c;">Agreement: Yes / No</p>
</div>`,

  policy: `<p><strong>TRAINING &amp; COMPANY POLICY UNDERTAKING AGREEMENT</strong></p>
<p><em>[Employee Declaration &amp; Acceptance - {{companyName}}]</em></p>
<table style="width: 100%; border-collapse: collapse; margin: 12px 0; border: 1px solid #cbd5e1;">
  <tbody>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Date:</strong> {{agreementDate}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Employee Name:</strong> {{candidateName}}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Department:</strong> {{department}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Designation:</strong> {{jobTitle}}</td>
    </tr>
  </tbody>
</table>
<p>This document serves as an official declaration and acknowledgment by the employee confirming that all company policies, training procedures, work ethics, operational guidelines, and employment expectations have been clearly explained and understood prior to commencement of employment.</p>
<p>I hereby confirm that I have carefully read, understood, and accepted all the rules, regulations, policies, and terms stated in this agreement. I further understand that compliance with these policies is mandatory throughout my employment with the company.</p>
<p>I agree to maintain professionalism, discipline, integrity, confidentiality, punctuality, and respectful conduct at all times while representing the organization.</p>
<p>I also understand that violation of company policies may result in disciplinary action including warning letters, salary revision, suspension, or termination of employment depending upon the severity of the matter.</p>
<div style="margin: 16px 0; padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
  <p style="margin: 0; font-weight: bold; color: #b91c1c;">Agreement: Yes / No</p>
</div>

<p><strong>TRAINING POLICY &amp; LEARNING RESPONSIBILITIES</strong></p>
<p>The company shall provide an initial training program to help employees understand the nature of work, operational procedures, customer handling standards, technical requirements, workplace ethics, and company expectations.</p>
<p>The employee acknowledges that the training period is designed to evaluate:</p>
<ul>
  <li>Learning capability</li>
  <li>Professional attitude</li>
  <li>Communication skills</li>
  <li>Work ethics</li>
  <li>Technical understanding</li>
  <li>Performance consistency</li>
  <li>Adaptability to company standards</li>
</ul>
<p>The employee further understands and accepts that attendance during the complete 8-day training period is mandatory. Failure to complete the training period without management approval may result in automatic discontinuation of training and employment consideration.</p>
<p>Any rejoining or repeated training period shall be considered non-payable and subject to management approval.</p>
<div style="margin: 16px 0; padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
  <p style="margin: 0; font-weight: bold; color: #b91c1c;">Agreement: Yes / No</p>
</div>

<p><strong>ATTENDANCE, PUNCTUALITY &amp; LEAVE POLICY</strong></p>
<p>The employee agrees to strictly follow the company attendance and timing policies. Employees are expected to report to duty on time every working day. Late coming, irregular attendance, or repeated absenteeism may affect salary, incentives, appraisal, or continuation of employment. Unauthorized leave shall be considered misconduct. Leave requests must be informed and approved by the reporting authority in advance.</p>
<p>During probation or training period, leave approvals shall be limited and strictly based on management discretion. Employees must maintain professional availability during assigned working hours. Continuous absenteeism without official communication may result in disciplinary action or termination.</p>
<div style="margin: 16px 0; padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
  <p style="margin: 0; font-weight: bold; color: #b91c1c;">Agreement: Yes / No</p>
</div>

<p><strong>PERFORMANCE EXPECTATIONS &amp; PRODUCTIVITY STANDARDS</strong></p>
<p>The employee understands that performance evaluation shall be conducted based on productivity, quality of work, discipline, teamwork, learning ability, and achievement of assigned responsibilities.</p>
<p>The employee agrees to complete assigned work responsibilities sincerely, achieve minimum expectations, cooperate with managers, trainers, and team leaders, and accept constructive feedback positively.</p>
<p>The employee further understands that the training period shall be considered an evaluation phase and may remain non-payable until operational confirmation is received from the Trainer and Team Leader. Salary processing shall begin only after official confirmation regarding satisfactory performance, live call handling, lead generation, or operational readiness as per company policy.</p>
<div style="margin: 16px 0; padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
  <p style="margin: 0; font-weight: bold; color: #b91c1c;">Agreement: Yes / No</p>
</div>

<p><strong>WORKPLACE DISCIPLINE &amp; PROFESSIONAL CONDUCT</strong></p>
<p>The employee agrees to maintain a respectful, ethical, and professional work environment. Misbehaviour with staff or management, harassment, abusive language, physical or verbal conflict, violation of ethics, intentional negligence of work, or sharing confidential information outside the organization is strictly prohibited.</p>
<p>Employees are strictly prohibited from using mobile phones within company premises during working hours, training sessions, or restricted operational timings. Phones must be on silent mode.</p>
<div style="margin: 16px 0; padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
  <p style="margin: 0; font-weight: bold; color: #b91c1c;">Agreement: Yes / No</p>
</div>

<p><strong>CONFIDENTIALITY &amp; DATA PROTECTION POLICY</strong></p>
<p>The employee acknowledges that during employment they may receive access to confidential company information including client information, operational procedures, company databases, internal communication, financial details, and business strategies. Breach of confidentiality may lead to strict disciplinary and legal action.</p>
<div style="margin: 16px 0; padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
  <p style="margin: 0; font-weight: bold; color: #b91c1c;">Agreement: Yes / No</p>
</div>

<p><strong>FINAL DECLARATION &amp; CONFIRMATION</strong></p>
<p>I hereby declare that I have read, understood, and accepted all the policies, rules, and conditions mentioned in this document. I agree to abide by all the guidelines and understand that compliance is mandatory for continued employment with {{companyName}}.</p>
<div style="margin: 16px 0; padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
  <p style="margin: 0; font-weight: bold; color: #b91c1c;">Agreement: Yes / No</p>
</div>`,

  assessment: `<p><strong>TRAINING COMPLETION ASSESSMENT &amp; APPROVAL FORM</strong></p>
<table style="width: 100%; border-collapse: collapse; margin: 12px 0; border: 1px solid #cbd5e1;">
  <tbody>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Candidate Name:</strong> {{candidateName}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Designation:</strong> {{jobTitle}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Department:</strong> {{department}}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Training Start:</strong> {{trainingStartDate}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Training End:</strong> {{trainingEndDate}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Trainer:</strong> {{trainerName}}</td>
    </tr>
  </tbody>
</table>
<p><strong>TRAINING EVALUATION SUMMARY</strong><br>
This document certifies that the candidate has undergone the mandatory 8-day structured training program. The candidate's daily attendance, learning speed, practical task execution, and discipline have been assessed as follows:</p>
<ol>
  <li><strong>Communication &amp; Accent Neutralization:</strong> Satisfactory</li>
  <li><strong>Process &amp; Product Understanding:</strong> Proficient</li>
  <li><strong>CRM &amp; Operational Tools Navigation:</strong> Verified</li>
  <li><strong>Live Call / Practical Scenario Handling:</strong> Approved</li>
  <li><strong>Workplace Ethics &amp; Punctuality:</strong> Compliant</li>
</ol>
<p><strong>TRAINER RECOMMENDATION:</strong><br>
{{recommendation}}</p>
<p><strong>OVERALL RESULT:</strong> {{overallResult}}<br>
<strong>Approved By:</strong> {{approvedBy}}</p>
<div style="margin: 16px 0; padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
  <p style="margin: 0 0 8px 0; font-weight: bold; color: #1e293b;">Candidate Declaration:</p>
  <p style="margin: 0 0 10px 0; font-size: 13px; color: #475569;">I acknowledge the feedback and assessment provided above and agree to continue adhering to company operational standards.</p>
  <p style="margin: 0; font-weight: bold; color: #b91c1c;">Agreement: Yes / No</p>
</div>`,

  salary: `<p><strong>SALARY, TARGET &amp; RESPONSIBILITIES AGREEMENT</strong></p>
<table style="width: 100%; border-collapse: collapse; margin: 12px 0; border: 1px solid #cbd5e1;">
  <tbody>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Employee Name:</strong> {{candidateName}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Designation:</strong> {{jobTitle}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Department:</strong> {{department}}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Office Location:</strong> {{officeLocation}} Office</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;" colspan="2"><strong>Effective Date:</strong> {{agreementDate}}</td>
    </tr>
  </tbody>
</table>
<p><strong>COMPENSATION &amp; STRUCTURE:</strong></p>
<ul>
  <li><strong>Base Monthly Salary:</strong> ₹{{baseSalary}}</li>
  <li><strong>Performance &amp; Attendance Incentive:</strong> Up to ₹{{performanceIncentive}}</li>
  <li><strong>Security Deposit Deduction (refundable per policy):</strong> ₹{{securityDepositAmount}}</li>
  <li><strong>Total CTC / Package:</strong> ₹{{fullPackage}} per month</li>
</ul>
<p><strong>TARGETS &amp; DELIVERABLES:</strong></p>
<ol>
  <li><strong>Monthly Installation Target:</strong> {{monthlyInstallationTarget}} Units</li>
  <li><strong>Monthly Sales / Conversion Target:</strong> {{monthlySalesTarget}} Accounts</li>
  <li><strong>Working Hours:</strong> 9.5 Hours per Day (8.5 Hours active + 1 Hour scheduled breaks).</li>
</ol>
<p><strong>TERMS &amp; ACKNOWLEDGMENT:</strong></p>
<ol>
  <li>Salary payout shall be processed between the 7th and 10th of every month.</li>
  <li>The employee understands and accepts the target milestones and payout structure.</li>
  <li>In case of unexcused leaves or early resignation without notice period, deductions shall apply as per company guidelines.</li>
</ol>
<div style="margin: 16px 0; padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
  <p style="margin: 0 0 8px 0; font-weight: bold; color: #1e293b;">Candidate Acceptance:</p>
  <p style="margin: 0 0 10px 0; font-size: 13px; color: #475569;">I have read and agree to the compensation terms, targets, and responsibilities detailed above.</p>
  <p style="margin: 0; font-weight: bold; color: #b91c1c;">Agreement: Yes / No</p>
</div>`,

  revision: `<p><strong>SALARY &amp; ROLE REVISION LETTER</strong></p>
<p><em>[{{companyName}} - Compensation &amp; Benefits Committee]</em></p>
<table style="width: 100%; border-collapse: collapse; margin: 12px 0; border: 1px solid #cbd5e1;">
  <tbody>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Date:</strong> {{agreementDate}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Reference No:</strong> VC/REVISION/2026</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Location:</strong> {{officeLocation}} Office</td>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Employee Name:</strong> {{candidateName}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Employee ID:</strong> {{employeeId}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Department:</strong> {{department}}</td>
    </tr>
  </tbody>
</table>
<p>Dear <strong>{{candidateName}}</strong>,</p>
<p>In recognition of your continued dedication, professional contributions, and performance evaluation during the preceding operational cycle, the management of <strong>{{companyName}}</strong> is pleased to inform you of a revision in your compensation package and role parameters.</p>
<p><strong>1. REVISED COMPENSATION STRUCTURE</strong><br>
Effective from <strong>{{effectiveDate}}</strong>, your revised remuneration structure is established as:</p>
<ul>
  <li><strong>Revised Base Salary:</strong> ₹{{revisedBaseSalary}} per month</li>
  <li><strong>Revised Performance Allowance / KPI Incentive:</strong> Up to ₹{{revisedIncentive}} per month</li>
  <li><strong>Revised Total Annual CTC:</strong> ₹{{revisedFullPackage}} per annum</li>
</ul>
<p><strong>2. REVISED DESIGNATION &amp; RESPONSIBILITIES</strong><br>
- <strong>Revised Job Title:</strong> {{revisedJobTitle}}<br>
- <strong>Department / Unit:</strong> {{department}}<br>
- <strong>Reporting Manager:</strong> {{managerName}}<br>
Your updated role entails elevated responsibilities, leadership accountability, and target commitments as aligned with departmental growth objectives.</p>
<p><strong>3. TERMS OF APPOINTMENT</strong><br>
All other terms, conditions, service covenants, confidentiality agreements, and operational policies detailed in your original appointment letter remain fully binding and unchanged.</p>
<p>Warm regards,<br>
<strong>{{managerName}}</strong><br>
Director of Talent Operations &amp; Corporate Strategy<br>
<strong>{{companyName}}</strong></p>
<div style="margin: 16px 0; padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
  <p style="margin: 0 0 8px 0; font-weight: bold; color: #1e293b;">Employee Acknowledgment:</p>
  <p style="margin: 0 0 10px 0; font-size: 13px; color: #475569;">I, {{candidateName}}, hereby accept the revised compensation and role responsibilities with sincere commitment.</p>
  <p style="margin: 0; font-weight: bold; color: #b91c1c;">Agreement: Yes / No</p>
</div>`,

  nda: `<p><strong>NON-DISCLOSURE &amp; CONFIDENTIALITY AGREEMENT (NDA)</strong></p>
<p><em>[Official Corporate Compliance Directorate - {{companyName}}]</em></p>
<table style="width: 100%; border-collapse: collapse; margin: 12px 0; border: 1px solid #cbd5e1;">
  <tbody>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Effective Date:</strong> {{agreementDate}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Reference No:</strong> VC/NDA/2026</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Location:</strong> {{officeLocation}} Office</td>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Employee Name:</strong> {{candidateName}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Department:</strong> {{department}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Designation:</strong> {{jobTitle}}</td>
    </tr>
  </tbody>
</table>
<p>This Non-Disclosure and Confidentiality Agreement ("Agreement") is entered into between <strong>{{companyName}}</strong> (the "Company") and <strong>{{candidateName}}</strong> (the "Employee").</p>
<p><strong>1. PURPOSE &amp; SCOPE</strong><br>
In the course of employment, the Employee will receive access to proprietary, non-public, sensitive, and confidential information of the Company, its affiliates, and its clients. This Agreement establishes binding safeguards to protect all trade secrets, client accounts, operational techniques, and proprietary assets of {{companyName}}.</p>
<p><strong>2. DEFINITION OF CONFIDENTIAL INFORMATION</strong><br>
Confidential Information includes, without limitation: client records, prospect lists, enterprise customer details, operational scripts, dialer procedures, CRM software configurations, technical workflows, financial metrics, compensation models, business development strategies, employee records, internal training materials, SOPs, and proprietary company documentation.</p>
<p><strong>3. NON-DISCLOSURE OBLIGATIONS &amp; RESTRICTIONS</strong><br>
The Employee agrees to maintain all Confidential Information in strict secrecy, never export or transfer data to personal devices, and utilize Confidential Information solely for the legitimate business objectives of {{companyName}}.</p>
<div style="margin: 16px 0; padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
  <p style="margin: 0; font-weight: bold; color: #b91c1c;">Agreement: Yes / No</p>
</div>
<p><strong>4. NON-SOLICITATION &amp; NON-COMPETE COVENANTS</strong><br>
During employment and for twelve (12) months following separation from {{companyName}} for any reason, the Employee shall not solicit company staff, clients, or engage in unauthorized competitive activities using confidential knowledge acquired at the Company.</p>
<div style="margin: 16px 0; padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
  <p style="margin: 0; font-weight: bold; color: #b91c1c;">Agreement: Yes / No</p>
</div>
<p><strong>5. RETURN OF COMPANY ASSETS &amp; DATA DELETION</strong><br>
Upon request or separation, the Employee must immediately surrender all Company property, credentials, files, electronic devices, access tokens, and ID badges, certifying complete deletion of stored data.</p>
<div style="margin: 16px 0; padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
  <p style="margin: 0; font-weight: bold; color: #b91c1c;">Agreement: Yes / No</p>
</div>`,

  relieving: `<p><strong>FORMAL RESIGNATION ACCEPTANCE &amp; RELIEVING LETTER</strong></p>
<table style="width: 100%; border-collapse: collapse; margin: 12px 0; border: 1px solid #cbd5e1;">
  <tbody>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Date:</strong> {{agreementDate}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Reference No:</strong> VC/REL/2026</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Location:</strong> {{officeLocation}} Office</td>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Employee Name:</strong> {{candidateName}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Employee ID:</strong> {{employeeId}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Department:</strong> {{department}}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Designation:</strong> {{jobTitle}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Resignation Date:</strong> {{resignationDate}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Relieving Date:</strong> {{lastWorkingDay}}</td>
    </tr>
  </tbody>
</table>
<p>Dear <strong>{{candidateName}}</strong>,</p>
<p>This has reference to your formal resignation letter submitted on <strong>{{resignationDate}}</strong> requesting to be relieved from your duties as <strong>{{jobTitle}}</strong> in the <strong>{{department}}</strong> at <strong>{{companyName}}</strong>.</p>
<p>We wish to inform you that your resignation has been accepted by Company Management. You are hereby officially relieved from all services, responsibilities, and duties with <strong>{{companyName}}</strong> with effect from the close of business hours on <strong>{{lastWorkingDay}}</strong>.</p>
<p><strong>EXIT FORMALITIES &amp; HANDOVER VERIFICATION:</strong></p>
<ul>
  <li><strong>Notice Period:</strong> Served in compliance with company employment terms (Status: {{noticePeriodServed}}).</li>
  <li><strong>Departmental Handover:</strong> Satisfactory handover of all active files, credentials, and deliverables to reporting manager {{managerName}}.</li>
  <li><strong>Asset &amp; Security Clearance:</strong> Return of all company property including official ID badges, documentation, and hardware.</li>
  <li><strong>Full &amp; Final Accounts Clearance:</strong> Final accounts settlement shall be processed in accordance with company audit standards.</li>
</ul>
<div style="margin: 16px 0; padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
  <p style="margin: 0; font-weight: bold; color: #b91c1c;">Agreement: Yes / No</p>
</div>
<p><strong>CONTINUING CONFIDENTIALITY:</strong><br>
Please note that all non-disclosure obligations and confidentiality covenants executed during your tenure remain binding upon you.</p>
<p>We appreciate your contributions during your association with {{companyName}}, and wish you success in your future endeavors.</p>
<div style="margin: 16px 0; padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
  <p style="margin: 0 0 8px 0; font-weight: bold; color: #1e293b;">Employee Receipt &amp; Handover Acknowledgment:</p>
  <p style="margin: 0 0 10px 0; font-size: 13px; color: #475569;">I, {{candidateName}}, acknowledge receipt of this Formal Resignation Acceptance &amp; Relieving Letter, confirming that I have handed over all responsibilities and possess no pending claims against {{companyName}}.</p>
  <p style="margin: 0; font-weight: bold; color: #b91c1c;">Agreement: Yes / No</p>
</div>`,

  fnf: `<p><strong>FULL AND FINAL SETTLEMENT (FNF) STATEMENT</strong></p>
<p><em>[Finance &amp; Accounts Directorate - {{companyName}}]</em></p>
<table style="width: 100%; border-collapse: collapse; margin: 12px 0; border: 1px solid #cbd5e1;">
  <tbody>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Date:</strong> {{agreementDate}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Reference No:</strong> VC/FNF/2026</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Location:</strong> {{officeLocation}} Office</td>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Employee Name:</strong> {{candidateName}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Department:</strong> {{department}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Designation:</strong> {{jobTitle}}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;" colspan="3"><strong>Last Working Date:</strong> {{lastWorkingDay}}</td>
    </tr>
  </tbody>
</table>
<p>Dear <strong>{{candidateName}}</strong>,</p>
<p>With reference to the separation of your employment with <strong>{{companyName}}</strong> effective from your last working date of <strong>{{lastWorkingDay}}</strong>, we are pleased to confirm the details of your Full and Final (F&amp;F) Settlement below.</p>
<p><strong>EARNINGS &amp; PAYOUT DETAILS:</strong></p>
<ul>
  <li>Salary for days worked in the final month: Settled per accounts audit</li>
  <li>Leave Encashment: Settled</li>
  <li>Bonus / Incentive payable (if applicable): Settled</li>
  <li>Other reimbursements / dues: None</li>
</ul>
<p><strong>DEDUCTIONS &amp; RECOVERIES:</strong></p>
<ul>
  <li>Notice period shortfall (if any): None</li>
  <li>Outstanding advances / loans: None</li>
  <li>Tax Deducted at Source (TDS): As applicable</li>
  <li>Other recoveries (e.g., unreturned assets): Cleared</li>
</ul>
<p><strong>Net Settlement Clearance:</strong> All dues cleared per accounts audit. This settlement amount will be credited to your registered bank account, subject to completion of exit formalities and department clearance.</p>
<div style="margin: 16px 0; padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
  <p style="margin: 0 0 8px 0; font-weight: bold; color: #1e293b;">Employee Acknowledgment &amp; Clearance:</p>
  <p style="margin: 0 0 10px 0; font-size: 13px; color: #475569;">I, {{candidateName}}, acknowledge receipt of this Full and Final Settlement statement and confirm that I have no further claims against {{companyName}} arising from my employment.</p>
  <p style="margin: 0; font-weight: bold; color: #b91c1c;">Agreement: Yes / No</p>
</div>`,

  acknowledgement: `<p><strong>FINAL CANDIDATE ACKNOWLEDGEMENT OF RECEIVING ALL DOCUMENTS</strong></p>
<p><strong>EMPLOYEE RECEIPT &amp; COMPLIANCE UNDERTAKING</strong></p>
<table style="width: 100%; border-collapse: collapse; margin: 12px 0; border: 1px solid #cbd5e1;">
  <tbody>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Date:</strong> {{agreementDate}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Employee Name:</strong> {{candidateName}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Employee ID:</strong> {{employeeId}}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Department:</strong> {{department}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Designation:</strong> {{jobTitle}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;"><strong>Office Location:</strong> {{officeLocation}} Office</td>
    </tr>
  </tbody>
</table>
<p>This official document serves as a formal legal receipt and acknowledgment by the employee confirming that all essential company documentation, operational manuals, appointment and policy records, IT and security guidelines, and HR directives have been officially provided, delivered, and accessed.</p>
<p>The employee confirms that they have received, thoroughly examined, and understood all uploaded and attached documents listed below:</p>
<p><strong>ATTACHED OFFICIAL DOCUMENTS FOR CANDIDATE REVIEW:</strong><br>
{{documentsList}}</p>
<p><strong>DECLARATIONS &amp; COMMITMENTS:</strong></p>
<ol>
  <li>I confirm that I have been provided access to, opened, and carefully reviewed each individual document listed above.</li>
  <li>I acknowledge that I had full opportunity to ask questions and seek clarification regarding any policy, term, or condition.</li>
  <li>I understand and agree that strict adherence to all company policies, data protection guidelines, and operational standards is mandatory throughout my employment.</li>
  <li>I agree to maintain the strict confidentiality of all proprietary materials and operational information received.</li>
</ol>
<div style="margin: 16px 0; padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
  <p style="margin: 0; font-weight: bold; color: #b91c1c;">Agreement: Yes / No</p>
</div>`,
};

export const DEFAULT_ORGANIZATION = 'Vahlay Consulting Inc.';
export const TRAINING_DAYS = 8;

export const OFFICIAL_DESIGNATIONS = [
  'Fullstack Developer',
  'Frontend Developer',
  'Backend Developer',
  'Software Engineer',
  'QA Engineer',
  'Telecaller Executive',
  'Business Development Executive',
  'Customer Support Specialist',
  'HR Executive',
  'Accountant',
  'Trainee / Associate',
];

export const getDepartmentByDesignation = (designation) => {
  if (!designation) return 'Support Department';
  const norm = String(designation).toLowerCase().trim();

  if (
    norm.includes('develop') ||
    norm.includes('engineer') ||
    norm.includes('frontend') ||
    norm.includes('backend') ||
    norm.includes('fullstack') ||
    norm.includes('software') ||
    norm.includes('tech') ||
    norm.includes('qa') ||
    norm.includes('tester')
  ) {
    return 'Engineering & Technology';
  }

  if (
    norm.includes('telecaller') ||
    norm.includes('sales') ||
    norm.includes('business development') ||
    norm.includes('bde') ||
    norm.includes('marketing')
  ) {
    return 'Sales & Business Development';
  }

  if (
    norm.includes('customer') ||
    norm.includes('support') ||
    norm.includes('csm') ||
    norm.includes('client')
  ) {
    return 'Customer Success & Support';
  }

  if (
    norm.includes('hr') ||
    norm.includes('recruit') ||
    norm.includes('talent') ||
    norm.includes('human resource')
  ) {
    return 'Human Resources';
  }

  if (
    norm.includes('account') ||
    norm.includes('finance') ||
    norm.includes('billing') ||
    norm.includes('payroll')
  ) {
    return 'Finance & Accounts';
  }

  if (
    norm.includes('operation') ||
    norm.includes('admin') ||
    norm.includes('office')
  ) {
    return 'Operations';
  }

  return 'Support Department';
};

export function cleanOfficeLocation(locStr = '') {
  const s = String(locStr || '').toLowerCase().trim();
  if (s.includes('vadodara') || s.includes('baroda')) return 'Vadodara';
  if (s.includes('ahmedabad') || s.includes('ahemdabad') || s.includes('amdavad')) return 'Ahmedabad';
  return locStr || 'Ahmedabad';
}

export const isHtmlContent = (str) => {
  if (!str || typeof str !== 'string') return false;
  return /<[a-z][\s\S]*>/i.test(str.trim());
};

export const cleanWordHtml = (html) => {
  if (!html || typeof html !== 'string') return '';
  let cleaned = html;
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  cleaned = cleaned.replace(/<\/?o:[a-z0-9_-]+[^>]*>/gi, '');
  cleaned = cleaned.replace(/<\/?w:[a-z0-9_-]+[^>]*>/gi, '');
  cleaned = cleaned.replace(/<\/?m:[a-z0-9_-]+[^>]*>/gi, '');
  cleaned = cleaned.replace(/style="[^"]*mso-[^"]*"/gi, '');
  cleaned = cleaned.replace(/class="[^"]*Mso[^"]*"/gi, '');
  cleaned = cleaned
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/&nbsp;/g, ' ')
    .replace(/[\u00A0\u2000-\u200B\u202F\u205F]/g, ' ');
  return cleaned;
};

export function cleanWordText(raw = '') {
  let text = String(raw || '');
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  text = text
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...');
  text = text.replace(/[\uF0B7\uF0A7\uF0A8\u2022\u25CF\u25AA\u25E6]/g, '-');
  text = text.replace(/[\u00A0\u2000-\u200B\u202F\u205F]/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

export const stripHtmlToDocumentText = (html) => {
  if (!html || typeof html !== 'string') return '';
  if (!isHtmlContent(html)) return cleanWordText(html);
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<td[^>]*>/gi, '\n')
    .replace(/<th[^>]*>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  return cleanWordText(text);
};

export const textToHtml = (text) => {
  if (!text || typeof text !== 'string') return '';
  if (isHtmlContent(text)) return cleanWordHtml(text);
  const sections = text.split(/\r?\n\r?\n+/);
  return sections
    .map((section) => {
      const trimmed = section.trim();
      if (!trimmed) return '';
      const lines = trimmed.split(/\r?\n/);
      if (lines.every((l) => /^\s*[-•*]\s+/.test(l))) {
        const items = lines.map((l) => `  <li>${l.replace(/^\s*[-•*]\s+/, '')}</li>`).join('\n');
        return `<ul>\n${items}\n</ul>`;
      }
      if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
        const items = lines.map((l) => `  <li>${l.replace(/^\s*\d+[.)]\s+/, '')}</li>`).join('\n');
        return `<ol>\n${items}\n</ol>`;
      }
      if (lines.length === 1 && trimmed === trimmed.toUpperCase() && trimmed.length > 3 && trimmed.length < 80) {
        return `<p><strong>${trimmed}</strong></p>`;
      }
      if (/^\s*(agreement\s*:\s*)?\s*yes\s*\/\s*no/i.test(trimmed)) {
        return `<div style="margin: 14px 0; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;"><p style="margin: 0; font-weight: bold; color: #b91c1c;">Agreement: Yes / No</p></div>`;
      }
      return `<p>${lines.join('<br>')}</p>`;
    })
    .filter(Boolean)
    .join('\n\n');
};

export const ensureHtmlContent = (content) => {
  if (!content || typeof content !== 'string') return '';
  if (isHtmlContent(content)) {
    return cleanWordHtml(content);
  }
  return textToHtml(content);
};

export const formatHtmlForDisplay = (html) => {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/>\s*</g, '>\n<')
    .replace(/(<\/tr>|<\/table>|<\/p>|<\/div>|<\/h[1-6]>|<\/ul>|<\/ol>)/gi, '$1\n')
    .trim();
};

export const cleanHtmlTemplateText = (content) => {
  return ensureHtmlContent(content);
};

export const substitutePlaceholders = (templateStr, values = {}) => {
  if (!templateStr) return "";

  const resolvedOffice = cleanOfficeLocation(values.officeLocation || values.location);

  const candidateNameVal = values.candidateFullName || values.candidateName || values.fullName || "Candidate";
  const candidateEmailVal = values.candidateEmail || values.email || "";
  const jobTitleVal = values.jobTitle || values.position || "Trainee / Associate";
  const departmentVal = values.department || getDepartmentByDesignation(jobTitleVal) || "Support Department";
  const joiningDateVal = values.joiningDate || "To be confirmed";
  const agreementDateVal = values.agreementDate || new Date().toISOString().slice(0, 10);
  const companyNameVal = values.companyName || values.organization || DEFAULT_ORGANIZATION;
  const managerNameVal = values.managerName || "Harshad Prajapati (HR/Manger)";
  const lastWorkingDayVal = values.lastWorkingDay || new Date().toISOString().slice(0, 10);

  const docsListFormatted = Array.isArray(values.uploadedDocuments) && values.uploadedDocuments.length > 0
    ? values.uploadedDocuments.map((d, i) => `${i + 1}. ${d.name} (${d.size || "PDF"})`).join("\n")
    : "• All official company onboarding policies, guidelines, and manuals uploaded by HR.";

  const map = {
    "{{candidateName}}": candidateNameVal,
    "{{candidateEmail}}": candidateEmailVal,
    "{{jobTitle}}": jobTitleVal,
    "{{department}}": departmentVal,
    "{{officeLocation}}": resolvedOffice,
    "{{joiningDate}}": joiningDateVal,
    "{{agreementDate}}": agreementDateVal,
    "{{companyName}}": companyNameVal,
    "{{managerName}}": managerNameVal,

    // assessment specific
    "{{trainingStartDate}}": values.trainingStartDate || "Day 1",
    "{{trainingEndDate}}": values.trainingEndDate || `Day ${TRAINING_DAYS}`,
    "{{trainerName}}": values.trainerName || "Assigned Trainer",
    "{{teamLeaderName}}": values.teamLeaderName || "Operations Team Leader",
    "{{overallResult}}": values.overallResult || "Pass",
    "{{approvedBy}}": values.approvedBy || "HR & Operations",
    "{{recommendation}}": values.recommendation || values.trainerRecommendation || "Candidate has successfully completed the 8-day training program.",
    "{{trainerRecommendation}}": values.trainerRecommendation || values.recommendation || "Candidate has successfully completed the 8-day training program.",

    // salary specific
    "{{baseSalary}}": values.baseSalary || "25000",
    "{{performanceIncentive}}": values.performanceIncentive || "5000",
    "{{securityDepositAmount}}": values.securityDepositAmount || "5000",
    "{{fullPackage}}": values.fullPackage || "35000",
    "{{monthlyInstallationTarget}}": values.monthlyInstallationTarget || "10",
    "{{monthlySalesTarget}}": values.monthlySalesTarget || "15",

    // fnf & relieving & nda specific
    "{{lastWorkingDay}}": lastWorkingDayVal,
    "{{relievingDate}}": lastWorkingDayVal,
    "{{resignationDate}}": values.resignationDate || values.agreementDate || new Date().toISOString().slice(0, 10),
    "{{employeeId}}": values.employeeId || "VC-EMP",
    "{{reasonForLeaving}}": values.reasonForLeaving || "Resignation / Settlement",
    "{{noticePeriodServed}}": values.noticePeriodServed || "Yes",
    "{{exitInterviewDone}}": values.exitInterviewDone || "Yes",
    "{{fnfRemarks}}": values.fnfRemarks || "All accounts and final dues cleared successfully.",

    // revision & appointment specific
    "{{effectiveDate}}": values.effectiveDate || values.agreementDate || new Date().toISOString().slice(0, 10),
    "{{revisedJobTitle}}": values.revisedJobTitle || values.jobTitle || "Senior Associate",
    "{{revisedBaseSalary}}": values.revisedBaseSalary || "30000",
    "{{revisedIncentive}}": values.revisedIncentive || values.performanceIncentive || "7000",
    "{{revisedFullPackage}}": values.revisedFullPackage || values.fullPackage || "42000",
    "{{offerExpiryDate}}": values.offerExpiryDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),

    // acknowledgement specific
    "{{documentsList}}": docsListFormatted,
  };

  let out = templateStr;
  Object.keys(map).forEach((placeholder) => {
    const reg = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    out = out.replace(reg, map[placeholder]);
  });

  // Additional common Word template bracket placeholders (e.g. from HR docx templates)
  const wordBracketMap = {
    "\\[Employee Name\\]": candidateNameVal,
    "\\[Employee Full Name\\]": candidateNameVal,
    "\\[Emplo;yee Full Name\\]": candidateNameVal,
    "\\[Candidate Name\\]": candidateNameVal,
    "\\[Company Name\\]": companyNameVal,
    "\\[Designation\\]": jobTitleVal,
    "\\[Employe Title\\]": jobTitleVal,
    "\\[Employee Title\\]": jobTitleVal,
    "\\[DD/MM/YYYY\\]": agreementDateVal,
    "\\[Date\\]": agreementDateVal,
    "\\[Last Working Date\\]": lastWorkingDayVal,
    "\\[Last Date\\]": lastWorkingDayVal,
    "\\[Relieving Date\\]": lastWorkingDayVal,
    "\\[Resignation Date\\]": values.resignationDate || values.agreementDate || new Date().toISOString().slice(0, 10),
    "\\[Employee ID\\]": values.employeeId || "VC-EMP",
    "\\[Authorized Signatory Name\\]": managerNameVal,
  };
  Object.keys(wordBracketMap).forEach((pattern) => {
    out = out.replace(new RegExp(pattern, "gi"), wordBracketMap[pattern]);
  });

  return out;
};
