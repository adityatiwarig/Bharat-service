'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Crosshair, Landmark, LocateFixed, Send } from 'lucide-react';
import { toast } from 'sonner';

import { CitizenComplaintPhotoPicker } from '@/components/citizen-complaint-photo-picker';
import { DashboardLayout } from '@/components/dashboard-layout';
import { LoadingSummary } from '@/components/loading-skeletons';
import { useSession } from '@/components/session-provider';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { fetchGrievanceMapping } from '@/lib/client/complaints';
import { emitComplaintFeedChanged } from '@/lib/client/live-updates';
import type { GrievanceMappingResponse } from '@/lib/types';

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const controlClassName =
  'w-full rounded-md border-gray-300 bg-white focus-visible:ring-2 focus-visible:ring-[#1d4f91] focus-visible:ring-offset-0';

const selectClassName = 'w-full rounded-md border-gray-300 bg-white focus:ring-2 focus:ring-[#1d4f91] focus:ring-offset-0';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 text-base font-semibold text-[#1d3557]">{children}</div>;
}

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <FieldLabel className="text-sm font-medium text-slate-700">
      {children} <span className="text-red-600">*</span>
    </FieldLabel>
  );
}

function createInitialForm(session?: { name?: string | null; phone?: string | null; email?: string | null }) {
  return {
    applicant_name: session?.name || '',
    applicant_mobile: session?.phone || '',
    applicant_email: session?.email || '',
    applicant_address: '',
    applicant_gender: '',
    zone_id: '',
    ward_id: '',
    department_id: '',
    category_id: '',
    street_address: '',
    title: '',
    text: '',
    previous_complaint_id: '',
    latitude: '',
    longitude: '',
  };
}

export default function SubmitComplaintPage() {
  const router = useRouter();
  const session = useSession();
  const [mapping, setMapping] = useState<GrievanceMappingResponse | null>(null);
  const [loadingMapping, setLoadingMapping] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState(() => createInitialForm(session || undefined));

  useEffect(() => {
    setForm((current) => ({
      ...current,
      applicant_name: current.applicant_name || session?.name || '',
      applicant_mobile: current.applicant_mobile || session?.phone || '',
      applicant_email: current.applicant_email || session?.email || '',
    }));
  }, [session?.email, session?.name, session?.phone]);

  useEffect(() => {
    fetchGrievanceMapping()
      .then(setMapping)
      .catch((error) => {
        console.error('Failed to load grievance mapping', error);
        toast.error('Unable to load complaint mapping data.');
      })
      .finally(() => setLoadingMapping(false));
  }, []);

  const filteredWards = useMemo(() => {
    if (!mapping || !form.zone_id) {
      return [];
    }

    return mapping.wards.filter((ward) => String(ward.zone_id) === form.zone_id);
  }, [form.zone_id, mapping]);

  const filteredCategories = useMemo(() => {
    if (!mapping || !form.department_id) {
      return [];
    }

    return mapping.categories.filter((category) => String(category.department_id) === form.department_id);
  }, [form.department_id, mapping]);

  const selectedZone = useMemo(
    () => mapping?.zones.find((zone) => String(zone.id) === form.zone_id) || null,
    [form.zone_id, mapping],
  );

  const selectedWard = useMemo(
    () => mapping?.wards.find((ward) => String(ward.id) === form.ward_id) || null,
    [form.ward_id, mapping],
  );

  const selectedDepartment = useMemo(
    () => mapping?.departments.find((department) => String(department.id) === form.department_id) || null,
    [form.department_id, mapping],
  );

  const selectedCategory = useMemo(
    () => mapping?.categories.find((category) => String(category.id) === form.category_id) || null,
    [form.category_id, mapping],
  );

  function handleReset() {
    setForm(createInitialForm(session || undefined));
    setFiles([]);
  }

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

    if (!files.length) {
      toast.error('Complaint photo is required before submission.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = new FormData();
      payload.set('applicant_name', form.applicant_name);
      payload.set('applicant_mobile', form.applicant_mobile);
      payload.set('applicant_email', form.applicant_email);
      payload.set('applicant_address', form.applicant_address);
      payload.set('applicant_gender', form.applicant_gender);
      payload.set('zone_id', form.zone_id);
      payload.set('ward_id', form.ward_id);
      payload.set('department_id', form.department_id);
      payload.set('category_id', form.category_id);
      payload.set('street_address', form.street_address);
      payload.set('title', form.title);
      payload.set('text', form.text);
      payload.set('previous_complaint_id', form.previous_complaint_id);
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
      emitComplaintFeedChanged();
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
    <DashboardLayout title="Raise Complaint" compactCitizenHeader>
      <div className="space-y-6">
        <div className="rounded-[1.25rem] border border-slate-200 bg-white">
          <div className="flex flex-col gap-4 px-6 py-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-[#1d3557]">
                <Landmark className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-semibold text-[#1d3557]">Government of NCT of Delhi</div>
                <div className="text-sm text-slate-600">Municipal Grievance Redressal System</div>
              </div>
            </div>
            <div className="text-sm font-medium text-slate-600">Helpline: 1800-XXX-XXXX</div>
          </div>
        </div>

        <div>
          <div className="w-full max-w-[1220px] py-4">
            <div className="mb-4">
              <div className="mb-2 text-xs text-gray-500">Home &gt; Citizen Dashboard &gt; Submit Complaint</div>
              <div className="mb-2 text-lg font-semibold text-gray-800">Online Grievance Submission Form</div>
            </div>

            <div className="rounded-md border border-slate-300 bg-white">
              <div className="p-6">
                {submitting ? (
                  <LoadingSummary
                    label="Processing..."
                    description="Submitting your grievance and preparing the complaint tracker."
                  />
                ) : null}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="rounded-md border border-slate-200 bg-white p-4">
                    <SectionTitle>1. Applicant Details</SectionTitle>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldGroup>
                        <Field>
                          <RequiredLabel>Name</RequiredLabel>
                          <Input
                            value={form.applicant_name}
                            onChange={(event) => setForm((current) => ({ ...current, applicant_name: event.target.value }))}
                            className={controlClassName}
                            required
                          />
                        </Field>
                      </FieldGroup>
                      <FieldGroup>
                        <Field>
                          <RequiredLabel>Mobile Number</RequiredLabel>
                          <Input
                            value={form.applicant_mobile}
                            onChange={(event) => setForm((current) => ({ ...current, applicant_mobile: event.target.value }))}
                            placeholder="Enter 10-digit mobile number"
                            className={controlClassName}
                            required
                          />
                        </Field>
                      </FieldGroup>
                      <FieldGroup>
                        <Field>
                          <FieldLabel className="text-sm font-medium text-slate-700">Email</FieldLabel>
                          <Input
                            type="email"
                            value={form.applicant_email}
                            onChange={(event) => setForm((current) => ({ ...current, applicant_email: event.target.value }))}
                            className={controlClassName}
                          />
                        </Field>
                      </FieldGroup>
                      <FieldGroup>
                        <Field>
                          <FieldLabel className="text-sm font-medium text-slate-700">Gender</FieldLabel>
                          <Select
                            value={form.applicant_gender}
                            onValueChange={(value) => setForm((current) => ({ ...current, applicant_gender: value }))}
                          >
                            <SelectTrigger className={selectClassName}>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              {GENDER_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      </FieldGroup>
                      <FieldGroup className="md:col-span-2">
                        <Field>
                          <RequiredLabel>Residential Address</RequiredLabel>
                          <Textarea
                            value={form.applicant_address}
                            onChange={(event) => setForm((current) => ({ ...current, applicant_address: event.target.value }))}
                            rows={3}
                            className={controlClassName}
                            required
                          />
                        </Field>
                      </FieldGroup>
                    </div>
                  </div>

                  <div className="rounded-md border border-slate-200 bg-white p-4">
                    <SectionTitle>2. Complaint Classification</SectionTitle>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldGroup>
                        <Field>
                          <RequiredLabel>Department</RequiredLabel>
                          <Select
                            value={form.department_id}
                            onValueChange={(value) =>
                              setForm((current) => ({
                                ...current,
                                department_id: value,
                                category_id: '',
                              }))
                            }
                          >
                            <SelectTrigger className={selectClassName}>
                              <SelectValue placeholder={loadingMapping ? 'Loading departments...' : 'Select department'} />
                            </SelectTrigger>
                            <SelectContent>
                              {mapping?.departments.map((department) => (
                                <SelectItem key={department.id} value={String(department.id)}>
                                  {department.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      </FieldGroup>
                      <FieldGroup>
                        <Field>
                          <RequiredLabel>Category</RequiredLabel>
                          <Select
                            value={form.category_id}
                            onValueChange={(value) => setForm((current) => ({ ...current, category_id: value }))}
                            disabled={!form.department_id}
                          >
                            <SelectTrigger className={selectClassName}>
                              <SelectValue
                                placeholder={
                                  !form.department_id
                                    ? 'Select department first'
                                    : loadingMapping
                                      ? 'Loading categories...'
                                      : 'Select category'
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredCategories.map((category) => (
                                <SelectItem key={category.id} value={String(category.id)}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      </FieldGroup>
                      <FieldGroup className="md:col-span-2">
                        <Field>
                          <RequiredLabel>Subject</RequiredLabel>
                          <Input
                            value={form.title}
                            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                            className={controlClassName}
                            required
                          />
                        </Field>
                      </FieldGroup>
                      <FieldGroup className="md:col-span-2">
                        <Field>
                          <RequiredLabel>Complaint Description</RequiredLabel>
                          <Textarea
                            value={form.text}
                            onChange={(event) => setForm((current) => ({ ...current, text: event.target.value }))}
                            rows={6}
                            className={controlClassName}
                            required
                          />
                        </Field>
                      </FieldGroup>
                    </div>
                  </div>

                  <div className="rounded-md border border-slate-200 bg-white p-4">
                    <SectionTitle>3. Complaint Location</SectionTitle>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldGroup>
                        <Field>
                          <RequiredLabel>Zone</RequiredLabel>
                          <Select
                            value={form.zone_id}
                            onValueChange={(value) =>
                              setForm((current) => ({
                                ...current,
                                zone_id: value,
                                ward_id: '',
                              }))
                            }
                          >
                            <SelectTrigger className={selectClassName}>
                              <SelectValue placeholder={loadingMapping ? 'Loading zones...' : 'Select zone'} />
                            </SelectTrigger>
                            <SelectContent>
                              {mapping?.zones.map((zone) => (
                                <SelectItem key={zone.id} value={String(zone.id)}>
                                  {zone.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      </FieldGroup>
                      <FieldGroup>
                        <Field>
                          <RequiredLabel>Ward</RequiredLabel>
                          <Select
                            value={form.ward_id}
                            onValueChange={(value) => setForm((current) => ({ ...current, ward_id: value }))}
                            disabled={!form.zone_id}
                          >
                            <SelectTrigger className={selectClassName}>
                              <SelectValue
                                placeholder={
                                  !form.zone_id
                                    ? 'Select zone first'
                                    : loadingMapping
                                      ? 'Loading wards...'
                                      : 'Select ward'
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredWards.map((ward) => (
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
                          <FieldLabel className="text-sm font-medium text-slate-700">
                            Street / Landmark / Additional Location Detail
                          </FieldLabel>
                          <Textarea
                            value={form.street_address}
                            onChange={(event) => setForm((current) => ({ ...current, street_address: event.target.value }))}
                            rows={3}
                            className={controlClassName}
                            placeholder="Optional"
                          />
                        </Field>
                      </FieldGroup>
                    </div>
                    <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-medium text-[#1d3557]">
                            <LocateFixed className="h-4 w-4" />
                            Auto Fetch Current Location
                          </div>
                          <div className="mt-1 text-sm text-slate-600">
                            Optional. This helps the field team reach the complaint location faster.
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-md border-slate-300 bg-white text-slate-700"
                          onClick={handleCaptureLocation}
                          disabled={capturingLocation}
                        >
                          {capturingLocation ? (
                            <Spinner label="Fetching..." size="sm" />
                          ) : (
                            <>
                              <Crosshair className="h-4 w-4" />
                              Fetch Location
                            </>
                          )}
                        </Button>
                      </div>
                      {form.latitude && form.longitude ? (
                        <div className="mt-3 rounded-md border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-700">
                          <div className="font-medium text-emerald-700">Location captured successfully</div>
                          <div className="mt-1">
                            Latitude: {form.latitude}, Longitude: {form.longitude}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    {selectedZone || selectedWard || selectedDepartment || selectedCategory ? (
                      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        <div>
                          Selected location:
                          {' '}
                          <span className="font-medium text-slate-800">
                            {[selectedWard?.name, selectedZone?.name].filter(Boolean).join(', ') || 'Not selected'}
                          </span>
                        </div>
                        <div className="mt-1">
                          Complaint classification:
                          {' '}
                          <span className="font-medium text-slate-800">
                            {[selectedDepartment?.name, selectedCategory?.name].filter(Boolean).join(' / ') || 'Not selected'}
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-md border border-slate-200 bg-white p-4">
                    <SectionTitle>4. Supporting Evidence</SectionTitle>
                    <FieldGroup>
                      <Field>
                        <FieldLabel className="text-sm font-medium text-slate-700">Complaint Photographs</FieldLabel>
                        <CitizenComplaintPhotoPicker value={files} onChange={setFiles} disabled={submitting} />
                      </Field>
                    </FieldGroup>
                  </div>

                  <div className="rounded-md border border-slate-200 bg-white p-4">
                    <SectionTitle>5. Additional Information</SectionTitle>
                    <FieldGroup>
                      <Field>
                        <FieldLabel className="text-sm font-medium text-slate-700">Previous Complaint ID</FieldLabel>
                        <Input
                          value={form.previous_complaint_id}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, previous_complaint_id: event.target.value }))
                          }
                          className={controlClassName}
                        />
                      </Field>
                    </FieldGroup>
                  </div>

                  <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    After submission, your complaint will be routed to the concerned department. You can track its status in
                    {' '}
                    <span className="font-medium text-slate-800">My Complaints</span>.
                  </div>

                  {submitted ? (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                      <div className="flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="h-4 w-4" />
                        Complaint submitted successfully
                      </div>
                      <div className="mt-1">Redirecting to your live tracker.</div>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <Button
                      type="submit"
                      className="h-11 w-full flex-1 rounded-md bg-green-600 text-white hover:bg-green-700"
                      disabled={submitting || loadingMapping}
                    >
                      {submitting ? (
                        <Spinner label="Submitting complaint..." />
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Submit Complaint
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-md border-slate-300 bg-gray-200 px-5 text-slate-700 hover:bg-gray-300"
                      onClick={handleReset}
                      disabled={submitting}
                    >
                      Reset
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

