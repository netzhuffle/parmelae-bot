import { $ } from 'bun';

type MinecraftServerAction = 'start' | 'status' | 'stop';

const DEFAULT_MINECRAFT_SERVER_NAME = 'atm8';

function getMinecraftServerName(): string {
  return Bun.env.MINECRAFT_SERVER_NAME ?? DEFAULT_MINECRAFT_SERVER_NAME;
}

export async function runMinecraftServerCommand(action: MinecraftServerAction): Promise<string> {
  try {
    const result = await $`sudo /usr/local/bin/mscs ${action} ${getMinecraftServerName()}`.text();
    return result.trim();
  } catch (error) {
    const stderr = (error as { stderr?: string })?.stderr?.trim() ?? 'Unknown error';
    return `Error: ${stderr}`;
  }
}
