export const CATEGORIAS = [
  "Moradia",
  "Alimentação",
  "Transporte",
  "Saúde",
  "Lazer",
  "Educação",
  "Compras",
  "Outros",
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** Retorna [inicio, fim] no formato YYYY-MM-DD para o mês (ano, mes 0-index). */
export function rangeMes(ano: number, mes: number): [string, string] {
  const p = (n: number) => String(n).padStart(2, "0");
  const ultimo = new Date(ano, mes + 1, 0).getDate();
  return [`${ano}-${p(mes + 1)}-01`, `${ano}-${p(mes + 1)}-${p(ultimo)}`];
}

export function hojeISO() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function formatarDataCurta(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}
