'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Modal } from '@/components/ui/Modal';
import { Plus, CreditCard, Edit2, Loader2, Calendar, Check, Users } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  durationMonths: number;
  price: string | null;
  isActive: boolean;
  _count: {
    studentSubscriptions: number;
  };
}

export default function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [durationMonths, setDurationMonths] = useState(1);
  const [price, setPrice] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data: plans, isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ['subscription-plans'],
    queryFn: () => apiClient<SubscriptionPlan[]>('/subscription-plans?includeInactive=true'),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient('/subscription-plans', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      closeModal();
    },
    onError: (err: any) => setFormError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient(`/subscription-plans/${data.id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      closeModal();
    },
    onError: (err: any) => setFormError(err.message),
  });

  const openCreateModal = () => {
    setEditingPlan(null);
    setName('');
    setDurationMonths(1);
    setPrice('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setDurationMonths(plan.durationMonths);
    setPrice(plan.price ? String(plan.price) : '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPlan(null);
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload = {
      name,
      durationMonths: Number(durationMonths),
      price: price ? parseFloat(price) : undefined,
    };

    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subscription Plans</h1>
          <p className="text-sm text-slate-500">
            Configure informational membership tiers (monthly, quarterly, annual) for student enrollments.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Create Plan
        </button>
      </div>

      {/* Info Callout */}
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs text-indigo-900">
        <p className="font-semibold">Informational Membership Policy</p>
        <p className="mt-0.5 text-indigo-700">
          Subscriptions are used to verify student active status and display alerts in class scheduling. They do not block class attendance.
        </p>
      </div>

      {/* Plans Grid */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {plans?.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white p-6 shadow-sm transition hover:shadow-md ${
                plan.isActive ? 'border-slate-200' : 'border-slate-200 opacity-60 bg-slate-50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <button
                    onClick={() => openEditModal(plan)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    title="Edit Plan"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>

                <h3 className="mt-4 font-bold text-slate-900">{plan.name}</h3>

                <div className="mt-3 flex items-baseline gap-1">
                  {plan.price ? (
                    <>
                      <span className="text-2xl font-extrabold text-slate-900 font-mono">
                        €{Number(plan.price).toFixed(2)}
                      </span>
                      <span className="text-xs text-slate-400">/ period</span>
                    </>
                  ) : (
                    <span className="text-sm font-semibold text-slate-400">Custom pricing</span>
                  )}
                </div>

                <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span>
                      Duration: <strong>{plan.durationMonths} month(s)</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span>
                      Enrolled: <strong>{plan._count.studentSubscriptions}</strong> students
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    plan.isActive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${plan.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  {plan.isActive ? 'Active Plan' : 'Archived'}
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
        title={editingPlan ? 'Edit Membership Plan' : 'Create Membership Plan'}
        description="Set tier name, natural month duration, and optional pricing."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Plan Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 6 Months Semester Pass"
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Duration (Months) *
              </label>
              <input
                type="number"
                required
                min={1}
                max={60}
                value={durationMonths}
                onChange={(e) => setDurationMonths(parseInt(e.target.value, 10))}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Price (€) — Optional
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="420.00"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
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
              {editingPlan ? 'Save Changes' : 'Create Plan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
