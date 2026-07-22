'use server';

import crypto from 'crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { getSupabase } from '../lib/supabase.js';
import { requireAuth } from './auth.js';
import {
  addMonths,
  TERM_MONTHS,
  prorateFirstMonth,
  firstOfNextMonth,
  lastDayAfterMonths,
  monthKey,
  monthLabel,
} from '../lib/format.js';
import {
  sendIntakeLink,
  sendNewIntakeNotice,
  notifyProviderOfChoice,
  sendExtensionOffer,
  sendPaymentConfirmation,
  sendSignatureRequest,
  sendSignedCopy,
  sendExecutedCopy,
  sendInvoiceEmail,
  sendWhiskeyStatement,
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

function clientFromForm(formData) {
  return {
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
}

// ---- Client: submit a per-customer intake link (updates that one record) ----
export async function submitIntake(formData) {
  const sb = getSupabase();
  const tok = formData.get('token');
  const { data: rental } = await sb.from('rentals').select('*').eq('token', tok).single();
  if (!rental) throw new Error('Invalid link');
  if (rental.client) redirect(`/intake/${tok}`); // already submitted

  const client = clientFromForm(formData);

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

// ---- Client: submit the generic public link (creates a NEW record each time) ----
// This is the reusable link for the website / social media and for onboarding
// several people at once - every submission is its own independent rental.
export async function submitPublicIntake(formData) {
  const sb = getSupabase();
  const client = clientFromForm(formData);
  if (!client.name || !client.email) redirect('/apply?e=1');

  const rental = {
    token: token(),
    renew_token: token(),
    status: 'submitted',
    submitted_at: new Date().toISOString(),
    client,
  };

  const { data: created, error } = await sb.from('rentals').insert(rental).select('*').single();
  if (error) throw new Error(error.message);

  try {
    await sendNewIntakeNotice(created);
  } catch (e) {
    console.error('new-intake notify failed:', e);
  }

  redirect('/apply?done=1');
}

// ---- Provider: edit the customer's details after intake ----
// Everything downstream (contract, addendum, emails, dashboard) renders from
// this same object at view/send time, so one edit updates all of them.
export async function updateClient(formData) {
  requireAuth();
  const sb = getSupabase();
  const id = formData.get('id');

  const { data: rental } = await sb.from('rentals').select('client').eq('id', id).single();
  if (!rental) throw new Error('Rental not found');

  const prev = rental.client || {};
  const client = {
    ...prev,
    name: (formData.get('name') || '').trim(),
    phone: (formData.get('phone') || '').trim(),
    email: (formData.get('email') || '').trim(),
    property: {
      ...(prev.property || {}),
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
    lastEditedAt: new Date().toISOString(),
  };

  const { error } = await sb.from('rentals').update({ client }).eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/${id}`);
  revalidatePath('/');
  redirect(`/admin/${id}?client=1`);
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
    // Provider can hand-edit the prorated figure; keep their number.
    const override = formData.get('proratedOverride');
    if (override !== null && override !== '' && !Number.isNaN(Number(override))) {
      proration = { ...proration, amount: Number(override), overridden: Number(override) !== proration.amount };
    }
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

// ---- Provider: email the customer a link to sign electronically ----
export async function sendSignRequest(formData) {
  requireAuth();
  const sb = getSupabase();
  const id = formData.get('id');
  const { data: rental } = await sb.from('rentals').select('*').eq('id', id).single();
  if (!rental) throw new Error('Rental not found');

  await sendSignatureRequest(rental);

  const terms = {
    ...(rental.terms || {}),
    contractSentAt: rental.terms?.contractSentAt || new Date().toISOString().slice(0, 10),
  };
  await sb.from('rentals').update({ terms }).eq('id', id);

  revalidatePath(`/admin/${id}`);
  redirect(`/admin/${id}?sent_sign=1`);
}

// ---- Customer: sign the agreement electronically ----
export async function signContract(formData) {
  const sb = getSupabase();
  const tok = formData.get('token');
  const signerName = (formData.get('signerName') || '').trim();
  const signatureData = formData.get('signatureData') || '';
  const agreed = formData.get('agree') === 'on';

  if (!signerName) redirect(`/sign/${tok}?e=name`);
  if (!signatureData.startsWith('data:image')) redirect(`/sign/${tok}?e=sig`);
  if (!agreed) redirect(`/sign/${tok}?e=agree`);

  const { data: rental } = await sb.from('rentals').select('*').eq('token', tok).single();
  if (!rental) throw new Error('Invalid link');
  if (rental.terms?.signature?.signedAt) redirect(`/sign/${tok}`); // already signed

  const h = headers();
  const now = new Date();
  const terms = {
    ...(rental.terms || {}),
    signedAt: now.toISOString().slice(0, 10),
    signature: {
      name: signerName,
      dataUrl: signatureData,
      signedAt: now.toISOString(),
      ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      userAgent: h.get('user-agent') || null,
    },
  };

  await sb.from('rentals').update({ terms }).eq('id', rental.id);

  try {
    await sendSignedCopy({ ...rental, terms });
  } catch (e) {
    console.error('signed-copy email failed:', e);
  }

  redirect(`/sign/${tok}`);
}

// ---- Invoices (standalone, separate from storage rentals) ----
export async function createInvoice() {
  requireAuth();
  const sb = getSupabase();
  const { data, error } = await sb
    .from('invoices')
    .insert({ token: token(), customer_name: 'New customer', items: [] })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  redirect(`/invoices/${data.id}`);
}

export async function saveInvoice(formData) {
  requireAuth();
  const sb = getSupabase();
  const id = formData.get('id');

  let items = [];
  try {
    items = JSON.parse(formData.get('items') || '[]');
  } catch { items = []; }
  // drop empty rows so blank lines never print on the invoice
  items = items
    .filter((it) => (it.description || '').trim() || Number(it.rate))
    .map((it) => ({
      description: (it.description || '').trim(),
      qty: Number(it.qty) || 0,
      rate: Number(it.rate) || 0,
    }));

  const { error } = await sb.from('invoices').update({
    customer_name: formData.get('customer_name'),
    customer_email: formData.get('customer_email') || null,
    customer_phone: formData.get('customer_phone') || null,
    issued_on: formData.get('issued_on') || null,
    tax_rate: Number(formData.get('tax_rate')) || 0,
    notes: formData.get('notes') || null,
    items,
  }).eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}?saved=1`);
}

export async function emailInvoice(formData) {
  requireAuth();
  const sb = getSupabase();
  const id = formData.get('id');
  const { data: inv } = await sb.from('invoices').select('*').eq('id', id).single();
  if (!inv) throw new Error('Invoice not found');
  if (!inv.customer_email) redirect(`/invoices/${id}?e=noemail`);

  await sendInvoiceEmail(inv);
  await sb.from('invoices')
    .update({ status: inv.status === 'paid' ? 'paid' : 'sent', sent_at: new Date().toISOString() })
    .eq('id', id);

  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}?sent=1`);
}

export async function markInvoicePaid(formData) {
  requireAuth();
  const sb = getSupabase();
  const id = formData.get('id');
  const unpay = formData.get('unpay') === '1';
  await sb.from('invoices')
    .update(unpay
      ? { status: 'draft', paid_on: null }
      : { status: 'paid', paid_on: formData.get('paid_on') || new Date().toISOString().slice(0, 10) })
    .eq('id', id);
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}`);
}

export async function deleteInvoice(formData) {
  requireAuth();
  const sb = getSupabase();
  await sb.from('invoices').delete().eq('id', formData.get('id'));
  revalidatePath('/invoices');
  redirect('/invoices?deleted=1');
}

// ---- Service catalogue behind the invoice dropdown ----
export async function addService(formData) {
  requireAuth();
  const sb = getSupabase();
  const { error } = await sb.from('invoice_services').insert({
    name: formData.get('name'),
    default_rate: Number(formData.get('default_rate')) || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/invoices');
  redirect('/invoices?service=1');
}

export async function deleteService(formData) {
  requireAuth();
  const sb = getSupabase();
  await sb.from('invoice_services').delete().eq('id', formData.get('id'));
  revalidatePath('/invoices');
  redirect('/invoices');
}

// ---- Provider: add an existing customer straight in (no intake link) ----
export async function addExistingRental(formData) {
  requireAuth();
  const sb = getSupabase();

  const termType = formData.get('termType') || 'month-to-month';
  const startDate = formData.get('startDate') || null;
  const monthlyFee = formData.get('monthlyFee');
  const months = TERM_MONTHS[termType];
  const endDate = months && startDate ? addMonths(startDate, months) : null;

  const rental = {
    token: token(),
    renew_token: token(),
    status: 'active',
    location: formData.get('location') || null,
    spot: formData.get('spot') || null,
    submitted_at: new Date().toISOString(),
    finalized_at: new Date().toISOString(),
    client: {
      name: formData.get('name'),
      phone: formData.get('phone') || '',
      email: formData.get('email') || '',
      property: {
        boat: '0', trailer: '0', rv: '0', vehicle: '0', other: '',
        makeModel: formData.get('makeModel') || '',
        length: formData.get('length') || '',
        licenseReg: formData.get('licenseReg') || '',
        insurance: formData.get('insurance') || '',
      },
    },
    terms: {
      termType,
      monthlyFee,
      paymentSchedule: formData.get('paymentSchedule') || 'monthly',
      paymentMethod: formData.get('paymentMethod') || 'cash',
      agreementDate: startDate,
      startDate,
      termStart: startDate,
      endDate,
      prorate: false,
      proration: null,
      oneTimeAmount: '',
      oneTimeLabel: '',
      // Existing customers are already signed and paying on paper.
      contractSentAt: formData.get('alreadySigned') === 'on' ? startDate : null,
      signedAt: formData.get('alreadySigned') === 'on' ? startDate : null,
      backfilled: true,
    },
  };

  const { data, error } = await sb.from('rentals').insert(rental).select('id').single();
  if (error) throw new Error(error.message);

  revalidatePath('/');
  redirect(`/admin/${data.id}?added=1`);
}

// ---- Provider: counter-sign, which fully executes the agreement ----
export async function providerSign(formData) {
  requireAuth();
  const sb = getSupabase();
  const id = formData.get('id');
  const signerName = (formData.get('signerName') || '').trim() || 'Anton Bajada Leonardes';
  const signatureData = formData.get('signatureData') || '';

  if (!signatureData.startsWith('data:image')) redirect(`/admin/${id}?e=sig`);

  const { data: rental } = await sb.from('rentals').select('*').eq('id', id).single();
  if (!rental) throw new Error('Rental not found');

  const now = new Date();
  const h = headers();
  const terms = {
    ...(rental.terms || {}),
    executedAt: now.toISOString().slice(0, 10),
    providerSignature: {
      name: signerName,
      title: 'Owner / Managing Member',
      dataUrl: signatureData,
      signedAt: now.toISOString(),
      ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    },
  };

  await sb.from('rentals').update({ terms }).eq('id', id);

  try {
    await sendExecutedCopy({ ...rental, terms });
  } catch (e) {
    console.error('executed-copy email failed:', e);
  }

  revalidatePath(`/admin/${id}`);
  redirect(`/admin/${id}?executed=1`);
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
// tonton_percent = the % of rent Marc owes TonTon; Marc keeps the rest.
function clampPct(v) {
  const n = Number(v);
  if (isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export async function addWhiskey(formData) {
  requireAuth();
  const sb = getSupabase();
  const { error } = await sb.from('whiskey_rentals').insert({
    name: formData.get('name'),
    spot: formData.get('spot') || null,
    monthly_amount: Number(formData.get('monthly_amount')) || 0,
    tonton_percent: clampPct(formData.get('tonton_percent')),
    notes: formData.get('notes') || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/whiskey');
  revalidatePath('/');
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
      tonton_percent: clampPct(formData.get('tonton_percent')),
      active: formData.get('active') === 'on',
    })
    .eq('id', formData.get('id'));
  revalidatePath('/whiskey');
  revalidatePath('/');
  redirect('/whiskey?saved=1');
}

export async function deleteWhiskey(formData) {
  requireAuth();
  const sb = getSupabase();
  await sb.from('whiskey_rentals').delete().eq('id', formData.get('id'));
  revalidatePath('/whiskey');
  revalidatePath('/');
  redirect('/whiskey?deleted=1');
}

// ---- Whiskey: Marc email + monthly automation settings ----
export async function saveWhiskeySettings(formData) {
  requireAuth();
  const sb = getSupabase();
  let day = Number(formData.get('send_day')) || 1;
  day = Math.max(1, Math.min(28, day));
  await sb.from('whiskey_settings').update({
    marc_email: formData.get('marc_email') || null,
    reminders_enabled: formData.get('reminders_enabled') === 'on',
    send_day: day,
    updated_at: new Date().toISOString(),
  }).eq('id', 1);
  revalidatePath('/whiskey');
  redirect('/whiskey?settings=1');
}

// ---- Whiskey: send the combined statement to Marc now ----
export async function sendWhiskeyStatementNow() {
  requireAuth();
  const sb = getSupabase();
  const [{ data: settings }, { data: spots = [] }] = await Promise.all([
    sb.from('whiskey_settings').select('*').eq('id', 1).single(),
    sb.from('whiskey_rentals').select('*').eq('active', true).order('name'),
  ]);
  if (!settings?.marc_email) redirect('/whiskey?e=noemail');

  const month = monthKey();
  const label = monthLabel(month);
  let status = 'sent', errMsg = null, total = 0;
  try {
    const res = await sendWhiskeyStatement(spots, label, settings.marc_email);
    total = res.total;
  } catch (e) {
    status = 'failed';
    errMsg = String(e.message || e);
  }
  await sb.from('whiskey_statements').insert({
    month, to_email: settings.marc_email, status, total, spot_count: spots.length, auto: false, error: errMsg,
  });

  revalidatePath('/whiskey');
  redirect(status === 'sent' ? '/whiskey?stmt=1' : '/whiskey?stmt=err');
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

// ---- Provider: delete a rental (soft - restorable for 30 days) ----
export async function deleteRental(formData) {
  requireAuth();
  const sb = getSupabase();
  const id = formData.get('id');
  const { error } = await sb
    .from('rentals')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/');
  redirect('/?deleted=1');
}

// ---- Provider: restore a deleted rental ----
export async function restoreRental(formData) {
  requireAuth();
  const sb = getSupabase();
  const id = formData.get('id');
  const { error } = await sb.from('rentals').update({ deleted_at: null }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/');
  redirect('/?restored=1');
}

// ---- Provider: delete permanently, before the 30 days are up ----
export async function purgeRental(formData) {
  requireAuth();
  const sb = getSupabase();
  const id = formData.get('id');
  const { error } = await sb.from('rentals').delete().eq('id', id).not('deleted_at', 'is', null);
  if (error) throw new Error(error.message);
  revalidatePath('/');
  redirect('/?purged=1');
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
