'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Crosshair, FileText, LocateFixed, MapPin, Send } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardLayout } from '@/components/dashboard-layout';
import { StatListSkeleton } from '@/components/loading-skeletons';
import { useSession } from '@/components/session-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { fetchWards } from '@/lib/client/complaints';
import type { Ward } from '@/lib/types';

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

  const progress = useMemo(() => {
    let score = 0;
    if (form.title.trim()) score += 25;
    if (form.text.trim()) score += 30;
    if (form.ward_id) score += 25;
    if (form.location_address.trim()) score += 10;
    if (form.latitude && form.longitude) score += 10;
    return score;
  }, [form]);

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
        complaint?: { id: string };
        error?: string;
      };

      if (!response.ok || !data.complaint) {
        throw new Error(data.error || 'Unable to submit complaint.');
      }

      setSubmitted(true);
      toast.success('Complaint submitted successfully.');
      setTimeout(() => {
        router.push(`/citizen/tracker?id=${data.complaint?.id}`);
        router.refresh();
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
        <Card className="rounded-[1.9rem] border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl text-slate-950">
              <FileText className="h-5 w-5 text-primary" />
              Citizen Complaint Submission
            </CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-600">
              Your name and email come from your citizen account. Select the area from the portal list and share live location only if you want to.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Submission readiness</div>
                  <div className="text-xs text-slate-500">Area selection is required. Live location is optional.</div>
                </div>
                <div className="text-sm font-semibold text-slate-700">{progress}%</div>
              </div>
              <Progress value={progress} className="mt-3 h-2.5" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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

                <FieldGroup>
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

              <div className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#eff6ff_0%,#ffffff_100%)] p-4">
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
                    className="rounded-full"
                    onClick={handleCaptureLocation}
                    disabled={capturingLocation}
                  >
                    {capturingLocation ? <Spinner label="Capturing..." /> : <><Crosshair className="h-4 w-4" /> Use Current Location</>}
                  </Button>
                </div>

                {form.latitude && form.longitude ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    Coordinates captured: {form.latitude}, {form.longitude}
                  </div>
                ) : null}
              </div>

              <FieldGroup>
                <Field>
                  <FieldLabel>Attachments</FieldLabel>
                  <Input
                    type="file"
                    multiple
                    onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 4))}
                  />
                </Field>
              </FieldGroup>

              {submitted ? (
                <div className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    Complaint submitted successfully
                  </div>
                  <div className="mt-1">Redirecting to your live tracker.</div>
                </div>
              ) : null}

              <Button type="submit" className="w-full rounded-full" disabled={submitting || loadingWards}>
                {submitting ? <Spinner label="Processing..." /> : <><Send className="h-4 w-4" /> Submit Complaint</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[1.8rem] border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-950">
                <MapPin className="h-5 w-5 text-primary" />
                Area Routing
              </CardTitle>
              <CardDescription>
                The ward list comes from the portal database and is used to route complaints to the correct municipal team.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              {loadingWards ? <StatListSkeleton count={5} /> : wards.length ? wards.map((ward) => (
                <div
                  key={ward.id}
                  className={`rounded-2xl border px-4 py-3 shadow-sm ${selectedWard?.id === ward.id ? 'border-sky-300 bg-sky-50 text-sky-900' : 'border-slate-200 bg-white'}`}
                >
                  {ward.name}, {ward.city}
                </div>
              )) : <div className="text-sm text-slate-500">No wards available.</div>}
            </CardContent>
          </Card>

          <Card className="rounded-[1.8rem] border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-950">What happens next</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                Your complaint is stored immediately with status <strong>received</strong>.
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                The system uses your selected area to route the issue and update category, priority, and risk score.
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                If you capture live location, it supports field identification. If not, the complaint still works normally.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
