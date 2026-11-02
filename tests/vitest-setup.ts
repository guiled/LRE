global.firstInit = undefined;
global.LRE_DEBUG = true;
global.throwError = undefined as unknown as (err: unknown) => undefined;
global.newError = undefined as unknown as (err: unknown) => unknown;
global.stringify = undefined as unknown as (
  obj: unknown,
  indent?: boolean,
) => string | undefined;
global.virtualCall = undefined as unknown as <T>(fn: () => T) => T;
global.mt_rand = undefined as unknown as (min: number, max: number) => number;
global.dTR = undefined as unknown as (
  subject: object,
  properties: Array<string>,
  logWarning: boolean,
) => void;
global.fFR = undefined as unknown as <T extends { raw(): object }>(
  obj: T,
  methods: Array<string>,
) => T;
