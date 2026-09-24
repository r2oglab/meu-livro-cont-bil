ALTER TABLE public.expenses
  ADD COLUMN local text,
  ADD COLUMN forma_pagamento text CHECK (forma_pagamento IN ('Débito','Crédito','Pix')),
  ADD COLUMN cartao text CHECK (cartao IN ('Meu cartão','Cartão do irmão'));
ALTER TABLE public.expenses ADD CONSTRAINT expenses_cartao_credito CHECK (cartao IS NULL OR forma_pagamento = 'Crédito');
ALTER TABLE public.recurring_expenses
  ADD COLUMN local text,
  ADD COLUMN forma_pagamento text CHECK (forma_pagamento IN ('Débito','Crédito','Pix')),
  ADD COLUMN cartao text CHECK (cartao IN ('Meu cartão','Cartão do irmão'));
ALTER TABLE public.recurring_expenses ADD CONSTRAINT recurring_cartao_credito CHECK (cartao IS NULL OR forma_pagamento = 'Crédito');