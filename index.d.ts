import * as express from "express";
export declare type Router = express.Router;
export declare type Request = express.Request;
export declare type Response = express.Response;
export declare type RequestParamHandler = express.RequestParamHandler;
export declare type IRouterMatcher<T> = express.IRouterMatcher<AsyncRouterInstance>;
export declare type IRoute = express.IRoute;
export declare type RequestHandler = express.RequestHandler;
export declare type ErrorRequestHandler = express.ErrorRequestHandler;
export declare type AsyncRouterParamHandler = (req: Request, res: Response, param: any) => any;
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
export declare function AsyncRouter(options?: AsyncRouterOptions): AsyncRouterInstance;
/** Returns a new AsyncRouter instance with default options. */
export declare function create(): AsyncRouterInstance;
/**
 * Returns a new AsyncRouter instance with default options.
 * @param {Object} options - options to pass to express Router plus AsyncRouter options.
 */
export declare function create(options: AsyncRouterOptions): AsyncRouterInstance;
