export interface RisuModule {
  name: string;
  description: string;
  id: string;
  trigger?: unknown[];
  regex?: unknown[];
  lorebook?: Record<string, unknown>[];
  assets?: [string, string, string][];
  [key: string]: unknown;
}

export interface DecodedRisum {
  wrapper: { type: "risuModule"; module: RisuModule };
  assets: Buffer[];
}

export function decodeRpack(data: Uint8Array, map: Uint8Array): Buffer {
  if (map.length !== 512) throw new Error(`RPack map must be 512 bytes, got ${map.length}`);
  const decodeMap = map.subarray(256, 512);
  const result = Buffer.allocUnsafe(data.length);
  for (let index = 0; index < data.length; index += 1) {
    result[index] = decodeMap[data[index] ?? 0] ?? 0;
  }
  return result;
}

export function encodeRpack(data: Uint8Array, map: Uint8Array): Buffer {
  if (map.length !== 512) throw new Error(`RPack map must be 512 bytes, got ${map.length}`);
  const encodeMap = map.subarray(0, 256);
  const result = Buffer.allocUnsafe(data.length);
  for (let index = 0; index < data.length; index += 1) {
    result[index] = encodeMap[data[index] ?? 0] ?? 0;
  }
  return result;
}

export function decodeRisum(buffer: Uint8Array, map: Uint8Array): DecodedRisum {
  const data = Buffer.from(buffer);
  let offset = 0;
  const readByte = (): number => data.readUInt8(offset++);
  const readLength = (): number => {
    const length = data.readUInt32LE(offset);
    offset += 4;
    return length;
  };
  const readData = (length: number): Buffer => {
    if (offset + length > data.length) throw new Error("Truncated module.risum");
    const result = data.subarray(offset, offset + length);
    offset += length;
    return result;
  };
  if (readByte() !== 111) throw new Error("Invalid RisuM magic number");
  if (readByte() !== 0) throw new Error("Unsupported RisuM version");
  const wrapper = JSON.parse(
    decodeRpack(readData(readLength()), map).toString("utf8"),
  ) as DecodedRisum["wrapper"];
  if (wrapper.type !== "risuModule" || !wrapper.module) throw new Error("Invalid RisuM payload");
  const assets: Buffer[] = [];
  while (offset < data.length) {
    const marker = readByte();
    if (marker === 0) break;
    if (marker !== 1) throw new Error(`Invalid RisuM asset marker ${marker}`);
    assets.push(decodeRpack(readData(readLength()), map));
  }
  return { wrapper, assets };
}

export function encodeRisum(decoded: DecodedRisum, map: Uint8Array): Buffer {
  const main = encodeRpack(Buffer.from(JSON.stringify(decoded.wrapper, null, 2), "utf8"), map);
  const chunks: Buffer[] = [Buffer.from([111, 0])];
  const mainLength = Buffer.alloc(4);
  mainLength.writeUInt32LE(main.length, 0);
  chunks.push(mainLength, main);
  for (const asset of decoded.assets) {
    const encoded = encodeRpack(asset, map);
    const length = Buffer.alloc(4);
    length.writeUInt32LE(encoded.length, 0);
    chunks.push(Buffer.from([1]), length, encoded);
  }
  chunks.push(Buffer.from([0]));
  return Buffer.concat(chunks);
}
