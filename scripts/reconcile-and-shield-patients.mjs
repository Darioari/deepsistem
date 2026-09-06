import fs from 'fs';
import path from 'path';
import pg from 'pg';
const { Pool } = pg;

// Le .env
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log('DATABASE_URL nao configurada.');
  process.exit(0);
}

const pool = new Pool({ connectionString: databaseUrl });

async function run() {
  const client = await pool.connect();
  try {
    console.log('--- INICIANDO MIGRACAO E RECONCILIACAO DE PACIENTES ---');
    await client.query('BEGIN');

    // 1. Remover termos duplicados de priscila-xavier
    const delTerms = await client.query("DELETE FROM app_records WHERE tenant_id = 'priscila-xavier' AND entity_type = 'terms'");
    console.log('Termos redundantes removidos:', delTerms.rowCount);

    // 2. Migrar registros de priscila-xavier para pripsico
    const migResult = await client.query(`
      UPDATE app_records 
      SET tenant_id = 'pripsico',
          payload = jsonb_set(payload, '{tenant_id}', to_jsonb('pripsico'::text))
      WHERE tenant_id = 'priscila-xavier'
    `);
    console.log('Registros migrados de priscila-xavier para pripsico:', migResult.rowCount);

    // 3. Reconciliar Clarice Lispector e outros de pacientes.json
    const PACIENTES_FILE = path.join(process.cwd(), 'backend', 'data', 'pacientes.json');
    let pacientesArquivo = [];
    if (fs.existsSync(PACIENTES_FILE)) {
      try {
        pacientesArquivo = JSON.parse(fs.readFileSync(PACIENTES_FILE, 'utf8'));
      } catch (e) {
        console.error('Erro ao ler pacientes.json:', e);
      }
    }

    // Obter pacientes existentes no banco sob pripsico
    await client.query("SELECT set_config('app.current_tenant', 'pripsico', true)");
    const dbPatients = await client.query("SELECT record_id, payload FROM app_records WHERE entity_type = 'patients'");
    const existingDbIds = new Set(dbPatients.rows.map(r => r.record_id));

    let inseridosDb = 0;
    for (const p of pacientesArquivo) {
      if (p && p.id && !existingDbIds.has(String(p.id))) {
        const payload = { ...p, tenant_id: 'pripsico' };
        await client.query(`
          INSERT INTO app_records (tenant_id, entity_type, record_id, payload)
          VALUES ('pripsico', 'patients', $1, $2::jsonb)
          ON CONFLICT (tenant_id, entity_type, record_id) DO UPDATE SET payload = EXCLUDED.payload
        `, [String(p.id), JSON.stringify(payload)]);
        existingDbIds.add(String(p.id));
        inseridosDb++;
        console.log('Paciente inserido no PostgreSQL a partir do arquivo local:', p.nome, '(' + p.id + ')');
      }
    }

    await client.query('COMMIT');
    console.log('Transacao PostgreSQL confirmada (COMMIT) com sucesso!');

    // 4. Ler TODOS os pacientes de pripsico agora consolidados
    const allDbPatients = await client.query("SELECT payload FROM app_records WHERE entity_type = 'patients' ORDER BY updated_at DESC");
    const listaConsolidada = allDbPatients.rows.map(r => r.payload);
    console.log('Total de pacientes consolidados no PostgreSQL:', listaConsolidada.length);

    // 5. Salvar de volta no pacientes.json
    fs.mkdirSync(path.dirname(PACIENTES_FILE), { recursive: true });
    fs.writeFileSync(PACIENTES_FILE, JSON.stringify(listaConsolidada, null, 2), 'utf8');
    console.log('Arquivo backend/data/pacientes.json sincronizado com 100% dos pacientes:', listaConsolidada.length);

    console.log('--- RECONCILIACAO CONCLUIDA COM SUCESSO ---');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Erro durante a migracao:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
