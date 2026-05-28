import { useMemo, useState, type ReactNode } from "react";

// ============================================================
// V0 API Schema Types
// ============================================================

type RangeMinMax = { min: number; max: number };

type NoticeAgent = "doctor" | "nutritionist" | "personal_trainer";
type NoticeType = "warning" | "info" | "restriction";
type NoticeSeverity = "high" | "moderate" | "low";
type PlanStatus = "ready" | "provisional" | "unavailable";
type ResponseMode = "plan_ready" | "conversation" | "needs_more_info";

type Notice = {
  agent: NoticeAgent;
  type: NoticeType;
  severity: NoticeSeverity;
  message: string;
};

type FollowUpQuestion = {
  id: string;
  question: string;
  priority: "high" | "medium";
};

type Exercise = {
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  rir: string | null;
  note: string | null;
};

type TrainingSession = {
  id: string;
  name: string;
  focus: string;
  estimated_duration_minutes: number;
  exercises: Exercise[];
};

type Training = {
  status: PlanStatus;
  split: string;
  weekly_frequency: number;
  session_duration_minutes: RangeMinMax;
  sessions: TrainingSession[];
};

type Macros = {
  protein_g_per_kg: RangeMinMax;
  carbs_g_per_kg: RangeMinMax;
  fat_g_per_kg: RangeMinMax;
};

type MealExamples = {
  breakfast: string[];
  lunch_dinner: string[];
  snacks: string[];
  pre_workout: string[];
  post_workout: string[];
};

type Nutrition = {
  status: PlanStatus;
  kcal: RangeMinMax;
  macros: Macros;
  meals_per_day: RangeMinMax;
  hydration_ml_per_kg: RangeMinMax;
  timing: {
    pre_workout_window: string;
    post_workout_window: string;
  };
  meal_examples: MealExamples;
};

type JourneyFitV0 = {
  status: string;
  mode: ResponseMode;
  user_facing_message: string;
  notices: Notice[];
  follow_up_questions: FollowUpQuestion[];
  training: Training;
  nutrition: Nutrition;
};

type JourneyFitPlanEnvelope = JourneyFitV0 & {
  mode: "plan_ready" | "needs_more_info";
};

type JourneyFitConversationEnvelope = {
  mode: "conversation";
  assistant_message?: string;
  user_facing_message?: string;
  status?: string;
  follow_up_questions?: FollowUpQuestion[];
};

// ============================================================
// Legacy envelope for raw API wrapping (chat integration)
// ============================================================

type JourneyFitApiResponse = {
  json?: unknown;
  output?: unknown;
  result?: unknown;
  data?: unknown;
  message?: string;
  error?: string;
  choices?: Array<{ message?: { content?: unknown }; output_text?: unknown }>;
  [key: string]: unknown;
};

type JourneyFitEnvelope = {
  mode?: ResponseMode;
  assistant_message?: string;
  user_facing_message?: string;
  [key: string]: unknown;
};

type JourneyFitPreviewPayload = JourneyFitPlanEnvelope | JourneyFitConversationEnvelope | JourneyFitEnvelope;

// ============================================================
// Sample data
// ============================================================

const sampleData: JourneyFitV0 = {
  status: "plan_ready",
  mode: "plan_ready",
  user_facing_message:
    "Com o que você informou, montei uma base provisória de treino e nutrição. Responda as perguntas abaixo para personalizar tudo.",

  notices: [
    {
      agent: "doctor",
      type: "warning",
      severity: "moderate",
      message:
        "Triagem clínica incompleta. Confirme histórico cardiovascular e medicações antes de progredir intensidade.",
    },
    {
      agent: "nutritionist",
      type: "info",
      severity: "high",
      message:
        "Objetivo principal não informado — metas calóricas são ponto de partida provisório.",
    },
    {
      agent: "personal_trainer",
      type: "warning",
      severity: "moderate",
      message: "Equipamentos não confirmados; exercícios podem precisar de substituição.",
    },
  ],

  follow_up_questions: [
    {
      id: "q1",
      question: "Qual é seu objetivo: hipertrofia, emagrecimento, recomposição, performance ou saúde geral?",
      priority: "high",
    },
    {
      id: "q2",
      question: "Quais dias exatos da semana você consegue treinar?",
      priority: "high",
    },
    {
      id: "q3",
      question: "Onde você treina e quais equipamentos tem disponíveis?",
      priority: "high",
    },
    {
      id: "q4",
      question: "Você usa alguma medicação contínua ou suplemento com orientação médica?",
      priority: "high",
    },
  ],

  training: {
    status: "provisional",
    split: "Upper/Lower 4x",
    weekly_frequency: 4,
    session_duration_minutes: { min: 60, max: 85 },
    sessions: [
      {
        id: "day_1_upper_a",
        name: "Superiores A",
        focus: "Empurrar + Puxar horizontal, braços",
        estimated_duration_minutes: 70,
        exercises: [
          { name: "Supino reto com barra ou halteres", sets: 4, reps: "5-8", rest_seconds: 120, rir: "1-3", note: "Controlar a descida. Substituir por chest press se não houver banco." },
          { name: "Remada curvada, apoiada ou máquina", sets: 4, reps: "6-10", rest_seconds: 120, rir: "1-3", note: null },
          { name: "Supino inclinado com halteres", sets: 3, reps: "8-12", rest_seconds: 90, rir: "1-2", note: null },
          { name: "Puxada na frente ou barra fixa", sets: 3, reps: "8-12", rest_seconds: 90, rir: "1-2", note: null },
          { name: "Elevação lateral", sets: 3, reps: "12-20", rest_seconds: 60, rir: "0-2", note: null },
          { name: "Tríceps na polia ou francês", sets: 2, reps: "10-15", rest_seconds: 60, rir: "0-2", note: null },
          { name: "Rosca direta ou alternada", sets: 2, reps: "10-15", rest_seconds: 60, rir: "0-2", note: null },
        ],
      },
      {
        id: "day_2_lower_a",
        name: "Inferiores A",
        focus: "Agachamento, quadríceps, posterior, core",
        estimated_duration_minutes: 75,
        exercises: [
          { name: "Agachamento livre, frontal ou hack squat", sets: 4, reps: "5-8", rest_seconds: 150, rir: "1-3", note: "Escolher variação com melhor técnica e conforto articular." },
          { name: "Levantamento romeno", sets: 4, reps: "6-10", rest_seconds: 120, rir: "1-3", note: null },
          { name: "Leg press", sets: 3, reps: "10-15", rest_seconds: 90, rir: "1-2", note: null },
          { name: "Mesa flexora", sets: 3, reps: "10-15", rest_seconds: 75, rir: "0-2", note: null },
          { name: "Panturrilha em pé ou sentado", sets: 4, reps: "8-15", rest_seconds: 60, rir: "0-2", note: null },
          { name: "Prancha ou variação anti-extensão", sets: 3, reps: "30-60s", rest_seconds: 45, rir: null, note: null },
        ],
      },
      {
        id: "day_3_upper_b",
        name: "Superiores B",
        focus: "Empurrar + Puxar vertical, deltoides, braços",
        estimated_duration_minutes: 70,
        exercises: [
          { name: "Desenvolvimento militar com barra ou halteres", sets: 4, reps: "5-8", rest_seconds: 120, rir: "1-3", note: null },
          { name: "Barra fixa, puxada alta ou pull-down neutro", sets: 4, reps: "6-10", rest_seconds: 120, rir: "1-3", note: null },
          { name: "Paralelas, supino máquina ou crucifixo máquina", sets: 3, reps: "8-12", rest_seconds: 90, rir: "1-2", note: null },
          { name: "Remada baixa ou unilateral", sets: 3, reps: "8-12", rest_seconds: 90, rir: "1-2", note: null },
          { name: "Face pull ou voador reverso", sets: 3, reps: "12-20", rest_seconds: 60, rir: "0-2", note: null },
          { name: "Rosca inclinada ou martelo", sets: 2, reps: "10-15", rest_seconds: 60, rir: "0-2", note: null },
          { name: "Tríceps corda ou testa", sets: 2, reps: "10-15", rest_seconds: 60, rir: "0-2", note: null },
        ],
      },
      {
        id: "day_4_lower_b",
        name: "Inferiores B",
        focus: "Padrão terra, unilateral, glúteos, core",
        estimated_duration_minutes: 75,
        exercises: [
          { name: "Levantamento terra, trap bar ou terra parcial", sets: 3, reps: "4-6", rest_seconds: 150, rir: "1-3", note: "Escolher variação mais técnica e sustentável para a lombar." },
          { name: "Agachamento búlgaro ou passada", sets: 3, reps: "8-12/perna", rest_seconds: 90, rir: "1-2", note: null },
          { name: "Hip thrust ou glute bridge", sets: 3, reps: "8-12", rest_seconds: 90, rir: "1-2", note: null },
          { name: "Cadeira extensora", sets: 2, reps: "12-18", rest_seconds: 60, rir: "0-2", note: null },
          { name: "Flexora sentado ou nordic assistido", sets: 2, reps: "10-15", rest_seconds: 60, rir: "0-2", note: null },
          { name: "Panturrilha", sets: 4, reps: "10-20", rest_seconds: 60, rir: "0-2", note: null },
          { name: "Abdominal com cabo ou anti-rotação", sets: 3, reps: "10-15", rest_seconds: 45, rir: null, note: null },
        ],
      },
    ],
  },

  nutrition: {
    status: "provisional",
    kcal: { min: 2300, max: 2700 },
    macros: {
      protein_g_per_kg: { min: 1.6, max: 2.2 },
      carbs_g_per_kg: { min: 3.0, max: 5.0 },
      fat_g_per_kg: { min: 0.6, max: 1.0 },
    },
    meals_per_day: { min: 3, max: 5 },
    hydration_ml_per_kg: { min: 30, max: 40 },
    timing: {
      pre_workout_window: "60-150 min antes",
      post_workout_window: "até 2h depois",
    },
    meal_examples: {
      breakfast: [
        "Ovos mexidos ou omelete + pão ou tapioca + fruta",
        "Iogurte + aveia + banana + whey (se já usar)",
        "Sanduíche com queijo magro e frango + fruta",
      ],
      lunch_dinner: [
        "Arroz, feijão, frango/carne magra/peixe, salada e legumes",
        "Macarrão ou batata com carne magra e vegetais",
        "Prato simples com proteína, carboidrato base e vegetais",
      ],
      snacks: [
        "Iogurte com fruta",
        "Fruta + castanhas",
        "Sanduíche simples com proteína",
        "Queijo cottage ou iogurte + aveia",
      ],
      pre_workout: [
        "Banana com iogurte",
        "Pão com frango desfiado",
        "Aveia com leite ou iogurte",
      ],
      post_workout: [
        "Arroz e frango",
        "Iogurte + fruta + aveia",
        "Sanduíche com proteína + fruta",
      ],
    },
  },
};

const sampleText = JSON.stringify(sampleData, null, 2);

// ============================================================
// Chat types
// ============================================================

type ChatMessage = { role: "user" | "assistant"; content: string };

const starterMessages: ChatMessage[] = [
  {
    role: "assistant",
    content: "Oi! Me conta o que você quer fazer hoje.",
  },
];

// ============================================================
// JSON parsing
// ============================================================

function extractJsonPayload(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return trimmed;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}

function parseJson(text: string): { data: JourneyFitPreviewPayload | null; error: string | null } {
  try {
    const raw = extractJsonPayload(text);
    const parsed = JSON.parse(raw) as JourneyFitPreviewPayload;
    return { data: parsed, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "JSON inválido" };
  }
}

function resolveAssistantMessageFromApiResponse(payload: unknown): string {
  if (typeof payload === "string") return payload;
  if (!payload || typeof payload !== "object") return JSON.stringify(payload, null, 2);

  const record = payload as JourneyFitApiResponse;
  const chatContent = record.choices?.[0]?.message?.content;
  if (chatContent !== undefined) return resolveFromEnvelope(chatContent);

  const candidate = record.json ?? record.output ?? record.result ?? record.data ?? record.message ?? payload;
  return resolveFromEnvelope(candidate);
}

function extractHumanMessageFromObject(record: Record<string, unknown>): string | null {
  const finalAnswer = record.task_results;
  if (finalAnswer && typeof finalAnswer === "object") {
    const tasks = finalAnswer as Record<string, unknown>;
    const final = tasks.final_answer;
    if (final && typeof final === "object") {
      const finalRecord = final as Record<string, unknown>;
      const nestedKeys = ["user_facing_response", "answer", "summary", "assistant_message", "user_facing_message"];
      for (const key of nestedKeys) {
        const value = finalRecord[key];
        if (typeof value === "string" && value.trim()) return value.trim();
      }
    }
  }

  const directKeys = [
    "answer",
    "assistant_message",
    "user_facing_message",
    "message",
    "content",
    "text",
  ];

  for (const key of directKeys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return null;
}

function formatFollowUpQuestions(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) return null;

  const lines = value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (!item || typeof item !== "object") return "";
      const record = item as Record<string, unknown>;
      const question = typeof record.question === "string" ? record.question.trim() : "";
      return question;
    })
    .filter(Boolean);

  if (!lines.length) return null;
  return `\n\nPerguntas:\n${lines.map((line) => `- ${line}`).join("\n")}`;
}

function resolveFromEnvelope(payload: unknown): string {
  if (typeof payload !== "string") {
    const envelope = payload as JourneyFitEnvelope | null;
    if (envelope && typeof envelope === "object") {
      const msg =
        extractHumanMessageFromObject(envelope as Record<string, unknown>) ||
        envelope.assistant_message?.trim() ||
        envelope.user_facing_message?.trim();
      if (msg) {
        const extra = formatFollowUpQuestions((envelope as Record<string, unknown>).follow_up_questions);
        return `${msg}${extra ?? ""}`;
      }
    }
    return typeof payload === "undefined" ? "" : JSON.stringify(payload, null, 2);
  }
  const trimmed = payload.trim();
  if (!trimmed) return "";
  try {
    const parsed = JSON.parse(trimmed) as JourneyFitEnvelope;
    const msg =
      extractHumanMessageFromObject(parsed as Record<string, unknown>) ||
      parsed.assistant_message?.trim() ||
      parsed.user_facing_message?.trim();
    if (msg) {
      const extra = formatFollowUpQuestions((parsed as Record<string, unknown>).follow_up_questions);
      return `${msg}${extra ?? ""}`;
    }
  } catch { /* keep as-is */ }
  return trimmed;
}

function isPlanEnvelope(data: JourneyFitPreviewPayload): data is JourneyFitPlanEnvelope {
  return (
    data.mode !== "conversation" &&
    typeof (data as JourneyFitPlanEnvelope).training === "object" &&
    typeof (data as JourneyFitPlanEnvelope).nutrition === "object"
  );
}

function isV0Plan(value: unknown): value is JourneyFitPlanEnvelope {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    (v.mode === "plan_ready" || v.mode === "needs_more_info") &&
    typeof v.training === "object" &&
    typeof v.nutrition === "object"
  );
}

function extractV0PlanJson(payload: unknown): string | null {
  // Direct v0 plan
  if (isV0Plan(payload)) return JSON.stringify(payload, null, 2);

  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  // OpenAI chat completion wrapper: choices[0].message.content
  const content = (record.choices as Array<{ message?: { content?: unknown } }>)?.[0]?.message?.content;
  if (content !== undefined) {
    if (isV0Plan(content)) return JSON.stringify(content, null, 2);
    if (typeof content === "string") {
      try {
        const parsed = JSON.parse(extractJsonPayload(content));
        if (isV0Plan(parsed)) return JSON.stringify(parsed, null, 2);
      } catch { /* not a plan */ }
    }
  }

  // Generic envelope fields
  for (const key of ["json", "output", "result", "data"] as const) {
    const candidate = record[key];
    if (isV0Plan(candidate)) return JSON.stringify(candidate, null, 2);
    if (typeof candidate === "string") {
      try {
        const parsed = JSON.parse(extractJsonPayload(candidate));
        if (isV0Plan(parsed)) return JSON.stringify(parsed, null, 2);
      } catch { /* not a plan */ }
    }
  }

  return null;
}

// ============================================================
// UI Components
// ============================================================

function Badge({ children }: { children: ReactNode }) {
  return <span className="badge">{children}</span>;
}

function Card({ title, children, tone = "default" }: { title: string; children: ReactNode; tone?: "default" | "accent" }) {
  return (
    <section className={`card ${tone === "accent" ? "card-accent" : ""}`}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

const agentLabels: Record<NoticeAgent, string> = {
  doctor: "Médico",
  nutritionist: "Nutricionista",
  personal_trainer: "Personal",
};

const severityClass: Record<NoticeSeverity, string> = {
  high: "notice--high",
  moderate: "notice--moderate",
  low: "notice--low",
};

function NoticeCard({ notice }: { notice: Notice }) {
  return (
    <div className={`notice ${severityClass[notice.severity]}`}>
      <span className="notice__agent">{agentLabels[notice.agent]}</span>
      <p className="notice__message">{notice.message}</p>
    </div>
  );
}

function ExerciseRow({ ex }: { ex: Exercise }) {
  const meta = [
    `${ex.sets}×${ex.reps}`,
    `${ex.rest_seconds}s descanso`,
    ex.rir ? `RIR ${ex.rir}` : null,
  ].filter(Boolean).join(" · ");

  return (
    <li className="exercise-row">
      <div className="exercise-row__name">{ex.name}</div>
      <div className="exercise-row__meta muted">{meta}</div>
      {ex.note ? <div className="exercise-row__note muted">{ex.note}</div> : null}
    </li>
  );
}

function SessionCard({ session }: { session: TrainingSession }) {
  return (
    <article className="day-card">
      <div className="day-card__header">
        <div>
          <span className="day-pill">{session.name}</span>
          <p className="muted" style={{ marginTop: 4 }}>{session.focus}</p>
        </div>
        <span className="muted">{session.estimated_duration_minutes} min</span>
      </div>
      <ul className="list" style={{ marginTop: 8 }}>
        {session.exercises.map((ex) => (
          <ExerciseRow key={ex.name} ex={ex} />
        ))}
      </ul>
    </article>
  );
}

function MacroRow({ label, range, unit }: { label: string; range: RangeMinMax; unit: string }) {
  return (
    <div className="meal-row">
      <strong>{label}</strong>
      <span>{range.min}–{range.max} {unit}</span>
    </div>
  );
}

function NutritionPanel({ nutrition }: { nutrition: Nutrition }) {
  const { kcal, macros, meals_per_day, hydration_ml_per_kg, timing, meal_examples } = nutrition;
  return (
    <div className="stack">
      <Card title="Metas diárias" tone="accent">
        <div className="stack">
          <div className="meal-row">
            <strong>Calorias</strong>
            <span>{kcal.min}–{kcal.max} kcal</span>
          </div>
          <MacroRow label="Proteína" range={macros.protein_g_per_kg} unit="g/kg" />
          <MacroRow label="Carboidratos" range={macros.carbs_g_per_kg} unit="g/kg" />
          <MacroRow label="Gorduras" range={macros.fat_g_per_kg} unit="g/kg" />
          <div className="meal-row">
            <strong>Refeições/dia</strong>
            <span>{meals_per_day.min}–{meals_per_day.max}</span>
          </div>
          <div className="meal-row">
            <strong>Hidratação</strong>
            <span>{hydration_ml_per_kg.min}–{hydration_ml_per_kg.max} ml/kg</span>
          </div>
        </div>
      </Card>

      <Card title="Timing">
        <div className="stack">
          <div className="meal-row">
            <strong>Pré-treino</strong>
            <span>{timing.pre_workout_window}</span>
          </div>
          <div className="meal-row">
            <strong>Pós-treino</strong>
            <span>{timing.post_workout_window}</span>
          </div>
        </div>
      </Card>

      <Card title="Exemplos de refeições">
        <div className="stack">
          {(Object.entries(meal_examples) as [keyof MealExamples, string[]][]).map(([key, items]) => (
            <div key={key}>
              <p className="label" style={{ textTransform: "capitalize", marginBottom: 4 }}>
                {key.replace("_", " ")}
              </p>
              <ul className="list">
                {items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function QuestionsPanel({ questions }: { questions: FollowUpQuestion[] }) {
  const high = questions.filter((q) => q.priority === "high");
  return (
    <Card title="Perguntas pendentes">
      <ul className="list">
        {high.map((q) => (
          <li key={q.id}>{q.question}</li>
        ))}
      </ul>
    </Card>
  );
}

// ============================================================
// Plan rendering — tabs: Treino | Dieta | Avisos
// ============================================================

type Tab = "training" | "nutrition" | "notices";

function PlanPreview({ data }: { data: JourneyFitV0 }) {
  const [tab, setTab] = useState<Tab>("training");
  const notices = data.notices ?? [];
  const followUpQuestions = data.follow_up_questions ?? [];

  return (
    <>
      <div className="preview-header">
        <div>
          <span className="preview-kicker">Plano do usuário</span>
          <h2>JourneyFit</h2>
        </div>
        <span className={`badge ${data.training.status === "provisional" ? "badge--warn" : ""}`}>
          {data.training.status === "provisional" ? "Provisório" : "Pronto"}
        </span>
      </div>

      {data.user_facing_message ? (
        <p className="subtitle">{data.user_facing_message}</p>
      ) : null}

      <div className="tab-bar">
        {(["training", "nutrition", "notices"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`tab-btn${tab === t ? " tab-btn--active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "training" ? "Treino" : t === "nutrition" ? "Dieta" : "Avisos"}
            {t === "notices" && notices.length > 0 ? (
              <span className="tab-badge">{notices.length}</span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "training" && (
        <div className="stack">
          <div className="hero__badges">
            <Badge>{data.training.split}</Badge>
            <Badge>{data.training.weekly_frequency}x/semana</Badge>
            <Badge>
              {data.training.session_duration_minutes.min}–{data.training.session_duration_minutes.max} min
            </Badge>
          </div>
          {data.training.sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}

      {tab === "nutrition" && <NutritionPanel nutrition={data.nutrition} />}

      {tab === "notices" && (
        <div className="stack">
          {notices.map((notice, i) => (
            <NoticeCard key={`${notice.agent}-${i}`} notice={notice} />
          ))}
          {followUpQuestions.length > 0 && (
            <QuestionsPanel questions={followUpQuestions} />
          )}
        </div>
      )}
    </>
  );
}

function ConversationPreview({ data }: { data: JourneyFitConversationEnvelope }) {
  const message = data.user_facing_message?.trim() || data.assistant_message?.trim() || "Conversa pronta.";

  return (
    <div className="stack">
      <div className="preview-header">
        <div>
          <span className="preview-kicker">Conversa</span>
          <h2>JourneyFit</h2>
        </div>
        <span className="badge">Chat</span>
      </div>
      <p className="subtitle">{message}</p>
      <div className="empty-state">
        <h2>Sem plano ainda</h2>
        <p>Esse retorno é só uma saudação ou um passo de intake. O preview do plano aparece quando vier `plan_ready`.</p>
      </div>
    </div>
  );
}

// ============================================================
// App
// ============================================================

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages);
  const [promptText, setPromptText] = useState(
    "Gere um plano de treino upper/lower 4x para homem de 28 anos, 78kg, 172cm, bastante experiência, sem dor.",
  );
  const [jsonText, setJsonText] = useState(sampleText);
  const [isSending, setIsSending] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const { data, error } = useMemo(() => parseJson(jsonText), [jsonText]);

  const submitPrompt = async () => {
    const prompt = promptText.trim();
    if (!prompt) return;

    const endpoint =
      import.meta.env.VITE_JOURNEYFIT_API_URL?.trim() || "http://127.0.0.1:8642/v1/chat/completions";
    const apiKey = import.meta.env.VITE_JOURNEYFIT_API_KEY?.trim() || "";
    const modelName = import.meta.env.VITE_JOURNEYFIT_MODEL?.trim() || "journeyfit";
    const requestId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `jf-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const conversation = [...messages, { role: "user" as const, content: prompt }];
    setRequestError(null);
    setIsSending(true);
    setMessages([...conversation, { role: "assistant", content: "Enviando para o orquestrador..." }]);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          "X-Request-Id": requestId,
          "X-Hermes-Client": "journeyfit-frontend",
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: "system",
              content:
                "Você é o orquestrador JourneyFit. Responda apenas com JSON válido no schema v0 (status, mode, user_facing_message, notices, follow_up_questions, training, nutrition).",
            },
            ...conversation,
          ],
          stream: false,
        }),
      });

      const rawBody = await response.text();
      let parsedBody: unknown = rawBody;
      try { parsedBody = rawBody ? JSON.parse(rawBody) : {}; } catch { /* keep raw */ }

      if (!response.ok) {
        const backendError =
          typeof parsedBody === "object" &&
          parsedBody !== null &&
          "error" in parsedBody &&
          typeof (parsedBody as JourneyFitApiResponse).error === "string"
            ? (parsedBody as JourneyFitApiResponse).error
            : `Falha na request (${response.status})`;
        throw new Error(backendError);
      }

      const resolvedText = resolveAssistantMessageFromApiResponse(parsedBody);
      setMessages((current) => [
        ...current.slice(0, -1),
        { role: "assistant", content: resolvedText },
      ]);

      const planJson = extractV0PlanJson(parsedBody);
      if (planJson) setJsonText(planJson);

      setPromptText("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível enviar a request.";
      setRequestError(message);
      setMessages((current) => [
        ...current.slice(0, -1),
        { role: "assistant", content: `Não consegui falar com o backend: ${message}` },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="shell">
      <main className="app">
        <header className="hero">
          <div className="hero__eyebrow">JourneyFit preview</div>
          <h1>Converse com o orquestrador e veja o retorno virar um app.</h1>
          <p>
            Escreva o pedido no chat, cole a resposta JSON do orquestrador e veja à direita como
            isso aparece para o usuário final.
          </p>
          <div className="hero__badges">
            <Badge>mobile-first</Badge>
            <Badge>json-driven</Badge>
            <Badge>schema-v0</Badge>
          </div>
        </header>

        <section className="grid">
          <div className="left-column">
            <section className="chat-panel">
              <div className="panel-title">
                <h2>Chat com o orquestrador</h2>
                <span>fase manual, futura integração automática</span>
              </div>
              <div className="chat-transcript" aria-label="Conversa com o orquestrador">
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`chat-bubble chat-bubble--${message.role}`}
                  >
                    {message.content}
                  </div>
                ))}
              </div>
              <div className="chat-controls">
                <textarea
                  value={promptText}
                  onChange={(event) => setPromptText(event.target.value)}
                  placeholder="Ex.: gere um plano upper/lower 4x para homem de 28 anos"
                  aria-label="Pedido ao orquestrador"
                />
                <div className="chat-actions">
                  <button type="button" className="ghost-button" onClick={() => setPromptText("")}>
                    Limpar
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => { void submitPrompt(); }}
                    disabled={isSending}
                  >
                    {isSending ? "Enviando..." : "Enviar pedido"}
                  </button>
                </div>
                {requestError ? <p className="status status-error">{requestError}</p> : null}
              </div>
            </section>

            <section className="editor-panel">
              <div className="panel-title">
                <h2>Resposta JSON do orquestrador</h2>
                <span>copie e cole aqui por enquanto</span>
              </div>
              <textarea
                value={jsonText}
                onChange={(event) => setJsonText(event.target.value)}
                spellCheck={false}
                aria-label="JSON de entrada"
              />
              <p className={`status ${error ? "status-error" : "status-ok"}`}>
                {error ? `Erro de JSON: ${error}` : "JSON válido e pronto para renderizar."}
              </p>
            </section>
          </div>

          <div className="preview-phone" aria-label="Preview do app">
            <div className="phone-notch" />
            <div className="preview-scroll">
              {data ? (
                isPlanEnvelope(data) ? (
                  <PlanPreview data={data} />
                ) : (
                  <ConversationPreview data={data as JourneyFitConversationEnvelope} />
                )
              ) : (
                <div className="empty-state">
                  <h2>Não consegui interpretar o JSON.</h2>
                  <p>Ajuste a estrutura de entrada para continuar a renderização.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
