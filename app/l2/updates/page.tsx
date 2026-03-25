'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BellRing, CheckCircle2, ClipboardCheck, LoaderCircle, MapPinned } from 'lucide-react';
import { toast } from 'sonner';

import { useLandingLanguage } from '@/components/landing-language';
import { DashboardLayout } from '@/components/dashboard-layout';
import { LoadingSummary } from '@/components/loading-skeletons';
import { OfficerSupervisoryAlerts } from '@/components/officer-supervisory-alerts';
import { PriorityBadge, StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  closeComplaintByReviewDesk,
  fetchComplaintById,
  fetchOfficerDashboard,
  reopenComplaintByReviewDesk,
  sendReminderToL1FromL2,
} from '@/lib/client/complaints';
import type { Complaint, ComplaintLevel, OfficerDashboardSummary } from '@/lib/types';

function normalizeDashboardLevel(level?: ComplaintLevel | null) {
  if (!level) {
    return null;
  }

  return level === 'L2_ESCALATED' ? 'L2' : level;
}

function hasCitizenFeedback(complaint: Complaint) {
  return Boolean(
    complaint.rating &&
    (
      complaint.rating.satisfaction ||
      complaint.rating.feedback?.trim() ||
      typeof complaint.rating.rating === 'number'
    ),
  );
}

function hasSatisfiedCitizenFeedback(complaint: Complaint) {
  if (!complaint.rating) {
    return false;
  }

  if (complaint.rating.satisfaction) {
    return complaint.rating.satisfaction === 'satisfied';
  }

  return typeof complaint.rating.rating === 'number' && complaint.rating.rating >= 4;
}

function isDeadlineExpired(deadline?: string | null) {
  if (!deadline) {
    return false;
  }

  return new Date(deadline).getTime() <= Date.now();
}

function isL2DeadlineMissed(complaint: Complaint) {
  return (
    complaint.current_level === 'L3' &&
    complaint.status === 'l2_deadline_missed'
  ) || (
    (complaint.current_level === 'L2' || complaint.current_level === 'L2_ESCALATED') &&
    (complaint.status === 'l2_deadline_missed' || isDeadlineExpired(complaint.deadline))
  );
}

function isTerminalComplaint(complaint: Complaint) {
  return ['closed', 'expired', 'rejected'].includes(complaint.status);
}

function isComplaintForwardedToL2ByL1(complaint: Complaint) {
  const message = `${complaint.department_message || ''}`.toLowerCase();

  return (
    complaint.current_level === 'L2' &&
    (
      message.includes('forwarded by the assigned level 1 officer to level 2 supervision') ||
      message.includes('under level 2 supervision') ||
      message.includes('final level 2 review')
    )
  );
}

function formatDeadline(deadline?: string | null, language: 'en' | 'hi' = 'en') {
  if (!deadline) {
    return language === 'hi' ? 'कोई समय-सीमा नहीं' : 'No deadline';
  }

  return new Date(deadline).toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatFeedbackLabel(complaint: Complaint, language: 'en' | 'hi' = 'en') {
  if (!complaint.rating) {
    return language === 'hi' ? 'अभी तक कोई नागरिक फीडबैक नहीं' : 'No citizen feedback yet';
  }

  if (complaint.rating.satisfaction === 'satisfied' || complaint.rating.rating >= 4) {
    return language === 'hi' ? `संतुष्ट (${complaint.rating.rating}/5)` : `Satisfied (${complaint.rating.rating}/5)`;
  }

  return language === 'hi' ? `असंतुष्ट (${complaint.rating.rating}/5)` : `Not Satisfied (${complaint.rating.rating}/5)`;
}

function getCitizenComplaintDescription(complaint: Complaint) {
  return complaint.text?.trim() || complaint.description?.trim() || '';
}

export default function L2UpdatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLandingLanguage();
  const preferredComplaintCode = searchParams?.get('id')?.trim() || '';
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<OfficerDashboardSummary | null>(null);
  const [selectedComplaintId, setSelectedComplaintId] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [deskNote, setDeskNote] = useState('');
  const t = language === 'hi'
    ? {
        pageTitle: 'L2 अपडेट डेस्क',
        unableLoadDesk: 'L2 डेस्क लोड नहीं हो सकी।',
        unableProcessAction: 'अभी इस L2 कार्रवाई को संसाधित नहीं किया जा सका।',
        loadingLabel: 'L2 पर्यवेक्षण डेस्क लोड हो रही है',
        loadingDescription: 'रिमाइंडर, फीडबैक समीक्षा और समापन कार्रवाई तैयार की जा रही हैं।',
        headerEyebrow: 'L2 पर्यवेक्षण डेस्क',
        headerTitle: 'रिमाइंडर, नागरिक फीडबैक और अंतिम समीक्षा',
        headerDescription: 'यह पेज स्तर 2 पर्यवेक्षण के लिए समर्पित है। इसका उपयोग अग्रेषित या विलंबित L1 शिकायतों की निगरानी, L1 को रिमाइंडर भेजने, L1 कार्य पूर्ण होने के बाद नागरिक फीडबैक की प्रतीक्षा करने और फिर अंतिम बंद या पुनः खोलने का निर्णय लेने के लिए करें।',
        queueEyebrow: 'L2 कतार',
        queueTitle: 'आवंटित शिकायतें',
        ward: 'वार्ड',
        l2Escalated: 'L2 को अग्रेषित',
        noAssignedComplaints: 'इस L2 डेस्क पर अभी कोई शिकायत आवंटित नहीं है।',
        consoleEyebrow: 'L2 कार्रवाई कंसोल',
        consoleTitle: 'पर्यवेक्षण और समीक्षा पैनल',
        deskState: 'डेस्क स्थिति',
        deadline: 'समय-सीमा',
        citizenFeedback: 'नागरिक फीडबैक',
        citizenDescription: 'नागरिक विवरण',
        lockedComplaint: 'यह शिकायत आधिकारिक अभिलेख में पहले ही अंतिम रूप से बंद की जा चुकी है। L2 कार्रवाई कंसोल अब लॉक है और इस डेस्क से कोई रिमाइंडर, समीक्षा या पुनः खोलने की कार्रवाई नहीं की जा सकती।',
        finalReviewDesk: 'अंतिम L2 समीक्षा डेस्क',
        finalReviewDescription: 'नागरिक फीडबैक L2 तक पहुँच चुका है। यहाँ प्रमाण और नागरिक टिप्पणियों की समीक्षा करें, फिर शिकायत बंद करें या नए L1 कार्य के लिए पुनः खोलें।',
        finalReviewPlaceholder: 'अंतिम L2 समीक्षा टिप्पणी जोड़ें...',
        complaintClosed: 'L2 नागरिक-फीडबैक समीक्षा के बाद शिकायत बंद कर दी गई।',
        complaintReopened: 'शिकायत पुनः खोली गई और नए कार्य हेतु L1 को लौटाई गई।',
        closeComplaint: 'शिकायत बंद करें',
        reopenComplaint: 'शिकायत पुनः खोलें',
        waitingCitizen: 'L1 ने कार्य पूर्णता प्रमाण पहले ही जमा कर दिया है। नागरिक फीडबैक लंबित है, इसलिए L2 अभी शिकायत बंद नहीं कर सकता। फीडबैक जमा होते ही अंतिम L2 कार्रवाई यहाँ स्वतः उपलब्ध हो जाएगी।',
        manualSupervision: 'मैनुअल L2 पर्यवेक्षण',
        monitoringDesk: 'L2 निगरानी डेस्क',
        manualSupervisionDescription: 'L1 ने मूल नियत समय से पहले इस शिकायत को अग्रेषित किया। अब L2 मामले की निगरानी करता है, समय-रेखा बढ़ाई गई है, और अंतिम L2 समीक्षा खुलने से पहले L1 को फील्ड कार्य पूरा करना होगा।',
        monitoringDescription: 'L1 अपनी कार्य-समय सीमा पार कर चुका है। अब L2 शिकायत की निगरानी करता है, L1 के साथ समन्वय करता है, और नागरिक फीडबैक जमा होने के बाद समीक्षा डेस्क बनता है।',
        reminderPlaceholder: 'L1 के लिए वैकल्पिक रिमाइंडर या समन्वय टिप्पणी...',
        monitoringNote: 'L2 फील्ड कार्य नहीं करता। इस कार्रवाई का उपयोग केवल L1 को रिमाइंडर भेजने और शिकायत को आगे बढ़ाने के लिए करें, जब तक प्रमाण अपलोड न हो जाए और नागरिक फीडबैक दर्ज न हो जाए।',
        reminderSent: 'L1 को रिमाइंडर सफलतापूर्वक भेजा गया।',
        sending: 'भेजा जा रहा है...',
        sendReminder: 'L1 को रिमाइंडर भेजें',
        deadlineMissed: 'L2 समीक्षा विंडो पहले ही समाप्त हो चुकी है। यह शिकायत अब L3 निगरानी या समीक्षा के अंतर्गत है।',
        noActionAvailable: 'अभी इस शिकायत के लिए कोई प्रत्यक्ष L2 कार्रवाई उपलब्ध नहीं है।',
        selectComplaint: 'रिमाइंडर, नागरिक फीडबैक और समीक्षा नियंत्रण खोलने के लिए L2 कतार से कोई शिकायत चुनें।',
      }
    : {
        pageTitle: 'L2 Update Desk',
        unableLoadDesk: 'Unable to load the L2 desk.',
        unableProcessAction: 'Unable to process this L2 action right now.',
        loadingLabel: 'Loading L2 supervision desk',
        loadingDescription: 'Preparing reminder, feedback review, and closure actions.',
        headerEyebrow: 'L2 Supervision Desk',
        headerTitle: 'Reminder, Citizen Feedback, And Final Review',
        headerDescription: 'This page is dedicated to Level 2 supervision. Use it to monitor forwarded or overdue L1 complaints, send reminders to L1, wait for citizen feedback after L1 completion, and then take the final close or reopen decision.',
        queueEyebrow: 'L2 Queue',
        queueTitle: 'Assigned Complaints',
        ward: 'Ward',
        l2Escalated: 'L2 Escalated',
        noAssignedComplaints: 'No complaints are currently assigned to this L2 desk.',
        consoleEyebrow: 'L2 Action Console',
        consoleTitle: 'Supervision And Review Panel',
        deskState: 'Desk State',
        deadline: 'Deadline',
        citizenFeedback: 'Citizen Feedback',
        citizenDescription: 'Citizen Description',
        lockedComplaint: 'This complaint has already been finalized in the official record. The L2 action console is now locked, and no reminder, review, or reopen action can be taken from this desk.',
        finalReviewDesk: 'Final L2 Review Desk',
        finalReviewDescription: 'Citizen feedback has reached L2. Review the proof and citizen remarks here, then close the complaint or reopen it for fresh L1 action.',
        finalReviewPlaceholder: 'Add the final L2 review note...',
        complaintClosed: 'Complaint closed after L2 citizen-feedback review.',
        complaintReopened: 'Complaint reopened and returned to L1 for fresh action.',
        closeComplaint: 'Close Complaint',
        reopenComplaint: 'Reopen Complaint',
        waitingCitizen: 'L1 has already submitted completion proof. Citizen feedback is pending, so L2 cannot close the complaint yet. Final L2 action will unlock here automatically after feedback is submitted.',
        manualSupervision: 'Manual L2 Supervision',
        monitoringDesk: 'L2 Monitoring Desk',
        manualSupervisionDescription: 'L1 forwarded this complaint before the original due date. L2 now supervises the case, the timeline is extended, and L1 must still complete the field work before citizen feedback opens the final L2 review.',
        monitoringDescription: 'L1 has crossed its execution window. L2 now monitors the complaint, coordinates with L1, and later becomes the review desk after citizen feedback is submitted.',
        reminderPlaceholder: 'Optional reminder or coordination note for L1...',
        monitoringNote: 'L2 does not execute field work. Use this action only to remind L1 and keep the complaint moving until proof is uploaded and citizen feedback is recorded.',
        reminderSent: 'Reminder sent to L1 successfully.',
        sending: 'Sending...',
        sendReminder: 'Send Reminder to L1',
        deadlineMissed: 'The L2 review window has already expired. This complaint now belongs to L3 monitoring or review.',
        noActionAvailable: 'No direct L2 action is available for this complaint right now.',
        selectComplaint: 'Select a complaint from the L2 queue to open reminder, citizen feedback, and review controls.',
      };

  async function loadDesk(
    preferredCode?: string,
    preferredId?: string,
    options: { silent?: boolean; preserveNote?: boolean } = {},
  ) {
    if (!options.silent) {
      setLoading(true);
    }

    try {
      const data = await fetchOfficerDashboard();
      let items = data.summary.items;

      const matchedComplaint = preferredId
        ? items.find((item) => item.id === preferredId)
        : preferredCode
          ? items.find((item) => item.complaint_id === preferredCode)
          : null;
      let nextComplaint = matchedComplaint || null;

      if (!nextComplaint && (preferredCode || preferredId)) {
        try {
          const fetchedComplaint = await fetchComplaintById(preferredCode || preferredId || '', {
            view: 'full',
            force: true,
          });

          if (fetchedComplaint) {
            items = [fetchedComplaint, ...items.filter((item) => item.id !== fetchedComplaint.id)];
            nextComplaint = fetchedComplaint;
          }
        } catch {
          // Fallback to queue list if direct lookup is unavailable for this complaint.
        }
      }

      const fallbackComplaint = items[0] || null;
      nextComplaint = nextComplaint || fallbackComplaint;
      const nextId = nextComplaint?.id || '';

      setSummary({
        ...data.summary,
        items,
      });
      setSelectedComplaintId(nextId);
      if (!options.preserveNote) {
        setDeskNote('');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.unableLoadDesk);
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadDesk(preferredComplaintCode);
  }, [preferredComplaintCode]);

  const complaintItems = summary?.items || [];
  const selectedComplaint = complaintItems.find((item) => item.id === selectedComplaintId) || complaintItems[0] || null;
  const complaint = selectedComplaint;
  const citizenComplaintDescription = complaint ? getCitizenComplaintDescription(complaint) : '';
  const operationalLevel = complaint ? normalizeDashboardLevel(complaint.current_level) : null;
  const feedbackRecorded = complaint ? hasCitizenFeedback(complaint) : false;
  const feedbackSatisfied = complaint ? hasSatisfiedCitizenFeedback(complaint) : false;
  const forwardedToL2ByL1 = complaint ? isComplaintForwardedToL2ByL1(complaint) : false;
  const l2DeadlineMissed = complaint ? isL2DeadlineMissed(complaint) : false;
  const isBusy = complaint ? actionId === complaint.id : false;
  const isLockedComplaint = Boolean(complaint && isTerminalComplaint(complaint));
  const canReviewAtDesk = Boolean(
    complaint &&
    operationalLevel === 'L2' &&
    complaint.status === 'resolved' &&
    feedbackRecorded &&
    !l2DeadlineMissed
  );
  const waitingForCitizenAtDesk = Boolean(
    complaint &&
    operationalLevel === 'L2' &&
    complaint.status === 'resolved' &&
    !feedbackRecorded
  );
  const canMonitorAtL2 = Boolean(
    complaint &&
    operationalLevel === 'L2' &&
    complaint.status !== 'resolved' &&
    !isTerminalComplaint(complaint) &&
    !l2DeadlineMissed
  );

  useEffect(() => {
    const liveComplaintCode = complaint?.complaint_id || preferredComplaintCode;

    if (!liveComplaintCode) {
      return;
    }

    const refreshDesk = () => {
      void loadDesk(liveComplaintCode, complaint?.id, { silent: true, preserveNote: true });
    };

    const intervalId = window.setInterval(refreshDesk, 15000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshDesk();
      }
    };
    const handleFocus = () => {
      refreshDesk();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [complaint?.complaint_id, complaint?.id, preferredComplaintCode]);

  async function runAction(action: () => Promise<void>) {
    if (!complaint) {
      return;
    }

    setActionId(complaint.id);

    try {
      await action();
      await loadDesk(preferredComplaintCode || complaint.complaint_id, complaint.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.unableProcessAction);
    } finally {
      setActionId(null);
    }
  }

  if (loading && !summary) {
    return (
      <DashboardLayout title="L2 Update Desk" userRole="worker">
        <LoadingSummary label={t.loadingLabel} description={t.loadingDescription} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t.pageTitle} userRole="worker">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-[#d7e2eb] bg-[linear-gradient(180deg,#ffffff_0%,#eef5fb_100%)] shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <div className="grid h-1.5 w-full grid-cols-3 overflow-hidden">
            <div className="bg-[#ff9933]" />
            <div className="bg-white" />
            <div className="bg-[#138808]" />
          </div>

          <div className="px-6 py-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0b3c5d]">{t.headerEyebrow}</div>
            <h1 className="mt-2 text-[1.8rem] font-semibold tracking-tight text-[#12385b]">{t.headerTitle}</h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-[#53687d]">
              {t.headerDescription}
            </p>
          </div>
        </section>

        <OfficerSupervisoryAlerts
          role="L2"
          complaints={complaintItems}
          selectedComplaintId={selectedComplaint?.id || selectedComplaintId || null}
        />

        <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
          <Card className="overflow-hidden rounded-[1.8rem] border-[#d7e2eb]">
            <CardHeader className="border-b border-[#d7e2eb] bg-[linear-gradient(180deg,#f8fbff_0%,#eef5fb_100%)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0b3c5d]">{t.queueEyebrow}</div>
              <CardTitle className="mt-2 text-[1.45rem] text-[#12385b]">{t.queueTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-6">
              {complaintItems.length ? complaintItems.map((item) => {
                const active = item.id === complaint?.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedComplaintId(item.id);
                      setDeskNote('');
                      startTransition(() => {
                        router.replace(`/l2/updates?id=${encodeURIComponent(item.complaint_id)}`);
                      });
                    }}
                    className={`w-full rounded-[1.25rem] border px-4 py-4 text-left transition ${
                      active
                        ? 'border-[#0b3c5d] bg-[#0b3c5d] text-white shadow-[0_16px_36px_rgba(11,60,93,0.18)]'
                        : 'border-[#d7e2eb] bg-white hover:border-[#9fb8cf] hover:bg-[#f8fbff]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <PriorityBadge priority={item.priority} />
                      <StatusBadge status={item.status} />
                    </div>
                    <div className={`mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] ${active ? 'text-white/70' : 'text-[#60758a]'}`}>
                      {item.complaint_id}
                    </div>
                    <div className="mt-1 text-sm font-semibold">{item.title}</div>
                    <div className={`mt-2 text-xs ${active ? 'text-white/80' : 'text-[#60758a]'}`}>
                      {item.ward_name || `${t.ward} ${item.ward_id}`} | {item.current_level === 'L2_ESCALATED' ? t.l2Escalated : item.current_level || 'L2'}
                    </div>
                  </button>
                );
              }) : (
                <div className="rounded-[1.2rem] border border-dashed border-[#d7e2eb] bg-[#f8fbff] px-4 py-6 text-sm text-[#60758a]">
                  {t.noAssignedComplaints}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[1.8rem] border-[#d7e2eb]">
            <CardHeader className="border-b border-[#d7e2eb] bg-[linear-gradient(180deg,#fffaf2_0%,#fff4df_100%)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8d5a13]">{t.consoleEyebrow}</div>
              <CardTitle className="mt-2 text-[1.45rem] text-[#12385b]">{t.consoleTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {complaint ? (
                <>
                  <div className="rounded-[1.35rem] border border-[#d7e2eb] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#60758a]">{complaint.complaint_id}</div>
                        <div className="mt-2 text-xl font-semibold text-[#12385b]">{complaint.title}</div>
                        <div className="mt-2 flex items-center gap-2 text-sm text-[#60758a]">
                          <MapPinned className="h-4 w-4" />
                          {complaint.ward_name || `${t.ward} ${complaint.ward_id}`}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <PriorityBadge priority={complaint.priority} />
                        <StatusBadge status={complaint.status} />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-[1rem] border border-[#d7e2eb] bg-white px-3 py-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60758a]">{t.deskState}</div>
                        <div className="mt-2 text-sm font-semibold text-[#12385b]">{complaint.current_level === 'L2_ESCALATED' ? t.l2Escalated : complaint.current_level || 'L2'}</div>
                      </div>
                      <div className="rounded-[1rem] border border-[#d7e2eb] bg-white px-3 py-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60758a]">{t.deadline}</div>
                        <div className="mt-2 text-sm font-semibold text-[#12385b]">{formatDeadline(complaint.deadline, language)}</div>
                      </div>
                      <div className="rounded-[1rem] border border-[#d7e2eb] bg-white px-3 py-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60758a]">{t.citizenFeedback}</div>
                        <div className="mt-2 text-sm font-semibold text-[#12385b]">{formatFeedbackLabel(complaint, language)}</div>
                      </div>
                    </div>

                    {citizenComplaintDescription ? (
                      <div className="mt-4 rounded-[1rem] border border-[#d7e2eb] bg-white px-4 py-4">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60758a]">{t.citizenDescription}</div>
                        <div className="mt-2 text-sm leading-6 text-slate-700">{citizenComplaintDescription}</div>
                      </div>
                    ) : null}
                  </div>

                  {isLockedComplaint ? (
                    <section className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
                      {t.lockedComplaint}
                    </section>
                  ) : canReviewAtDesk ? (
                    <section className="space-y-4 rounded-[1.35rem] border border-emerald-200 bg-emerald-50/70 p-5">
                      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                        <ClipboardCheck className="h-4 w-4" />
                        {t.finalReviewDesk}
                      </div>
                      <div className="text-sm leading-6 text-emerald-900">
                        {t.finalReviewDescription}
                      </div>
                      {complaint.rating?.feedback ? (
                        <div className="rounded-[1rem] border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-700">
                          {complaint.rating.feedback}
                        </div>
                      ) : null}
                      <Textarea
                        value={deskNote}
                        onChange={(event) => setDeskNote(event.target.value)}
                        rows={4}
                        placeholder={t.finalReviewPlaceholder}
                        disabled={isBusy || isPending}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          className="rounded-full bg-[#138808] text-white hover:bg-[#0f6f07]"
                          disabled={isBusy || isPending || !feedbackSatisfied}
                          onClick={() => {
                            void runAction(async () => {
                              await closeComplaintByReviewDesk(complaint.id, deskNote.trim() || undefined);
                              toast.success(t.complaintClosed);
                            });
                          }}
                        >
                          {isBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          {t.closeComplaint}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-full"
                          disabled={isBusy || isPending || feedbackSatisfied}
                          onClick={() => {
                            void runAction(async () => {
                              await reopenComplaintByReviewDesk(complaint.id, deskNote.trim() || undefined);
                              toast.success(t.complaintReopened);
                            });
                          }}
                        >
                          {t.reopenComplaint}
                        </Button>
                      </div>
                    </section>
                  ) : waitingForCitizenAtDesk ? (
                    <section className="rounded-[1.35rem] border border-amber-200 bg-amber-50/80 p-5 text-sm leading-6 text-amber-900">
                      {t.waitingCitizen}
                    </section>
                  ) : canMonitorAtL2 ? (
                    <section className={`space-y-4 rounded-[1.35rem] border p-5 ${forwardedToL2ByL1 ? 'border-indigo-200 bg-indigo-50/80' : 'border-rose-200 bg-rose-50/80'}`}>
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#12385b]">
                        <BellRing className="h-4 w-4" />
                        {forwardedToL2ByL1 ? t.manualSupervision : t.monitoringDesk}
                      </div>
                      <div className="text-sm leading-6 text-slate-700">
                        {forwardedToL2ByL1
                          ? t.manualSupervisionDescription
                          : t.monitoringDescription}
                      </div>
                      <Textarea
                        value={deskNote}
                        onChange={(event) => setDeskNote(event.target.value)}
                        rows={4}
                        placeholder={t.reminderPlaceholder}
                        disabled={isBusy || isPending}
                      />
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs text-slate-600">
                          {t.monitoringNote}
                        </div>
                        <Button
                          type="button"
                          className="rounded-full"
                          disabled={isBusy || isPending}
                          onClick={() => {
                            void runAction(async () => {
                              await sendReminderToL1FromL2(complaint.id, deskNote.trim() || undefined);
                              toast.success(t.reminderSent);
                            });
                          }}
                        >
                          {isBusy ? t.sending : t.sendReminder}
                        </Button>
                      </div>
                    </section>
                  ) : l2DeadlineMissed ? (
                    <section className="rounded-[1.35rem] border border-rose-200 bg-rose-50/80 p-5 text-sm leading-6 text-rose-900">
                      {t.deadlineMissed}
                    </section>
                  ) : (
                    <section className="rounded-[1.35rem] border border-[#d7e2eb] bg-white p-5 text-sm leading-6 text-[#53687d]">
                      {complaint.department_message || t.noActionAvailable}
                    </section>
                  )}
                </>
              ) : (
                <div className="rounded-[1.2rem] border border-dashed border-[#d7e2eb] bg-[#f8fbff] px-4 py-8 text-sm text-[#60758a]">
                  {t.selectComplaint}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
