import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getSettings, updateSettings } from '../api/admin';

export function Settings() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: getSettings,
  });

  const [profileViewCost, setProfileViewCost] = useState('');
  const [minTopupAmount, setMinTopupAmount] = useState('');
  const [statVerifiedMembers, setStatVerifiedMembers] = useState('');
  const [statMatchesMade, setStatMatchesMade] = useState('');
  const [statDistrictsCovered, setStatDistrictsCovered] = useState('');
  const [statAverageRating, setStatAverageRating] = useState('');
  const [statProfilesReviewedPercent, setStatProfilesReviewedPercent] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [bkashMerchantNumber, setBkashMerchantNumber] = useState('');

  useEffect(() => {
    if (query.data) {
      setProfileViewCost(String(query.data.profileViewCost));
      setMinTopupAmount(String(query.data.minTopupAmount));
      setStatVerifiedMembers(query.data.statVerifiedMembers);
      setStatMatchesMade(query.data.statMatchesMade);
      setStatDistrictsCovered(query.data.statDistrictsCovered);
      setStatAverageRating(query.data.statAverageRating);
      setStatProfilesReviewedPercent(query.data.statProfilesReviewedPercent);
      setWhatsappNumber(query.data.whatsappNumber ?? '');
      setBkashMerchantNumber(query.data.bkashMerchantNumber);
    }
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (data) => {
      toast.success('Settings updated');
      queryClient.setQueryData(['admin', 'settings'], data);
    },
    onError: () => toast.error('Failed to update settings'),
  });

  const isDirty =
    query.data &&
    (Number(profileViewCost) !== query.data.profileViewCost ||
      Number(minTopupAmount) !== query.data.minTopupAmount ||
      statVerifiedMembers !== query.data.statVerifiedMembers ||
      statMatchesMade !== query.data.statMatchesMade ||
      statDistrictsCovered !== query.data.statDistrictsCovered ||
      statAverageRating !== query.data.statAverageRating ||
      statProfilesReviewedPercent !== query.data.statProfilesReviewedPercent ||
      whatsappNumber !== (query.data.whatsappNumber ?? '') ||
      bkashMerchantNumber !== query.data.bkashMerchantNumber)
      whatsappNumber !== (query?.data?.whatsappNumber ?? '');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cost = Number(profileViewCost);
    const minTopup = Number(minTopupAmount);

    if (!Number.isFinite(cost) || cost < 0) {
      toast.error('Profile view cost must be a valid non-negative number');
      return;
    }
    if (!Number.isFinite(minTopup) || minTopup < 0) {
      toast.error('Minimum top-up amount must be a valid non-negative number');
      return;
    }
    const trimmedWhatsapp = whatsappNumber.trim();
    if (trimmedWhatsapp && !/^\+?[1-9]\d{7,14}$/.test(trimmedWhatsapp)) {
      toast.error('WhatsApp number must be digits only, optionally prefixed with +, e.g. +8801XXXXXXXXX');
      return;
    }
    const trimmedBkashMerchant = bkashMerchantNumber.trim();
    if (trimmedBkashMerchant && !/^(?:\+?880|0)1[3-9]\d{8}$/.test(trimmedBkashMerchant)) {
      toast.error('bKash merchant number must be a valid Bangladeshi mobile number, e.g. 01304082381');
      return;
    }

    mutation.mutate({
      profileViewCost: cost,
      minTopupAmount: minTopup,
      statVerifiedMembers,
      statMatchesMade,
      statDistrictsCovered,
      statAverageRating,
      statProfilesReviewedPercent,
      ...(trimmedWhatsapp ? { whatsappNumber: trimmedWhatsapp } : {}),
      ...(trimmedBkashMerchant ? { bkashMerchantNumber: trimmedBkashMerchant } : {}),
    });
  }

  function handleReset() {
    if (!query.data) return;
    setProfileViewCost(String(query.data.profileViewCost));
    setMinTopupAmount(String(query.data.minTopupAmount));
    setStatVerifiedMembers(query.data.statVerifiedMembers);
    setStatMatchesMade(query.data.statMatchesMade);
    setStatDistrictsCovered(query.data.statDistrictsCovered);
    setStatAverageRating(query.data.statAverageRating);
    setStatProfilesReviewedPercent(query.data.statProfilesReviewedPercent);
    setWhatsappNumber(query.data.whatsappNumber ?? '');
    setBkashMerchantNumber(query.data.bkashMerchantNumber);
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-text">Settings</h1>
        <p className="mt-1 text-sm text-text-faint">Platform pricing configuration</p>
      </header>

      {query.isError && (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          Failed to load settings. Please refresh.
        </p>
      )}

      {query.isLoading ? (
        <p className="py-16 text-center text-sm text-text-faint">Loading settings…</p>
      ) : query.data ? (
        <form
          onSubmit={handleSubmit}
          className="max-w-lg space-y-5 rounded-xl border border-border bg-surface p-6"
        >
          <div>
            <label
              htmlFor="profileViewCost"
              className="mb-1.5 block text-sm font-medium text-text-muted"
            >
              Profile view cost (৳)
            </label>
            <input
              id="profileViewCost"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={profileViewCost}
              onChange={(e) => setProfileViewCost(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1.5 text-xs text-text-faint">
              Amount deducted from a user's wallet to unlock a full profile view.
            </p>
          </div>

          <div>
            <label
              htmlFor="minTopupAmount"
              className="mb-1.5 block text-sm font-medium text-text-muted"
            >
              Minimum top-up amount (৳)
            </label>
            <input
              id="minTopupAmount"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={minTopupAmount}
              onChange={(e) => setMinTopupAmount(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1.5 text-xs text-text-faint">
              Smallest wallet top-up a user is allowed to make via bKash or Nagad.
            </p>
          </div>

          <div className="border-t border-border pt-5">
            <label
              htmlFor="whatsappNumber"
              className="mb-1.5 block text-sm font-medium text-text-muted"
            >
              WhatsApp contact number
            </label>
            <input
              id="whatsappNumber"
              type="tel"
              placeholder="+8801XXXXXXXXX"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1.5 text-xs text-text-faint">
              Number the public site's WhatsApp float button links to, in international format.
            </p>
          </div>

          <div className="border-t border-border pt-5">
            <label
              htmlFor="bkashMerchantNumber"
              className="mb-1.5 block text-sm font-medium text-text-muted"
            >
              bKash number (manual top-ups)
            </label>
            <input
              id="bkashMerchantNumber"
              type="tel"
              placeholder="01304082381"
              value={bkashMerchantNumber}
              onChange={(e) => setBkashMerchantNumber(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1.5 text-xs text-text-faint">
              Shown to users on the top-up page as the number to Send Money to for manual bKash verification.
            </p>
          </div>

          <div className="border-t border-border pt-5">
            <h2 className="text-sm font-semibold text-text">Marketing stats (public landing page)</h2>
            <p className="mt-1 text-xs text-text-faint">
              Freeform display values shown on the public landing page — independent of real platform data.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <StatField
                label="Verified members"
                value={statVerifiedMembers}
                onChange={setStatVerifiedMembers}
              />
              <StatField label="Matches made" value={statMatchesMade} onChange={setStatMatchesMade} />
              <StatField
                label="Districts covered"
                value={statDistrictsCovered}
                onChange={setStatDistrictsCovered}
              />
              <StatField label="Average rating" value={statAverageRating} onChange={setStatAverageRating} />
              <StatField
                label="Profiles reviewed before approval"
                value={statProfilesReviewedPercent}
                onChange={setStatProfilesReviewedPercent}
              />
            </div>
          </div>

          <p className="text-xs text-text-faint">
            Last updated {new Date(query.data.updatedAt).toLocaleString('en-US')}
          </p>

          <div className="flex items-center gap-2 border-t border-border pt-4">
            <button
              type="submit"
              disabled={!isDirty || mutation.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:enabled:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mutation.isPending ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={!isDirty || mutation.isPending}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted hover:enabled:bg-surface-raised hover:enabled:text-text disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reset
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function StatField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-text-muted">{label}</label>
      <input
        type="text"
        maxLength={40}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}
