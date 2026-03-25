'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download, RefreshCw, Star } from 'lucide-react';
import { toast } from 'sonner';

import { ComplaintTrackingTimeline } from '@/components/complaint-tracking-timeline';
import { DashboardLayout } from '@/components/dashboard-layout';
import { LoadingSummary, TrackerDetailsSkeleton } from '@/components/loading-skeletons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import {
  buildComplaintTrackerSnapshot,
  formatTrackerDateTime,
  type ComplaintTrackerSnapshot,
} from '@/lib/complaint-tracker';
import { fetchComplaintById, fetchComplaints, rateComplaint } from '@/lib/client/complaints';
import type { Complaint } from '@/lib/types';

const FEEDBACK_TAGS = ['Good Service', 'Quick Response', 'Delay', 'Issue Not Fixed', 'Need Follow-up'];

const PDF_PAGE_WIDTH = 595;
const PDF_PAGE_HEIGHT = 842;
const PDF_MARGIN = 42;
const PDF_CONTENT_WIDTH = PDF_PAGE_WIDTH - PDF_MARGIN * 2;

type PdfColor = [number, number, number];

function normalizePdfText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\r/g, '')
    .replace(/[^\x20-\x7E\n]/g, ' ');
}

function escapePdfText(value: string) {
  return normalizePdfText(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function getPdfText(value?: string | null, emptyLabel = 'Not yet updated') {
  const normalized = normalizePdfText((value || '').trim());
  return normalized || emptyLabel;
}

function formatPdfNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
}

function formatPdfColor(color: PdfColor) {
  return color.map((value) => value.toFixed(3)).join(' ');
}

function drawPdfText(
  text: string,
  x: number,
  y: number,
  size = 11,
  font: 'F1' | 'F2' = 'F1',
  color: PdfColor = [0.059, 0.098, 0.165],
) {
  return `BT /${font} ${formatPdfNumber(size)} Tf ${formatPdfColor(color)} rg 1 0 0 1 ${formatPdfNumber(x)} ${formatPdfNumber(y)} Tm (${escapePdfText(text)}) Tj ET`;
}

function drawPdfFilledRect(x: number, y: number, width: number, height: number, color: PdfColor) {
  return `q ${formatPdfColor(color)} rg ${formatPdfNumber(x)} ${formatPdfNumber(y)} ${formatPdfNumber(width)} ${formatPdfNumber(height)} re f Q`;
}

function drawPdfStrokedRect(
  x: number,
  y: number,
  width: number,
  height: number,
  color: PdfColor = [0.741, 0.780, 0.839],
) {
  return `q 0.8 w ${formatPdfColor(color)} RG ${formatPdfNumber(x)} ${formatPdfNumber(y)} ${formatPdfNumber(width)} ${formatPdfNumber(height)} re S Q`;
}

function drawPdfLine(x1: number, y1: number, x2: number, y2: number, color: PdfColor = [0.741, 0.780, 0.839]) {
  return `q 0.8 w ${formatPdfColor(color)} RG ${formatPdfNumber(x1)} ${formatPdfNumber(y1)} m ${formatPdfNumber(x2)} ${formatPdfNumber(y2)} l S Q`;
}

function wrapPdfText(value: string, maxWidth: number, fontSize: number) {
  const maxChars = Math.max(16, Math.floor(maxWidth / (fontSize * 0.52)));
  const paragraphs = normalizePdfText(value).split('\n');
  const lines: string[] = [];

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);

    if (!words.length) {
      lines.push('');
      return;
    }

    let currentLine = '';

    words.forEach((word) => {
      if (word.length > maxChars) {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = '';
        }

        for (let index = 0; index < word.length; index += maxChars) {
          lines.push(word.slice(index, index + maxChars));
        }

        return;
      }

      const candidate = currentLine ? `${currentLine} ${word}` : word;

      if (candidate.length > maxChars) {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      } else {
        currentLine = candidate;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    if (paragraphIndex < paragraphs.length - 1) {
      lines.push('');
    }
  });

  return lines.length ? lines : [''];
}

function formatExportState(state: ComplaintTrackerSnapshot['timeline'][number]['state']) {
  if (state === 'completed') {
    return 'Completed';
  }

  if (state === 'current') {
    return 'In Progress';
  }

  return 'Pending';
}

function buildComplaintReportPdf({
  complaint,
  tracker,
  lastSyncedAt,
  exportedAt,
}: {
  complaint: Complaint;
  tracker: ComplaintTrackerSnapshot;
  lastSyncedAt: string | null;
  exportedAt: string;
}) {
  const pages: string[][] = [[]];
  const summaryRows: Array<[string, string]> = [
    ['Complaint ID', complaint.complaint_id],
    ['Status', tracker.humanStatus],
    ['Department', tracker.departmentLabel],
    ['Current Handling Desk', tracker.assignmentLabel || 'Not assigned'],
    ['Current Stage', tracker.currentStageTitle],
    ['Last Updated', tracker.latestEventAt ? formatTrackerDateTime(tracker.latestEventAt) : 'Not yet updated'],
    ['Last Synced', lastSyncedAt ? formatTrackerDateTime(lastSyncedAt) : 'Not yet updated'],
    ['Priority', tracker.priorityLabel],
  ];
  let currentPageIndex = 0;
  let y = PDF_PAGE_HEIGHT - PDF_MARGIN;

  const recordStatusColors: Record<ComplaintTrackerSnapshot['timeline'][number]['state'], PdfColor> = {
    completed: [0.114, 0.427, 0.196],
    current: [0.043, 0.235, 0.365],
    upcoming: [0.420, 0.475, 0.565],
  };

  function currentPage() {
    return pages[currentPageIndex];
  }

  function pushCommand(command: string) {
    currentPage().push(command);
  }

  function startContinuationPage() {
    const top = PDF_PAGE_HEIGHT - PDF_MARGIN;

    pushCommand(drawPdfFilledRect(PDF_MARGIN, top - 22, PDF_CONTENT_WIDTH, 22, [0.043, 0.235, 0.365]));
    pushCommand(drawPdfText('Citizen Complaint Tracking Report', PDF_MARGIN + 10, top - 15, 11, 'F2', [1, 1, 1]));
    pushCommand(drawPdfText(complaint.complaint_id, PDF_MARGIN + 365, top - 15, 10, 'F1', [1, 1, 1]));
    y = top - 34;
  }

  function addPage() {
    pages.push([]);
    currentPageIndex += 1;
    startContinuationPage();
  }

  function ensureSpace(height: number) {
    if (y - height < PDF_MARGIN) {
      addPage();
    }
  }

  function addSectionHeading(title: string) {
    ensureSpace(28);
    const headingHeight = 20;
    const bottom = y - headingHeight;

    pushCommand(drawPdfFilledRect(PDF_MARGIN, bottom, PDF_CONTENT_WIDTH, headingHeight, [0.941, 0.957, 0.980]));
    pushCommand(drawPdfStrokedRect(PDF_MARGIN, bottom, PDF_CONTENT_WIDTH, headingHeight));
    pushCommand(drawPdfText(title, PDF_MARGIN + 10, bottom + 6, 11, 'F2', [0.043, 0.235, 0.365]));
    y = bottom - 8;
  }

  function addDetailRow(label: string, value: string) {
    const leftColumnWidth = 154;
    const rowWidth = PDF_CONTENT_WIDTH;
    const valueWidth = rowWidth - leftColumnWidth - 20;
    const valueLines = wrapPdfText(value, valueWidth, 10.5);
    const labelLines = wrapPdfText(label, leftColumnWidth - 16, 10.5);
    const lineCount = Math.max(valueLines.length, labelLines.length);
    const rowHeight = Math.max(26, lineCount * 12 + 10);

    ensureSpace(rowHeight + 2);

    const rowBottom = y - rowHeight;
    const separatorX = PDF_MARGIN + leftColumnWidth;

    pushCommand(drawPdfStrokedRect(PDF_MARGIN, rowBottom, rowWidth, rowHeight));
    pushCommand(drawPdfLine(separatorX, rowBottom, separatorX, rowBottom + rowHeight));

    labelLines.forEach((line, index) => {
      pushCommand(drawPdfText(line, PDF_MARGIN + 8, y - 14 - index * 12, 10.5, 'F2'));
    });

    valueLines.forEach((line, index) => {
      pushCommand(drawPdfText(line, separatorX + 10, y - 14 - index * 12, 10.5, 'F1', [0.196, 0.231, 0.286]));
    });

    y = rowBottom;
  }

  function addParagraphBlock(value: string) {
    const lines = wrapPdfText(value, PDF_CONTENT_WIDTH - 18, 10.5);
    let lineIndex = 0;

    while (lineIndex < lines.length) {
      const availableHeight = y - PDF_MARGIN - 12;
      const maxLinesThisPage = Math.max(1, Math.floor(availableHeight / 12) - 1);
      const chunk = lines.slice(lineIndex, lineIndex + maxLinesThisPage);
      const blockHeight = Math.max(26, chunk.length * 12 + 10);

      ensureSpace(blockHeight + 2);

      const blockBottom = y - blockHeight;
      pushCommand(drawPdfStrokedRect(PDF_MARGIN, blockBottom, PDF_CONTENT_WIDTH, blockHeight));

      chunk.forEach((line, index) => {
        pushCommand(drawPdfText(line, PDF_MARGIN + 8, y - 14 - index * 12, 10.5, 'F1', [0.196, 0.231, 0.286]));
      });

      y = blockBottom;
      lineIndex += chunk.length;

      if (lineIndex < lines.length) {
        addPage();
      }
    }
  }

  function addProgressRecord(step: ComplaintTrackerSnapshot['timeline'][number], index: number) {
    const statusLabel = formatExportState(step.state).toUpperCase();
    const badgeColor = recordStatusColors[step.state];
    const detailLines = wrapPdfText(getPdfText(step.description), PDF_CONTENT_WIDTH - 24, 10);
    const recordHeight = Math.max(56, 42 + detailLines.length * 12);

    ensureSpace(recordHeight + 4);

    const recordBottom = y - recordHeight;

    pushCommand(drawPdfStrokedRect(PDF_MARGIN, recordBottom, PDF_CONTENT_WIDTH, recordHeight));
    pushCommand(drawPdfFilledRect(PDF_MARGIN + 10, y - 18, 92, 14, badgeColor));
    pushCommand(drawPdfText(statusLabel, PDF_MARGIN + 17, y - 14, 8.5, 'F2', [1, 1, 1]));
    pushCommand(drawPdfText(`${index + 1}. ${step.title}`, PDF_MARGIN + 114, y - 14, 11, 'F2'));
    pushCommand(drawPdfText(step.timestampLabel, PDF_MARGIN + 342, y - 14, 9.5, 'F1', [0.345, 0.396, 0.471]));
    pushCommand(drawPdfText('Details:', PDF_MARGIN + 12, y - 32, 9.5, 'F2', [0.043, 0.235, 0.365]));

    detailLines.forEach((line, lineIndex) => {
      pushCommand(drawPdfText(line, PDF_MARGIN + 58, y - 32 - lineIndex * 12, 10, 'F1', [0.196, 0.231, 0.286]));
    });

    y = recordBottom - 4;
  }

  function finalizePdfDocument(pageCommands: string[][]) {
    const pageCount = pageCommands.length;
    const fontRegularObjectId = 3;
    const fontBoldObjectId = 4;
    const contentObjectBase = 5;
    const pageObjectBase = contentObjectBase + pageCount;
    const objects = new Map<number, string>();

    objects.set(1, '<< /Type /Catalog /Pages 2 0 R >>');
    objects.set(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    objects.set(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

    pageCommands.forEach((commands, index) => {
      const footerY = 22;
      const contentWithFooter = [
        ...commands,
        drawPdfLine(PDF_MARGIN, 34, PDF_PAGE_WIDTH - PDF_MARGIN, 34, [0.741, 0.780, 0.839]),
        drawPdfText(
          `Municipal Corporation of India | Government Verified Record | Page ${index + 1} of ${pageCount}`,
          PDF_MARGIN,
          footerY,
          8.5,
          'F1',
          [0.345, 0.396, 0.471],
        ),
      ].join('\n');
      const contentObjectId = contentObjectBase + index;
      const contentLength = new TextEncoder().encode(contentWithFooter).length;

      objects.set(
        contentObjectId,
        `<< /Length ${contentLength} >>\nstream\n${contentWithFooter}\nendstream`,
      );
    });

    const pageObjectIds = pageCommands.map((_, index) => pageObjectBase + index);
    objects.set(
      2,
      `<< /Type /Pages /Count ${pageCount} /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] >>`,
    );

    pageCommands.forEach((_, index) => {
      const pageObjectId = pageObjectBase + index;
      const contentObjectId = contentObjectBase + index;

      objects.set(
        pageObjectId,
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontRegularObjectId} 0 R /F2 ${fontBoldObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
      );
    });

    const maxObjectId = pageObjectBase + pageCount - 1;
    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0];

    for (let objectId = 1; objectId <= maxObjectId; objectId += 1) {
      offsets[objectId] = new TextEncoder().encode(pdf).length;
      pdf += `${objectId} 0 obj\n${objects.get(objectId)}\nendobj\n`;
    }

    const xrefOffset = new TextEncoder().encode(pdf).length;
    pdf += `xref\n0 ${maxObjectId + 1}\n`;
    pdf += '0000000000 65535 f \n';

    for (let objectId = 1; objectId <= maxObjectId; objectId += 1) {
      pdf += `${String(offsets[objectId]).padStart(10, '0')} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size ${maxObjectId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return new Blob([pdf], { type: 'application/pdf' });
  }

  const headerTop = PDF_PAGE_HEIGHT - PDF_MARGIN;
  const headerHeight = 104;
  const headerBottom = headerTop - headerHeight;
  const badgeWidth = 152;

  pushCommand(drawPdfStrokedRect(PDF_MARGIN, headerBottom, PDF_CONTENT_WIDTH, headerHeight, [0.565, 0.647, 0.741]));
  pushCommand(drawPdfFilledRect(PDF_MARGIN, headerTop - 8, PDF_CONTENT_WIDTH / 3, 8, [1, 0.600, 0.200]));
  pushCommand(drawPdfFilledRect(PDF_MARGIN + PDF_CONTENT_WIDTH / 3, headerTop - 8, PDF_CONTENT_WIDTH / 3, 8, [1, 1, 1]));
  pushCommand(drawPdfFilledRect(PDF_MARGIN + (PDF_CONTENT_WIDTH / 3) * 2, headerTop - 8, PDF_CONTENT_WIDTH / 3, 8, [0.075, 0.533, 0.031]));
  pushCommand(drawPdfText('Municipal Corporation of India', PDF_MARGIN + 16, headerTop - 34, 20, 'F2', [0.043, 0.235, 0.365]));
  pushCommand(drawPdfText('Citizen Complaint Tracking Report', PDF_MARGIN + 16, headerTop - 56, 13, 'F2', [0.196, 0.231, 0.286]));
  pushCommand(
    drawPdfText(
      `Complaint ID: ${complaint.complaint_id} | Exported On: ${formatTrackerDateTime(exportedAt)}`,
      PDF_MARGIN + 16,
      headerTop - 74,
      10,
      'F1',
      [0.345, 0.396, 0.471],
    ),
  );
  pushCommand(
    drawPdfText(
      'Official municipal complaint record with verified progress visibility and evidence summary.',
      PDF_MARGIN + 16,
      headerTop - 88,
      9.5,
      'F1',
      [0.345, 0.396, 0.471],
    ),
  );
  pushCommand(drawPdfFilledRect(PDF_MARGIN + PDF_CONTENT_WIDTH - badgeWidth - 14, headerTop - 52, badgeWidth, 30, [0.114, 0.427, 0.196]));
  pushCommand(drawPdfText('GOVERNMENT VERIFIED', PDF_MARGIN + PDF_CONTENT_WIDTH - badgeWidth - 4, headerTop - 40, 9, 'F2', [1, 1, 1]));
  pushCommand(drawPdfText('DIGITAL SERVICE RECORD', PDF_MARGIN + PDF_CONTENT_WIDTH - badgeWidth - 2, headerTop - 52, 8.5, 'F2', [1, 1, 1]));

  y = headerBottom - 16;

  addSectionHeading('Complaint Summary Panel');
  summaryRows.forEach(([label, value]) => addDetailRow(label, getPdfText(value)));

  addSectionHeading('Complaint Description');
  addParagraphBlock(getPdfText(complaint.text));

  addSectionHeading('Citizen Submitted Evidence');
  addDetailRow(
    'Photographs Attached',
    complaint.attachments?.length
      ? `${complaint.attachments.length} photograph(s) were submitted with the original complaint.`
      : 'No complaint photographs are recorded.',
  );
  if (complaint.attachments?.length) {
    addParagraphBlock(
      `Citizen Evidence File Reference: ${complaint.attachments.map((attachment) => attachment.url).join(', ')}\nOpen the complaint tracker portal for image preview and verification.`,
    );
  }

  addSectionHeading('Official Progress Log');
  tracker.timeline.forEach((step, index) => addProgressRecord(step, index));

  addSectionHeading('Current Handling Desk');
  addDetailRow('Handling Desk', getPdfText(tracker.assignmentLabel, 'Not assigned'));
  addDetailRow('Department', getPdfText(tracker.departmentLabel));
  addDetailRow('Status', getPdfText(tracker.assignmentStatusLabel));
  addDetailRow('Assignment Note', getPdfText(tracker.assignmentDescription));

  addSectionHeading('Work Completion Evidence');
  addDetailRow('Description', getPdfText(complaint.proof_text));
  addDetailRow(
    'Submitted Timestamp',
    formatTrackerDateTime(
      complaint.resolved_at ||
      complaint.completed_at ||
      tracker.timeline.find((step) => step.key === 'completion_verification')?.timestamp ||
      complaint.updated_at,
    ),
  );
  addDetailRow('Evidence Status', tracker.proofSubmitted ? 'Evidence available in complaint record' : 'Pending action');
  const proofImageLinks = complaint.proof_images?.length
    ? complaint.proof_images.map((image) => image.url)
    : complaint.proof_image?.url
      ? [complaint.proof_image.url]
      : [];
  if (proofImageLinks.length) {
    addParagraphBlock(
      `Evidence File Reference: ${proofImageLinks.join(', ')}\nOpen the complaint tracker portal for image preview and verification.`,
    );
  }

  if (complaint.rating || complaint.status === 'resolved') {
    addSectionHeading('Citizen Feedback');
    addDetailRow('Submitted Rating', complaint.rating ? `${complaint.rating.rating}/5` : 'Pending action');
    addParagraphBlock(getPdfText(complaint.rating?.feedback, complaint.rating ? 'Not yet updated' : 'Pending action'));
  }

  return finalizePdfDocument(pages);
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 bg-white px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b border-slate-200 px-5 py-4">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
    </div>
  );
}

function getOperationalLogTone(entry: { kind: 'update' | 'routing'; title: string; detail?: string | null }) {
  const haystack = `${entry.title} ${entry.detail || ''}`.toLowerCase();

  if (haystack.includes('reminder') || haystack.includes('monitoring') || haystack.includes('senior')) {
    return 'amber';
  }

  if (haystack.includes('reopened') || haystack.includes('fresh action')) {
    return 'rose';
  }

  if (entry.kind === 'routing') {
    return 'sky';
  }

  return 'slate';
}

function isOperationalSubtimelineEntry(entry: { kind: 'update' | 'routing'; title: string; detail?: string | null }) {
  const haystack = `${entry.title} ${entry.detail || ''}`.toLowerCase();

  return (
    entry.kind === 'routing' ||
    haystack.includes('monitoring') ||
    haystack.includes('reminder') ||
    haystack.includes('reopened') ||
    haystack.includes('fresh action') ||
    haystack.includes('final review desk') ||
    haystack.includes('closure review')
  );
}

function DetailSkeletonBlock({ title }: { title: string }) {
  return (
    <Card className="rounded-none border border-slate-300 bg-white py-0 shadow-none">
      <SectionHeading title={title} description="Fetching latest updates..." />
      <CardContent className="px-5 py-5">
        <TrackerDetailsSkeleton />
      </CardContent>
    </Card>
  );
}

export default function TrackerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const complaintId = searchParams?.get('id')?.trim() || '';
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lookupId, setLookupId] = useState(complaintId);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(5);
  const [savingRating, setSavingRating] = useState(false);
  const [selectedFeedbackTags, setSelectedFeedbackTags] = useState<string[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const complaintIdPattern = /^[A-Z]{2,5}-\d{4,8}-\d{3,}$/;

  const tracker = useMemo(
    () => (complaint ? buildComplaintTrackerSnapshot(complaint) : null),
    [complaint],
  );
  const operationalSubtimeline = useMemo(
    () => (complaint?.history_card?.actions_log || []).filter(isOperationalSubtimelineEntry),
    [complaint],
  );

  const loadComplaintSummary = useCallback(async (targetComplaintId?: string, force = false) => {
    const requestId = ++requestIdRef.current;
    setError('');

    if (force) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setDetailsLoading(true);

    try {
      let detailedComplaint: Complaint | null = null;
      const resolvedId = targetComplaintId?.trim() || complaintId;

      if (resolvedId) {
        detailedComplaint = await fetchComplaintById(resolvedId, { view: 'full', force });
      } else {
        const result = await fetchComplaints({ mine: true, page_size: 1 });
        const firstComplaint = result.items[0] || null;

        if (firstComplaint) {
          detailedComplaint = await fetchComplaintById(firstComplaint.complaint_id, { view: 'full', force });
        }
      }

      if (requestIdRef.current !== requestId) {
        return;
      }

      setComplaint(detailedComplaint);
      setLookupId(detailedComplaint?.complaint_id || resolvedId || '');
      setLastSyncedAt(new Date().toISOString());
      setFeedback(detailedComplaint?.rating?.feedback || '');
      setRating(detailedComplaint?.rating?.rating || 5);
    } catch (loadError) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      setComplaint(null);
      setDetailsLoading(false);
      setError(loadError instanceof Error ? loadError.message : 'Complaint could not be loaded.');
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
        setDetailsLoading(false);
        setRefreshing(false);
      }
    }
  }, [complaintId]);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedFeedbackTags([]);
  }, [complaint?.id]);

  useEffect(() => {
    setLookupId(complaintId);
    void loadComplaintSummary(complaintId);
  }, [complaintId, loadComplaintSummary]);

  useEffect(() => {
    const liveComplaintId = complaint?.complaint_id || complaintId;

    if (!liveComplaintId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      fetchComplaintById(liveComplaintId, { view: 'full', force: true })
        .then((nextComplaint) => {
          setComplaint(nextComplaint);
          setLastSyncedAt(new Date().toISOString());
        })
        .catch((pollError) => {
          console.error('Unable to refresh complaint tracker automatically', pollError);
        });
    }, 20000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [complaint?.complaint_id, complaintId]);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = lookupId.trim().toUpperCase();

    if (!value) {
      toast.error('Enter a complaint ID to continue.');
      return;
    }

    if (!complaintIdPattern.test(value)) {
      setError('Invalid Complaint ID');
      toast.error('Invalid Complaint ID');
      return;
    }

    router.replace(`/citizen/tracker?id=${encodeURIComponent(value)}`);
  }

  function toggleFeedbackTag(tag: string) {
    setSelectedFeedbackTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  }

  async function handleRating() {
    if (!complaint) {
      return;
    }

    setSavingRating(true);
    const targetComplaintId = complaint.id;
    const targetComplaintCode = complaint.complaint_id;
    const combinedFeedback = [
      selectedFeedbackTags.length ? `Tags: ${selectedFeedbackTags.join(', ')}` : '',
      feedback.trim(),
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const submittedRating = await rateComplaint(targetComplaintId, {
        rating,
        feedback: combinedFeedback || undefined,
      });

      setComplaint((current) => {
        if (!current || current.id !== targetComplaintId) {
          return current;
        }

        return {
          ...current,
          rating: submittedRating,
        };
      });
      setLastSyncedAt(new Date().toISOString());
      setSelectedFeedbackTags([]);
      toast.success('Feedback submitted successfully.');
      void loadComplaintSummary(targetComplaintCode, true);
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : 'Unable to submit feedback.');
    } finally {
      setSavingRating(false);
    }
  }

function handleExportReport() {
    if (!complaint || !tracker) {
      toast.error('Complaint report is not available for export.');
      return;
    }

    const exportedAt = new Date().toISOString();
    const reportPdf = buildComplaintReportPdf({
      complaint,
      tracker,
      lastSyncedAt,
      exportedAt,
    });
    const downloadUrl = URL.createObjectURL(reportPdf);
    const link = document.createElement('a');
    const dateStamp = exportedAt.slice(0, 10);

    link.href = downloadUrl;
    link.download = `complaint-report-${complaint.complaint_id}-${dateStamp}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(downloadUrl);
    }, 1000);

    toast.success('Complaint PDF exported successfully.');
  }

  const proofSubmittedAt =
    complaint?.resolved_at ||
    complaint?.completed_at ||
    tracker?.timeline.find((step) => step.key === 'completion_verification')?.timestamp ||
    complaint?.updated_at ||
    null;
  const submittedAttachments = complaint?.attachments || [];
  const proofImages = complaint?.proof_images?.length
    ? complaint.proof_images
    : complaint?.proof_image
      ? [complaint.proof_image]
      : [];
  const hasCompletionEvidence = Boolean(
    proofImages.length ||
    complaint?.proof_text?.trim() ||
    complaint?.resolved_at ||
    complaint?.completed_at ||
    tracker?.timeline.find((step) => step.key === 'completion_verification')?.timestamp,
  );
  const canRateResolution = Boolean(
    complaint?.status === 'resolved' ||
    tracker?.waitingForFeedback ||
    (hasCompletionEvidence && complaint?.status !== 'expired'),
  );
  const isExpiredComplaint = complaint?.status === 'expired';
  const citizenRatingLabel = complaint?.rating
    ? `${complaint.rating.rating}/5${complaint.rating.rating >= 4 ? ' - Satisfied' : ' - Review Required'}`
    : canRateResolution
      ? 'Pending citizen confirmation'
      : 'Not yet submitted';

  return (
    <DashboardLayout title="Complaint Tracker" compactCitizenHeader>
      <div className="space-y-6">
        <section className="border border-slate-300 bg-white">
          <div className="grid h-1.5 w-full grid-cols-3 overflow-hidden">
            <div className="bg-[#ff9933]" />
            <div className="bg-white" />
            <div className="bg-[#138808]" />
          </div>

          <div className="space-y-4 px-5 py-5">
            <div className="text-xs text-slate-500">Home &gt; Citizen Dashboard &gt; Complaint Tracker</div>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-slate-950">Citizen Complaint Tracking System</h1>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                  This portal provides real-time complaint progress, field-work visibility, official evidence records, and citizen feedback submission in one verified tracking journey.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleExportReport}
                disabled={!complaint || loading || detailsLoading}
                className="rounded-none border-slate-300 text-slate-700"
              >
                <Download className="h-4 w-4" />
                Export PDF
              </Button>
            </div>

            <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
              <Input
                ref={searchInputRef}
                value={lookupId}
                onChange={(event) => setLookupId(event.target.value)}
                placeholder="Enter Complaint ID"
                className="h-11 rounded-none border-slate-300"
              />
              <Button type="submit" className="rounded-none bg-[#0b3c5d] text-white hover:bg-[#082d46]">
                Track Complaint
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadComplaintSummary(complaint?.complaint_id || complaintId || lookupId, true)}
                disabled={refreshing || loading || detailsLoading}
                className="rounded-none"
              >
                {refreshing ? <Spinner label="Refreshing..." size="sm" /> : <><RefreshCw className="h-4 w-4" /> Refresh Data</>}
              </Button>
            </form>

            {loading ? (
              <LoadingSummary label="Fetching latest updates..." description="Complaint summary is being loaded." className="rounded-none" />
            ) : null}

            {error ? (
              <div className="border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
          </div>
        </section>

        {loading ? (
          <TrackerDetailsSkeleton />
        ) : complaint && tracker ? (
          <div className="space-y-6">
            <section className="border border-slate-300 bg-white">
              <SectionHeading title="Complaint Summary Panel" description="Official report header for the selected complaint." />
              <div className="space-y-4 px-5 py-5">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="rounded-none border border-[#cfe0ef] bg-[#eef6fb] px-3 py-1 text-sm font-semibold text-[#0b3c5d]">
                    {tracker.humanStatus}
                  </Badge>
                  {complaint.joined_issue ? (
                    <Badge className="rounded-none border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">
                      Joined Issue
                    </Badge>
                  ) : null}
                  <span className="text-sm text-slate-600">
                    Last Updated: {tracker.latestEventAt ? formatTrackerDateTime(tracker.latestEventAt) : 'Not yet updated'}
                  </span>
                </div>

                {complaint.shared_issue_access || (complaint.issue_supporter_count || 0) > 1 ? (
                  <div className="border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                    <div className="font-semibold">
                      {complaint.joined_issue
                        ? 'You joined this community issue. Shared work progress is shown here.'
                        : complaint.shared_issue_access
                        ? 'You are viewing the shared issue status for a community complaint.'
                        : 'This complaint is part of a community issue group.'}
                    </div>
                    <div className="mt-2 leading-6">
                      {complaint.joined_issue
                        ? `This joined complaint follows the shared issue timeline and work evidence from the main issue record. Your own feedback will still be saved separately on this complaint. ${(complaint.issue_supporter_count || 1)} citizens are currently linked to the issue.`
                        : `${(complaint.issue_supporter_count || 1)} citizens are linked to this issue. Timeline and status remain visible here, while original complainant identity details stay hidden for joined users.`}
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <SummaryField label="Complaint ID" value={complaint.complaint_id} />
                  <SummaryField label="Department" value={tracker.departmentLabel} />
                  <SummaryField
                    label="Current Handling Desk"
                    value={tracker.assignmentLabel || 'Not assigned'}
                  />
                  <SummaryField label="Current Stage" value={tracker.currentStageTitle} />
                  <SummaryField label="Status" value={tracker.humanStatus} />
                  <SummaryField
                    label="Last Updated"
                    value={tracker.latestEventAt ? formatTrackerDateTime(tracker.latestEventAt) : 'Not yet updated'}
                  />
                  {(complaint.issue_supporter_count || 0) > 1 ? (
                    <SummaryField label="Affected Citizens" value={String(complaint.issue_supporter_count || 1)} />
                  ) : null}
                </div>
              </div>
            </section>

            {detailsLoading ? (
              <DetailSkeletonBlock title="Official Progress Log" />
            ) : (
              <ComplaintTrackingTimeline
                complaint={complaint}
                lastUpdatedLabel={lastSyncedAt ? formatTrackerDateTime(lastSyncedAt) : undefined}
              />
            )}

            <section className="border border-slate-300 bg-white">
              <SectionHeading
                title="Operational Subtimeline"
                description="Supervisory reminders, routing changes, escalations, and reopen decisions are recorded here separately from the main 5-step citizen tracking chain."
              />
              <div className="space-y-3 px-5 py-5">
                {operationalSubtimeline.length ? (
                  operationalSubtimeline.map((entry) => {
                    const tone = getOperationalLogTone(entry);
                    const toneClasses =
                      tone === 'amber'
                        ? 'border-amber-200 bg-amber-50 text-amber-900'
                        : tone === 'rose'
                          ? 'border-rose-200 bg-rose-50 text-rose-900'
                          : tone === 'sky'
                            ? 'border-sky-200 bg-sky-50 text-sky-900'
                            : 'border-slate-200 bg-slate-50 text-slate-900';

                    return (
                      <div key={entry.id} className={`border px-4 py-4 ${toneClasses}`}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="text-sm font-semibold">{entry.title}</div>
                            <div className="mt-2 text-sm leading-6">{entry.detail || 'Administrative movement recorded in the complaint file.'}</div>
                          </div>
                          <div className="shrink-0 text-xs font-medium opacity-80">
                            {formatTrackerDateTime(entry.timestamp)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                    No separate supervisory or routing updates have been recorded for this complaint yet.
                  </div>
                )}
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.85fr)]">
              <Card className="rounded-none border border-slate-300 bg-white py-0 shadow-none">
                <SectionHeading title="Complaint Description" description="Registered complaint details and administrative remarks." />
                <CardContent className="space-y-5 px-5 py-5">
                  <div className="border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700">
                    {complaint.text || 'Not yet updated'}
                  </div>

                  {complaint.location_address ? (
                    <div className="border border-slate-200 bg-white px-4 py-4">
                      <div className="text-sm font-semibold text-slate-950">Location</div>
                      <div className="mt-2 text-sm text-slate-600">{complaint.location_address}</div>
                    </div>
                  ) : null}

                  <div className="border border-slate-200 bg-white px-4 py-4">
                    <div className="text-sm font-semibold text-slate-950">Citizen Submitted Photos</div>
                    <div className="mt-2 text-sm text-slate-600">
                      {submittedAttachments.length
                        ? `${submittedAttachments.length} photograph${submittedAttachments.length > 1 ? 's were' : ' was'} submitted with the original complaint and saved in the complaint record.`
                        : 'No complaint photographs are available in this record.'}
                    </div>

                    {submittedAttachments.length ? (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {submittedAttachments.map((attachment, index) => (
                          <a
                            key={attachment.id || `${attachment.url}-${index}`}
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            className="border border-slate-200 bg-slate-50 p-2"
                          >
                            <img
                              src={attachment.url}
                              alt={`Citizen submitted evidence ${index + 1}`}
                              className="max-h-72 w-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>

                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="rounded-none border border-slate-300 bg-white py-0 shadow-none">
                  <SectionHeading title="Assignment Details" description="Current official handling desk and service responsibility without exposing internal officer identity." />
                  <CardContent className="px-5 py-5">
                    {detailsLoading ? (
                      <LoadingSummary label="Fetching latest updates..." description="Handling desk details are being loaded." className="rounded-none" />
                    ) : (
                      <div className="border border-slate-200 bg-slate-50">
                        <div className="grid grid-cols-[11rem_1fr] border-b border-slate-200 px-4 py-3 text-sm">
                          <div className="font-semibold text-slate-900">Handling Desk</div>
                          <div className="text-slate-700">{tracker.assignmentLabel || 'Not assigned'}</div>
                        </div>
                        <div className="grid grid-cols-[11rem_1fr] border-b border-slate-200 px-4 py-3 text-sm">
                          <div className="font-semibold text-slate-900">Department</div>
                          <div className="text-slate-700">{tracker.departmentLabel}</div>
                        </div>
                        <div className="grid grid-cols-[11rem_1fr] border-b border-slate-200 px-4 py-3 text-sm">
                          <div className="font-semibold text-slate-900">Status</div>
                          <div className="text-slate-700">{tracker.assignmentStatusLabel}</div>
                        </div>
                        <div className="grid grid-cols-[11rem_1fr] px-4 py-3 text-sm">
                          <div className="font-semibold text-slate-900">Assignment Note</div>
                          <div className="text-slate-700">{tracker.assignmentDescription || 'Not yet updated'}</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-none border border-slate-300 bg-white py-0 shadow-none">
                  <SectionHeading title="Work Completion Evidence" description="Evidence submitted by the assigned field officer at the stage where work was completed." />
                  <CardContent className="space-y-4 px-5 py-5">
                    {detailsLoading ? (
                      <LoadingSummary label="Fetching latest updates..." description="Evidence records are being loaded." className="rounded-none" />
                    ) : tracker.proofSubmitted ? (
                      <>
                          <div className="border border-[#cfe0ef] bg-[linear-gradient(135deg,#f8fbff_0%,#eef6fb_100%)] px-4 py-4">
                            <div className="text-sm font-semibold text-slate-950">Citizen Verification Status</div>
                            <div className="mt-2 text-sm leading-6 text-slate-700">
                              {complaint.rating
                                ? 'Citizen verification has been submitted for the uploaded work evidence.'
                                : tracker.waitingForFeedback
                                ? tracker.feedbackDeskDescription || 'The assigned officer has uploaded work completion evidence. Citizen feedback can now be submitted from this page.'
                                : tracker.feedbackDeskDescription || 'Uploaded work evidence remains available here for citizen review.'}
                            </div>
                          </div>

                        <div className="border border-slate-200 bg-slate-50">
                          <div className="grid grid-cols-[11rem_1fr] border-b border-slate-200 px-4 py-3 text-sm">
                            <div className="font-semibold text-slate-900">Description</div>
                            <div className="text-slate-700">{complaint.proof_text || 'Not yet updated'}</div>
                          </div>
                          <div className="grid grid-cols-[11rem_1fr] px-4 py-3 text-sm">
                            <div className="font-semibold text-slate-900">Submitted Timestamp</div>
                            <div className="text-slate-700">{formatTrackerDateTime(proofSubmittedAt)}</div>
                          </div>
                        </div>

                        {tracker.feedbackDeskLabel ? (
                          <div className="border border-slate-200 bg-white">
                            <div className="grid grid-cols-[11rem_1fr] border-b border-slate-200 px-4 py-3 text-sm">
                              <div className="font-semibold text-slate-900">Review Desk</div>
                              <div className="text-slate-700">{tracker.feedbackDeskLabel}</div>
                            </div>
                            <div className="grid grid-cols-[11rem_1fr] px-4 py-3 text-sm">
                              <div className="font-semibold text-slate-900">Review Note</div>
                              <div className="text-slate-700">{tracker.feedbackDeskDescription || 'Not yet updated'}</div>
                            </div>
                          </div>
                        ) : null}

                        {proofImages.length ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {proofImages.map((image, index) => (
                              <a
                                key={image.id || `${image.url}-${index}`}
                                href={image.url}
                                target="_blank"
                                rel="noreferrer"
                                className="border border-slate-200 bg-white p-2"
                              >
                                <img
                                  src={image.url}
                                  alt={`Work completion evidence ${index + 1}`}
                                  className="max-h-72 w-full object-cover"
                                />
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                        No work completion evidence has been submitted yet.
                      </div>
                    )}
                  </CardContent>
                </Card>

                {isExpiredComplaint ? (
                  <Card className="rounded-none border border-slate-300 bg-white py-0 shadow-none">
                    <SectionHeading title="Complaint Expired" description="This complaint can no longer continue in the existing workflow." />
                    <CardContent className="space-y-4 px-5 py-5">
                      <div className="border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                        The complaint expired before closure could be completed. If the issue still exists, please create a new complaint with the latest details and evidence.
                      </div>
                      <Button asChild className="rounded-none bg-[#0b3c5d] text-white hover:bg-[#082d46]">
                        <Link href="/citizen/submit">Create New Complaint</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ) : (complaint.rating || canRateResolution) ? (
                  <Card className="rounded-none border border-slate-300 bg-white py-0 shadow-none">
                    <SectionHeading title="Citizen Feedback" description="Citizen verification, rating, and remarks for the uploaded completion evidence." />
                    <CardContent className="space-y-5 px-5 py-5">
                      {detailsLoading ? (
                        <LoadingSummary label="Fetching latest updates..." description="Feedback records are being loaded." className="rounded-none" />
                      ) : (
                        <>
                          <div className="border border-[#cfe0ef] bg-[linear-gradient(135deg,#f8fbff_0%,#eef6fb_100%)] px-4 py-4">
                            <div className="grid gap-3 md:grid-cols-2">
                              <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Verification Status</div>
                                <div className="mt-2 text-sm font-semibold text-slate-950">{citizenRatingLabel}</div>
                              </div>
                              <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Tracking Status</div>
                                <div className="mt-2 text-sm font-semibold text-slate-950">
                                  {tracker?.citizenJourneyCompleted
                                    ? 'Citizen-facing tracking completed'
                                    : tracker?.waitingForFeedback
                                      ? 'Waiting for citizen feedback'
                                      : tracker?.feedbackDeskLabel || 'Under official processing'}
                                </div>
                              </div>
                            </div>
                          </div>

                          {tracker?.feedbackDeskLabel ? (
                            <div className="border border-slate-200 bg-white">
                              <div className="grid grid-cols-[11rem_1fr] border-b border-slate-200 px-4 py-3 text-sm">
                                <div className="font-semibold text-slate-900">Current Review Desk</div>
                                <div className="text-slate-700">{tracker.feedbackDeskLabel}</div>
                              </div>
                              <div className="grid grid-cols-[11rem_1fr] px-4 py-3 text-sm">
                                <div className="font-semibold text-slate-900">Review Note</div>
                                <div className="text-slate-700">{tracker.feedbackDeskDescription || 'Not yet updated'}</div>
                              </div>
                            </div>
                          ) : null}

                          {complaint.rating ? (
                            <div className="border border-slate-200 bg-slate-50">
                              <div className="grid grid-cols-[11rem_1fr] border-b border-slate-200 px-4 py-3 text-sm">
                                <div className="font-semibold text-slate-900">Submitted Rating</div>
                                <div className="text-slate-700">{complaint.rating.rating}/5</div>
                              </div>
                              <div className="grid grid-cols-[11rem_1fr] border-b border-slate-200 px-4 py-3 text-sm">
                                <div className="font-semibold text-slate-900">Assessment</div>
                                <div className="text-slate-700">{complaint.rating.rating >= 4 ? 'Satisfied' : 'Review Required'}</div>
                              </div>
                              <div className="grid grid-cols-[11rem_1fr] px-4 py-3 text-sm">
                                <div className="font-semibold text-slate-900">Feedback Note</div>
                                <div className="text-slate-700">{complaint.rating.feedback || 'Not yet updated'}</div>
                              </div>
                            </div>
                          ) : null}

                          {canRateResolution ? (
                            <>
                              <div className="rounded-none border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
                                {tracker?.feedbackDeskDescription || 'Review the uploaded work evidence and submit your rating. If the work is satisfactory, your feedback will move the complaint into its final closure review. If the work is not satisfactory, the complaint may be returned for fresh action.'}
                              </div>

                              <div className="grid grid-cols-5 gap-2">
                                {[1, 2, 3, 4, 5].map((value) => (
                                  <Button
                                    key={value}
                                    type="button"
                                    variant={rating === value ? 'default' : 'outline'}
                                    onClick={() => setRating(value)}
                                    className="rounded-none"
                                  >
                                    <Star className={rating >= value ? 'fill-current' : ''} />
                                    {value}
                                  </Button>
                                ))}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {FEEDBACK_TAGS.map((tag) => {
                                  const active = selectedFeedbackTags.includes(tag);

                                  return (
                                    <button
                                      key={tag}
                                      type="button"
                                      onClick={() => toggleFeedbackTag(tag)}
                                      className={active
                                        ? 'border border-[#cfe0ef] bg-[#eef6fb] px-3 py-2 text-sm font-medium text-[#0b3c5d]'
                                        : 'border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700'}
                                    >
                                      {tag}
                                    </button>
                                  );
                                })}
                              </div>

                              <Textarea
                                value={feedback}
                                onChange={(event) => setFeedback(event.target.value)}
                                rows={4}
                                placeholder="Enter formal feedback regarding the completed work."
                                className="rounded-none border-slate-300"
                              />

                              <Button
                                onClick={handleRating}
                                disabled={savingRating}
                                className="rounded-none bg-[#0b3c5d] text-white hover:bg-[#082d46]"
                              >
                                {savingRating ? <Spinner label="Submitting..." size="sm" /> : complaint.rating ? 'Update Feedback' : 'Submit Feedback'}
                              </Button>
                            </>
                          ) : null}
                        </>
                      )}
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </section>

            <section className="border border-slate-300 bg-white">
              <SectionHeading title="Tracker Guidance" description="Instructions for transparent complaint follow-up and citizen response." />
              <div className="grid gap-3 px-5 py-5 md:grid-cols-2">
                <div className="border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  Use the complaint ID search above anytime to reopen this same complaint view.
                </div>
                <div className="border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  Handling-desk movement, department messages, and work completion evidence will appear here once published.
                </div>
                <div className="border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  After complaint completion, you can review the proof and submit formal citizen feedback from this page.
                </div>
                <div className="border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  Expired complaints remain available for reference, but further action requires filing a new complaint.
                </div>
              </div>
            </section>
          </div>
        ) : (
          <section className="border border-slate-300 bg-white px-6 py-12 text-center">
            <div className="text-lg font-semibold text-slate-950">Complaint Record Not Available</div>
            <p className="mt-2 text-sm text-slate-600">
              The requested complaint could not be found. Please verify the complaint ID and try again.
            </p>
            <div className="mt-5">
              <Button asChild className="rounded-none bg-[#0b3c5d] text-white hover:bg-[#082d46]">
                <Link href="/citizen/my-complaints">Go to My Complaints</Link>
              </Button>
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
