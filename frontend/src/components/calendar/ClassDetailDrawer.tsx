'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import {
  Calendar,
  Clock,
  Users,
  GraduationCap,
  Edit2,
  XCircle,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface ClassDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  classSession: any | null;
  onEdit: (classSession: any) => void;
  onCancel: (classSession: any) => void;
  onDelete: (classSession: any) => void;
  onComplete: (classSession: any) => void;
}

export function ClassDetailDrawer({
  isOpen,
  onClose,
  classSession,
  onEdit,
  onCancel,
  onDelete,
  onComplete,
}: ClassDetailDrawerProps) {
  if (!isOpen || !classSession) return null;

  const startTime = new Date(classSession.startTime);
  const endTime = new Date(classSession.endTime);
  const isScheduled = classSession.status === 'SCHEDULED';
  const isCompleted = classSession.status === 'COMPLETED';
  const isCancelled = classSession.status === 'CANCELLED';

  const renderStatusBadge = () => {
    if (isCompleted) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
          Completed
        </span>
      );
    }
    if (isCancelled) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 line-through">
          <XCircle className="h-3.5 w-3.5 text-slate-400" />
          Cancelled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
        <Clock className="h-3.5 w-3.5 text-blue-700" />
        Scheduled
      </span>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Class Session Details"
      description="View schedule, assigned instructors, and student attendance."
      maxWidth="max-w-lg"
    >
      <div className="space-y-5">
        {/* Course Banner */}
        <div
          className="flex items-center justify-between rounded-xl p-4 border"
          style={{
            backgroundColor: `${classSession.course.colorHex}15`,
            borderColor: `${classSession.course.colorHex}40`,
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className="h-4 w-4 rounded-full shadow-sm"
              style={{ backgroundColor: classSession.course.colorHex }}
            />
            <div>
              <h4 className="font-bold text-slate-900">{classSession.course.name}</h4>
              <p className="text-xs text-slate-500">
                {classSession.type === 'GROUP' ? 'Group Class' : 'Private (1-on-1)'}
              </p>
            </div>
          </div>
          <div>{renderStatusBadge()}</div>
        </div>

        {/* Schedule Info */}
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>
              {startTime.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <Clock className="h-4 w-4 text-slate-400" />
            <span>
              {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
              {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (
              {classSession.durationMinutes} min)
            </span>
          </div>
        </div>

        {/* Instructors */}
        <div>
          <h5 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
            <GraduationCap className="h-4 w-4 text-slate-400" />
            Instructors ({classSession.teachers.length})
          </h5>
          <div className="space-y-1.5">
            {classSession.teachers.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-white p-2.5 text-xs text-slate-800"
              >
                <span className="font-medium">
                  {item.teacher.firstName} {item.teacher.lastName}
                </span>
                <span className="text-slate-500 font-mono">{item.minutesTaught} min taught</span>
              </div>
            ))}
          </div>
        </div>

        {/* Enrolled Students */}
        <div>
          <h5 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
            <Users className="h-4 w-4 text-slate-400" />
            Enrolled Students ({classSession.students.length})
          </h5>
          {classSession.students.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No students pre-enrolled.</p>
          ) : (
            <div className="max-h-36 overflow-y-auto space-y-1 rounded-xl border border-slate-100 p-2 bg-slate-50/50">
              {classSession.students.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg bg-white p-2 text-xs border border-slate-100"
                >
                  <span className="font-medium text-slate-800">
                    {item.student.firstName} {item.student.lastName}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      item.attendanceStatus === 'ATTENDED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.attendanceStatus === 'ABSENT'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.attendanceStatus}
                    {item.attendanceStatus === 'ATTENDED' ? ` (${item.minutesAttended}m)` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        {classSession.notes && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-700 mb-1">Notes:</p>
            <p className="whitespace-pre-wrap">{classSession.notes}</p>
          </div>
        )}

        {/* Action Buttons - Sticky Footer */}
        <div className="sticky bottom-0 -mx-5 -mb-4 sm:-mx-6 sm:-mb-4 bg-white/95 backdrop-blur-xs px-5 sm:px-6 py-3 border-t border-slate-100 flex flex-col gap-2 z-20">
          {isScheduled && (
            <button
              onClick={() => onComplete(classSession)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition"
            >
              <CheckCircle2 className="h-4 w-4" />
              Complete Class & Check In
            </button>
          )}

          <div className="flex items-center gap-2">
            {isScheduled && (
              <>
                <button
                  onClick={() => onEdit(classSession)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => onCancel(classSession)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Cancel Class
                </button>
                <button
                  onClick={() => onDelete(classSession)}
                  className="rounded-xl border border-red-200 p-2.5 text-red-600 hover:bg-red-50"
                  title="Delete Class"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

