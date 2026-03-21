/** @typedef {import('@/lib/types').ComplaintCategory} ComplaintCategory */
/** @typedef {import('@/lib/types').ComplaintDepartment} ComplaintDepartment */
/** @typedef {import('@/lib/types').ComplaintPriority} ComplaintPriority */

const departmentKeywordGroups = [
  { department: 'electricity', keywords: ['electricity', 'electric', 'power cut', 'power outage', 'transformer', 'spark', 'short circuit', 'wire', 'voltage', 'shock'] },
  { department: 'water', keywords: ['water', 'water leak', 'water supply', 'pipeline', 'tap', 'drinking water', 'tank', 'low pressure'] },
  { department: 'sanitation', keywords: ['sanitation', 'dirty', 'unclean', 'cleanliness', 'public toilet', 'sweep', 'hygiene'] },
  { department: 'roads', keywords: ['road', 'pothole', 'broken road', 'footpath', 'encroachment', 'divider', 'asphalt'] },
  { department: 'fire', keywords: ['fire', 'smoke', 'blaze', 'flammable', 'burning'] },
  { department: 'drainage', keywords: ['drain', 'drainage', 'water logging', 'blocked drain', 'sewer', 'sewage', 'manhole', 'overflow drain'] },
  { department: 'garbage', keywords: ['garbage', 'waste', 'trash', 'overflowing bin', 'dump', 'litter'] },
  { department: 'streetlight', keywords: ['streetlight', 'street light', 'light pole', 'lamp post', 'dark street', 'dark road'] },
];

const categoryKeywordGroups = [
  { category: 'pothole', keywords: ['pothole', 'road crack', 'road damage', 'broken road'] },
  { category: 'streetlight', keywords: ['streetlight', 'street light', 'light pole', 'dark street', 'lamp post'] },
  { category: 'water', keywords: ['water leak', 'water logging', 'water supply', 'pipeline', 'water pressure'] },
  { category: 'waste', keywords: ['garbage', 'waste', 'overflowing bin', 'trash', 'dump'] },
  { category: 'sanitation', keywords: ['dirty', 'unclean', 'cleanliness', 'sanitation', 'public toilet'] },
  { category: 'drainage', keywords: ['drain', 'drainage', 'blocked drain', 'overflow drain', 'water logging'] },
  { category: 'sewer', keywords: ['sewer', 'sewage', 'manhole', 'foul smell'] },
  { category: 'encroachment', keywords: ['encroachment', 'illegal occupation', 'blocked footpath', 'roadside stall'] },
];

const departmentByCategory = {
  pothole: 'roads',
  streetlight: 'streetlight',
  water: 'water',
  waste: 'garbage',
  sanitation: 'sanitation',
  drainage: 'drainage',
  sewer: 'drainage',
  encroachment: 'roads',
  other: 'roads',
};

const dangerKeywordGroups = [
  { score: 1, keywords: ['fire', 'electrical hazard', 'live wire', 'short circuit', 'gas leak', 'collapse', 'open manhole'] },
  { score: 0.82, keywords: ['accident', 'unsafe', 'danger', 'dangerous', 'flooding', 'sewage overflow', 'transformer spark'] },
  { score: 0.64, keywords: ['overflow', 'water logging', 'blocked drain', 'dark street', 'broken road', 'no water'] },
  { score: 0.44, keywords: ['garbage', 'trash', 'leakage', 'dirty', 'smell'] },
];

const negativeWords = ['bad', 'unsafe', 'danger', 'urgent', 'critical', 'delay', 'smell', 'broken', 'overflow', 'frustrated', 'blocked', 'stuck'];
const positiveWords = ['fixed', 'clean', 'working', 'resolved', 'thank', 'good', 'done'];
const nonGenuinePrefixes = ['test', 'hello', 'asdf', 'demo', 'sample'];

function normalize(text) {
  return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function countHits(text, keywords) {
  return keywords.reduce((total, keyword) => total + (text.includes(keyword) ? 1 : 0), 0);
}

function tokenStats(text) {
  const tokens = normalize(text).split(' ').filter(Boolean);
  const uniqueTokens = new Set(tokens);
  return {
    total: tokens.length,
    unique: uniqueTokens.size,
    repetitionRatio: tokens.length ? 1 - uniqueTokens.size / tokens.length : 0,
  };
}

function bestKeywordMatch(text, groups, key, fallbackValue) {
  const match = groups
    .map((group) => ({ value: group[key], hits: countHits(text, group.keywords) }))
    .sort((left, right) => right.hits - left.hits)[0];

  if (!match || match.hits === 0) {
    return fallbackValue;
  }

  return match.value;
}

/**
 * @param {string} text
 * @returns {ComplaintCategory}
 */
export function detectCategory(text) {
  return bestKeywordMatch(normalize(text), categoryKeywordGroups, 'category', 'other');
}

/**
 * @param {string} text
 * @returns {ComplaintDepartment}
 */
export function detectDepartment(text) {
  const normalized = normalize(text);
  const detectedDepartment = bestKeywordMatch(normalized, departmentKeywordGroups, 'department', null);

  if (detectedDepartment) {
    return detectedDepartment;
  }

  const detectedCategory = detectCategory(normalized);
  return departmentByCategory[detectedCategory] || 'roads';
}

export function scoreSentiment(text) {
  const normalized = normalize(text);
  const negative = countHits(normalized, negativeWords);
  const positive = countHits(normalized, positiveWords);
  return Math.min(1, Math.max(0, negative - positive * 0.6) / 5);
}

export function scoreDangerKeywords(text) {
  const normalized = normalize(text);
  let bestScore = 0.18;

  for (const group of dangerKeywordGroups) {
    if (countHits(normalized, group.keywords) > 0) {
      bestScore = Math.max(bestScore, group.score);
    }
  }

  return bestScore;
}

export function scoreFrequency(countLast24Hours) {
  return Math.min(1, Math.max(0, Number(countLast24Hours || 0)) / 5);
}

export function detectSpam(text, repeatedCount) {
  const normalized = normalize(text);
  const reasons = [];
  const stats = tokenStats(normalized);

  if (normalized.length < 24) {
    reasons.push('Complaint text is too short to verify the issue clearly.');
  }

  if (Number(repeatedCount || 0) >= 2) {
    reasons.push('Repeated complaint submissions detected within the last 24 hours.');
  }

  if (stats.total >= 4 && stats.repetitionRatio >= 0.55) {
    reasons.push('Complaint text looks highly repetitive.');
  }

  if (nonGenuinePrefixes.some((prefix) => normalized.startsWith(prefix))) {
    reasons.push('Looks like a non-genuine test submission.');
  }

  return {
    is_spam: reasons.length > 0,
    reasons,
  };
}

export function detectHotspot(sameIssueCountLast24Hours, threshold = 3) {
  const count = Number(sameIssueCountLast24Hours || 0);
  return {
    is_hotspot: count >= threshold,
    hotspot_count: count,
  };
}

/**
 * @param {number} riskScore
 * @returns {ComplaintPriority}
 */
export function priorityFromRisk(riskScore) {
  if (riskScore >= 84) return 'critical';
  if (riskScore >= 64) return 'high';
  if (riskScore >= 38) return 'medium';
  return 'low';
}

export function analyzeComplaint(input) {
  const combinedText = `${input.title || ''} ${input.text || ''}`.trim();
  const category = detectCategory(combinedText);
  const department = detectDepartment(combinedText);
  const keywordScore = scoreDangerKeywords(combinedText);
  const sentiment = scoreSentiment(combinedText);
  const frequency = scoreFrequency(input.same_issue_count_last_24_hours || 0);
  const hotspot = detectHotspot(input.same_issue_count_last_24_hours || 0, input.hotspot_threshold || 3);
  const spam = detectSpam(combinedText, input.repeated_count || 0);
  const repeatedWeight = Math.min(1, Number(input.repeated_count || 0) / 3);
  const hotspotBoost = hotspot.is_hotspot ? 0.12 : 0;
  const riskScore = Math.min(
    100,
    (keywordScore * 0.52 + sentiment * 0.18 + frequency * 0.2 + repeatedWeight * 0.1 + hotspotBoost) * 100,
  );

  return {
    category,
    department,
    priority: priorityFromRisk(riskScore),
    risk_score: Number(riskScore.toFixed(2)),
    keyword_score: Number((keywordScore * 100).toFixed(2)),
    sentiment_score: Number((sentiment * 100).toFixed(2)),
    frequency_score: Number((frequency * 100).toFixed(2)),
    repeated_score: Number((repeatedWeight * 100).toFixed(2)),
    is_spam: spam.is_spam,
    spam_reasons: spam.reasons,
    is_hotspot: hotspot.is_hotspot,
    hotspot_count: hotspot.hotspot_count,
  };
}
