-- =============================================================
-- Migração 9: foto do talento
-- - Quem envia: o mesmo grupo que já altera talentos (policy talentos_write):
--   diretoria executiva, diretora comercial e analistas comerciais.
-- - Bucket público "talentos" (imagem pública do talento), nomes de arquivo aleatórios:
--   talentos/{id do talento}/{arquivo}.webp
-- =============================================================

alter table public.talentos add column foto_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('talentos', 'talentos', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy talentos_foto_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'talentos' and public.tem_perfil('diretoria_executiva', 'diretora_comercial', 'analista_comercial'));
create policy talentos_foto_delete on storage.objects for delete to authenticated
  using (bucket_id = 'talentos' and public.tem_perfil('diretoria_executiva', 'diretora_comercial', 'analista_comercial'));

notify pgrst, 'reload schema';
