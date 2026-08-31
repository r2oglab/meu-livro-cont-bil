import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  LogOut,
  Sparkles,
  Repeat,
  Target,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { criarGastoPorTexto } from "@/lib/expenses.functions";
import {
  buscarIntervalo,
  buscarMes,
  buscarMetas,
  idUsuario,
  sincronizarRecorrentes,
  type Gasto,
} from "@/lib/ledger";
import { EditarGastoDialog } from "@/components/EditarGastoDialog";
import {
  CATEGORIAS,
  MESES,
  brl,
  formatarDataCurta,
  hojeISO,
  rangeMes,
} from "@/lib/categorias";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/livro")({
  head: () => ({
    meta: [
      { title: "Livro-Caixa — Controle de gastos" },
      {
        name: "description",
        content: "Registre e acompanhe seus gastos mensais em reais, por categoria.",
      },
      { property: "og:title", content: "Livro-Caixa — Controle de gastos" },
      {
        property: "og:description",
        content: "Registre e acompanhe seus gastos mensais em reais, por categoria.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Livro,
});

function Livro() {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [editando, setEditando] = useState<Gasto | null>(null);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const anterior = useMemo(() => {
    const d = new Date(ano, mes - 1, 1);
    return { ano: d.getFullYear(), mes: d.getMonth() };
  }, [ano, mes]);

  // materializa recorrências pendentes ao abrir o livro
  useEffect(() => {
    sincronizarRecorrentes()
      .then((n) => {
        if (n > 0) qc.invalidateQueries({ queryKey: ["gastos"] });
      })
      .catch(() => undefined);
  }, [qc]);

  const atual = useQuery({
    queryKey: ["gastos", ano, mes],
    queryFn: () => buscarMes(ano, mes),
  });
  const passado = useQuery({
    queryKey: ["gastos", anterior.ano, anterior.mes],
    queryFn: () => buscarMes(anterior.ano, anterior.mes),
  });
  const metas = useQuery({ queryKey: ["metas"], queryFn: buscarMetas });
  const evolucao = useQuery({
    queryKey: ["evolucao", ano, mes],
    queryFn: async () => {
      const meses = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(ano, mes - 5 + i, 1);
        return { ano: d.getFullYear(), mes: d.getMonth() };
      });
      const primeiro = meses[0]!;
      const ultimo = meses[5]!;
      const [ini] = rangeMes(primeiro.ano, primeiro.mes);
      const [, fim] = rangeMes(ultimo.ano, ultimo.mes);
      const linhas = await buscarIntervalo(ini, fim);
      return meses.map((m) => ({
        rotulo: MESES[m.mes]!.slice(0, 3),
        total: linhas
          .filter((l) => Number(l.data.slice(0, 4)) === m.ano && Number(l.data.slice(5, 7)) === m.mes + 1)
          .reduce((s, l) => s + l.valor, 0),
      }));
    },
  });

  const gastos = atual.data ?? [];
  const total = gastos.reduce((s, g) => s + g.valor, 0);
  const totalAnterior = (passado.data ?? []).reduce((s, g) => s + g.valor, 0);
  const variacao = totalAnterior > 0 ? ((total - totalAnterior) / totalAnterior) * 100 : null;

  const mapaMetas = useMemo(() => {
    const m = new Map<string, number>();
    for (const meta of metas.data ?? []) m.set(meta.categoria, meta.valor_meta);
    return m;
  }, [metas.data]);

  const porCategoria = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of gastos) m.set(g.categoria, (m.get(g.categoria) ?? 0) + g.valor);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [gastos]);

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["gastos"] });
    qc.invalidateQueries({ queryKey: ["evolucao"] });
    qc.invalidateQueries({ queryKey: ["recorrentes"] });
  };

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      invalidar();
      toast.success("Lançamento excluído");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function mudarMes(delta: number) {
    const d = new Date(ano, mes + delta, 1);
    setAno(d.getFullYear());
    setMes(d.getMonth());
  }

  async function sair() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-6">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <p className="num text-[0.7rem] uppercase tracking-[0.28em] text-muted-foreground">
            Livro-Caixa
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Link to="/metas" className="flex items-center gap-1 hover:text-foreground">
              <Target className="size-3.5" /> metas
            </Link>
            <Link to="/recorrentes" className="flex items-center gap-1 hover:text-foreground">
              <Repeat className="size-3.5" /> recorrentes
            </Link>
            <button
              onClick={sair}
              aria-label="Sair"
              className="flex items-center gap-1 hover:text-foreground"
            >
              <LogOut className="size-3.5" /> sair
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" aria-label="Mês anterior" onClick={() => mudarMes(-1)}>
            <ChevronLeft className="size-5" />
          </Button>
          <h1 className="text-xl font-semibold capitalize tracking-tight">
            {MESES[mes]} <span className="num text-muted-foreground">{ano}</span>
          </h1>
          <Button variant="ghost" size="icon" aria-label="Próximo mês" onClick={() => mudarMes(1)}>
            <ChevronRight className="size-5" />
          </Button>
        </div>
      </header>

      <section className="rule-double py-5 text-center">
        <p className="num text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground">
          Total do mês
        </p>
        <p className="num mt-1 text-4xl font-semibold text-primary">{brl(total)}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {variacao === null ? (
            <>sem base de comparação no mês anterior</>
          ) : (
            <>
              <span className={variacao > 0 ? "text-destructive" : "text-primary"}>
                {variacao > 0 ? "▲" : "▼"} {Math.abs(variacao).toFixed(1).replace(".", ",")}%
              </span>{" "}
              em relação a {MESES[anterior.mes]} ({brl(totalAnterior)})
            </>
          )}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="num mb-3 text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground">
          Evolução (6 meses)
        </h2>
        <div className="ledger-card h-44 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={evolucao.data ?? []}>
              <CartesianGrid vertical={false} stroke="var(--rule)" strokeOpacity={0.5} />
              <XAxis
                dataKey="rotulo"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <Tooltip
                cursor={{ fill: "var(--secondary)" }}
                formatter={(v: number) => [brl(Number(v)), "total"]}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="total" fill="var(--primary)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="num mb-3 text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground">
          Por categoria
        </h2>
        {porCategoria.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum gasto neste mês.</p>
        ) : (
          <ul className="space-y-2.5">
            {porCategoria.map(([cat, v]) => {
              const meta = mapaMetas.get(cat);
              const pct = meta ? (v / meta) * 100 : null;
              const estado =
                pct === null ? "neutro" : pct >= 100 ? "estourou" : pct >= 80 ? "perto" : "ok";
              const corBarra =
                estado === "estourou"
                  ? "bg-destructive"
                  : estado === "perto"
                    ? "bg-warning"
                    : "bg-primary";
              return (
                <li key={cat}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span>
                      {cat}
                      {pct !== null && (
                        <span
                          className={`num ml-1.5 text-[0.65rem] ${
                            estado === "estourou"
                              ? "text-destructive"
                              : estado === "perto"
                                ? "text-warning"
                                : "text-muted-foreground"
                          }`}
                        >
                          {pct.toFixed(0)}% da meta
                        </span>
                      )}
                    </span>
                    <span className="num">{brl(v)}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full bg-secondary">
                    <div
                      className={`h-full ${corBarra}`}
                      style={{
                        width: `${
                          meta
                            ? Math.min(100, (v / meta) * 100)
                            : total > 0
                              ? (v / total) * 100
                              : 0
                        }%`,
                      }}
                    />
                  </div>
                  {meta && (
                    <p className="num mt-0.5 text-[0.65rem] text-muted-foreground">
                      meta {brl(meta)}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <FormularioGasto onSalvo={invalidar} />

      <section className="mt-10">
        <h2 className="num mb-2 text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground">
          Lançamentos
        </h2>
        {atual.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : gastos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada lançado ainda.</p>
        ) : (
          <ul className="border-t border-rule">
            {gastos.map((g) => (
              <li
                key={g.id}
                className="flex items-center gap-3 border-b border-rule/60 py-2.5 text-sm"
              >
                <button
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() => setEditando(g)}
                  aria-label={`Editar lançamento ${g.descricao || g.categoria}`}
                >
                  <span className="num w-11 shrink-0 text-muted-foreground">
                    {formatarDataCurta(g.data)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{g.descricao || g.categoria}</span>
                    <span className="block text-xs text-muted-foreground">
                      {g.categoria}
                      {g.via_ia && (
                        <span className="num ml-1.5 border border-primary/40 px-1 text-[0.6rem] uppercase tracking-wider text-primary">
                          IA
                        </span>
                      )}
                      {g.recurring_id && (
                        <span className="num ml-1.5 border border-rule px-1 text-[0.6rem] uppercase tracking-wider">
                          Recorrente
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="num shrink-0 tabular-nums">{brl(g.valor)}</span>
                </button>
                <button
                  aria-label="Excluir lançamento"
                  onClick={() => excluir.mutate(g.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <EditarGastoDialog
        gasto={editando}
        onOpenChange={(aberto) => !aberto && setEditando(null)}
        onSalvo={invalidar}
      />
    </main>
  );
}

function FormularioGasto({ onSalvo }: { onSalvo: () => void }) {
  const [texto, setTexto] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState<string>("Alimentação");
  const [data, setData] = useState(hojeISO());
  const [descricao, setDescricao] = useState("");
  const [recorrente, setRecorrente] = useState(false);

  const parseIA = useServerFn(criarGastoPorTexto);

  const viaIA = useMutation({
    mutationFn: () => parseIA({ data: { texto, hoje: hojeISO() } }),
    onSuccess: () => {
      setTexto("");
      onSalvo();
      toast.success("Gasto registrado pela IA");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const manual = useMutation({
    mutationFn: async () => {
      const v = Number(valor.replace(",", "."));
      if (!Number.isFinite(v) || v <= 0) throw new Error("Informe um valor válido.");
      const user_id = await idUsuario();
      const centavos = Math.round(v * 100) / 100;
      let recurring_id: string | null = null;

      if (recorrente) {
        const { data: rec, error: errRec } = await supabase
          .from("recurring_expenses")
          .insert({
            user_id,
            valor: centavos,
            categoria,
            descricao: descricao.trim() || null,
            dia_do_mes: Number(data.slice(8, 10)),
            data_inicio: data,
            ativo: true,
          })
          .select("id")
          .single();
        if (errRec) throw new Error(errRec.message);
        recurring_id = rec.id;
      }

      const { error } = await supabase.from("expenses").insert({
        user_id,
        valor: centavos,
        categoria,
        data,
        descricao: descricao.trim() || null,
        via_ia: false,
        recurring_id,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setValor("");
      setDescricao("");
      setRecorrente(false);
      onSalvo();
      toast.success("Gasto registrado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="mt-8">
      <h2 className="num mb-3 text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground">
        Adicionar gasto
      </h2>
      <Tabs defaultValue="texto" className="ledger-card p-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="texto">Texto livre</TabsTrigger>
          <TabsTrigger value="campos">Campos</TabsTrigger>
        </TabsList>

        <TabsContent value="texto" className="mt-4 space-y-3">
          <Textarea
            rows={3}
            placeholder="gastei 45 no ifood ontem"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <Button
            className="w-full"
            disabled={viaIA.isPending || texto.trim().length < 3}
            onClick={() => viaIA.mutate()}
          >
            <Sparkles className="size-4" />
            {viaIA.isPending ? "Interpretando…" : "Registrar com IA"}
          </Button>
        </TabsContent>

        <TabsContent value="campos" className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                inputMode="decimal"
                className="num"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                type="date"
                className="num"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Descrição (opcional)</Label>
            <Input id="desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={recorrente}
              onCheckedChange={(c) => setRecorrente(c === true)}
              aria-label="Tornar recorrente"
            />
            Tornar recorrente todo mês no dia{" "}
            <span className="num">{Number(data.slice(8, 10))}</span>
          </label>
          <Button className="w-full" disabled={manual.isPending} onClick={() => manual.mutate()}>
            {manual.isPending ? "Salvando…" : "Salvar lançamento"}
          </Button>
        </TabsContent>
      </Tabs>
    </section>
  );
}
