export function wrapUriWithServer({
  serverName,
  uri,
}: {
  serverName: string;
  uri: string;
}): string {
  const parts = uri.split("://");

  // invalid URI
  if (parts.length < 2) {
    return uri;
  }

  return `${parts[0]}://${serverName}/${parts.slice(1).join("://")}`;
}

export function unwrapUri({ uri }: { uri: string }): {
  serverName?: string;
  uri: string;
} {
  const [protocol, ...protocolSplitParts] = uri.split("://");

  // invalid URI
  if (protocol === undefined || protocolSplitParts.length === 0) {
    return {
      uri,
    };
  }

  const path = protocolSplitParts.join("://");

  const pathParts = path.split("/");

  // No server prefix
  if (pathParts.length < 2) {
    return {
      uri,
    };
  }

  return {
    serverName: pathParts[0],
    uri: `${protocol}://${pathParts.slice(1).join("/")}`,
  };
}
