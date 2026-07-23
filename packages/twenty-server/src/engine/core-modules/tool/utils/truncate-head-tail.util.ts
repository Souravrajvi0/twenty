import { formatBytes } from 'src/engine/core-modules/tool/utils/format-bytes.util';

type TruncateHeadTailArgs = {
  text: string;
  maxBytes: number;
  guidance: string;
};

const isUtf8ContinuationByte = (byte: number): boolean =>
  (byte & 0b11000000) === 0b10000000;

const decodeHead = (buffer: Buffer, budgetBytes: number): string => {
  let end = Math.min(budgetBytes, buffer.length);

  // Back off to a codepoint boundary so we never emit a broken character.
  while (end > 0 && end < buffer.length && isUtf8ContinuationByte(buffer[end])) {
    end -= 1;
  }

  return buffer.subarray(0, end).toString('utf-8');
};

const decodeTail = (buffer: Buffer, budgetBytes: number): string => {
  let start = Math.max(0, buffer.length - budgetBytes);

  while (start < buffer.length && isUtf8ContinuationByte(buffer[start])) {
    start += 1;
  }

  return buffer.subarray(start).toString('utf-8');
};

export const truncateHeadTail = ({
  text,
  maxBytes,
  guidance,
}: TruncateHeadTailArgs): string => {
  const buffer = Buffer.from(text, 'utf-8');

  if (buffer.length <= maxBytes) {
    return text;
  }

  const marker = `\n[TRUNCATED: output was ${formatBytes(buffer.length)} (${buffer.length} bytes), above the ${formatBytes(maxBytes)} inline limit; middle omitted, showing head and tail. ${guidance}]\n`;
  const contentBudgetBytes = Math.max(0, maxBytes - Buffer.byteLength(marker));
  const headBudgetBytes = Math.ceil(contentBudgetBytes / 2);
  const tailBudgetBytes = contentBudgetBytes - headBudgetBytes;

  return `${decodeHead(buffer, headBudgetBytes)}${marker}${decodeTail(buffer, tailBudgetBytes)}`;
};
