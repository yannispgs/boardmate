import { AppLoading } from "@/components/AppLoading";

/**
 * The fallback for every screen that has not finished rendering on the server.
 *
 * It covers the two doors into the application — the home screen, which waits
 * on the session and the permissions that go with it, and the login screen —
 * and lets their HTML be sent straight away instead of after those answers come
 * back. What happens before that, the round trip that checks the session, is
 * the phone's launch image to cover, not ours.
 */
export default function Loading() {
  return <AppLoading />;
}
