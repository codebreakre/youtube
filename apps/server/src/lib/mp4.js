import fs from 'node:fs/promises';

/**
 * Read the duration (seconds) of an MP4/MOV file by walking its boxes:
 * top level → "moov" → "mvhd" (timescale + duration). No ffmpeg needed.
 */
export async function mp4Duration(file) {
  let fh;
  try {
    fh = await fs.open(file, 'r');
    const { size } = await fh.stat();
    const moov = await findBox(fh, 0, size, 'moov');
    if (!moov) return null;
    const mvhd = await findBox(fh, moov.start + moov.header, moov.end, 'mvhd');
    if (!mvhd) return null;

    const buf = Buffer.alloc(32);
    await fh.read(buf, 0, 32, mvhd.start + mvhd.header);
    const version = buf[0];
    let timescale;
    let duration;
    if (version === 1) {
      timescale = buf.readUInt32BE(20);
      duration = Number(buf.readBigUInt64BE(24));
    } else {
      timescale = buf.readUInt32BE(12);
      duration = buf.readUInt32BE(16);
    }
    return timescale ? Math.round((duration / timescale) * 100) / 100 : null;
  } catch {
    return null;
  } finally {
    await fh?.close();
  }
}

async function findBox(fh, offset, end, type) {
  const h = Buffer.alloc(16);
  while (offset + 8 <= end) {
    const { bytesRead } = await fh.read(h, 0, 16, offset);
    if (bytesRead < 8) return null;
    let boxSize = h.readUInt32BE(0);
    const boxType = h.toString('latin1', 4, 8);
    let header = 8;
    if (boxSize === 1) {
      boxSize = Number(h.readBigUInt64BE(8));
      header = 16;
    } else if (boxSize === 0) {
      boxSize = end - offset;
    }
    if (boxSize < header) return null;
    if (boxType === type) return { start: offset, header, end: offset + boxSize };
    offset += boxSize;
  }
  return null;
}
