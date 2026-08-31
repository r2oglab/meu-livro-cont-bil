import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Pause, Play, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIAS, brl } from "@/lib/categorias";
import { buscarRecorrentes, sincronizarRecorrentes, type Recorrente } from "@/lib/ledger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/recorrentes")({
  head: () => ({
    meta: [
      { title: "Gastos recorrentes — Meu Livro Contábil" },
      {
        name: "description",
        content: "Gerencie seus gastos fixos mensais: editar, pausar ou excluir recorrências.",
      },
      { property: "og:title", content: "Gastos recorrentes — Meu Livro Contábil" },
      {
        property: "og:description",
        content: "Gerencie seus gastos fixos mensais: editar, pausar ou excluir recorrências.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Recorrentes,
});

function Recorrentes() {
  const qc = useQueryClient();
  const [editando, setEditando] = useState<Recorrente | null>(null);
  const lista = useQuery({ queryKey: ["recorrentes"], queryFn: buscarRecorrentes });

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["recorrentes"] });
    qc.invalidateQueries({ queryKey: ["gastos"] });
  };

  const alternar = useMutation({
    mutationFn: async (r: Recorrente) => {
      const { error } = await supabase
        .from("recurring_expenses")
        .update({ ativo: !r.ativo })
        .eq("id", r.id);
      if (error) throw new Error(error.message);
      if (!r.ativo) await sincronizarRecorrentes();
    },
    onSuccess: () => {
      invalidar();
      toast.success("Recorrência atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recurring_expenses").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      invalidar();
      toast.success("Recorrência excluída — lançamentos já feitos foram mantidos");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const recorrentes = lista.data ?? [];

  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-6">
      <header className="mb-6">
        <Link
          to="/livro"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" /> voltar ao livro
        </Link>
        <h1 className="mt-3 text-xl font-semibold tracking-tight">Gastos recorrentes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Alterações valem a partir dos próximos meses; o histórico já lançado não muda.
        </p>
      </header>

      {lista.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : recorrentes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma recorrência. Marque “tornar recorrente” ao lançar um gasto.
        </p>
      ) : (
        <ul className="space-y-3">
          {recorrentes.map((r) => (
            <li key={r.id} className="ledger-card p-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 flex-1 truncate text-sm">
                  {r.descricao || r.categoria}
                </span>
                <span className="num shrink-0 text-sm">{brl(r.valor)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {r.categoria} · todo dia <span className="num">{r.dia_do_mes}</span> · desde{" "}
                <span className="num">{r.data_inicio}</span>
                {r.data_fim ? (
                  <>
                    {" "}
                    até <span className="num">{r.data_fim}</span>
                  </>
                ) : null}
                {!r.ativo && <span className="ml-1.5 text-warning">· pausada</span>}
              </p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setEditando(r)}>
                  <Pencil className="size-3.5" /> Editar
                </Button>
                <Button size="sm" variant="secondary" onClick={() => alternar.mutate(r)}>
                  {r.ativo ? (
                    <>
                      <Pause className="size-3.5" /> Pausar
                    </>
                  ) : (
                    <>
                      <Play className="size-3.5" /> Retomar
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Excluir recorrência"
                  onClick={() => excluir.mutate(r.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <EditarRecorrenteDialog
        recorrente={editando}
        onOpenChange={(a) => !a && setEditando(null)}
        onSalvo={invalidar}
      />
    </main>
  );
}

function EditarRecorrenteDialog({
  recorrente,
  onOpenChange,
  onSalvo,
}: {
  recorrente: Recorrente | null;
  onOpenChange: (aberto: boolean) => void;
  onSalvo: () => void;
}) {
  const [form, setForm] = useState<Recorrente | null>(null);
  const atual = form && recorrente && form.id === recorrente.id ? form : recorrente;

  const salvar = useMutation({
    mutationFn: async () => {
      if (!atual) return;
      const v = Number(String(atual.valor).replace(",", "."));
      if (!Number.isFinite(v) || v <= 0) throw new Error("Informe um valor válido.");
      const { error } = await supabase
        .from("recurring_expenses")
        .update({
          valor: Math.round(v * 100) / 100,
          categoria: atual.categoria,
          descricao: atual.descricao?.trim() || null,
          dia_do_mes: Math.min(31, Math.max(1, Number(atual.dia_do_mes) || 1)),
          data_fim: atual.data_fim || null,
        })
        .eq("id", atual.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      onSalvo();
      onOpenChange(false);
      toast.success("Recorrência atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (patch: Partial<Recorrente>) => atual && setForm({ ...atual, ...patch });

  return (
    <Dialog open={!!recorrente} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar recorrência</DialogTitle>
          <DialogDescription>Vale a partir dos meses ainda não lançados.</DialogDescription>
        </DialogHeader>
        {atual && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="r-valor">Valor (R$)</Label>
                <Input
                  id="r-valor"
                  inputMode="decimal"
                  className="num"
                  value={String(atual.valor)}
                  onChange={(e) => set({ valor: e.target.value as unknown as number })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-dia">Dia do mês</Label>
                <Input
                  id="r-dia"
                  inputMode="numeric"
                  className="num"
                  value={String(atual.dia_do_mes)}
                  onChange={(e) => set({ dia_do_mes: e.target.value as unknown as number })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={atual.categoria} onValueChange={(v) => set({ categoria: v })}>
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
              <Label htmlFor="r-desc">Descrição</Label>
              <Input
                id="r-desc"
                value={atual.descricao ?? ""}
                onChange={(e) => set({ descricao: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-fim">Encerrar em (opcional)</Label>
              <Input
                id="r-fim"
                type="date"
                className="num"
                value={atual.data_fim ?? ""}
                onChange={(e) => set({ data_fim: e.target.value || null })}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button className="w-full" disabled={salvar.isPending} onClick={() => salvar.mutate()}>
            {salvar.isPending ? "Salvando…" : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
