import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { CATEGORIAS, brl } from "@/lib/categorias";
import { buscarMetas, excluirMeta, salvarMeta } from "@/lib/ledger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({
    meta: [
      { title: "Metas por categoria — Meu Livro Contábil" },
      {
        name: "description",
        content: "Defina uma meta mensal de gastos para cada categoria do seu livro-caixa.",
      },
      { property: "og:title", content: "Metas por categoria — Meu Livro Contábil" },
      {
        property: "og:description",
        content: "Defina uma meta mensal de gastos para cada categoria do seu livro-caixa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Metas,
});

function Metas() {
  const qc = useQueryClient();
  const metas = useQuery({ queryKey: ["metas"], queryFn: buscarMetas });
  const [campos, setCampos] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!metas.data) return;
    const m: Record<string, string> = {};
    for (const meta of metas.data) m[meta.categoria] = String(meta.valor_meta).replace(".", ",");
    setCampos(m);
  }, [metas.data]);

  const salvar = useMutation({
    mutationFn: async (categoria: string) => {
      const bruto = (campos[categoria] ?? "").trim();
      if (!bruto) {
        await excluirMeta(categoria);
        return "removida" as const;
      }
      const v = Number(bruto.replace(",", "."));
      if (!Number.isFinite(v) || v <= 0) throw new Error("Informe um valor válido.");
      await salvarMeta(categoria, Math.round(v * 100) / 100);
      return "salva" as const;
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["metas"] });
      toast.success(r === "salva" ? "Meta salva" : "Meta removida");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalMetas = (metas.data ?? []).reduce((s, m) => s + m.valor_meta, 0);

  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-6">
      <header className="mb-6">
        <Link
          to="/livro"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" /> voltar ao livro
        </Link>
        <h1 className="mt-3 text-xl font-semibold tracking-tight">Metas por categoria</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Deixe em branco para não acompanhar meta na categoria.
        </p>
      </header>

      <section className="rule-double py-4 text-center">
        <p className="num text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground">
          Soma das metas
        </p>
        <p className="num mt-1 text-2xl font-semibold text-primary">{brl(totalMetas)}</p>
      </section>

      <ul className="mt-6 space-y-3">
        {CATEGORIAS.map((c) => (
          <li key={c} className="ledger-card flex items-end gap-3 p-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor={`meta-${c}`}>{c}</Label>
              <Input
                id={`meta-${c}`}
                inputMode="decimal"
                className="num"
                placeholder="sem meta"
                value={campos[c] ?? ""}
                onChange={(e) => setCampos((s) => ({ ...s, [c]: e.target.value }))}
              />
            </div>
            <Button
              variant="secondary"
              disabled={salvar.isPending}
              onClick={() => salvar.mutate(c)}
            >
              Salvar
            </Button>
          </li>
        ))}
      </ul>
    </main>
  );
}
