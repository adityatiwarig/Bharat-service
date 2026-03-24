'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { Camera, CameraOff, Crop, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { useIsMobile } from '@/hooks/use-mobile';

type CameraFacingMode = 'environment' | 'user';

type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type CropCandidate = {
  file: File;
  url: string;
};

const DEFAULT_CROP_RECT: CropRect = {
  x: 0.08,
  y: 0.08,
  width: 0.84,
  height: 0.84,
};

const MIN_CROP_SIZE = 0.2;
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getFileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function readImageSize(url: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error('Unable to read the selected image.'));
    image.src = url;
  });
}

async function cropImageFile(file: File, imageUrl: string, cropRect: CropRect) {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new Image();
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () => reject(new Error('Unable to process the selected image.'));
    nextImage.src = imageUrl;
  });

  const sourceX = Math.round(cropRect.x * image.naturalWidth);
  const sourceY = Math.round(cropRect.y * image.naturalHeight);
  const sourceWidth = Math.max(1, Math.round(cropRect.width * image.naturalWidth));
  const sourceHeight = Math.max(1, Math.round(cropRect.height * image.naturalHeight));

  const canvas = document.createElement('canvas');
  canvas.width = sourceWidth;
  canvas.height = sourceHeight;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to prepare the cropped image.');
  }

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    sourceWidth,
    sourceHeight,
  );

  const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const extension = outputType === 'image/png' ? 'png' : 'jpg';
  const baseName = file.name.replace(/\.[^.]+$/, '') || `complaint-photo-${Date.now()}`;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) => {
        if (!nextBlob) {
          reject(new Error('Unable to save the cropped image.'));
          return;
        }

        resolve(nextBlob);
      },
      outputType,
      outputType === 'image/png' ? undefined : 0.92,
    );
  });

  return new File([blob], `${baseName}-cropped.${extension}`, {
    type: outputType,
    lastModified: Date.now(),
  });
}

function PhotoThumbnail({
  file,
  active,
  onSelect,
}: {
  file: File;
  active: boolean;
  onSelect: () => void;
}) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`overflow-hidden rounded-xl border text-left transition ${
        active ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      {url ? <img src={url} alt={file.name} className="h-28 w-full object-cover" /> : null}
      <div className="space-y-1 px-3 py-2">
        <div className="truncate text-sm font-medium text-slate-900">{file.name}</div>
        <div className="text-xs text-slate-500">{formatBytes(file.size)}</div>
      </div>
    </button>
  );
}

export function CitizenComplaintPhotoPicker({
  value,
  onChange,
  maxFiles = 6,
  disabled = false,
}: {
  value: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [activePreviewUrl, setActivePreviewUrl] = useState('');
  const [pendingCropFiles, setPendingCropFiles] = useState<File[]>([]);
  const [cropCandidate, setCropCandidate] = useState<CropCandidate | null>(null);
  const [cropRect, setCropRect] = useState<CropRect>(DEFAULT_CROP_RECT);
  const [cropImageSize, setCropImageSize] = useState<{ width: number; height: number } | null>(null);
  const [cropProcessing, setCropProcessing] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraFacingMode, setCameraFacingMode] = useState<CameraFacingMode>('environment');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const rearCaptureInputRef = useRef<HTMLInputElement | null>(null);
  const frontCaptureInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cropStageRef = useRef<HTMLDivElement | null>(null);
  const cropDragRef = useRef<{
    mode: 'move' | 'resize';
    startX: number;
    startY: number;
    rect: CropRect;
  } | null>(null);

  const activeFile = value[activeIndex] || null;
  const remainingSlots = Math.max(0, maxFiles - value.length);
  const supportsLiveCamera = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
  const isMobile = useIsMobile();
  const cropQueueCount = pendingCropFiles.length + (cropCandidate ? 1 : 0);
  const cropSequenceIndex = pendingCropFiles.length ? 1 : 0;
  const primaryCaptureTitle = isMobile ? 'Capture Site Photograph' : 'Open Camera';
  const primaryCaptureDescription = isMobile
    ? 'Opens the device camera for issue-site photographs. On supported phones, the main lens is preferred automatically.'
    : 'Starts a live preview. If the device has only one camera, the available camera will be used automatically.';
  const secondaryCaptureTitle = isMobile ? 'Capture Front-Facing Photograph' : 'Switch Camera View';
  const secondaryCaptureDescription = isMobile
    ? 'Use this when a front-facing image is specifically required on mobile devices.'
    : 'Switches between available camera views where the device supports multiple lenses.';
  const galleryCaptureTitle = isMobile ? 'Choose Existing Photographs' : 'Upload Photographs';
  const galleryCaptureDescription = 'Select one or more existing images from the device. Each image is reviewed and cropped before attachment.';

  useEffect(() => {
    if (!activeFile) {
      setActivePreviewUrl('');
      return;
    }

    const previewUrl = URL.createObjectURL(activeFile);
    setActivePreviewUrl(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [activeFile]);

  useEffect(() => {
    if (!cropCandidate) {
      setCropImageSize(null);
      return;
    }

    let disposed = false;

    readImageSize(cropCandidate.url)
      .then((size) => {
        if (!disposed) {
          setCropImageSize(size);
        }
      })
      .catch((error) => {
        console.error('Unable to read crop image size', error);
        if (!disposed) {
          toast.error(error instanceof Error ? error.message : 'Unable to prepare the image crop.');
        }
      });

    return () => {
      disposed = true;
    };
  }, [cropCandidate]);

  useEffect(() => {
    return () => {
      if (cropCandidate) {
        URL.revokeObjectURL(cropCandidate.url);
      }
    };
  }, [cropCandidate]);

  useEffect(() => {
    if (!value.length) {
      setActiveIndex(0);
      return;
    }

    if (activeIndex >= value.length) {
      setActiveIndex(value.length - 1);
    }
  }, [activeIndex, value]);

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !cameraStreamRef.current) {
      return;
    }

    const video = videoRef.current;
    video.srcObject = cameraStreamRef.current;
    video.muted = true;
    video.playsInline = true;
    void video.play().catch((error) => {
      console.error('Unable to play citizen camera preview', error);
      setCameraError('Unable to start the live camera preview on this device.');
    });
  }, [cameraOpen]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!cropDragRef.current || !cropStageRef.current) {
        return;
      }

      const bounds = cropStageRef.current.getBoundingClientRect();

      if (!bounds.width || !bounds.height) {
        return;
      }

      const deltaX = (event.clientX - cropDragRef.current.startX) / bounds.width;
      const deltaY = (event.clientY - cropDragRef.current.startY) / bounds.height;
      const currentDrag = cropDragRef.current;

      if (currentDrag.mode === 'move') {
        const nextX = clamp(currentDrag.rect.x + deltaX, 0, 1 - currentDrag.rect.width);
        const nextY = clamp(currentDrag.rect.y + deltaY, 0, 1 - currentDrag.rect.height);
        setCropRect((current) => ({ ...current, x: nextX, y: nextY }));
        return;
      }

      const nextWidth = clamp(currentDrag.rect.width + deltaX, MIN_CROP_SIZE, 1 - currentDrag.rect.x);
      const nextHeight = clamp(currentDrag.rect.height + deltaY, MIN_CROP_SIZE, 1 - currentDrag.rect.y);
      setCropRect((current) => ({ ...current, width: nextWidth, height: nextHeight }));
    };

    const handlePointerUp = () => {
      cropDragRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  useEffect(() => {
    if (cropCandidate || !pendingCropFiles.length) {
      return;
    }

    const [nextFile, ...remaining] = pendingCropFiles;
    setPendingCropFiles(remaining);
    setCropRect(DEFAULT_CROP_RECT);
    setCropCandidate({
      file: nextFile,
      url: URL.createObjectURL(nextFile),
    });
  }, [cropCandidate, pendingCropFiles]);

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
  }

  function clearCropCandidate() {
    if (cropCandidate) {
      URL.revokeObjectURL(cropCandidate.url);
    }

    setCropCandidate(null);
    setCropRect(DEFAULT_CROP_RECT);
    setCropImageSize(null);
    setCropProcessing(false);
  }

  function appendSelectedFile(file: File) {
    const nextFiles = [...value, file].slice(0, maxFiles);
    onChange(nextFiles);
    setActiveIndex(nextFiles.length - 1);
  }

  function queueFilesForCropping(incomingFiles: File[]) {
    if (!incomingFiles.length) {
      return;
    }

    const knownKeys = new Set([
      ...value.map(getFileKey),
      ...pendingCropFiles.map(getFileKey),
      ...(cropCandidate ? [getFileKey(cropCandidate.file)] : []),
    ]);

    const validImages = incomingFiles.filter((file) => file.type.startsWith('image/') && file.size > 0);
    const oversized = validImages.find((file) => file.size > MAX_IMAGE_SIZE_BYTES);

    if (oversized) {
      toast.error(`"${oversized.name}" exceeds the permitted size. Please use images up to 8 MB each.`);
      return;
    }

    const deduped = validImages.filter((file) => !knownKeys.has(getFileKey(file)));

    if (!deduped.length) {
      toast.error('The selected photographs are already present in the submission list.');
      return;
    }

    const availableSlots = maxFiles - value.length - pendingCropFiles.length - (cropCandidate ? 1 : 0);

    if (availableSlots <= 0) {
      toast.error(`A maximum of ${maxFiles} complaint photographs may be attached with one submission.`);
      return;
    }

    const acceptedFiles = deduped.slice(0, availableSlots);

    if (acceptedFiles.length < deduped.length) {
      toast.error(`Only ${maxFiles} complaint photographs may be attached with one submission.`);
    }

    setPendingCropFiles((current) => [...current, ...acceptedFiles]);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    queueFilesForCropping(Array.from(event.target.files || []));
    event.target.value = '';
  }

  function removeSelectedFile(index: number) {
    const nextFiles = value.filter((_, currentIndex) => currentIndex !== index);
    onChange(nextFiles);
    setActiveIndex((current) => Math.max(0, current > index ? current - 1 : current));
  }

  async function openLiveCamera(facingMode: CameraFacingMode) {
    if (!supportsLiveCamera) {
      setCameraError('Direct camera preview is not available in this browser. Please use device capture or select existing photographs.');
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
      setCameraReady(false);
    } catch (error) {
      console.error('Unable to open citizen camera', error);
      setCameraError('Camera access could not be started. Please allow camera permission or use another submission option.');
    }
  }

  function captureLivePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !cameraReady) {
      setCameraError('The live camera preview is not ready yet. Please wait a moment and try again.');
      return;
    }

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const context = canvas.getContext('2d');

    if (!context) {
      setCameraError('Unable to capture the current camera frame.');
      return;
    }

    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError('Unable to capture the photograph. Please try again.');
          return;
        }

        queueFilesForCropping([
          new File([blob], `complaint-photo-${Date.now()}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          }),
        ]);
      },
      'image/jpeg',
      0.92,
    );
  }

  function startCropDrag(mode: 'move' | 'resize', event: ReactPointerEvent<HTMLButtonElement>) {
    if (!cropStageRef.current) {
      return;
    }

    cropDragRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      rect: cropRect,
    };
  }

  async function confirmCrop() {
    if (!cropCandidate || cropProcessing) {
      return;
    }

    setCropProcessing(true);

    try {
      const croppedFile = await cropImageFile(cropCandidate.file, cropCandidate.url, cropRect);
      appendSelectedFile(croppedFile);
      toast.success('Photograph reviewed and attached successfully.');
      clearCropCandidate();
    } catch (error) {
      console.error('Unable to crop complaint photograph', error);
      setCropProcessing(false);
      toast.error(error instanceof Error ? error.message : 'Unable to crop the selected photograph.');
    }
  }

  function skipCurrentCrop() {
    clearCropCandidate();
  }

  const cropAreaStyle = useMemo(
    () => ({
      left: `${cropRect.x * 100}%`,
      top: `${cropRect.y * 100}%`,
      width: `${cropRect.width * 100}%`,
      height: `${cropRect.height * 100}%`,
    }),
    [cropRect],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-[1.2rem] border border-[#d7e4f1] bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_100%)] p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#47627d]">Photographic Evidence</div>
            <div className="mt-2 text-lg font-semibold text-[#12385b]">Issue Photographs For Complaint Registration</div>
            <div className="mt-2 max-w-3xl text-sm leading-6 text-[#536b82]">
              Attach clear photographs of the issue location. The portal supports mobile phones, tablets, and laptops. Where a device provides only one camera, the available camera will be used automatically.
            </div>
          </div>
          <div className="min-w-[13rem] rounded-xl border border-[#d7e4f1] bg-white px-4 py-3 text-sm text-[#536b82]">
            <div className="font-semibold text-[#12385b]">Submission Status</div>
            <div className="mt-2">{value.length} attached</div>
            <div className="mt-1">{remainingSlots} remaining</div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <button
          type="button"
          className="rounded-[1.15rem] border border-[#cfe0ef] bg-white p-4 text-left transition hover:border-[#8cb4d8] hover:bg-[#f9fcff] disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => (isMobile ? rearCaptureInputRef.current?.click() : void openLiveCamera('environment'))}
          disabled={disabled || value.length >= maxFiles}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eef6fb] text-[#0b3c5d]">
            <Camera className="h-5 w-5" />
          </div>
          <div className="mt-4 text-sm font-semibold text-[#12385b]">{primaryCaptureTitle}</div>
          <div className="mt-2 text-sm leading-6 text-[#5a7288]">{primaryCaptureDescription}</div>
        </button>

        <button
          type="button"
          className="rounded-[1.15rem] border border-[#cfe0ef] bg-white p-4 text-left transition hover:border-[#8cb4d8] hover:bg-[#f9fcff] disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => (isMobile ? frontCaptureInputRef.current?.click() : void openLiveCamera('user'))}
          disabled={disabled || value.length >= maxFiles}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eef6fb] text-[#0b3c5d]">
            <Camera className="h-5 w-5" />
          </div>
          <div className="mt-4 text-sm font-semibold text-[#12385b]">{secondaryCaptureTitle}</div>
          <div className="mt-2 text-sm leading-6 text-[#5a7288]">{secondaryCaptureDescription}</div>
        </button>

        <button
          type="button"
          className="rounded-[1.15rem] border border-[#cfe0ef] bg-white p-4 text-left transition hover:border-[#8cb4d8] hover:bg-[#f9fcff] disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => galleryInputRef.current?.click()}
          disabled={disabled || value.length >= maxFiles}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eef6fb] text-[#0b3c5d]">
            <Upload className="h-5 w-5" />
          </div>
          <div className="mt-4 text-sm font-semibold text-[#12385b]">{galleryCaptureTitle}</div>
          <div className="mt-2 text-sm leading-6 text-[#5a7288]">{galleryCaptureDescription}</div>
        </button>
      </div>

      <input ref={rearCaptureInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleInputChange} />
      <input ref={frontCaptureInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleInputChange} />
      <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleInputChange} />

      <div className="rounded-xl border border-[#dfe8f1] bg-[#fbfdff] px-4 py-4 text-sm text-[#536b82]">
        <div className="font-semibold text-[#12385b]">Submission Guidance</div>
        <div className="mt-2 leading-6">
          At least one photograph is mandatory. Up to {maxFiles} images may be attached, image files only, maximum 8 MB per file. After each capture or file selection, the image opens in review mode and is attached automatically once crop confirmation is completed.
        </div>
        {cropQueueCount ? (
          <div className="mt-3 rounded-lg border border-[#d7e4f1] bg-white px-3 py-2 text-xs font-medium text-[#12385b]">
            {cropQueueCount} photograph{cropQueueCount > 1 ? 's are' : ' is'} awaiting review and crop confirmation.
          </div>
        ) : null}
      </div>

      {cameraOpen ? (
        <div className="space-y-4 rounded-[1.2rem] border border-[#cfe0ef] bg-[linear-gradient(180deg,#f5fbff_0%,#ffffff_100%)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[#12385b]">Camera Preview</div>
              <div className="mt-1 text-sm text-[#5a7288]">
                {cameraFacingMode === 'environment'
                  ? 'Standard capture view is active. If the device exposes one camera only, the same camera will continue to be used.'
                  : 'Alternate capture view is active. If no alternate lens is available, the device default camera may remain active.'}
              </div>
            </div>
            <Button type="button" variant="outline" className="border-[#c7d7e6] bg-white text-[#12385b]" onClick={stopCameraStream}>
              <CameraOff className="h-4 w-4" />
              Close Preview
            </Button>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" className="border-[#c7d7e6] bg-white text-[#12385b]" onClick={() => void openLiveCamera('environment')}>
              Standard View
            </Button>
            <Button type="button" variant="outline" className="border-[#c7d7e6] bg-white text-[#12385b]" onClick={() => void openLiveCamera('user')}>
              Alternate View
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
            <video
              ref={videoRef}
              className="max-h-[28rem] w-full object-cover"
              autoPlay
              muted
              playsInline
              onLoadedMetadata={() => setCameraReady(true)}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" className="bg-[#0b5cab] text-white hover:bg-[#094f96]" disabled={!cameraReady || value.length >= maxFiles} onClick={captureLivePhoto}>
              <Camera className="h-4 w-4" />
              Capture Photograph
            </Button>
            <Button type="button" variant="outline" className="border-[#c7d7e6] bg-white text-[#12385b]" onClick={stopCameraStream}>
              Exit Preview
            </Button>
          </div>
        </div>
      ) : null}

      {cameraError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {cameraError}
        </div>
      ) : null}

      <canvas ref={canvasRef} className="hidden" />

      {value.length ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {value.length} photograph{value.length > 1 ? 's are' : ' is'} approved and ready for complaint submission.
        </div>
      ) : null}

      {value.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {value.map((file, index) => (
            <PhotoThumbnail
              key={`${file.name}-${file.lastModified}-${index}`}
              file={file}
              active={index === activeIndex}
              onSelect={() => setActiveIndex(index)}
            />
          ))}
        </div>
      ) : null}

      {activePreviewUrl ? (
        <div className="rounded-[1.2rem] border border-[#dfe8f1] bg-[#fbfdff] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[#12385b]">Review Selected Photograph</div>
              <div className="mt-1 text-xs text-[#5a7288]">This image will be uploaded with the complaint and preserved in the official complaint record.</div>
            </div>
            <Button type="button" variant="outline" size="sm" className="border-[#c7d7e6] bg-white text-[#12385b]" onClick={() => removeSelectedFile(activeIndex)} disabled={disabled}>
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          </div>
          <img src={activePreviewUrl} alt="Selected complaint photograph" className="max-h-96 rounded-xl object-cover" />
        </div>
      ) : null}

      <Dialog open={Boolean(cropCandidate)}>
        <DialogContent className="max-h-[95vh] max-w-4xl overflow-y-auto" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Crop Complaint Photo</DialogTitle>
            <DialogDescription>
              Adjust the frame for a clear issue reference. Once confirmed, the photograph will be attached to the complaint automatically.
            </DialogDescription>
          </DialogHeader>

          {cropCandidate ? (
            <div className="space-y-5">
              <div className="rounded-lg border border-[#d7e4f1] bg-[#f7fbff] px-4 py-3 text-sm text-[#536b82]">
                <div className="font-semibold text-[#12385b]">Review Queue</div>
                <div className="mt-1">
                  {cropSequenceIndex + 1} of {cropQueueCount} photograph{cropQueueCount > 1 ? 's' : ''} in review.
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div ref={cropStageRef} className="relative mx-auto w-fit max-w-full overflow-hidden rounded-lg">
                  <img
                    src={cropCandidate.url}
                    alt="Complaint photograph crop preview"
                    className="max-h-[65vh] max-w-full select-none rounded-lg"
                    draggable={false}
                  />

                  <div className="absolute inset-0">
                    <div
                      className="absolute bg-black/45"
                      style={{
                        left: 0,
                        top: 0,
                        width: '100%',
                        height: `${cropRect.y * 100}%`,
                      }}
                    />
                    <div
                      className="absolute bg-black/45"
                      style={{
                        left: 0,
                        top: `${cropRect.y * 100}%`,
                        width: `${cropRect.x * 100}%`,
                        height: `${cropRect.height * 100}%`,
                      }}
                    />
                    <div
                      className="absolute bg-black/45"
                      style={{
                        left: `${(cropRect.x + cropRect.width) * 100}%`,
                        top: `${cropRect.y * 100}%`,
                        width: `${(1 - cropRect.x - cropRect.width) * 100}%`,
                        height: `${cropRect.height * 100}%`,
                      }}
                    />
                    <div
                      className="absolute bg-black/45"
                      style={{
                        left: 0,
                        top: `${(cropRect.y + cropRect.height) * 100}%`,
                        width: '100%',
                        height: `${(1 - cropRect.y - cropRect.height) * 100}%`,
                      }}
                    />

                    <div className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0)]" style={cropAreaStyle}>
                      <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                        {Array.from({ length: 9 }, (_, index) => (
                          <div key={index} className="border border-white/30" />
                        ))}
                      </div>
                      <button
                        type="button"
                        className="absolute inset-0 cursor-move"
                        onPointerDown={(event) => startCropDrag('move', event)}
                        aria-label="Move crop frame"
                      />
                      <button
                        type="button"
                        className="absolute -bottom-3 -right-3 h-6 w-6 rounded-full border border-slate-200 bg-white shadow"
                        onPointerDown={(event) => startCropDrag('resize', event)}
                        aria-label="Resize crop frame"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
                  <div className="text-sm font-semibold text-slate-900">Crop Width</div>
                  <div className="mt-3">
                    <Slider
                      min={Math.round(MIN_CROP_SIZE * 100)}
                      max={Math.round((1 - cropRect.x) * 100)}
                      value={[Math.round(cropRect.width * 100)]}
                      onValueChange={([nextWidth]) => {
                        setCropRect((current) => ({
                          ...current,
                          width: clamp(nextWidth / 100, MIN_CROP_SIZE, 1 - current.x),
                        }));
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
                  <div className="text-sm font-semibold text-slate-900">Crop Height</div>
                  <div className="mt-3">
                    <Slider
                      min={Math.round(MIN_CROP_SIZE * 100)}
                      max={Math.round((1 - cropRect.y) * 100)}
                      value={[Math.round(cropRect.height * 100)]}
                      onValueChange={([nextHeight]) => {
                        setCropRect((current) => ({
                          ...current,
                          height: clamp(nextHeight / 100, MIN_CROP_SIZE, 1 - current.y),
                        }));
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                <div className="font-medium text-slate-900">Review details</div>
                <div className="mt-1">
                  Original image: {cropImageSize ? `${cropImageSize.width} x ${cropImageSize.height}px` : 'Preparing image...'}
                </div>
                <div className="mt-1">
                  Selected area: {Math.round(cropRect.width * 100)}% width x {Math.round(cropRect.height * 100)}% height
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={skipCurrentCrop} disabled={cropProcessing}>
              Skip This Photograph
            </Button>
            <Button type="button" variant="outline" onClick={() => setCropRect(DEFAULT_CROP_RECT)} disabled={cropProcessing}>
              Reset Frame
            </Button>
            <Button type="button" onClick={() => void confirmCrop()} disabled={!cropCandidate || cropProcessing}>
              <Crop className="h-4 w-4" />
              {cropProcessing ? 'Attaching...' : 'Confirm And Attach'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
