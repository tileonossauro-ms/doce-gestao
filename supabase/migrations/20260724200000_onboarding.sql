-- Doce Gestão — tour de primeira vez.
-- Guarda no perfil se a confeiteira já viu o tour de boas-vindas (some depois de visto;
-- ela pode rever em Configurações, que volta isto para false). Não é campo protegido:
-- o próprio usuário marca como visto. Re-executável.
alter table perfis add column if not exists onboarding_visto boolean not null default false;
