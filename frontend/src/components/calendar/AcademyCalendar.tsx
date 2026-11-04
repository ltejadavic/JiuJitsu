'use client';

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventContentArg } from '@fullcalendar/core';
import { Check, X, Clock, Users } from 'lucide-react';

interface AcademyCalendarProps {
  classes: any[];
  onDateClick: (dateStr: string) => void;
  onEventClick: (classSession: any) => void;
  onDatesSet: (startStr: string, endStr: string) => void;
}

export default function AcademyCalendar({
  classes,
  onDateClick,
  onEventClick,
  onDatesSet,
}: AcademyCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null);

  // Force FullCalendar to calculate its viewport coordinates on initial mount
  // to prevent unmeasured layout hit-boxes from capturing pointer events outside the calendar
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (calendarRef.current) {
          const calendarApi = (calendarRef.current as any).getApi?.();
          calendarApi?.updateSize?.();
        }
      } catch (err) {
        // Safe silent catch
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Map backend classes to FullCalendar event format (memoized to prevent redundant renders)
  const events = useMemo(() => {
    if (!Array.isArray(classes)) return [];

    return classes
      .filter((session) => session && session.id && session.course)
      .map((session) => {
        const isCancelled = session.status === 'CANCELLED';
        const isCompleted = session.status === 'COMPLETED';

        return {
          id: session.id,
          title: session.course?.name || 'Class',
          start: session.startTime,
          end: session.endTime,
          backgroundColor: session.course?.colorHex || '#3b82f6',
          borderColor: session.course?.colorHex || '#3b82f6',
          extendedProps: {
            rawClass: session,
            type: session.type,
            status: session.status,
            instructors: Array.isArray(session.teachers)
              ? session.teachers
                  .map((t: any) => `${t.teacher?.firstName || ''} ${t.teacher?.lastName || ''}`.trim())
                  .filter(Boolean)
                  .join(', ')
              : '',
            studentCount: Array.isArray(session.students) ? session.students.length : 0,
          },
        };
      });
  }, [classes]);

  const renderEventContent = useCallback((eventInfo: EventContentArg) => {
    const rawClass = eventInfo.event.extendedProps?.rawClass;
    if (!rawClass) return null;

    const { status, instructors } = eventInfo.event.extendedProps;
    const isCompleted = status === 'COMPLETED';
    const isCancelled = status === 'CANCELLED';
    const courseColor = rawClass.course?.colorHex || '#3b82f6';
    const courseName = rawClass.course?.name || eventInfo.event.title;

    return (
      <div
        className={`w-full overflow-hidden rounded-md px-1.5 py-1 text-[11px] leading-tight transition hover:opacity-90 shadow-xs ${
          isCancelled ? 'opacity-40 line-through bg-slate-200 text-slate-600' : 'text-white'
        }`}
        style={!isCancelled ? { backgroundColor: courseColor } : undefined}
      >
        <div className="flex items-center justify-between gap-1 font-semibold">
          <span className="truncate">{eventInfo.timeText || eventInfo.event.title}</span>
          {isCompleted && <Check className="h-3 w-3 shrink-0 stroke-[3]" />}
        </div>
        <div className="truncate font-bold">{courseName}</div>
        {instructors ? (
          <div className="truncate text-[10px] opacity-90">
            {instructors}
          </div>
        ) : null}
      </div>
    );
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm relative z-10">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        firstDay={1} // Monday
        locale="en"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        slotMinTime="06:00:00"
        slotMaxTime="23:30:00"
        allDaySlot={false}
        events={events}
        eventContent={renderEventContent}
        dateClick={(info) => onDateClick(info.dateStr)}
        eventClick={(info) => onEventClick(info.event.extendedProps.rawClass)}
        datesSet={(dateInfo) => onDatesSet(dateInfo.startStr, dateInfo.endStr)}
        selectable={false}
        editable={false}
        droppable={false}
        unselectAuto={true}
        height="auto"
        aspectRatio={1.5}
      />
    </div>
  );
}

export { AcademyCalendar };

