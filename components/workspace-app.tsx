"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  LayoutDashboard,
  Users,
  Target,
  FileText,
  FolderKanban,
  Palette,
  Factory,
  Truck,
  Wallet,
  CheckSquare,
  Settings,
  Search,
  Plus,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  CalendarDays,
  Bell,
  Command,
  Flame,
  Clock,
  ChevronDown,
  ChartNoAxesCombined,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { money, dateLabel, stages, Job, Workspace, today } from "@/lib/domain";
import {
  Customers,
  Finance,
  Tasks,
  Reports,
  Connections,
  JobTable,
  Pipeline,
  EnquiryForm,
  TaskForm,
  JobDetail,
  Picker,
} from "@/components/workspace-views";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command as CommandMenu,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
const navigation = [
  {
    label: "WORKSPACE",
    items: [
      ["Overview", LayoutDashboard],
      ["Customers", Users],
      ["Sales pipeline", Target],
      ["Quotations", FileText],
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      ["Projects & orders", FolderKanban],
      ["Design & artwork", Palette],
      ["Production", Factory],
      ["Delivery", Truck],
    ],
  },
  {
    label: "BUSINESS",
    items: [
      ["Finance", Wallet],
      ["Tasks & follow-ups", CheckSquare],
      ["Reports", ChartNoAxesCombined],
    ],
  },
] as const;
function NavButton({
  name,
  icon: Icon,
  active,
  onNavigate,
  count,
}: {
  name: string;
  icon: typeof LayoutDashboard;
  active: string;
  onNavigate: (name: string) => void;
  count: number;
}) {
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarMenuButton
      className="nav-link"
      isActive={active === name}
      onClick={() => {
        onNavigate(name);
        setOpenMobile(false);
      }}
    >
      <Icon />
      <span>{name}</span>
      {name === "Tasks & follow-ups" && (
        <span className="nav-count">{count}</span>
      )}
    </SidebarMenuButton>
  );
}
export default function Home({ mode }: { mode: "preview" | "production" }) {
  const [data, setData] = useState<Workspace>({
    jobs: [],
    tasks: [],
    events: [],
    files: [],
  });
  const [active, setActive] = useState("Overview");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const retryRef = useRef<{ signature: string; key: string } | null>(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<"new" | "edit" | null>(null);
  const [taskForm, setTaskForm] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("All stages");
  const [user, setUser] = useState({
    name: "TeamPlus",
    email: "",
    role: mode === "preview" ? "admin" : "viewer",
  });
  const selected = data.jobs.find((j) => j.id === selectedId) || null;
  const reload = useCallback(async () => {
    try {
      const r = await fetch("/api/workspace");
      const result = (await r.json()) as Workspace & {
        error?: string;
        user?: { name: string; email: string; role?: string };
      };
      if (!r.ok) throw new Error(result.error);
      setData(result);
      if (result.user)
        setUser({ ...result.user, role: result.user.role || "admin" });
      setReady(true);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load your workspace.",
      );
    }
  }, []);
  const save = useCallback(
    async (payload: Record<string, unknown>) => {
      if (busyRef.current) return false;
      busyRef.current = true;
      const signature = JSON.stringify(payload);
      if (retryRef.current?.signature !== signature)
        retryRef.current = { signature, key: crypto.randomUUID() };
      setBusy(true);
      try {
        const r = await fetch("/api/workspace", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": retryRef.current.key,
          },
          body: JSON.stringify(payload),
        });
        const result = (await r.json()) as {
          error?: string;
          data?: Workspace;
          refreshRequired?: boolean;
        };
        if (!r.ok) {
          if (r.status === 409) {
            retryRef.current = null;
            await reload();
          }
          throw new Error(result.error || "Could not save.");
        }
        retryRef.current = null;
        if (result.data) setData(result.data);
        else {
          await reload();
          toast.info(
            "Change saved. Refresh if the latest records are not visible.",
          );
        }
        setError("");
        toast.success(
          payload.action === "createJob"
            ? "Enquiry created"
            : payload.action === "payment"
              ? "Payment recorded"
              : "Changes saved",
        );
        return true;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save.");
        return false;
      } finally {
        setBusy(false);
        busyRef.current = false;
      }
    },
    [reload],
  );
  const navigate = useCallback((name: string) => {
    setActive(name);
    setQuery("");
    setStageFilter("All stages");
    window.location.hash = encodeURIComponent(name);
  }, []);
  useEffect(() => {
    void reload();
    const onHash = () => {
      let hash = "";
      try {
        hash = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return;
      }
      const valid = [
        ...navigation.flatMap((g) => g.items.map(([name]) => name)),
        "Connections",
      ];
      if (valid.includes(hash)) setActive(hash);
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("keydown", key);
    };
  }, [reload]);
  const stateRef = useRef(data);
  stateRef.current = data;
  useEffect(() => {
    type Tool = {
      name: string;
      description: string;
      inputSchema: object;
      annotations: object;
      execute: (input: unknown) => unknown;
    };
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (tool: Tool, options: { signal: AbortSignal }) => void;
        };
      }
    ).modelContext;
    if (!context) return;
    const controller = new AbortController();
    try {
      context.registerTool(
        {
          name: "list_teamplus_jobs",
          description:
            "Read the current TeamPlus job records available in this workspace.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: true },
          execute: (input) => {
            if (
              !input ||
              typeof input !== "object" ||
              Object.keys(input).length
            )
              throw new Error("Expected an empty object");
            return stateRef.current.jobs.map((j) => ({
              id: j.id,
              customer: j.customer,
              title: j.title,
              stage: j.stage,
              due: j.due,
            }));
          },
        },
        { signal: controller.signal },
      );
      context.registerTool(
        {
          name: "open_teamplus_job",
          description:
            "Open a job detail panel without changing any saved record.",
          inputSchema: {
            type: "object",
            properties: { id: { type: "string" } },
            required: ["id"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: false },
          execute: (input) => {
            const value = input as { id?: unknown };
            if (
              !value ||
              typeof value.id !== "string" ||
              Object.keys(value).length !== 1
            )
              throw Error("Provide one job id");
            if (!stateRef.current.jobs.some((j) => j.id === value.id))
              throw Error("Job not found");
            setSelectedId(value.id);
            return { opened: value.id };
          },
        },
        { signal: controller.signal },
      );
    } catch (e) {
      console.warn("Optional workspace tools unavailable", e);
    }
    return () => controller.abort();
  }, []);
  const activeJobs = data.jobs.filter(
    (j) => stages.indexOf(j.stage) >= 3 && j.stage !== "Paid",
  );
  const openTasks = data.tasks.filter((t) => !t.done);
  const focusTasks = openTasks
    .filter((t) => t.due <= today())
    .sort((a, b) => (a.due + a.time).localeCompare(b.due + b.time));
  const pending = !ready || busy || user.role === "viewer";
  const visibleJobs = data.jobs.filter(
    (j) =>
      (stageFilter === "All stages" || j.stage === stageFilter) &&
      [j.title, j.customer, j.id, j.owner]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const showJob = (j: Job) => setSelectedId(j.id);
  const exportData = () => {
    const quote = (v: unknown) => {
      let t = String(v);
      if (/^[=+@\-\t\r]/.test(t)) t = "'" + t;
      return '"' + t.replaceAll('"', '""') + '"';
    };
    const rows = [
      [
        "ID",
        "Customer",
        "Project",
        "Category",
        "Stage",
        "Value INR",
        "Paid INR",
        "Due date",
        "Owner",
      ],
      ...data.jobs.map((j) => [
        j.id,
        j.customer,
        j.title,
        j.category,
        j.stage,
        j.value,
        j.paid,
        j.due,
        j.owner,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + rows.map((r) => r.map(quote).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "teamplus-projects.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "15.5rem" } as React.CSSProperties}
    >
      <Sidebar className="app-sidebar">
        <SidebarHeader>
          <div className="brand">
            team<span>plus</span>
            <b>+</b>
          </div>
          <div className="workspace-picker">
            <span className="workspace-avatar">T</span>
            <div>
              TeamPlus Agency<small>Business workspace</small>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {navigation.map((g) => (
            <SidebarGroup key={g.label}>
              <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
              <SidebarMenu>
                {g.items.map(([name, Icon]) => (
                  <SidebarMenuItem key={name}>
                    <NavButton
                      name={name}
                      icon={Icon}
                      active={active}
                      onNavigate={navigate}
                      count={openTasks.length}
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <div className="workspace-note">
            <span className="orange-dot" />
            {mode === "preview" ? "Sample workspace" : "Team workspace"}
            <small>
              {mode === "preview"
                ? "Explore with illustrative data"
                : `Access: ${user.role}`}
            </small>
          </div>
          <button
            className="user-profile"
            onClick={() => navigate("Connections")}
          >
            <span className="avatar orange">TP</span>
            <div>
              {user.name.split("@")[0]}
              <small>{mode === "preview" ? "Preview owner" : user.role}</small>
            </div>
            <Settings size={17} />
          </button>
          {mode === "production" && (
            <form action="/auth/signout" method="post">
              <button className="text-button" type="submit">
                Sign out
              </button>
            </form>
          )}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <SidebarTrigger />
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{active}</strong>
          </div>
          <div className="topbar-actions">
            <button
              className="global-search"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={16} />
              Search anything…<kbd>⌘ K</kbd>
            </button>
            <button
              className="icon-button"
              aria-label="Open follow-ups"
              onClick={() => navigate("Tasks & follow-ups")}
            >
              <Bell size={19} />
              <i />
            </button>
            <span className="avatar small">TP</span>
          </div>
        </header>
        <main className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR BUSINESS, CONNECTED</div>
              <h1>{active}</h1>
              <p>
                {
                  (
                    {
                      Overview:
                        "A clear view of your sales, projects, and what needs you today.",
                      Customers:
                        "Every relationship, with its work and history in one place.",
                      "Sales pipeline":
                        "Turn the next conversation into your next project.",
                      Quotations:
                        "Review scope and value before committing to the work.",
                      "Projects & orders":
                        "Every handoff, from confirmation to completion.",
                      "Design & artwork":
                        "Keep the brief, revisions, and customer approval together.",
                      Production:
                        "A clear queue for the work that is ready to happen.",
                      Delivery:
                        "The final mile, with every detail accounted for.",
                      Finance:
                        "Know what has been collected and what is still due.",
                      "Tasks & follow-ups":
                        "The right next action, at the right time.",
                      Reports:
                        "Understand your business through the work you deliver.",
                      Connections:
                        "Workspace access, integrations, and rollout readiness.",
                    } as Record<string, string>
                  )[active]
                }
              </p>
            </div>
            <div className="heading-actions">
              <span className="secondary-button date-display">
                <CalendarDays size={16} />
                {new Date().toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <button
                disabled={pending}
                onClick={() => setForm("new")}
                className="primary-button"
              >
                <Plus size={17} />
                New enquiry
              </button>
            </div>
          </div>
          {error && (
            <div className="error-banner" role="alert">
              <span>
                {error} {mode === "production" && <a href="/login">Sign in</a>}
              </span>
              <button
                className="secondary-button"
                onClick={() => void reload()}
              >
                Retry
              </button>
            </div>
          )}
          {!ready && !error && (
            <div className="loading-banner" role="status">
              Loading your saved workspace…
            </div>
          )}
          {active === "Overview" ? (
            <>
              <div className="stat-grid">
                {[
                  {
                    label: "Open pipeline",
                    value: money(
                      data.jobs
                        .filter((j) => stages.indexOf(j.stage) < 3)
                        .reduce((s, j) => s + j.value, 0),
                      true,
                    ),
                    detail: `${data.jobs.filter((j) => stages.indexOf(j.stage) < 3).length} opportunities to move forward`,
                    icon: Target,
                  },
                  {
                    label: "Active projects",
                    value: String(activeJobs.length).padStart(2, "0"),
                    detail: "Across design, production & delivery",
                    icon: FolderKanban,
                  },
                  {
                    label: "Payments received",
                    value: money(
                      data.jobs.reduce((s, j) => s + j.paid, 0),
                      true,
                    ),
                    detail: "Recorded against current jobs",
                    icon: Wallet,
                  },
                  {
                    label: "Balance to collect",
                    value: money(
                      data.jobs
                        .filter((j) => stages.indexOf(j.stage) >= 3)
                        .reduce((s, j) => s + j.value - j.paid, 0),
                      true,
                    ),
                    detail: "Keep your cash flow moving",
                    icon: ChartNoAxesCombined,
                  },
                ].map((s, i) => (
                  <section
                    className={"stat-card " + (i === 0 ? "featured" : "")}
                    key={s.label}
                  >
                    <div className="stat-top">
                      <span>{s.label}</span>
                      <s.icon size={19} />
                    </div>
                    <div className="stat-value">{s.value}</div>
                    <div className="stat-bottom">
                      {s.detail}
                      <ArrowUpRight size={15} />
                    </div>
                  </section>
                ))}
              </div>
              <div className="dashboard-grid">
                <div className="dashboard-main">
                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <h2>Project flow</h2>
                        <p>Every handoff. One connected view.</p>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => navigate("Projects & orders")}
                      >
                        All projects <ArrowRight size={15} />
                      </button>
                    </div>
                    <div className="flow-track">
                      {[
                        "Confirmed",
                        "Design",
                        "Production",
                        "Quality check",
                        "Ready",
                        "Delivered",
                      ].map((stage, i) => (
                        <button
                          className="flow-step"
                          key={stage}
                          onClick={() => {
                            navigate("Projects & orders");
                            setStageFilter(stage);
                          }}
                        >
                          <span
                            className="flow-line"
                            style={{
                              background: [
                                "#ff6a00",
                                "#b192f0",
                                "#75a7ec",
                                "#dfb766",
                                "#62b6a9",
                                "#759884",
                              ][i],
                            }}
                          />
                          <span className="flow-name">{stage}</span>
                          <strong>
                            {String(
                              data.jobs.filter((j) => j.stage === stage).length,
                            ).padStart(2, "0")}
                          </strong>
                        </button>
                      ))}
                    </div>
                    <div className="flow-footer">
                      <span>
                        <Flame size={16} /> Keep things moving
                      </span>
                      <p>
                        Artwork feedback and quality checks are your next
                        handoffs.
                      </p>
                      <ArrowUpRight size={17} />
                    </div>
                  </section>
                  <section className="panel projects-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>
                          Projects in motion{" "}
                          <span className="count-pill">
                            {activeJobs.length}
                          </span>
                        </h2>
                        <p>From the first idea to the final installation.</p>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => navigate("Projects & orders")}
                      >
                        View all <ArrowRight size={15} />
                      </button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>PROJECT / CUSTOMER</TableHead>
                          <TableHead>STAGE</TableHead>
                          <TableHead>DUE DATE</TableHead>
                          <TableHead className="text-right">VALUE</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeJobs.slice(0, 5).map((j, i) => (
                          <TableRow key={j.id}>
                            <TableCell>
                              <button
                                className="project-name job-link"
                                onClick={() => showJob(j)}
                              >
                                <span className={"project-icon color-" + i}>
                                  {j.customer
                                    .split(" ")
                                    .map((x) => x[0])
                                    .join("")}
                                </span>
                                <div>
                                  <strong>{j.title}</strong>
                                  <small>
                                    {j.id} <span>·</span> {j.customer}
                                  </small>
                                </div>
                              </button>
                            </TableCell>
                            <TableCell>
                              <span
                                className={
                                  "status status-" +
                                  j.stage.toLowerCase().replaceAll(" ", "-")
                                }
                              >
                                {j.stage}
                              </span>
                            </TableCell>
                            <TableCell>{dateLabel(j.due)}</TableCell>
                            <TableCell className="text-right amount">
                              {money(j.value)}
                            </TableCell>
                            <TableCell>
                              <button
                                className="icon-button"
                                aria-label={"Open " + j.title}
                                onClick={() => showJob(j)}
                              >
                                <ChevronRight size={16} />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="table-footer">
                      One customer history, across every stage.
                      <span>{activeJobs.length} active projects</span>
                    </div>
                  </section>
                </div>
                <aside className="dashboard-aside">
                  <section className="panel focus-panel">
                    <div className="panel-heading">
                      <h2>
                        <span className="focus-icon">
                          <Flame size={17} />
                        </span>
                        Today’s focus
                      </h2>
                      <span className="count-pill">{focusTasks.length}</span>
                    </div>
                    <div className="focus-date">
                      {new Date()
                        .toLocaleDateString("en-IN", { weekday: "long" })
                        .toUpperCase()}{" "}
                      <span>•</span> YOUR FOLLOW-UPS
                    </div>
                    {focusTasks.slice(0, 4).map((t) => (
                      <div className="task-row" key={t.id}>
                        <Checkbox
                          className="task-check"
                          disabled={pending}
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
                          <small>{t.customer}</small>
                          <span className="task-time">
                            <Clock size={12} />
                            {t.time}
                          </span>
                        </div>
                      </div>
                    ))}
                    {!focusTasks.length && (
                      <p className="all-done">No follow-ups due today.</p>
                    )}
                    <button
                      className="panel-bottom-button"
                      onClick={() => navigate("Tasks & follow-ups")}
                    >
                      Open my tasks <ArrowRight size={15} />
                    </button>
                  </section>
                  <section className="insight-panel">
                    <span className="eyebrow">
                      <ChartNoAxesCombined size={14} /> BUSINESS PULSE
                    </span>
                    <h3>
                      Good work deserves
                      <br />
                      healthy margins.
                    </h3>
                    <p>
                      See estimated profit alongside every project, before it
                      reaches production.
                    </p>
                    <button
                      className="text-button"
                      onClick={() => navigate("Reports")}
                    >
                      Explore reports <ArrowUpRight size={15} />
                    </button>
                  </section>
                </aside>
              </div>
            </>
          ) : active === "Customers" ? (
            <Customers jobs={data.jobs} onSelect={showJob} />
          ) : active === "Finance" ? (
            <Finance jobs={data.jobs} onSelect={showJob} />
          ) : active === "Tasks & follow-ups" ? (
            <Tasks
              tasks={data.tasks}
              save={save}
              busy={pending}
              addTask={() => !pending && setTaskForm(true)}
            />
          ) : active === "Reports" ? (
            <>
              <div className="view-toolbar">
                <span>
                  {mode === "preview"
                    ? "All saved jobs · illustrative and user-created records"
                    : "All saved jobs in your team workspace"}
                </span>
                <button className="secondary-button" onClick={exportData}>
                  Export CSV <ArrowUpRight size={15} />
                </button>
              </div>
              <Reports jobs={data.jobs} />
            </>
          ) : active === "Connections" ? (
            <Connections production={mode === "production"} role={user.role} />
          ) : (
            <>
              <div className="view-toolbar">
                <label className="search-input">
                  <Search size={16} />
                  <input
                    aria-label="Search projects"
                    placeholder="Search projects or customers…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                {active === "Projects & orders" && (
                  <Picker
                    value={stageFilter}
                    onChange={setStageFilter}
                    options={["All stages", ...stages]}
                    label="Project stage"
                  />
                )}
                <span>
                  {active === "Sales pipeline"
                    ? "Enquiry to confirmed order"
                    : active === "Production"
                      ? "Approval → production → QC → ready"
                      : "Connected to the customer timeline"}
                </span>
              </div>
              {active === "Sales pipeline" ? (
                <Pipeline jobs={visibleJobs} onSelect={showJob} />
              ) : active === "Production" ? (
                <Pipeline jobs={visibleJobs} onSelect={showJob} production />
              ) : (
                <>
                  {active === "Quotations" && (
                    <div className="info-banner">
                      <FileText size={18} />
                      <span>
                        Scope and project estimates. Itemised quotations, tax
                        calculation, and sending are part of the next
                        implementation phase.
                      </span>
                    </div>
                  )}
                  <JobTable
                    jobs={visibleJobs.filter((j) =>
                      active === "Quotations"
                        ? j.stage === "Quotation"
                        : active === "Design & artwork"
                          ? ["Confirmed", "Design"].includes(j.stage)
                          : active === "Delivery"
                            ? ["Ready", "Delivered"].includes(j.stage)
                            : true,
                    )}
                    onSelect={showJob}
                  />
                </>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>
              TeamPlus Workspace <span> / </span> Built around the way you work.
            </span>
            <span>All amounts in INR</span>
          </footer>
        </main>
      </SidebarInset>
      <JobDetail
        key={selected?.id || "none"}
        job={selected}
        data={data}
        onClose={() => setSelectedId(null)}
        save={save}
        busy={pending}
        onEdit={() => setForm("edit")}
        reload={reload}
        production={mode === "production"}
        canPay={user.role === "admin" || user.role === "manager"}
      />
      {form && (
        <EnquiryForm
          key={form + (selected?.id || "")}
          open
          onClose={() => setForm(null)}
          save={save}
          busy={pending}
          job={form === "edit" ? selected : null}
        />
      )}
      <TaskForm
        open={taskForm}
        onClose={() => setTaskForm(false)}
        save={save}
        busy={pending}
      />
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="search-modal">
          <DialogHeader>
            <DialogTitle>Search TeamPlus</DialogTitle>
            <DialogDescription>
              Jump to a customer, project, or workspace view.
            </DialogDescription>
          </DialogHeader>
          <CommandMenu>
            <CommandInput placeholder="Search customers, projects, pages…" />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Workspace">
                {navigation.flatMap((g) =>
                  g.items.map(([name, Icon]) => (
                    <CommandItem
                      key={name}
                      value={"page " + name}
                      onSelect={() => {
                        navigate(name);
                        setSearchOpen(false);
                      }}
                    >
                      <Icon size={16} />
                      {name}
                    </CommandItem>
                  )),
                )}
              </CommandGroup>
              <CommandGroup heading="Projects & customers">
                {data.jobs.map((j) => (
                  <CommandItem
                    key={j.id}
                    value={j.id + " " + j.customer + " " + j.title}
                    onSelect={() => {
                      setSelectedId(j.id);
                      setSearchOpen(false);
                    }}
                  >
                    <FolderKanban size={16} />
                    <div>
                      {j.title}
                      <small>
                        {j.customer} · {j.id}
                      </small>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </CommandMenu>
        </DialogContent>
      </Dialog>
      <Toaster theme="dark" richColors position="bottom-right" />
    </SidebarProvider>
  );
}
