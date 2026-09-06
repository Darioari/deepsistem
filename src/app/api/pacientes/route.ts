import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { authorizedTenant, forbidden } from '@/lib/auth-session';
import { postgresEnabled, withTenantDatabase } from '@/lib/postgres';
import { canonicalTenant, tenantAliases } from '@/lib/tenant';

const PACIENTES_FILE = path.join(process.cwd(), 'backend', 'data', 'pacientes.json');

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function lerJSON<T>(filePath: string, defaultVal: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2));
      return defaultVal;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content) as T;
  } catch {
    return defaultVal;
  }
}

function escreverJSON(filePath: string, data: unknown): boolean {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
    return true;
  } catch {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch {
      return false;
    }
  }
}

function sincronizarPacientesEmArquivo(novosOuAtualizados: Record<string, unknown>[], tenantCanonical: string) {
  try {
    const existentes = lerJSON<Record<string, unknown>[]>(PACIENTES_FILE, []);
    const mapa = new Map<string, Record<string, unknown>>();
    for (const item of existentes) {
      if (item && item.id) {
        mapa.set(String(item.id), item);
      }
    }
    for (const item of novosOuAtualizados) {
      if (item && item.id) {
        mapa.set(String(item.id), {
          ...item,
          tenant_id: item.tenant_id ? canonicalTenant(item.tenant_id) : tenantCanonical,
        });
      }
    }
    escreverJSON(PACIENTES_FILE, Array.from(mapa.values()));
  } catch (err) {
    console.error('[pacientes] Falha ao sincronizar arquivo local:', err);
  }
}

export async function GET(request: Request) {
  const rawTenant = authorizedTenant(request);
  if (!rawTenant) return forbidden();
  const tenant_id = canonicalTenant(rawTenant);
  const aliases = tenantAliases(tenant_id);
  const headers = { 'Cache-Control': 'private, no-store, max-age=0' };

  if (postgresEnabled()) {
    try {
      // 1. Busca pacientes no PostgreSQL
      const pacientesDb = await withTenantDatabase(tenant_id, database =>
        database.list<Record<string, unknown>>('patients')
      );

      // 2. Self-healing: reconciliar dados de pacientes.json que porventura não estejam no Postgres
      const pacientesArquivo = lerJSON<Record<string, unknown>[]>(PACIENTES_FILE, []);
      const dbIds = new Set(pacientesDb.map(p => String(p.id)));
      const faltantesNoDb = pacientesArquivo.filter(
        p => p && p.id && !dbIds.has(String(p.id)) && aliases.includes(canonicalTenant(p.tenant_id || 'pripsico'))
      );

      if (faltantesNoDb.length > 0) {
        for (const faltante of faltantesNoDb) {
          try {
            await withTenantDatabase(tenant_id, database =>
              database.put('patients', String(faltante.id), {
                ...faltante,
                tenant_id,
              })
            );
            pacientesDb.push({ ...faltante, tenant_id });
          } catch (e) {
            console.error('[pacientes] Falha ao fazer upsert de paciente faltante no DB:', e);
          }
        }
      }

      // 3. Atualizar o arquivo local de contingência com todos os pacientes do DB
      sincronizarPacientesEmArquivo(pacientesDb, tenant_id);

      return NextResponse.json(pacientesDb, { headers });
    } catch (dbError) {
      console.error('[pacientes] Erro no PostgreSQL, acionando contingência de arquivo local:', dbError);
    }
  }

  // Fallback seguro: leitura do arquivo local
  const pacientes = lerJSON<Record<string, unknown>[]>(PACIENTES_FILE, []);
  const filtrados = pacientes.filter(paciente => {
    const pTenant = canonicalTenant(paciente.tenant_id || 'pripsico');
    return aliases.includes(pTenant);
  });
  return NextResponse.json(filtrados, { headers });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawTenant = authorizedTenant(request);
    if (!rawTenant) return forbidden();
    const tenant_id = canonicalTenant(rawTenant);
    const { nome, iniciais } = body;
    if (!nome || !iniciais) {
      return NextResponse.json({ error: 'Nome e iniciais são obrigatórios.' }, { status: 400 });
    }

    const token = crypto.randomUUID();
    const id = body.id || crypto.randomUUID();

    const novoPaciente: Record<string, unknown> = {
      id,
      tenant_id,
      nome,
      email: body.email || '',
      iniciais,
      status: body.status || 'onboarding',
      onboarding_token: token,
      cpf: body.cpf || '',
      data_nascimento: body.data_nascimento || '',
      telefone: body.telefone || '',
      contato_emergencia: body.contato_emergencia || '',
      responsavel_nome: body.responsavel_nome || '',
      responsavel_telefone: '',
      genero: body.genero || '',
      escolaridade: body.escolaridade || '',
      nome_social: body.nome_social || '',
      profissao: body.profissao || '',
      observacoes: body.observacoes || '',
      plano_saude: body.plano_saude || '',
      tratamentos: body.tratamentos || '',
      tipo_atendimento: body.tipo_atendimento || 'Adulto',
      raca_cor: body.raca_cor || '',
      estado_civil: body.estado_civil || '',
      contato_emergencia_2: body.contato_emergencia_2 || '',
      endereco: body.endereco || {},
      medicamento: body.medicamento || '',
      cobranca: body.cobranca || { tipo: '', moeda: 'BRL', valor: '', meio_pagamento: '' },
      casal_com: body.casal_com || [],
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    };

    // Dual persistence: grava no PostgreSQL E grava no arquivo local
    let salvoNoPostgres = false;
    if (postgresEnabled()) {
      try {
        await withTenantDatabase(tenant_id, database =>
          database.put('patients', String(id), novoPaciente)
        );
        salvoNoPostgres = true;
      } catch (e) {
        console.error('[pacientes] Falha ao persistir no PostgreSQL, garantindo integridade no arquivo local:', e);
      }
    }

    // Sempre garante escrita no arquivo local (write-through)
    sincronizarPacientesEmArquivo([novoPaciente], tenant_id);

    return NextResponse.json(
      {
        message: 'Paciente pré-cadastrado com sucesso!',
        paciente: novoPaciente,
        link: `http://localhost:3003/${tenant_id}/quiz?token=${token}`,
        postgresPersisted: salvoNoPostgres,
      },
      { status: 201, headers: { 'Cache-Control': 'private, no-store, max-age=0' } }
    );
  } catch (error) {
    console.error('[pacientes] Erro ao cadastrar paciente:', error);
    return NextResponse.json({ error: 'Erro ao cadastrar paciente.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'Paciente não informado.' }, { status: 400 });
    const rawTenant = authorizedTenant(request);
    if (!rawTenant) return forbidden();
    const tenant_id = canonicalTenant(rawTenant);

    let pacienteAtualizado: Record<string, unknown> | null = null;

    if (postgresEnabled()) {
      try {
        const current = await withTenantDatabase(tenant_id, database =>
          database.get<Record<string, unknown>>('patients', String(body.id))
        );
        if (current) {
          pacienteAtualizado = {
            ...current,
            ...body,
            id: current.id,
            tenant_id,
            onboarding_token: current.onboarding_token,
            atualizado_em: new Date().toISOString(),
          };
          await withTenantDatabase(tenant_id, database =>
            database.put('patients', String(current.id), pacienteAtualizado)
          );
        }
      } catch (e) {
        console.error('[pacientes] Falha ao atualizar no PostgreSQL:', e);
      }
    }

    if (!pacienteAtualizado) {
      const pacientes = lerJSON<Record<string, unknown>[]>(PACIENTES_FILE, []);
      const index = pacientes.findIndex(
        p => p && p.id === body.id && tenantAliases(tenant_id).includes(canonicalTenant(p.tenant_id || 'pripsico'))
      );
      if (index >= 0) {
        pacienteAtualizado = {
          ...pacientes[index],
          ...body,
          id: pacientes[index].id,
          tenant_id,
          onboarding_token: pacientes[index].onboarding_token,
          atualizado_em: new Date().toISOString(),
        };
      }
    }

    if (!pacienteAtualizado) {
      pacienteAtualizado = {
        ...body,
        id: body.id,
        tenant_id,
        atualizado_em: new Date().toISOString(),
      };
      if (postgresEnabled()) {
        try {
          await withTenantDatabase(tenant_id, database =>
            database.put('patients', String(body.id), pacienteAtualizado)
          );
        } catch {}
      }
    }

    // Sempre sincroniza com o arquivo local
    if (pacienteAtualizado) {
      sincronizarPacientesEmArquivo([pacienteAtualizado], tenant_id);
    }

    return NextResponse.json({ message: 'Cadastro atualizado.', paciente: pacienteAtualizado });
  } catch (error) {
    console.error('[pacientes] Erro ao atualizar paciente:', error);
    return NextResponse.json({ error: 'Erro ao atualizar paciente.' }, { status: 500 });
  }
}
