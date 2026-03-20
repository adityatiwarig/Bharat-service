'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  FileText,
  Loader2,
  LocateFixed,
  Landmark,
  MapPin,
  Paperclip,
  Phone,
  ShieldCheck,
  Upload,
} from 'lucide-react';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { wards } from '@/lib/mock-data';
import { demoCitizen } from '@/lib/demo-session';
import type { ComplaintCategory, ComplaintPriority } from '@/lib/types';

const categories: Array<{ value: ComplaintCategory; label: string }> = [
  { value: 'pothole', label: 'Road Damage / Pothole' },
  { value: 'streetlight', label: 'Streetlight Issue' },
  { value: 'water', label: 'Water Supply / Leakage' },
  { value: 'waste', label: 'Waste Collection / Garbage' },
  { value: 'sanitation', label: 'Sanitation / Drainage' },
  { value: 'other', label: 'Other Civic Issue' },
];

const priorities: Array<{ value: ComplaintPriority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const formSteps = [
  'Citizen information',
  'Complaint details',
  'Location and proof',
];

const checklistItems = [
  'Choose the nearest complaint category and ward.',
  'Describe the issue clearly with nearby landmark details.',
  'Use current location or manually confirm the address.',
  'Attach supporting images or PDF proof if available.',
];

const supportPoints = [
  'The portal is designed for quick public grievance registration.',
  'Location permission is optional, but helps departments act faster.',
  'Complaint ID and tracking updates become available after submission.',
];

function buildOsmEmbedUrl(latitude?: number, longitude?: number) {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return 'https://www.openstreetmap.org/export/embed.html?bbox=77.1734%2C28.5985%2C77.2495%2C28.6645&layer=mapnik';
  }

  const delta = 0.0065;
  const bbox = [
    longitude - delta,
    latitude - delta,
    longitude + delta,
    latitude + delta,
  ].join('%2C');

  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`;
}

async function reverseGeocode(latitude: number, longitude: number) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
    {
      headers: {
        Accept: 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error('Unable to resolve address.');
  }

  const data = (await response.json()) as { display_name?: string };
  return data.display_name || '';
}

export default function SubmitComplaint() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '' as ComplaintCategory,
    ward_id: '',
    priority: 'medium' as ComplaintPriority,
    contact_phone: demoCitizen.phone || '',
    latitude: '',
    longitude: '',
    location_address: '',
    location_accuracy_meters: '',
  });

  const mapEmbedUrl = useMemo(() => {
    const latitude = formData.latitude ? Number(formData.latitude) : undefined;
    const longitude = formData.longitude ? Number(formData.longitude) : undefined;
    return buildOsmEmbedUrl(latitude, longitude);
  }, [formData.latitude, formData.longitude]);

  const mapOpenUrl = useMemo(() => {
    if (!formData.latitude || !formData.longitude) {
      return 'https://www.openstreetmap.org';
    }

    return `https://www.openstreetmap.org/?mlat=${formData.latitude}&mlon=${formData.longitude}#map=17/${formData.latitude}/${formData.longitude}`;
  }, [formData.latitude, formData.longitude]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleLocationRequest = () => {
    if (!navigator.geolocation) {
      setLocationError('Location services are not supported on this device.');
      return;
    }

    setLocationLoading(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude.toFixed(6);
        const longitude = position.coords.longitude.toFixed(6);
        const accuracy = Math.round(position.coords.accuracy).toString();

        setFormData((current) => ({
          ...current,
          latitude,
          longitude,
          location_accuracy_meters: accuracy,
        }));

        try {
          const address = await reverseGeocode(position.coords.latitude, position.coords.longitude);
          setFormData((current) => ({
            ...current,
            latitude,
            longitude,
            location_address: address || current.location_address,
            location_accuracy_meters: accuracy,
          }));
        } catch {
          setLocationError('Location detected, but address lookup could not be completed.');
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        setLocationLoading(false);

        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location permission was denied. You can still enter the location manually.');
          return;
        }

        setLocationError('Unable to fetch your current location right now.');
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      },
    );
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []).slice(0, 4);
    setFiles(selectedFiles);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const payload = new FormData();
      payload.set('citizen_id', demoCitizen.id);
      payload.set('citizen_name', demoCitizen.full_name);
      payload.set('title', formData.title);
      payload.set('description', formData.description);
      payload.set('category', formData.category);
      payload.set('priority', formData.priority);
      payload.set('ward_id', formData.ward_id);
      payload.set('contact_phone', formData.contact_phone);
      payload.set('location_address', formData.location_address);

      if (formData.latitude) {
        payload.set('latitude', formData.latitude);
      }

      if (formData.longitude) {
        payload.set('longitude', formData.longitude);
      }

      if (formData.location_accuracy_meters) {
        payload.set('location_accuracy_meters', formData.location_accuracy_meters);
      }

      files.forEach((file) => {
        payload.append('attachments', file);
      });

      const response = await fetch('/api/complaints', {
        method: 'POST',
        body: payload,
      });

      const data = (await response.json()) as {
        complaint?: { id: string; tracking_code?: string };
        error?: string;
      };

      if (!response.ok || !data.complaint) {
        throw new Error(data.error || 'Unable to submit complaint.');
      }

      router.push(`/citizen/tracker?id=${data.complaint.id}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to submit complaint.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    formData.title.trim() &&
    formData.description.trim() &&
    formData.category &&
    formData.ward_id &&
    formData.contact_phone.trim();

  return (
    <DashboardLayout
      title="Raise Complaint"
      userRole="citizen"
      userName={demoCitizen.full_name}
    >
      <div className="space-y-6">
        <Card className="overflow-hidden border-slate-200 bg-[linear-gradient(135deg,#eff6ff_0%,#fff7ed_42%,#ffffff_100%)] shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
          <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm text-sky-800 shadow-sm">
                <ShieldCheck className="h-4 w-4" />
                Official citizen grievance registration
              </div>
              <h2 className="mt-5 text-3xl font-semibold text-slate-950">
                Raise a complaint through a simple, guided public service form.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Enter the issue details, add address or live location, and attach supporting proof
                if required. The layout is kept simple so citizens can complete the process quickly
                on both mobile and desktop.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {formSteps.map((step, index) => (
                  <div
                    key={step}
                    className="inline-flex items-center gap-2 rounded-full border border-white bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f3b82_0%,#1d4ed8_100%)] text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    {step}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-white/80 bg-white/80 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold tracking-[0.2em] text-slate-500 uppercase">
                <Landmark className="h-4 w-4 text-sky-700" />
                Public Form Standards
              </div>
              <div className="mt-4 grid gap-3">
                {[
                  'Use live location when available',
                  'Attach photos or PDF proof',
                  'Track complaint after submission',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="border-slate-200 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <FileText className="h-5 w-5 text-primary" />
                Complaint Submission Form
              </CardTitle>
              <CardDescription>
                Provide accurate details so the concerned municipal department can review and act quickly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8">
                <section className="rounded-[1.7rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-sm">
                  <div className="mb-5 flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f3b82_0%,#1d4ed8_100%)] text-sm font-semibold text-white shadow-sm">
                      1
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">Citizen Information</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Confirm the public contact details that should be used for complaint updates.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <FieldGroup>
                      <Field>
                        <FieldLabel>Citizen Name</FieldLabel>
                        <Input value={demoCitizen.full_name} disabled />
                      </Field>
                    </FieldGroup>

                    <FieldGroup>
                      <Field>
                        <FieldLabel className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Contact Number *
                        </FieldLabel>
                        <Input
                          placeholder="Enter mobile number"
                          value={formData.contact_phone}
                          onChange={(event) => handleChange('contact_phone', event.target.value)}
                          required
                        />
                      </Field>
                    </FieldGroup>
                  </div>
                </section>

                <section className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-5 flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_100%)] text-sm font-semibold text-white shadow-sm">
                      2
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">Complaint Details</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Explain the civic issue clearly so the concerned department can assess it quickly.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <FieldGroup>
                      <Field>
                        <FieldLabel>Complaint Title *</FieldLabel>
                        <Input
                          placeholder="Example: Streetlight not working near market gate"
                          value={formData.title}
                          onChange={(event) => handleChange('title', event.target.value)}
                          required
                        />
                      </Field>
                    </FieldGroup>

                    <FieldGroup>
                      <Field>
                        <FieldLabel>Priority</FieldLabel>
                        <Select
                          value={formData.priority}
                          onValueChange={(value) =>
                            handleChange('priority', value as ComplaintPriority)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            {priorities.map((priority) => (
                              <SelectItem key={priority.value} value={priority.value}>
                                {priority.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </FieldGroup>
                  </div>

                  <FieldGroup className="mt-6">
                    <Field>
                      <FieldLabel>Issue Description *</FieldLabel>
                      <Textarea
                        rows={6}
                        placeholder="Describe the issue clearly, including public impact, nearby landmark, or any repeated problem in the area."
                        value={formData.description}
                        onChange={(event) => handleChange('description', event.target.value)}
                        required
                      />
                    </Field>
                  </FieldGroup>

                  <div className="mt-6 grid gap-6 md:grid-cols-2">
                    <FieldGroup>
                      <Field>
                        <FieldLabel>Category *</FieldLabel>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => handleChange('category', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.value} value={category.value}>
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </FieldGroup>

                    <FieldGroup>
                      <Field>
                        <FieldLabel>Ward *</FieldLabel>
                        <Select
                          value={formData.ward_id}
                          onValueChange={(value) => handleChange('ward_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select ward" />
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
                  </div>
                </section>

                <section className="rounded-[1.7rem] border border-slate-200 bg-slate-50/80 p-5">
                  <div className="mb-5 flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#15803d_0%,#16a34a_100%)] text-sm font-semibold text-white shadow-sm">
                      3
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">Location Details</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Share the exact location using live GPS or manually confirm the address and nearby landmark.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-slate-950">Location Capture</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Allow location permission to auto-fill your current position using a free
                        OpenStreetMap preview.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      onClick={handleLocationRequest}
                      disabled={locationLoading}
                    >
                      {locationLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <LocateFixed className="h-4 w-4" />
                      )}
                      Use Current Location
                    </Button>
                  </div>

                  <div className="mt-5 grid gap-6 lg:grid-cols-2">
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup>
                          <Field>
                            <FieldLabel>Latitude</FieldLabel>
                            <Input
                              placeholder="Auto-detected"
                              value={formData.latitude}
                              onChange={(event) => handleChange('latitude', event.target.value)}
                            />
                          </Field>
                        </FieldGroup>
                        <FieldGroup>
                          <Field>
                            <FieldLabel>Longitude</FieldLabel>
                            <Input
                              placeholder="Auto-detected"
                              value={formData.longitude}
                              onChange={(event) => handleChange('longitude', event.target.value)}
                            />
                          </Field>
                        </FieldGroup>
                      </div>

                      <FieldGroup>
                        <Field>
                          <FieldLabel className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Address / Landmark
                          </FieldLabel>
                          <Textarea
                            rows={4}
                            placeholder="Location details or auto-filled address will appear here."
                            value={formData.location_address}
                            onChange={(event) => handleChange('location_address', event.target.value)}
                          />
                          <FieldDescription>
                            Add nearby landmark details if the map pin is not exact.
                          </FieldDescription>
                        </Field>
                      </FieldGroup>

                      {formData.location_accuracy_meters ? (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                          Reported location accuracy: approximately {formData.location_accuracy_meters} meters.
                        </div>
                      ) : null}

                      {locationError ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                          {locationError}
                        </div>
                      ) : null}
                    </div>

                    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
                      <div className="border-b border-slate-200 px-4 py-3">
                        <div className="text-sm font-semibold text-slate-950">Map Preview</div>
                        <p className="mt-1 text-xs text-slate-500">
                          Free OpenStreetMap preview based on the selected coordinates.
                        </p>
                      </div>
                      <iframe
                        title="Complaint location map"
                        src={mapEmbedUrl}
                        className="h-[300px] w-full border-0"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                      <div className="border-t border-slate-200 px-4 py-3">
                        <a
                          href={mapOpenUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-medium text-primary"
                        >
                          Open on OpenStreetMap
                          <ArrowRight className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  </div>

                </section>

                <section className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-5 flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f3b82_0%,#0ea5e9_100%)] text-sm font-semibold text-white shadow-sm">
                      4
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">Supporting Files</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Add photos, screenshots, or PDF documents if they help verify the complaint.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-slate-700" />
                    <h3 className="text-base font-semibold text-slate-950">Upload Documents or Photos</h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Upload up to 4 files such as photos, screenshots, or a PDF document.
                  </p>

                  <div className="mt-4 rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-5">
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                        <Upload className="h-5 w-5" />
                      </div>
                      <div className="text-sm font-medium text-slate-700">
                        Click to upload images or PDF files
                      </div>
                      <div className="text-xs text-slate-500">
                        JPG, PNG, WEBP, PDF supported
                      </div>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        multiple
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>

                  {files.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      {files.map((file) => (
                        <div
                          key={`${file.name}-${file.size}`}
                          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                        >
                          <span className="truncate pr-4 text-slate-700">{file.name}</span>
                          <span className="text-slate-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>

                {submitError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {submitError}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-full"
                    disabled={!isFormValid || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting Complaint...
                      </>
                    ) : (
                      <>
                        Submit Complaint
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BadgeCheck className="h-5 w-5 text-emerald-600" />
                  Submission Checklist
                </CardTitle>
                <CardDescription>
                  A quick checklist to help you file a complete and useful complaint.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                {checklistItems.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-white bg-white px-4 py-4 shadow-sm"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Citizen Guidance</CardTitle>
                <CardDescription>
                  Use these tips to help the department resolve the issue faster.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-600">
                {supportPoints.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    {item}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_100%)]">
              <CardHeader>
                <CardTitle>After Submission</CardTitle>
                <CardDescription>
                  The complaint will be registered and made available for tracking.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <div className="rounded-2xl border border-white bg-white px-4 py-4 shadow-sm">
                  You will receive a complaint ID / tracking code.
                </div>
                <div className="rounded-2xl border border-white bg-white px-4 py-4 shadow-sm">
                  Complaint progress can be checked from the tracker page.
                </div>
                <div className="rounded-2xl border border-white bg-white px-4 py-4 shadow-sm">
                  Status updates remain visible until the issue is resolved.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
