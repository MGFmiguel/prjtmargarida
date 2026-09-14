import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
let db;
const admin = '11111111-1111-4111-8111-111111111111',
  employee = '22222222-2222-4222-8222-222222222222';
const alice = '44444444-4444-4444-8444-444444444444',
  bea = '55555555-5555-4555-8555-555555555555';
let service, request, appointment, aliceBeneficiary, beaBeneficiary, professional;
async function as(id, fn, role = 'authenticated') {
  await db.exec(
    `set role ${role};set request.jwt.claim.sub='${id || ''}';set request.jwt.claim.role='${role}';`
  );
  try {
    return await fn();
  } finally {
    await db.exec("reset role;set request.jwt.claim.sub='';set request.jwt.claim.role='';");
  }
}
before(async () => {
  db = new PGlite();
  await db.exec(`create role anon nologin;create role authenticated nologin;create schema auth;create schema storage;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.role() returns text language sql stable as $$select current_setting('request.jwt.claim.role',true)$$;
    grant usage on schema public,auth,storage to anon,authenticated;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
    alter table storage.objects enable row level security;grant select,insert,update,delete on storage.objects to anon,authenticated;
    create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;
    create function storage.extension(name text) returns text language sql immutable as $$select reverse(split_part(reverse(name),'.',1))$$;`);
  await db.exec(
    (await readFile(new URL('../database/supabase.sql', import.meta.url), 'utf8')).replace(
      'create extension if not exists pgcrypto;',
      ''
    )
  );
  await db.exec(`insert into auth.users(id,email) values('${admin}','admin@example.invalid'),('${employee}','equipe@example.invalid');
    insert into public.perfis(user_id,nome,email,role) values('${admin}','Admin teste','admin@example.invalid','admin'),('${employee}','Equipe teste','equipe@example.invalid','funcionario');`);
  await db.exec(
    await readFile(new URL('../database/migrations/002_area_usuario.sql', import.meta.url), 'utf8')
  );
  for (const [id, name, cpf] of [
    [alice, 'Alice Teste', '52998224725'],
    [bea, 'Beatriz Teste', '11144477735'],
  ]) {
    await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)', [
      id,
      `${id}@example.invalid`,
      {
        cadastro_cmm: true,
        consentimento: true,
        nome: name,
        cpf,
        data_nascimento: '1990-01-01',
        telefone: '92999999999',
        role: 'admin',
      },
    ]);
  }
  aliceBeneficiary = (
    await db.query('select id from public.beneficiarias where usuario_id=$1', [alice])
  ).rows[0].id;
  beaBeneficiary = (
    await db.query('select id from public.beneficiarias where usuario_id=$1', [bea])
  ).rows[0].id;
  service = (
    await db.query(
      "insert into public.servicos(nome,descricao) values('Serviço teste','Descrição do serviço') returning id"
    )
  ).rows[0].id;
  professional = (
    await db.query(
      "insert into public.profissionais(nome,especialidade) values('Profissional teste','Psicologia') returning id"
    )
  ).rows[0].id;
});
after(async () => {
  await db?.close();
});
test('migration preserves staff and signup atomically creates usuario and a new linked beneficiary', async () => {
  const { rows } = await db.query('select user_id,role from public.perfis order by user_id');
  assert.deepEqual(
    rows.map((r) => r.role),
    ['admin', 'funcionario', 'usuario', 'usuario']
  );
  assert.notEqual(aliceBeneficiary, beaBeneficiary);
  assert.equal((await db.query('select count(*)::int as n from public.notificacoes')).rows[0].n, 2);
  await assert.rejects(
    db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)', [
      '66666666-6666-4666-8666-666666666666',
      'invalid@example.invalid',
      {
        cadastro_cmm: true,
        consentimento: true,
        nome: 'Inválida',
        cpf: '11111111111',
        data_nascimento: '1990-01-01',
        telefone: '92999999999',
      },
    ]),
    /inválidos/
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int as n from auth.users where email='invalid@example.invalid'"
      )
    ).rows[0].n,
    0
  );
});
test('usuario sees only own profile and can only edit phone and own avatar path', async () => {
  await as(alice, async () => {
    assert.equal((await db.query('select * from public.perfis')).rows.length, 1);
    await assert.rejects(
      db.exec("update public.perfis set role='admin'"),
      /alterados|row-level security/
    );
    await assert.rejects(db.exec("update public.perfis set cpf='11144477735'"), /alterados/);
    await assert.rejects(
      db.exec(`update public.perfis set foto_url='avatares/${bea}/foto.jpg'`),
      /pertencer/
    );
    await db.exec("update public.perfis set telefone='92988888888'");
    assert.equal((await db.query('select * from public.beneficiarias')).rows.length, 0);
    assert.equal((await db.query('select * from public.atendimentos')).rows.length, 0);
  });
  assert.equal(
    (await db.query('select telefone from public.beneficiarias where usuario_id=$1', [alice]))
      .rows[0].telefone,
    '92988888888'
  );
});
test('usuario cannot forge owner/status, read others requests or edit administrative status', async () => {
  await as(alice, async () => {
    const insert = `insert into public.solicitacoes(usuario_id,servico_id,motivo,data_preferencia,horario_preferencia) values($1,$2,'Pedido de teste',current_date+1,'10:00') returning id`;
    request = (await db.query(insert, [alice, service])).rows[0].id;
    await assert.rejects(db.query(insert, [bea, service]), /row-level security/);
    await assert.rejects(
      db.exec(
        `insert into public.solicitacoes(usuario_id,servico_id,motivo,data_preferencia,horario_preferencia,status) values('${alice}','${service}','Teste',current_date+1,'10:00','Aprovada')`
      ),
      /row-level security/
    );
    assert.equal(
      (await db.query("update public.solicitacoes set status='Aprovada' returning id")).rows.length,
      0
    );
    assert.equal((await db.query('select * from public.minhas_solicitacoes()')).rows.length, 1);
  });
  await as(bea, async () => {
    assert.equal(
      (await db.query('select * from public.solicitacoes where id=$1', [request])).rows.length,
      0
    );
    assert.equal((await db.query('select * from public.minhas_solicitacoes()')).rows.length, 0);
  });
});
test('staff approves and schedules a request; notifications and safe consultations follow ownership', async () => {
  await as(employee, async () => {
    await db.query("update public.solicitacoes set status='Aprovada' where id=$1", [request]);
    await assert.rejects(
      db.query('update public.solicitacoes set usuario_id=$1 where id=$2', [bea, request]),
      /Somente o status/
    );
    await assert.rejects(
      db.query(
        "insert into public.atendimentos(beneficiaria_id,funcionario_id,solicitacao_id,profissional_id,tipo_atendimento,data_atendimento,descricao,status) values($1,$2,$3,$4,'Teste',now()+interval '1 day','SEGREDO','Agendada')",
        [beaBeneficiary, employee, request, professional]
      ),
      /pertencer/
    );
    appointment = (
      await db.query(
        "insert into public.atendimentos(beneficiaria_id,funcionario_id,solicitacao_id,profissional_id,tipo_atendimento,data_atendimento,descricao,observacao,observacao_usuario,local,status) values($1,$2,$3,$4,'Consulta',now()+interval '1 day','DESCRICAO INTERNA','SEGREDO INTERNO','Chegue com antecedência','Sala 1','Agendada') returning id",
        [aliceBeneficiary, employee, request, professional]
      )
    ).rows[0].id;
  });
  await as(alice, async () => {
    const { rows } = await db.query('select * from public.minhas_consultas()');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].profissional, 'Profissional teste');
    assert.equal(rows[0].observacao_usuario, 'Chegue com antecedência');
    assert.equal('descricao' in rows[0], false);
    assert.equal('observacao' in rows[0], false);
    assert.equal(JSON.stringify(rows).includes('INTERNO'), false);
    assert.equal(
      (await db.query('select * from public.atendimentos where id=$1', [appointment])).rows.length,
      0
    );
    assert.equal((await db.query('select * from public.notificacoes')).rows.length, 3);
  });
  await as(bea, async () =>
    assert.equal((await db.query('select * from public.minhas_consultas()')).rows.length, 0)
  );
  await as(
    null,
    async () => {
      await assert.rejects(
        db.query('select * from public.minhas_consultas()'),
        /permission denied/
      );
    },
    'anon'
  );
});
test('rescheduling and completion preserve history, close request and generate notifications', async () => {
  await as(admin, async () => {
    await db.query(
      "update public.atendimentos set status='Reagendada',data_atendimento=now()+interval '2 days' where id=$1",
      [appointment]
    );
    await db.query("update public.atendimentos set status='Realizada' where id=$1", [appointment]);
  });
  await as(alice, async () => {
    assert.equal(
      (await db.query('select status from public.minhas_consultas()')).rows[0].status,
      'Realizada'
    );
    assert.equal(
      (await db.query('select status from public.minhas_solicitacoes()')).rows[0].status,
      'Concluída'
    );
    const own = (await db.query('select id from public.notificacoes limit 1')).rows[0].id;
    await db.query('update public.notificacoes set lida=true where id=$1', [own]);
    await assert.rejects(
      db.exec("update public.notificacoes set mensagem='Falsificada'"),
      /permission denied/
    );
  });
  await as(bea, async () => {
    assert.equal(
      (
        await db.query(
          'update public.notificacoes set lida=true where usuario_id=$1 returning id',
          [alice]
        )
      ).rows.length,
      0
    );
  });
});
test('own avatar is private and usuario never gains document or other avatar access', async () => {
  await db.exec(
    `insert into storage.objects(bucket_id,name,metadata) values('casa-mamae-margarida','documentos/equipe.pdf','{"mimetype":"application/pdf"}')`
  );
  await as(alice, async () => {
    await db.exec(
      `insert into storage.objects(bucket_id,name,metadata) values('casa-mamae-margarida','avatares/${alice}/foto.jpg','{"mimetype":"image/jpeg"}')`
    );
    await assert.rejects(
      db.exec(
        `insert into storage.objects(bucket_id,name,metadata) values('casa-mamae-margarida','avatares/${bea}/foto.jpg','{"mimetype":"image/jpeg"}')`
      ),
      /row-level security/
    );
    assert.equal(
      (await db.query("select * from storage.objects where name like 'documentos/%'")).rows.length,
      0
    );
  });
  await as(bea, async () =>
    assert.equal(
      (await db.query("select * from storage.objects where name like 'avatares/%'")).rows.length,
      0
    )
  );
  await as(
    null,
    async () =>
      assert.equal(
        (await db.query("select * from storage.objects where name like 'avatares/%'")).rows.length,
        0
      ),
    'anon'
  );
});
