'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Modal } from '@/components/ui/Modal';
import { Plus, BookOpen, Edit2, Check, Loader2, Sparkles } from 'lucide-react';

interface Course {
  id: string;
  name: string;
  description: string | null;
  colorHex: string;
  isActive: boolean;
  _count: {
    students: number;
    teachers: number;
    classSessions: number;
  };
}

const COLOR_PRESETS = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#6366F1', // Indigo
];

export default function CoursesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [colorHex, setColorHex] = useState('#3B82F6');
  const [formError, setFormError] = useState<string | null>(null);

  const { data: courses, isLoading } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => apiClient<Course[]>('/courses?includeInactive=true'),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; colorHex: string }) =>
      apiClient('/courses', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      closeModal();
    },
    onError: (err: any) => setFormError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; name: string; description?: string; colorHex: string; isActive?: boolean }) =>
      apiClient(`/courses/${data.id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      closeModal();
    },
    onError: (err: any) => setFormError(err.message),
  });

  const openCreateModal = () => {
    setEditingCourse(null);
    setName('');
    setDescription('');
    setColorHex('#3B82F6');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    setName(course.name);
    setDescription(course.description || '');
    setColorHex(course.colorHex);
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCourse(null);
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (editingCourse) {
      updateMutation.mutate({
        id: editingCourse.id,
        name,
        description,
        colorHex,
      });
    } else {
      createMutation.mutate({
        name,
        description,
        colorHex,
      });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Courses & Disciplines</h1>
          <p className="text-sm text-slate-500">
            Configure martial arts programs, kimono/no-gi tracks, and their calendar badge colors.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Course
        </button>
      </div>

      {/* Courses Grid */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses?.map((course) => (
            <div
              key={course.id}
              className={`relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
                course.isActive ? 'border-slate-200' : 'border-slate-200 bg-slate-50/60 opacity-60'
              }`}
            >
              {/* Color accent line */}
              <div
                className="absolute left-0 top-0 h-1.5 w-full"
                style={{ backgroundColor: course.colorHex }}
              />

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-3.5 w-3.5 rounded-full ring-2 ring-white shadow-sm"
                    style={{ backgroundColor: course.colorHex }}
                  />
                  <h3 className="font-bold text-slate-900">{course.name}</h3>
                </div>
                <button
                  onClick={() => openEditModal(course)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  title="Edit course"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-slate-500 line-clamp-2">
                {course.description || 'No description provided.'}
              </p>

              {/* Stats badges */}
              <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3 text-xs text-slate-600">
                <span>
                  <strong className="text-slate-900">{course._count.students}</strong> Students
                </span>
                <span>•</span>
                <span>
                  <strong className="text-slate-900">{course._count.teachers}</strong> Instructors
                </span>
                <span>•</span>
                <span>
                  <strong className="text-slate-900">{course._count.classSessions}</strong> Sessions
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingCourse ? 'Edit Course' : 'Create New Course'}
        description="Programs appear as categories when scheduling classes in the calendar."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Course Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. BJJ Fundamentals (Gi)"
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key technical goals, prerequisites, or equipment needed..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Calendar Badge Color
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() => setColorHex(color)}
                  className="relative flex h-8 w-8 items-center justify-center rounded-full transition-transform hover:scale-110"
                  style={{ backgroundColor: color }}
                >
                  {colorHex.toLowerCase() === color.toLowerCase() && (
                    <Check className="h-4 w-4 text-white stroke-[3]" />
                  )}
                </button>
              ))}
              <input
                type="color"
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0"
                title="Custom color"
              />
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
              {editingCourse ? 'Save Changes' : 'Create Course'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
