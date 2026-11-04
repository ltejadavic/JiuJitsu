'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Modal } from '@/components/ui/Modal';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  GraduationCap,
  Plus,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

interface StudentAttendanceRecord {
  studentId: string;
  name: string;
  status: 'ATTENDED' | 'ABSENT';
  minutesAttended: number;
}

interface TeacherConfirmation {
  teacherId: string;
  name: string;
  minutesTaught: number;
}

interface CompleteClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  classSession: any | null;
}

export function CompleteClassModal({
  isOpen,
  onClose,
  classSession,
}: CompleteClassModalProps) {
  const queryClient = useQueryClient();

  const [teachers, setTeachers] = useState<TeacherConfirmation[]>([]);
  const [attendances, setAttendances] = useState<StudentAttendanceRecord[]>([]);
  const [selectedWalkInStudentId, setSelectedWalkInStudentId] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch all students to allow walk-in additions
  const { data: allStudents } = useQuery<any[]>({
    queryKey: ['students'],
    queryFn: () => apiClient<any[]>('/students'),
    enabled: isOpen,
  });

  useEffect(() => {
    if (!classSession || !isOpen) return;

    const duration = classSession.durationMinutes;

    // Initialize teachers
    setTeachers(
      classSession.teachers.map((t: any) => ({
        teacherId: t.teacherId,
        name: `${t.teacher.firstName} ${t.teacher.lastName}`,
        minutesTaught: t.minutesTaught || duration,
      })),
    );

    // Initialize students
    setAttendances(
      classSession.students.map((s: any) => ({
        studentId: s.studentId,
        name: `${s.student.firstName} ${s.student.lastName}`,
        status: s.attendanceStatus === 'ABSENT' ? 'ABSENT' : 'ATTENDED',
        minutesAttended: s.minutesAttended > 0 ? s.minutesAttended : duration,
      })),
    );

    setSelectedWalkInStudentId('');
    setError(null);
  }, [classSession, isOpen]);

  const completeMutation = useMutation({
    mutationFn: (payload: any) =>
      apiClient(`/classes/${classSession.id}/complete`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      onClose();
    },
    onError: (err: any) => setError(err.message),
  });

  const handleTeacherMinutesChange = (teacherId: string, minutes: number) => {
    setTeachers((prev) =>
      prev.map((t) => (t.teacherId === teacherId ? { ...t, minutesTaught: minutes } : t)),
    );
  };

  const handleToggleAttendance = (studentId: string) => {
    const duration = classSession?.durationMinutes || 60;
    setAttendances((prev) =>
      prev.map((a) => {
        if (a.studentId === studentId) {
          const newStatus = a.status === 'ATTENDED' ? 'ABSENT' : 'ATTENDED';
          return {
            ...a,
            status: newStatus,
            minutesAttended: newStatus === 'ATTENDED' ? duration : 0,
          };
        }
        return a;
      }),
    );
  };

  const handleStudentMinutesChange = (studentId: string, minutes: number) => {
    setAttendances((prev) =>
      prev.map((a) => (a.studentId === studentId ? { ...a, minutesAttended: minutes } : a)),
    );
  };

  const handleAddWalkInStudent = () => {
    if (!selectedWalkInStudentId) return;

    const studentObj = allStudents?.find((s) => s.id === selectedWalkInStudentId);
    if (!studentObj) return;

    if (attendances.some((a) => a.studentId === selectedWalkInStudentId)) {
      alert('This student is already in the attendance sheet.');
      return;
    }

    const duration = classSession?.durationMinutes || 60;
    setAttendances((prev) => [
      ...prev,
      {
        studentId: studentObj.id,
        name: `${studentObj.firstName} ${studentObj.lastName}`,
        status: 'ATTENDED',
        minutesAttended: duration,
      },
    ]);

    setSelectedWalkInStudentId('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (teachers.length === 0) {
      setError('At least one instructor must be confirmed.');
      return;
    }

    const payload = {
      teachers: teachers.map((t) => ({
        teacherId: t.teacherId,
        minutesTaught: t.minutesTaught,
      })),
      attendances: attendances.map((a) => ({
        studentId: a.studentId,
        status: a.status,
        minutesAttended: a.status === 'ATTENDED' ? a.minutesAttended : 0,
      })),
    };

    completeMutation.mutate(payload);
  };

  if (!classSession) return null;

  const duration = classSession.durationMinutes;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Attendance Check-In & Finalize Class"
      description={`Confirm verified attendance and teaching hours for ${classSession.course.name}.`}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-600">
            {error}
          </div>
        )}

        {/* Instructors Confirmation */}
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
            <GraduationCap className="h-4 w-4 text-slate-400" />
            Confirmed Instructors & Minutes Taught
          </h4>
          <div className="space-y-2 rounded-xl border border-slate-200 p-3 bg-slate-50/50">
            {teachers.map((teacher) => (
              <div
                key={teacher.teacherId}
                className="flex items-center justify-between rounded-lg bg-white border border-slate-200 p-2.5 text-xs"
              >
                <span className="font-semibold text-slate-800">{teacher.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Minutes Taught:</span>
                  <input
                    type="number"
                    min={0}
                    max={duration}
                    value={teacher.minutesTaught}
                    onChange={(e) =>
                      handleTeacherMinutesChange(teacher.teacherId, parseInt(e.target.value, 10) || 0)
                    }
                    className="w-16 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-right text-xs font-mono font-bold"
                  />
                  <span className="text-slate-400 font-mono">/ {duration}m</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Student Attendance List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700">
              <Users className="h-4 w-4 text-slate-400" />
              Student Roll Call ({attendances.filter((a) => a.status === 'ATTENDED').length} present /{' '}
              {attendances.length} total)
            </h4>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200 p-3 bg-slate-50/50">
            {attendances.length === 0 ? (
              <p className="text-center py-4 text-xs text-slate-400 italic">
                No students enrolled yet. Add walk-in attendees below.
              </p>
            ) : (
              attendances.map((item) => {
                const isAttended = item.status === 'ATTENDED';

                return (
                  <div
                    key={item.studentId}
                    className={`flex items-center justify-between gap-3 rounded-lg border p-2.5 text-xs transition ${
                      isAttended
                        ? 'border-emerald-200 bg-emerald-50/50'
                        : 'border-slate-200 bg-white opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleAttendance(item.studentId)}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition ${
                          isAttended
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {isAttended ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Present
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5 text-slate-500" />
                            Absent
                          </>
                        )}
                      </button>
                      <span className="font-semibold text-slate-800">{item.name}</span>
                    </div>

                    {isAttended && (
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <span className="text-[11px] text-slate-500">Trained:</span>
                        <input
                          type="number"
                          min={1}
                          max={duration}
                          value={item.minutesAttended}
                          onChange={(e) =>
                            handleStudentMinutesChange(item.studentId, parseInt(e.target.value, 10) || 0)
                          }
                          className="w-16 rounded-md border border-slate-200 bg-white px-2 py-1 text-right text-xs font-mono font-semibold"
                        />
                        <span className="text-slate-400 font-mono">min</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Walk-in Student Quick Add */}
          <div className="mt-3 flex items-center gap-2">
            <select
              value={selectedWalkInStudentId}
              onChange={(e) => setSelectedWalkInStudentId(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 transition focus:border-blue-500 focus:outline-none"
            >
              <option value="">+ Add Walk-In / Unscheduled Student...</option>
              {allStudents
                ?.filter((s) => !attendances.some((a) => a.studentId === s.id))
                .map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.firstName} {student.lastName} ({student.subscriptionStatus})
                  </option>
                ))}
            </select>
            <button
              type="button"
              disabled={!selectedWalkInStudentId}
              onClick={handleAddWalkInStudent}
              className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              Add Student
            </button>
          </div>
        </div>

        {/* Footer Actions - Sticky */}
        <div className="sticky bottom-0 -mx-5 -mb-4 sm:-mx-6 sm:-mb-4 bg-white/95 backdrop-blur-xs px-5 sm:px-6 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 z-20">
          <p className="text-[11px] text-slate-500 hidden sm:block">
            Completing this session will immediately feed its hours into the analytics dashboard.
          </p>
          <div className="flex w-full sm:w-auto items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={completeMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-70 transition"
            >
              {completeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Finalize Class & Commit Hours
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
