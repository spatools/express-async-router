declare module "express-async-router" {
	import * as express from "express";
	export type Router = express.Router;
	export type Request = express.Request;
	export type Response = express.Response;
	export type RequestParamHandler = express.RequestParamHandler;
	export type IRouterMatcher<T> = express.IRouterMatcher<AsyncRouterInstance>;
	export type IRoute = express.IRoute;
	export type RequestHandler = express.RequestHandler;
	export type ErrorRequestHandler = express.ErrorRequestHandler;
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
	export function AsyncRouter(options?: AsyncRouterOptions): AsyncRouterInstance;
	/** Returns a new AsyncRouter instance with default options. */
	export function create(): AsyncRouterInstance;
	/**
	 * Returns a new AsyncRouter instance with default options.
	 * @param {Object} options - options to pass to express Router plus AsyncRouter options.
	 */
	export function create(options: AsyncRouterOptions): AsyncRouterInstance;
}
