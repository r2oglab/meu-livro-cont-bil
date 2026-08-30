import { supabase } from "@/integrations/supabase/client";
import { rangeMes } from "@/lib/categorias";

export type Gasto = {
  id: string;
  valor: number;
  categoria: string;
  data: string;
  descricao: string | null;
  via_ia: boolean;
  recurring_id: string | null;
};

export type Recorrente = {
  id: string;
  valor: number;
  categoria: string;
  descricao: string | null;
  dia_do_mes: number;
  data_inicio: string;
  data_fim: string | null;
  ativo: boolean;
};

export type Meta = { id: string; categoria: string; valor_meta: number };

const SEL = "id, valor, categoria, data, descricao, via_ia, recurring_id";

export async function idUsuario() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sessão expirada.");
  return data.user.id;
}

export async function buscarMes(ano: number, mes: number): Promise<Gasto[]> {
  const [ini, fim] = rangeMes(ano, mes);
  const { data, error } = await supabase
    .from("expenses")
    .select(SEL)
    .gte("data", ini)
    .lte("data", fim)
    .order("data", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((g) => ({ ...g, valor: Number(g.valor) }));
}

export async function buscarIntervalo(ini: string, fim: string) {
  const { data, error } = await supabase
    .from("expenses")
    .select("valor, data")
    .gte("data", ini)
    .lte("data", fim);
  if (error) throw new Error(error.message);
  return (data ?? []).map((g) => ({ data: g.data, valor: Number(g.valor) }));
}

/* ---------- metas ---------- */

export async function buscarMetas(): Promise<Meta[]> {
  const { data, error } = await supabase
    .from("category_budgets")
    .select("id, categoria, valor_meta");
  if (error) throw new Error(error.message);
  return (data ?? []).map((m) => ({ ...m, valor_meta: Number(m.valor_meta) }));
}

export async function salvarMeta(categoria: string, valor: number) {
  const user_id = await idUsuario();
  const { error } = await supabase
    .from("category_budgets")
    .upsert({ user_id, categoria, valor_meta: valor }, { onConflict: "user_id,categoria" });
  if (error) throw new Error(error.message);
}

export async function excluirMeta(categoria: string) {
  const { error } = await supabase.from("category_budgets").delete().eq("categoria", categoria);
  if (error) throw new Error(error.message);
}

/* ---------- recorrências ---------- */

export async function buscarRecorrentes(): Promise<Recorrente[]> {
  const { data, error } = await supabase
    .from("recurring_expenses")
    .select("id, valor, categoria, descricao, dia_do_mes, data_inicio, data_fim, ativo")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ ...r, valor: Number(r.valor) }));
}

const p = (n: number) => String(n).padStart(2, "0");

function dataDoMes(ano: number, mes: number, dia: number) {
  const ultimo = new Date(ano, mes + 1, 0).getDate();
  return `${ano}-${p(mes + 1)}-${p(Math.min(dia, ultimo))}`;
}

/**
 * Gera os lançamentos das recorrências ativas para todos os meses do início
 * até o mês corrente. Meses já materializados nunca são alterados — por isso
 * editar ou pausar uma recorrência só afeta os meses seguintes.
 */
export async function sincronizarRecorrentes(): Promise<number> {
  const ativos = (await buscarRecorrentes()).filter((r) => r.ativo);
  if (ativos.length === 0) return 0;

  const inicioGeral = ativos.map((r) => r.data_inicio).sort()[0]!;
  const { data: existentes, error } = await supabase
    .from("expenses")
    .select("recurring_id, data")
    .not("recurring_id", "is", null)
    .gte("data", inicioGeral);
  if (error) throw new Error(error.message);

  const feitos = new Set(
    (existentes ?? []).map((e) => `${e.recurring_id}|${e.data.slice(0, 7)}`),
  );

  const hoje = new Date();
  const fimGlobal = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const user_id = await idUsuario();
  const novos: Record<string, unknown>[] = [];

  for (const r of ativos) {
    const [ai, mi] = r.data_inicio.split("-").map(Number) as [number, number];
    const cursor = new Date(ai, mi - 1, 1);
    let limite = fimGlobal;
    if (r.data_fim) {
      const [af, mf] = r.data_fim.split("-").map(Number) as [number, number];
      const lf = new Date(af, mf - 1, 1);
      if (lf < limite) limite = lf;
    }
    let guarda = 0;
    while (cursor <= limite && guarda++ < 60) {
      const ano = cursor.getFullYear();
      const mes = cursor.getMonth();
      const chave = `${r.id}|${ano}-${p(mes + 1)}`;
      let data = dataDoMes(ano, mes, r.dia_do_mes);
      if (data < r.data_inicio) data = r.data_inicio;
      if (!r.data_fim || data <= r.data_fim) {
        if (!feitos.has(chave)) {
          novos.push({
            user_id,
            valor: r.valor,
            categoria: r.categoria,
            data,
            descricao: r.descricao,
            via_ia: false,
            recurring_id: r.id,
          });
        }
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  if (novos.length === 0) return 0;
  const { error: errIns } = await supabase.from("expenses").insert(novos);
  if (errIns) throw new Error(errIns.message);
  return novos.length;
}
