import 'server-only';

import type { ComplaintCategory, ComplaintDepartment, ComplaintPriority } from '@/lib/types';
import {
  analyzeComplaint as analyzeComplaintShared,
  detectCategory as detectCategoryShared,
  detectDepartment as detectDepartmentShared,
  detectHotspot as detectHotspotShared,
  detectSpam as detectSpamShared,
  priorityFromRisk as priorityFromRiskShared,
  scoreDangerKeywords as scoreDangerKeywordsShared,
  scoreFrequency as scoreFrequencyShared,
  scoreSentiment as scoreSentimentShared,
} from '@/lib/ai/complaint-intelligence';

export function detectCategory(text: string) {
  return detectCategoryShared(text) as ComplaintCategory;
}

export function detectDepartment(text: string) {
  return detectDepartmentShared(text) as ComplaintDepartment;
}

export function scoreSentiment(text: string) {
  return scoreSentimentShared(text);
}

export function scoreKeywords(text: string) {
  return scoreDangerKeywordsShared(text);
}

export function scoreFrequency(countLast24Hours: number) {
  return scoreFrequencyShared(countLast24Hours);
}

export function detectSpam(text: string, repeatedCount: number) {
  return detectSpamShared(text, repeatedCount);
}

export function detectHotspot(sameIssueCountLast24Hours: number, threshold = 3) {
  return detectHotspotShared(sameIssueCountLast24Hours, threshold);
}

export function priorityFromRisk(riskScore: number) {
  return priorityFromRiskShared(riskScore) as ComplaintPriority;
}

export function analyzeComplaint(input: {
  title?: string;
  text: string;
  same_issue_count_last_24_hours?: number;
  repeated_count?: number;
  hotspot_threshold?: number;
}) {
  return analyzeComplaintShared(input) as {
    category: ComplaintCategory;
    department: ComplaintDepartment;
    priority: ComplaintPriority;
    risk_score: number;
    keyword_score: number;
    sentiment_score: number;
    frequency_score: number;
    repeated_score: number;
    is_spam: boolean;
    spam_reasons: string[];
    is_hotspot: boolean;
    hotspot_count: number;
  };
}
