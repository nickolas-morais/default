-- Rode UMA vez no SQL Editor do Supabase, depois de criar o primeiro usuário
-- em Authentication → Users → Add user (com e-mail e senha).
-- A partir daí, os demais usuários são convidados pela tela /admin/usuarios.

insert into public.profiles (id, nome, email, perfil)
select id, 'Nickolas Morais', email, 'diretoria_executiva'
from auth.users
where email = 'nickolsctt@gmail.com';
