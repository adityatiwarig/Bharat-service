'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BellRing, ChevronRight } from 'lucide-react';

import { useLandingLanguage } from '@/components/landing-language';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchNotifications } from '@/lib/client/notifications';
import type { AppNotification, Complaint } from '@/lib/types';

type OfficerAlertRole = 'L1' | 'L2' | 'L3';

function isSupervisoryAlert(notification: AppNotification, role: OfficerAlertRole) {
  const haystack = `${notification.title} ${notification.message}`.toLowerCase();

  if (role === 'L1') {
    return (
      haystack.includes('l2 reminder') ||
      haystack.includes('l3 reminder') ||
      haystack.includes('l2 monitoring active') ||
      haystack.includes('l3 monitoring active')
    );
  }

  if (role === 'L2') {
    return haystack.includes('l3 reminder') || haystack.includes('l3 monitoring active');
  }

  return false;
}

function formatAlertTime(value: string) {
  const createdAt = new Date(value);
  const diffMs = Date.now() - createdAt.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  return createdAt.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
}

const ALERT_TEXT = {
  en: {
    supervisoryAlerts: 'Supervisory Alerts',
    messagesL1: 'Messages From L2 And L3',
    messagesL2: 'Messages From L3',
    loading: 'Loading supervisory alerts...',
    new: 'New',
    mappedComplaintAlert: 'Mapped complaint alert',
    generalSupervisoryAlert: 'General supervisory alert',
    open: 'Open',
    empty: 'No higher-officer reminders are active right now.',
    openFullDashboard: 'Open Full Dashboard',
  },
  hi: {
    supervisoryAlerts: 'पर्यवेक्षी अलर्ट',
    messagesL1: 'L2 और L3 से संदेश',
    messagesL2: 'L3 से संदेश',
    loading: 'पर्यवेक्षी अलर्ट लोड किए जा रहे हैं...',
    new: 'नया',
    mappedComplaintAlert: 'मैप की गई शिकायत सूचना',
    generalSupervisoryAlert: 'सामान्य पर्यवेक्षी सूचना',
    open: 'खोलें',
    empty: 'अभी कोई उच्च-अधिकारी रिमाइंडर सक्रिय नहीं है।',
    openFullDashboard: 'पूरा डैशबोर्ड खोलें',
  },
} as const;

export function OfficerSupervisoryAlerts({
  role,
  complaints,
  selectedComplaintId,
}: {
  role: OfficerAlertRole;
  complaints: Complaint[];
  selectedComplaintId?: string | null;
}) {
  const router = useRouter();
  const { language } = useLandingLanguage();
  const text = ALERT_TEXT[language];
  const [alerts, setAlerts] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role === 'L3') {
      setAlerts([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadAlerts() {
      try {
        const data = await fetchNotifications();

        if (cancelled) {
          return;
        }

        setAlerts(data.notifications.filter((item) => isSupervisoryAlert(item, role)));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAlerts();
    const intervalId = window.setInterval(() => {
      void loadAlerts();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [role]);

  const complaintCodeById = useMemo(
    () =>
      complaints.reduce<Record<string, string>>((accumulator, complaint) => {
        accumulator[complaint.id] = complaint.complaint_id;
        return accumulator;
      }, {}),
    [complaints],
  );

  const visibleAlerts = useMemo(() => {
    const orderedAlerts = [...alerts].sort((left, right) => {
      const leftSelected = selectedComplaintId && left.complaint_id === selectedComplaintId ? 0 : 1;
      const rightSelected = selectedComplaintId && right.complaint_id === selectedComplaintId ? 0 : 1;

      if (leftSelected !== rightSelected) {
        return leftSelected - rightSelected;
      }

      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    });

    return orderedAlerts.slice(0, 4);
  }, [alerts, selectedComplaintId]);

  async function openAlert(notification: AppNotification) {
    if (!notification.is_read) {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [notification.id] }),
      }).catch(() => undefined);

      setAlerts((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item)),
      );
    }

    const complaintCode = notification.complaint_id ? complaintCodeById[notification.complaint_id] : null;
    const fallbackHref =
      role === 'L1' && complaintCode
        ? `/l1/updates?id=${encodeURIComponent(complaintCode)}`
        : role === 'L2'
          ? '/l2'
          : '/l1';

    router.push(notification.href || fallbackHref);
    router.refresh();
  }

  if (role === 'L3') {
    return null;
  }

  return (
    <Card className="overflow-hidden rounded-[1.8rem] border-[#e7d4bf] bg-[linear-gradient(180deg,#fffaf2_0%,#fff5e6_100%)]">
      <CardHeader className="border-b border-[#eed9bd]">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8d5a13]">
          <BellRing className="h-4 w-4" />
          {text.supervisoryAlerts}
        </div>
        <CardTitle className="text-[1.25rem] text-[#12385b]">
          {role === 'L1' ? text.messagesL1 : text.messagesL2}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-6">
        {loading ? (
          <div className="rounded-[1.1rem] border border-[#eed9bd] bg-white px-4 py-4 text-sm text-[#8d5a13]">
            {text.loading}
          </div>
        ) : visibleAlerts.length ? (
          visibleAlerts.map((alert) => (
            <button
              key={alert.id}
              type="button"
              onClick={() => {
                void openAlert(alert);
              }}
              className={`w-full rounded-[1.2rem] border px-4 py-4 text-left transition ${
                alert.is_read
                  ? 'border-[#eadfcd] bg-white hover:border-[#d4ba92]'
                  : 'border-[#d4a45b] bg-[#fff7e8] shadow-[0_12px_28px_rgba(141,90,19,0.08)] hover:border-[#b97d2e]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-semibold text-[#12385b]">{alert.title}</div>
                <div className="flex items-center gap-2 text-xs text-[#8d5a13]">
                  {!alert.is_read ? <span className="rounded-full bg-[#ff9933] px-2 py-0.5 font-semibold text-slate-900">{text.new}</span> : null}
                  <span>{formatAlertTime(alert.created_at)}</span>
                </div>
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-700">{alert.message}</div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>{alert.complaint_id ? complaintCodeById[alert.complaint_id] || text.mappedComplaintAlert : text.generalSupervisoryAlert}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-[#0b3c5d]">
                  {text.open}
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </button>
          ))
        ) : (
          <div className="rounded-[1.1rem] border border-dashed border-[#eed9bd] bg-white px-4 py-5 text-sm text-[#8d5a13]">
            {text.empty}
          </div>
        )}

        {!loading && visibleAlerts.length ? (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-[#d7c2a1] bg-white text-[#12385b] hover:bg-[#fff7e8]"
              onClick={() => {
                router.push(role === 'L1' ? '/l1' : '/l2');
              }}
            >
              {text.openFullDashboard}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
