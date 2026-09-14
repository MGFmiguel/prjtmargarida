export async function userFixture(page, role = 'usuario', ready = true) {
  await page.route('**/js/supabase.js', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `
    const user={id:'44444444-4444-4444-8444-444444444444',email:'alice@example.invalid'};
    const tomorrow=new Date(Date.now()+86400000).toISOString();
    const initial={perfis:[{id:'p1',user_id:user.id,nome:'Alice Teste',email:user.email,role:'${role}',data_nascimento:'1990-01-01',cpf:'52998224725',telefone:'92999999999'}],
      servicos:[{id:'s1',nome:'Atendimento social',ativo:true}],
      consultas:[{id:'a1',tipo_atendimento:'Atendimento social',profissional:'Profissional de teste',data_atendimento:tomorrow,local:'Sala 1',status:'Confirmada',observacao_usuario:'Chegue com antecedência'},{id:'a2',tipo_atendimento:'Orientação',profissional:'Profissional de teste',data_atendimento:new Date(Date.now()-86400000).toISOString(),local:'Sala 2',status:'Realizada'}],
      solicitacoes:[],notificacoes:[{id:'n1',usuario_id:user.id,titulo:'Bem-vinda',mensagem:'Seu espaço está pronto.',lida:false,created_at:new Date().toISOString()}]};
    const db=JSON.parse(sessionStorage.getItem('user-test-db')||'null')||initial;
    const save=()=>sessionStorage.setItem('user-test-db',JSON.stringify(db));save();
    function query(table){let action='read',payload,filters=[],single=false,from=0,to=99999;const q={select(){return q},order(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},range(a,b){from=a;to=b;return q},maybeSingle(){single=true;return q},single(){single=true;return q},insert(v){action='insert';payload=v;return q},update(v){action='update';payload=v;return q},then(resolve,reject){try{Object.assign(db,JSON.parse(sessionStorage.getItem('user-test-db')));let rows=db[table].filter(r=>filters.every(f=>f(r)));if(action==='insert'){const r={id:crypto.randomUUID(),status:'Pendente',created_at:new Date().toISOString(),...payload};db[table].push(r);rows=[r];sessionStorage.setItem('user-last-insert',JSON.stringify({table,payload}));}if(action==='update')rows.forEach(r=>Object.assign(r,payload));save();resolve({data:single?rows[0]??null:rows.slice(from,to+1),error:null});}catch(e){reject(e)}}};return q;}
    export const configured=true;
    export const supabase={from:query,rpc(name){if(name==='cadastro_disponivel')return Promise.resolve({data:${ready},error:null});if(name==='minhas_consultas')return query('consultas');if(name==='minhas_solicitacoes'){db.solicitacoes.forEach(s=>s.servico='Atendimento social');save();return query('solicitacoes');}},
      auth:{getUser:async()=>({data:{user},error:null}),onAuthStateChange:()=>{},signOut:async()=>({error:null}),
        signUp:async options=>{window.signupPayload=options;return {data:{user,session:null},error:null};},
        signInWithPassword:async()=>({data:{user,session:{}},error:null}),
        resetPasswordForEmail:async(email,options)=>{window.resetOptions=options;return {error:null};}},
      storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl:''},error:null})})}};
    export function requireConnection(){return supabase;}
  `,
    })
  );
}
