import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertCircle,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Eraser,
  FileSignature,
  FileText,
  Lock,
  MapPin,
  PenTool,
  ShieldCheck,
  Type,
  User,
  X,
} from 'lucide-react';
import api, { getApiError } from '../lib/api';
import { downloadAgreementPdf } from '../utils/pdfGenerator';
import {
  cleanWordHtml,
  cleanWordText,
  isHtmlContent,
  substitutePlaceholders,
  textToHtml,
} from '../constants/agreementTemplates';

export default function CandidateAgreementSign() {
  const { id } = useParams();
  const [agreement, setAgreement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState({});
  const [termsDecision, setTermsDecision] = useState('Yes'); // 'Yes' | 'No'
  const [acknowledgedDocs, setAcknowledgedDocs] = useState(false);
  const [legalDeclaration, setLegalDeclaration] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signatureMode, setSignatureMode] = useState('draw'); // 'draw' | 'type'
  const [typedSignature, setTypedSignature] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isSignedSuccess, setIsSignedSuccess] = useState(false);
  const [autoDownloaded, setAutoDownloaded] = useState(false);

  // Canvas ref for drawing
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);

  useEffect(() => {
    fetchAgreement();
  }, [id]);

  const fetchAgreement = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/api/agreements/public/${id}`);
      const data = res.data;
      setAgreement(data);
      setSignerName(data.candidateName || '');

      // Initialize question answers if any
      const initialAnswers = { ...(data.questionAnswers || {}) };
      // Parse questions from documentContent (HTML or plain text)
      const contentStr = String(data.documentContent || data.templateContent || '');
      const questionFinderRegex = /(?:<div[^>]*>\s*)?<p[^>]*>\s*(?:<strong>)?\s*(?:Agreement\s*:\s*)?Yes\s*(\/|\sor\s)\s*No\s*(?:<\/strong>)?\s*<\/p>(?:\s*<\/div>)?|(?:\r?\n|^)\s*(?:Agreement\s*:\s*)?Yes\s*(\/|\sor\s)\s*No\s*(?=\r?\n|$)/gi;
      let qIndex = 0;
      while (questionFinderRegex.exec(contentStr) !== null) {
        const key = `clause_${qIndex}`;
        if (!initialAnswers[key]) {
          initialAnswers[key] = 'Yes';
        }
        qIndex++;
      }
      setAnswers(initialAnswers);

      if (data.status === 'signed' || data.candidateHasSigned) {
        setIsSignedSuccess(true);
      }
    } catch (err) {
      setError(getApiError(err, 'Failed to load agreement. The link may have expired or is invalid.'));
    } finally {
      setLoading(false);
    }
  };

  // Canvas Drawing Handlers
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawnSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnSignature(false);
  };

  const getSignatureDataUrl = () => {
    if (signatureMode === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawnSignature) return null;
      return canvas.toDataURL('image/png');
    }

    if (!typedSignature.trim()) return null;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 450;
    tempCanvas.height = 120;
    const ctx = tempCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    ctx.font = 'italic 34px "Segoe Script", "Brush Script MT", cursive, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedSignature.trim(), 20, 60);
    return tempCanvas.toDataURL('image/png');
  };

  const handleSubmitSignature = async (e) => {
    e.preventDefault();
    if (!signerName.trim()) {
      alert('Please enter your full legal name.');
      return;
    }

    if (termsDecision !== 'Yes') {
      alert('You have selected "No" on terms & conditions. You must accept all terms ("Yes") to digitally sign and execute this agreement.');
      return;
    }

    const signatureImg = getSignatureDataUrl();
    if (!signatureImg) {
      alert('Please provide your virtual digital signature (draw your signature or type your name).');
      return;
    }

    if (agreement.templateId === 'acknowledgement' && !acknowledgedDocs) {
      alert('Please confirm that you have reviewed and acknowledged receipt of all attached documents.');
      return;
    }

    if (!legalDeclaration) {
      alert('Please accept the mandatory legal declaration to proceed.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/api/agreements/public/${id}/sign`, {
        candidateName: signerName.trim(),
        candidateSignatureImage: signatureImg,
        questionAnswers: answers,
        termsAccepted: true,
      });

      const updatedDoc = {
        ...agreement,
        candidateName: signerName.trim(),
        candidateSignatureImage: signatureImg,
        candidateHasSigned: true,
        status: 'signed',
        signedAt: new Date().toISOString(),
        questionAnswers: answers,
      };

      setAgreement(updatedDoc);
      setIsSignedSuccess(true);
      setAutoDownloaded(true);

      // AUTOMATICALLY DOWNLOAD SIGNED COPY FOR USER IMMEDIATELY
      setTimeout(() => {
        try {
          downloadAgreementPdf(updatedDoc, signatureImg, answers);
        } catch (downloadErr) {
          console.warn('Auto download PDF error:', downloadErr);
        }
      }, 350);

      fetchAgreement();
    } catch (err) {
      alert(getApiError(err, 'Failed to submit signature. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadSignedPdf = () => {
    if (!agreement) return;
    const signatureImg = agreement.candidateSignatureImage || getSignatureDataUrl();
    downloadAgreementPdf(agreement, signatureImg, answers);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Loading Official Agreement...
          </p>
        </div>
      </div>
    );
  }

  if (error || !agreement) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700 text-center">
          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Agreement Not Available
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            {error || 'This agreement link is invalid, expired, or has been removed by HR.'}
          </p>
          <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            For questions or technical support, please contact the HR department.
          </div>
        </div>
      </div>
    );
  }

  const isAlreadySigned = agreement.status === 'signed' || isSignedSuccess;

  // Render document lines with interactive Undertaking Question elements
  const renderDocumentBody = () => {
    let rawContent = String(agreement.documentContent || agreement.templateContent || '');
    if (!isHtmlContent(rawContent)) {
      rawContent = textToHtml(cleanWordText(rawContent));
    } else {
      rawContent = cleanWordHtml(rawContent);
    }

    if (rawContent.includes('{{') || rawContent.includes('[')) {
      rawContent = substitutePlaceholders(rawContent, {
        candidateFullName: agreement.candidateName || signerName,
        candidateName: agreement.candidateName || signerName,
        candidateEmail: agreement.candidateEmail,
        jobTitle: agreement.jobTitle,
        department: agreement.department,
        officeLocation: agreement.officeLocation,
        companyName: agreement.companyName,
        managerName: agreement.managerName,
        ...(agreement.fields || {}),
      });
    }

    const questionCardRegex = /(?:<div[^>]*>\s*)?<p[^>]*>\s*(?:<strong>)?\s*(?:Agreement\s*:\s*)?Yes\s*(\/|\sor\s)\s*No\s*(?:<\/strong>)?\s*<\/p>(?:\s*<\/div>)?|(?:\r?\n|^)\s*(?:Agreement\s*:\s*)?Yes\s*(\/|\sor\s)\s*No\s*(?=\r?\n|$)/gi;

    const parts = [];
    let lastIndex = 0;
    let match;
    let qCounter = 0;

    while ((match = questionCardRegex.exec(rawContent)) !== null) {
      const chunk = rawContent.substring(lastIndex, match.index);
      if (chunk && chunk.trim()) {
        parts.push({ type: 'html', content: chunk, key: `html_${lastIndex}` });
      }
      const qKey = `clause_${qCounter++}`;
      parts.push({ type: 'question', qKey, key: `q_${qKey}` });
      lastIndex = match.index + match[0].length;
    }

    const remaining = rawContent.substring(lastIndex);
    if (remaining && remaining.trim()) {
      parts.push({ type: 'html', content: remaining, key: `html_${lastIndex}` });
    }

    return (
      <div className="space-y-4">
        {parts.map((part) => {
          if (part.type === 'html') {
            return (
              <div
                key={part.key}
                className="prose prose-sm sm:prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed
                [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table]:border [&_table]:border-slate-300 dark:[&_table]:border-slate-700
                [&_td]:border [&_td]:border-slate-300 dark:[&_td]:border-slate-700 [&_td]:p-2.5
                [&_th]:border [&_th]:border-slate-300 dark:[&_th]:border-slate-700 [&_th]:p-2.5 [&_th]:bg-slate-100 dark:[&_th]:bg-slate-800
                [&_p]:my-2 [&_p]:leading-relaxed
                [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-slate-900 dark:[&_h1]:text-white [&_h1]:mt-4 [&_h1]:mb-2
                [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-900 dark:[&_h2]:text-white [&_h2]:mt-3 [&_h2]:mb-1.5
                [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-slate-900 dark:[&_h3]:text-white [&_h3]:mt-3 [&_h3]:mb-1
                [&_strong]:font-bold [&_strong]:text-slate-900 dark:[&_strong]:text-white
                [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                dangerouslySetInnerHTML={{ __html: part.content }}
              />
            );
          }

          // Interactive Question Card
          const currentAns = answers[part.qKey] || agreement.questionAnswers?.[part.qKey] || 'Yes';
          return (
            <div
              key={part.key}
              className="my-4 p-4 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-blue-600 dark:text-blue-400" />
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                  Candidate Clause Acceptance:
                </span>
              </div>

              {isAlreadySigned ? (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    currentAns === 'Yes'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                  }`}
                >
                  <CheckCircle2 size={14} /> {currentAns === 'Yes' ? 'Accepted [ Yes ]' : 'Declined [ No ]'}
                </span>
              ) : (
                <div className="flex items-center gap-4 text-sm font-semibold">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                    <input
                      type="radio"
                      name={part.qKey}
                      value="Yes"
                      checked={currentAns === 'Yes'}
                      onChange={() => setAnswers((prev) => ({ ...prev, [part.qKey]: 'Yes' }))}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Yes, I Agree</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                    <input
                      type="radio"
                      name={part.qKey}
                      value="No"
                      checked={currentAns === 'No'}
                      onChange={() => setAnswers((prev) => ({ ...prev, [part.qKey]: 'No' }))}
                      className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                    />
                    <span>No</span>
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-950 dark:to-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Brand Header */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src="/vahlay-logo.jpg"
              alt="Vahlay Consulting Logo"
              className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-full shadow-xs ring-2 ring-slate-200 dark:ring-slate-700 bg-white shrink-0"
            />
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {agreement.companyName || 'Vahlay Consulting Inc.'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Candidate Agreement Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAlreadySigned ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 size={15} /> Digitally Signed &amp; Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <Clock size={16} /> Awaiting Candidate Signature
              </span>
            )}
          </div>
        </div>

        {/* Signed Success Banner */}
        {isAlreadySigned && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/80 rounded-2xl p-6 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-2xs">
              <CheckCircle2 size={26} />
            </div>
            <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
              Agreement Signed Successfully
            </h3>
            <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 max-w-xl mx-auto leading-relaxed">
              Your digital signature has been verified and recorded in the repository.
            </p>
            {autoDownloaded && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/90 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 text-xs font-semibold border border-emerald-300 dark:border-emerald-700">
                <Check size={14} className="text-emerald-600" />
                <span>Signed PDF copy downloaded to your device.</span>
              </div>
            )}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleDownloadSignedPdf}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <Download size={14} /> Download Signed PDF
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Print Document
              </button>
            </div>
          </div>
        )}

        {/* Candidate & Agreement Metadata Banner */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center gap-1.5 text-slate-500 font-medium mb-1">
                <User size={14} /> Candidate Name
              </div>
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                {agreement.candidateName}
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center gap-1.5 text-slate-500 font-medium mb-1">
                <Award size={14} /> Designation
              </div>
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                {agreement.jobTitle || 'Trainee / Associate'}
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center gap-1.5 text-slate-500 font-medium mb-1">
                <MapPin size={14} /> Location / Branch
              </div>
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                {agreement.officeLocation || 'Ahmedabad'}
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center gap-1.5 text-slate-500 font-medium mb-1">
                <Calendar size={14} /> Document Date
              </div>
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                {agreement.fields?.agreementDate || new Date().toISOString().slice(0, 10)}
              </p>
            </div>
          </div>
        </div>

        {/* Uploaded Dossier Documents (If Acknowledgement) */}
        {agreement.uploadedDocuments && agreement.uploadedDocuments.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="text-blue-600" size={20} />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Required Dossier Attachments ({agreement.uploadedDocuments.length})
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                Please download and review each document prior to signing
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {agreement.uploadedDocuments.map((doc, dIdx) => (
                <div
                  key={doc.id || dIdx}
                  className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                      <FileText size={16} />
                    </div>
                    <div className="truncate">
                      <p className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                        {doc.title || doc.name || `Document ${dIdx + 1}`}
                      </p>
                      <p className="text-[11px] text-slate-500">{doc.size || 'PDF Document'}</p>
                    </div>
                  </div>

                  <a
                    href={doc.fileUrl || doc.url || doc.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Download size={14} /> Open
                  </a>
                </div>
              ))}
            </div>

            {!isAlreadySigned && (
              <label className="flex items-start gap-3 p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={acknowledgedDocs}
                  onChange={(e) => setAcknowledgedDocs(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  I hereby confirm that I have accessed, downloaded, read, and received all the
                  documents listed above as part of my formal joining dossier.
                </span>
              </label>
            )}
          </div>
        )}

        {/* Main Document Content */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 sm:p-10 space-y-6">
          <div className="text-center pb-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-wide">
              {agreement.documentTitle || agreement.templateName || 'Official Employment Agreement'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Confidential Employment Document &bull; {agreement.companyName || 'Vahlay Consulting Inc.'}
            </p>
          </div>

          <div className="prose dark:prose-invert max-w-none">
            {renderDocumentBody()}
          </div>

          {/* Terms & Conditions Acceptance Section (Yes / No) */}
          {!isAlreadySigned && (
            <div className="my-8 p-6 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border-2 border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${termsDecision === 'Yes' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'}`}>
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                    Terms &amp; Conditions Agreement Decision
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Please confirm your agreement to all rules, clauses, responsibilities and terms set forth above.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setTermsDecision('Yes')}
                  className={`p-4 rounded-xl border-2 text-left flex items-start gap-3 transition cursor-pointer ${
                    termsDecision === 'Yes'
                      ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 shadow-xs ring-1 ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                    termsDecision === 'Yes' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-400'
                  }`}>
                    {termsDecision === 'Yes' && <Check size={12} />}
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
                      <span>Yes, I Agree &amp; Accept All Terms</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      I have reviewed and agree to comply with all policies and conditions.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTermsDecision('No')}
                  className={`p-4 rounded-xl border-2 text-left flex items-start gap-3 transition cursor-pointer ${
                    termsDecision === 'No'
                      ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 shadow-xs ring-1 ring-rose-500'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                    termsDecision === 'No' ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-400'
                  }`}>
                    {termsDecision === 'No' && <X size={12} />}
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
                      <span>No, I Decline Terms</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      I disagree with one or more provisions in this document.
                    </p>
                  </div>
                </button>
              </div>

              {termsDecision === 'No' && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-rose-600" />
                  <span>
                    <strong>Notice:</strong> You have selected <strong>No</strong>. You cannot digitally sign or execute this agreement if you decline the terms. If you have questions or concerns regarding specific clauses, please contact Vahlay Consulting HR before proceeding.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Signature & Authorization Section */}
          <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Authorized Manager Block */}
              <div className="p-5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    AUTHORIZED SIGNATORY &amp; CORPORATE SEAL
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 size={11} /> Verified Signatory
                  </span>
                </div>

                <div className="h-16 flex items-center">
                  {agreement.managerSignatureImage ? (
                    <img
                      src={agreement.managerSignatureImage}
                      alt="Authorized Manager Signature"
                      className="max-h-full max-w-[200px] object-contain"
                    />
                  ) : (
                    <div className="text-2xl font-serif italic font-bold text-blue-900 dark:text-blue-300 tracking-wide select-none">
                      {agreement.managerName ? agreement.managerName.split('(')[0].trim() : 'Harshad Prajapati'}
                    </div>
                  )}
                </div>

                <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60 space-y-0.5">
                  <p className="font-bold text-xs text-slate-900 dark:text-white">
                    {agreement.managerName || 'Harshad Prajapati (HR/Manger)'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Authorized Human Resources Signatory
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {agreement.companyName || 'Vahlay Consulting Inc.'}
                  </p>
                </div>
              </div>

              {/* Candidate Digital Signature Block */}
              <div className="p-5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Candidate Digital Signature
                  </span>
                  {isAlreadySigned ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                      <CheckCircle2 size={12} /> Signed & Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                      <Clock size={12} /> Signature Required
                    </span>
                  )}
                </div>

                {isAlreadySigned ? (
                  <div className="h-20 flex items-center justify-center border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 overflow-hidden p-2">
                    {agreement.candidateSignatureImage ? (
                      <img
                        src={agreement.candidateSignatureImage}
                        alt="Candidate Signature"
                        className="max-h-full object-contain"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {agreement.candidateName}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Mode Selector */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSignatureMode('draw')}
                        className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                          signatureMode === 'draw'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <PenTool size={13} /> Draw Signature
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignatureMode('type')}
                        className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                          signatureMode === 'type'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <Type size={13} /> Type Signature
                      </button>
                    </div>

                    {signatureMode === 'draw' ? (
                      <div>
                        <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl bg-white overflow-hidden">
                          <canvas
                            ref={canvasRef}
                            width={380}
                            height={120}
                            className="w-full h-28 touch-none cursor-crosshair bg-white"
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                          />
                          {!hasDrawnSignature && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-slate-400">
                              Sign above using mouse or touch
                            </div>
                          )}
                        </div>
                        <div className="flex justify-end mt-1.5">
                          <button
                            type="button"
                            onClick={clearCanvas}
                            className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 font-medium"
                          >
                            <Eraser size={12} /> Clear Signature
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={typedSignature}
                          onChange={(e) => setTypedSignature(e.target.value)}
                          placeholder="Type your full legal name"
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {typedSignature.trim() && (
                          <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                            <span className="font-serif italic text-xl text-slate-800 dark:text-slate-100">
                              {typedSignature.trim()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <p className="font-bold text-xs text-slate-900 dark:text-white">
                    {agreement.candidateName}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {agreement.candidateEmail || 'Candidate'}
                  </p>
                  {agreement.signedAt && (
                    <p className="text-[11px] text-emerald-600 font-medium">
                      Signed on {new Date(agreement.signedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Submission Form for Unsigned Agreements */}
            {!isAlreadySigned && (
              <form onSubmit={handleSubmitSignature} className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Full Legal Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="Enter your full legal name"
                      required
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-3 p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={legalDeclaration}
                    onChange={(e) => setLegalDeclaration(e.target.checked)}
                    required
                    className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                    I declare under penalty of perjury that I am {agreement.candidateName}, that I have
                    carefully read and understood all clauses in this agreement, and that this digital
                    signature represents my legally binding execution of the document.
                  </span>
                </label>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Lock size={14} className="text-slate-400" />
                    <span>256-bit Encrypted Digital Audit Recorded</span>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || termsDecision !== 'Yes'}
                    className={`px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 ${
                      termsDecision === 'Yes' && !submitting
                        ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                        : 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed opacity-60'
                    }`}
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Verifying &amp; Submitting...
                      </>
                    ) : termsDecision === 'No' ? (
                      <>
                        <X size={15} /> Cannot Sign (Terms Declined)
                      </>
                    ) : (
                      <>
                        <FileSignature size={15} /> Execute &amp; Sign Agreement
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-400 py-4">
          &copy; {new Date().getFullYear()} {agreement.companyName || 'Vahlay Consulting Inc.'} &bull; All Rights Reserved.
        </div>
      </div>
    </div>
  );
}
