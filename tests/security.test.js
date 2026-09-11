import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
let db;
const admin = '11111111-1111-4111-8111-111111111111';
const employee = '22222222-2222-4222-8222-222222222222';
const outsider = '33333333-3333-4333-8333-333333333333';
async function as(role, id, fn) {
  await db.exec(
    `set role ${role}; set request.jwt.claim.sub = '${id || ''}'; set request.jwt.claim.role = '${role}';`
  );
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}
const request = `insert into public.beneficiarias(nome,data_nascimento,cpf,telefone,email,endereco,bairro,cidade,motivo_atendimento,tipo_atendimento,consentimento) values ('Pessoa de teste','1990-01-01','52998224725','92999999999','teste@example.com','Endereço de teste','Bairro de teste','Cidade de teste','Solicitação de teste','Atendimento social',true)`;
before(async () => {
  db = new PGlite();
  // Model Supabase-owned schemas only. The application's actual migration is executed below.
  await db.exec(`create role anon nologin; create role authenticated nologin;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$;
    grant usage on schema auth,storage,public to anon,authenticated;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
    alter table storage.objects enable row level security;
    grant select,insert,delete on storage.objects to anon,authenticated;
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;
    create function storage.extension(name text) returns text language sql immutable as $$ select reverse(split_part(reverse(name),'.',1)) $$;
    insert into auth.users values ('${admin}'),('${employee}'),('${outsider}');`);
  const sql = (
    await readFile(new URL('../database/supabase.sql', import.meta.url), 'utf8')
  ).replace(
    'create extension if not exists pgcrypto;',
    '-- gen_random_uuid is built into the test PostgreSQL engine.'
  );
  await db.exec(sql);
  await db.exec(`insert into public.perfis(user_id,nome,email,role) values ('${admin}','Admin teste','admin@example.com','admin'),('${employee}','Equipe teste','equipe@example.com','funcionario');
    insert into public.servicos(nome,descricao,ativo) values ('Serviço ativo','Descrição do serviço',true),('Serviço privado','Descrição do serviço',false);`);
});
after(async () => {
  await db?.close();
});
test('anonymous visitor can submit but cannot read personal data or override workflow', async () => {
  await as('anon', null, async () => {
    await db.exec(request);
    await assert.rejects(db.query('select * from public.beneficiarias'), /permission denied/);
    await assert.rejects(
      db.exec(
        request
          .replace('consentimento)', 'consentimento,status)')
          .replace('true)', "true,'Finalizado')")
      ),
      /permission denied/
    );
    const { rows } = await db.query('select nome from public.servicos');
    assert.deepEqual(
      rows.map((r) => r.nome),
      ['Serviço ativo']
    );
  });
});
test('unapproved authenticated account cannot read beneficiaries or grant itself admin', async () => {
  await as('authenticated', outsider, async () => {
    assert.equal((await db.query('select * from public.beneficiarias')).rows.length, 0);
    await assert.rejects(
      db.exec(
        `insert into public.perfis(user_id,nome,email,role) values ('${outsider}','Intruso teste','intruso@example.com','admin')`
      ),
      /row-level security/
    );
    await assert.rejects(
      db.exec(
        request
          .replace('consentimento)', 'consentimento,status)')
          .replace('true)', "true,'Finalizado')")
      ),
      /row-level security/
    );
  });
});
test('employees can consult and update status, but cannot edit personal identity or delete', async () => {
  await as('authenticated', employee, async () => {
    assert.ok((await db.query('select * from public.beneficiarias')).rows.length);
    await db.exec("update public.beneficiarias set status='Em análise'");
    await assert.rejects(
      db.exec("update public.beneficiarias set nome='Nome alterado'"),
      /somente o status/
    );
    assert.equal((await db.query('delete from public.beneficiarias returning id')).rows.length, 0);
    await assert.rejects(
      db.exec(
        "insert into public.servicos(nome,descricao) values ('Não permitido','Descrição inválida')"
      ),
      /row-level security/
    );
    assert.equal((await db.query('select * from public.doacoes')).rows.length, 0);
  });
});
test('admin can create services and authorize accounts, but cannot remove own profile', async () => {
  await as('authenticated', admin, async () => {
    await db.exec(
      "insert into public.servicos(nome,descricao) values ('Novo serviço','Descrição do novo serviço')"
    );
    assert.equal(
      (await db.query(`delete from public.perfis where user_id='${admin}' returning id`)).rows
        .length,
      0
    );
    await db.exec(
      `insert into public.perfis(user_id,nome,email,role) values ('${outsider}','Nova equipe','nova@example.com','funcionario')`
    );
    await db.exec(`delete from public.perfis where user_id='${outsider}'`);
  });
});
test('server rejects invalid CPF, absent consent and inverted project dates', async () => {
  await as('anon', null, async () => {
    await assert.rejects(
      db.exec(request.replace('52998224725', '11111111111')),
      /check constraint/
    );
    await assert.rejects(
      db.exec(request.replace('true)', 'false)')),
      /row-level security|check constraint/
    );
  });
  await as('authenticated', admin, async () => {
    await assert.rejects(
      db.exec(
        "insert into public.projetos(nome,descricao,data_inicio,data_fim) values ('Projeto teste','Descrição teste','2026-09-10','2026-09-01')"
      ),
      /check constraint/
    );
  });
});
test('appointments preserve relationship and deny employee reassignment', async () => {
  const {
    rows: [b],
  } = await db.query('select id from public.beneficiarias limit 1');
  await as('authenticated', employee, async () => {
    await db.exec(
      `insert into public.atendimentos(beneficiaria_id,funcionario_id,tipo_atendimento,data_atendimento,descricao) values ('${b.id}','${employee}','Social',now(),'Primeiro encontro')`
    );
    await db.exec("update public.atendimentos set status='Finalizado'");
    await assert.rejects(
      db.exec(`update public.atendimentos set funcionario_id='${admin}'`),
      /imutáveis/
    );
  });
  await as('authenticated', admin, async () => {
    await assert.rejects(
      db.exec(`delete from public.beneficiarias where id='${b.id}'`),
      /foreign key/
    );
  });
});
test('private storage denies public documents and public uploads', async () => {
  await as('authenticated', admin, async () => {
    await db.exec(
      `insert into storage.objects(bucket_id,name,metadata) values ('casa-mamae-margarida','documentos/autorizado.pdf','{"mimetype":"application/pdf"}'),('casa-mamae-margarida','institucional/foto.jpg','{"mimetype":"image/jpeg"}')`
    );
    await assert.rejects(
      db.exec(
        `insert into storage.objects(bucket_id,name,metadata) values ('casa-mamae-margarida','institucional/documento.pdf','{"mimetype":"application/pdf"}')`
      ),
      /row-level security/
    );
  });
  await as('anon', null, async () => {
    assert.deepEqual(
      (await db.query('select name from storage.objects')).rows.map((r) => r.name),
      ['institucional/foto.jpg']
    );
    await assert.rejects(
      db.exec(
        "insert into storage.objects(bucket_id,name) values ('casa-mamae-margarida','documentos/publico.pdf')"
      ),
      /row-level security/
    );
  });
  await as('authenticated', outsider, async () =>
    assert.equal(
      (await db.query("select * from storage.objects where name like 'documentos/%'")).rows.length,
      0
    )
  );
  await as('authenticated', employee, async () =>
    assert.equal(
      (await db.query("select * from storage.objects where name like 'documentos/%'")).rows.length,
      1
    )
  );
});
