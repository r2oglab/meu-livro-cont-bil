import { useState } from "react";
import { Download } from "lucide-react";
import { buscarTodos, type Gasto } from "@/lib/ledger";
import { MESES } from "@/lib/categorias";
import { gerarExtratoPDF } from "@/lib/extrato-pdf";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Escopo = "todos" | "Meu cartão" | "Cartão do irmão";

export function ExportarDialog({
  aberto,
  onOpenChange,
  ano,
  mes,
  gastosMes,
}: {
  aberto: boolean;
  onOpenChange: (a: boolean) => void;
  ano: number;
  mes: number;
  gastosMes: Gasto[];
}) {
  const [periodo, setPeriodo] = useState<"mes" | "tudo">("mes");
  const [escopo, setEscopo] = useState<Escopo>("todos");
  const [gerando, setGerando] = useState(false);

  async function exportar() {
    setGerando(true);
    try {
      const base = periodo === "mes" ? gastosMes : await buscarTodos();
      const gastos = escopo === "todos" ? base : base.filter((g) => g.cartao === escopo);
      const mm = String(mes + 1).padStart(2, "0");
      await gerarExtratoPDF({
        gastos,
        periodoRotulo: periodo === "mes" ? `${MESES[mes]} de ${ano}` : "Todo o histórico",
        escopoRotulo: escopo === "todos" ? "Todos os gastos" : `Somente ${escopo}`,
        nomeArquivo: periodo === "mes" ? `extrato-${ano}-${mm}.pdf` : "extrato-completo.pdf",
      });
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível gerar o PDF.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Exportar extrato</DialogTitle>
          <DialogDescription>Gera um PDF com os lançamentos escolhidos.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="num text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground">
              Período
            </p>
            <RadioGroup value={periodo} onValueChange={(v) => setPeriodo(v as "mes" | "tudo")}>
              <Label className="flex items-center gap-2 font-normal">
                <RadioGroupItem value="mes" /> {MESES[mes]} de {ano}
              </Label>
              <Label className="flex items-center gap-2 font-normal">
                <RadioGroupItem value="tudo" /> Todo o histórico
              </Label>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <p className="num text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground">
              Escopo
            </p>
            <RadioGroup value={escopo} onValueChange={(v) => setEscopo(v as Escopo)}>
              <Label className="flex items-center gap-2 font-normal">
                <RadioGroupItem value="todos" /> Todos os gastos
              </Label>
              <Label className="flex items-center gap-2 font-normal">
                <RadioGroupItem value="Meu cartão" /> Somente Meu cartão
              </Label>
              <Label className="flex items-center gap-2 font-normal">
                <RadioGroupItem value="Cartão do irmão" /> Somente Cartão do irmão
              </Label>
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <Button className="w-full" disabled={gerando} onClick={exportar}>
            <Download className="size-4" />
            {gerando ? "Gerando…" : "Baixar PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
