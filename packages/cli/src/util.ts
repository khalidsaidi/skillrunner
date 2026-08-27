export function isJson(program: { opts: () => { json?: boolean } }): boolean {
  return !!program.opts?.()?.json;
}

export function out(data: unknown, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
  }
}
