'use server';

import crypto from 'crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getSupabase } from '../lib/supabase.js';
import { addMonths, TERM_MONTHS } from '../lib/format.js';
import {
  sendIntakeLink,
  notifyProviderOfChoice,
  sendExtensionOffer,
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

  redirect(`/intake/${tok}`);
}

// ---- Provider: set term + rate (finalize the deal) ----
export async function saveTerms(formData) {
  const sb = getSupabase();
  const id = formData.get('id');
  const termType = formData.get('termType');
  const startDate = formData.get('startDate') || null;
  const months = TERM_MONTHS[termType];
  const endDate = months && startDate ? addMonths(startDate, months) : null;

  const terms = {
    termType,
    monthlyFee: formData.get('monthlyFee'),
    paymentSchedule: formData.get('paymentSchedule'),
    paymentMethod: formData.get('paymentMethod'),
    agreementDate: formData.get('agreementDate') || null,
    startDate,
    endDate,
  };

  await sb
    .from('rentals')
    .update({ terms, status: 'active', finalized_at: new Date().toISOString() })
    .eq('id', id);

  revalidatePath(`/admin/${id}`);
  redirect(`/admin/${id}`);
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
