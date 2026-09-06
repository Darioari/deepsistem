import { createHmac, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import next from 'next';
import { Pool } from 'pg';
import { WebSocket, WebSocketServer } from 'ws';

const port = Number(process.env.PORT || 3003);
const host = process.env.HOST || '0.0.0.0';
const production = process.argv.includes('--production') || process.env.NODE_ENV === 'production';
if (production) process.env.NODE_ENV = 'production';
const dev = !production;
const sessionsFile = path.join(process.cwd(), 'backend', 'data', 'sessoes.json');
const roomPath = /^\/api\/atendimento\/([^/]+)$/;
const tokenPattern = /^[a-zA-Z0-9_-]{16,128}$/;
let postgresPool;

function roomStore() {
  if (!globalThis.__DEEPSISTEM_MEETING_ROOMS__) globalThis.__DEEPSISTEM_MEETING_ROOMS__ = { rooms: new Map() };
  return globalThis.__DEEPSISTEM_MEETING_ROOMS__;
}

function readSessions() {
  try {
    const parsed = JSON.parse(fs.readFileSync(sessionsFile, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getPostgresPool() {
  const connectionString = String(process.env.DATABASE_URL || '').trim();
  if (!connectionString) return undefined;
  if (!postgresPool) {
    postgresPool = new Pool({
      connectionString,
      max: Math.max(2, Number(process.env.DATABASE_POOL_MAX || 10)),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined,
    });
  }
  return postgresPool;
}

async function sessionFromPostgres(token) {
  const pool = getPostgresPool();
  if (!pool) return undefined;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.public_record_id', $1, true)", [token]);
    let result = await client.query(
      "SELECT payload FROM app_records WHERE entity_type = 'meeting_rooms' AND record_id = $1 LIMIT 1",
      [token],
    );
    if (result.rows[0]?.payload) {
      await client.query('COMMIT');
      return result.rows[0].payload;
    }
    result = await client.query(
      "SELECT payload, tenant_id FROM app_records WHERE entity_type = 'sessions' AND payload->>'roomToken' = $1 LIMIT 1",
      [token],
    );
    await client.query('COMMIT');
    if (result.rows[0]?.payload) {
      return {
        ...result.rows[0].payload,
        tenant_id: result.rows[0].tenant_id || result.rows[0].payload.tenant_id,
      };
    }
    return undefined;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('Falha ao recuperar sala do PostgreSQL:', error instanceof Error ? error.message : error);
    return undefined;
  } finally {
    client.release();
  }
}

async function roomFromStoredSession(token) {
  const session = await sessionFromPostgres(token) || readSessions().find(item => item.roomToken === token);
  const tenant_id = session?.tenant_id || 'pripsico';
  const room = {
    token,
    tenant_id,
    sessionId: session?.id || token,
    patientId: session?.patientId || 'paciente',
    patientName: session?.patientName || 'Paciente',
    createdAt: new Date().toISOString(),
    lastActivityAt: Date.now(),
    status: 'waiting',
    listeners: new Set(),
    mailbox: new Map(),
  };
  roomStore().rooms.set(token, room);
  return room;
}

async function getRoom(token) {
  const room = roomStore().rooms.get(token) || await roomFromStoredSession(token);
  if (!room) return undefined;
  if (Date.now() - room.lastActivityAt > 6 * 60 * 60 * 1000) {
    roomStore().rooms.delete(token);
    return undefined;
  }
  room.lastActivityAt = Date.now();
  return room;
}

function broadcast(room, message) {
  room.lastActivityAt = Date.now();
  for (const listener of room.listeners) listener(message);
}

function endRoom(room) {
  room.status = 'ended';
  broadcast(room, { action: 'status', status: 'ended' });
  setTimeout(() => {
    const current = roomStore().rooms.get(room.token);
    if (current === room && current.listeners.size === 0) roomStore().rooms.delete(room.token);
  }, 15_000).unref?.();
}

function cleanupRooms() {
  const cutoff = Date.now() - 6 * 60 * 60 * 1000;
  for (const [token, room] of roomStore().rooms) {
    if (room.lastActivityAt < cutoff) roomStore().rooms.delete(token);
  }
}

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map(item => item.trim().split('=')));
}

function sessionSecret() {
  return process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET || (dev ? 'deepsistem-local-development-secret-change-in-production' : '');
}

function validProfessionalSession(request, room, url) {
  let raw = parseCookies(request.headers.cookie).deepsistem_session;
  if (!raw && url) {
    raw = url.searchParams.get('token') || undefined;
  }
  if (!raw) {
    const auth = request.headers.authorization;
    if (auth && auth.toLowerCase().startsWith('bearer ')) raw = auth.slice(7).trim();
  }
  const secret = sessionSecret();
  if (!raw || !secret) return false;
  try {
    const [payload, supplied] = decodeURIComponent(raw).split('.');
    const expected = createHmac('sha256', secret).update(payload).digest('base64url');
    const suppliedBuffer = Buffer.from(supplied || '');
    const expectedBuffer = Buffer.from(expected);
    if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) return false;
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!session?.email || Date.now() - session.issuedAt > 12 * 60 * 60 * 1000) return false;
    if (!room.tenant_id || room.tenant_id === session.tenant) return true;
    if (room.tenant_id === 'pripsico' || session.tenant === 'pripsico') return true;
    return true;
  } catch {
    return false;
  }
}

function validOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  try {
    const allowed = process.env.APP_ORIGIN;
    const originUrl = new URL(origin);
    if (allowed && origin === allowed) return true;
    if (originUrl.host === request.headers.host) return true;
    const host = originUrl.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') return true;
    if (host === 'deepsistem.com.br' || host.endsWith('.deepsistem.com.br')) return true;
    return false;
  } catch {
    return false;
  }
}

function rejectUpgrade(socket, status = 403) {
  socket.write(`HTTP/1.1 ${status} Forbidden\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}

const app = next({ dev, hostname: host, port });
const handle = app.getRequestHandler();
const websocketServer = new WebSocketServer({ noServer: true, maxPayload: 32 * 1024 });

websocketServer.on('connection', (socket, request, context) => {
  const { room, role } = context;
  socket.isAlive = true;
  socket.on('pong', () => { socket.isAlive = true; });
  let joined = false;
  let messageCount = 0;
  let windowStartedAt = Date.now();
  const preJoinQueue = [];

  const send = message => {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  };
  const listener = message => {
    if (message?.to === role || message?.action === 'status') send(message);
  };
  listener.role = role;

  function handleJoin() {
    joined = true;
    room.listeners.add(listener);
    room.lastActivityAt = Date.now();

    const activeRoles = new Set();
    for (const l of room.listeners) {
      if (l.role) activeRoles.add(l.role);
    }
    const participantsCount = activeRoles.size;
    const anotherParticipantJoined = activeRoles.size > 1;

    send({ action: 'ready', role, participants: participantsCount });

    if (!room.mailbox) room.mailbox = new Map();
    const roleMailbox = room.mailbox.get(role) || [];
    if (roleMailbox.length > 0) {
      for (const buffered of roleMailbox) {
        send(buffered);
      }
      room.mailbox.delete(role);
    }

    if (anotherParticipantJoined) {
      broadcast(room, { action: 'status', status: 'participant-joined', role });
    }
  }

  function handleIncomingMessage(message) {
    if (message.action === 'signal' && message.payload && typeof message.payload === 'object') {
      const targetRole = role === 'professional' ? 'patient' : 'professional';
      const outbound = { action: 'signal', from: role, to: targetRole, payload: message.payload };

      let targetConnected = false;
      for (const l of room.listeners) {
        if (l.role === targetRole) {
          targetConnected = true;
          l(outbound);
        }
      }

      if (!targetConnected) {
        if (!room.mailbox) room.mailbox = new Map();
        let list = room.mailbox.get(targetRole);
        if (!list) {
          list = [];
          room.mailbox.set(targetRole, list);
        }
        if (message.payload.type === 'offer') {
          list = list.filter(item => item.payload?.type !== 'offer');
          list.push(outbound);
          room.mailbox.set(targetRole, list);
        } else if (message.payload.type === 'candidate' && list.length < 64) {
          list.push(outbound);
        } else if (message.payload.type === 'turn-needed' || message.payload.type === 'ice-restart-needed') {
          list.push(outbound);
        }
      }
    } else if (message.action === 'status' && typeof message.status === 'string' && message.status.length <= 32) {
      if (message.status === 'ended') endRoom(room);
      else broadcast(room, { action: 'status', status: message.status, role });
    } else if (message.action === 'leave') {
      endRoom(room);
      socket.close(1000, 'Sala encerrada');
    }
  }

  socket.on('message', raw => {
    if (Date.now() - windowStartedAt > 10_000) {
      windowStartedAt = Date.now();
      messageCount = 0;
    }
    if (++messageCount > 200) return socket.close(1008, 'Limite de sinalização excedido');
    let message;
    try { message = JSON.parse(raw.toString()); } catch { return socket.close(1003, 'Mensagem inválida'); }

    if (!joined) {
      if (message.action === 'join' && message.role === role) {
        handleJoin();
        for (const queued of preJoinQueue.splice(0)) {
          handleIncomingMessage(queued);
        }
        return;
      }
      if (preJoinQueue.length < 32) {
        preJoinQueue.push(message);
        return;
      }
      return socket.close(1008, 'Entrada inválida');
    }

    handleIncomingMessage(message);
  });

  socket.on('close', () => {
    room.listeners.delete(listener);
    room.lastActivityAt = Date.now();
    broadcast(room, { action: 'status', status: 'participant-left', role });
  });
  socket.on('error', () => {
    room.listeners.delete(listener);
  });
});

await app.prepare();
app.didWebSocketSetup = true; // Impede que o Next.js registre seu próprio upgrade listener automático no server HTTP
const nextUpgrade = app.getUpgradeHandler();
const server = createServer((request, response) => handle(request, response));
server.on('upgrade', async (request, socket, head) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const match = roomPath.exec(url.pathname);
  if (!match || url.searchParams.get('transport') !== 'websocket') return nextUpgrade(request, socket, head);
  const token = decodeURIComponent(match[1]);
  const role = url.searchParams.get('role');
  const room = tokenPattern.test(token) ? await getRoom(token) : undefined;
  if (!room || !['professional', 'patient'].includes(role) || !validOrigin(request)) return rejectUpgrade(socket);
  if (role === 'professional' && !validProfessionalSession(request, room, url)) return rejectUpgrade(socket);
  websocketServer.handleUpgrade(request, socket, head, client => websocketServer.emit('connection', client, request, { room, role }));
});

const cleanupTimer = setInterval(cleanupRooms, 5 * 60 * 1000);
cleanupTimer.unref?.();
const heartbeatTimer = setInterval(() => {
  for (const client of websocketServer.clients) {
    if (client.isAlive === false) {
      client.terminate();
      continue;
    }
    client.isAlive = false;
    client.ping();
  }
}, 25_000);
heartbeatTimer.unref?.();
async function reconcileBilling() {
  const token = process.env.BILLING_RECONCILE_SECRET || process.env.SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!token) return;
  await fetch(`http://127.0.0.1:${port}/api/internal/billing-reconcile`, { method: 'POST', headers: { 'x-internal-billing-token': token } }).catch(() => undefined);
}
const billingReconcileTimer = setInterval(() => { void reconcileBilling(); }, 15 * 60 * 1000);
billingReconcileTimer.unref?.();
server.listen(port, host, () => { console.log(`DeePsistem server ativo em ${host}:${port} (${dev ? 'development' : 'production'})`); setTimeout(() => { void reconcileBilling(); }, 5000).unref?.(); });

function shutdown() {
  clearInterval(cleanupTimer);
  clearInterval(heartbeatTimer);
  clearInterval(billingReconcileTimer);
  websocketServer.clients.forEach(client => client.close(1001, 'Servidor encerrando'));
  server.close(() => process.exit(0));
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
