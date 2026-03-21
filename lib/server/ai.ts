import 'server-only';

import type { ComplaintCategory, ComplaintPriority } from '@/lib/types';

const categoryKeywords: Array<{ category: ComplaintCategory; keywords: string[] }> = [
  { category: 'pothole', keywords: ['pothole', 'road crack', 'road damage', 'broken road'] },
  { category: 'streetlight', keywords: ['streetlight', 'light pole', 'dark street', 'lamp'] },
  { category: 'water', keywords: ['water leak', 'water logging', 'water supply', 'pipeline'] },
  { category: 'waste', keywords: ['garbage', 'waste', 'overflowing bin', 'trash'] },
  { category: 'sanitation', keywords: ['dirty', 'unclean', 'cleanliness', 'sanitation'] },
  { category: 'drainage', keywords: ['drain', 'drainage', 'blocked drain', 'overflow drain'] },
  { category: 'sewer', keywords: ['sewer', 'sewage', 'manhole', 'foul smell'] },
  { category: 'encroachment', keywords: ['encroachment', 'illegal occupation', 'blocked footpath'] },
];

const riskKeywords = [
  { weight: 1, keywords: ['fire', 'collapse', 'electrical hazard', 'gas leak', 'flooding'] },
  { weight: 0.85, keywords: ['sewage', 'open manhole', 'accident', 'unsafe', 'dangerous'] },
  { weight: 0.7, keywords: ['overflow', 'water logging', 'blocked drain', 'dark', 'broken road'] },
  { weight: 0.5, keywords: ['garbage', 'waste', 'leakage', 'complaint pending'] },
];

const negativeWords = ['bad', 'unsafe', 'danger', 'urgent', 'critical', 'delay', 'smell', 'broken', 'overflow'];
const positiveWords = ['fixed', 'clean', 'working', 'resolved', 'thank', 'good'];

const wardWeight: Record<string, number> = {
  Rohini: 0.66,
  Dwarka: 0.62,
  Saket: 0.58,
  'Laxmi Nagar': 0.72,
  'Karol Bagh': 0.77,
};

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function countHits(text: string, keywords: string[]) {
  return keywords.reduce((total, keyword) => total + (text.includes(keyword) ? 1 : 0), 0);
}

export function detectCategory(text: string) {
  const normalized = normalize(text);
  const match = categoryKeywords
    .map((entry) => ({
      category: entry.category,
      hits: countHits(normalized, entry.keywords),
    }))
    .sort((left, right) => right.hits - left.hits)[0];

  if (!match || match.hits === 0) {
    return 'other' as ComplaintCategory;
  }

  return match.category;
}

export function scoreSentiment(text: string) {
  const normalized = normalize(text);
  const negative = countHits(normalized, negativeWords);
  const positive = countHits(normalized, positiveWords);
  return Math.min(1, Math.max(0, negative - positive) / 5);
}

export function scoreKeywords(text: string) {
  const normalized = normalize(text);
  let bestWeight = 0.25;

  for (const group of riskKeywords) {
    if (countHits(normalized, group.keywords) > 0) {
      bestWeight = Math.max(bestWeight, group.weight);
    }
  }

  return bestWeight;
}

export function scoreFrequency(countLast24Hours: number) {
  return Math.min(1, countLast24Hours / 6);
}

export function scoreLocation(wardName?: string | null) {
  if (!wardName) {
    return 0.4;
  }

  return wardWeight[wardName] ?? 0.45;
}

export function detectSpam(text: string, repeatedCount: number) {
  const reasons: string[] = [];
  const normalized = normalize(text);

  if (normalized.length < 18) {
    reasons.push('Complaint text is too short.');
  }

  if (repeatedCount >= 2) {
    reasons.push('Repeated submissions detected from the same user.');
  }

  if (/^(test|hello|asdf|demo)/.test(normalized)) {
    reasons.push('Looks like a non-genuine test submission.');
  }

  return {
    is_spam: reasons.length > 0,
    reasons,
  };
}

export function detectHotspot(wardCountLast24Hours: number, threshold = 3) {
  return {
    is_hotspot: wardCountLast24Hours >= threshold,
    hotspot_count: wardCountLast24Hours,
  };
}

export function priorityFromRisk(riskScore: number): ComplaintPriority {
  if (riskScore >= 80) return 'critical';
  if (riskScore >= 62) return 'high';
  if (riskScore >= 35) return 'medium';
  return 'low';
}

export function analyzeComplaint(input: {
  title?: string;
  text: string;
  ward_name?: string | null;
  ward_count_last_24_hours: number;
  repeated_count: number;
}) {
  const combinedText = `${input.title || ''} ${input.text}`.trim();
  const category = detectCategory(combinedText);
  const keywordWeight = scoreKeywords(combinedText);
  const sentiment = scoreSentiment(combinedText);
  const locationWeightValue = scoreLocation(input.ward_name);
  const frequency = scoreFrequency(input.ward_count_last_24_hours);
  const riskScore =
    (keywordWeight * 0.4 + sentiment * 0.2 + locationWeightValue * 0.2 + frequency * 0.2) * 100;
  const spam = detectSpam(combinedText, input.repeated_count);
  const hotspot = detectHotspot(input.ward_count_last_24_hours);

  return {
    category,
    priority: priorityFromRisk(riskScore),
    risk_score: Number(riskScore.toFixed(2)),
    sentiment_score: Number((sentiment * 100).toFixed(2)),
    frequency_score: Number((frequency * 100).toFixed(2)),
    keyword_weight: keywordWeight,
    is_spam: spam.is_spam,
    spam_reasons: spam.reasons,
    is_hotspot: hotspot.is_hotspot,
    hotspot_count: hotspot.hotspot_count,
  };
}
