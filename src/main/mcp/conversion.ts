export function wrapNameWithServer({
  serverName,
  name,
}: {
  serverName: string;
  name: string;
}): string {
  return `${serverName}-${name}`;
}

export function unwrapName({ name }: { name: string }): {
  serverName?: string;
  name: string;
} {
  const parts = name.split("-");

  // No server prefix
  if (parts.length < 2) {
    return { name };
  }

  return {
    serverName: parts[0],
    name: parts.slice(1).join("-"),
  };
}

export function wrapUriWithServer({
  serverName,
  uri,
}: {
  serverName: string;
  uri: string;
}): string {
  const parts = uri.split("://");

  // invalid URI. treat it like a name
  if (parts.length < 2) {
    return wrapNameWithServer({
      serverName,
      name: uri,
    });
  }

  return `${parts[0]}://${serverName}/${parts.slice(1).join("://")}`;
}

export function unwrapUri({ uri }: { uri: string }): {
  serverName?: string;
  uri: string;
} {
  const [protocol, ...protocolSplitParts] = uri.split("://");

  // invalid URI. treat it like a name
  if (protocol === undefined || protocolSplitParts.length === 0) {
    const res = unwrapName({ name: uri });
    return {
      serverName: res.serverName,
      uri: res.name,
    };
  }

  const path = protocolSplitParts.join("://");

  const pathParts = path.split("/");

  // No server prefix
  if (pathParts.length < 2) {
    return {
      serverName: undefined,
      uri,
    };
  }

  return {
    serverName: pathParts[0],
    uri: `${protocol}://${pathParts.slice(1).join("/")}`,
  };
}
