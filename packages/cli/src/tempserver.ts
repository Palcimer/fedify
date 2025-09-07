import { openTunnel } from "@hongminhee/localtunnel";
import { getLogger } from "@logtape/logtape";
import { serve } from "srvx";

const logger = getLogger(["fedify", "cli", "tempserver"]);

export type SpawnTemporaryServerOptions = {
  noTunnel?: boolean;
};

export type TemporaryServer = {
  url: URL;
  close(): Promise<void>;
};

export async function spawnTemporaryServer(
  fetch: (request: Request) => Promise<Response> | Response,
  options: SpawnTemporaryServerOptions = {},
): Promise<TemporaryServer> {
  if (options.noTunnel) {
    const server = serve({
      port: 0,
      hostname: "::",
      fetch: fetch,
    });
    await server.ready();
    const url = new URL(server.url!);
    const port = url.port;
    logger.debug("Temporary server is listening on port {port}.", {
      port: port,
    });

    return {
      url: new URL(`http://localhost:${port}`),
      async close() {
        await server.close();
      },
    };
  }

  const server = serve({
    fetch: (request) => {
      const url = new URL(request.url);
      url.protocol = "https:";
      request = new Request(url, {
        method: request.method,
        headers: request.headers,
        body: request.method === "GET" || request.method === "HEAD"
          ? null
          : request.body,
        referrer: request.referrer,
        referrerPolicy: request.referrerPolicy,
        mode: request.mode,
        credentials: request.credentials,
        cache: request.cache,
        redirect: request.redirect,
        integrity: request.integrity,
        keepalive: request.keepalive,
        signal: request.signal,
      });

      return new Response();
    },
    port: 0,
    hostname: "::",
  });

  await server.ready();

  const url = new URL(server.url!);
  const port = url.port;

  logger.debug("Temporary server is listening on port {port}.", { port });
  const tun = await openTunnel({ port: parseInt(port) });
  logger.debug(
    "Temporary server is tunneled to {url}.",
    { url: tun.url.href },
  );

  return {
    url: tun.url,
    async close() {
      await server.close();
      await tun.close();
    },
  };
}
