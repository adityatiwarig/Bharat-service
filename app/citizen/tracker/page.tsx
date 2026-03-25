'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download, RefreshCw, Star } from 'lucide-react';
import { toast } from 'sonner';

import { ComplaintTrackingTimeline } from '@/components/complaint-tracking-timeline';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useLandingLanguage } from '@/components/landing-language';
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

const FEEDBACK_TAGS = {
  en: ['Good Service', 'Quick Response', 'Delay', 'Issue Not Fixed', 'Need Follow-up'],
  hi: ['अच्छी सेवा', 'त्वरित प्रतिक्रिया', 'देरी', 'समस्या ठीक नहीं हुई', 'फिर से कार्यवाही आवश्यक'],
} as const;

const TRACKER_TEXT = {
  en: {
    invalidComplaintId: 'Invalid Complaint ID',
    enterComplaintId: 'Enter a complaint ID to continue.',
    breadcrumb: 'Home > Citizen Dashboard > Complaint Tracker',
    title: 'Citizen Complaint Tracking System',
    subtitle:
      'This portal provides real-time complaint progress, field-work visibility, official evidence records, and citizen feedback submission in one verified tracking journey.',
    exportPdf: 'Export PDF',
    enterComplaintIdPlaceholder: 'Enter Complaint ID',
    trackComplaint: 'Track Complaint',
    refreshing: 'Refreshing...',
    refreshData: 'Refresh Data',
    fetchingUpdates: 'Fetching latest updates...',
    complaintSummaryLoading: 'Complaint summary is being loaded.',
    complaintSummaryPanel: 'Complaint Summary Panel',
    complaintSummaryDescription: 'Official report header for the selected complaint.',
    joinedIssue: 'Joined Issue',
    lastUpdated: 'Last Updated',
    notYetUpdated: 'Not yet updated',
    complaintId: 'Complaint ID',
    currentHandlingDesk: 'Current Handling Desk',
    trackerGuidance: 'Tracker Guidance',
    trackerGuidanceDescription: 'Instructions for transparent complaint follow-up and citizen response.',
    guidanceOne: 'Use the complaint ID search above anytime to reopen this same complaint view.',
    guidanceTwo: 'Handling-desk movement, department messages, and work completion evidence will appear here once published.',
    guidanceThree: 'After complaint completion, you can review the proof and submit formal citizen feedback from this page.',
    guidanceFour: 'Expired complaints remain available for reference, but further action requires filing a new complaint.',
    recordNotAvailable: 'Complaint Record Not Available',
    recordNotAvailableDescription: 'The requested complaint could not be found. Please verify the complaint ID and try again.',
    goToMyComplaints: 'Go to My Complaints',
    handlingDeskLoading: 'Handling desk details are being loaded.',
    evidenceLoading: 'Evidence records are being loaded.',
    feedbackLoading: 'Feedback records are being loaded.',
  },
  hi: {
    invalidComplaintId: 'अमान्य शिकायत आईडी',
    enterComplaintId: 'जारी रखने के लिए शिकायत आईडी दर्ज करें।',
    breadcrumb: 'होम > नागरिक डैशबोर्ड > शिकायत ट्रैकर',
    title: 'नागरिक शिकायत ट्रैकिंग सिस्टम',
    subtitle:
      'यह पोर्टल एक सत्यापित ट्रैकिंग यात्रा में रीयल-टाइम शिकायत प्रगति, फील्ड-वर्क दृश्यता, आधिकारिक प्रमाण अभिलेख और नागरिक फीडबैक जमा करने की सुविधा देता है।',
    exportPdf: 'पीडीएफ निर्यात करें',
    enterComplaintIdPlaceholder: 'शिकायत आईडी दर्ज करें',
    trackComplaint: 'शिकायत ट्रैक करें',
    refreshing: 'रीफ़्रेश हो रहा है...',
    refreshData: 'डेटा रीफ़्रेश करें',
    fetchingUpdates: 'नवीनतम अपडेट प्राप्त किए जा रहे हैं...',
    complaintSummaryLoading: 'शिकायत सारांश लोड किया जा रहा है।',
    complaintSummaryPanel: 'शिकायत सारांश पैनल',
    complaintSummaryDescription: 'चयनित शिकायत के लिए आधिकारिक रिपोर्ट शीर्षक।',
    joinedIssue: 'जुड़ा हुआ मुद्दा',
    lastUpdated: 'अंतिम अपडेट',
    notYetUpdated: 'अभी अपडेट नहीं हुआ',
    complaintId: 'शिकायत आईडी',
    currentHandlingDesk: 'वर्तमान हैंडलिंग डेस्क',
    trackerGuidance: 'ट्रैकर मार्गदर्शन',
    trackerGuidanceDescription: 'पारदर्शी शिकायत फॉलो-अप और नागरिक प्रतिक्रिया के लिए निर्देश।',
    guidanceOne: 'उसी शिकायत दृश्य को फिर से खोलने के लिए ऊपर दी गई शिकायत आईडी खोज का कभी भी उपयोग करें।',
    guidanceTwo: 'हैंडलिंग डेस्क की गतिविधि, विभागीय संदेश और कार्य पूर्णता प्रमाण प्रकाशित होने पर यहां दिखाई देंगे।',
    guidanceThree: 'शिकायत पूरी होने के बाद, आप इसी पेज से प्रमाण की समीक्षा कर सकते हैं और औपचारिक नागरिक फीडबैक जमा कर सकते हैं।',
    guidanceFour: 'समाप्त शिकायतें संदर्भ के लिए उपलब्ध रहती हैं, लेकिन आगे की कार्रवाई के लिए नई शिकायत दर्ज करनी होगी।',
    recordNotAvailable: 'शिकायत रिकॉर्ड उपलब्ध नहीं है',
    recordNotAvailableDescription: 'मांगी गई शिकायत नहीं मिली। कृपया शिकायत आईडी जांचें और फिर से प्रयास करें।',
    goToMyComplaints: 'मेरी शिकायतों पर जाएं',
    handlingDeskLoading: 'हैंडलिंग डेस्क का विवरण लोड किया जा रहा है।',
    evidenceLoading: 'प्रमाण रिकॉर्ड लोड किए जा रहे हैं।',
    feedbackLoading: 'फीडबैक रिकॉर्ड लोड किए जा रहे हैं।',
  },
} as const;

const TRACKER_PAGE_TEXT = {
  en: {
    feedbackSubmittedSuccess: 'Feedback submitted successfully.',
    feedbackSubmitFailed: 'Unable to submit feedback.',
    exportUnavailable: 'Complaint report is not available for export.',
    exportSuccess: 'Complaint PDF exported successfully.',
    citizenConfirmationPending: 'Pending citizen confirmation',
    notYetSubmitted: 'Not yet submitted',
    satisfied: 'Satisfied',
    reviewRequired: 'Review Required',
    department: 'Department',
    currentStage: 'Current Stage',
    status: 'Status',
    affectedCitizens: 'Affected Citizens',
    joinedIssueTitle: 'You joined this community issue. Shared work progress is shown here.',
    sharedIssueTitle: 'You are viewing the shared issue status for a community complaint.',
    issueGroupTitle: 'This complaint is part of a community issue group.',
    joinedIssueDescription:
      'This joined complaint follows the shared issue timeline and work evidence from the main issue record. Your own feedback will still be saved separately on this complaint.',
    sharedIssueDescription:
      'citizens are linked to this issue. Timeline and status remain visible here, while original complainant identity details stay hidden for joined users.',
    operationalSubtimeline: 'Operational Subtimeline',
    operationalSubtimelineDescription:
      'Supervisory reminders, routing changes, escalations, and reopen decisions are recorded here separately from the main 5-step citizen tracking chain.',
    administrativeMovementRecorded: 'Administrative movement recorded in the complaint file.',
    noOperationalUpdates: 'No separate supervisory or routing updates have been recorded for this complaint yet.',
    complaintDescription: 'Complaint Description',
    complaintDescriptionSubtitle: 'Registered complaint details and administrative remarks.',
    location: 'Location',
    citizenSubmittedPhotos: 'Citizen Submitted Photos',
    photoCountSingular: 'photograph was submitted with the original complaint and saved in the complaint record.',
    photoCountPlural: 'photographs were submitted with the original complaint and saved in the complaint record.',
    noComplaintPhotos: 'No complaint photographs are available in this record.',
    submittedEvidenceAlt: 'Citizen submitted evidence',
    assignmentDetails: 'Assignment Details',
    assignmentDetailsSubtitle:
      'Current official handling desk and service responsibility without exposing internal officer identity.',
    handlingDesk: 'Handling Desk',
    notAssigned: 'Not assigned',
    assignmentNote: 'Assignment Note',
    workCompletionEvidence: 'Work Completion Evidence',
    workCompletionEvidenceSubtitle:
      'Evidence submitted by the assigned field officer at the stage where work was completed.',
    citizenVerificationStatus: 'Citizen Verification Status',
    verificationSubmitted: 'Citizen verification has been submitted for the uploaded work evidence.',
    verificationReady:
      'The assigned officer has uploaded work completion evidence. Citizen feedback can now be submitted from this page.',
    uploadedEvidenceAvailable: 'Uploaded work evidence remains available here for citizen review.',
    description: 'Description',
    submittedTimestamp: 'Submitted Timestamp',
    reviewDesk: 'Review Desk',
    reviewNote: 'Review Note',
    workEvidenceAlt: 'Work completion evidence',
    noWorkEvidence: 'No work completion evidence has been submitted yet.',
    complaintExpired: 'Complaint Expired',
    complaintExpiredSubtitle: 'This complaint can no longer continue in the existing workflow.',
    complaintExpiredBody:
      'The complaint expired before closure could be completed. If the issue still exists, please create a new complaint with the latest details and evidence.',
    createNewComplaint: 'Create New Complaint',
    citizenFeedback: 'Citizen Feedback',
    citizenFeedbackSubtitle: 'Citizen verification, rating, and remarks for the uploaded completion evidence.',
    verificationStatus: 'Verification Status',
    trackingStatus: 'Tracking Status',
    citizenTrackingCompleted: 'Citizen-facing tracking completed',
    waitingForCitizenFeedback: 'Waiting for citizen feedback',
    underOfficialProcessing: 'Under official processing',
    currentReviewDesk: 'Current Review Desk',
    submittedRating: 'Submitted Rating',
    assessment: 'Assessment',
    feedbackNote: 'Feedback Note',
    feedbackHelp:
      'Review the uploaded work evidence and submit your rating. If the work is satisfactory, your feedback will move the complaint into its final closure review. If the work is not satisfactory, the complaint may be returned for fresh action.',
    feedbackPlaceholder: 'Enter formal feedback regarding the completed work.',
    submitting: 'Submitting...',
    updateFeedback: 'Update Feedback',
    submitFeedback: 'Submit Feedback',
  },
  hi: {
    feedbackSubmittedSuccess: 'फीडबैक सफलतापूर्वक जमा किया गया।',
    feedbackSubmitFailed: 'फीडबैक जमा नहीं किया जा सका।',
    exportUnavailable: 'निर्यात के लिए शिकायत रिपोर्ट उपलब्ध नहीं है।',
    exportSuccess: 'शिकायत पीडीएफ सफलतापूर्वक निर्यात की गई।',
    citizenConfirmationPending: 'नागरिक पुष्टि लंबित',
    notYetSubmitted: 'अभी तक जमा नहीं किया गया',
    satisfied: 'संतोषजनक',
    reviewRequired: 'समीक्षा आवश्यक',
    department: 'विभाग',
    currentStage: 'वर्तमान चरण',
    status: 'स्थिति',
    affectedCitizens: 'प्रभावित नागरिक',
    joinedIssueTitle: 'आप इस सामुदायिक मुद्दे से जुड़े हैं। साझा कार्य प्रगति यहां प्रदर्शित है।',
    sharedIssueTitle: 'आप एक सामुदायिक शिकायत की साझा स्थिति देख रहे हैं।',
    issueGroupTitle: 'यह शिकायत एक सामुदायिक मुद्दा समूह का हिस्सा है।',
    joinedIssueDescription:
      'यह जुड़ी हुई शिकायत मुख्य मुद्दा अभिलेख की साझा समयरेखा और कार्य-प्रमाण का अनुसरण करती है। आपका फीडबैक इस शिकायत पर अलग से सुरक्षित रहेगा।',
    sharedIssueDescription:
      'नागरिक इस मुद्दे से जुड़े हैं। समयरेखा और स्थिति यहां दिखाई देती रहेगी, जबकि मूल शिकायतकर्ता की पहचान संबंधी जानकारी जुड़े हुए उपयोगकर्ताओं से छिपी रहेगी।',
    operationalSubtimeline: 'परिचालन उप-समयरेखा',
    operationalSubtimelineDescription:
      'पर्यवेक्षी रिमाइंडर, रूटिंग परिवर्तन, एस्केलेशन और पुनःखोलने के निर्णय यहां मुख्य 5-चरणीय नागरिक ट्रैकिंग श्रृंखला से अलग दर्ज किए जाते हैं।',
    administrativeMovementRecorded: 'शिकायत अभिलेख में प्रशासनिक प्रविष्टि दर्ज की गई है।',
    noOperationalUpdates: 'इस शिकायत के लिए अभी तक कोई अलग पर्यवेक्षी या रूटिंग अपडेट दर्ज नहीं हुआ है।',
    complaintDescription: 'शिकायत विवरण',
    complaintDescriptionSubtitle: 'पंजीकृत शिकायत विवरण और प्रशासनिक टिप्पणियां।',
    location: 'स्थान',
    citizenSubmittedPhotos: 'नागरिक द्वारा जमा फोटो',
    photoCountSingular: 'फोटो मूल शिकायत के साथ जमा किया गया था और शिकायत अभिलेख में सुरक्षित है।',
    photoCountPlural: 'फोटो मूल शिकायत के साथ जमा किए गए थे और शिकायत अभिलेख में सुरक्षित हैं।',
    noComplaintPhotos: 'इस अभिलेख में शिकायत से संबंधित कोई फोटो उपलब्ध नहीं है।',
    submittedEvidenceAlt: 'नागरिक द्वारा जमा प्रमाण',
    assignmentDetails: 'आवंटन विवरण',
    assignmentDetailsSubtitle:
      'आंतरिक अधिकारी की पहचान प्रकट किए बिना वर्तमान आधिकारिक हैंडलिंग डेस्क और सेवा जिम्मेदारी।',
    handlingDesk: 'हैंडलिंग डेस्क',
    notAssigned: 'आवंटित नहीं',
    assignmentNote: 'आवंटन टिप्पणी',
    workCompletionEvidence: 'कार्य पूर्णता प्रमाण',
    workCompletionEvidenceSubtitle:
      'कार्य पूर्ण होने के चरण पर नियुक्त फील्ड अधिकारी द्वारा जमा किया गया प्रमाण।',
    citizenVerificationStatus: 'नागरिक सत्यापन स्थिति',
    verificationSubmitted: 'अपलोड किए गए कार्य-प्रमाण के लिए नागरिक सत्यापन जमा किया जा चुका है।',
    verificationReady:
      'नियुक्त अधिकारी ने कार्य पूर्णता प्रमाण अपलोड कर दिया है। अब इसी पृष्ठ से नागरिक फीडबैक जमा किया जा सकता है।',
    uploadedEvidenceAvailable: 'अपलोड किया गया कार्य-प्रमाण यहां नागरिक समीक्षा के लिए उपलब्ध है।',
    description: 'विवरण',
    submittedTimestamp: 'जमा समय',
    reviewDesk: 'समीक्षा डेस्क',
    reviewNote: 'समीक्षा टिप्पणी',
    workEvidenceAlt: 'कार्य पूर्णता प्रमाण',
    noWorkEvidence: 'अभी तक कोई कार्य पूर्णता प्रमाण जमा नहीं किया गया है।',
    complaintExpired: 'शिकायत समाप्त हो गई',
    complaintExpiredSubtitle: 'यह शिकायत अब मौजूदा कार्यप्रवाह में आगे नहीं बढ़ सकती।',
    complaintExpiredBody:
      'औपचारिक समापन से पहले शिकायत की समय-सीमा समाप्त हो गई। यदि समस्या अभी भी मौजूद है, तो नवीनतम विवरण और प्रमाण के साथ नई शिकायत दर्ज करें।',
    createNewComplaint: 'नई शिकायत दर्ज करें',
    citizenFeedback: 'नागरिक फीडबैक',
    citizenFeedbackSubtitle: 'अपलोड किए गए पूर्णता प्रमाण के लिए नागरिक सत्यापन, रेटिंग और टिप्पणियां।',
    verificationStatus: 'सत्यापन स्थिति',
    trackingStatus: 'ट्रैकिंग स्थिति',
    citizenTrackingCompleted: 'नागरिक-पक्ष ट्रैकिंग पूर्ण',
    waitingForCitizenFeedback: 'नागरिक फीडबैक की प्रतीक्षा है',
    underOfficialProcessing: 'आधिकारिक प्रक्रिया में',
    currentReviewDesk: 'वर्तमान समीक्षा डेस्क',
    submittedRating: 'जमा रेटिंग',
    assessment: 'मूल्यांकन',
    feedbackNote: 'फीडबैक टिप्पणी',
    feedbackHelp:
      'अपलोड किए गए कार्य-प्रमाण की समीक्षा करें और अपनी रेटिंग जमा करें। यदि कार्य संतोषजनक है, तो आपका फीडबैक शिकायत को अंतिम समापन समीक्षा में आगे बढ़ाएगा। यदि कार्य संतोषजनक नहीं है, तो शिकायत को पुनः कार्यवाही के लिए वापस भेजा जा सकता है।',
    feedbackPlaceholder: 'पूर्ण किए गए कार्य के संबंध में औपचारिक फीडबैक दर्ज करें।',
    submitting: 'जमा किया जा रहा है...',
    updateFeedback: 'फीडबैक अपडेट करें',
    submitFeedback: 'फीडबैक जमा करें',
  },
} as const;

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
  const { language } = useLandingLanguage();
  const text = TRACKER_TEXT[language];
  const uiText = TRACKER_PAGE_TEXT[language];
  const complaintId = searchParams.get('id')?.trim() || '';
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
    () => (complaint ? buildComplaintTrackerSnapshot(complaint, language) : null),
    [complaint, language],
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
      toast.error(text.enterComplaintId);
      return;
    }

    if (!complaintIdPattern.test(value)) {
      setError(text.invalidComplaintId);
      toast.error(text.invalidComplaintId);
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
      toast.success(uiText.feedbackSubmittedSuccess);
      void loadComplaintSummary(targetComplaintCode, true);
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : uiText.feedbackSubmitFailed);
    } finally {
      setSavingRating(false);
    }
  }

function handleExportReport() {
    if (!complaint || !tracker) {
      toast.error(uiText.exportUnavailable);
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

    toast.success(uiText.exportSuccess);
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
    complaint &&
    complaint.status !== 'closed' &&
    complaint.status !== 'expired' &&
    complaint.status !== 'rejected' &&
    (
      complaint.status === 'resolved' ||
      tracker?.waitingForFeedback ||
      hasCompletionEvidence
    ),
  );
  const isExpiredComplaint = complaint?.status === 'expired';
  const citizenRatingLabel = complaint?.rating
    ? `${complaint.rating.rating}/5${complaint.rating.rating >= 4 ? ` - ${uiText.satisfied}` : ` - ${uiText.reviewRequired}`}`
    : canRateResolution
      ? uiText.citizenConfirmationPending
      : uiText.notYetSubmitted;

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
            <div className="text-xs text-slate-500">{text.breadcrumb}</div>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-slate-950">{text.title}</h1>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                  {text.subtitle}
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
                {text.exportPdf}
                </Button>
              </div>

            <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
              <Input
                  ref={searchInputRef}
                  value={lookupId}
                  onChange={(event) => setLookupId(event.target.value)}
                  placeholder={text.enterComplaintIdPlaceholder}
                  className="h-11 rounded-none border-slate-300"
                />
                <Button type="submit" className="rounded-none bg-[#0b3c5d] text-white hover:bg-[#082d46]">
                {text.trackComplaint}
                </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadComplaintSummary(complaint?.complaint_id || complaintId || lookupId, true)}
                  disabled={refreshing || loading || detailsLoading}
                  className="rounded-none"
                >
                {refreshing ? <Spinner label={text.refreshing} size="sm" /> : <><RefreshCw className="h-4 w-4" /> {text.refreshData}</>}
                </Button>
              </form>

              {loading ? (
                <LoadingSummary label={text.fetchingUpdates} description={text.complaintSummaryLoading} className="rounded-none" />
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
              <SectionHeading title={text.complaintSummaryPanel} description={text.complaintSummaryDescription} />
                <div className="space-y-4 px-5 py-5">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="rounded-none border border-[#cfe0ef] bg-[#eef6fb] px-3 py-1 text-sm font-semibold text-[#0b3c5d]">
                    {tracker.humanStatus}
                  </Badge>
                    {complaint.joined_issue ? (
                      <Badge className="rounded-none border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">
                      {text.joinedIssue}
                      </Badge>
                    ) : null}
                    <span className="text-sm text-slate-600">
                    {text.lastUpdated}: {tracker.latestEventAt ? formatTrackerDateTime(tracker.latestEventAt) : text.notYetUpdated}
                    </span>
                  </div>

                {complaint.shared_issue_access || (complaint.issue_supporter_count || 0) > 1 ? (
                  <div className="border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                    <div className="font-semibold">
                      {complaint.joined_issue
                        ? uiText.joinedIssueTitle
                        : complaint.shared_issue_access
                        ? uiText.sharedIssueTitle
                        : uiText.issueGroupTitle}
                    </div>
                    <div className="mt-2 leading-6">
                      {complaint.joined_issue
                        ? `${uiText.joinedIssueDescription} ${(complaint.issue_supporter_count || 1)} ${uiText.sharedIssueDescription}`
                        : `${(complaint.issue_supporter_count || 1)} ${uiText.sharedIssueDescription}`}
                    </div>
                  </div>
                ) : null}

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <SummaryField label={text.complaintId} value={complaint.complaint_id} />
                    <SummaryField label={uiText.department} value={tracker.departmentLabel} />
                    <SummaryField
                    label={text.currentHandlingDesk}
                      value={tracker.assignmentLabel || uiText.notAssigned}
                    />
                    <SummaryField label={uiText.currentStage} value={tracker.currentStageTitle} />
                    <SummaryField label={uiText.status} value={tracker.humanStatus} />
                    <SummaryField
                    label={text.lastUpdated}
                      value={tracker.latestEventAt ? formatTrackerDateTime(tracker.latestEventAt) : text.notYetUpdated}
                    />
                  {(complaint.issue_supporter_count || 0) > 1 ? (
                    <SummaryField label={uiText.affectedCitizens} value={String(complaint.issue_supporter_count || 1)} />
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
                title={uiText.operationalSubtimeline}
                description={uiText.operationalSubtimelineDescription}
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
                            <div className="mt-2 text-sm leading-6">{entry.detail || uiText.administrativeMovementRecorded}</div>
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
                    {uiText.noOperationalUpdates}
                  </div>
                )}
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.85fr)]">
              <Card className="rounded-none border border-slate-300 bg-white py-0 shadow-none">
                <SectionHeading title={uiText.complaintDescription} description={uiText.complaintDescriptionSubtitle} />
                <CardContent className="space-y-5 px-5 py-5">
                  <div className="border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700">
                    {complaint.text || text.notYetUpdated}
                  </div>

                  {complaint.location_address ? (
                    <div className="border border-slate-200 bg-white px-4 py-4">
                      <div className="text-sm font-semibold text-slate-950">{uiText.location}</div>
                      <div className="mt-2 text-sm text-slate-600">{complaint.location_address}</div>
                    </div>
                  ) : null}

                  <div className="border border-slate-200 bg-white px-4 py-4">
                    <div className="text-sm font-semibold text-slate-950">{uiText.citizenSubmittedPhotos}</div>
                    <div className="mt-2 text-sm text-slate-600">
                      {submittedAttachments.length
                        ? `${submittedAttachments.length} ${submittedAttachments.length > 1 ? uiText.photoCountPlural : uiText.photoCountSingular}`
                        : uiText.noComplaintPhotos}
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
                              alt={`${uiText.submittedEvidenceAlt} ${index + 1}`}
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
                  <SectionHeading title={uiText.assignmentDetails} description={uiText.assignmentDetailsSubtitle} />
                  <CardContent className="px-5 py-5">
                    {detailsLoading ? (
                      <LoadingSummary label={text.fetchingUpdates} description={text.handlingDeskLoading} className="rounded-none" />
                    ) : (
                      <div className="border border-slate-200 bg-slate-50">
                        <div className="grid grid-cols-[11rem_1fr] border-b border-slate-200 px-4 py-3 text-sm">
                          <div className="font-semibold text-slate-900">{uiText.handlingDesk}</div>
                          <div className="text-slate-700">{tracker.assignmentLabel || uiText.notAssigned}</div>
                        </div>
                        <div className="grid grid-cols-[11rem_1fr] border-b border-slate-200 px-4 py-3 text-sm">
                          <div className="font-semibold text-slate-900">{uiText.department}</div>
                          <div className="text-slate-700">{tracker.departmentLabel}</div>
                        </div>
                        <div className="grid grid-cols-[11rem_1fr] border-b border-slate-200 px-4 py-3 text-sm">
                          <div className="font-semibold text-slate-900">{uiText.status}</div>
                          <div className="text-slate-700">{tracker.assignmentStatusLabel}</div>
                        </div>
                        <div className="grid grid-cols-[11rem_1fr] px-4 py-3 text-sm">
                          <div className="font-semibold text-slate-900">{uiText.assignmentNote}</div>
                          <div className="text-slate-700">{tracker.assignmentDescription || text.notYetUpdated}</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-none border border-slate-300 bg-white py-0 shadow-none">
                  <SectionHeading title={uiText.workCompletionEvidence} description={uiText.workCompletionEvidenceSubtitle} />
                  <CardContent className="space-y-4 px-5 py-5">
                    {detailsLoading ? (
                      <LoadingSummary label={text.fetchingUpdates} description={text.evidenceLoading} className="rounded-none" />
                    ) : tracker.proofSubmitted ? (
                      <>
                          <div className="border border-[#cfe0ef] bg-[linear-gradient(135deg,#f8fbff_0%,#eef6fb_100%)] px-4 py-4">
                            <div className="text-sm font-semibold text-slate-950">{uiText.citizenVerificationStatus}</div>
                            <div className="mt-2 text-sm leading-6 text-slate-700">
                              {complaint.rating
                                ? uiText.verificationSubmitted
                                : tracker.waitingForFeedback
                                ? tracker.feedbackDeskDescription || uiText.verificationReady
                                : tracker.feedbackDeskDescription || uiText.uploadedEvidenceAvailable}
                            </div>
                          </div>

                        <div className="border border-slate-200 bg-slate-50">
                          <div className="grid grid-cols-[11rem_1fr] border-b border-slate-200 px-4 py-3 text-sm">
                            <div className="font-semibold text-slate-900">{uiText.description}</div>
                            <div className="text-slate-700">{complaint.proof_text || text.notYetUpdated}</div>
                          </div>
                          <div className="grid grid-cols-[11rem_1fr] px-4 py-3 text-sm">
                            <div className="font-semibold text-slate-900">{uiText.submittedTimestamp}</div>
                            <div className="text-slate-700">{formatTrackerDateTime(proofSubmittedAt)}</div>
                          </div>
                        </div>

                        {tracker.feedbackDeskLabel ? (
                          <div className="border border-slate-200 bg-white">
                            <div className="grid grid-cols-[11rem_1fr] border-b border-slate-200 px-4 py-3 text-sm">
                              <div className="font-semibold text-slate-900">{uiText.reviewDesk}</div>
                              <div className="text-slate-700">{tracker.feedbackDeskLabel}</div>
                            </div>
                            <div className="grid grid-cols-[11rem_1fr] px-4 py-3 text-sm">
                              <div className="font-semibold text-slate-900">{uiText.reviewNote}</div>
                              <div className="text-slate-700">{tracker.feedbackDeskDescription || text.notYetUpdated}</div>
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
                                  alt={`${uiText.workEvidenceAlt} ${index + 1}`}
                                  className="max-h-72 w-full object-cover"
                                />
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                        {uiText.noWorkEvidence}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {isExpiredComplaint ? (
                  <Card className="rounded-none border border-slate-300 bg-white py-0 shadow-none">
                    <SectionHeading title={uiText.complaintExpired} description={uiText.complaintExpiredSubtitle} />
                    <CardContent className="space-y-4 px-5 py-5">
                      <div className="border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                        {uiText.complaintExpiredBody}
                      </div>
                      <Button asChild className="rounded-none bg-[#0b3c5d] text-white hover:bg-[#082d46]">
                        <Link href="/citizen/submit">{uiText.createNewComplaint}</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ) : (complaint.rating || canRateResolution) ? (
                  <Card className="rounded-none border border-slate-300 bg-white py-0 shadow-none">
                    <SectionHeading title={uiText.citizenFeedback} description={uiText.citizenFeedbackSubtitle} />
                    <CardContent className="space-y-5 px-5 py-5">
                      {detailsLoading ? (
                        <LoadingSummary label={text.fetchingUpdates} description={text.feedbackLoading} className="rounded-none" />
                      ) : (
                        <>
                          <div className="border border-[#cfe0ef] bg-[linear-gradient(135deg,#f8fbff_0%,#eef6fb_100%)] px-4 py-4">
                            <div className="grid gap-3 md:grid-cols-2">
                              <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{uiText.verificationStatus}</div>
                                <div className="mt-2 text-sm font-semibold text-slate-950">{citizenRatingLabel}</div>
                              </div>
                              <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{uiText.trackingStatus}</div>
                                <div className="mt-2 text-sm font-semibold text-slate-950">
                                  {tracker?.citizenJourneyCompleted
                                    ? uiText.citizenTrackingCompleted
                                    : tracker?.waitingForFeedback
                                      ? uiText.waitingForCitizenFeedback
                                      : tracker?.feedbackDeskLabel || uiText.underOfficialProcessing}
                                </div>
                              </div>
                            </div>
                          </div>

                          {tracker?.feedbackDeskLabel ? (
                            <div className="border border-slate-200 bg-white">
                              <div className="grid grid-cols-[11rem_1fr] border-b border-slate-200 px-4 py-3 text-sm">
                                <div className="font-semibold text-slate-900">{uiText.currentReviewDesk}</div>
                                <div className="text-slate-700">{tracker.feedbackDeskLabel}</div>
                              </div>
                              <div className="grid grid-cols-[11rem_1fr] px-4 py-3 text-sm">
                                <div className="font-semibold text-slate-900">{uiText.reviewNote}</div>
                                <div className="text-slate-700">{tracker.feedbackDeskDescription || text.notYetUpdated}</div>
                              </div>
                            </div>
                          ) : null}

                          {complaint.rating ? (
                            <div className="border border-slate-200 bg-slate-50">
                              <div className="grid grid-cols-[11rem_1fr] border-b border-slate-200 px-4 py-3 text-sm">
                                <div className="font-semibold text-slate-900">{uiText.submittedRating}</div>
                                <div className="text-slate-700">{complaint.rating.rating}/5</div>
                              </div>
                              <div className="grid grid-cols-[11rem_1fr] border-b border-slate-200 px-4 py-3 text-sm">
                                <div className="font-semibold text-slate-900">{uiText.assessment}</div>
                                <div className="text-slate-700">{complaint.rating.rating >= 4 ? uiText.satisfied : uiText.reviewRequired}</div>
                              </div>
                              <div className="grid grid-cols-[11rem_1fr] px-4 py-3 text-sm">
                                <div className="font-semibold text-slate-900">{uiText.feedbackNote}</div>
                                <div className="text-slate-700">{complaint.rating.feedback || text.notYetUpdated}</div>
                              </div>
                            </div>
                          ) : null}

                          {canRateResolution ? (
                            <>
                              <div className="rounded-none border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
                                {tracker?.feedbackDeskDescription || uiText.feedbackHelp}
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
                                {FEEDBACK_TAGS[language].map((tag) => {
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
                                placeholder={uiText.feedbackPlaceholder}
                                className="rounded-none border-slate-300"
                              />

                              <Button
                                onClick={handleRating}
                                disabled={savingRating}
                                className="rounded-none bg-[#0b3c5d] text-white hover:bg-[#082d46]"
                              >
                                {savingRating ? <Spinner label={uiText.submitting} size="sm" /> : complaint.rating ? uiText.updateFeedback : uiText.submitFeedback}
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
              <SectionHeading title={text.trackerGuidance} description={text.trackerGuidanceDescription} />
                <div className="grid gap-3 px-5 py-5 md:grid-cols-2">
                  <div className="border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  {text.guidanceOne}
                  </div>
                  <div className="border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                    {text.guidanceTwo}
                  </div>
                  <div className="border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  {text.guidanceThree}
                  </div>
                  <div className="border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  {text.guidanceFour}
                  </div>
                </div>
              </section>
          </div>
        ) : (
          <section className="border border-slate-300 bg-white px-6 py-12 text-center">
            <div className="text-lg font-semibold text-slate-950">{text.recordNotAvailable}</div>
            <p className="mt-2 text-sm text-slate-600">
              {text.recordNotAvailableDescription}
            </p>
            <div className="mt-5">
              <Button asChild className="rounded-none bg-[#0b3c5d] text-white hover:bg-[#082d46]">
                <Link href="/citizen/my-complaints">{text.goToMyComplaints}</Link>
              </Button>
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
