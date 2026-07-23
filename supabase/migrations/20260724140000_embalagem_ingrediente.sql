-- Doce Gestão — ingrediente: comprar por embalagem, usar por unidade-base.
-- A confeiteira informa o tamanho da embalagem que compra (ex.: 1000 g) e o preço dela;
-- o sistema calcula custo_unitario = preco_embalagem / tamanho_embalagem (custo por unidade de uso).
-- custo_unitario continua sendo a fonte de verdade do cálculo de custo (nada muda downstream).

alter table ingredientes add column if not exists tamanho_embalagem numeric;
alter table ingredientes add column if not exists preco_embalagem numeric;

-- Backfill: quem já tinha custo por unidade vira "embalagem de tamanho 1 pelo mesmo custo"
-- (assim custo_unitario = preco_embalagem / 1 = custo antigo — nada muda no cálculo).
update ingredientes
   set tamanho_embalagem = 1, preco_embalagem = custo_unitario
 where preco_embalagem is null and custo_unitario is not null;
