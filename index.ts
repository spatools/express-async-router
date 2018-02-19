//#region Express Members

import * as express from "express";

export type Router = express.Router;
export type Request = express.Request;
export type Response = express.Response;

export type RequestHandler = express.RequestHandler;
export type RequestParamHandler = express.RequestParamHandler;
export type ErrorRequestHandler = express.ErrorRequestHandler;
export type ParamHandler = RequestParamHandler;
export type ErrorHandler = ErrorRequestHandler;

export type NextFunction = express.NextFunction;

//#endregion

//#region Types and Constants

const
    DEFAULT_SENDER = (req, res, val) => { res.send(val); },
    SHORTCUTS_METHODS = ["all", "get", "post", "put", "delete", "patch", "options", "head"];

export type AsyncRouterParamHandler = (req: Request, res: Response, param: any) => any;
export type AsyncRouterSender = (req: Request, res: Response, value: any) => any;

export interface AsyncRouterOptions {
    caseSensitive?: boolean;
    mergeParams?: boolean;
    strict?: boolean;

    send?: boolean;
    sender?: AsyncRouterSender;
}

export interface AsyncRouter {
    (): AsyncRouterInstance;
    (options: AsyncRouterOptions): AsyncRouterInstance;

    new(): AsyncRouterInstance;
    new(options: AsyncRouterOptions): AsyncRouterInstance;
}

export interface AsyncRouterInstance extends express.Router {
    param(name: string, handler: ParamHandler): this;
    param(name: string, matcher: RegExp): this;
    param(name: string, mapper: (param: any) => any): this;
    param(callback: (name: string, matcher: RegExp) => ParamHandler): this;

    /** Async param function. */
    param(name: string, handler: AsyncRouterParamHandler): void;
}

//#endregion

//#region Public

const ASYNC_MARKER = typeof Symbol !== "undefined" ? Symbol("ASYNC_MARKER") : "__ASYNC_MARKER__";

export function AsyncRouter(options?: AsyncRouterOptions): AsyncRouterInstance {
    const
        sender = getSender(options),
        innerRouter = express.Router(options),

        asyncRouter: AsyncRouterInstance = function () {
            return innerRouter.apply(this, arguments);
        } as any;

    wrapAllMatchers(asyncRouter, sender, innerRouter);

    asyncRouter[ASYNC_MARKER] = true;
    asyncRouter.param = function param(): AsyncRouterInstance {
        if (typeof arguments[1] === "function" && arguments[1].length === 3) {
            innerRouter.param(arguments[0], wrapParamHandler(arguments[1]));
            return this;
        }

        innerRouter.param.apply(innerRouter, arguments);
        return this;
    };

    asyncRouter.route = function route(path: string) {
        const r = innerRouter.route(path);
        wrapAllMatchers(r as any, sender);
        return r;
    };

    asyncRouter.use = function use(...args: any[]): AsyncRouterInstance {
        innerRouter.use.apply(innerRouter, args.map(arg => (typeof arg === "function" && arg[ASYNC_MARKER] !== true) ? wrapHandlerOrErrorHandler(arg) : arg));
        return this;
    };

    return asyncRouter;
}


/** Returns a new AsyncRouter instance with default options. */
export function create(): AsyncRouterInstance;
/**
 * Returns a new AsyncRouter instance with default options.
 * @param {Object} options - options to pass to express Router plus AsyncRouter options.
 */
export function create(options: AsyncRouterOptions): AsyncRouterInstance;
export function create(options?: AsyncRouterOptions): AsyncRouterInstance {
    return AsyncRouter(options);
}

//#endregion

//#region Private Methods

function getSender(options: AsyncRouterOptions): AsyncRouterSender {
    if (!options) {
        return DEFAULT_SENDER;
    }

    const
        send = options.send,
        sender = options.sender;

    delete options.send;
    delete options.sender;

    if (send !== false) {
        return sender || DEFAULT_SENDER;
    }
}

function wrapAllMatchers(route: Router, sender: AsyncRouterSender, router?: Router): void {
    router = router || route as Router;

    SHORTCUTS_METHODS.forEach(method => {
        route[method] = wrapMatcher(router, router[method], sender);
    });
}

function wrapMatcher(router: Router, routerMatcher: Function, sender: AsyncRouterSender): Function {
    return (name: any, ...args: RequestHandler[]) => {
        const
            last = args.length - 1,
            mappedArgs = args.map((a, i) => i === last ? wrapHandler(a, sender) : wrapHandlerOrErrorHandler(a));

        routerMatcher.apply(router, [name].concat(mappedArgs));

        return this;
    };
}

function wrapHandler(handler: RequestHandler, sender: AsyncRouterSender): RequestHandler {
    return function (req, res, next): void {
        try {
            next = once(next);
            toCallback(handler.call(this, req, res, next), next, req, res, result => {
                if (sender && !res.headersSent) {
                    return sender(req, res, result);
                }
            });
        }
        catch (err) {
            next(err);
        }
    };
}

function wrapParamHandler(handler: AsyncRouterParamHandler): ParamHandler {
    return function (req, res, next, param): void {
        try {
            next = once(next);
            toCallback(handler.call(this, req, res, param), next, req, res);
        }
        catch (err) {
            next(err);
        }
    };
}

function wrapHandlerOrErrorHandler(handler: RequestHandler | ErrorHandler): RequestHandler | ErrorHandler {
    if (handler.length === 4) {
        return function (err, req, res, next): void {
            try {
                next = once(next);
                toCallback(handler.call(this, err, req, res, next), next, req, res);
            }
            catch (err) {
                next(err);
            }
        };
    }

    return function (req, res, next): void {
        try {
            next = once(next);
            toCallback(handler.call(this, req, res, next), next, req, res, handler.length === 3);
        }
        catch (err) {
            next(err);
        }
    };
}

function toCallback(thenable: PromiseLike<any>, next: Function, req: Request, res: Response, end?: boolean | ((res) => any)): void {
    if (!thenable || typeof thenable.then !== "function") {
        thenable = Promise.resolve(thenable);
    }

    if (typeof end === "function") {
        thenable = thenable.then(end);
    }

    thenable.then(
        () => {
            if (next && !end && !res.headersSent) {
                next();
            }
        },
        err => {
            if (typeof err === "string") {
                err = new Error(err);
            }

            next(err);
        }
    );
}

function once(fn: NextFunction): NextFunction {
    let called = false;

    return function () {
        if (called) {
            return;
        }

        called = true;
        fn.apply(this, arguments);
    };
}

//#endregion
