# Meu Livro Contábil

Controle de Gastos — app pessoal de livro-caixa

Contexto

Quero um app pessoal de controle de gastos, em português (pt-BR), moeda R$ (BRL). Uso único — só eu vou acessar.

Autenticação

Ativa login simples por e-mail/senha (Supabase Auth). A tabela de gastos deve ter Row Level Security restringindo cada usuário a ver e editar só os próprios registros. É dado financeiro pessoal — não deve ficar acessível por link público sem login.

Modelo de dados (Supabase)

Tabela expenses:

id: uuid, chave primária

user_id: uuid, referência a auth.users

valor: numeric(10,2)

categoria: text (uma das: Moradia, Alimentação, Transporte, Saúde, Lazer, Educação, Compras, Outros)

data: date

descricao: text, opcional

via_ia: boolean, default false

created_at: timestamptz, default now()

Telas e funcionalidades

Cabeçalho

Navegação entre meses (seta anterior/próximo), com o mês atual como padrão ao abrir.

Card de total do mês

Total gasto no mês selecionado.

Comparação percentual com o total do mês anterior (indicador de alta ou queda).

Divisão por categoria

Lista ou barras horizontais com o total gasto por categoria no mês selecionado, ordenado do maior para o menor.

Adicionar gasto — duas formas, em abas

Texto livre: um campo de texto onde eu digito algo como "gastei 45 no ifood ontem". Uma Supabase Edge Function recebe esse texto + a data de hoje, chama a API do Gemini (camada gratuita, secret GEMINI_API_KEY) pedindo resposta em JSON estrito com os campos valor, categoria (restrita à lista fixa abaixo), descricao (curta) e data (resolvendo datas relativas como "ontem" ou "semana passada" a partir da data de hoje enviada). O resultado parseado vira um novo registro com via_ia = true.

Campos estruturados: valor, categoria (select com a lista fixa), data (padrão hoje), descrição (opcional). Salva direto com via_ia = false.

Lista de lançamentos do mês

Ordenada por data, mais recente primeiro. Cada linha mostra data, categoria, descrição, valor, uma tag "IA" quando via_ia = true, e um botão de excluir.

Categorias fixas

Moradia, Alimentação, Transporte, Saúde, Lazer, Educação, Compras, Outros

Direção visual

Estética de livro-caixa / talão de cheques: números em fonte monoespaçada (tabular), linha dupla separando o total do mês, lista de lançamentos com linhas horizontais discretas entre os itens, paleta discreta em tom de papel com verde escuro como cor de destaque. Mobile-first, layout de uma coluna só, sem branding do Lovable visível.

Fora de escopo por enquanto

Sem multiusuário além de mim mesmo, sem integração bancária, sem metas/alertas de orçamento.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1f881373-2670-4c7c-9636-6894beab0827).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
