-- Migration: 013_workspace_bucket.sql
-- Criação do Bucket Storage para arquivos temporários/específicos de clientes (Workspace Docs)

insert into storage.buckets (id, name, public) 
values ('client_documents', 'client_documents', false)
on conflict (id) do nothing;

create policy "client_documents_insert" 
    on storage.objects for insert 
    with check (
        bucket_id = 'client_documents' 
        and auth.role() = 'authenticated'
        and (storage.foldername(name))[1] = get_user_org_id()::text
    );

create policy "client_documents_select" 
    on storage.objects for select 
    using (
        bucket_id = 'client_documents' 
        and auth.role() = 'authenticated'
        and (storage.foldername(name))[1] = get_user_org_id()::text
    );

create policy "client_documents_delete" 
    on storage.objects for delete 
    using (
        bucket_id = 'client_documents' 
        and auth.role() = 'authenticated'
        and (storage.foldername(name))[1] = get_user_org_id()::text
    );
