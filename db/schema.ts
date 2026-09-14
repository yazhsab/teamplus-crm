import {
  sqliteTable,
  text,
  integer,
  index,
  primaryKey,
} from "drizzle-orm/sqlite-core";
export const workspace = sqliteTable("workspace", {
  owner: text("owner").primaryKey(),
  createdAt: text("created_at").notNull(),
});
export const jobs = sqliteTable(
  "jobs",
  {
    owner: text("owner").notNull(),
    id: text("id").notNull(),
    payload: text("payload").notNull(),
    version: integer("version").notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.owner, t.id] })],
);
export const tasks = sqliteTable(
  "tasks",
  {
    owner: text("owner").notNull(),
    id: text("id").notNull(),
    payload: text("payload").notNull(),
  },
  (t) => [primaryKey({ columns: [t.owner, t.id] })],
);
export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    jobId: text("job_id").notNull(),
    message: text("message").notNull(),
    at: text("at").notNull(),
  },
  (t) => [index("events_owner_time").on(t.owner, t.at)],
);
export const files = sqliteTable(
  "files",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    jobId: text("job_id").notNull(),
    name: text("name").notNull(),
    size: integer("size").notNull(),
    contentType: text("content_type").notNull(),
    at: text("at").notNull(),
  },
  (t) => [index("files_owner_job").on(t.owner, t.jobId)],
);
