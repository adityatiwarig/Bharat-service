'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileSearch } from 'lucide-react';

import { ComplaintCard } from '@/components/complaint-card';
import { ComplaintCardSkeleton } from '@/components/complaint-card-skeleton';
import { DashboardLayout } from '@/components/dashboard-layout';
import { KPICard } from '@/components/kpi-card';
import { useLandingLanguage } from '@/components/landing-language';
import { KpiCardSkeleton } from '@/components/loading-skeletons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchComplaints } from '@/lib/client/complaints';
import type { Complaint } from '@/lib/types';

const TEXT = {
  en: {
    title: 'Citizen Dashboard',
    breadcrumb: 'Home > Citizen Dashboard',
    quickActionsTitle: 'Quick Actions',
    quickActions: [
      { href: '/citizen/submit', title: 'Raise Complaint', description: 'Create a new civic grievance.' },
      { href: '/citizen/tracker', title: 'Open Tracker', description: 'Check complaint status and updates.' },
      { href: '/citizen/my-complaints', title: 'My Complaints', description: 'Review all submitted complaints.' },
    ],
    stats: {
      total: 'Total Complaints',
      totalSubtitle: 'All complaints under your account',
      open: 'Open Cases',
      openSubtitle: 'Pending intake or field action',
      inProgress: 'In Progress',
      inProgressSubtitle: 'Under active department handling',
      resolved: 'Resolved',
      resolvedSubtitle: 'Resolved or closed complaints',
    },
    recentComplaints: 'Recent Complaints',
    recentComplaintsDescription: 'Review the latest requests submitted from your account.',
    viewAllComplaints: 'View all complaints',
    noComplaints: "No complaints yet. Click 'Raise Complaint' to submit your first request.",
    commonActions: 'Common citizen actions are available here.',
    helpTitle: 'Help & Information',
    helpDescription: 'Important information related to complaint tracking and closure.',
    helpItems: [
      {
        title: 'One official workspace',
        description: 'Dashboard, tracker, and complaint history stay within the citizen panel for easier follow-up.',
      },
      {
        title: 'Clear complaint tracking',
        description: 'Use complaint ID search and tracker updates to see the current stage of each grievance.',
      },
      {
        title: 'Citizen feedback',
        description: 'After resolution, feedback can be submitted before final closure where applicable.',
      },
    ],
    loadError: 'Unable to load complaints.',
  },
  hi: {
    title: 'नागरिक डैशबोर्ड',
    breadcrumb: 'होम > नागरिक डैशबोर्ड',
    quickActionsTitle: 'त्वरित कार्य',
    quickActions: [
      { href: '/citizen/submit', title: 'शिकायत दर्ज करें', description: 'नई नागरिक शिकायत दर्ज करें।' },
      { href: '/citizen/tracker', title: 'ट्रैकर खोलें', description: 'शिकायत की स्थिति और अपडेट देखें।' },
      { href: '/citizen/my-complaints', title: 'मेरी शिकायतें', description: 'अपनी सभी दर्ज शिकायतों की समीक्षा करें।' },
    ],
    stats: {
      total: 'कुल शिकायतें',
      totalSubtitle: 'आपके खाते की सभी शिकायतें',
      open: 'खुले मामले',
      openSubtitle: 'स्वीकृति या फील्ड कार्रवाई लंबित',
      inProgress: 'प्रगति पर',
      inProgressSubtitle: 'विभाग द्वारा सक्रिय निपटान जारी',
      resolved: 'निस्तारित',
      resolvedSubtitle: 'निस्तारित या बंद शिकायतें',
    },
    recentComplaints: 'हाल की शिकायतें',
    recentComplaintsDescription: 'आपके खाते से हाल में दर्ज अनुरोधों की समीक्षा करें।',
    viewAllComplaints: 'सभी शिकायतें देखें',
    noComplaints: "अभी तक कोई शिकायत नहीं है। अपनी पहली शिकायत दर्ज करने के लिए 'शिकायत दर्ज करें' पर क्लिक करें।",
    commonActions: 'यहां सामान्य नागरिक कार्य उपलब्ध हैं।',
    helpTitle: 'सहायता और जानकारी',
    helpDescription: 'शिकायत ट्रैकिंग और समापन से संबंधित महत्वपूर्ण जानकारी।',
    helpItems: [
      {
        title: 'एक आधिकारिक कार्यक्षेत्र',
        description: 'आसान फॉलो-अप के लिए डैशबोर्ड, ट्रैकर और शिकायत इतिहास नागरिक पैनल में ही रहते हैं।',
      },
      {
        title: 'स्पष्ट शिकायत ट्रैकिंग',
        description: 'प्रत्येक शिकायत के वर्तमान चरण को देखने के लिए शिकायत आईडी खोज और ट्रैकर अपडेट का उपयोग करें।',
      },
      {
        title: 'नागरिक फीडबैक',
        description: 'निस्तारण के बाद, जहां लागू हो वहां अंतिम समापन से पहले फीडबैक जमा किया जा सकता है।',
      },
    ],
    loadError: 'शिकायतें लोड नहीं हो सकीं।',
  },
} as const;

export default function CitizenDashboard() {
  const router = useRouter();
  const { language } = useLandingLanguage();
  const text = TEXT[language];
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [totalComplaints, setTotalComplaints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    fetchComplaints({ mine: true, page_size: 100 })
      .then((result) => {
        if (mounted) {
          setComplaints(result.items);
          setTotalComplaints(result.total);
          setError('');
        }
      })
      .catch((fetchError) => {
        if (mounted) {
          setError(fetchError instanceof Error ? fetchError.message : text.loadError);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [text.loadError]);

  const stats = useMemo(
    () => ({
      total: totalComplaints || complaints.length,
      resolved: complaints.filter((item) => item.status === 'resolved' || item.status === 'closed').length,
      in_progress: complaints.filter((item) => item.status === 'in_progress').length,
      open: complaints.filter((item) => ['submitted', 'received', 'assigned', 'in_progress'].includes(item.status)).length,
    }),
    [complaints, totalComplaints],
  );

  const recentComplaints = complaints.slice(0, 3);

  return (
    <DashboardLayout title={text.title} compactCitizenHeader>
      <div className="space-y-4">
        <section className="space-y-4">
          <div>
            <div className="mb-2 text-xs text-gray-500">{text.breadcrumb}</div>
            <div className="mb-4 text-lg font-semibold text-gray-800">{text.title}</div>
          </div>
          <div>
            <div className="mb-3 text-sm font-medium text-gray-700">{text.quickActionsTitle}</div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-md bg-green-600 px-5 text-white hover:bg-green-700">
                <Link href="/citizen/submit">
                  {text.quickActions[0].title}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-md border-gray-300 bg-white px-5 text-gray-700 hover:bg-gray-50">
                <Link href="/citizen/tracker">
                  {text.quickActions[1].title}
                  <FileSearch className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <div className="gov-stagger grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            <>
              <KpiCardSkeleton />
              <KpiCardSkeleton />
              <KpiCardSkeleton />
              <KpiCardSkeleton />
            </>
          ) : (
            <>
              <KPICard title={text.stats.total} value={stats.total} subtitle={text.stats.totalSubtitle} />
              <KPICard title={text.stats.open} value={stats.open} subtitle={text.stats.openSubtitle} variant="warning" />
              <KPICard title={text.stats.inProgress} value={stats.in_progress} subtitle={text.stats.inProgressSubtitle} variant="primary" />
              <KPICard title={text.stats.resolved} value={stats.resolved} subtitle={text.stats.resolvedSubtitle} variant="success" />
            </>
          )}
        </div>

        <div className="grid grid-cols-12 gap-4">
          <Card className="col-span-12 rounded-md border border-gray-300 bg-white shadow-none xl:col-span-8">
            <CardHeader className="flex flex-col gap-3 border-b border-gray-300 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{text.recentComplaints}</CardTitle>
                <p className="mt-1.5 text-sm text-gray-600">{text.recentComplaintsDescription}</p>
              </div>
              <Button asChild variant="outline" className="rounded-md border-gray-300">
                <Link href="/citizen/my-complaints">{text.viewAllComplaints}</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {loading ? (
                <>
                  <ComplaintCardSkeleton compact />
                  <ComplaintCardSkeleton compact />
                  <ComplaintCardSkeleton compact />
                </>
              ) : error ? (
                <div className="rounded-md border border-red-200 bg-white px-4 py-4 text-sm text-red-700">{error}</div>
              ) : recentComplaints.length ? (
                recentComplaints.map((complaint) => (
                  <ComplaintCard
                    key={complaint.id}
                    complaint={complaint}
                    ward={complaint.ward_name ? { id: complaint.ward_id, name: complaint.ward_name, city: 'Delhi' } : undefined}
                    compact
                    onViewDetails={() => router.push(`/citizen/tracker?id=${encodeURIComponent(complaint.complaint_id)}`)}
                  />
                ))
              ) : (
                <div className="rounded-md border border-dashed border-gray-300 bg-white px-6 py-8 text-center text-sm text-gray-500">
                  <div>{text.noComplaints}</div>
                  <div className="mt-4">
                    <Button asChild className="rounded-md bg-green-600 text-white hover:bg-green-700">
                      <Link href="/citizen/submit">{text.quickActions[0].title}</Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-12 rounded-md border border-gray-300 bg-white shadow-none xl:col-span-4">
            <CardHeader className="border-b border-gray-300 pb-4">
              <CardTitle>{text.quickActionsTitle}</CardTitle>
              <p className="text-sm text-gray-600">{text.commonActions}</p>
            </CardHeader>
            <CardContent className="pt-3">
              {text.quickActions.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block border-b border-gray-200 px-1 py-3 last:border-b-0 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{item.title}</div>
                      <p className="mt-1 text-sm leading-6 text-gray-600">{item.description}</p>
                    </div>
                    <span className="mt-0.5 text-base text-gray-500">-&gt;</span>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-md border border-gray-300 bg-white shadow-none">
          <CardHeader className="pb-3">
            <CardTitle>{text.helpTitle}</CardTitle>
            <p className="text-sm text-gray-600">{text.helpDescription}</p>
          </CardHeader>
          <CardContent className="pt-0">
            {text.helpItems.map((item) => (
              <div key={item.title} className="flex items-start gap-3 px-1 py-2">
                <div className="pt-1 text-gray-500">•</div>
                <div>
                  <div className="text-sm font-semibold text-gray-800">{item.title}</div>
                  <p className="mt-1 text-sm leading-6 text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
