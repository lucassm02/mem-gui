import cors from 'cors';
import express from 'express';
import { body, param, validationResult } from 'express-validator';
import memjs from 'memjs';
import net from 'net';

import { promisify } from 'util';

import { v4 as uuidv4 } from 'uuid';

const TELNET_TIMEOUT = 5000;
const MAX_CONCURRENT_REQUESTS = 10;
const DEFAULT_SERVER_PORT = 3001;
const CONNECTION_TIMEOUT = 300_000;

interface MemcachedConnection {
  id: string;
  host: string;
  port: number;
  client: memjs.Client;
  lastActive: Date;
  timer: NodeJS.Timer;
}

interface MemcachedConnection {
  host: string;
  port: number;
  client: memjs.Client;
  lastActive: Date;
}

type CacheResponse = {
  key: string;
  value: string | null;
};

const app = express();
app.use(cors());
app.use(express.json());

app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error('Erro não tratado', err);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
);

const connections = new Map<string, MemcachedConnection>();

const logger = {
  info: (message: string, meta?: object) =>
    console.log(
      JSON.stringify({ timestamp: new Date(), level: 'INFO', message, ...meta })
    ),

  error: (message: string, error?: Error) =>
    console.error(
      JSON.stringify({
        timestamp: new Date(),
        level: 'ERROR',
        message,
        error: error?.message,
        stack: error?.stack,
      })
    ),
};

const validateRequest = (validations: any[]) => {
  return async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.error(
        'Validação falhou',
        new Error(JSON.stringify(errors.array()))
      );
      res.status(400).json({ errors: errors.array() });
      return;
    }

    next();
  };
};

const checkConnection = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const connectionId = req.headers['x-connection-id'] as string;

  if (!connectionId) {
    res.status(400).json({ error: 'ID de conexão não fornecido' });
    return;
  }

  const connection = connections.get(connectionId);

  if (!connection) {
    res.status(404).json({ error: 'Conexão não encontrada' });
    return;
  }

  try {
    connection.lastActive = new Date();

    clearTimeout(connection.timer);
    connection.timer = setTimeout(() => {
      logger.info(`Conexão ${connectionId} expirada por inatividade`);
      connection.client.close();
      connections.delete(connectionId);
    }, CONNECTION_TIMEOUT);

    req.currentConnection = connection;
    next();
  } catch (error) {
    logger.error(`Conexão ${connectionId} inativa`, error as Error);
    connections.delete(connectionId);
    res.status(503).json({ error: 'Conexão com Memcached perdida' });
  }
};

const executeTelnetCommand = async (
  connection: MemcachedConnection,
  command: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let buffer = '';
    const timeout = setTimeout(() => {
      client.destroy();
      reject(new Error(`Timeout: Nenhuma resposta em ${TELNET_TIMEOUT}ms`));
    }, TELNET_TIMEOUT);

    client.connect(connection.port, connection.host, () => {
      client.write(`${command}\r\n`);
    });

    client.on('data', (data) => {
      buffer += data.toString();
      if (buffer.includes('END') || buffer.includes('ERROR')) {
        clearTimeout(timeout);
        client.destroy();
        resolve(buffer);
      }
    });

    client.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
};

const ConnectionController = {
  connect: async (req: express.Request, res: express.Response) => {
    try {
      const { host, port } = req.body;
      const connectionId = uuidv4();

      const client = memjs.Client.create(`${host}:${port}`, {
        retries: 1,
        timeout: 5000,
      });

      await new Promise<void>((resolve, reject) => {
        client.stats((err) => (err ? reject(err) : resolve()));
      });

      const newConnection: MemcachedConnection = {
        id: connectionId,
        host,
        port: Number(port),
        client,
        lastActive: new Date(),
        timer: setTimeout(() => {
          logger.info(`Conexão ${connectionId} expirada por inatividade`);
          client.close();
          connections.delete(connectionId);
        }, CONNECTION_TIMEOUT),
      };

      connections.set(connectionId, newConnection);

      logger.info('Nova conexão Memcached estabelecida', {
        connectionId,
        host,
        port,
      });
      res.json({
        status: 'connected',
        connectionId,
        host,
        port,
        timestamp: newConnection.lastActive,
      });
    } catch (error) {
      logger.error('Falha na conexão Memcached', error as Error);
      res.status(500).json({
        error: 'Falha na conexão',
        details: (error as Error).message,
      });
    }
  },

  disconnect: async (req: express.Request, res: express.Response) => {
    const connection = req.currentConnection;
    connection!.client.close();
    clearTimeout(connection!.timer);
    connections.delete(connection!.id);

    logger.info('Conexão Memcached encerrada', {
      connectionId: connection!.id,
    });
    res.json({ status: 'disconnected', connectionId: connection!.id });
  },

  status: async (req: express.Request, res: express.Response) => {
    const connection = req.currentConnection!;

    try {
      function statsWrapper(
        cb: (error: unknown, stats: Record<string, string> | null) => void
      ) {
        connection.client.stats((error, _, stats) => {
          cb(error, stats);
        });
      }

      const serverInfo = await promisify(statsWrapper)();

      res.json({
        status: 'connected',
        connectionId: connection!.id,
        host: connection!.host,
        port: connection!.port,
        lastActive: connection!.lastActive,
        serverInfo,
      });
    } catch (error) {
      res.json({
        status: 'error',
        error: (error as Error).message,
      });
    }
  },
};

const CacheController = {
  listKeys: async (req: express.Request, res: express.Response) => {
    const connection = req.currentConnection!;

    try {
      const slabsOutput = await executeTelnetCommand(connection, 'stats items');

      const slabIds = [
        ...new Set(
          [...slabsOutput.matchAll(/items:(\d+):number/g)].map(([, id]) => id)
        ),
      ];

      const keys = (
        await Promise.all(
          slabIds.map(async (slabId) => {
            try {
              const dump = await executeTelnetCommand(
                connection,
                `stats cachedump ${slabId} 1000`
              );
              return [...dump.matchAll(/ITEM (\S+)/g)].map(([, key]) => key);
            } catch (error) {
              logger.error(`Erro no slab ${slabId}`, error as Error);
              return [];
            }
          })
        )
      ).flat();

      const results: CacheResponse[] = [];
      for (let i = 0; i < keys.length; i += MAX_CONCURRENT_REQUESTS) {
        const chunk = keys.slice(i, i + MAX_CONCURRENT_REQUESTS);
        const chunkResults = await Promise.all(
          chunk.map(async (key) => {
            try {
              const { value } = await connection!.client.get(key);

              return {
                key,
                value: value?.toString() || null,
              };
            } catch (error) {
              logger.error(`Erro ao obter chave ${key}`, error as Error);
              return { key, value: null };
            }
          })
        );
        results.push(...chunkResults);
      }

      res.json(results);
    } catch (error) {
      logger.error('Erro ao listar chaves', error as Error);
      res.status(500).json({ error: 'Falha ao recuperar chaves' });
    }
  },
  getKey: async (req: express.Request, res: express.Response) => {
    try {
      const connection = req.currentConnection;

      const { key } = req.params;
      const { value } = await connection!.client.get(key);
      res.json({ key, value: value?.toString() || null });
    } catch (error) {
      logger.error(`Erro ao obter chave ${req.params.key}`, error);
      res.status(500).json({ error: 'Erro ao obter valor da chave' });
    }
  },

  createKey: async (req: express.Request, res: express.Response) => {
    try {
      const connection = req.currentConnection;

      const { key, value } = req.body;
      await connection!.client.set(key, value);
      res.sendStatus(204);
    } catch (error) {
      logger.error('Erro ao criar chave', error);
      res.status(500).json({ error: 'Erro ao criar chave no Memcached' });
    }
  },

  updateKey: async (req: express.Request, res: express.Response) => {
    try {
      const connection = req.currentConnection;

      const { key } = req.params;
      const { value } = req.body;

      const existing = await connection!.client.get(key);
      if (!existing.value) {
        return res.status(404).json({ error: 'Chave não encontrada' });
      }

      await connection!.client.replace(key, value);
      res.sendStatus(204);
    } catch (error) {
      logger.error(`Erro ao atualizar chave ${req.params.key}`, error);
      res.status(500).json({ error: 'Erro ao atualizar chave' });
    }
  },

  deleteKey: async (req: express.Request, res: express.Response) => {
    try {
      const connection = req.currentConnection;

      const { key } = req.params;
      await connection!.client.delete(key);
      res.sendStatus(204);
    } catch (error) {
      logger.error(`Erro ao deletar chave ${req.params.key}`, error);
      res.status(500).json({ error: 'Erro ao deletar chave' });
    }
  },

  setKey: async (req: express.Request, res: express.Response) => {
    try {
      const connection = req.currentConnection!;

      const { key, value, ttl } = req.body;
      const options = ttl ? { expires: ttl } : undefined;

      const success = await connection.client.set(key, value, options);

      if (!success) {
        throw new Error('Falha ao armazenar valor');
      }

      res.status(201).json({
        key,
        status: 'created',
        ttl: options?.expires,
      });
    } catch (error) {
      logger.error('Erro ao definir chave', error as Error);
      res.status(500).json({ error: 'Falha ao armazenar valor' });
    }
  },
};

app.post(
  '/api/connections',
  validateRequest([
    body('host').isString(),
    body('port').isInt({ min: 1, max: 65535 }),
  ]),
  ConnectionController.connect
);

app.delete(
  '/api/connections',
  checkConnection,
  ConnectionController.disconnect
);

app.get('/api/connections', checkConnection, ConnectionController.status);

app.get('/api/keys', checkConnection, CacheController.listKeys);

app.get(
  '/api/keys/:key',
  checkConnection,
  validateRequest([param('key').isString().notEmpty()]),
  CacheController.getKey
);
app.post(
  '/api/keys',
  checkConnection,
  validateRequest([
    body('key').isString().notEmpty(),
    body('value').isString().notEmpty(),
    body('ttl').optional().isInt({ min: 0 }),
  ]),
  CacheController.setKey
);
app.delete(
  '/api/keys/:key',
  checkConnection,
  validateRequest([param('key').isString().notEmpty()]),
  CacheController.deleteKey
);

const PORT = DEFAULT_SERVER_PORT;
app.listen(PORT, () => {
  logger.info(`Servidor iniciado na porta ${PORT}`);
});
