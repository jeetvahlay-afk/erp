import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Code,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck2,
  FileCode,
  FileSignature,
  FileText,
  FolderOpen,
  Link as LinkIcon,
  Link2,
  List,
  ListOrdered,
  MapPin,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Table,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import JSZip from 'jszip';
import api, { asArray, getApiError } from '../lib/api';
import { feedback } from '../lib/feedback';
import {
  DOC_TYPES,
  DEFAULT_TEMPLATES,
  cleanOfficeLocation,
  cleanWordText,
  cleanWordHtml,
  stripHtmlToDocumentText,
  cleanHtmlTemplateText,
  isHtmlContent,
  substitutePlaceholders,
  textToHtml,
  ensureHtmlContent,
  formatHtmlForDisplay,
} from '../constants/agreementTemplates';
import { downloadAgreementPdf } from '../utils/pdfGenerator';
import { Avatar, formatDate, Modal, SearchInput, StatusBadge } from './ui/EnterpriseUI';

const DEFAULT_ORGANIZATION = 'Vahlay Consulting Inc.';

/* ------------------------------------------------------------------ */
/*  FormattedDocumentPreview Component                                 */
/* ------------------------------------------------------------------ */
export const FormattedDocumentPreview = ({
  content,
  companyName = DEFAULT_ORGANIZATION,
  form,
  managerSignatureImage,
  onUploadSirSignature,
  onRemoveSirSignature,
}) => {
  if (!content) {
    return (
      <div className="p-8 text-center text-slate-400 italic">
        No document content to display.
      </div>
    );
  }

  const resolvedOffice = cleanOfficeLocation(form?.officeLocation);

  // If content is HTML, render rich HTML layout directly
  if (isHtmlContent(content)) {
    return (
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 font-sans text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed max-w-3xl mx-auto space-y-4">
        {/* Brand Header */}
        <div className="border-b-2 border-red-700 pb-4 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3.5">
            <img
              src="/vahlay-logo.jpg"
              alt="Vahlay Consulting Logo"
              className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-full shadow-xs ring-2 ring-red-100 dark:ring-red-950/40 bg-white shrink-0"
            />
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight uppercase">
                {companyName}
              </h1>
              <p className="text-xs text-red-700 dark:text-red-400 font-bold uppercase tracking-wider">
                Official Documentation & Compliance
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right text-xs text-slate-500 dark:text-slate-400">
            <p className="font-semibold text-slate-800 dark:text-slate-200">{resolvedOffice} Office</p>
            <p>Date: {form?.agreementDate || new Date().toISOString().slice(0, 10)}</p>
          </div>
        </div>

        {/* Rich HTML Content with Tables & Lists */}
        <div
          className="agreement-rich-rendered space-y-3 font-sans text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200
            [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table]:border [&_table]:border-slate-300 dark:[&_table]:border-slate-700
            [&_th]:border [&_th]:border-slate-300 dark:[&_th]:border-slate-700 [&_th]:bg-slate-100 dark:[&_th]:bg-slate-800 [&_th]:p-2.5 [&_th]:text-left [&_th]:font-bold [&_th]:text-slate-900 dark:[&_th]:text-white
            [&_td]:border [&_td]:border-slate-300 dark:[&_td]:border-slate-700 [&_td]:p-2.5 [&_td]:text-slate-700 dark:[&_td]:text-slate-300
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2 [&_ul]:space-y-1
            [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2 [&_ol]:space-y-1
            [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-slate-900 dark:[&_h1]:text-white [&_h1]:my-2
            [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-900 dark:[&_h2]:text-white [&_h2]:my-2
            [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-slate-900 dark:[&_h3]:text-white [&_h3]:my-2
            [&_p]:my-2.5 [&_p]:leading-relaxed
            [&_strong]:text-slate-900 dark:[&_strong]:text-white [&_strong]:font-bold"
          dangerouslySetInnerHTML={{ __html: cleanWordHtml(content) }}
        />
      </div>
    );
  }

  const cleanContent = stripHtmlToDocumentText(content);
  const sections = cleanContent.split(/\n{2,}/);

  return (
    <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 font-sans text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed max-w-3xl mx-auto space-y-4">
      {/* Brand Header */}
      <div className="border-b-2 border-red-700 pb-4 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3.5">
          <img
            src="/vahlay-logo.jpg"
            alt="Vahlay Consulting Logo"
            className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-full shadow-xs ring-2 ring-red-100 dark:ring-red-950/40 bg-white shrink-0"
          />
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight uppercase">
              {companyName}
            </h1>
            <p className="text-xs text-red-700 dark:text-red-400 font-bold uppercase tracking-wider">
              Official Documentation & Compliance
            </p>
          </div>
        </div>
        <div className="text-left sm:text-right text-xs text-slate-500 dark:text-slate-400">
          <p className="font-semibold text-slate-800 dark:text-slate-200">{resolvedOffice} Office</p>
          <p>Date: {form?.agreementDate || new Date().toISOString().slice(0, 10)}</p>
        </div>
      </div>

      {/* Render Document Content */}
      <div className="space-y-3">
        {sections.map((sec, idx) => {
          const lines = sec.split('\n');
          const firstLine = lines[0].trim();
          const isHeader =
            lines.length === 1 &&
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
              firstLine.startsWith('EMPLOYEE ID'));

          if (isHeader) {
            return (
              <h3
                key={idx}
                className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm mt-4 mb-2 uppercase tracking-wide border-l-4 border-red-600 pl-2.5"
              >
                {firstLine}
              </h3>
            );
          }

          return (
            <div key={idx} className="my-1.5 space-y-1">
              {lines.map((line, lIdx) => {
                const trimmed = line.trim();
                if (!trimmed) return null;

                if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
                  return (
                    <li key={lIdx} className="ml-4 list-disc text-slate-700 dark:text-slate-300 my-0.5">
                      {trimmed.substring(2)}
                    </li>
                  );
                }

                if (
                  trimmed === 'Yes / No' ||
                  trimmed === 'Agreement: Yes / No' ||
                  /^\s*(agreement\s*:\s*)?\s*\/\s*no/i.test(trimmed)
                ) {
                  const hasAgreementPrefix = /^agreement\s*:/i.test(trimmed);
                  return (
                    <div
                      key={lIdx}
                      className="my-2.5 p-3 bg-red-50/50 dark:bg-red-950/20 border border-dashed border-red-200 dark:border-red-900/50 rounded-xl flex flex-wrap items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                          {hasAgreementPrefix ? 'Undertaking Agreement:' : 'Declaration Confirmation:'}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800">
                          Interactive Clause Question (Yes / No)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-2xs">
                          [ ] Yes
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-2xs">
                          [ ] No
                        </span>
                      </div>
                    </div>
                  );
                }

                const colonIdx = trimmed.indexOf(':');
                if (colonIdx > 0 && colonIdx < 32 && !trimmed.startsWith('http')) {
                  const label = trimmed.substring(0, colonIdx + 1);
                  const value = trimmed.substring(colonIdx + 1);
                  return (
                    <div key={lIdx} className="flex flex-wrap gap-x-2 my-0.5">
                      <span className="font-semibold text-slate-900 dark:text-white">{label}</span>
                      <span className="text-slate-700 dark:text-slate-300">{value}</span>
                    </div>
                  );
                }

                return (
                  <p key={lIdx} className="text-slate-700 dark:text-slate-300 my-0.5 leading-relaxed">
                    {trimmed}
                  </p>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Signatures & Official Corporate Stamp Preview */}
      <div className="mt-8 pt-5 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 space-y-2">
          <span className="font-bold text-slate-700 dark:text-slate-200 block text-[11px] uppercase tracking-wider">
            Recipient Acceptance & Signature
          </span>
          <div className="h-16 flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900">
            <span className="text-slate-400 italic text-[11px]">
              [Captured Upon Digital Execution]
            </span>
          </div>
          <p className="font-semibold text-slate-900 dark:text-white">
            {form?.candidateFullName || 'Recipient Name'}
          </p>
          <p className="text-[10px] text-slate-400">Vahlay Consulting Recipient</p>
        </div>

        <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 space-y-2 text-right">
          <div className="flex items-center justify-between">
            {onUploadSirSignature && (
              <label className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-bold hover:bg-blue-100 cursor-pointer shadow-2xs">
                <Upload size={10} />
                <span>Upload</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  onChange={onUploadSirSignature}
                  className="hidden"
                />
              </label>
            )}
            {managerSignatureImage && onRemoveSirSignature && (
              <button
                type="button"
                onClick={onRemoveSirSignature}
                title="Remove signature"
                className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors ml-1 cursor-pointer"
              >
                <Trash2 size={11} />
              </button>
            )}
            <span className="font-bold text-slate-700 dark:text-slate-200 block text-[11px] uppercase tracking-wider ml-auto">
              Company Authorized Signatory
            </span>
          </div>
          <div className="h-16 flex items-center justify-end">
            {managerSignatureImage ? (
              <img
                src={managerSignatureImage}
                alt="Authorized Signatory Signature"
                className="max-h-full max-w-[180px] object-contain"
              />
            ) : (
              <div className="relative inline-block">
                <span className="font-serif italic text-2xl font-bold text-blue-900 dark:text-blue-300 tracking-wide select-none">
                  {form?.managerName?.split('(')[0]?.trim() || 'Harshad Prajapati'}
                </span>
              </div>
            )}
          </div>
          <p className="font-semibold text-slate-900 dark:text-white">
            {form?.managerName || 'Harshad Prajapati (HR/Manger)'}
          </p>
          <p className="text-[11px] text-slate-500">Authorized Human Resources Signatory</p>
          <p className="text-[10px] text-slate-400">{companyName}</p>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  DetailedDocumentViewer Component (Official View)                   */
/* ------------------------------------------------------------------ */
export const DetailedDocumentViewer = ({
  content,
  form,
  candidate,
  activeDocInfo,
  isSigned,
  signedDoc,
  managerSignatureImage,
  onUploadSirSignature,
  onRemoveSirSignature,
}) => {
  if (!content) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-400 italic">
        No document content to display.
      </div>
    );
  }

  const cleanOffice = cleanOfficeLocation(form?.officeLocation || candidate?.branch || 'Ahmedabad');
  const candidateLegalName =
    form?.candidateFullName ||
    candidate?.candidateName ||
    candidate?.fullName ||
    'Candidate';
  const resolvedContent = content.includes('{{')
    ? substitutePlaceholders(content, {
        ...form,
        ...candidate,
        candidateFullName: candidateLegalName,
        candidateName: candidateLegalName,
        officeLocation: cleanOffice,
      })
    : content;
  const isHtml = isHtmlContent(resolvedContent);

  // Format question cards to clearly display candidate's legal name and confirmation
  const formatQuestionCardsForViewer = (rawHtml) => {
    let qCounter = 0;
    const ansObj = signedDoc?.questionAnswers || form?.questionAnswers || {};
    const effectiveSigned = Boolean(isSigned || signedDoc?.status === 'signed' || signedDoc?.candidateHasSigned);

    return rawHtml.replace(
      /(?:<div[^>]*>\s*)?<p[^>]*>\s*(?:<strong>)?\s*(?:Agreement\s*:\s*)?Yes\s*\/\s*No\s*(?:<\/strong>)?\s*<\/p>(?:\s*<\/div>)?/gi,
      () => {
        const key = `clause_${qCounter++}`;
        const userAns = ansObj && (ansObj[key] || ansObj[String(qCounter - 1)]);

        // If the agreement is verified & signed by the candidate
        if (effectiveSigned) {
          const isYes = userAns === 'Yes' || (!userAns && effectiveSigned);
          return `<div class="my-3.5 p-3.5 rounded-xl border ${
            isYes
              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
          } flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div>
              <p class="font-bold text-xs uppercase tracking-wider ${
                isYes ? 'text-emerald-900 dark:text-emerald-200' : 'text-rose-900 dark:text-rose-200'
              }">Candidate Clause Undertaking &amp; Acceptance</p>
              <p class="text-xs ${
                isYes ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
              } mt-1">
                ${isYes ? 'Agreed &amp; Legally Verified by:' : 'Declined by:'} <strong>${candidateLegalName}</strong>
              </p>
            </div>
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
              isYes
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
            }">
              ${isYes ? 'Confirmed: [ Yes ]' : 'Declined: [ No ]'}
            </span>
          </div>`;
        }

        // If NOT signed yet (Draft / Preview / Pending Digital Signature)
        return `<div class="my-3.5 p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-850/50 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
          <div>
            <p class="font-bold text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Mandatory Clause Undertaking &amp; Acceptance
            </p>
            <p class="text-slate-500 dark:text-slate-400 mt-0.5 italic">
              Pending Candidate Digital Review &amp; Signature
            </p>
          </div>
          <div class="flex items-center gap-2 font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <span class="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300">[ &nbsp; ] Yes</span>
            <span class="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300">[ &nbsp; ] No</span>
          </div>
        </div>`;
      }
    );
  };

  const displayHtml = isHtml ? formatQuestionCardsForViewer(cleanWordHtml(resolvedContent)) : resolvedContent;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-10 max-w-4xl mx-auto space-y-6">
      {/* Official Header */}
      <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <img
            src="/vahlay-logo.jpg"
            alt="Vahlay Consulting Logo"
            className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-full shadow-xs ring-2 ring-slate-200 dark:ring-slate-700 bg-white shrink-0"
          />
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
              {form?.companyName || DEFAULT_ORGANIZATION}
            </h1>
            <p className="text-xs font-bold text-red-700 dark:text-red-400 tracking-widest uppercase mt-0.5">
              {activeDocInfo?.label || 'Official Documentation & Policy Agreement'}
            </p>
          </div>
        </div>
        <div className="text-left sm:text-right text-xs text-slate-500 dark:text-slate-400">
          <p className="font-bold text-slate-800 dark:text-slate-200">{cleanOffice} Office</p>
          <p className="mt-0.5">Date: {form?.agreementDate || new Date().toISOString().slice(0, 10)}</p>
        </div>
      </div>

      {/* Render Document Content - Properly formatted HTML text & tables, NOT raw code */}
      {isHtml ? (
        <div
          className="agreement-rich-rendered text-slate-800 dark:text-slate-200 text-sm leading-relaxed font-sans space-y-3
            [&_p]:my-2.5 [&_p]:leading-relaxed
            [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_table]:border [&_table]:border-slate-300 dark:[&_table]:border-slate-700 [&_table]:rounded-lg [&_table]:overflow-hidden
            [&_th]:border [&_th]:border-slate-300 dark:[&_th]:border-slate-700 [&_th]:bg-slate-100 dark:[&_th]:bg-slate-800 [&_th]:p-2.5 [&_th]:text-left [&_th]:font-bold [&_th]:text-slate-900 dark:[&_th]:text-white [&_th]:text-xs
            [&_td]:border [&_td]:border-slate-300 dark:[&_td]:border-slate-700 [&_td]:p-2.5 [&_td]:text-slate-800 dark:[&_td]:text-slate-200 [&_td]:text-xs [&_td]:align-top
            [&_td_p]:my-0.5
            [&_tr:nth-child(even)]:bg-slate-50/70 dark:[&_tr:nth-child(even)]:bg-slate-800/40
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2.5 [&_ul]:space-y-1
            [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2.5 [&_ol]:space-y-1
            [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-slate-900 dark:[&_h1]:text-white [&_h1]:mt-4 [&_h1]:mb-2
            [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-900 dark:[&_h2]:text-white [&_h2]:mt-3 [&_h2]:mb-1.5
            [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-slate-900 dark:[&_h3]:text-white [&_h3]:mt-3 [&_h3]:mb-1
            [&_strong]:font-bold [&_strong]:text-slate-900 dark:[&_strong]:text-white"
          dangerouslySetInnerHTML={{ __html: displayHtml }}
        />
      ) : (
        <div className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed font-sans space-y-3">
          {resolvedContent.split(/\n{2,}/).map((paragraph, pIdx) => (
            <p key={pIdx} className="leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      )}

      {/* Signatures & Corporate Seal Footer */}
      <div className="pt-8 mt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Company Signatory */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Authorized Signatory &amp; Corporate Seal
            </span>
            {onUploadSirSignature && (
              <div className="flex items-center gap-1.5">
                <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg shadow-2xs transition-colors">
                  <Upload size={12} />
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                    onChange={onUploadSirSignature}
                    className="hidden"
                  />
                </label>
                {managerSignatureImage && onRemoveSirSignature && (
                  <button
                    type="button"
                    onClick={onRemoveSirSignature}
                    title="Remove signature"
                    className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="h-16 flex items-center">
            {managerSignatureImage ? (
              <img
                src={managerSignatureImage}
                alt="Authorized Signatory Signature"
                className="max-h-full max-w-[200px] object-contain"
              />
            ) : (
              <span className="font-serif italic text-2xl font-bold text-blue-900 dark:text-blue-300 tracking-wide select-none">
                {form?.managerName ? form.managerName.split('(')[0].trim() : 'Harshad Prajapati'}
              </span>
            )}
          </div>
          <div>
            <p className="font-bold text-xs text-slate-900 dark:text-white">
              {form?.managerName || 'Harshad Prajapati (HR/Manger)'}
            </p>
            <p className="text-[11px] text-slate-500">Authorized Human Resources Signatory</p>
            <p className="text-[11px] text-slate-500">{form?.companyName || DEFAULT_ORGANIZATION}</p>
          </div>
        </div>

        {/* Recipient Signature */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-2 text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Recipient Signature &amp; Acceptance
          </span>
          <div className="h-16 flex items-center justify-end">
            {signedDoc?.candidateSignatureImage ? (
              <img
                src={signedDoc.candidateSignatureImage}
                alt="Digital Signature"
                className="max-h-full object-contain"
              />
            ) : (
              <span className="text-slate-400 italic text-xs">
                {isSigned ? 'Digitally Signed Online' : 'Pending Digital Signature'}
              </span>
            )}
          </div>
          <div>
            <p className="font-bold text-xs text-slate-900 dark:text-white">
              {signedDoc?.candidateName || form?.candidateFullName || 'Recipient Name'}
            </p>
            <p className="text-[11px] text-slate-500">
              {form?.recipientType === 'employee' ? 'Active Employee' : 'Candidate'}
            </p>
            {signedDoc?.signedAt && (
              <p className="text-[10px] text-emerald-600 font-semibold mt-1">
                Signed on {new Date(signedDoc.signedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  OverallStatusBadge & Theme Styles for Executive Ribbon & Selector  */
/* ------------------------------------------------------------------ */
export const OverallStatusBadge = ({ status, signedCount = 0, totalCount = 7 }) => {
  if (status === 'All Documents Signed' || status === 'All 7 Documents Signed' || (signedCount > 0 && signedCount >= totalCount)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 dark:border-emerald-800 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 shadow-2xs">
        <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" /> All {totalCount} Documents Signed
      </span>
    );
  }
  if (signedCount > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 dark:bg-blue-950/60 dark:border-blue-800 px-2.5 py-1 text-xs font-bold text-blue-800 dark:text-blue-300 shadow-2xs">
        <CheckCircle2 size={12} className="text-blue-600 dark:text-blue-400" /> {signedCount} of {totalCount} Signed
      </span>
    );
  }
  if (status === 'Pending Signature' || (typeof status === 'string' && status.includes('Pending'))) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/60 dark:border-amber-800 px-2.5 py-1 text-xs font-bold text-amber-800 dark:text-amber-300 shadow-2xs">
        <Clock size={12} className="text-amber-600 dark:text-amber-400 animate-pulse" /> Pending Signature
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 shadow-2xs">
      No Agreement
    </span>
  );
};

export const THEME_STYLES = {
  offer: {
    active: 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white border-2 border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-xs',
    inactive: 'bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 shadow-2xs',
    iconActive: 'text-blue-600 dark:text-blue-400',
    iconInactive: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
  },
  appointment: {
    active: 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white border-2 border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-xs',
    inactive: 'bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 shadow-2xs',
    iconActive: 'text-sky-600 dark:text-sky-400',
    iconInactive: 'text-sky-600 dark:text-sky-400',
    iconBg: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400',
    badge: 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
  },
  policy: {
    active: 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white border-2 border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-xs',
    inactive: 'bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 shadow-2xs',
    iconActive: 'text-rose-600 dark:text-rose-400',
    iconInactive: 'text-rose-600 dark:text-rose-400',
    iconBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
    badge: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
  },
  assessment: {
    active: 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white border-2 border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-xs',
    inactive: 'bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 shadow-2xs',
    iconActive: 'text-amber-600 dark:text-amber-400',
    iconInactive: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  },
  salary: {
    active: 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white border-2 border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-xs',
    inactive: 'bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 shadow-2xs',
    iconActive: 'text-emerald-600 dark:text-emerald-400',
    iconInactive: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  },
  revision: {
    active: 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white border-2 border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-xs',
    inactive: 'bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 shadow-2xs',
    iconActive: 'text-pink-600 dark:text-pink-400',
    iconInactive: 'text-pink-600 dark:text-pink-400',
    iconBg: 'bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400',
    badge: 'bg-pink-50 text-pink-700 border border-pink-200 dark:bg-pink-950/60 dark:text-pink-300 dark:border-pink-800',
  },
  nda: {
    active: 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white border-2 border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-xs',
    inactive: 'bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 shadow-2xs',
    iconActive: 'text-purple-600 dark:text-purple-400',
    iconInactive: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400',
    badge: 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
  },
  relieving: {
    active: 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white border-2 border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-xs',
    inactive: 'bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 shadow-2xs',
    iconActive: 'text-teal-600 dark:text-teal-400',
    iconInactive: 'text-teal-600 dark:text-teal-400',
    iconBg: 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400',
    badge: 'bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800',
  },
  fnf: {
    active: 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white border-2 border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-xs',
    inactive: 'bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 shadow-2xs',
    iconActive: 'text-indigo-600 dark:text-indigo-400',
    iconInactive: 'text-indigo-600 dark:text-indigo-400',
    iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400',
    badge: 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
  },
  acknowledgement: {
    active: 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white border-2 border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-xs',
    inactive: 'bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 shadow-2xs',
    iconActive: 'text-cyan-600 dark:text-cyan-400',
    iconInactive: 'text-cyan-600 dark:text-cyan-400',
    iconBg: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400',
    badge: 'bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800',
  },
};

/* ------------------------------------------------------------------ */
/*  Main AgreementModule Component                                     */
/* ------------------------------------------------------------------ */
export default function AgreementModule({
  initialCandidateId = '',
  activeTab = 'studio',
  onTabChange,
  onCandidateChange,
  hideSubtabs = false,
}) {
  // Subtab: 'studio' | 'vault' | 'joining'
  const [currentTab, setCurrentTab] = useState(activeTab || 'studio');

  useEffect(() => {
    if (activeTab && activeTab !== currentTab) {
      setCurrentTab(activeTab);
    }
  }, [activeTab]);

  const handleTabSelect = (tabId) => {
    setCurrentTab(tabId);
    if (onTabChange) onTabChange(tabId);
  };

  // Roster Type: 'employees' (default) | 'candidates'
  const [rosterType, setRosterType] = useState('employees');

  // Directory vs Individual Agreement view - Employees list comes first
  const [showRosterList, setShowRosterList] = useState(true);

  // Roster Directory filters
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterBranchFilter, setRosterBranchFilter] = useState('all');
  const [rosterDeptFilter, setRosterDeptFilter] = useState('all');
  const [rosterAgreementFilter, setRosterAgreementFilter] = useState('all');

  // Active document type (policy, assessment, salary, nda, relieving, fnf, acknowledgement, offer, appointment, revision)
  const [activeType, setActiveType] = useState('policy');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('all'); // 'all' | 'onboarding' | 'compliance'
  const [viewMode, setViewMode] = useState('detail'); // 'detail' (official) | 'editor' (studio)
  const [_previewMode, _setPreviewMode] = useState('formatted'); // 'formatted' | 'raw'
  const [showCandidateDetailsForm, setShowCandidateDetailsForm] = useState(false);

  // Data states
  const [candidates, setCandidates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [_selectedPersonId, setSelectedPersonId] = useState(initialCandidateId);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [candidateAgreements, setCandidateAgreements] = useState([]);
  const [allAgreements, setAllAgreements] = useState([]);
  const [_loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [vaultSearch, setVaultSearch] = useState('');
  const [vaultStatusFilter, setVaultStatusFilter] = useState('all');
  const [updatingJoiningDateId, setUpdatingJoiningDateId] = useState(null);

  // Modals & Notifications
  const [viewSignedModal, setViewSignedModal] = useState(null);
  const [agreementToDelete, setAgreementToDelete] = useState(null);
  const [signingModalInfo, setSigningModalInfo] = useState(null);
  const [createdAgreementInfo, setCreatedAgreementInfo] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedAgreementId, setCopiedAgreementId] = useState(null);
  const [showAllCreatedAgreements, setShowAllCreatedAgreements] = useState(false);
  const [copyTemplateToast, setCopyTemplateToast] = useState(false);
  const [insertedPlaceholderNotice, setInsertedPlaceholderNotice] = useState('');

  // Editor mode & Preview mode states for side-by-side studio
  const [editorMode, setEditorMode] = useState('visual'); // 'visual' (WYSIWYG) | 'html' (HTML Code)
  const [rightPreviewMode, setRightPreviewMode] = useState('document'); // 'document' (Letterhead) | 'text' (Plain Text)
  const visualEditorRef = useRef(null);

  // Editable templates per type
  const [templateTexts, setTemplateTexts] = useState({ ...DEFAULT_TEMPLATES });
  const textareaRef = useRef(null);

  // Form fields for dynamic substitution
  const [form, setForm] = useState(() => ({
    candidateFullName: '',
    candidateEmail: '',
    jobTitle: '',
    department: '',
    officeLocation: 'Ahmedabad',
    employeeId: '',
    joiningDate: '',
    companyName: DEFAULT_ORGANIZATION,
    agreementDate: new Date().toISOString().slice(0, 10),
    managerName: 'Harshad Prajapati (HR/Manger)',
    candidateSignature: '',
    recipientType: 'candidate',

    // salary & offer & appointment
    baseSalary: '25000',
    performanceIncentive: '5000',
    securityDepositAmount: '5000',
    fullPackage: '35000',
    monthlyInstallationTarget: '10',
    monthlySalesTarget: '15',
    offerExpiryDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),

    // revision
    effectiveDate: new Date().toISOString().slice(0, 10),
    revisedJobTitle: '',
    revisedBaseSalary: '30000',
    revisedIncentive: '7000',
    revisedFullPackage: '42000',

    // assessment
    trainingStartDate: '',
    trainingEndDate: '',
    trainerName: '',
    teamLeaderName: '',
    overallResult: 'Pass',
    recommendation:
      'Demonstrated strong learning capability, professionalism, and dedication throughout the 8-day training program.',
    approvedBy: '',

    // relieving & fnf
    resignationDate: new Date().toISOString().slice(0, 10),
    lastWorkingDay: '',
    reasonForLeaving: '',
    noticePeriodServed: 'Yes',
    exitInterviewDone: 'Yes',
    fnfRemarks: 'All dues cleared successfully.',
  }));

  // Uploaded dossier documents for Acknowledgement agreements
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [sirSignatureImage, setSirSignatureImage] = useState(
    () => localStorage.getItem('company_sir_signature') || ''
  );

  // Fetch initial candidates, employees, and all agreements
  useEffect(() => {
    fetchCandidates();
    fetchEmployees();
    fetchAllAgreements();
  }, []);

  // When initialCandidateId changes externally (e.g. from candidate row click)
  useEffect(() => {
    if (initialCandidateId) {
      setSelectedPersonId(initialCandidateId);
      if (candidates.length > 0) {
        const match = candidates.find((c) => String(c._id) === String(initialCandidateId));
        if (match) {
          selectCandidate(match);
          setRosterType('candidates');
          setShowRosterList(false);
        }
      }
    } else {
      setShowRosterList(true);
      setSelectedPerson(null);
      setSelectedPersonId('');
    }
  }, [initialCandidateId, candidates]);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/interviews');
      const list = asArray(res.data);
      setCandidates(list);

      if (initialCandidateId) {
        const match = list.find((c) => String(c._id) === String(initialCandidateId));
        if (match) {
          selectCandidate(match);
          setShowRosterList(false);
        }
      }
    } catch (err) {
      feedback.error(getApiError(err, 'Failed to fetch candidate roster'));
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/api/users');
      setEmployees(asArray(res.data));
    } catch (err) {
      console.error('Error fetching employees roster:', err);
    }
  };

  const fetchAllAgreements = async () => {
    try {
      const res = await api.get('/api/agreements');
      setAllAgreements(asArray(res.data));
    } catch (err) {
      console.error('Error fetching agreements vault:', err);
    }
  };

  // Switch between Candidate and Employee Roster
  const handleRosterTypeChange = (type) => {
    setRosterType(type);
    setRosterSearch('');
    setRosterBranchFilter('all');
    setRosterDeptFilter('all');
    setRosterAgreementFilter('all');
    if (!showRosterList) {
      if (type === 'candidates') {
        if (candidates.length > 0) selectCandidate(candidates[0]);
      } else {
        if (employees.length > 0) selectEmployee(employees[0]);
      }
    }
  };

  const handleOpenPersonAgreement = (person) => {
    if (!person) return;
    if (rosterType === 'employees') {
      selectEmployee(person);
    } else {
      selectCandidate(person);
    }
    setShowRosterList(false);
  };

  const handleBackToRosterList = () => {
    setShowRosterList(true);
    setSelectedPerson(null);
    setSelectedPersonId('');
    if (onCandidateChange) onCandidateChange('');
  };

  const selectCandidate = (cand) => {
    if (!cand) return;
    setRosterType('candidates');
    setSelectedPerson(cand);
    setSelectedPersonId(cand._id);
    if (onCandidateChange) onCandidateChange(cand._id);

    setForm((prev) => ({
      ...prev,
      candidateFullName: cand.candidateName || prev.candidateFullName,
      candidateEmail: cand.email || prev.candidateEmail,
      jobTitle: cand.candidatePost || cand.positionAppliedFor || prev.jobTitle,
      department: cand.department || 'General',
      officeLocation: cleanOfficeLocation(cand.branch || prev.officeLocation),
      employeeId: cand.employeeId || cand.rollNo || prev.employeeId,
      joiningDate: cand.joiningDateProvided || cand.joiningDate || prev.joiningDate,
      recipientType: 'candidate',
    }));

    loadCandidateAgreements(cand._id);
  };

  const selectEmployee = (emp) => {
    if (!emp) return;
    setRosterType('employees');
    setSelectedPerson(emp);
    setSelectedPersonId(emp._id);
    if (onCandidateChange) onCandidateChange(emp._id);

    setForm((prev) => ({
      ...prev,
      candidateFullName: emp.name || prev.candidateFullName,
      candidateEmail: emp.email || prev.candidateEmail,
      jobTitle: emp.designation || emp.role?.name || prev.jobTitle,
      department: emp.department || 'General',
      officeLocation: cleanOfficeLocation(emp.branch || prev.officeLocation),
      employeeId: emp.employeeId || prev.employeeId,
      joiningDate: emp.joiningDate ? new Date(emp.joiningDate).toISOString().slice(0, 10) : prev.joiningDate,
      recipientType: 'employee',
    }));

    loadEmployeeAgreements(emp._id);
  };

  const loadCandidateAgreements = async (candId) => {
    try {
      const res = await api.get(`/api/agreements?candidateId=${candId}`);
      const ags = asArray(res.data);
      setCandidateAgreements(ags);

      const loadedTemplates = {};
      ags.forEach((ag) => {
        if (ag.templateId && ag.templateContent) {
          loadedTemplates[ag.templateId] = cleanHtmlTemplateText(ag.templateContent);
        }
      });
      if (Object.keys(loadedTemplates).length > 0) {
        setTemplateTexts((prev) => ({ ...prev, ...loadedTemplates }));
      }

      const currentAg = ags.find((a) => a.templateId === activeType);
      if (currentAg) {
        if (currentAg.templateContent) {
          const cleaned = cleanHtmlTemplateText(currentAg.templateContent);
          setTemplateTexts((prev) => ({ ...prev, [activeType]: cleaned }));
          if (editorMode === 'visual' && visualEditorRef.current) {
            visualEditorRef.current.innerHTML = cleaned;
          }
        }
        if (currentAg.uploadedDocuments && currentAg.uploadedDocuments.length > 0) {
          setUploadedDocuments(currentAg.uploadedDocuments);
        }
        if (currentAg.fields) {
          setForm((prev) => ({ ...prev, ...currentAg.fields }));
        }
      }
    } catch (err) {
      console.error('Error loading candidate agreements:', err);
    }
  };

  const loadEmployeeAgreements = async (empId) => {
    try {
      const res = await api.get(`/api/agreements?employeeId=${empId}`);
      const ags = asArray(res.data);
      setCandidateAgreements(ags);

      const loadedTemplates = {};
      ags.forEach((ag) => {
        if (ag.templateId && ag.templateContent) {
          loadedTemplates[ag.templateId] = cleanHtmlTemplateText(ag.templateContent);
        }
      });
      if (Object.keys(loadedTemplates).length > 0) {
        setTemplateTexts((prev) => ({ ...prev, ...loadedTemplates }));
      }

      const currentAg = ags.find((a) => a.templateId === activeType);
      if (currentAg) {
        if (currentAg.templateContent) {
          const cleaned = cleanHtmlTemplateText(currentAg.templateContent);
          setTemplateTexts((prev) => ({ ...prev, [activeType]: cleaned }));
          if (editorMode === 'visual' && visualEditorRef.current) {
            visualEditorRef.current.innerHTML = cleaned;
          }
        }
        if (currentAg.uploadedDocuments && currentAg.uploadedDocuments.length > 0) {
          setUploadedDocuments(currentAg.uploadedDocuments);
        }
        if (currentAg.fields) {
          setForm((prev) => ({ ...prev, ...currentAg.fields }));
        }
      }
    } catch (err) {
      console.error('Error loading employee agreements:', err);
    }
  };

  const handleTabChange = (typeKey) => {
    setActiveType(typeKey);
    const existing = candidateAgreements.find((a) => a.templateId === typeKey);
    if (existing) {
      if (existing.templateContent) {
        const cleaned = cleanHtmlTemplateText(existing.templateContent);
        setTemplateTexts((prev) => ({ ...prev, [typeKey]: cleaned }));
        if (editorMode === 'visual' && visualEditorRef.current) {
          visualEditorRef.current.innerHTML = cleaned;
        }
      }
      if (existing.uploadedDocuments) {
        setUploadedDocuments(existing.uploadedDocuments);
      }
      if (existing.fields) {
        setForm((prev) => ({ ...prev, ...existing.fields }));
      }
    } else {
      const defaultTpl = cleanHtmlTemplateText(templateTexts[typeKey] || DEFAULT_TEMPLATES[typeKey] || '');
      if (!templateTexts[typeKey]) {
        setTemplateTexts((prev) => ({ ...prev, [typeKey]: defaultTpl }));
      }
      if (editorMode === 'visual' && visualEditorRef.current) {
        visualEditorRef.current.innerHTML = defaultTpl;
      }
    }
  };

  // Compute live substituted document preview HTML & plain text
  const currentSubstitutedHtml = useMemo(() => {
    const rawTemplate = ensureHtmlContent(templateTexts[activeType] || DEFAULT_TEMPLATES[activeType] || '');
    return substitutePlaceholders(rawTemplate, {
      ...form,
      uploadedDocuments,
    });
  }, [templateTexts, activeType, form, uploadedDocuments]);

  const currentSubstitutedText = useMemo(() => {
    return stripHtmlToDocumentText(currentSubstitutedHtml);
  }, [currentSubstitutedHtml]);

  // Insert placeholder helper in template editor
  const _insertPlaceholder = (ph) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = templateTexts[activeType] || '';
    const updated = currentText.substring(0, start) + ph + currentText.substring(end);

    setTemplateTexts((prev) => ({ ...prev, [activeType]: updated }));
    setInsertedPlaceholderNotice(`Inserted ${ph}`);
    setTimeout(() => setInsertedPlaceholderNotice(''), 2500);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + ph.length, start + ph.length);
    }, 0);
  };

  const insertTextAtCursor = (snippet) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = templateTexts[activeType] || '';
    const updated = currentText.substring(0, start) + snippet + currentText.substring(end);

    setTemplateTexts((prev) => ({ ...prev, [activeType]: updated }));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 0);
  };

  const handleCleanWordPaste = () => {
    const current = templateTexts[activeType] || '';
    const cleaned = ensureHtmlContent(current);
    setTemplateTexts((prev) => ({ ...prev, [activeType]: cleaned }));
    if (editorMode === 'visual' && visualEditorRef.current) {
      visualEditorRef.current.innerHTML = cleaned;
    }
    setInsertedPlaceholderNotice('Word formatting cleaned & normalized!');
    setTimeout(() => setInsertedPlaceholderNotice(''), 2500);
    feedback.success('Cleaned MS Word formatting, quotes, and bullet symbols');
  };

  // Word Paste Interceptor: Normalizes Word bullets, smart quotes, tabs, and line breaks automatically
  const handleWordPaste = (e) => {
    const html = e.clipboardData?.getData('text/html');
    const text = e.clipboardData?.getData('text/plain');
    if (editorMode === 'visual') {
      if (html) {
        e.preventDefault();
        const cleaned = cleanWordHtml(html);
        document.execCommand('insertHTML', false, cleaned);
        if (visualEditorRef.current) {
          const val = visualEditorRef.current.innerHTML;
          setTemplateTexts((prev) => ({ ...prev, [activeType]: val }));
        }
        setInsertedPlaceholderNotice('Pasted text automatically normalized from Word!');
        setTimeout(() => setInsertedPlaceholderNotice(''), 2500);
        return;
      }
      if (text) {
        e.preventDefault();
        const cleaned = cleanWordText(text);
        document.execCommand('insertText', false, cleaned);
        if (visualEditorRef.current) {
          const val = visualEditorRef.current.innerHTML;
          setTemplateTexts((prev) => ({ ...prev, [activeType]: val }));
        }
        setInsertedPlaceholderNotice('Pasted text automatically normalized from Word!');
        setTimeout(() => setInsertedPlaceholderNotice(''), 2500);
        return;
      }
    }

    if (text) {
      e.preventDefault();
      const cleaned = cleanWordText(text);
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart ?? 0;
        const end = textarea.selectionEnd ?? 0;
        const curVal = templateTexts[activeType] || '';
        const newVal = curVal.substring(0, start) + cleaned + curVal.substring(end);
        setTemplateTexts((prev) => ({
          ...prev,
          [activeType]: newVal,
        }));
        setInsertedPlaceholderNotice('Pasted text automatically normalized from Word!');
        setTimeout(() => setInsertedPlaceholderNotice(''), 2500);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + cleaned.length, start + cleaned.length);
        }, 0);
      }
    }
  };

  const handleUploadCustomTemplateFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileName = file.name || 'template';
      const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();

      if (ext === '.docx') {
        feedback.info('Reading MS Word .docx template...');
        const zip = await JSZip.loadAsync(file);
        const docXml = await zip.file('word/document.xml')?.async('text');
        if (docXml) {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(docXml, 'application/xml');
          const paragraphs = Array.from(xmlDoc.getElementsByTagName('w:p'));
          const lines = paragraphs
            .map((p) => {
              const textNodes = Array.from(p.getElementsByTagName('w:t'));
              return textNodes.map((t) => t.textContent).join('');
            })
            .filter((line) => line !== undefined);
          const rawText = lines.join('\n\n');
          const htmlContent = textToHtml(cleanWordText(rawText));
          setTemplateTexts((prev) => ({ ...prev, [activeType]: htmlContent }));
          if (editorMode === 'visual' && visualEditorRef.current) {
            visualEditorRef.current.innerHTML = htmlContent;
          }
          feedback.success(`Custom template loaded from "${fileName}"`);
        } else {
          feedback.error('Unable to parse word/document.xml from the .docx file');
        }
      } else if (ext === '.html' || ext === '.htm') {
        const reader = new FileReader();
        reader.onload = (event) => {
          const raw = event.target.result;
          const cleanedHtml = cleanWordHtml(raw);
          setTemplateTexts((prev) => ({ ...prev, [activeType]: cleanedHtml }));
          if (editorMode === 'visual' && visualEditorRef.current) {
            visualEditorRef.current.innerHTML = cleanedHtml;
          }
          feedback.success(`Custom HTML template loaded from "${fileName}"`);
        };
        reader.readAsText(file);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const raw = event.target.result;
          const htmlContent = textToHtml(cleanWordText(raw));
          setTemplateTexts((prev) => ({ ...prev, [activeType]: htmlContent }));
          if (editorMode === 'visual' && visualEditorRef.current) {
            visualEditorRef.current.innerHTML = htmlContent;
          }
          feedback.success(`Custom template loaded from "${fileName}"`);
        };
        reader.readAsText(file);
      }
    } catch (err) {
      console.error('Error importing custom template file:', err);
      feedback.error('Failed to import template: ' + (err.message || 'Unknown error'));
    } finally {
      e.target.value = '';
    }
  };

  const commonPlaceholders = [
    { ph: '{{candidateName}}', label: 'Candidate Name' },
    { ph: '{{candidateEmail}}', label: 'Email' },
    { ph: '{{jobTitle}}', label: 'Designation' },
    { ph: '{{department}}', label: 'Department' },
    { ph: '{{officeLocation}}', label: 'Location' },
    { ph: '{{joiningDate}}', label: 'Joining Date' },
    { ph: '{{agreementDate}}', label: 'Agreement Date' },
    { ph: '{{companyName}}', label: 'Company Name' },
    { ph: '{{managerName}}', label: 'Signatory / Manager' },
  ];

  const templateSpecificPlaceholders = {
    offer: [
      { ph: '{{baseSalary}}', label: 'Base Salary' },
      { ph: '{{performanceIncentive}}', label: 'Incentive' },
      { ph: '{{fullPackage}}', label: 'Total CTC' },
    ],
    appointment: [
      { ph: '{{baseSalary}}', label: 'Base Salary' },
      { ph: '{{fullPackage}}', label: 'Total CTC' },
    ],
    policy: [],
    assessment: [
      { ph: '{{trainingStartDate}}', label: 'Start Date' },
      { ph: '{{trainingEndDate}}', label: 'End Date' },
      { ph: '{{trainerName}}', label: 'Trainer Name' },
      { ph: '{{teamLeaderName}}', label: 'TL Name' },
      { ph: '{{trainerRecommendation}}', label: 'Recommendation' },
      { ph: '{{overallResult}}', label: 'Result' },
      { ph: '{{approvedBy}}', label: 'Approved By' },
    ],
    salary: [
      { ph: '{{baseSalary}}', label: 'Base Salary' },
      { ph: '{{securityDepositAmount}}', label: 'Security Deposit' },
      { ph: '{{fullPackage}}', label: 'Full Package' },
      { ph: '{{monthlyInstallationTarget}}', label: 'Install Target' },
      { ph: '{{monthlySalesTarget}}', label: 'Sales Target' },
    ],
    revision: [
      { ph: '{{employeeId}}', label: 'Employee ID' },
      { ph: '{{effectiveDate}}', label: 'Effective Date' },
      { ph: '{{revisedJobTitle}}', label: 'Revised Designation' },
      { ph: '{{revisedBaseSalary}}', label: 'Revised Salary' },
      { ph: '{{revisedIncentive}}', label: 'Revised Incentive' },
      { ph: '{{revisedFullPackage}}', label: 'Revised Total CTC' },
    ],
    nda: [],
    relieving: [
      { ph: '{{resignationDate}}', label: 'Resignation Date' },
      { ph: '{{lastWorkingDay}}', label: 'Relieving Date' },
      { ph: '{{noticePeriodServed}}', label: 'Notice Served' },
      { ph: '{{employeeId}}', label: 'Employee ID' },
    ],
    fnf: [
      { ph: '{{lastWorkingDay}}', label: 'Last Working Day' },
      { ph: '{{reasonForLeaving}}', label: 'Reason for Leaving' },
      { ph: '{{noticePeriodServed}}', label: 'Notice Served' },
      { ph: '{{exitInterviewDone}}', label: 'Exit Interview' },
      { ph: '{{fnfRemarks}}', label: 'FNF Remarks' },
    ],
    acknowledgement: [
      { ph: '{{employeeId}}', label: 'Employee ID' },
      { ph: '{{documentsList}}', label: 'Documents List' },
    ],
  };

  const _activePlaceholderList = useMemo(() => {
    const seen = new Set();
    const list = [];

    // Add common placeholders
    for (const ph of commonPlaceholders) {
      if (!seen.has(ph.ph)) {
        seen.add(ph.ph);
        list.push({ ...ph, isCommon: true });
      }
    }

    // Add template-specific placeholders, ignoring any duplicates
    const specific = templateSpecificPlaceholders[activeType] || [];
    for (const ph of specific) {
      if (!seen.has(ph.ph)) {
        seen.add(ph.ph);
        list.push({ ...ph, isCommon: false });
      }
    }

    return list;
  }, [activeType]);

  const availableInsertVariables = useMemo(() => {
    const list = [
      { ph: '{{candidateName}}', label: 'Candidate Name' },
      { ph: '{{candidateEmail}}', label: 'Email' },
      { ph: '{{jobTitle}}', label: 'Designation' },
      { ph: '{{department}}', label: 'Department' },
      { ph: '{{officeLocation}}', label: 'Location' },
      { ph: '{{joiningDate}}', label: 'Joining Date' },
      { ph: '{{agreementDate}}', label: 'Agreement Date' },
      { ph: '{{companyName}}', label: 'Company Name' },
      { ph: '{{managerName}}', label: 'Signatory Name' },
      { ph: '{{resignationDate}}', label: 'Resignation Date' },
      { ph: '{{lastWorkingDay}}', label: 'Relieving Date' },
      { ph: '{{noticePeriodServed}}', label: 'Notice Served' },
      { ph: '{{employeeId}}', label: 'Employee ID' },
      { ph: '{{managerName}}', label: 'Reporting Manager' },
      { ph: '{{offerExpiryDate}}', label: 'Offer Expiry' },
      { ph: '{{baseSalary}}', label: 'Base Salary' },
      { ph: '{{fullPackage}}', label: 'Full Package' },
      { ph: '{{performanceIncentive}}', label: 'Incentive' },
      { ph: '{{fullPackage}}', label: 'Annual CTC' },
    ];
    const specific = templateSpecificPlaceholders[activeType] || [];
    const seen = new Set(list.map((i) => i.ph));
    for (const s of specific) {
      if (!seen.has(s.ph)) {
        seen.add(s.ph);
        list.push(s);
      }
    }
    return list;
  }, [activeType]);

  // Seamless editor mode switching: sync content between visual contentEditable and html textarea
  const handleSwitchEditorMode = (newMode) => {
    if (newMode === editorMode) return;
    if (editorMode === 'visual' && visualEditorRef.current) {
      const currentHtml = visualEditorRef.current.innerHTML;
      if (currentHtml && currentHtml.trim() && currentHtml !== '<br>') {
        setTemplateTexts((prev) => ({ ...prev, [activeType]: currentHtml }));
      }
    } else if (editorMode === 'html' && textareaRef.current) {
      const currentVal = textareaRef.current.value;
      setTemplateTexts((prev) => ({ ...prev, [activeType]: ensureHtmlContent(currentVal) }));
    }
    setEditorMode(newMode);
  };

  // Synchronize visual editor innerHTML when template type, view mode, editor mode, or template texts change
  useEffect(() => {
    if (editorMode === 'visual' && visualEditorRef.current && viewMode === 'editor') {
      const isFocused =
        document.activeElement === visualEditorRef.current ||
        visualEditorRef.current.contains(document.activeElement);
      const curHtml = ensureHtmlContent(templateTexts[activeType] || DEFAULT_TEMPLATES[activeType] || '');
      const isBlank =
        !visualEditorRef.current.innerHTML ||
        visualEditorRef.current.innerHTML === '<br>' ||
        visualEditorRef.current.innerHTML.trim() === '';
      if (isBlank || (!isFocused && visualEditorRef.current.innerHTML !== curHtml)) {
        visualEditorRef.current.innerHTML = curHtml;
      }
    }
  }, [activeType, editorMode, viewMode, templateTexts]);

  const handleInsertQuestionCard = (cardType = 'agreement') => {
    const cardHtml = `
<div style="margin: 14px 0; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
  <p style="margin: 0; font-weight: bold; color: #b91c1c;">${cardType === 'agreement' ? 'Agreement: Yes / No' : 'Yes / No'}</p>
</div>
`;
    if (editorMode === 'visual') {
      if (visualEditorRef.current) {
        visualEditorRef.current.focus();
        document.execCommand('insertHTML', false, cardHtml);
        const val = visualEditorRef.current.innerHTML;
        setTemplateTexts((prev) => ({ ...prev, [activeType]: val }));
      }
    } else {
      insertTextAtCursor(cardHtml);
    }
  };

  const execVisualCommand = (command, value = null) => {
    if (editorMode === 'visual') {
      if (visualEditorRef.current) {
        visualEditorRef.current.focus();
        document.execCommand(command, false, value);
        const newHtml = visualEditorRef.current.innerHTML;
        setTemplateTexts((prev) => ({ ...prev, [activeType]: newHtml }));
      }
    } else {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart ?? 0;
      const end = textarea.selectionEnd ?? 0;
      const curVal = templateTexts[activeType] || '';
      const selected = curVal.substring(start, end);
      let wrapped = '';
      if (command === 'bold') wrapped = `<strong>${selected || 'bold text'}</strong>`;
      else if (command === 'italic') wrapped = `<em>${selected || 'italic text'}</em>`;
      else if (command === 'underline') wrapped = `<u>${selected || 'underlined text'}</u>`;
      else if (command === 'formatBlock' && value === 'h2') wrapped = `<h2>${selected || 'Heading 2'}</h2>`;
      else if (command === 'formatBlock' && value === 'h3') wrapped = `<h3>${selected || 'Heading 3'}</h3>`;
      else if (command === 'formatBlock' && value === 'p') wrapped = `<p>${selected || 'Paragraph text'}</p>`;
      else if (command === 'insertUnorderedList') wrapped = `<ul>\n  <li>${selected || 'List item'}</li>\n</ul>`;
      else if (command === 'insertOrderedList') wrapped = `<ol>\n  <li>${selected || 'List item'}</li>\n</ol>`;
      else wrapped = selected;

      const newVal = curVal.substring(0, start) + wrapped + curVal.substring(end);
      setTemplateTexts((prev) => ({ ...prev, [activeType]: newVal }));
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + wrapped.length, start + wrapped.length);
      }, 0);
    }
  };

  const insertTableTemplate = () => {
    const tableHtml = `
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
`;
    if (editorMode === 'visual') {
      if (visualEditorRef.current) {
        visualEditorRef.current.focus();
        document.execCommand('insertHTML', false, tableHtml);
        const val = visualEditorRef.current.innerHTML;
        setTemplateTexts((prev) => ({ ...prev, [activeType]: val }));
      }
    } else {
      insertTextAtCursor(tableHtml);
    }
  };

  const insertYesNoCard = () => {
    const cardHtml = `
<div style="margin: 16px 0; padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
  <p style="margin: 0 0 8px 0; font-weight: bold; color: #1e293b;">Candidate Declaration &amp; Acceptance:</p>
  <p style="margin: 0 0 10px 0; font-size: 13px; color: #475569;">I hereby confirm that I have reviewed, understood, and accepted all terms, targets, and policies detailed above.</p>
  <p style="margin: 0; font-weight: bold; color: #b91c1c;">Agreement: Yes / No</p>
</div>
`;
    if (editorMode === 'visual') {
      if (visualEditorRef.current) {
        visualEditorRef.current.focus();
        document.execCommand('insertHTML', false, cardHtml);
        const val = visualEditorRef.current.innerHTML;
        setTemplateTexts((prev) => ({ ...prev, [activeType]: val }));
      }
    } else {
      insertTextAtCursor(cardHtml);
    }
  };

  const handleInsertVariable = (phTag) => {
    if (editorMode === 'visual') {
      if (visualEditorRef.current) {
        visualEditorRef.current.focus();
        document.execCommand('insertText', false, phTag);
        const val = visualEditorRef.current.innerHTML;
        setTemplateTexts((prev) => ({ ...prev, [activeType]: val }));
      }
    } else {
      insertTextAtCursor(phTag);
    }
    setInsertedPlaceholderNotice(phTag);
    setTimeout(() => setInsertedPlaceholderNotice(''), 2500);
  };

  const handleInsertLink = () => {
    const url = window.prompt('Enter link URL (e.g. https://...):', 'https://');
    if (url) {
      execVisualCommand('createLink', url);
    }
  };

  const handleFormatHeader = () => {
    if (editorMode === 'visual') {
      execVisualCommand('formatBlock', 'h2');
    } else {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart ?? 0;
      const end = textarea.selectionEnd ?? 0;
      const curVal = templateTexts[activeType] || '';
      const selected = curVal.substring(start, end).trim() || 'SECTION HEADER';
      const replacement = `\n\n${selected.toUpperCase()}\n`;
      const newVal = curVal.substring(0, start) + replacement + curVal.substring(end);
      setTemplateTexts((prev) => ({ ...prev, [activeType]: newVal }));
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + replacement.length, start + replacement.length);
      }, 0);
    }
  };

  const handleFormatBullet = () => {
    if (editorMode === 'visual') {
      execVisualCommand('insertUnorderedList');
    } else {
      insertTextAtCursor('\n- ');
    }
  };

  const handleFormatNumbered = () => {
    if (editorMode === 'visual') {
      execVisualCommand('insertOrderedList');
    } else {
      insertTextAtCursor('\n1. ');
    }
  };

  const handleResetToDefaultTemplate = async () => {
    const docTitle = DOC_TYPES.find((d) => d.key === activeType)?.label || activeType;
    if (
      !window.confirm(
        `Reset "${docTitle}" template to official system default coded template?\n\nThis will restore the canonical clean template, clear any mistakenly uploaded files, and synchronize any existing agreement in the database.`
      )
    ) {
      return;
    }

    const defaultTpl = DEFAULT_TEMPLATES[activeType] || '';

    // 1. Reset local template text
    setTemplateTexts((prev) => ({
      ...prev,
      [activeType]: defaultTpl,
    }));

    // 2. Immediately synchronize visual editor DOM
    if (editorMode === 'visual' && visualEditorRef.current) {
      visualEditorRef.current.innerHTML = defaultTpl;
    }

    // 3. Clear mistakenly uploaded custom documents / dossier files
    setUploadedDocuments([]);

    // 4. Compute clean substituted content with current form fields
    const substituted = substitutePlaceholders(defaultTpl, {
      ...form,
      uploadedDocuments: [],
    });

    // 5. If an existing agreement record exists in the database for this person and activeType:
    const existing = candidateAgreements.find((a) => a.templateId === activeType);
    if (existing?._id) {
      try {
        setSaving(true);
        const shouldResetSigning =
          (existing.status === 'signed' || existing.candidateHasSigned) &&
          window.confirm(
            'This agreement was already signed.\n\nDo you also want to reset its status to Pending so the candidate can sign the clean default template?'
          );

        await api.put(`/api/agreements/${existing._id}`, {
          templateId: activeType,
          templateName: docTitle,
          documentTitle: docTitle,
          templateContent: defaultTpl,
          documentContent: substituted,
          fields: form,
          uploadedDocuments: [],
          resetSigning: Boolean(shouldResetSigning),
          status: shouldResetSigning ? 'pending' : existing.status,
        });

        if (selectedPerson) {
          if (rosterType === 'candidates') {
            await loadCandidateAgreements(selectedPerson._id);
          } else {
            await loadEmployeeAgreements(selectedPerson._id);
          }
          await fetchAllAgreements();
        }
        feedback.success(`"${docTitle}" reset to default coded template and synced with database!`);
      } catch (err) {
        console.error('Failed to sync reset to DB:', err);
        feedback.error(getApiError(err, 'Reset locally, but failed to sync to database'));
      } finally {
        setSaving(false);
      }
    } else {
      feedback.success(`"${docTitle}" reset to default coded template`);
    }
  };

  const handleResetActiveAgreementToDefault = async (ag) => {
    if (!ag?._id) return;
    const targetType = ag.templateId || activeType;
    const docTitle = DOC_TYPES.find((d) => d.key === targetType)?.label || ag.documentTitle || targetType;

    const shouldResetSigning =
      (ag.status === 'signed' || ag.candidateHasSigned)
        ? window.confirm(
          `This agreement was already signed.\n\nDo you want to reset its signing status to Pending so the recipient can sign the clean default template?\n\nClick OK to reset to Pending, or Cancel to keep signed status while updating document content.`
        )
        : false;

    try {
      setSaving(true);
      const defaultTpl = DEFAULT_TEMPLATES[targetType] || '';
      const substituted = substitutePlaceholders(defaultTpl, {
        ...form,
        uploadedDocuments: [],
      });

      setTemplateTexts((prev) => ({
        ...prev,
        [targetType]: defaultTpl,
      }));
      setUploadedDocuments([]);

      await api.put(`/api/agreements/${ag._id}`, {
        templateId: targetType,
        templateName: docTitle,
        documentTitle: docTitle,
        templateContent: defaultTpl,
        documentContent: substituted,
        fields: form,
        uploadedDocuments: [],
        resetSigning: Boolean(shouldResetSigning),
        status: shouldResetSigning ? 'pending' : ag.status,
      });

      if (selectedPerson) {
        if (rosterType === 'candidates') {
          await loadCandidateAgreements(selectedPerson._id);
        } else {
          await loadEmployeeAgreements(selectedPerson._id);
        }
        await fetchAllAgreements();
      }
      feedback.success(`Agreement reset to official default template and updated in database!`);
    } catch (err) {
      console.error('Failed to reset agreement in DB:', err);
      feedback.error(getApiError(err, 'Failed to reset agreement in database'));
    } finally {
      setSaving(false);
    }
  };

  const handleCopyTemplateText = () => {
    const text = templateTexts[activeType] || '';
    navigator.clipboard.writeText(text);
    setCopyTemplateToast(true);
    setTimeout(() => setCopyTemplateToast(false), 2000);
    feedback.success('Template text copied to clipboard');
  };

  // Upload dossier document handler for Acknowledgement agreement
  const handleUploadDossierDoc = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingDoc(true);
      const uploadedList = [];

      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);

        const res = await api.post('/api/agreements/upload-doc', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        uploadedList.push(res.data);
      }

      setUploadedDocuments((prev) => [...prev, ...uploadedList]);
      feedback.success(`Attached ${uploadedList.length} document(s) to dossier`);
    } catch (err) {
      feedback.error(getApiError(err, 'Failed to upload document'));
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  const handleRemoveDossierDoc = (docId) => {
    setUploadedDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  // Save draft agreement
  const handleSaveDraft = async () => {
    if (!selectedPerson) {
      feedback.error('Please select a recipient first');
      return;
    }

    const typeConfig = DOC_TYPES.find((d) => d.key === activeType);
    const docTitle = typeConfig?.label || 'Employment Agreement';

    try {
      setSaving(true);
      await api.post('/api/agreements', {
        candidateId: rosterType === 'candidates' ? selectedPerson._id : null,
        employeeId: rosterType === 'employees' ? selectedPerson._id : null,
        recipientType: rosterType === 'employees' ? 'employee' : 'candidate',
        candidateName: form.candidateFullName,
        candidateEmail: form.candidateEmail,
        jobTitle: form.jobTitle,
        department: form.department,
        officeLocation: form.officeLocation,
        companyName: form.companyName,
        templateId: activeType,
        templateName: docTitle,
        documentTitle: docTitle,
        templateContent: ensureHtmlContent(templateTexts[activeType] || ''),
        documentContent: currentSubstitutedHtml,
        fields: form,
        uploadedDocuments: uploadedDocuments,
        status: 'draft',
        managerName: form.managerName,
        managerSignatureImage: sirSignatureImage || '',
      });

      feedback.success(`Draft for "${docTitle}" saved successfully`);
      if (rosterType === 'candidates') {
        loadCandidateAgreements(selectedPerson._id);
      } else {
        loadEmployeeAgreements(selectedPerson._id);
      }
      fetchAllAgreements();
    } catch (err) {
      feedback.error(getApiError(err, 'Failed to save draft'));
    } finally {
      setSaving(false);
    }
  };

  // Send for signature / generate public link
  const handleSendForSignature = async () => {
    if (!selectedPerson) {
      feedback.error('Please select a recipient first');
      return;
    }

    const typeConfig = DOC_TYPES.find((d) => d.key === activeType);
    const docTitle = typeConfig?.label || 'Employment Agreement';

    try {
      setSaving(true);
      const res = await api.post('/api/agreements', {
        candidateId: rosterType === 'candidates' ? selectedPerson._id : null,
        employeeId: rosterType === 'employees' ? selectedPerson._id : null,
        recipientType: rosterType === 'employees' ? 'employee' : 'candidate',
        candidateName: form.candidateFullName,
        candidateEmail: form.candidateEmail,
        jobTitle: form.jobTitle,
        department: form.department,
        officeLocation: form.officeLocation,
        companyName: form.companyName,
        templateId: activeType,
        templateName: docTitle,
        documentTitle: docTitle,
        templateContent: ensureHtmlContent(templateTexts[activeType] || ''),
        documentContent: currentSubstitutedHtml,
        fields: form,
        uploadedDocuments: uploadedDocuments,
        status: 'pending',
        managerName: form.managerName,
        managerSignatureImage: sirSignatureImage || '',
      });

      const savedAg = res.data.agreement;
      const publicUrl = `${window.location.origin}/candidate-agreement/${savedAg._id || savedAg.signingToken}`;
      const isCompliance = activeType === 'fnf' || activeType === 'nda' || activeType === 'relieving' || activeType === 'acknowledgement' || Boolean(typeConfig?.isCompliance);
      const emailSent = Boolean(res.data?.emailSent);
      const emailError = res.data?.emailError || '';

      setCreatedAgreementInfo({
        agreementId: savedAg._id,
        signingUrl: publicUrl,
        docTitle,
        templateId: activeType,
        post: form.jobTitle || selectedPerson?.candidatePost || selectedPerson?.positionAppliedFor || selectedPerson?.designation || docTitle,
        candidateName: form.candidateFullName,
        candidateEmail: form.candidateEmail,
        officeLocation: form.officeLocation,
        isCompliance,
        senderEmail: isCompliance ? 'compliance@vahlayconsulting.com' : `${cleanOfficeLocation(form.officeLocation)} Office`,
        emailSentSuccess: emailSent,
        emailError: emailError,
      });
      setShowSuccessModal(true);

      setSigningModalInfo({
        agreement: savedAg,
        url: publicUrl,
        docTitle,
      });

      if (emailSent) {
        feedback.success(`Agreement issued & sent via SMTP to ${form.candidateEmail}!`);
      } else {
        feedback.success('Agreement issued for recipient digital signature!');
      }
      if (rosterType === 'candidates') {
        loadCandidateAgreements(selectedPerson._id);
      } else {
        loadEmployeeAgreements(selectedPerson._id);
      }
      fetchAllAgreements();
    } catch (err) {
      feedback.error(getApiError(err, 'Failed to create agreement'));
    } finally {
      setSaving(false);
    }
  };

  const handleResendAgreementEmail = async (agreementId) => {
    if (!agreementId) return;
    try {
      setSaving(true);
      const res = await api.post(`/api/agreements/${agreementId}/resend-email`);
      feedback.success(res.data?.message || 'Agreement email dispatched via SMTP successfully!');
      if (createdAgreementInfo && (createdAgreementInfo.agreementId === agreementId || createdAgreementInfo._id === agreementId)) {
        setCreatedAgreementInfo((prev) => ({
          ...prev,
          emailSentSuccess: true,
          emailError: '',
        }));
      }
      fetchAllAgreements();
      if (selectedPerson) {
        if (rosterType === 'candidates') loadCandidateAgreements(selectedPerson._id);
        else loadEmployeeAgreements(selectedPerson._id);
      }
    } catch (err) {
      feedback.error(getApiError(err, 'Failed to send agreement email via SMTP'));
    } finally {
      setSaving(false);
    }
  };

  const getSigningUrl = (ag) => {
    if (!ag) return '';
    return `${window.location.origin}/candidate-agreement/${ag._id || ag.signingToken || ag.id}`;
  };

  const handleCopySigningUrl = (agOrUrl) => {
    const url = typeof agOrUrl === 'string' ? agOrUrl : getSigningUrl(agOrUrl);
    const id = typeof agOrUrl === 'object' ? agOrUrl?._id || agOrUrl?.templateId : null;
    navigator.clipboard.writeText(url);
    if (id) {
      setCopiedAgreementId(id);
      setTimeout(() => setCopiedAgreementId(null), 2500);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    feedback.success('Candidate direct signing link copied to clipboard!');
  };

  const handleOpenDetailedPage = (ag) => {
    if (ag?.templateId) {
      handleTabChange(ag.templateId);
    }
    setViewMode('detail');
  };

  const handleEditAgreement = (ag) => {
    if (ag?.templateId) {
      handleTabChange(ag.templateId);
    }
    setViewMode('editor');
  };

  const handleUpdateAgreement = async () => {
    if (!activeCreatedAg) {
      feedback.error('No existing agreement to update for this template.');
      return;
    }
    try {
      setSaving(true);
      await api.put(`/api/agreements/${activeCreatedAg._id}`, {
        documentContent: currentSubstitutedHtml,
        templateContent: ensureHtmlContent(templateTexts[activeType] || ''),
        fields: form,
        uploadedDocuments,
      });
      feedback.success('Agreement updated successfully!');
      if (selectedPerson) {
        if (rosterType === 'candidates') loadCandidateAgreements(selectedPerson._id);
        else loadEmployeeAgreements(selectedPerson._id);
      }
      fetchAllAgreements();
    } catch (err) {
      feedback.error(getApiError(err, 'Failed to update agreement'));
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadSignedDocPdf = (sDoc) => {
    downloadAgreementPdf(sDoc, sDoc.candidateSignatureImage, sDoc.questionAnswers);
  };

  const handleDownloadAgreementZip = async (agreementRecord) => {
    try {
      feedback.info('Generating complete package ZIP...');
      const zip = new JSZip();
      const targetAg = agreementRecord || activeAgreementRecord || {
        templateId: activeType,
        documentTitle: DOC_TYPES.find((d) => d.key === activeType)?.label,
        documentContent: currentSubstitutedHtml,
        candidateName: form.candidateFullName,
        candidateEmail: form.candidateEmail,
        officeLocation: form.officeLocation,
      };

      const cleanContent = targetAg.documentContent || currentSubstitutedText;
      zip.file(`${(targetAg.documentTitle || targetAg.templateId || 'Agreement').replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`, cleanContent);

      const docsToZip = targetAg.uploadedDocuments || uploadedDocuments || [];
      for (let i = 0; i < docsToZip.length; i++) {
        const d = docsToZip[i];
        const docUrl = d.fileUrl || d.url || d.downloadUrl;
        if (docUrl) {
          try {
            const resp = await fetch(docUrl);
            if (resp.ok) {
              const blob = await resp.blob();
              zip.file(d.title || d.name || `Attachment_${i + 1}.pdf`, blob);
            }
          } catch (fetchErr) {
            console.warn('Could not fetch attachment for zip:', fetchErr);
          }
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(zipBlob);
      const safeName = (form.candidateFullName || 'Agreement').replace(/[^a-zA-Z0-9_-]/g, '_');
      downloadLink.download = `${safeName}_${targetAg.templateId || 'Agreement'}_Package.zip`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      feedback.success('Agreement package ZIP downloaded successfully!');
    } catch (err) {
      feedback.error('Failed to create ZIP package: ' + (err.message || 'Unknown error'));
    }
  };

  // Preview & Download PDF
  const handleDownloadPdf = () => {
    const typeConfig = DOC_TYPES.find((d) => d.key === activeType);
    const existingAg = candidateAgreements.find((a) => a.templateId === activeType);

    const docRecord = {
      documentTitle: typeConfig?.label || 'Employment Agreement',
      documentContent: currentSubstitutedHtml,
      companyName: form.companyName,
      candidateName: form.candidateFullName,
      candidateFullName: form.candidateFullName,
      jobTitle: form.jobTitle,
      department: form.department,
      officeLocation: form.officeLocation,
      managerName: form.managerName,
      managerSignatureImage: existingAg?.managerSignatureImage || sirSignatureImage || null,
      fields: form,
      signedAt: existingAg?.signedAt,
      candidateHasSigned: existingAg?.candidateHasSigned,
      isSigned: Boolean(existingAg?.candidateHasSigned || existingAg?.status === 'signed'),
      questionAnswers: existingAg?.questionAnswers || {},
    };

    downloadAgreementPdf(
      docRecord,
      existingAg?.candidateSignatureImage || null,
      existingAg?.questionAnswers || {}
    );
  };

  // Download clean HTML document
  const handleDownloadHtml = () => {
    const typeConfig = DOC_TYPES.find((d) => d.key === activeType);
    const docTitle = typeConfig?.label || 'Employment Agreement';
    const recipientName = form.candidateFullName || 'Recipient';
    const orgName = form.companyName || DEFAULT_ORGANIZATION;
    const office = cleanOfficeLocation(form.officeLocation);
    const dateStr = form.agreementDate || new Date().toISOString().slice(0, 10);

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${orgName} - ${docTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 13px; line-height: 1.6; color: #1e293b; max-width: 820px; margin: 30px auto; padding: 30px 40px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { border-bottom: 2px solid #2563eb; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
    .company { font-size: 18px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: -0.02em; }
    .subtitle { font-size: 11px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 3px; }
    .meta { text-align: right; font-size: 11px; color: #64748b; }
    .meta strong { color: #1e293b; }
    h1, h2, h3 { color: #0f172a; margin-top: 16px; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f8fafc; font-weight: 700; color: #334155; }
    p { margin: 8px 0; }
    ul, ol { padding-left: 20px; margin: 8px 0; }
    li { margin-bottom: 4px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company">${orgName}</div>
      <div class="subtitle">Official Candidate Documentation</div>
    </div>
    <div class="meta">
      <div><strong>${office} Office</strong></div>
      <div>Date: ${dateStr}</div>
    </div>
  </div>

  <div class="content">
    ${cleanWordHtml(currentSubstitutedHtml)}
  </div>

  <div class="footer">
    ${orgName} &bull; Confidential &bull; Generated from TeamHub ERP
  </div>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${docTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_${recipientName.replace(/[^a-zA-Z0-9_-]/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    feedback.success('Template HTML file downloaded');
  };

  // Download ZIP dossier
  const handleDownloadDossierZip = async (agreementRecord) => {
    const docs = agreementRecord?.uploadedDocuments || uploadedDocuments;
    if (!docs || docs.length === 0) {
      feedback.error('No attached dossier documents found to package into a ZIP');
      return;
    }

    try {
      feedback.info('Generating ZIP dossier package...');
      const zip = new JSZip();
      const candName = agreementRecord?.candidateName || form.candidateFullName || 'Recipient';
      const safeName = candName.replace(/[^a-zA-Z0-9_-]/g, '_');

      for (let i = 0; i < docs.length; i++) {
        const d = docs[i];
        const docUrl = d.fileUrl || d.url || d.downloadUrl;
        if (docUrl) {
          try {
            const resp = await fetch(docUrl);
            const blob = await resp.blob();
            const fileName = d.name || d.fileName || d.title || `Document_${i + 1}.pdf`;
            zip.file(`Attachment_${i + 1}_${fileName}`, blob);
          } catch (fetchErr) {
            console.warn(`Could not fetch attachment ${d.name}:`, fetchErr);
          }
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(zipBlob);
      downloadLink.download = `${safeName}_Document_Dossier.zip`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      feedback.success('Dossier ZIP downloaded successfully');
    } catch (err) {
      feedback.error('Failed to create ZIP package: ' + (err.message || 'Unknown error'));
    }
  };

  // Delete agreement
  const handleDeleteAgreement = async () => {
    if (!agreementToDelete) return;
    try {
      await api.delete(`/api/agreements/${agreementToDelete._id}`);
      feedback.success('Agreement record deleted');
      setAgreementToDelete(null);
      if (selectedPerson) {
        if (rosterType === 'candidates') loadCandidateAgreements(selectedPerson._id);
        else loadEmployeeAgreements(selectedPerson._id);
      }
      fetchAllAgreements();
    } catch (err) {
      feedback.error(getApiError(err, 'Failed to delete agreement'));
    }
  };

  // Update Joining Date handler for candidate in joining view
  const handleUpdateJoiningDate = async (candId, newDate) => {
    try {
      setUpdatingJoiningDateId(candId);
      await api.put(`/api/interviews/${candId}`, {
        joiningDateProvided: newDate,
        joiningDate: newDate,
      });
      feedback.success('Joining date updated successfully');
      fetchCandidates();
    } catch (err) {
      feedback.error(getApiError(err, 'Failed to update joining date'));
    } finally {
      setUpdatingJoiningDateId(null);
    }
  };

  // 1-Click Convert Candidate to Employee (Probation)
  const handleConvertToEmployee = async (cand) => {
    if (!window.confirm(`Convert candidate "${cand.candidateName}" into an active Probation Employee?`)) {
      return;
    }
    try {
      await api.post(`/api/interviews/${cand._id}/probation-decision`, {
        decision: 'probation',
      });
      feedback.success(`Candidate ${cand.candidateName} successfully converted to Employee with probation status!`);
      fetchCandidates();
      fetchEmployees();
    } catch (err) {
      feedback.error(getApiError(err, 'Failed to convert candidate to employee'));
    }
  };

  // Tab Status pill
  const _getTabStatus = (typeKey) => {
    const ag = candidateAgreements.find((a) => a.templateId === typeKey);
    if (!ag) return null;
    if (ag.status === 'signed' || ag.candidateHasSigned) {
      return (
        <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          Signed
        </span>
      );
    }
    if (ag.status === 'pending') {
      return (
        <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          Pending
        </span>
      );
    }
    if (ag.status === 'draft') {
      return (
        <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          Draft
        </span>
      );
    }
    return null;
  };

  // Candidate Summary Stats (100% computational parity with AdminAgreementPage)
  const candidateSummaryStats = useMemo(() => {
    const list = candidateAgreements || [];
    const signedDocs = list.filter((a) => a.status === 'signed' || a.candidateHasSigned);
    const pendingDocs = list.filter((a) => a.status === 'pending' && !a.candidateHasSigned);
    const signedCount = signedDocs.length;
    const pendingCount = pendingDocs.length;
    const totalAssigned = list.length;
    const totalTemplates = DOC_TYPES.length; // Total 10 official agreement types

    let overallStatus = 'No Agreement';
    if (totalAssigned === 0) {
      overallStatus = 'No Agreement';
    } else if (signedCount >= totalTemplates) {
      overallStatus = 'All Documents Signed';
    } else if (signedCount > 0 && pendingCount === 0) {
      overallStatus = `${signedCount} of ${totalTemplates} Signed`;
    } else if (signedCount > 0 && pendingCount > 0) {
      overallStatus = 'Partially Signed';
    } else if (pendingCount > 0) {
      overallStatus = 'Pending Signature';
    }

    return {
      overallStatus,
      signedCount,
      pendingCount,
      totalAgreements: totalAssigned,
      totalTemplates,
      signedDocs,
      pendingDocs,
      assignedAgreements: list,
    };
  }, [candidateAgreements]);

  // Filter templates by category: 'all' (10) | 'onboarding' (6) | 'compliance' (4)
  const filteredDocTypes = useMemo(() => {
    if (templateCategoryFilter === 'onboarding') {
      return DOC_TYPES.filter((d) => d.category === 'onboarding');
    }
    if (templateCategoryFilter === 'compliance') {
      return DOC_TYPES.filter((d) => d.category === 'compliance');
    }
    return DOC_TYPES;
  }, [templateCategoryFilter]);

  // Combined signed docs list for complete parity
  const displayedSignedDocs = useMemo(() => {
    const list = [...(candidateAgreements || [])];

    // Cross-match any signed records from allAgreements if not already in list
    if (selectedPerson) {
      const pEmail = (selectedPerson.email || '').trim().toLowerCase();
      const pName = (selectedPerson.name || selectedPerson.candidateName || '').trim().toLowerCase();
      const pId = String(selectedPerson._id);

      (allAgreements || []).forEach((ag) => {
        const isSigned =
          ag.status === 'signed' || ag.candidateHasSigned || ag.signedAt || ag.candidateSignatureImage;
        if (!isSigned) return;

        const agCandId = String(ag.candidate?._id || ag.candidate || '');
        const agEmpId = String(ag.employee?._id || ag.employee || '');
        const agEmail = (ag.candidateEmail || '').trim().toLowerCase();
        const agName = (ag.candidateName || '').trim().toLowerCase();

        const matchesId = (agCandId && agCandId === pId) || (agEmpId && agEmpId === pId);
        const matchesEmail = pEmail && agEmail === pEmail;
        const matchesName = pName && agName === pName;

        if (
          (matchesId || matchesEmail || matchesName) &&
          !list.some((existing) => String(existing._id) === String(ag._id))
        ) {
          list.push(ag);
        }
      });
    }

    return list.filter(
      (ag) => ag.status === 'signed' || ag.candidateHasSigned || ag.signedAt || ag.candidateSignatureImage
    );
  }, [candidateAgreements, allAgreements, selectedPerson]);

  // Helper to find the specific created agreement for a template type
  const getCreatedAgreementForType = useCallback(
    (typeKey) => {
      const found = (candidateAgreements || []).find((a) => a.templateId === typeKey);
      if (found) return found;

      if (selectedPerson) {
        const pEmail = (selectedPerson.email || '').trim().toLowerCase();
        const pName = (selectedPerson.name || selectedPerson.candidateName || '').trim().toLowerCase();
        const pId = String(selectedPerson._id);

        return (allAgreements || []).find((ag) => {
          if (ag.templateId !== typeKey) return false;
          const agCandId = String(ag.candidate?._id || ag.candidate || '');
          const agEmpId = String(ag.employee?._id || ag.employee || '');
          const agEmail = (ag.candidateEmail || '').trim().toLowerCase();
          const agName = (ag.candidateName || '').trim().toLowerCase();

          const matchesId = (agCandId && agCandId === pId) || (agEmpId && agEmpId === pId);
          const matchesEmail = pEmail && agEmail === pEmail;
          const matchesName = pName && agName === pName;

          return matchesId || matchesEmail || matchesName;
        });
      }
      return undefined;
    },
    [candidateAgreements, allAgreements, selectedPerson]
  );

  // Active created agreement for currently selected tab
  const activeCreatedAg = useMemo(() => {
    return getCreatedAgreementForType(activeType);
  }, [getCreatedAgreementForType, activeType]);

  // All created agreements for candidate
  const allCreatedAgreements = useMemo(() => {
    return candidateAgreements || [];
  }, [candidateAgreements]);

  const getDocTypeStatus = (typeKey) => {
    const isSigned = displayedSignedDocs.some((s) => s.templateId === typeKey);
    if (isSigned) {
      return { status: 'signed', label: 'Signed', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' };
    }
    const createdAg = getCreatedAgreementForType(typeKey);
    if (createdAg) {
      if (createdAg.status === 'signed' || createdAg.candidateHasSigned) {
        return { status: 'signed', label: 'Signed', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' };
      }
      if (createdAg.status === 'pending') {
        return { status: 'pending', label: 'Pending', color: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' };
      }
      if (createdAg.status === 'draft') {
        return { status: 'draft', label: 'Draft', color: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800' };
      }
    }
    return null;
  };

  // Word & character counter
  const templateWordCount = useMemo(() => {
    const str = templateTexts[activeType] || '';
    const clean = str.replace(/<[^>]+>/g, ' ');
    return clean.trim() ? clean.trim().split(/\s+/).length : 0;
  }, [templateTexts, activeType]);

  const templateCharCount = useMemo(() => {
    return (templateTexts[activeType] || '').length;
  }, [templateTexts, activeType]);

  const activeAgreementRecord = candidateAgreements.find((a) => a.templateId === activeType);
  const isCurrentSigned =
    activeAgreementRecord?.status === 'signed' || activeAgreementRecord?.candidateHasSigned;

  const effectiveSirSig = activeAgreementRecord?.managerSignatureImage || sirSignatureImage || '';

  const handleUploadSirSignature = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      feedback.error('Please upload a valid signature image file (PNG, JPG, WEBP, SVG)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      feedback.error('Signature image file size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result;
      if (!dataUrl) return;

      setSirSignatureImage(dataUrl);
      try {
        localStorage.setItem('company_sir_signature', dataUrl);
      } catch (storageErr) {
        console.warn('Could not cache signature in localStorage:', storageErr);
      }

      // If an existing created agreement is loaded, update it in the backend too
      const targetAg = activeAgreementRecord || getCreatedAgreementForType(activeType);
      if (targetAg?._id) {
        try {
          await api.put(`/api/agreements/${targetAg._id}`, {
            managerSignatureImage: dataUrl,
          });
          if (rosterType === 'candidates' && selectedPerson?._id) {
            loadCandidateAgreements(selectedPerson._id);
          } else if (rosterType === 'employees' && selectedPerson?._id) {
            loadEmployeeAgreements(selectedPerson._id);
          }
          fetchAllAgreements();
        } catch (syncErr) {
          console.warn('Failed to sync signature to current agreement record:', syncErr);
        }
      }
      feedback.success('Authorized signatory signature uploaded successfully!');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveSirSignature = async () => {
    setSirSignatureImage('');
    try {
      localStorage.removeItem('company_sir_signature');
    } catch (storageErr) {
      console.warn('Could not remove signature from localStorage:', storageErr);
    }

    const targetAg = activeAgreementRecord || getCreatedAgreementForType(activeType);
    if (targetAg?._id) {
      try {
        await api.put(`/api/agreements/${targetAg._id}`, {
          managerSignatureImage: '',
        });
        if (rosterType === 'candidates' && selectedPerson?._id) {
          loadCandidateAgreements(selectedPerson._id);
        } else if (rosterType === 'employees' && selectedPerson?._id) {
          loadEmployeeAgreements(selectedPerson._id);
        }
        fetchAllAgreements();
      } catch (syncErr) {
        console.warn('Failed to clear signature from agreement record:', syncErr);
      }
    }
    feedback.info('Signatory signature removed (default stylized name will be displayed)');
  };

  // Filtered vault agreements
  const filteredVaultAgreements = useMemo(() => {
    return allAgreements.filter((ag) => {
      const matchSearch =
        !vaultSearch.trim() ||
        ag.candidateName?.toLowerCase().includes(vaultSearch.toLowerCase()) ||
        ag.candidateEmail?.toLowerCase().includes(vaultSearch.toLowerCase()) ||
        ag.documentTitle?.toLowerCase().includes(vaultSearch.toLowerCase());

      const matchStatus =
        vaultStatusFilter === 'all' ||
        ag.status === vaultStatusFilter ||
        (vaultStatusFilter === 'signed' && ag.candidateHasSigned);

      return matchSearch && matchStatus;
    });
  }, [allAgreements, vaultSearch, vaultStatusFilter]);

  // Candidates in final stage / joining stage
  const finalStageCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const norm = String(c.status || '').toLowerCase().trim();
      const tNorm = String(c.trainingStatus || '').toLowerCase().trim();
      const stageNorm = String(c.stage || '').toLowerCase().trim();

      return (
        norm === 'selected' ||
        norm === 'completed' ||
        tNorm === 'completed' ||
        norm.includes('probation') ||
        norm.includes('joining') ||
        Boolean(c.joiningDateProvided) ||
        Boolean(c.joiningDate) ||
        stageNorm.includes('training')
      );
    });
  }, [candidates]);

  // Agreements map by person id
  const personAgreementsMap = useMemo(() => {
    const map = new Map();
    allAgreements.forEach((ag) => {
      const pId = ag.employee?._id || ag.employee || ag.candidate?._id || ag.candidate;
      if (pId) {
        const key = String(pId);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(ag);
      }
    });
    return map;
  }, [allAgreements]);

  // Available branches in current roster
  const availableBranches = useMemo(() => {
    const currentList = rosterType === 'employees' ? employees : candidates;
    const branches = new Set();
    currentList.forEach((item) => {
      const b = cleanOfficeLocation(item.branch || item.officeLocation);
      if (b) branches.add(b);
    });
    return Array.from(branches);
  }, [rosterType, employees, candidates]);

  // Available departments in current roster
  const availableDepts = useMemo(() => {
    const currentList = rosterType === 'employees' ? employees : candidates;
    const depts = new Set();
    currentList.forEach((item) => {
      const d = item.department || (typeof item.department === 'string' ? item.department : item.department?.name);
      if (d && typeof d === 'string') depts.add(d);
    });
    return Array.from(depts);
  }, [rosterType, employees, candidates]);

  // Roster intelligence stats
  const rosterStats = useMemo(() => {
    const currentList = rosterType === 'employees' ? employees : candidates;
    let totalSigned = 0;
    let totalWithAgreements = 0;
    let totalPending = 0;
    let totalNone = 0;

    currentList.forEach((item) => {
      const ags = personAgreementsMap.get(String(item._id)) || [];
      const signed = ags.filter((a) => a.status === 'signed' || a.candidateHasSigned).length;
      if (ags.length === 0) {
        totalNone += 1;
      } else {
        totalWithAgreements += 1;
        if (signed > 0) totalSigned += 1;
        if (signed < ags.length) totalPending += 1;
      }
    });

    return {
      total: currentList.length,
      totalWithAgreements,
      totalSigned,
      totalPending,
      totalNone,
    };
  }, [rosterType, employees, candidates, personAgreementsMap]);

  // Filtered Roster list
  const filteredRoster = useMemo(() => {
    const list = rosterType === 'employees' ? employees : candidates;
    const q = rosterSearch.toLowerCase().trim();

    return list.filter((item) => {
      // Search
      if (q) {
        const name = (item.name || item.candidateName || '').toLowerCase();
        const email = (item.email || '').toLowerCase();
        const phone = (item.phoneNumber || item.phone || '').toLowerCase();
        const empId = (item.employeeId || item.rollNo || '').toLowerCase();
        const desig = (item.designation || item.candidatePost || item.role?.name || '').toLowerCase();
        const dept = (typeof item.department === 'string' ? item.department : item.department?.name || '').toLowerCase();
        const matches = name.includes(q) || email.includes(q) || phone.includes(q) || empId.includes(q) || desig.includes(q) || dept.includes(q);
        if (!matches) return false;
      }

      // Branch
      if (rosterBranchFilter !== 'all') {
        const b = cleanOfficeLocation(item.branch || item.officeLocation);
        if (b.toLowerCase() !== rosterBranchFilter.toLowerCase()) return false;
      }

      // Department
      if (rosterDeptFilter !== 'all') {
        const d = (typeof item.department === 'string' ? item.department : item.department?.name || 'General').toLowerCase();
        if (d !== rosterDeptFilter.toLowerCase()) return false;
      }

      // Agreement Status
      if (rosterAgreementFilter !== 'all') {
        const ags = personAgreementsMap.get(String(item._id)) || [];
        const signedCount = ags.filter((a) => a.status === 'signed' || a.candidateHasSigned).length;
        if (rosterAgreementFilter === 'signed' && signedCount === 0) return false;
        if (rosterAgreementFilter === 'pending' && (ags.length === 0 || signedCount === ags.length)) return false;
        if (rosterAgreementFilter === 'none' && ags.length > 0) return false;
      }

      return true;
    });
  }, [rosterType, employees, candidates, rosterSearch, rosterBranchFilter, rosterDeptFilter, rosterAgreementFilter, personAgreementsMap]);

  return (
    <div className="space-y-6">
      {/* Module Navigation & Roster Switcher Bar */}
      {(!hideSubtabs || (currentTab === 'studio' && !showRosterList && selectedPerson)) && (
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          {/* Subtabs: Studio | Vault | Joining (hidden when controlled by parent page) */}
          {!hideSubtabs && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleTabSelect('studio')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${currentTab === 'studio'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
              >
                <FileSignature size={15} /> Agreement Studio & Editor
              </button>

              <button
                type="button"
                onClick={() => handleTabSelect('vault')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${currentTab === 'vault'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
              >
                <ShieldCheck size={15} /> Signed Vault ({allAgreements.filter((a) => a.status === 'signed' || a.candidateHasSigned).length})
              </button>

              <button
                type="button"
                onClick={() => handleTabSelect('joining')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${currentTab === 'joining'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
              >
                <Calendar size={15} /> Joining Date & Final Stage ({finalStageCandidates.length})
              </button>
            </div>
          )}

          {/* Candidate vs Employee Wise Switcher + Selector (shown when inside an agreement) */}
          {currentTab === 'studio' && !showRosterList && selectedPerson && (
            <div className={`flex flex-wrap items-center gap-3 ${hideSubtabs ? 'w-full justify-between' : ''}`}>
              <button
                type="button"
                onClick={handleBackToRosterList}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white flex items-center gap-2 transition cursor-pointer shadow-2xs"
              >
                <ArrowLeft size={15} />
                <span>Back to {rosterType === 'employees' ? 'Employees List' : 'Candidates List'}</span>
              </button>

              <div className="flex flex-wrap items-center gap-3">
                {/* Roster Toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Roster:</span>
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                    <button
                      type="button"
                      onClick={() => handleRosterTypeChange('employees')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-colors ${rosterType === 'employees'
                          ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                    >
                      Employees ({employees.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRosterTypeChange('candidates')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-colors ${rosterType === 'candidates'
                          ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                    >
                      Candidates ({candidates.length})
                    </button>
                  </div>
                </div>

                {/* Recipient Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Recipient:</span>
                  <select
                    value={selectedPerson?._id || ''}
                    onChange={(e) => {
                      if (rosterType === 'candidates') {
                        const match = candidates.find((c) => c._id === e.target.value);
                        if (match) selectCandidate(match);
                      } else {
                        const match = employees.find((emp) => emp._id === e.target.value);
                        if (match) selectEmployee(match);
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[220px]"
                  >
                    {rosterType === 'candidates'
                      ? candidates.map((cand) => (
                        <option key={cand._id} value={cand._id}>
                          {cand.candidateName} — {cand.candidatePost || 'Candidate'} ({cand.branch || 'Ahmedabad'})
                        </option>
                      ))
                      : employees.map((emp) => (
                        <option key={emp._id} value={emp._id}>
                          {emp.name} — {emp.designation || emp.role?.name || 'Employee'} ({emp.employeeId || 'ID'})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 1: AGREEMENT STUDIO & CUSTOMIZER */}
      {currentTab === 'studio' && (
        <div className="space-y-6">
          {showRosterList || !selectedPerson ? (
            /* ============================================================ */
            /* DIRECTORY VIEW: EMPLOYEES & CANDIDATES LIST FIRST            */
            /* ============================================================ */
            <div className="space-y-6">
              {/* 1. Header Banner & Roster Switcher */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-200 dark:border-blue-900 shadow-xs">
                    {rosterType === 'employees' ? <Users size={22} /> : <Briefcase size={22} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        {rosterType === 'employees' ? 'Employee Agreements Directory' : 'Candidate Agreements Directory'}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {rosterType === 'employees' ? `${employees.length} Corporate Staff` : `${candidates.length} Interviewees`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {rosterType === 'employees'
                        ? 'Select an employee from the roster to generate, view, edit or sign their corporate agreements and policies'
                        : 'Select a candidate to configure offer letters, training assessment results or digital agreements'}
                    </p>
                  </div>
                </div>

                {/* Target Roster Switcher: Employees (default) | Candidates */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => handleRosterTypeChange('employees')}
                    className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer ${rosterType === 'employees'
                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    <Users size={15} />
                    <span>Employees ({employees.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRosterTypeChange('candidates')}
                    className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer ${rosterType === 'candidates'
                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    <Briefcase size={15} />
                    <span>Candidates ({candidates.length})</span>
                  </button>
                </div>
              </div>

              {/* 2. Intelligence Metric Ribbon */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Total {rosterType === 'employees' ? 'Employees' : 'Candidates'}
                    </span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{rosterStats.total}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                    <Users size={20} />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Agreements Generated
                    </span>
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{rosterStats.totalWithAgreements}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                    <FileSignature size={20} />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Verified / Signed
                    </span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{rosterStats.totalSigned}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck size={20} />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      No Agreement Yet
                    </span>
                    <span className="text-2xl font-black text-slate-500 dark:text-slate-400">{rosterStats.totalNone}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                    <FileText size={20} />
                  </div>
                </div>
              </div>

              {/* 3. Search and Filters Toolbar */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                  {/* Search Input */}
                  <div className="relative flex-1 min-w-[220px] max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      type="text"
                      placeholder={`Search ${rosterType === 'employees' ? 'employees by name, email, ID, role...' : 'candidates by name, post, branch...'}`}
                      value={rosterSearch}
                      onChange={(e) => setRosterSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                    {rosterSearch && (
                      <button
                        type="button"
                        onClick={() => setRosterSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Branch Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-medium">Branch:</span>
                    <select
                      value={rosterBranchFilter}
                      onChange={(e) => setRosterBranchFilter(e.target.value)}
                      className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Branches</option>
                      {availableBranches.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Department Filter */}
                  {availableDepts.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400 font-medium">Dept:</span>
                      <select
                        value={rosterDeptFilter}
                        onChange={(e) => setRosterDeptFilter(e.target.value)}
                        className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Departments</option>
                        {availableDepts.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Agreement Status Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-medium">Agreement:</span>
                    <select
                      value={rosterAgreementFilter}
                      onChange={(e) => setRosterAgreementFilter(e.target.value)}
                      className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Status</option>
                      <option value="signed">Signed / Verified</option>
                      <option value="pending">In Progress / Draft</option>
                      <option value="none">No Agreement</option>
                    </select>
                  </div>

                  {(rosterSearch || rosterBranchFilter !== 'all' || rosterDeptFilter !== 'all' || rosterAgreementFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setRosterSearch('');
                        setRosterBranchFilter('all');
                        setRosterDeptFilter('all');
                        setRosterAgreementFilter('all');
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>

                <div className="text-xs text-slate-400 font-medium shrink-0">
                  Showing <span className="font-bold text-slate-700 dark:text-slate-200">{filteredRoster.length}</span> of {rosterType === 'employees' ? employees.length : candidates.length} {rosterType}
                </div>
              </div>

              {/* 4. Enterprise Data Table */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="px-5 py-3.5">
                          {rosterType === 'employees' ? 'Employee & Contact' : 'Candidate & Contact'}
                        </th>
                        <th className="px-5 py-3.5">Role / Designation</th>
                        <th className="px-5 py-3.5">Department & Branch</th>
                        <th className="px-5 py-3.5">Agreement Status</th>
                        <th className="px-5 py-3.5">Documents Progress</th>
                        <th className="px-5 py-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredRoster.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            <FolderOpen size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                            <p className="font-semibold text-sm text-slate-600 dark:text-slate-300">
                              No {rosterType} found
                            </p>
                            <p className="text-xs mt-0.5">Try adjusting your search query or filters.</p>
                          </td>
                        </tr>
                      ) : (
                        filteredRoster.map((person) => {
                          const personAgreements = personAgreementsMap.get(String(person._id)) || [];
                          const signedCount = personAgreements.filter(
                            (a) => a.status === 'signed' || a.candidateHasSigned
                          ).length;
                          const totalAssigned = personAgreements.length;
                          const personName = person.name || person.candidateName || 'Unnamed';
                          const personEmail = person.email || '';
                          const personPhone = person.phoneNumber || person.phone || '';
                          const personRole = person.designation || person.candidatePost || person.role?.name || 'Associate';
                          const personDept = (typeof person.department === 'string' ? person.department : person.department?.name) || 'General';
                          const personBranch = cleanOfficeLocation(person.branch || person.officeLocation || 'Ahmedabad');
                          const personIdCode = person.employeeId || person.rollNo || '';

                          return (
                            <tr
                              key={person._id}
                              onClick={() => handleOpenPersonAgreement(person)}
                              className="hover:bg-blue-50/40 dark:hover:bg-slate-700/40 transition cursor-pointer group"
                            >
                              {/* 1. Person & Contact */}
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  <Avatar name={personName} size="sm" />
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                        {personName}
                                      </p>
                                      {personIdCode && (
                                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                          {personIdCode}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{personEmail || 'No email'}</p>
                                    {personPhone && (
                                      <p className="text-[10px] text-slate-400">{personPhone}</p>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* 2. Role / Designation */}
                              <td className="px-5 py-3.5">
                                <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  {personRole}
                                </span>
                              </td>

                              {/* 3. Department & Branch */}
                              <td className="px-5 py-3.5">
                                <p className="font-semibold text-slate-800 dark:text-slate-200">{personDept}</p>
                                <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <MapPin size={11} className="text-slate-400" />
                                  <span>{personBranch} Office</span>
                                </p>
                              </td>

                              {/* 4. Agreement Status */}
                              <td className="px-5 py-3.5">
                                {signedCount > 0 && signedCount >= 7 ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    <CheckCircle2 size={13} /> Fully Signed (7/7)
                                  </span>
                                ) : signedCount > 0 ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                    <Clock size={13} /> {signedCount} Signed ({totalAssigned} generated)
                                  </span>
                                ) : totalAssigned > 0 ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                    <FileText size={13} /> Draft ({totalAssigned} docs)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                    ○ No Agreement
                                  </span>
                                )}
                              </td>

                              {/* 5. Documents Progress */}
                              <td className="px-5 py-3.5">
                                <div className="space-y-1 w-32">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-500 font-medium">Signed:</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                      {signedCount} / 7
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${signedCount > 0 ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                                        }`}
                                      style={{ width: `${Math.round((signedCount / 7) * 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              {/* 6. Action */}
                              <td className="px-5 py-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenPersonAgreement(person);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer group-hover:scale-105"
                                >
                                  <FileSignature size={13} />
                                  <span>Open Agreement</span>
                                  <ArrowRight size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Active Person Profile Banner */}
              {selectedPerson && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <Avatar name={form.candidateFullName || selectedPerson.name || selectedPerson.candidateName} size="md" />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            {form.candidateFullName}
                          </h3>
                          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {form.jobTitle || 'Associate'}
                          </span>
                          <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                            {cleanOfficeLocation(form.officeLocation)} Office
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            {rosterType === 'employees' ? 'Employee Agreement' : 'Candidate Agreement'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {form.candidateEmail} &bull; Department: {form.department || 'General'}{' '}
                          {form.joiningDate ? `• Joining Date: ${form.joiningDate}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCandidateDetailsForm((p) => !p)}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <span>{showCandidateDetailsForm ? 'Hide Parameters' : 'Edit Agreement Parameters'}</span>
                        {showCandidateDetailsForm ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Parameters Form */}
                  {showCandidateDetailsForm && (
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                          Full Legal Name
                        </label>
                        <input
                          type="text"
                          value={form.candidateFullName}
                          onChange={(e) => setForm((p) => ({ ...p, candidateFullName: e.target.value }))}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={form.candidateEmail}
                          onChange={(e) => setForm((p) => ({ ...p, candidateEmail: e.target.value }))}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                          Designation / Job Title
                        </label>
                        <input
                          type="text"
                          value={form.jobTitle}
                          onChange={(e) => setForm((p) => ({ ...p, jobTitle: e.target.value }))}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                          Department
                        </label>
                        <input
                          type="text"
                          value={form.department}
                          onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                          Office Location
                        </label>
                        <select
                          value={form.officeLocation}
                          onChange={(e) => setForm((p) => ({ ...p, officeLocation: e.target.value }))}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                        >
                          <option value="Ahmedabad">Ahmedabad</option>
                          <option value="Vadodara">Vadodara</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                          Agreement Date
                        </label>
                        <input
                          type="date"
                          value={form.agreementDate}
                          onChange={(e) => setForm((p) => ({ ...p, agreementDate: e.target.value }))}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                          Official Joining Date
                        </label>
                        <input
                          type="date"
                          value={form.joiningDate}
                          onChange={(e) => setForm((p) => ({ ...p, joiningDate: e.target.value }))}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                          Employee ID
                        </label>
                        <input
                          type="text"
                          value={form.employeeId}
                          onChange={(e) => setForm((p) => ({ ...p, employeeId: e.target.value }))}
                          placeholder="e.g. VAH-0102"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                        />
                      </div>

                      {activeType === 'salary' && (
                        <>
                          <div>
                            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                              Base Monthly Salary (₹)
                            </label>
                            <input
                              type="text"
                              value={form.baseSalary}
                              onChange={(e) => setForm((p) => ({ ...p, baseSalary: e.target.value }))}
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                              Full Monthly CTC (₹)
                            </label>
                            <input
                              type="text"
                              value={form.fullPackage}
                              onChange={(e) => setForm((p) => ({ ...p, fullPackage: e.target.value }))}
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                            />
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                          Manager Signatory
                        </label>
                        <input
                          type="text"
                          value={form.managerName}
                          onChange={(e) => setForm((p) => ({ ...p, managerName: e.target.value }))}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                          Authorized Signatory Signature
                        </label>
                        <div className="flex items-center gap-2">
                          <label className="flex-1 cursor-pointer inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-bold text-xs transition">
                            <Upload size={13} />
                            <span className="truncate">Upload</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleUploadSirSignature}
                              className="hidden"
                            />
                          </label>
                          {effectiveSirSig && (
                            <button
                              type="button"
                              onClick={handleRemoveSirSignature}
                              title="Remove signature"
                              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bottom Tier: Executive Agreement Intelligence & Metric Ribbon */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* 1. Overall Status Card */}
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Overall Agreement Status
                      </span>
                      <div>
                        <OverallStatusBadge
                          status={candidateSummaryStats.overallStatus}
                          signedCount={candidateSummaryStats.signedCount}
                          totalCount={candidateSummaryStats.totalTemplates}
                        />
                      </div>
                    </div>

                    {/* 2. Signing Progress Bar */}
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        <span>Signing Progress</span>
                        <span className="text-slate-700 dark:text-slate-300 font-extrabold">
                          {Math.round((candidateSummaryStats.signedCount / candidateSummaryStats.totalTemplates) * 100)}%
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${candidateSummaryStats.signedCount >= candidateSummaryStats.totalTemplates
                                ? 'bg-emerald-500'
                                : 'bg-blue-600'
                              }`}
                            style={{
                              width: `${Math.round((candidateSummaryStats.signedCount / candidateSummaryStats.totalTemplates) * 100)}%`,
                            }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {candidateSummaryStats.signedCount} of {candidateSummaryStats.totalTemplates} templates executed
                        </p>
                      </div>
                    </div>

                    {/* 3. Signed vs Pending Breakdown */}
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Documents Breakdown
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs font-bold inline-flex items-center gap-1 ${candidateSummaryStats.signedCount > 0
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                            }`}
                        >
                          <CheckCircle2 size={11} className={candidateSummaryStats.signedCount > 0 ? 'text-emerald-600' : 'text-slate-400'} />
                          {candidateSummaryStats.signedCount} Signed
                        </span>
                        {candidateSummaryStats.pendingCount > 0 && (
                          <span className="px-2 py-0.5 rounded-md text-xs font-bold inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                            <Clock size={11} className="text-amber-600 animate-pulse" />
                            {candidateSummaryStats.pendingCount} Pending
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          ({candidateSummaryStats.totalTemplates} Total Templates)
                        </span>
                      </div>
                    </div>

                    {/* 4. Signed Vault Repository */}
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Signed Vault Status
                      </span>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2.5 h-2.5 rounded-full ${candidateSummaryStats.signedCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                        />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {candidateSummaryStats.signedCount} Verified Document{candidateSummaryStats.signedCount === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: CANDIDATE SIGNED DOCUMENTS */}
              <section className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
                <div className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 px-5 py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                      <FileSignature size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                          {rosterType === 'employees' ? 'Employee' : 'Candidate'} Signed Documents
                        </h2>
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full">
                          {displayedSignedDocs.length} Signed
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Agreements and undertakings signed by {form.candidateFullName || 'recipient'}.
                      </p>
                    </div>
                  </div>

                  {displayedSignedDocs.length > 0 && (
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 self-start sm:self-auto">
                      <CheckCircle2 size={13} className="text-emerald-500" /> Digital Signatures Verified
                    </span>
                  )}
                </div>

                <div className="p-5">
                  {displayedSignedDocs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {displayedSignedDocs.map((sDoc, idx) => {
                        const docTitle = sDoc.documentTitle || sDoc.templateName || 'Signed Agreement';
                        const signedTime = sDoc.signedAt ? formatDate(sDoc.signedAt) : 'Recently';
                        const isComplianceDoc =
                          (docTitle + ' ' + (sDoc.templateId || '')).toLowerCase().includes('fnf') ||
                          docTitle.toLowerCase().includes('settlement') ||
                          (docTitle + ' ' + (sDoc.templateId || '')).toLowerCase().includes('nda') ||
                          docTitle.toLowerCase().includes('relieving') ||
                          docTitle.toLowerCase().includes('resignation');

                        return (
                          <div
                            key={sDoc._id || sDoc.id || idx}
                            className="bg-slate-50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-400 p-4 shadow-2xs hover:shadow-md transition duration-150 flex flex-col justify-between"
                          >
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isComplianceDoc
                                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                    }`}
                                >
                                  {sDoc.templateId ? sDoc.templateId.toUpperCase() : 'AGREEMENT'}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                  <CheckCircle2 size={11} /> Signed
                                </span>
                              </div>

                              <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1" title={docTitle}>
                                {docTitle}
                              </h3>

                              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                                <span className="text-slate-400">Date Signed:</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">{signedTime}</span>
                              </div>
                            </div>

                            <div className="pt-3 mt-3 border-t border-slate-200/70 dark:border-slate-700 space-y-2">
                              <button
                                type="button"
                                onClick={() => handleDownloadSignedDocPdf(sDoc)}
                                className="w-full py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Download size={13} /> Download PDF
                              </button>
                              {Boolean(
                                sDoc.templateId === 'acknowledgement' ||
                                (sDoc.uploadedDocuments && sDoc.uploadedDocuments.length > 0)
                              ) && (
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadAgreementZip(sDoc)}
                                    className="w-full py-2 px-3 text-xs font-bold text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                                    title="Download complete ZIP dossier containing all uploaded documents and executed certificate"
                                  >
                                    <Archive size={13} /> Download All Docs (ZIP)
                                  </button>
                                )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 px-4 bg-slate-50/50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto text-lg mb-2">
                        <FileSignature size={20} />
                      </div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                        No Signed Documents on Record for this Recipient
                      </h3>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto mt-0.5">
                        Select a document template below to assign and dispatch for digital signature.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* SECTION: DOCUMENT TEMPLATE SELECTOR (10 Themed Responsive Cards) */}
              <section className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <FileText className="text-red-600" size={15} />
                      Document Template Builder
                    </h2>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {DOC_TYPES.length} Templates
                    </span>
                  </div>

                  {/* Category Filter Tabs: All (10), Onboarding (6), Compliance & Exit (4) */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg text-xs font-semibold self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setTemplateCategoryFilter('all')}
                      className={`px-3 py-1 rounded-md transition cursor-pointer ${templateCategoryFilter === 'all'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                      All ({DOC_TYPES.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemplateCategoryFilter('onboarding')}
                      className={`px-3 py-1 rounded-md transition cursor-pointer ${templateCategoryFilter === 'onboarding'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                      Onboarding ({DOC_TYPES.filter((d) => d.category === 'onboarding').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemplateCategoryFilter('compliance')}
                      className={`px-3 py-1 rounded-md transition cursor-pointer ${templateCategoryFilter === 'compliance'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                      Compliance &amp; Exit ({DOC_TYPES.filter((d) => d.category === 'compliance').length})
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {filteredDocTypes.map((d) => {
                    const tabStatus = getDocTypeStatus(d.key);
                    const isActive = activeType === d.key;
                    const isCompliance = d.isCompliance || d.key === 'fnf' || d.key === 'nda' || d.key === 'relieving' || d.key === 'acknowledgement';
                    const currentTheme = THEME_STYLES[d.key] || THEME_STYLES.policy;
                    const createdAg = getCreatedAgreementForType(d.key);

                    return (
                      <div
                        key={d.key}
                        onClick={() => handleTabChange(d.key)}
                        className={`p-3.5 rounded-xl text-left border transition relative flex flex-col justify-between space-y-2.5 cursor-pointer min-h-[145px] ${isActive ? currentTheme.active : currentTheme.inactive
                          }`}
                      >
                        <div className="flex items-start justify-between gap-1.5 w-full">
                          <span className="text-xs font-bold leading-tight text-slate-900 dark:text-white">
                            {d.shortLabel || d.label}
                          </span>
                          <div
                            className={`p-1.5 rounded-lg shrink-0 flex items-center justify-center ${isActive
                                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                                : currentTheme.iconBg || 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                              }`}
                          >
                            <FileText size={13} className={isActive ? 'text-blue-600 dark:text-blue-400' : currentTheme.iconInactive} />
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap my-auto">
                          {isCompliance && (
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0 ${currentTheme.badge}`}
                            >
                              <Shield size={9} /> Compliance
                            </span>
                          )}

                          {tabStatus ? (
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md inline-flex items-center gap-1 shrink-0 ${tabStatus.color}`}
                            >
                              {tabStatus.status === 'pending' ? (
                                <>
                                  <Clock size={10} className="inline mr-0.5" /> Pending
                                </>
                              ) : (
                                tabStatus.label
                              )}
                            </span>
                          ) : (
                            <span
                              className="text-[10px] font-medium px-2 py-0.5 rounded-md shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            >
                              Not Assigned
                            </span>
                          )}
                        </div>

                        {/* Quick inline action buttons on created cards */}
                        {createdAg ? (
                          <div
                            className="pt-2 mt-auto border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between gap-1.5 w-full"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetailedPage(createdAg);
                              }}
                              title="View detailed agreement document"
                              className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-semibold transition flex items-center justify-center gap-1 ${isActive
                                  ? 'bg-white/20 hover:bg-white/30 text-white'
                                  : 'bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-600 shadow-2xs'
                                }`}
                            >
                              <Eye size={10} />
                              <span>View</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditAgreement(createdAg);
                              }}
                              title="Edit agreement in editor"
                              className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-semibold transition flex items-center justify-center gap-1 ${isActive
                                  ? 'bg-white/20 hover:bg-white/30 text-white'
                                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs'
                                }`}
                            >
                              <Edit3 size={10} />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAgreementToDelete(createdAg);
                              }}
                              title="Delete agreement"
                              className={`p-1.5 rounded-lg text-[10px] font-semibold transition flex items-center justify-center shrink-0 ${isActive
                                  ? 'bg-red-950/40 hover:bg-red-950/70 text-red-200'
                                  : 'bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-900 shadow-2xs'
                                }`}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ) : (
                          <div
                            className={`pt-2 mt-auto border-t flex items-center justify-between text-[11px] font-medium w-full transition ${isActive
                                ? 'border-white/20 text-white/80'
                                : 'border-slate-100 dark:border-slate-800 text-slate-400'
                              }`}
                          >
                            <span>Ready to Dispatch</span>
                            <span className="text-xs font-bold">&rarr;</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* CREATED AGREEMENT ACTION & STATUS PANEL */}
                {activeCreatedAg ? (
                  <div className="bg-white dark:bg-[#111827] rounded-xl p-4 sm:p-5 shadow-2xs border border-slate-200/80 dark:border-slate-800 animate-fadeIn space-y-3">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Info */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Active Agreement Status:
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${activeCreatedAg.status === 'signed' || activeCreatedAg.candidateHasSigned
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              }`}
                          >
                            {activeCreatedAg.status === 'signed' || activeCreatedAg.candidateHasSigned ? (
                              <>
                                <CheckCircle2 size={12} className="text-emerald-500" /> Signed &amp; Accepted
                              </>
                            ) : (
                              <>
                                <Clock size={12} className="text-amber-500 animate-pulse" /> Pending Candidate Signature
                              </>
                            )}
                          </span>

                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            &bull; {activeCreatedAg.documentTitle || DOC_TYPES.find((d) => d.key === activeType)?.label}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>
                            <strong className="text-slate-800 dark:text-slate-200">Assigned To:</strong> {form.candidateFullName} ({form.candidateEmail})
                          </span>
                          <span>
                            <strong className="text-slate-800 dark:text-slate-200">Office:</strong> {cleanOfficeLocation(form.officeLocation)}
                          </span>
                          {(activeCreatedAg.assignedAt || activeCreatedAg.createdAt) && (
                            <span>
                              <strong className="text-slate-800 dark:text-slate-200">Created:</strong>{' '}
                              {formatDate(activeCreatedAg.assignedAt || activeCreatedAg.createdAt)}
                            </span>
                          )}
                        </div>

                        {/* Candidate Signing URL Quick Bar */}
                        <div className="pt-1 flex items-center gap-2 max-w-2xl">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">Signing Link:</span>
                          <div className="flex-1 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-700 dark:text-slate-300 truncate">
                            <span className="truncate">{getSigningUrl(activeCreatedAg)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopySigningUrl(activeCreatedAg)}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg transition shrink-0 flex items-center gap-1 cursor-pointer"
                            title="Copy direct candidate signing link"
                          >
                            {copiedAgreementId === (activeCreatedAg._id || activeCreatedAg.templateId) ? (
                              <>
                                <Check size={11} className="text-emerald-500" /> Copied!
                              </>
                            ) : (
                              <>
                                <Copy size={11} /> Copy Link
                              </>
                            )}
                          </button>
                          <a
                            href={getSigningUrl(activeCreatedAg)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-lg transition shrink-0 border border-slate-200 dark:border-slate-700"
                            title="Open candidate signing page in new tab"
                          >
                            <ExternalLink size={12} />
                          </a>
                          {activeCreatedAg.status === 'pending' && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleResendAgreementEmail(activeCreatedAg._id)}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg transition shrink-0 flex items-center gap-1 cursor-pointer"
                              title="Resend email notification via SMTP"
                            >
                              <Send size={11} />
                              <span>{saving ? 'Sending...' : 'Resend Email'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-wrap items-center gap-2 self-start lg:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenDetailedPage(activeCreatedAg)}
                          className="px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          title="View detailed agreement page"
                        >
                          <FileText size={13} className="text-blue-600 dark:text-blue-400" /> View Document
                        </button>

                        {Boolean(
                          activeCreatedAg.templateId === 'acknowledgement' ||
                          (activeCreatedAg.uploadedDocuments && activeCreatedAg.uploadedDocuments.length > 0)
                        ) && (
                            <button
                              type="button"
                              onClick={() => handleDownloadAgreementZip(activeCreatedAg)}
                              className="px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-200 dark:border-slate-700 text-slate-800 dark:bg-slate-800 dark:text-slate-200 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                              title="Download complete ZIP package containing all uploaded documents"
                            >
                              <Download size={13} /> Download ZIP
                            </button>
                          )}

                        <button
                          type="button"
                          onClick={() => handleEditAgreement(activeCreatedAg)}
                          className="px-3 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                          title="Load agreement into editor to modify"
                        >
                          <Edit3 size={13} /> Edit Content
                        </button>

                        <button
                          type="button"
                          onClick={handleUpdateAgreement}
                          disabled={saving}
                          className="px-3 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                          title="Save current modifications to this agreement"
                        >
                          <RefreshCw size={12} className={saving ? 'animate-spin' : ''} />
                          {saving ? 'Updating...' : 'Update Agreement'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleResetActiveAgreementToDefault(activeCreatedAg)}
                          disabled={saving}
                          className="px-3 py-2 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
                          title="Reset this agreement to system default template and clear wrong uploads"
                        >
                          <RotateCcw size={12} className={saving ? 'animate-spin' : ''} />
                          Reset to Default
                        </button>

                        <button
                          type="button"
                          onClick={() => setAgreementToDelete(activeCreatedAg)}
                          className="px-3 py-2 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          title="Delete this agreement"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ) : allCreatedAgreements.length > 0 ? (
                  <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <AlertCircle size={14} className="text-slate-400" />
                      <span>
                        <strong>{DOC_TYPES.find((d) => d.key === activeType)?.shortLabel}</strong> is not assigned yet. This recipient has{' '}
                        <strong>{allCreatedAgreements.length}</strong> other agreement{allCreatedAgreements.length === 1 ? '' : 's'} created.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAllCreatedAgreements(!showAllCreatedAgreements)}
                      className="text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400 underline cursor-pointer"
                    >
                      {showAllCreatedAgreements ? 'Hide All Created Agreements' : `View All Created Agreements (${allCreatedAgreements.length})`}
                    </button>
                  </div>
                ) : null}

                {/* ALL CREATED AGREEMENTS TABLE DRAWER */}
                {allCreatedAgreements.length > 0 && showAllCreatedAgreements && (
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-xs animate-fadeIn space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <FileSignature size={15} className="text-red-600" /> All Assigned Agreements for {form.candidateFullName || 'Recipient'}
                      </h3>
                      <span className="text-[11px] text-slate-400">{allCreatedAgreements.length} Document(s) On File</span>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                      {allCreatedAgreements.map((ag) => {
                        const agStatus = getDocTypeStatus(ag.templateId);
                        const isCurrentActive = activeType === ag.templateId;
                        return (
                          <div
                            key={ag._id || ag.id || ag.templateId}
                            className={`p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition ${isCurrentActive ? 'bg-red-50/40 dark:bg-red-950/20' : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750'
                              }`}
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {ag.documentTitle || ag.templateName || ag.templateId}
                                </span>
                                {agStatus && (
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${agStatus.color}`}>
                                    {agStatus.label}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                                <span>Assigned: {formatDate(ag.assignedAt || ag.createdAt)}</span>
                                <span>&bull;</span>
                                <span className="font-mono truncate">{getSigningUrl(ag)}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                              <button
                                type="button"
                                onClick={() => handleCopySigningUrl(ag)}
                                className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition flex items-center gap-1"
                                title="Copy direct candidate signing link"
                              >
                                <Copy size={11} />
                                <span>Copy</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenDetailedPage(ag)}
                                className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition flex items-center gap-1"
                              >
                                <Eye size={11} />
                                <span>View</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditAgreement(ag)}
                                className="px-2.5 py-1 text-xs font-semibold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg transition flex items-center gap-1"
                              >
                                <Edit3 size={11} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setAgreementToDelete(ag)}
                                className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              {/* Top Navigation Bar with Tabs & Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#111827] p-3 sm:p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setViewMode('detail')}
                    className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-2 cursor-pointer ${viewMode === 'detail'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    <FileText size={14} />
                    <span>Official Document View</span>
                    {activeCreatedAg && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${activeCreatedAg.status === 'signed' || activeCreatedAg.candidateHasSigned
                            ? 'bg-emerald-500/20 text-emerald-200'
                            : activeCreatedAg.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-200'
                              : 'bg-white/20 text-white'
                          }`}
                      >
                        {activeCreatedAg.status === 'signed' || activeCreatedAg.candidateHasSigned
                          ? 'Signed'
                          : activeCreatedAg.status === 'pending'
                            ? 'Pending'
                            : 'Draft'}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('editor')}
                    className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-2 cursor-pointer ${viewMode === 'editor'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    <Edit3 size={14} />
                    <span>Document Studio &amp; Editor</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {activeCreatedAg && (
                    <button
                      type="button"
                      onClick={handleUpdateAgreement}
                      disabled={saving}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <Check size={14} />
                      <span>Update Agreement</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Download PDF</span>
                  </button>

                  {activeCreatedAg && (
                    <button
                      type="button"
                      onClick={() => setAgreementToDelete(activeCreatedAg)}
                      title="Delete Agreement"
                      className="p-2 rounded-xl border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-xs transition-colors cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Dossier Document Upload Section (for Acknowledgement agreements) */}
              {activeType === 'acknowledgement' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FolderOpen size={16} className="text-blue-600" />
                        Acknowledgement PDF Dossier Attachments
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Attach policies, NDA, and handbook PDFs that the recipient will review and execute
                      </p>
                    </div>

                    <label className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 cursor-pointer text-xs font-semibold flex items-center gap-1.5 transition-colors">
                      <Upload size={14} />
                      <span>{uploadingDoc ? 'Uploading...' : 'Attach PDF File'}</span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        multiple
                        disabled={uploadingDoc}
                        onChange={handleUploadDossierDoc}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {uploadedDocuments.length === 0 ? (
                    <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-center text-xs text-slate-500 space-y-2">
                      <FileText className="mx-auto text-slate-400" size={28} />
                      <p>No dossier documents attached yet. Click "Attach PDF File" to upload employee handbooks or forms.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {uploadedDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                              <FileText size={16} />
                            </div>
                            <div className="truncate">
                              <p className="font-semibold text-slate-800 dark:text-white text-xs truncate">
                                {doc.title || doc.name}
                              </p>
                              <p className="text-[11px] text-slate-500">{doc.size || 'Attachment'}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={doc.fileUrl || doc.url || doc.downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-slate-500 hover:text-blue-600 rounded"
                              title="View Document"
                            >
                              <ExternalLink size={14} />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleRemoveDossierDoc(doc.id)}
                              className="p-1 text-slate-500 hover:text-rose-600 rounded"
                              title="Remove Attachment"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* MAIN DOCUMENT VIEW */}
              {viewMode === 'detail' ? (
                <DetailedDocumentViewer
                  content={currentSubstitutedHtml}
                  form={form}
                  candidate={selectedPerson}
                  activeDocInfo={DOC_TYPES.find((d) => d.key === activeType)}
                  isSigned={isCurrentSigned}
                  signedDoc={activeAgreementRecord}
                  managerSignatureImage={effectiveSirSig}
                  onUploadSirSignature={handleUploadSirSignature}
                  onRemoveSirSignature={handleRemoveSirSignature}
                />
              ) : (
                /* TEMPLATE & WORD EDITOR (Side-by-Side Two-Column Studio Layout) */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  {/* LEFT COLUMN: THE TEMPLATE & WORD EDITOR (7 cols) */}
                  <div className="lg:col-span-7 space-y-4">
                    {/* Header Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                            <FileText size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                                {DOC_TYPES.find((d) => d.key === activeType)?.label || activeType}
                              </h3>
                              <span className="text-[11px] font-normal text-slate-500 bg-slate-100 dark:bg-slate-700/60 px-2.5 py-0.5 rounded-full">
                                {templateWordCount} words &bull; {templateCharCount} chars
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Edit text directly or paste from MS Word (Word formatting is automatically cleaned)
                            </p>
                          </div>
                        </div>

                        {/* Action buttons on header card */}
                        <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={handleCleanWordPaste}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 text-xs font-semibold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                            title="Clean Word paste bullets, curly quotes, and formatting"
                          >
                            <Sparkles size={13} className="text-amber-500" />
                            <span>Clean Word Text</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleCopyTemplateText}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 text-xs font-semibold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                            title="Copy full template plain text"
                          >
                            <Copy size={13} />
                            <span>{copyTemplateToast ? 'Copied!' : 'Copy Text'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const html = formatHtmlForDisplay(ensureHtmlContent(templateTexts[activeType] || DEFAULT_TEMPLATES[activeType] || ''));
                              navigator.clipboard.writeText(html);
                              feedback.success('Template HTML copied to clipboard');
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 text-xs font-semibold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                            title="Copy template in HTML format"
                          >
                            <Code size={13} />
                            <span>Copy HTML</span>
                          </button>

                          <label
                            className="px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-xs font-semibold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                            title="Upload custom template (.docx, .html, .txt, .md)"
                          >
                            <Upload size={13} />
                            <span>Upload Template</span>
                            <input
                              type="file"
                              accept=".docx,.html,.htm,.txt,.md"
                              onChange={handleUploadCustomTemplateFile}
                              className="hidden"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={handleResetToDefaultTemplate}
                            className="px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                            title="Reset this template to official system default coded template"
                          >
                            <RotateCcw size={13} />
                            <span>Reset</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Format & Questions Toolbar */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                      {/* Row 1: FORMAT & QUESTIONS */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                          FORMAT:
                        </span>
                        <button
                          type="button"
                          onClick={handleFormatHeader}
                          className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-[11px] font-semibold transition cursor-pointer"
                        >
                          UPPERCASE Header
                        </button>
                        <button
                          type="button"
                          onClick={handleFormatBullet}
                          className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-[11px] font-semibold transition cursor-pointer"
                        >
                          &bull; Bullet List
                        </button>
                        <button
                          type="button"
                          onClick={handleFormatNumbered}
                          className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-[11px] font-semibold transition cursor-pointer"
                        >
                          1. Numbered List
                        </button>

                        <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">|</span>

                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                          QUESTIONS:
                        </span>
                        <button
                          type="button"
                          onClick={() => handleInsertQuestionCard('agreement')}
                          className="px-2.5 py-1 rounded-md border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 text-[11px] font-bold transition cursor-pointer"
                        >
                          + Agreement: Yes / No
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertQuestionCard('yesno')}
                          className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-[11px] font-semibold transition cursor-pointer"
                        >
                          + Yes / No
                        </button>
                      </div>

                      {/* Row 2: INSERT VARIABLES */}
                      <div className="space-y-2 pt-2.5 border-t border-slate-100 dark:border-slate-700/60">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            CLICK TO INSERT DYNAMIC VARIABLE TAG INTO TEMPLATE:
                          </span>
                          {insertedPlaceholderNotice && (
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 animate-fadeIn inline-flex items-center gap-1">
                              <Check size={11} className="text-emerald-600 dark:text-emerald-400" />
                              <span>{insertedPlaceholderNotice}</span>
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {availableInsertVariables.map((v, i) => (
                            <button
                              key={`${v.ph}-${i}`}
                              type="button"
                              onClick={() => handleInsertVariable(v.ph)}
                              title={`Insert ${v.label} tag (${v.ph})`}
                              className="px-2.5 py-1 rounded-full text-xs font-medium border border-blue-200/90 dark:border-blue-800/80 bg-blue-50/50 dark:bg-blue-950/30 text-slate-700 dark:text-slate-200 hover:bg-blue-100 hover:text-blue-900 dark:hover:bg-blue-900/50 dark:hover:text-blue-200 transition cursor-pointer shadow-2xs"
                            >
                              {v.label} <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">({v.ph})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* WYSIWYG / HTML Toolbar & Editor Area */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                      {/* Toolbar Controls */}
                      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-700">
                        {/* Visual / HTML Mode Toggle */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg">
                          <button
                            type="button"
                            onClick={() => handleSwitchEditorMode('visual')}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${editorMode === 'visual'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                          >
                            <Eye size={12} />
                            <span>Visual (WYSIWYG)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSwitchEditorMode('html')}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${editorMode === 'html'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-mono'
                              }`}
                          >
                            <Code size={12} />
                            <span>&lt;/&gt; HTML Code</span>
                          </button>
                        </div>

                        {/* Formatting Actions */}
                        <div className="flex items-center gap-1 flex-wrap">
                          <button
                            type="button"
                            onClick={() => execVisualCommand('bold')}
                            title="Bold (Ctrl+B)"
                            className="w-7 h-7 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                          >
                            B
                          </button>
                          <button
                            type="button"
                            onClick={() => execVisualCommand('italic')}
                            title="Italic (Ctrl+I)"
                            className="w-7 h-7 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center italic text-xs font-serif cursor-pointer"
                          >
                            I
                          </button>
                          <button
                            type="button"
                            onClick={() => execVisualCommand('underline')}
                            title="Underline (Ctrl+U)"
                            className="w-7 h-7 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center underline text-xs cursor-pointer"
                          >
                            U
                          </button>
                          <button
                            type="button"
                            onClick={() => execVisualCommand('formatBlock', 'h2')}
                            title="Heading 2"
                            className="px-1.5 h-7 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                          >
                            H2
                          </button>
                          <button
                            type="button"
                            onClick={() => execVisualCommand('formatBlock', 'h3')}
                            title="Heading 3"
                            className="px-1.5 h-7 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                          >
                            H3
                          </button>
                          <button
                            type="button"
                            onClick={() => execVisualCommand('formatBlock', 'p')}
                            title="Paragraph"
                            className="w-7 h-7 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center font-semibold text-xs cursor-pointer"
                          >
                            P
                          </button>
                          <button
                            type="button"
                            onClick={() => execVisualCommand('insertUnorderedList')}
                            title="Bullet list"
                            className="w-7 h-7 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-xs cursor-pointer"
                          >
                            <List size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => execVisualCommand('insertOrderedList')}
                            title="Numbered list"
                            className="w-7 h-7 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-xs cursor-pointer"
                          >
                            <ListOrdered size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={insertTableTemplate}
                            title="Insert 3-column table"
                            className="px-2 h-7 rounded border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 flex items-center gap-1 font-semibold text-xs cursor-pointer"
                          >
                            <Table size={12} />
                            <span>+ Table</span>
                          </button>

                          <button
                            type="button"
                            onClick={insertYesNoCard}
                            title="Insert candidate acceptance card"
                            className="px-2 h-7 rounded border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 flex items-center gap-1 font-semibold text-xs cursor-pointer"
                          >
                            <CheckSquare size={12} />
                            <span>+ Yes/No Card</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleInsertLink}
                            title="Insert link"
                            className="w-7 h-7 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-xs cursor-pointer"
                          >
                            <LinkIcon size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Upload Custom Template Button Row */}
                      <div className="flex items-center justify-start pt-0.5">
                        <label
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                          title="Upload your custom template file (.docx, .html, .txt, .md)"
                        >
                          <Upload size={13} />
                          <span>Upload Custom Template (.docx / .html / .txt)</span>
                          <input
                            type="file"
                            accept=".docx,.html,.htm,.txt,.md"
                            onChange={handleUploadCustomTemplateFile}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {/* Editor Canvas Area */}
                      {editorMode === 'visual' ? (
                        <div
                          ref={(node) => {
                            visualEditorRef.current = node;
                            if (node) {
                              const curHtml = ensureHtmlContent(templateTexts[activeType] || DEFAULT_TEMPLATES[activeType] || '');
                              if (!node.innerHTML || node.innerHTML === '<br>' || node.innerHTML.trim() === '') {
                                node.innerHTML = curHtml;
                              }
                            }
                          }}
                          contentEditable
                          suppressContentEditableWarning
                          onInput={(e) => {
                            const newHtml = e.currentTarget?.innerHTML || '';
                            setTemplateTexts((prev) => ({
                              ...prev,
                              [activeType]: newHtml,
                            }));
                          }}
                          onPaste={handleWordPaste}
                          className="w-full min-h-[420px] max-h-[600px] overflow-y-auto p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-white leading-relaxed text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                        [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table]:border [&_table]:border-slate-300 dark:[&_table]:border-slate-700
                        [&_td]:border [&_td]:border-slate-300 dark:[&_td]:border-slate-700 [&_td]:p-2.5
                        [&_th]:border [&_th]:border-slate-300 dark:[&_th]:border-slate-700 [&_th]:p-2.5 [&_th]:bg-slate-100 dark:[&_th]:bg-slate-800
                        [&_p]:my-2 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-bold
                        [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                        />
                      ) : (
                        <textarea
                          ref={textareaRef}
                          rows={18}
                          value={templateTexts[activeType] || ''}
                          onChange={(e) => setTemplateTexts((p) => ({ ...p, [activeType]: e.target.value }))}
                          onPaste={handleWordPaste}
                          className="w-full p-4 font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter template HTML code..."
                        />
                      )}
                    </div>

                    {/* Quick-Fill Values Card */}
                    {activeType !== 'policy' && (
                      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 shadow-sm space-y-3">
                        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                          <FileCode size={15} className="text-blue-600 dark:text-blue-400" />
                          <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                            Quick-Fill Parameters for {DOC_TYPES.find((d) => d.key === activeType)?.shortLabel}
                          </h4>
                        </div>

                        {activeType === 'assessment' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                            <div>
                              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Training Start Date
                              </label>
                              <input
                                type="date"
                                value={form.trainingStartDate}
                                onChange={(e) => setForm((p) => ({ ...p, trainingStartDate: e.target.value }))}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Training End Date
                              </label>
                              <input
                                type="date"
                                value={form.trainingEndDate}
                                onChange={(e) => setForm((p) => ({ ...p, trainingEndDate: e.target.value }))}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Trainer Name
                              </label>
                              <input
                                type="text"
                                value={form.trainerName}
                                onChange={(e) => setForm((p) => ({ ...p, trainerName: e.target.value }))}
                                placeholder="Trainer's Name"
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Team Leader Name
                              </label>
                              <input
                                type="text"
                                value={form.teamLeaderName}
                                onChange={(e) => setForm((p) => ({ ...p, teamLeaderName: e.target.value }))}
                                placeholder="Team Leader's Name"
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Overall Result
                              </label>
                              <select
                                value={form.overallResult}
                                onChange={(e) => setForm((p) => ({ ...p, overallResult: e.target.value }))}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                              >
                                <option value="Pass">Pass</option>
                                <option value="Fail">Fail</option>
                                <option value="Extended Training">Extended Training</option>
                              </select>
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Approved By
                              </label>
                              <input
                                type="text"
                                value={form.approvedBy}
                                onChange={(e) => setForm((p) => ({ ...p, approvedBy: e.target.value }))}
                                placeholder="Approver Name"
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                              />
                            </div>
                            <div className="sm:col-span-2 lg:col-span-3">
                              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Trainer's Recommendation
                              </label>
                              <textarea
                                rows={2}
                                value={form.recommendation}
                                onChange={(e) => setForm((p) => ({ ...p, recommendation: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                              />
                            </div>
                          </div>
                        )}

                        {(activeType === 'salary' || activeType === 'offer' || activeType === 'appointment') && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                            <div>
                              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Base Salary (₹)
                              </label>
                              <input
                                type="number"
                                value={form.baseSalary}
                                onChange={(e) => setForm((p) => ({ ...p, baseSalary: e.target.value }))}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                              />
                            </div>
                            {activeType !== 'appointment' && (
                              <div>
                                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                  {activeType === 'offer' ? 'Incentive / Bonus (₹)' : 'Security Deposit (₹)'}
                                </label>
                                <input
                                  type="number"
                                  value={activeType === 'offer' ? form.performanceIncentive : form.securityDepositAmount}
                                  onChange={(e) =>
                                    setForm((p) => ({
                                      ...p,
                                      [activeType === 'offer' ? 'performanceIncentive' : 'securityDepositAmount']: e.target.value,
                                    }))
                                  }
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                                />
                              </div>
                            )}
                            <div>
                              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Full Package CTC (₹)
                              </label>
                              <input
                                type="number"
                                value={form.fullPackage}
                                onChange={(e) => setForm((p) => ({ ...p, fullPackage: e.target.value }))}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                              />
                            </div>
                            {activeType === 'offer' && (
                              <div>
                                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                  Offer Validity Date
                                </label>
                                <input
                                  type="date"
                                  value={form.offerExpiryDate}
                                  onChange={(e) => setForm((p) => ({ ...p, offerExpiryDate: e.target.value }))}
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                                />
                              </div>
                            )}
                            {activeType === 'salary' && (
                              <>
                                <div>
                                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                    Monthly Installation Target
                                  </label>
                                  <input
                                    type="number"
                                    value={form.monthlyInstallationTarget}
                                    onChange={(e) => setForm((p) => ({ ...p, monthlyInstallationTarget: e.target.value }))}
                                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                    Monthly Sales Target
                                  </label>
                                  <input
                                    type="number"
                                    value={form.monthlySalesTarget}
                                    onChange={(e) => setForm((p) => ({ ...p, monthlySalesTarget: e.target.value }))}
                                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {activeType === 'revision' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                            <div>
                              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Effective Revision Date
                              </label>
                              <input
                                type="date"
                                value={form.effectiveDate}
                                onChange={(e) => setForm((p) => ({ ...p, effectiveDate: e.target.value }))}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Revised Job Title
                              </label>
                              <input
                                type="text"
                                value={form.revisedJobTitle}
                                onChange={(e) => setForm((p) => ({ ...p, revisedJobTitle: e.target.value }))}
                                placeholder="e.g. Senior Associate"
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Revised Base Salary (₹)
                              </label>
                              <input
                                type="number"
                                value={form.revisedBaseSalary}
                                onChange={(e) => setForm((p) => ({ ...p, revisedBaseSalary: e.target.value }))}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Revised Incentive (₹)
                              </label>
                              <input
                                type="number"
                                value={form.revisedIncentive}
                                onChange={(e) => setForm((p) => ({ ...p, revisedIncentive: e.target.value }))}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Revised Total CTC (₹)
                              </label>
                              <input
                                type="number"
                                value={form.revisedFullPackage}
                                onChange={(e) => setForm((p) => ({ ...p, revisedFullPackage: e.target.value }))}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                              />
                            </div>
                          </div>
                        )}

                        {activeType === 'relieving' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                            <div>
                              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Resignation Date
                              </label>
                              <input
                                type="date"
                                value={form.resignationDate}
                                onChange={(e) => setForm((p) => ({ ...p, resignationDate: e.target.value }))}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Relieving / Last Working Date
                              </label>
                              <input
                                type="date"
                                value={form.lastWorkingDay}
                                onChange={(e) => setForm((p) => ({ ...p, lastWorkingDay: e.target.value }))}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Notice Period Served
                              </label>
                              <select
                                value={form.noticePeriodServed}
                                onChange={(e) => setForm((p) => ({ ...p, noticePeriodServed: e.target.value }))}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                              >
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                                <option value="Waived">Waived</option>
                              </select>
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Employee ID
                              </label>
                              <input
                                type="text"
                                value={form.employeeId}
                                onChange={(e) => setForm((p) => ({ ...p, employeeId: e.target.value }))}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                              />
                            </div>
                          </div>
                        )}

                        {activeType === 'fnf' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                            <div>
                              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Last Working Day
                              </label>
                              <input
                                type="date"
                                value={form.lastWorkingDay}
                                onChange={(e) => setForm((p) => ({ ...p, lastWorkingDay: e.target.value }))}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Reason for Leaving
                              </label>
                              <input
                                type="text"
                                value={form.reasonForLeaving}
                                onChange={(e) => setForm((p) => ({ ...p, reasonForLeaving: e.target.value }))}
                                placeholder="e.g. Better Career Opportunity"
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Notice Period Served
                              </label>
                              <select
                                value={form.noticePeriodServed}
                                onChange={(e) => setForm((p) => ({ ...p, noticePeriodServed: e.target.value }))}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                              >
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                                <option value="Waived">Waived</option>
                              </select>
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Exit Interview Completed
                              </label>
                              <select
                                value={form.exitInterviewDone}
                                onChange={(e) => setForm((p) => ({ ...p, exitInterviewDone: e.target.value }))}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                              >
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                              </select>
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                FNF Remarks
                              </label>
                              <input
                                type="text"
                                value={form.fnfRemarks}
                                onChange={(e) => setForm((p) => ({ ...p, fnfRemarks: e.target.value }))}
                                placeholder="e.g. All dues and handovers completed without dispute."
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* RIGHT COLUMN: LIVE SUBSTITUTED PREVIEW (5 cols) */}
                  <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            Live Substituted Preview
                          </h4>
                        </div>

                        {/* Document View / Plain Text Toggle */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg text-xs font-semibold">
                          <button
                            type="button"
                            onClick={() => setRightPreviewMode('document')}
                            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${rightPreviewMode === 'document'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                          >
                            Document View
                          </button>
                          <button
                            type="button"
                            onClick={() => setRightPreviewMode('text')}
                            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${rightPreviewMode === 'text'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                          >
                            Plain Text
                          </button>
                          <button
                            type="button"
                            onClick={() => setRightPreviewMode('html')}
                            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${rightPreviewMode === 'html'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                          >
                            HTML Format
                          </button>
                        </div>
                      </div>

                      {/* Rendered Letterhead Document Preview Box */}
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-5 max-h-[580px] overflow-y-auto text-xs space-y-3 shadow-2xs">
                        {rightPreviewMode === 'document' ? (
                          <div>
                            {/* Corporate Letterhead Banner */}
                            <div className="flex justify-between items-start border-b border-red-700/80 pb-3 mb-3">
                              <div>
                                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">
                                  {form.companyName || DEFAULT_ORGANIZATION}
                                </h3>
                                <p className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-widest mt-0.5">
                                  OFFICIAL CANDIDATE DOCUMENTATION
                                </p>
                              </div>
                              <div className="text-right text-[11px] text-slate-500 dark:text-slate-400">
                                <p className="font-semibold text-slate-800 dark:text-slate-200">
                                  {cleanOfficeLocation(form.officeLocation)} Office
                                </p>
                                <p>Date: {form.agreementDate || new Date().toISOString().slice(0, 10)}</p>
                              </div>
                            </div>

                            {/* Substituted Body */}
                            <div
                              className="agreement-rich-rendered space-y-2 text-xs leading-relaxed text-slate-800 dark:text-slate-200
                            [&_table]:w-full [&_table]:border-collapse [&_table]:my-2.5 [&_table]:border [&_table]:border-slate-300 dark:[&_table]:border-slate-700
                            [&_td]:border [&_td]:border-slate-300 dark:[&_td]:border-slate-700 [&_td]:p-2 [&_td]:text-[11px]
                            [&_th]:border [&_th]:border-slate-300 dark:[&_th]:border-slate-700 [&_th]:p-2 [&_th]:bg-slate-100 dark:[&_th]:bg-slate-800 [&_th]:text-[11px]
                            [&_p]:my-1.5 [&_strong]:font-bold [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold"
                              dangerouslySetInnerHTML={{
                                __html: cleanWordHtml(currentSubstitutedHtml),
                              }}
                            />
                          </div>
                        ) : rightPreviewMode === 'text' ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Clean Plain Text Output</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(currentSubstitutedText);
                                  feedback.success('Plain text copied to clipboard');
                                }}
                                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
                              >
                                <Copy size={11} /> Copy Text
                              </button>
                            </div>
                            <pre className="font-mono text-[11px] whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300 max-h-[460px] overflow-y-auto">
                              {currentSubstitutedText}
                            </pre>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">HTML Format Source Code</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(formatHtmlForDisplay(currentSubstitutedHtml));
                                  feedback.success('HTML code copied to clipboard');
                                }}
                                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
                              >
                                <Copy size={11} /> Copy HTML Code
                              </button>
                            </div>
                            <pre className="font-mono text-[11px] whitespace-pre-wrap break-all leading-relaxed bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-emerald-400 select-all max-h-[460px] overflow-y-auto">
                              {formatHtmlForDisplay(currentSubstitutedHtml)}
                            </pre>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons Section */}
                      <div className="space-y-2 pt-2">
                        {/* Row 1: Preview PDF, Download HTML & Save Draft */}
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={handleDownloadPdf}
                            className="py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                            title="Preview and download formal PDF document"
                          >
                            <Download size={13} />
                            <span>Preview PDF</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleDownloadHtml}
                            className="py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                            title="Download template in standalone HTML format"
                          >
                            <Code size={13} />
                            <span>Get HTML</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleSaveDraft}
                            disabled={saving}
                            className="py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <FileCheck2 size={13} />
                            <span>Save Draft</span>
                          </button>
                        </div>

                        {/* Row 2: Update Agreement (Green button) */}
                        {activeCreatedAg ? (
                          <button
                            type="button"
                            onClick={handleUpdateAgreement}
                            disabled={saving}
                            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                          >
                            <Check size={14} />
                            <span>Update {DOC_TYPES.find((d) => d.key === activeType)?.shortLabel || 'Agreement'}</span>
                          </button>
                        ) : null}

                        {/* Row 3: Send / Re-send for Signature (Red button) & Delete */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleSendForSignature}
                            disabled={saving}
                            className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                          >
                            <Send size={13} />
                            <span>
                              {activeCreatedAg
                                ? `Re-send ${DOC_TYPES.find((d) => d.key === activeType)?.shortLabel || 'Agreement'} for Signature`
                                : `Send ${DOC_TYPES.find((d) => d.key === activeType)?.shortLabel || 'Agreement'} for Signature`}
                            </span>
                          </button>

                          {activeCreatedAg && (
                            <button
                              type="button"
                              onClick={() => setAgreementToDelete(activeCreatedAg)}
                              title="Delete Agreement"
                              className="py-2.5 px-3 rounded-xl border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center justify-center gap-1 shadow-2xs transition cursor-pointer"
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* VIEW 2: SIGNED VAULT */}
      {currentTab === 'vault' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <SearchInput
                value={vaultSearch}
                onChange={setVaultSearch}
                placeholder="Search by candidate, email, or agreement title..."
              />

              <select
                value={vaultStatusFilter}
                onChange={(e) => setVaultStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
              >
                <option value="all">All Statuses</option>
                <option value="signed">Signed & Verified</option>
                <option value="pending">Pending Signature</option>
                <option value="draft">Drafts</option>
              </select>
            </div>

            <button
              type="button"
              onClick={fetchAllAgreements}
              className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Refresh Vault Records"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {filteredVaultAgreements.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 space-y-2">
                <Shield className="mx-auto text-slate-400" size={32} />
                <p>No agreement records match your current filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="px-5 py-3.5">Recipient</th>
                      <th className="px-5 py-3.5">Type</th>
                      <th className="px-5 py-3.5">Document Title</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Issued On</th>
                      <th className="px-5 py-3.5">Signed At</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {filteredVaultAgreements.map((ag) => {
                      const isSigned = ag.status === 'signed' || ag.candidateHasSigned;
                      const signingUrl = `${window.location.origin}/candidate-agreement/${ag._id || ag.signingToken}`;

                      return (
                        <tr
                          key={ag._id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <Avatar name={ag.candidateName} size="sm" />
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white">
                                  {ag.candidateName}
                                </p>
                                <p className="text-[11px] text-slate-500">{ag.candidateEmail || 'Recipient'}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-3.5">
                            <span className="capitalize px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              {ag.recipientType || (ag.employee ? 'Employee' : 'Candidate')}
                            </span>
                          </td>

                          <td className="px-5 py-3.5">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {ag.documentTitle || ag.templateName}
                            </span>
                            <p className="text-[11px] text-slate-500 capitalize">{ag.templateId}</p>
                          </td>

                          <td className="px-5 py-3.5">
                            {isSigned ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                <CheckCircle2 size={12} /> Signed
                              </span>
                            ) : ag.status === 'pending' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                <Clock size={12} /> Pending
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                Draft
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                            {ag.assignedAt ? formatDate(ag.assignedAt) : formatDate(ag.createdAt)}
                          </td>

                          <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                            {ag.signedAt ? (
                              <span className="text-emerald-600 font-semibold">
                                {new Date(ag.signedAt).toLocaleDateString()}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setViewSignedModal(ag)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                title="View Agreement & Signature"
                              >
                                <Eye size={15} />
                              </button>

                              {!isSigned && (
                                <button
                                  type="button"
                                  onClick={() => handleCopySigningUrl(signingUrl)}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                  title="Copy Signing Link"
                                >
                                  <Link2 size={15} />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  downloadAgreementPdf(ag, ag.candidateSignatureImage, ag.questionAnswers)
                                }
                                className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                title="Download Executed PDF"
                              >
                                <Download size={15} />
                              </button>

                              {ag.uploadedDocuments && ag.uploadedDocuments.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleDownloadDossierZip(ag)}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                  title="Download Dossier ZIP"
                                >
                                  <Archive size={15} />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setAgreementToDelete(ag)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                title="Delete Agreement"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: JOINING DATE & FINAL STAGE ONBOARDING */}
      {currentTab === 'joining' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="text-blue-600" size={17} />
                Final Stage Candidates & Joining Date Roster
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Assign official joining dates, monitor agreement completion, and convert candidates into probation employees
              </p>
            </div>

            <button
              type="button"
              onClick={fetchCandidates}
              className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Refresh Roster"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {finalStageCandidates.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 space-y-2">
                <UserCheck className="mx-auto text-slate-400" size={32} />
                <p>No candidates currently in the final joining or onboarding stage.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="px-5 py-3.5">Candidate</th>
                      <th className="px-5 py-3.5">Designation &amp; Branch</th>
                      <th className="px-5 py-3.5">Stage / Status</th>
                      <th className="px-5 py-3.5">Official Joining Date</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {finalStageCandidates.map((cand) => {
                      const currentDateVal =
                        cand.joiningDateProvided ||
                        (cand.joiningDate ? new Date(cand.joiningDate).toISOString().slice(0, 10) : '');

                      return (
                        <tr
                          key={cand._id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <Avatar name={cand.candidateName} size="sm" />
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white">
                                  {cand.candidateName}
                                </p>
                                <p className="text-[11px] text-slate-500">{cand.email || cand.phoneNumber}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-3.5">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              {cand.candidatePost || 'Trainee'}
                            </p>
                            <p className="text-[11px] text-slate-500">{cand.branch || 'Ahmedabad'}</p>
                          </td>

                          <td className="px-5 py-3.5">
                            <StatusBadge status={cand.status || cand.stage || 'Selected'} />
                          </td>

                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <input
                                type="date"
                                defaultValue={currentDateVal}
                                onBlur={(e) => {
                                  if (e.target.value !== currentDateVal) {
                                    handleUpdateJoiningDate(cand._id, e.target.value);
                                  }
                                }}
                                className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                              />
                              {updatingJoiningDateId === cand._id && (
                                <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Open in Agreement Studio */}
                              <button
                                type="button"
                                onClick={() => {
                                  selectCandidate(cand);
                                  handleTabSelect('studio');
                                }}
                                className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold flex items-center gap-1 hover:bg-blue-100 transition-colors"
                              >
                                <FileSignature size={13} /> Open Studio
                              </button>

                              {/* 1-Click Convert to Employee */}
                              {!cand.convertedUserId && (
                                <button
                                  type="button"
                                  onClick={() => handleConvertToEmployee(cand)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors"
                                  title="Convert Candidate to Probation Employee"
                                >
                                  <UserPlus size={13} /> Convert to Employee
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: View Signed Agreement & Audit */}
      {viewSignedModal && (
        <Modal
          title={`Executed Agreement: ${viewSignedModal.documentTitle || viewSignedModal.templateName}`}
          onClose={() => setViewSignedModal(null)}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-6 text-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  {viewSignedModal.candidateName}
                </p>
                <p className="text-slate-500">{viewSignedModal.candidateEmail}</p>
                <p className="text-slate-500 font-medium mt-0.5">
                  {viewSignedModal.jobTitle} &bull; {viewSignedModal.officeLocation}
                </p>
              </div>

              <div>
                {viewSignedModal.candidateHasSigned || viewSignedModal.status === 'signed' ? (
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <CheckCircle2 size={13} /> Verified Digital Signature
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {new Date(viewSignedModal.signedAt).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    <Clock size={13} /> Pending Execution
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px] block mb-2">
                  Management Authorization
                </span>
                <div className="h-16 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-2">
                  {(viewSignedModal.managerSignatureImage || sirSignatureImage) ? (
                    <img
                      src={viewSignedModal.managerSignatureImage || sirSignatureImage}
                      alt="Authorized Signatory Signature"
                      className="max-h-full max-w-[180px] object-contain"
                    />
                  ) : (
                    <span className="italic text-slate-700 dark:text-slate-200 font-serif font-bold">
                      {viewSignedModal.managerName ? viewSignedModal.managerName.split('(')[0].trim() : 'Harshad Prajapati'}
                    </span>
                  )}
                </div>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-2">
                  {viewSignedModal.managerName || 'Harshad Prajapati (HR/Manager)'}
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px] block mb-2">
                  Recipient Digital Signature
                </span>
                <div className="h-16 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-2">
                  {viewSignedModal.candidateSignatureImage ? (
                    <img
                      src={viewSignedModal.candidateSignatureImage}
                      alt="Signature"
                      className="max-h-full object-contain"
                    />
                  ) : (
                    <span className="text-slate-400 italic">Signature Not Recorded</span>
                  )}
                </div>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-2">
                  {viewSignedModal.candidateName}
                </p>
              </div>
            </div>

            {viewSignedModal.questionAnswers &&
              Object.keys(viewSignedModal.questionAnswers).length > 0 && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px] block mb-1">
                    Clause Undertakings &amp; Confirmations
                  </span>
                  <div className="space-y-1.5">
                    {Object.entries(viewSignedModal.questionAnswers).map(([k, v]) => (
                      <div
                        key={k}
                        className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-xs"
                      >
                        <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                          {k.replace('_', ' ')}
                        </span>
                        <span className="font-bold text-emerald-600">Confirmed: [ {v} ]</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() =>
                  downloadAgreementPdf(
                    {
                      ...viewSignedModal,
                      managerSignatureImage: viewSignedModal.managerSignatureImage || sirSignatureImage || null,
                    },
                    viewSignedModal.candidateSignatureImage,
                    viewSignedModal.questionAnswers
                  )
                }
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Download size={14} /> Download PDF
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* SUCCESS MODAL AFTER CREATING & SENDING FOR SIGNATURE */}
      {(showSuccessModal || signingModalInfo) && (createdAgreementInfo || signingModalInfo) && (() => {
        const effectivePost =
          createdAgreementInfo?.post ||
          form.jobTitle ||
          selectedPerson?.candidatePost ||
          selectedPerson?.positionAppliedFor ||
          selectedPerson?.designation ||
          createdAgreementInfo?.docTitle ||
          signingModalInfo?.docTitle ||
          'Data Analyst';

        const effectiveEmail =
          createdAgreementInfo?.candidateEmail ||
          form.candidateEmail ||
          selectedPerson?.email ||
          signingModalInfo?.agreement?.candidateEmail ||
          '';

        const effectiveBranch = `${cleanOfficeLocation(
          createdAgreementInfo?.officeLocation ||
          form.officeLocation ||
          selectedPerson?.branch ||
          selectedPerson?.officeLocation
        )} Office`;

        const effectiveSigningUrl = createdAgreementInfo?.signingUrl || signingModalInfo?.url || '';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
              <div className="text-center mb-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl mb-3 shadow-xs font-bold">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Agreement Created &amp; Sent
                </h3>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700 text-xs space-y-2.5 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Post:</span>
                  <span className="font-semibold text-slate-800 dark:text-white">
                    {effectivePost}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Email:</span>
                  <span className="font-semibold text-slate-800 dark:text-white">
                    {effectiveEmail}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Branch:</span>
                  <span className="font-semibold text-slate-800 dark:text-white">
                    {effectiveBranch}
                  </span>
                </div>
              </div>

              {/* Direct Signing Link */}
              <div className="mb-5 space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Link:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={effectiveSigningUrl}
                    className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (effectiveSigningUrl) {
                        navigator.clipboard.writeText(effectiveSigningUrl);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2500);
                        feedback.success('Link copied to clipboard!');
                      }
                    }}
                    className="px-3.5 py-2 text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 rounded-xl transition shrink-0 cursor-pointer flex items-center gap-1.5"
                  >
                    {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowSuccessModal(false);
                    setSigningModalInfo(null);
                    handleTabSelect('vault');
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition cursor-pointer text-center"
                >
                  Go to Signed Vault
                </button>
                <a
                  href={effectiveSigningUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 transition cursor-pointer flex items-center justify-center gap-1 text-center"
                >
                  <ExternalLink size={13} /> Open Page
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setShowSuccessModal(false);
                    setSigningModalInfo(null);
                  }}
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: Delete Confirmation */}
      {agreementToDelete && (
        <Modal
          title="Delete Agreement Record"
          onClose={() => setAgreementToDelete(null)}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-400">
              Are you sure you want to delete the agreement record for{' '}
              <strong className="text-slate-900 dark:text-white">
                {agreementToDelete.candidateName}
              </strong>{' '}
              ({agreementToDelete.documentTitle || agreementToDelete.templateName})? This action cannot
              be undone.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAgreementToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAgreement}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm"
              >
                Delete Agreement
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
