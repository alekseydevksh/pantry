// Expo Router calls this for every link that opens the app (cold start and while running), before
// it turns the link into route state. The campaign params are read here because the search screen
// later drops them from its params (ADR 0010, ADR 0011). The link itself is not changed.
import { captureCampaign } from '@/analytics';

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  captureCampaign(path);
  return path;
}
