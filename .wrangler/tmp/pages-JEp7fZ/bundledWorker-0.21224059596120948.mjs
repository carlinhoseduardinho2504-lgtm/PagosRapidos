var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// ../.wrangler/tmp/bundle-RDHAAd/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// ../node_modules/unenv/dist/runtime/_internal/utils.mjs
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// ../node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
__name(PerformanceEntry, "PerformanceEntry");
var PerformanceMark = /* @__PURE__ */ __name(class PerformanceMark2 extends PerformanceEntry {
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
}, "PerformanceMark");
var PerformanceMeasure = class extends PerformanceEntry {
  entryType = "measure";
};
__name(PerformanceMeasure, "PerformanceMeasure");
var PerformanceResourceTiming = class extends PerformanceEntry {
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
__name(PerformanceResourceTiming, "PerformanceResourceTiming");
var PerformanceObserverEntryList = class {
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
__name(PerformanceObserverEntryList, "PerformanceObserverEntryList");
var Performance = class {
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
__name(Performance, "Performance");
var PerformanceObserver = class {
  __unenv__ = true;
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
__name(PerformanceObserver, "PerformanceObserver");
__publicField(PerformanceObserver, "supportedEntryTypes", []);
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// ../node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// ../node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// ../node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// ../node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// ../node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// ../node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// ../node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// ../node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// ../node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
import { Socket } from "node:net";
var ReadStream = class extends Socket {
  fd;
  constructor(fd) {
    super();
    this.fd = fd;
  }
  isRaw = false;
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
  isTTY = false;
};
__name(ReadStream, "ReadStream");

// ../node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
import { Socket as Socket2 } from "node:net";
var WriteStream = class extends Socket2 {
  fd;
  constructor(fd) {
    super();
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x2, y2, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  columns = 80;
  rows = 24;
  isTTY = false;
};
__name(WriteStream, "WriteStream");

// ../node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class extends EventEmitter {
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return "";
  }
  get versions() {
    return {};
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  ref() {
  }
  unref() {
  }
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: () => 0 });
  mainModule = void 0;
  domain = void 0;
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};
__name(Process, "Process");

// ../node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var { exit, platform, nextTick } = getBuiltinModule(
  "node:process"
);
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  nextTick
});
var {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  finalization,
  features,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  on,
  off,
  once,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// ../node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// _worker.js
var Pt = Object.defineProperty;
var ot = /* @__PURE__ */ __name((e) => {
  throw TypeError(e);
}, "ot");
var $t = /* @__PURE__ */ __name((e, t, s) => t in e ? Pt(e, t, { enumerable: true, configurable: true, writable: true, value: s }) : e[t] = s, "$t");
var h = /* @__PURE__ */ __name((e, t, s) => $t(e, typeof t != "symbol" ? t + "" : t, s), "h");
var Qe = /* @__PURE__ */ __name((e, t, s) => t.has(e) || ot("Cannot " + s), "Qe");
var l = /* @__PURE__ */ __name((e, t, s) => (Qe(e, t, "read from private field"), s ? s.call(e) : t.get(e)), "l");
var g = /* @__PURE__ */ __name((e, t, s) => t.has(e) ? ot("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, s), "g");
var f = /* @__PURE__ */ __name((e, t, s, r) => (Qe(e, t, "write to private field"), r ? r.call(e, s) : t.set(e, s), s), "f");
var _ = /* @__PURE__ */ __name((e, t, s) => (Qe(e, t, "access private method"), s), "_");
var it = /* @__PURE__ */ __name((e, t, s, r) => ({ set _(a) {
  f(e, t, a, s);
}, get _() {
  return l(e, t, r);
} }), "it");
var dt = /* @__PURE__ */ __name((e, t, s) => (r, a) => {
  let n = -1;
  return i(0);
  async function i(o) {
    if (o <= n)
      throw new Error("next() called multiple times");
    n = o;
    let d, c = false, u;
    if (e[o] ? (u = e[o][0][0], r.req.routeIndex = o) : u = o === e.length && a || void 0, u)
      try {
        d = await u(r, () => i(o + 1));
      } catch (p) {
        if (p instanceof Error && t)
          r.error = p, d = await t(p, r), c = true;
        else
          throw p;
      }
    else
      r.finalized === false && s && (d = await s(r));
    return d && (r.finalized === false || c) && (r.res = d), r;
  }
  __name(i, "i");
}, "dt");
var qt = Symbol();
var Jt = /* @__PURE__ */ __name(async (e, t = /* @__PURE__ */ Object.create(null)) => {
  const { all: s = false, dot: r = false } = t, n = (e instanceof Ot ? e.raw.headers : e.headers).get("Content-Type");
  return n != null && n.startsWith("multipart/form-data") || n != null && n.startsWith("application/x-www-form-urlencoded") ? zt(e, { all: s, dot: r }) : {};
}, "Jt");
async function zt(e, t) {
  const s = await e.formData();
  return s ? kt(s, t) : {};
}
__name(zt, "zt");
function kt(e, t) {
  const s = /* @__PURE__ */ Object.create(null);
  return e.forEach((r, a) => {
    t.all || a.endsWith("[]") ? Vt(s, a, r) : s[a] = r;
  }), t.dot && Object.entries(s).forEach(([r, a]) => {
    r.includes(".") && (Gt(s, r, a), delete s[r]);
  }), s;
}
__name(kt, "kt");
var Vt = /* @__PURE__ */ __name((e, t, s) => {
  e[t] !== void 0 ? Array.isArray(e[t]) ? e[t].push(s) : e[t] = [e[t], s] : t.endsWith("[]") ? e[t] = [s] : e[t] = s;
}, "Vt");
var Gt = /* @__PURE__ */ __name((e, t, s) => {
  if (/(?:^|\.)__proto__\./.test(t))
    return;
  let r = e;
  const a = t.split(".");
  a.forEach((n, i) => {
    i === a.length - 1 ? r[n] = s : ((!r[n] || typeof r[n] != "object" || Array.isArray(r[n]) || r[n] instanceof File) && (r[n] = /* @__PURE__ */ Object.create(null)), r = r[n]);
  });
}, "Gt");
var Nt = /* @__PURE__ */ __name((e) => {
  const t = e.split("/");
  return t[0] === "" && t.shift(), t;
}, "Nt");
var Yt = /* @__PURE__ */ __name((e) => {
  const { groups: t, path: s } = Kt(e), r = Nt(s);
  return Xt(r, t);
}, "Yt");
var Kt = /* @__PURE__ */ __name((e) => {
  const t = [];
  return e = e.replace(/\{[^}]+\}/g, (s, r) => {
    const a = `@${r}`;
    return t.push([a, s]), a;
  }), { groups: t, path: e };
}, "Kt");
var Xt = /* @__PURE__ */ __name((e, t) => {
  for (let s = t.length - 1; s >= 0; s--) {
    const [r] = t[s];
    for (let a = e.length - 1; a >= 0; a--)
      if (e[a].includes(r)) {
        e[a] = e[a].replace(r, t[s][1]);
        break;
      }
  }
  return e;
}, "Xt");
var Fe = {};
var Qt = /* @__PURE__ */ __name((e, t) => {
  if (e === "*")
    return "*";
  const s = e.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (s) {
    const r = `${e}#${t}`;
    return Fe[r] || (s[2] ? Fe[r] = t && t[0] !== ":" && t[0] !== "*" ? [r, s[1], new RegExp(`^${s[2]}(?=/${t})`)] : [e, s[1], new RegExp(`^${s[2]}$`)] : Fe[r] = [e, s[1], true]), Fe[r];
  }
  return null;
}, "Qt");
var st = /* @__PURE__ */ __name((e, t) => {
  try {
    return t(e);
  } catch {
    return e.replace(/(?:%[0-9A-Fa-f]{2})+/g, (s) => {
      try {
        return t(s);
      } catch {
        return s;
      }
    });
  }
}, "st");
var St = /* @__PURE__ */ __name((e) => st(e, decodeURI), "St");
var vt = /* @__PURE__ */ __name((e) => {
  const t = e.url, s = t.indexOf("/", t.indexOf(":") + 4);
  let r = s;
  for (; r < t.length; r++) {
    const a = t.charCodeAt(r);
    if (a === 37) {
      const n = t.indexOf("?", r), i = t.indexOf("#", r), o = n === -1 ? i === -1 ? void 0 : i : i === -1 ? n : Math.min(n, i), d = t.slice(s, o);
      return St(d.includes("%25") ? d.replace(/%25/g, "%2525") : d);
    } else if (a === 63 || a === 35)
      break;
  }
  return t.slice(s, r);
}, "vt");
var Zt = /* @__PURE__ */ __name((e) => {
  const t = vt(e);
  return t.length > 1 && t.at(-1) === "/" ? t.slice(0, -1) : t;
}, "Zt");
var ce = /* @__PURE__ */ __name((e, t, ...s) => (s.length && (t = ce(t, ...s)), `${(e == null ? void 0 : e[0]) === "/" ? "" : "/"}${e}${t === "/" ? "" : `${(e == null ? void 0 : e.at(-1)) === "/" ? "" : "/"}${(t == null ? void 0 : t[0]) === "/" ? t.slice(1) : t}`}`), "ce");
var wt = /* @__PURE__ */ __name((e) => {
  if (e.charCodeAt(e.length - 1) !== 63 || !e.includes(":"))
    return null;
  const t = e.split("/"), s = [];
  let r = "";
  return t.forEach((a) => {
    if (a !== "" && !/\:/.test(a))
      r += "/" + a;
    else if (/\:/.test(a))
      if (/\?/.test(a)) {
        s.length === 0 && r === "" ? s.push("/") : s.push(r);
        const n = a.replace("?", "");
        r += "/" + n, s.push(r);
      } else
        r += "/" + a;
  }), s.filter((a, n, i) => i.indexOf(a) === n);
}, "wt");
var Ze = /* @__PURE__ */ __name((e) => /[%+]/.test(e) ? (e.indexOf("+") !== -1 && (e = e.replace(/\+/g, " ")), e.indexOf("%") !== -1 ? st(e, jt) : e) : e, "Ze");
var bt = /* @__PURE__ */ __name((e, t, s) => {
  let r;
  if (!s && t && !/[%+]/.test(t)) {
    let i = e.indexOf("?", 8);
    if (i === -1)
      return;
    for (e.startsWith(t, i + 1) || (i = e.indexOf(`&${t}`, i + 1)); i !== -1; ) {
      const o = e.charCodeAt(i + t.length + 1);
      if (o === 61) {
        const d = i + t.length + 2, c = e.indexOf("&", d);
        return Ze(e.slice(d, c === -1 ? void 0 : c));
      } else if (o == 38 || isNaN(o))
        return "";
      i = e.indexOf(`&${t}`, i + 1);
    }
    if (r = /[%+]/.test(e), !r)
      return;
  }
  const a = {};
  r ?? (r = /[%+]/.test(e));
  let n = e.indexOf("?", 8);
  for (; n !== -1; ) {
    const i = e.indexOf("&", n + 1);
    let o = e.indexOf("=", n);
    o > i && i !== -1 && (o = -1);
    let d = e.slice(n + 1, o === -1 ? i === -1 ? void 0 : i : o);
    if (r && (d = Ze(d)), n = i, d === "")
      continue;
    let c;
    o === -1 ? c = "" : (c = e.slice(o + 1, i === -1 ? void 0 : i), r && (c = Ze(c))), s ? (a[d] && Array.isArray(a[d]) || (a[d] = []), a[d].push(c)) : a[d] ?? (a[d] = c);
  }
  return t ? a[t] : a;
}, "bt");
var es = bt;
var ts = /* @__PURE__ */ __name((e, t) => bt(e, t, true), "ts");
var jt = decodeURIComponent;
var ct = /* @__PURE__ */ __name((e) => st(e, jt), "ct");
var pe;
var y;
var P;
var Dt;
var Tt;
var tt;
var q;
var Et;
var Ot = (Et = /* @__PURE__ */ __name(class {
  constructor(e, t = "/", s = [[]]) {
    g(this, P);
    h(this, "raw");
    g(this, pe);
    g(this, y);
    h(this, "routeIndex", 0);
    h(this, "path");
    h(this, "bodyCache", {});
    g(this, q, (e2) => {
      const { bodyCache: t2, raw: s2 } = this, r = t2[e2];
      if (r)
        return r;
      const a = Object.keys(t2)[0];
      return a ? t2[a].then((n) => (a === "json" && (n = JSON.stringify(n)), new Response(n)[e2]())) : t2[e2] = s2[e2]();
    });
    this.raw = e, this.path = t, f(this, y, s), f(this, pe, {});
  }
  param(e) {
    return e ? _(this, P, Dt).call(this, e) : _(this, P, Tt).call(this);
  }
  query(e) {
    return es(this.url, e);
  }
  queries(e) {
    return ts(this.url, e);
  }
  header(e) {
    if (e)
      return this.raw.headers.get(e) ?? void 0;
    const t = {};
    return this.raw.headers.forEach((s, r) => {
      t[r] = s;
    }), t;
  }
  async parseBody(e) {
    return Jt(this, e);
  }
  json() {
    return l(this, q).call(this, "text").then((e) => JSON.parse(e));
  }
  text() {
    return l(this, q).call(this, "text");
  }
  arrayBuffer() {
    return l(this, q).call(this, "arrayBuffer");
  }
  blob() {
    return l(this, q).call(this, "blob");
  }
  formData() {
    return l(this, q).call(this, "formData");
  }
  addValidatedData(e, t) {
    l(this, pe)[e] = t;
  }
  valid(e) {
    return l(this, pe)[e];
  }
  get url() {
    return this.raw.url;
  }
  get method() {
    return this.raw.method;
  }
  get [qt]() {
    return l(this, y);
  }
  get matchedRoutes() {
    return l(this, y)[0].map(([[, e]]) => e);
  }
  get routePath() {
    return l(this, y)[0].map(([[, e]]) => e)[this.routeIndex].path;
  }
}, "Et"), pe = /* @__PURE__ */ new WeakMap(), y = /* @__PURE__ */ new WeakMap(), P = /* @__PURE__ */ new WeakSet(), Dt = /* @__PURE__ */ __name(function(e) {
  const t = l(this, y)[0][this.routeIndex][1][e], s = _(this, P, tt).call(this, t);
  return s && /\%/.test(s) ? ct(s) : s;
}, "Dt"), Tt = /* @__PURE__ */ __name(function() {
  const e = {}, t = Object.keys(l(this, y)[0][this.routeIndex][1]);
  for (const s of t) {
    const r = _(this, P, tt).call(this, l(this, y)[0][this.routeIndex][1][s]);
    r !== void 0 && (e[s] = /\%/.test(r) ? ct(r) : r);
  }
  return e;
}, "Tt"), tt = /* @__PURE__ */ __name(function(e) {
  return l(this, y)[1] ? l(this, y)[1][e] : e;
}, "tt"), q = /* @__PURE__ */ new WeakMap(), Et);
var ss = { Stringify: 1 };
var Rt = /* @__PURE__ */ __name(async (e, t, s, r, a) => {
  typeof e == "object" && !(e instanceof String) && (e instanceof Promise || (e = e.toString()), e instanceof Promise && (e = await e));
  const n = e.callbacks;
  return n != null && n.length ? (a ? a[0] += e : a = [e], Promise.all(n.map((o) => o({ phase: t, buffer: a, context: r }))).then((o) => Promise.all(o.filter(Boolean).map((d) => Rt(d, t, false, r, a))).then(() => a[0]))) : Promise.resolve(e);
}, "Rt");
var rs = "text/plain; charset=UTF-8";
var et = /* @__PURE__ */ __name((e, t) => ({ "Content-Type": e, ...t }), "et");
var Oe = /* @__PURE__ */ __name((e, t) => new Response(e, t), "Oe");
var Ae;
var ye;
var W;
var Ee;
var B;
var T;
var Ie;
var fe;
var he;
var X;
var Ce;
var He;
var J;
var ue;
var ft;
var as = (ft = /* @__PURE__ */ __name(class {
  constructor(e, t) {
    g(this, J);
    g(this, Ae);
    g(this, ye);
    h(this, "env", {});
    g(this, W);
    h(this, "finalized", false);
    h(this, "error");
    g(this, Ee);
    g(this, B);
    g(this, T);
    g(this, Ie);
    g(this, fe);
    g(this, he);
    g(this, X);
    g(this, Ce);
    g(this, He);
    h(this, "render", (...e2) => (l(this, fe) ?? f(this, fe, (t2) => this.html(t2)), l(this, fe).call(this, ...e2)));
    h(this, "setLayout", (e2) => f(this, Ie, e2));
    h(this, "getLayout", () => l(this, Ie));
    h(this, "setRenderer", (e2) => {
      f(this, fe, e2);
    });
    h(this, "header", (e2, t2, s) => {
      this.finalized && f(this, T, Oe(l(this, T).body, l(this, T)));
      const r = l(this, T) ? l(this, T).headers : l(this, X) ?? f(this, X, new Headers());
      t2 === void 0 ? r.delete(e2) : s != null && s.append ? r.append(e2, t2) : r.set(e2, t2);
    });
    h(this, "status", (e2) => {
      f(this, Ee, e2);
    });
    h(this, "set", (e2, t2) => {
      l(this, W) ?? f(this, W, /* @__PURE__ */ new Map()), l(this, W).set(e2, t2);
    });
    h(this, "get", (e2) => l(this, W) ? l(this, W).get(e2) : void 0);
    h(this, "newResponse", (...e2) => _(this, J, ue).call(this, ...e2));
    h(this, "body", (e2, t2, s) => _(this, J, ue).call(this, e2, t2, s));
    h(this, "text", (e2, t2, s) => !l(this, X) && !l(this, Ee) && !t2 && !s && !this.finalized ? new Response(e2) : _(this, J, ue).call(this, e2, t2, et(rs, s)));
    h(this, "json", (e2, t2, s) => _(this, J, ue).call(this, JSON.stringify(e2), t2, et("application/json", s)));
    h(this, "html", (e2, t2, s) => {
      const r = /* @__PURE__ */ __name((a) => _(this, J, ue).call(this, a, t2, et("text/html; charset=UTF-8", s)), "r");
      return typeof e2 == "object" ? Rt(e2, ss.Stringify, false, {}).then(r) : r(e2);
    });
    h(this, "redirect", (e2, t2) => {
      const s = String(e2);
      return this.header("Location", /[^\x00-\xFF]/.test(s) ? encodeURI(s) : s), this.newResponse(null, t2 ?? 302);
    });
    h(this, "notFound", () => (l(this, he) ?? f(this, he, () => Oe()), l(this, he).call(this, this)));
    f(this, Ae, e), t && (f(this, B, t.executionCtx), this.env = t.env, f(this, he, t.notFoundHandler), f(this, He, t.path), f(this, Ce, t.matchResult));
  }
  get req() {
    return l(this, ye) ?? f(this, ye, new Ot(l(this, Ae), l(this, He), l(this, Ce))), l(this, ye);
  }
  get event() {
    if (l(this, B) && "respondWith" in l(this, B))
      return l(this, B);
    throw Error("This context has no FetchEvent");
  }
  get executionCtx() {
    if (l(this, B))
      return l(this, B);
    throw Error("This context has no ExecutionContext");
  }
  get res() {
    return l(this, T) || f(this, T, Oe(null, { headers: l(this, X) ?? f(this, X, new Headers()) }));
  }
  set res(e) {
    if (l(this, T) && e) {
      e = Oe(e.body, e);
      for (const [t, s] of l(this, T).headers.entries())
        if (t !== "content-type")
          if (t === "set-cookie") {
            const r = l(this, T).headers.getSetCookie();
            e.headers.delete("set-cookie");
            for (const a of r)
              e.headers.append("set-cookie", a);
          } else
            e.headers.set(t, s);
    }
    f(this, T, e), this.finalized = true;
  }
  get var() {
    return l(this, W) ? Object.fromEntries(l(this, W)) : {};
  }
}, "ft"), Ae = /* @__PURE__ */ new WeakMap(), ye = /* @__PURE__ */ new WeakMap(), W = /* @__PURE__ */ new WeakMap(), Ee = /* @__PURE__ */ new WeakMap(), B = /* @__PURE__ */ new WeakMap(), T = /* @__PURE__ */ new WeakMap(), Ie = /* @__PURE__ */ new WeakMap(), fe = /* @__PURE__ */ new WeakMap(), he = /* @__PURE__ */ new WeakMap(), X = /* @__PURE__ */ new WeakMap(), Ce = /* @__PURE__ */ new WeakMap(), He = /* @__PURE__ */ new WeakMap(), J = /* @__PURE__ */ new WeakSet(), ue = /* @__PURE__ */ __name(function(e, t, s) {
  const r = l(this, T) ? new Headers(l(this, T).headers) : l(this, X) ?? new Headers();
  if (typeof t == "object" && "headers" in t) {
    const n = t.headers instanceof Headers ? t.headers : new Headers(t.headers);
    for (const [i, o] of n)
      i.toLowerCase() === "set-cookie" ? r.append(i, o) : r.set(i, o);
  }
  if (s)
    for (const [n, i] of Object.entries(s))
      if (typeof i == "string")
        r.set(n, i);
      else {
        r.delete(n);
        for (const o of i)
          r.append(n, o);
      }
  const a = typeof t == "number" ? t : (t == null ? void 0 : t.status) ?? l(this, Ee);
  return Oe(e, { status: a, headers: r });
}, "ue"), ft);
var v = "ALL";
var ns = "all";
var os = ["get", "post", "put", "delete", "options", "patch"];
var At = "Can not add a route since the matcher is already built.";
var yt = /* @__PURE__ */ __name(class extends Error {
}, "yt");
var is = "__COMPOSED_HANDLER";
var ds = /* @__PURE__ */ __name((e) => e.text("404 Not Found", 404), "ds");
var ut = /* @__PURE__ */ __name((e, t) => {
  if ("getResponse" in e) {
    const s = e.getResponse();
    return t.newResponse(s.body, s);
  }
  return console.error(e), t.text("Internal Server Error", 500);
}, "ut");
var I;
var w;
var It;
var C;
var Y;
var Ue;
var Pe;
var me;
var cs = (me = /* @__PURE__ */ __name(class {
  constructor(t = {}) {
    g(this, w);
    h(this, "get");
    h(this, "post");
    h(this, "put");
    h(this, "delete");
    h(this, "options");
    h(this, "patch");
    h(this, "all");
    h(this, "on");
    h(this, "use");
    h(this, "router");
    h(this, "getPath");
    h(this, "_basePath", "/");
    g(this, I, "/");
    h(this, "routes", []);
    g(this, C, ds);
    h(this, "errorHandler", ut);
    h(this, "onError", (t2) => (this.errorHandler = t2, this));
    h(this, "notFound", (t2) => (f(this, C, t2), this));
    h(this, "fetch", (t2, ...s) => _(this, w, Pe).call(this, t2, s[1], s[0], t2.method));
    h(this, "request", (t2, s, r2, a2) => t2 instanceof Request ? this.fetch(s ? new Request(t2, s) : t2, r2, a2) : (t2 = t2.toString(), this.fetch(new Request(/^https?:\/\//.test(t2) ? t2 : `http://localhost${ce("/", t2)}`, s), r2, a2)));
    h(this, "fire", () => {
      addEventListener("fetch", (t2) => {
        t2.respondWith(_(this, w, Pe).call(this, t2.request, t2, void 0, t2.request.method));
      });
    });
    [...os, ns].forEach((n) => {
      this[n] = (i, ...o) => (typeof i == "string" ? f(this, I, i) : _(this, w, Y).call(this, n, l(this, I), i), o.forEach((d) => {
        _(this, w, Y).call(this, n, l(this, I), d);
      }), this);
    }), this.on = (n, i, ...o) => {
      for (const d of [i].flat()) {
        f(this, I, d);
        for (const c of [n].flat())
          o.map((u) => {
            _(this, w, Y).call(this, c.toUpperCase(), l(this, I), u);
          });
      }
      return this;
    }, this.use = (n, ...i) => (typeof n == "string" ? f(this, I, n) : (f(this, I, "*"), i.unshift(n)), i.forEach((o) => {
      _(this, w, Y).call(this, v, l(this, I), o);
    }), this);
    const { strict: r, ...a } = t;
    Object.assign(this, a), this.getPath = r ?? true ? t.getPath ?? vt : Zt;
  }
  route(t, s) {
    const r = this.basePath(t);
    return s.routes.map((a) => {
      var i;
      let n;
      s.errorHandler === ut ? n = a.handler : (n = /* @__PURE__ */ __name(async (o, d) => (await dt([], s.errorHandler)(o, () => a.handler(o, d))).res, "n"), n[is] = a.handler), _(i = r, w, Y).call(i, a.method, a.path, n);
    }), this;
  }
  basePath(t) {
    const s = _(this, w, It).call(this);
    return s._basePath = ce(this._basePath, t), s;
  }
  mount(t, s, r) {
    let a, n;
    r && (typeof r == "function" ? n = r : (n = r.optionHandler, r.replaceRequest === false ? a = /* @__PURE__ */ __name((d) => d, "a") : a = r.replaceRequest));
    const i = n ? (d) => {
      const c = n(d);
      return Array.isArray(c) ? c : [c];
    } : (d) => {
      let c;
      try {
        c = d.executionCtx;
      } catch {
      }
      return [d.env, c];
    };
    a || (a = (() => {
      const d = ce(this._basePath, t), c = d === "/" ? 0 : d.length;
      return (u) => {
        const p = new URL(u.url);
        return p.pathname = p.pathname.slice(c) || "/", new Request(p, u);
      };
    })());
    const o = /* @__PURE__ */ __name(async (d, c) => {
      const u = await s(a(d.req.raw), ...i(d));
      if (u)
        return u;
      await c();
    }, "o");
    return _(this, w, Y).call(this, v, ce(t, "*"), o), this;
  }
}, "me"), I = /* @__PURE__ */ new WeakMap(), w = /* @__PURE__ */ new WeakSet(), It = /* @__PURE__ */ __name(function() {
  const t = new me({ router: this.router, getPath: this.getPath });
  return t.errorHandler = this.errorHandler, f(t, C, l(this, C)), t.routes = this.routes, t;
}, "It"), C = /* @__PURE__ */ new WeakMap(), Y = /* @__PURE__ */ __name(function(t, s, r) {
  t = t.toUpperCase(), s = ce(this._basePath, s);
  const a = { basePath: this._basePath, path: s, method: t, handler: r };
  this.router.add(t, s, [r, a]), this.routes.push(a);
}, "Y"), Ue = /* @__PURE__ */ __name(function(t, s) {
  if (t instanceof Error)
    return this.errorHandler(t, s);
  throw t;
}, "Ue"), Pe = /* @__PURE__ */ __name(function(t, s, r, a) {
  if (a === "HEAD")
    return (async () => new Response(null, await _(this, w, Pe).call(this, t, s, r, "GET")))();
  const n = this.getPath(t, { env: r }), i = this.router.match(a, n), o = new as(t, { path: n, matchResult: i, env: r, executionCtx: s, notFoundHandler: l(this, C) });
  if (i[0].length === 1) {
    let c;
    try {
      c = i[0][0][0][0](o, async () => {
        o.res = await l(this, C).call(this, o);
      });
    } catch (u) {
      return _(this, w, Ue).call(this, u, o);
    }
    return c instanceof Promise ? c.then((u) => u || (o.finalized ? o.res : l(this, C).call(this, o))).catch((u) => _(this, w, Ue).call(this, u, o)) : c ?? l(this, C).call(this, o);
  }
  const d = dt(i[0], this.errorHandler, l(this, C));
  return (async () => {
    try {
      const c = await d(o);
      if (!c.finalized)
        throw new Error("Context is not finalized. Did you forget to return a Response object or `await next()`?");
      return c.res;
    } catch (c) {
      return _(this, w, Ue).call(this, c, o);
    }
  })();
}, "Pe"), me);
var Ct = [];
function us(e, t) {
  const s = this.buildAllMatchers(), r = /* @__PURE__ */ __name((a, n) => {
    const i = s[a] || s[v], o = i[2][n];
    if (o)
      return o;
    const d = n.match(i[0]);
    if (!d)
      return [[], Ct];
    const c = d.indexOf("", 1);
    return [i[1][c], d];
  }, "r");
  return this.match = r, r(e, t);
}
__name(us, "us");
var qe = "[^/]+";
var Te = ".*";
var Re = "(?:|/.*)";
var le = Symbol();
var ls = new Set(".\\+*[^]$()");
function ps(e, t) {
  return e.length === 1 ? t.length === 1 ? e < t ? -1 : 1 : -1 : t.length === 1 || e === Te || e === Re ? 1 : t === Te || t === Re ? -1 : e === qe ? 1 : t === qe ? -1 : e.length === t.length ? e < t ? -1 : 1 : t.length - e.length;
}
__name(ps, "ps");
var Q;
var Z;
var H;
var se;
var Es = (se = /* @__PURE__ */ __name(class {
  constructor() {
    g(this, Q);
    g(this, Z);
    g(this, H, /* @__PURE__ */ Object.create(null));
  }
  insert(t, s, r, a, n) {
    if (t.length === 0) {
      if (l(this, Q) !== void 0)
        throw le;
      if (n)
        return;
      f(this, Q, s);
      return;
    }
    const [i, ...o] = t, d = i === "*" ? o.length === 0 ? ["", "", Te] : ["", "", qe] : i === "/*" ? ["", "", Re] : i.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let c;
    if (d) {
      const u = d[1];
      let p = d[2] || qe;
      if (u && d[2] && (p === ".*" || (p = p.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:"), /\((?!\?:)/.test(p))))
        throw le;
      if (c = l(this, H)[p], !c) {
        if (Object.keys(l(this, H)).some((E) => E !== Te && E !== Re))
          throw le;
        if (n)
          return;
        c = l(this, H)[p] = new se(), u !== "" && f(c, Z, a.varIndex++);
      }
      !n && u !== "" && r.push([u, l(c, Z)]);
    } else if (c = l(this, H)[i], !c) {
      if (Object.keys(l(this, H)).some((u) => u.length > 1 && u !== Te && u !== Re))
        throw le;
      if (n)
        return;
      c = l(this, H)[i] = new se();
    }
    c.insert(o, s, r, a, n);
  }
  buildRegExpStr() {
    const s = Object.keys(l(this, H)).sort(ps).map((r) => {
      const a = l(this, H)[r];
      return (typeof l(a, Z) == "number" ? `(${r})@${l(a, Z)}` : ls.has(r) ? `\\${r}` : r) + a.buildRegExpStr();
    });
    return typeof l(this, Q) == "number" && s.unshift(`#${l(this, Q)}`), s.length === 0 ? "" : s.length === 1 ? s[0] : "(?:" + s.join("|") + ")";
  }
}, "se"), Q = /* @__PURE__ */ new WeakMap(), Z = /* @__PURE__ */ new WeakMap(), H = /* @__PURE__ */ new WeakMap(), se);
var Je;
var xe;
var ht;
var fs = (ht = /* @__PURE__ */ __name(class {
  constructor() {
    g(this, Je, { varIndex: 0 });
    g(this, xe, new Es());
  }
  insert(e, t, s) {
    const r = [], a = [];
    for (let i = 0; ; ) {
      let o = false;
      if (e = e.replace(/\{[^}]+\}/g, (d) => {
        const c = `@\\${i}`;
        return a[i] = [c, d], i++, o = true, c;
      }), !o)
        break;
    }
    const n = e.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = a.length - 1; i >= 0; i--) {
      const [o] = a[i];
      for (let d = n.length - 1; d >= 0; d--)
        if (n[d].indexOf(o) !== -1) {
          n[d] = n[d].replace(o, a[i][1]);
          break;
        }
    }
    return l(this, xe).insert(n, t, r, l(this, Je), s), r;
  }
  buildRegExp() {
    let e = l(this, xe).buildRegExpStr();
    if (e === "")
      return [/^$/, [], []];
    let t = 0;
    const s = [], r = [];
    return e = e.replace(/#(\d+)|@(\d+)|\.\*\$/g, (a, n, i) => n !== void 0 ? (s[++t] = Number(n), "$()") : (i !== void 0 && (r[Number(i)] = ++t), "")), [new RegExp(`^${e}`), s, r];
  }
}, "ht"), Je = /* @__PURE__ */ new WeakMap(), xe = /* @__PURE__ */ new WeakMap(), ht);
var hs = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var $e = /* @__PURE__ */ Object.create(null);
function Ht(e) {
  return $e[e] ?? ($e[e] = new RegExp(e === "*" ? "" : `^${e.replace(/\/\*$|([.\\+*[^\]$()])/g, (t, s) => s ? `\\${s}` : "(?:|/.*)")}$`));
}
__name(Ht, "Ht");
function ms() {
  $e = /* @__PURE__ */ Object.create(null);
}
__name(ms, "ms");
function gs(e) {
  var c;
  const t = new fs(), s = [];
  if (e.length === 0)
    return hs;
  const r = e.map((u) => [!/\*|\/:/.test(u[0]), ...u]).sort(([u, p], [E, N]) => u ? 1 : E ? -1 : p.length - N.length), a = /* @__PURE__ */ Object.create(null);
  for (let u = 0, p = -1, E = r.length; u < E; u++) {
    const [N, m, D] = r[u];
    N ? a[m] = [D.map(([A]) => [A, /* @__PURE__ */ Object.create(null)]), Ct] : p++;
    let b;
    try {
      b = t.insert(m, p, N);
    } catch (A) {
      throw A === le ? new yt(m) : A;
    }
    N || (s[p] = D.map(([A, S]) => {
      const L = /* @__PURE__ */ Object.create(null);
      for (S -= 1; S >= 0; S--) {
        const [we, Ke] = b[S];
        L[we] = Ke;
      }
      return [A, L];
    }));
  }
  const [n, i, o] = t.buildRegExp();
  for (let u = 0, p = s.length; u < p; u++)
    for (let E = 0, N = s[u].length; E < N; E++) {
      const m = (c = s[u][E]) == null ? void 0 : c[1];
      if (!m)
        continue;
      const D = Object.keys(m);
      for (let b = 0, A = D.length; b < A; b++)
        m[D[b]] = o[m[D[b]]];
    }
  const d = [];
  for (const u in i)
    d[u] = s[i[u]];
  return [n, d, a];
}
__name(gs, "gs");
function de(e, t) {
  if (e) {
    for (const s of Object.keys(e).sort((r, a) => a.length - r.length))
      if (Ht(s).test(t))
        return [...e[s]];
  }
}
__name(de, "de");
var z;
var k;
var ze;
var xt;
var mt;
var _s = (mt = /* @__PURE__ */ __name(class {
  constructor() {
    g(this, ze);
    h(this, "name", "RegExpRouter");
    g(this, z);
    g(this, k);
    h(this, "match", us);
    f(this, z, { [v]: /* @__PURE__ */ Object.create(null) }), f(this, k, { [v]: /* @__PURE__ */ Object.create(null) });
  }
  add(e, t, s) {
    var o;
    const r = l(this, z), a = l(this, k);
    if (!r || !a)
      throw new Error(At);
    r[e] || [r, a].forEach((d) => {
      d[e] = /* @__PURE__ */ Object.create(null), Object.keys(d[v]).forEach((c) => {
        d[e][c] = [...d[v][c]];
      });
    }), t === "/*" && (t = "*");
    const n = (t.match(/\/:/g) || []).length;
    if (/\*$/.test(t)) {
      const d = Ht(t);
      e === v ? Object.keys(r).forEach((c) => {
        var u;
        (u = r[c])[t] || (u[t] = de(r[c], t) || de(r[v], t) || []);
      }) : (o = r[e])[t] || (o[t] = de(r[e], t) || de(r[v], t) || []), Object.keys(r).forEach((c) => {
        (e === v || e === c) && Object.keys(r[c]).forEach((u) => {
          d.test(u) && r[c][u].push([s, n]);
        });
      }), Object.keys(a).forEach((c) => {
        (e === v || e === c) && Object.keys(a[c]).forEach((u) => d.test(u) && a[c][u].push([s, n]));
      });
      return;
    }
    const i = wt(t) || [t];
    for (let d = 0, c = i.length; d < c; d++) {
      const u = i[d];
      Object.keys(a).forEach((p) => {
        var E;
        (e === v || e === p) && ((E = a[p])[u] || (E[u] = [...de(r[p], u) || de(r[v], u) || []]), a[p][u].push([s, n - c + d + 1]));
      });
    }
  }
  buildAllMatchers() {
    const e = /* @__PURE__ */ Object.create(null);
    return Object.keys(l(this, k)).concat(Object.keys(l(this, z))).forEach((t) => {
      e[t] || (e[t] = _(this, ze, xt).call(this, t));
    }), f(this, z, f(this, k, void 0)), ms(), e;
  }
}, "mt"), z = /* @__PURE__ */ new WeakMap(), k = /* @__PURE__ */ new WeakMap(), ze = /* @__PURE__ */ new WeakSet(), xt = /* @__PURE__ */ __name(function(e) {
  const t = [];
  let s = e === v;
  return [l(this, z), l(this, k)].forEach((r) => {
    const a = r[e] ? Object.keys(r[e]).map((n) => [n, r[e][n]]) : [];
    a.length !== 0 ? (s || (s = true), t.push(...a)) : e !== v && t.push(...Object.keys(r[v]).map((n) => [n, r[v][n]]));
  }), s ? gs(t) : null;
}, "xt"), mt);
var V;
var F;
var gt;
var Ns = (gt = /* @__PURE__ */ __name(class {
  constructor(e) {
    h(this, "name", "SmartRouter");
    g(this, V, []);
    g(this, F, []);
    f(this, V, e.routers);
  }
  add(e, t, s) {
    if (!l(this, F))
      throw new Error(At);
    l(this, F).push([e, t, s]);
  }
  match(e, t) {
    if (!l(this, F))
      throw new Error("Fatal error");
    const s = l(this, V), r = l(this, F), a = s.length;
    let n = 0, i;
    for (; n < a; n++) {
      const o = s[n];
      try {
        for (let d = 0, c = r.length; d < c; d++)
          o.add(...r[d]);
        i = o.match(e, t);
      } catch (d) {
        if (d instanceof yt)
          continue;
        throw d;
      }
      this.match = o.match.bind(o), f(this, V, [o]), f(this, F, void 0);
      break;
    }
    if (n === a)
      throw new Error("Fatal error");
    return this.name = `SmartRouter + ${this.activeRouter.name}`, i;
  }
  get activeRouter() {
    if (l(this, F) || l(this, V).length !== 1)
      throw new Error("No active router has been determined yet.");
    return l(this, V)[0];
  }
}, "gt"), V = /* @__PURE__ */ new WeakMap(), F = /* @__PURE__ */ new WeakMap(), gt);
var De = /* @__PURE__ */ Object.create(null);
var Ss = /* @__PURE__ */ __name((e) => {
  for (const t in e)
    return true;
  return false;
}, "Ss");
var G;
var O;
var ee;
var ge;
var j;
var U;
var K;
var _e;
var vs = (_e = /* @__PURE__ */ __name(class {
  constructor(t, s, r) {
    g(this, U);
    g(this, G);
    g(this, O);
    g(this, ee);
    g(this, ge, 0);
    g(this, j, De);
    if (f(this, O, r || /* @__PURE__ */ Object.create(null)), f(this, G, []), t && s) {
      const a = /* @__PURE__ */ Object.create(null);
      a[t] = { handler: s, possibleKeys: [], score: 0 }, f(this, G, [a]);
    }
    f(this, ee, []);
  }
  insert(t, s, r) {
    f(this, ge, ++it(this, ge)._);
    let a = this;
    const n = Yt(s), i = [];
    for (let o = 0, d = n.length; o < d; o++) {
      const c = n[o], u = n[o + 1], p = Qt(c, u), E = Array.isArray(p) ? p[0] : c;
      if (E in l(a, O)) {
        a = l(a, O)[E], p && i.push(p[1]);
        continue;
      }
      l(a, O)[E] = new _e(), p && (l(a, ee).push(p), i.push(p[1])), a = l(a, O)[E];
    }
    return l(a, G).push({ [t]: { handler: r, possibleKeys: i.filter((o, d, c) => c.indexOf(o) === d), score: l(this, ge) } }), a;
  }
  search(t, s) {
    var u;
    const r = [];
    f(this, j, De);
    let n = [this];
    const i = Nt(s), o = [], d = i.length;
    let c = null;
    for (let p = 0; p < d; p++) {
      const E = i[p], N = p === d - 1, m = [];
      for (let b = 0, A = n.length; b < A; b++) {
        const S = n[b], L = l(S, O)[E];
        L && (f(L, j, l(S, j)), N ? (l(L, O)["*"] && _(this, U, K).call(this, r, l(L, O)["*"], t, l(S, j)), _(this, U, K).call(this, r, L, t, l(S, j))) : m.push(L));
        for (let we = 0, Ke = l(S, ee).length; we < Ke; we++) {
          const at = l(S, ee)[we], $ = l(S, j) === De ? {} : { ...l(S, j) };
          if (at === "*") {
            const oe = l(S, O)["*"];
            oe && (_(this, U, K).call(this, r, oe, t, l(S, j)), f(oe, j, $), m.push(oe));
            continue;
          }
          const [Ut, nt, be] = at;
          if (!E && !(be instanceof RegExp))
            continue;
          const M = l(S, O)[Ut];
          if (be instanceof RegExp) {
            if (c === null) {
              c = new Array(d);
              let ie = s[0] === "/" ? 1 : 0;
              for (let je = 0; je < d; je++)
                c[je] = ie, ie += i[je].length + 1;
            }
            const oe = s.substring(c[p]), Xe = be.exec(oe);
            if (Xe) {
              if ($[nt] = Xe[0], _(this, U, K).call(this, r, M, t, l(S, j), $), Ss(l(M, O))) {
                f(M, j, $);
                const ie = ((u = Xe[0].match(/\//)) == null ? void 0 : u.length) ?? 0;
                (o[ie] || (o[ie] = [])).push(M);
              }
              continue;
            }
          }
          (be === true || be.test(E)) && ($[nt] = E, N ? (_(this, U, K).call(this, r, M, t, $, l(S, j)), l(M, O)["*"] && _(this, U, K).call(this, r, l(M, O)["*"], t, $, l(S, j))) : (f(M, j, $), m.push(M)));
        }
      }
      const D = o.shift();
      n = D ? m.concat(D) : m;
    }
    return r.length > 1 && r.sort((p, E) => p.score - E.score), [r.map(({ handler: p, params: E }) => [p, E])];
  }
}, "_e"), G = /* @__PURE__ */ new WeakMap(), O = /* @__PURE__ */ new WeakMap(), ee = /* @__PURE__ */ new WeakMap(), ge = /* @__PURE__ */ new WeakMap(), j = /* @__PURE__ */ new WeakMap(), U = /* @__PURE__ */ new WeakSet(), K = /* @__PURE__ */ __name(function(t, s, r, a, n) {
  for (let i = 0, o = l(s, G).length; i < o; i++) {
    const d = l(s, G)[i], c = d[r] || d[v], u = {};
    if (c !== void 0 && (c.params = /* @__PURE__ */ Object.create(null), t.push(c), a !== De || n && n !== De))
      for (let p = 0, E = c.possibleKeys.length; p < E; p++) {
        const N = c.possibleKeys[p], m = u[c.score];
        c.params[N] = n != null && n[N] && !m ? n[N] : a[N] ?? (n == null ? void 0 : n[N]), u[c.score] = true;
      }
  }
}, "K"), _e);
var te;
var _t;
var ws = (_t = /* @__PURE__ */ __name(class {
  constructor() {
    h(this, "name", "TrieRouter");
    g(this, te);
    f(this, te, new vs());
  }
  add(e, t, s) {
    const r = wt(t);
    if (r) {
      for (let a = 0, n = r.length; a < n; a++)
        l(this, te).insert(e, r[a], s);
      return;
    }
    l(this, te).insert(e, t, s);
  }
  match(e, t) {
    return l(this, te).search(e, t);
  }
}, "_t"), te = /* @__PURE__ */ new WeakMap(), _t);
var x = /* @__PURE__ */ __name(class extends cs {
  constructor(e = {}) {
    super(e), this.router = e.router ?? new Ns({ routers: [new _s(), new ws()] });
  }
}, "x");
var bs = /* @__PURE__ */ __name((e) => {
  const t = { origin: "*", allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"], allowHeaders: [], exposeHeaders: [], ...e }, s = ((a) => typeof a == "string" ? a === "*" ? t.credentials ? (n) => n || null : () => a : (n) => a === n ? n : null : typeof a == "function" ? a : (n) => a.includes(n) ? n : null)(t.origin), r = ((a) => typeof a == "function" ? a : Array.isArray(a) ? () => a : () => [])(t.allowMethods);
  return async function(n, i) {
    var c;
    function o(u, p) {
      n.res.headers.set(u, p);
    }
    __name(o, "o");
    const d = await s(n.req.header("origin") || "", n);
    if (d && o("Access-Control-Allow-Origin", d), t.credentials && o("Access-Control-Allow-Credentials", "true"), (c = t.exposeHeaders) != null && c.length && o("Access-Control-Expose-Headers", t.exposeHeaders.join(",")), n.req.method === "OPTIONS") {
      (t.origin !== "*" || t.credentials) && o("Vary", "Origin"), t.maxAge != null && o("Access-Control-Max-Age", t.maxAge.toString());
      const u = await r(n.req.header("origin") || "", n);
      u.length && o("Access-Control-Allow-Methods", u.join(","));
      let p = t.allowHeaders;
      if (!(p != null && p.length)) {
        const E = n.req.header("Access-Control-Request-Headers");
        E && (p = E.split(/\s*,\s*/));
      }
      return p != null && p.length && (o("Access-Control-Allow-Headers", p.join(",")), n.res.headers.append("Vary", "Access-Control-Request-Headers")), n.res.headers.delete("Content-Length"), n.res.headers.delete("Content-Type"), new Response(null, { headers: n.res.headers, status: 204, statusText: "No Content" });
    }
    await i(), (t.origin !== "*" || t.credentials) && n.header("Vary", "Origin", { append: true });
  };
}, "bs");
var js = /^\s*(?:text\/(?!event-stream(?:[;\s]|$))[^;\s]+|application\/(?:javascript|json|xml|xml-dtd|ecmascript|dart|postscript|rtf|tar|toml|vnd\.dart|vnd\.ms-fontobject|vnd\.ms-opentype|wasm|x-httpd-php|x-javascript|x-ns-proxy-autoconfig|x-sh|x-tar|x-virtualbox-hdd|x-virtualbox-ova|x-virtualbox-ovf|x-virtualbox-vbox|x-virtualbox-vdi|x-virtualbox-vhd|x-virtualbox-vmdk|x-www-form-urlencoded)|font\/(?:otf|ttf)|image\/(?:bmp|vnd\.adobe\.photoshop|vnd\.microsoft\.icon|vnd\.ms-dds|x-icon|x-ms-bmp)|message\/rfc822|model\/gltf-binary|x-shader\/x-fragment|x-shader\/x-vertex|[^;\s]+?\+(?:json|text|xml|yaml))(?:[;\s]|$)/i;
var lt = /* @__PURE__ */ __name((e, t = Ds) => {
  const s = /\.([a-zA-Z0-9]+?)$/, r = e.match(s);
  if (!r)
    return;
  let a = t[r[1].toLowerCase()];
  return a && a.startsWith("text") && (a += "; charset=utf-8"), a;
}, "lt");
var Os = { aac: "audio/aac", avi: "video/x-msvideo", avif: "image/avif", av1: "video/av1", bin: "application/octet-stream", bmp: "image/bmp", css: "text/css", csv: "text/csv", eot: "application/vnd.ms-fontobject", epub: "application/epub+zip", gif: "image/gif", gz: "application/gzip", htm: "text/html", html: "text/html", ico: "image/x-icon", ics: "text/calendar", jpeg: "image/jpeg", jpg: "image/jpeg", js: "text/javascript", json: "application/json", jsonld: "application/ld+json", map: "application/json", mid: "audio/x-midi", midi: "audio/x-midi", mjs: "text/javascript", mp3: "audio/mpeg", mp4: "video/mp4", mpeg: "video/mpeg", oga: "audio/ogg", ogv: "video/ogg", ogx: "application/ogg", opus: "audio/opus", otf: "font/otf", pdf: "application/pdf", png: "image/png", rtf: "application/rtf", svg: "image/svg+xml", tif: "image/tiff", tiff: "image/tiff", ts: "video/mp2t", ttf: "font/ttf", txt: "text/plain", wasm: "application/wasm", webm: "video/webm", weba: "audio/webm", webmanifest: "application/manifest+json", webp: "image/webp", woff: "font/woff", woff2: "font/woff2", xhtml: "application/xhtml+xml", xml: "application/xml", zip: "application/zip", "3gp": "video/3gpp", "3g2": "video/3gpp2", gltf: "model/gltf+json", glb: "model/gltf-binary" };
var Ds = Os;
var Ts = /* @__PURE__ */ __name((...e) => {
  let t = e.filter((a) => a !== "").join("/");
  t = t.replace(new RegExp("(?<=\\/)\\/+", "g"), "");
  const s = t.split("/"), r = [];
  for (const a of s)
    a === ".." && r.length > 0 && r.at(-1) !== ".." ? r.pop() : a !== "." && r.push(a);
  return r.join("/") || ".";
}, "Ts");
var Lt = { br: ".br", zstd: ".zst", gzip: ".gz" };
var Rs = Object.keys(Lt);
var As = "index.html";
var ys = /* @__PURE__ */ __name((e) => {
  const t = e.root ?? "./", s = e.path, r = e.join ?? Ts;
  return async (a, n) => {
    var u, p, E, N;
    if (a.finalized)
      return n();
    let i;
    if (e.path)
      i = e.path;
    else
      try {
        if (i = St(a.req.path), /(?:^|[\/\\])\.{1,2}(?:$|[\/\\])|[\/\\]{2,}/.test(i))
          throw new Error();
      } catch {
        return await ((u = e.onNotFound) == null ? void 0 : u.call(e, a.req.path, a)), n();
      }
    let o = r(t, !s && e.rewriteRequestPath ? e.rewriteRequestPath(i) : i);
    e.isDir && await e.isDir(o) && (o = r(o, As));
    const d = e.getContent;
    let c = await d(o, a);
    if (c instanceof Response)
      return a.newResponse(c.body, c);
    if (c) {
      const m = e.mimes && lt(o, e.mimes) || lt(o);
      if (a.header("Content-Type", m || "application/octet-stream"), e.precompressed && (!m || js.test(m))) {
        const D = new Set((p = a.req.header("Accept-Encoding")) == null ? void 0 : p.split(",").map((b) => b.trim()));
        for (const b of Rs) {
          if (!D.has(b))
            continue;
          const A = await d(o + Lt[b], a);
          if (A) {
            c = A, a.header("Content-Encoding", b), a.header("Vary", "Accept-Encoding", { append: true });
            break;
          }
        }
      }
      return await ((E = e.onFound) == null ? void 0 : E.call(e, o, a)), a.body(c);
    }
    await ((N = e.onNotFound) == null ? void 0 : N.call(e, o, a)), await n();
  };
}, "ys");
var Is = /* @__PURE__ */ __name(async (e, t) => {
  let s;
  t && t.manifest ? typeof t.manifest == "string" ? s = JSON.parse(t.manifest) : s = t.manifest : typeof __STATIC_CONTENT_MANIFEST == "string" ? s = JSON.parse(__STATIC_CONTENT_MANIFEST) : s = __STATIC_CONTENT_MANIFEST;
  let r;
  t && t.namespace ? r = t.namespace : r = __STATIC_CONTENT;
  const a = s[e];
  if (!a)
    return null;
  const n = await r.get(a, { type: "stream" });
  return n || null;
}, "Is");
var Cs = /* @__PURE__ */ __name((e) => async function(s, r) {
  return ys({ ...e, getContent: async (n) => Is(n, { manifest: e.manifest, namespace: e.namespace ? e.namespace : s.env ? s.env.__STATIC_CONTENT : void 0 }) })(s, r);
}, "Cs");
var Mt = /* @__PURE__ */ __name((e) => Cs(e), "Mt");
async function ke(e, t) {
  const s = `PAGOS_RAPIDOS_${t}_SALT_2024`, r = `${e}:${s}`, n = new TextEncoder().encode(r), i = await crypto.subtle.digest("SHA-256", n);
  return Array.from(new Uint8Array(i)).map((d) => d.toString(16).padStart(2, "0")).join("");
}
__name(ke, "ke");
async function Wt(e, t, s) {
  if (s.startsWith("$hash$")) {
    const a = s.split("$");
    if (a[2] === t && a[3] === e)
      return true;
  }
  return await ke(e, t) === s;
}
__name(Wt, "Wt");
async function Hs() {
  const e = new Uint8Array(32);
  return crypto.getRandomValues(e), Array.from(e).map((t) => t.toString(16).padStart(2, "0")).join("");
}
__name(Hs, "Hs");
function xs(e) {
  const t = e === "por_pagar" ? "PP" : "PC", s = Date.now().toString(36).toUpperCase(), r = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${t}-${s}-${r}`;
}
__name(xs, "xs");
async function re(e, t) {
  const s = e.headers.get("Authorization");
  if (!(s != null && s.startsWith("Bearer ")))
    return null;
  const r = s.substring(7);
  if (!r)
    return null;
  try {
    const a = await t.prepare(`
      SELECT s.id, s.user_id, s.expires_at, 
             u.cedula, u.nombre, u.apellido, u.role, u.activo
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ? AND s.expires_at > datetime('now') AND u.activo = 1
    `).bind(r).first();
    return a ? { userId: a.user_id, cedula: a.cedula, nombre: `${a.nombre} ${a.apellido}`, role: a.role, sessionId: a.id } : null;
  } catch {
    return null;
  }
}
__name(re, "re");
var Le = new x();
Le.post("/login", async (e) => {
  try {
    const { cedula: t, password: s } = await e.req.json();
    if (!t || !s)
      return e.json({ error: "C\xE9dula y contrase\xF1a son requeridas" }, 400);
    const r = await e.env.DB.prepare("SELECT * FROM users WHERE cedula = ? AND activo = 1").bind(t.trim()).first();
    if (!r)
      return e.json({ error: "C\xE9dula o contrase\xF1a incorrecta" }, 401);
    if (!await Wt(s, t, r.password_hash))
      return e.json({ error: "C\xE9dula o contrase\xF1a incorrecta" }, 401);
    const n = await Hs(), i = new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString();
    return await e.env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").bind(n, r.id, i).run(), await e.env.DB.prepare("INSERT INTO audit_logs (user_id, accion, tabla, datos_nuevos) VALUES (?, ?, ?, ?)").bind(r.id, "LOGIN", "sessions", JSON.stringify({ ip: e.req.header("CF-Connecting-IP") || "local" })).run(), e.json({ token: n, user: { id: r.id, cedula: r.cedula, nombre: r.nombre, apellido: r.apellido, role: r.role, nombre_completo: `${r.nombre} ${r.apellido}` }, expires_at: i });
  } catch (t) {
    return console.error("Login error:", t), e.json({ error: "Error interno del servidor" }, 500);
  }
});
Le.post("/logout", async (e) => {
  const t = e.req.header("Authorization");
  if (t != null && t.startsWith("Bearer ")) {
    const s = t.substring(7);
    await e.env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(s).run();
  }
  return e.json({ success: true });
});
Le.get("/me", async (e) => {
  const t = e.req.header("Authorization");
  if (!(t != null && t.startsWith("Bearer ")))
    return e.json({ error: "No autorizado" }, 401);
  const s = t.substring(7), r = await e.env.DB.prepare(`
    SELECT s.id, s.expires_at, u.id as user_id, u.cedula, u.nombre, u.apellido, u.email, u.role
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > datetime('now') AND u.activo = 1
  `).bind(s).first();
  return r ? e.json({ id: r.user_id, cedula: r.cedula, nombre: r.nombre, apellido: r.apellido, email: r.email, role: r.role, nombre_completo: `${r.nombre} ${r.apellido}` }) : e.json({ error: "Sesi\xF3n inv\xE1lida o expirada" }, 401);
});
Le.post("/change-password", async (e) => {
  const t = e.req.header("Authorization");
  if (!(t != null && t.startsWith("Bearer ")))
    return e.json({ error: "No autorizado" }, 401);
  const s = t.substring(7), r = await e.env.DB.prepare(`
    SELECT s.user_id, u.cedula FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > datetime('now')
  `).bind(s).first();
  if (!r)
    return e.json({ error: "Sesi\xF3n inv\xE1lida" }, 401);
  const { current_password: a, new_password: n } = await e.req.json();
  if (!a || !n)
    return e.json({ error: "Datos incompletos" }, 400);
  if (n.length < 6)
    return e.json({ error: "La contrase\xF1a debe tener al menos 6 caracteres" }, 400);
  const i = await e.env.DB.prepare("SELECT password_hash FROM users WHERE id = ?").bind(r.user_id).first();
  if (!i)
    return e.json({ error: "Usuario no encontrado" }, 404);
  if (!await Wt(a, r.cedula, i.password_hash))
    return e.json({ error: "Contrase\xF1a actual incorrecta" }, 400);
  const d = await ke(n, r.cedula);
  return await e.env.DB.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").bind(d, r.user_id).run(), e.json({ success: true, message: "Contrase\xF1a actualizada correctamente" });
});
var ae = new x();
var Ne = /* @__PURE__ */ __name(async (e, t) => {
  const s = await re(e.req.raw, e.env.DB);
  if (!s)
    return e.json({ error: "No autorizado" }, 401);
  e.set("session", s), await t();
}, "Ne");
ae.get("/", Ne, async (e) => {
  const t = e.get("session"), { fecha: s, user_id: r, estado: a, limit: n = "20", offset: i = "0" } = e.req.query();
  let o = `
    SELECT c.*, u.nombre, u.apellido, u.cedula,
           ua.nombre as aprobador_nombre, ua.apellido as aprobador_apellido,
           (SELECT SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END) FROM movimientos WHERE caja_id = c.id) as total_ingresos,
           (SELECT SUM(CASE WHEN tipo='egreso' THEN monto ELSE 0 END) FROM movimientos WHERE caja_id = c.id) as total_egresos,
           (SELECT COUNT(*) FROM movimientos WHERE caja_id = c.id) as num_movimientos
    FROM cajas c
    JOIN users u ON c.user_id = u.id
    LEFT JOIN users ua ON c.aprobado_por = ua.id
    WHERE 1=1
  `;
  const d = [];
  ["superadmin", "admin", "supervisor"].includes(t.role) ? r && (o += " AND c.user_id = ?", d.push(parseInt(r))) : (o += " AND c.user_id = ?", d.push(t.userId)), s && (o += " AND c.fecha = ?", d.push(s)), a && (o += " AND c.estado = ?", d.push(a)), o += " ORDER BY c.fecha DESC, c.created_at DESC LIMIT ? OFFSET ?", d.push(parseInt(n), parseInt(i));
  const c = await e.env.DB.prepare(o).bind(...d).all();
  return e.json({ cajas: c.results, total: c.results.length });
});
ae.get("/hoy", Ne, async (e) => {
  const t = e.get("session"), s = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], r = await e.env.DB.prepare(`
    SELECT c.*, u.nombre, u.apellido,
           (SELECT SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END) FROM movimientos WHERE caja_id = c.id) as total_ingresos,
           (SELECT SUM(CASE WHEN tipo='egreso' THEN monto ELSE 0 END) FROM movimientos WHERE caja_id = c.id) as total_egresos
    FROM cajas c JOIN users u ON c.user_id = u.id
    WHERE c.user_id = ? AND c.fecha = ?
  `).bind(t.userId, s).first();
  return e.json({ caja: r || null, fecha: s });
});
ae.post("/", Ne, async (e) => {
  const t = e.get("session"), { saldo_inicial: s = 0, notas: r, fecha: a, user_id: n } = await e.req.json(), i = ["superadmin", "admin", "supervisor"].includes(t.role) && n ? n : t.userId, o = a || (/* @__PURE__ */ new Date()).toISOString().split("T")[0], d = await e.env.DB.prepare("SELECT id, estado FROM cajas WHERE user_id = ? AND fecha = ?").bind(i, o).first();
  if (d)
    return e.json({ error: "Ya existe una caja para este usuario en esta fecha", caja_id: d.id }, 409);
  const u = (await e.env.DB.prepare(`
    INSERT INTO cajas (user_id, fecha, saldo_inicial, estado, notas)
    VALUES (?, ?, ?, 'abierta', ?)
  `).bind(i, o, parseFloat(s) || 0, r || "").run()).meta.last_row_id;
  return await e.env.DB.prepare("INSERT INTO audit_logs (user_id, accion, tabla, registro_id, datos_nuevos) VALUES (?, ?, ?, ?, ?)").bind(t.userId, "OPEN_CAJA", "cajas", u, JSON.stringify({ fecha: o, saldo_inicial: s, user_id: i })).run(), e.json({ success: true, caja_id: u, fecha: o, saldo_inicial: parseFloat(s) || 0 }, 201);
});
ae.get("/:id", Ne, async (e) => {
  const t = e.get("session"), s = parseInt(e.req.param("id")), r = await e.env.DB.prepare(`
    SELECT c.*, u.nombre, u.apellido, u.cedula,
           ua.nombre as aprobador_nombre
    FROM cajas c
    JOIN users u ON c.user_id = u.id
    LEFT JOIN users ua ON c.aprobado_por = ua.id
    WHERE c.id = ?
  `).bind(s).first();
  if (!r)
    return e.json({ error: "Caja no encontrada" }, 404);
  if (r.user_id !== t.userId && !["superadmin", "admin", "supervisor"].includes(t.role))
    return e.json({ error: "Sin permisos" }, 403);
  const a = await e.env.DB.prepare(`
    SELECT m.*, u.nombre as user_nombre
    FROM movimientos m JOIN users u ON m.user_id = u.id
    WHERE m.caja_id = ? ORDER BY m.created_at ASC
  `).bind(s).all(), n = await e.env.DB.prepare("SELECT * FROM conteo_efectivo WHERE caja_id = ? ORDER BY denominacion").bind(s).all(), i = await e.env.DB.prepare("SELECT * FROM saldos_sistemas WHERE caja_id = ?").bind(s).all();
  return e.json({ caja: r, movimientos: a.results, conteo_efectivo: n.results, saldos_sistemas: i.results });
});
ae.post("/:id/cuadrar", Ne, async (e) => {
  const t = e.get("session"), s = parseInt(e.req.param("id")), { saldo_final: r, conteo_efectivo: a, saldos_sistemas: n, notas: i } = await e.req.json(), o = await e.env.DB.prepare("SELECT * FROM cajas WHERE id = ?").bind(s).first();
  if (!o)
    return e.json({ error: "Caja no encontrada" }, 404);
  if (o.user_id !== t.userId && !["superadmin", "admin", "supervisor"].includes(t.role))
    return e.json({ error: "Sin permisos" }, 403);
  if (o.estado !== "abierta")
    return e.json({ error: "La caja ya est\xE1 cuadrada o aprobada" }, 400);
  const d = await e.env.DB.prepare(`
    SELECT 
      SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END) as ingresos,
      SUM(CASE WHEN tipo='egreso' THEN monto ELSE 0 END) as egresos
    FROM movimientos WHERE caja_id = ?
  `).bind(s).first(), c = (d == null ? void 0 : d.ingresos) || 0, u = (d == null ? void 0 : d.egresos) || 0, p = o.saldo_inicial + c - u, E = parseFloat(r) || 0, N = E - p;
  if (a && Array.isArray(a)) {
    await e.env.DB.prepare("DELETE FROM conteo_efectivo WHERE caja_id = ?").bind(s).run();
    for (const m of a)
      m.cantidad > 0 && await e.env.DB.prepare("INSERT INTO conteo_efectivo (caja_id, denominacion, cantidad) VALUES (?, ?, ?)").bind(s, m.denominacion, m.cantidad).run();
  }
  if (n && Array.isArray(n)) {
    await e.env.DB.prepare("DELETE FROM saldos_sistemas WHERE caja_id = ?").bind(s).run();
    for (const m of n)
      m.saldo !== void 0 && await e.env.DB.prepare("INSERT INTO saldos_sistemas (caja_id, sistema, saldo) VALUES (?, ?, ?)").bind(s, m.sistema, m.saldo).run();
  }
  return await e.env.DB.prepare(`
    UPDATE cajas SET 
      saldo_final = ?, estado = 'cuadrada', notas = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(E, i || "", s).run(), e.json({ success: true, resumen: { saldo_inicial: o.saldo_inicial, total_ingresos: c, total_egresos: u, saldo_esperado: Math.round(p * 100) / 100, saldo_real: E, diferencia: Math.round(N * 100) / 100, cuadre_ok: Math.abs(N) <= 0.5 } });
});
ae.post("/:id/aprobar", Ne, async (e) => {
  const t = e.get("session");
  if (!["superadmin", "admin", "supervisor"].includes(t.role))
    return e.json({ error: "Sin permisos para aprobar cajas" }, 403);
  const s = parseInt(e.req.param("id")), { aprobado: r } = await e.req.json();
  if (!await e.env.DB.prepare("SELECT * FROM cajas WHERE id = ?").bind(s).first())
    return e.json({ error: "Caja no encontrada" }, 404);
  const n = r ? "aprobada" : "rechazada";
  return await e.env.DB.prepare(`
    UPDATE cajas SET estado = ?, aprobado_por = ?, aprobado_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).bind(n, t.userId, s).run(), e.json({ success: true, estado: n });
});
var Me = new x();
var Ve = /* @__PURE__ */ __name(async (e, t) => {
  const s = await re(e.req.raw, e.env.DB);
  if (!s)
    return e.json({ error: "No autorizado" }, 401);
  e.set("session", s), await t();
}, "Ve");
Me.get("/", Ve, async (e) => {
  const t = e.get("session"), { caja_id: s, tipo: r, categoria: a, limit: n = "50", offset: i = "0" } = e.req.query();
  let o = `
    SELECT m.*, u.nombre, u.apellido, c.fecha as fecha_caja
    FROM movimientos m
    JOIN users u ON m.user_id = u.id
    JOIN cajas c ON m.caja_id = c.id
    WHERE 1=1
  `;
  const d = [];
  ["superadmin", "admin", "supervisor"].includes(t.role) || (o += " AND m.user_id = ?", d.push(t.userId)), s && (o += " AND m.caja_id = ?", d.push(parseInt(s))), r && (o += " AND m.tipo = ?", d.push(r)), a && (o += " AND m.categoria = ?", d.push(a)), o += " ORDER BY m.created_at DESC LIMIT ? OFFSET ?", d.push(parseInt(n), parseInt(i));
  const c = await e.env.DB.prepare(o).bind(...d).all();
  return e.json({ movimientos: c.results });
});
Me.post("/", Ve, async (e) => {
  const t = e.get("session"), { caja_id: s, tipo: r, categoria: a, descripcion: n, monto: i, referencia: o, hora: d } = await e.req.json();
  if (!s || !r || !n || !i)
    return e.json({ error: "caja_id, tipo, descripcion y monto son requeridos" }, 400);
  if (!["ingreso", "egreso"].includes(r))
    return e.json({ error: "tipo debe ser ingreso o egreso" }, 400);
  const c = parseFloat(i);
  if (isNaN(c) || c <= 0)
    return e.json({ error: "El monto debe ser un n\xFAmero mayor a 0" }, 400);
  const u = await e.env.DB.prepare("SELECT * FROM cajas WHERE id = ?").bind(parseInt(s)).first();
  if (!u)
    return e.json({ error: "Caja no encontrada" }, 404);
  if (u.estado !== "abierta")
    return e.json({ error: "La caja no est\xE1 abierta" }, 400);
  if (u.user_id !== t.userId && !["superadmin", "admin", "supervisor"].includes(t.role))
    return e.json({ error: "Sin permisos para registrar en esta caja" }, 403);
  const p = d || (/* @__PURE__ */ new Date()).toTimeString().split(" ")[0], E = await e.env.DB.prepare(`
    INSERT INTO movimientos (caja_id, user_id, tipo, categoria, descripcion, monto, referencia, hora)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(parseInt(s), t.userId, r, a || "efectivo", n.trim(), c, o || "", p).run();
  return e.json({ success: true, movimiento_id: E.meta.last_row_id, tipo: r, categoria: a || "efectivo", descripcion: n, monto: c }, 201);
});
Me.delete("/:id", Ve, async (e) => {
  const t = e.get("session");
  if (!["superadmin", "admin"].includes(t.role))
    return e.json({ error: "Sin permisos" }, 403);
  const s = parseInt(e.req.param("id"));
  return await e.env.DB.prepare("DELETE FROM movimientos WHERE id = ?").bind(s).run(), e.json({ success: true });
});
Me.get("/stats", Ve, async (e) => {
  const t = e.get("session"), { fecha_inicio: s, fecha_fin: r, user_id: a } = e.req.query();
  let n = "";
  const i = [];
  ["superadmin", "admin", "supervisor"].includes(t.role) ? a && (n = "AND m.user_id = ?", i.push(parseInt(a))) : (n = "AND m.user_id = ?", i.push(t.userId));
  const o = s || new Date(Date.now() - 30 * 864e5).toISOString().split("T")[0], d = r || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  i.push(o, d);
  const c = await e.env.DB.prepare(`
    SELECT 
      SUM(CASE WHEN m.tipo='ingreso' THEN m.monto ELSE 0 END) as total_ingresos,
      SUM(CASE WHEN m.tipo='egreso' THEN m.monto ELSE 0 END) as total_egresos,
      COUNT(*) as total_movimientos,
      COUNT(DISTINCT m.caja_id) as total_cajas,
      m.categoria,
      SUM(m.monto) as total_por_categoria
    FROM movimientos m
    JOIN cajas c ON m.caja_id = c.id
    WHERE c.fecha BETWEEN ? AND ? ${n}
    GROUP BY m.categoria
  `).bind(...i).all();
  return e.json({ stats: c.results, periodo: { desde: o, hasta: d } });
});
var ne = new x();
var Se = /* @__PURE__ */ __name(async (e, t) => {
  const s = await re(e.req.raw, e.env.DB);
  if (!s)
    return e.json({ error: "No autorizado" }, 401);
  e.set("session", s), await t();
}, "Se");
ne.get("/", Se, async (e) => {
  const t = e.get("session"), { tipo: s, estado: r, user_id: a, search: n, limit: i = "50", offset: o = "0" } = e.req.query();
  let d = `
    SELECT p.*, u.nombre as registrado_por_nombre, u.apellido as registrado_por_apellido,
           (SELECT SUM(monto) FROM abonos_pendientes WHERE pendiente_id = p.id) as total_abonado
    FROM pendientes p
    JOIN users u ON p.user_id = u.id
    WHERE 1=1
  `;
  const c = [];
  if (["superadmin", "admin", "supervisor"].includes(t.role) ? a && (d += " AND p.user_id = ?", c.push(parseInt(a))) : (d += " AND p.user_id = ?", c.push(t.userId)), s && (d += " AND p.tipo = ?", c.push(s)), r && (d += " AND p.estado = ?", c.push(r)), n) {
    d += " AND (p.nombre_deudor LIKE ? OR p.cedula_deudor LIKE ? OR p.codigo LIKE ? OR p.descripcion LIKE ?)";
    const m = `%${n}%`;
    c.push(m, m, m, m);
  }
  d += " ORDER BY p.created_at DESC LIMIT ? OFFSET ?", c.push(parseInt(i), parseInt(o));
  const u = await e.env.DB.prepare(d).bind(...c).all();
  let p = `
    SELECT 
      SUM(CASE WHEN tipo='por_pagar' AND estado != 'cancelado' THEN monto_pendiente ELSE 0 END) as total_por_pagar,
      SUM(CASE WHEN tipo='por_cobrar' AND estado != 'cancelado' THEN monto_pendiente ELSE 0 END) as total_por_cobrar,
      COUNT(CASE WHEN estado = 'pendiente' OR estado = 'pagado_parcial' THEN 1 END) as total_activos
    FROM pendientes WHERE 1=1
  `;
  const E = [];
  ["superadmin", "admin", "supervisor"].includes(t.role) || (p += " AND user_id = ?", E.push(t.userId));
  const N = await e.env.DB.prepare(p).bind(...E).first();
  return e.json({ pendientes: u.results, totales: N, total: u.results.length });
});
ne.get("/:id", Se, async (e) => {
  const t = e.get("session"), s = parseInt(e.req.param("id")), r = await e.env.DB.prepare(`
    SELECT p.*, u.nombre as registrado_por_nombre, u.apellido as registrado_por_apellido
    FROM pendientes p JOIN users u ON p.user_id = u.id
    WHERE p.id = ?
  `).bind(s).first();
  if (!r)
    return e.json({ error: "Pendiente no encontrado" }, 404);
  if (r.user_id !== t.userId && !["superadmin", "admin", "supervisor"].includes(t.role))
    return e.json({ error: "Sin permisos" }, 403);
  const a = await e.env.DB.prepare(`
    SELECT a.*, u.nombre, u.apellido FROM abonos_pendientes a
    JOIN users u ON a.user_id = u.id
    WHERE a.pendiente_id = ? ORDER BY a.fecha DESC
  `).bind(s).all();
  return e.json({ pendiente: r, abonos: a.results });
});
ne.post("/", Se, async (e) => {
  const t = e.get("session"), { tipo: s, nombre_deudor: r, cedula_deudor: a, descripcion: n, monto: i, fecha_vencimiento: o, prioridad: d } = await e.req.json();
  if (!r || !i)
    return e.json({ error: "nombre_deudor y monto son requeridos" }, 400);
  const c = parseFloat(i);
  if (isNaN(c) || c <= 0)
    return e.json({ error: "El monto debe ser mayor a 0" }, 400);
  const u = xs(s || "por_pagar"), p = s || "por_pagar", E = await e.env.DB.prepare(`
    INSERT INTO pendientes (codigo, user_id, tipo, nombre_deudor, cedula_deudor, descripcion, monto_original, monto_pendiente, fecha_vencimiento, prioridad, estado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')
  `).bind(u, t.userId, p, r.trim(), a || "", n || "", c, c, o || null, d || "normal").run(), N = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], m = await e.env.DB.prepare("SELECT id FROM cajas WHERE user_id = ? AND fecha = ? AND estado = 'abierta'").bind(t.userId, N).first();
  return m && p === "por_cobrar" && await e.env.DB.prepare(`
      INSERT INTO movimientos (caja_id, user_id, tipo, categoria, descripcion, monto, referencia)
      VALUES (?, ?, 'ingreso', 'pendiente', ?, ?, ?)
    `).bind(m.id, t.userId, `Pendiente - ${r}`, c, u).run(), e.json({ success: true, pendiente_id: E.meta.last_row_id, codigo: u, tipo: p, monto: c }, 201);
});
ne.post("/:id/abonar", Se, async (e) => {
  const t = e.get("session"), s = parseInt(e.req.param("id")), { monto: r, notas: a, caja_id: n } = await e.req.json();
  if (!r || parseFloat(r) <= 0)
    return e.json({ error: "El monto del abono debe ser mayor a 0" }, 400);
  const i = await e.env.DB.prepare("SELECT * FROM pendientes WHERE id = ? AND estado != 'cancelado'").bind(s).first();
  if (!i)
    return e.json({ error: "Pendiente no encontrado o cancelado" }, 404);
  const o = Math.min(parseFloat(r), i.monto_pendiente), d = Math.max(0, i.monto_pendiente - o), c = d <= 0 ? "pagado_total" : "pagado_parcial", u = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  let p = n ? parseInt(n) : null;
  if (!p) {
    const E = await e.env.DB.prepare("SELECT id FROM cajas WHERE user_id = ? AND fecha = ? AND estado = 'abierta'").bind(t.userId, u).first();
    p = (E == null ? void 0 : E.id) || null;
  }
  return await e.env.DB.prepare(`
    INSERT INTO abonos_pendientes (pendiente_id, caja_id, user_id, monto, notas)
    VALUES (?, ?, ?, ?, ?)
  `).bind(s, p, t.userId, o, a || "").run(), await e.env.DB.prepare(`
    UPDATE pendientes SET monto_pendiente = ?, estado = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(d, c, s).run(), p && i.tipo === "por_pagar" && await e.env.DB.prepare(`
      INSERT INTO movimientos (caja_id, user_id, tipo, categoria, descripcion, monto, referencia)
      VALUES (?, ?, 'egreso', 'pendiente', ?, ?, ?)
    `).bind(p, t.userId, `Abono pendiente - ${i.nombre_deudor}`, o, i.codigo).run(), e.json({ success: true, monto_abonado: o, monto_pendiente_anterior: i.monto_pendiente, monto_pendiente_nuevo: d, estado: c, pagado_total: c === "pagado_total" });
});
ne.put("/:id", Se, async (e) => {
  const t = e.get("session"), s = parseInt(e.req.param("id")), { nombre_deudor: r, cedula_deudor: a, descripcion: n, fecha_vencimiento: i, prioridad: o, estado: d } = await e.req.json(), c = await e.env.DB.prepare("SELECT user_id FROM pendientes WHERE id = ?").bind(s).first();
  if (!c)
    return e.json({ error: "No encontrado" }, 404);
  if (c.user_id !== t.userId && !["superadmin", "admin", "supervisor"].includes(t.role))
    return e.json({ error: "Sin permisos" }, 403);
  const u = ["updated_at = datetime('now')"], p = [];
  return r && (u.push("nombre_deudor = ?"), p.push(r)), a !== void 0 && (u.push("cedula_deudor = ?"), p.push(a)), n !== void 0 && (u.push("descripcion = ?"), p.push(n)), i !== void 0 && (u.push("fecha_vencimiento = ?"), p.push(i)), o && (u.push("prioridad = ?"), p.push(o)), d && (u.push("estado = ?"), p.push(d)), p.push(s), await e.env.DB.prepare(`UPDATE pendientes SET ${u.join(", ")} WHERE id = ?`).bind(...p).run(), e.json({ success: true });
});
ne.delete("/:id", Se, async (e) => {
  const t = e.get("session");
  if (!["superadmin", "admin"].includes(t.role))
    return e.json({ error: "Sin permisos" }, 403);
  const s = parseInt(e.req.param("id"));
  return await e.env.DB.prepare("UPDATE pendientes SET estado = 'cancelado', updated_at = datetime('now') WHERE id = ?").bind(s).run(), e.json({ success: true });
});
var ve = new x();
var We = /* @__PURE__ */ __name(async (e, t) => {
  const s = await re(e.req.raw, e.env.DB);
  if (!s)
    return e.json({ error: "No autorizado" }, 401);
  e.set("session", s), await t();
}, "We");
ve.get("/", We, async (e) => {
  const t = e.get("session");
  if (!["superadmin", "admin", "supervisor"].includes(t.role))
    return e.json({ error: "Sin permisos" }, 403);
  const s = await e.env.DB.prepare(`
    SELECT id, cedula, nombre, apellido, email, role, activo, created_at
    FROM users ORDER BY nombre ASC
  `).all();
  return e.json({ users: s.results });
});
ve.get("/:id", We, async (e) => {
  const t = e.get("session"), s = parseInt(e.req.param("id"));
  if (t.userId !== s && !["superadmin", "admin", "supervisor"].includes(t.role))
    return e.json({ error: "Sin permisos" }, 403);
  const r = await e.env.DB.prepare("SELECT id, cedula, nombre, apellido, email, role, activo, created_at FROM users WHERE id = ?").bind(s).first();
  return r ? e.json({ user: r }) : e.json({ error: "Usuario no encontrado" }, 404);
});
ve.post("/", We, async (e) => {
  const t = e.get("session");
  if (!["superadmin", "admin"].includes(t.role))
    return e.json({ error: "Solo administradores pueden crear usuarios" }, 403);
  const { cedula: s, nombre: r, apellido: a, email: n, password: i, role: o } = await e.req.json();
  if (!s || !r || !a || !i)
    return e.json({ error: "C\xE9dula, nombre, apellido y contrase\xF1a son requeridos" }, 400);
  const d = t.role === "superadmin" ? ["admin", "supervisor", "trabajador"] : ["supervisor", "trabajador"];
  if (o && !d.includes(o))
    return e.json({ error: `No puedes crear usuarios con rol: ${o}` }, 403);
  if (await e.env.DB.prepare("SELECT id FROM users WHERE cedula = ?").bind(s).first())
    return e.json({ error: "Ya existe un usuario con esa c\xE9dula" }, 409);
  const u = await ke(i, s), p = o || "trabajador", E = await e.env.DB.prepare(`
    INSERT INTO users (cedula, nombre, apellido, email, password_hash, role, activo)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).bind(s, r.trim(), a.trim(), n || "", u, p).run();
  return await e.env.DB.prepare("INSERT INTO audit_logs (user_id, accion, tabla, registro_id, datos_nuevos) VALUES (?, ?, ?, ?, ?)").bind(t.userId, "CREATE_USER", "users", E.meta.last_row_id, JSON.stringify({ cedula: s, nombre: r, role: p })).run(), e.json({ success: true, user: { id: E.meta.last_row_id, cedula: s, nombre: r, apellido: a, email: n, role: p } }, 201);
});
ve.put("/:id", We, async (e) => {
  const t = e.get("session"), s = parseInt(e.req.param("id"));
  if (t.userId !== s && !["superadmin", "admin"].includes(t.role))
    return e.json({ error: "Sin permisos" }, 403);
  const { nombre: r, apellido: a, email: n, role: i, activo: o, password: d } = await e.req.json();
  if (i && t.role !== "superadmin") {
    const p = await e.env.DB.prepare("SELECT role FROM users WHERE id = ?").bind(s).first();
    if ((p == null ? void 0 : p.role) === "superadmin")
      return e.json({ error: "No puedes modificar el rol del superadmin" }, 403);
  }
  const c = [], u = [];
  if (r && (c.push("nombre = ?"), u.push(r)), a && (c.push("apellido = ?"), u.push(a)), n !== void 0 && (c.push("email = ?"), u.push(n)), i && ["superadmin", "admin"].includes(t.role) && (c.push("role = ?"), u.push(i)), o !== void 0 && ["superadmin", "admin"].includes(t.role) && (c.push("activo = ?"), u.push(o ? 1 : 0)), d) {
    const p = await e.env.DB.prepare("SELECT cedula FROM users WHERE id = ?").bind(s).first();
    if (p) {
      const E = await ke(d, p.cedula);
      c.push("password_hash = ?"), u.push(E);
    }
  }
  return c.length === 0 ? e.json({ error: "No hay datos para actualizar" }, 400) : (c.push("updated_at = datetime('now')"), u.push(s), await e.env.DB.prepare(`UPDATE users SET ${c.join(", ")} WHERE id = ?`).bind(...u).run(), e.json({ success: true, message: "Usuario actualizado" }));
});
ve.delete("/:id", We, async (e) => {
  const t = e.get("session");
  if (t.role !== "superadmin")
    return e.json({ error: "Solo el superadmin puede eliminar usuarios" }, 403);
  const s = parseInt(e.req.param("id"));
  return t.userId === s ? e.json({ error: "No puedes eliminarte a ti mismo" }, 400) : (await e.env.DB.prepare("UPDATE users SET activo = 0, updated_at = datetime('now') WHERE id = ?").bind(s).run(), e.json({ success: true, message: "Usuario desactivado" }));
});
var Ge = new x();
var rt = /* @__PURE__ */ __name(async (e, t) => {
  const s = await re(e.req.raw, e.env.DB);
  if (!s)
    return e.json({ error: "No autorizado" }, 401);
  e.set("session", s), await t();
}, "rt");
Ge.post("/upload", rt, async (e) => {
  const t = e.get("session");
  try {
    const s = await e.req.formData(), r = s.get("file"), a = s.get("sistema") || "general", n = s.get("caja_id");
    if (!r)
      return e.json({ error: "No se recibi\xF3 archivo" }, 400);
    if (!["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel", "text/csv"].includes(r.type) && !r.name.match(/\.(xlsx|xls|csv)$/i))
      return e.json({ error: "Solo se permiten archivos Excel (.xlsx, .xls) o CSV" }, 400);
    if (r.size > 10 * 1024 * 1024)
      return e.json({ error: "El archivo no puede superar 10MB" }, 400);
    const o = `excel/${t.userId}/${Date.now()}-${r.name.replace(/\s+/g, "_")}`, d = await r.arrayBuffer();
    await e.env.R2.put(o, d, { httpMetadata: { contentType: r.type }, customMetadata: { userId: String(t.userId), sistema: a } });
    const c = n ? parseInt(n) : null, p = (await e.env.DB.prepare(`
      INSERT INTO excel_uploads (user_id, caja_id, filename, r2_key, sistema, estado)
      VALUES (?, ?, ?, ?, ?, 'procesando')
    `).bind(t.userId, c, r.name, o, a).run()).meta.last_row_id, E = await Ls(d, r.name, a, e.env.GEMINI_API_KEY);
    return await e.env.DB.prepare(`
      UPDATE excel_uploads SET analisis_resultado = ?, estado = 'procesado'
      WHERE id = ?
    `).bind(JSON.stringify(E), p).run(), e.json({ success: true, upload_id: p, filename: r.name, sistema: a, analisis: E }, 201);
  } catch (s) {
    return console.error("Excel upload error:", s), e.json({ error: `Error procesando archivo: ${s.message}` }, 500);
  }
});
Ge.get("/uploads", rt, async (e) => {
  const t = e.get("session"), s = ["superadmin", "admin", "supervisor"].includes(t.role), r = s ? "SELECT e.*, u.nombre, u.apellido FROM excel_uploads e JOIN users u ON e.user_id = u.id ORDER BY e.created_at DESC LIMIT 50" : "SELECT e.*, u.nombre, u.apellido FROM excel_uploads e JOIN users u ON e.user_id = u.id WHERE e.user_id = ? ORDER BY e.created_at DESC LIMIT 50", a = s ? await e.env.DB.prepare(r).all() : await e.env.DB.prepare(r).bind(t.userId).all();
  return e.json({ uploads: a.results });
});
Ge.get("/uploads/:id", rt, async (e) => {
  const t = e.get("session"), s = parseInt(e.req.param("id")), r = await e.env.DB.prepare(`
    SELECT e.*, u.nombre, u.apellido FROM excel_uploads e
    JOIN users u ON e.user_id = u.id WHERE e.id = ?
  `).bind(s).first();
  if (!r)
    return e.json({ error: "Upload no encontrado" }, 404);
  if (r.user_id !== t.userId && !["superadmin", "admin", "supervisor"].includes(t.role))
    return e.json({ error: "Sin permisos" }, 403);
  const a = r.analisis_resultado ? JSON.parse(r.analisis_resultado) : null;
  return e.json({ upload: { ...r, analisis_resultado: a } });
});
async function Ls(e, t, s, r) {
  var a, n, i, o, d;
  try {
    if (!r)
      return { error: "API Key de Gemini no configurada", tipo: "sin_analisis", fecha_analisis: (/* @__PURE__ */ new Date()).toISOString() };
    const c = new Uint8Array(e), u = btoa(String.fromCharCode(...c)), p = `Eres un experto en an\xE1lisis financiero y contabilidad para una agencia de pagos r\xE1pidos en Ecuador.
    
Analiza el archivo Excel adjunto llamado "${t}" del sistema "${s}".

Por favor extrae y analiza:
1. MOVIMIENTOS: Lista todos los movimientos (ingresos y egresos) con fecha, descripci\xF3n, monto
2. TOTALES: Total de ingresos, total de egresos, saldo final
3. SISTEMAS/CUENTAS: Saldos por sistema (Gold Pagos, DEX, Western Union, Caja, etc.)
4. BILLETES/MONEDAS: Si hay conteo de efectivo (denominaciones y cantidades)
5. VERIFICACI\xD3N DEL CUADRE: \xBFLos n\xFAmeros cuadran? \xBFHay diferencias?
6. OBSERVACIONES: Movimientos inusuales, transferencias entre trabajadores, etc.
7. RECOMENDACIONES: Puntos de mejora o alertas

Responde en formato JSON con esta estructura:
{
  "resumen": {
    "total_ingresos": n\xFAmero,
    "total_egresos": n\xFAmero,
    "saldo_final": n\xFAmero,
    "cuadre_ok": boolean,
    "diferencia": n\xFAmero
  },
  "saldos_sistemas": [{"sistema": "nombre", "saldo": n\xFAmero}],
  "conteo_efectivo": [{"denominacion": n\xFAmero, "cantidad": n\xFAmero, "subtotal": n\xFAmero}],
  "movimientos": [{"descripcion": "texto", "tipo": "ingreso|egreso", "monto": n\xFAmero}],
  "observaciones": ["texto"],
  "alertas": ["texto"],
  "recomendaciones": ["texto"],
  "verificacion_cuadre": "texto explicativo"
}`, E = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${r}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: p }, { inline_data: { mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", data: u } }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 4096, responseMimeType: "application/json" } }) });
    if (!E.ok) {
      const D = await E.text();
      return console.error("Gemini API error:", D), { error: "Error en Gemini API", detalle: D, fecha_analisis: (/* @__PURE__ */ new Date()).toISOString() };
    }
    const m = (d = (o = (i = (n = (a = (await E.json()).candidates) == null ? void 0 : a[0]) == null ? void 0 : n.content) == null ? void 0 : i.parts) == null ? void 0 : o[0]) == null ? void 0 : d.text;
    if (!m)
      return { error: "Gemini no devolvi\xF3 contenido", fecha_analisis: (/* @__PURE__ */ new Date()).toISOString() };
    try {
      return { ...JSON.parse(m), fecha_analisis: (/* @__PURE__ */ new Date()).toISOString(), archivo: t, sistema: s };
    } catch {
      return { raw_response: m, fecha_analisis: (/* @__PURE__ */ new Date()).toISOString(), archivo: t };
    }
  } catch (c) {
    return { error: `Error en an\xE1lisis: ${c.message}`, fecha_analisis: (/* @__PURE__ */ new Date()).toISOString() };
  }
}
__name(Ls, "Ls");
var Bt = new x();
var Ms = /* @__PURE__ */ __name(async (e, t) => {
  const s = await re(e.req.raw, e.env.DB);
  if (!s)
    return e.json({ error: "No autorizado" }, 401);
  e.set("session", s), await t();
}, "Ms");
Bt.get("/", Ms, async (e) => {
  const t = e.get("session"), s = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], r = ["superadmin", "admin", "supervisor"].includes(t.role), n = await e.env.DB.prepare(`
    SELECT COUNT(*) as total, 
           SUM(CASE WHEN estado='abierta' THEN 1 ELSE 0 END) as abiertas,
           SUM(CASE WHEN estado='cuadrada' THEN 1 ELSE 0 END) as cuadradas,
           SUM(CASE WHEN estado='aprobada' THEN 1 ELSE 0 END) as aprobadas
    FROM cajas WHERE fecha = ?`).bind(s).first();
  let i = `
    SELECT 
      SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END) as ingresos,
      SUM(CASE WHEN tipo='egreso' THEN monto ELSE 0 END) as egresos,
      COUNT(*) as total
    FROM movimientos m
    JOIN cajas c ON m.caja_id = c.id
    WHERE c.fecha = ?`;
  const o = r ? await e.env.DB.prepare(i).bind(s).first() : await e.env.DB.prepare(i + " AND m.user_id = ?").bind(s, t.userId).first(), d = r ? `SELECT 
        COUNT(CASE WHEN estado IN ('pendiente','pagado_parcial') THEN 1 END) as activos,
        SUM(CASE WHEN tipo='por_pagar' AND estado IN ('pendiente','pagado_parcial') THEN monto_pendiente ELSE 0 END) as total_por_pagar,
        SUM(CASE WHEN tipo='por_cobrar' AND estado IN ('pendiente','pagado_parcial') THEN monto_pendiente ELSE 0 END) as total_por_cobrar,
        COUNT(CASE WHEN fecha_vencimiento <= date('now') AND estado IN ('pendiente','pagado_parcial') THEN 1 END) as vencidos
       FROM pendientes` : `SELECT 
        COUNT(CASE WHEN estado IN ('pendiente','pagado_parcial') THEN 1 END) as activos,
        SUM(CASE WHEN tipo='por_pagar' AND estado IN ('pendiente','pagado_parcial') THEN monto_pendiente ELSE 0 END) as total_por_pagar,
        SUM(CASE WHEN tipo='por_cobrar' AND estado IN ('pendiente','pagado_parcial') THEN monto_pendiente ELSE 0 END) as total_por_cobrar,
        COUNT(CASE WHEN fecha_vencimiento <= date('now') AND estado IN ('pendiente','pagado_parcial') THEN 1 END) as vencidos
       FROM pendientes WHERE user_id = ?`, c = r ? await e.env.DB.prepare(d).first() : await e.env.DB.prepare(d).bind(t.userId).first(), u = await e.env.DB.prepare(`
    SELECT c.fecha,
      SUM(CASE WHEN m.tipo='ingreso' THEN m.monto ELSE 0 END) as ingresos,
      SUM(CASE WHEN m.tipo='egreso' THEN m.monto ELSE 0 END) as egresos
    FROM cajas c
    LEFT JOIN movimientos m ON m.caja_id = c.id
    WHERE c.fecha >= date('now', '-7 days')
    ${r ? "" : "AND c.user_id = ?"}
    GROUP BY c.fecha ORDER BY c.fecha ASC
  `).bind(...r ? [] : [t.userId]).all(), p = await e.env.DB.prepare(`
    SELECT p.codigo, p.nombre_deudor, p.monto_pendiente, p.fecha_vencimiento, p.tipo, p.prioridad,
           u.nombre as registrado_por
    FROM pendientes p JOIN users u ON p.user_id = u.id
    WHERE p.estado IN ('pendiente', 'pagado_parcial')
      AND p.fecha_vencimiento IS NOT NULL
      AND p.fecha_vencimiento <= date('now', '+3 days')
    ${r ? "" : "AND p.user_id = ?"}
    ORDER BY p.fecha_vencimiento ASC LIMIT 10
  `).bind(...r ? [] : [t.userId]).all();
  let E = null;
  r && (E = await e.env.DB.prepare(`
      SELECT u.nombre, u.apellido, u.cedula,
             COUNT(DISTINCT c.id) as num_cajas,
             SUM(CASE WHEN m.tipo='ingreso' THEN m.monto ELSE 0 END) as total_ingresos,
             SUM(CASE WHEN m.tipo='egreso' THEN m.monto ELSE 0 END) as total_egresos
      FROM users u
      LEFT JOIN cajas c ON c.user_id = u.id AND c.fecha >= date('now', '-30 days')
      LEFT JOIN movimientos m ON m.caja_id = c.id
      WHERE u.activo = 1 AND u.role = 'trabajador'
      GROUP BY u.id ORDER BY total_ingresos DESC LIMIT 8
    `).all());
  const N = r ? null : await e.env.DB.prepare(`
    SELECT c.id, c.estado, c.saldo_inicial,
           SUM(CASE WHEN m.tipo='ingreso' THEN m.monto ELSE 0 END) as ingresos,
           SUM(CASE WHEN m.tipo='egreso' THEN m.monto ELSE 0 END) as egresos
    FROM cajas c
    LEFT JOIN movimientos m ON m.caja_id = c.id
    WHERE c.user_id = ? AND c.fecha = ?
    GROUP BY c.id
  `).bind(t.userId, s).first();
  return e.json({ fecha: s, usuario: { id: t.userId, nombre: t.nombre, role: t.role }, cajas_hoy: n, movimientos_hoy: o, pendientes: c, chart_data: u.results, alertas_pendientes: p.results, top_trabajadores: (E == null ? void 0 : E.results) || null, mi_caja_hoy: N || null });
});
var Be = new x();
var Ye = /* @__PURE__ */ __name(async (e, t) => {
  const s = await re(e.req.raw, e.env.DB);
  if (!s)
    return e.json({ error: "No autorizado" }, 401);
  e.set("session", s), await t();
}, "Ye");
Be.get("/cajas", Ye, async (e) => {
  const t = e.get("session"), { fecha_inicio: s, fecha_fin: r, user_id: a } = e.req.query(), n = ["superadmin", "admin", "supervisor"].includes(t.role), i = s || new Date(Date.now() - 30 * 864e5).toISOString().split("T")[0], o = r || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  let d = `
    SELECT c.id, c.fecha, c.estado, c.saldo_inicial, c.saldo_final, c.notas,
           u.nombre, u.apellido, u.cedula,
           SUM(CASE WHEN m.tipo='ingreso' THEN m.monto ELSE 0 END) as total_ingresos,
           SUM(CASE WHEN m.tipo='egreso' THEN m.monto ELSE 0 END) as total_egresos,
           (c.saldo_inicial + SUM(CASE WHEN m.tipo='ingreso' THEN m.monto ELSE 0 END) 
            - SUM(CASE WHEN m.tipo='egreso' THEN m.monto ELSE 0 END)) as saldo_esperado,
           (c.saldo_final - (c.saldo_inicial + SUM(CASE WHEN m.tipo='ingreso' THEN m.monto ELSE 0 END) 
            - SUM(CASE WHEN m.tipo='egreso' THEN m.monto ELSE 0 END))) as diferencia
    FROM cajas c
    JOIN users u ON c.user_id = u.id
    LEFT JOIN movimientos m ON m.caja_id = c.id
    WHERE c.fecha BETWEEN ? AND ?
  `;
  const c = [i, o];
  n ? a && (d += " AND c.user_id = ?", c.push(parseInt(a))) : (d += " AND c.user_id = ?", c.push(t.userId)), d += " GROUP BY c.id ORDER BY c.fecha DESC, u.nombre ASC";
  const u = await e.env.DB.prepare(d).bind(...c).all(), p = await e.env.DB.prepare(`
    SELECT 
      COUNT(DISTINCT c.id) as num_cajas,
      SUM(CASE WHEN m.tipo='ingreso' THEN m.monto ELSE 0 END) as total_ingresos,
      SUM(CASE WHEN m.tipo='egreso' THEN m.monto ELSE 0 END) as total_egresos,
      COUNT(DISTINCT c.user_id) as num_trabajadores
    FROM cajas c
    LEFT JOIN movimientos m ON m.caja_id = c.id
    WHERE c.fecha BETWEEN ? AND ?
    ${n ? "" : "AND c.user_id = ?"}
  `).bind(...n ? [i, o] : [i, o, t.userId]).first();
  return e.json({ cajas: u.results, totales: p, periodo: { desde: i, hasta: o } });
});
Be.get("/movimientos", Ye, async (e) => {
  const t = e.get("session"), { fecha_inicio: s, fecha_fin: r, tipo: a, categoria: n } = e.req.query(), i = ["superadmin", "admin", "supervisor"].includes(t.role), o = s || new Date(Date.now() - 30 * 864e5).toISOString().split("T")[0], d = r || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  let c = `
    SELECT m.*, u.nombre, u.apellido, c.fecha as fecha_caja
    FROM movimientos m
    JOIN users u ON m.user_id = u.id
    JOIN cajas c ON m.caja_id = c.id
    WHERE c.fecha BETWEEN ? AND ?
  `;
  const u = [o, d];
  i || (c += " AND m.user_id = ?", u.push(t.userId)), a && (c += " AND m.tipo = ?", u.push(a)), n && (c += " AND m.categoria = ?", u.push(n)), c += " ORDER BY c.fecha DESC, m.created_at DESC";
  const p = await e.env.DB.prepare(c).bind(...u).all();
  return e.json({ movimientos: p.results, periodo: { desde: o, hasta: d } });
});
Be.get("/pendientes", Ye, async (e) => {
  const t = e.get("session"), s = ["superadmin", "admin", "supervisor"].includes(t.role), r = await e.env.DB.prepare(`
    SELECT p.*, u.nombre, u.apellido,
           (p.monto_original - p.monto_pendiente) as total_pagado,
           (SELECT COUNT(*) FROM abonos_pendientes WHERE pendiente_id = p.id) as num_abonos
    FROM pendientes p JOIN users u ON p.user_id = u.id
    ${s ? "" : "WHERE p.user_id = ?"}
    ORDER BY p.estado ASC, p.created_at DESC
  `).bind(...s ? [] : [t.userId]).all(), a = await e.env.DB.prepare(`
    SELECT 
      SUM(CASE WHEN tipo='por_pagar' AND estado IN ('pendiente','pagado_parcial') THEN monto_pendiente ELSE 0 END) as por_pagar,
      SUM(CASE WHEN tipo='por_cobrar' AND estado IN ('pendiente','pagado_parcial') THEN monto_pendiente ELSE 0 END) as por_cobrar,
      COUNT(CASE WHEN estado='pendiente' THEN 1 END) as total_pendientes,
      COUNT(CASE WHEN estado='pagado_total' THEN 1 END) as total_pagados,
      COUNT(CASE WHEN estado='cancelado' THEN 1 END) as total_cancelados
    FROM pendientes
    ${s ? "" : "WHERE user_id = ?"}
  `).bind(...s ? [] : [t.userId]).first();
  return e.json({ pendientes: r.results, resumen: a });
});
Be.get("/auditoria", Ye, async (e) => {
  const t = e.get("session");
  if (!["superadmin", "admin"].includes(t.role))
    return e.json({ error: "Sin permisos" }, 403);
  const { limit: s = "100", offset: r = "0", user_id: a, accion: n } = e.req.query();
  let i = `
    SELECT al.*, u.nombre, u.apellido, u.cedula
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE 1=1
  `;
  const o = [];
  a && (i += " AND al.user_id = ?", o.push(parseInt(a))), n && (i += " AND al.accion = ?", o.push(n)), i += " ORDER BY al.created_at DESC LIMIT ? OFFSET ?", o.push(parseInt(s), parseInt(r));
  const d = await e.env.DB.prepare(i).bind(...o).all();
  return e.json({ logs: d.results });
});
var R = new x();
R.use("/api/*", bs({ origin: "*", allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"], allowHeaders: ["Content-Type", "Authorization"] }));
R.use("/static/*", Mt({ root: "./public" }));
R.use("/favicon.ico", Mt({ path: "./public/favicon.ico" }));
R.route("/api/auth", Le);
R.route("/api/cajas", ae);
R.route("/api/movimientos", Me);
R.route("/api/pendientes", ne);
R.route("/api/users", ve);
R.route("/api/excel", Ge);
R.route("/api/dashboard", Bt);
R.route("/api/reports", Be);
R.get("/api/health", (e) => e.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() }));
R.get("*", (e) => e.html(Ws()));
function Ws() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pagos Rapidos - Sistema de Gesti\xF3n</title>
  <meta name="description" content="Sistema de Gesti\xF3n de Caja y Pendientes - Agencia Alban Borja">
  <link rel="icon" type="image/png" href="/static/logo.png">
  <link rel="apple-touch-icon" href="/static/logo.png">
  <meta name="theme-color" content="#1a3a8c">
  <!-- PWA Manifest -->
  <link rel="manifest" href="/static/manifest.json">
  <!-- Tailwind -->
  <script src="https://cdn.tailwindcss.com"><\/script>
  <!-- Icons -->
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <!-- Chart.js -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"><\/script>
  <!-- XLSX -->
  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"><\/script>
  <!-- Custom CSS -->
  <link href="/static/app.css" rel="stylesheet">
</head>
<body class="bg-gray-50 min-h-screen">
  <div id="app"></div>
  <script src="/static/app.js"><\/script>
</body>
</html>`;
}
__name(Ws, "Ws");
var pt = new x();
var Bs = Object.assign({ "/src/index.tsx": R });
var Ft = false;
for (const [, e] of Object.entries(Bs))
  e && (pt.route("/", e), pt.notFound(e.notFoundHandler), Ft = true);
if (!Ft)
  throw new Error("Can't import modules from ['/src/index.tsx','/app/server.ts']");

// ../node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } catch (e) {
    const error3 = reduceError(e);
    return Response.json(error3, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// ../.wrangler/tmp/bundle-RDHAAd/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pt;

// ../node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env2, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env2, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env2, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env2, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-RDHAAd/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env2, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env2, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env2, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env2, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env2, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env2, ctx) => {
      this.env = env2;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=bundledWorker-0.21224059596120948.mjs.map
