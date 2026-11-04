'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Modal } from '@/components/ui/Modal';
import {
  Plus,
  Users,
  Search,
  Edit2,
  Trash2,
  CreditCard,
  Mail,
  Phone,
  Loader2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Calendar,
} from 'lucide-react';

interface Course {
  id: string;
  name: string;
  colorHex: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  durationMonths: number;
  price: string | null;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  isActive: boolean;
  subscriptionStatus: 'ACTIVE' | 'FUTURE' | 'EXPIRED' | 'NONE';
  currentSubscription: {
    startDate: string;
    endDate: string;
    plan: SubscriptionPlan;
  } | null;
  courses: {
    course: Course;
  }[];
  _count: {
    attendances: number;
  };
}

export default function StudentsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('');

  // Modals state
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [targetStudentForSub, setTargetStudentForSub] = useState<Student | null>(null);

  // Student Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Subscription Assign Form State
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [subError, setSubError] = useState<string | null>(null);

  // Queries
  const { data: students, isLoading } = useQuery<Student[]>({
    queryKey: ['students', searchTerm, selectedCourseFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('q', searchTerm);
      if (selectedCourseFilter) params.append('courseId', selectedCourseFilter);
      return apiClient<Student[]>(`/students?${params.toString()}`);
    },
  });

  const { data: courses } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => apiClient<Course[]>('/courses'),
  });

  const { data: plans } = useQuery<SubscriptionPlan[]>({
    queryKey: ['subscription-plans'],
    queryFn: () => apiClient<SubscriptionPlan[]>('/subscription-plans'),
  });

  // Mutations
  const createStudentMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient('/students', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      closeStudentModal();
    },
    onError: (err: any) => setFormError(err.message),
  });

  const updateStudentMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient(`/students/${data.id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      closeStudentModal();
    },
    onError: (err: any) => setFormError(err.message),
  });

  const deleteStudentMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/students/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });

  const assignSubMutation = useMutation({
    mutationFn: (data: { studentId: string; planId: string; startDate: string }) =>
      apiClient(`/students/${data.studentId}/subscriptions`, {
        method: 'POST',
        body: JSON.stringify({ planId: data.planId, startDate: data.startDate }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      closeSubModal();
    },
    onError: (err: any) => setSubError(err.message),
  });

  // Modal handlers
  const openCreateModal = () => {
    setEditingStudent(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setNotes('');
    setSelectedCourseIds([]);
    setFormError(null);
    setIsStudentModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setFirstName(student.firstName);
    setLastName(student.lastName);
    setEmail(student.email || '');
    setPhone(student.phone || '');
    setNotes(student.notes || '');
    setSelectedCourseIds(student.courses.map((c) => c.course.id));
    setFormError(null);
    setIsStudentModalOpen(true);
  };

  const closeStudentModal = () => {
    setIsStudentModalOpen(false);
    setEditingStudent(null);
    setFormError(null);
  };

  const openAssignSubModal = (student: Student) => {
    setTargetStudentForSub(student);
    setSelectedPlanId(plans && plans.length > 0 ? plans[0].id : '');
    setStartDate(new Date().toISOString().split('T')[0]);
    setSubError(null);
    setIsSubModalOpen(true);
  };

  const closeSubModal = () => {
    setIsSubModalOpen(false);
    setTargetStudentForSub(null);
    setSubError(null);
  };

  const handleCourseToggle = (courseId: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId],
    );
  };

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload = {
      firstName,
      lastName,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
      courseIds: selectedCourseIds,
    };

    if (editingStudent) {
      updateStudentMutation.mutate({ id: editingStudent.id, ...payload });
    } else {
      createStudentMutation.mutate(payload);
    }
  };

  const handleSubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudentForSub || !selectedPlanId) return;

    assignSubMutation.mutate({
      studentId: targetStudentForSub.id,
      planId: selectedPlanId,
      startDate,
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to deactivate student ${name}? Class records will be preserved.`)) {
      deleteStudentMutation.mutate(id);
    }
  };

  const renderSubscriptionBadge = (status: Student['subscriptionStatus'], currentSub: Student['currentSubscription']) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
            Active ({currentSub?.plan.name})
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 border border-red-200">
            <XCircle className="h-3.5 w-3.5 text-red-600" />
            Expired
          </span>
        );
      case 'FUTURE':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            <Clock className="h-3.5 w-3.5 text-blue-600" />
            Starts Soon
          </span>
        );
      case 'NONE':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 border border-slate-200">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            No Subscription
          </span>
        );
    }
  };

  const isSubmittingStudent = createStudentMutation.isPending || updateStudentMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Students Directory</h1>
          <p className="text-sm text-slate-500">
            Manage student registrations, practiced courses, and subscription statuses.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Student
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student name, email, or phone..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <select
          value={selectedCourseFilter}
          onChange={(e) => setSelectedCourseFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 transition focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Practiced Courses</option>
          {courses?.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>
      </div>

      {/* Students Table */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Practiced Tracks</th>
                <th className="px-6 py-4">Subscription Status</th>
                <th className="px-6 py-4">Sessions</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No students found. Click "Add Student" to enroll your academy members.
                  </td>
                </tr>
              ) : (
                students?.map((student) => (
                  <tr key={student.id} className="transition hover:bg-slate-50/80">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-700">
                          {student.firstName.charAt(0)}
                          {student.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {student.firstName} {student.lastName}
                          </p>
                          <span className="text-xs text-slate-400">ID: {student.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      <div className="space-y-1">
                        {student.email && (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            <span>{student.email}</span>
                          </div>
                        )}
                        {student.phone && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            <span>{student.phone}</span>
                          </div>
                        )}
                        {!student.email && !student.phone && <span className="text-slate-400">No contact info</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {student.courses.length === 0 ? (
                          <span className="text-xs text-slate-400">None assigned</span>
                        ) : (
                          student.courses.map(({ course }) => (
                            <span
                              key={course.id}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium text-slate-800"
                              style={{ backgroundColor: `${course.colorHex}20`, borderLeft: `3px solid ${course.colorHex}` }}
                            >
                              {course.name}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {renderSubscriptionBadge(student.subscriptionStatus, student.currentSubscription)}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-700">
                      {student._count.attendances} attended
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openAssignSubModal(student)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                          title="Assign Subscription"
                        >
                          <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                          Plan
                        </button>
                        <button
                          onClick={() => openEditModal(student)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(student.id, `${student.firstName} ${student.lastName}`)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          title="Deactivate"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={isStudentModalOpen}
        onClose={closeStudentModal}
        title={editingStudent ? 'Edit Student' : 'Register New Student'}
        description="Students can be enrolled in classes directly from the schedule."
      >
        <form onSubmit={handleStudentSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                First Name *
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Roger"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Gracie"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@bjj.com"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+34 600 000 000"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Practiced Courses
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 border border-slate-100 rounded-xl">
              {courses?.map((course) => {
                const isSelected = selectedCourseIds.includes(course.id);
                return (
                  <button
                    type="button"
                    key={course.id}
                    onClick={() => handleCourseToggle(course.id)}
                    className={`flex items-center gap-2 rounded-lg p-2 text-left text-xs transition border ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/80 font-semibold text-blue-900'
                        : 'border-slate-100 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: course.colorHex }}
                    />
                    <span className="truncate">{course.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Belt rank, medical notes, emergency contact..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeStudentModal}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingStudent}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-70"
            >
              {isSubmittingStudent && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingStudent ? 'Save Changes' : 'Register Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Subscription Modal */}
      <Modal
        isOpen={isSubModalOpen}
        onClose={closeSubModal}
        title={`Enroll ${targetStudentForSub?.firstName} ${targetStudentForSub?.lastName}`}
        description="Select a subscription plan and starting date for this student."
      >
        <form onSubmit={handleSubSubmit} className="space-y-4">
          {subError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600">
              {subError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Membership Plan *
            </label>
            <select
              required
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none"
            >
              <option value="" disabled>Select a plan</option>
              {plans?.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} — {plan.durationMonths} month(s) {plan.price ? `(€${Number(plan.price).toFixed(2)})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Start Date *
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeSubModal}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={assignSubMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-70"
            >
              {assignSubMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Assign Plan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
