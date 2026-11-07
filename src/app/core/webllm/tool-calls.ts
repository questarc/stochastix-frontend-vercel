export interface ParsedToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface OpenAiTool {
  type: 'function';
  function: { name: string; description?: string; parameters?: { properties?: Record<string, Record<string, unknown>>; required?: string[] } };
}

const TOOL_CALL_BLOCK = /<tool_call>\s*([\s\S]*?)\s*(?:<\/tool_call>|$)/g;
const KEPT_SCHEMA_KEYS = ['type', 'enum', 'default', 'items', 'anyOf'];

function toCall(raw: string, known: ReadonlySet<string>): ParsedToolCall | null {
  try {
    const obj = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, ''));
    if (!obj || typeof obj.name !== 'string' || (known.size && !known.has(obj.name))) return null;
    let args = obj.arguments ?? obj.parameters ?? obj.args ?? {};
    if (typeof args === 'string') args = args.trim() ? JSON.parse(args) : {};
    return { name: obj.name, args: args && typeof args === 'object' ? args : {} };
  } catch {
    return null;
  }
}

/** Extract `<tool_call>{"name": ..., "arguments": {...}}</tool_call>` blocks (or a bare JSON call) from model text. */
export function parseToolCalls(text: string, knownTools: Iterable<string> = []): { calls: ParsedToolCall[]; text: string } {
  const known = new Set(knownTools);
  const calls: ParsedToolCall[] = [];
  for (const match of text.matchAll(TOOL_CALL_BLOCK)) {
    const call = toCall(match[1], known);
    if (call) calls.push(call);
  }
  if (calls.length) return { calls, text: text.replace(TOOL_CALL_BLOCK, '').trim() };
  const bare = toCall(text.trim(), known);
  return bare && known.size ? { calls: [bare], text: '' } : { calls: [], text: text.trim() };
}

/** Compact, token-friendly description of the tools for the system prompt. */
export function describeTools(tools: OpenAiTool[]): string {
  return tools
    .map(({ function: f }) => {
      const props = Object.fromEntries(
        Object.entries(f.parameters?.properties ?? {}).map(([key, schema]) => [
          key,
          Object.fromEntries(Object.entries(schema).filter(([k]) => KEPT_SCHEMA_KEYS.includes(k))),
        ]),
      );
      const required = f.parameters?.required?.length ? ` Required: ${f.parameters.required.join(', ')}.` : '';
      return `- ${f.name}: ${f.description ?? ''}${required}\n  Parameters: ${JSON.stringify(props)}`;
    })
    .join('\n');
}

export const TOOL_INSTRUCTIONS = `
You can call tools. To call a tool, reply with only one or more blocks in exactly this format:
<tool_call>
{"name": "<tool name>", "arguments": {<arguments as JSON>}}
</tool_call>
Tool results come back inside <tool_response> blocks. When you have the data you need, answer the user in plain \
text with no <tool_call> block. Never make up numbers that did not come from a tool.

Available tools:
`;
