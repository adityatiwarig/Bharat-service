'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Camera,
  Check,
  CheckCircle2,
  Copy,
  Crosshair,
  FileImage,
  Globe,
  Landmark,
  LocateFixed,
  Send,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { DashboardLayout } from '@/components/dashboard-layout';
import { LoadingSummary } from '@/components/loading-skeletons';
import { useSession } from '@/components/session-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { fetchGrievanceMapping } from '@/lib/client/complaints';
import { buildMapPreviewDataUrl, createGeoEvidenceDraft, type GeoEvidenceDraft } from '@/lib/client/geo-evidence';
import { emitComplaintFeedChanged } from '@/lib/client/live-updates';
import { cn } from '@/lib/utils';
import type { GeoVerificationStatus, GrievanceMappingResponse } from '@/lib/types';

type Language = 'en' | 'hi';

const GENDER_VALUES = ['male', 'female', 'other'] as const;
const MAX_FILES = 6;

const TEXT = {
  en: {
    title: 'Citizen Complaint Submission Form',
    subtitle: 'Government of NCT of Delhi',
    lead: 'Submit complaint details in a structured format for timely review and action.',
    helpline: 'Citizen Helpline: 1800-XXX-XXXX',
    language: 'Language',
    english: 'English',
    hindi: 'हिंदी',
    progress: 'Submission Progress',
    progressHelp: 'Complete each section carefully to help the department process your complaint faster.',
    requiredHint: 'Fields marked with * are required.',
    applicant: 'Applicant Details',
    applicantHelp: 'Provide the complainant information exactly as it should appear in the official record.',
    classification: 'Complaint Classification',
    classificationHelp: 'Choose the concerned department and category so the complaint reaches the correct authority.',
    location: 'Complaint Location',
    locationHelp: 'Share the exact civic location to support faster inspection and response.',
    evidence: 'Supporting Evidence',
    evidenceHelp: 'Attach clear issue photographs. Up to 6 images may be added.',
    additional: 'Additional Information',
    additionalHelp: 'Include any reference details that may help link this complaint with an earlier record.',
    name: 'Full Name',
    mobile: 'Mobile Number',
    email: 'Email Address',
    gender: 'Gender',
    address: 'Residential Address',
    department: 'Department',
    category: 'Category',
    subject: 'Complaint Subject',
    description: 'Complaint Description',
    zone: 'Zone',
    ward: 'Ward',
    street: 'Street / Landmark / Additional Detail',
    previousComplaintId: 'Previous Complaint ID',
    mobilePlaceholder: 'Enter 10-digit mobile number',
    emailPlaceholder: 'Enter email address',
    addressPlaceholder: 'Enter your complete residential address',
    genderPlaceholder: 'Select gender',
    departmentPlaceholder: 'Select department',
    departmentFirst: 'Select department first',
    categoryPlaceholder: 'Select category',
    zonePlaceholder: 'Select zone',
    zoneFirst: 'Select zone first',
    wardPlaceholder: 'Select ward',
    streetPlaceholder: 'Nearby landmark or street detail',
    subjectPlaceholder: 'Enter a short subject line',
    descriptionPlaceholder: 'Describe the issue in clear and simple language',
    previousComplaintPlaceholder: 'Enter previous complaint number, if any',
    loadingDepartments: 'Loading departments...',
    loadingCategories: 'Loading categories...',
    loadingZones: 'Loading zones...',
    loadingWards: 'Loading wards...',
    locateTitle: 'Auto Fetch Current Location',
    locateHelp: 'Optional. This helps the field team identify the complaint site more accurately.',
    fetchLocation: 'Fetch Location',
    fetchingLocation: 'Fetching...',
    locationSuccess: 'Location captured successfully',
    selectedLocation: 'Selected location',
    selectedClassification: 'Complaint classification',
    notSelected: 'Not selected',
    photos: 'Complaint Photographs',
    photosHelp: 'Use the camera or upload existing images from your device.',
    capturePhoto: 'Capture Photo',
    uploadPhoto: 'Upload from Device',
    imagesAdded: 'images added',
    imageLimit: 'Maximum 6 images. At least one photograph is required for submission.',
    previewUnavailable: 'Preview not available',
    remove: 'Remove',
    noImages: 'No images added yet.',
    cameraTitle: 'Capture Complaint Photograph',
    cameraText: 'Position the issue clearly in the frame, then capture the image.',
    cameraOpening: 'Starting live camera preview.',
    cameraReady: 'Camera is ready.',
    cameraUnavailable: 'Camera preview is not available in this browser or permission was denied.',
    capture: 'Capture',
    cancel: 'Cancel',
    note: 'After submission, your complaint will be routed to the concerned department. You can track status in',
    myComplaints: 'My Complaints',
    submitted: 'Complaint submitted successfully',
    redirecting: 'Redirecting to your live tracker.',
    submit: 'Submit Complaint',
    submitting: 'Submitting complaint...',
    reset: 'Reset Form',
    optional: 'Optional',
    male: 'Male',
    female: 'Female',
    other: 'Other',
  },
  hi: {
    title: 'नागरिक शिकायत जमा प्रपत्र',
    subtitle: 'दिल्ली एनसीटी सरकार',
    lead: 'समय पर जांच और कार्रवाई के लिए शिकायत विवरण को व्यवस्थित रूप में दर्ज करें।',
    helpline: 'नागरिक हेल्पलाइन: 1800-XXX-XXXX',
    language: 'भाषा',
    english: 'English',
    hindi: 'हिंदी',
    progress: 'जमा प्रगति',
    progressHelp: 'प्रत्येक अनुभाग ध्यान से भरें ताकि विभाग आपकी शिकायत पर तेजी से कार्य कर सके।',
    requiredHint: '* चिन्हित फ़ील्ड अनिवार्य हैं।',
    applicant: 'आवेदक विवरण',
    applicantHelp: 'शिकायतकर्ता की जानकारी वैसी ही भरें जैसी वह आधिकारिक रिकॉर्ड में दिखनी चाहिए।',
    classification: 'शिकायत वर्गीकरण',
    classificationHelp: 'सही विभाग और श्रेणी चुनें ताकि शिकायत उचित प्राधिकारी तक पहुंचे।',
    location: 'शिकायत का स्थान',
    locationHelp: 'तेजी से निरीक्षण और कार्रवाई के लिए सही स्थान विवरण दें।',
    evidence: 'सहायक साक्ष्य',
    evidenceHelp: 'समस्या की स्पष्ट तस्वीरें जोड़ें। अधिकतम 6 चित्र जोड़े जा सकते हैं।',
    additional: 'अतिरिक्त जानकारी',
    additionalHelp: 'यदि यह शिकायत पहले की किसी प्रविष्टि से जुड़ी है तो उसका विवरण दें।',
    name: 'पूरा नाम',
    mobile: 'मोबाइल नंबर',
    email: 'ईमेल पता',
    gender: 'लिंग',
    address: 'आवासीय पता',
    department: 'विभाग',
    category: 'श्रेणी',
    subject: 'शिकायत विषय',
    description: 'शिकायत विवरण',
    zone: 'ज़ोन',
    ward: 'वार्ड',
    street: 'सड़क / लैंडमार्क / अतिरिक्त विवरण',
    previousComplaintId: 'पिछली शिकायत आईडी',
    mobilePlaceholder: '10 अंकों का मोबाइल नंबर दर्ज करें',
    emailPlaceholder: 'ईमेल पता दर्ज करें',
    addressPlaceholder: 'पूरा आवासीय पता दर्ज करें',
    genderPlaceholder: 'लिंग चुनें',
    departmentPlaceholder: 'विभाग चुनें',
    departmentFirst: 'पहले विभाग चुनें',
    categoryPlaceholder: 'श्रेणी चुनें',
    zonePlaceholder: 'ज़ोन चुनें',
    zoneFirst: 'पहले ज़ोन चुनें',
    wardPlaceholder: 'वार्ड चुनें',
    streetPlaceholder: 'नजदीकी लैंडमार्क या सड़क का विवरण',
    subjectPlaceholder: 'संक्षिप्त विषय लिखें',
    descriptionPlaceholder: 'समस्या को सरल और स्पष्ट भाषा में लिखें',
    previousComplaintPlaceholder: 'यदि हो तो पिछली शिकायत संख्या दर्ज करें',
    loadingDepartments: 'विभाग लोड हो रहे हैं...',
    loadingCategories: 'श्रेणियां लोड हो रही हैं...',
    loadingZones: 'ज़ोन लोड हो रहे हैं...',
    loadingWards: 'वार्ड लोड हो रहे हैं...',
    locateTitle: 'वर्तमान स्थान प्राप्त करें',
    locateHelp: 'वैकल्पिक। इससे फील्ड टीम शिकायत स्थल को अधिक सटीक रूप से पहचान सकती है।',
    fetchLocation: 'स्थान प्राप्त करें',
    fetchingLocation: 'प्राप्त किया जा रहा है...',
    locationSuccess: 'स्थान सफलतापूर्वक प्राप्त हुआ',
    selectedLocation: 'चयनित स्थान',
    selectedClassification: 'शिकायत वर्गीकरण',
    notSelected: 'चयनित नहीं',
    photos: 'शिकायत की तस्वीरें',
    photosHelp: 'कैमरा का उपयोग करें या डिवाइस से पहले से मौजूद चित्र अपलोड करें।',
    capturePhoto: 'फोटो कैप्चर करें',
    uploadPhoto: 'डिवाइस से अपलोड करें',
    imagesAdded: 'चित्र जोड़े गए',
    imageLimit: 'अधिकतम 6 चित्र। जमा करने के लिए कम से कम एक फोटो आवश्यक है।',
    previewUnavailable: 'पूर्वावलोकन उपलब्ध नहीं है',
    remove: 'हटाएं',
    noImages: 'अभी तक कोई चित्र नहीं जोड़ा गया है।',
    cameraTitle: 'शिकायत फोटो कैप्चर करें',
    cameraText: 'समस्या को फ्रेम में स्पष्ट रखें और फिर फोटो लें।',
    cameraOpening: 'लाइव कैमरा पूर्वावलोकन शुरू किया जा रहा है।',
    cameraReady: 'कैमरा तैयार है।',
    cameraUnavailable: 'इस ब्राउज़र में कैमरा पूर्वावलोकन उपलब्ध नहीं है या अनुमति नहीं मिली।',
    capture: 'कैप्चर',
    cancel: 'रद्द करें',
    note: 'जमा करने के बाद आपकी शिकायत संबंधित विभाग को भेज दी जाएगी। स्थिति देखने के लिए',
    myComplaints: 'मेरी शिकायतें',
    submitted: 'शिकायत सफलतापूर्वक जमा हुई',
    redirecting: 'आपके लाइव ट्रैकर पर भेजा जा रहा है।',
    submit: 'शिकायत जमा करें',
    submitting: 'शिकायत जमा की जा रही है...',
    reset: 'फॉर्म रीसेट करें',
    optional: 'वैकल्पिक',
    male: 'पुरुष',
    female: 'महिला',
    other: 'अन्य',
  },
} satisfies Record<Language, Record<string, string>>;

const shellClassName =
  'w-full rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-sm text-slate-800 transition-all duration-200 placeholder:text-slate-400 focus-visible:border-[#1E3A8A] focus-visible:ring-2 focus-visible:ring-[#BFDBFE] focus-visible:ring-offset-0';

const selectClassName =
  'w-full rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-sm text-slate-800 focus:ring-2 focus:ring-[#BFDBFE] focus:ring-offset-0 focus:border-[#1E3A8A]';

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

function SectionTitle({ step, title, helper }: { step: string; title: string; helper: string }) {
  return (
    <div className="mb-6 flex flex-col gap-3 border-b border-[#E5E7EB] pb-5 md:flex-row md:items-start md:justify-between">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1E3A8A]/75">{step}</div>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">{title}</h2>
      </div>
      <p className="max-w-2xl text-sm leading-6 text-slate-500">{helper}</p>
    </div>
  );
}

function LabelText({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <FieldLabel className="mb-2 block text-sm font-medium text-slate-700">
      {children}
      {required ? <span className="ml-1 text-[#B91C1C]">*</span> : null}
    </FieldLabel>
  );
}

function StepChip({ label, index, complete }: { label: string; index: number; complete: boolean }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 transition-all duration-200 ${complete ? 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1E3A8A]' : 'border-[#E5E7EB] bg-white text-slate-500'}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.14em]">Step {index}</div>
      <div className="mt-1 text-sm font-semibold">{label}</div>
    </div>
  );
}

function getGeoBadgeClassName(status?: GeoVerificationStatus) {
  if (status === 'geo_verified') {
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  }

  if (status === 'location_mismatch') {
    return 'bg-amber-50 text-amber-800 border border-amber-200';
  }

  if (status === 'not_verified') {
    return 'bg-slate-100 text-slate-600 border border-slate-200';
  }

  return 'bg-blue-50 text-[#1E3A8A] border border-[#BFDBFE]';
}

async function copyComplaintIdToClipboard(complaintId: string) {
  if (!complaintId || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(complaintId);
    return true;
  } catch (error) {
    console.error('Unable to copy complaint ID', error);
    return false;
  }
}

function ComplaintSubmissionSuccessOverlay({
  complaintId,
  copied,
  onClose,
}: {
  complaintId: string;
  copied: boolean;
  onClose: () => void;
}) {
  const [copiedState, setCopiedState] = useState(copied);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCopiedState(copied);
  }, [copied]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  async function handleCopyAgain() {
    const didCopy = await copyComplaintIdToClipboard(complaintId);
    setCopiedState(didCopy);

    if (!didCopy) {
      toast.error('Clipboard access is unavailable. Please copy the complaint ID manually.');
    }
  }

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-lg"
      role="dialog"
      aria-modal="true"
      aria-live="polite"
    >
      <div className="w-[min(94vw,32rem)] overflow-hidden rounded-[28px] border border-emerald-200/90 bg-white text-slate-900 shadow-[0_28px_90px_rgba(15,23,42,0.22)]">
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-lime-400" />
        <div className="bg-[linear-gradient(180deg,rgba(236,253,245,0.82)_0%,rgba(255,255,255,1)_40%)] p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-100 text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Complaint Registered</div>
                  <p className="mt-1 text-base font-semibold leading-6 text-slate-900">Your complaint has been successfully submitted</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-emerald-200 bg-white/95 p-4 shadow-[0_8px_24px_rgba(16,185,129,0.08)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Complaint ID</div>
                <div className="mt-2 break-all rounded-xl bg-emerald-50 px-3 py-3 text-center font-mono text-sm font-bold tracking-[0.08em] text-emerald-950">
                  {complaintId}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium',
                    copiedState ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800',
                  )}
                >
                  {copiedState ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedState ? 'Copied to clipboard' : 'Copy manually'}
                </div>

                <button
                  type="button"
                  onClick={() => void handleCopyAgain()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 transition hover:bg-emerald-50"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy again
                </button>
              </div>

              <p className="mt-3 text-sm leading-5 text-slate-600">
                {copiedState ? 'Complaint ID has been copied to clipboard for quick reference.' : 'Clipboard access is unavailable. Please copy the complaint ID manually.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function SubmitComplaintPage() {
  const router = useRouter();
  const session = useSession();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [language, setLanguage] = useState<Language>('en');
  const [mapping, setMapping] = useState<GrievanceMappingResponse | null>(null);
  const [loadingMapping, setLoadingMapping] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [evidenceItems, setEvidenceItems] = useState<GeoEvidenceDraft[]>([]);
  const [form, setForm] = useState(() => createInitialForm(session || undefined));
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [expandedImageUrl, setExpandedImageUrl] = useState('');
  const [processingEvidence, setProcessingEvidence] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<{ complaintId: string; copied: boolean } | null>(null);

  const text = TEXT[language];

  const filePreviews = useMemo(
    () =>
      evidenceItems.map((item, index) => ({
        id: `${item.taggedFile.name}-${item.taggedFile.size}-${item.taggedFile.lastModified}-${index}`,
        name: item.taggedFile.name,
        sizeLabel: `${(item.taggedFile.size / 1024 / 1024).toFixed(item.taggedFile.size >= 1024 * 1024 ? 1 : 2)} MB`,
        isImage: item.taggedFile.type.startsWith('image/'),
        url: item.taggedFile.type.startsWith('image/') ? URL.createObjectURL(item.taggedFile) : null,
        mapUrl: buildMapPreviewDataUrl(item.metadata),
        metadata: item.metadata,
      })),
    [evidenceItems],
  );

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

  useEffect(() => {
    return () => {
      filePreviews.forEach((preview) => {
        if (preview.url) URL.revokeObjectURL(preview.url);
      });
    };
  }, [filePreviews]);

  useEffect(() => {
    return () => {
      const stream = streamRef.current;
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!submissionSuccess) {
      return;
    }

    const redirectTimer = window.setTimeout(() => {
      router.push(`/citizen/tracker?id=${submissionSuccess.complaintId}`);
    }, 4500);

    return () => window.clearTimeout(redirectTimer);
  }, [router, submissionSuccess]);

  const filteredWards = useMemo(() => {
    if (!mapping || !form.zone_id) return [];
    return mapping.wards.filter((ward) => String(ward.zone_id) === form.zone_id);
  }, [form.zone_id, mapping]);

  const filteredCategories = useMemo(() => {
    if (!mapping || !form.department_id) return [];
    return mapping.categories.filter((category) => String(category.department_id) === form.department_id);
  }, [form.department_id, mapping]);

  const selectedZone = useMemo(() => mapping?.zones.find((zone) => String(zone.id) === form.zone_id) || null, [form.zone_id, mapping]);
  const selectedWard = useMemo(() => mapping?.wards.find((ward) => String(ward.id) === form.ward_id) || null, [form.ward_id, mapping]);
  const selectedDepartment = useMemo(() => mapping?.departments.find((department) => String(department.id) === form.department_id) || null, [form.department_id, mapping]);
  const selectedCategory = useMemo(() => mapping?.categories.find((category) => String(category.id) === form.category_id) || null, [form.category_id, mapping]);

  const stepCompletion = useMemo(() => {
    const applicantComplete = Boolean(form.applicant_name && form.applicant_mobile && form.applicant_address);
    const classificationComplete = Boolean(form.department_id && form.category_id && form.title && form.text);
    const locationComplete = Boolean(form.zone_id && form.ward_id);
    const evidenceComplete = evidenceItems.length > 0;
    const additionalComplete = Boolean(form.previous_complaint_id || form.street_address || form.latitude || form.longitude);
    return [applicantComplete, classificationComplete, locationComplete, evidenceComplete, additionalComplete];
  }, [evidenceItems.length, form]);

  const completedSteps = stepCompletion.filter(Boolean).length;
  const genderOptions = GENDER_VALUES.map((value) => ({ value, label: text[value] }));

  function stopCameraStream() {
    const stream = streamRef.current;
    if (stream) stream.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
    setCameraLoading(false);
    setCameraReady(false);
    setCameraError('');
  }

  async function openCameraModal() {
    if (evidenceItems.length >= MAX_FILES) {
      toast.error(`Only ${MAX_FILES} images can be attached.`);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraOpen(true);
      setCameraError(text.cameraUnavailable);
      return;
    }
    stopCameraStream();
    setCameraOpen(true);
    setCameraLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Unable to open camera', error);
      setCameraError(text.cameraUnavailable);
      setCameraLoading(false);
      setCameraReady(false);
    }
  }

  async function addFiles(incomingFiles: File[], source: 'camera' | 'upload') {
    const imageFiles = incomingFiles.filter((file) => file.type.startsWith('image/'));
    if (!imageFiles.length) {
      toast.error('Please select image files only.');
      return;
    }
    const accepted = imageFiles.slice(0, MAX_FILES - evidenceItems.length);
    if (!accepted.length) {
      toast.error(`Only ${MAX_FILES} images can be attached.`);
      return;
    }
    setProcessingEvidence(true);

    try {
      const drafts = await Promise.all(accepted.map((file) => createGeoEvidenceDraft(file, { source })));
      setEvidenceItems((current) => [...current, ...drafts].slice(0, MAX_FILES));

      if (drafts.some((draft) => !draft.metadata.location_available)) {
        toast.warning('Location not available. Evidence will be marked as Not Verified.');
      } else {
        toast.success('Geo-tagged evidence prepared successfully.');
      }
    } catch (error) {
      console.error('Unable to process geo evidence', error);
      toast.error(error instanceof Error ? error.message : 'Unable to prepare geo-tagged evidence.');
    } finally {
      setProcessingEvidence(false);
    }
  }

  function handleUploadChange(event: ChangeEvent<HTMLInputElement>) {
    void addFiles(Array.from(event.target.files || []), 'upload');
    event.target.value = '';
  }

  function removeFile(index: number) {
    setEvidenceItems((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function handleCapturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !cameraReady) return;
    const context = canvas.getContext('2d');
    if (!context) {
      toast.error('Unable to capture photo.');
      return;
    }
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error('Unable to capture photo.');
        return;
      }
      void addFiles([
        new File([blob], `complaint-photo-${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        }),
      ], 'camera');
      stopCameraStream();
    }, 'image/jpeg', 0.92);
  }

  function handleReset() {
    stopCameraStream();
    setForm(createInitialForm(session || undefined));
    setEvidenceItems([]);
    setSubmitted(false);
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
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!evidenceItems.length) {
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
      evidenceItems.forEach((item) => {
        payload.append('attachments', item.taggedFile);
        payload.append('attachment_originals', item.originalFile);
        payload.append('attachment_metadata', JSON.stringify(item.metadata));
      });
      const response = await fetch('/api/complaints', { method: 'POST', body: payload });
      const data = (await response.json()) as { complaint?: { id: string; complaint_id: string }; error?: string };
      if (!response.ok || !data.complaint) throw new Error(data.error || 'Unable to submit complaint.');
      const complaintId = data.complaint.complaint_id || data.complaint.id;
      const copied = await copyComplaintIdToClipboard(complaintId);
      setSubmitted(true);
      emitComplaintFeedChanged();
      setSubmissionSuccess({ complaintId, copied });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit complaint.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout title="Raise Complaint" compactCitizenHeader>
      {submissionSuccess ? (
        <ComplaintSubmissionSuccessOverlay
          complaintId={submissionSuccess.complaintId}
          copied={submissionSuccess.copied}
          onClose={() => {
            router.push(`/citizen/tracker?id=${submissionSuccess.complaintId}`);
          }}
        />
      ) : null}
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8 px-4 py-6 md:px-6 lg:px-8">
          <div className="rounded-[28px] border border-[#E5E7EB] bg-white px-6 py-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#1E3A8A]">
                  <Landmark className="h-7 w-7" />
                </div>
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[#1E3A8A]">{text.subtitle}</div>
                  <h1 className="mt-2 text-2xl font-semibold text-slate-900 md:text-[2rem]">{text.title}</h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{text.lead}</p>
                  <div className="mt-3 text-sm font-medium text-slate-600">{text.helpline}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-1.5 shadow-[0_4px_12px_rgba(15,23,42,0.03)]">
                <div className="mb-2 flex items-center gap-2 px-3 pt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <Globe className="h-3.5 w-3.5" />
                  {text.language}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${language === 'en' ? 'bg-[#1E3A8A] text-white' : 'text-slate-600 hover:bg-white'}`}
                  >
                    {text.english}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('hi')}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${language === 'hi' ? 'bg-[#1E3A8A] text-white' : 'text-slate-600 hover:bg-white'}`}
                  >
                    {text.hindi}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col gap-4 border-b border-[#E5E7EB] pb-6 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[#1E3A8A]">{text.progress}</div>
                <p className="mt-2 text-sm leading-6 text-slate-500">{text.progressHelp}</p>
              </div>
              <div className="rounded-2xl bg-[#EFF6FF] px-4 py-3 text-sm font-semibold text-[#1E3A8A]">{completedSteps}/5</div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <StepChip label={text.applicant} index={1} complete={stepCompletion[0]} />
              <StepChip label={text.classification} index={2} complete={stepCompletion[1]} />
              <StepChip label={text.location} index={3} complete={stepCompletion[2]} />
              <StepChip label={text.evidence} index={4} complete={stepCompletion[3]} />
              <StepChip label={text.additional} index={5} complete={stepCompletion[4]} />
            </div>

            <div className="mt-4 text-sm text-slate-500">{text.requiredHint}</div>
          </div>

          <div className="rounded-[28px] border border-[#E5E7EB] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className="p-6 md:p-8">
              {submitting ? (
                <LoadingSummary
                  label="Processing..."
                  description="Submitting your grievance and preparing the complaint tracker."
                />
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-8">
                <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-6 shadow-[0_4px_16px_rgba(15,23,42,0.03)] transition-all duration-300">
                  <SectionTitle step="Step 1" title={text.applicant} helper={text.applicantHelp} />
                  <div className="grid gap-6 md:grid-cols-2">
                    <FieldGroup>
                      <Field>
                        <LabelText required>{text.name}</LabelText>
                        <Input value={form.applicant_name} onChange={(event) => setForm((current) => ({ ...current, applicant_name: event.target.value }))} className={shellClassName} required />
                      </Field>
                    </FieldGroup>
                    <FieldGroup>
                      <Field>
                        <LabelText required>{text.mobile}</LabelText>
                        <Input value={form.applicant_mobile} onChange={(event) => setForm((current) => ({ ...current, applicant_mobile: event.target.value }))} placeholder={text.mobilePlaceholder} className={shellClassName} required />
                      </Field>
                    </FieldGroup>
                    <FieldGroup>
                      <Field>
                        <LabelText>{text.email}</LabelText>
                        <Input type="email" value={form.applicant_email} onChange={(event) => setForm((current) => ({ ...current, applicant_email: event.target.value }))} placeholder={text.emailPlaceholder} className={shellClassName} />
                      </Field>
                    </FieldGroup>
                    <FieldGroup>
                      <Field>
                        <LabelText>{text.gender}</LabelText>
                        <Select value={form.applicant_gender} onValueChange={(value) => setForm((current) => ({ ...current, applicant_gender: value }))}>
                          <SelectTrigger className={selectClassName}>
                            <SelectValue placeholder={text.genderPlaceholder} />
                          </SelectTrigger>
                          <SelectContent>
                            {genderOptions.map((option) => (
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
                        <LabelText required>{text.address}</LabelText>
                        <Textarea value={form.applicant_address} onChange={(event) => setForm((current) => ({ ...current, applicant_address: event.target.value }))} rows={4} placeholder={text.addressPlaceholder} className={shellClassName} required />
                      </Field>
                    </FieldGroup>
                  </div>
                </section>

                <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-6 shadow-[0_4px_16px_rgba(15,23,42,0.03)] transition-all duration-300">
                  <SectionTitle step="Step 2" title={text.classification} helper={text.classificationHelp} />
                  <div className="grid gap-6 md:grid-cols-2">
                    <FieldGroup>
                      <Field>
                        <LabelText required>{text.department}</LabelText>
                        <Select value={form.department_id} onValueChange={(value) => setForm((current) => ({ ...current, department_id: value, category_id: '' }))}>
                          <SelectTrigger className={selectClassName}>
                            <SelectValue placeholder={loadingMapping ? text.loadingDepartments : text.departmentPlaceholder} />
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
                        <LabelText required>{text.category}</LabelText>
                        <Select value={form.category_id} onValueChange={(value) => setForm((current) => ({ ...current, category_id: value }))} disabled={!form.department_id}>
                          <SelectTrigger className={selectClassName}>
                            <SelectValue placeholder={!form.department_id ? text.departmentFirst : loadingMapping ? text.loadingCategories : text.categoryPlaceholder} />
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
                        <LabelText required>{text.subject}</LabelText>
                        <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder={text.subjectPlaceholder} className={shellClassName} required />
                      </Field>
                    </FieldGroup>
                    <FieldGroup className="md:col-span-2">
                      <Field>
                        <LabelText required>{text.description}</LabelText>
                        <Textarea value={form.text} onChange={(event) => setForm((current) => ({ ...current, text: event.target.value }))} rows={6} placeholder={text.descriptionPlaceholder} className={shellClassName} required />
                      </Field>
                    </FieldGroup>
                  </div>
                </section>

                <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-6 shadow-[0_4px_16px_rgba(15,23,42,0.03)] transition-all duration-300">
                  <SectionTitle step="Step 3" title={text.location} helper={text.locationHelp} />
                  <div className="grid gap-6 md:grid-cols-2">
                    <FieldGroup>
                      <Field>
                        <LabelText required>{text.zone}</LabelText>
                        <Select value={form.zone_id} onValueChange={(value) => setForm((current) => ({ ...current, zone_id: value, ward_id: '' }))}>
                          <SelectTrigger className={selectClassName}>
                            <SelectValue placeholder={loadingMapping ? text.loadingZones : text.zonePlaceholder} />
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
                        <LabelText required>{text.ward}</LabelText>
                        <Select value={form.ward_id} onValueChange={(value) => setForm((current) => ({ ...current, ward_id: value }))} disabled={!form.zone_id}>
                          <SelectTrigger className={selectClassName}>
                            <SelectValue placeholder={!form.zone_id ? text.zoneFirst : loadingMapping ? text.loadingWards : text.wardPlaceholder} />
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
                        <LabelText>{text.street}</LabelText>
                        <Textarea value={form.street_address} onChange={(event) => setForm((current) => ({ ...current, street_address: event.target.value }))} rows={3} placeholder={text.streetPlaceholder} className={shellClassName} />
                      </Field>
                    </FieldGroup>
                  </div>

                  <div className="mt-6 rounded-2xl border border-[#DBEAFE] bg-[#F8FBFF] p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-[#1E3A8A]">
                          <LocateFixed className="h-4 w-4" />
                          {text.locateTitle}
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-500">{text.locateHelp}</div>
                      </div>
                      <Button type="button" variant="outline" className="h-11 rounded-xl border-[#BFDBFE] bg-white px-5 text-[#1E3A8A] hover:border-[#1E3A8A] hover:bg-[#EFF6FF]" onClick={handleCaptureLocation} disabled={capturingLocation}>
                        {capturingLocation ? <Spinner label={text.fetchingLocation} size="sm" /> : (<><Crosshair className="h-4 w-4" />{text.fetchLocation}</>)}
                      </Button>
                    </div>

                    {form.latitude && form.longitude ? (
                      <div className="mt-4 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-700">
                        <div className="font-semibold text-emerald-700">{text.locationSuccess}</div>
                        <div className="mt-1">Latitude: {form.latitude}, Longitude: {form.longitude}</div>
                      </div>
                    ) : null}
                  </div>

                  {(selectedZone || selectedWard || selectedDepartment || selectedCategory) ? (
                    <div className="mt-6 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-5 py-4 text-sm text-slate-600">
                      <div>
                        {text.selectedLocation}:{' '}
                        <span className="font-semibold text-slate-800">{[selectedWard?.name, selectedZone?.name].filter(Boolean).join(', ') || text.notSelected}</span>
                      </div>
                      <div className="mt-2">
                        {text.selectedClassification}:{' '}
                        <span className="font-semibold text-slate-800">{[selectedDepartment?.name, selectedCategory?.name].filter(Boolean).join(' / ') || text.notSelected}</span>
                      </div>
                    </div>
                  ) : null}
                </section>

                <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-6 shadow-[0_4px_16px_rgba(15,23,42,0.03)] transition-all duration-300">
                  <SectionTitle step="Step 4" title={text.evidence} helper={text.evidenceHelp} />

                  <div className="rounded-2xl border border-[#DBEAFE] bg-[#F8FBFF] p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <LabelText required>{text.photos}</LabelText>
                        <p className="text-sm text-slate-500">{text.photosHelp}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#1E3A8A] shadow-[0_4px_12px_rgba(15,23,42,0.03)]">
                        {evidenceItems.length}/{MAX_FILES} {text.imagesAdded}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <Button type="button" className="h-11 rounded-xl bg-[#1E3A8A] px-5 text-white hover:bg-[#1A3478]" onClick={() => void openCameraModal()} disabled={submitting || processingEvidence || evidenceItems.length >= MAX_FILES}>
                        <Camera className="h-4 w-4" />
                        {text.capturePhoto}
                      </Button>
                      <Button type="button" variant="outline" className="h-11 rounded-xl border-[#CBD5E1] bg-white px-5 text-slate-700 hover:border-[#1E3A8A] hover:bg-[#EFF6FF] hover:text-[#1E3A8A]" onClick={() => uploadInputRef.current?.click()} disabled={submitting || processingEvidence || evidenceItems.length >= MAX_FILES}>
                        <Upload className="h-4 w-4" />
                        {text.uploadPhoto}
                      </Button>
                    </div>

                    <input ref={uploadInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUploadChange} />
                    <div className="mt-4 text-sm text-slate-500">{text.imageLimit}</div>
                    {processingEvidence ? (
                      <div className="mt-3 rounded-xl border border-[#BFDBFE] bg-white px-4 py-3 text-sm text-[#1E3A8A]">
                        Preparing geo-tagged evidence...
                      </div>
                    ) : null}
                  </div>

                  {evidenceItems.length ? (
                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                      {filePreviews.map((preview, index) => (
                        <div key={preview.id} className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-3 shadow-[0_4px_12px_rgba(15,23,42,0.03)]">
                          <button
                            type="button"
                            onClick={() => preview.url && setExpandedImageUrl(preview.url)}
                            className="relative flex h-28 w-full items-center justify-center overflow-hidden rounded-xl bg-white"
                          >
                            {preview.isImage && preview.url ? (
                              <img src={preview.url} alt={preview.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex flex-col items-center gap-2 px-2 text-center text-slate-500">
                                <FileImage className="h-6 w-6 text-slate-400" />
                                <div className="text-xs">{text.previewUnavailable}</div>
                              </div>
                            )}
                            <img src={preview.mapUrl} alt="Map preview" className="absolute bottom-2 left-2 h-10 w-16 rounded-md border border-white/30 object-cover shadow" />
                          </button>
                          <div className="mt-3">
                            <div className="truncate text-sm font-medium text-slate-800">{preview.name}</div>
                            <div className="mt-1 text-xs text-slate-500">{preview.sizeLabel}</div>
                            <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getGeoBadgeClassName(preview.metadata.verification_status)}`}>
                              {preview.metadata.verification_label || 'Location Captured'}
                            </div>
                            <div className="mt-2 text-[11px] leading-5 text-slate-500">
                              {[preview.metadata.city, preview.metadata.area].filter(Boolean).join(', ') || 'Location not available'}
                            </div>
                          </div>
                          <button type="button" onClick={() => removeFile(index)} className="mt-3 inline-flex items-center gap-1 rounded-lg text-xs font-semibold text-[#B91C1C] transition hover:text-[#991B1B]">
                            <Trash2 className="h-3.5 w-3.5" />
                            {text.remove}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-6 rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-5 py-8 text-center text-sm text-slate-500">{text.noImages}</div>
                  )}
                </section>

                <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-6 shadow-[0_4px_16px_rgba(15,23,42,0.03)] transition-all duration-300">
                  <SectionTitle step="Step 5" title={text.additional} helper={text.additionalHelp} />
                  <div className="grid gap-6 md:grid-cols-2">
                    <FieldGroup>
                      <Field>
                        <LabelText>{text.previousComplaintId}</LabelText>
                        <Input value={form.previous_complaint_id} onChange={(event) => setForm((current) => ({ ...current, previous_complaint_id: event.target.value }))} placeholder={text.previousComplaintPlaceholder} className={shellClassName} />
                      </Field>
                    </FieldGroup>
                    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-5 py-4 text-sm text-slate-500">
                      <div className="font-semibold text-slate-800">{text.optional}</div>
                      <div className="mt-2 leading-6">{text.additionalHelp}</div>
                    </div>
                  </div>
                </section>

                <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-5 py-4 text-sm leading-6 text-slate-600">
                  {text.note} <span className="font-semibold text-slate-800">{text.myComplaints}</span>.
                </div>

                {submitted ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="h-4 w-4" />
                      {text.submitted}
                    </div>
                    <div className="mt-1">{text.redirecting}</div>
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" className="h-12 flex-1 rounded-xl bg-[#1E3A8A] text-white hover:bg-[#1A3478]" disabled={submitting || loadingMapping}>
                    {submitting ? <Spinner label={text.submitting} /> : (<><Send className="h-4 w-4" />{text.submit}</>)}
                  </Button>
                  <Button type="button" variant="outline" className="h-12 rounded-xl border-[#CBD5E1] bg-white px-5 text-slate-700 hover:border-[#1E3A8A] hover:bg-[#EFF6FF] hover:text-[#1E3A8A]" onClick={handleReset} disabled={submitting}>
                    {text.reset}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <Dialog open={cameraOpen} onOpenChange={(open) => { if (!open) stopCameraStream(); }}>
          <DialogContent className="max-w-3xl rounded-[28px] border border-[#E5E7EB] bg-white p-0 shadow-[0_16px_50px_rgba(15,23,42,0.16)]" showCloseButton={false}>
            <div className="p-6 md:p-7">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-slate-900">{text.cameraTitle}</DialogTitle>
                <DialogDescription className="mt-2 text-sm leading-6 text-slate-500">{text.cameraText}</DialogDescription>
              </DialogHeader>

              <div className="mt-5 overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-slate-950">
                {cameraError ? (
                  <div className="flex min-h-[320px] items-center justify-center px-6 text-center text-sm text-white">{cameraError}</div>
                ) : (
                  <video ref={videoRef} className="min-h-[320px] w-full bg-slate-950 object-cover" autoPlay muted playsInline onLoadedMetadata={() => { setCameraLoading(false); setCameraReady(true); }} />
                )}
              </div>

              <div className="mt-4 rounded-2xl bg-[#F8FAFC] px-4 py-3 text-sm text-slate-500">
                {cameraLoading ? text.cameraOpening : cameraError ? text.cameraUnavailable : text.cameraReady}
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" className="h-11 rounded-xl border-[#CBD5E1] bg-white px-5 text-slate-700 hover:border-[#1E3A8A] hover:bg-[#EFF6FF] hover:text-[#1E3A8A]" onClick={stopCameraStream}>
                  {text.cancel}
                </Button>
                <Button type="button" className="h-11 rounded-xl bg-[#1E3A8A] px-5 text-white hover:bg-[#1A3478]" onClick={handleCapturePhoto} disabled={!cameraReady || Boolean(cameraError)}>
                  <Camera className="h-4 w-4" />
                  {text.capture}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(expandedImageUrl)} onOpenChange={(open) => { if (!open) setExpandedImageUrl(''); }}>
          <DialogContent className="max-w-5xl rounded-[28px] border border-[#E5E7EB] bg-white p-4 shadow-[0_16px_50px_rgba(15,23,42,0.16)]">
            {expandedImageUrl ? <img src={expandedImageUrl} alt="Expanded geo evidence" className="max-h-[80vh] w-full rounded-[20px] object-contain" /> : null}
          </DialogContent>
        </Dialog>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </DashboardLayout>
  );
}
