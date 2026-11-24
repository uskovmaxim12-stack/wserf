import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://uskovmaxim12-stack.github.io",
  "Vary": "Origin",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const reply = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: cors });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "POST required" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const auth = req.headers.get("Authorization");
  if (!url || !anon || !auth?.startsWith("Bearer ")) {
    return reply({ error: "Missing Supabase configuration or bearer token" }, 401);
  }

  const sb = createClient(url, anon, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await sb.auth.getUser();
  if (userError || !userData.user) return reply({ error: "Unauthorized" }, 401);

  const { data: profile, error: profileError } = await sb
    .from("profiles").select("id,nick,role,banned").eq("id", userData.user.id).single();
  if (profileError || profile?.role !== "admin" || profile?.banned) {
    return reply({ error: "Administrator access required" }, 403);
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply({ error: "Invalid JSON" }, 400); }
  const action = String(body.action || "");
  const audit = async (actionName: string, targetType: string, targetId: string | null, summary: string, details = {}) => {
    const { error } = await sb.from("admin_audit_log").insert({
      actor_id: userData.user!.id, action: actionName, target_type: targetType,
      target_id: targetId, summary, details,
    });
    if (error) throw error;
  };
  const fail = (e: unknown) => reply({ error: e instanceof Error ? e.message : String(e) }, 400);

  try {
    if (action === "overview") {
      const [stats, reports, comments, topics, posts, auditRows, users, settings] = await Promise.all([
        sb.rpc("admin_stats"),
        sb.from("reports").select("id,comment_id,user_id,created_at").order("created_at", { ascending: false }).limit(50),
        sb.from("comments").select("id,target_type,target_id,user_id,body,created_at").order("created_at", { ascending: false }).limit(50),
        sb.from("topics").select("id,title,body,user_id,category_id,pinned,locked,created_at,last_activity").order("last_activity", { ascending: false }).limit(100),
        sb.from("posts").select("id,kind,title,excerpt,published,published_at,created_at").order("created_at", { ascending: false }).limit(100),
        sb.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(100),
        sb.rpc("admin_user_list"),
        sb.from("settings").select("value").eq("key", "site").single(),
      ]);
      for (const r of [stats,reports,comments,topics,posts,auditRows,users,settings]) if (r.error) throw r.error;
      return reply({ stats: stats.data, reports: reports.data, comments: comments.data, topics: topics.data, posts: posts.data, audit: auditRows.data, users: users.data, settings: settings.data?.value || {} });
    }

    if (action === "create_post") {
      const kind = body.kind === "story" ? "story" : "journal";
      const title = String(body.title || "").trim().slice(0, 160);
      const content = String(body.body || "").trim().slice(0, 20000);
      if (title.length < 3 || !content) return reply({ error: "Title and body are required" }, 400);
      const { data, error } = await sb.from("posts").insert({
        kind, title, body: content, excerpt: String(body.excerpt || content.slice(0, 220)),
        category: body.category ? String(body.category).slice(0, 80) : null,
        published: body.published === true, published_at: new Date().toISOString(),
      }).select().single();
      if (error) throw error;
      await audit("content_create", "posts", data.id, "Создана запись: " + title, { kind, published: data.published });
      return reply({ data });
    }

    if (action === "update_post") {
      const id = String(body.id || "");
      const patch: Record<string, unknown> = {};
      for (const key of ["title","body","excerpt","category","cover","published","kind"]) {
        if (key in body) patch[key] = body[key];
      }
      if (!id || Object.keys(patch).length === 0) return reply({ error: "Post id and patch required" }, 400);
      const { data, error } = await sb.from("posts").update(patch).eq("id", id).select().single();
      if (error) throw error;
      await audit("content_update", "posts", id, "Изменена запись: " + data.title, { fields: Object.keys(patch) });
      return reply({ data });
    }

    if (action === "get_comment") {
      const id = String(body.id || "");
      if (!id) return reply({ error: "Comment id required" }, 400);
      const { data, error } = await sb.from("comments")
        .select("id,target_type,target_id,user_id,body,gif_url,sticker,created_at,profiles(nick)")
        .eq("id", id).single();
      if (error) throw error;
      let target_kind: string | null = null;
      if (data.target_type === "post") {
        const { data: post, error: postError } = await sb.from("posts")
          .select("kind").eq("id", data.target_id).maybeSingle();
        if (postError) throw postError;
        target_kind = post?.kind || null;
      }
      return reply({ data: { ...data, target_kind } });
    }

    if (action === "delete_comment") {
      const id = String(body.id || "");
      if (!id) return reply({ error: "Comment id required" }, 400);
      const { error } = await sb.from("comments").delete().eq("id", id);
      if (error) throw error;
      return reply({ ok: true, note: "Deletion is recorded by the database audit trigger." });
    }

    if (action === "set_topic") {
      const id = String(body.id || "");
      if (!id) return reply({ error: "Topic id required" }, 400);
      const { data: current, error: readError } = await sb.from("topics").select("id,pinned,locked").eq("id", id).single();
      if (readError) throw readError;
      const { error } = await sb.rpc("admin_topic_set", {
        tid: id,
        p: typeof body.pinned === "boolean" ? body.pinned : current.pinned,
        l: typeof body.locked === "boolean" ? body.locked : current.locked,
      });
      if (error) throw error;
      return reply({ ok: true, note: "Topic change is recorded by the database audit trigger." });
    }

    if (action === "set_ban") {
      const id = String(body.id || "");
      const banned = body.banned === true;
      if (!id || id === userData.user.id) return reply({ error: "Invalid target user" }, 400);
      const { error } = await sb.rpc("admin_ban_user", {
        uid: id, b: banned, why: String(body.reason || "").slice(0, 500),
      });
      if (error) throw error;
      return reply({ ok: true, note: "Ban change is recorded by the database audit trigger." });
    }

    if (action === "set_restrict") {
      const id = String(body.id || "");
      const field = String(body.field || "");
      const enabled = body.enabled === true;
      if (!id || id === userData.user.id || !["comments","forum","likes","profile"].includes(field)) return reply({ error: "Invalid restriction target" }, 400);
      const { error } = await sb.rpc("admin_set_restrict", { uid: id, field, val: enabled, why: String(body.reason || "").slice(0, 500) });
      if (error) throw error;
      return reply({ ok: true, note: "Restriction change is recorded by the database audit trigger." });
    }

    if (action === "resolve_report") {
      const id = String(body.id || "");
      if (!id) return reply({ error: "Report id required" }, 400);
      const { data: report, error: getError } = await sb.from("reports").select("id,comment_id").eq("id", id).single();
      if (getError) throw getError;
      const { error } = await sb.from("reports").delete().eq("id", id);
      if (error) throw error;
      await audit("report_review", "reports", id, "Жалоба рассмотрена", { comment_id: report.comment_id, outcome: String(body.outcome || "dismissed") });
      return reply({ ok: true });
    }

    if (action === "update_theme") {
      const preset = String(body.preset || "");
      const palette: Record<string,{bg:string,ac:string}> = {
        forest:{bg:"#10110F",ac:"#B9C5AA"}, midnight:{bg:"#0E1117",ac:"#9DB7E8"},
        plum:{bg:"#130F16",ac:"#D3A8E0"}, graphite:{bg:"#121212",ac:"#D6D6D0"},
        ember:{bg:"#15100E",ac:"#E8B48A"}, halloween:{bg:"#120B08",ac:"#FF8A2B"},
        newyear:{bg:"#0B1322",ac:"#A9D6FF"}, valentine:{bg:"#17090F",ac:"#FF8FB1"},
        autumn:{bg:"#15100A",ac:"#E6A04B"}
      };
      if (preset !== "custom" && !palette[preset]) return reply({ error: "Unknown theme preset" }, 400);
      const { data: row, error: readError } = await sb.from("settings").select("value").eq("key","site").single();
      if (readError) throw readError;
      const site = row.value || {};
      const theme = preset === "custom"
        ? { preset, bg: String(body.bg || "").toUpperCase(), ac: String(body.ac || "").toUpperCase() }
        : { preset, ...palette[preset] };
      if (preset === "custom" && (!/^#[0-9A-F]{6}$/.test(theme.bg) || !/^#[0-9A-F]{6}$/.test(theme.ac))) {
        return reply({ error: "Custom colors must be HEX #RRGGBB" }, 400);
      }
      const { error } = await sb.from("settings").update({ value: { ...site, theme } }).eq("key","site");
      if (error) throw error;
      return reply({ ok: true, theme });
    }

    return reply({ error: "Unknown action" }, 400);
  } catch (e) { return fail(e); }
});