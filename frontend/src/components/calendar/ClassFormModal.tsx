'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Modal } from '@/components/ui/Modal';
import { useClassOverlap } from '@/hooks/useClassOverlap';
import {
  AlertTriangle,
  Clock,
  Users,
  GraduationCap,
  Loader2,
  Calendar,
  AlertCircle,
  Check,
} from 'lucide-react';

interface Course {
  id: string;
  name: string;
  colorHex: string;
}

interface TeacherCourseRelation {
  courseId: string;
  course?: Course;
}

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  courses?: TeacherCourseRelation[];
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  subscriptionStatus: 'ACTIVE' | 'FUTURE' | 'EXPIRED' | 'NONE';
}

interface TeacherAssignment {
  teacherId: string;
  minutesTaught: number;
}

interface ClassFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDateTime?: string; // ISO date-time
  classToEdit?: any | null;
}

const DURATION_PRESETS = [45, 60, 90, 120];

const isTeacherQualified = (teacher: Teacher, targetCourseId: string): boolean => {
  if (!targetCourseId || !teacher.courses) return false;
  return teacher.courses.some((c) => c.courseId === targetCourseId);
};

export function ClassFormModal({
  isOpen,
  onClose,
  initialDateTime,
  classToEdit,
}: ClassFormModalProps) {
  const queryClient = useQueryClient();

  // Form Fields
  const [courseId, setCourseId] = useState('');
  const [type, setType] = useState<'GROUP' | 'INDIVIDUAL'>('GROUP');
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('18:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [notes, setNotes] = useState('');
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Queries
  const { data: courses } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => apiClient<Course[]>('/courses'),
  });

  const { data: teachers } = useQuery<Teacher[]>({
    queryKey: ['teachers'],
    queryFn: () => apiClient<Teacher[]>('/teachers'),
  });

  const { data: students } = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: () => apiClient<Student[]>('/students'),
  });

  // Calculate full start time ISO
  const combinedStartTimeIso =
    dateStr && timeStr && !isNaN(new Date(`${dateStr}T${timeStr}:00`).getTime())
      ? new Date(`${dateStr}T${timeStr}:00`).toISOString()
      : '';

  // Overlap hook
  const { hasOverlap, overlaps, isChecking } = useClassOverlap({
    teacherIds: teacherAssignments.map((a) => a.teacherId),
    startTime: combinedStartTimeIso,
    durationMinutes,
    excludeClassId: classToEdit?.id,
    enabled: isOpen && !!combinedStartTimeIso,
  });

  // Sync state on open / edit
  useEffect(() => {
    if (!isOpen) return;

    if (classToEdit) {
      setCourseId(classToEdit.courseId);
      setType(classToEdit.type);
      const start = new Date(classToEdit.startTime);
      const year = start.getFullYear();
      const month = String(start.getMonth() + 1).padStart(2, '0');
      const day = String(start.getDate()).padStart(2, '0');
      const hours = String(start.getHours()).padStart(2, '0');
      const minutes = String(start.getMinutes()).padStart(2, '0');
      setDateStr(`${year}-${month}-${day}`);
      setTimeStr(`${hours}:${minutes}`);
      setDurationMinutes(classToEdit.durationMinutes);
      setNotes(classToEdit.notes || '');
      setTeacherAssignments(
        classToEdit.teachers.map((t: any) => ({
          teacherId: t.teacherId,
          minutesTaught: t.minutesTaught,
        })),
      );
      setSelectedStudentIds(classToEdit.students.map((s: any) => s.studentId));
    } else {
      // Default new class
      setType('GROUP');
      setDurationMinutes(60);
      setNotes('');
      setSelectedStudentIds([]);

      // Initialize date & time without timezone offset drift
      if (initialDateTime) {
        if (initialDateTime.includes('T')) {
          const [dPart, tPart] = initialDateTime.split('T');
          setDateStr(dPart);
          setTimeStr(tPart ? tPart.slice(0, 5) : '18:00');
        } else {
          setDateStr(initialDateTime);
          setTimeStr('18:00');
        }
      } else {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        setDateStr(`${year}-${month}-${day}`);
        setTimeStr('18:00');
      }

      if (courses && courses.length > 0) {
        setCourseId(courses[0].id);
      } else {
        setCourseId('');
      }

      // Instructors start completely unselected (admin selects freely)
      setTeacherAssignments([]);
    }
    setFormError(null);
  }, [isOpen, classToEdit, initialDateTime]);

  // Fallback auto-select course only if not yet loaded when modal opened
  useEffect(() => {
    if (!isOpen || classToEdit) return;
    if (courses && courses.length > 0 && !courseId) {
      setCourseId(courses[0].id);
    }
  }, [isOpen, classToEdit, courses, courseId]);

  const handleCourseChange = (newCourseId: string) => {
    setCourseId(newCourseId);
    // Remove any currently assigned instructors that are not qualified for the newly selected course
    setTeacherAssignments((prev) =>
      prev.filter((assignment) => {
        const t = teachers?.find((teach) => teach.id === assignment.teacherId);
        return t ? isTeacherQualified(t, newCourseId) : false;
      }),
    );
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: any) => apiClient('/classes', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      onClose();
    },
    onError: (err: any) => setFormError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: any) => {
      const classId = id || classToEdit?.id;
      if (!classId) {
        throw new Error('Class ID is required to update class.');
      }
      return apiClient(`/classes/${classId}`, { method: 'PATCH', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      onClose();
    },
    onError: (err: any) => setFormError(err.message),
  });

  const handleTeacherToggle = (teacherId: string) => {
    setTeacherAssignments((prev) => {
      const exists = prev.find((a) => a.teacherId === teacherId);
      if (exists) {
        return prev.filter((a) => a.teacherId !== teacherId);
      } else {
        return [...prev, { teacherId, minutesTaught: durationMinutes }];
      }
    });
  };

  const handleTeacherMinutesChange = (teacherId: string, minutes: number) => {
    setTeacherAssignments((prev) =>
      prev.map((a) => (a.teacherId === teacherId ? { ...a, minutesTaught: minutes } : a)),
    );
  };

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
    );
  };

  const handleDurationPreset = (preset: number) => {
    setDurationMinutes(preset);
    // Update teacher minutes to match duration by default
    setTeacherAssignments((prev) =>
      prev.map((a) => ({ ...a, minutesTaught: preset })),
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!courseId) {
      setFormError('Please select a course / discipline.');
      return;
    }

    if (teacherAssignments.length === 0) {
      setFormError('Please select at least one instructor who teaches this course.');
      return;
    }

    // Defensive check: verify all assigned instructors teach this course
    const unqualifiedInstructor = teacherAssignments.find((a) => {
      const t = teachers?.find((teach) => teach.id === a.teacherId);
      return !t || !isTeacherQualified(t, courseId);
    });
    if (unqualifiedInstructor) {
      const t = teachers?.find((teach) => teach.id === unqualifiedInstructor.teacherId);
      setFormError(
        `Instructor ${t ? `${t.firstName} ${t.lastName}` : ''} does not teach this course. Please assign only qualified instructors.`,
      );
      return;
    }

    if (selectedStudentIds.length === 0) {
      setFormError('Please select at least one student to enroll in this class.');
      return;
    }

    if (!dateStr || !timeStr) {
      setFormError('Please specify both a class date and start time.');
      return;
    }

    const startDate = new Date(`${dateStr}T${timeStr}:00`);
    if (isNaN(startDate.getTime())) {
      setFormError('Invalid date or start time specified.');
      return;
    }

    const startTimeIso = startDate.toISOString();

    const payload = {
      courseId,
      type,
      startTime: startTimeIso,
      durationMinutes,
      notes: notes.trim() || undefined,
      teacherAssignments: teacherAssignments.map((a) => ({
        teacherId: a.teacherId,
        minutesTaught: a.minutesTaught || durationMinutes,
      })),
      studentIds: selectedStudentIds,
    };

    if (classToEdit) {
      updateMutation.mutate({ id: classToEdit.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={classToEdit ? 'Edit Scheduled Class' : 'Schedule New Class'}
      description="Plan mat sessions, assign instructors, and pre-enroll students."
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {formError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-600">
            {formError}
          </div>
        )}

        {/* Overlap Warning Banner */}
        {hasOverlap && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 shadow-sm">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold">Instructor Schedule Conflict Detected</p>
                <ul className="mt-1.5 list-disc pl-4 space-y-1 text-amber-800">
                  {overlaps.map((overlap, idx) => (
                    <li key={idx}>
                      <strong>{overlap.teacherName}</strong> is already teaching{' '}
                      <strong>{overlap.courseName}</strong> (
                      {new Date(overlap.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                      - {new Date(overlap.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-amber-700 italic">
                  Note: As an administrator, you may still proceed if this co-teaching or schedule overlap is intentional.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Individual Class Warning if >1 Student */}
        {type === 'INDIVIDUAL' && selectedStudentIds.length > 1 && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 shrink-0" />
            <span>
              <strong>Note:</strong> You selected an <em>Individual (Private)</em> class with {selectedStudentIds.length} students. Individual sessions are typically 1-on-1.
            </span>
          </div>
        )}

        {/* Course & Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Course / Discipline *
            </label>
            <select
              required
              value={courseId}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none"
            >
              <option value="" disabled>Select a course...</option>
              {courses?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Session Format
            </label>
            <div className="mt-1.5 flex gap-2">
              <button
                type="button"
                onClick={() => setType('GROUP')}
                className={`flex-1 rounded-xl border py-2.5 text-xs font-semibold transition ${
                  type === 'GROUP'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Group Class
              </button>
              <button
                type="button"
                onClick={() => setType('INDIVIDUAL')}
                className={`flex-1 rounded-xl border py-2.5 text-xs font-semibold transition ${
                  type === 'INDIVIDUAL'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Private (1-on-1)
              </button>
            </div>
          </div>
        </div>

        {/* Date, Time, Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Date *
            </label>
            <input
              type="date"
              required
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Start Time *
            </label>
            <input
              type="time"
              required
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Duration (Minutes) *
            </label>
            <input
              type="number"
              required
              min={5}
              max={360}
              value={durationMinutes}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10) || 60;
                setDurationMinutes(val);
                setTeacherAssignments((prev) =>
                  prev.map((a) => ({ ...a, minutesTaught: val })),
                );
              }}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none font-mono"
            />
          </div>
        </div>

        {/* Duration Quick Presets */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Presets:</span>
          {DURATION_PRESETS.map((preset) => (
            <button
              type="button"
              key={preset}
              onClick={() => handleDurationPreset(preset)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                durationMinutes === preset
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {preset} min
            </button>
          ))}
        </div>

        {/* Assigned Instructors & Minutes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Assigned Instructors * (Must teach selected course)
            </label>
            {isChecking && <span className="text-[11px] text-slate-400">Checking conflicts...</span>}
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto rounded-xl border border-slate-200 p-2 bg-slate-50/50">
            {teachers?.map((teacher) => {
              const isQualified = isTeacherQualified(teacher, courseId);
              const assignment = teacherAssignments.find((a) => a.teacherId === teacher.id);
              const isAssigned = !!assignment;

              return (
                <div
                  key={teacher.id}
                  className={`flex items-center justify-between gap-3 rounded-lg border p-2.5 transition ${
                    !isQualified
                      ? 'border-slate-200 bg-slate-100/70 opacity-60 cursor-not-allowed'
                      : isAssigned
                      ? 'border-blue-300 bg-blue-50/80'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <label
                    className={`flex items-center gap-2.5 text-xs font-semibold ${
                      isQualified ? 'cursor-pointer text-slate-800' : 'cursor-not-allowed text-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!isQualified}
                      checked={isAssigned}
                      onChange={() => handleTeacherToggle(teacher.id)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <span>
                      {teacher.firstName} {teacher.lastName}
                    </span>
                    {!isQualified && (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        Does not teach this course
                      </span>
                    )}
                  </label>

                  {isAssigned && isQualified && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span>Taught:</span>
                      <input
                        type="number"
                        min={1}
                        max={durationMinutes}
                        value={assignment.minutesTaught}
                        onChange={(e) =>
                          handleTeacherMinutesChange(teacher.id, parseInt(e.target.value, 10) || 0)
                        }
                        className="w-16 rounded-md border border-slate-200 bg-white px-2 py-1 text-right text-xs font-mono"
                      />
                      <span>min</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Pre-Enrolled Students */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
            Enrolled Students * ({selectedStudentIds.length} selected — required)
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto rounded-xl border border-slate-200 p-2 bg-slate-50/50">
            {students?.map((student) => {
              const isSelected = selectedStudentIds.includes(student.id);
              const hasActiveSub = student.subscriptionStatus === 'ACTIVE';

              return (
                <button
                  type="button"
                  key={student.id}
                  onClick={() => handleStudentToggle(student.id)}
                  className={`flex items-center justify-between rounded-lg border p-2 text-left text-xs transition ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 font-semibold text-blue-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">
                    {student.firstName} {student.lastName}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      hasActiveSub
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {hasActiveSub ? 'Subscribed' : 'No Sub'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            Session Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Drills, focus topics, sparring rules..."
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Actions - Sticky Footer */}
        <div className="sticky bottom-0 -mx-5 -mb-4 sm:-mx-6 sm:-mb-4 bg-white/95 backdrop-blur-xs px-5 sm:px-6 py-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 z-20">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-70 transition"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {classToEdit ? 'Save Changes' : 'Schedule Class'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

