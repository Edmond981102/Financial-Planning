const BRAND_DOMAINS: Record<string, string> = {
  netflix: 'netflix.com',
  spotify: 'spotify.com',
  'amazon prime': 'amazon.com',
  amazon: 'amazon.com',
  adobe: 'adobe.com',
  icloud: 'apple.com',
  apple: 'apple.com',
  'apple music': 'apple.com',
  google: 'google.com',
  youtube: 'youtube.com',
  chatgpt: 'openai.com',
  openai: 'openai.com',
  claude: 'anthropic.com',
  anthropic: 'anthropic.com',
  replit: 'replit.com',
  linkedin: 'linkedin.com',
  disney: 'disneyplus.com',
  hulu: 'hulu.com',
  hbo: 'hbomax.com',
  microsoft: 'microsoft.com',
  office365: 'microsoft.com',
  dropbox: 'dropbox.com',
  notion: 'notion.so',
  figma: 'figma.com',
  github: 'github.com',
  slack: 'slack.com',
  zoom: 'zoom.us',
  grab: 'grab.com',
  uber: 'uber.com',
  canva: 'canva.com',
  paypal: 'paypal.com',
  playstation: 'playstation.com',
  xbox: 'xbox.com',
  nintendo: 'nintendo.com',
  steam: 'steampowered.com',
  vpn: 'nordvpn.com',
  nordvpn: 'nordvpn.com',
  expressvpn: 'expressvpn.com',
};

export function guessLogoUrl(name: string): string | null {
  const lower = name.toLowerCase();
  const match = Object.keys(BRAND_DOMAINS)
    .sort((a, b) => b.length - a.length)
    .find((key) => lower.includes(key));
  if (!match) return null;
  return `https://www.google.com/s2/favicons?sz=128&domain=${BRAND_DOMAINS[match]}`;
}
