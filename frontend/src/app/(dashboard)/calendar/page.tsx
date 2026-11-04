'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { ClassFormModal } from '@/components/calendar/ClassFormModal';
import { ClassDetailDrawer } from '@/components/calendar/ClassDetailDrawer';
import { CompleteClassModal } from '@/components/calendar/CompleteClassModal';
import { Plus, Filter, Calendar as CalendarIcon, Loader2 } from 'lucide-react';

const AcademyCalendar = dynamic(
  () => import('@/components/calendar/AcademyCalendar'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[600px] w-full items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-xs font-medium text-slate-500">Loading interactive calendar...</p>
        </div>
      </div>
    ),
  }
);

interface Course {
  id: string;
  name: string;
  colorHex: string;
}

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
}

export default function CalendarPage() {
  const queryClient = useQueryClient();

  // Date range tracking from FullCalendar
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
  });

  // Filters
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState<string | undefined>(undefined);
  const [editingClass, setEditingClass] = useState<any | null>(null);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any | null>(null);

  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [classToComplete, setClassToComplete] = useState<any | null>(null);

  // Queries
  const { data: courses } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => apiClient<Course[]>('/courses'),
  });

  const { data: teachers } = useQuery<Teacher[]>({
    queryKey: ['teachers'],
    queryFn: () => apiClient<Teacher[]>('/teachers'),
  });

  const { data: classes = [], isLoading } = useQuery<any[]>({
    queryKey: ['classes', dateRange, selectedCourseId, selectedTeacherId, selectedStatus],
    queryFn: () => {
      const params = new URLSearchParams({
        start: dateRange.start,
        end: dateRange.end,
      });
      if (selectedCourseId) params.append('courseId', selectedCourseId);
      if (selectedTeacherId) params.append('teacherId', selectedTeacherId);
      if (selectedStatus) params.append('status', selectedStatus);

      return apiClient<any[]>(`/classes?${params.toString()}`);
    },
    enabled: !!dateRange.start && !!dateRange.end,
  });

  // Cancel Mutation
  const cancelMutation = useMutation({
    mutationFn: (data: { id: string; reason?: string }) =>
      apiClient(`/classes/${data.id}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: data.reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setIsDetailOpen(false);
      setSelectedClass(null);
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/classes/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setIsDetailOpen(false);
      setSelectedClass(null);
    },
  });

  // Calendar Event Handlers
  const handleDateClick = useCallback((dateStr: string) => {
    setSelectedDateTime(dateStr);
    setEditingClass(null);
    setIsFormModalOpen(true);
  }, []);

  const handleEventClick = useCallback((classSession: any) => {
    setSelectedClass(classSession);
    setIsDetailOpen(true);
  }, []);

  const handleDatesSet = useCallback((startStr: string, endStr: string) => {
    setDateRange((prev) => {
      if (prev.start === startStr && prev.end === endStr) return prev;
      return { start: startStr, end: endStr };
    });
  }, []);

  const handleOpenNewClass = useCallback(() => {
    setSelectedDateTime(undefined);
    setEditingClass(null);
    setIsFormModalOpen(true);
  }, []);

  const handleEditFromDetail = (classSession: any) => {
    setIsDetailOpen(false);
    setEditingClass(classSession);
    setIsFormModalOpen(true);
  };

  const handleCancelFromDetail = (classSession: any) => {
    const reason = prompt('Optional cancellation reason (e.g. holiday, mat repairs):');
    if (reason !== null) {
      cancelMutation.mutate({ id: classSession.id, reason });
    }
  };

  const handleDeleteFromDetail = (classSession: any) => {
    if (confirm('Are you sure you want to completely delete this scheduled class?')) {
      deleteMutation.mutate(classSession.id);
    }
  };

  const handleCompleteFromDetail = (classSession: any) => {
    setIsDetailOpen(false);
    setClassToComplete(classSession);
    setIsCompleteModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Interactive Calendar</h1>
          <p className="text-sm text-slate-500">
            Schedule training sessions, check instructor conflicts, and manage attendance.
          </p>
        </div>
        <button
          onClick={handleOpenNewClass}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Schedule Class
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-semibold uppercase tracking-wider pr-2">
          <Filter className="h-3.5 w-3.5" />
          Filters:
        </div>

        {/* Course Filter */}
        <select
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700 transition focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Courses</option>
          {courses?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Teacher Filter */}
        <select
          value={selectedTeacherId}
          onChange={(e) => setSelectedTeacherId(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700 transition focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Instructors</option>
          {teachers?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.firstName} {t.lastName}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700 transition focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        {(selectedCourseId || selectedTeacherId || selectedStatus) && (
          <button
            onClick={() => {
              setSelectedCourseId('');
              setSelectedTeacherId('');
              setSelectedStatus('');
            }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* FullCalendar Component */}
      <AcademyCalendar
        classes={classes}
        onDateClick={handleDateClick}
        onEventClick={handleEventClick}
        onDatesSet={handleDatesSet}
      />

      {/* Schedule / Edit Class Modal */}
      {isFormModalOpen && (
        <ClassFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingClass(null);
          }}
          initialDateTime={selectedDateTime}
          classToEdit={editingClass}
        />
      )}

      {/* Class Details Drawer */}
      {isDetailOpen && (
        <ClassDetailDrawer
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedClass(null);
          }}
          classSession={selectedClass}
          onEdit={handleEditFromDetail}
          onCancel={handleCancelFromDetail}
          onDelete={handleDeleteFromDetail}
          onComplete={handleCompleteFromDetail}
        />
      )}

      {/* Complete Class & Attendance Check-In Modal */}
      {isCompleteModalOpen && (
        <CompleteClassModal
          isOpen={isCompleteModalOpen}
          onClose={() => {
            setIsCompleteModalOpen(false);
            setClassToComplete(null);
          }}
          classSession={classToComplete}
        />
      )}
    </div>
  );
}
