import { test, expect } from '@playwright/test';
// UI contract tests: a fake SDK isolates form behavior; SQL permissions are tested separately.
async function mockSupabase(page, role = 'admin') {
  await page.route('**/js/supabase.js', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `
    const user={id:'11111111-1111-4111-8111-111111111111'};
    const db={perfis:[{id:'p1',user_id:user.id,nome:'Equipe de teste',email:'teste@example.com',role:'${role}',created_at:'2026-09-01'}],beneficiarias:[{id:'b1',usuario_id:'u1',nome:'Pessoa fictícia',status:'Pendente',tipo_atendimento:'Social',created_at:'2026-09-01'}],atendimentos:[],profissionais:[],solicitacoes:[{id:'req1',usuario_id:'u1',servico_id:'s1',status:'Aprovada',data_preferencia:'2026-10-01',horario_preferencia:'10:00',motivo:'Teste'}],servicos:[{id:'s1',nome:'Serviço de teste',descricao:'Descrição de teste',ativo:true,created_at:'2026-09-01'}],projetos:[],doacoes:[],mensagens:[]};
    function query(table){let action='read',payload,filters=[],single=false,from=0,to=99999;const q={select(){return q},order(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},range(a,b){from=a;to=b;return q},maybeSingle(){single=true;return q},single(){single=true;return q},insert(v){action='insert';payload=v;return q},update(v){action='update';payload=v;return q},delete(){action='delete';return q},then(resolve,reject){try{let rows=db[table].filter(r=>filters.every(f=>f(r)));if(action==='insert'){const r={id:crypto.randomUUID(),created_at:new Date().toISOString(),...payload};db[table].push(r);rows=[r]}if(action==='update')rows.forEach(r=>Object.assign(r,payload));if(action==='delete')db[table]=db[table].filter(r=>!rows.includes(r));const data=single?rows[0]??null:rows.slice(from,to+1);resolve({data,error:null})}catch(e){reject(e)}}};return q;}
    export const configured=true;
    export const supabase={from:query,auth:{getUser:async()=>({data:{user},error:null}),onAuthStateChange:()=>{},signOut:async()=>({error:null})},storage:{from:()=>({list:async()=>({data:[],error:null})})}};
    export function requireConnection(){return supabase;}
  `,
    })
  );
}
test('administrator creates, edits, searches and deletes service', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/servicos.html');
  await page.getByRole('button', { name: 'Cadastrar serviço' }).click();
  await page.getByLabel('Nome do serviço').fill('Oficina de teste');
  await page.getByLabel('Descrição').fill('Uma oficina para testar o cadastro.');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Oficina de teste', exact: true })).toBeVisible();
  await page
    .getByRole('row')
    .filter({ hasText: 'Oficina de teste' })
    .getByRole('button', { name: 'Editar registro' })
    .click();
  await page.getByLabel('Nome do serviço').fill('Oficina editada');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await page.getByRole('searchbox').fill('Oficina editada');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Excluir registro', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Excluir registro', exact: true })
    .click();
  await expect(page.getByRole('cell', { name: 'Oficina editada', exact: true })).toHaveCount(0);
});
test('employee can create and update appointment and cannot open reports', async ({ page }) => {
  await mockSupabase(page, 'funcionario');
  await page.goto('/atendimentos.html');
  await page.getByRole('button', { name: 'Novo atendimento' }).click();
  await page.getByLabel('Beneficiária *').selectOption('b1');
  await page.getByLabel('Tipo de atendimento').fill('Acompanhamento');
  await page.getByLabel('Data e hora').fill('2026-09-11T10:00');
  await page.getByLabel('Descrição').fill('Atendimento fictício para teste.');
  await page
    .getByRole('dialog')
    .getByRole('combobox', { name: 'Status *', exact: true })
    .selectOption('Em atendimento');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Pessoa fictícia' })).toBeVisible();
  await page.getByRole('button', { name: 'Editar registro' }).click();
  await expect(page.getByLabel('Beneficiária *')).toBeDisabled();
  await page
    .getByRole('dialog')
    .getByRole('combobox', { name: 'Status *', exact: true })
    .selectOption('Finalizado');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Finalizado' })).toBeVisible();
  await page.goto('/relatorios.html');
  await expect(page.locator('h1')).toHaveText('Área restrita');
});
test('reports render aggregates and export a CSV', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/relatorios.html');
  await expect(page.locator('.metric')).toHaveCount(8);
  await page.getByLabel('Data inicial').fill('2026-09-01');
  await page.getByLabel('Data final').fill('2026-09-30');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar resumo CSV' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('relatorio-casa-mamae-margarida.csv');
});

test('staff schedules an approved user request in the existing appointments flow', async ({
  page,
}) => {
  await mockSupabase(page, 'funcionario');
  await page.goto('/solicitacoes.html');
  await page.getByRole('button', { name: 'Agendar atendimento' }).click();
  await expect(page.getByLabel('Beneficiária *')).toHaveValue('b1');
  await expect(page.getByLabel('Tipo de atendimento')).toHaveValue('Serviço de teste');
  await page.getByLabel('Descrição interna').fill('Informação restrita à equipe.');
  await page.getByLabel('Orientação visível à usuária').fill('Chegue 10 minutos antes.');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('#notification')).toContainText('Registro salvo');
});
