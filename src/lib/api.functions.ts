import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { SURVEY_VERSION, type Phase } from "@/lib/survey";
import { deleteExpiredResponses, sql } from "@/lib/db.server";

export type SessionInfo = { id: string; slug: string; title: string };
export type ResponseRow = {
  id: string;
  session_id: string;
  created_at: string;
  level: string | null;
  attitude: string | null;
  interests: string[];
  task: string | null;
};
export type ResultResponse = {
  survey_version: number | null;
  interaction_level: string | null;
  ai_attitude: string | null;
  learning_interests: string[] | null;
  work_tasks: string | null;
};

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9][a-z0-9-]*$/i);
const phaseSchema = z.enum(["before", "after"]).transform(() => "before" as Phase);

export const getSession = createServerFn({ method: "GET" })
  .validator((input: unknown) => z.object({ slug: slugSchema }).parse(input))
  .handler(async ({ data }): Promise<SessionInfo | null> => {
    await deleteExpiredResponses();
    const rows = await sql<SessionInfo[]>`
      select id::text, slug, title
      from survey_sessions
      where slug = ${data.slug}
      limit 1
    `;
    return rows[0] ?? null;
  });

export const createResponse = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        sessionId: z.string().uuid(),
        phase: phaseSchema.default("before"),
        level: z.string().max(80),
        attitude: z.string().max(80),
        interests: z.array(z.string().max(80)).max(20),
        task: z.string().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ id: string }> => {
    await deleteExpiredResponses();
    const rows = await sql<{ id: string }[]>`
      insert into survey_responses (
        session_id,
        phase,
        survey_version,
        interaction_level,
        ai_attitude,
        learning_interests,
        work_tasks
      )
      values (
        ${data.sessionId},
        ${data.phase},
        ${SURVEY_VERSION},
        ${data.level},
        ${data.attitude},
        ${data.interests},
        ${data.task?.trim() || null}
      )
      returning id::text
    `;
    return rows[0]!;
  });

export const getResult = createServerFn({ method: "GET" })
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<ResultResponse | null> => {
    await deleteExpiredResponses();
    const rows = await sql<ResultResponse[]>`
      select
        survey_version,
        interaction_level,
        ai_attitude,
        learning_interests,
        work_tasks
      from survey_responses
      where id = ${data.id}
      limit 1
    `;
    return rows[0] ?? null;
  });

export const getDashboard = createServerFn({ method: "GET" })
  .validator((input: unknown) =>
    z.object({ slug: slugSchema, phase: phaseSchema.default("before") }).parse(input),
  )
  .handler(async ({ data }): Promise<{ session: SessionInfo | null; rows: ResponseRow[] }> => {
    await deleteExpiredResponses();
    const sessions = await sql<SessionInfo[]>`
      select id::text, slug, title
      from survey_sessions
      where slug = ${data.slug}
      limit 1
    `;
    const session = sessions[0] ?? null;
    if (!session) return { session: null, rows: [] };

    const rows = await sql<ResponseRow[]>`
      select
        id::text,
        session_id::text,
        created_at::text,
        interaction_level as level,
        ai_attitude as attitude,
        learning_interests as interests,
        work_tasks as task
      from survey_responses
      where session_id = ${session.id}
        and phase = ${data.phase}
        and survey_version = ${SURVEY_VERSION}
      order by created_at desc
    `;
    return { session, rows };
  });
