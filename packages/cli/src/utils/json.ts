type JsonFlagHolder = { json?: boolean } | undefined;

type CommandLike =
  | {
      opts?: () => { json?: boolean };
      parent?: { opts?: () => { json?: boolean } };
    }
  | undefined;

function readJsonFlag(value: JsonFlagHolder): boolean {
  return Boolean(value?.json);
}

export function shouldUseJson(
  opts?: JsonFlagHolder,
  cmd?: CommandLike,
): boolean {
  if (readJsonFlag(opts)) return true;
  if (readJsonFlag(cmd?.opts?.())) return true;
  if (readJsonFlag(cmd?.parent?.opts?.())) return true;
  return false;
}
