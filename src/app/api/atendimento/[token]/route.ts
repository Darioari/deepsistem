import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { forbidden, sameOriginRequest } from '@/lib/auth-session';
import { ensureMeetingRoom, findMeetingRoom, snapshotMeetingRoom } from '@/lib/meeting-room-store';
import { checkPlanAccess } from '@/lib/plan-access';
import { postgresEnabled, withPublicRecord, withTenantDatabase } from '@/lib/postgres';

const sessionsFile = path.join(process.cwd(), 'backend', 'data', 'sessoes.json');
const TOKEN_PATTERN = /^[a-zA-Z0-9_-]{16,128}$/;

type StoredSession = {
  id: string;
  tenant_id?: string;
  patientId?: string;
  patientName?: string;
  roomToken?: string;
};

function readSessions() {
  try {
    const parsed = JSON.parse(fs.readFileSync(sessionsFile, 'utf8'));
    return Array.isArray(parsed) ? parsed as StoredSession[] : [];
  } catch {
    return [];
  }
}

async function sessionForRoomToken(token: string) {
  if (postgresEnabled()) {
    const room = await withPublicRecord(token, database => database.get<StoredSession>('meeting_rooms', token));
    if (room) return room;
    const sessions = await withPublicRecord(token, database => database.list<StoredSession>('sessions'));
    return sessions.find(item => item.roomToken === token);
  }
  return readSessions().find(item => item.roomToken === token);
}

async function sessionForId(id: string, tenant: string) {
  if (postgresEnabled()) return withTenantDatabase(tenant, database => database.get<StoredSession>('sessions', id));
  return readSessions().find(item => item.id === id && (item.tenant_id || 'pripsico') === tenant);
}

function validToken(token: string) {
  return TOKEN_PATTERN.test(token);
}

function turnConfig() {
  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID;
  const apiToken = process.env.CLOUDFLARE_TURN_API_TOKEN;
  if (!keyId || !apiToken) return null;
  const configuredTtl = Number(process.env.CLOUDFLARE_TURN_TTL_SECONDS || 3600);
  const ttl = Number.isFinite(configuredTtl) ? Math.min(Math.max(Math.floor(configuredTtl), 300), 172800) : 3600;
  return { keyId, apiToken, ttl };
}

async function generateTurnCredentials(token: string) {
  const config = turnConfig();
  if (!config) return { configured: false, iceServers: [] };
  try {
    const response = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(config.keyId)}/credentials/generate-ice-servers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: config.ttl, customIdentifier: `room-${token.slice(0, 16)}` }),
      cache: 'no-store',
    });
    if (!response.ok) return { configured: true, iceServers: [] };
    const data = await response.json() as { iceServers?: Array<{ urls?: string | string[]; username?: string; credential?: string }> };
    const iceServers = (data.iceServers || [])
      .map(server => ({ ...server, urls: Array.isArray(server.urls) ? server.urls.filter(url => !/:53(?:\?|$)/.test(url)) : server.urls }))
      .filter(server => Array.isArray(server.urls) ? server.urls.length > 0 : Boolean(server.urls));
    return { configured: true, iceServers, expiresIn: config.ttl };
  } catch {
    return { configured: true, iceServers: [] };
  }
}

async function roomFromStoredSession(token: string) {
  const session = await sessionForRoomToken(token);
  if (!session || !session.patientId || !session.patientName) return undefined;
  return ensureMeetingRoom({
    token,
    tenant_id: session.tenant_id || 'pripsico',
    sessionId: session.id,
    patientId: session.patientId,
    patientName: session.patientName,
    createdAt: new Date().toISOString(),
    status: 'waiting',
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!validToken(token)) return NextResponse.json({ error: 'Sala não encontrada.' }, { status: 404 });
  const room = findMeetingRoom(token) || await roomFromStoredSession(token);
  if (room) return NextResponse.json(snapshotMeetingRoom(room), { headers: { 'Cache-Control': 'no-store' } });
  return NextResponse.json({
    token,
    tenant_id: 'pripsico',
    sessionId: token,
    patientId: 'paciente',
    patientName: 'Paciente',
    createdAt: new Date().toISOString(),
    status: 'waiting',
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!sameOriginRequest(request)) return forbidden();
  const { token } = await params;
  if (!validToken(token)) return NextResponse.json({ error: 'Sala não encontrada.' }, { status: 404 });
  const body = await request.json().catch(() => null) as { action?: string; sessionId?: string; patientId?: string } | null;
  if (!body?.action) return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });

  if (body.action === 'create') {
    const access = checkPlanAccess(request, 'video');
    if (!access.ok || !body.sessionId) return access.ok ? forbidden() : access.response;
    const tenant = access.tenant;
    const session = await sessionForId(body.sessionId, tenant);
    if (!session || !session.patientId || !session.patientName) return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 });
    if (session.roomToken && session.roomToken !== token) return forbidden();
    if (body.patientId && body.patientId !== session.patientId) return forbidden();
    const existing = findMeetingRoom(token);
    if (existing && existing.tenant_id !== tenant) return forbidden();
    const room = ensureMeetingRoom({
      token,
      tenant_id: tenant,
      sessionId: session.id,
      patientId: session.patientId,
      patientName: session.patientName,
      createdAt: existing?.createdAt || new Date().toISOString(),
      status: existing?.status || 'waiting',
    });
    if (!postgresEnabled()) {
      try {
        const sessions = readSessions();
        let changed = false;
        const updated = sessions.map(item => {
          if (item.id === session.id) {
            changed = true;
            return { ...item, roomToken: token };
          }
          return item;
        });
        if (changed) {
          fs.writeFileSync(sessionsFile, JSON.stringify(updated, null, 2), 'utf8');
        }
      } catch {}
    } else {
      await withTenantDatabase(tenant, database => database.put('meeting_rooms', token, {
        token,
        tenant_id: tenant,
        sessionId: session.id,
        patientId: session.patientId,
        patientName: session.patientName,
        createdAt: room.createdAt,
        status: room.status,
      }));
    }
    return NextResponse.json(snapshotMeetingRoom(room), { headers: { 'Cache-Control': 'no-store' } });
  }

  const room = findMeetingRoom(token) || await roomFromStoredSession(token);
  if (!room) return NextResponse.json({ error: 'Sala não encontrada.' }, { status: 404 });

  if (body.action === 'add-clinical-note') {
    const text = String((body as any).text || '').trim();
    if (!text) return NextResponse.json({ error: 'Texto da anotação não informado.' }, { status: 400 });

    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const formattedNote = `[${time}] ${text}`;

    // 1. Atualizar na sessão clínica (backend/data/sessoes.json)
    try {
      const sessions = readSessions();
      let sessionUpdated = false;
      const updatedSessions = sessions.map(item => {
        if (item.id === room.sessionId || item.roomToken === token) {
          sessionUpdated = true;
          const currentNotes = (item as any).notes || '';
          return {
            ...item,
            notes: currentNotes ? `${currentNotes}\n\n${formattedNote}` : formattedNote,
          };
        }
        return item;
      });
      if (sessionUpdated) {
        fs.writeFileSync(sessionsFile, JSON.stringify(updatedSessions, null, 2), 'utf8');
      }
    } catch (e) {
      console.warn('Erro ao atualizar notas na sessão:', e);
    }

    // 2. Atualizar na central do paciente (backend/data/central-pacientes.json)
    if (room.patientId) {
      try {
        const centralFile = path.join(process.cwd(), 'backend', 'data', 'central-pacientes.json');
        let centralStore: Record<string, any> = {};
        try { centralStore = JSON.parse(fs.readFileSync(centralFile, 'utf8')); } catch {}
        const patientCentral = centralStore[room.patientId] || { notas: [] };
        patientCentral.notas = [
          {
            id: crypto.randomUUID(),
            titulo: `Anotação de sessão (${time})`,
            conteudo: text,
            criado_em: new Date().toISOString(),
          },
          ...(patientCentral.notas || []),
        ];
        centralStore[room.patientId] = patientCentral;
        fs.writeFileSync(centralFile, JSON.stringify(centralStore, null, 2), 'utf8');
      } catch (e) {
        console.warn('Erro ao gravar nota na central do paciente:', e);
      }
    }

    return NextResponse.json({ success: true, message: 'Anotação gravada com sucesso no prontuário.' });
  }

  if (body.action === 'turn-credentials') return NextResponse.json(await generateTurnCredentials(token), { headers: { 'Cache-Control': 'no-store' } });
  return NextResponse.json({ error: 'A sinalização usa WebSocket.' }, { status: 405, headers: { Allow: 'GET, POST' } });
}
