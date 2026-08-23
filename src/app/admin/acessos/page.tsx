"use client";

import { useState } from "react";

import {
  adminGetEntitlements,
  adminGrantAccess,
  adminRevokeEntitlement,
  type Entitlement,
  type EntitlementList,
} from "@/lib/api/domains/admin";

/**
 * Conceder acesso, no lugar da emissão de chave de mentor.
 *
 * A tela antiga gerava lotes de códigos `KROS-XXXX-...` e o aluno digitava o
 * seu. Esse modelo saiu: o acesso agora é um direito ligado ao `user_id`, então
 * não há código para gerar nem para digitar — o operador concede direto.
 *
 * Por `user_id` e não por e-mail, de propósito: é o `user_id` que a conta tem de
 * verdade, e resolver e-mail aqui exigiria uma busca que expõe endereço de
 * aluno numa tela que não precisa disso.
 */

const ROTULO_ORIGEM: Record<string, string> = {
  subscription: "Assinatura",
  admin_grant: "Cortesia",
  access_key: "Chave (legado)",
};

function formatarData(iso: string | null): string {
  if (!iso) return "não expira";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("pt-BR");
}

function situacao(direito: Entitlement): { texto: string; classe: string } {
  if (direito.revoked_at) return { texto: "Revogado", classe: "text-danger" };
  if (direito.is_active) return { texto: "Ativo", classe: "text-success" };
  return { texto: "Vencido", classe: "text-muted" };
}

export default function AdminAcessosPage() {
  const [userId, setUserId] = useState("");
  const [dias, setDias] = useState(30);
  const [motivo, setMotivo] = useState("");
  const [dados, setDados] = useState<EntitlementList | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const alvo = userId.trim();

  async function consultar(id: string) {
    setErro(null);
    try {
      setDados(await adminGetEntitlements(id));
    } catch {
      setDados(null);
      setErro("Não consegui consultar. Confira o user_id.");
    }
  }

  async function buscar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!alvo || ocupado) return;
    setOcupado(true);
    setAviso(null);
    await consultar(alvo);
    setOcupado(false);
  }

  async function conceder() {
    if (!alvo || ocupado) return;
    setOcupado(true);
    setErro(null);
    setAviso(null);
    try {
      await adminGrantAccess({
        user_id: alvo,
        days: dias,
        reason: motivo.trim() || undefined,
      });
      setAviso(`Acesso concedido por ${dias} dias.`);
      setMotivo("");
      await consultar(alvo);
    } catch {
      // O backend recusa conta inexistente (404) e excluída (409). Os dois são
      // erro do operador, não do sistema, e a mensagem diz o que fazer.
      setErro("Não concedi. O user_id existe e a conta não está excluída?");
    } finally {
      setOcupado(false);
    }
  }

  async function revogar(entitlementId: string) {
    if (ocupado) return;
    setOcupado(true);
    setErro(null);
    setAviso(null);
    try {
      await adminRevokeEntitlement(entitlementId);
      setAviso("Direito revogado.");
      await consultar(alvo);
    } catch {
      setErro("Não consegui revogar.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-ink">Acesso</h1>
        <p className="mt-1 max-w-[60ch] text-sm text-muted">
          Conceder acesso a um aluno por tempo determinado. Substitui a emissão de chaves —
          não há mais código para gerar nem para o aluno digitar.
        </p>
      </div>

      <form onSubmit={buscar} className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[16rem]">
          <label htmlFor="user-id" className="paper-eyebrow block pb-1">
            user_id
          </label>
          <input
            id="user-id"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="ex.: 3f2a1c…"
            spellCheck={false}
            autoComplete="off"
            className="paper-control w-full rounded-control border border-edge bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted"
          />
        </div>
        <button
          type="submit"
          disabled={!alvo || ocupado}
          className="paper-control rounded-control border border-edge bg-surface px-4 py-2 text-sm font-medium text-ink disabled:opacity-40"
        >
          Consultar
        </button>
      </form>

      {erro ? <p className="text-sm text-danger">{erro}</p> : null}
      {aviso ? <p className="text-sm text-success">{aviso}</p> : null}

      {dados ? (
        <>
          <div className="border border-edge bg-surface p-5">
            <span className="paper-eyebrow">Situação</span>
            <p className="mt-2 text-lg text-ink">
              {dados.has_active_access ? "Com acesso ativo" : "Sem acesso"}
              {dados.has_active_access ? (
                <span className="ml-2 text-sm text-muted">
                  até {formatarData(dados.access_until)}
                </span>
              ) : null}
            </p>
          </div>

          <div className="border border-edge bg-surface p-5">
            <span className="paper-eyebrow">Conceder cortesia</span>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="dias" className="paper-eyebrow block pb-1">
                  Dias
                </label>
                <input
                  id="dias"
                  type="number"
                  min={1}
                  max={1825}
                  value={dias}
                  onChange={(e) => setDias(Number(e.target.value))}
                  className="paper-control w-24 rounded-control border border-edge bg-surface px-3 py-2 text-sm text-ink"
                />
              </div>
              <div className="flex-1 min-w-[14rem]">
                <label htmlFor="motivo" className="paper-eyebrow block pb-1">
                  Motivo (fica na trilha)
                </label>
                <input
                  id="motivo"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  maxLength={280}
                  placeholder="ex.: beta fechado"
                  className="paper-control w-full rounded-control border border-edge bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted"
                />
              </div>
              <button
                type="button"
                onClick={conceder}
                disabled={ocupado}
                className="paper-control rounded-control border border-primary bg-primary px-5 py-2 text-sm font-semibold text-primaryInk disabled:opacity-40"
              >
                Conceder
              </button>
            </div>
          </div>

          <div className="border border-edge bg-surface p-5">
            <span className="paper-eyebrow">Histórico</span>
            {dados.entitlements.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Nenhum direito emitido para este aluno.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-edge text-left">
                      <th className="paper-eyebrow pb-2 pr-3">Origem</th>
                      <th className="paper-eyebrow pb-2 pr-3">Situação</th>
                      <th className="paper-eyebrow pb-2 pr-3">Até</th>
                      <th className="paper-eyebrow pb-2 pr-3">Motivo</th>
                      <th className="paper-eyebrow pb-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {dados.entitlements.map((d) => {
                      const s = situacao(d);
                      return (
                        <tr key={d.entitlement_id} className="border-b border-edge/50 last:border-0">
                          <td className="py-2 pr-3 text-xs text-ink">
                            {ROTULO_ORIGEM[d.source_kind] ?? d.source_kind}
                          </td>
                          <td className={`py-2 pr-3 text-xs ${s.classe}`}>{s.texto}</td>
                          <td className="py-2 pr-3 text-xs text-muted">
                            {formatarData(d.ends_at)}
                          </td>
                          <td className="py-2 pr-3 text-xs text-muted">{d.note ?? "—"}</td>
                          <td className="py-2 text-right">
                            {d.revoked_at ? null : (
                              <button
                                type="button"
                                onClick={() => revogar(d.entitlement_id)}
                                disabled={ocupado}
                                className="text-xs font-semibold text-danger disabled:opacity-40"
                              >
                                Revogar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
