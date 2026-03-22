import 'server-only';

import type { Complaint, ComplaintProofData, ComplaintTimelineData } from '@/lib/types';
import { deleteRedisKeys, getRedisJson, setRedisJson } from '@/lib/server/redis-cache';

const COMPLAINT_SUMMARY_TTL_SECONDS = 60;
const COMPLAINT_TIMELINE_TTL_SECONDS = 30;
const COMPLAINT_PROOF_TTL_SECONDS = 30;
const WORKER_INFO_TTL_SECONDS = 60;

type WorkerCacheRecord = {
  id: string;
  ward_id: number;
  department: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
};

type ComplaintAliasRecord = {
  complaint_id: string;
};

function complaintSummaryCacheKey(complaintId: string) {
  return `complaint:${complaintId}`;
}

function complaintTimelineCacheKey(complaintId: string) {
  return `timeline:${complaintId}`;
}

function complaintProofCacheKey(complaintId: string) {
  return `proof:${complaintId}`;
}

function complaintAliasCacheKey(identifier: string) {
  return `complaint-alias:${identifier}`;
}

function workerCacheKey(workerId: string) {
  return `worker:${workerId}`;
}

function workerUserCacheKey(userId: string) {
  return `worker-user:${userId}`;
}

export async function getCachedComplaintAlias(identifier: string) {
  const alias = await getRedisJson<ComplaintAliasRecord>(complaintAliasCacheKey(identifier));
  return alias?.complaint_id || null;
}

export async function cacheComplaintSummary(complaint: Complaint, identifiers: string[] = []) {
  const aliasIdentifiers = new Set(
    [complaint.id, complaint.complaint_id, complaint.tracking_code, ...identifiers]
      .map((value) => value?.trim())
      .filter(Boolean) as string[],
  );

  await Promise.all([
    setRedisJson(complaintSummaryCacheKey(complaint.complaint_id), complaint, COMPLAINT_SUMMARY_TTL_SECONDS),
    ...[...aliasIdentifiers].map((identifier) =>
      setRedisJson(
        complaintAliasCacheKey(identifier),
        { complaint_id: complaint.complaint_id },
        COMPLAINT_SUMMARY_TTL_SECONDS,
      )
    ),
  ]);
}

export async function getCachedComplaintSummary(complaintId: string) {
  return getRedisJson<Complaint>(complaintSummaryCacheKey(complaintId));
}

export async function cacheComplaintTimeline(data: ComplaintTimelineData) {
  await setRedisJson(complaintTimelineCacheKey(data.complaint_id), data, COMPLAINT_TIMELINE_TTL_SECONDS);
}

export async function getCachedComplaintTimeline(complaintId: string) {
  return getRedisJson<ComplaintTimelineData>(complaintTimelineCacheKey(complaintId));
}

export async function cacheComplaintProof(data: ComplaintProofData) {
  await setRedisJson(complaintProofCacheKey(data.complaint_id), data, COMPLAINT_PROOF_TTL_SECONDS);
}

export async function getCachedComplaintProof(complaintId: string) {
  return getRedisJson<ComplaintProofData>(complaintProofCacheKey(complaintId));
}

export async function cacheWorkerInfo(worker: WorkerCacheRecord) {
  const writes = [
    setRedisJson(workerCacheKey(worker.id), worker, WORKER_INFO_TTL_SECONDS),
  ];

  if (worker.user_id) {
    writes.push(setRedisJson(workerUserCacheKey(worker.user_id), worker, WORKER_INFO_TTL_SECONDS));
  }

  await Promise.all(writes);
}

export async function getCachedWorkerInfoByUserId(userId: string) {
  return getRedisJson<WorkerCacheRecord>(workerUserCacheKey(userId));
}

export async function invalidateComplaintCache(complaintId: string, identifiers: string[] = []) {
  const keys = [
    complaintSummaryCacheKey(complaintId),
    complaintTimelineCacheKey(complaintId),
    complaintProofCacheKey(complaintId),
    ...identifiers
      .map((identifier) => identifier?.trim())
      .filter(Boolean)
      .map((identifier) => complaintAliasCacheKey(identifier)),
  ];

  await deleteRedisKeys(keys);
}
