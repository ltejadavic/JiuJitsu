'use client';

import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toPng } from 'html-to-image';
import Cookies from 'js-cookie';
import { DatabaseBackupButton } from '@/components/ui/DatabaseBackupButton';
import {
  Calendar,
  Clock,
  GraduationCap,
  Users,
  UserCheck,
  DollarSign,
  Loader2,
  TrendingUp,
  FileSpreadsheet,
  Award,
  Sparkles,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Layers,
} from 'lucide-react';

interface Course {
  id: string;
  name: string;
}

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
}

const PALETTE = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
  '#14B8A6', // Teal
];

interface DonutSlice {
  label: string;
  value: number;
  color: string;
  formattedValue?: string;
  sublabel?: string;
}

function DonutChart({
  slices,
  centerValue,
  centerLabel,
  size = 180,
  strokeWidth = 24,
}: {
  slices: DonutSlice[];
  centerValue: string;
  centerLabel: string;
  size?: number;
  strokeWidth?: number;
}) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {total === 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
          />
        ) : (
          slices.map((slice, index) => {
            const percent = slice.value / total;
            const strokeDasharray = `${percent * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedPercent * circumference;
            accumulatedPercent += percent;

            return (
              <circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            );
          })
        )}
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
        <span className="text-base sm:text-lg font-black font-mono text-slate-900 leading-tight">
          {centerValue}
        </span>
        <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 mt-0.5">
          {centerLabel}
        </span>
      </div>
    </div>
  );
}

function ComparisonBadge({
  comparison,
  unit = '',
}: {
  comparison?: {
    diff: number;
    percentage: number | null;
    label: string;
    direction: 'up' | 'down' | 'neutral';
    previousValue: number;
  };
  unit?: string;
}) {
  if (!comparison) return null;

  if (comparison.percentage === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
        <span>{comparison.label}</span>
      </span>
    );
  }

  const isPositive = comparison.direction === 'up';
  const isNeutral = comparison.direction === 'neutral';

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        isNeutral
          ? 'bg-slate-100 text-slate-600'
          : isPositive
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-rose-100 text-rose-800'
      }`}
    >
      {isNeutral ? (
        <Minus className="h-3 w-3" />
      ) : isPositive ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      <span>
        {comparison.label} ({comparison.diff > 0 ? `+${comparison.diff}` : comparison.diff}
        {unit})
      </span>
    </span>
  );
}

export default function ReportsPage() {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Default to current month
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth();
  const currentMonthStr = `${currentYear}-${String(currentMonthNum + 1).padStart(2, '0')}`;

  const firstDayOfMonth = new Date(currentYear, currentMonthNum, 1).toISOString().split('T')[0];
  const lastDayOfMonth = new Date(currentYear, currentMonthNum + 1, 0).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(lastDayOfMonth);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('week');
  const [activeTab, setActiveTab] = useState<'instructors' | 'students'>('instructors');

  // Queries
  const { data: courses } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => apiClient<Course[]>('/courses'),
  });

  const { data: teachers } = useQuery<Teacher[]>({
    queryKey: ['teachers'],
    queryFn: () => apiClient<Teacher[]>('/teachers'),
  });

  const queryParams = new URLSearchParams({
    startDate,
    endDate,
  });
  if (selectedCourseId) queryParams.append('courseId', selectedCourseId);
  if (selectedTeacherId) queryParams.append('teacherId', selectedTeacherId);

  const { data: summaryData, isLoading: isLoadingSummary } = useQuery<any>({
    queryKey: ['reports-summary', startDate, endDate, selectedCourseId, selectedTeacherId],
    queryFn: () => apiClient<any>(`/reports/summary?${queryParams.toString()}`),
  });

  const { data: timeSeriesData = [], isLoading: isLoadingSeries } = useQuery<any[]>({
    queryKey: ['reports-time-series', startDate, endDate, selectedCourseId, selectedTeacherId, groupBy],
    queryFn: () => {
      const p = new URLSearchParams(queryParams);
      p.append('groupBy', groupBy);
      return apiClient<any[]>(`/reports/time-series?${p.toString()}`);
    },
  });

  const { data: teacherRankings = [], isLoading: isLoadingTeachers } = useQuery<any[]>({
    queryKey: ['reports-teachers', startDate, endDate, selectedCourseId],
    queryFn: () => apiClient<any[]>(`/reports/teachers?${queryParams.toString()}`),
  });

  const { data: studentRankings = [], isLoading: isLoadingStudents } = useQuery<any[]>({
    queryKey: ['reports-students', startDate, endDate, selectedCourseId],
    queryFn: () => apiClient<any[]>(`/reports/students?${queryParams.toString()}`),
  });

  // Preset Handlers
  const setPresetThisWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(d.getFullYear(), d.getMonth(), diff);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

    const mYear = monday.getFullYear();
    const mMonth = String(monday.getMonth() + 1).padStart(2, '0');
    const mDay = String(monday.getDate()).padStart(2, '0');
    const sYear = sunday.getFullYear();
    const sMonth = String(sunday.getMonth() + 1).padStart(2, '0');
    const sDay = String(sunday.getDate()).padStart(2, '0');

    setStartDate(`${mYear}-${mMonth}-${mDay}`);
    setEndDate(`${sYear}-${sMonth}-${sDay}`);
    setGroupBy('day');
  };

  const setPresetThisMonth = () => {
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
    setStartDate(start);
    setEndDate(end);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setGroupBy('week');
  };

  const setPresetThisYear = () => {
    const d = new Date();
    setStartDate(`${d.getFullYear()}-01-01`);
    setEndDate(`${d.getFullYear()}-12-31`);
    setGroupBy('month');
  };

  const handleMonthChange = (monthStr: string) => {
    setSelectedMonth(monthStr);
    if (!monthStr) return;
    const [year, month] = monthStr.split('-').map(Number);
    const start = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const end = new Date(year, month, 0).toISOString().split('T')[0];
    setStartDate(start);
    setEndDate(end);
    setGroupBy('week');
  };

  // Excel Export Handler with Chart Snapshot
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);

      let chartImageBase64: string | undefined = undefined;
      if (chartRef.current) {
        try {
          chartImageBase64 = await toPng(chartRef.current, {
            quality: 0.95,
            backgroundColor: '#ffffff',
          });
        } catch (imgErr) {
          console.warn('Could not snapshot chart canvas, proceeding without embedded image:', imgErr);
        }
      }

      const token = Cookies.get('token');
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

      const response = await fetch(`${apiBase}/reports/export/excel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          startDate,
          endDate,
          courseId: selectedCourseId || undefined,
          teacherId: selectedTeacherId || undefined,
          chartImageBase64,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Export failed (${response.status}): ${errorText || 'Server error'}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bjj-academy-report-${startDate}-to-${endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const kpis = summaryData?.kpis;
  const comparisons = summaryData?.comparisons;

  // Donut slices for Teacher Hours
  const totalTeachingHours = kpis?.teachingHours || 0;
  const teacherHourSlices: DonutSlice[] = teacherRankings.map((t, idx) => ({
    label: t.name,
    value: t.totalHours,
    color: PALETTE[idx % PALETTE.length],
    formattedValue: `${t.totalHours} h`,
    sublabel: `${t.completedClasses} classes`,
  }));

  // Donut slices for Teacher Cost
  const totalTeachingCost = kpis?.estimatedTeachingCost || 0;
  const teacherCostSlices: DonutSlice[] = teacherRankings
    .filter((t) => t.estimatedCost !== null && t.estimatedCost > 0)
    .map((t, idx) => ({
      label: t.name,
      value: t.estimatedCost,
      color: PALETTE[idx % PALETTE.length],
      formattedValue: `€${t.estimatedCost.toFixed(2)}`,
      sublabel: t.hourlyRate !== null ? `€${t.hourlyRate.toFixed(2)}/h` : 'No rate',
    }));

  return (
    <div className="space-y-6">
      {/* Header & Export Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Analytics & Operational Reports</h1>
          <p className="text-sm text-slate-500">
            Monitor mat density, class volume, coaching compensation, and student attendance engagement.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <DatabaseBackupButton variant="button" />
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-70 transition cursor-pointer"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Excel...
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-4 w-4" />
                Export to Excel (.xlsx)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter Toolbar with Presets & Month Picker */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        {/* Preset Period Buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs border-b border-slate-100 pb-3">
          <span className="font-semibold text-slate-500 uppercase tracking-wider pr-1">Period Presets:</span>
          <button
            type="button"
            onClick={setPresetThisWeek}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 font-medium transition cursor-pointer"
          >
            This Week
          </button>
          <button
            type="button"
            onClick={setPresetThisMonth}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 font-medium transition cursor-pointer"
          >
            This Month
          </button>
          <button
            type="button"
            onClick={setPresetThisYear}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 font-medium transition cursor-pointer"
          >
            This Year
          </button>

          <div className="h-4 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

          {/* Specific Month Picker */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Select Month:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-800 text-xs focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Custom Range & Filters */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-800"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-800"
            />
          </div>

          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700"
          >
            <option value="">All Courses</option>
            {courses?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700"
          >
            <option value="">All Instructors</option>
            {teachers?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.firstName} {t.lastName}
              </option>
            ))}
          </select>

          <div className="ml-auto flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <span className="text-[11px] font-semibold text-slate-500 px-2">Group:</span>
            <button
              type="button"
              onClick={() => setGroupBy('day')}
              className={`rounded-lg px-2.5 py-1 font-semibold text-xs transition ${
                groupBy === 'day' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setGroupBy('week')}
              className={`rounded-lg px-2.5 py-1 font-semibold text-xs transition ${
                groupBy === 'week' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setGroupBy('month')}
              className={`rounded-lg px-2.5 py-1 font-semibold text-xs transition ${
                groupBy === 'month' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>
      </div>

      {/* Highlights Banner: Academy Output Summary */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-blue-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-4 w-4" />
              <span>Academy Operational Output ({startDate} to {endDate})</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              {kpis?.totalClasses || 0} Total Completed Classes
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Delivered across all instructors and disciplines, generating{' '}
              <strong className="text-white">{kpis?.classHours || 0} mat hours</strong> with an average of{' '}
              <strong className="text-white">{kpis?.averageAttendancePerClass || 0} students/session</strong>.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
            <div className="rounded-xl bg-white/10 backdrop-blur-xs p-3 text-center border border-white/10">
              <span className="block text-xl font-bold font-mono">{kpis?.activeTeachers || 0}</span>
              <span className="text-[11px] text-slate-300">Active Coaches</span>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-xs p-3 text-center border border-white/10">
              <span className="block text-xl font-bold font-mono">{kpis?.uniqueAttendingStudents || 0}</span>
              <span className="text-[11px] text-slate-300">Students Attending</span>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-xs p-3 text-center border border-white/10 col-span-2 sm:col-span-1">
              <span className="block text-xl font-bold font-mono text-emerald-300">
                €{kpis?.estimatedTeachingCost?.toFixed(2) || '0.00'}
              </span>
              <span className="text-[11px] text-slate-300">Est. Coaching Cost</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6 Reorganized Executive KPI Cards with MoM Comparisons */}
      {isLoadingSummary ? (
        <div className="flex h-36 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {/* 1. Classes Completed with MoM */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Completed</span>
                <Calendar className="h-4 w-4 text-blue-500" />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900 font-mono">
                {kpis?.totalClasses || 0}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex flex-col gap-1">
              <ComparisonBadge comparison={comparisons?.totalClasses} />
              <span className="text-[10px] text-slate-400">
                Prev: {comparisons?.totalClasses?.previousValue ?? 0} classes
              </span>
            </div>
          </div>

          {/* 2. Mat Hours (Elapsed Session Time) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Mat Hours</span>
                <Clock className="h-4 w-4 text-indigo-500" />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900 font-mono">
                {kpis?.classHours || 0}
                <span className="text-sm font-normal text-slate-500 ml-1">h</span>
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex flex-col gap-1">
              <ComparisonBadge comparison={comparisons?.classHours} unit="h" />
              <span className="text-[10px] text-slate-400">Elapsed session time</span>
            </div>
          </div>

          {/* 3. Average Attendance (Mat Density) - Replaces redundant Student Hours */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Mat Density</span>
                <Users className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900 font-mono">
                {kpis?.averageAttendancePerClass || 0}
                <span className="text-xs font-normal text-slate-500 ml-1">avg</span>
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex flex-col gap-1">
              <ComparisonBadge comparison={comparisons?.averageAttendance} />
              <span className="text-[10px] text-slate-400">Students / class</span>
            </div>
          </div>

          {/* 4. Top Discipline & Format - Replaces redundant Teaching Hours */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Top Course</span>
                <Layers className="h-4 w-4 text-purple-500" />
              </div>
              <p className="mt-2 text-sm font-bold text-slate-900 truncate" title={kpis?.topCourse?.name || 'None'}>
                {kpis?.topCourse?.name || 'No classes'}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex flex-col gap-1">
              {kpis?.topCourse ? (
                <span className="text-[11px] font-semibold text-purple-700">
                  {kpis.topCourse.classesCount} classes ({kpis.topCourse.percentage}%)
                </span>
              ) : (
                <span className="text-[11px] text-slate-400">No session data</span>
              )}
              <span className="text-[10px] text-slate-400">
                {kpis?.formatBreakdown?.group || 0} Group · {kpis?.formatBreakdown?.individual || 0} Private
              </span>
            </div>
          </div>

          {/* 5. Student Engagement & Activation Ratio */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Engagement</span>
                <UserCheck className="h-4 w-4 text-cyan-500" />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900 font-mono">
                {kpis?.studentActivationRate || 0}%
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-slate-700">
                {kpis?.uniqueAttendingStudents || 0} of {kpis?.totalRegisteredActiveStudents || 0} active
              </span>
              <span className="text-[10px] text-slate-400">Attended mat session</span>
            </div>
          </div>

          {/* 6. Estimated Coaching Cost / Payout with MoM */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Est. Payout</span>
                <DollarSign className="h-4 w-4 text-amber-500" />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900 font-mono">
                €{kpis?.estimatedTeachingCost?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex flex-col gap-1">
              <ComparisonBadge comparison={comparisons?.estimatedCost} unit="€" />
              <span className="text-[10px] text-slate-400">
                {kpis?.unratedTeachingHours > 0
                  ? `${kpis.unratedTeachingHours}h unrated`
                  : `${kpis?.activeTeachers || 0} coaches active`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Pie / Donut Charts: Instructor Workload & Cost Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart 1: Instructor Workload Distribution (% of Teaching Hours) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-blue-600" />
              <h3 className="font-bold text-slate-900">Teaching Hours Share by Instructor</h3>
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 font-mono">
              {totalTeachingHours} h Total
            </span>
          </div>

          {teacherHourSlices.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-xs text-slate-400 italic">
              No instructor hours recorded in this period.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
              <DonutChart
                slices={teacherHourSlices}
                centerValue={`${totalTeachingHours}h`}
                centerLabel="Taught Hours"
              />

              <div className="flex-1 w-full space-y-2 max-h-48 overflow-y-auto pr-1">
                {teacherHourSlices.map((slice, idx) => {
                  const pct = totalTeachingHours > 0 ? Math.round((slice.value / totalTeachingHours) * 100) : 0;
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
                        <span className="font-semibold text-slate-800 truncate">{slice.label}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
                        <span className="text-slate-500">{slice.formattedValue}</span>
                        <span className="font-bold text-slate-900 w-10 text-right">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Donut Chart 2: Coaching Payout & Financial Share */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900">Coaching Payout Distribution (€)</h3>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 font-mono">
              €{totalTeachingCost.toFixed(2)} Total
            </span>
          </div>

          {teacherCostSlices.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-xs text-slate-400 italic">
              {kpis?.unratedTeachingHours > 0
                ? 'Coaches have hours but no hourly rates configured in their profile.'
                : 'No coaching costs incurred in this period.'}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
              <DonutChart
                slices={teacherCostSlices}
                centerValue={`€${Math.round(totalTeachingCost)}`}
                centerLabel="Coaching Payout"
              />

              <div className="flex-1 w-full space-y-2 max-h-48 overflow-y-auto pr-1">
                {teacherCostSlices.map((slice, idx) => {
                  const pct = totalTeachingCost > 0 ? Math.round((slice.value / totalTeachingCost) * 100) : 0;
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
                        <div className="truncate">
                          <p className="font-semibold text-slate-800 truncate">{slice.label}</p>
                          <p className="text-[10px] text-slate-400">{slice.sublabel}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
                        <span className="text-emerald-700 font-semibold">{slice.formattedValue}</span>
                        <span className="font-bold text-slate-900 w-10 text-right">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Charts Row: Timeline & Cumulative Progression */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Training Activity & Mat Hours Evolution (Ref captured for Excel export!) */}
        <div
          ref={chartRef}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h3 className="font-bold text-slate-900">Training Activity & Mat Utilization</h3>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 capitalize">
              {groupBy} view
            </span>
          </div>

          {timeSeriesData.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-xs text-slate-400 italic">
              No completed classes recorded in this date range. Complete sessions in the calendar to populate time trends.
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {timeSeriesData.map((item, idx) => {
                  const maxHour = Math.max(...timeSeriesData.map((d) => Math.max(d.classHours, 1)));
                  const classPct = Math.min(Math.round((item.classHours / maxHour) * 100), 100);
                  const avgDensity = item.classes > 0 ? Math.round((item.studentHours / item.classHours) * 10) / 10 : 0;

                  return (
                    <div key={idx} className="space-y-1.5 rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                        <span>{item.label}</span>
                        <div className="flex items-center gap-3 font-mono text-[11px]">
                          <span className="text-slate-500">{item.classes} class(es)</span>
                          <span className="text-emerald-700 font-semibold">{avgDensity} avg students</span>
                        </div>
                      </div>

                      {/* Class Mat Hours bar */}
                      <div className="flex items-center gap-3 text-xs">
                        <span className="w-20 text-[11px] text-slate-500">Mat Hours:</span>
                        <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all"
                            style={{ width: `${classPct}%` }}
                          />
                        </div>
                        <span className="w-14 text-right font-mono font-bold text-slate-800">
                          {item.classHours} h
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2 text-xs text-slate-500 border-t border-slate-100">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                  Elapsed Mat Hours per interval
                </span>
                <span className="font-mono text-slate-600 font-semibold">
                  {kpis?.totalClasses || 0} classes total
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Chart 2: Cumulative Taught Hours Progression */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              <h3 className="font-bold text-slate-900">Cumulative Teaching Hours Progression</h3>
            </div>
            <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700">
              Running Total
            </span>
          </div>

          {timeSeriesData.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-xs text-slate-400 italic">
              No progression data available for this range.
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {timeSeriesData.map((item, idx) => {
                  const maxCumulTeaching = Math.max(
                    ...timeSeriesData.map((d) => d.cumulativeTeachingHours || d.teachingHours || 1),
                  );
                  const cumulTeachPct = Math.min(
                    Math.round(((item.cumulativeTeachingHours || 0) / maxCumulTeaching) * 100),
                    100,
                  );

                  return (
                    <div key={idx} className="space-y-1 rounded-xl border border-purple-100/60 p-2.5 bg-purple-50/30">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{item.label}</span>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-slate-500">+{item.teachingHours}h this step</span>
                          <span className="font-bold text-purple-900">
                            {item.cumulativeTeachingHours || item.teachingHours} h total
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-3 bg-purple-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-600 rounded-full transition-all"
                            style={{ width: `${cumulTeachPct}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-[10px] font-mono text-purple-700 font-bold">
                          {cumulTeachPct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2 text-xs text-slate-500 border-t border-slate-100">
                <span>Total cumulative hours taught across the selected timeframe</span>
                <span className="font-bold text-purple-900 font-mono">
                  Final: {timeSeriesData[timeSeriesData.length - 1]?.cumulativeTeachingHours || 0} h
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rankings Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        {/* Tab switch */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('instructors')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                activeTab === 'instructors'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Instructor Leaderboard ({teacherRankings.length})
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                activeTab === 'students'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Student Attendance Ranking ({studentRankings.length})
            </button>
          </div>
        </div>

        {/* Instructors Table */}
        {activeTab === 'instructors' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Instructor</th>
                  <th className="px-4 py-3">Classes</th>
                  <th className="px-4 py-3">Taught Hours</th>
                  <th className="px-4 py-3">Hourly Rate</th>
                  <th className="px-4 py-3 text-right">Estimated Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teacherRankings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                      No instructor hours recorded in this date range.
                    </td>
                  </tr>
                ) : (
                  teacherRankings.map((t, index) => (
                    <tr key={t.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-mono font-bold text-slate-400">#{index + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{t.name}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono">{t.completedClasses}</td>
                      <td className="px-4 py-3 font-bold text-slate-800 font-mono">{t.totalHours} h</td>
                      <td className="px-4 py-3 text-slate-600 font-mono">
                        {t.hourlyRate !== null ? `€${t.hourlyRate.toFixed(2)}/h` : 'Not set'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                        {t.estimatedCost !== null ? `€${t.estimatedCost.toFixed(2)}` : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Students Table */}
        {activeTab === 'students' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Membership Tier</th>
                  <th className="px-4 py-3">Classes Attended</th>
                  <th className="px-4 py-3 text-right">Attended Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentRankings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">
                      No student attendance recorded in this date range.
                    </td>
                  </tr>
                ) : (
                  studentRankings.map((s, index) => (
                    <tr key={s.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-mono font-bold text-slate-400">#{index + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{s.name}</td>
                      <td className="px-4 py-3 text-slate-600 font-medium">{s.activePlan}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono">{s.attendedClasses}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                        {s.totalHours} h
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
