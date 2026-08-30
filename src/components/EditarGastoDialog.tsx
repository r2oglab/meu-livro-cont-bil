import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIAS } from "@/lib/categorias";
import type { Gasto } from "@/lib/ledger";
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

export function EditarGastoDialog({
  gasto,
  onOpenChange,
  onSalvo,
}: {
  gasto: Gasto | null;
  onOpenChange: (aberto: boolean) => void;
  onSalvo: () => void;
}) {
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState("Outros");
  const [data, setData] = useState("");
  const [descricao, setDescricao] = useState("");

  useEffect(() => {
    if (!gasto) return;
    setValor(String(gasto.valor).replace(".", ","));
    setCategoria(gasto.categoria);
    setData(gasto.data);
    setDescricao(gasto.descricao ?? "");
  }, [gasto]);

  const salvar = useMutation({
    mutationFn: async () => {
      if (!gasto) return;
      const v = Number(valor.replace(",", "."));
      if (!Number.isFinite(v) || v <= 0) throw new Error("Informe um valor válido.");
      const { error } = await supabase
        .from("expenses")
        .update({
          valor: Math.round(v * 100) / 100,
          categoria,
          data,
          descricao: descricao.trim() || null,
        })
        .eq("id", gasto.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      onSalvo();
      onOpenChange(false);
      toast.success("Lançamento atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!gasto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar lançamento</DialogTitle>
          <DialogDescription>
            As alterações são salvas no mesmo registro.
            {gasto?.recurring_id ? " Este lançamento veio de uma recorrência; a edição vale só para este mês." : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="e-valor">Valor (R$)</Label>
              <Input
                id="e-valor"
                inputMode="decimal"
                className="num"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-data">Data</Label>
              <Input
                id="e-data"
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
            <Label htmlFor="e-desc">Descrição</Label>
            <Input id="e-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button
            className="w-full"
            disabled={salvar.isPending}
            onClick={() => salvar.mutate()}
          >
            {salvar.isPending ? "Salvando…" : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
