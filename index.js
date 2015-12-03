/// <reference path="_references.d.ts" />
var express = require("express");
var DEFAULT_SENDER = function (req, res, val) { res.send(val); }, SHORTCUTS_METHODS = ["all", "get", "post", "put", "delete", "patch", "options", "head"];
function AsyncRouter(options) {
    var sender = getSender(options), innerRouter = express.Router(options), asyncRouter = function () {
        return innerRouter.apply(this, arguments);
    };
    wrapAllMatchers(asyncRouter, sender, innerRouter);
    asyncRouter.param = function param() {
        if (typeof arguments[1] === "function" && arguments[1].length === 3) {
            innerRouter.param(arguments[0], wrapParamHandler(arguments[1]));
            return this;
        }
        innerRouter.param.apply(innerRouter, arguments);
        return this;
    };
    asyncRouter.route = function route(path) {
        var r = innerRouter.route(path);
        wrapAllMatchers(r, sender);
        return r;
    };
    asyncRouter.use = function use() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        innerRouter.use.apply(innerRouter, args.map(function (arg) { return typeof arg === "function" ? wrapHandlerOrErrorHandler(arg) : arg; }));
        return this;
    };
    return asyncRouter;
}
exports.AsyncRouter = AsyncRouter;
function create(options) {
    return AsyncRouter(options);
}
exports.create = create;
function getSender(options) {
    if (!options) {
        return DEFAULT_SENDER;
    }
    var send = options.send, sender = options.sender;
    delete options.send;
    delete options.sender;
    if (send !== false) {
        return sender || DEFAULT_SENDER;
    }
}
function wrapAllMatchers(route, sender, router) {
    router = router || route;
    SHORTCUTS_METHODS.forEach(function (method) {
        route[method] = wrapMatcher(router, router[method], sender);
    });
}
function wrapMatcher(router, routerMatcher, sender) {
    var _this = this;
    return function (name) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        routerMatcher.call.apply(routerMatcher, [router, name].concat(args.map(function (a) { return wrapHandler(a, sender); })));
        return _this;
    };
}
function wrapHandler(handler, sender) {
    return function (req, res, next) {
        next = once(next);
        toCallback(handler.call(this, req, res, next), next, function (result) {
            if (!res.headersSent) {
                return sender(req, res, result);
            }
        });
    };
}
function wrapParamHandler(handler) {
    return function (req, res, next, param) {
        next = once(next);
        toCallback(handler.call(this, req, res, param), next);
    };
}
function wrapHandlerOrErrorHandler(handler) {
    if (handler.length === 4) {
        return function (err, req, res, next) {
            next = once(next);
            toCallback(handler.call(this, err, req, res, next), next);
        };
    }
    return function (req, res, next) {
        next = once(next);
        toCallback(handler.call(this, req, res, next), next);
    };
}
function toCallback(thenable, next, end) {
    if (!thenable || typeof thenable.then !== "function") {
        thenable = Promise.resolve(thenable);
    }
    if (end) {
        thenable = thenable.then(end);
    }
    thenable.then(function () { next(); }, function (err) {
        if (typeof err === "string") {
            err = new Error(err);
        }
        next(err);
    });
}
function once(fn) {
    var called = false;
    return function () {
        if (called) {
            return;
        }
        called = true;
        fn.apply(this, arguments);
    };
}
