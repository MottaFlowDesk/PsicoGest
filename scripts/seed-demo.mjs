/**
 * Seed conta demo: profissional + pacientes + ~1 ano de atendimentos.
 * Uso: node scripts/seed-demo.mjs
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
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO = {
  email: "demo@psicogest.com",
  password: "Demo@PsicoGest2026",
  fullName: "Dra. Ana Demo PsicoGuest",
};

const FIRST_NAMES = [
  "Maria", "João", "Ana", "Pedro", "Juliana", "Lucas", "Camila", "Rafael",
  "Fernanda", "Bruno", "Patricia", "Gabriel", "Larissa", "Felipe", "Beatriz",
  "Thiago", "Amanda", "Rodrigo", "Carolina", "Diego", "Isabela", "Marcelo",
];
const LAST_NAMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Lima", "Ferreira", "Almeida",
  "Costa", "Rodrigues", "Martins", "Pereira", "Carvalho", "Rocha", "Nunes",
];

function pad(n, size = 2) {
  return String(n).padStart(size, "0");
}

/** CPF sintético único de 11 dígitos (não precisa ser válido matematicamente para o CHECK). */
function makeCpf(seed) {
  return String(10000000000 + seed).slice(0, 11);
}

function makePhone(seed) {
  // 55119XXXXYYYY — 13 dígitos, casa com ^\+?[1-9]\d{10,14}$
  const mid = 90000000 + (seed % 8999999);
  return `5511${String(mid).slice(0, 8)}`;
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function setTimeBRT(date, hour, minute) {
  // Armazena como instante UTC equivalente a hour:minute em America/Sao_Paulo (UTC-3 fixo p/ seed)
  const d = new Date(date);
  d.setUTCHours(hour + 3, minute, 0, 0);
  return d;
}

async function ensureAuthUser() {
  const { data: listed, error: listErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) throw listErr;

  const existing = listed.users.find(
    (u) => u.email?.toLowerCase() === DEMO.email.toLowerCase()
  );

  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: DEMO.password,
      email_confirm: true,
      user_metadata: { full_name: DEMO.fullName },
    });
    if (error) throw error;
    console.log("Usuário Auth já existia — senha atualizada:", existing.id);
    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO.email,
    password: DEMO.password,
    email_confirm: true,
    user_metadata: { full_name: DEMO.fullName },
  });
  if (error) throw error;
  console.log("Usuário Auth criado:", data.user.id);
  return data.user.id;
}

async function waitForProfessional(userId) {
  for (let i = 0; i < 20; i++) {
    const { data, error } = await supabase
      .from("professionals")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (data?.id) return data.id;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("Trigger handle_new_user não criou o professional a tempo");
}

async function updateProfessional(professionalId) {
  const { error } = await supabase
    .from("professionals")
    .update({
      full_name: DEMO.fullName,
      email: DEMO.email,
      phone: "5511999887766",
      specialty: "Psicologia Clínica — TCC",
      registration_number: "CRP 06/123456",
      bio: "Conta demo do PsicoGuest com um ano de atendimentos simulados.",
      cpf: "52998224725",
      target_audience: ["adultos", "adolescentes"],
      address_zip: "01310100",
      address_street: "Avenida Paulista",
      address_number: "1000",
      address_complement: "Sala 1201",
      address_neighborhood: "Bela Vista",
      address_city: "São Paulo",
      address_state: "SP",
      custom_url_slug: "ana-demo",
      subscription_plan: "premium",
      subscription_status: "active",
    })
    .eq("id", professionalId);
  if (error) throw error;
}

async function seedAvailability(professionalId) {
  await supabase
    .from("professional_availability")
    .delete()
    .eq("professional_id", professionalId);

  const rows = [1, 2, 3, 4, 5].map((day) => ({
    professional_id: professionalId,
    day_of_week: day,
    start_time: "09:00",
    end_time: "18:00",
    default_session_duration: 50,
    interval_between_sessions: 10,
  }));

  const { error } = await supabase.from("professional_availability").insert(rows);
  if (error) throw error;
}

async function clearDemoData(professionalId) {
  // Ordem por FKs
  await supabase.from("appointments").delete().eq("professional_id", professionalId);
  await supabase.from("patients").delete().eq("professional_id", professionalId);
}

async function seedPatients(professionalId) {
  const patients = [];
  for (let i = 0; i < 18; i++) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[i % LAST_NAMES.length];
    const year = 1975 + (i % 25);
    const month = pad((i % 12) + 1);
    const day = pad((i % 27) + 1);
    patients.push({
      professional_id: professionalId,
      full_name: `${first} ${last} Demo`,
      date_of_birth: `${year}-${month}-${day}`,
      phone: makePhone(1000 + i),
      email: `${slugify(first)}.${slugify(last)}.demo${i}@example.com`,
      cpf: makeCpf(200000000 + i * 137),
      occupation: randomItem([
        "Analista",
        "Professor(a)",
        "Designer",
        "Engenheiro(a)",
        "Autônomo(a)",
        "Estudante",
      ]),
      notes: "Paciente gerado para demo PsicoGuest.",
      archived: false,
    });
  }

  const { data, error } = await supabase.from("patients").insert(patients).select("id, full_name");
  if (error) throw error;
  console.log(`Pacientes criados: ${data.length}`);
  return data;
}

function buildAppointments(professionalId, patients) {
  const appointments = [];
  const now = new Date();
  const start = addDays(now, -365);
  const endFuture = addDays(now, 30);

  // Slot hours BRT
  const slots = [
    [9, 0],
    [10, 0],
    [11, 0],
    [14, 0],
    [15, 0],
    [16, 0],
    [17, 0],
  ];

  // Cada paciente tem um dia da semana fixo (seg–sex) e horário
  patients.forEach((patient, idx) => {
    const weekday = (idx % 5) + 1; // 1=Mon ... 5=Fri
    const [hour, minute] = slots[idx % slots.length];

    // Percorre ~1 ano: a cada 7 dias a partir do primeiro weekday alinhado
    let cursor = new Date(start);
    while (cursor.getUTCDay() !== weekday) {
      cursor = addDays(cursor, 1);
    }

    let occurrence = 0;
    while (cursor <= endFuture) {
      const scheduledAt = setTimeBRT(cursor, hour, minute);
      const createdAt = addDays(scheduledAt, -14); // satisfaz scheduled_at > created_at

      let status = "completed";
      let completed_at = null;
      let cancelled_at = null;
      let cancelled_by = null;
      let confirmed_at = null;
      let type = occurrence % 4 === 0 ? "telehealth" : "in_person";
      let telehealth_provider = type === "telehealth" ? "google_meet" : null;
      let meeting_link =
        type === "telehealth"
          ? `https://meet.google.com/demo-${patient.id.slice(0, 8)}`
          : null;

      if (scheduledAt > now) {
        status = occurrence % 3 === 0 ? "confirmed" : "scheduled";
        if (status === "confirmed") confirmed_at = addDays(scheduledAt, -2).toISOString();
        completed_at = null;
      } else {
        const roll = occurrence % 12;
        if (roll === 0) {
          status = "cancelled";
          cancelled_at = addDays(scheduledAt, -1).toISOString();
          cancelled_by = "patient";
        } else if (roll === 1) {
          status = "no_show";
        } else if (roll === 2) {
          status = "confirmed";
          confirmed_at = addDays(scheduledAt, -1).toISOString();
          // passado confirmado mas não marcado completed — edge case demo
          if (scheduledAt < addDays(now, -2)) {
            status = "completed";
            completed_at = scheduledAt.toISOString();
          }
        } else {
          status = "completed";
          completed_at = scheduledAt.toISOString();
          confirmed_at = addDays(scheduledAt, -1).toISOString();
        }
      }

      appointments.push({
        professional_id: professionalId,
        patient_id: patient.id,
        scheduled_at: scheduledAt.toISOString(),
        created_at: createdAt.toISOString(),
        updated_at: createdAt.toISOString(),
        duration_minutes: 50,
        timezone: "America/Sao_Paulo",
        type,
        telehealth_provider,
        meeting_link,
        status,
        completed_at,
        cancelled_at,
        cancelled_by,
        confirmed_at,
        location: type === "in_person" ? "Consultório — Av. Paulista 1000" : null,
        notes:
          status === "completed"
            ? "Sessão demo registrada automaticamente."
            : null,
      });

      cursor = addDays(cursor, 7);
      occurrence += 1;
    }
  });

  return appointments;
}

async function seedAppointments(professionalId, patients) {
  const appointments = buildAppointments(professionalId, patients);
  console.log(`Inserindo ${appointments.length} agendamentos...`);

  const chunkSize = 200;
  let inserted = 0;
  for (let i = 0; i < appointments.length; i += chunkSize) {
    const chunk = appointments.slice(i, i + chunkSize);
    const { error } = await supabase.from("appointments").insert(chunk);
    if (error) throw error;
    inserted += chunk.length;
    console.log(`  ${inserted}/${appointments.length}`);
  }
  return appointments.length;
}

async function main() {
  console.log("→ Criando conta demo...");
  const userId = await ensureAuthUser();
  const professionalId = await waitForProfessional(userId);
  console.log("Professional:", professionalId);

  await updateProfessional(professionalId);
  await seedAvailability(professionalId);
  await clearDemoData(professionalId);
  const patients = await seedPatients(professionalId);
  const apptCount = await seedAppointments(professionalId, patients);

  const { count: patientCount } = await supabase
    .from("patients")
    .select("*", { count: "exact", head: true })
    .eq("professional_id", professionalId);

  const { count: completedCount } = await supabase
    .from("appointments")
    .select("*", { count: "exact", head: true })
    .eq("professional_id", professionalId)
    .eq("status", "completed");

  console.log("\n✅ Demo pronta");
  console.log("─────────────────────────────────");
  console.log(`Email:        ${DEMO.email}`);
  console.log(`Senha:        ${DEMO.password}`);
  console.log(`Pacientes:    ${patientCount}`);
  console.log(`Agendamentos: ${apptCount} (completed: ${completedCount})`);
  console.log(`Login:        ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`);
  console.log("─────────────────────────────────");
}

main().catch((err) => {
  console.error("Seed falhou:", err);
  process.exit(1);
});
