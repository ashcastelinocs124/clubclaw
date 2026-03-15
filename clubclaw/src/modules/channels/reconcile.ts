interface ChannelDef {
  name: string;
  access: string[];
}

interface ChannelDiff {
  toCreate: ChannelDef[];
}

export function diffChannels(
  configured: ChannelDef[],
  existingNames: string[]
): ChannelDiff {
  const existingSet = new Set(existingNames);
  const toCreate = configured.filter((ch) => !existingSet.has(ch.name));
  return { toCreate };
}
