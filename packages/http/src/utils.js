export const isPlainObject = (v) => {
  if (v === null || typeof v !== 'object') return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

const has = (name) => typeof globalThis[name] === 'function';
export const isFormData = (v) => has('FormData') && v instanceof FormData;
export const isBlob = (v) => has('Blob') && v instanceof Blob;
export const isURLSearchParams = (v) => has('URLSearchParams') && v instanceof URLSearchParams;
export const isReadableStream = (v) => has('ReadableStream') && v instanceof ReadableStream;
export const isArrayBufferLike = (v) => v instanceof ArrayBuffer || ArrayBuffer.isView(v);

/** Request bodies that fetch accepts as they are. */
export const isRawBody = (v) =>
  typeof v === 'string' || isFormData(v) || isBlob(v) || isURLSearchParams(v) || isReadableStream(v) || isArrayBufferLike(v);
