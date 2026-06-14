/* eslint-disable @typescript-eslint/no-require-imports */
const { TextDecoder, TextEncoder } = require("node:util");
const {
  ReadableStream,
  TransformStream,
  WritableStream,
} = require("node:stream/web");
const { performance } = require("node:perf_hooks");
const { BroadcastChannel } = require("node:worker_threads");

// Set core globals BEFORE loading undici — undici itself needs TextDecoder
Object.defineProperties(globalThis, {
  TextDecoder: { value: TextDecoder, writable: true, configurable: true },
  TextEncoder: { value: TextEncoder, writable: true, configurable: true },
  ReadableStream: { value: ReadableStream, writable: true, configurable: true },
  TransformStream: {
    value: TransformStream,
    writable: true,
    configurable: true,
  },
  WritableStream: { value: WritableStream, writable: true, configurable: true },
  BroadcastChannel: {
    value: BroadcastChannel,
    writable: true,
    configurable: true,
  },
  performance: { value: performance, writable: true, configurable: true },
});

const { fetch, Headers, Request, Response, FormData } = require("undici");

Object.defineProperties(globalThis, {
  fetch: { value: fetch, writable: true, configurable: true },
  Headers: { value: Headers, writable: true, configurable: true },
  FormData: { value: FormData, writable: true, configurable: true },
  Request: { value: Request, writable: true, configurable: true },
  Response: { value: Response, writable: true, configurable: true },
});
