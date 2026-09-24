import { CARTOES, FORMAS_PAGAMENTO } from "@/lib/categorias";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NENHUM = "__nenhum";

export function PagamentoCampos({
  forma,
  cartao,
  onChange,
}: {
  forma: string | null;
  cartao: string | null;
  onChange: (v: { forma: string | null; cartao: string | null }) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label>Pagamento</Label>
        <Select
          value={forma ?? NENHUM}
          onValueChange={(v) => {
            const f = v === NENHUM ? null : v;
            onChange({ forma: f, cartao: f === "Crédito" ? cartao : null });
          }}
        >
          <SelectTrigger aria-label="Forma de pagamento">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NENHUM}>—</SelectItem>
            {FORMAS_PAGAMENTO.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {forma === "Crédito" && (
        <div className="space-y-1.5">
          <Label>Cartão</Label>
          <Select
            value={cartao ?? NENHUM}
            onValueChange={(v) => onChange({ forma, cartao: v === NENHUM ? null : v })}
          >
            <SelectTrigger aria-label="Cartão">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NENHUM}>—</SelectItem>
              {CARTOES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
