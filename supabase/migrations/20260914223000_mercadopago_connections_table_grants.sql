-- PostgREST exige privilégio de tabela (has_table_privilege), não só GRANT por coluna.
-- Sem INSERT/UPDATE na tabela, o upsert do callback falha com permission denied.

GRANT INSERT, UPDATE, DELETE ON TABLE public.mercadopago_connections TO authenticated;
