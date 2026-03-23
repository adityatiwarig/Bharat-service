'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, Landmark, LockKeyhole, MapPinned, Shield, UserCog } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { COMPLAINT_DEPARTMENTS, DELHI_WARD_LOGIN_OPTIONS, getWardLoginSlug } from '@/lib/constants';
import { fetchWards } from '@/lib/client/complaints';
import type { Ward } from '@/lib/types';

type InternalRole = 'worker' | 'admin' | 'leader';

type RoleSection = {
  id: InternalRole;
  label: string;
  description: string;
  detailTitle: string;
  detailText: string;
  icon: typeof BriefcaseBusiness;
};

type LoginPreview = {
  name: string;
  email: string;
  password: string;
  note: string;
};

type WardOption = Ward & {
  slug: string;
};

const ADMIN_PREVIEW: LoginPreview = {
  name: 'Control Center Admin',
  email: 'admin@govcrm.demo',
  password: 'changeme',
  note: 'Use this for queue oversight, analytics, and user administration.',
};

const roleSections: RoleSection[] = [
  {
    id: 'worker',
    label: 'Worker',
    description: 'Field worker login with complaint department and ward mapping.',
    detailTitle: 'Worker Access',
    detailText:
      'Select the same complaint department and ward that the citizen complaint was routed to. The login will autofill the exact department plus area worker account.',
    icon: BriefcaseBusiness,
  },
  {
    id: 'admin',
    label: 'Admin',
    description: 'System-wide monitoring, users, analytics, and complaint administration.',
    detailTitle: 'Administrative Access',
    detailText:
      'Admin access stays separate from field staff. You can use the fixed admin account below for full platform oversight.',
    icon: UserCog,
  },
  {
    id: 'leader',
    label: 'Dept Head',
    description: 'Department head login with complaint department based access.',
    detailTitle: 'Department Head Access',
    detailText:
      'When Dept Head is selected, use the same complaint department list that exists in the citizen complaint form. The generated account opens that department-wide review and assignment scope.',
    icon: Shield,
  },
];

function getHomeByRole(role: string) {
  if (role === 'worker') return '/worker';
  if (role === 'admin') return '/admin';
  if (role === 'leader') return '/leader';
  return '/citizen';
}

function formatDepartmentLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildScopedPreview(
  role: Extract<InternalRole, 'worker' | 'leader'>,
  department: string,
  ward?: WardOption | null,
): LoginPreview {
  const departmentLabel = formatDepartmentLabel(department);
  const roleLabel = role === 'leader' ? 'Dept Head' : 'Worker';
  const emailPrefix = role === 'leader' ? 'leader' : 'worker';

  return {
    name: role === 'leader' ? `${departmentLabel} ${roleLabel}` : `${departmentLabel} ${ward?.name || ''} ${roleLabel}`.trim(),
    email: role === 'leader' ? `${emailPrefix}.${department}@govcrm.demo` : `${emailPrefix}.${department}.${ward?.slug}@govcrm.demo`,
    password: 'changeme',
    note:
      role === 'leader'
        ? `${departmentLabel} complaint review, assignment, proof review, and closure flow for the full department.`
        : `${departmentLabel} field execution account for ${ward?.name || 'the selected ward'}.`,
  };
}

export default function WorkerLoginPage() {
  const [loading, setLoading] = useState(false);
  const [loadingWards, setLoadingWards] = useState(true);
  const [selectedRole, setSelectedRole] = useState<InternalRole>('leader');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedWardId, setSelectedWardId] = useState('');
  const [wards, setWards] = useState<WardOption[]>([]);
  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const selectedSection = roleSections.find((section) => section.id === selectedRole) ?? roleSections[0];
  const requiresWorkerPicker = selectedRole === 'worker';
  const requiresLeaderPicker = selectedRole === 'leader';

  useEffect(() => {
    let mounted = true;

    fetchWards()
      .then((result) => {
        if (!mounted) {
          return;
        }

        setWards(result.map((ward) => ({ ...ward, slug: getWardLoginSlug(ward.name) })));
      })
      .catch(() => {
        if (!mounted) {
          return;
        }

        setWards(DELHI_WARD_LOGIN_OPTIONS);
      })
      .finally(() => {
        if (mounted) {
          setLoadingWards(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (selectedRole === 'admin') {
      setForm({ email: ADMIN_PREVIEW.email, password: ADMIN_PREVIEW.password });
    }

    if (selectedRole === 'leader') {
      setSelectedWardId('');
    }
  }, [selectedRole]);

  const selectedWard = useMemo(
    () => wards.find((ward) => String(ward.id) === selectedWardId) || null,
    [selectedWardId, wards],
  );

  const selectedPreview = useMemo(() => {
    if (selectedRole === 'admin') {
      return ADMIN_PREVIEW;
    }

    if (!selectedDepartment) {
      return null;
    }

    if (selectedRole === 'leader') {
      return buildScopedPreview(selectedRole, selectedDepartment, null);
    }

    if (!selectedWard) {
      return null;
    }

    return buildScopedPreview(selectedRole, selectedDepartment, selectedWard);
  }, [selectedDepartment, selectedRole, selectedWard]);

  function applySelectedPreview() {
    if (!selectedPreview) {
      return;
    }

    setForm({
      email: selectedPreview.email,
      password: selectedPreview.password,
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/session/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, portal: 'internal' }),
      });

      const data = (await response.json()) as {
        error?: string;
        user?: { role: string };
      };

      if (!response.ok || !data.user) {
        throw new Error(data.error || 'Unable to login.');
      }

      toast.success('Internal panel login successful.');
      window.location.assign(getHomeByRole(data.user.role));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to login.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="flex h-1.5 w-full">
        <div className="flex-1 bg-[#ff9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      <div className="border-b border-[#cbd5e1] bg-[#0b3d91] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-[#fbbf24]" />
            <span className="font-semibold tracking-[0.08em] uppercase">Official Officer Access</span>
          </div>
          <div className="text-white/90">Authorized Personnel Only</div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-10">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[#334155] transition hover:text-[#0b3d91]">
            <ArrowLeft className="h-4 w-4" />
            Back to citizen home
          </Link>

          <div className="mt-5 inline-flex items-center gap-2 rounded-sm border border-[#cbd5e1] bg-white px-3 py-2 text-sm text-[#334155]">
            <LockKeyhole className="h-4 w-4 text-[#0b3d91]" />
            Officer and department account sign in
          </div>

          <h1 className="mt-5 text-4xl font-bold tracking-tight text-[#111827] lg:text-5xl">
            Internal login with department-based role mapping
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#475569]">
            Workers and department heads now use the same complaint departments that exist in the citizen complaint form.
            Dept head stays department-only, while worker stays department plus ward based so login, routing, DB records,
            and assignment flow remain in sync.
          </p>

          <div className="mt-7 rounded-sm border border-[#d1d5db] bg-white">
            <div className="border-b border-[#e5e7eb] px-5 py-4">
              <div className="text-xs font-semibold tracking-[0.18em] text-[#0b3d91] uppercase">Role Selection</div>
              <p className="mt-2 text-sm leading-6 text-[#475569]">
                Choose the role first. Dept Head account is generated from complaint department only, while worker account is generated from complaint department plus ward.
              </p>
            </div>

            <div className="p-5">
              <div className="space-y-3">
                {roleSections.map((section) => {
                  const Icon = section.icon;
                  const isActive = selectedRole === section.id;

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setSelectedRole(section.id)}
                      className={`w-full rounded-sm border px-4 py-4 text-left transition ${
                        isActive
                          ? 'border-[#0b3d91] bg-[#eff6ff]'
                          : 'border-[#e5e7eb] bg-white hover:border-[#93c5fd] hover:bg-[#f8fbff]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border ${
                            isActive
                              ? 'border-[#bfdbfe] bg-white text-[#0b3d91]'
                              : 'border-[#cbd5e1] bg-[#f8fafc] text-[#475569]'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-semibold text-[#111827]">{section.label}</span>
                            {isActive ? (
                              <span className="rounded-sm border border-[#bfdbfe] bg-white px-2 py-0.5 text-[11px] font-medium text-[#0b3d91]">
                                Selected
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm leading-6 text-[#475569]">{section.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 rounded-sm border border-[#e5e7eb] bg-[#f8fafc]">
                <div className="flex items-center justify-between gap-3 border-b border-[#e5e7eb] px-4 py-3">
                  <div>
                    <div className="text-xs font-semibold tracking-[0.18em] text-[#0b3d91] uppercase">
                      {selectedSection.detailTitle}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[#64748b]">Official test credentials generated from current routing scope</p>
                  </div>
                  <div className="rounded-sm border border-[#cbd5e1] bg-white px-3 py-1 text-xs font-medium text-[#334155]">
                    Real scope based
                  </div>
                </div>

                <div className="space-y-4 px-4 py-4">
                  <p className="text-sm leading-6 text-[#475569]">{selectedSection.detailText}</p>

                  {requiresWorkerPicker || requiresLeaderPicker ? (
                    <div className="rounded-sm border border-[#dbe5ef] bg-white p-4">
                      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#0b3d91]">
                        <MapPinned className="h-4 w-4" />
                        {selectedRole === 'leader' ? 'Dept Head Login Picker' : 'Worker Login Picker'}
                      </div>

                      <div className={`grid gap-4 ${selectedRole === 'worker' ? 'md:grid-cols-2' : ''}`}>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-[#111827]">
                            Complaint Department
                          </Label>
                          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                            <SelectTrigger className="h-11 rounded-sm border-[#cbd5e1]">
                              <SelectValue placeholder="Select same department as citizen complaint form" />
                            </SelectTrigger>
                            <SelectContent>
                              {COMPLAINT_DEPARTMENTS.map((department) => (
                                <SelectItem key={department.value} value={department.value}>
                                  {department.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {selectedRole === 'worker' ? (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-[#111827]">
                              Area / Ward
                            </Label>
                            <Select value={selectedWardId} onValueChange={setSelectedWardId} disabled={loadingWards}>
                              <SelectTrigger className="h-11 rounded-sm border-[#cbd5e1]">
                                <SelectValue placeholder={loadingWards ? 'Loading wards...' : 'Select ward'} />
                              </SelectTrigger>
                              <SelectContent>
                                {wards.map((ward) => (
                                  <SelectItem key={ward.id} value={String(ward.id)}>
                                    {ward.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-4 rounded-sm border border-[#e5e7eb] bg-[#f8fafc] px-4 py-4 text-sm leading-6 text-[#475569]">
                        {selectedRole === 'leader'
                          ? 'Dept head login ab sirf complaint department se decide hoga. Ward ka koi relation nahi rakha gaya.'
                          : 'Worker login department aur ward dono ke hisaab se decide hoga, taaki assignment aur field access exact match kare.'}
                      </div>

                      {selectedPreview ? (
                        <div className="mt-4 rounded-sm border border-[#cfe0ef] bg-[#f8fbff] px-4 py-4">
                          <div className="text-sm font-semibold text-[#111827]">{selectedPreview.name}</div>
                          <div className="mt-2 text-sm text-[#334155]">{selectedPreview.email}</div>
                          <div className="mt-1 text-xs text-[#64748b]">Password: {selectedPreview.password}</div>
                          <p className="mt-3 text-sm leading-6 text-[#475569]">{selectedPreview.note}</p>
                          <div className="mt-4">
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-sm border-[#cbd5e1] bg-white text-[#0b3d91] hover:bg-[#eff6ff] hover:text-[#0b3d91]"
                              onClick={applySelectedPreview}
                            >
                              Use This {selectedRole === 'leader' ? 'Dept Head' : 'Worker'} Account
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-sm border border-dashed border-[#d7e0e8] bg-white px-4 py-4 text-sm text-[#64748b]">
                          {selectedRole === 'leader'
                            ? 'First choose the complaint department to generate the exact dept head login account.'
                            : 'First choose complaint department and ward to generate the exact worker login account.'}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-sm border border-[#cfe0ef] bg-white px-4 py-4">
                      <div className="text-sm font-semibold text-[#111827]">{ADMIN_PREVIEW.name}</div>
                      <div className="mt-2 text-sm text-[#334155]">{ADMIN_PREVIEW.email}</div>
                      <div className="mt-1 text-xs text-[#64748b]">Password: {ADMIN_PREVIEW.password}</div>
                      <p className="mt-3 text-sm leading-6 text-[#475569]">{ADMIN_PREVIEW.note}</p>
                      <div className="mt-4">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-sm border-[#cbd5e1] bg-white text-[#0b3d91] hover:bg-[#eff6ff] hover:text-[#0b3d91]"
                          onClick={applySelectedPreview}
                        >
                          Use Admin Account
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="rounded-sm border border-[#e5e7eb] bg-white px-4 py-4 text-sm leading-6 text-[#475569]">
                    Pattern used now:
                    {' '}
                    <span className="font-medium text-[#111827]">`leader.department@govcrm.demo`</span>
                    {' '}
                    and
                    {' '}
                    <span className="font-medium text-[#111827]">`worker.department.ward@govcrm.demo`</span>
                    .
                    Dept Head is department-only, while worker remains department plus ward based.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="self-start lg:sticky lg:top-24">
          <Card className="mx-auto w-full max-w-xl rounded-sm border-[#d1d5db] bg-white shadow-none">
            <CardHeader className="border-b border-[#e5e7eb]">
              <CardDescription className="text-sm text-[#64748b]">Authorized departmental credentials only</CardDescription>
              <CardTitle className="text-3xl font-bold text-[#111827]">Officer Sign In</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="rounded-sm border border-[#dbeafe] bg-[#f8fbff] px-4 py-4 text-sm leading-6 text-[#475569]">
                  Selected role: <span className="font-semibold text-[#0b3d91]">{selectedSection.label}</span>.
                  {' '}
                  {selectedRole === 'leader'
                    ? 'Use the dept head picker with the same complaint department, then continue to login.'
                    : selectedRole === 'worker'
                      ? 'Use the worker picker with department and ward, then continue to login.'
                      : 'Use the admin account below.'}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-[#111827]">
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    className="h-11 rounded-sm border-[#cbd5e1] bg-white text-[#111827] placeholder:text-[#94a3b8] focus-visible:border-[#0b3d91] focus-visible:ring-[#0b3d91]"
                    placeholder="Enter panel email"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-[#111827]">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    className="h-11 rounded-sm border-[#cbd5e1] bg-white text-[#111827] placeholder:text-[#94a3b8] focus-visible:border-[#0b3d91] focus-visible:ring-[#0b3d91]"
                    placeholder="Enter panel password"
                    required
                  />
                </div>

                <div className="rounded-sm border border-[#e5e7eb] bg-[#f8fafc] px-4 py-4 text-sm leading-6 text-[#475569]">
                  Citizens should continue using the public portal. This page is only for workers, department heads, and admin users.
                </div>

                <Button type="submit" className="h-12 w-full rounded-sm bg-[#0b3d91] text-white hover:bg-[#082f6b]" disabled={loading}>
                  {loading ? <Spinner label="Signing in..." /> : 'Proceed to Secure Login'}
                </Button>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-sm border border-[#e5e7eb] bg-[#f8fafc] px-4 py-4 text-sm text-[#475569]">
                    <div className="font-semibold text-[#111827]">Department-Synced Login</div>
                    <p className="mt-1 leading-6">The picker now follows the same complaint departments citizens use during complaint submission.</p>
                  </div>
                  <div className="rounded-sm border border-[#e5e7eb] bg-[#f8fafc] px-4 py-4 text-sm text-[#475569]">
                    <div className="font-semibold text-[#111827]">Area-Based Scope</div>
                    <p className="mt-1 leading-6">Only worker login is ward-wise. Dept head remains department-only for review and assignment.</p>
                  </div>
                </div>

                <div className="text-center text-sm text-[#475569]">
                  Looking for resident access?{' '}
                  <Link href="/auth?mode=signup" className="font-semibold text-[#0b3d91] underline-offset-4 hover:underline">
                    Go to Citizen Portal
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="mx-auto mt-4 grid w-full max-w-xl gap-3 sm:grid-cols-2">
            {[
              'Dept Head login is department-only, while worker login stays department plus ward based.',
              'Manual email/password entry is still available if you need to use a custom seeded account.',
            ].map((point) => (
              <div key={point} className="rounded-sm border border-[#e5e7eb] bg-white px-4 py-4 text-sm text-[#475569]">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#166534]" />
                  <span>{point}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
