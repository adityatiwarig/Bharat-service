'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Mic,
  RotateCcw,
  Sparkles,
  Square,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { GrievanceCategoryOption, GrievanceDepartmentOption, GrievanceMappingResponse } from '@/lib/types';

type VoiceCategoryId =
  | 'garbage_sanitation'
  | 'water_supply'
  | 'road_potholes'
  | 'electricity'
  | 'drainage_sewage';

type DetectionConfidence = 'low' | 'medium' | 'high';
type DecisionState = 'pending' | 'apply' | 'skip';
type WardSuggestionSource = 'speech' | 'account';
type ZoneSuggestionSource = 'speech' | 'ward' | 'account';

type SpeechRecognitionAlternativeLike = { transcript: string };
type SpeechRecognitionResultLike = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
};
type SpeechRecognitionResultEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type ApplyOptions = { submitAfterFill?: boolean };

type VoiceCategoryOption = {
  id: VoiceCategoryId;
  label: string;
  transcriptHints: string[];
  strongTranscriptHints: string[];
  mappingHints: string[];
};

type MappingSuggestion = {
  departmentId: string;
  departmentName: string;
  categoryId: string;
  categoryName: string;
};

type WardSuggestion = {
  wardId: string;
  wardName: string;
  zoneId: string;
  zoneName: string;
  source: WardSuggestionSource;
};

type ZoneSuggestion = {
  zoneId: string;
  zoneName: string;
  source: ZoneSuggestionSource;
};

type ApplicantGender = 'male' | 'female' | 'other';

type VoiceAnalysis = {
  detectedCategoryId: VoiceCategoryId | null;
  confidence: DetectionConfidence;
  genderSuggestion: ApplicantGender | null;
  zoneSuggestion: ZoneSuggestion | null;
  wardSuggestion: WardSuggestion | null;
};

export type VoiceAssistantFillPayload = {
  department_id: string;
  category_id: string;
  title: string;
  text: string;
  applicant_gender?: ApplicantGender;
  zone_id?: string;
  ward_id?: string;
  street_address?: string;
  latitude?: string;
  longitude?: string;
};

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'at',
  'be',
  'by',
  'for',
  'from',
  'has',
  'have',
  'in',
  'is',
  'it',
  'me',
  'near',
  'of',
  'on',
  'or',
  'our',
  'please',
  'the',
  'there',
  'this',
  'to',
  'we',
  'with',
]);

const GENDER_LABELS: Record<ApplicantGender, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
};

const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
};

const VOICE_CATEGORY_OPTIONS: VoiceCategoryOption[] = [
  {
    id: 'garbage_sanitation',
    label: 'Garbage / Sanitation',
    strongTranscriptHints: ['garbage', 'kachra', 'dustbin', 'gandagi', 'safai', 'sweeping', 'trash', 'waste'],
    transcriptHints: ['dirty', 'cleaning', 'dump', 'litter', 'public toilet', 'toilet', 'dead animal', 'non sanitary', 'debris'],
    mappingHints: ['garbage', 'sanitation', 'sanitary', 'sweeping', 'dustbin', 'toilet', 'waste', 'debris', 'dead animal', 'cleaned'],
  },
  {
    id: 'water_supply',
    label: 'Water Supply',
    strongTranscriptHints: ['water supply', 'no water', 'pani nahi', 'pani', 'water leakage', 'pipeline', 'tap water'],
    transcriptHints: ['jal', 'leakage', 'water line', 'drinking water', 'pipe', 'seepage', 'low pressure', 'tanker'],
    mappingHints: ['water', 'supply', 'pipeline', 'tap', 'tubewell', 'jal', 'leak'],
  },
  {
    id: 'road_potholes',
    label: 'Road / Potholes',
    strongTranscriptHints: ['pothole', 'gadda', 'road broken', 'sadak', 'footpath', 'road damage'],
    transcriptHints: ['resurfacing', 'speed breaker', 'manhole cover', 'street damaged', 'road repair', 'broken road', 'pathway'],
    mappingHints: ['road', 'pothole', 'footpath', 'resurfacing', 'speed breaker', 'manhole cover', 'street', 'repair'],
  },
  {
    id: 'electricity',
    label: 'Electricity',
    strongTranscriptHints: ['electricity', 'bijli', 'street light', 'light not working', 'power', 'pole light'],
    transcriptHints: ['electric', 'high mast', 'tube light', 'dark road', 'wire', 'electrical', 'light'],
    mappingHints: ['electric', 'electricity', 'light', 'street light', 'high mast', 'tube light', 'electrical'],
  },
  {
    id: 'drainage_sewage',
    label: 'Drainage / Sewage',
    strongTranscriptHints: ['drain', 'naali', 'nala', 'sewer', 'sewage', 'gutter', 'overflow'],
    transcriptHints: ['blockage', 'storm water', 'manhole', 'stagnant water', 'dirty water', 'drainage', 'choked drain'],
    mappingHints: ['drain', 'drainage', 'sewer', 'sewage', 'storm water', 'overflow', 'stagnant water', 'manhole', 'gutter', 'nala'],
  },
];

function replaceNumberWords(value: string) {
  const tokens = value.toLowerCase().split(/\s+/);
  const output: string[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const cleaned = tokens[index].replace(/[^a-z]/g, '');
    const currentNumber = NUMBER_WORDS[cleaned];

    if (currentNumber === undefined) {
      output.push(tokens[index]);
      continue;
    }

    const nextCleaned = tokens[index + 1]?.replace(/[^a-z]/g, '') || '';
    const nextNumber = NUMBER_WORDS[nextCleaned];

    if (currentNumber >= 20 && currentNumber % 10 === 0 && nextNumber !== undefined && nextNumber < 10) {
      output.push(String(currentNumber + nextNumber));
      index += 1;
      continue;
    }

    output.push(String(currentNumber));
  }

  return output.join(' ');
}

function normalizeText(value: string) {
  return replaceNumberWords(value.toLowerCase()).replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token && token.length > 1 && !STOP_WORDS.has(token));
}

function hasPhrase(text: string, phrase: string) {
  const normalizedPhrase = normalizeText(phrase);
  return normalizedPhrase ? text.includes(normalizedPhrase) : false;
}

function uniqueTokenOverlap(left: string, right: string) {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));
  let score = 0;

  rightTokens.forEach((token) => {
    if (leftTokens.has(token)) {
      score += 1;
    }
  });

  return score;
}

function getSpeechRecognitionConstructor() {
  if (typeof window === 'undefined') {
    return null;
  }

  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return speechWindow.webkitSpeechRecognition || speechWindow.SpeechRecognition || null;
}

function getVoiceCategoryOption(categoryId: VoiceCategoryId | null) {
  return VOICE_CATEGORY_OPTIONS.find((option) => option.id === categoryId) || null;
}

function joinTranscriptParts(...parts: string[]) {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapSpeechErrorToMessage(errorCode?: string) {
  switch (errorCode) {
    case 'audio-capture':
      return 'Microphone access is unavailable on this device.';
    case 'not-allowed':
      return 'Microphone permission was blocked. Please allow microphone access and try again.';
    case 'no-speech':
      return 'No speech was detected. Try speaking a little closer to the mic.';
    case 'network':
      return 'Speech recognition hit a browser network issue. You can still type the complaint below.';
    default:
      return 'Unable to start voice capture right now. You can still type the complaint below.';
  }
}

function estimatePitchFromBuffer(buffer: Float32Array, sampleRate: number) {
  const size = buffer.length;
  let rms = 0;

  for (let index = 0; index < size; index += 1) {
    const sample = buffer[index];
    rms += sample * sample;
  }

  rms = Math.sqrt(rms / size);

  if (rms < 0.01) {
    return null;
  }

  let bestOffset = -1;
  let bestCorrelation = 0;
  const minOffset = Math.floor(sampleRate / 260);
  const maxOffset = Math.floor(sampleRate / 85);

  for (let offset = minOffset; offset <= maxOffset; offset += 1) {
    let correlation = 0;

    for (let index = 0; index < size - offset; index += 1) {
      correlation += 1 - Math.abs(buffer[index] - buffer[index + offset]);
    }

    correlation /= size - offset;

    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestOffset = offset;
    }
  }

  if (bestOffset === -1 || bestCorrelation < 0.88) {
    return null;
  }

  return sampleRate / bestOffset;
}

function guessGenderFromPitch(pitchSamples: number[]): ApplicantGender | null {
  if (!pitchSamples.length) {
    return null;
  }

  const averagePitch = pitchSamples.reduce((sum, pitch) => sum + pitch, 0) / pitchSamples.length;

  if (averagePitch >= 170) {
    return 'female';
  }

  if (averagePitch > 0 && averagePitch <= 155) {
    return 'male';
  }

  return null;
}

function formatComplaintDescription(transcript: string) {
  const normalized = transcript.replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return '';
  }

  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .map((sentence) => `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}`);

  if (sentences.length) {
    return sentences.join(' ');
  }

  const capitalized = `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

function detectVoiceCategory(transcript: string) {
  const normalizedTranscript = normalizeText(transcript);

  if (!normalizedTranscript) {
    return { detectedCategoryId: null, confidence: 'low' as DetectionConfidence };
  }

  const scored = VOICE_CATEGORY_OPTIONS.map((option) => {
    let score = 0;

    option.strongTranscriptHints.forEach((hint) => {
      if (hasPhrase(normalizedTranscript, hint)) {
        score += 6;
      }
    });

    option.transcriptHints.forEach((hint) => {
      if (hasPhrase(normalizedTranscript, hint)) {
        score += hint.includes(' ') ? 4 : 2;
      }
    });

    score += uniqueTokenOverlap(normalizedTranscript, option.strongTranscriptHints.join(' '));
    score += uniqueTokenOverlap(normalizedTranscript, option.transcriptHints.join(' '));

    return { id: option.id, score };
  }).sort((left, right) => right.score - left.score);

  const best = scored[0];
  const second = scored[1];

  if (!best || best.score <= 0) {
    return { detectedCategoryId: null, confidence: 'low' as DetectionConfidence };
  }

  const confidence: DetectionConfidence =
    best.score >= 10 && best.score >= (second?.score || 0) + 3 ? 'high' : best.score >= 5 ? 'medium' : 'low';

  return {
    detectedCategoryId: best.id,
    confidence,
  };
}

function buildMappingSuggestion(category: GrievanceCategoryOption, department: GrievanceDepartmentOption | undefined) {
  if (!department) {
    return null;
  }

  return {
    departmentId: String(department.id),
    departmentName: department.name,
    categoryId: String(category.id),
    categoryName: category.name,
  } satisfies MappingSuggestion;
}

function resolveMappingSuggestion(mapping: GrievanceMappingResponse | null, transcript: string, categoryId: VoiceCategoryId | null) {
  if (!mapping || !categoryId) {
    return null;
  }

  const voiceCategory = getVoiceCategoryOption(categoryId);

  if (!voiceCategory) {
    return null;
  }

  const normalizedTranscript = normalizeText(transcript);
  const departmentById = new Map(mapping.departments.map((department) => [department.id, department]));
  const scoredCategories = mapping.categories
    .map((category) => {
      const department = departmentById.get(category.department_id);
      const combined = normalizeText(`${department?.name || ''} ${category.name}`);
      let score = 0;
      let preferredMatch = false;

      voiceCategory.mappingHints.forEach((hint) => {
        if (hasPhrase(combined, hint)) {
          score += hint.includes(' ') ? 5 : 3;
          preferredMatch = true;
        }
      });

      if (normalizedTranscript) {
        if (hasPhrase(normalizedTranscript, category.name)) {
          score += 10;
        }

        if (department?.name && hasPhrase(normalizedTranscript, department.name)) {
          score += 5;
        }

        score += uniqueTokenOverlap(normalizedTranscript, category.name) * 3;
        score += uniqueTokenOverlap(normalizedTranscript, department?.name || '') * 2;
      }

      return {
        score,
        preferredMatch,
        suggestion: buildMappingSuggestion(category, department),
      };
    })
    .filter((entry) => entry.suggestion);

  const preferredPool = scoredCategories.filter((entry) => entry.preferredMatch);
  const rankedPool = (preferredPool.length ? preferredPool : scoredCategories).sort((left, right) => right.score - left.score);
  const best = rankedPool[0]?.suggestion || null;

  if (best) {
    return best;
  }

  const fallbackDepartment = mapping.departments.find((department) =>
    voiceCategory.mappingHints.some((hint) => hasPhrase(normalizeText(department.name), hint)),
  );

  if (!fallbackDepartment) {
    return null;
  }

  const fallbackCategory = mapping.categories.find((category) => category.department_id === fallbackDepartment.id) || mapping.categories[0];
  return fallbackCategory ? buildMappingSuggestion(fallbackCategory, fallbackDepartment) : null;
}

function resolveBestMappingSuggestion(mapping: GrievanceMappingResponse | null, transcript: string) {
  if (!mapping) {
    return null;
  }

  const normalizedTranscript = normalizeText(transcript);

  if (!normalizedTranscript) {
    return null;
  }

  const departmentById = new Map(mapping.departments.map((department) => [department.id, department]));
  const ranked = mapping.categories
    .map((category) => {
      const department = departmentById.get(category.department_id);

      if (!department) {
        return null;
      }

      const combined = normalizeText(`${department.name} ${category.name}`);
      let score = uniqueTokenOverlap(normalizedTranscript, combined) * 3;
      let matchedCategory: VoiceCategoryId | null = null;

      if (hasPhrase(normalizedTranscript, category.name)) {
        score += 12;
      }

      if (hasPhrase(normalizedTranscript, department.name)) {
        score += 6;
      }

      VOICE_CATEGORY_OPTIONS.forEach((option) => {
        let optionScore = 0;

        option.strongTranscriptHints.forEach((hint) => {
          if (hasPhrase(normalizedTranscript, hint) && option.mappingHints.some((mappingHint) => hasPhrase(combined, mappingHint))) {
            optionScore += 6;
          }
        });

        option.transcriptHints.forEach((hint) => {
          if (hasPhrase(normalizedTranscript, hint) && option.mappingHints.some((mappingHint) => hasPhrase(combined, mappingHint))) {
            optionScore += 3;
          }
        });

        if (optionScore > 0 && optionScore >= score) {
          matchedCategory = option.id;
        }

        score += optionScore;
      });

      return {
        score,
        voiceCategoryId: matchedCategory,
        suggestion: buildMappingSuggestion(category, department),
      };
    })
    .filter((entry) => Boolean(entry?.suggestion))
    .map((entry) => entry as { score: number; voiceCategoryId: VoiceCategoryId | null; suggestion: MappingSuggestion })
    .sort((left, right) => right.score - left.score);

  const best = ranked[0];
  return best && best.score > 0 ? best : null;
}

function extractWardNumber(transcript: string) {
  const wardMatch = transcript.match(/\bward(?:\s+number)?\s+(\d{1,3})\b/i);
  return wardMatch?.[1] || null;
}

function extractZoneHint(transcript: string) {
  const zoneMatch = transcript.match(/\bzone\s+([a-z0-9 -]{2,40})/i);
  return zoneMatch?.[1]?.trim() || null;
}

function findBestZoneMatch(mapping: GrievanceMappingResponse | null, transcript: string) {
  if (!mapping) {
    return null;
  }

  const normalizedTranscript = normalizeText(transcript);
  const hintedZone = extractZoneHint(transcript);
  const candidateText = hintedZone ? normalizeText(hintedZone) : normalizedTranscript;

  if (!candidateText) {
    return null;
  }

  const directMatch = [...mapping.zones]
    .sort((left, right) => right.name.length - left.name.length)
    .find((zone) => hasPhrase(candidateText, zone.name) || hasPhrase(normalizedTranscript, zone.name));

  if (directMatch) {
    return directMatch;
  }

  const scoredZone = mapping.zones
    .map((zone) => ({
      zone,
      score: uniqueTokenOverlap(candidateText, zone.name) * 2 + uniqueTokenOverlap(normalizedTranscript, zone.name),
    }))
    .sort((left, right) => right.score - left.score)[0];

  return scoredZone && scoredZone.score >= 2 ? scoredZone.zone : null;
}

function findBestWardMatch(mapping: GrievanceMappingResponse | null, transcript: string, zoneId?: number | null) {
  if (!mapping) {
    return null;
  }

  const normalizedTranscript = normalizeText(transcript);
  const spokenWardNumber = extractWardNumber(transcript);
  const wardPool = zoneId ? mapping.wards.filter((ward) => ward.zone_id === zoneId) : mapping.wards;

  if (spokenWardNumber) {
    const numberedWard = wardPool.find((ward) => new RegExp(`(^|[^0-9])${spokenWardNumber}([^0-9]|$)`, 'i').test(ward.name));
    if (numberedWard) {
      return numberedWard;
    }
  }

  const directWardMatch = [...wardPool]
    .sort((left, right) => right.name.length - left.name.length)
    .find((ward) => hasPhrase(normalizedTranscript, ward.name));

  if (directWardMatch) {
    return directWardMatch;
  }

  const scoredWard = wardPool
    .map((ward) => ({
      ward,
      score: uniqueTokenOverlap(normalizedTranscript, ward.name),
    }))
    .sort((left, right) => right.score - left.score)[0];

  return scoredWard && scoredWard.score >= 2 ? scoredWard.ward : null;
}

function detectGenderFromTranscript(transcript: string): ApplicantGender | null {
  const normalizedTranscript = normalizeText(transcript);

  const femalePatterns = [
    /\bi am (a )?(woman|female|lady|girl)\b/,
    /\bmain (ek )?(mahila|ladki|aurat) (hu|hoon)\b/,
  ];
  const malePatterns = [
    /\bi am (a )?(man|male|gentleman|boy)\b/,
    /\bmain (ek )?(aadmi|mard|ladka) (hu|hoon)\b/,
  ];

  if (femalePatterns.some((pattern) => pattern.test(normalizedTranscript))) {
    return 'female';
  }

  if (malePatterns.some((pattern) => pattern.test(normalizedTranscript))) {
    return 'male';
  }

  return null;
}

function resolveZoneSuggestion(mapping: GrievanceMappingResponse | null, transcript: string, wardSuggestion: WardSuggestion | null) {
  if (!mapping) {
    return null;
  }

  if (wardSuggestion) {
    return {
      zoneId: wardSuggestion.zoneId,
      zoneName: wardSuggestion.zoneName,
      source: wardSuggestion.source === 'speech' ? 'ward' : 'account',
    } satisfies ZoneSuggestion;
  }

  const matchedZone = findBestZoneMatch(mapping, transcript);

  if (matchedZone) {
    return {
      zoneId: String(matchedZone.id),
      zoneName: matchedZone.name,
      source: 'speech',
    } satisfies ZoneSuggestion;
  }

  return null;
}

function resolveWardSuggestion(mapping: GrievanceMappingResponse | null, transcript: string, userWardId?: number | null) {
  if (!mapping) {
    return null;
  }

  const bestZone = findBestZoneMatch(mapping, transcript);
  const matchedWard = findBestWardMatch(mapping, transcript, bestZone?.id);

  if (matchedWard && matchedWard.zone_id) {
    const zone = mapping.zones.find((item) => item.id === matchedWard.zone_id);

    if (zone) {
      return {
        wardId: String(matchedWard.id),
        wardName: matchedWard.name,
        zoneId: String(zone.id),
        zoneName: zone.name,
        source: 'speech',
      } satisfies WardSuggestion;
    }
  }

  if (!userWardId) {
    return null;
  }

  const userWard = mapping.wards.find((ward) => ward.id === userWardId);

  if (!userWard || !userWard.zone_id) {
    return null;
  }

  const zone = mapping.zones.find((item) => item.id === userWard.zone_id);

  if (!zone) {
    return null;
  }

  return {
    wardId: String(userWard.id),
    wardName: userWard.name,
    zoneId: String(zone.id),
    zoneName: zone.name,
    source: 'account',
  } satisfies WardSuggestion;
}

function analyzeVoiceComplaint(transcript: string, mapping: GrievanceMappingResponse | null, userWardId?: number | null) {
  const categoryDetection = detectVoiceCategory(transcript);
  const wardSuggestion = resolveWardSuggestion(mapping, transcript, userWardId);

  return {
    detectedCategoryId: categoryDetection.detectedCategoryId,
    confidence: categoryDetection.confidence,
    genderSuggestion: detectGenderFromTranscript(transcript),
    zoneSuggestion: resolveZoneSuggestion(mapping, transcript, wardSuggestion),
    wardSuggestion,
  } satisfies VoiceAnalysis;
}

function createComplaintTitle(transcript: string, fallbackLabel: string) {
  const normalized = formatComplaintDescription(transcript)
    .replace(/\s+/g, ' ')
    .replace(/^(please\s+)?(there is|there are|my complaint is|i want to report|complaint about|issue with)\s+/i, '')
    .trim();

  const firstSentence = normalized.split(/[.!?]/)[0]?.trim() || '';
  const base = firstSentence || fallbackLabel;
  const normalizedTitle = `${base.charAt(0).toUpperCase()}${base.slice(1)}`.replace(/[.!,;:]+$/, '');

  return normalizedTitle.length > 96 ? `${normalizedTitle.slice(0, 93).trimEnd()}...` : normalizedTitle;
}

export function VoiceAssistantPanel({
  open,
  onOpenChange,
  mapping,
  userWardId,
  autoSubmitContext,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapping: GrievanceMappingResponse | null;
  userWardId?: number | null;
  autoSubmitContext: {
    photoReady: boolean;
    applicantReady: boolean;
    currentZoneId?: string;
    currentWardId?: string;
  };
  onApply: (payload: VoiceAssistantFillPayload, options?: ApplyOptions) => void;
}) {
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [manualCategoryMode, setManualCategoryMode] = useState(false);
  const [selectedVoiceCategoryId, setSelectedVoiceCategoryId] = useState<VoiceCategoryId | null>(null);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [selectedGender, setSelectedGender] = useState<ApplicantGender | null>(null);
  const [genderTouched, setGenderTouched] = useState(false);
  const [voiceGenderEstimate, setVoiceGenderEstimate] = useState<ApplicantGender | null>(null);
  const [zoneDecision, setZoneDecision] = useState<DecisionState>('pending');
  const [zoneDecisionTouched, setZoneDecisionTouched] = useState(false);
  const [wardDecision, setWardDecision] = useState<DecisionState>('pending');
  const [wardDecisionTouched, setWardDecisionTouched] = useState(false);
  const [locationDecision, setLocationDecision] = useState<DecisionState>('pending');
  const [locationStatus, setLocationStatus] = useState<'idle' | 'capturing' | 'ready' | 'error'>('idle');
  const [locationCoordinates, setLocationCoordinates] = useState<{ latitude: string; longitude: string } | null>(null);
  const [locationError, setLocationError] = useState('');
  const [locationDetail, setLocationDetail] = useState('');
  const [analysis, setAnalysis] = useState<VoiceAnalysis>({
    detectedCategoryId: null,
    confidence: 'low',
    genderSuggestion: null,
    zoneSuggestion: null,
    wardSuggestion: null,
  });
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const pitchFrameRef = useRef<number[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const transcriptRef = useRef('');
  const suppressEndErrorRef = useRef(false);
  const supportsRecognition = Boolean(getSpeechRecognitionConstructor());
  const suggestedGender = analysis.genderSuggestion || voiceGenderEstimate;

  const liveTranscript = isListening ? joinTranscriptParts(transcript, interimTranscript) : transcript;
  const bestMappingResult = resolveBestMappingSuggestion(mapping, transcript);
  const previewCategoryId =
    selectedVoiceCategoryId ||
    (analysis.confidence !== 'low' ? analysis.detectedCategoryId : null) ||
    bestMappingResult?.voiceCategoryId ||
    null;
  const previewCategory = getVoiceCategoryOption(previewCategoryId);
  const resolvedSuggestion =
    (selectedVoiceCategoryId ? resolveMappingSuggestion(mapping, transcript, selectedVoiceCategoryId) : null) ||
    bestMappingResult?.suggestion ||
    resolveMappingSuggestion(mapping, transcript, previewCategoryId);
  const canApply = Boolean(transcript.trim() && resolvedSuggestion);
  const willApplyZoneOnly = zoneDecision === 'apply' && Boolean(analysis.zoneSuggestion) && !(wardDecision === 'apply' && analysis.wardSuggestion);
  const resultingWardReady = Boolean(
    (wardDecision === 'apply' && analysis.wardSuggestion) ||
      (autoSubmitContext.currentWardId && !willApplyZoneOnly),
  );
  const canAutoSubmitNow = Boolean(autoSubmitContext.photoReady && autoSubmitContext.applicantReady && canApply && resultingWardReady);
  const showManualCategoryChooser =
    manualCategoryMode ||
    (Boolean(transcript.trim()) && !isListening && !isAnalyzing && !resolvedSuggestion && (!analysis.detectedCategoryId || analysis.confidence === 'low'));

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    if (!open) {
      if (recognitionRef.current) {
        suppressEndErrorRef.current = true;
        recognitionRef.current.abort();
      }
      stopAudioGenderCapture();
      setIsListening(false);
      setInterimTranscript('');
    }
  }, [open]);

  useEffect(() => {
    if (!open || isListening) {
      return;
    }

    const trimmedTranscript = transcript.trim();

    if (!trimmedTranscript) {
      setAnalysis({
        detectedCategoryId: null,
        confidence: 'low',
        genderSuggestion: null,
        zoneSuggestion: resolveZoneSuggestion(mapping, '', resolveWardSuggestion(mapping, '', userWardId)),
        wardSuggestion: resolveWardSuggestion(mapping, '', userWardId),
      });
      setIsAnalyzing(false);
      return;
    }

    setIsAnalyzing(true);
    const timer = window.setTimeout(() => {
      setAnalysis(analyzeVoiceComplaint(trimmedTranscript, mapping, userWardId));
      setIsAnalyzing(false);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [isListening, mapping, open, transcript, userWardId]);

  useEffect(() => {
    setZoneDecision('pending');
    setZoneDecisionTouched(false);
  }, [analysis.zoneSuggestion?.zoneId]);

  useEffect(() => {
    setWardDecision('pending');
    setWardDecisionTouched(false);
  }, [analysis.wardSuggestion?.wardId]);

  useEffect(() => {
    setCategoryTouched(false);
  }, [analysis.detectedCategoryId, bestMappingResult?.voiceCategoryId]);

  useEffect(() => {
    if (
      !categoryTouched &&
      ((analysis.detectedCategoryId && analysis.confidence !== 'low') || bestMappingResult?.voiceCategoryId)
    ) {
      setSelectedVoiceCategoryId((analysis.detectedCategoryId && analysis.confidence !== 'low') ? analysis.detectedCategoryId : bestMappingResult?.voiceCategoryId || null);
      setManualCategoryMode(false);
    }
  }, [analysis.confidence, analysis.detectedCategoryId, bestMappingResult?.voiceCategoryId, categoryTouched]);

  useEffect(() => {
    if (wardDecisionTouched) {
      return;
    }

    if (analysis.wardSuggestion) {
      setWardDecision('apply');
      return;
    }

    setWardDecision('pending');
  }, [analysis.wardSuggestion, wardDecisionTouched]);

  useEffect(() => {
    if (zoneDecisionTouched) {
      return;
    }

    if (analysis.wardSuggestion || analysis.zoneSuggestion) {
      setZoneDecision('apply');
      return;
    }

    setZoneDecision('pending');
  }, [analysis.wardSuggestion, analysis.zoneSuggestion, zoneDecisionTouched]);

  useEffect(() => {
    if (!genderTouched) {
      setSelectedGender(suggestedGender);
    }
  }, [genderTouched, suggestedGender]);

  function stopAudioGenderCapture() {
    if (rafIdRef.current) {
      window.cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
  }

  async function startAudioGenderCapture() {
    if (!navigator.mediaDevices?.getUserMedia || typeof window === 'undefined') {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextCtor) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const audioContext = new AudioContextCtor();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioStreamRef.current = stream;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      pitchFrameRef.current = [];

      const buffer = new Float32Array(analyser.fftSize);

      const samplePitch = () => {
        if (!analyserRef.current || !audioContextRef.current) {
          return;
        }

        analyserRef.current.getFloatTimeDomainData(buffer);
        const pitch = estimatePitchFromBuffer(buffer, audioContextRef.current.sampleRate);

        if (pitch) {
          pitchFrameRef.current = [...pitchFrameRef.current.slice(-24), pitch];
          const nextEstimate = guessGenderFromPitch(pitchFrameRef.current);

          if (nextEstimate) {
            setVoiceGenderEstimate(nextEstimate);
          }
        }

        rafIdRef.current = window.requestAnimationFrame(samplePitch);
      };

      rafIdRef.current = window.requestAnimationFrame(samplePitch);
    } catch {
      // Keep voice filing usable even if raw-audio analysis is unavailable.
    }
  }

  function resetAssistantState() {
    if (recognitionRef.current) {
      suppressEndErrorRef.current = true;
      recognitionRef.current.abort();
    }

    stopAudioGenderCapture();
    recognitionRef.current = null;
    setTranscript('');
    setInterimTranscript('');
    setIsListening(false);
    setIsAnalyzing(false);
    setError('');
    setManualCategoryMode(false);
    setSelectedVoiceCategoryId(null);
    setCategoryTouched(false);
    setSelectedGender(null);
    setGenderTouched(false);
    setVoiceGenderEstimate(null);
    setZoneDecision('pending');
    setZoneDecisionTouched(false);
    setWardDecision('pending');
    setWardDecisionTouched(false);
    setLocationDecision('pending');
    setLocationStatus('idle');
    setLocationCoordinates(null);
    setLocationError('');
    setLocationDetail('');
    setAnalysis({
      detectedCategoryId: null,
      confidence: 'low',
      genderSuggestion: null,
      zoneSuggestion: resolveZoneSuggestion(mapping, '', resolveWardSuggestion(mapping, '', userWardId)),
      wardSuggestion: resolveWardSuggestion(mapping, '', userWardId),
    });
  }

  function handleStartListening() {
    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();

    if (!SpeechRecognitionCtor) {
      setError('Voice capture is not supported in this browser. You can still type the complaint below.');
      return;
    }

    if (recognitionRef.current) {
      suppressEndErrorRef.current = true;
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }

    stopAudioGenderCapture();
    setVoiceGenderEstimate(null);

    setError('');
    setIsAnalyzing(false);
    setInterimTranscript('');

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onresult = (event) => {
      let finalChunk = '';
      let interimChunk = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcriptPart = result?.[0]?.transcript || '';

        if (result?.isFinal) {
          finalChunk = joinTranscriptParts(finalChunk, transcriptPart);
        } else {
          interimChunk = joinTranscriptParts(interimChunk, transcriptPart);
        }
      }

      if (finalChunk) {
        setTranscript((current) => joinTranscriptParts(current, finalChunk));
      }

      setInterimTranscript(interimChunk);
    };

    recognition.onerror = (event) => {
      setError(mapSpeechErrorToMessage(event.error));
      setIsListening(false);
      setInterimTranscript('');
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
      setInterimTranscript('');
      stopAudioGenderCapture();

      if (suppressEndErrorRef.current) {
        suppressEndErrorRef.current = false;
        return;
      }

      if (!transcriptRef.current.trim()) {
        setError('No speech was detected. Try speaking a little closer to the mic.');
      }
    };

    recognitionRef.current = recognition;
    suppressEndErrorRef.current = false;

    try {
      recognition.start();
      void startAudioGenderCapture();
      setIsListening(true);
    } catch (startError) {
      recognitionRef.current = null;
      setIsListening(false);
      setError(startError instanceof Error ? startError.message : 'Unable to start voice capture right now.');
    }
  }

  function handleStopListening() {
    if (!recognitionRef.current) {
      return;
    }

    suppressEndErrorRef.current = false;
    recognitionRef.current.stop();
    stopAudioGenderCapture();
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationError('Live location is not supported on this device.');
      return;
    }

    setLocationDecision('apply');
    setLocationStatus('capturing');
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationCoordinates({
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        });
        setLocationStatus('ready');
      },
      (geoError) => {
        setLocationStatus('error');
        setLocationError(geoError.message || 'Unable to capture live location.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  function handleApplyToForm() {
    handleApplyToFormWithOptions();
  }

  function handleApplyAndSubmit() {
    if (!canAutoSubmitNow) {
      toast.error('Auto-submit needs a complaint photo, applicant address, and a valid ward before it can continue.');
      return;
    }

    if (!resolvedSuggestion) {
      toast.error('We could not extract a valid department and category from the complaint yet.');
      return;
    }

    handleApplyToFormWithOptions({ submitAfterFill: true });
  }

  function handleApplyToFormWithOptions(options?: ApplyOptions) {
    if (!resolvedSuggestion) {
      toast.error('We could not extract a valid department and category from the complaint yet.');
      return;
    }

    const trimmedTranscript = transcript.trim();
    const formattedDescription = formatComplaintDescription(trimmedTranscript);

    if (!trimmedTranscript) {
      toast.error('Complaint description is empty. Please speak or type the issue first.');
      return;
    }

    const payload: VoiceAssistantFillPayload = {
      department_id: resolvedSuggestion.departmentId,
      category_id: resolvedSuggestion.categoryId,
      title: createComplaintTitle(trimmedTranscript, resolvedSuggestion.categoryName),
      text: formattedDescription,
    };

    if (selectedGender) {
      payload.applicant_gender = selectedGender;
    }

    if (zoneDecision === 'apply' && analysis.zoneSuggestion) {
      payload.zone_id = analysis.zoneSuggestion.zoneId;
    }

    if (wardDecision === 'apply' && analysis.wardSuggestion) {
      payload.zone_id = analysis.wardSuggestion.zoneId;
      payload.ward_id = analysis.wardSuggestion.wardId;
    }

    if (locationDetail.trim()) {
      payload.street_address = locationDetail.trim();
    }

    if (locationDecision === 'apply' && locationCoordinates) {
      payload.latitude = locationCoordinates.latitude;
      payload.longitude = locationCoordinates.longitude;
    }

    onApply(payload, options);
    resetAssistantState();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-l border-slate-200 bg-[#FCFDFC] p-0 sm:max-w-[560px]">
        <SheetHeader className="border-b border-slate-200 bg-white px-6 py-5 pr-14">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
            <Sparkles className="h-3.5 w-3.5" />
            Voice Assistant
          </div>
          <SheetTitle className="text-xl text-slate-950">Speak your complaint</SheetTitle>
          <SheetDescription className="text-sm leading-6 text-slate-600">
            We will listen, suggest the closest department and category from the live grievance mapping, then pre-fill the form for your final review. Photos still stay in the regular form.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Voice capture</div>
                <div className="mt-1 text-sm text-slate-500">
                  Browser speech recognition runs in `en-IN`. We also try a lightweight voice-pitch estimate for gender, but you still verify it before fill.
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {isListening ? (
                  <Button type="button" onClick={handleStopListening} className="h-11 rounded-full bg-rose-600 px-5 text-white hover:bg-rose-700">
                    <Square className="h-4 w-4 fill-current" />
                    Stop
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleStartListening}
                    disabled={!supportsRecognition}
                    className="h-11 rounded-full bg-[#0F766E] px-5 text-white hover:bg-[#115E59] disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <Mic className="h-4 w-4" />
                    Start listening
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={resetAssistantState} className="h-11 rounded-full border-slate-300 bg-white px-5 text-slate-700 hover:bg-slate-50">
                  <RotateCcw className="h-4 w-4" />
                  Clear
                </Button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {isListening ? (
                  <>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
                    </span>
                    Listening...
                  </>
                ) : isAnalyzing ? (
                  <>
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    Processing transcript
                  </>
                ) : (
                  <>
                    <Wand2 className="h-3.5 w-3.5" />
                    Live transcript preview
                  </>
                )}
              </div>

              <Textarea
                value={liveTranscript}
                onChange={(event) => setTranscript(event.target.value)}
                rows={7}
                disabled={isListening}
                placeholder="Speak your complaint or type it here. Example: There is a garbage dump near ward 12 and it has not been cleared for three days."
                className="mt-3 min-h-[180px] rounded-2xl border-slate-200 bg-white text-sm leading-6 text-slate-800"
              />

              {voiceGenderEstimate ? (
                <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                  Voice estimate suggests <span className="font-semibold">{GENDER_LABELS[voiceGenderEstimate].toLowerCase()}</span>. Please verify below before applying.
                </div>
              ) : null}

              {!supportsRecognition ? (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Voice capture is not supported in this browser, but the assistant can still classify typed complaints and pre-fill the form.
                </div>
              ) : null}
            </div>

            {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
          </div>

          {Boolean(transcript.trim()) ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <div className="text-sm font-semibold text-slate-900">Complaint type</div>

              {!selectedVoiceCategoryId && analysis.detectedCategoryId && analysis.confidence !== 'low' ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                  <div className="text-sm font-medium text-slate-900">
                    We detected a <span className="font-semibold text-emerald-800">{getVoiceCategoryOption(analysis.detectedCategoryId)?.label}</span> issue. Is that correct?
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => {
                        setSelectedVoiceCategoryId(analysis.detectedCategoryId);
                        setCategoryTouched(true);
                        setManualCategoryMode(false);
                      }}
                      className="h-10 rounded-full bg-emerald-700 px-5 text-white hover:bg-emerald-800"
                    >
                      Yes
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSelectedVoiceCategoryId(null);
                        setCategoryTouched(true);
                        setManualCategoryMode(true);
                      }}
                      className="h-10 rounded-full border-slate-300 bg-white px-5 text-slate-700 hover:bg-slate-50"
                    >
                      No
                    </Button>
                  </div>
                </div>
              ) : null}

              {showManualCategoryChooser ? (
                <div className="mt-4">
                  <div className="mb-3 text-sm text-slate-600">
                    {!analysis.detectedCategoryId || analysis.confidence === 'low'
                      ? 'We could not confidently detect the issue type. Choose one to continue.'
                      : 'Choose the correct issue type.'}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {VOICE_CATEGORY_OPTIONS.map((option) => {
                      const active = selectedVoiceCategoryId === option.id;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setSelectedVoiceCategoryId(option.id);
                            setCategoryTouched(true);
                            setManualCategoryMode(false);
                          }}
                          className={cn(
                            'rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition',
                            active
                              ? 'border-[#0F766E] bg-emerald-50 text-emerald-900 shadow-[0_10px_24px_rgba(15,118,110,0.12)]'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white',
                          )}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {selectedVoiceCategoryId ? (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-sm text-slate-700">
                    Selected issue type: <span className="font-semibold text-slate-900">{getVoiceCategoryOption(selectedVoiceCategoryId)?.label}</span>
                  </div>
                  <button type="button" onClick={() => setManualCategoryMode(true)} className="text-sm font-semibold text-[#0F766E] transition hover:text-[#115E59]">
                    Change
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {previewCategory && resolvedSuggestion ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-2xl bg-blue-50 p-3 text-blue-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900">Detected result</div>
                  <div className="mt-1 text-sm text-slate-500">These values come from your current grievance mapping, so the assistant fills valid department and category IDs.</div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Department</div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">{resolvedSuggestion.departmentName}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Category</div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">{resolvedSuggestion.categoryName}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedVoiceCategoryId ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                Mapping needs manual review
              </div>
              <div className="mt-2 leading-6">We could not map this complaint cleanly to the current DB category list. You can keep using the normal form fields if needed.</div>
            </div>
          ) : null}

          {selectedVoiceCategoryId ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <div className="text-sm font-semibold text-slate-900">Confirm applicant gender</div>
              <div className="mt-1 text-sm leading-6 text-slate-500">
                {suggestedGender
                  ? `${analysis.genderSuggestion ? 'Transcript' : 'Voice'} suggests ${GENDER_LABELS[suggestedGender].toLowerCase()}. Please verify once before we fill the form.`
                  : 'Optional. If you want, choose the applicant gender here and we will fill the existing form field.'}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(['male', 'female', 'other'] as ApplicantGender[]).map((gender) => (
                  <Button
                    key={gender}
                    type="button"
                    onClick={() => {
                      setSelectedGender(gender);
                      setGenderTouched(true);
                    }}
                    className={cn(
                      'h-10 rounded-full px-5',
                      selectedGender === gender
                        ? 'bg-[#0F766E] text-white hover:bg-[#115E59]'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                    )}
                  >
                    {GENDER_LABELS[gender]}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedGender(null);
                    setGenderTouched(true);
                  }}
                  className="h-10 rounded-full border-slate-300 bg-white px-5 text-slate-700 hover:bg-slate-50"
                >
                  Skip
                </Button>
              </div>
            </div>
          ) : null}

          {selectedVoiceCategoryId && (analysis.wardSuggestion || analysis.zoneSuggestion) ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-2xl bg-slate-100 p-3 text-slate-700">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900">
                    {analysis.wardSuggestion
                      ? analysis.wardSuggestion.source === 'speech'
                        ? 'Detected zone and ward from speech'
                        : 'Use your registered zone and ward'
                      : 'Detected zone from speech'}
                  </div>
                  {analysis.wardSuggestion ? (
                    <>
                      <div className="mt-2 text-sm leading-6 text-slate-600">
                        <span className="font-semibold text-slate-900">{analysis.wardSuggestion.wardName}</span> in{' '}
                        <span className="font-semibold text-slate-900">{analysis.wardSuggestion.zoneName}</span>
                      </div>
                      <div className="mt-2 text-xs leading-5 text-slate-500">
                        If the spoken zone and ward match a live mapping row, both fields will be filled together.
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          onClick={() => {
                            setWardDecision('apply');
                            setWardDecisionTouched(true);
                            setZoneDecision('apply');
                            setZoneDecisionTouched(true);
                          }}
                          className={cn(
                            'h-10 rounded-full px-5',
                            wardDecision === 'apply' ? 'bg-[#0F766E] text-white hover:bg-[#115E59]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                          )}
                        >
                          Apply zone and ward
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setWardDecision('skip');
                            setWardDecisionTouched(true);
                          }}
                          className="h-10 rounded-full border-slate-300 bg-white px-5 text-slate-700 hover:bg-slate-50"
                        >
                          Keep form selection
                        </Button>
                      </div>
                    </>
                  ) : analysis.zoneSuggestion ? (
                    <>
                      <div className="mt-2 text-sm leading-6 text-slate-600">
                        <span className="font-semibold text-slate-900">{analysis.zoneSuggestion.zoneName}</span>
                      </div>
                      <div className="mt-2 text-xs leading-5 text-slate-500">
                        We can fill the zone now. If ward is still unclear, the user can choose it in the regular form.
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          onClick={() => {
                            setZoneDecision('apply');
                            setZoneDecisionTouched(true);
                          }}
                          className={cn(
                            'h-10 rounded-full px-5',
                            zoneDecision === 'apply' ? 'bg-[#0F766E] text-white hover:bg-[#115E59]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                          )}
                        >
                          Apply zone
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setZoneDecision('skip');
                            setZoneDecisionTouched(true);
                          }}
                          className="h-10 rounded-full border-slate-300 bg-white px-5 text-slate-700 hover:bg-slate-50"
                        >
                          Keep form selection
                        </Button>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {selectedVoiceCategoryId ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-2xl bg-slate-100 p-3 text-slate-700">
                  <MapIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900">Landmark / street detail</div>
                  <div className="mt-1 text-sm leading-6 text-slate-500">
                    Optional. This fills the existing street or landmark field in the complaint form.
                  </div>
                  <Textarea
                    value={locationDetail}
                    onChange={(event) => setLocationDetail(event.target.value)}
                    rows={3}
                    placeholder="Example: Near Sector 7 market, opposite community hall"
                    className="mt-3 rounded-2xl border-slate-200 bg-white text-sm leading-6 text-slate-800"
                  />

                  <div className="text-sm font-semibold text-slate-900">Use current location?</div>
                  <div className="mt-1 text-sm leading-6 text-slate-500">This is optional and only fills the live GPS latitude and longitude already supported by the existing form.</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" onClick={handleUseCurrentLocation} disabled={locationStatus === 'capturing'} className="h-10 rounded-full bg-[#1E3A8A] px-5 text-white hover:bg-[#1A3478] disabled:bg-slate-300">
                      {locationStatus === 'capturing' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
                      Yes, add location
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setLocationDecision('skip');
                        setLocationStatus('idle');
                        setLocationCoordinates(null);
                        setLocationError('');
                      }}
                      className="h-10 rounded-full border-slate-300 bg-white px-5 text-slate-700 hover:bg-slate-50"
                    >
                      Skip
                    </Button>
                  </div>

                  {locationStatus === 'ready' && locationCoordinates ? (
                    <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      Location captured: {locationCoordinates.latitude}, {locationCoordinates.longitude}
                    </div>
                  ) : null}

                  {locationStatus === 'error' && locationError ? (
                    <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{locationError}</div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="sticky bottom-0 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" variant="outline" onClick={resetAssistantState} className="h-11 rounded-full border-slate-300 bg-white px-5 text-slate-700 hover:bg-slate-50">
              Reset
            </Button>
            <Button type="button" onClick={handleApplyToForm} disabled={!canApply} className="h-11 flex-1 rounded-full bg-[#0F766E] px-5 text-white hover:bg-[#115E59] disabled:bg-slate-300">
              Fill complaint form
            </Button>
            <Button
              type="button"
              onClick={handleApplyAndSubmit}
              disabled={!canAutoSubmitNow}
              className="h-11 flex-1 rounded-full bg-[#1E3A8A] px-5 text-white hover:bg-[#1A3478] disabled:bg-slate-300"
            >
              Fill and submit
            </Button>
          </div>
          <div className="mt-2 text-xs leading-5 text-slate-500">
            Auto-submit works only after a complaint photo is uploaded and the required applicant and ward details are ready.
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
