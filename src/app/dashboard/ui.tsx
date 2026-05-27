"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { establishAuthSession, getAuthToken } from "@/lib/auth";
import {
  APIError,
  ChangeSet,
  ItemKind,
  Rating,
  StudyItem,
  acceptAll,
  createItem,
  getChangeSet,
  listItems,
  me as apiMe,
  planDaily,
  seedDemo,
  submitReview,
} from "@/lib/api";

type DailyPlanRequest = {
  day?: string;
  ttl_hours?: number;
};

const SHOW_DEV_TOKEN_PANEL =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_SHOW_DEV_TOKEN_PANEL === "1";

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function classify(it: StudyItem): "NEW" | "DUE" | "SOON" | "SCHEDULED" {
  if (!it.last_review_at) return "NEW";
  const t = new Date(it.due_at).getTime();
  const now = Date.now();
  if (t <= now) return "DUE";
  if (t <= now + 24 * 3600 * 1000) return "SOON";
  return "SCHEDULED";
}

function Badge({ status }: { status: ReturnType<typeof classify> }) {
  const cls =
    status === "DUE"
      ? "border-red-200 bg-red-50 text-red-700"
      : status === "SOON"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : status === "NEW"
      ? "border-gray-200 bg-gray-50 text-gray-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${cls}`}>{status}</span>;
}

function priorityKey(it: StudyItem): number {
  const st = classify(it);
  const stScore = st === "DUE" ? 3 : st === "SOON" ? 2 : st === "NEW" ? 1 : 0;
  const crit = Math.max(0, Math.min(100, it.criticality || 0));
  const timeScore = Math.max(0, 1e12 - new Date(it.due_at).getTime());
  return stScore * 1_000_000_000_000 + crit * 1_000_000_000 + timeScore;
}

export default function ClientDashboard() {
  const [token, setToken] = useState<string>("user_demo");
  const [me, setMe] = useState<string>("user_demo");

  const [loading, setLoading] = useState(false);
  const [cs, setCs] = useState<ChangeSet | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [day, setDay] = useState<string>(todayISO());
  const [ttl, setTtl] = useState<number>(24);

  const [items, setItems] = useState<StudyItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Create item form
  const [kind, setKind] = useState<ItemKind>("QUESTION");
  const [topic, setTopic] = useState<string>("CM: HAS");
  const [criticality, setCriticality] = useState<number>(20);
  const [tags, setTags] = useState<string>("demo");

  // Review form
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [rating, setRating] = useState<Rating>("GOOD");

  // Seed demo
  const [seedCount, setSeedCount] = useState<number>(10);

  const canApply = useMemo(() => !!cs && cs.status === "PENDING", [cs]);

  const stats = useMemo(() => {
    const s = { NEW: 0, DUE: 0, SOON: 0, SCHEDULED: 0 };
    for (const it of items) s[classify(it)] += 1;
    return s;
  }, [items]);

  const todayQueue = useMemo(() => {
    const q = [...items].filter((it) => {
      const st = classify(it);
      return st === "DUE" || st === "SOON";
    });
    q.sort((a, b) => priorityKey(b) - priorityKey(a));
    return q;
  }, [items]);

  const nextDue = todayQueue.length ? todayQueue[0] : null;

  async function refreshMe(t: string) {
    try {
      const r = await apiMe(t);
      setMe(r.user_id);
    } catch {
      setMe("(invalid token)");
    }
  }

  async function loadItems(t = token) {
    setErr(null);
    setItemsLoading(true);
    try {
      const lst = await listItems(t, "all");
      setItems(lst);
      if (!selectedItemId && lst.length > 0) setSelectedItemId(lst[0].item_id);
    } catch (e) {
      const ae = e as APIError;
      setErr(ae.message ?? "Erro ao listar itens");
    } finally {
      setItemsLoading(false);
    }
  }

  useEffect(() => {
    const t = getAuthToken();
    setToken(t);
    refreshMe(t);
    loadItems(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSaveToken() {
    const t = token.trim() || "user_demo";
    await establishAuthSession(t);
    setToken(t);
    await refreshMe(t);
    await loadItems(t);
  }

  async function generate() {
    setErr(null);
    setLoading(true);
    try {
      const payload: DailyPlanRequest = { day, ttl_hours: ttl };
      const next = await planDaily(token, payload);
      setCs(next);
    } catch (e) {
      const ae = e as APIError;
      setErr(ae.message ?? "Erro ao gerar plano");
    } finally {
      setLoading(false);
    }
  }

  async function refreshChangeSet() {
    if (!cs) return;
    setErr(null);
    setLoading(true);
    try {
      const next = await getChangeSet(token, cs.changeset_id);
      setCs(next);
    } catch (e) {
      const ae = e as APIError;
      setErr(ae.message ?? "Erro ao atualizar");
    } finally {
      setLoading(false);
    }
  }

  async function onAcceptAll() {
    if (!cs) return;
    setErr(null);
    setLoading(true);
    try {
      const next = await acceptAll(token, cs.changeset_id);
      setCs(next);
    } catch (e) {
      const ae = e as APIError;
      setErr(ae.message ?? "Erro ao aplicar ChangeSet");
    } finally {
      setLoading(false);
    }
  }

  async function onCreateItem() {
    setErr(null);
    setItemsLoading(true);
    try {
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
      await createItem(token, { kind, topic_ref: topic || null, criticality, tags: tagList });
      await loadItems();
    } catch (e) {
      const ae = e as APIError;
      setErr(ae.message ?? "Erro ao criar item");
    } finally {
      setItemsLoading(false);
    }
  }

  async function onReview(item_id: string, r: Rating) {
    if (!item_id) return;
    setErr(null);
    setItemsLoading(true);
    try {
      await submitReview(token, { item_id, rating: r });
      await loadItems();
    } catch (e) {
      const ae = e as APIError;
      setErr(ae.message ?? "Erro ao enviar review");
    } finally {
      setItemsLoading(false);
    }
  }

  async function onSeed() {
    setErr(null);
    setItemsLoading(true);
    try {
      await seedDemo(token, seedCount);
      await loadItems();
    } catch (e) {
      const ae = e as APIError;
      setErr(ae.message ?? "Erro ao seed. Habilite no backend com AGENDAR_ENABLE_DEMO=1.");
    } finally {
      setItemsLoading(false);
    }
  }

  async function reviewNext(r: Rating) {
    if (!nextDue) return;
    await onReview(nextDue.item_id, r);
    const q = [...todayQueue].slice(1);
    if (q.length) setSelectedItemId(q[0].item_id);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border p-4 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Usuario</div>
            <div className="text-xs text-gray-500">
              Ativo: <code>{me}</code>
            </div>
          </div>

          {SHOW_DEV_TOKEN_PANEL && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Token (Bearer)</label>
                <input
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-72 rounded-lg border px-3 py-2 text-sm"
                  placeholder="ex: user_demo"
                />
              </div>
              <button onClick={onSaveToken} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
                Salvar
              </button>
            </div>
          )}
        </div>

        {SHOW_DEV_TOKEN_PANEL && (
          <div className="text-xs text-gray-500">
            Seguranca (dev): o token informado e validado uma vez e salvo como sessao HttpOnly.
          </div>
        )}
      </section>

      <section className="rounded-xl border p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Today</div>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-600">
              <span>Queue (DUE+SOON): <code>{todayQueue.length}</code></span>
              <span>DUE: <code>{stats.DUE}</code></span>
              <span>SOON: <code>{stats.SOON}</code></span>
            </div>
          </div>

          <button
            onClick={() => loadItems()}
            disabled={itemsLoading}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
          >
            {itemsLoading ? "Atualizando..." : "Refresh"}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-3 space-y-2">
            <div className="text-xs text-gray-500">Proximo</div>
            {nextDue ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">{nextDue.topic_ref ?? nextDue.kind}</div>
                    <div className="text-xs text-gray-500">
                      <code>{nextDue.item_id}</code> - crit <code>{nextDue.criticality}</code>
                    </div>
                  </div>
                  <Badge status={classify(nextDue)} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button onClick={() => reviewNext("AGAIN")} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
                    AGAIN
                  </button>
                  <button onClick={() => reviewNext("HARD")} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
                    HARD
                  </button>
                  <button onClick={() => reviewNext("GOOD")} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
                    GOOD
                  </button>
                  <button onClick={() => reviewNext("EASY")} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
                    EASY
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">Nada due/soon ainda - faca reviews ou seed.</div>
            )}
          </div>

          <div className="rounded-lg border p-3 space-y-2">
            <div className="text-xs text-gray-500">Fila (top 8)</div>
            {todayQueue.length === 0 ? (
              <div className="text-sm text-gray-500">-</div>
            ) : (
              <ol className="space-y-2">
                {todayQueue.slice(0, 8).map((it, idx) => (
                  <li
                    key={it.item_id}
                    className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedItemId(it.item_id)}
                    title="Clique para selecionar"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm">{idx + 1}. {it.topic_ref ?? it.kind}</div>
                      <div className="truncate text-xs text-gray-500">
                        <code>{it.item_id}</code> - crit <code>{it.criticality}</code>
                      </div>
                    </div>
                    <Badge status={classify(it)} />
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Itens</div>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-600">
              <span>Total: <code>{items.length}</code></span>
              <span>NEW: <code>{stats.NEW}</code></span>
              <span>DUE: <code>{stats.DUE}</code></span>
              <span>SOON: <code>{stats.SOON}</code></span>
              <span>SCHEDULED: <code>{stats.SCHEDULED}</code></span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border p-2">
              <span className="text-xs text-gray-500">Seed</span>
              <input
                type="number"
                min={1}
                max={200}
                value={seedCount}
                onChange={(e) => setSeedCount(Number(e.target.value || 10))}
                className="w-20 rounded-md border px-2 py-1 text-xs"
              />
              <button
                onClick={onSeed}
                disabled={itemsLoading}
                className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-60"
              >
                Seed demo
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-3 md:col-span-1 space-y-3">
            <div className="text-xs text-gray-500">Criar item</div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500">Kind</label>
              <select value={kind} onChange={(e) => setKind(e.target.value as ItemKind)} className="w-full rounded-lg border px-3 py-2 text-sm">
                <option value="QUESTION">QUESTION</option>
                <option value="TOPIC">TOPIC</option>
                <option value="CARD">CARD</option>
                <option value="BLOCK">BLOCK</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500">Topic ref</label>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="ex: CM: HAS" />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500">Criticality (0-100)</label>
              <input type="number" min={0} max={100} value={criticality} onChange={(e) => setCriticality(Number(e.target.value || 0))} className="w-full rounded-lg border px-3 py-2 text-sm" />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500">Tags (csv)</label>
              <input value={tags} onChange={(e) => setTags(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="demo, cm, cardio" />
            </div>

            <button onClick={onCreateItem} disabled={itemsLoading} className="w-full rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60">
              Criar item
            </button>

            <div className="text-xs text-gray-500">Seed so funciona com <code>AGENDAR_ENABLE_DEMO=1</code>.</div>
          </div>

          <div className="rounded-lg border p-3 md:col-span-2 space-y-3">
            <div className="text-xs text-gray-500">Tabela (mais recente primeiro)</div>

            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500">
                  <tr className="border-b">
                    <th className="py-2 text-left">Status</th>
                    <th className="py-2 text-left">ID</th>
                    <th className="py-2 text-left">Kind</th>
                    <th className="py-2 text-left">Topic</th>
                    <th className="py-2 text-left">Tags</th>
                    <th className="py-2 text-left">Crit</th>
                    <th className="py-2 text-left">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={7} className="py-3 text-gray-500">Nenhum item ainda.</td></tr>
                  ) : (
                    items.map((it) => {
                      const st = classify(it);
                      return (
                        <tr key={it.item_id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedItemId(it.item_id)} title="Clique para selecionar no Review">
                          <td className="py-2"><Badge status={st} /></td>
                          <td className="py-2"><code className="text-xs">{it.item_id}</code></td>
                          <td className="py-2">{it.kind}</td>
                          <td className="py-2">{it.topic_ref ?? "-"}</td>
                          <td className="py-2 text-xs text-gray-600">{it.tags.length ? it.tags.join(", ") : "-"}</td>
                          <td className="py-2">{it.criticality}</td>
                          <td className="py-2">
                            {it.last_review_at ? (
                              <span className={st === "DUE" ? "text-red-700" : "text-gray-700"}>{new Date(it.due_at).toLocaleString()}</span>
                            ) : (
                              <span className="text-gray-500">new</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {err && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}
          </div>
        </div>
      </section>

      <section className="rounded-xl border p-4 space-y-4">
        <div className="text-sm font-medium">Review (manual)</div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Item</label>
            <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} className="rounded-lg border px-3 py-2 text-sm min-w-[320px]">
              {items.length === 0 ? (
                <option value="">(crie um item primeiro)</option>
              ) : (
                items.map((it) => (
                  <option key={it.item_id} value={it.item_id}>
                    {it.item_id} - {it.topic_ref ?? it.kind}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-500">Rating</label>
            <select value={rating} onChange={(e) => setRating(e.target.value as Rating)} className="rounded-lg border px-3 py-2 text-sm">
              <option value="AGAIN">AGAIN</option>
              <option value="HARD">HARD</option>
              <option value="GOOD">GOOD</option>
              <option value="EASY">EASY</option>
            </select>
          </div>

          <button onClick={() => onReview(selectedItemId, rating)} disabled={itemsLoading || !selectedItemId} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60">
            Enviar review
          </button>
        </div>

        <div className="text-xs text-gray-500">
          Placeholder FSRS: AGAIN=agora, HARD~1d, GOOD~3d, EASY~7d.
        </div>
      </section>

      <section className="rounded-xl border p-4 space-y-4">
        <div className="text-sm font-medium">Planner (ChangeSet)</div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Dia</label>
            <input value={day} onChange={(e) => setDay(e.target.value)} type="date" className="rounded-lg border px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">TTL (horas)</label>
            <input value={ttl} onChange={(e) => setTtl(Number(e.target.value || 24))} type="number" min={1} max={168} className="w-28 rounded-lg border px-3 py-2 text-sm" />
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={generate} disabled={loading} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60">
              {loading ? "Gerando..." : "Gerar plano do dia"}
            </button>
            <button onClick={refreshChangeSet} disabled={loading || !cs} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60">
              Atualizar ChangeSet
            </button>
            <button onClick={onAcceptAll} disabled={loading || !canApply} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60">
              Accept all
            </button>
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="text-xs text-gray-500">
            {cs ? (
              <>
                <span>ID: <code>{cs.changeset_id}</code></span>
                <span className="ml-3">Status: <code>{cs.status}</code></span>
                <span className="ml-3">Expira: <code>{cs.expires_at}</code></span>
              </>
            ) : (
              <span>Nenhum ainda - gere um plano.</span>
            )}
          </div>

          {cs && (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-gray-500">Due reviews</div>
                <div className="mt-2 text-sm">
                  {cs.plan.due_review_ids.length === 0 ? (
                    <span className="text-gray-500">Nenhum</span>
                  ) : (
                    <ul className="list-disc pl-5 space-y-1">{cs.plan.due_review_ids.map((id) => <li key={id}><code>{id}</code></li>)}</ul>
                  )}
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="text-xs text-gray-500">New items</div>
                <div className="mt-2 text-sm">
                  {cs.plan.new_item_ids.length === 0 ? (
                    <span className="text-gray-500">Nenhum</span>
                  ) : (
                    <ul className="list-disc pl-5 space-y-1">{cs.plan.new_item_ids.map((id) => <li key={id}><code>{id}</code></li>)}</ul>
                  )}
                </div>
              </div>

              <div className="rounded-lg border p-3 md:col-span-2">
                <div className="text-xs text-gray-500">Notes</div>
                <div className="mt-2 text-sm">
                  {cs.plan.notes.length === 0 ? (
                    <span className="text-gray-500">-</span>
                  ) : (
                    <ul className="list-disc pl-5 space-y-1">{cs.plan.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
                  )}
                </div>
                <div className="mt-3 text-xs text-gray-500">Total minutes (draft): <code>{cs.plan.total_minutes}</code></div>
              </div>
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500">
          Voltar: <Link href="/" className="underline underline-offset-4">Home</Link>
        </div>
      </section>
    </div>
  );
}
