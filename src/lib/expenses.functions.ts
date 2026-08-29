import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CATEGORIAS } from "@/lib/categorias";

type Entrada = { texto: string; hoje: string };

export const criarGastoPorTexto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Entrada) => {
    if (!input || typeof input.texto !== "string" || input.texto.trim().length < 3) {
      throw new Error("Escreva uma frase descrevendo o gasto.");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.hoje ?? "")) {
      throw new Error("Data inválida.");
    }
    return { texto: input.texto.trim().slice(0, 500), hoje: input.hoje };
  })
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Serviço de IA indisponível.");

    const prompt = [
      "Você extrai dados de gastos pessoais a partir de texto livre em português do Brasil.",
      `A data de hoje é ${data.hoje} (formato YYYY-MM-DD).`,
      "Resolva datas relativas como 'ontem', 'anteontem', 'semana passada' a partir dela.",
      `Categorias permitidas (escolha exatamente uma): ${CATEGORIAS.join(", ")}.`,
      "Responda APENAS com um JSON estrito, sem markdown, no formato:",
      '{"valor": number, "categoria": string, "descricao": string, "data": "YYYY-MM-DD"}',
      "A descrição deve ser curta (até 40 caracteres). Se não houver data explícita, use hoje.",
      `Texto: ${data.texto}`,
    ].join("\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (res.status === 429) throw new Error("Muitas solicitações. Tente de novo em instantes.");
    if (!res.ok) {
      console.error("AI gateway error", res.status, await res.text());
      throw new Error("Não consegui interpretar o texto agora.");
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Não consegui interpretar o texto.");

    let parsed: { valor?: unknown; categoria?: unknown; descricao?: unknown; data?: unknown };
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      throw new Error("Não consegui interpretar o texto.");
    }

    const valor = Number(parsed.valor);
    if (!Number.isFinite(valor) || valor <= 0) throw new Error("Não identifiquei o valor do gasto.");

    const categoria = CATEGORIAS.includes(parsed.categoria as never)
      ? (parsed.categoria as string)
      : "Outros";
    const dataGasto =
      typeof parsed.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.data)
        ? parsed.data
        : data.hoje;
    const descricao =
      typeof parsed.descricao === "string" ? parsed.descricao.slice(0, 80) : null;

    const { data: row, error } = await context.supabase
      .from("expenses")
      .insert({
        user_id: context.userId,
        valor: Math.round(valor * 100) / 100,
        categoria,
        data: dataGasto,
        descricao,
        via_ia: true,
      })
      .select("id, valor, categoria, data, descricao, via_ia")
      .single();

    if (error) throw new Error(error.message);
    return row;
  });
