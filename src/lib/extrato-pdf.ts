import type { Gasto } from "@/lib/ledger";
import { brl } from "@/lib/categorias";

const dataBR = (iso: string) => {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
};

export async function gerarExtratoPDF(opts: {
  gastos: Gasto[];
  periodoRotulo: string;
  escopoRotulo: string;
  nomeArquivo: string;
}) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const linhas = [...opts.gastos].sort((a, b) => a.data.localeCompare(b.data));
  const total = linhas.reduce((s, g) => s + g.valor, 0);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const verde: [number, number, number] = [34, 84, 61];
  const tinta: [number, number, number] = [35, 35, 30];

  doc.setTextColor(...tinta);
  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.text("MEU LIVRO CONTÁBIL", 14, 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Extrato de gastos", 14, 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Período: ${opts.periodoRotulo}`, 14, 29);
  doc.text(`Escopo: ${opts.escopoRotulo}`, 14, 34);
  doc.setDrawColor(...tinta);
  doc.setLineWidth(0.2);
  doc.line(14, 38, W - 14, 38);

  autoTable(doc, {
    startY: 42,
    head: [["Data", "Categoria", "Local", "Descrição", "Pagamento", "Cartão", "Valor"]],
    body: linhas.map((g) => [
      dataBR(g.data),
      g.categoria,
      g.local ?? "",
      g.descricao ?? "",
      g.forma_pagamento ?? "",
      g.cartao ?? "",
      brl(g.valor),
    ]),
    theme: "plain",
    styles: { fontSize: 9, textColor: tinta, cellPadding: 1.8 },
    headStyles: { fontStyle: "bold", textColor: verde },
    columnStyles: {
      0: { font: "courier", cellWidth: 26 },
      6: { font: "courier", halign: "right", cellWidth: 32 },
    },
    didDrawCell: (d) => {
      if (d.section === "body" || d.section === "head") {
        doc.setDrawColor(200, 196, 180);
        doc.setLineWidth(0.1);
        doc.line(d.cell.x, d.cell.y + d.cell.height, d.cell.x + d.cell.width, d.cell.y + d.cell.height);
      }
    },
    margin: { left: 14, right: 14 },
  });

  const y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 50) + 6;
  doc.setDrawColor(...tinta);
  doc.setLineWidth(0.2);
  doc.line(14, y, W - 14, y);
  doc.line(14, y + 1, W - 14, y + 1);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`Total (${linhas.length} lançamento${linhas.length === 1 ? "" : "s"})`, 14, y + 7);
  doc.setFont("courier", "bold");
  doc.setTextColor(...verde);
  doc.text(brl(total), W - 14, y + 7, { align: "right" });

  doc.save(opts.nomeArquivo);
}
