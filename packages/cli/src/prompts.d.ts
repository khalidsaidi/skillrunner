declare module 'prompts' {
  const prompts: (
    questions: { type: string; name: string; message: string; initial?: boolean } | unknown[],
    opts?: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;
  export default prompts;
}
