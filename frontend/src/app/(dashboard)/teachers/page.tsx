'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Modal } from '@/components/ui/Modal';
import {
  Plus,
  GraduationCap,
  Edit2,
  Trash2,
  Mail,
  Phone,
  DollarSign,
  Loader2,
  Search,
} from 'lucide-react';

interface Course {
  id: string;
  name: string;
  colorHex: string;
}

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
  hourlyRate: string | null;
  isActive: boolean;
  courses: {
    course: Course;
  }[];
  _count: {
    classSessions: number;
  };
}

export default function TeachersPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: teachers, isLoading } = useQuery<Teacher[]>({
    queryKey: ['teachers', searchTerm],
    queryFn: () => apiClient<Teacher[]>(`/teachers?q=${encodeURIComponent(searchTerm)}`),
  });

  const { data: courses } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => apiClient<Course[]>('/courses'),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient('/teachers', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      closeModal();
    },
    onError: (err: any) => setFormError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient(`/teachers/${data.id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      closeModal();
    },
    onError: (err: any) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/teachers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
  });

  const openCreateModal = () => {
    setEditingTeacher(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setHourlyRate('');
    setSelectedCourseIds([]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFirstName(teacher.firstName);
    setLastName(teacher.lastName);
    setEmail(teacher.email || '');
    setPhone(teacher.phone || '');
    setHourlyRate(teacher.hourlyRate ? String(teacher.hourlyRate) : '');
    setSelectedCourseIds(teacher.courses.map((c) => c.course.id));
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTeacher(null);
    setFormError(null);
  };

  const handleCourseToggle = (courseId: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload = {
      firstName,
      lastName,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
      courseIds: selectedCourseIds,
    };

    if (editingTeacher) {
      updateMutation.mutate({ id: editingTeacher.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to deactivate instructor ${name}? Past class records will be preserved.`)) {
      deleteMutation.mutate(id);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Instructors & Coaches</h1>
          <p className="text-sm text-slate-500">
            Manage teaching staff, discipline qualifications, and hourly rates for cost estimation.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Instructor
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by instructor name or email..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Teachers Table */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-6 py-4">Instructor</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Teaching Tracks</th>
                <th className="px-6 py-4">Hourly Rate</th>
                <th className="px-6 py-4">Classes</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teachers?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No instructors found. Click "Add Instructor" to register your coaching team.
                  </td>
                </tr>
              ) : (
                teachers?.map((teacher) => (
                  <tr key={teacher.id} className="transition hover:bg-slate-50/80">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-700">
                          {teacher.firstName.charAt(0)}
                          {teacher.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {teacher.firstName} {teacher.lastName}
                          </p>
                          <span className="text-xs text-slate-400">ID: {teacher.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      <div className="space-y-1">
                        {teacher.email && (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            <span>{teacher.email}</span>
                          </div>
                        )}
                        {teacher.phone && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            <span>{teacher.phone}</span>
                          </div>
                        )}
                        {!teacher.email && !teacher.phone && <span className="text-slate-400">No contact info</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {teacher.courses.length === 0 ? (
                          <span className="text-xs text-slate-400">All courses</span>
                        ) : (
                          teacher.courses.map(({ course }) => (
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
                    <td className="px-6 py-4 text-xs font-semibold text-slate-800">
                      {teacher.hourlyRate ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-mono">
                          €{Number(teacher.hourlyRate).toFixed(2)}/h
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-700">
                      {teacher._count.classSessions} sessions
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(teacher)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(teacher.id, `${teacher.firstName} ${teacher.lastName}`)}
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

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingTeacher ? 'Edit Instructor' : 'Add New Instructor'}
        description="Instructors can be assigned to classes and their hours will be tracked in reports."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Marcus"
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
                placeholder="Almeida"
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
                placeholder="coach@bjj.com"
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Hourly Rate (€ / hour) — Optional
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-slate-500">
                €
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="40.00"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-8 pr-3.5 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Used strictly to estimate teaching cost in reports.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Qualified Courses
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

          <div className="mt-6 flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-70"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingTeacher ? 'Save Changes' : 'Save Instructor'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
