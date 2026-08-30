import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Livro-Caixa — Controle de gastos pessoais" },
      {
        name: "description",
        content:
          "Livro-caixa pessoal para registrar gastos em reais, por mês e por categoria, com lançamento por texto livre.",
      },
      { property: "og:title", content: "Livro-Caixa — Controle de gastos pessoais" },
      {
        property: "og:description",
        content:
          "Livro-caixa pessoal para registrar gastos em reais, por mês e por categoria.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      navigate({ to: data.session ? "/livro" : "/auth", replace: true });
    });
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="text-center">
        <p className="num text-[0.7rem] uppercase tracking-[0.3em] text-muted-foreground">
          Controle de gastos
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Livro-Caixa</h1>
        <p className="mt-3 text-sm text-muted-foreground">Abrindo seu livro…</p>
      </div>
    </main>
  );
}
