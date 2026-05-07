import type { IncomingMessage, ServerResponse } from 'node:http';

import { handleExportDocument } from './advice/exportDocument';
import { handleGenerateAdvice } from './advice/generateAdvice';
import { handleListAdviceModels } from './advice/listModels';
import { createCorrelationId } from './common/logging';
import {
  handleCreateDocument,
  handleGetDocument,
  handleListDocuments,
  handleUpdateDocument,
} from './documents/handlers';

interface AuthContext {
  uid: string;
}

interface ApiRequest {
  method: string;
  path: string;
  headers?: Record<string, string | undefined>;
  body?: unknown;
  auth?: AuthContext;
}

interface ApiResponse {
  statusCode: number;
  body: unknown;
  headers?: Record<string, string>;
}

interface AdviceBody {
  documentId: string;
  synopsis: string;
  content: string;
  selectedText?: string;
  panelAProvider?: 'openai' | 'gemini' | 'anthropic';
  panelBProvider?: 'openai' | 'gemini' | 'anthropic';
}

interface ExportBody {
  title: string;
  authorName: string;
  content: string;
}

function normalizePath(path: string): string {
  const qIndex = path.indexOf('?');
  return qIndex >= 0 ? path.slice(0, qIndex) : path;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getHeader(req: ApiRequest, key: string): string | undefined {
  if (!req.headers) {
    return undefined;
  }

  const lower = key.toLowerCase();
  const entries = Object.entries(req.headers);
  const found = entries.find(([k]) => k.toLowerCase() === lower);
  return found?.[1];
}

function resolveAuth(req: ApiRequest): AuthContext | null {
  if (req.auth?.uid) {
    return req.auth;
  }

  const uid = getHeader(req, 'x-user-id');
  return uid ? { uid } : null;
}

function parseAdviceBody(body: unknown): AdviceBody {
  if (!isObject(body)) {
    throw new Error('INVALID_ADVICE_BODY');
  }

  const documentId = typeof body.documentId === 'string' ? body.documentId : '';
  const synopsis = typeof body.synopsis === 'string' ? body.synopsis : '';
  const content = typeof body.content === 'string' ? body.content : '';
  const selectedText = typeof body.selectedText === 'string' ? body.selectedText : undefined;

  if (!documentId) {
    throw new Error('DOCUMENT_ID_REQUIRED');
  }

  const parsed: AdviceBody = {
    documentId,
    synopsis,
    content,
  };

  if (selectedText !== undefined) {
    parsed.selectedText = selectedText;
  }

  if (
    body.panelAProvider === 'openai' ||
    body.panelAProvider === 'gemini' ||
    body.panelAProvider === 'anthropic'
  ) {
    parsed.panelAProvider = body.panelAProvider;
  }

  if (
    body.panelBProvider === 'openai' ||
    body.panelBProvider === 'gemini' ||
    body.panelBProvider === 'anthropic'
  ) {
    parsed.panelBProvider = body.panelBProvider;
  }

  return parsed;
}

function parseExportBody(body: unknown): ExportBody {
  if (!isObject(body)) {
    throw new Error('INVALID_EXPORT_BODY');
  }

  const title = typeof body.title === 'string' ? body.title : '';
  const authorName = typeof body.authorName === 'string' ? body.authorName : '';
  const content = typeof body.content === 'string' ? body.content : '';

  return { title, authorName, content };
}

function jsonResponse(statusCode: number, body: unknown): ApiResponse {
  return {
    statusCode,
    body,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  };
}

export async function routeApiRequest(req: ApiRequest): Promise<ApiResponse> {
  const method = req.method.toUpperCase();
  const path = normalizePath(req.path);
  const auth = resolveAuth(req);
  const correlationId = getHeader(req, 'x-correlation-id') ?? createCorrelationId();

  if (method === 'GET' && path === '/health') {
    return jsonResponse(200, {
      status: 'ok',
      service: 'scenario-lab-functions',
    });
  }

  if (!auth) {
    return jsonResponse(401, {
      error: 'AUTH_REQUIRED',
      correlationId,
    });
  }

  if (method === 'GET' && path === '/api/documents') {
    const result = await handleListDocuments({
      correlationId,
      ownerId: auth.uid,
    });
    return jsonResponse(result.statusCode, result.body);
  }

  if (method === 'POST' && path === '/api/documents') {
    const result = await handleCreateDocument({
      correlationId,
      ownerId: auth.uid,
      body: req.body,
    });
    return jsonResponse(result.statusCode, result.body);
  }

  const detailMatch = path.match(/^\/api\/documents\/([^/]+)$/);
  if (method === 'GET' && detailMatch?.[1]) {
    const result = await handleGetDocument({
      correlationId,
      ownerId: auth.uid,
      documentId: detailMatch[1],
    });
    return jsonResponse(result.statusCode, result.body);
  }

  if (method === 'PATCH' && detailMatch?.[1]) {
    const result = await handleUpdateDocument({
      correlationId,
      ownerId: auth.uid,
      documentId: detailMatch[1],
      body: req.body,
    });
    return jsonResponse(result.statusCode, result.body);
  }

  if (method === 'POST' && path === '/api/advice/generate') {
    try {
      const body = parseAdviceBody(req.body);
      const input = {
        correlationId,
        ownerId: auth.uid,
        documentId: body.documentId,
        synopsis: body.synopsis,
        content: body.content,
        panelAProvider: body.panelAProvider ?? 'gemini',
        panelBProvider: body.panelBProvider ?? 'openai',
      };

      const result = await handleGenerateAdvice(
        body.selectedText !== undefined ? { ...input, selectedText: body.selectedText } : input,
      );

      return jsonResponse(result.statusCode, result.body);
    } catch (error) {
      return jsonResponse(400, {
        error: error instanceof Error ? error.message : 'INVALID_REQUEST',
        correlationId,
      });
    }
  }

  if (method === 'GET' && path === '/api/advice/models') {
    const result = await handleListAdviceModels();
    return jsonResponse(result.statusCode, result.body);
  }

  const exportMatch = path.match(/^\/api\/documents\/([^/]+)\/export$/);
  if (method === 'POST' && exportMatch) {
    const documentId = exportMatch[1];
    if (!documentId) {
      return jsonResponse(400, {
        error: 'DOCUMENT_ID_REQUIRED',
        correlationId,
      });
    }

    try {
      const body = parseExportBody(req.body);
      const result = await handleExportDocument({
        correlationId,
        ownerId: auth.uid,
        documentId,
        title: body.title,
        authorName: body.authorName,
        content: body.content,
      });
      return jsonResponse(result.statusCode, result.body);
    } catch (error) {
      return jsonResponse(400, {
        error: error instanceof Error ? error.message : 'INVALID_REQUEST',
        correlationId,
      });
    }
  }

  return jsonResponse(404, {
    error: 'NOT_FOUND',
    correlationId,
  });
}

async function readRawBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function parseJsonBody(raw: string): unknown {
  if (!raw.trim()) {
    return {};
  }

  return JSON.parse(raw) as unknown;
}

export function createNodeHttpHandler() {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      const rawBody = await readRawBody(req);
      const parsedBody = parseJsonBody(rawBody);

      const headers: Record<string, string | undefined> = {};
      for (const [key, value] of Object.entries(req.headers)) {
        if (Array.isArray(value)) {
          headers[key] = value[0];
        } else {
          headers[key] = value;
        }
      }

      const response = await routeApiRequest({
        method: req.method ?? 'GET',
        path: req.url ?? '/',
        headers,
        body: parsedBody,
      });

      if (response.headers) {
        for (const [key, value] of Object.entries(response.headers)) {
          res.setHeader(key, value);
        }
      }

      res.statusCode = response.statusCode;
      res.end(JSON.stringify(response.body));
    } catch {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'INTERNAL_ERROR' }));
    }
  };
}
