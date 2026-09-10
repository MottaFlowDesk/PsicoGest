/**
 * Seed financeiro + prontuários da conta demo (Dra. Ana).
 * Uso: node scripts/seed-demo-finance-records.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Faltam variáveis Supabase no .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_EMAIL = "demo@psicogest.com";
const SESSION_PRICE_CENTS = [18000, 20000, 22000, 25000]; // R$ 180–250
const PAYMENT_METHODS = ["pix", "credit_card", "boleto", "cash"];

const NOTE_TEMPLATES = [
  (name, date) =>
    `Sessão com ${name} em ${date}.\n\nQueixa principal: ansiedade situacional e dificuldade de regulação emocional no trabalho.\n\nConteúdo: revisão de eventos da semana, identificação de pensamentos automáticos e ensaio de estratégias de coping (respiração diafragmática e reestruturação cognitiva).\n\nPlano: praticar registro de pensamentos 3x/semana e retomar na próxima sessão.`,
  (name, date) =>
    `Atendimento de ${name} — ${date}.\n\nTema: relacionamentos interpessoais e assertividade.\n\nIntervenções: role-play de comunicação não violenta; psicoeducação sobre limites.\n\nEvolução: paciente relata melhora parcial na qualidade do sono e maior clareza sobre demandas familiares.`,
  (name, date) =>
    `Prontuário — ${name} (${date}).\n\nFoco: humor deprimido leve e procrastinação.\n\nTécnicas: ativação comportamental e planejamento de microtarefas.\n\nObservações: humor afável, insight adequado, sem ideação suicida. Concordou com plano de atividades prazerosas até a próxima sessão.`,
  (name, date) =>
    `Sessão teleconsulta — ${name} — ${date}.\n\nDiscussão de gatilhos de estresse e checklist de autocuidado.\n\nHipótese de trabalho: padrões de perfeccionismo associados a evitação.\n\nEncaminhamentos: manter diário de humor; avaliar necessidade de articulação multiprofissional se sintomatologia persistir.`,
  (name, date) =>
    `Registro clínico de ${name} em ${date}.\n\nAbordagem: TCC.\n\nConteúdo: exposição gradual a situações evitadas; reforço positivo de progressos.\n\nStatus: engajamento bom, adesão às tarefas de casa. Próxima sessão: revisar hierarquia de exposições.`,
];

function addDaysISO(dateStr, days) {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatBR(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function pick(arr, i) {
  return arr[i % arr.length];
}

async function getProfessional() {
  const { data, error } = await supabase
    .from("professionals")
    .select("id, full_name")
    .eq("email", DEMO_EMAIL)
    .single();
  if (error || !data) throw error || new Error("Profissional demo não encontrado");
  return data;
}

async function clearExisting(professionalId) {
  console.log("Limpando financeiro e prontuários anteriores da demo...");
  // payments → invoices; versions cascade from medical_records
  const { error: payErr } = await supabase
    .from("payments")
    .delete()
    .eq("professional_id", professionalId);
  if (payErr) throw payErr;

  const { error: invErr } = await supabase
    .from("invoices")
    .delete()
    .eq("professional_id", professionalId);
  if (invErr) throw invErr;

  const { error: recErr } = await supabase
    .from("medical_records")
    .delete()
    .eq("professional_id", professionalId);
  if (recErr) throw recErr;
}

async function fetchAppointments(professionalId) {
  const pageSize = 1000;
  let from = 0;
  const all = [];
  for (;;) {
    const { data, error } = await supabase
      .from("appointments")
      .select("id, patient_id, scheduled_at, status, type, patients(full_name)")
      .eq("professional_id", professionalId)
      .order("scheduled_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function seedMedicalRecords(professionalId, appointments) {
  console.log(`Criando prontuários para ${appointments.length} sessões...`);

  const recordsPayload = appointments.map((a, i) => {
    const patientName = a.patients?.full_name || "Paciente";
    const dateLabel = formatBR(a.scheduled_at);
    const isPastDone = ["completed", "confirmed", "no_show"].includes(a.status);
    const isFuture = new Date(a.scheduled_at) > new Date();
    const status =
      a.status === "completed" || (isPastDone && !isFuture && a.status !== "cancelled")
        ? "finalized"
        : a.status === "cancelled"
          ? "draft"
          : isFuture
            ? "draft"
            : "finalized";

    const title =
      a.status === "cancelled"
        ? `Sessão cancelada — ${patientName} — ${dateLabel}`
        : a.status === "no_show"
          ? `Falta (no-show) — ${patientName} — ${dateLabel}`
          : `Sessão #${i + 1} — ${patientName} — ${dateLabel}`;

    return {
      professional_id: professionalId,
      patient_id: a.patient_id,
      appointment_id: a.id,
      title,
      status,
      current_version: 1,
      finalized_at: status === "finalized" ? a.scheduled_at : null,
      created_at: a.scheduled_at,
      updated_at: a.scheduled_at,
      _meta: { patientName, dateLabel, statusAppt: a.status, type: a.type },
    };
  });

  const insertedRecords = [];
  const chunkSize = 150;
  for (let i = 0; i < recordsPayload.length; i += chunkSize) {
    const chunk = recordsPayload.slice(i, i + chunkSize).map(({ _meta, ...row }) => row);
    const { data, error } = await supabase
      .from("medical_records")
      .insert(chunk)
      .select("id, appointment_id, status");
    if (error) throw error;
    insertedRecords.push(...data);
    console.log(`  prontuários ${insertedRecords.length}/${recordsPayload.length}`);
  }

  // Map appointment_id → meta for content
  const metaByAppt = new Map(recordsPayload.map((r) => [r.appointment_id, r._meta]));

  const versions = insertedRecords.map((rec, idx) => {
    const meta = metaByAppt.get(rec.appointment_id) || {
      patientName: "Paciente",
      dateLabel: "",
      statusAppt: "completed",
    };
    let text;
    if (meta.statusAppt === "cancelled") {
      text = `Sessão com ${meta.patientName} em ${meta.dateLabel} foi cancelada. Motivo registrado na agenda. Sem intervenção clínica nesta data.`;
    } else if (meta.statusAppt === "no_show") {
      text = `Paciente ${meta.patientName} não compareceu em ${meta.dateLabel}. Tentativa de contato registrada. Reagendamento sugerido.`;
    } else if (rec.status === "draft") {
      text = `Rascunho pré-sessão — ${meta.patientName} (${meta.dateLabel}). Objetivos preliminares: acolhimento, checagem de humor e revisão de tarefas da semana.`;
    } else {
      text = pick(NOTE_TEMPLATES, idx)(meta.patientName, meta.dateLabel);
      if (meta.type === "telehealth") {
        text += "\n\nModalidade: teleconsulta.";
      }
    }
    return {
      medical_record_id: rec.id,
      version: 1,
      content: { text },
      edited_by: professionalId,
      edit_reason: "Seed demo — criação inicial",
    };
  });

  let versionCount = 0;
  for (let i = 0; i < versions.length; i += chunkSize) {
    const chunk = versions.slice(i, i + chunkSize);
    const { error } = await supabase.from("medical_record_versions").insert(chunk);
    if (error) throw error;
    versionCount += chunk.length;
    console.log(`  versões ${versionCount}/${versions.length}`);
  }

  return insertedRecords.length;
}

async function seedFinance(professionalId, appointments) {
  // Faturar sessões realizadas (completed) + parte das confirmed passadas
  const billable = appointments.filter((a) => a.status === "completed");
  console.log(`Criando faturas para ${billable.length} sessões concluídas...`);

  const now = new Date();
  const invoices = billable.map((a, i) => {
    const issueDate = a.scheduled_at.slice(0, 10);
    const year = Number(issueDate.slice(0, 4));
    const amount = pick(SESSION_PRICE_CENTS, i);
    const method = pick(PAYMENT_METHODS, i);
    const dueDate = addDaysISO(issueDate, 7);
    const scheduled = new Date(a.scheduled_at);

    let status = "paid";
    let paid_at = new Date(scheduled.getTime() + 2 * 60 * 60 * 1000).toISOString();

    const ageDays = (now - scheduled) / (1000 * 60 * 60 * 24);
    const roll = i % 10;
    if (ageDays < 7 && roll === 0) {
      status = "pending";
      paid_at = null;
    } else if (ageDays > 14 && roll === 1) {
      status = "overdue";
      paid_at = null;
    } else if (roll === 2) {
      status = "cancelled";
      paid_at = null;
    }

    // sequence único global por ano (constraint UNIQUE fiscal_year, sequence_number)
    const seqByYear = {};
    // filled below after we know year — use running counters
    return {
      professional_id: professionalId,
      patient_id: a.patient_id,
      appointment_id: a.id,
      fiscal_year: year,
      sequence_number: 0, // placeholder
      invoice_number: "", // placeholder
      amount_cents: amount,
      currency: "BRL",
      description: `Sessão psicológica — ${formatBR(a.scheduled_at)}`,
      issue_date: issueDate,
      due_date: dueDate,
      paid_at,
      status,
      payment_method: status === "paid" || status === "pending" || status === "overdue" ? method : null,
      notes: "Fatura gerada automaticamente (seed demo).",
      created_at: a.scheduled_at,
      updated_at: a.scheduled_at,
    };
  });

  // Assign unique sequence per year
  const counters = {};
  for (const inv of invoices) {
    counters[inv.fiscal_year] = (counters[inv.fiscal_year] || 0) + 1;
    inv.sequence_number = counters[inv.fiscal_year];
    inv.invoice_number = `DEMO-${inv.fiscal_year}-${String(inv.sequence_number).padStart(4, "0")}`;
  }

  const insertedInvoices = [];
  const chunkSize = 150;
  for (let i = 0; i < invoices.length; i += chunkSize) {
    const chunk = invoices.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("invoices")
      .insert(chunk)
      .select("id, status, amount_cents, payment_method, paid_at, professional_id");
    if (error) throw error;
    insertedInvoices.push(...data);
    console.log(`  faturas ${insertedInvoices.length}/${invoices.length}`);
  }

  const paid = insertedInvoices.filter((inv) => inv.status === "paid");
  console.log(`Criando ${paid.length} pagamentos...`);

  const payments = paid.map((inv, i) => {
    const fee =
      inv.payment_method === "pix" || inv.payment_method === "cash"
        ? 0
        : Math.round(inv.amount_cents * 0.039);
    return {
      invoice_id: inv.id,
      professional_id: professionalId,
      amount_cents: inv.amount_cents,
      currency: "BRL",
      stripe_payment_intent_id:
        inv.payment_method === "credit_card" ? `pi_demo_${inv.id.replace(/-/g, "").slice(0, 24)}` : null,
      status: "succeeded",
      payment_method: inv.payment_method || "pix",
      payment_method_details: { source: "seed-demo" },
      stripe_fee_cents: fee,
      net_amount_cents: inv.amount_cents - fee,
      paid_at: inv.paid_at,
      created_at: inv.paid_at,
      updated_at: inv.paid_at,
    };
  });

  let payCount = 0;
  for (let i = 0; i < payments.length; i += chunkSize) {
    const chunk = payments.slice(i, i + chunkSize);
    const { error } = await supabase.from("payments").insert(chunk);
    if (error) throw error;
    payCount += chunk.length;
    console.log(`  pagamentos ${payCount}/${payments.length}`);
  }

  const totals = insertedInvoices.reduce(
    (acc, inv) => {
      acc[inv.status] = (acc[inv.status] || 0) + 1;
      if (inv.status === "paid") acc.revenue += inv.amount_cents;
      return acc;
    },
    { revenue: 0 }
  );

  return {
    invoices: insertedInvoices.length,
    payments: payCount,
    totals,
  };
}

async function main() {
  const professional = await getProfessional();
  console.log(`Profissional: ${professional.full_name} (${professional.id})`);

  await clearExisting(professional.id);
  const appointments = await fetchAppointments(professional.id);
  if (!appointments.length) {
    throw new Error("Nenhum agendamento encontrado — rode antes scripts/seed-demo.mjs");
  }
  console.log(`Agendamentos carregados: ${appointments.length}`);

  const recordsCount = await seedMedicalRecords(professional.id, appointments);
  const finance = await seedFinance(professional.id, appointments);

  console.log("\n✅ Seed financeiro + prontuários concluído");
  console.log("─────────────────────────────────");
  console.log(`Prontuários:   ${recordsCount}`);
  console.log(`Faturas:       ${finance.invoices}`);
  console.log(`Pagamentos:    ${finance.payments}`);
  console.log(
    `Receita paga:  R$ ${(finance.totals.revenue / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
  );
  console.log(
    `Status faturas: paid=${finance.totals.paid || 0}, pending=${finance.totals.pending || 0}, overdue=${finance.totals.overdue || 0}, cancelled=${finance.totals.cancelled || 0}`
  );
  console.log("─────────────────────────────────");
}

main().catch((err) => {
  console.error("Seed falhou:", err);
  process.exit(1);
});
