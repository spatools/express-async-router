/// <reference path="_references.d.ts" />

//#region Express Members

import * as express from "express";

export type Router = express.Router;
export type Request = express.Request;
export type Response = express.Response;

export type RequestParamHandler = express.RequestParamHandler;
export type IRouterMatcher<T> = express.IRouterMatcher<AsyncRouterInstance>;
export type IRoute = express.IRoute;
export type RequestHandler = express.RequestHandler;
export type ErrorRequestHandler = express.ErrorRequestHandler;

//#endregion

//#region Types and Constants

const
    DEFAULT_SENDER = (req, res, val) => { res.send(val); },
    SHORTCUTS_METHODS = ["all", "get", "post", "put", "delete", "patch", "options", "head"];

export type AsyncRouterParamHandler = (req: Request, res: Response, param: any) => any;

export interface AsyncRouterOptions {
    caseSensitive?: boolean;
    mergeParams?: boolean;
    strict?: boolean;

    send?: boolean;
    sender?: AsyncRouterParamHandler;
}

export interface AsyncRouter {
    (): AsyncRouterInstance;
    (options: AsyncRouterOptions): AsyncRouterInstance;

    new (): AsyncRouterInstance;
    new (options: AsyncRouterOptions): AsyncRouterInstance;
}

export interface AsyncRouterInstance extends express.IRouter<AsyncRouterInstance> {
    param(name: string, handler: RequestParamHandler): AsyncRouterInstance;
    param(name: string, matcher: RegExp): AsyncRouterInstance;
    param(name: string, mapper: (param: any) => any): AsyncRouterInstance;
    param(callback: (name: string, matcher: RegExp) => RequestParamHandler): AsyncRouterInstance;

    /** Async param function. */
    param(name: string, handler: AsyncRouterParamHandler): void;
}

//#endregion

//#region Public 

export function AsyncRouter(options?: AsyncRouterOptions): AsyncRouterInstance {
    const
        sender = getSender(options),
        innerRouter = express.Router(options),

        asyncRouter: AsyncRouterInstance = function() {
            return innerRouter.apply(this, arguments);
        } as any;

    wrapAllMatchers(asyncRouter, sender, innerRouter);

    asyncRouter.param = function param(): AsyncRouterInstance {
        if (typeof arguments[1] === "function" && arguments[1].length === 3) {
            innerRouter.param(arguments[0], wrapParamHandler(arguments[1]));
            return this;
        }

        innerRouter.param.apply(innerRouter, arguments);
        return this;
    };

    asyncRouter.route = function route(path: string): IRoute {
        const r = innerRouter.route(path);
        wrapAllMatchers(r, sender);
        return r;
    };

    asyncRouter.use = function use(...args: any[]): AsyncRouterInstance {
        innerRouter.use.apply(innerRouter, args.map(arg => typeof arg === "function" ? wrapHandlerOrErrorHandler(arg) : arg));
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

function getSender(options: AsyncRouterOptions): AsyncRouterParamHandler {
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

function wrapAllMatchers(route: Router | IRoute, sender: AsyncRouterParamHandler, router?: Router): void {
    router = router || route as Router;

    SHORTCUTS_METHODS.forEach(method => {
        route[method] = wrapMatcher(router, router[method], sender);
    });
}

function wrapMatcher(router: Router | IRoute, routerMatcher: IRouterMatcher<Router>, sender: AsyncRouterParamHandler): IRouterMatcher<AsyncRouterInstance> {
    return (name: any, ...args: RequestHandler[]) => {
        routerMatcher.call(router, name, ...args.map(a => wrapHandler(a, sender)));
        return this;
    };
}

function wrapHandler(handler: RequestHandler, sender: AsyncRouterParamHandler): RequestHandler {
    return function(req, res, next): void {
        try {
            next = once(next);
            toCallback(handler.call(this, req, res, next), next, req, res, result => {
                if (!res.headersSent) {
                    return sender(req, res, result);
                }
            });
        }
        catch (err) {
            next(err);
        }
    };
}

function wrapParamHandler(handler: AsyncRouterParamHandler): RequestParamHandler {
    return function(req, res, next, param): void {
        try {
            next = once(next);
            toCallback(handler.call(this, req, res, param), next, req, res);
        }
        catch (err) {
            next(err);
        }
    };
}

function wrapHandlerOrErrorHandler(handler: RequestHandler | ErrorRequestHandler): RequestHandler | ErrorRequestHandler {
    if (handler.length === 4) {
        return function(err, req, res, next): void {
            try {
                next = once(next);
                toCallback(handler.call(this, err, req, res, next), next, req, res);
            }
            catch (err) {
                next(err);
            }
        };
    }

    return function(req, res, next): void {
        try {
            next = once(next);
            toCallback(handler.call(this, req, res, next), next, req, res);
        }
        catch (err) {
            next(err);
        }
    };
}

function toCallback(thenable: Thenable<any>, next: Function, req: Request, res: Response, end?: (res) => any): void {
    if (!thenable || typeof thenable.then !== "function") {
        thenable = Promise.resolve(thenable);
    }

    if (end) {
        thenable = thenable.then(end);
    }

    thenable.then(
        () => {
            if (!res.headersSent) {
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

function once(fn: Function): Function {
    let called = false;

    return function() {
        if (called) {
            return;
        }

        called = true;
        fn.apply(this, arguments);
    };
}

//#endregion
