declare module "xnb" {
  export function unpackToXnbData(input: Uint8Array): Promise<{
    header: Record<string, unknown>;
    readers: unknown[];
    content: unknown;
  }>;
}
