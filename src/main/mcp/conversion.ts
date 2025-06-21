export function wrapProgressTokenWithServer({
  serverName,
  progressToken,
}: {
  serverName: string;
  progressToken: string | number;
}): string {
  return `${serverName}-${typeof progressToken}-${progressToken}`;
}

export function unwrapProgressToken({
  progressToken,
}: {
  progressToken: string | number;
}): {
  serverName?: string;
  progressToken: string | number;
} {
  // not wrapped
  if (typeof progressToken !== "string") {
    return {
      progressToken,
    };
  }

  const parts = progressToken.split("-");

  // not wrapped
  if (parts.length < 3) {
    return {
      progressToken,
    };
  }

  const [serverName, progressTokenType] = parts;
  const progressTokenValue = parts.slice(2).join("-");

  try {
    return {
      serverName,
      progressToken:
        progressTokenType === "number"
          ? Number(progressTokenValue)
          : progressTokenValue,
    };
  } catch {
    // not wrapped or invalid
    return {
      progressToken,
    };
  }
}

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
