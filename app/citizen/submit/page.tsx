'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Crosshair, FileText, LocateFixed, MapPin, Sparkles, Send } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardLayout } from '@/components/dashboard-layout';
import { EmptyState } from '@/components/empty-state';
import { LoadingSummary, StatListSkeleton } from '@/components/loading-skeletons';
import { useSession } from '@/components/session-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { detectDepartment } from '@/lib/ai/complaint-intelligence';
import { fetchWards } from '@/lib/client/complaints';
import { COMPLAINT_DEPARTMENTS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { ComplaintDepartment, Ward } from '@/lib/types';

export default function SubmitComplaintPage() {
  const router = useRouter();
  const session = useSession();
  const [wards, setWards] = useState<Ward[]>([]);
  const [loadingWards, setLoadingWards] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    title: '',
    text: '',
    department: '',
    ward_id: '',
    location_address: '',
    latitude: '',
    longitude: '',
  });

  useEffect(() => {
    fetchWards()
      .then(setWards)
      .finally(() => setLoadingWards(false));
  }, []);

  const aiSuggestedDepartment = useMemo(
    () => detectDepartment(`${form.title} ${form.text}`) as ComplaintDepartment,
    [form.text, form.title],
  );

  const effectiveDepartment = (form.department || aiSuggestedDepartment || '') as ComplaintDepartment | '';

  const progress = useMemo(() => {
    let score = 0;
    if (form.title.trim()) score += 25;
    if (form.text.trim()) score += 30;
    if (effectiveDepartment) score += 15;
    if (form.ward_id) score += 20;
    if (form.location_address.trim()) score += 10;
    if (form.latitude && form.longitude) score += 10;
    return score;
  }, [effectiveDepartment, form]);

  const selectedWard = useMemo(
    () => wards.find((ward) => String(ward.id) === form.ward_id),
    [form.ward_id, wards],
  );

  async function handleCaptureLocation() {
    if (!navigator.geolocation) {
      toast.error('Live location is not supported on this device.');
      return;
    }

    setCapturingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        toast.success('Current location captured.');
        setCapturingLocation(false);
      },
      (error) => {
        toast.error(error.message || 'Unable to capture live location.');
        setCapturingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const payload = new FormData();
      payload.set('title', form.title);
      payload.set('text', form.text);
      payload.set('department', effectiveDepartment);
      payload.set('ward_id', form.ward_id);
      payload.set('location_address', form.location_address);

      if (form.latitude) payload.set('latitude', form.latitude);
      if (form.longitude) payload.set('longitude', form.longitude);

      files.forEach((file) => payload.append('attachments', file));

      const response = await fetch('/api/complaints', {
        method: 'POST',
        body: payload,
      });

      const data = (await response.json()) as {
        complaint?: { id: string; complaint_id: string };
        error?: string;
      };

      if (!response.ok || !data.complaint) {
        throw new Error(data.error || 'Unable to submit complaint.');
      }

      setSubmitted(true);
      toast.success('Complaint submitted successfully.');
      setTimeout(() => {
        router.push(`/citizen/tracker?id=${data.complaint?.complaint_id || data.complaint?.id}`);
      }, 700);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit complaint.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout title="Raise Complaint">
      <div className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        <Card className="gov-citizen-panel rounded-[1.15rem] border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
          <CardHeader className="border-b border-slate-200/80 pb-6">
            <CardTitle className="flex items-center gap-2 text-2xl text-slate-950">
              <FileText className="h-5 w-5 text-primary" />
              Citizen Complaint Submission
            </CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-600">
              Your name and email come from your citizen account. Share the issue in plain language and the system will suggest the best department automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-4 transition-all duration-200">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Submission readiness</div>
                  <div className="text-xs text-slate-500">Ward selection is required. Department suggestion is generated from your complaint text.</div>
                </div>
                <div className="text-sm font-semibold text-slate-700">{progress}%</div>
              </div>
              <Progress value={progress} className="mt-3 h-2.5" />
            </div>

            {submitting ? (
              <LoadingSummary
                label="Processing..."
                description="Submitting complaint, generating AI routing, and preparing your tracker."
              />
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-[1rem] border border-slate-200 bg-white p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-950">Citizen account details</div>
                    <div className="text-xs text-slate-500">These details are pulled from your verified portal profile.</div>
                  </div>
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-emerald-700 uppercase">
                    Verified profile
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FieldGroup>
                    <Field>
                      <FieldLabel>Citizen name</FieldLabel>
                      <Input value={session?.name || ''} disabled />
                    </Field>
                  </FieldGroup>
                  <FieldGroup>
                    <Field>
                      <FieldLabel>Email</FieldLabel>
                      <Input value={session?.email || ''} disabled />
                    </Field>
                  </FieldGroup>
                </div>
              </div>

              <div className="rounded-[1rem] border border-slate-200 bg-white p-5">
                <div className="mb-4">
                  <div className="text-sm font-semibold text-slate-950">Complaint details</div>
                  <div className="text-xs text-slate-500">Write the issue in a way that helps the department act without follow-up calls.</div>
                </div>
                <div className="space-y-6">
                  <FieldGroup>
                    <Field>
                      <FieldLabel>Complaint title</FieldLabel>
                      <Input
                        value={form.title}
                        onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                        placeholder="Example: Overflowing garbage near Rohini market"
                        required
                      />
                    </Field>
                  </FieldGroup>

                  <FieldGroup>
                    <Field>
                      <FieldLabel>Complaint text</FieldLabel>
                      <Textarea
                        value={form.text}
                        onChange={(event) => setForm((current) => ({ ...current, text: event.target.value }))}
                        placeholder="Describe what happened, the public impact, whether it is recurring, and why the issue needs attention."
                        rows={6}
                        required
                      />
                    </Field>
                  </FieldGroup>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldGroup>
                      <Field>
                        <FieldLabel>Department</FieldLabel>
                        <Select
                          value={effectiveDepartment}
                          onValueChange={(value) => setForm((current) => ({ ...current, department: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="AI will suggest a department" />
                          </SelectTrigger>
                          <SelectContent>
                            {COMPLAINT_DEPARTMENTS.map((department) => (
                              <SelectItem key={department.value} value={department.value}>
                                {department.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                          <Sparkles className="h-3.5 w-3.5 text-sky-700" />
                          AI suggestion: {COMPLAINT_DEPARTMENTS.find((item) => item.value === aiSuggestedDepartment)?.label || 'Roads'}.
                          You can still change it manually.
                        </div>
                      </Field>
                    </FieldGroup>

                    <FieldGroup>
                      <Field>
                        <FieldLabel>Area / ward</FieldLabel>
                        <Select
                          value={form.ward_id}
                          onValueChange={(value) => setForm((current) => ({ ...current, ward_id: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={loadingWards ? 'Loading wards...' : 'Select your area from portal list'} />
                          </SelectTrigger>
                          <SelectContent>
                            {wards.map((ward) => (
                              <SelectItem key={ward.id} value={String(ward.id)}>
                                {ward.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </FieldGroup>

                    <FieldGroup className="md:col-span-2">
                      <Field>
                        <FieldLabel>Nearest landmark</FieldLabel>
                        <Input
                          value={form.location_address}
                          onChange={(event) => setForm((current) => ({ ...current, location_address: event.target.value }))}
                          placeholder="Street, market, gate number, school, or nearby point"
                        />
                      </Field>
                    </FieldGroup>
                  </div>
                </div>
              </div>

              <div className="rounded-[1rem] border border-slate-200 bg-[linear-gradient(180deg,#eff6ff_0%,#ffffff_100%)] p-4 transition-all duration-200">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                      <LocateFixed className="h-4 w-4 text-sky-700" />
                      Optional real-time location
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Use this only if you want to help the field team identify the complaint spot faster.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-lg"
                    onClick={handleCaptureLocation}
                    disabled={capturingLocation}
                  >
                    {capturingLocation ? <Spinner label="Processing..." size="sm" /> : <><Crosshair className="h-4 w-4" /> Use Current Location</>}
                  </Button>
                </div>

                {form.latitude && form.longitude ? (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    Coordinates captured: {form.latitude}, {form.longitude}
                  </div>
                ) : null}
              </div>

              <div className="rounded-[1rem] border border-slate-200 bg-white p-5">
                <div className="mb-4">
                  <div className="text-sm font-semibold text-slate-950">Supporting evidence</div>
                  <div className="text-xs text-slate-500">Attach up to four files if photos or documents will help the field team verify the issue faster.</div>
                </div>
                <FieldGroup>
                  <Field>
                    <FieldLabel>Attachments</FieldLabel>
                    <Input
                      type="file"
                      multiple
                      onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 4))}
                    />
                    {files.length ? (
                      <div className="mt-2 text-xs text-slate-500">{files.length} attachment{files.length > 1 ? 's' : ''} selected.</div>
                    ) : null}
                  </Field>
                </FieldGroup>
              </div>

              {submitted ? (
                <div className="rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    Complaint submitted successfully
                  </div>
                  <div className="mt-1">Redirecting to your live tracker.</div>
                </div>
              ) : null}

              <Button type="submit" className="w-full rounded-lg" disabled={submitting || loadingWards}>
                {submitting ? <Spinner label="Submitting complaint..." /> : <><Send className="h-4 w-4" /> Submit Complaint</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="gov-citizen-panel rounded-[1.1rem] border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]">
            <CardHeader className="border-b border-slate-200/80 pb-6">
              <CardTitle className="flex items-center gap-2 text-slate-950">
                <MapPin className="h-5 w-5 text-primary" />
                Area Routing
              </CardTitle>
              <CardDescription>
                The ward list comes from the portal database and is used to route complaints to the correct municipal team.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              {selectedWard ? (
                <div className="rounded-[1rem] border border-sky-200 bg-sky-50 px-4 py-4">
                  <div className="text-xs font-semibold tracking-[0.14em] text-sky-700 uppercase">Selected ward</div>
                  <div className="mt-2 text-sm font-semibold text-sky-950">{selectedWard.name}, {selectedWard.city}</div>
                </div>
              ) : null}
              {loadingWards ? <StatListSkeleton count={5} /> : wards.length ? (
                <div className="gov-scrollbar max-h-[24rem] space-y-3 overflow-y-auto pr-1">
                  {wards.map((ward) => (
                    <div
                      key={ward.id}
                      className={cn(`rounded-[0.95rem] border px-4 py-3 shadow-sm transition-all duration-200 ${selectedWard?.id === ward.id ? 'border-sky-300 bg-sky-50 text-sky-900' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`)}
                    >
                      {ward.name}, {ward.city}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No wards available yet"
                  description="Ward mapping has not been seeded in the portal database yet."
                />
              )}
            </CardContent>
          </Card>

          <Card className="gov-citizen-panel rounded-[1.1rem] border-slate-200">
            <CardHeader className="border-b border-slate-200/80 pb-6">
              <CardTitle className="text-slate-950">What happens next</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
                Your complaint is stored immediately with status <strong>submitted</strong> and progress <strong>pending</strong>.
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
                The AI layer suggests the department, scores urgency, flags spam-like submissions, and detects ward hotspots before department review.
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
                If you capture live location, it supports field identification. If not, the complaint still works normally.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

