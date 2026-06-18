type NativeIntentEvent = {
  path: string;
  initial: boolean;
};

function isGoogleAuthRedirect(path: string) {
  try {
    const url = new URL(path);

    return url.hostname === 'oauthredirect' || url.pathname === '/oauthredirect';
  } catch {
    return (
      path.startsWith('/oauthredirect') ||
      path.includes('://oauthredirect') ||
      path.includes(':/oauthredirect')
    );
  }
}

export function redirectSystemPath({ path }: NativeIntentEvent) {
  if (isGoogleAuthRedirect(path)) {
    return null;
  }

  return path;
}
