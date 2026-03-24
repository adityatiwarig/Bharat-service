'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CameraOff, CheckCircle2, PlayCircle, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardLayout } from '@/components/dashboard-layout';
import { LoadingSummary, StatListSkeleton } from '@/components/loading-skeletons';
import { PriorityBadge, StatusBadge, WorkCompletedBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { fetchComplaints, submitComplaintResolutionProof, updateComplaintStatus } from '@/lib/client/complaints';
import { buildMapPreviewDataUrl, createGeoEvidenceDraft, type GeoEvidenceDraft } from '@/lib/client/geo-evidence';
import type { Complaint, ComplaintAttachment, GeoVerificationStatus } from '@/lib/types';

type CameraFacingMode = 'environment' | 'user';

const MAX_PROOF_IMAGES = 6;

function getSavedProofImages(complaint: Complaint | undefined) {
  if (!complaint) {
    return [] as ComplaintAttachment[];
  }

  if (complaint.proof_images?.length) {
    return complaint.proof_images;
  }

  return complaint.proof_image ? [complaint.proof_image] : [];
}

function ProofThumbnail({
  file,
  active,
  onSelect,
}: {
  file: GeoEvidenceDraft;
  active: boolean;
  onSelect: () => void;
}) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file.taggedFile);
    setUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`overflow-hidden rounded-[1rem] border text-left ${active ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white'}`}
    >
      {url ? <img src={url} alt={file.taggedFile.name} className="h-32 w-full object-cover" /> : null}
      <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-slate-600">
        <span className="truncate">{file.taggedFile.name}</span>
      </div>
    </button>
  );
}

function getGeoBadgeClassName(status?: GeoVerificationStatus) {
  if (status === 'geo_verified') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (status === 'location_mismatch') return 'bg-amber-50 text-amber-800 border border-amber-200';
  if (status === 'not_verified') return 'bg-slate-100 text-slate-600 border border-slate-200';
  return 'bg-blue-50 text-sky-800 border border-sky-200';
}

export default function WorkerUpdatesPage() {
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [startNote, setStartNote] = useState('');
  const [proofText, setProofText] = useState('');
  const [completionNote, setCompletionNote] = useState('');
  const [proofImages, setProofImages] = useState<GeoEvidenceDraft[]>([]);
  const [activeProofIndex, setActiveProofIndex] = useState(0);
  const [previewUrl, setPreviewUrl] = useState('');
  const [expandedImageUrl, setExpandedImageUrl] = useState('');
  const [submittingStart, setSubmittingStart] = useState(false);
  const [submittingComplete, setSubmittingComplete] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraFacingMode, setCameraFacingMode] = useState<CameraFacingMode>('environment');
  const [processingProofs, setProcessingProofs] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rearCaptureInputRef = useRef<HTMLInputElement | null>(null);
  const frontCaptureInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const supportsLiveCamera = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

  async function loadComplaints(nextSelectedId?: string) {
    setLoading(true);
    try {
      const result = await fetchComplaints({ my_assigned: true, page_size: 20 });
      setComplaints(result.items);
      const preferredId = nextSelectedId && result.items.some((item) => item.id === nextSelectedId)
        ? nextSelectedId
        : result.items.find((item) => item.status !== 'resolved' && item.status !== 'closed')?.id || result.items[0]?.id || '';
      setSelectedId(preferredId);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadComplaints();
  }, []);

  const selectedComplaint = useMemo(
    () => complaints.find((item) => item.id === selectedId),
    [complaints, selectedId],
  );

  const canStartWork = selectedComplaint?.status === 'assigned';
  const canCompleteWork = selectedComplaint?.status === 'in_progress';
  const activeProofImage = proofImages[activeProofIndex] || null;
  const savedProofImages = useMemo(() => getSavedProofImages(selectedComplaint), [selectedComplaint]);

  function stopCameraStream() {
    const stream = cameraStreamRef.current;

    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }

    cameraStreamRef.current = null;

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setCameraOpen(false);
    setCameraReady(false);
    setCameraError('');
  }

  function resetProofSelection() {
    setProofImages([]);
    setActiveProofIndex(0);
    setPreviewUrl('');
  }

  useEffect(() => {
    resetProofSelection();
    stopCameraStream();
  }, [selectedId]);

  useEffect(() => {
    if (!activeProofImage) {
      setPreviewUrl('');
      return;
    }

    const objectUrl = URL.createObjectURL(activeProofImage.taggedFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [activeProofImage]);

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !cameraStreamRef.current) {
      return;
    }

    const video = videoRef.current;
    video.srcObject = cameraStreamRef.current;
    video.muted = true;
    video.playsInline = true;
    void video.play().catch(() => {
      setCameraError('Unable to start the live camera preview on this device.');
    });
  }, [cameraOpen]);

  useEffect(() => {
    if (!proofImages.length) {
      setActiveProofIndex(0);
      return;
    }

    if (activeProofIndex >= proofImages.length) {
      setActiveProofIndex(proofImages.length - 1);
    }
  }, [activeProofIndex, proofImages]);

  useEffect(() => {
    if (!canCompleteWork) {
      resetProofSelection();
      stopCameraStream();
    }
  }, [canCompleteWork]);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  async function openLiveCamera(facingMode: CameraFacingMode) {
    if (!supportsLiveCamera) {
      setCameraError('Live camera access is not available in this browser. Please use the mobile camera or upload option.');
      return;
    }

    stopCameraStream();
    setCameraFacingMode(facingMode);
    setCameraError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
        },
        audio: false,
      });

      cameraStreamRef.current = stream;
      setCameraOpen(true);
    } catch (error) {
      setCameraError('Camera permission was not granted. Please allow camera access or use the upload option.');
      console.error('Unable to open worker camera', error);
    }
  }

  async function appendProofFiles(files: File[], source: 'camera' | 'upload') {
    if (!files.length) {
      return;
    }

    setProcessingProofs(true);

    try {
      const accepted = files.slice(0, Math.max(0, MAX_PROOF_IMAGES - proofImages.length));
      const drafts = await Promise.all(
        accepted.map((file) =>
          createGeoEvidenceDraft(file, {
            source,
            complaintLocation: {
              latitude: selectedComplaint?.latitude,
              longitude: selectedComplaint?.longitude,
            },
          }),
        ),
      );

      setProofImages((current) => {
        const next = [...current, ...drafts].slice(0, MAX_PROOF_IMAGES);
        setActiveProofIndex(Math.max(0, next.length - 1));
        return next;
      });

      if (drafts.some((draft) => !draft.metadata.location_available)) {
        toast.warning('Location not available. Proof will be marked as Not Verified.');
      } else {
        toast.success('Geo-tagged proof prepared successfully.');
      }
    } catch (error) {
      console.error('Unable to prepare worker geo evidence', error);
      toast.error(error instanceof Error ? error.message : 'Unable to prepare geo-tagged proof.');
    } finally {
      setProcessingProofs(false);
    }
  }

  function handleProofInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    void appendProofFiles(Array.from(event.target.files || []), 'upload');
    event.target.value = '';
  }

  function removeProofImage(index: number) {
    setProofImages((current) => current.filter((_, currentIndex) => currentIndex !== index));
    setActiveProofIndex((current) => Math.max(0, current > index ? current - 1 : current));
  }

  function captureLivePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !cameraReady) {
      setCameraError('The live camera is not ready yet. Please wait and try again.');
      return;
    }

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const context = canvas.getContext('2d');

    if (!context) {
      setCameraError('Unable to process the current camera frame.');
      return;
    }

    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, 0, 0, width, height);

    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError('Unable to capture the photograph. Please try again.');
        return;
      }

      const file = new File([blob], `completion-proof-${Date.now()}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      void appendProofFiles([file], 'camera');
    }, 'image/jpeg', 0.92);
  }

  async function handleStartWork() {
    if (!selectedComplaint || !canStartWork) {
      return;
    }

    setSubmittingStart(true);
    try {
      await updateComplaintStatus(selectedComplaint.id, { status: 'in_progress', note: startNote });
      toast.success('The work order has been moved to In Progress.');
      setStartNote('');
      await loadComplaints(selectedComplaint.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to start the work order.');
    } finally {
      setSubmittingStart(false);
    }
  }

  async function submitCompletionRecord() {
    if (!selectedComplaint || !canCompleteWork || !proofImages.length || submittingComplete) {
      return;
    }

    if (!proofText.trim()) {
      toast.error('Please enter the completion description before submission.');
      return;
    }

    setSubmittingComplete(true);
    try {
      await submitComplaintResolutionProof(selectedComplaint.id, {
        proof_text: proofText.trim(),
        note: completionNote.trim() || undefined,
        proof_images: proofImages.map((item) => item.taggedFile),
        proof_geo_evidence: proofImages,
      });
      toast.success('The completion record has been submitted successfully.');
      setProofText('');
      setCompletionNote('');
      resetProofSelection();
      stopCameraStream();
      await loadComplaints(selectedComplaint.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit the completion record.');
    } finally {
      setSubmittingComplete(false);
    }
  }

  async function handleCompleteWork(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitCompletionRecord();
  }

  return (
    <DashboardLayout title="Submit Update">
      <div className="mx-auto max-w-6xl space-y-6">
        {loading ? <LoadingSummary label="Loading assigned complaints" description="Preparing the worker action queue." /> : null}

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="rounded-[1.8rem] border-slate-200/80">
            <CardHeader>
              <CardTitle>Assigned Complaints</CardTitle>
              <CardDescription>Open a complaint assigned to this worker account to begin or complete field action.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? <StatListSkeleton count={4} /> : complaints.length ? complaints.map((complaint) => (
                <button
                  key={complaint.id}
                  type="button"
                  onClick={() => setSelectedId(complaint.id)}
                  className={`w-full rounded-[1.3rem] border px-4 py-4 text-left transition ${selectedId === complaint.id ? 'border-sky-300 bg-sky-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-950">{complaint.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{complaint.ward_name}</div>
                    </div>
                    <PriorityBadge priority={complaint.priority} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge status={complaint.status} />
                    {complaint.proof_image || complaint.proof_text ? <WorkCompletedBadge /> : null}
                  </div>
                </button>
              )) : (
                <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                  No assigned complaints are currently awaiting action.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[1.8rem] border-slate-200/80">
            <CardHeader>
              <CardTitle>Field Action</CardTitle>
              <CardDescription>Start the work order first, then submit the completion record with photographs and notes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FieldGroup>
                <Field>
                  <FieldLabel>Select Complaint</FieldLabel>
                  <Select value={selectedId} onValueChange={setSelectedId}>
                    <SelectTrigger><SelectValue placeholder="Select assigned complaint" /></SelectTrigger>
                    <SelectContent>
                      {complaints.map((complaint) => (
                        <SelectItem key={complaint.id} value={complaint.id}>
                          {complaint.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>

              {selectedComplaint ? (
                <>
                  <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{selectedComplaint.title}</div>
                        <div className="mt-1 text-sm text-slate-500">{selectedComplaint.ward_name} / {selectedComplaint.complaint_id}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge status={selectedComplaint.status} />
                        <PriorityBadge priority={selectedComplaint.priority} />
                      </div>
                    </div>
                    <div className="mt-3 text-sm leading-6 text-slate-600">{selectedComplaint.text}</div>
                  </div>

                  <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4">
                    <div className="text-sm font-semibold text-slate-900">Start Work Order</div>
                    <div className="mt-1 text-sm text-slate-500">Move the complaint from Assigned to In Progress.</div>
                    <Textarea
                      className="mt-4"
                      value={startNote}
                      onChange={(event) => setStartNote(event.target.value)}
                      rows={3}
                      placeholder="Enter an optional operational note."
                    />
                    <Button type="button" className="mt-4 rounded-full" disabled={!canStartWork || submittingStart} onClick={handleStartWork}>
                      {submittingStart ? <Spinner label="Starting..." /> : <><PlayCircle className="h-4 w-4" /> Start Work</>}
                    </Button>
                  </div>

                  <form onSubmit={handleCompleteWork} className="space-y-5 rounded-[1.4rem] border border-slate-200 bg-white p-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Submit Completion Record</div>
                      <div className="mt-1 text-sm text-slate-500">Photographs are attached automatically after capture or upload confirmation.</div>
                    </div>

                    <FieldGroup>
                      <Field>
                        <FieldLabel>Completion Description</FieldLabel>
                        <Textarea
                          value={proofText}
                          onChange={(event) => setProofText(event.target.value)}
                          rows={4}
                          placeholder="Describe the work completed at the site."
                          disabled={!canCompleteWork}
                          required
                        />
                      </Field>
                    </FieldGroup>

                    <FieldGroup>
                      <Field>
                        <FieldLabel>Internal Note</FieldLabel>
                        <Textarea
                          value={completionNote}
                          onChange={(event) => setCompletionNote(event.target.value)}
                          rows={3}
                          placeholder="Enter an optional internal note."
                          disabled={!canCompleteWork}
                        />
                      </Field>
                    </FieldGroup>

                    <FieldGroup>
                      <Field>
                        <FieldLabel>Completion Photographs</FieldLabel>
                        <div className="space-y-4">
                          <div className="flex flex-wrap gap-3">
                            <Button type="button" variant="outline" disabled={!canCompleteWork || processingProofs} onClick={() => void openLiveCamera('environment')}>
                              <Camera className="h-4 w-4" />
                              Open Rear Camera
                            </Button>
                            <Button type="button" variant="outline" disabled={!canCompleteWork || processingProofs} onClick={() => void openLiveCamera('user')}>
                              <Camera className="h-4 w-4" />
                              Open Front Camera
                            </Button>
                            <Button type="button" variant="outline" disabled={!canCompleteWork || processingProofs} onClick={() => rearCaptureInputRef.current?.click()}>
                              <Upload className="h-4 w-4" />
                              Use Mobile Rear Camera
                            </Button>
                            <Button type="button" variant="outline" disabled={!canCompleteWork || processingProofs} onClick={() => frontCaptureInputRef.current?.click()}>
                              <Upload className="h-4 w-4" />
                              Use Mobile Front Camera
                            </Button>
                            <Button type="button" variant="outline" disabled={!canCompleteWork || processingProofs} onClick={() => galleryInputRef.current?.click()}>
                              <Upload className="h-4 w-4" />
                              Upload Photographs
                            </Button>
                          </div>

                          <input ref={rearCaptureInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleProofInputChange} />
                          <input ref={frontCaptureInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleProofInputChange} />
                          <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleProofInputChange} />

                          <div className="rounded-[1.2rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                            On mobile devices, the photograph is attached automatically after it is confirmed in the device camera screen. Use Remove if the selected photograph is not correct.
                          </div>

                          {processingProofs ? (
                            <div className="rounded-[1rem] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                              Preparing geo-tagged proof...
                            </div>
                          ) : null}

                          {cameraOpen ? (
                            <div className="space-y-4 rounded-[1.35rem] border border-sky-200 bg-sky-50/70 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold text-slate-900">Live Camera</div>
                                  <div className="mt-1 text-sm text-slate-500">
                                    {cameraFacingMode === 'environment' ? 'Rear camera view is active.' : 'Front camera view is active.'}
                                  </div>
                                </div>
                                <Button type="button" variant="ghost" onClick={stopCameraStream}>
                                  <CameraOff className="h-4 w-4" />
                                  Close Camera
                                </Button>
                              </div>

                              <div className="flex flex-wrap gap-3">
                                <Button type="button" variant="outline" onClick={() => void openLiveCamera('environment')}>Rear Camera</Button>
                                <Button type="button" variant="outline" onClick={() => void openLiveCamera('user')}>Front Camera</Button>
                              </div>

                              <div className="overflow-hidden rounded-[1.2rem] border border-slate-200 bg-slate-950">
                                <video
                                  ref={videoRef}
                                  className="max-h-[26rem] w-full object-cover"
                                  autoPlay
                                  muted
                                  playsInline
                                  onLoadedMetadata={() => setCameraReady(true)}
                                />
                              </div>

                              <div className="flex flex-wrap gap-3">
                                <Button type="button" disabled={!cameraReady || proofImages.length >= MAX_PROOF_IMAGES} onClick={captureLivePhoto}>
                                  <Camera className="h-4 w-4" />
                                  Capture Photograph
                                </Button>
                                <Button type="button" variant="outline" onClick={stopCameraStream}>Close</Button>
                              </div>
                            </div>
                          ) : null}

                          {cameraError ? (
                            <div className="rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                              {cameraError}
                            </div>
                          ) : null}

                          <canvas ref={canvasRef} className="hidden" />

                          {proofImages.length ? (
                            <div className="rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                              {proofImages.length} photograph{proofImages.length > 1 ? 's' : ''} selected for submission.
                            </div>
                          ) : null}

                          {proofImages.length ? (
                            <div className="grid gap-3 sm:grid-cols-2">
                              {proofImages.map((file, index) => (
                                <ProofThumbnail
                                  key={`${file.taggedFile.name}-${file.taggedFile.lastModified}-${index}`}
                                  file={file}
                                  active={index === activeProofIndex}
                                  onSelect={() => setActiveProofIndex(index)}
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </Field>
                    </FieldGroup>

                    {previewUrl ? (
                      <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-900">Selected Photograph</div>
                          <Button type="button" variant="outline" size="sm" disabled={!activeProofImage} onClick={() => removeProofImage(activeProofIndex)}>
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                        <button type="button" onClick={() => setExpandedImageUrl(previewUrl)} className="relative block w-full text-left">
                          <img src={previewUrl} alt="Selected completion proof" className="max-h-80 rounded-2xl object-cover" />
                          {activeProofImage ? (
                            <>
                              <img src={buildMapPreviewDataUrl(activeProofImage.metadata)} alt="Map preview" className="absolute bottom-3 left-3 h-16 w-24 rounded-lg border border-white/30 object-cover shadow" />
                              <div className={`absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-semibold ${getGeoBadgeClassName(activeProofImage.metadata.verification_status)}`}>
                                {activeProofImage.metadata.verification_label || 'Location Captured'}
                              </div>
                            </>
                          ) : null}
                        </button>
                        {activeProofImage ? (
                          <div className="mt-3 text-sm leading-6 text-slate-600">
                            {[activeProofImage.metadata.city, activeProofImage.metadata.area].filter(Boolean).join(', ') || 'Location not available'}
                            {activeProofImage.metadata.distance_from_complaint_meters !== null && activeProofImage.metadata.distance_from_complaint_meters !== undefined
                              ? ` • ${activeProofImage.metadata.distance_from_complaint_meters}m from complaint location`
                              : ''}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {(savedProofImages.length || selectedComplaint.proof_text) ? (
                      <div className="rounded-[1.35rem] border border-emerald-200 bg-emerald-50 p-4">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-900">
                          <CheckCircle2 className="h-4 w-4" />
                          Saved Completion Record
                        </div>
                        {selectedComplaint.proof_text ? <div className="text-sm text-emerald-900">{selectedComplaint.proof_text}</div> : null}
                        {savedProofImages.length ? (
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            {savedProofImages.map((image) => (
                              <button
                                key={image.id}
                                type="button"
                                onClick={() => setExpandedImageUrl(image.geo_tagged_url || image.url)}
                                className="relative overflow-hidden rounded-[1rem] border border-emerald-200 bg-white text-left"
                              >
                                <img src={image.url} alt={image.name || 'Saved completion proof'} className="h-40 w-full object-cover" />
                                {image.geo?.latitude && image.geo?.longitude ? (
                                  <img src={buildMapPreviewDataUrl(image.geo)} alt="Map preview" className="absolute bottom-3 left-3 h-12 w-20 rounded-lg border border-white/30 object-cover shadow" />
                                ) : null}
                                <div className={`absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-semibold ${getGeoBadgeClassName(image.geo?.verification_status)}`}>
                                  {image.geo?.verification_label || 'Location Captured'}
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <Button
                      type="submit"
                      disabled={!canCompleteWork || !proofImages.length || !proofText.trim() || submittingComplete || processingProofs}
                      className="rounded-full"
                    >
                      {submittingComplete ? <Spinner label="Submitting..." /> : <><CheckCircle2 className="h-4 w-4" /> Submit Completion Record</>}
                    </Button>
                  </form>
                </>
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                  Select an assigned complaint from the left panel to continue.
                </div>
              )}

              {loading ? <StatListSkeleton count={3} className="mt-5" /> : null}
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog open={Boolean(expandedImageUrl)} onOpenChange={(open) => { if (!open) setExpandedImageUrl(''); }}>
        <DialogContent className="max-w-5xl">
          {expandedImageUrl ? <img src={expandedImageUrl} alt="Expanded geo proof" className="max-h-[80vh] w-full rounded-2xl object-contain" /> : null}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
