-- =============================================================
-- Migração 8: foto de perfil
-- - Cada pessoa troca a própria foto (nome, e-mail e perfil continuam com a diretoria).
-- - Bucket público "avatares": a foto aparece sem link temporário; o nome do arquivo é aleatório.
-- - Cada pessoa só grava na própria pasta: avatares/{id do usuário}/{arquivo}.webp
-- =============================================================

alter table public.profiles add column foto_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy avatares_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text and public.usuario_ativo());
create policy avatares_update on storage.objects for update to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatares_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

-- profiles só aceita escrita da diretoria (RLS); esta função libera só a própria foto.
create or replace function public.definir_minha_foto(p_path text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.usuario_ativo() then
    raise exception 'Usuário sem acesso ativo' using errcode = '42501';
  end if;
  if p_path is not null and p_path not like auth.uid()::text || '/%' then
    raise exception 'A foto precisa estar na sua pasta' using errcode = '42501';
  end if;
  update public.profiles set foto_path = p_path where id = auth.uid();
end $$;

revoke execute on function public.definir_minha_foto(text) from public, anon;
grant execute on function public.definir_minha_foto(text) to authenticated;

notify pgrst, 'reload schema';
