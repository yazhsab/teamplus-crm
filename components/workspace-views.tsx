"use client";
import { TeamAccess } from "@/components/team-access";
import { uploadJobFile, type UploadAttempt } from "@/lib/upload";
import { useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Search,
  Plus,
  Target,
  UserRound,
  FolderKanban,
  Palette,
  Factory,
  Truck,
  Check,
  Clock,
  Download,
  FileText,
  Paperclip,
  CheckCircle2,
  Wallet,
  Activity,
  ShieldCheck,
  Link2,
  PackageCheck,
  AlertCircle,
} from "lucide-react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Job,
  Task,
  Workspace,
  stages,
  money,
  dateLabel,
  nextStage,
  transitionError,
  categories,
  today,
} from "@/lib/domain";
export type Save = (payload: Record<string, unknown>) => Promise<boolean>;
export function Picker({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  label: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function Status({ stage }: { stage: string }) {
  return (
    <span
      className={"status status-" + stage.toLowerCase().replaceAll(" ", "-")}
    >
      {stage}
    </span>
  );
}
export function JobTable({
  jobs,
  onSelect,
}: {
  jobs: Job[];
  onSelect: (j: Job) => void;
}) {
  return (
    <div className="panel projects-panel">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>PROJECT / CUSTOMER</TableHead>
            <TableHead>STAGE</TableHead>
            <TableHead>OWNER</TableHead>
            <TableHead>DUE DATE</TableHead>
            <TableHead className="text-right">VALUE</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((j, i) => (
            <TableRow key={j.id}>
              <TableCell>
                <button
                  className="project-name job-link"
                  onClick={() => onSelect(j)}
                >
                  <span className={"project-icon color-" + (i % 5)}>
                    {j.customer
                      .split(" ")
                      .map((x) => x[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <div>
                    <strong>{j.title}</strong>
                    <small>
                      {j.id} · {j.customer}
                    </small>
                  </div>
                </button>
              </TableCell>
              <TableCell>
                <Status stage={j.stage} />
              </TableCell>
              <TableCell>{j.owner}</TableCell>
              <TableCell>
                <span
                  className={
                    j.due < today() && !["Paid", "Delivered"].includes(j.stage)
                      ? "overdue"
                      : ""
                  }
                >
                  {dateLabel(j.due)}
                </span>
              </TableCell>
              <TableCell className="amount text-right">
                {money(j.value)}
              </TableCell>
              <TableCell>
                <button
                  aria-label={"Open " + j.title}
                  className="icon-button"
                  onClick={() => onSelect(j)}
                >
                  <ChevronRight size={16} />
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!jobs.length && (
        <Empty
          title="No projects match this view"
          description="Try another stage or search term."
        />
      )}
      <div className="table-footer">
        {jobs.length} projects
        <span>Total value {money(jobs.reduce((s, j) => s + j.value, 0))}</span>
      </div>
    </div>
  );
}
export function Empty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="empty-state">
      <FolderKanban size={29} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function Pipeline({
  jobs,
  onSelect,
  production = false,
}: {
  jobs: Job[];
  onSelect: (j: Job) => void;
  production?: boolean;
}) {
  const columns = production
    ? ["Design", "Production", "Quality check", "Ready"]
    : ["New lead", "Qualified", "Quotation", "Confirmed"];
  return (
    <div className="kanban">
      {columns.map((s, i) => {
        const records = jobs.filter((j) => j.stage === s);
        return (
          <section key={s} className="kanban-column">
            <div className="kanban-heading">
              <span className={"stage-dot dot-" + i} />
              <h2>{s}</h2>
              <span>{records.length}</span>
            </div>
            <div className="kanban-total">
              {money(records.reduce((v, j) => v + j.value, 0))}
            </div>
            {records.map((j) => (
              <button
                key={j.id}
                className="deal-card"
                onClick={() => onSelect(j)}
              >
                <div className="deal-top">
                  <span>{j.id}</span>
                  {j.priority === "High" && (
                    <span className="priority">High priority</span>
                  )}
                </div>
                <h3>{j.title}</h3>
                <p>{j.customer}</p>
                <div className="deal-value">{money(j.value)}</div>
                <span className="category-label">{j.category}</span>
                <div className="deal-footer">
                  <span>
                    <Clock size={13} />
                    {dateLabel(j.due)}
                  </span>
                  <span className="assignee" title={j.owner}>
                    {j.owner.slice(0, 2).toUpperCase()}
                  </span>
                </div>
              </button>
            ))}
            {!records.length && (
              <div className="kanban-empty">No jobs at this stage</div>
            )}
          </section>
        );
      })}
    </div>
  );
}
export function Customers({
  jobs,
  onSelect,
}: {
  jobs: Job[];
  onSelect: (j: Job) => void;
}) {
  const [search, setSearch] = useState("");
  const names = [...new Set(jobs.map((j) => j.customer))].filter((n) =>
    n.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="view-toolbar">
        <label className="search-input">
          <Search size={16} />
          <input
            placeholder="Find a customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <span>{names.length} customers</span>
      </div>
      <div className="customer-grid">
        {names.map((name, i) => {
          const records = jobs.filter((j) => j.customer === name),
            value = records.reduce((s, j) => s + j.value, 0);
          return (
            <section className="customer-card panel" key={name}>
              <div className="customer-top">
                <span className={"project-icon color-" + (i % 5)}>
                  {name
                    .split(" ")
                    .map((x) => x[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <div>
                  <h2>{name}</h2>
                  <small>
                    {records[0].contact || "Contact details not added"}
                  </small>
                </div>
              </div>
              <div className="customer-summary">
                <div>
                  <small>Relationship value</small>
                  <strong>{money(value)}</strong>
                </div>
                <div>
                  <small>Projects</small>
                  <strong>{records.length}</strong>
                </div>
              </div>
              {records.map((j) => (
                <button
                  className="customer-project"
                  key={j.id}
                  onClick={() => onSelect(j)}
                >
                  <span>{j.title}</span>
                  <ChevronRight size={16} />
                </button>
              ))}
            </section>
          );
        })}
      </div>
      {!names.length && (
        <Empty
          title="No customers found"
          description="Create an enquiry to start a new customer relationship."
        />
      )}
    </>
  );
}
export function Finance({
  jobs,
  onSelect,
}: {
  jobs: Job[];
  onSelect: (j: Job) => void;
}) {
  const eligible = jobs.filter((j) => stages.indexOf(j.stage) >= 3);
  const [filter, setFilter] = useState("Outstanding");
  const shown = eligible.filter(
    (j) =>
      filter === "All jobs" ||
      (filter === "Outstanding" ? j.value > j.paid : j.value === j.paid),
  );
  return (
    <>
      <div className="info-banner">
        <Wallet size={18} />
        <span>
          Project collections register. Statutory invoicing, GST filing, and
          bank reconciliation are not connected.
        </span>
      </div>
      <div className="view-toolbar">
        <Picker
          label="Payment status"
          value={filter}
          onChange={setFilter}
          options={["Outstanding", "Fully paid", "All jobs"]}
        />
        <span>{shown.length} jobs</span>
      </div>
      <div className="panel projects-panel">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CUSTOMER / PROJECT</TableHead>
              <TableHead>ORDER VALUE</TableHead>
              <TableHead>RECEIVED</TableHead>
              <TableHead>BALANCE</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((j) => (
              <TableRow key={j.id}>
                <TableCell>
                  <button className="job-link" onClick={() => onSelect(j)}>
                    <strong>{j.customer}</strong>
                    <small>{j.title}</small>
                  </button>
                </TableCell>
                <TableCell>{money(j.value)}</TableCell>
                <TableCell className="positive">{money(j.paid)}</TableCell>
                <TableCell className="amount">
                  {money(j.value - j.paid)}
                </TableCell>
                <TableCell>
                  <button
                    className="secondary-button"
                    onClick={() => onSelect(j)}
                  >
                    {j.value > j.paid ? "Record payment" : "View history"}
                    <ArrowUpRight size={14} />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!shown.length && (
          <Empty
            title="Nothing to collect here"
            description="Your selected view has no matching projects."
          />
        )}
      </div>
    </>
  );
}
export function Tasks({
  tasks,
  save,
  busy,
  addTask,
}: {
  tasks: Task[];
  save: Save;
  busy: boolean;
  addTask: () => void;
}) {
  const [filter, setFilter] = useState("Open");
  const records = tasks.filter(
    (t) =>
      filter === "All tasks" || (filter === "Completed" ? t.done : !t.done),
  );
  return (
    <>
      <div className="view-toolbar">
        <Picker
          value={filter}
          onChange={setFilter}
          label="Task status"
          options={["Open", "Completed", "All tasks"]}
        />
        <button className="secondary-button" onClick={addTask}>
          <Plus size={16} />
          Add follow-up
        </button>
      </div>
      <div className="panel task-list">
        {records.map((t) => (
          <div className={"task-row " + (t.done ? "completed" : "")} key={t.id}>
            <Checkbox
              disabled={busy}
              checked={t.done}
              onCheckedChange={(v) =>
                save({
                  action: "completeTask",
                  id: t.id,
                  version: t.version,
                  done: v === true,
                })
              }
              aria-label={"Complete " + t.title}
            />
            <div>
              <strong>{t.title}</strong>
              <small>{t.customer || "Internal task"}</small>
            </div>
            <span className="task-due">
              <CalendarText date={t.due} />
              <span>{t.time}</span>
            </span>
          </div>
        ))}
        {!records.length && (
          <Empty
            title="You’re all caught up"
            description="Add a follow-up or switch to another view."
          />
        )}
      </div>
    </>
  );
}
function CalendarText({ date }: { date: string }) {
  return (
    <span className={date < today() ? "overdue" : ""}>{dateLabel(date)}</span>
  );
}
export function Reports({ jobs }: { jobs: Job[] }) {
  const totals = categories.map((c) => {
    const list = jobs.filter((j) => j.category === c);
    return {
      name: c,
      value: list.reduce((s, j) => s + j.value, 0),
      cost: list.reduce((s, j) => s + j.cost, 0),
      count: list.length,
    };
  });
  const max = Math.max(1, ...totals.map((t) => t.value));
  const active = jobs.filter((j) => stages.indexOf(j.stage) >= 3);
  const total = active.reduce((s, j) => s + j.value, 0),
    cost = active.reduce((s, j) => s + j.cost, 0);
  return (
    <div className="report-grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Value by business line</h2>
            <p>All current opportunities and jobs · INR</p>
          </div>
        </div>
        <div className="bar-chart">
          {totals.map((t) => (
            <div className="bar-chart-row" key={t.name}>
              <div>
                <span>{t.name}</span>
                <strong>{money(t.value, true)}</strong>
              </div>
              <div className="bar-track">
                <span style={{ width: `${(t.value / max) * 100}%` }} />
              </div>
              <small>{t.count} projects</small>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Estimated project margin</h2>
            <p>Confirmed jobs · based on entered costs</p>
          </div>
        </div>
        <div className="margin-report">
          <span className="huge-number">
            {total ? Math.round(((total - cost) / total) * 100) : 0}
            <small>%</small>
          </span>
          <p>Estimated gross margin</p>
          <Progress
            value={
              total
                ? Math.max(0, Math.min(100, ((total - cost) / total) * 100))
                : 0
            }
          />
          <dl>
            <div>
              <dt>Confirmed job value</dt>
              <dd>{money(total)}</dd>
            </div>
            <div>
              <dt>Estimated direct costs</dt>
              <dd>{money(cost)}</dd>
            </div>
            <div>
              <dt>Estimated gross profit</dt>
              <dd className="positive">{money(total - cost)}</dd>
            </div>
          </dl>
          <small>
            Excludes overheads, tax, actual material consumption, and unrecorded
            expenses.
          </small>
        </div>
      </section>
      <section className="panel full-width">
        <div className="panel-heading">
          <div>
            <h2>Sales sources</h2>
            <p>Enquiry sources recorded in this workspace</p>
          </div>
        </div>
        <div className="source-grid">
          {["Website", "WhatsApp", "Referral", "Call", "Email", "Walk-in"].map(
            (s) => (
              <div key={s}>
                <small>{s}</small>
                <strong>{jobs.filter((j) => j.source === s).length}</strong>
              </div>
            ),
          )}
        </div>
      </section>
    </div>
  );
}
export function Connections({
  production = false,
  role = "admin",
}: {
  production?: boolean;
  role?: string;
}) {
  return (
    <>
      {production && role === "admin" && <TeamAccess />}
      <div className="info-banner">
        <ShieldCheck size={20} />
        <span>
          {production
            ? `Your role is ${role}. Team records and attachments are shared according to your workspace access.`
            : "This preview uses your private workspace identity. Production uses separate team accounts and data."}
        </span>
      </div>
      <div className="customer-grid">
        {[
          [
            "WhatsApp Business",
            "Shared inbox, inbound leads, approved message templates.",
            "Not connected",
          ],
          [
            "Email & calendar",
            "Customer conversations and scheduled follow-ups.",
            "Not connected",
          ],
          [
            "Accounting",
            "GST invoices, ledger reconciliation and credit notes.",
            "Not connected",
          ],
          [
            "Team permissions",
            production
              ? "Administrators manage access. Managers record payments. Members handle operations. Viewers can read and export."
              : "Production supports administrators, managers, members and viewers.",
            production ? "Available" : "Production only",
          ],
          [
            "Stock & purchasing",
            "Materials, suppliers, purchase orders and stock movements.",
            "Planned",
          ],
          [
            "Private file storage",
            "Job attachments with authenticated downloads.",
            "Available",
          ],
        ].map(([name, text, status]) => (
          <section className="panel connection-card" key={name}>
            <Link2 size={21} />
            <h2>{name}</h2>
            <p>{text}</p>
            <span className="category-label">{status}</span>
          </section>
        ))}
      </div>
    </>
  );
}
export function EnquiryForm({
  open,
  onClose,
  save,
  busy,
  job,
}: {
  open: boolean;
  onClose: () => void;
  save: Save;
  busy: boolean;
  job?: Job | null;
}) {
  const [category, setCategory] = useState(job?.category || categories[0]);
  const [source, setSource] = useState(job?.source || "Website");
  const [priority, setPriority] = useState(job?.priority || "Normal");
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="form-modal">
        <DialogHeader>
          <DialogTitle>{job ? "Edit project" : "New enquiry"}</DialogTitle>
          <DialogDescription>
            {job
              ? "Keep requirements and handoffs up to date."
              : "Start a customer relationship. Keep every next step connected."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const value = Object.fromEntries(f);
            const payload = {
              ...value,
              category,
              source,
              priority,
              value: Number(value.value),
              cost: Number(value.cost),
            };
            if (
              await save({
                action: job ? "editJob" : "createJob",
                ...(job ? { id: job.id, version: job.version } : {}),
                job: payload,
              })
            )
              onClose();
          }}
        >
          <div className="form-grid">
            <label>
              Customer / company
              <input
                name="customer"
                defaultValue={job?.customer}
                required
                minLength={2}
                maxLength={120}
                placeholder="e.g. Aster Motors"
              />
            </label>
            <label>
              Contact email or phone
              <input
                name="contact"
                defaultValue={job?.contact}
                maxLength={120}
                placeholder="Optional"
              />
            </label>
            <label className="full-width">
              Project / requirement
              <input
                name="title"
                defaultValue={job?.title}
                required
                minLength={3}
                maxLength={160}
                placeholder="e.g. LED showroom signage"
              />
            </label>
            <label>
              Business line
              <Picker
                label="Business line"
                value={category}
                onChange={setCategory}
                options={categories}
              />
            </label>
            <label>
              Lead source
              <Picker
                label="Lead source"
                value={source}
                onChange={setSource}
                options={[
                  "Website",
                  "WhatsApp",
                  "Referral",
                  "Call",
                  "Email",
                  "Walk-in",
                ]}
              />
            </label>
            <label>
              Estimated value (₹)
              <input
                type="number"
                min="0"
                max="100000000"
                step="1"
                name="value"
                required
                defaultValue={job?.value}
                placeholder="0"
              />
            </label>
            <label>
              Estimated direct cost (₹)
              <input
                type="number"
                min="0"
                max="100000000"
                step="1"
                name="cost"
                required
                defaultValue={job?.cost}
                placeholder="0"
              />
            </label>
            <label>
              Target delivery
              <input
                type="date"
                name="due"
                required
                defaultValue={job?.due || today()}
              />
            </label>
            <label>
              Assigned to
              <input
                name="owner"
                defaultValue={job?.owner || "TeamPlus"}
                required
                maxLength={60}
              />
            </label>
            <label>
              Priority
              <Picker
                value={priority}
                onChange={setPriority}
                options={["Normal", "High"]}
                label="Priority"
              />
            </label>
            <label className="full-width">
              Requirements / specifications
              <textarea
                rows={3}
                name="notes"
                defaultValue={job?.notes}
                maxLength={5000}
                placeholder="Dimensions, material, finish, quantities, installation location…"
              />
            </label>
          </div>
          <div className="form-footer">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button disabled={busy} className="primary-button" type="submit">
              {busy ? "Saving…" : job ? "Save changes" : "Create enquiry"}
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function TaskForm({
  open,
  onClose,
  save,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  save: Save;
  busy: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="form-modal">
        <DialogHeader>
          <DialogTitle>Add follow-up</DialogTitle>
          <DialogDescription>
            Give the next action a clear owner in your daily routine.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            if (
              await save({ action: "createTask", task: Object.fromEntries(f) })
            )
              onClose();
          }}
        >
          <div className="form-grid">
            <label className="full-width">
              Next action
              <input
                name="title"
                required
                minLength={3}
                maxLength={160}
                placeholder="e.g. Confirm artwork feedback"
              />
            </label>
            <label className="full-width">
              Customer
              <input name="customer" maxLength={120} placeholder="Optional" />
            </label>
            <label>
              Due date
              <input name="due" type="date" required defaultValue={today()} />
            </label>
            <label>
              Time
              <input name="time" type="time" required defaultValue="10:00" />
            </label>
          </div>
          <div className="form-footer">
            <button className="primary-button" disabled={busy}>
              {busy ? "Saving…" : "Save follow-up"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function JobDetail({
  job,
  data,
  onClose,
  save,
  busy,
  onEdit,
  reload,
  production = false,
  canPay = true,
}: {
  job: Job | null;
  data: Workspace;
  onClose: () => void;
  save: Save;
  busy: boolean;
  onEdit: (j: Job) => void;
  reload: () => Promise<void>;
  production?: boolean;
  canPay?: boolean;
}) {
  const [action, setAction] = useState("");
  const [uploading, setUploading] = useState(false);
  const uploadAttempt = useRef<UploadAttempt | null>(null);
  const [fileError, setFileError] = useState("");
  if (!job) return null;
  const next = nextStage(job);
  const guard = next ? transitionError(job, next) : null;
  const files = (data.files || []).filter((f) => f.jobId === job.id);
  return (
    <>
      <Sheet open={!!job} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="job-sheet">
          <SheetHeader>
            <div className="detail-eyebrow">
              {job.id}
              <Status stage={job.stage} />
            </div>
            <SheetTitle>{job.title}</SheetTitle>
            <SheetDescription>
              {job.customer} · {job.category}
            </SheetDescription>
          </SheetHeader>
          <div className="detail-scroll">
            <div className="detail-actions">
              <button
                className="secondary-button"
                disabled={busy}
                onClick={() => onEdit(job)}
              >
                Edit details
              </button>
              {next && (
                <button
                  className="primary-button"
                  disabled={busy || !!guard}
                  title={guard || ""}
                  onClick={() =>
                    next === "Delivered"
                      ? setAction("recordDelivery")
                      : save({
                          action: "advance",
                          id: job.id,
                          version: job.version,
                          stage: next,
                        })
                  }
                >
                  {next === "Confirmed"
                    ? "Confirm order"
                    : next === "Delivered"
                      ? "Confirm delivery"
                      : `Move to ${next}`}
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
            {guard && (
              <div className="guard-note">
                <AlertCircle size={16} />
                {guard}
              </div>
            )}
            <div className="detail-metrics">
              <div>
                <small>Project value</small>
                <strong>{money(job.value)}</strong>
              </div>
              <div>
                <small>Balance due</small>
                <strong>{money(job.value - job.paid)}</strong>
              </div>
              <div>
                <small>Target delivery</small>
                <strong>{dateLabel(job.due)}</strong>
              </div>
            </div>
            <Tabs defaultValue="overview">
              <TabsList variant="line">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="history">Timeline</TabsTrigger>
                <TabsTrigger value="files">
                  Files <span className="count-pill">{files.length}</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="overview">
                <section className="detail-section">
                  <h3>Requirements</h3>
                  <p className="preserve-text">
                    {job.notes || "No specifications recorded yet."}
                  </p>
                  <dl className="detail-dl">
                    <div>
                      <dt>Assigned to</dt>
                      <dd>{job.owner}</dd>
                    </div>
                    <div>
                      <dt>Contact</dt>
                      <dd>{job.contact || "Not recorded"}</dd>
                    </div>
                    <div>
                      <dt>Source</dt>
                      <dd>{job.source}</dd>
                    </div>
                    <div>
                      <dt>Priority</dt>
                      <dd>{job.priority}</dd>
                    </div>
                  </dl>
                </section>
                <section className="detail-section">
                  <h3>Production readiness</h3>
                  <div className="readiness-row">
                    <span>
                      {job.artworkApproved ? (
                        <CheckCircle2 className="positive" size={19} />
                      ) : (
                        <Palette size={19} />
                      )}
                      Artwork approved
                    </span>
                    {job.stage === "Design" && !job.artworkApproved ? (
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() => setAction("approveArtwork")}
                      >
                        Record approval <ArrowRight size={14} />
                      </button>
                    ) : (
                      <small>
                        {job.artworkApproved ? "Recorded" : "Pending"}
                      </small>
                    )}
                  </div>
                  {job.approvalReference && (
                    <p className="evidence">{job.approvalReference}</p>
                  )}
                  <div className="readiness-row">
                    <span>
                      {job.qcPassed ? (
                        <CheckCircle2 className="positive" size={19} />
                      ) : (
                        <PackageCheck size={19} />
                      )}
                      Quality checked
                    </span>
                    {job.stage === "Quality check" && !job.qcPassed ? (
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() => setAction("passQC")}
                      >
                        Complete QC <ArrowRight size={14} />
                      </button>
                    ) : (
                      <small>{job.qcPassed ? "Passed" : "Pending"}</small>
                    )}
                  </div>
                  {job.qcNote && <p className="evidence">{job.qcNote}</p>}
                  {job.deliveryReference && (
                    <p className="evidence">
                      Delivery: {job.deliveryReference}
                    </p>
                  )}
                </section>
                <section className="detail-section">
                  <div className="section-title">
                    <h3>Commercials</h3>
                    {stages.indexOf(job.stage) >= 3 && job.value > job.paid && (
                      <button
                        className="text-button"
                        disabled={busy || !canPay}
                        title={
                          !canPay
                            ? "A manager or administrator must record payments"
                            : undefined
                        }
                        onClick={() => setAction("payment")}
                      >
                        Record payment <Plus size={14} />
                      </button>
                    )}
                  </div>
                  <dl className="detail-dl">
                    <div>
                      <dt>Estimated cost</dt>
                      <dd>{money(job.cost)}</dd>
                    </div>
                    <div>
                      <dt>Estimated gross profit</dt>
                      <dd>{money(job.value - job.cost)}</dd>
                    </div>
                    <div>
                      <dt>Payments received</dt>
                      <dd className="positive">{money(job.paid)}</dd>
                    </div>
                    <div>
                      <dt>Outstanding</dt>
                      <dd>{money(job.value - job.paid)}</dd>
                    </div>
                  </dl>
                  <button
                    className="secondary-button quote-button"
                    onClick={() => setAction("quotation")}
                  >
                    <FileText size={15} />
                    View estimate
                  </button>
                </section>
              </TabsContent>
              <TabsContent value="history">
                <section className="detail-section">
                  <h3>Customer & project history</h3>
                  <form
                    className="note-form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const text = String(new FormData(form).get("note"));
                      if (await save({ action: "note", id: job.id, text }))
                        form.reset();
                    }}
                  >
                    <textarea
                      name="note"
                      rows={3}
                      placeholder="Add a call summary, requirement, or next step…"
                      required
                      maxLength={5000}
                    />
                    <button className="secondary-button" disabled={busy}>
                      Add note
                    </button>
                  </form>
                  <div className="timeline">
                    {data.events
                      .filter((e) => e.jobId === job.id)
                      .map((e) => (
                        <div key={e.id}>
                          <span className="timeline-dot" />
                          <p>{e.message}</p>
                          <small>
                            {new Date(e.at).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </small>
                        </div>
                      ))}
                  </div>
                </section>
              </TabsContent>
              <TabsContent value="files">
                <section className="detail-section">
                  <h3>Artwork & project files</h3>
                  <p>
                    Keep revisions together. Add the version to your filename.
                  </p>
                  <label className="upload-zone">
                    <Paperclip size={24} />
                    <strong>
                      {uploading ? "Uploading…" : "Choose a file to upload"}
                    </strong>
                    <small>
                      Artwork, specifications or approval evidence · Up to 10 MB
                    </small>
                    <input
                      type="file"
                      disabled={uploading || busy}
                      accept={
                        production
                          ? ".pdf,.png,.jpg,.jpeg,.webp,.txt,.zip"
                          : undefined
                      }
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 10 * 1024 * 1024) {
                          setFileError("Choose a file up to 10 MB.");
                          return;
                        }
                        setUploading(true);
                        setFileError("");
                        const f = new FormData();
                        f.append("file", file);
                        f.append("jobId", job.id);
                        try {
                          if (production) {
                            await uploadJobFile(file, job.id, uploadAttempt);
                          } else {
                            const r = await fetch("/api/files", {
                              method: "POST",
                              body: f,
                            });
                            const d = (await r.json()) as { error?: string };
                            if (!r.ok) throw Error(d.error);
                          }
                          await reload();
                          e.target.value = "";
                        } catch (error) {
                          setFileError(
                            error instanceof Error
                              ? error.message
                              : "Upload failed.",
                          );
                        } finally {
                          setUploading(false);
                        }
                      }}
                    />
                  </label>
                  {fileError && (
                    <p className="overdue" role="alert">
                      {fileError}
                    </p>
                  )}
                  {files.map((f) => (
                    <a
                      key={f.id}
                      className="file-row"
                      href={"/api/files?id=" + encodeURIComponent(f.id)}
                    >
                      <FileText size={19} />
                      <div>
                        <strong>{f.name}</strong>
                        <small>
                          {(f.size / 1024).toFixed(0)} KB ·{" "}
                          {new Date(f.at).toLocaleDateString("en-IN")}
                        </small>
                      </div>
                      <Download size={17} />
                    </a>
                  ))}
                </section>
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>
      <Dialog open={!!action} onOpenChange={(v) => !v && setAction("")}>
        <DialogContent
          className={
            "form-modal " + (action === "quotation" ? "estimate-modal" : "")
          }
        >
          <DialogHeader>
            <DialogTitle>
              {(
                {
                  approveArtwork: "Record artwork approval",
                  passQC: "Complete quality check",
                  recordDelivery: "Confirm delivery",
                  payment: "Record payment",
                  quotation: "Project estimate",
                } as Record<string, string>
              )[action] || "Update project"}
            </DialogTitle>
            <DialogDescription>
              {job.customer} · {job.id}
            </DialogDescription>
          </DialogHeader>
          {action === "quotation" ? (
            <div className="estimate">
              <div className="estimate-brand">
                teamplus<span>+</span>
                <small>ADVERTISING AGENCIES</small>
              </div>
              <div className="estimate-label">DRAFT ESTIMATE · {job.id}</div>
              <h2>{job.title}</h2>
              <p>{job.notes || "Specifications to be confirmed."}</p>
              <dl>
                <div>
                  <dt>Estimated project value</dt>
                  <dd>{money(job.value)}</dd>
                </div>
                <div>
                  <dt>Target delivery</dt>
                  <dd>{dateLabel(job.due)}</dd>
                </div>
              </dl>
              <div className="info-banner">
                Indicative project total. Itemised pricing, tax treatment, and
                customer acceptance are required before issuing a formal
                quotation.
              </div>
              <button
                className="secondary-button"
                onClick={() => window.print()}
              >
                <Download size={15} />
                Print / save PDF
              </button>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const payload = {
                  action,
                  id: job.id,
                  version: job.version,
                  reference: String(form.get("reference")),
                  ...(action === "payment"
                    ? { amount: Number(form.get("amount")) }
                    : {}),
                };
                if (await save(payload)) setAction("");
              }}
            >
              <div className="form-grid">
                {action === "payment" && (
                  <label className="full-width">
                    Amount received (₹)
                    <input
                      name="amount"
                      type="number"
                      required
                      min="1"
                      step="1"
                      max={job.value - job.paid}
                      placeholder={String(job.value - job.paid)}
                    />
                    <small>Outstanding: {money(job.value - job.paid)}</small>
                  </label>
                )}
                <label className="full-width">
                  {action === "payment"
                    ? "Payment reference / method"
                    : action === "approveArtwork"
                      ? "Approved version, customer and evidence"
                      : action === "passQC"
                        ? "Inspection result and inspector"
                        : "Recipient, date and delivery reference"}
                  <textarea
                    name="reference"
                    rows={3}
                    minLength={action === "payment" ? 3 : 4}
                    maxLength={action === "payment" ? 200 : 1000}
                    required
                    placeholder={
                      action === "approveArtwork"
                        ? "Artwork v2 approved by customer on…"
                        : action === "passQC"
                          ? "Dimensions, finish and electrical checks passed by…"
                          : "Record the supporting details…"
                    }
                  />
                </label>
              </div>
              <div className="form-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setAction("")}
                >
                  Cancel
                </button>
                <button className="primary-button" disabled={busy}>
                  {busy ? "Saving…" : "Save confirmation"}
                  <Check size={16} />
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
