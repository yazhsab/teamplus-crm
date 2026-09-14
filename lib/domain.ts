export const stages = [
  "New lead",
  "Qualified",
  "Quotation",
  "Confirmed",
  "Design",
  "Production",
  "Quality check",
  "Ready",
  "Delivered",
  "Paid",
] as const;
export type Stage = (typeof stages)[number];
export type Job = {
  id: string;
  customer: string;
  contact: string;
  title: string;
  category: string;
  stage: Stage;
  value: number;
  cost: number;
  paid: number;
  due: string;
  owner: string;
  source: string;
  priority: string;
  artworkApproved: boolean;
  qcPassed: boolean;
  notes: string;
  approvalReference?: string;
  qcNote?: string;
  deliveryReference?: string;
  version: number;
  createdAt: string;
};
export type Task = {
  id: string;
  title: string;
  customer: string;
  due: string;
  time: string;
  done: boolean;
  version?: number;
};
export type Event = { id: string; jobId: string; message: string; at: string };
export type Workspace = {
  jobs: Job[];
  tasks: Task[];
  events: Event[];
  files?: FileRecord[];
};
export type FileRecord = {
  id: string;
  jobId: string;
  name: string;
  size: number;
  contentType: string;
  at: string;
};
export const categories = [
  "LED signage",
  "Print & display",
  "Promotional products",
  "Branding & design",
  "Digital services",
];
export const money = (value: number, compact = false) =>
  compact && Math.abs(value) >= 100000
    ? `₹${(value / 100000).toFixed(2)}L`
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(value);
export const dateLabel = (date: string) =>
  new Date(date + "T12:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function seedWorkspace(): Workspace {
  const day = new Date();
  const date = (offset: number) => {
    const d = new Date(day);
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString("en-CA");
  };
  const input: [
    string,
    string,
    string,
    Stage,
    number,
    number,
    number,
    string,
    number,
    string,
    string,
  ][] = [
    [
      "Aster Motors",
      "LED showroom signage",
      "LED signage",
      "Production",
      185000,
      119000,
      92500,
      "Keerthana",
      2,
      "High",
      "Website",
    ],
    [
      "Greenleaf Foods",
      "Retail launch branding",
      "Branding & design",
      "Design",
      96000,
      51000,
      48000,
      "Priya",
      1,
      "High",
      "Referral",
    ],
    [
      "Nova Textiles",
      "Promotional canopy tents",
      "Promotional products",
      "Quotation",
      124000,
      79000,
      0,
      "Hari",
      5,
      "Normal",
      "WhatsApp",
    ],
    [
      "Meridian Hospital",
      "Wayfinding & reception signs",
      "LED signage",
      "Quality check",
      248000,
      160000,
      124000,
      "Ramesh",
      0,
      "High",
      "Website",
    ],
    [
      "Kaveri Builders",
      "Site hoarding & display",
      "Print & display",
      "Ready",
      68500,
      42500,
      34250,
      "Ramesh",
      0,
      "Normal",
      "Call",
    ],
    [
      "Cedar Retail",
      "Festive campaign standees",
      "Print & display",
      "Qualified",
      42000,
      24500,
      0,
      "Hari",
      7,
      "Normal",
      "WhatsApp",
    ],
    [
      "Orbit Events",
      "Branded umbrellas · 100 units",
      "Promotional products",
      "New lead",
      75000,
      47000,
      0,
      "Priya",
      9,
      "Normal",
      "Website",
    ],
    [
      "Tara Jewellers",
      "Store launch identity",
      "Branding & design",
      "Confirmed",
      145000,
      82000,
      72500,
      "Keerthana",
      10,
      "Normal",
      "Referral",
    ],
    [
      "Marigold School",
      "Admissions campaign",
      "Digital services",
      "Paid",
      85000,
      45000,
      85000,
      "Priya",
      -5,
      "Normal",
      "Referral",
    ],
    [
      "Coastline Cafe",
      "Exterior illuminated letters",
      "LED signage",
      "Delivered",
      112000,
      68000,
      56000,
      "Hari",
      -2,
      "High",
      "WhatsApp",
    ],
    [
      "Bloom Organics",
      "Packaging design system",
      "Branding & design",
      "Paid",
      62000,
      28000,
      62000,
      "Keerthana",
      -9,
      "Normal",
      "Website",
    ],
    [
      "Veda Mobility",
      "Dealer activation kit",
      "Promotional products",
      "Production",
      164000,
      96000,
      82000,
      "Ramesh",
      4,
      "Normal",
      "Call",
    ],
  ];
  const jobs = input.map(
    (x, i): Job => ({
      id: `TP-${String(1041 + i)}`,
      customer: x[0],
      contact: "",
      title: x[1],
      category: x[2],
      stage: x[3],
      value: x[4],
      cost: x[5],
      paid: x[6],
      owner: x[7],
      due: date(x[8]),
      priority: x[9],
      source: x[10],
      artworkApproved: stages.indexOf(x[3]) >= 5,
      qcPassed: stages.indexOf(x[3]) >= 7,
      notes:
        i === 0
          ? "Warm white LED letters. Confirm final fascia dimensions before fabrication."
          : i === 1
            ? "Client feedback is pending on the second creative direction."
            : "Confirm specifications and delivery requirements with the customer.",
      version: 1,
      createdAt: date(-12 + i),
    }),
  );
  return {
    jobs,
    tasks: [
      {
        id: "task-1",
        title: "Follow up on canopy quotation",
        customer: "Nova Textiles",
        due: date(0),
        time: "10:30",
        done: false,
      },
      {
        id: "task-2",
        title: "Collect artwork feedback",
        customer: "Greenleaf Foods",
        due: date(0),
        time: "11:30",
        done: false,
      },
      {
        id: "task-3",
        title: "Confirm installation access",
        customer: "Meridian Hospital",
        due: date(0),
        time: "14:00",
        done: false,
      },
      {
        id: "task-4",
        title: "Follow up on balance payment",
        customer: "Coastline Cafe",
        due: date(0),
        time: "16:00",
        done: false,
      },
    ],
    events: jobs.slice(0, 4).map((j, i) => ({
      id: `event-${i}`,
      jobId: j.id,
      message: `${j.customer} · ${j.stage}`,
      at: new Date(Date.now() - (i + 1) * 3600000).toISOString(),
    })),
  };
}
export function nextStage(job: Job): Stage | undefined {
  return stages[stages.indexOf(job.stage) + 1];
}
export function transitionError(job: Job, target: Stage): string | null {
  if (nextStage(job) !== target)
    return "Refresh this job before changing its stage.";
  if (target === "Production" && !job.artworkApproved)
    return "Record artwork approval before starting production.";
  if (target === "Ready" && !job.qcPassed)
    return "Complete quality check before marking this job ready.";
  if (target === "Paid" && job.paid < job.value)
    return "Record the outstanding payment before closing this job.";
  return null;
}
