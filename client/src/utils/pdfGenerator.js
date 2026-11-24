import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { VAHLAY_LOGO_DATA_URL } from '../constants/vahlayLogo';
import { stripHtmlToDocumentText } from '../constants/agreementTemplates';

if (pdfFonts && pdfFonts.vfs) {
  pdfMake.vfs = pdfFonts.vfs;
}

export function parseDocumentBodyForPdf(
  rawText = '',
  _docTitle = '',
  _company = '',
  questionAnswers = {},
  options = {}
) {
  const candidateName = options.candidateName || 'Candidate';
  const isSigned = Boolean(options.isSigned);
  const signedAt = options.signedAt || null;
  const dateStr = options.dateStr || new Date().toISOString().slice(0, 10);

  const normalized = stripHtmlToDocumentText(rawText);
  const clean = String(normalized || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const sections = clean.split(/\n{2,}/);
  const elements = [];
  let questionCounter = 0;

  const isQuestionLine = (s) => {
    if (!s) return false;
    const str = s.trim();
    return (
      str === 'Yes / No' ||
      str === 'Yes/No' ||
      str === 'Agreement: Yes / No' ||
      str === 'Agreement: Yes/No' ||
      str === 'Agreement : Yes / No' ||
      /^\s*(agreement\s*:\s*)?yes\s*(\/|\sor\s)\s*no\s*$/i.test(str) ||
      /^\s*agreement\s*:\s*(yes|no)\s*$/i.test(str) ||
      /^\s*accepted\s*\[\s*(yes|no)\s*\]/i.test(str) ||
      /agreement\s*:\s*yes\s*(\/|\sor\s)\s*no/i.test(str)
    );
  };

  sections.forEach((sec) => {
    const lines = sec.split('\n');
    const firstLine = lines[0].trim();

    const isHeader =
      lines.length === 1 &&
      !isQuestionLine(firstLine) &&
      (firstLine === firstLine.toUpperCase() ||
        firstLine.endsWith(':') ||
        firstLine.startsWith('TRAINING') ||
        firstLine.startsWith('PERFORMANCE') ||
        firstLine.startsWith('ATTENDANCE') ||
        firstLine.startsWith('WORKPLACE') ||
        firstLine.startsWith('CONFIDENTIALITY') ||
        firstLine.startsWith('ADDITIONAL') ||
        firstLine.startsWith('FINAL') ||
        firstLine.startsWith('MOBILE') ||
        firstLine.startsWith('EMPLOYEE ID') ||
        firstLine.startsWith('PURPOSE') ||
        firstLine.startsWith('DEFINITION') ||
        firstLine.startsWith('NON-DISCLOSURE') ||
        firstLine.startsWith('NON-SOLICITATION') ||
        firstLine.startsWith('RETURN OF') ||
        firstLine.startsWith('LEGAL REMEDIES') ||
        firstLine.startsWith('EXIT FORMALITIES') ||
        firstLine.startsWith('CONTINUING') ||
        firstLine.startsWith('EARNINGS') ||
        firstLine.startsWith('DEDUCTIONS') ||
        firstLine.startsWith('COMPENSATION') ||
        firstLine.startsWith('TARGETS'));

    if (isHeader) {
      elements.push({
        text: firstLine,
        fontSize: 10,
        bold: true,
        color: '#0f172a',
        margin: [0, 8, 0, 3],
      });
      return;
    }

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        elements.push({
          text: `•  ${trimmed.substring(2)}`,
          fontSize: 8.5,
          color: '#334155',
          margin: [8, 1, 0, 1],
          lineHeight: 1.25,
        });
      } else if (isQuestionLine(trimmed)) {
        const qKey = `clause_${questionCounter++}`;
        const rawAns =
          questionAnswers && (questionAnswers[qKey] || questionAnswers[String(questionCounter - 1)]);

        if (isSigned) {
          const isAccepted = rawAns === 'Yes' || (!rawAns && isSigned);
          const ansText = isAccepted
            ? 'Confirmed: [ Yes ]'
            : rawAns === 'No'
              ? 'Declined: [ No ]'
              : 'Confirmed: [ Yes ]';
          const ansColor = isAccepted ? '#15803d' : '#b91c1c';
          const ansBg = isAccepted ? '#f0fdf4' : '#fef2f2';

          elements.push({
            margin: [0, 5, 0, 5],
            table: {
              widths: ['*', 130],
              body: [
                [
                  {
                    stack: [
                      {
                        text: 'Candidate Undertaking & Acceptance:',
                        fontSize: 8.5,
                        bold: true,
                        color: '#0f172a',
                      },
                      {
                        text: `Digitally verified & agreed by: ${candidateName}`,
                        fontSize: 7.5,
                        bold: true,
                        color: '#1e3a8a',
                        margin: [0, 2, 0, 0],
                      },
                      {
                        text: signedAt
                          ? `Digitally Executed: ${new Date(signedAt).toLocaleString()}`
                          : `Official Document Date: ${dateStr}`,
                        fontSize: 7,
                        color: '#64748b',
                        margin: [0, 1, 0, 0],
                      },
                    ],
                    fillColor: '#f8fafc',
                    margin: [6, 4, 6, 4],
                  },
                  {
                    stack: [
                      {
                        text: ansText,
                        fontSize: 8.5,
                        bold: true,
                        color: ansColor,
                        alignment: 'right',
                      },
                      {
                        text: isAccepted ? 'Legally Enforceable & Accepted' : 'Clause Declined',
                        fontSize: 7,
                        italics: true,
                        color: isAccepted ? '#166534' : '#991b1b',
                        alignment: 'right',
                        margin: [0, 2, 0, 0],
                      },
                    ],
                    fillColor: ansBg,
                    margin: [6, 4, 6, 4],
                  },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#cbd5e1',
              vLineColor: () => '#cbd5e1',
            },
          });
        } else {
          // Document NOT signed yet: preview shows pending checkbox clause
          elements.push({
            margin: [0, 5, 0, 5],
            table: {
              widths: ['*', 130],
              body: [
                [
                  {
                    stack: [
                      {
                        text: 'Mandatory Clause Undertaking & Acceptance:',
                        fontSize: 8.5,
                        bold: true,
                        color: '#475569',
                      },
                      {
                        text: `Pending Digital Review & Signature: ${candidateName}`,
                        fontSize: 7.5,
                        italics: true,
                        color: '#64748b',
                        margin: [0, 2, 0, 0],
                      },
                      {
                        text: `Official Document Date: ${dateStr}`,
                        fontSize: 7,
                        color: '#94a3b8',
                        margin: [0, 1, 0, 0],
                      },
                    ],
                    fillColor: '#f8fafc',
                    margin: [6, 4, 6, 4],
                  },
                  {
                    stack: [
                      {
                        text: '[   ] Yes      [   ] No',
                        fontSize: 8.5,
                        bold: true,
                        color: '#64748b',
                        alignment: 'right',
                      },
                      {
                        text: 'Pending Signature',
                        fontSize: 7,
                        italics: true,
                        color: '#64748b',
                        alignment: 'right',
                        margin: [0, 2, 0, 0],
                      },
                    ],
                    fillColor: '#f8fafc',
                    margin: [6, 4, 6, 4],
                  },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#cbd5e1',
              vLineColor: () => '#cbd5e1',
            },
          });
        }
      } else {
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx > 0 && colonIdx < 35 && !trimmed.startsWith('http')) {
          const label = trimmed.substring(0, colonIdx + 1);
          const val = trimmed.substring(colonIdx + 1);
          elements.push({
            text: [
              { text: label + ' ', bold: true, color: '#0f172a', fontSize: 8.5 },
              { text: val, color: '#334155', fontSize: 8.5 },
            ],
            margin: [0, 1.5, 0, 1.5],
            lineHeight: 1.2,
          });
        } else {
          elements.push({
            text: trimmed,
            fontSize: 8.5,
            color: '#334155',
            margin: [0, 1.5, 0, 1.5],
            lineHeight: 1.25,
          });
        }
      }
    });
  });

  return elements;
}

export function generateAgreementPdfDefinition({
  form = {},
  documentContent = '',
  docTitle = 'Employment Agreement',
  candidateSignature = null,
  isSigned = false,
  signedAt = null,
  uploadedDocuments = [],
  managerSignatureImage = null,
  questionAnswers = {},
}) {
  const company = form.companyName || 'Vahlay Consulting Inc.';
  const candidateName =
    form.candidateFullName ||
    form.candidateName ||
    form.fields?.candidateFullName ||
    form.fields?.candidateName ||
    'Candidate';
  const managerName = form.managerName || 'Harshad Prajapati (HR/Manger)';
  const dateStr = form.agreementDate || new Date().toISOString().slice(0, 10);
  const managerSig = managerSignatureImage || form.managerSignatureImage || null;

  const resolvedQuestionAnswers =
    questionAnswers && Object.keys(questionAnswers).length > 0
      ? questionAnswers
      : form.questionAnswers || form.fields?.questionAnswers || {};

  const effectiveIsSigned = Boolean(
    isSigned ||
    candidateSignature ||
    form.candidateHasSigned ||
    form.status === 'signed'
  );

  const effectiveSignedAt = signedAt || form.signedAt || (effectiveIsSigned ? dateStr : null);

  const parsedBody = parseDocumentBodyForPdf(
    documentContent,
    docTitle,
    company,
    resolvedQuestionAnswers,
    {
      candidateName,
      isSigned: effectiveIsSigned,
      signedAt: effectiveSignedAt,
      dateStr,
    }
  );

  const docScheduleTable = [];
  if (Array.isArray(uploadedDocuments) && uploadedDocuments.length > 0) {
    docScheduleTable.push({
      margin: [0, 8, 0, 8],
      table: {
        headerRows: 1,
        widths: [24, '*', 70, 110],
        body: [
          [
            { text: '#', bold: true, fillColor: '#f1f5f9', fontSize: 8 },
            { text: 'Official Document Title', bold: true, fillColor: '#f1f5f9', fontSize: 8 },
            { text: 'Size', bold: true, fillColor: '#f1f5f9', fontSize: 8 },
            { text: 'Candidate Review Status', bold: true, fillColor: '#f1f5f9', fontSize: 8 },
          ],
          ...uploadedDocuments.map((doc, idx) => [
            { text: String(idx + 1), fontSize: 8 },
            { text: doc.name || doc.fileName || `Document ${idx + 1}`, bold: true, fontSize: 8 },
            { text: doc.size || 'PDF', fontSize: 8 },
            { text: 'Review Confirmed', color: '#15803d', bold: true, fontSize: 8 },
          ]),
        ],
      },
    });
  }

  const signatureBlock = {
    unbreakable: true,
    table: {
      dontBreakRows: true,
      widths: ['*', '*'],
      body: [
        [
          {
            stack: [
              { text: 'Candidate Acceptance & Signature:', fontSize: 8.5, bold: true, color: '#0f172a' },
              candidateSignature && candidateSignature.startsWith('data:image')
                ? { image: candidateSignature, width: 130, height: 45, margin: [0, 3, 0, 2] }
                : {
                    text: isSigned ? '[Digitally Signed & Verified]' : '[Awaiting Online Candidate Signature]',
                    italics: true,
                    color: isSigned ? '#16a34a' : '#94a3b8',
                    margin: [0, 12, 0, 12],
                  },
              { text: candidateName, bold: true, fontSize: 8.5, color: '#0f172a' },
              { text: isSigned ? `Signed: ${signedAt ? new Date(signedAt).toLocaleString() : dateStr}` : 'Vahlay Consulting Candidate', fontSize: 7, color: '#64748b', margin: [0, 1, 0, 0] },
            ],
            fillColor: '#f8fafc',
            margin: [6, 4, 6, 4],
          },
          {
            stack: [
              { text: 'For Company Authorized Signatory & Corporate Seal:', fontSize: 8.5, bold: true, color: '#0f172a', alignment: 'right' },
              managerSig && String(managerSig).startsWith('data:image')
                ? { image: managerSig, fit: [130, 40], alignment: 'right', margin: [0, 4, 0, 4] }
                : { text: managerName ? `${managerName.split('(')[0].trim()}` : '[Authorized Signature & Seal]', italics: true, bold: true, alignment: 'right', margin: [0, 10, 0, 10], color: '#1e3a8a' },
              { text: managerName, fontSize: 8.5, bold: true, alignment: 'right', color: '#0f172a' },
              { text: company, fontSize: 7, italics: true, color: '#64748b', alignment: 'right', margin: [0, 1, 0, 0] },
              { text: `Date: ${dateStr}`, fontSize: 7, color: '#64748b', alignment: 'right', margin: [0, 1, 0, 0] },
            ],
            fillColor: '#f8fafc',
            margin: [6, 4, 6, 4],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#cbd5e1',
      vLineColor: () => '#cbd5e1',
    },
    margin: [0, 14, 0, 2],
  };

  return {
    pageSize: 'A4',
    pageMargins: [36, 36, 36, 36],
    header: {
      text: 'VAHLAY CONSULTING INC. — OFFICIAL CANDIDATE DOCUMENT',
      alignment: 'center',
      fontSize: 7.5,
      color: '#94a3b8',
      margin: [0, 14, 0, 0],
    },
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: 'Confidential — Legally Binding Digital Document', fontSize: 7.5, color: '#94a3b8', margin: [36, 0, 0, 0] },
        { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', fontSize: 7.5, color: '#94a3b8', margin: [0, 0, 36, 0] },
      ],
    }),
    content: [
      {
        table: {
          widths: [55, '*'],
          body: [
            [
              {
                image: VAHLAY_LOGO_DATA_URL,
                width: 48,
                height: 48,
                alignment: 'center',
                margin: [0, 2, 4, 2],
              },
              {
                stack: [
                  { text: company.toUpperCase(), fontSize: 13, bold: true, color: '#0f172a' },
                  { text: docTitle.toUpperCase(), fontSize: 10, bold: true, color: '#b91c1c', margin: [0, 2, 0, 1] },
                  { text: 'Official Documentation & Enforceable Agreement', fontSize: 7.5, color: '#64748b' },
                ],
                margin: [4, 4, 0, 4],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.75,
          vLineWidth: () => 0.75,
          hLineColor: () => '#cbd5e1',
          vLineColor: () => '#cbd5e1',
        },
        margin: [0, 0, 0, 10],
      },
      ...parsedBody,
      ...docScheduleTable,
      signatureBlock,
    ],
  };
}

export function openAgreementPdf(params) {
  const docDef = generateAgreementPdfDefinition(params);
  pdfMake.createPdf(docDef).open();
}

export function downloadAgreementPdf(paramsOrAgreement, signatureOrFilename, maybeAnswersOrFilename) {
  let normalizedParams = {};
  let finalFilename = 'Vahlay_Consulting_Signed_Agreement.pdf';

  if (paramsOrAgreement && typeof paramsOrAgreement === 'object') {
    // Check if second argument is a data URL signature
    const signatureFromArg =
      typeof signatureOrFilename === 'string' && signatureOrFilename.startsWith('data:image')
        ? signatureOrFilename
        : null;

    const signature =
      signatureFromArg ||
      paramsOrAgreement.candidateSignatureImage ||
      paramsOrAgreement.candidateSignature ||
      null;

    const isSigned = Boolean(
      signature ||
      paramsOrAgreement.isSigned ||
      paramsOrAgreement.candidateHasSigned ||
      paramsOrAgreement.status === 'signed'
    );

    const signedAt =
      paramsOrAgreement.signedAt || (isSigned ? new Date().toISOString() : null);

    const candidateName =
      paramsOrAgreement.candidateFullName ||
      paramsOrAgreement.candidateName ||
      paramsOrAgreement.fields?.candidateFullName ||
      paramsOrAgreement.fields?.candidateName ||
      paramsOrAgreement.form?.candidateFullName ||
      'Candidate';

    const docTitle =
      paramsOrAgreement.documentTitle ||
      paramsOrAgreement.docTitle ||
      paramsOrAgreement.templateName ||
      'Agreement';

    const cleanDoc = String(docTitle).replace(/[^a-zA-Z0-9]/g, '_');
    const cleanCand = String(candidateName).replace(/[^a-zA-Z0-9]/g, '_');

    finalFilename = `Vahlay_Consulting_Signed_${cleanDoc}_${cleanCand}.pdf`;

    if (
      typeof signatureOrFilename === 'string' &&
      !signatureOrFilename.startsWith('data:image') &&
      signatureOrFilename.endsWith('.pdf')
    ) {
      finalFilename = signatureOrFilename;
    } else if (
      typeof maybeAnswersOrFilename === 'string' &&
      maybeAnswersOrFilename.endsWith('.pdf')
    ) {
      finalFilename = maybeAnswersOrFilename;
    }

    const resolvedQuestionAnswers =
      (maybeAnswersOrFilename && typeof maybeAnswersOrFilename === 'object'
        ? maybeAnswersOrFilename
        : null) ||
      paramsOrAgreement.questionAnswers ||
      paramsOrAgreement.fields?.questionAnswers ||
      {};

    normalizedParams = {
      form: paramsOrAgreement.fields || paramsOrAgreement.form || paramsOrAgreement,
      documentContent:
        paramsOrAgreement.documentContent || paramsOrAgreement.templateContent || '',
      docTitle,
      candidateSignature: signature,
      isSigned,
      signedAt,
      uploadedDocuments: paramsOrAgreement.uploadedDocuments || [],
      managerSignatureImage:
        paramsOrAgreement.managerSignatureImage ||
        paramsOrAgreement.fields?.managerSignatureImage ||
        null,
      questionAnswers: resolvedQuestionAnswers,
    };
  }

  const docDef = generateAgreementPdfDefinition(normalizedParams);
  pdfMake.createPdf(docDef).download(finalFilename);
}
