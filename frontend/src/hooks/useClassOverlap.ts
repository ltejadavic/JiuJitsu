'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

interface OverlapInfo {
  teacherId: string;
  teacherName: string;
  conflictingClassId: string;
  courseName: string;
  startTime: string;
  endTime: string;
}

interface UseClassOverlapProps {
  teacherIds: string[];
  startTime: string;
  durationMinutes: number;
  excludeClassId?: string;
  enabled?: boolean;
}

export function useClassOverlap({
  teacherIds,
  startTime,
  durationMinutes,
  excludeClassId,
  enabled = true,
}: UseClassOverlapProps) {
  const [hasOverlap, setHasOverlap] = useState(false);
  const [overlaps, setOverlaps] = useState<OverlapInfo[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!enabled || teacherIds.length === 0 || !startTime || durationMinutes <= 0) {
      setHasOverlap(false);
      setOverlaps([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsChecking(true);
      try {
        const params = new URLSearchParams({
          teacherIds: teacherIds.join(','),
          startTime,
          durationMinutes: String(durationMinutes),
        });
        if (excludeClassId) {
          params.append('excludeClassId', excludeClassId);
        }

        const res = await apiClient<{ hasOverlap: boolean; overlaps: OverlapInfo[] }>(
          `/classes/check-overlap?${params.toString()}`,
        );

        setHasOverlap(res.hasOverlap);
        setOverlaps(res.overlaps);
      } catch (err) {
        // Soft fail on network error, don't block UI
        setHasOverlap(false);
        setOverlaps([]);
      } finally {
        setIsChecking(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [teacherIds, startTime, durationMinutes, excludeClassId, enabled]);

  return { hasOverlap, overlaps, isChecking };
}

