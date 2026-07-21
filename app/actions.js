'use server';

import crypto from 'crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getSupabase } from '../lib/supabase.js';
import { requireAuth } from './auth.js';
import {
  addMonths,
  TERM_MONTHS,
  prorateFirstMonth,
  firstOfNextMonth,
  lastDayAfterMonths,
} from '../lib/format.js';
import {
  sendIntakeLink,
  sendNewIntakeNotice,
  notifyProviderOfChoice,
  sendExtensionOffer,
  sendPaymentConfirmation,
} from '../lib/email.js';

function token(n = 9) {
  return crypto.randomBytes(n).toString('hex');
}

// ---- Auth: staff login / logout ----
export async function login(formData) {
  const pw = formData.get('password');
  const next = formData.get('next') || '/';
  if (pw && pw === process.env.ADMIN_PASSWORD) {
    cookies().set('tt_admin', pw, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    redirect(next.startsWith('/') ? next : '/');
  }
  redirect('/login?e=1');
}

export async function logout() {
  cookies().delete('tt_admin');
  redirect('/login');
}

// ---- Provider: create a new intake link ----
export async function createIntake() {
  requireAuth();
  const sb = getSupabase();
  const { data, error } = await sb
    .from('rentals')
    .insert({ token: token(), renew_token: token(), status: 'pending' })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  redirect(`/admin/${data.id}`);
}

// ---- Provider: save client contact + optionally email the link ----
export async function saveContactAndSend(formData) {
  requireAuth();
  const sb = getSupabase();
  const id = formData.get('id');
  const email = (formData.get('email') || '').trim();
  const phone = (formData.get('phone') || '').trim();
  const mode = formData.get('mode');

  const { data: rental } = await sb.from('rentals').select('*').eq('id', id).single();
  if (!rental) throw new Error('Rental not found');

  await sb.from('rentals').update({ contact: { email, phone } }).eq('id', id);

  if (mode === 'send' && email) {
    await sendIntakeLink(email, rental.token);
    redirect(`/admin/${id}?sent=1`);
  }
  revalidatePath(`/admin/${id}`);
  redirect(`/admin/${id}`);
}

// ---- Client: submit intake form ----
export async function submitIntake(formData) {
  const sb = getSupabase();
  const tok = formData.get('token');
  const { data: rental } = await sb.from('rentals').select('*').eq('token', tok).single();
  if (!rental) throw new Error('Invalid link');
  if (rental.client) redirect(`/intake/${tok}`); // already submitted

  const client = {
    name: formData.get('name'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    property: {
      boat: formData.get('boat'),
      trailer: formData.get('trailer'),
      rv: formData.get('rv'),
      vehicle: formData.get('vehicle'),
      other: formData.get('other'),
      makeModel: formData.get('makeModel'),
      length: formData.get('length'),
      licenseReg: formData.get('licenseReg'),
      insurance: formData.get('insurance'),
    },
  };

  await sb
    .from('rentals')
    .update({ client, status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', rental.id);

  // Notify staff. Don't let an email hiccup break the customer's submission.
  try {
    await sendNewIntakeNotice({ ...rental, client });
  } catch (e) {
    console.error('new-intake notify failed:', e);
  }

  redirect(`/intake/${tok}`);
}

// ---- Provider: set term + rate (finalize the deal) ----
export async function saveTerms(formData) {
  requireAuth();
  const sb = getSupabase();
  const id = formData.get('id');
  const termType = formData.get('termType');
  const startDate = formData.get('startDate') || null;
  const monthlyFee = formData.get('monthlyFee');
  const months = TERM_MONTHS[termType];
  const prorate = formData.get('prorate') === 'on';

  // When prorating, the partial month is billed separately and the fixed term
  // begins the 1st of the following month so renewals land on month boundaries.
  let proration = null;
  let termStart = startDate;
  let endDate = null;
  if (prorate && startDate) {
    proration = prorateFirstMonth(monthlyFee, startDate);
    termStart = firstOfNextMonth(startDate);
    endDate = months ? lastDayAfterMonths(termStart, months) : null;
  } else {
    endDate = months && startDate ? addMonths(startDate, months) : null;
  }

  // Spread the existing terms so payment, signing dates and special
  // provisions survive a re-save of the deal fields.
  const { data: existing } = await sb.from('rentals').select('terms').eq('id', id).single();

  const terms = {
    ...(existing?.terms || {}),
    termType,
    monthlyFee,
    paymentSchedule: formData.get('paymentSchedule'),
    paymentMethod: formData.get('paymentMethod'),
    agreementDate: formData.get('agreementDate') || null,
    startDate,
    termStart,
    endDate,
    prorate,
    proration,
    oneTimeAmount: formData.get('oneTimeAmount') || '',
    oneTimeLabel: formData.get('oneTimeLabel') || '',
  };

  await sb
    .from('rentals')
    .update({ terms, status: 'active', finalized_at: new Date().toISOString() })
    .eq('id', id);

  revalidatePath(`/admin/${id}`);
  redirect(`/admin/${id}`);
}

// ---- Provider: contract sent / signed dates + special provisions ----
export async function saveContractProgress(formData) {
  requireAuth();
  const sb = getSupabase();
  const id = formData.get('id');

  const { data: rental } = await sb.from('rentals').select('terms').eq('id', id).single();
  if (!rental) throw new Error('Rental not found');

  const terms = {
    ...(rental.terms || {}),
    contractSentAt: formData.get('contractSentAt') || null,
    signedAt: formData.get('signedAt') || null,
    specialProvisions: formData.get('specialProvisions') || '',
  };

  await sb.from('rentals').update({ terms }).eq('id', id);
  revalidatePath(`/admin/${id}`);
  redirect(`/admin/${id}?saved=1`);
}

// ---- Provider: tag a rental with its yard location + spot ----
export async function setLocation(formData) {
  requireAuth();
  const sb = getSupabase();
  const id = formData.get('id');
  await sb
    .from('rentals')
    .update({ location: formData.get('location') || null, spot: formData.get('spot') || null })
    .eq('id', id);
  revalidatePath(`/admin/${id}`);
  redirect(`/admin/${id}?saved=1`);
}

// ---- Whiskey spots (Marc's own customers - profit share tracking only) ----
export async function addWhiskey(formData) {
  requireAuth();
  const sb = getSupabase();
  const { error } = await sb.from('whiskey_rentals').insert({
    name: formData.get('name'),
    spot: formData.get('spot') || null,
    monthly_amount: Number(formData.get('monthly_amount')) || 0,
    share_percent: Number(formData.get('share_percent')) || 0,
    notes: formData.get('notes') || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/whiskey');
  redirect('/whiskey?added=1');
}

export async function updateWhiskey(formData) {
  requireAuth();
  const sb = getSupabase();
  await sb
    .from('whiskey_rentals')
    .update({
      name: formData.get('name'),
      spot: formData.get('spot') || null,
      monthly_amount: Number(formData.get('monthly_amount')) || 0,
      share_percent: Number(formData.get('share_percent')) || 0,
      active: formData.get('active') === 'on',
    })
    .eq('id', formData.get('id'));
  revalidatePath('/whiskey');
  redirect('/whiskey?saved=1');
}

export async function deleteWhiskey(formData) {
  requireAuth();
  const sb = getSupabase();
  await sb.from('whiskey_rentals').delete().eq('id', formData.get('id'));
  revalidatePath('/whiskey');
  redirect('/whiskey?deleted=1');
}

// Tick a Whiskey spot off for a given month (or undo it).
export async function settleWhiskeyMonth(formData) {
  requireAuth();
  const sb = getSupabase();
  const id = formData.get('id');
  const month = formData.get('month');
  const undo = formData.get('undo') === '1';

  const { data: row } = await sb.from('whiskey_rentals').select('*').eq('id', id).single();
  if (!row) throw new Error('Whiskey spot not found');

  const settled = { ...(row.settled || {}) };
  if (undo) {
    delete settled[month];
  } else {
    settled[month] = {
      at: new Date().toISOString(),
      amount: Number(formData.get('amount')) || 0,
    };
  }

  await sb.from('whiskey_rentals').update({ settled }).eq('id', id);
  revalidatePath('/whiskey');
  revalidatePath('/');
  redirect('/whiskey');
}

// ---- Provider: delete a rental that never went anywhere ----
export async function deleteRental(formData) {
  requireAuth();
  const sb = getSupabase();
  const id = formData.get('id');
  const { error } = await sb.from('rentals').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/');
  redirect('/?deleted=1');
}

// ---- Provider: record payment + email the customer a confirmation ----
export async function confirmPayment(formData) {
  requireAuth();
  const sb = getSupabase();
  const id = formData.get('id');

  const { data: rental } = await sb.from('rentals').select('*').eq('id', id).single();
  if (!rental) throw new Error('Rental not found');

  const payment = {
    paidAt: formData.get('paidAt') || null,
    amount: formData.get('amountPaid') || '',
    method: formData.get('paidMethod') || '',
    note: formData.get('paidNote') || '',
    confirmedAt: new Date().toISOString(),
  };

  const terms = { ...(rental.terms || {}), payment };
  await sb.from('rentals').update({ terms }).eq('id', id);

  await sendPaymentConfirmation({ ...rental, terms });

  revalidatePath(`/admin/${id}`);
  redirect(`/admin/${id}?paid=1`);
}

// ---- Tenant: respond to renewal notice (extend / vacate) ----
export async function recordRenewalChoice(formData) {
  const sb = getSupabase();
  const renewToken = formData.get('renew_token');
  const choice = formData.get('choice'); // 'extend' | 'vacate'
  const { data: rental } = await sb.from('rentals').select('*').eq('renew_token', renewToken).single();
  if (!rental) throw new Error('Invalid link');

  const status = choice === 'extend' ? 'extend_requested' : 'vacating';
  const { data: updated } = await sb
    .from('rentals')
    .update({
      renewal: { choice, respondedAt: new Date().toISOString() },
      status,
      response_at: new Date().toISOString(),
    })
    .eq('id', rental.id)
    .select('*')
    .single();

  await notifyProviderOfChoice(updated);
  redirect(`/renew/${renewToken}?done=${choice}`);
}

// ---- Provider: offer extension options + email addendum to tenant ----
export async function sendExtension(formData) {
  requireAuth();
  const sb = getSupabase();
  const id = formData.get('id');
  const months = Number(formData.get('months'));
  const effectiveDate = formData.get('effectiveDate') || null;
  const expirationDate = effectiveDate ? addMonths(effectiveDate, months) : null;

  const extension = {
    months,
    monthlyFee: formData.get('monthlyFee'),
    effectiveDate,
    expirationDate,
    agreementDate: formData.get('agreementDate') || new Date().toISOString().slice(0, 10),
  };

  const { data: updated } = await sb
    .from('rentals')
    .update({ extension, status: 'renewed' })
    .eq('id', id)
    .select('*')
    .single();

  await sendExtensionOffer(updated);
  revalidatePath(`/admin/${id}`);
  redirect(`/admin/${id}?ext=1`);
}
