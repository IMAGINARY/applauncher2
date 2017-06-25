(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global){
/* @preserve
 * The MIT License (MIT)
 * 
 * Copyright (c) 2013-2017 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
/**
 * bluebird build version 3.5.0
 * Features enabled: core, race, call_get, generators, map, nodeify, promisify, props, reduce, settle, some, using, timers, filter, any, each
*/
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Promise=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof _dereq_=="function"&&_dereq_;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof _dereq_=="function"&&_dereq_;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var SomePromiseArray = Promise._SomePromiseArray;
function any(promises) {
    var ret = new SomePromiseArray(promises);
    var promise = ret.promise();
    ret.setHowMany(1);
    ret.setUnwrap();
    ret.init();
    return promise;
}

Promise.any = function (promises) {
    return any(promises);
};

Promise.prototype.any = function () {
    return any(this);
};

};

},{}],2:[function(_dereq_,module,exports){
"use strict";
var firstLineError;
try {throw new Error(); } catch (e) {firstLineError = e;}
var schedule = _dereq_("./schedule");
var Queue = _dereq_("./queue");
var util = _dereq_("./util");

function Async() {
    this._customScheduler = false;
    this._isTickUsed = false;
    this._lateQueue = new Queue(16);
    this._normalQueue = new Queue(16);
    this._haveDrainedQueues = false;
    this._trampolineEnabled = true;
    var self = this;
    this.drainQueues = function () {
        self._drainQueues();
    };
    this._schedule = schedule;
}

Async.prototype.setScheduler = function(fn) {
    var prev = this._schedule;
    this._schedule = fn;
    this._customScheduler = true;
    return prev;
};

Async.prototype.hasCustomScheduler = function() {
    return this._customScheduler;
};

Async.prototype.enableTrampoline = function() {
    this._trampolineEnabled = true;
};

Async.prototype.disableTrampolineIfNecessary = function() {
    if (util.hasDevTools) {
        this._trampolineEnabled = false;
    }
};

Async.prototype.haveItemsQueued = function () {
    return this._isTickUsed || this._haveDrainedQueues;
};


Async.prototype.fatalError = function(e, isNode) {
    if (isNode) {
        process.stderr.write("Fatal " + (e instanceof Error ? e.stack : e) +
            "\n");
        process.exit(2);
    } else {
        this.throwLater(e);
    }
};

Async.prototype.throwLater = function(fn, arg) {
    if (arguments.length === 1) {
        arg = fn;
        fn = function () { throw arg; };
    }
    if (typeof setTimeout !== "undefined") {
        setTimeout(function() {
            fn(arg);
        }, 0);
    } else try {
        this._schedule(function() {
            fn(arg);
        });
    } catch (e) {
        throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
};

function AsyncInvokeLater(fn, receiver, arg) {
    this._lateQueue.push(fn, receiver, arg);
    this._queueTick();
}

function AsyncInvoke(fn, receiver, arg) {
    this._normalQueue.push(fn, receiver, arg);
    this._queueTick();
}

function AsyncSettlePromises(promise) {
    this._normalQueue._pushOne(promise);
    this._queueTick();
}

if (!util.hasDevTools) {
    Async.prototype.invokeLater = AsyncInvokeLater;
    Async.prototype.invoke = AsyncInvoke;
    Async.prototype.settlePromises = AsyncSettlePromises;
} else {
    Async.prototype.invokeLater = function (fn, receiver, arg) {
        if (this._trampolineEnabled) {
            AsyncInvokeLater.call(this, fn, receiver, arg);
        } else {
            this._schedule(function() {
                setTimeout(function() {
                    fn.call(receiver, arg);
                }, 100);
            });
        }
    };

    Async.prototype.invoke = function (fn, receiver, arg) {
        if (this._trampolineEnabled) {
            AsyncInvoke.call(this, fn, receiver, arg);
        } else {
            this._schedule(function() {
                fn.call(receiver, arg);
            });
        }
    };

    Async.prototype.settlePromises = function(promise) {
        if (this._trampolineEnabled) {
            AsyncSettlePromises.call(this, promise);
        } else {
            this._schedule(function() {
                promise._settlePromises();
            });
        }
    };
}

Async.prototype._drainQueue = function(queue) {
    while (queue.length() > 0) {
        var fn = queue.shift();
        if (typeof fn !== "function") {
            fn._settlePromises();
            continue;
        }
        var receiver = queue.shift();
        var arg = queue.shift();
        fn.call(receiver, arg);
    }
};

Async.prototype._drainQueues = function () {
    this._drainQueue(this._normalQueue);
    this._reset();
    this._haveDrainedQueues = true;
    this._drainQueue(this._lateQueue);
};

Async.prototype._queueTick = function () {
    if (!this._isTickUsed) {
        this._isTickUsed = true;
        this._schedule(this.drainQueues);
    }
};

Async.prototype._reset = function () {
    this._isTickUsed = false;
};

module.exports = Async;
module.exports.firstLineError = firstLineError;

},{"./queue":26,"./schedule":29,"./util":36}],3:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, tryConvertToPromise, debug) {
var calledBind = false;
var rejectThis = function(_, e) {
    this._reject(e);
};

var targetRejected = function(e, context) {
    context.promiseRejectionQueued = true;
    context.bindingPromise._then(rejectThis, rejectThis, null, this, e);
};

var bindingResolved = function(thisArg, context) {
    if (((this._bitField & 50397184) === 0)) {
        this._resolveCallback(context.target);
    }
};

var bindingRejected = function(e, context) {
    if (!context.promiseRejectionQueued) this._reject(e);
};

Promise.prototype.bind = function (thisArg) {
    if (!calledBind) {
        calledBind = true;
        Promise.prototype._propagateFrom = debug.propagateFromFunction();
        Promise.prototype._boundValue = debug.boundValueFunction();
    }
    var maybePromise = tryConvertToPromise(thisArg);
    var ret = new Promise(INTERNAL);
    ret._propagateFrom(this, 1);
    var target = this._target();
    ret._setBoundTo(maybePromise);
    if (maybePromise instanceof Promise) {
        var context = {
            promiseRejectionQueued: false,
            promise: ret,
            target: target,
            bindingPromise: maybePromise
        };
        target._then(INTERNAL, targetRejected, undefined, ret, context);
        maybePromise._then(
            bindingResolved, bindingRejected, undefined, ret, context);
        ret._setOnCancel(maybePromise);
    } else {
        ret._resolveCallback(target);
    }
    return ret;
};

Promise.prototype._setBoundTo = function (obj) {
    if (obj !== undefined) {
        this._bitField = this._bitField | 2097152;
        this._boundTo = obj;
    } else {
        this._bitField = this._bitField & (~2097152);
    }
};

Promise.prototype._isBound = function () {
    return (this._bitField & 2097152) === 2097152;
};

Promise.bind = function (thisArg, value) {
    return Promise.resolve(value).bind(thisArg);
};
};

},{}],4:[function(_dereq_,module,exports){
"use strict";
var old;
if (typeof Promise !== "undefined") old = Promise;
function noConflict() {
    try { if (Promise === bluebird) Promise = old; }
    catch (e) {}
    return bluebird;
}
var bluebird = _dereq_("./promise")();
bluebird.noConflict = noConflict;
module.exports = bluebird;

},{"./promise":22}],5:[function(_dereq_,module,exports){
"use strict";
var cr = Object.create;
if (cr) {
    var callerCache = cr(null);
    var getterCache = cr(null);
    callerCache[" size"] = getterCache[" size"] = 0;
}

module.exports = function(Promise) {
var util = _dereq_("./util");
var canEvaluate = util.canEvaluate;
var isIdentifier = util.isIdentifier;

var getMethodCaller;
var getGetter;
if (!true) {
var makeMethodCaller = function (methodName) {
    return new Function("ensureMethod", "                                    \n\
        return function(obj) {                                               \n\
            'use strict'                                                     \n\
            var len = this.length;                                           \n\
            ensureMethod(obj, 'methodName');                                 \n\
            switch(len) {                                                    \n\
                case 1: return obj.methodName(this[0]);                      \n\
                case 2: return obj.methodName(this[0], this[1]);             \n\
                case 3: return obj.methodName(this[0], this[1], this[2]);    \n\
                case 0: return obj.methodName();                             \n\
                default:                                                     \n\
                    return obj.methodName.apply(obj, this);                  \n\
            }                                                                \n\
        };                                                                   \n\
        ".replace(/methodName/g, methodName))(ensureMethod);
};

var makeGetter = function (propertyName) {
    return new Function("obj", "                                             \n\
        'use strict';                                                        \n\
        return obj.propertyName;                                             \n\
        ".replace("propertyName", propertyName));
};

var getCompiled = function(name, compiler, cache) {
    var ret = cache[name];
    if (typeof ret !== "function") {
        if (!isIdentifier(name)) {
            return null;
        }
        ret = compiler(name);
        cache[name] = ret;
        cache[" size"]++;
        if (cache[" size"] > 512) {
            var keys = Object.keys(cache);
            for (var i = 0; i < 256; ++i) delete cache[keys[i]];
            cache[" size"] = keys.length - 256;
        }
    }
    return ret;
};

getMethodCaller = function(name) {
    return getCompiled(name, makeMethodCaller, callerCache);
};

getGetter = function(name) {
    return getCompiled(name, makeGetter, getterCache);
};
}

function ensureMethod(obj, methodName) {
    var fn;
    if (obj != null) fn = obj[methodName];
    if (typeof fn !== "function") {
        var message = "Object " + util.classString(obj) + " has no method '" +
            util.toString(methodName) + "'";
        throw new Promise.TypeError(message);
    }
    return fn;
}

function caller(obj) {
    var methodName = this.pop();
    var fn = ensureMethod(obj, methodName);
    return fn.apply(obj, this);
}
Promise.prototype.call = function (methodName) {
    var args = [].slice.call(arguments, 1);;
    if (!true) {
        if (canEvaluate) {
            var maybeCaller = getMethodCaller(methodName);
            if (maybeCaller !== null) {
                return this._then(
                    maybeCaller, undefined, undefined, args, undefined);
            }
        }
    }
    args.push(methodName);
    return this._then(caller, undefined, undefined, args, undefined);
};

function namedGetter(obj) {
    return obj[this];
}
function indexedGetter(obj) {
    var index = +this;
    if (index < 0) index = Math.max(0, index + obj.length);
    return obj[index];
}
Promise.prototype.get = function (propertyName) {
    var isIndex = (typeof propertyName === "number");
    var getter;
    if (!isIndex) {
        if (canEvaluate) {
            var maybeGetter = getGetter(propertyName);
            getter = maybeGetter !== null ? maybeGetter : namedGetter;
        } else {
            getter = namedGetter;
        }
    } else {
        getter = indexedGetter;
    }
    return this._then(getter, undefined, undefined, propertyName, undefined);
};
};

},{"./util":36}],6:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, PromiseArray, apiRejection, debug) {
var util = _dereq_("./util");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var async = Promise._async;

Promise.prototype["break"] = Promise.prototype.cancel = function() {
    if (!debug.cancellation()) return this._warn("cancellation is disabled");

    var promise = this;
    var child = promise;
    while (promise._isCancellable()) {
        if (!promise._cancelBy(child)) {
            if (child._isFollowing()) {
                child._followee().cancel();
            } else {
                child._cancelBranched();
            }
            break;
        }

        var parent = promise._cancellationParent;
        if (parent == null || !parent._isCancellable()) {
            if (promise._isFollowing()) {
                promise._followee().cancel();
            } else {
                promise._cancelBranched();
            }
            break;
        } else {
            if (promise._isFollowing()) promise._followee().cancel();
            promise._setWillBeCancelled();
            child = promise;
            promise = parent;
        }
    }
};

Promise.prototype._branchHasCancelled = function() {
    this._branchesRemainingToCancel--;
};

Promise.prototype._enoughBranchesHaveCancelled = function() {
    return this._branchesRemainingToCancel === undefined ||
           this._branchesRemainingToCancel <= 0;
};

Promise.prototype._cancelBy = function(canceller) {
    if (canceller === this) {
        this._branchesRemainingToCancel = 0;
        this._invokeOnCancel();
        return true;
    } else {
        this._branchHasCancelled();
        if (this._enoughBranchesHaveCancelled()) {
            this._invokeOnCancel();
            return true;
        }
    }
    return false;
};

Promise.prototype._cancelBranched = function() {
    if (this._enoughBranchesHaveCancelled()) {
        this._cancel();
    }
};

Promise.prototype._cancel = function() {
    if (!this._isCancellable()) return;
    this._setCancelled();
    async.invoke(this._cancelPromises, this, undefined);
};

Promise.prototype._cancelPromises = function() {
    if (this._length() > 0) this._settlePromises();
};

Promise.prototype._unsetOnCancel = function() {
    this._onCancelField = undefined;
};

Promise.prototype._isCancellable = function() {
    return this.isPending() && !this._isCancelled();
};

Promise.prototype.isCancellable = function() {
    return this.isPending() && !this.isCancelled();
};

Promise.prototype._doInvokeOnCancel = function(onCancelCallback, internalOnly) {
    if (util.isArray(onCancelCallback)) {
        for (var i = 0; i < onCancelCallback.length; ++i) {
            this._doInvokeOnCancel(onCancelCallback[i], internalOnly);
        }
    } else if (onCancelCallback !== undefined) {
        if (typeof onCancelCallback === "function") {
            if (!internalOnly) {
                var e = tryCatch(onCancelCallback).call(this._boundValue());
                if (e === errorObj) {
                    this._attachExtraTrace(e.e);
                    async.throwLater(e.e);
                }
            }
        } else {
            onCancelCallback._resultCancelled(this);
        }
    }
};

Promise.prototype._invokeOnCancel = function() {
    var onCancelCallback = this._onCancel();
    this._unsetOnCancel();
    async.invoke(this._doInvokeOnCancel, this, onCancelCallback);
};

Promise.prototype._invokeInternalOnCancel = function() {
    if (this._isCancellable()) {
        this._doInvokeOnCancel(this._onCancel(), true);
        this._unsetOnCancel();
    }
};

Promise.prototype._resultCancelled = function() {
    this.cancel();
};

};

},{"./util":36}],7:[function(_dereq_,module,exports){
"use strict";
module.exports = function(NEXT_FILTER) {
var util = _dereq_("./util");
var getKeys = _dereq_("./es5").keys;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;

function catchFilter(instances, cb, promise) {
    return function(e) {
        var boundTo = promise._boundValue();
        predicateLoop: for (var i = 0; i < instances.length; ++i) {
            var item = instances[i];

            if (item === Error ||
                (item != null && item.prototype instanceof Error)) {
                if (e instanceof item) {
                    return tryCatch(cb).call(boundTo, e);
                }
            } else if (typeof item === "function") {
                var matchesPredicate = tryCatch(item).call(boundTo, e);
                if (matchesPredicate === errorObj) {
                    return matchesPredicate;
                } else if (matchesPredicate) {
                    return tryCatch(cb).call(boundTo, e);
                }
            } else if (util.isObject(e)) {
                var keys = getKeys(item);
                for (var j = 0; j < keys.length; ++j) {
                    var key = keys[j];
                    if (item[key] != e[key]) {
                        continue predicateLoop;
                    }
                }
                return tryCatch(cb).call(boundTo, e);
            }
        }
        return NEXT_FILTER;
    };
}

return catchFilter;
};

},{"./es5":13,"./util":36}],8:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var longStackTraces = false;
var contextStack = [];

Promise.prototype._promiseCreated = function() {};
Promise.prototype._pushContext = function() {};
Promise.prototype._popContext = function() {return null;};
Promise._peekContext = Promise.prototype._peekContext = function() {};

function Context() {
    this._trace = new Context.CapturedTrace(peekContext());
}
Context.prototype._pushContext = function () {
    if (this._trace !== undefined) {
        this._trace._promiseCreated = null;
        contextStack.push(this._trace);
    }
};

Context.prototype._popContext = function () {
    if (this._trace !== undefined) {
        var trace = contextStack.pop();
        var ret = trace._promiseCreated;
        trace._promiseCreated = null;
        return ret;
    }
    return null;
};

function createContext() {
    if (longStackTraces) return new Context();
}

function peekContext() {
    var lastIndex = contextStack.length - 1;
    if (lastIndex >= 0) {
        return contextStack[lastIndex];
    }
    return undefined;
}
Context.CapturedTrace = null;
Context.create = createContext;
Context.deactivateLongStackTraces = function() {};
Context.activateLongStackTraces = function() {
    var Promise_pushContext = Promise.prototype._pushContext;
    var Promise_popContext = Promise.prototype._popContext;
    var Promise_PeekContext = Promise._peekContext;
    var Promise_peekContext = Promise.prototype._peekContext;
    var Promise_promiseCreated = Promise.prototype._promiseCreated;
    Context.deactivateLongStackTraces = function() {
        Promise.prototype._pushContext = Promise_pushContext;
        Promise.prototype._popContext = Promise_popContext;
        Promise._peekContext = Promise_PeekContext;
        Promise.prototype._peekContext = Promise_peekContext;
        Promise.prototype._promiseCreated = Promise_promiseCreated;
        longStackTraces = false;
    };
    longStackTraces = true;
    Promise.prototype._pushContext = Context.prototype._pushContext;
    Promise.prototype._popContext = Context.prototype._popContext;
    Promise._peekContext = Promise.prototype._peekContext = peekContext;
    Promise.prototype._promiseCreated = function() {
        var ctx = this._peekContext();
        if (ctx && ctx._promiseCreated == null) ctx._promiseCreated = this;
    };
};
return Context;
};

},{}],9:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, Context) {
var getDomain = Promise._getDomain;
var async = Promise._async;
var Warning = _dereq_("./errors").Warning;
var util = _dereq_("./util");
var canAttachTrace = util.canAttachTrace;
var unhandledRejectionHandled;
var possiblyUnhandledRejection;
var bluebirdFramePattern =
    /[\\\/]bluebird[\\\/]js[\\\/](release|debug|instrumented)/;
var nodeFramePattern = /\((?:timers\.js):\d+:\d+\)/;
var parseLinePattern = /[\/<\(](.+?):(\d+):(\d+)\)?\s*$/;
var stackFramePattern = null;
var formatStack = null;
var indentStackFrames = false;
var printWarning;
var debugging = !!(util.env("BLUEBIRD_DEBUG") != 0 &&
                        (true ||
                         util.env("BLUEBIRD_DEBUG") ||
                         util.env("NODE_ENV") === "development"));

var warnings = !!(util.env("BLUEBIRD_WARNINGS") != 0 &&
    (debugging || util.env("BLUEBIRD_WARNINGS")));

var longStackTraces = !!(util.env("BLUEBIRD_LONG_STACK_TRACES") != 0 &&
    (debugging || util.env("BLUEBIRD_LONG_STACK_TRACES")));

var wForgottenReturn = util.env("BLUEBIRD_W_FORGOTTEN_RETURN") != 0 &&
    (warnings || !!util.env("BLUEBIRD_W_FORGOTTEN_RETURN"));

Promise.prototype.suppressUnhandledRejections = function() {
    var target = this._target();
    target._bitField = ((target._bitField & (~1048576)) |
                      524288);
};

Promise.prototype._ensurePossibleRejectionHandled = function () {
    if ((this._bitField & 524288) !== 0) return;
    this._setRejectionIsUnhandled();
    async.invokeLater(this._notifyUnhandledRejection, this, undefined);
};

Promise.prototype._notifyUnhandledRejectionIsHandled = function () {
    fireRejectionEvent("rejectionHandled",
                                  unhandledRejectionHandled, undefined, this);
};

Promise.prototype._setReturnedNonUndefined = function() {
    this._bitField = this._bitField | 268435456;
};

Promise.prototype._returnedNonUndefined = function() {
    return (this._bitField & 268435456) !== 0;
};

Promise.prototype._notifyUnhandledRejection = function () {
    if (this._isRejectionUnhandled()) {
        var reason = this._settledValue();
        this._setUnhandledRejectionIsNotified();
        fireRejectionEvent("unhandledRejection",
                                      possiblyUnhandledRejection, reason, this);
    }
};

Promise.prototype._setUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField | 262144;
};

Promise.prototype._unsetUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField & (~262144);
};

Promise.prototype._isUnhandledRejectionNotified = function () {
    return (this._bitField & 262144) > 0;
};

Promise.prototype._setRejectionIsUnhandled = function () {
    this._bitField = this._bitField | 1048576;
};

Promise.prototype._unsetRejectionIsUnhandled = function () {
    this._bitField = this._bitField & (~1048576);
    if (this._isUnhandledRejectionNotified()) {
        this._unsetUnhandledRejectionIsNotified();
        this._notifyUnhandledRejectionIsHandled();
    }
};

Promise.prototype._isRejectionUnhandled = function () {
    return (this._bitField & 1048576) > 0;
};

Promise.prototype._warn = function(message, shouldUseOwnTrace, promise) {
    return warn(message, shouldUseOwnTrace, promise || this);
};

Promise.onPossiblyUnhandledRejection = function (fn) {
    var domain = getDomain();
    possiblyUnhandledRejection =
        typeof fn === "function" ? (domain === null ?
                                            fn : util.domainBind(domain, fn))
                                 : undefined;
};

Promise.onUnhandledRejectionHandled = function (fn) {
    var domain = getDomain();
    unhandledRejectionHandled =
        typeof fn === "function" ? (domain === null ?
                                            fn : util.domainBind(domain, fn))
                                 : undefined;
};

var disableLongStackTraces = function() {};
Promise.longStackTraces = function () {
    if (async.haveItemsQueued() && !config.longStackTraces) {
        throw new Error("cannot enable long stack traces after promises have been created\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    if (!config.longStackTraces && longStackTracesIsSupported()) {
        var Promise_captureStackTrace = Promise.prototype._captureStackTrace;
        var Promise_attachExtraTrace = Promise.prototype._attachExtraTrace;
        config.longStackTraces = true;
        disableLongStackTraces = function() {
            if (async.haveItemsQueued() && !config.longStackTraces) {
                throw new Error("cannot enable long stack traces after promises have been created\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
            }
            Promise.prototype._captureStackTrace = Promise_captureStackTrace;
            Promise.prototype._attachExtraTrace = Promise_attachExtraTrace;
            Context.deactivateLongStackTraces();
            async.enableTrampoline();
            config.longStackTraces = false;
        };
        Promise.prototype._captureStackTrace = longStackTracesCaptureStackTrace;
        Promise.prototype._attachExtraTrace = longStackTracesAttachExtraTrace;
        Context.activateLongStackTraces();
        async.disableTrampolineIfNecessary();
    }
};

Promise.hasLongStackTraces = function () {
    return config.longStackTraces && longStackTracesIsSupported();
};

var fireDomEvent = (function() {
    try {
        if (typeof CustomEvent === "function") {
            var event = new CustomEvent("CustomEvent");
            util.global.dispatchEvent(event);
            return function(name, event) {
                var domEvent = new CustomEvent(name.toLowerCase(), {
                    detail: event,
                    cancelable: true
                });
                return !util.global.dispatchEvent(domEvent);
            };
        } else if (typeof Event === "function") {
            var event = new Event("CustomEvent");
            util.global.dispatchEvent(event);
            return function(name, event) {
                var domEvent = new Event(name.toLowerCase(), {
                    cancelable: true
                });
                domEvent.detail = event;
                return !util.global.dispatchEvent(domEvent);
            };
        } else {
            var event = document.createEvent("CustomEvent");
            event.initCustomEvent("testingtheevent", false, true, {});
            util.global.dispatchEvent(event);
            return function(name, event) {
                var domEvent = document.createEvent("CustomEvent");
                domEvent.initCustomEvent(name.toLowerCase(), false, true,
                    event);
                return !util.global.dispatchEvent(domEvent);
            };
        }
    } catch (e) {}
    return function() {
        return false;
    };
})();

var fireGlobalEvent = (function() {
    if (util.isNode) {
        return function() {
            return process.emit.apply(process, arguments);
        };
    } else {
        if (!util.global) {
            return function() {
                return false;
            };
        }
        return function(name) {
            var methodName = "on" + name.toLowerCase();
            var method = util.global[methodName];
            if (!method) return false;
            method.apply(util.global, [].slice.call(arguments, 1));
            return true;
        };
    }
})();

function generatePromiseLifecycleEventObject(name, promise) {
    return {promise: promise};
}

var eventToObjectGenerator = {
    promiseCreated: generatePromiseLifecycleEventObject,
    promiseFulfilled: generatePromiseLifecycleEventObject,
    promiseRejected: generatePromiseLifecycleEventObject,
    promiseResolved: generatePromiseLifecycleEventObject,
    promiseCancelled: generatePromiseLifecycleEventObject,
    promiseChained: function(name, promise, child) {
        return {promise: promise, child: child};
    },
    warning: function(name, warning) {
        return {warning: warning};
    },
    unhandledRejection: function (name, reason, promise) {
        return {reason: reason, promise: promise};
    },
    rejectionHandled: generatePromiseLifecycleEventObject
};

var activeFireEvent = function (name) {
    var globalEventFired = false;
    try {
        globalEventFired = fireGlobalEvent.apply(null, arguments);
    } catch (e) {
        async.throwLater(e);
        globalEventFired = true;
    }

    var domEventFired = false;
    try {
        domEventFired = fireDomEvent(name,
                    eventToObjectGenerator[name].apply(null, arguments));
    } catch (e) {
        async.throwLater(e);
        domEventFired = true;
    }

    return domEventFired || globalEventFired;
};

Promise.config = function(opts) {
    opts = Object(opts);
    if ("longStackTraces" in opts) {
        if (opts.longStackTraces) {
            Promise.longStackTraces();
        } else if (!opts.longStackTraces && Promise.hasLongStackTraces()) {
            disableLongStackTraces();
        }
    }
    if ("warnings" in opts) {
        var warningsOption = opts.warnings;
        config.warnings = !!warningsOption;
        wForgottenReturn = config.warnings;

        if (util.isObject(warningsOption)) {
            if ("wForgottenReturn" in warningsOption) {
                wForgottenReturn = !!warningsOption.wForgottenReturn;
            }
        }
    }
    if ("cancellation" in opts && opts.cancellation && !config.cancellation) {
        if (async.haveItemsQueued()) {
            throw new Error(
                "cannot enable cancellation after promises are in use");
        }
        Promise.prototype._clearCancellationData =
            cancellationClearCancellationData;
        Promise.prototype._propagateFrom = cancellationPropagateFrom;
        Promise.prototype._onCancel = cancellationOnCancel;
        Promise.prototype._setOnCancel = cancellationSetOnCancel;
        Promise.prototype._attachCancellationCallback =
            cancellationAttachCancellationCallback;
        Promise.prototype._execute = cancellationExecute;
        propagateFromFunction = cancellationPropagateFrom;
        config.cancellation = true;
    }
    if ("monitoring" in opts) {
        if (opts.monitoring && !config.monitoring) {
            config.monitoring = true;
            Promise.prototype._fireEvent = activeFireEvent;
        } else if (!opts.monitoring && config.monitoring) {
            config.monitoring = false;
            Promise.prototype._fireEvent = defaultFireEvent;
        }
    }
    return Promise;
};

function defaultFireEvent() { return false; }

Promise.prototype._fireEvent = defaultFireEvent;
Promise.prototype._execute = function(executor, resolve, reject) {
    try {
        executor(resolve, reject);
    } catch (e) {
        return e;
    }
};
Promise.prototype._onCancel = function () {};
Promise.prototype._setOnCancel = function (handler) { ; };
Promise.prototype._attachCancellationCallback = function(onCancel) {
    ;
};
Promise.prototype._captureStackTrace = function () {};
Promise.prototype._attachExtraTrace = function () {};
Promise.prototype._clearCancellationData = function() {};
Promise.prototype._propagateFrom = function (parent, flags) {
    ;
    ;
};

function cancellationExecute(executor, resolve, reject) {
    var promise = this;
    try {
        executor(resolve, reject, function(onCancel) {
            if (typeof onCancel !== "function") {
                throw new TypeError("onCancel must be a function, got: " +
                                    util.toString(onCancel));
            }
            promise._attachCancellationCallback(onCancel);
        });
    } catch (e) {
        return e;
    }
}

function cancellationAttachCancellationCallback(onCancel) {
    if (!this._isCancellable()) return this;

    var previousOnCancel = this._onCancel();
    if (previousOnCancel !== undefined) {
        if (util.isArray(previousOnCancel)) {
            previousOnCancel.push(onCancel);
        } else {
            this._setOnCancel([previousOnCancel, onCancel]);
        }
    } else {
        this._setOnCancel(onCancel);
    }
}

function cancellationOnCancel() {
    return this._onCancelField;
}

function cancellationSetOnCancel(onCancel) {
    this._onCancelField = onCancel;
}

function cancellationClearCancellationData() {
    this._cancellationParent = undefined;
    this._onCancelField = undefined;
}

function cancellationPropagateFrom(parent, flags) {
    if ((flags & 1) !== 0) {
        this._cancellationParent = parent;
        var branchesRemainingToCancel = parent._branchesRemainingToCancel;
        if (branchesRemainingToCancel === undefined) {
            branchesRemainingToCancel = 0;
        }
        parent._branchesRemainingToCancel = branchesRemainingToCancel + 1;
    }
    if ((flags & 2) !== 0 && parent._isBound()) {
        this._setBoundTo(parent._boundTo);
    }
}

function bindingPropagateFrom(parent, flags) {
    if ((flags & 2) !== 0 && parent._isBound()) {
        this._setBoundTo(parent._boundTo);
    }
}
var propagateFromFunction = bindingPropagateFrom;

function boundValueFunction() {
    var ret = this._boundTo;
    if (ret !== undefined) {
        if (ret instanceof Promise) {
            if (ret.isFulfilled()) {
                return ret.value();
            } else {
                return undefined;
            }
        }
    }
    return ret;
}

function longStackTracesCaptureStackTrace() {
    this._trace = new CapturedTrace(this._peekContext());
}

function longStackTracesAttachExtraTrace(error, ignoreSelf) {
    if (canAttachTrace(error)) {
        var trace = this._trace;
        if (trace !== undefined) {
            if (ignoreSelf) trace = trace._parent;
        }
        if (trace !== undefined) {
            trace.attachExtraTrace(error);
        } else if (!error.__stackCleaned__) {
            var parsed = parseStackAndMessage(error);
            util.notEnumerableProp(error, "stack",
                parsed.message + "\n" + parsed.stack.join("\n"));
            util.notEnumerableProp(error, "__stackCleaned__", true);
        }
    }
}

function checkForgottenReturns(returnValue, promiseCreated, name, promise,
                               parent) {
    if (returnValue === undefined && promiseCreated !== null &&
        wForgottenReturn) {
        if (parent !== undefined && parent._returnedNonUndefined()) return;
        if ((promise._bitField & 65535) === 0) return;

        if (name) name = name + " ";
        var handlerLine = "";
        var creatorLine = "";
        if (promiseCreated._trace) {
            var traceLines = promiseCreated._trace.stack.split("\n");
            var stack = cleanStack(traceLines);
            for (var i = stack.length - 1; i >= 0; --i) {
                var line = stack[i];
                if (!nodeFramePattern.test(line)) {
                    var lineMatches = line.match(parseLinePattern);
                    if (lineMatches) {
                        handlerLine  = "at " + lineMatches[1] +
                            ":" + lineMatches[2] + ":" + lineMatches[3] + " ";
                    }
                    break;
                }
            }

            if (stack.length > 0) {
                var firstUserLine = stack[0];
                for (var i = 0; i < traceLines.length; ++i) {

                    if (traceLines[i] === firstUserLine) {
                        if (i > 0) {
                            creatorLine = "\n" + traceLines[i - 1];
                        }
                        break;
                    }
                }

            }
        }
        var msg = "a promise was created in a " + name +
            "handler " + handlerLine + "but was not returned from it, " +
            "see http://goo.gl/rRqMUw" +
            creatorLine;
        promise._warn(msg, true, promiseCreated);
    }
}

function deprecated(name, replacement) {
    var message = name +
        " is deprecated and will be removed in a future version.";
    if (replacement) message += " Use " + replacement + " instead.";
    return warn(message);
}

function warn(message, shouldUseOwnTrace, promise) {
    if (!config.warnings) return;
    var warning = new Warning(message);
    var ctx;
    if (shouldUseOwnTrace) {
        promise._attachExtraTrace(warning);
    } else if (config.longStackTraces && (ctx = Promise._peekContext())) {
        ctx.attachExtraTrace(warning);
    } else {
        var parsed = parseStackAndMessage(warning);
        warning.stack = parsed.message + "\n" + parsed.stack.join("\n");
    }

    if (!activeFireEvent("warning", warning)) {
        formatAndLogError(warning, "", true);
    }
}

function reconstructStack(message, stacks) {
    for (var i = 0; i < stacks.length - 1; ++i) {
        stacks[i].push("From previous event:");
        stacks[i] = stacks[i].join("\n");
    }
    if (i < stacks.length) {
        stacks[i] = stacks[i].join("\n");
    }
    return message + "\n" + stacks.join("\n");
}

function removeDuplicateOrEmptyJumps(stacks) {
    for (var i = 0; i < stacks.length; ++i) {
        if (stacks[i].length === 0 ||
            ((i + 1 < stacks.length) && stacks[i][0] === stacks[i+1][0])) {
            stacks.splice(i, 1);
            i--;
        }
    }
}

function removeCommonRoots(stacks) {
    var current = stacks[0];
    for (var i = 1; i < stacks.length; ++i) {
        var prev = stacks[i];
        var currentLastIndex = current.length - 1;
        var currentLastLine = current[currentLastIndex];
        var commonRootMeetPoint = -1;

        for (var j = prev.length - 1; j >= 0; --j) {
            if (prev[j] === currentLastLine) {
                commonRootMeetPoint = j;
                break;
            }
        }

        for (var j = commonRootMeetPoint; j >= 0; --j) {
            var line = prev[j];
            if (current[currentLastIndex] === line) {
                current.pop();
                currentLastIndex--;
            } else {
                break;
            }
        }
        current = prev;
    }
}

function cleanStack(stack) {
    var ret = [];
    for (var i = 0; i < stack.length; ++i) {
        var line = stack[i];
        var isTraceLine = "    (No stack trace)" === line ||
            stackFramePattern.test(line);
        var isInternalFrame = isTraceLine && shouldIgnore(line);
        if (isTraceLine && !isInternalFrame) {
            if (indentStackFrames && line.charAt(0) !== " ") {
                line = "    " + line;
            }
            ret.push(line);
        }
    }
    return ret;
}

function stackFramesAsArray(error) {
    var stack = error.stack.replace(/\s+$/g, "").split("\n");
    for (var i = 0; i < stack.length; ++i) {
        var line = stack[i];
        if ("    (No stack trace)" === line || stackFramePattern.test(line)) {
            break;
        }
    }
    if (i > 0 && error.name != "SyntaxError") {
        stack = stack.slice(i);
    }
    return stack;
}

function parseStackAndMessage(error) {
    var stack = error.stack;
    var message = error.toString();
    stack = typeof stack === "string" && stack.length > 0
                ? stackFramesAsArray(error) : ["    (No stack trace)"];
    return {
        message: message,
        stack: error.name == "SyntaxError" ? stack : cleanStack(stack)
    };
}

function formatAndLogError(error, title, isSoft) {
    if (typeof console !== "undefined") {
        var message;
        if (util.isObject(error)) {
            var stack = error.stack;
            message = title + formatStack(stack, error);
        } else {
            message = title + String(error);
        }
        if (typeof printWarning === "function") {
            printWarning(message, isSoft);
        } else if (typeof console.log === "function" ||
            typeof console.log === "object") {
            console.log(message);
        }
    }
}

function fireRejectionEvent(name, localHandler, reason, promise) {
    var localEventFired = false;
    try {
        if (typeof localHandler === "function") {
            localEventFired = true;
            if (name === "rejectionHandled") {
                localHandler(promise);
            } else {
                localHandler(reason, promise);
            }
        }
    } catch (e) {
        async.throwLater(e);
    }

    if (name === "unhandledRejection") {
        if (!activeFireEvent(name, reason, promise) && !localEventFired) {
            formatAndLogError(reason, "Unhandled rejection ");
        }
    } else {
        activeFireEvent(name, promise);
    }
}

function formatNonError(obj) {
    var str;
    if (typeof obj === "function") {
        str = "[function " +
            (obj.name || "anonymous") +
            "]";
    } else {
        str = obj && typeof obj.toString === "function"
            ? obj.toString() : util.toString(obj);
        var ruselessToString = /\[object [a-zA-Z0-9$_]+\]/;
        if (ruselessToString.test(str)) {
            try {
                var newStr = JSON.stringify(obj);
                str = newStr;
            }
            catch(e) {

            }
        }
        if (str.length === 0) {
            str = "(empty array)";
        }
    }
    return ("(<" + snip(str) + ">, no stack trace)");
}

function snip(str) {
    var maxChars = 41;
    if (str.length < maxChars) {
        return str;
    }
    return str.substr(0, maxChars - 3) + "...";
}

function longStackTracesIsSupported() {
    return typeof captureStackTrace === "function";
}

var shouldIgnore = function() { return false; };
var parseLineInfoRegex = /[\/<\(]([^:\/]+):(\d+):(?:\d+)\)?\s*$/;
function parseLineInfo(line) {
    var matches = line.match(parseLineInfoRegex);
    if (matches) {
        return {
            fileName: matches[1],
            line: parseInt(matches[2], 10)
        };
    }
}

function setBounds(firstLineError, lastLineError) {
    if (!longStackTracesIsSupported()) return;
    var firstStackLines = firstLineError.stack.split("\n");
    var lastStackLines = lastLineError.stack.split("\n");
    var firstIndex = -1;
    var lastIndex = -1;
    var firstFileName;
    var lastFileName;
    for (var i = 0; i < firstStackLines.length; ++i) {
        var result = parseLineInfo(firstStackLines[i]);
        if (result) {
            firstFileName = result.fileName;
            firstIndex = result.line;
            break;
        }
    }
    for (var i = 0; i < lastStackLines.length; ++i) {
        var result = parseLineInfo(lastStackLines[i]);
        if (result) {
            lastFileName = result.fileName;
            lastIndex = result.line;
            break;
        }
    }
    if (firstIndex < 0 || lastIndex < 0 || !firstFileName || !lastFileName ||
        firstFileName !== lastFileName || firstIndex >= lastIndex) {
        return;
    }

    shouldIgnore = function(line) {
        if (bluebirdFramePattern.test(line)) return true;
        var info = parseLineInfo(line);
        if (info) {
            if (info.fileName === firstFileName &&
                (firstIndex <= info.line && info.line <= lastIndex)) {
                return true;
            }
        }
        return false;
    };
}

function CapturedTrace(parent) {
    this._parent = parent;
    this._promisesCreated = 0;
    var length = this._length = 1 + (parent === undefined ? 0 : parent._length);
    captureStackTrace(this, CapturedTrace);
    if (length > 32) this.uncycle();
}
util.inherits(CapturedTrace, Error);
Context.CapturedTrace = CapturedTrace;

CapturedTrace.prototype.uncycle = function() {
    var length = this._length;
    if (length < 2) return;
    var nodes = [];
    var stackToIndex = {};

    for (var i = 0, node = this; node !== undefined; ++i) {
        nodes.push(node);
        node = node._parent;
    }
    length = this._length = i;
    for (var i = length - 1; i >= 0; --i) {
        var stack = nodes[i].stack;
        if (stackToIndex[stack] === undefined) {
            stackToIndex[stack] = i;
        }
    }
    for (var i = 0; i < length; ++i) {
        var currentStack = nodes[i].stack;
        var index = stackToIndex[currentStack];
        if (index !== undefined && index !== i) {
            if (index > 0) {
                nodes[index - 1]._parent = undefined;
                nodes[index - 1]._length = 1;
            }
            nodes[i]._parent = undefined;
            nodes[i]._length = 1;
            var cycleEdgeNode = i > 0 ? nodes[i - 1] : this;

            if (index < length - 1) {
                cycleEdgeNode._parent = nodes[index + 1];
                cycleEdgeNode._parent.uncycle();
                cycleEdgeNode._length =
                    cycleEdgeNode._parent._length + 1;
            } else {
                cycleEdgeNode._parent = undefined;
                cycleEdgeNode._length = 1;
            }
            var currentChildLength = cycleEdgeNode._length + 1;
            for (var j = i - 2; j >= 0; --j) {
                nodes[j]._length = currentChildLength;
                currentChildLength++;
            }
            return;
        }
    }
};

CapturedTrace.prototype.attachExtraTrace = function(error) {
    if (error.__stackCleaned__) return;
    this.uncycle();
    var parsed = parseStackAndMessage(error);
    var message = parsed.message;
    var stacks = [parsed.stack];

    var trace = this;
    while (trace !== undefined) {
        stacks.push(cleanStack(trace.stack.split("\n")));
        trace = trace._parent;
    }
    removeCommonRoots(stacks);
    removeDuplicateOrEmptyJumps(stacks);
    util.notEnumerableProp(error, "stack", reconstructStack(message, stacks));
    util.notEnumerableProp(error, "__stackCleaned__", true);
};

var captureStackTrace = (function stackDetection() {
    var v8stackFramePattern = /^\s*at\s*/;
    var v8stackFormatter = function(stack, error) {
        if (typeof stack === "string") return stack;

        if (error.name !== undefined &&
            error.message !== undefined) {
            return error.toString();
        }
        return formatNonError(error);
    };

    if (typeof Error.stackTraceLimit === "number" &&
        typeof Error.captureStackTrace === "function") {
        Error.stackTraceLimit += 6;
        stackFramePattern = v8stackFramePattern;
        formatStack = v8stackFormatter;
        var captureStackTrace = Error.captureStackTrace;

        shouldIgnore = function(line) {
            return bluebirdFramePattern.test(line);
        };
        return function(receiver, ignoreUntil) {
            Error.stackTraceLimit += 6;
            captureStackTrace(receiver, ignoreUntil);
            Error.stackTraceLimit -= 6;
        };
    }
    var err = new Error();

    if (typeof err.stack === "string" &&
        err.stack.split("\n")[0].indexOf("stackDetection@") >= 0) {
        stackFramePattern = /@/;
        formatStack = v8stackFormatter;
        indentStackFrames = true;
        return function captureStackTrace(o) {
            o.stack = new Error().stack;
        };
    }

    var hasStackAfterThrow;
    try { throw new Error(); }
    catch(e) {
        hasStackAfterThrow = ("stack" in e);
    }
    if (!("stack" in err) && hasStackAfterThrow &&
        typeof Error.stackTraceLimit === "number") {
        stackFramePattern = v8stackFramePattern;
        formatStack = v8stackFormatter;
        return function captureStackTrace(o) {
            Error.stackTraceLimit += 6;
            try { throw new Error(); }
            catch(e) { o.stack = e.stack; }
            Error.stackTraceLimit -= 6;
        };
    }

    formatStack = function(stack, error) {
        if (typeof stack === "string") return stack;

        if ((typeof error === "object" ||
            typeof error === "function") &&
            error.name !== undefined &&
            error.message !== undefined) {
            return error.toString();
        }
        return formatNonError(error);
    };

    return null;

})([]);

if (typeof console !== "undefined" && typeof console.warn !== "undefined") {
    printWarning = function (message) {
        console.warn(message);
    };
    if (util.isNode && process.stderr.isTTY) {
        printWarning = function(message, isSoft) {
            var color = isSoft ? "\u001b[33m" : "\u001b[31m";
            console.warn(color + message + "\u001b[0m\n");
        };
    } else if (!util.isNode && typeof (new Error().stack) === "string") {
        printWarning = function(message, isSoft) {
            console.warn("%c" + message,
                        isSoft ? "color: darkorange" : "color: red");
        };
    }
}

var config = {
    warnings: warnings,
    longStackTraces: false,
    cancellation: false,
    monitoring: false
};

if (longStackTraces) Promise.longStackTraces();

return {
    longStackTraces: function() {
        return config.longStackTraces;
    },
    warnings: function() {
        return config.warnings;
    },
    cancellation: function() {
        return config.cancellation;
    },
    monitoring: function() {
        return config.monitoring;
    },
    propagateFromFunction: function() {
        return propagateFromFunction;
    },
    boundValueFunction: function() {
        return boundValueFunction;
    },
    checkForgottenReturns: checkForgottenReturns,
    setBounds: setBounds,
    warn: warn,
    deprecated: deprecated,
    CapturedTrace: CapturedTrace,
    fireDomEvent: fireDomEvent,
    fireGlobalEvent: fireGlobalEvent
};
};

},{"./errors":12,"./util":36}],10:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
function returner() {
    return this.value;
}
function thrower() {
    throw this.reason;
}

Promise.prototype["return"] =
Promise.prototype.thenReturn = function (value) {
    if (value instanceof Promise) value.suppressUnhandledRejections();
    return this._then(
        returner, undefined, undefined, {value: value}, undefined);
};

Promise.prototype["throw"] =
Promise.prototype.thenThrow = function (reason) {
    return this._then(
        thrower, undefined, undefined, {reason: reason}, undefined);
};

Promise.prototype.catchThrow = function (reason) {
    if (arguments.length <= 1) {
        return this._then(
            undefined, thrower, undefined, {reason: reason}, undefined);
    } else {
        var _reason = arguments[1];
        var handler = function() {throw _reason;};
        return this.caught(reason, handler);
    }
};

Promise.prototype.catchReturn = function (value) {
    if (arguments.length <= 1) {
        if (value instanceof Promise) value.suppressUnhandledRejections();
        return this._then(
            undefined, returner, undefined, {value: value}, undefined);
    } else {
        var _value = arguments[1];
        if (_value instanceof Promise) _value.suppressUnhandledRejections();
        var handler = function() {return _value;};
        return this.caught(value, handler);
    }
};
};

},{}],11:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var PromiseReduce = Promise.reduce;
var PromiseAll = Promise.all;

function promiseAllThis() {
    return PromiseAll(this);
}

function PromiseMapSeries(promises, fn) {
    return PromiseReduce(promises, fn, INTERNAL, INTERNAL);
}

Promise.prototype.each = function (fn) {
    return PromiseReduce(this, fn, INTERNAL, 0)
              ._then(promiseAllThis, undefined, undefined, this, undefined);
};

Promise.prototype.mapSeries = function (fn) {
    return PromiseReduce(this, fn, INTERNAL, INTERNAL);
};

Promise.each = function (promises, fn) {
    return PromiseReduce(promises, fn, INTERNAL, 0)
              ._then(promiseAllThis, undefined, undefined, promises, undefined);
};

Promise.mapSeries = PromiseMapSeries;
};


},{}],12:[function(_dereq_,module,exports){
"use strict";
var es5 = _dereq_("./es5");
var Objectfreeze = es5.freeze;
var util = _dereq_("./util");
var inherits = util.inherits;
var notEnumerableProp = util.notEnumerableProp;

function subError(nameProperty, defaultMessage) {
    function SubError(message) {
        if (!(this instanceof SubError)) return new SubError(message);
        notEnumerableProp(this, "message",
            typeof message === "string" ? message : defaultMessage);
        notEnumerableProp(this, "name", nameProperty);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        } else {
            Error.call(this);
        }
    }
    inherits(SubError, Error);
    return SubError;
}

var _TypeError, _RangeError;
var Warning = subError("Warning", "warning");
var CancellationError = subError("CancellationError", "cancellation error");
var TimeoutError = subError("TimeoutError", "timeout error");
var AggregateError = subError("AggregateError", "aggregate error");
try {
    _TypeError = TypeError;
    _RangeError = RangeError;
} catch(e) {
    _TypeError = subError("TypeError", "type error");
    _RangeError = subError("RangeError", "range error");
}

var methods = ("join pop push shift unshift slice filter forEach some " +
    "every map indexOf lastIndexOf reduce reduceRight sort reverse").split(" ");

for (var i = 0; i < methods.length; ++i) {
    if (typeof Array.prototype[methods[i]] === "function") {
        AggregateError.prototype[methods[i]] = Array.prototype[methods[i]];
    }
}

es5.defineProperty(AggregateError.prototype, "length", {
    value: 0,
    configurable: false,
    writable: true,
    enumerable: true
});
AggregateError.prototype["isOperational"] = true;
var level = 0;
AggregateError.prototype.toString = function() {
    var indent = Array(level * 4 + 1).join(" ");
    var ret = "\n" + indent + "AggregateError of:" + "\n";
    level++;
    indent = Array(level * 4 + 1).join(" ");
    for (var i = 0; i < this.length; ++i) {
        var str = this[i] === this ? "[Circular AggregateError]" : this[i] + "";
        var lines = str.split("\n");
        for (var j = 0; j < lines.length; ++j) {
            lines[j] = indent + lines[j];
        }
        str = lines.join("\n");
        ret += str + "\n";
    }
    level--;
    return ret;
};

function OperationalError(message) {
    if (!(this instanceof OperationalError))
        return new OperationalError(message);
    notEnumerableProp(this, "name", "OperationalError");
    notEnumerableProp(this, "message", message);
    this.cause = message;
    this["isOperational"] = true;

    if (message instanceof Error) {
        notEnumerableProp(this, "message", message.message);
        notEnumerableProp(this, "stack", message.stack);
    } else if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
    }

}
inherits(OperationalError, Error);

var errorTypes = Error["__BluebirdErrorTypes__"];
if (!errorTypes) {
    errorTypes = Objectfreeze({
        CancellationError: CancellationError,
        TimeoutError: TimeoutError,
        OperationalError: OperationalError,
        RejectionError: OperationalError,
        AggregateError: AggregateError
    });
    es5.defineProperty(Error, "__BluebirdErrorTypes__", {
        value: errorTypes,
        writable: false,
        enumerable: false,
        configurable: false
    });
}

module.exports = {
    Error: Error,
    TypeError: _TypeError,
    RangeError: _RangeError,
    CancellationError: errorTypes.CancellationError,
    OperationalError: errorTypes.OperationalError,
    TimeoutError: errorTypes.TimeoutError,
    AggregateError: errorTypes.AggregateError,
    Warning: Warning
};

},{"./es5":13,"./util":36}],13:[function(_dereq_,module,exports){
var isES5 = (function(){
    "use strict";
    return this === undefined;
})();

if (isES5) {
    module.exports = {
        freeze: Object.freeze,
        defineProperty: Object.defineProperty,
        getDescriptor: Object.getOwnPropertyDescriptor,
        keys: Object.keys,
        names: Object.getOwnPropertyNames,
        getPrototypeOf: Object.getPrototypeOf,
        isArray: Array.isArray,
        isES5: isES5,
        propertyIsWritable: function(obj, prop) {
            var descriptor = Object.getOwnPropertyDescriptor(obj, prop);
            return !!(!descriptor || descriptor.writable || descriptor.set);
        }
    };
} else {
    var has = {}.hasOwnProperty;
    var str = {}.toString;
    var proto = {}.constructor.prototype;

    var ObjectKeys = function (o) {
        var ret = [];
        for (var key in o) {
            if (has.call(o, key)) {
                ret.push(key);
            }
        }
        return ret;
    };

    var ObjectGetDescriptor = function(o, key) {
        return {value: o[key]};
    };

    var ObjectDefineProperty = function (o, key, desc) {
        o[key] = desc.value;
        return o;
    };

    var ObjectFreeze = function (obj) {
        return obj;
    };

    var ObjectGetPrototypeOf = function (obj) {
        try {
            return Object(obj).constructor.prototype;
        }
        catch (e) {
            return proto;
        }
    };

    var ArrayIsArray = function (obj) {
        try {
            return str.call(obj) === "[object Array]";
        }
        catch(e) {
            return false;
        }
    };

    module.exports = {
        isArray: ArrayIsArray,
        keys: ObjectKeys,
        names: ObjectKeys,
        defineProperty: ObjectDefineProperty,
        getDescriptor: ObjectGetDescriptor,
        freeze: ObjectFreeze,
        getPrototypeOf: ObjectGetPrototypeOf,
        isES5: isES5,
        propertyIsWritable: function() {
            return true;
        }
    };
}

},{}],14:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var PromiseMap = Promise.map;

Promise.prototype.filter = function (fn, options) {
    return PromiseMap(this, fn, options, INTERNAL);
};

Promise.filter = function (promises, fn, options) {
    return PromiseMap(promises, fn, options, INTERNAL);
};
};

},{}],15:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, tryConvertToPromise, NEXT_FILTER) {
var util = _dereq_("./util");
var CancellationError = Promise.CancellationError;
var errorObj = util.errorObj;
var catchFilter = _dereq_("./catch_filter")(NEXT_FILTER);

function PassThroughHandlerContext(promise, type, handler) {
    this.promise = promise;
    this.type = type;
    this.handler = handler;
    this.called = false;
    this.cancelPromise = null;
}

PassThroughHandlerContext.prototype.isFinallyHandler = function() {
    return this.type === 0;
};

function FinallyHandlerCancelReaction(finallyHandler) {
    this.finallyHandler = finallyHandler;
}

FinallyHandlerCancelReaction.prototype._resultCancelled = function() {
    checkCancel(this.finallyHandler);
};

function checkCancel(ctx, reason) {
    if (ctx.cancelPromise != null) {
        if (arguments.length > 1) {
            ctx.cancelPromise._reject(reason);
        } else {
            ctx.cancelPromise._cancel();
        }
        ctx.cancelPromise = null;
        return true;
    }
    return false;
}

function succeed() {
    return finallyHandler.call(this, this.promise._target()._settledValue());
}
function fail(reason) {
    if (checkCancel(this, reason)) return;
    errorObj.e = reason;
    return errorObj;
}
function finallyHandler(reasonOrValue) {
    var promise = this.promise;
    var handler = this.handler;

    if (!this.called) {
        this.called = true;
        var ret = this.isFinallyHandler()
            ? handler.call(promise._boundValue())
            : handler.call(promise._boundValue(), reasonOrValue);
        if (ret === NEXT_FILTER) {
            return ret;
        } else if (ret !== undefined) {
            promise._setReturnedNonUndefined();
            var maybePromise = tryConvertToPromise(ret, promise);
            if (maybePromise instanceof Promise) {
                if (this.cancelPromise != null) {
                    if (maybePromise._isCancelled()) {
                        var reason =
                            new CancellationError("late cancellation observer");
                        promise._attachExtraTrace(reason);
                        errorObj.e = reason;
                        return errorObj;
                    } else if (maybePromise.isPending()) {
                        maybePromise._attachCancellationCallback(
                            new FinallyHandlerCancelReaction(this));
                    }
                }
                return maybePromise._then(
                    succeed, fail, undefined, this, undefined);
            }
        }
    }

    if (promise.isRejected()) {
        checkCancel(this);
        errorObj.e = reasonOrValue;
        return errorObj;
    } else {
        checkCancel(this);
        return reasonOrValue;
    }
}

Promise.prototype._passThrough = function(handler, type, success, fail) {
    if (typeof handler !== "function") return this.then();
    return this._then(success,
                      fail,
                      undefined,
                      new PassThroughHandlerContext(this, type, handler),
                      undefined);
};

Promise.prototype.lastly =
Promise.prototype["finally"] = function (handler) {
    return this._passThrough(handler,
                             0,
                             finallyHandler,
                             finallyHandler);
};


Promise.prototype.tap = function (handler) {
    return this._passThrough(handler, 1, finallyHandler);
};

Promise.prototype.tapCatch = function (handlerOrPredicate) {
    var len = arguments.length;
    if(len === 1) {
        return this._passThrough(handlerOrPredicate,
                                 1,
                                 undefined,
                                 finallyHandler);
    } else {
         var catchInstances = new Array(len - 1),
            j = 0, i;
        for (i = 0; i < len - 1; ++i) {
            var item = arguments[i];
            if (util.isObject(item)) {
                catchInstances[j++] = item;
            } else {
                return Promise.reject(new TypeError(
                    "tapCatch statement predicate: "
                    + "expecting an object but got " + util.classString(item)
                ));
            }
        }
        catchInstances.length = j;
        var handler = arguments[i];
        return this._passThrough(catchFilter(catchInstances, handler, this),
                                 1,
                                 undefined,
                                 finallyHandler);
    }

};

return PassThroughHandlerContext;
};

},{"./catch_filter":7,"./util":36}],16:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          apiRejection,
                          INTERNAL,
                          tryConvertToPromise,
                          Proxyable,
                          debug) {
var errors = _dereq_("./errors");
var TypeError = errors.TypeError;
var util = _dereq_("./util");
var errorObj = util.errorObj;
var tryCatch = util.tryCatch;
var yieldHandlers = [];

function promiseFromYieldHandler(value, yieldHandlers, traceParent) {
    for (var i = 0; i < yieldHandlers.length; ++i) {
        traceParent._pushContext();
        var result = tryCatch(yieldHandlers[i])(value);
        traceParent._popContext();
        if (result === errorObj) {
            traceParent._pushContext();
            var ret = Promise.reject(errorObj.e);
            traceParent._popContext();
            return ret;
        }
        var maybePromise = tryConvertToPromise(result, traceParent);
        if (maybePromise instanceof Promise) return maybePromise;
    }
    return null;
}

function PromiseSpawn(generatorFunction, receiver, yieldHandler, stack) {
    if (debug.cancellation()) {
        var internal = new Promise(INTERNAL);
        var _finallyPromise = this._finallyPromise = new Promise(INTERNAL);
        this._promise = internal.lastly(function() {
            return _finallyPromise;
        });
        internal._captureStackTrace();
        internal._setOnCancel(this);
    } else {
        var promise = this._promise = new Promise(INTERNAL);
        promise._captureStackTrace();
    }
    this._stack = stack;
    this._generatorFunction = generatorFunction;
    this._receiver = receiver;
    this._generator = undefined;
    this._yieldHandlers = typeof yieldHandler === "function"
        ? [yieldHandler].concat(yieldHandlers)
        : yieldHandlers;
    this._yieldedPromise = null;
    this._cancellationPhase = false;
}
util.inherits(PromiseSpawn, Proxyable);

PromiseSpawn.prototype._isResolved = function() {
    return this._promise === null;
};

PromiseSpawn.prototype._cleanup = function() {
    this._promise = this._generator = null;
    if (debug.cancellation() && this._finallyPromise !== null) {
        this._finallyPromise._fulfill();
        this._finallyPromise = null;
    }
};

PromiseSpawn.prototype._promiseCancelled = function() {
    if (this._isResolved()) return;
    var implementsReturn = typeof this._generator["return"] !== "undefined";

    var result;
    if (!implementsReturn) {
        var reason = new Promise.CancellationError(
            "generator .return() sentinel");
        Promise.coroutine.returnSentinel = reason;
        this._promise._attachExtraTrace(reason);
        this._promise._pushContext();
        result = tryCatch(this._generator["throw"]).call(this._generator,
                                                         reason);
        this._promise._popContext();
    } else {
        this._promise._pushContext();
        result = tryCatch(this._generator["return"]).call(this._generator,
                                                          undefined);
        this._promise._popContext();
    }
    this._cancellationPhase = true;
    this._yieldedPromise = null;
    this._continue(result);
};

PromiseSpawn.prototype._promiseFulfilled = function(value) {
    this._yieldedPromise = null;
    this._promise._pushContext();
    var result = tryCatch(this._generator.next).call(this._generator, value);
    this._promise._popContext();
    this._continue(result);
};

PromiseSpawn.prototype._promiseRejected = function(reason) {
    this._yieldedPromise = null;
    this._promise._attachExtraTrace(reason);
    this._promise._pushContext();
    var result = tryCatch(this._generator["throw"])
        .call(this._generator, reason);
    this._promise._popContext();
    this._continue(result);
};

PromiseSpawn.prototype._resultCancelled = function() {
    if (this._yieldedPromise instanceof Promise) {
        var promise = this._yieldedPromise;
        this._yieldedPromise = null;
        promise.cancel();
    }
};

PromiseSpawn.prototype.promise = function () {
    return this._promise;
};

PromiseSpawn.prototype._run = function () {
    this._generator = this._generatorFunction.call(this._receiver);
    this._receiver =
        this._generatorFunction = undefined;
    this._promiseFulfilled(undefined);
};

PromiseSpawn.prototype._continue = function (result) {
    var promise = this._promise;
    if (result === errorObj) {
        this._cleanup();
        if (this._cancellationPhase) {
            return promise.cancel();
        } else {
            return promise._rejectCallback(result.e, false);
        }
    }

    var value = result.value;
    if (result.done === true) {
        this._cleanup();
        if (this._cancellationPhase) {
            return promise.cancel();
        } else {
            return promise._resolveCallback(value);
        }
    } else {
        var maybePromise = tryConvertToPromise(value, this._promise);
        if (!(maybePromise instanceof Promise)) {
            maybePromise =
                promiseFromYieldHandler(maybePromise,
                                        this._yieldHandlers,
                                        this._promise);
            if (maybePromise === null) {
                this._promiseRejected(
                    new TypeError(
                        "A value %s was yielded that could not be treated as a promise\u000a\u000a    See http://goo.gl/MqrFmX\u000a\u000a".replace("%s", String(value)) +
                        "From coroutine:\u000a" +
                        this._stack.split("\n").slice(1, -7).join("\n")
                    )
                );
                return;
            }
        }
        maybePromise = maybePromise._target();
        var bitField = maybePromise._bitField;
        ;
        if (((bitField & 50397184) === 0)) {
            this._yieldedPromise = maybePromise;
            maybePromise._proxy(this, null);
        } else if (((bitField & 33554432) !== 0)) {
            Promise._async.invoke(
                this._promiseFulfilled, this, maybePromise._value()
            );
        } else if (((bitField & 16777216) !== 0)) {
            Promise._async.invoke(
                this._promiseRejected, this, maybePromise._reason()
            );
        } else {
            this._promiseCancelled();
        }
    }
};

Promise.coroutine = function (generatorFunction, options) {
    if (typeof generatorFunction !== "function") {
        throw new TypeError("generatorFunction must be a function\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    var yieldHandler = Object(options).yieldHandler;
    var PromiseSpawn$ = PromiseSpawn;
    var stack = new Error().stack;
    return function () {
        var generator = generatorFunction.apply(this, arguments);
        var spawn = new PromiseSpawn$(undefined, undefined, yieldHandler,
                                      stack);
        var ret = spawn.promise();
        spawn._generator = generator;
        spawn._promiseFulfilled(undefined);
        return ret;
    };
};

Promise.coroutine.addYieldHandler = function(fn) {
    if (typeof fn !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(fn));
    }
    yieldHandlers.push(fn);
};

Promise.spawn = function (generatorFunction) {
    debug.deprecated("Promise.spawn()", "Promise.coroutine()");
    if (typeof generatorFunction !== "function") {
        return apiRejection("generatorFunction must be a function\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    var spawn = new PromiseSpawn(generatorFunction, this);
    var ret = spawn.promise();
    spawn._run(Promise.spawn);
    return ret;
};
};

},{"./errors":12,"./util":36}],17:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, PromiseArray, tryConvertToPromise, INTERNAL, async,
         getDomain) {
var util = _dereq_("./util");
var canEvaluate = util.canEvaluate;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var reject;

if (!true) {
if (canEvaluate) {
    var thenCallback = function(i) {
        return new Function("value", "holder", "                             \n\
            'use strict';                                                    \n\
            holder.pIndex = value;                                           \n\
            holder.checkFulfillment(this);                                   \n\
            ".replace(/Index/g, i));
    };

    var promiseSetter = function(i) {
        return new Function("promise", "holder", "                           \n\
            'use strict';                                                    \n\
            holder.pIndex = promise;                                         \n\
            ".replace(/Index/g, i));
    };

    var generateHolderClass = function(total) {
        var props = new Array(total);
        for (var i = 0; i < props.length; ++i) {
            props[i] = "this.p" + (i+1);
        }
        var assignment = props.join(" = ") + " = null;";
        var cancellationCode= "var promise;\n" + props.map(function(prop) {
            return "                                                         \n\
                promise = " + prop + ";                                      \n\
                if (promise instanceof Promise) {                            \n\
                    promise.cancel();                                        \n\
                }                                                            \n\
            ";
        }).join("\n");
        var passedArguments = props.join(", ");
        var name = "Holder$" + total;


        var code = "return function(tryCatch, errorObj, Promise, async) {    \n\
            'use strict';                                                    \n\
            function [TheName](fn) {                                         \n\
                [TheProperties]                                              \n\
                this.fn = fn;                                                \n\
                this.asyncNeeded = true;                                     \n\
                this.now = 0;                                                \n\
            }                                                                \n\
                                                                             \n\
            [TheName].prototype._callFunction = function(promise) {          \n\
                promise._pushContext();                                      \n\
                var ret = tryCatch(this.fn)([ThePassedArguments]);           \n\
                promise._popContext();                                       \n\
                if (ret === errorObj) {                                      \n\
                    promise._rejectCallback(ret.e, false);                   \n\
                } else {                                                     \n\
                    promise._resolveCallback(ret);                           \n\
                }                                                            \n\
            };                                                               \n\
                                                                             \n\
            [TheName].prototype.checkFulfillment = function(promise) {       \n\
                var now = ++this.now;                                        \n\
                if (now === [TheTotal]) {                                    \n\
                    if (this.asyncNeeded) {                                  \n\
                        async.invoke(this._callFunction, this, promise);     \n\
                    } else {                                                 \n\
                        this._callFunction(promise);                         \n\
                    }                                                        \n\
                                                                             \n\
                }                                                            \n\
            };                                                               \n\
                                                                             \n\
            [TheName].prototype._resultCancelled = function() {              \n\
                [CancellationCode]                                           \n\
            };                                                               \n\
                                                                             \n\
            return [TheName];                                                \n\
        }(tryCatch, errorObj, Promise, async);                               \n\
        ";

        code = code.replace(/\[TheName\]/g, name)
            .replace(/\[TheTotal\]/g, total)
            .replace(/\[ThePassedArguments\]/g, passedArguments)
            .replace(/\[TheProperties\]/g, assignment)
            .replace(/\[CancellationCode\]/g, cancellationCode);

        return new Function("tryCatch", "errorObj", "Promise", "async", code)
                           (tryCatch, errorObj, Promise, async);
    };

    var holderClasses = [];
    var thenCallbacks = [];
    var promiseSetters = [];

    for (var i = 0; i < 8; ++i) {
        holderClasses.push(generateHolderClass(i + 1));
        thenCallbacks.push(thenCallback(i + 1));
        promiseSetters.push(promiseSetter(i + 1));
    }

    reject = function (reason) {
        this._reject(reason);
    };
}}

Promise.join = function () {
    var last = arguments.length - 1;
    var fn;
    if (last > 0 && typeof arguments[last] === "function") {
        fn = arguments[last];
        if (!true) {
            if (last <= 8 && canEvaluate) {
                var ret = new Promise(INTERNAL);
                ret._captureStackTrace();
                var HolderClass = holderClasses[last - 1];
                var holder = new HolderClass(fn);
                var callbacks = thenCallbacks;

                for (var i = 0; i < last; ++i) {
                    var maybePromise = tryConvertToPromise(arguments[i], ret);
                    if (maybePromise instanceof Promise) {
                        maybePromise = maybePromise._target();
                        var bitField = maybePromise._bitField;
                        ;
                        if (((bitField & 50397184) === 0)) {
                            maybePromise._then(callbacks[i], reject,
                                               undefined, ret, holder);
                            promiseSetters[i](maybePromise, holder);
                            holder.asyncNeeded = false;
                        } else if (((bitField & 33554432) !== 0)) {
                            callbacks[i].call(ret,
                                              maybePromise._value(), holder);
                        } else if (((bitField & 16777216) !== 0)) {
                            ret._reject(maybePromise._reason());
                        } else {
                            ret._cancel();
                        }
                    } else {
                        callbacks[i].call(ret, maybePromise, holder);
                    }
                }

                if (!ret._isFateSealed()) {
                    if (holder.asyncNeeded) {
                        var domain = getDomain();
                        if (domain !== null) {
                            holder.fn = util.domainBind(domain, holder.fn);
                        }
                    }
                    ret._setAsyncGuaranteed();
                    ret._setOnCancel(holder);
                }
                return ret;
            }
        }
    }
    var args = [].slice.call(arguments);;
    if (fn) args.pop();
    var ret = new PromiseArray(args).promise();
    return fn !== undefined ? ret.spread(fn) : ret;
};

};

},{"./util":36}],18:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          PromiseArray,
                          apiRejection,
                          tryConvertToPromise,
                          INTERNAL,
                          debug) {
var getDomain = Promise._getDomain;
var util = _dereq_("./util");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var async = Promise._async;

function MappingPromiseArray(promises, fn, limit, _filter) {
    this.constructor$(promises);
    this._promise._captureStackTrace();
    var domain = getDomain();
    this._callback = domain === null ? fn : util.domainBind(domain, fn);
    this._preservedValues = _filter === INTERNAL
        ? new Array(this.length())
        : null;
    this._limit = limit;
    this._inFlight = 0;
    this._queue = [];
    async.invoke(this._asyncInit, this, undefined);
}
util.inherits(MappingPromiseArray, PromiseArray);

MappingPromiseArray.prototype._asyncInit = function() {
    this._init$(undefined, -2);
};

MappingPromiseArray.prototype._init = function () {};

MappingPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var values = this._values;
    var length = this.length();
    var preservedValues = this._preservedValues;
    var limit = this._limit;

    if (index < 0) {
        index = (index * -1) - 1;
        values[index] = value;
        if (limit >= 1) {
            this._inFlight--;
            this._drainQueue();
            if (this._isResolved()) return true;
        }
    } else {
        if (limit >= 1 && this._inFlight >= limit) {
            values[index] = value;
            this._queue.push(index);
            return false;
        }
        if (preservedValues !== null) preservedValues[index] = value;

        var promise = this._promise;
        var callback = this._callback;
        var receiver = promise._boundValue();
        promise._pushContext();
        var ret = tryCatch(callback).call(receiver, value, index, length);
        var promiseCreated = promise._popContext();
        debug.checkForgottenReturns(
            ret,
            promiseCreated,
            preservedValues !== null ? "Promise.filter" : "Promise.map",
            promise
        );
        if (ret === errorObj) {
            this._reject(ret.e);
            return true;
        }

        var maybePromise = tryConvertToPromise(ret, this._promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            var bitField = maybePromise._bitField;
            ;
            if (((bitField & 50397184) === 0)) {
                if (limit >= 1) this._inFlight++;
                values[index] = maybePromise;
                maybePromise._proxy(this, (index + 1) * -1);
                return false;
            } else if (((bitField & 33554432) !== 0)) {
                ret = maybePromise._value();
            } else if (((bitField & 16777216) !== 0)) {
                this._reject(maybePromise._reason());
                return true;
            } else {
                this._cancel();
                return true;
            }
        }
        values[index] = ret;
    }
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= length) {
        if (preservedValues !== null) {
            this._filter(values, preservedValues);
        } else {
            this._resolve(values);
        }
        return true;
    }
    return false;
};

MappingPromiseArray.prototype._drainQueue = function () {
    var queue = this._queue;
    var limit = this._limit;
    var values = this._values;
    while (queue.length > 0 && this._inFlight < limit) {
        if (this._isResolved()) return;
        var index = queue.pop();
        this._promiseFulfilled(values[index], index);
    }
};

MappingPromiseArray.prototype._filter = function (booleans, values) {
    var len = values.length;
    var ret = new Array(len);
    var j = 0;
    for (var i = 0; i < len; ++i) {
        if (booleans[i]) ret[j++] = values[i];
    }
    ret.length = j;
    this._resolve(ret);
};

MappingPromiseArray.prototype.preservedValues = function () {
    return this._preservedValues;
};

function map(promises, fn, options, _filter) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }

    var limit = 0;
    if (options !== undefined) {
        if (typeof options === "object" && options !== null) {
            if (typeof options.concurrency !== "number") {
                return Promise.reject(
                    new TypeError("'concurrency' must be a number but it is " +
                                    util.classString(options.concurrency)));
            }
            limit = options.concurrency;
        } else {
            return Promise.reject(new TypeError(
                            "options argument must be an object but it is " +
                             util.classString(options)));
        }
    }
    limit = typeof limit === "number" &&
        isFinite(limit) && limit >= 1 ? limit : 0;
    return new MappingPromiseArray(promises, fn, limit, _filter).promise();
}

Promise.prototype.map = function (fn, options) {
    return map(this, fn, options, null);
};

Promise.map = function (promises, fn, options, _filter) {
    return map(promises, fn, options, _filter);
};


};

},{"./util":36}],19:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, INTERNAL, tryConvertToPromise, apiRejection, debug) {
var util = _dereq_("./util");
var tryCatch = util.tryCatch;

Promise.method = function (fn) {
    if (typeof fn !== "function") {
        throw new Promise.TypeError("expecting a function but got " + util.classString(fn));
    }
    return function () {
        var ret = new Promise(INTERNAL);
        ret._captureStackTrace();
        ret._pushContext();
        var value = tryCatch(fn).apply(this, arguments);
        var promiseCreated = ret._popContext();
        debug.checkForgottenReturns(
            value, promiseCreated, "Promise.method", ret);
        ret._resolveFromSyncValue(value);
        return ret;
    };
};

Promise.attempt = Promise["try"] = function (fn) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._pushContext();
    var value;
    if (arguments.length > 1) {
        debug.deprecated("calling Promise.try with more than 1 argument");
        var arg = arguments[1];
        var ctx = arguments[2];
        value = util.isArray(arg) ? tryCatch(fn).apply(ctx, arg)
                                  : tryCatch(fn).call(ctx, arg);
    } else {
        value = tryCatch(fn)();
    }
    var promiseCreated = ret._popContext();
    debug.checkForgottenReturns(
        value, promiseCreated, "Promise.try", ret);
    ret._resolveFromSyncValue(value);
    return ret;
};

Promise.prototype._resolveFromSyncValue = function (value) {
    if (value === util.errorObj) {
        this._rejectCallback(value.e, false);
    } else {
        this._resolveCallback(value, true);
    }
};
};

},{"./util":36}],20:[function(_dereq_,module,exports){
"use strict";
var util = _dereq_("./util");
var maybeWrapAsError = util.maybeWrapAsError;
var errors = _dereq_("./errors");
var OperationalError = errors.OperationalError;
var es5 = _dereq_("./es5");

function isUntypedError(obj) {
    return obj instanceof Error &&
        es5.getPrototypeOf(obj) === Error.prototype;
}

var rErrorKey = /^(?:name|message|stack|cause)$/;
function wrapAsOperationalError(obj) {
    var ret;
    if (isUntypedError(obj)) {
        ret = new OperationalError(obj);
        ret.name = obj.name;
        ret.message = obj.message;
        ret.stack = obj.stack;
        var keys = es5.keys(obj);
        for (var i = 0; i < keys.length; ++i) {
            var key = keys[i];
            if (!rErrorKey.test(key)) {
                ret[key] = obj[key];
            }
        }
        return ret;
    }
    util.markAsOriginatingFromRejection(obj);
    return obj;
}

function nodebackForPromise(promise, multiArgs) {
    return function(err, value) {
        if (promise === null) return;
        if (err) {
            var wrapped = wrapAsOperationalError(maybeWrapAsError(err));
            promise._attachExtraTrace(wrapped);
            promise._reject(wrapped);
        } else if (!multiArgs) {
            promise._fulfill(value);
        } else {
            var args = [].slice.call(arguments, 1);;
            promise._fulfill(args);
        }
        promise = null;
    };
}

module.exports = nodebackForPromise;

},{"./errors":12,"./es5":13,"./util":36}],21:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var util = _dereq_("./util");
var async = Promise._async;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;

function spreadAdapter(val, nodeback) {
    var promise = this;
    if (!util.isArray(val)) return successAdapter.call(promise, val, nodeback);
    var ret =
        tryCatch(nodeback).apply(promise._boundValue(), [null].concat(val));
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}

function successAdapter(val, nodeback) {
    var promise = this;
    var receiver = promise._boundValue();
    var ret = val === undefined
        ? tryCatch(nodeback).call(receiver, null)
        : tryCatch(nodeback).call(receiver, null, val);
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}
function errorAdapter(reason, nodeback) {
    var promise = this;
    if (!reason) {
        var newReason = new Error(reason + "");
        newReason.cause = reason;
        reason = newReason;
    }
    var ret = tryCatch(nodeback).call(promise._boundValue(), reason);
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}

Promise.prototype.asCallback = Promise.prototype.nodeify = function (nodeback,
                                                                     options) {
    if (typeof nodeback == "function") {
        var adapter = successAdapter;
        if (options !== undefined && Object(options).spread) {
            adapter = spreadAdapter;
        }
        this._then(
            adapter,
            errorAdapter,
            undefined,
            this,
            nodeback
        );
    }
    return this;
};
};

},{"./util":36}],22:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
var makeSelfResolutionError = function () {
    return new TypeError("circular promise resolution chain\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
};
var reflectHandler = function() {
    return new Promise.PromiseInspection(this._target());
};
var apiRejection = function(msg) {
    return Promise.reject(new TypeError(msg));
};
function Proxyable() {}
var UNDEFINED_BINDING = {};
var util = _dereq_("./util");

var getDomain;
if (util.isNode) {
    getDomain = function() {
        var ret = process.domain;
        if (ret === undefined) ret = null;
        return ret;
    };
} else {
    getDomain = function() {
        return null;
    };
}
util.notEnumerableProp(Promise, "_getDomain", getDomain);

var es5 = _dereq_("./es5");
var Async = _dereq_("./async");
var async = new Async();
es5.defineProperty(Promise, "_async", {value: async});
var errors = _dereq_("./errors");
var TypeError = Promise.TypeError = errors.TypeError;
Promise.RangeError = errors.RangeError;
var CancellationError = Promise.CancellationError = errors.CancellationError;
Promise.TimeoutError = errors.TimeoutError;
Promise.OperationalError = errors.OperationalError;
Promise.RejectionError = errors.OperationalError;
Promise.AggregateError = errors.AggregateError;
var INTERNAL = function(){};
var APPLY = {};
var NEXT_FILTER = {};
var tryConvertToPromise = _dereq_("./thenables")(Promise, INTERNAL);
var PromiseArray =
    _dereq_("./promise_array")(Promise, INTERNAL,
                               tryConvertToPromise, apiRejection, Proxyable);
var Context = _dereq_("./context")(Promise);
 /*jshint unused:false*/
var createContext = Context.create;
var debug = _dereq_("./debuggability")(Promise, Context);
var CapturedTrace = debug.CapturedTrace;
var PassThroughHandlerContext =
    _dereq_("./finally")(Promise, tryConvertToPromise, NEXT_FILTER);
var catchFilter = _dereq_("./catch_filter")(NEXT_FILTER);
var nodebackForPromise = _dereq_("./nodeback");
var errorObj = util.errorObj;
var tryCatch = util.tryCatch;
function check(self, executor) {
    if (self == null || self.constructor !== Promise) {
        throw new TypeError("the promise constructor cannot be invoked directly\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    if (typeof executor !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(executor));
    }

}

function Promise(executor) {
    if (executor !== INTERNAL) {
        check(this, executor);
    }
    this._bitField = 0;
    this._fulfillmentHandler0 = undefined;
    this._rejectionHandler0 = undefined;
    this._promise0 = undefined;
    this._receiver0 = undefined;
    this._resolveFromExecutor(executor);
    this._promiseCreated();
    this._fireEvent("promiseCreated", this);
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.caught = Promise.prototype["catch"] = function (fn) {
    var len = arguments.length;
    if (len > 1) {
        var catchInstances = new Array(len - 1),
            j = 0, i;
        for (i = 0; i < len - 1; ++i) {
            var item = arguments[i];
            if (util.isObject(item)) {
                catchInstances[j++] = item;
            } else {
                return apiRejection("Catch statement predicate: " +
                    "expecting an object but got " + util.classString(item));
            }
        }
        catchInstances.length = j;
        fn = arguments[i];
        return this.then(undefined, catchFilter(catchInstances, fn, this));
    }
    return this.then(undefined, fn);
};

Promise.prototype.reflect = function () {
    return this._then(reflectHandler,
        reflectHandler, undefined, this, undefined);
};

Promise.prototype.then = function (didFulfill, didReject) {
    if (debug.warnings() && arguments.length > 0 &&
        typeof didFulfill !== "function" &&
        typeof didReject !== "function") {
        var msg = ".then() only accepts functions but was passed: " +
                util.classString(didFulfill);
        if (arguments.length > 1) {
            msg += ", " + util.classString(didReject);
        }
        this._warn(msg);
    }
    return this._then(didFulfill, didReject, undefined, undefined, undefined);
};

Promise.prototype.done = function (didFulfill, didReject) {
    var promise =
        this._then(didFulfill, didReject, undefined, undefined, undefined);
    promise._setIsFinal();
};

Promise.prototype.spread = function (fn) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }
    return this.all()._then(fn, undefined, undefined, APPLY, undefined);
};

Promise.prototype.toJSON = function () {
    var ret = {
        isFulfilled: false,
        isRejected: false,
        fulfillmentValue: undefined,
        rejectionReason: undefined
    };
    if (this.isFulfilled()) {
        ret.fulfillmentValue = this.value();
        ret.isFulfilled = true;
    } else if (this.isRejected()) {
        ret.rejectionReason = this.reason();
        ret.isRejected = true;
    }
    return ret;
};

Promise.prototype.all = function () {
    if (arguments.length > 0) {
        this._warn(".all() was passed arguments but it does not take any");
    }
    return new PromiseArray(this).promise();
};

Promise.prototype.error = function (fn) {
    return this.caught(util.originatesFromRejection, fn);
};

Promise.getNewLibraryCopy = module.exports;

Promise.is = function (val) {
    return val instanceof Promise;
};

Promise.fromNode = Promise.fromCallback = function(fn) {
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    var multiArgs = arguments.length > 1 ? !!Object(arguments[1]).multiArgs
                                         : false;
    var result = tryCatch(fn)(nodebackForPromise(ret, multiArgs));
    if (result === errorObj) {
        ret._rejectCallback(result.e, true);
    }
    if (!ret._isFateSealed()) ret._setAsyncGuaranteed();
    return ret;
};

Promise.all = function (promises) {
    return new PromiseArray(promises).promise();
};

Promise.cast = function (obj) {
    var ret = tryConvertToPromise(obj);
    if (!(ret instanceof Promise)) {
        ret = new Promise(INTERNAL);
        ret._captureStackTrace();
        ret._setFulfilled();
        ret._rejectionHandler0 = obj;
    }
    return ret;
};

Promise.resolve = Promise.fulfilled = Promise.cast;

Promise.reject = Promise.rejected = function (reason) {
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._rejectCallback(reason, true);
    return ret;
};

Promise.setScheduler = function(fn) {
    if (typeof fn !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(fn));
    }
    return async.setScheduler(fn);
};

Promise.prototype._then = function (
    didFulfill,
    didReject,
    _,    receiver,
    internalData
) {
    var haveInternalData = internalData !== undefined;
    var promise = haveInternalData ? internalData : new Promise(INTERNAL);
    var target = this._target();
    var bitField = target._bitField;

    if (!haveInternalData) {
        promise._propagateFrom(this, 3);
        promise._captureStackTrace();
        if (receiver === undefined &&
            ((this._bitField & 2097152) !== 0)) {
            if (!((bitField & 50397184) === 0)) {
                receiver = this._boundValue();
            } else {
                receiver = target === this ? undefined : this._boundTo;
            }
        }
        this._fireEvent("promiseChained", this, promise);
    }

    var domain = getDomain();
    if (!((bitField & 50397184) === 0)) {
        var handler, value, settler = target._settlePromiseCtx;
        if (((bitField & 33554432) !== 0)) {
            value = target._rejectionHandler0;
            handler = didFulfill;
        } else if (((bitField & 16777216) !== 0)) {
            value = target._fulfillmentHandler0;
            handler = didReject;
            target._unsetRejectionIsUnhandled();
        } else {
            settler = target._settlePromiseLateCancellationObserver;
            value = new CancellationError("late cancellation observer");
            target._attachExtraTrace(value);
            handler = didReject;
        }

        async.invoke(settler, target, {
            handler: domain === null ? handler
                : (typeof handler === "function" &&
                    util.domainBind(domain, handler)),
            promise: promise,
            receiver: receiver,
            value: value
        });
    } else {
        target._addCallbacks(didFulfill, didReject, promise, receiver, domain);
    }

    return promise;
};

Promise.prototype._length = function () {
    return this._bitField & 65535;
};

Promise.prototype._isFateSealed = function () {
    return (this._bitField & 117506048) !== 0;
};

Promise.prototype._isFollowing = function () {
    return (this._bitField & 67108864) === 67108864;
};

Promise.prototype._setLength = function (len) {
    this._bitField = (this._bitField & -65536) |
        (len & 65535);
};

Promise.prototype._setFulfilled = function () {
    this._bitField = this._bitField | 33554432;
    this._fireEvent("promiseFulfilled", this);
};

Promise.prototype._setRejected = function () {
    this._bitField = this._bitField | 16777216;
    this._fireEvent("promiseRejected", this);
};

Promise.prototype._setFollowing = function () {
    this._bitField = this._bitField | 67108864;
    this._fireEvent("promiseResolved", this);
};

Promise.prototype._setIsFinal = function () {
    this._bitField = this._bitField | 4194304;
};

Promise.prototype._isFinal = function () {
    return (this._bitField & 4194304) > 0;
};

Promise.prototype._unsetCancelled = function() {
    this._bitField = this._bitField & (~65536);
};

Promise.prototype._setCancelled = function() {
    this._bitField = this._bitField | 65536;
    this._fireEvent("promiseCancelled", this);
};

Promise.prototype._setWillBeCancelled = function() {
    this._bitField = this._bitField | 8388608;
};

Promise.prototype._setAsyncGuaranteed = function() {
    if (async.hasCustomScheduler()) return;
    this._bitField = this._bitField | 134217728;
};

Promise.prototype._receiverAt = function (index) {
    var ret = index === 0 ? this._receiver0 : this[
            index * 4 - 4 + 3];
    if (ret === UNDEFINED_BINDING) {
        return undefined;
    } else if (ret === undefined && this._isBound()) {
        return this._boundValue();
    }
    return ret;
};

Promise.prototype._promiseAt = function (index) {
    return this[
            index * 4 - 4 + 2];
};

Promise.prototype._fulfillmentHandlerAt = function (index) {
    return this[
            index * 4 - 4 + 0];
};

Promise.prototype._rejectionHandlerAt = function (index) {
    return this[
            index * 4 - 4 + 1];
};

Promise.prototype._boundValue = function() {};

Promise.prototype._migrateCallback0 = function (follower) {
    var bitField = follower._bitField;
    var fulfill = follower._fulfillmentHandler0;
    var reject = follower._rejectionHandler0;
    var promise = follower._promise0;
    var receiver = follower._receiverAt(0);
    if (receiver === undefined) receiver = UNDEFINED_BINDING;
    this._addCallbacks(fulfill, reject, promise, receiver, null);
};

Promise.prototype._migrateCallbackAt = function (follower, index) {
    var fulfill = follower._fulfillmentHandlerAt(index);
    var reject = follower._rejectionHandlerAt(index);
    var promise = follower._promiseAt(index);
    var receiver = follower._receiverAt(index);
    if (receiver === undefined) receiver = UNDEFINED_BINDING;
    this._addCallbacks(fulfill, reject, promise, receiver, null);
};

Promise.prototype._addCallbacks = function (
    fulfill,
    reject,
    promise,
    receiver,
    domain
) {
    var index = this._length();

    if (index >= 65535 - 4) {
        index = 0;
        this._setLength(0);
    }

    if (index === 0) {
        this._promise0 = promise;
        this._receiver0 = receiver;
        if (typeof fulfill === "function") {
            this._fulfillmentHandler0 =
                domain === null ? fulfill : util.domainBind(domain, fulfill);
        }
        if (typeof reject === "function") {
            this._rejectionHandler0 =
                domain === null ? reject : util.domainBind(domain, reject);
        }
    } else {
        var base = index * 4 - 4;
        this[base + 2] = promise;
        this[base + 3] = receiver;
        if (typeof fulfill === "function") {
            this[base + 0] =
                domain === null ? fulfill : util.domainBind(domain, fulfill);
        }
        if (typeof reject === "function") {
            this[base + 1] =
                domain === null ? reject : util.domainBind(domain, reject);
        }
    }
    this._setLength(index + 1);
    return index;
};

Promise.prototype._proxy = function (proxyable, arg) {
    this._addCallbacks(undefined, undefined, arg, proxyable, null);
};

Promise.prototype._resolveCallback = function(value, shouldBind) {
    if (((this._bitField & 117506048) !== 0)) return;
    if (value === this)
        return this._rejectCallback(makeSelfResolutionError(), false);
    var maybePromise = tryConvertToPromise(value, this);
    if (!(maybePromise instanceof Promise)) return this._fulfill(value);

    if (shouldBind) this._propagateFrom(maybePromise, 2);

    var promise = maybePromise._target();

    if (promise === this) {
        this._reject(makeSelfResolutionError());
        return;
    }

    var bitField = promise._bitField;
    if (((bitField & 50397184) === 0)) {
        var len = this._length();
        if (len > 0) promise._migrateCallback0(this);
        for (var i = 1; i < len; ++i) {
            promise._migrateCallbackAt(this, i);
        }
        this._setFollowing();
        this._setLength(0);
        this._setFollowee(promise);
    } else if (((bitField & 33554432) !== 0)) {
        this._fulfill(promise._value());
    } else if (((bitField & 16777216) !== 0)) {
        this._reject(promise._reason());
    } else {
        var reason = new CancellationError("late cancellation observer");
        promise._attachExtraTrace(reason);
        this._reject(reason);
    }
};

Promise.prototype._rejectCallback =
function(reason, synchronous, ignoreNonErrorWarnings) {
    var trace = util.ensureErrorObject(reason);
    var hasStack = trace === reason;
    if (!hasStack && !ignoreNonErrorWarnings && debug.warnings()) {
        var message = "a promise was rejected with a non-error: " +
            util.classString(reason);
        this._warn(message, true);
    }
    this._attachExtraTrace(trace, synchronous ? hasStack : false);
    this._reject(reason);
};

Promise.prototype._resolveFromExecutor = function (executor) {
    if (executor === INTERNAL) return;
    var promise = this;
    this._captureStackTrace();
    this._pushContext();
    var synchronous = true;
    var r = this._execute(executor, function(value) {
        promise._resolveCallback(value);
    }, function (reason) {
        promise._rejectCallback(reason, synchronous);
    });
    synchronous = false;
    this._popContext();

    if (r !== undefined) {
        promise._rejectCallback(r, true);
    }
};

Promise.prototype._settlePromiseFromHandler = function (
    handler, receiver, value, promise
) {
    var bitField = promise._bitField;
    if (((bitField & 65536) !== 0)) return;
    promise._pushContext();
    var x;
    if (receiver === APPLY) {
        if (!value || typeof value.length !== "number") {
            x = errorObj;
            x.e = new TypeError("cannot .spread() a non-array: " +
                                    util.classString(value));
        } else {
            x = tryCatch(handler).apply(this._boundValue(), value);
        }
    } else {
        x = tryCatch(handler).call(receiver, value);
    }
    var promiseCreated = promise._popContext();
    bitField = promise._bitField;
    if (((bitField & 65536) !== 0)) return;

    if (x === NEXT_FILTER) {
        promise._reject(value);
    } else if (x === errorObj) {
        promise._rejectCallback(x.e, false);
    } else {
        debug.checkForgottenReturns(x, promiseCreated, "",  promise, this);
        promise._resolveCallback(x);
    }
};

Promise.prototype._target = function() {
    var ret = this;
    while (ret._isFollowing()) ret = ret._followee();
    return ret;
};

Promise.prototype._followee = function() {
    return this._rejectionHandler0;
};

Promise.prototype._setFollowee = function(promise) {
    this._rejectionHandler0 = promise;
};

Promise.prototype._settlePromise = function(promise, handler, receiver, value) {
    var isPromise = promise instanceof Promise;
    var bitField = this._bitField;
    var asyncGuaranteed = ((bitField & 134217728) !== 0);
    if (((bitField & 65536) !== 0)) {
        if (isPromise) promise._invokeInternalOnCancel();

        if (receiver instanceof PassThroughHandlerContext &&
            receiver.isFinallyHandler()) {
            receiver.cancelPromise = promise;
            if (tryCatch(handler).call(receiver, value) === errorObj) {
                promise._reject(errorObj.e);
            }
        } else if (handler === reflectHandler) {
            promise._fulfill(reflectHandler.call(receiver));
        } else if (receiver instanceof Proxyable) {
            receiver._promiseCancelled(promise);
        } else if (isPromise || promise instanceof PromiseArray) {
            promise._cancel();
        } else {
            receiver.cancel();
        }
    } else if (typeof handler === "function") {
        if (!isPromise) {
            handler.call(receiver, value, promise);
        } else {
            if (asyncGuaranteed) promise._setAsyncGuaranteed();
            this._settlePromiseFromHandler(handler, receiver, value, promise);
        }
    } else if (receiver instanceof Proxyable) {
        if (!receiver._isResolved()) {
            if (((bitField & 33554432) !== 0)) {
                receiver._promiseFulfilled(value, promise);
            } else {
                receiver._promiseRejected(value, promise);
            }
        }
    } else if (isPromise) {
        if (asyncGuaranteed) promise._setAsyncGuaranteed();
        if (((bitField & 33554432) !== 0)) {
            promise._fulfill(value);
        } else {
            promise._reject(value);
        }
    }
};

Promise.prototype._settlePromiseLateCancellationObserver = function(ctx) {
    var handler = ctx.handler;
    var promise = ctx.promise;
    var receiver = ctx.receiver;
    var value = ctx.value;
    if (typeof handler === "function") {
        if (!(promise instanceof Promise)) {
            handler.call(receiver, value, promise);
        } else {
            this._settlePromiseFromHandler(handler, receiver, value, promise);
        }
    } else if (promise instanceof Promise) {
        promise._reject(value);
    }
};

Promise.prototype._settlePromiseCtx = function(ctx) {
    this._settlePromise(ctx.promise, ctx.handler, ctx.receiver, ctx.value);
};

Promise.prototype._settlePromise0 = function(handler, value, bitField) {
    var promise = this._promise0;
    var receiver = this._receiverAt(0);
    this._promise0 = undefined;
    this._receiver0 = undefined;
    this._settlePromise(promise, handler, receiver, value);
};

Promise.prototype._clearCallbackDataAtIndex = function(index) {
    var base = index * 4 - 4;
    this[base + 2] =
    this[base + 3] =
    this[base + 0] =
    this[base + 1] = undefined;
};

Promise.prototype._fulfill = function (value) {
    var bitField = this._bitField;
    if (((bitField & 117506048) >>> 16)) return;
    if (value === this) {
        var err = makeSelfResolutionError();
        this._attachExtraTrace(err);
        return this._reject(err);
    }
    this._setFulfilled();
    this._rejectionHandler0 = value;

    if ((bitField & 65535) > 0) {
        if (((bitField & 134217728) !== 0)) {
            this._settlePromises();
        } else {
            async.settlePromises(this);
        }
    }
};

Promise.prototype._reject = function (reason) {
    var bitField = this._bitField;
    if (((bitField & 117506048) >>> 16)) return;
    this._setRejected();
    this._fulfillmentHandler0 = reason;

    if (this._isFinal()) {
        return async.fatalError(reason, util.isNode);
    }

    if ((bitField & 65535) > 0) {
        async.settlePromises(this);
    } else {
        this._ensurePossibleRejectionHandled();
    }
};

Promise.prototype._fulfillPromises = function (len, value) {
    for (var i = 1; i < len; i++) {
        var handler = this._fulfillmentHandlerAt(i);
        var promise = this._promiseAt(i);
        var receiver = this._receiverAt(i);
        this._clearCallbackDataAtIndex(i);
        this._settlePromise(promise, handler, receiver, value);
    }
};

Promise.prototype._rejectPromises = function (len, reason) {
    for (var i = 1; i < len; i++) {
        var handler = this._rejectionHandlerAt(i);
        var promise = this._promiseAt(i);
        var receiver = this._receiverAt(i);
        this._clearCallbackDataAtIndex(i);
        this._settlePromise(promise, handler, receiver, reason);
    }
};

Promise.prototype._settlePromises = function () {
    var bitField = this._bitField;
    var len = (bitField & 65535);

    if (len > 0) {
        if (((bitField & 16842752) !== 0)) {
            var reason = this._fulfillmentHandler0;
            this._settlePromise0(this._rejectionHandler0, reason, bitField);
            this._rejectPromises(len, reason);
        } else {
            var value = this._rejectionHandler0;
            this._settlePromise0(this._fulfillmentHandler0, value, bitField);
            this._fulfillPromises(len, value);
        }
        this._setLength(0);
    }
    this._clearCancellationData();
};

Promise.prototype._settledValue = function() {
    var bitField = this._bitField;
    if (((bitField & 33554432) !== 0)) {
        return this._rejectionHandler0;
    } else if (((bitField & 16777216) !== 0)) {
        return this._fulfillmentHandler0;
    }
};

function deferResolve(v) {this.promise._resolveCallback(v);}
function deferReject(v) {this.promise._rejectCallback(v, false);}

Promise.defer = Promise.pending = function() {
    debug.deprecated("Promise.defer", "new Promise");
    var promise = new Promise(INTERNAL);
    return {
        promise: promise,
        resolve: deferResolve,
        reject: deferReject
    };
};

util.notEnumerableProp(Promise,
                       "_makeSelfResolutionError",
                       makeSelfResolutionError);

_dereq_("./method")(Promise, INTERNAL, tryConvertToPromise, apiRejection,
    debug);
_dereq_("./bind")(Promise, INTERNAL, tryConvertToPromise, debug);
_dereq_("./cancel")(Promise, PromiseArray, apiRejection, debug);
_dereq_("./direct_resolve")(Promise);
_dereq_("./synchronous_inspection")(Promise);
_dereq_("./join")(
    Promise, PromiseArray, tryConvertToPromise, INTERNAL, async, getDomain);
Promise.Promise = Promise;
Promise.version = "3.5.0";
_dereq_('./map.js')(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL, debug);
_dereq_('./call_get.js')(Promise);
_dereq_('./using.js')(Promise, apiRejection, tryConvertToPromise, createContext, INTERNAL, debug);
_dereq_('./timers.js')(Promise, INTERNAL, debug);
_dereq_('./generators.js')(Promise, apiRejection, INTERNAL, tryConvertToPromise, Proxyable, debug);
_dereq_('./nodeify.js')(Promise);
_dereq_('./promisify.js')(Promise, INTERNAL);
_dereq_('./props.js')(Promise, PromiseArray, tryConvertToPromise, apiRejection);
_dereq_('./race.js')(Promise, INTERNAL, tryConvertToPromise, apiRejection);
_dereq_('./reduce.js')(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL, debug);
_dereq_('./settle.js')(Promise, PromiseArray, debug);
_dereq_('./some.js')(Promise, PromiseArray, apiRejection);
_dereq_('./filter.js')(Promise, INTERNAL);
_dereq_('./each.js')(Promise, INTERNAL);
_dereq_('./any.js')(Promise);
                                                         
    util.toFastProperties(Promise);                                          
    util.toFastProperties(Promise.prototype);                                
    function fillTypes(value) {                                              
        var p = new Promise(INTERNAL);                                       
        p._fulfillmentHandler0 = value;                                      
        p._rejectionHandler0 = value;                                        
        p._promise0 = value;                                                 
        p._receiver0 = value;                                                
    }                                                                        
    // Complete slack tracking, opt out of field-type tracking and           
    // stabilize map                                                         
    fillTypes({a: 1});                                                       
    fillTypes({b: 2});                                                       
    fillTypes({c: 3});                                                       
    fillTypes(1);                                                            
    fillTypes(function(){});                                                 
    fillTypes(undefined);                                                    
    fillTypes(false);                                                        
    fillTypes(new Promise(INTERNAL));                                        
    debug.setBounds(Async.firstLineError, util.lastLineError);               
    return Promise;                                                          

};

},{"./any.js":1,"./async":2,"./bind":3,"./call_get.js":5,"./cancel":6,"./catch_filter":7,"./context":8,"./debuggability":9,"./direct_resolve":10,"./each.js":11,"./errors":12,"./es5":13,"./filter.js":14,"./finally":15,"./generators.js":16,"./join":17,"./map.js":18,"./method":19,"./nodeback":20,"./nodeify.js":21,"./promise_array":23,"./promisify.js":24,"./props.js":25,"./race.js":27,"./reduce.js":28,"./settle.js":30,"./some.js":31,"./synchronous_inspection":32,"./thenables":33,"./timers.js":34,"./using.js":35,"./util":36}],23:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, tryConvertToPromise,
    apiRejection, Proxyable) {
var util = _dereq_("./util");
var isArray = util.isArray;

function toResolutionValue(val) {
    switch(val) {
    case -2: return [];
    case -3: return {};
    case -6: return new Map();
    }
}

function PromiseArray(values) {
    var promise = this._promise = new Promise(INTERNAL);
    if (values instanceof Promise) {
        promise._propagateFrom(values, 3);
    }
    promise._setOnCancel(this);
    this._values = values;
    this._length = 0;
    this._totalResolved = 0;
    this._init(undefined, -2);
}
util.inherits(PromiseArray, Proxyable);

PromiseArray.prototype.length = function () {
    return this._length;
};

PromiseArray.prototype.promise = function () {
    return this._promise;
};

PromiseArray.prototype._init = function init(_, resolveValueIfEmpty) {
    var values = tryConvertToPromise(this._values, this._promise);
    if (values instanceof Promise) {
        values = values._target();
        var bitField = values._bitField;
        ;
        this._values = values;

        if (((bitField & 50397184) === 0)) {
            this._promise._setAsyncGuaranteed();
            return values._then(
                init,
                this._reject,
                undefined,
                this,
                resolveValueIfEmpty
           );
        } else if (((bitField & 33554432) !== 0)) {
            values = values._value();
        } else if (((bitField & 16777216) !== 0)) {
            return this._reject(values._reason());
        } else {
            return this._cancel();
        }
    }
    values = util.asArray(values);
    if (values === null) {
        var err = apiRejection(
            "expecting an array or an iterable object but got " + util.classString(values)).reason();
        this._promise._rejectCallback(err, false);
        return;
    }

    if (values.length === 0) {
        if (resolveValueIfEmpty === -5) {
            this._resolveEmptyArray();
        }
        else {
            this._resolve(toResolutionValue(resolveValueIfEmpty));
        }
        return;
    }
    this._iterate(values);
};

PromiseArray.prototype._iterate = function(values) {
    var len = this.getActualLength(values.length);
    this._length = len;
    this._values = this.shouldCopyValues() ? new Array(len) : this._values;
    var result = this._promise;
    var isResolved = false;
    var bitField = null;
    for (var i = 0; i < len; ++i) {
        var maybePromise = tryConvertToPromise(values[i], result);

        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            bitField = maybePromise._bitField;
        } else {
            bitField = null;
        }

        if (isResolved) {
            if (bitField !== null) {
                maybePromise.suppressUnhandledRejections();
            }
        } else if (bitField !== null) {
            if (((bitField & 50397184) === 0)) {
                maybePromise._proxy(this, i);
                this._values[i] = maybePromise;
            } else if (((bitField & 33554432) !== 0)) {
                isResolved = this._promiseFulfilled(maybePromise._value(), i);
            } else if (((bitField & 16777216) !== 0)) {
                isResolved = this._promiseRejected(maybePromise._reason(), i);
            } else {
                isResolved = this._promiseCancelled(i);
            }
        } else {
            isResolved = this._promiseFulfilled(maybePromise, i);
        }
    }
    if (!isResolved) result._setAsyncGuaranteed();
};

PromiseArray.prototype._isResolved = function () {
    return this._values === null;
};

PromiseArray.prototype._resolve = function (value) {
    this._values = null;
    this._promise._fulfill(value);
};

PromiseArray.prototype._cancel = function() {
    if (this._isResolved() || !this._promise._isCancellable()) return;
    this._values = null;
    this._promise._cancel();
};

PromiseArray.prototype._reject = function (reason) {
    this._values = null;
    this._promise._rejectCallback(reason, false);
};

PromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
        return true;
    }
    return false;
};

PromiseArray.prototype._promiseCancelled = function() {
    this._cancel();
    return true;
};

PromiseArray.prototype._promiseRejected = function (reason) {
    this._totalResolved++;
    this._reject(reason);
    return true;
};

PromiseArray.prototype._resultCancelled = function() {
    if (this._isResolved()) return;
    var values = this._values;
    this._cancel();
    if (values instanceof Promise) {
        values.cancel();
    } else {
        for (var i = 0; i < values.length; ++i) {
            if (values[i] instanceof Promise) {
                values[i].cancel();
            }
        }
    }
};

PromiseArray.prototype.shouldCopyValues = function () {
    return true;
};

PromiseArray.prototype.getActualLength = function (len) {
    return len;
};

return PromiseArray;
};

},{"./util":36}],24:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var THIS = {};
var util = _dereq_("./util");
var nodebackForPromise = _dereq_("./nodeback");
var withAppended = util.withAppended;
var maybeWrapAsError = util.maybeWrapAsError;
var canEvaluate = util.canEvaluate;
var TypeError = _dereq_("./errors").TypeError;
var defaultSuffix = "Async";
var defaultPromisified = {__isPromisified__: true};
var noCopyProps = [
    "arity",    "length",
    "name",
    "arguments",
    "caller",
    "callee",
    "prototype",
    "__isPromisified__"
];
var noCopyPropsPattern = new RegExp("^(?:" + noCopyProps.join("|") + ")$");

var defaultFilter = function(name) {
    return util.isIdentifier(name) &&
        name.charAt(0) !== "_" &&
        name !== "constructor";
};

function propsFilter(key) {
    return !noCopyPropsPattern.test(key);
}

function isPromisified(fn) {
    try {
        return fn.__isPromisified__ === true;
    }
    catch (e) {
        return false;
    }
}

function hasPromisified(obj, key, suffix) {
    var val = util.getDataPropertyOrDefault(obj, key + suffix,
                                            defaultPromisified);
    return val ? isPromisified(val) : false;
}
function checkValid(ret, suffix, suffixRegexp) {
    for (var i = 0; i < ret.length; i += 2) {
        var key = ret[i];
        if (suffixRegexp.test(key)) {
            var keyWithoutAsyncSuffix = key.replace(suffixRegexp, "");
            for (var j = 0; j < ret.length; j += 2) {
                if (ret[j] === keyWithoutAsyncSuffix) {
                    throw new TypeError("Cannot promisify an API that has normal methods with '%s'-suffix\u000a\u000a    See http://goo.gl/MqrFmX\u000a"
                        .replace("%s", suffix));
                }
            }
        }
    }
}

function promisifiableMethods(obj, suffix, suffixRegexp, filter) {
    var keys = util.inheritedDataKeys(obj);
    var ret = [];
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        var value = obj[key];
        var passesDefaultFilter = filter === defaultFilter
            ? true : defaultFilter(key, value, obj);
        if (typeof value === "function" &&
            !isPromisified(value) &&
            !hasPromisified(obj, key, suffix) &&
            filter(key, value, obj, passesDefaultFilter)) {
            ret.push(key, value);
        }
    }
    checkValid(ret, suffix, suffixRegexp);
    return ret;
}

var escapeIdentRegex = function(str) {
    return str.replace(/([$])/, "\\$");
};

var makeNodePromisifiedEval;
if (!true) {
var switchCaseArgumentOrder = function(likelyArgumentCount) {
    var ret = [likelyArgumentCount];
    var min = Math.max(0, likelyArgumentCount - 1 - 3);
    for(var i = likelyArgumentCount - 1; i >= min; --i) {
        ret.push(i);
    }
    for(var i = likelyArgumentCount + 1; i <= 3; ++i) {
        ret.push(i);
    }
    return ret;
};

var argumentSequence = function(argumentCount) {
    return util.filledRange(argumentCount, "_arg", "");
};

var parameterDeclaration = function(parameterCount) {
    return util.filledRange(
        Math.max(parameterCount, 3), "_arg", "");
};

var parameterCount = function(fn) {
    if (typeof fn.length === "number") {
        return Math.max(Math.min(fn.length, 1023 + 1), 0);
    }
    return 0;
};

makeNodePromisifiedEval =
function(callback, receiver, originalName, fn, _, multiArgs) {
    var newParameterCount = Math.max(0, parameterCount(fn) - 1);
    var argumentOrder = switchCaseArgumentOrder(newParameterCount);
    var shouldProxyThis = typeof callback === "string" || receiver === THIS;

    function generateCallForArgumentCount(count) {
        var args = argumentSequence(count).join(", ");
        var comma = count > 0 ? ", " : "";
        var ret;
        if (shouldProxyThis) {
            ret = "ret = callback.call(this, {{args}}, nodeback); break;\n";
        } else {
            ret = receiver === undefined
                ? "ret = callback({{args}}, nodeback); break;\n"
                : "ret = callback.call(receiver, {{args}}, nodeback); break;\n";
        }
        return ret.replace("{{args}}", args).replace(", ", comma);
    }

    function generateArgumentSwitchCase() {
        var ret = "";
        for (var i = 0; i < argumentOrder.length; ++i) {
            ret += "case " + argumentOrder[i] +":" +
                generateCallForArgumentCount(argumentOrder[i]);
        }

        ret += "                                                             \n\
        default:                                                             \n\
            var args = new Array(len + 1);                                   \n\
            var i = 0;                                                       \n\
            for (var i = 0; i < len; ++i) {                                  \n\
               args[i] = arguments[i];                                       \n\
            }                                                                \n\
            args[i] = nodeback;                                              \n\
            [CodeForCall]                                                    \n\
            break;                                                           \n\
        ".replace("[CodeForCall]", (shouldProxyThis
                                ? "ret = callback.apply(this, args);\n"
                                : "ret = callback.apply(receiver, args);\n"));
        return ret;
    }

    var getFunctionCode = typeof callback === "string"
                                ? ("this != null ? this['"+callback+"'] : fn")
                                : "fn";
    var body = "'use strict';                                                \n\
        var ret = function (Parameters) {                                    \n\
            'use strict';                                                    \n\
            var len = arguments.length;                                      \n\
            var promise = new Promise(INTERNAL);                             \n\
            promise._captureStackTrace();                                    \n\
            var nodeback = nodebackForPromise(promise, " + multiArgs + ");   \n\
            var ret;                                                         \n\
            var callback = tryCatch([GetFunctionCode]);                      \n\
            switch(len) {                                                    \n\
                [CodeForSwitchCase]                                          \n\
            }                                                                \n\
            if (ret === errorObj) {                                          \n\
                promise._rejectCallback(maybeWrapAsError(ret.e), true, true);\n\
            }                                                                \n\
            if (!promise._isFateSealed()) promise._setAsyncGuaranteed();     \n\
            return promise;                                                  \n\
        };                                                                   \n\
        notEnumerableProp(ret, '__isPromisified__', true);                   \n\
        return ret;                                                          \n\
    ".replace("[CodeForSwitchCase]", generateArgumentSwitchCase())
        .replace("[GetFunctionCode]", getFunctionCode);
    body = body.replace("Parameters", parameterDeclaration(newParameterCount));
    return new Function("Promise",
                        "fn",
                        "receiver",
                        "withAppended",
                        "maybeWrapAsError",
                        "nodebackForPromise",
                        "tryCatch",
                        "errorObj",
                        "notEnumerableProp",
                        "INTERNAL",
                        body)(
                    Promise,
                    fn,
                    receiver,
                    withAppended,
                    maybeWrapAsError,
                    nodebackForPromise,
                    util.tryCatch,
                    util.errorObj,
                    util.notEnumerableProp,
                    INTERNAL);
};
}

function makeNodePromisifiedClosure(callback, receiver, _, fn, __, multiArgs) {
    var defaultThis = (function() {return this;})();
    var method = callback;
    if (typeof method === "string") {
        callback = fn;
    }
    function promisified() {
        var _receiver = receiver;
        if (receiver === THIS) _receiver = this;
        var promise = new Promise(INTERNAL);
        promise._captureStackTrace();
        var cb = typeof method === "string" && this !== defaultThis
            ? this[method] : callback;
        var fn = nodebackForPromise(promise, multiArgs);
        try {
            cb.apply(_receiver, withAppended(arguments, fn));
        } catch(e) {
            promise._rejectCallback(maybeWrapAsError(e), true, true);
        }
        if (!promise._isFateSealed()) promise._setAsyncGuaranteed();
        return promise;
    }
    util.notEnumerableProp(promisified, "__isPromisified__", true);
    return promisified;
}

var makeNodePromisified = canEvaluate
    ? makeNodePromisifiedEval
    : makeNodePromisifiedClosure;

function promisifyAll(obj, suffix, filter, promisifier, multiArgs) {
    var suffixRegexp = new RegExp(escapeIdentRegex(suffix) + "$");
    var methods =
        promisifiableMethods(obj, suffix, suffixRegexp, filter);

    for (var i = 0, len = methods.length; i < len; i+= 2) {
        var key = methods[i];
        var fn = methods[i+1];
        var promisifiedKey = key + suffix;
        if (promisifier === makeNodePromisified) {
            obj[promisifiedKey] =
                makeNodePromisified(key, THIS, key, fn, suffix, multiArgs);
        } else {
            var promisified = promisifier(fn, function() {
                return makeNodePromisified(key, THIS, key,
                                           fn, suffix, multiArgs);
            });
            util.notEnumerableProp(promisified, "__isPromisified__", true);
            obj[promisifiedKey] = promisified;
        }
    }
    util.toFastProperties(obj);
    return obj;
}

function promisify(callback, receiver, multiArgs) {
    return makeNodePromisified(callback, receiver, undefined,
                                callback, null, multiArgs);
}

Promise.promisify = function (fn, options) {
    if (typeof fn !== "function") {
        throw new TypeError("expecting a function but got " + util.classString(fn));
    }
    if (isPromisified(fn)) {
        return fn;
    }
    options = Object(options);
    var receiver = options.context === undefined ? THIS : options.context;
    var multiArgs = !!options.multiArgs;
    var ret = promisify(fn, receiver, multiArgs);
    util.copyDescriptors(fn, ret, propsFilter);
    return ret;
};

Promise.promisifyAll = function (target, options) {
    if (typeof target !== "function" && typeof target !== "object") {
        throw new TypeError("the target of promisifyAll must be an object or a function\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    options = Object(options);
    var multiArgs = !!options.multiArgs;
    var suffix = options.suffix;
    if (typeof suffix !== "string") suffix = defaultSuffix;
    var filter = options.filter;
    if (typeof filter !== "function") filter = defaultFilter;
    var promisifier = options.promisifier;
    if (typeof promisifier !== "function") promisifier = makeNodePromisified;

    if (!util.isIdentifier(suffix)) {
        throw new RangeError("suffix must be a valid identifier\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }

    var keys = util.inheritedDataKeys(target);
    for (var i = 0; i < keys.length; ++i) {
        var value = target[keys[i]];
        if (keys[i] !== "constructor" &&
            util.isClass(value)) {
            promisifyAll(value.prototype, suffix, filter, promisifier,
                multiArgs);
            promisifyAll(value, suffix, filter, promisifier, multiArgs);
        }
    }

    return promisifyAll(target, suffix, filter, promisifier, multiArgs);
};
};


},{"./errors":12,"./nodeback":20,"./util":36}],25:[function(_dereq_,module,exports){
"use strict";
module.exports = function(
    Promise, PromiseArray, tryConvertToPromise, apiRejection) {
var util = _dereq_("./util");
var isObject = util.isObject;
var es5 = _dereq_("./es5");
var Es6Map;
if (typeof Map === "function") Es6Map = Map;

var mapToEntries = (function() {
    var index = 0;
    var size = 0;

    function extractEntry(value, key) {
        this[index] = value;
        this[index + size] = key;
        index++;
    }

    return function mapToEntries(map) {
        size = map.size;
        index = 0;
        var ret = new Array(map.size * 2);
        map.forEach(extractEntry, ret);
        return ret;
    };
})();

var entriesToMap = function(entries) {
    var ret = new Es6Map();
    var length = entries.length / 2 | 0;
    for (var i = 0; i < length; ++i) {
        var key = entries[length + i];
        var value = entries[i];
        ret.set(key, value);
    }
    return ret;
};

function PropertiesPromiseArray(obj) {
    var isMap = false;
    var entries;
    if (Es6Map !== undefined && obj instanceof Es6Map) {
        entries = mapToEntries(obj);
        isMap = true;
    } else {
        var keys = es5.keys(obj);
        var len = keys.length;
        entries = new Array(len * 2);
        for (var i = 0; i < len; ++i) {
            var key = keys[i];
            entries[i] = obj[key];
            entries[i + len] = key;
        }
    }
    this.constructor$(entries);
    this._isMap = isMap;
    this._init$(undefined, isMap ? -6 : -3);
}
util.inherits(PropertiesPromiseArray, PromiseArray);

PropertiesPromiseArray.prototype._init = function () {};

PropertiesPromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        var val;
        if (this._isMap) {
            val = entriesToMap(this._values);
        } else {
            val = {};
            var keyOffset = this.length();
            for (var i = 0, len = this.length(); i < len; ++i) {
                val[this._values[i + keyOffset]] = this._values[i];
            }
        }
        this._resolve(val);
        return true;
    }
    return false;
};

PropertiesPromiseArray.prototype.shouldCopyValues = function () {
    return false;
};

PropertiesPromiseArray.prototype.getActualLength = function (len) {
    return len >> 1;
};

function props(promises) {
    var ret;
    var castValue = tryConvertToPromise(promises);

    if (!isObject(castValue)) {
        return apiRejection("cannot await properties of a non-object\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    } else if (castValue instanceof Promise) {
        ret = castValue._then(
            Promise.props, undefined, undefined, undefined, undefined);
    } else {
        ret = new PropertiesPromiseArray(castValue).promise();
    }

    if (castValue instanceof Promise) {
        ret._propagateFrom(castValue, 2);
    }
    return ret;
}

Promise.prototype.props = function () {
    return props(this);
};

Promise.props = function (promises) {
    return props(promises);
};
};

},{"./es5":13,"./util":36}],26:[function(_dereq_,module,exports){
"use strict";
function arrayMove(src, srcIndex, dst, dstIndex, len) {
    for (var j = 0; j < len; ++j) {
        dst[j + dstIndex] = src[j + srcIndex];
        src[j + srcIndex] = void 0;
    }
}

function Queue(capacity) {
    this._capacity = capacity;
    this._length = 0;
    this._front = 0;
}

Queue.prototype._willBeOverCapacity = function (size) {
    return this._capacity < size;
};

Queue.prototype._pushOne = function (arg) {
    var length = this.length();
    this._checkCapacity(length + 1);
    var i = (this._front + length) & (this._capacity - 1);
    this[i] = arg;
    this._length = length + 1;
};

Queue.prototype.push = function (fn, receiver, arg) {
    var length = this.length() + 3;
    if (this._willBeOverCapacity(length)) {
        this._pushOne(fn);
        this._pushOne(receiver);
        this._pushOne(arg);
        return;
    }
    var j = this._front + length - 3;
    this._checkCapacity(length);
    var wrapMask = this._capacity - 1;
    this[(j + 0) & wrapMask] = fn;
    this[(j + 1) & wrapMask] = receiver;
    this[(j + 2) & wrapMask] = arg;
    this._length = length;
};

Queue.prototype.shift = function () {
    var front = this._front,
        ret = this[front];

    this[front] = undefined;
    this._front = (front + 1) & (this._capacity - 1);
    this._length--;
    return ret;
};

Queue.prototype.length = function () {
    return this._length;
};

Queue.prototype._checkCapacity = function (size) {
    if (this._capacity < size) {
        this._resizeTo(this._capacity << 1);
    }
};

Queue.prototype._resizeTo = function (capacity) {
    var oldCapacity = this._capacity;
    this._capacity = capacity;
    var front = this._front;
    var length = this._length;
    var moveItemsCount = (front + length) & (oldCapacity - 1);
    arrayMove(this, 0, this, oldCapacity, moveItemsCount);
};

module.exports = Queue;

},{}],27:[function(_dereq_,module,exports){
"use strict";
module.exports = function(
    Promise, INTERNAL, tryConvertToPromise, apiRejection) {
var util = _dereq_("./util");

var raceLater = function (promise) {
    return promise.then(function(array) {
        return race(array, promise);
    });
};

function race(promises, parent) {
    var maybePromise = tryConvertToPromise(promises);

    if (maybePromise instanceof Promise) {
        return raceLater(maybePromise);
    } else {
        promises = util.asArray(promises);
        if (promises === null)
            return apiRejection("expecting an array or an iterable object but got " + util.classString(promises));
    }

    var ret = new Promise(INTERNAL);
    if (parent !== undefined) {
        ret._propagateFrom(parent, 3);
    }
    var fulfill = ret._fulfill;
    var reject = ret._reject;
    for (var i = 0, len = promises.length; i < len; ++i) {
        var val = promises[i];

        if (val === undefined && !(i in promises)) {
            continue;
        }

        Promise.cast(val)._then(fulfill, reject, undefined, ret, null);
    }
    return ret;
}

Promise.race = function (promises) {
    return race(promises, undefined);
};

Promise.prototype.race = function () {
    return race(this, undefined);
};

};

},{"./util":36}],28:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          PromiseArray,
                          apiRejection,
                          tryConvertToPromise,
                          INTERNAL,
                          debug) {
var getDomain = Promise._getDomain;
var util = _dereq_("./util");
var tryCatch = util.tryCatch;

function ReductionPromiseArray(promises, fn, initialValue, _each) {
    this.constructor$(promises);
    var domain = getDomain();
    this._fn = domain === null ? fn : util.domainBind(domain, fn);
    if (initialValue !== undefined) {
        initialValue = Promise.resolve(initialValue);
        initialValue._attachCancellationCallback(this);
    }
    this._initialValue = initialValue;
    this._currentCancellable = null;
    if(_each === INTERNAL) {
        this._eachValues = Array(this._length);
    } else if (_each === 0) {
        this._eachValues = null;
    } else {
        this._eachValues = undefined;
    }
    this._promise._captureStackTrace();
    this._init$(undefined, -5);
}
util.inherits(ReductionPromiseArray, PromiseArray);

ReductionPromiseArray.prototype._gotAccum = function(accum) {
    if (this._eachValues !== undefined && 
        this._eachValues !== null && 
        accum !== INTERNAL) {
        this._eachValues.push(accum);
    }
};

ReductionPromiseArray.prototype._eachComplete = function(value) {
    if (this._eachValues !== null) {
        this._eachValues.push(value);
    }
    return this._eachValues;
};

ReductionPromiseArray.prototype._init = function() {};

ReductionPromiseArray.prototype._resolveEmptyArray = function() {
    this._resolve(this._eachValues !== undefined ? this._eachValues
                                                 : this._initialValue);
};

ReductionPromiseArray.prototype.shouldCopyValues = function () {
    return false;
};

ReductionPromiseArray.prototype._resolve = function(value) {
    this._promise._resolveCallback(value);
    this._values = null;
};

ReductionPromiseArray.prototype._resultCancelled = function(sender) {
    if (sender === this._initialValue) return this._cancel();
    if (this._isResolved()) return;
    this._resultCancelled$();
    if (this._currentCancellable instanceof Promise) {
        this._currentCancellable.cancel();
    }
    if (this._initialValue instanceof Promise) {
        this._initialValue.cancel();
    }
};

ReductionPromiseArray.prototype._iterate = function (values) {
    this._values = values;
    var value;
    var i;
    var length = values.length;
    if (this._initialValue !== undefined) {
        value = this._initialValue;
        i = 0;
    } else {
        value = Promise.resolve(values[0]);
        i = 1;
    }

    this._currentCancellable = value;

    if (!value.isRejected()) {
        for (; i < length; ++i) {
            var ctx = {
                accum: null,
                value: values[i],
                index: i,
                length: length,
                array: this
            };
            value = value._then(gotAccum, undefined, undefined, ctx, undefined);
        }
    }

    if (this._eachValues !== undefined) {
        value = value
            ._then(this._eachComplete, undefined, undefined, this, undefined);
    }
    value._then(completed, completed, undefined, value, this);
};

Promise.prototype.reduce = function (fn, initialValue) {
    return reduce(this, fn, initialValue, null);
};

Promise.reduce = function (promises, fn, initialValue, _each) {
    return reduce(promises, fn, initialValue, _each);
};

function completed(valueOrReason, array) {
    if (this.isFulfilled()) {
        array._resolve(valueOrReason);
    } else {
        array._reject(valueOrReason);
    }
}

function reduce(promises, fn, initialValue, _each) {
    if (typeof fn !== "function") {
        return apiRejection("expecting a function but got " + util.classString(fn));
    }
    var array = new ReductionPromiseArray(promises, fn, initialValue, _each);
    return array.promise();
}

function gotAccum(accum) {
    this.accum = accum;
    this.array._gotAccum(accum);
    var value = tryConvertToPromise(this.value, this.array._promise);
    if (value instanceof Promise) {
        this.array._currentCancellable = value;
        return value._then(gotValue, undefined, undefined, this, undefined);
    } else {
        return gotValue.call(this, value);
    }
}

function gotValue(value) {
    var array = this.array;
    var promise = array._promise;
    var fn = tryCatch(array._fn);
    promise._pushContext();
    var ret;
    if (array._eachValues !== undefined) {
        ret = fn.call(promise._boundValue(), value, this.index, this.length);
    } else {
        ret = fn.call(promise._boundValue(),
                              this.accum, value, this.index, this.length);
    }
    if (ret instanceof Promise) {
        array._currentCancellable = ret;
    }
    var promiseCreated = promise._popContext();
    debug.checkForgottenReturns(
        ret,
        promiseCreated,
        array._eachValues !== undefined ? "Promise.each" : "Promise.reduce",
        promise
    );
    return ret;
}
};

},{"./util":36}],29:[function(_dereq_,module,exports){
"use strict";
var util = _dereq_("./util");
var schedule;
var noAsyncScheduler = function() {
    throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
};
var NativePromise = util.getNativePromise();
if (util.isNode && typeof MutationObserver === "undefined") {
    var GlobalSetImmediate = global.setImmediate;
    var ProcessNextTick = process.nextTick;
    schedule = util.isRecentNode
                ? function(fn) { GlobalSetImmediate.call(global, fn); }
                : function(fn) { ProcessNextTick.call(process, fn); };
} else if (typeof NativePromise === "function" &&
           typeof NativePromise.resolve === "function") {
    var nativePromise = NativePromise.resolve();
    schedule = function(fn) {
        nativePromise.then(fn);
    };
} else if ((typeof MutationObserver !== "undefined") &&
          !(typeof window !== "undefined" &&
            window.navigator &&
            (window.navigator.standalone || window.cordova))) {
    schedule = (function() {
        var div = document.createElement("div");
        var opts = {attributes: true};
        var toggleScheduled = false;
        var div2 = document.createElement("div");
        var o2 = new MutationObserver(function() {
            div.classList.toggle("foo");
            toggleScheduled = false;
        });
        o2.observe(div2, opts);

        var scheduleToggle = function() {
            if (toggleScheduled) return;
            toggleScheduled = true;
            div2.classList.toggle("foo");
        };

        return function schedule(fn) {
            var o = new MutationObserver(function() {
                o.disconnect();
                fn();
            });
            o.observe(div, opts);
            scheduleToggle();
        };
    })();
} else if (typeof setImmediate !== "undefined") {
    schedule = function (fn) {
        setImmediate(fn);
    };
} else if (typeof setTimeout !== "undefined") {
    schedule = function (fn) {
        setTimeout(fn, 0);
    };
} else {
    schedule = noAsyncScheduler;
}
module.exports = schedule;

},{"./util":36}],30:[function(_dereq_,module,exports){
"use strict";
module.exports =
    function(Promise, PromiseArray, debug) {
var PromiseInspection = Promise.PromiseInspection;
var util = _dereq_("./util");

function SettledPromiseArray(values) {
    this.constructor$(values);
}
util.inherits(SettledPromiseArray, PromiseArray);

SettledPromiseArray.prototype._promiseResolved = function (index, inspection) {
    this._values[index] = inspection;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
        return true;
    }
    return false;
};

SettledPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var ret = new PromiseInspection();
    ret._bitField = 33554432;
    ret._settledValueField = value;
    return this._promiseResolved(index, ret);
};
SettledPromiseArray.prototype._promiseRejected = function (reason, index) {
    var ret = new PromiseInspection();
    ret._bitField = 16777216;
    ret._settledValueField = reason;
    return this._promiseResolved(index, ret);
};

Promise.settle = function (promises) {
    debug.deprecated(".settle()", ".reflect()");
    return new SettledPromiseArray(promises).promise();
};

Promise.prototype.settle = function () {
    return Promise.settle(this);
};
};

},{"./util":36}],31:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, PromiseArray, apiRejection) {
var util = _dereq_("./util");
var RangeError = _dereq_("./errors").RangeError;
var AggregateError = _dereq_("./errors").AggregateError;
var isArray = util.isArray;
var CANCELLATION = {};


function SomePromiseArray(values) {
    this.constructor$(values);
    this._howMany = 0;
    this._unwrap = false;
    this._initialized = false;
}
util.inherits(SomePromiseArray, PromiseArray);

SomePromiseArray.prototype._init = function () {
    if (!this._initialized) {
        return;
    }
    if (this._howMany === 0) {
        this._resolve([]);
        return;
    }
    this._init$(undefined, -5);
    var isArrayResolved = isArray(this._values);
    if (!this._isResolved() &&
        isArrayResolved &&
        this._howMany > this._canPossiblyFulfill()) {
        this._reject(this._getRangeError(this.length()));
    }
};

SomePromiseArray.prototype.init = function () {
    this._initialized = true;
    this._init();
};

SomePromiseArray.prototype.setUnwrap = function () {
    this._unwrap = true;
};

SomePromiseArray.prototype.howMany = function () {
    return this._howMany;
};

SomePromiseArray.prototype.setHowMany = function (count) {
    this._howMany = count;
};

SomePromiseArray.prototype._promiseFulfilled = function (value) {
    this._addFulfilled(value);
    if (this._fulfilled() === this.howMany()) {
        this._values.length = this.howMany();
        if (this.howMany() === 1 && this._unwrap) {
            this._resolve(this._values[0]);
        } else {
            this._resolve(this._values);
        }
        return true;
    }
    return false;

};
SomePromiseArray.prototype._promiseRejected = function (reason) {
    this._addRejected(reason);
    return this._checkOutcome();
};

SomePromiseArray.prototype._promiseCancelled = function () {
    if (this._values instanceof Promise || this._values == null) {
        return this._cancel();
    }
    this._addRejected(CANCELLATION);
    return this._checkOutcome();
};

SomePromiseArray.prototype._checkOutcome = function() {
    if (this.howMany() > this._canPossiblyFulfill()) {
        var e = new AggregateError();
        for (var i = this.length(); i < this._values.length; ++i) {
            if (this._values[i] !== CANCELLATION) {
                e.push(this._values[i]);
            }
        }
        if (e.length > 0) {
            this._reject(e);
        } else {
            this._cancel();
        }
        return true;
    }
    return false;
};

SomePromiseArray.prototype._fulfilled = function () {
    return this._totalResolved;
};

SomePromiseArray.prototype._rejected = function () {
    return this._values.length - this.length();
};

SomePromiseArray.prototype._addRejected = function (reason) {
    this._values.push(reason);
};

SomePromiseArray.prototype._addFulfilled = function (value) {
    this._values[this._totalResolved++] = value;
};

SomePromiseArray.prototype._canPossiblyFulfill = function () {
    return this.length() - this._rejected();
};

SomePromiseArray.prototype._getRangeError = function (count) {
    var message = "Input array must contain at least " +
            this._howMany + " items but contains only " + count + " items";
    return new RangeError(message);
};

SomePromiseArray.prototype._resolveEmptyArray = function () {
    this._reject(this._getRangeError(0));
};

function some(promises, howMany) {
    if ((howMany | 0) !== howMany || howMany < 0) {
        return apiRejection("expecting a positive integer\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    var ret = new SomePromiseArray(promises);
    var promise = ret.promise();
    ret.setHowMany(howMany);
    ret.init();
    return promise;
}

Promise.some = function (promises, howMany) {
    return some(promises, howMany);
};

Promise.prototype.some = function (howMany) {
    return some(this, howMany);
};

Promise._SomePromiseArray = SomePromiseArray;
};

},{"./errors":12,"./util":36}],32:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
function PromiseInspection(promise) {
    if (promise !== undefined) {
        promise = promise._target();
        this._bitField = promise._bitField;
        this._settledValueField = promise._isFateSealed()
            ? promise._settledValue() : undefined;
    }
    else {
        this._bitField = 0;
        this._settledValueField = undefined;
    }
}

PromiseInspection.prototype._settledValue = function() {
    return this._settledValueField;
};

var value = PromiseInspection.prototype.value = function () {
    if (!this.isFulfilled()) {
        throw new TypeError("cannot get fulfillment value of a non-fulfilled promise\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    return this._settledValue();
};

var reason = PromiseInspection.prototype.error =
PromiseInspection.prototype.reason = function () {
    if (!this.isRejected()) {
        throw new TypeError("cannot get rejection reason of a non-rejected promise\u000a\u000a    See http://goo.gl/MqrFmX\u000a");
    }
    return this._settledValue();
};

var isFulfilled = PromiseInspection.prototype.isFulfilled = function() {
    return (this._bitField & 33554432) !== 0;
};

var isRejected = PromiseInspection.prototype.isRejected = function () {
    return (this._bitField & 16777216) !== 0;
};

var isPending = PromiseInspection.prototype.isPending = function () {
    return (this._bitField & 50397184) === 0;
};

var isResolved = PromiseInspection.prototype.isResolved = function () {
    return (this._bitField & 50331648) !== 0;
};

PromiseInspection.prototype.isCancelled = function() {
    return (this._bitField & 8454144) !== 0;
};

Promise.prototype.__isCancelled = function() {
    return (this._bitField & 65536) === 65536;
};

Promise.prototype._isCancelled = function() {
    return this._target().__isCancelled();
};

Promise.prototype.isCancelled = function() {
    return (this._target()._bitField & 8454144) !== 0;
};

Promise.prototype.isPending = function() {
    return isPending.call(this._target());
};

Promise.prototype.isRejected = function() {
    return isRejected.call(this._target());
};

Promise.prototype.isFulfilled = function() {
    return isFulfilled.call(this._target());
};

Promise.prototype.isResolved = function() {
    return isResolved.call(this._target());
};

Promise.prototype.value = function() {
    return value.call(this._target());
};

Promise.prototype.reason = function() {
    var target = this._target();
    target._unsetRejectionIsUnhandled();
    return reason.call(target);
};

Promise.prototype._value = function() {
    return this._settledValue();
};

Promise.prototype._reason = function() {
    this._unsetRejectionIsUnhandled();
    return this._settledValue();
};

Promise.PromiseInspection = PromiseInspection;
};

},{}],33:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var util = _dereq_("./util");
var errorObj = util.errorObj;
var isObject = util.isObject;

function tryConvertToPromise(obj, context) {
    if (isObject(obj)) {
        if (obj instanceof Promise) return obj;
        var then = getThen(obj);
        if (then === errorObj) {
            if (context) context._pushContext();
            var ret = Promise.reject(then.e);
            if (context) context._popContext();
            return ret;
        } else if (typeof then === "function") {
            if (isAnyBluebirdPromise(obj)) {
                var ret = new Promise(INTERNAL);
                obj._then(
                    ret._fulfill,
                    ret._reject,
                    undefined,
                    ret,
                    null
                );
                return ret;
            }
            return doThenable(obj, then, context);
        }
    }
    return obj;
}

function doGetThen(obj) {
    return obj.then;
}

function getThen(obj) {
    try {
        return doGetThen(obj);
    } catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}

var hasProp = {}.hasOwnProperty;
function isAnyBluebirdPromise(obj) {
    try {
        return hasProp.call(obj, "_promise0");
    } catch (e) {
        return false;
    }
}

function doThenable(x, then, context) {
    var promise = new Promise(INTERNAL);
    var ret = promise;
    if (context) context._pushContext();
    promise._captureStackTrace();
    if (context) context._popContext();
    var synchronous = true;
    var result = util.tryCatch(then).call(x, resolve, reject);
    synchronous = false;

    if (promise && result === errorObj) {
        promise._rejectCallback(result.e, true, true);
        promise = null;
    }

    function resolve(value) {
        if (!promise) return;
        promise._resolveCallback(value);
        promise = null;
    }

    function reject(reason) {
        if (!promise) return;
        promise._rejectCallback(reason, synchronous, true);
        promise = null;
    }
    return ret;
}

return tryConvertToPromise;
};

},{"./util":36}],34:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, debug) {
var util = _dereq_("./util");
var TimeoutError = Promise.TimeoutError;

function HandleWrapper(handle)  {
    this.handle = handle;
}

HandleWrapper.prototype._resultCancelled = function() {
    clearTimeout(this.handle);
};

var afterValue = function(value) { return delay(+this).thenReturn(value); };
var delay = Promise.delay = function (ms, value) {
    var ret;
    var handle;
    if (value !== undefined) {
        ret = Promise.resolve(value)
                ._then(afterValue, null, null, ms, undefined);
        if (debug.cancellation() && value instanceof Promise) {
            ret._setOnCancel(value);
        }
    } else {
        ret = new Promise(INTERNAL);
        handle = setTimeout(function() { ret._fulfill(); }, +ms);
        if (debug.cancellation()) {
            ret._setOnCancel(new HandleWrapper(handle));
        }
        ret._captureStackTrace();
    }
    ret._setAsyncGuaranteed();
    return ret;
};

Promise.prototype.delay = function (ms) {
    return delay(ms, this);
};

var afterTimeout = function (promise, message, parent) {
    var err;
    if (typeof message !== "string") {
        if (message instanceof Error) {
            err = message;
        } else {
            err = new TimeoutError("operation timed out");
        }
    } else {
        err = new TimeoutError(message);
    }
    util.markAsOriginatingFromRejection(err);
    promise._attachExtraTrace(err);
    promise._reject(err);

    if (parent != null) {
        parent.cancel();
    }
};

function successClear(value) {
    clearTimeout(this.handle);
    return value;
}

function failureClear(reason) {
    clearTimeout(this.handle);
    throw reason;
}

Promise.prototype.timeout = function (ms, message) {
    ms = +ms;
    var ret, parent;

    var handleWrapper = new HandleWrapper(setTimeout(function timeoutTimeout() {
        if (ret.isPending()) {
            afterTimeout(ret, message, parent);
        }
    }, ms));

    if (debug.cancellation()) {
        parent = this.then();
        ret = parent._then(successClear, failureClear,
                            undefined, handleWrapper, undefined);
        ret._setOnCancel(handleWrapper);
    } else {
        ret = this._then(successClear, failureClear,
                            undefined, handleWrapper, undefined);
    }

    return ret;
};

};

},{"./util":36}],35:[function(_dereq_,module,exports){
"use strict";
module.exports = function (Promise, apiRejection, tryConvertToPromise,
    createContext, INTERNAL, debug) {
    var util = _dereq_("./util");
    var TypeError = _dereq_("./errors").TypeError;
    var inherits = _dereq_("./util").inherits;
    var errorObj = util.errorObj;
    var tryCatch = util.tryCatch;
    var NULL = {};

    function thrower(e) {
        setTimeout(function(){throw e;}, 0);
    }

    function castPreservingDisposable(thenable) {
        var maybePromise = tryConvertToPromise(thenable);
        if (maybePromise !== thenable &&
            typeof thenable._isDisposable === "function" &&
            typeof thenable._getDisposer === "function" &&
            thenable._isDisposable()) {
            maybePromise._setDisposable(thenable._getDisposer());
        }
        return maybePromise;
    }
    function dispose(resources, inspection) {
        var i = 0;
        var len = resources.length;
        var ret = new Promise(INTERNAL);
        function iterator() {
            if (i >= len) return ret._fulfill();
            var maybePromise = castPreservingDisposable(resources[i++]);
            if (maybePromise instanceof Promise &&
                maybePromise._isDisposable()) {
                try {
                    maybePromise = tryConvertToPromise(
                        maybePromise._getDisposer().tryDispose(inspection),
                        resources.promise);
                } catch (e) {
                    return thrower(e);
                }
                if (maybePromise instanceof Promise) {
                    return maybePromise._then(iterator, thrower,
                                              null, null, null);
                }
            }
            iterator();
        }
        iterator();
        return ret;
    }

    function Disposer(data, promise, context) {
        this._data = data;
        this._promise = promise;
        this._context = context;
    }

    Disposer.prototype.data = function () {
        return this._data;
    };

    Disposer.prototype.promise = function () {
        return this._promise;
    };

    Disposer.prototype.resource = function () {
        if (this.promise().isFulfilled()) {
            return this.promise().value();
        }
        return NULL;
    };

    Disposer.prototype.tryDispose = function(inspection) {
        var resource = this.resource();
        var context = this._context;
        if (context !== undefined) context._pushContext();
        var ret = resource !== NULL
            ? this.doDispose(resource, inspection) : null;
        if (context !== undefined) context._popContext();
        this._promise._unsetDisposable();
        this._data = null;
        return ret;
    };

    Disposer.isDisposer = function (d) {
        return (d != null &&
                typeof d.resource === "function" &&
                typeof d.tryDispose === "function");
    };

    function FunctionDisposer(fn, promise, context) {
        this.constructor$(fn, promise, context);
    }
    inherits(FunctionDisposer, Disposer);

    FunctionDisposer.prototype.doDispose = function (resource, inspection) {
        var fn = this.data();
        return fn.call(resource, resource, inspection);
    };

    function maybeUnwrapDisposer(value) {
        if (Disposer.isDisposer(value)) {
            this.resources[this.index]._setDisposable(value);
            return value.promise();
        }
        return value;
    }

    function ResourceList(length) {
        this.length = length;
        this.promise = null;
        this[length-1] = null;
    }

    ResourceList.prototype._resultCancelled = function() {
        var len = this.length;
        for (var i = 0; i < len; ++i) {
            var item = this[i];
            if (item instanceof Promise) {
                item.cancel();
            }
        }
    };

    Promise.using = function () {
        var len = arguments.length;
        if (len < 2) return apiRejection(
                        "you must pass at least 2 arguments to Promise.using");
        var fn = arguments[len - 1];
        if (typeof fn !== "function") {
            return apiRejection("expecting a function but got " + util.classString(fn));
        }
        var input;
        var spreadArgs = true;
        if (len === 2 && Array.isArray(arguments[0])) {
            input = arguments[0];
            len = input.length;
            spreadArgs = false;
        } else {
            input = arguments;
            len--;
        }
        var resources = new ResourceList(len);
        for (var i = 0; i < len; ++i) {
            var resource = input[i];
            if (Disposer.isDisposer(resource)) {
                var disposer = resource;
                resource = resource.promise();
                resource._setDisposable(disposer);
            } else {
                var maybePromise = tryConvertToPromise(resource);
                if (maybePromise instanceof Promise) {
                    resource =
                        maybePromise._then(maybeUnwrapDisposer, null, null, {
                            resources: resources,
                            index: i
                    }, undefined);
                }
            }
            resources[i] = resource;
        }

        var reflectedResources = new Array(resources.length);
        for (var i = 0; i < reflectedResources.length; ++i) {
            reflectedResources[i] = Promise.resolve(resources[i]).reflect();
        }

        var resultPromise = Promise.all(reflectedResources)
            .then(function(inspections) {
                for (var i = 0; i < inspections.length; ++i) {
                    var inspection = inspections[i];
                    if (inspection.isRejected()) {
                        errorObj.e = inspection.error();
                        return errorObj;
                    } else if (!inspection.isFulfilled()) {
                        resultPromise.cancel();
                        return;
                    }
                    inspections[i] = inspection.value();
                }
                promise._pushContext();

                fn = tryCatch(fn);
                var ret = spreadArgs
                    ? fn.apply(undefined, inspections) : fn(inspections);
                var promiseCreated = promise._popContext();
                debug.checkForgottenReturns(
                    ret, promiseCreated, "Promise.using", promise);
                return ret;
            });

        var promise = resultPromise.lastly(function() {
            var inspection = new Promise.PromiseInspection(resultPromise);
            return dispose(resources, inspection);
        });
        resources.promise = promise;
        promise._setOnCancel(resources);
        return promise;
    };

    Promise.prototype._setDisposable = function (disposer) {
        this._bitField = this._bitField | 131072;
        this._disposer = disposer;
    };

    Promise.prototype._isDisposable = function () {
        return (this._bitField & 131072) > 0;
    };

    Promise.prototype._getDisposer = function () {
        return this._disposer;
    };

    Promise.prototype._unsetDisposable = function () {
        this._bitField = this._bitField & (~131072);
        this._disposer = undefined;
    };

    Promise.prototype.disposer = function (fn) {
        if (typeof fn === "function") {
            return new FunctionDisposer(fn, this, createContext());
        }
        throw new TypeError();
    };

};

},{"./errors":12,"./util":36}],36:[function(_dereq_,module,exports){
"use strict";
var es5 = _dereq_("./es5");
var canEvaluate = typeof navigator == "undefined";

var errorObj = {e: {}};
var tryCatchTarget;
var globalObject = typeof self !== "undefined" ? self :
    typeof window !== "undefined" ? window :
    typeof global !== "undefined" ? global :
    this !== undefined ? this : null;

function tryCatcher() {
    try {
        var target = tryCatchTarget;
        tryCatchTarget = null;
        return target.apply(this, arguments);
    } catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}
function tryCatch(fn) {
    tryCatchTarget = fn;
    return tryCatcher;
}

var inherits = function(Child, Parent) {
    var hasProp = {}.hasOwnProperty;

    function T() {
        this.constructor = Child;
        this.constructor$ = Parent;
        for (var propertyName in Parent.prototype) {
            if (hasProp.call(Parent.prototype, propertyName) &&
                propertyName.charAt(propertyName.length-1) !== "$"
           ) {
                this[propertyName + "$"] = Parent.prototype[propertyName];
            }
        }
    }
    T.prototype = Parent.prototype;
    Child.prototype = new T();
    return Child.prototype;
};


function isPrimitive(val) {
    return val == null || val === true || val === false ||
        typeof val === "string" || typeof val === "number";

}

function isObject(value) {
    return typeof value === "function" ||
           typeof value === "object" && value !== null;
}

function maybeWrapAsError(maybeError) {
    if (!isPrimitive(maybeError)) return maybeError;

    return new Error(safeToString(maybeError));
}

function withAppended(target, appendee) {
    var len = target.length;
    var ret = new Array(len + 1);
    var i;
    for (i = 0; i < len; ++i) {
        ret[i] = target[i];
    }
    ret[i] = appendee;
    return ret;
}

function getDataPropertyOrDefault(obj, key, defaultValue) {
    if (es5.isES5) {
        var desc = Object.getOwnPropertyDescriptor(obj, key);

        if (desc != null) {
            return desc.get == null && desc.set == null
                    ? desc.value
                    : defaultValue;
        }
    } else {
        return {}.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
    }
}

function notEnumerableProp(obj, name, value) {
    if (isPrimitive(obj)) return obj;
    var descriptor = {
        value: value,
        configurable: true,
        enumerable: false,
        writable: true
    };
    es5.defineProperty(obj, name, descriptor);
    return obj;
}

function thrower(r) {
    throw r;
}

var inheritedDataKeys = (function() {
    var excludedPrototypes = [
        Array.prototype,
        Object.prototype,
        Function.prototype
    ];

    var isExcludedProto = function(val) {
        for (var i = 0; i < excludedPrototypes.length; ++i) {
            if (excludedPrototypes[i] === val) {
                return true;
            }
        }
        return false;
    };

    if (es5.isES5) {
        var getKeys = Object.getOwnPropertyNames;
        return function(obj) {
            var ret = [];
            var visitedKeys = Object.create(null);
            while (obj != null && !isExcludedProto(obj)) {
                var keys;
                try {
                    keys = getKeys(obj);
                } catch (e) {
                    return ret;
                }
                for (var i = 0; i < keys.length; ++i) {
                    var key = keys[i];
                    if (visitedKeys[key]) continue;
                    visitedKeys[key] = true;
                    var desc = Object.getOwnPropertyDescriptor(obj, key);
                    if (desc != null && desc.get == null && desc.set == null) {
                        ret.push(key);
                    }
                }
                obj = es5.getPrototypeOf(obj);
            }
            return ret;
        };
    } else {
        var hasProp = {}.hasOwnProperty;
        return function(obj) {
            if (isExcludedProto(obj)) return [];
            var ret = [];

            /*jshint forin:false */
            enumeration: for (var key in obj) {
                if (hasProp.call(obj, key)) {
                    ret.push(key);
                } else {
                    for (var i = 0; i < excludedPrototypes.length; ++i) {
                        if (hasProp.call(excludedPrototypes[i], key)) {
                            continue enumeration;
                        }
                    }
                    ret.push(key);
                }
            }
            return ret;
        };
    }

})();

var thisAssignmentPattern = /this\s*\.\s*\S+\s*=/;
function isClass(fn) {
    try {
        if (typeof fn === "function") {
            var keys = es5.names(fn.prototype);

            var hasMethods = es5.isES5 && keys.length > 1;
            var hasMethodsOtherThanConstructor = keys.length > 0 &&
                !(keys.length === 1 && keys[0] === "constructor");
            var hasThisAssignmentAndStaticMethods =
                thisAssignmentPattern.test(fn + "") && es5.names(fn).length > 0;

            if (hasMethods || hasMethodsOtherThanConstructor ||
                hasThisAssignmentAndStaticMethods) {
                return true;
            }
        }
        return false;
    } catch (e) {
        return false;
    }
}

function toFastProperties(obj) {
    /*jshint -W027,-W055,-W031*/
    function FakeConstructor() {}
    FakeConstructor.prototype = obj;
    var l = 8;
    while (l--) new FakeConstructor();
    return obj;
    eval(obj);
}

var rident = /^[a-z$_][a-z$_0-9]*$/i;
function isIdentifier(str) {
    return rident.test(str);
}

function filledRange(count, prefix, suffix) {
    var ret = new Array(count);
    for(var i = 0; i < count; ++i) {
        ret[i] = prefix + i + suffix;
    }
    return ret;
}

function safeToString(obj) {
    try {
        return obj + "";
    } catch (e) {
        return "[no string representation]";
    }
}

function isError(obj) {
    return obj !== null &&
           typeof obj === "object" &&
           typeof obj.message === "string" &&
           typeof obj.name === "string";
}

function markAsOriginatingFromRejection(e) {
    try {
        notEnumerableProp(e, "isOperational", true);
    }
    catch(ignore) {}
}

function originatesFromRejection(e) {
    if (e == null) return false;
    return ((e instanceof Error["__BluebirdErrorTypes__"].OperationalError) ||
        e["isOperational"] === true);
}

function canAttachTrace(obj) {
    return isError(obj) && es5.propertyIsWritable(obj, "stack");
}

var ensureErrorObject = (function() {
    if (!("stack" in new Error())) {
        return function(value) {
            if (canAttachTrace(value)) return value;
            try {throw new Error(safeToString(value));}
            catch(err) {return err;}
        };
    } else {
        return function(value) {
            if (canAttachTrace(value)) return value;
            return new Error(safeToString(value));
        };
    }
})();

function classString(obj) {
    return {}.toString.call(obj);
}

function copyDescriptors(from, to, filter) {
    var keys = es5.names(from);
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        if (filter(key)) {
            try {
                es5.defineProperty(to, key, es5.getDescriptor(from, key));
            } catch (ignore) {}
        }
    }
}

var asArray = function(v) {
    if (es5.isArray(v)) {
        return v;
    }
    return null;
};

if (typeof Symbol !== "undefined" && Symbol.iterator) {
    var ArrayFrom = typeof Array.from === "function" ? function(v) {
        return Array.from(v);
    } : function(v) {
        var ret = [];
        var it = v[Symbol.iterator]();
        var itResult;
        while (!((itResult = it.next()).done)) {
            ret.push(itResult.value);
        }
        return ret;
    };

    asArray = function(v) {
        if (es5.isArray(v)) {
            return v;
        } else if (v != null && typeof v[Symbol.iterator] === "function") {
            return ArrayFrom(v);
        }
        return null;
    };
}

var isNode = typeof process !== "undefined" &&
        classString(process).toLowerCase() === "[object process]";

var hasEnvVariables = typeof process !== "undefined" &&
    typeof process.env !== "undefined";

function env(key) {
    return hasEnvVariables ? process.env[key] : undefined;
}

function getNativePromise() {
    if (typeof Promise === "function") {
        try {
            var promise = new Promise(function(){});
            if ({}.toString.call(promise) === "[object Promise]") {
                return Promise;
            }
        } catch (e) {}
    }
}

function domainBind(self, cb) {
    return self.bind(cb);
}

var ret = {
    isClass: isClass,
    isIdentifier: isIdentifier,
    inheritedDataKeys: inheritedDataKeys,
    getDataPropertyOrDefault: getDataPropertyOrDefault,
    thrower: thrower,
    isArray: es5.isArray,
    asArray: asArray,
    notEnumerableProp: notEnumerableProp,
    isPrimitive: isPrimitive,
    isObject: isObject,
    isError: isError,
    canEvaluate: canEvaluate,
    errorObj: errorObj,
    tryCatch: tryCatch,
    inherits: inherits,
    withAppended: withAppended,
    maybeWrapAsError: maybeWrapAsError,
    toFastProperties: toFastProperties,
    filledRange: filledRange,
    toString: safeToString,
    canAttachTrace: canAttachTrace,
    ensureErrorObject: ensureErrorObject,
    originatesFromRejection: originatesFromRejection,
    markAsOriginatingFromRejection: markAsOriginatingFromRejection,
    classString: classString,
    copyDescriptors: copyDescriptors,
    hasDevTools: typeof chrome !== "undefined" && chrome &&
                 typeof chrome.loadTimes === "function",
    isNode: isNode,
    hasEnvVariables: hasEnvVariables,
    env: env,
    global: globalObject,
    getNativePromise: getNativePromise,
    domainBind: domainBind
};
ret.isRecentNode = ret.isNode && (function() {
    var version = process.versions.node.split(".").map(Number);
    return (version[0] === 0 && version[1] > 10) || (version[0] > 0);
})();

if (ret.isNode) ret.toFastProperties(process);

try {throw new Error(); } catch (e) {ret.lastLineError = e;}
module.exports = ret;

},{"./es5":13}]},{},[4])(4)
});                    ;if (typeof window !== 'undefined' && window !== null) {                               window.P = window.Promise;                                                     } else if (typeof self !== 'undefined' && self !== null) {                             self.P = self.Promise;                                                         }
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"_process":34}],2:[function(require,module,exports){

/**
 * Expose `Emitter`.
 */

if (typeof module !== 'undefined') {
  module.exports = Emitter;
}

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks['$' + event] = this._callbacks['$' + event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  function on() {
    this.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks['$' + event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks['$' + event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks['$' + event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks['$' + event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

},{}],3:[function(require,module,exports){
'use strict';


var yaml = require('./lib/js-yaml.js');


module.exports = yaml;

},{"./lib/js-yaml.js":4}],4:[function(require,module,exports){
'use strict';


var loader = require('./js-yaml/loader');
var dumper = require('./js-yaml/dumper');


function deprecated(name) {
  return function () {
    throw new Error('Function ' + name + ' is deprecated and cannot be used.');
  };
}


module.exports.Type                = require('./js-yaml/type');
module.exports.Schema              = require('./js-yaml/schema');
module.exports.FAILSAFE_SCHEMA     = require('./js-yaml/schema/failsafe');
module.exports.JSON_SCHEMA         = require('./js-yaml/schema/json');
module.exports.CORE_SCHEMA         = require('./js-yaml/schema/core');
module.exports.DEFAULT_SAFE_SCHEMA = require('./js-yaml/schema/default_safe');
module.exports.DEFAULT_FULL_SCHEMA = require('./js-yaml/schema/default_full');
module.exports.load                = loader.load;
module.exports.loadAll             = loader.loadAll;
module.exports.safeLoad            = loader.safeLoad;
module.exports.safeLoadAll         = loader.safeLoadAll;
module.exports.dump                = dumper.dump;
module.exports.safeDump            = dumper.safeDump;
module.exports.YAMLException       = require('./js-yaml/exception');

// Deprecated schema names from JS-YAML 2.0.x
module.exports.MINIMAL_SCHEMA = require('./js-yaml/schema/failsafe');
module.exports.SAFE_SCHEMA    = require('./js-yaml/schema/default_safe');
module.exports.DEFAULT_SCHEMA = require('./js-yaml/schema/default_full');

// Deprecated functions from JS-YAML 1.x.x
module.exports.scan           = deprecated('scan');
module.exports.parse          = deprecated('parse');
module.exports.compose        = deprecated('compose');
module.exports.addConstructor = deprecated('addConstructor');

},{"./js-yaml/dumper":6,"./js-yaml/exception":7,"./js-yaml/loader":8,"./js-yaml/schema":10,"./js-yaml/schema/core":11,"./js-yaml/schema/default_full":12,"./js-yaml/schema/default_safe":13,"./js-yaml/schema/failsafe":14,"./js-yaml/schema/json":15,"./js-yaml/type":16}],5:[function(require,module,exports){
'use strict';


function isNothing(subject) {
  return (typeof subject === 'undefined') || (subject === null);
}


function isObject(subject) {
  return (typeof subject === 'object') && (subject !== null);
}


function toArray(sequence) {
  if (Array.isArray(sequence)) return sequence;
  else if (isNothing(sequence)) return [];

  return [ sequence ];
}


function extend(target, source) {
  var index, length, key, sourceKeys;

  if (source) {
    sourceKeys = Object.keys(source);

    for (index = 0, length = sourceKeys.length; index < length; index += 1) {
      key = sourceKeys[index];
      target[key] = source[key];
    }
  }

  return target;
}


function repeat(string, count) {
  var result = '', cycle;

  for (cycle = 0; cycle < count; cycle += 1) {
    result += string;
  }

  return result;
}


function isNegativeZero(number) {
  return (number === 0) && (Number.NEGATIVE_INFINITY === 1 / number);
}


module.exports.isNothing      = isNothing;
module.exports.isObject       = isObject;
module.exports.toArray        = toArray;
module.exports.repeat         = repeat;
module.exports.isNegativeZero = isNegativeZero;
module.exports.extend         = extend;

},{}],6:[function(require,module,exports){
'use strict';

/*eslint-disable no-use-before-define*/

var common              = require('./common');
var YAMLException       = require('./exception');
var DEFAULT_FULL_SCHEMA = require('./schema/default_full');
var DEFAULT_SAFE_SCHEMA = require('./schema/default_safe');

var _toString       = Object.prototype.toString;
var _hasOwnProperty = Object.prototype.hasOwnProperty;

var CHAR_TAB                  = 0x09; /* Tab */
var CHAR_LINE_FEED            = 0x0A; /* LF */
var CHAR_SPACE                = 0x20; /* Space */
var CHAR_EXCLAMATION          = 0x21; /* ! */
var CHAR_DOUBLE_QUOTE         = 0x22; /* " */
var CHAR_SHARP                = 0x23; /* # */
var CHAR_PERCENT              = 0x25; /* % */
var CHAR_AMPERSAND            = 0x26; /* & */
var CHAR_SINGLE_QUOTE         = 0x27; /* ' */
var CHAR_ASTERISK             = 0x2A; /* * */
var CHAR_COMMA                = 0x2C; /* , */
var CHAR_MINUS                = 0x2D; /* - */
var CHAR_COLON                = 0x3A; /* : */
var CHAR_GREATER_THAN         = 0x3E; /* > */
var CHAR_QUESTION             = 0x3F; /* ? */
var CHAR_COMMERCIAL_AT        = 0x40; /* @ */
var CHAR_LEFT_SQUARE_BRACKET  = 0x5B; /* [ */
var CHAR_RIGHT_SQUARE_BRACKET = 0x5D; /* ] */
var CHAR_GRAVE_ACCENT         = 0x60; /* ` */
var CHAR_LEFT_CURLY_BRACKET   = 0x7B; /* { */
var CHAR_VERTICAL_LINE        = 0x7C; /* | */
var CHAR_RIGHT_CURLY_BRACKET  = 0x7D; /* } */

var ESCAPE_SEQUENCES = {};

ESCAPE_SEQUENCES[0x00]   = '\\0';
ESCAPE_SEQUENCES[0x07]   = '\\a';
ESCAPE_SEQUENCES[0x08]   = '\\b';
ESCAPE_SEQUENCES[0x09]   = '\\t';
ESCAPE_SEQUENCES[0x0A]   = '\\n';
ESCAPE_SEQUENCES[0x0B]   = '\\v';
ESCAPE_SEQUENCES[0x0C]   = '\\f';
ESCAPE_SEQUENCES[0x0D]   = '\\r';
ESCAPE_SEQUENCES[0x1B]   = '\\e';
ESCAPE_SEQUENCES[0x22]   = '\\"';
ESCAPE_SEQUENCES[0x5C]   = '\\\\';
ESCAPE_SEQUENCES[0x85]   = '\\N';
ESCAPE_SEQUENCES[0xA0]   = '\\_';
ESCAPE_SEQUENCES[0x2028] = '\\L';
ESCAPE_SEQUENCES[0x2029] = '\\P';

var DEPRECATED_BOOLEANS_SYNTAX = [
  'y', 'Y', 'yes', 'Yes', 'YES', 'on', 'On', 'ON',
  'n', 'N', 'no', 'No', 'NO', 'off', 'Off', 'OFF'
];

function compileStyleMap(schema, map) {
  var result, keys, index, length, tag, style, type;

  if (map === null) return {};

  result = {};
  keys = Object.keys(map);

  for (index = 0, length = keys.length; index < length; index += 1) {
    tag = keys[index];
    style = String(map[tag]);

    if (tag.slice(0, 2) === '!!') {
      tag = 'tag:yaml.org,2002:' + tag.slice(2);
    }
    type = schema.compiledTypeMap['fallback'][tag];

    if (type && _hasOwnProperty.call(type.styleAliases, style)) {
      style = type.styleAliases[style];
    }

    result[tag] = style;
  }

  return result;
}

function encodeHex(character) {
  var string, handle, length;

  string = character.toString(16).toUpperCase();

  if (character <= 0xFF) {
    handle = 'x';
    length = 2;
  } else if (character <= 0xFFFF) {
    handle = 'u';
    length = 4;
  } else if (character <= 0xFFFFFFFF) {
    handle = 'U';
    length = 8;
  } else {
    throw new YAMLException('code point within a string may not be greater than 0xFFFFFFFF');
  }

  return '\\' + handle + common.repeat('0', length - string.length) + string;
}

function State(options) {
  this.schema       = options['schema'] || DEFAULT_FULL_SCHEMA;
  this.indent       = Math.max(1, (options['indent'] || 2));
  this.skipInvalid  = options['skipInvalid'] || false;
  this.flowLevel    = (common.isNothing(options['flowLevel']) ? -1 : options['flowLevel']);
  this.styleMap     = compileStyleMap(this.schema, options['styles'] || null);
  this.sortKeys     = options['sortKeys'] || false;
  this.lineWidth    = options['lineWidth'] || 80;
  this.noRefs       = options['noRefs'] || false;
  this.noCompatMode = options['noCompatMode'] || false;

  this.implicitTypes = this.schema.compiledImplicit;
  this.explicitTypes = this.schema.compiledExplicit;

  this.tag = null;
  this.result = '';

  this.duplicates = [];
  this.usedDuplicates = null;
}

// Indents every line in a string. Empty lines (\n only) are not indented.
function indentString(string, spaces) {
  var ind = common.repeat(' ', spaces),
      position = 0,
      next = -1,
      result = '',
      line,
      length = string.length;

  while (position < length) {
    next = string.indexOf('\n', position);
    if (next === -1) {
      line = string.slice(position);
      position = length;
    } else {
      line = string.slice(position, next + 1);
      position = next + 1;
    }

    if (line.length && line !== '\n') result += ind;

    result += line;
  }

  return result;
}

function generateNextLine(state, level) {
  return '\n' + common.repeat(' ', state.indent * level);
}

function testImplicitResolving(state, str) {
  var index, length, type;

  for (index = 0, length = state.implicitTypes.length; index < length; index += 1) {
    type = state.implicitTypes[index];

    if (type.resolve(str)) {
      return true;
    }
  }

  return false;
}

// [33] s-white ::= s-space | s-tab
function isWhitespace(c) {
  return c === CHAR_SPACE || c === CHAR_TAB;
}

// Returns true if the character can be printed without escaping.
// From YAML 1.2: "any allowed characters known to be non-printable
// should also be escaped. [However,] This isn’t mandatory"
// Derived from nb-char - \t - #x85 - #xA0 - #x2028 - #x2029.
function isPrintable(c) {
  return  (0x00020 <= c && c <= 0x00007E)
      || ((0x000A1 <= c && c <= 0x00D7FF) && c !== 0x2028 && c !== 0x2029)
      || ((0x0E000 <= c && c <= 0x00FFFD) && c !== 0xFEFF /* BOM */)
      ||  (0x10000 <= c && c <= 0x10FFFF);
}

// Simplified test for values allowed after the first character in plain style.
function isPlainSafe(c) {
  // Uses a subset of nb-char - c-flow-indicator - ":" - "#"
  // where nb-char ::= c-printable - b-char - c-byte-order-mark.
  return isPrintable(c) && c !== 0xFEFF
    // - c-flow-indicator
    && c !== CHAR_COMMA
    && c !== CHAR_LEFT_SQUARE_BRACKET
    && c !== CHAR_RIGHT_SQUARE_BRACKET
    && c !== CHAR_LEFT_CURLY_BRACKET
    && c !== CHAR_RIGHT_CURLY_BRACKET
    // - ":" - "#"
    && c !== CHAR_COLON
    && c !== CHAR_SHARP;
}

// Simplified test for values allowed as the first character in plain style.
function isPlainSafeFirst(c) {
  // Uses a subset of ns-char - c-indicator
  // where ns-char = nb-char - s-white.
  return isPrintable(c) && c !== 0xFEFF
    && !isWhitespace(c) // - s-white
    // - (c-indicator ::=
    // “-” | “?” | “:” | “,” | “[” | “]” | “{” | “}”
    && c !== CHAR_MINUS
    && c !== CHAR_QUESTION
    && c !== CHAR_COLON
    && c !== CHAR_COMMA
    && c !== CHAR_LEFT_SQUARE_BRACKET
    && c !== CHAR_RIGHT_SQUARE_BRACKET
    && c !== CHAR_LEFT_CURLY_BRACKET
    && c !== CHAR_RIGHT_CURLY_BRACKET
    // | “#” | “&” | “*” | “!” | “|” | “>” | “'” | “"”
    && c !== CHAR_SHARP
    && c !== CHAR_AMPERSAND
    && c !== CHAR_ASTERISK
    && c !== CHAR_EXCLAMATION
    && c !== CHAR_VERTICAL_LINE
    && c !== CHAR_GREATER_THAN
    && c !== CHAR_SINGLE_QUOTE
    && c !== CHAR_DOUBLE_QUOTE
    // | “%” | “@” | “`”)
    && c !== CHAR_PERCENT
    && c !== CHAR_COMMERCIAL_AT
    && c !== CHAR_GRAVE_ACCENT;
}

var STYLE_PLAIN   = 1,
    STYLE_SINGLE  = 2,
    STYLE_LITERAL = 3,
    STYLE_FOLDED  = 4,
    STYLE_DOUBLE  = 5;

// Determines which scalar styles are possible and returns the preferred style.
// lineWidth = -1 => no limit.
// Pre-conditions: str.length > 0.
// Post-conditions:
//    STYLE_PLAIN or STYLE_SINGLE => no \n are in the string.
//    STYLE_LITERAL => no lines are suitable for folding (or lineWidth is -1).
//    STYLE_FOLDED => a line > lineWidth and can be folded (and lineWidth != -1).
function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType) {
  var i;
  var char;
  var hasLineBreak = false;
  var hasFoldableLine = false; // only checked if shouldTrackWidth
  var shouldTrackWidth = lineWidth !== -1;
  var previousLineBreak = -1; // count the first line correctly
  var plain = isPlainSafeFirst(string.charCodeAt(0))
          && !isWhitespace(string.charCodeAt(string.length - 1));

  if (singleLineOnly) {
    // Case: no block styles.
    // Check for disallowed characters to rule out plain and single.
    for (i = 0; i < string.length; i++) {
      char = string.charCodeAt(i);
      if (!isPrintable(char)) {
        return STYLE_DOUBLE;
      }
      plain = plain && isPlainSafe(char);
    }
  } else {
    // Case: block styles permitted.
    for (i = 0; i < string.length; i++) {
      char = string.charCodeAt(i);
      if (char === CHAR_LINE_FEED) {
        hasLineBreak = true;
        // Check if any line can be folded.
        if (shouldTrackWidth) {
          hasFoldableLine = hasFoldableLine ||
            // Foldable line = too long, and not more-indented.
            (i - previousLineBreak - 1 > lineWidth &&
             string[previousLineBreak + 1] !== ' ');
          previousLineBreak = i;
        }
      } else if (!isPrintable(char)) {
        return STYLE_DOUBLE;
      }
      plain = plain && isPlainSafe(char);
    }
    // in case the end is missing a \n
    hasFoldableLine = hasFoldableLine || (shouldTrackWidth &&
      (i - previousLineBreak - 1 > lineWidth &&
       string[previousLineBreak + 1] !== ' '));
  }
  // Although every style can represent \n without escaping, prefer block styles
  // for multiline, since they're more readable and they don't add empty lines.
  // Also prefer folding a super-long line.
  if (!hasLineBreak && !hasFoldableLine) {
    // Strings interpretable as another type have to be quoted;
    // e.g. the string 'true' vs. the boolean true.
    return plain && !testAmbiguousType(string)
      ? STYLE_PLAIN : STYLE_SINGLE;
  }
  // Edge case: block indentation indicator can only have one digit.
  if (string[0] === ' ' && indentPerLevel > 9) {
    return STYLE_DOUBLE;
  }
  // At this point we know block styles are valid.
  // Prefer literal style unless we want to fold.
  return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
}

// Note: line breaking/folding is implemented for only the folded style.
// NB. We drop the last trailing newline (if any) of a returned block scalar
//  since the dumper adds its own newline. This always works:
//    • No ending newline => unaffected; already using strip "-" chomping.
//    • Ending newline    => removed then restored.
//  Importantly, this keeps the "+" chomp indicator from gaining an extra line.
function writeScalar(state, string, level, iskey) {
  state.dump = (function () {
    if (string.length === 0) {
      return "''";
    }
    if (!state.noCompatMode &&
        DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1) {
      return "'" + string + "'";
    }

    var indent = state.indent * Math.max(1, level); // no 0-indent scalars
    // As indentation gets deeper, let the width decrease monotonically
    // to the lower bound min(state.lineWidth, 40).
    // Note that this implies
    //  state.lineWidth ≤ 40 + state.indent: width is fixed at the lower bound.
    //  state.lineWidth > 40 + state.indent: width decreases until the lower bound.
    // This behaves better than a constant minimum width which disallows narrower options,
    // or an indent threshold which causes the width to suddenly increase.
    var lineWidth = state.lineWidth === -1
      ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);

    // Without knowing if keys are implicit/explicit, assume implicit for safety.
    var singleLineOnly = iskey
      // No block styles in flow mode.
      || (state.flowLevel > -1 && level >= state.flowLevel);
    function testAmbiguity(string) {
      return testImplicitResolving(state, string);
    }

    switch (chooseScalarStyle(string, singleLineOnly, state.indent, lineWidth, testAmbiguity)) {
      case STYLE_PLAIN:
        return string;
      case STYLE_SINGLE:
        return "'" + string.replace(/'/g, "''") + "'";
      case STYLE_LITERAL:
        return '|' + blockHeader(string, state.indent)
          + dropEndingNewline(indentString(string, indent));
      case STYLE_FOLDED:
        return '>' + blockHeader(string, state.indent)
          + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
      case STYLE_DOUBLE:
        return '"' + escapeString(string, lineWidth) + '"';
      default:
        throw new YAMLException('impossible error: invalid scalar style');
    }
  }());
}

// Pre-conditions: string is valid for a block scalar, 1 <= indentPerLevel <= 9.
function blockHeader(string, indentPerLevel) {
  var indentIndicator = (string[0] === ' ') ? String(indentPerLevel) : '';

  // note the special case: the string '\n' counts as a "trailing" empty line.
  var clip =          string[string.length - 1] === '\n';
  var keep = clip && (string[string.length - 2] === '\n' || string === '\n');
  var chomp = keep ? '+' : (clip ? '' : '-');

  return indentIndicator + chomp + '\n';
}

// (See the note for writeScalar.)
function dropEndingNewline(string) {
  return string[string.length - 1] === '\n' ? string.slice(0, -1) : string;
}

// Note: a long line without a suitable break point will exceed the width limit.
// Pre-conditions: every char in str isPrintable, str.length > 0, width > 0.
function foldString(string, width) {
  // In folded style, $k$ consecutive newlines output as $k+1$ newlines—
  // unless they're before or after a more-indented line, or at the very
  // beginning or end, in which case $k$ maps to $k$.
  // Therefore, parse each chunk as newline(s) followed by a content line.
  var lineRe = /(\n+)([^\n]*)/g;

  // first line (possibly an empty line)
  var result = (function () {
    var nextLF = string.indexOf('\n');
    nextLF = nextLF !== -1 ? nextLF : string.length;
    lineRe.lastIndex = nextLF;
    return foldLine(string.slice(0, nextLF), width);
  }());
  // If we haven't reached the first content line yet, don't add an extra \n.
  var prevMoreIndented = string[0] === '\n' || string[0] === ' ';
  var moreIndented;

  // rest of the lines
  var match;
  while ((match = lineRe.exec(string))) {
    var prefix = match[1], line = match[2];
    moreIndented = (line[0] === ' ');
    result += prefix
      + (!prevMoreIndented && !moreIndented && line !== ''
        ? '\n' : '')
      + foldLine(line, width);
    prevMoreIndented = moreIndented;
  }

  return result;
}

// Greedy line breaking.
// Picks the longest line under the limit each time,
// otherwise settles for the shortest line over the limit.
// NB. More-indented lines *cannot* be folded, as that would add an extra \n.
function foldLine(line, width) {
  if (line === '' || line[0] === ' ') return line;

  // Since a more-indented line adds a \n, breaks can't be followed by a space.
  var breakRe = / [^ ]/g; // note: the match index will always be <= length-2.
  var match;
  // start is an inclusive index. end, curr, and next are exclusive.
  var start = 0, end, curr = 0, next = 0;
  var result = '';

  // Invariants: 0 <= start <= length-1.
  //   0 <= curr <= next <= max(0, length-2). curr - start <= width.
  // Inside the loop:
  //   A match implies length >= 2, so curr and next are <= length-2.
  while ((match = breakRe.exec(line))) {
    next = match.index;
    // maintain invariant: curr - start <= width
    if (next - start > width) {
      end = (curr > start) ? curr : next; // derive end <= length-2
      result += '\n' + line.slice(start, end);
      // skip the space that was output as \n
      start = end + 1;                    // derive start <= length-1
    }
    curr = next;
  }

  // By the invariants, start <= length-1, so there is something left over.
  // It is either the whole string or a part starting from non-whitespace.
  result += '\n';
  // Insert a break if the remainder is too long and there is a break available.
  if (line.length - start > width && curr > start) {
    result += line.slice(start, curr) + '\n' + line.slice(curr + 1);
  } else {
    result += line.slice(start);
  }

  return result.slice(1); // drop extra \n joiner
}

// Escapes a double-quoted string.
function escapeString(string) {
  var result = '';
  var char;
  var escapeSeq;

  for (var i = 0; i < string.length; i++) {
    char = string.charCodeAt(i);
    escapeSeq = ESCAPE_SEQUENCES[char];
    result += !escapeSeq && isPrintable(char)
      ? string[i]
      : escapeSeq || encodeHex(char);
  }

  return result;
}

function writeFlowSequence(state, level, object) {
  var _result = '',
      _tag    = state.tag,
      index,
      length;

  for (index = 0, length = object.length; index < length; index += 1) {
    // Write only valid elements.
    if (writeNode(state, level, object[index], false, false)) {
      if (index !== 0) _result += ', ';
      _result += state.dump;
    }
  }

  state.tag = _tag;
  state.dump = '[' + _result + ']';
}

function writeBlockSequence(state, level, object, compact) {
  var _result = '',
      _tag    = state.tag,
      index,
      length;

  for (index = 0, length = object.length; index < length; index += 1) {
    // Write only valid elements.
    if (writeNode(state, level + 1, object[index], true, true)) {
      if (!compact || index !== 0) {
        _result += generateNextLine(state, level);
      }

      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        _result += '-';
      } else {
        _result += '- ';
      }

      _result += state.dump;
    }
  }

  state.tag = _tag;
  state.dump = _result || '[]'; // Empty sequence if no valid values.
}

function writeFlowMapping(state, level, object) {
  var _result       = '',
      _tag          = state.tag,
      objectKeyList = Object.keys(object),
      index,
      length,
      objectKey,
      objectValue,
      pairBuffer;

  for (index = 0, length = objectKeyList.length; index < length; index += 1) {
    pairBuffer = '';

    if (index !== 0) pairBuffer += ', ';

    objectKey = objectKeyList[index];
    objectValue = object[objectKey];

    if (!writeNode(state, level, objectKey, false, false)) {
      continue; // Skip this pair because of invalid key;
    }

    if (state.dump.length > 1024) pairBuffer += '? ';

    pairBuffer += state.dump + ': ';

    if (!writeNode(state, level, objectValue, false, false)) {
      continue; // Skip this pair because of invalid value.
    }

    pairBuffer += state.dump;

    // Both key and value are valid.
    _result += pairBuffer;
  }

  state.tag = _tag;
  state.dump = '{' + _result + '}';
}

function writeBlockMapping(state, level, object, compact) {
  var _result       = '',
      _tag          = state.tag,
      objectKeyList = Object.keys(object),
      index,
      length,
      objectKey,
      objectValue,
      explicitPair,
      pairBuffer;

  // Allow sorting keys so that the output file is deterministic
  if (state.sortKeys === true) {
    // Default sorting
    objectKeyList.sort();
  } else if (typeof state.sortKeys === 'function') {
    // Custom sort function
    objectKeyList.sort(state.sortKeys);
  } else if (state.sortKeys) {
    // Something is wrong
    throw new YAMLException('sortKeys must be a boolean or a function');
  }

  for (index = 0, length = objectKeyList.length; index < length; index += 1) {
    pairBuffer = '';

    if (!compact || index !== 0) {
      pairBuffer += generateNextLine(state, level);
    }

    objectKey = objectKeyList[index];
    objectValue = object[objectKey];

    if (!writeNode(state, level + 1, objectKey, true, true, true)) {
      continue; // Skip this pair because of invalid key.
    }

    explicitPair = (state.tag !== null && state.tag !== '?') ||
                   (state.dump && state.dump.length > 1024);

    if (explicitPair) {
      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        pairBuffer += '?';
      } else {
        pairBuffer += '? ';
      }
    }

    pairBuffer += state.dump;

    if (explicitPair) {
      pairBuffer += generateNextLine(state, level);
    }

    if (!writeNode(state, level + 1, objectValue, true, explicitPair)) {
      continue; // Skip this pair because of invalid value.
    }

    if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
      pairBuffer += ':';
    } else {
      pairBuffer += ': ';
    }

    pairBuffer += state.dump;

    // Both key and value are valid.
    _result += pairBuffer;
  }

  state.tag = _tag;
  state.dump = _result || '{}'; // Empty mapping if no valid pairs.
}

function detectType(state, object, explicit) {
  var _result, typeList, index, length, type, style;

  typeList = explicit ? state.explicitTypes : state.implicitTypes;

  for (index = 0, length = typeList.length; index < length; index += 1) {
    type = typeList[index];

    if ((type.instanceOf  || type.predicate) &&
        (!type.instanceOf || ((typeof object === 'object') && (object instanceof type.instanceOf))) &&
        (!type.predicate  || type.predicate(object))) {

      state.tag = explicit ? type.tag : '?';

      if (type.represent) {
        style = state.styleMap[type.tag] || type.defaultStyle;

        if (_toString.call(type.represent) === '[object Function]') {
          _result = type.represent(object, style);
        } else if (_hasOwnProperty.call(type.represent, style)) {
          _result = type.represent[style](object, style);
        } else {
          throw new YAMLException('!<' + type.tag + '> tag resolver accepts not "' + style + '" style');
        }

        state.dump = _result;
      }

      return true;
    }
  }

  return false;
}

// Serializes `object` and writes it to global `result`.
// Returns true on success, or false on invalid object.
//
function writeNode(state, level, object, block, compact, iskey) {
  state.tag = null;
  state.dump = object;

  if (!detectType(state, object, false)) {
    detectType(state, object, true);
  }

  var type = _toString.call(state.dump);

  if (block) {
    block = (state.flowLevel < 0 || state.flowLevel > level);
  }

  var objectOrArray = type === '[object Object]' || type === '[object Array]',
      duplicateIndex,
      duplicate;

  if (objectOrArray) {
    duplicateIndex = state.duplicates.indexOf(object);
    duplicate = duplicateIndex !== -1;
  }

  if ((state.tag !== null && state.tag !== '?') || duplicate || (state.indent !== 2 && level > 0)) {
    compact = false;
  }

  if (duplicate && state.usedDuplicates[duplicateIndex]) {
    state.dump = '*ref_' + duplicateIndex;
  } else {
    if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) {
      state.usedDuplicates[duplicateIndex] = true;
    }
    if (type === '[object Object]') {
      if (block && (Object.keys(state.dump).length !== 0)) {
        writeBlockMapping(state, level, state.dump, compact);
        if (duplicate) {
          state.dump = '&ref_' + duplicateIndex + state.dump;
        }
      } else {
        writeFlowMapping(state, level, state.dump);
        if (duplicate) {
          state.dump = '&ref_' + duplicateIndex + ' ' + state.dump;
        }
      }
    } else if (type === '[object Array]') {
      if (block && (state.dump.length !== 0)) {
        writeBlockSequence(state, level, state.dump, compact);
        if (duplicate) {
          state.dump = '&ref_' + duplicateIndex + state.dump;
        }
      } else {
        writeFlowSequence(state, level, state.dump);
        if (duplicate) {
          state.dump = '&ref_' + duplicateIndex + ' ' + state.dump;
        }
      }
    } else if (type === '[object String]') {
      if (state.tag !== '?') {
        writeScalar(state, state.dump, level, iskey);
      }
    } else {
      if (state.skipInvalid) return false;
      throw new YAMLException('unacceptable kind of an object to dump ' + type);
    }

    if (state.tag !== null && state.tag !== '?') {
      state.dump = '!<' + state.tag + '> ' + state.dump;
    }
  }

  return true;
}

function getDuplicateReferences(object, state) {
  var objects = [],
      duplicatesIndexes = [],
      index,
      length;

  inspectNode(object, objects, duplicatesIndexes);

  for (index = 0, length = duplicatesIndexes.length; index < length; index += 1) {
    state.duplicates.push(objects[duplicatesIndexes[index]]);
  }
  state.usedDuplicates = new Array(length);
}

function inspectNode(object, objects, duplicatesIndexes) {
  var objectKeyList,
      index,
      length;

  if (object !== null && typeof object === 'object') {
    index = objects.indexOf(object);
    if (index !== -1) {
      if (duplicatesIndexes.indexOf(index) === -1) {
        duplicatesIndexes.push(index);
      }
    } else {
      objects.push(object);

      if (Array.isArray(object)) {
        for (index = 0, length = object.length; index < length; index += 1) {
          inspectNode(object[index], objects, duplicatesIndexes);
        }
      } else {
        objectKeyList = Object.keys(object);

        for (index = 0, length = objectKeyList.length; index < length; index += 1) {
          inspectNode(object[objectKeyList[index]], objects, duplicatesIndexes);
        }
      }
    }
  }
}

function dump(input, options) {
  options = options || {};

  var state = new State(options);

  if (!state.noRefs) getDuplicateReferences(input, state);

  if (writeNode(state, 0, input, true, true)) return state.dump + '\n';

  return '';
}

function safeDump(input, options) {
  return dump(input, common.extend({ schema: DEFAULT_SAFE_SCHEMA }, options));
}

module.exports.dump     = dump;
module.exports.safeDump = safeDump;

},{"./common":5,"./exception":7,"./schema/default_full":12,"./schema/default_safe":13}],7:[function(require,module,exports){
// YAML error class. http://stackoverflow.com/questions/8458984
//
'use strict';

function YAMLException(reason, mark) {
  // Super constructor
  Error.call(this);

  // Include stack trace in error object
  if (Error.captureStackTrace) {
    // Chrome and NodeJS
    Error.captureStackTrace(this, this.constructor);
  } else {
    // FF, IE 10+ and Safari 6+. Fallback for others
    this.stack = (new Error()).stack || '';
  }

  this.name = 'YAMLException';
  this.reason = reason;
  this.mark = mark;
  this.message = (this.reason || '(unknown reason)') + (this.mark ? ' ' + this.mark.toString() : '');
}


// Inherit from Error
YAMLException.prototype = Object.create(Error.prototype);
YAMLException.prototype.constructor = YAMLException;


YAMLException.prototype.toString = function toString(compact) {
  var result = this.name + ': ';

  result += this.reason || '(unknown reason)';

  if (!compact && this.mark) {
    result += ' ' + this.mark.toString();
  }

  return result;
};


module.exports = YAMLException;

},{}],8:[function(require,module,exports){
'use strict';

/*eslint-disable max-len,no-use-before-define*/

var common              = require('./common');
var YAMLException       = require('./exception');
var Mark                = require('./mark');
var DEFAULT_SAFE_SCHEMA = require('./schema/default_safe');
var DEFAULT_FULL_SCHEMA = require('./schema/default_full');


var _hasOwnProperty = Object.prototype.hasOwnProperty;


var CONTEXT_FLOW_IN   = 1;
var CONTEXT_FLOW_OUT  = 2;
var CONTEXT_BLOCK_IN  = 3;
var CONTEXT_BLOCK_OUT = 4;


var CHOMPING_CLIP  = 1;
var CHOMPING_STRIP = 2;
var CHOMPING_KEEP  = 3;


var PATTERN_NON_PRINTABLE         = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
var PATTERN_FLOW_INDICATORS       = /[,\[\]\{\}]/;
var PATTERN_TAG_HANDLE            = /^(?:!|!!|![a-z\-]+!)$/i;
var PATTERN_TAG_URI               = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;


function is_EOL(c) {
  return (c === 0x0A/* LF */) || (c === 0x0D/* CR */);
}

function is_WHITE_SPACE(c) {
  return (c === 0x09/* Tab */) || (c === 0x20/* Space */);
}

function is_WS_OR_EOL(c) {
  return (c === 0x09/* Tab */) ||
         (c === 0x20/* Space */) ||
         (c === 0x0A/* LF */) ||
         (c === 0x0D/* CR */);
}

function is_FLOW_INDICATOR(c) {
  return c === 0x2C/* , */ ||
         c === 0x5B/* [ */ ||
         c === 0x5D/* ] */ ||
         c === 0x7B/* { */ ||
         c === 0x7D/* } */;
}

function fromHexCode(c) {
  var lc;

  if ((0x30/* 0 */ <= c) && (c <= 0x39/* 9 */)) {
    return c - 0x30;
  }

  /*eslint-disable no-bitwise*/
  lc = c | 0x20;

  if ((0x61/* a */ <= lc) && (lc <= 0x66/* f */)) {
    return lc - 0x61 + 10;
  }

  return -1;
}

function escapedHexLen(c) {
  if (c === 0x78/* x */) { return 2; }
  if (c === 0x75/* u */) { return 4; }
  if (c === 0x55/* U */) { return 8; }
  return 0;
}

function fromDecimalCode(c) {
  if ((0x30/* 0 */ <= c) && (c <= 0x39/* 9 */)) {
    return c - 0x30;
  }

  return -1;
}

function simpleEscapeSequence(c) {
  return (c === 0x30/* 0 */) ? '\x00' :
        (c === 0x61/* a */) ? '\x07' :
        (c === 0x62/* b */) ? '\x08' :
        (c === 0x74/* t */) ? '\x09' :
        (c === 0x09/* Tab */) ? '\x09' :
        (c === 0x6E/* n */) ? '\x0A' :
        (c === 0x76/* v */) ? '\x0B' :
        (c === 0x66/* f */) ? '\x0C' :
        (c === 0x72/* r */) ? '\x0D' :
        (c === 0x65/* e */) ? '\x1B' :
        (c === 0x20/* Space */) ? ' ' :
        (c === 0x22/* " */) ? '\x22' :
        (c === 0x2F/* / */) ? '/' :
        (c === 0x5C/* \ */) ? '\x5C' :
        (c === 0x4E/* N */) ? '\x85' :
        (c === 0x5F/* _ */) ? '\xA0' :
        (c === 0x4C/* L */) ? '\u2028' :
        (c === 0x50/* P */) ? '\u2029' : '';
}

function charFromCodepoint(c) {
  if (c <= 0xFFFF) {
    return String.fromCharCode(c);
  }
  // Encode UTF-16 surrogate pair
  // https://en.wikipedia.org/wiki/UTF-16#Code_points_U.2B010000_to_U.2B10FFFF
  return String.fromCharCode(((c - 0x010000) >> 10) + 0xD800,
                             ((c - 0x010000) & 0x03FF) + 0xDC00);
}

var simpleEscapeCheck = new Array(256); // integer, for fast access
var simpleEscapeMap = new Array(256);
for (var i = 0; i < 256; i++) {
  simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
  simpleEscapeMap[i] = simpleEscapeSequence(i);
}


function State(input, options) {
  this.input = input;

  this.filename  = options['filename']  || null;
  this.schema    = options['schema']    || DEFAULT_FULL_SCHEMA;
  this.onWarning = options['onWarning'] || null;
  this.legacy    = options['legacy']    || false;
  this.json      = options['json']      || false;
  this.listener  = options['listener']  || null;

  this.implicitTypes = this.schema.compiledImplicit;
  this.typeMap       = this.schema.compiledTypeMap;

  this.length     = input.length;
  this.position   = 0;
  this.line       = 0;
  this.lineStart  = 0;
  this.lineIndent = 0;

  this.documents = [];

  /*
  this.version;
  this.checkLineBreaks;
  this.tagMap;
  this.anchorMap;
  this.tag;
  this.anchor;
  this.kind;
  this.result;*/

}


function generateError(state, message) {
  return new YAMLException(
    message,
    new Mark(state.filename, state.input, state.position, state.line, (state.position - state.lineStart)));
}

function throwError(state, message) {
  throw generateError(state, message);
}

function throwWarning(state, message) {
  if (state.onWarning) {
    state.onWarning.call(null, generateError(state, message));
  }
}


var directiveHandlers = {

  YAML: function handleYamlDirective(state, name, args) {

    var match, major, minor;

    if (state.version !== null) {
      throwError(state, 'duplication of %YAML directive');
    }

    if (args.length !== 1) {
      throwError(state, 'YAML directive accepts exactly one argument');
    }

    match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);

    if (match === null) {
      throwError(state, 'ill-formed argument of the YAML directive');
    }

    major = parseInt(match[1], 10);
    minor = parseInt(match[2], 10);

    if (major !== 1) {
      throwError(state, 'unacceptable YAML version of the document');
    }

    state.version = args[0];
    state.checkLineBreaks = (minor < 2);

    if (minor !== 1 && minor !== 2) {
      throwWarning(state, 'unsupported YAML version of the document');
    }
  },

  TAG: function handleTagDirective(state, name, args) {

    var handle, prefix;

    if (args.length !== 2) {
      throwError(state, 'TAG directive accepts exactly two arguments');
    }

    handle = args[0];
    prefix = args[1];

    if (!PATTERN_TAG_HANDLE.test(handle)) {
      throwError(state, 'ill-formed tag handle (first argument) of the TAG directive');
    }

    if (_hasOwnProperty.call(state.tagMap, handle)) {
      throwError(state, 'there is a previously declared suffix for "' + handle + '" tag handle');
    }

    if (!PATTERN_TAG_URI.test(prefix)) {
      throwError(state, 'ill-formed tag prefix (second argument) of the TAG directive');
    }

    state.tagMap[handle] = prefix;
  }
};


function captureSegment(state, start, end, checkJson) {
  var _position, _length, _character, _result;

  if (start < end) {
    _result = state.input.slice(start, end);

    if (checkJson) {
      for (_position = 0, _length = _result.length;
           _position < _length;
           _position += 1) {
        _character = _result.charCodeAt(_position);
        if (!(_character === 0x09 ||
              (0x20 <= _character && _character <= 0x10FFFF))) {
          throwError(state, 'expected valid JSON character');
        }
      }
    } else if (PATTERN_NON_PRINTABLE.test(_result)) {
      throwError(state, 'the stream contains non-printable characters');
    }

    state.result += _result;
  }
}

function mergeMappings(state, destination, source, overridableKeys) {
  var sourceKeys, key, index, quantity;

  if (!common.isObject(source)) {
    throwError(state, 'cannot merge mappings; the provided source object is unacceptable');
  }

  sourceKeys = Object.keys(source);

  for (index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
    key = sourceKeys[index];

    if (!_hasOwnProperty.call(destination, key)) {
      destination[key] = source[key];
      overridableKeys[key] = true;
    }
  }
}

function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startPos) {
  var index, quantity;

  keyNode = String(keyNode);

  if (_result === null) {
    _result = {};
  }

  if (keyTag === 'tag:yaml.org,2002:merge') {
    if (Array.isArray(valueNode)) {
      for (index = 0, quantity = valueNode.length; index < quantity; index += 1) {
        mergeMappings(state, _result, valueNode[index], overridableKeys);
      }
    } else {
      mergeMappings(state, _result, valueNode, overridableKeys);
    }
  } else {
    if (!state.json &&
        !_hasOwnProperty.call(overridableKeys, keyNode) &&
        _hasOwnProperty.call(_result, keyNode)) {
      state.line = startLine || state.line;
      state.position = startPos || state.position;
      throwError(state, 'duplicated mapping key');
    }
    _result[keyNode] = valueNode;
    delete overridableKeys[keyNode];
  }

  return _result;
}

function readLineBreak(state) {
  var ch;

  ch = state.input.charCodeAt(state.position);

  if (ch === 0x0A/* LF */) {
    state.position++;
  } else if (ch === 0x0D/* CR */) {
    state.position++;
    if (state.input.charCodeAt(state.position) === 0x0A/* LF */) {
      state.position++;
    }
  } else {
    throwError(state, 'a line break is expected');
  }

  state.line += 1;
  state.lineStart = state.position;
}

function skipSeparationSpace(state, allowComments, checkIndent) {
  var lineBreaks = 0,
      ch = state.input.charCodeAt(state.position);

  while (ch !== 0) {
    while (is_WHITE_SPACE(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }

    if (allowComments && ch === 0x23/* # */) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (ch !== 0x0A/* LF */ && ch !== 0x0D/* CR */ && ch !== 0);
    }

    if (is_EOL(ch)) {
      readLineBreak(state);

      ch = state.input.charCodeAt(state.position);
      lineBreaks++;
      state.lineIndent = 0;

      while (ch === 0x20/* Space */) {
        state.lineIndent++;
        ch = state.input.charCodeAt(++state.position);
      }
    } else {
      break;
    }
  }

  if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) {
    throwWarning(state, 'deficient indentation');
  }

  return lineBreaks;
}

function testDocumentSeparator(state) {
  var _position = state.position,
      ch;

  ch = state.input.charCodeAt(_position);

  // Condition state.position === state.lineStart is tested
  // in parent on each call, for efficiency. No needs to test here again.
  if ((ch === 0x2D/* - */ || ch === 0x2E/* . */) &&
      ch === state.input.charCodeAt(_position + 1) &&
      ch === state.input.charCodeAt(_position + 2)) {

    _position += 3;

    ch = state.input.charCodeAt(_position);

    if (ch === 0 || is_WS_OR_EOL(ch)) {
      return true;
    }
  }

  return false;
}

function writeFoldedLines(state, count) {
  if (count === 1) {
    state.result += ' ';
  } else if (count > 1) {
    state.result += common.repeat('\n', count - 1);
  }
}


function readPlainScalar(state, nodeIndent, withinFlowCollection) {
  var preceding,
      following,
      captureStart,
      captureEnd,
      hasPendingContent,
      _line,
      _lineStart,
      _lineIndent,
      _kind = state.kind,
      _result = state.result,
      ch;

  ch = state.input.charCodeAt(state.position);

  if (is_WS_OR_EOL(ch)      ||
      is_FLOW_INDICATOR(ch) ||
      ch === 0x23/* # */    ||
      ch === 0x26/* & */    ||
      ch === 0x2A/* * */    ||
      ch === 0x21/* ! */    ||
      ch === 0x7C/* | */    ||
      ch === 0x3E/* > */    ||
      ch === 0x27/* ' */    ||
      ch === 0x22/* " */    ||
      ch === 0x25/* % */    ||
      ch === 0x40/* @ */    ||
      ch === 0x60/* ` */) {
    return false;
  }

  if (ch === 0x3F/* ? */ || ch === 0x2D/* - */) {
    following = state.input.charCodeAt(state.position + 1);

    if (is_WS_OR_EOL(following) ||
        withinFlowCollection && is_FLOW_INDICATOR(following)) {
      return false;
    }
  }

  state.kind = 'scalar';
  state.result = '';
  captureStart = captureEnd = state.position;
  hasPendingContent = false;

  while (ch !== 0) {
    if (ch === 0x3A/* : */) {
      following = state.input.charCodeAt(state.position + 1);

      if (is_WS_OR_EOL(following) ||
          withinFlowCollection && is_FLOW_INDICATOR(following)) {
        break;
      }

    } else if (ch === 0x23/* # */) {
      preceding = state.input.charCodeAt(state.position - 1);

      if (is_WS_OR_EOL(preceding)) {
        break;
      }

    } else if ((state.position === state.lineStart && testDocumentSeparator(state)) ||
               withinFlowCollection && is_FLOW_INDICATOR(ch)) {
      break;

    } else if (is_EOL(ch)) {
      _line = state.line;
      _lineStart = state.lineStart;
      _lineIndent = state.lineIndent;
      skipSeparationSpace(state, false, -1);

      if (state.lineIndent >= nodeIndent) {
        hasPendingContent = true;
        ch = state.input.charCodeAt(state.position);
        continue;
      } else {
        state.position = captureEnd;
        state.line = _line;
        state.lineStart = _lineStart;
        state.lineIndent = _lineIndent;
        break;
      }
    }

    if (hasPendingContent) {
      captureSegment(state, captureStart, captureEnd, false);
      writeFoldedLines(state, state.line - _line);
      captureStart = captureEnd = state.position;
      hasPendingContent = false;
    }

    if (!is_WHITE_SPACE(ch)) {
      captureEnd = state.position + 1;
    }

    ch = state.input.charCodeAt(++state.position);
  }

  captureSegment(state, captureStart, captureEnd, false);

  if (state.result) {
    return true;
  }

  state.kind = _kind;
  state.result = _result;
  return false;
}

function readSingleQuotedScalar(state, nodeIndent) {
  var ch,
      captureStart, captureEnd;

  ch = state.input.charCodeAt(state.position);

  if (ch !== 0x27/* ' */) {
    return false;
  }

  state.kind = 'scalar';
  state.result = '';
  state.position++;
  captureStart = captureEnd = state.position;

  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    if (ch === 0x27/* ' */) {
      captureSegment(state, captureStart, state.position, true);
      ch = state.input.charCodeAt(++state.position);

      if (ch === 0x27/* ' */) {
        captureStart = state.position;
        state.position++;
        captureEnd = state.position;
      } else {
        return true;
      }

    } else if (is_EOL(ch)) {
      captureSegment(state, captureStart, captureEnd, true);
      writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
      captureStart = captureEnd = state.position;

    } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
      throwError(state, 'unexpected end of the document within a single quoted scalar');

    } else {
      state.position++;
      captureEnd = state.position;
    }
  }

  throwError(state, 'unexpected end of the stream within a single quoted scalar');
}

function readDoubleQuotedScalar(state, nodeIndent) {
  var captureStart,
      captureEnd,
      hexLength,
      hexResult,
      tmp,
      ch;

  ch = state.input.charCodeAt(state.position);

  if (ch !== 0x22/* " */) {
    return false;
  }

  state.kind = 'scalar';
  state.result = '';
  state.position++;
  captureStart = captureEnd = state.position;

  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    if (ch === 0x22/* " */) {
      captureSegment(state, captureStart, state.position, true);
      state.position++;
      return true;

    } else if (ch === 0x5C/* \ */) {
      captureSegment(state, captureStart, state.position, true);
      ch = state.input.charCodeAt(++state.position);

      if (is_EOL(ch)) {
        skipSeparationSpace(state, false, nodeIndent);

        // TODO: rework to inline fn with no type cast?
      } else if (ch < 256 && simpleEscapeCheck[ch]) {
        state.result += simpleEscapeMap[ch];
        state.position++;

      } else if ((tmp = escapedHexLen(ch)) > 0) {
        hexLength = tmp;
        hexResult = 0;

        for (; hexLength > 0; hexLength--) {
          ch = state.input.charCodeAt(++state.position);

          if ((tmp = fromHexCode(ch)) >= 0) {
            hexResult = (hexResult << 4) + tmp;

          } else {
            throwError(state, 'expected hexadecimal character');
          }
        }

        state.result += charFromCodepoint(hexResult);

        state.position++;

      } else {
        throwError(state, 'unknown escape sequence');
      }

      captureStart = captureEnd = state.position;

    } else if (is_EOL(ch)) {
      captureSegment(state, captureStart, captureEnd, true);
      writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
      captureStart = captureEnd = state.position;

    } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
      throwError(state, 'unexpected end of the document within a double quoted scalar');

    } else {
      state.position++;
      captureEnd = state.position;
    }
  }

  throwError(state, 'unexpected end of the stream within a double quoted scalar');
}

function readFlowCollection(state, nodeIndent) {
  var readNext = true,
      _line,
      _tag     = state.tag,
      _result,
      _anchor  = state.anchor,
      following,
      terminator,
      isPair,
      isExplicitPair,
      isMapping,
      overridableKeys = {},
      keyNode,
      keyTag,
      valueNode,
      ch;

  ch = state.input.charCodeAt(state.position);

  if (ch === 0x5B/* [ */) {
    terminator = 0x5D;/* ] */
    isMapping = false;
    _result = [];
  } else if (ch === 0x7B/* { */) {
    terminator = 0x7D;/* } */
    isMapping = true;
    _result = {};
  } else {
    return false;
  }

  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }

  ch = state.input.charCodeAt(++state.position);

  while (ch !== 0) {
    skipSeparationSpace(state, true, nodeIndent);

    ch = state.input.charCodeAt(state.position);

    if (ch === terminator) {
      state.position++;
      state.tag = _tag;
      state.anchor = _anchor;
      state.kind = isMapping ? 'mapping' : 'sequence';
      state.result = _result;
      return true;
    } else if (!readNext) {
      throwError(state, 'missed comma between flow collection entries');
    }

    keyTag = keyNode = valueNode = null;
    isPair = isExplicitPair = false;

    if (ch === 0x3F/* ? */) {
      following = state.input.charCodeAt(state.position + 1);

      if (is_WS_OR_EOL(following)) {
        isPair = isExplicitPair = true;
        state.position++;
        skipSeparationSpace(state, true, nodeIndent);
      }
    }

    _line = state.line;
    composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
    keyTag = state.tag;
    keyNode = state.result;
    skipSeparationSpace(state, true, nodeIndent);

    ch = state.input.charCodeAt(state.position);

    if ((isExplicitPair || state.line === _line) && ch === 0x3A/* : */) {
      isPair = true;
      ch = state.input.charCodeAt(++state.position);
      skipSeparationSpace(state, true, nodeIndent);
      composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
      valueNode = state.result;
    }

    if (isMapping) {
      storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode);
    } else if (isPair) {
      _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode));
    } else {
      _result.push(keyNode);
    }

    skipSeparationSpace(state, true, nodeIndent);

    ch = state.input.charCodeAt(state.position);

    if (ch === 0x2C/* , */) {
      readNext = true;
      ch = state.input.charCodeAt(++state.position);
    } else {
      readNext = false;
    }
  }

  throwError(state, 'unexpected end of the stream within a flow collection');
}

function readBlockScalar(state, nodeIndent) {
  var captureStart,
      folding,
      chomping       = CHOMPING_CLIP,
      didReadContent = false,
      detectedIndent = false,
      textIndent     = nodeIndent,
      emptyLines     = 0,
      atMoreIndented = false,
      tmp,
      ch;

  ch = state.input.charCodeAt(state.position);

  if (ch === 0x7C/* | */) {
    folding = false;
  } else if (ch === 0x3E/* > */) {
    folding = true;
  } else {
    return false;
  }

  state.kind = 'scalar';
  state.result = '';

  while (ch !== 0) {
    ch = state.input.charCodeAt(++state.position);

    if (ch === 0x2B/* + */ || ch === 0x2D/* - */) {
      if (CHOMPING_CLIP === chomping) {
        chomping = (ch === 0x2B/* + */) ? CHOMPING_KEEP : CHOMPING_STRIP;
      } else {
        throwError(state, 'repeat of a chomping mode identifier');
      }

    } else if ((tmp = fromDecimalCode(ch)) >= 0) {
      if (tmp === 0) {
        throwError(state, 'bad explicit indentation width of a block scalar; it cannot be less than one');
      } else if (!detectedIndent) {
        textIndent = nodeIndent + tmp - 1;
        detectedIndent = true;
      } else {
        throwError(state, 'repeat of an indentation width identifier');
      }

    } else {
      break;
    }
  }

  if (is_WHITE_SPACE(ch)) {
    do { ch = state.input.charCodeAt(++state.position); }
    while (is_WHITE_SPACE(ch));

    if (ch === 0x23/* # */) {
      do { ch = state.input.charCodeAt(++state.position); }
      while (!is_EOL(ch) && (ch !== 0));
    }
  }

  while (ch !== 0) {
    readLineBreak(state);
    state.lineIndent = 0;

    ch = state.input.charCodeAt(state.position);

    while ((!detectedIndent || state.lineIndent < textIndent) &&
           (ch === 0x20/* Space */)) {
      state.lineIndent++;
      ch = state.input.charCodeAt(++state.position);
    }

    if (!detectedIndent && state.lineIndent > textIndent) {
      textIndent = state.lineIndent;
    }

    if (is_EOL(ch)) {
      emptyLines++;
      continue;
    }

    // End of the scalar.
    if (state.lineIndent < textIndent) {

      // Perform the chomping.
      if (chomping === CHOMPING_KEEP) {
        state.result += common.repeat('\n', didReadContent ? 1 + emptyLines : emptyLines);
      } else if (chomping === CHOMPING_CLIP) {
        if (didReadContent) { // i.e. only if the scalar is not empty.
          state.result += '\n';
        }
      }

      // Break this `while` cycle and go to the funciton's epilogue.
      break;
    }

    // Folded style: use fancy rules to handle line breaks.
    if (folding) {

      // Lines starting with white space characters (more-indented lines) are not folded.
      if (is_WHITE_SPACE(ch)) {
        atMoreIndented = true;
        // except for the first content line (cf. Example 8.1)
        state.result += common.repeat('\n', didReadContent ? 1 + emptyLines : emptyLines);

      // End of more-indented block.
      } else if (atMoreIndented) {
        atMoreIndented = false;
        state.result += common.repeat('\n', emptyLines + 1);

      // Just one line break - perceive as the same line.
      } else if (emptyLines === 0) {
        if (didReadContent) { // i.e. only if we have already read some scalar content.
          state.result += ' ';
        }

      // Several line breaks - perceive as different lines.
      } else {
        state.result += common.repeat('\n', emptyLines);
      }

    // Literal style: just add exact number of line breaks between content lines.
    } else {
      // Keep all line breaks except the header line break.
      state.result += common.repeat('\n', didReadContent ? 1 + emptyLines : emptyLines);
    }

    didReadContent = true;
    detectedIndent = true;
    emptyLines = 0;
    captureStart = state.position;

    while (!is_EOL(ch) && (ch !== 0)) {
      ch = state.input.charCodeAt(++state.position);
    }

    captureSegment(state, captureStart, state.position, false);
  }

  return true;
}

function readBlockSequence(state, nodeIndent) {
  var _line,
      _tag      = state.tag,
      _anchor   = state.anchor,
      _result   = [],
      following,
      detected  = false,
      ch;

  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }

  ch = state.input.charCodeAt(state.position);

  while (ch !== 0) {

    if (ch !== 0x2D/* - */) {
      break;
    }

    following = state.input.charCodeAt(state.position + 1);

    if (!is_WS_OR_EOL(following)) {
      break;
    }

    detected = true;
    state.position++;

    if (skipSeparationSpace(state, true, -1)) {
      if (state.lineIndent <= nodeIndent) {
        _result.push(null);
        ch = state.input.charCodeAt(state.position);
        continue;
      }
    }

    _line = state.line;
    composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
    _result.push(state.result);
    skipSeparationSpace(state, true, -1);

    ch = state.input.charCodeAt(state.position);

    if ((state.line === _line || state.lineIndent > nodeIndent) && (ch !== 0)) {
      throwError(state, 'bad indentation of a sequence entry');
    } else if (state.lineIndent < nodeIndent) {
      break;
    }
  }

  if (detected) {
    state.tag = _tag;
    state.anchor = _anchor;
    state.kind = 'sequence';
    state.result = _result;
    return true;
  }
  return false;
}

function readBlockMapping(state, nodeIndent, flowIndent) {
  var following,
      allowCompact,
      _line,
      _pos,
      _tag          = state.tag,
      _anchor       = state.anchor,
      _result       = {},
      overridableKeys = {},
      keyTag        = null,
      keyNode       = null,
      valueNode     = null,
      atExplicitKey = false,
      detected      = false,
      ch;

  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }

  ch = state.input.charCodeAt(state.position);

  while (ch !== 0) {
    following = state.input.charCodeAt(state.position + 1);
    _line = state.line; // Save the current line.
    _pos = state.position;

    //
    // Explicit notation case. There are two separate blocks:
    // first for the key (denoted by "?") and second for the value (denoted by ":")
    //
    if ((ch === 0x3F/* ? */ || ch === 0x3A/* : */) && is_WS_OR_EOL(following)) {

      if (ch === 0x3F/* ? */) {
        if (atExplicitKey) {
          storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
          keyTag = keyNode = valueNode = null;
        }

        detected = true;
        atExplicitKey = true;
        allowCompact = true;

      } else if (atExplicitKey) {
        // i.e. 0x3A/* : */ === character after the explicit key.
        atExplicitKey = false;
        allowCompact = true;

      } else {
        throwError(state, 'incomplete explicit mapping pair; a key node is missed');
      }

      state.position += 1;
      ch = following;

    //
    // Implicit notation case. Flow-style node as the key first, then ":", and the value.
    //
    } else if (composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {

      if (state.line === _line) {
        ch = state.input.charCodeAt(state.position);

        while (is_WHITE_SPACE(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }

        if (ch === 0x3A/* : */) {
          ch = state.input.charCodeAt(++state.position);

          if (!is_WS_OR_EOL(ch)) {
            throwError(state, 'a whitespace character is expected after the key-value separator within a block mapping');
          }

          if (atExplicitKey) {
            storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
            keyTag = keyNode = valueNode = null;
          }

          detected = true;
          atExplicitKey = false;
          allowCompact = false;
          keyTag = state.tag;
          keyNode = state.result;

        } else if (detected) {
          throwError(state, 'can not read an implicit mapping pair; a colon is missed');

        } else {
          state.tag = _tag;
          state.anchor = _anchor;
          return true; // Keep the result of `composeNode`.
        }

      } else if (detected) {
        throwError(state, 'can not read a block mapping entry; a multiline key may not be an implicit key');

      } else {
        state.tag = _tag;
        state.anchor = _anchor;
        return true; // Keep the result of `composeNode`.
      }

    } else {
      break; // Reading is done. Go to the epilogue.
    }

    //
    // Common reading code for both explicit and implicit notations.
    //
    if (state.line === _line || state.lineIndent > nodeIndent) {
      if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
        if (atExplicitKey) {
          keyNode = state.result;
        } else {
          valueNode = state.result;
        }
      }

      if (!atExplicitKey) {
        storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _pos);
        keyTag = keyNode = valueNode = null;
      }

      skipSeparationSpace(state, true, -1);
      ch = state.input.charCodeAt(state.position);
    }

    if (state.lineIndent > nodeIndent && (ch !== 0)) {
      throwError(state, 'bad indentation of a mapping entry');
    } else if (state.lineIndent < nodeIndent) {
      break;
    }
  }

  //
  // Epilogue.
  //

  // Special case: last mapping's node contains only the key in explicit notation.
  if (atExplicitKey) {
    storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
  }

  // Expose the resulting mapping.
  if (detected) {
    state.tag = _tag;
    state.anchor = _anchor;
    state.kind = 'mapping';
    state.result = _result;
  }

  return detected;
}

function readTagProperty(state) {
  var _position,
      isVerbatim = false,
      isNamed    = false,
      tagHandle,
      tagName,
      ch;

  ch = state.input.charCodeAt(state.position);

  if (ch !== 0x21/* ! */) return false;

  if (state.tag !== null) {
    throwError(state, 'duplication of a tag property');
  }

  ch = state.input.charCodeAt(++state.position);

  if (ch === 0x3C/* < */) {
    isVerbatim = true;
    ch = state.input.charCodeAt(++state.position);

  } else if (ch === 0x21/* ! */) {
    isNamed = true;
    tagHandle = '!!';
    ch = state.input.charCodeAt(++state.position);

  } else {
    tagHandle = '!';
  }

  _position = state.position;

  if (isVerbatim) {
    do { ch = state.input.charCodeAt(++state.position); }
    while (ch !== 0 && ch !== 0x3E/* > */);

    if (state.position < state.length) {
      tagName = state.input.slice(_position, state.position);
      ch = state.input.charCodeAt(++state.position);
    } else {
      throwError(state, 'unexpected end of the stream within a verbatim tag');
    }
  } else {
    while (ch !== 0 && !is_WS_OR_EOL(ch)) {

      if (ch === 0x21/* ! */) {
        if (!isNamed) {
          tagHandle = state.input.slice(_position - 1, state.position + 1);

          if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
            throwError(state, 'named tag handle cannot contain such characters');
          }

          isNamed = true;
          _position = state.position + 1;
        } else {
          throwError(state, 'tag suffix cannot contain exclamation marks');
        }
      }

      ch = state.input.charCodeAt(++state.position);
    }

    tagName = state.input.slice(_position, state.position);

    if (PATTERN_FLOW_INDICATORS.test(tagName)) {
      throwError(state, 'tag suffix cannot contain flow indicator characters');
    }
  }

  if (tagName && !PATTERN_TAG_URI.test(tagName)) {
    throwError(state, 'tag name cannot contain such characters: ' + tagName);
  }

  if (isVerbatim) {
    state.tag = tagName;

  } else if (_hasOwnProperty.call(state.tagMap, tagHandle)) {
    state.tag = state.tagMap[tagHandle] + tagName;

  } else if (tagHandle === '!') {
    state.tag = '!' + tagName;

  } else if (tagHandle === '!!') {
    state.tag = 'tag:yaml.org,2002:' + tagName;

  } else {
    throwError(state, 'undeclared tag handle "' + tagHandle + '"');
  }

  return true;
}

function readAnchorProperty(state) {
  var _position,
      ch;

  ch = state.input.charCodeAt(state.position);

  if (ch !== 0x26/* & */) return false;

  if (state.anchor !== null) {
    throwError(state, 'duplication of an anchor property');
  }

  ch = state.input.charCodeAt(++state.position);
  _position = state.position;

  while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
    ch = state.input.charCodeAt(++state.position);
  }

  if (state.position === _position) {
    throwError(state, 'name of an anchor node must contain at least one character');
  }

  state.anchor = state.input.slice(_position, state.position);
  return true;
}

function readAlias(state) {
  var _position, alias,
      ch;

  ch = state.input.charCodeAt(state.position);

  if (ch !== 0x2A/* * */) return false;

  ch = state.input.charCodeAt(++state.position);
  _position = state.position;

  while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
    ch = state.input.charCodeAt(++state.position);
  }

  if (state.position === _position) {
    throwError(state, 'name of an alias node must contain at least one character');
  }

  alias = state.input.slice(_position, state.position);

  if (!state.anchorMap.hasOwnProperty(alias)) {
    throwError(state, 'unidentified alias "' + alias + '"');
  }

  state.result = state.anchorMap[alias];
  skipSeparationSpace(state, true, -1);
  return true;
}

function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
  var allowBlockStyles,
      allowBlockScalars,
      allowBlockCollections,
      indentStatus = 1, // 1: this>parent, 0: this=parent, -1: this<parent
      atNewLine  = false,
      hasContent = false,
      typeIndex,
      typeQuantity,
      type,
      flowIndent,
      blockIndent;

  if (state.listener !== null) {
    state.listener('open', state);
  }

  state.tag    = null;
  state.anchor = null;
  state.kind   = null;
  state.result = null;

  allowBlockStyles = allowBlockScalars = allowBlockCollections =
    CONTEXT_BLOCK_OUT === nodeContext ||
    CONTEXT_BLOCK_IN  === nodeContext;

  if (allowToSeek) {
    if (skipSeparationSpace(state, true, -1)) {
      atNewLine = true;

      if (state.lineIndent > parentIndent) {
        indentStatus = 1;
      } else if (state.lineIndent === parentIndent) {
        indentStatus = 0;
      } else if (state.lineIndent < parentIndent) {
        indentStatus = -1;
      }
    }
  }

  if (indentStatus === 1) {
    while (readTagProperty(state) || readAnchorProperty(state)) {
      if (skipSeparationSpace(state, true, -1)) {
        atNewLine = true;
        allowBlockCollections = allowBlockStyles;

        if (state.lineIndent > parentIndent) {
          indentStatus = 1;
        } else if (state.lineIndent === parentIndent) {
          indentStatus = 0;
        } else if (state.lineIndent < parentIndent) {
          indentStatus = -1;
        }
      } else {
        allowBlockCollections = false;
      }
    }
  }

  if (allowBlockCollections) {
    allowBlockCollections = atNewLine || allowCompact;
  }

  if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
    if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
      flowIndent = parentIndent;
    } else {
      flowIndent = parentIndent + 1;
    }

    blockIndent = state.position - state.lineStart;

    if (indentStatus === 1) {
      if (allowBlockCollections &&
          (readBlockSequence(state, blockIndent) ||
           readBlockMapping(state, blockIndent, flowIndent)) ||
          readFlowCollection(state, flowIndent)) {
        hasContent = true;
      } else {
        if ((allowBlockScalars && readBlockScalar(state, flowIndent)) ||
            readSingleQuotedScalar(state, flowIndent) ||
            readDoubleQuotedScalar(state, flowIndent)) {
          hasContent = true;

        } else if (readAlias(state)) {
          hasContent = true;

          if (state.tag !== null || state.anchor !== null) {
            throwError(state, 'alias node should not have any properties');
          }

        } else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
          hasContent = true;

          if (state.tag === null) {
            state.tag = '?';
          }
        }

        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
      }
    } else if (indentStatus === 0) {
      // Special case: block sequences are allowed to have same indentation level as the parent.
      // http://www.yaml.org/spec/1.2/spec.html#id2799784
      hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
    }
  }

  if (state.tag !== null && state.tag !== '!') {
    if (state.tag === '?') {
      for (typeIndex = 0, typeQuantity = state.implicitTypes.length;
           typeIndex < typeQuantity;
           typeIndex += 1) {
        type = state.implicitTypes[typeIndex];

        // Implicit resolving is not allowed for non-scalar types, and '?'
        // non-specific tag is only assigned to plain scalars. So, it isn't
        // needed to check for 'kind' conformity.

        if (type.resolve(state.result)) { // `state.result` updated in resolver if matched
          state.result = type.construct(state.result);
          state.tag = type.tag;
          if (state.anchor !== null) {
            state.anchorMap[state.anchor] = state.result;
          }
          break;
        }
      }
    } else if (_hasOwnProperty.call(state.typeMap[state.kind || 'fallback'], state.tag)) {
      type = state.typeMap[state.kind || 'fallback'][state.tag];

      if (state.result !== null && type.kind !== state.kind) {
        throwError(state, 'unacceptable node kind for !<' + state.tag + '> tag; it should be "' + type.kind + '", not "' + state.kind + '"');
      }

      if (!type.resolve(state.result)) { // `state.result` updated in resolver if matched
        throwError(state, 'cannot resolve a node with !<' + state.tag + '> explicit tag');
      } else {
        state.result = type.construct(state.result);
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
      }
    } else {
      throwError(state, 'unknown tag !<' + state.tag + '>');
    }
  }

  if (state.listener !== null) {
    state.listener('close', state);
  }
  return state.tag !== null ||  state.anchor !== null || hasContent;
}

function readDocument(state) {
  var documentStart = state.position,
      _position,
      directiveName,
      directiveArgs,
      hasDirectives = false,
      ch;

  state.version = null;
  state.checkLineBreaks = state.legacy;
  state.tagMap = {};
  state.anchorMap = {};

  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    skipSeparationSpace(state, true, -1);

    ch = state.input.charCodeAt(state.position);

    if (state.lineIndent > 0 || ch !== 0x25/* % */) {
      break;
    }

    hasDirectives = true;
    ch = state.input.charCodeAt(++state.position);
    _position = state.position;

    while (ch !== 0 && !is_WS_OR_EOL(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }

    directiveName = state.input.slice(_position, state.position);
    directiveArgs = [];

    if (directiveName.length < 1) {
      throwError(state, 'directive name must not be less than one character in length');
    }

    while (ch !== 0) {
      while (is_WHITE_SPACE(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }

      if (ch === 0x23/* # */) {
        do { ch = state.input.charCodeAt(++state.position); }
        while (ch !== 0 && !is_EOL(ch));
        break;
      }

      if (is_EOL(ch)) break;

      _position = state.position;

      while (ch !== 0 && !is_WS_OR_EOL(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }

      directiveArgs.push(state.input.slice(_position, state.position));
    }

    if (ch !== 0) readLineBreak(state);

    if (_hasOwnProperty.call(directiveHandlers, directiveName)) {
      directiveHandlers[directiveName](state, directiveName, directiveArgs);
    } else {
      throwWarning(state, 'unknown document directive "' + directiveName + '"');
    }
  }

  skipSeparationSpace(state, true, -1);

  if (state.lineIndent === 0 &&
      state.input.charCodeAt(state.position)     === 0x2D/* - */ &&
      state.input.charCodeAt(state.position + 1) === 0x2D/* - */ &&
      state.input.charCodeAt(state.position + 2) === 0x2D/* - */) {
    state.position += 3;
    skipSeparationSpace(state, true, -1);

  } else if (hasDirectives) {
    throwError(state, 'directives end mark is expected');
  }

  composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
  skipSeparationSpace(state, true, -1);

  if (state.checkLineBreaks &&
      PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
    throwWarning(state, 'non-ASCII line breaks are interpreted as content');
  }

  state.documents.push(state.result);

  if (state.position === state.lineStart && testDocumentSeparator(state)) {

    if (state.input.charCodeAt(state.position) === 0x2E/* . */) {
      state.position += 3;
      skipSeparationSpace(state, true, -1);
    }
    return;
  }

  if (state.position < (state.length - 1)) {
    throwError(state, 'end of the stream or a document separator is expected');
  } else {
    return;
  }
}


function loadDocuments(input, options) {
  input = String(input);
  options = options || {};

  if (input.length !== 0) {

    // Add tailing `\n` if not exists
    if (input.charCodeAt(input.length - 1) !== 0x0A/* LF */ &&
        input.charCodeAt(input.length - 1) !== 0x0D/* CR */) {
      input += '\n';
    }

    // Strip BOM
    if (input.charCodeAt(0) === 0xFEFF) {
      input = input.slice(1);
    }
  }

  var state = new State(input, options);

  // Use 0 as string terminator. That significantly simplifies bounds check.
  state.input += '\0';

  while (state.input.charCodeAt(state.position) === 0x20/* Space */) {
    state.lineIndent += 1;
    state.position += 1;
  }

  while (state.position < (state.length - 1)) {
    readDocument(state);
  }

  return state.documents;
}


function loadAll(input, iterator, options) {
  var documents = loadDocuments(input, options), index, length;

  for (index = 0, length = documents.length; index < length; index += 1) {
    iterator(documents[index]);
  }
}


function load(input, options) {
  var documents = loadDocuments(input, options);

  if (documents.length === 0) {
    /*eslint-disable no-undefined*/
    return undefined;
  } else if (documents.length === 1) {
    return documents[0];
  }
  throw new YAMLException('expected a single document in the stream, but found more');
}


function safeLoadAll(input, output, options) {
  loadAll(input, output, common.extend({ schema: DEFAULT_SAFE_SCHEMA }, options));
}


function safeLoad(input, options) {
  return load(input, common.extend({ schema: DEFAULT_SAFE_SCHEMA }, options));
}


module.exports.loadAll     = loadAll;
module.exports.load        = load;
module.exports.safeLoadAll = safeLoadAll;
module.exports.safeLoad    = safeLoad;

},{"./common":5,"./exception":7,"./mark":9,"./schema/default_full":12,"./schema/default_safe":13}],9:[function(require,module,exports){
'use strict';


var common = require('./common');


function Mark(name, buffer, position, line, column) {
  this.name     = name;
  this.buffer   = buffer;
  this.position = position;
  this.line     = line;
  this.column   = column;
}


Mark.prototype.getSnippet = function getSnippet(indent, maxLength) {
  var head, start, tail, end, snippet;

  if (!this.buffer) return null;

  indent = indent || 4;
  maxLength = maxLength || 75;

  head = '';
  start = this.position;

  while (start > 0 && '\x00\r\n\x85\u2028\u2029'.indexOf(this.buffer.charAt(start - 1)) === -1) {
    start -= 1;
    if (this.position - start > (maxLength / 2 - 1)) {
      head = ' ... ';
      start += 5;
      break;
    }
  }

  tail = '';
  end = this.position;

  while (end < this.buffer.length && '\x00\r\n\x85\u2028\u2029'.indexOf(this.buffer.charAt(end)) === -1) {
    end += 1;
    if (end - this.position > (maxLength / 2 - 1)) {
      tail = ' ... ';
      end -= 5;
      break;
    }
  }

  snippet = this.buffer.slice(start, end);

  return common.repeat(' ', indent) + head + snippet + tail + '\n' +
         common.repeat(' ', indent + this.position - start + head.length) + '^';
};


Mark.prototype.toString = function toString(compact) {
  var snippet, where = '';

  if (this.name) {
    where += 'in "' + this.name + '" ';
  }

  where += 'at line ' + (this.line + 1) + ', column ' + (this.column + 1);

  if (!compact) {
    snippet = this.getSnippet();

    if (snippet) {
      where += ':\n' + snippet;
    }
  }

  return where;
};


module.exports = Mark;

},{"./common":5}],10:[function(require,module,exports){
'use strict';

/*eslint-disable max-len*/

var common        = require('./common');
var YAMLException = require('./exception');
var Type          = require('./type');


function compileList(schema, name, result) {
  var exclude = [];

  schema.include.forEach(function (includedSchema) {
    result = compileList(includedSchema, name, result);
  });

  schema[name].forEach(function (currentType) {
    result.forEach(function (previousType, previousIndex) {
      if (previousType.tag === currentType.tag && previousType.kind === currentType.kind) {
        exclude.push(previousIndex);
      }
    });

    result.push(currentType);
  });

  return result.filter(function (type, index) {
    return exclude.indexOf(index) === -1;
  });
}


function compileMap(/* lists... */) {
  var result = {
        scalar: {},
        sequence: {},
        mapping: {},
        fallback: {}
      }, index, length;

  function collectType(type) {
    result[type.kind][type.tag] = result['fallback'][type.tag] = type;
  }

  for (index = 0, length = arguments.length; index < length; index += 1) {
    arguments[index].forEach(collectType);
  }
  return result;
}


function Schema(definition) {
  this.include  = definition.include  || [];
  this.implicit = definition.implicit || [];
  this.explicit = definition.explicit || [];

  this.implicit.forEach(function (type) {
    if (type.loadKind && type.loadKind !== 'scalar') {
      throw new YAMLException('There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.');
    }
  });

  this.compiledImplicit = compileList(this, 'implicit', []);
  this.compiledExplicit = compileList(this, 'explicit', []);
  this.compiledTypeMap  = compileMap(this.compiledImplicit, this.compiledExplicit);
}


Schema.DEFAULT = null;


Schema.create = function createSchema() {
  var schemas, types;

  switch (arguments.length) {
    case 1:
      schemas = Schema.DEFAULT;
      types = arguments[0];
      break;

    case 2:
      schemas = arguments[0];
      types = arguments[1];
      break;

    default:
      throw new YAMLException('Wrong number of arguments for Schema.create function');
  }

  schemas = common.toArray(schemas);
  types = common.toArray(types);

  if (!schemas.every(function (schema) { return schema instanceof Schema; })) {
    throw new YAMLException('Specified list of super schemas (or a single Schema object) contains a non-Schema object.');
  }

  if (!types.every(function (type) { return type instanceof Type; })) {
    throw new YAMLException('Specified list of YAML types (or a single Type object) contains a non-Type object.');
  }

  return new Schema({
    include: schemas,
    explicit: types
  });
};


module.exports = Schema;

},{"./common":5,"./exception":7,"./type":16}],11:[function(require,module,exports){
// Standard YAML's Core schema.
// http://www.yaml.org/spec/1.2/spec.html#id2804923
//
// NOTE: JS-YAML does not support schema-specific tag resolution restrictions.
// So, Core schema has no distinctions from JSON schema is JS-YAML.


'use strict';


var Schema = require('../schema');


module.exports = new Schema({
  include: [
    require('./json')
  ]
});

},{"../schema":10,"./json":15}],12:[function(require,module,exports){
// JS-YAML's default schema for `load` function.
// It is not described in the YAML specification.
//
// This schema is based on JS-YAML's default safe schema and includes
// JavaScript-specific types: !!js/undefined, !!js/regexp and !!js/function.
//
// Also this schema is used as default base schema at `Schema.create` function.


'use strict';


var Schema = require('../schema');


module.exports = Schema.DEFAULT = new Schema({
  include: [
    require('./default_safe')
  ],
  explicit: [
    require('../type/js/undefined'),
    require('../type/js/regexp'),
    require('../type/js/function')
  ]
});

},{"../schema":10,"../type/js/function":21,"../type/js/regexp":22,"../type/js/undefined":23,"./default_safe":13}],13:[function(require,module,exports){
// JS-YAML's default schema for `safeLoad` function.
// It is not described in the YAML specification.
//
// This schema is based on standard YAML's Core schema and includes most of
// extra types described at YAML tag repository. (http://yaml.org/type/)


'use strict';


var Schema = require('../schema');


module.exports = new Schema({
  include: [
    require('./core')
  ],
  implicit: [
    require('../type/timestamp'),
    require('../type/merge')
  ],
  explicit: [
    require('../type/binary'),
    require('../type/omap'),
    require('../type/pairs'),
    require('../type/set')
  ]
});

},{"../schema":10,"../type/binary":17,"../type/merge":25,"../type/omap":27,"../type/pairs":28,"../type/set":30,"../type/timestamp":32,"./core":11}],14:[function(require,module,exports){
// Standard YAML's Failsafe schema.
// http://www.yaml.org/spec/1.2/spec.html#id2802346


'use strict';


var Schema = require('../schema');


module.exports = new Schema({
  explicit: [
    require('../type/str'),
    require('../type/seq'),
    require('../type/map')
  ]
});

},{"../schema":10,"../type/map":24,"../type/seq":29,"../type/str":31}],15:[function(require,module,exports){
// Standard YAML's JSON schema.
// http://www.yaml.org/spec/1.2/spec.html#id2803231
//
// NOTE: JS-YAML does not support schema-specific tag resolution restrictions.
// So, this schema is not such strict as defined in the YAML specification.
// It allows numbers in binary notaion, use `Null` and `NULL` as `null`, etc.


'use strict';


var Schema = require('../schema');


module.exports = new Schema({
  include: [
    require('./failsafe')
  ],
  implicit: [
    require('../type/null'),
    require('../type/bool'),
    require('../type/int'),
    require('../type/float')
  ]
});

},{"../schema":10,"../type/bool":18,"../type/float":19,"../type/int":20,"../type/null":26,"./failsafe":14}],16:[function(require,module,exports){
'use strict';

var YAMLException = require('./exception');

var TYPE_CONSTRUCTOR_OPTIONS = [
  'kind',
  'resolve',
  'construct',
  'instanceOf',
  'predicate',
  'represent',
  'defaultStyle',
  'styleAliases'
];

var YAML_NODE_KINDS = [
  'scalar',
  'sequence',
  'mapping'
];

function compileStyleAliases(map) {
  var result = {};

  if (map !== null) {
    Object.keys(map).forEach(function (style) {
      map[style].forEach(function (alias) {
        result[String(alias)] = style;
      });
    });
  }

  return result;
}

function Type(tag, options) {
  options = options || {};

  Object.keys(options).forEach(function (name) {
    if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) {
      throw new YAMLException('Unknown option "' + name + '" is met in definition of "' + tag + '" YAML type.');
    }
  });

  // TODO: Add tag format check.
  this.tag          = tag;
  this.kind         = options['kind']         || null;
  this.resolve      = options['resolve']      || function () { return true; };
  this.construct    = options['construct']    || function (data) { return data; };
  this.instanceOf   = options['instanceOf']   || null;
  this.predicate    = options['predicate']    || null;
  this.represent    = options['represent']    || null;
  this.defaultStyle = options['defaultStyle'] || null;
  this.styleAliases = compileStyleAliases(options['styleAliases'] || null);

  if (YAML_NODE_KINDS.indexOf(this.kind) === -1) {
    throw new YAMLException('Unknown kind "' + this.kind + '" is specified for "' + tag + '" YAML type.');
  }
}

module.exports = Type;

},{"./exception":7}],17:[function(require,module,exports){
'use strict';

/*eslint-disable no-bitwise*/

var NodeBuffer;

try {
  // A trick for browserified version, to not include `Buffer` shim
  var _require = require;
  NodeBuffer = _require('buffer').Buffer;
} catch (__) {}

var Type       = require('../type');


// [ 64, 65, 66 ] -> [ padding, CR, LF ]
var BASE64_MAP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r';


function resolveYamlBinary(data) {
  if (data === null) return false;

  var code, idx, bitlen = 0, max = data.length, map = BASE64_MAP;

  // Convert one by one.
  for (idx = 0; idx < max; idx++) {
    code = map.indexOf(data.charAt(idx));

    // Skip CR/LF
    if (code > 64) continue;

    // Fail on illegal characters
    if (code < 0) return false;

    bitlen += 6;
  }

  // If there are any bits left, source was corrupted
  return (bitlen % 8) === 0;
}

function constructYamlBinary(data) {
  var idx, tailbits,
      input = data.replace(/[\r\n=]/g, ''), // remove CR/LF & padding to simplify scan
      max = input.length,
      map = BASE64_MAP,
      bits = 0,
      result = [];

  // Collect by 6*4 bits (3 bytes)

  for (idx = 0; idx < max; idx++) {
    if ((idx % 4 === 0) && idx) {
      result.push((bits >> 16) & 0xFF);
      result.push((bits >> 8) & 0xFF);
      result.push(bits & 0xFF);
    }

    bits = (bits << 6) | map.indexOf(input.charAt(idx));
  }

  // Dump tail

  tailbits = (max % 4) * 6;

  if (tailbits === 0) {
    result.push((bits >> 16) & 0xFF);
    result.push((bits >> 8) & 0xFF);
    result.push(bits & 0xFF);
  } else if (tailbits === 18) {
    result.push((bits >> 10) & 0xFF);
    result.push((bits >> 2) & 0xFF);
  } else if (tailbits === 12) {
    result.push((bits >> 4) & 0xFF);
  }

  // Wrap into Buffer for NodeJS and leave Array for browser
  if (NodeBuffer) {
    // Support node 6.+ Buffer API when available
    return NodeBuffer.from ? NodeBuffer.from(result) : new NodeBuffer(result);
  }

  return result;
}

function representYamlBinary(object /*, style*/) {
  var result = '', bits = 0, idx, tail,
      max = object.length,
      map = BASE64_MAP;

  // Convert every three bytes to 4 ASCII characters.

  for (idx = 0; idx < max; idx++) {
    if ((idx % 3 === 0) && idx) {
      result += map[(bits >> 18) & 0x3F];
      result += map[(bits >> 12) & 0x3F];
      result += map[(bits >> 6) & 0x3F];
      result += map[bits & 0x3F];
    }

    bits = (bits << 8) + object[idx];
  }

  // Dump tail

  tail = max % 3;

  if (tail === 0) {
    result += map[(bits >> 18) & 0x3F];
    result += map[(bits >> 12) & 0x3F];
    result += map[(bits >> 6) & 0x3F];
    result += map[bits & 0x3F];
  } else if (tail === 2) {
    result += map[(bits >> 10) & 0x3F];
    result += map[(bits >> 4) & 0x3F];
    result += map[(bits << 2) & 0x3F];
    result += map[64];
  } else if (tail === 1) {
    result += map[(bits >> 2) & 0x3F];
    result += map[(bits << 4) & 0x3F];
    result += map[64];
    result += map[64];
  }

  return result;
}

function isBinary(object) {
  return NodeBuffer && NodeBuffer.isBuffer(object);
}

module.exports = new Type('tag:yaml.org,2002:binary', {
  kind: 'scalar',
  resolve: resolveYamlBinary,
  construct: constructYamlBinary,
  predicate: isBinary,
  represent: representYamlBinary
});

},{"../type":16}],18:[function(require,module,exports){
'use strict';

var Type = require('../type');

function resolveYamlBoolean(data) {
  if (data === null) return false;

  var max = data.length;

  return (max === 4 && (data === 'true' || data === 'True' || data === 'TRUE')) ||
         (max === 5 && (data === 'false' || data === 'False' || data === 'FALSE'));
}

function constructYamlBoolean(data) {
  return data === 'true' ||
         data === 'True' ||
         data === 'TRUE';
}

function isBoolean(object) {
  return Object.prototype.toString.call(object) === '[object Boolean]';
}

module.exports = new Type('tag:yaml.org,2002:bool', {
  kind: 'scalar',
  resolve: resolveYamlBoolean,
  construct: constructYamlBoolean,
  predicate: isBoolean,
  represent: {
    lowercase: function (object) { return object ? 'true' : 'false'; },
    uppercase: function (object) { return object ? 'TRUE' : 'FALSE'; },
    camelcase: function (object) { return object ? 'True' : 'False'; }
  },
  defaultStyle: 'lowercase'
});

},{"../type":16}],19:[function(require,module,exports){
'use strict';

var common = require('../common');
var Type   = require('../type');

var YAML_FLOAT_PATTERN = new RegExp(
  // 2.5e4, 2.5 and integers
  '^(?:[-+]?(?:0|[1-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?' +
  // .2e4, .2
  // special case, seems not from spec
  '|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?' +
  // 20:59
  '|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\\.[0-9_]*' +
  // .inf
  '|[-+]?\\.(?:inf|Inf|INF)' +
  // .nan
  '|\\.(?:nan|NaN|NAN))$');

function resolveYamlFloat(data) {
  if (data === null) return false;

  if (!YAML_FLOAT_PATTERN.test(data) ||
      // Quick hack to not allow integers end with `_`
      // Probably should update regexp & check speed
      data[data.length - 1] === '_') {
    return false;
  }

  return true;
}

function constructYamlFloat(data) {
  var value, sign, base, digits;

  value  = data.replace(/_/g, '').toLowerCase();
  sign   = value[0] === '-' ? -1 : 1;
  digits = [];

  if ('+-'.indexOf(value[0]) >= 0) {
    value = value.slice(1);
  }

  if (value === '.inf') {
    return (sign === 1) ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;

  } else if (value === '.nan') {
    return NaN;

  } else if (value.indexOf(':') >= 0) {
    value.split(':').forEach(function (v) {
      digits.unshift(parseFloat(v, 10));
    });

    value = 0.0;
    base = 1;

    digits.forEach(function (d) {
      value += d * base;
      base *= 60;
    });

    return sign * value;

  }
  return sign * parseFloat(value, 10);
}


var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;

function representYamlFloat(object, style) {
  var res;

  if (isNaN(object)) {
    switch (style) {
      case 'lowercase': return '.nan';
      case 'uppercase': return '.NAN';
      case 'camelcase': return '.NaN';
    }
  } else if (Number.POSITIVE_INFINITY === object) {
    switch (style) {
      case 'lowercase': return '.inf';
      case 'uppercase': return '.INF';
      case 'camelcase': return '.Inf';
    }
  } else if (Number.NEGATIVE_INFINITY === object) {
    switch (style) {
      case 'lowercase': return '-.inf';
      case 'uppercase': return '-.INF';
      case 'camelcase': return '-.Inf';
    }
  } else if (common.isNegativeZero(object)) {
    return '-0.0';
  }

  res = object.toString(10);

  // JS stringifier can build scientific format without dots: 5e-100,
  // while YAML requres dot: 5.e-100. Fix it with simple hack

  return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace('e', '.e') : res;
}

function isFloat(object) {
  return (Object.prototype.toString.call(object) === '[object Number]') &&
         (object % 1 !== 0 || common.isNegativeZero(object));
}

module.exports = new Type('tag:yaml.org,2002:float', {
  kind: 'scalar',
  resolve: resolveYamlFloat,
  construct: constructYamlFloat,
  predicate: isFloat,
  represent: representYamlFloat,
  defaultStyle: 'lowercase'
});

},{"../common":5,"../type":16}],20:[function(require,module,exports){
'use strict';

var common = require('../common');
var Type   = require('../type');

function isHexCode(c) {
  return ((0x30/* 0 */ <= c) && (c <= 0x39/* 9 */)) ||
         ((0x41/* A */ <= c) && (c <= 0x46/* F */)) ||
         ((0x61/* a */ <= c) && (c <= 0x66/* f */));
}

function isOctCode(c) {
  return ((0x30/* 0 */ <= c) && (c <= 0x37/* 7 */));
}

function isDecCode(c) {
  return ((0x30/* 0 */ <= c) && (c <= 0x39/* 9 */));
}

function resolveYamlInteger(data) {
  if (data === null) return false;

  var max = data.length,
      index = 0,
      hasDigits = false,
      ch;

  if (!max) return false;

  ch = data[index];

  // sign
  if (ch === '-' || ch === '+') {
    ch = data[++index];
  }

  if (ch === '0') {
    // 0
    if (index + 1 === max) return true;
    ch = data[++index];

    // base 2, base 8, base 16

    if (ch === 'b') {
      // base 2
      index++;

      for (; index < max; index++) {
        ch = data[index];
        if (ch === '_') continue;
        if (ch !== '0' && ch !== '1') return false;
        hasDigits = true;
      }
      return hasDigits && ch !== '_';
    }


    if (ch === 'x') {
      // base 16
      index++;

      for (; index < max; index++) {
        ch = data[index];
        if (ch === '_') continue;
        if (!isHexCode(data.charCodeAt(index))) return false;
        hasDigits = true;
      }
      return hasDigits && ch !== '_';
    }

    // base 8
    for (; index < max; index++) {
      ch = data[index];
      if (ch === '_') continue;
      if (!isOctCode(data.charCodeAt(index))) return false;
      hasDigits = true;
    }
    return hasDigits && ch !== '_';
  }

  // base 10 (except 0) or base 60

  // value should not start with `_`;
  if (ch === '_') return false;

  for (; index < max; index++) {
    ch = data[index];
    if (ch === '_') continue;
    if (ch === ':') break;
    if (!isDecCode(data.charCodeAt(index))) {
      return false;
    }
    hasDigits = true;
  }

  // Should have digits and should not end with `_`
  if (!hasDigits || ch === '_') return false;

  // if !base60 - done;
  if (ch !== ':') return true;

  // base60 almost not used, no needs to optimize
  return /^(:[0-5]?[0-9])+$/.test(data.slice(index));
}

function constructYamlInteger(data) {
  var value = data, sign = 1, ch, base, digits = [];

  if (value.indexOf('_') !== -1) {
    value = value.replace(/_/g, '');
  }

  ch = value[0];

  if (ch === '-' || ch === '+') {
    if (ch === '-') sign = -1;
    value = value.slice(1);
    ch = value[0];
  }

  if (value === '0') return 0;

  if (ch === '0') {
    if (value[1] === 'b') return sign * parseInt(value.slice(2), 2);
    if (value[1] === 'x') return sign * parseInt(value, 16);
    return sign * parseInt(value, 8);
  }

  if (value.indexOf(':') !== -1) {
    value.split(':').forEach(function (v) {
      digits.unshift(parseInt(v, 10));
    });

    value = 0;
    base = 1;

    digits.forEach(function (d) {
      value += (d * base);
      base *= 60;
    });

    return sign * value;

  }

  return sign * parseInt(value, 10);
}

function isInteger(object) {
  return (Object.prototype.toString.call(object)) === '[object Number]' &&
         (object % 1 === 0 && !common.isNegativeZero(object));
}

module.exports = new Type('tag:yaml.org,2002:int', {
  kind: 'scalar',
  resolve: resolveYamlInteger,
  construct: constructYamlInteger,
  predicate: isInteger,
  represent: {
    binary:      function (object) { return '0b' + object.toString(2); },
    octal:       function (object) { return '0'  + object.toString(8); },
    decimal:     function (object) { return        object.toString(10); },
    hexadecimal: function (object) { return '0x' + object.toString(16).toUpperCase(); }
  },
  defaultStyle: 'decimal',
  styleAliases: {
    binary:      [ 2,  'bin' ],
    octal:       [ 8,  'oct' ],
    decimal:     [ 10, 'dec' ],
    hexadecimal: [ 16, 'hex' ]
  }
});

},{"../common":5,"../type":16}],21:[function(require,module,exports){
'use strict';

var esprima;

// Browserified version does not have esprima
//
// 1. For node.js just require module as deps
// 2. For browser try to require mudule via external AMD system.
//    If not found - try to fallback to window.esprima. If not
//    found too - then fail to parse.
//
try {
  // workaround to exclude package from browserify list.
  var _require = require;
  esprima = _require('esprima');
} catch (_) {
  /*global window */
  if (typeof window !== 'undefined') esprima = window.esprima;
}

var Type = require('../../type');

function resolveJavascriptFunction(data) {
  if (data === null) return false;

  try {
    var source = '(' + data + ')',
        ast    = esprima.parse(source, { range: true });

    if (ast.type                    !== 'Program'             ||
        ast.body.length             !== 1                     ||
        ast.body[0].type            !== 'ExpressionStatement' ||
        ast.body[0].expression.type !== 'FunctionExpression') {
      return false;
    }

    return true;
  } catch (err) {
    return false;
  }
}

function constructJavascriptFunction(data) {
  /*jslint evil:true*/

  var source = '(' + data + ')',
      ast    = esprima.parse(source, { range: true }),
      params = [],
      body;

  if (ast.type                    !== 'Program'             ||
      ast.body.length             !== 1                     ||
      ast.body[0].type            !== 'ExpressionStatement' ||
      ast.body[0].expression.type !== 'FunctionExpression') {
    throw new Error('Failed to resolve function');
  }

  ast.body[0].expression.params.forEach(function (param) {
    params.push(param.name);
  });

  body = ast.body[0].expression.body.range;

  // Esprima's ranges include the first '{' and the last '}' characters on
  // function expressions. So cut them out.
  /*eslint-disable no-new-func*/
  return new Function(params, source.slice(body[0] + 1, body[1] - 1));
}

function representJavascriptFunction(object /*, style*/) {
  return object.toString();
}

function isFunction(object) {
  return Object.prototype.toString.call(object) === '[object Function]';
}

module.exports = new Type('tag:yaml.org,2002:js/function', {
  kind: 'scalar',
  resolve: resolveJavascriptFunction,
  construct: constructJavascriptFunction,
  predicate: isFunction,
  represent: representJavascriptFunction
});

},{"../../type":16}],22:[function(require,module,exports){
'use strict';

var Type = require('../../type');

function resolveJavascriptRegExp(data) {
  if (data === null) return false;
  if (data.length === 0) return false;

  var regexp = data,
      tail   = /\/([gim]*)$/.exec(data),
      modifiers = '';

  // if regexp starts with '/' it can have modifiers and must be properly closed
  // `/foo/gim` - modifiers tail can be maximum 3 chars
  if (regexp[0] === '/') {
    if (tail) modifiers = tail[1];

    if (modifiers.length > 3) return false;
    // if expression starts with /, is should be properly terminated
    if (regexp[regexp.length - modifiers.length - 1] !== '/') return false;
  }

  return true;
}

function constructJavascriptRegExp(data) {
  var regexp = data,
      tail   = /\/([gim]*)$/.exec(data),
      modifiers = '';

  // `/foo/gim` - tail can be maximum 4 chars
  if (regexp[0] === '/') {
    if (tail) modifiers = tail[1];
    regexp = regexp.slice(1, regexp.length - modifiers.length - 1);
  }

  return new RegExp(regexp, modifiers);
}

function representJavascriptRegExp(object /*, style*/) {
  var result = '/' + object.source + '/';

  if (object.global) result += 'g';
  if (object.multiline) result += 'm';
  if (object.ignoreCase) result += 'i';

  return result;
}

function isRegExp(object) {
  return Object.prototype.toString.call(object) === '[object RegExp]';
}

module.exports = new Type('tag:yaml.org,2002:js/regexp', {
  kind: 'scalar',
  resolve: resolveJavascriptRegExp,
  construct: constructJavascriptRegExp,
  predicate: isRegExp,
  represent: representJavascriptRegExp
});

},{"../../type":16}],23:[function(require,module,exports){
'use strict';

var Type = require('../../type');

function resolveJavascriptUndefined() {
  return true;
}

function constructJavascriptUndefined() {
  /*eslint-disable no-undefined*/
  return undefined;
}

function representJavascriptUndefined() {
  return '';
}

function isUndefined(object) {
  return typeof object === 'undefined';
}

module.exports = new Type('tag:yaml.org,2002:js/undefined', {
  kind: 'scalar',
  resolve: resolveJavascriptUndefined,
  construct: constructJavascriptUndefined,
  predicate: isUndefined,
  represent: representJavascriptUndefined
});

},{"../../type":16}],24:[function(require,module,exports){
'use strict';

var Type = require('../type');

module.exports = new Type('tag:yaml.org,2002:map', {
  kind: 'mapping',
  construct: function (data) { return data !== null ? data : {}; }
});

},{"../type":16}],25:[function(require,module,exports){
'use strict';

var Type = require('../type');

function resolveYamlMerge(data) {
  return data === '<<' || data === null;
}

module.exports = new Type('tag:yaml.org,2002:merge', {
  kind: 'scalar',
  resolve: resolveYamlMerge
});

},{"../type":16}],26:[function(require,module,exports){
'use strict';

var Type = require('../type');

function resolveYamlNull(data) {
  if (data === null) return true;

  var max = data.length;

  return (max === 1 && data === '~') ||
         (max === 4 && (data === 'null' || data === 'Null' || data === 'NULL'));
}

function constructYamlNull() {
  return null;
}

function isNull(object) {
  return object === null;
}

module.exports = new Type('tag:yaml.org,2002:null', {
  kind: 'scalar',
  resolve: resolveYamlNull,
  construct: constructYamlNull,
  predicate: isNull,
  represent: {
    canonical: function () { return '~';    },
    lowercase: function () { return 'null'; },
    uppercase: function () { return 'NULL'; },
    camelcase: function () { return 'Null'; }
  },
  defaultStyle: 'lowercase'
});

},{"../type":16}],27:[function(require,module,exports){
'use strict';

var Type = require('../type');

var _hasOwnProperty = Object.prototype.hasOwnProperty;
var _toString       = Object.prototype.toString;

function resolveYamlOmap(data) {
  if (data === null) return true;

  var objectKeys = [], index, length, pair, pairKey, pairHasKey,
      object = data;

  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];
    pairHasKey = false;

    if (_toString.call(pair) !== '[object Object]') return false;

    for (pairKey in pair) {
      if (_hasOwnProperty.call(pair, pairKey)) {
        if (!pairHasKey) pairHasKey = true;
        else return false;
      }
    }

    if (!pairHasKey) return false;

    if (objectKeys.indexOf(pairKey) === -1) objectKeys.push(pairKey);
    else return false;
  }

  return true;
}

function constructYamlOmap(data) {
  return data !== null ? data : [];
}

module.exports = new Type('tag:yaml.org,2002:omap', {
  kind: 'sequence',
  resolve: resolveYamlOmap,
  construct: constructYamlOmap
});

},{"../type":16}],28:[function(require,module,exports){
'use strict';

var Type = require('../type');

var _toString = Object.prototype.toString;

function resolveYamlPairs(data) {
  if (data === null) return true;

  var index, length, pair, keys, result,
      object = data;

  result = new Array(object.length);

  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];

    if (_toString.call(pair) !== '[object Object]') return false;

    keys = Object.keys(pair);

    if (keys.length !== 1) return false;

    result[index] = [ keys[0], pair[keys[0]] ];
  }

  return true;
}

function constructYamlPairs(data) {
  if (data === null) return [];

  var index, length, pair, keys, result,
      object = data;

  result = new Array(object.length);

  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];

    keys = Object.keys(pair);

    result[index] = [ keys[0], pair[keys[0]] ];
  }

  return result;
}

module.exports = new Type('tag:yaml.org,2002:pairs', {
  kind: 'sequence',
  resolve: resolveYamlPairs,
  construct: constructYamlPairs
});

},{"../type":16}],29:[function(require,module,exports){
'use strict';

var Type = require('../type');

module.exports = new Type('tag:yaml.org,2002:seq', {
  kind: 'sequence',
  construct: function (data) { return data !== null ? data : []; }
});

},{"../type":16}],30:[function(require,module,exports){
'use strict';

var Type = require('../type');

var _hasOwnProperty = Object.prototype.hasOwnProperty;

function resolveYamlSet(data) {
  if (data === null) return true;

  var key, object = data;

  for (key in object) {
    if (_hasOwnProperty.call(object, key)) {
      if (object[key] !== null) return false;
    }
  }

  return true;
}

function constructYamlSet(data) {
  return data !== null ? data : {};
}

module.exports = new Type('tag:yaml.org,2002:set', {
  kind: 'mapping',
  resolve: resolveYamlSet,
  construct: constructYamlSet
});

},{"../type":16}],31:[function(require,module,exports){
'use strict';

var Type = require('../type');

module.exports = new Type('tag:yaml.org,2002:str', {
  kind: 'scalar',
  construct: function (data) { return data !== null ? data : ''; }
});

},{"../type":16}],32:[function(require,module,exports){
'use strict';

var Type = require('../type');

var YAML_DATE_REGEXP = new RegExp(
  '^([0-9][0-9][0-9][0-9])'          + // [1] year
  '-([0-9][0-9])'                    + // [2] month
  '-([0-9][0-9])$');                   // [3] day

var YAML_TIMESTAMP_REGEXP = new RegExp(
  '^([0-9][0-9][0-9][0-9])'          + // [1] year
  '-([0-9][0-9]?)'                   + // [2] month
  '-([0-9][0-9]?)'                   + // [3] day
  '(?:[Tt]|[ \\t]+)'                 + // ...
  '([0-9][0-9]?)'                    + // [4] hour
  ':([0-9][0-9])'                    + // [5] minute
  ':([0-9][0-9])'                    + // [6] second
  '(?:\\.([0-9]*))?'                 + // [7] fraction
  '(?:[ \\t]*(Z|([-+])([0-9][0-9]?)' + // [8] tz [9] tz_sign [10] tz_hour
  '(?::([0-9][0-9]))?))?$');           // [11] tz_minute

function resolveYamlTimestamp(data) {
  if (data === null) return false;
  if (YAML_DATE_REGEXP.exec(data) !== null) return true;
  if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
  return false;
}

function constructYamlTimestamp(data) {
  var match, year, month, day, hour, minute, second, fraction = 0,
      delta = null, tz_hour, tz_minute, date;

  match = YAML_DATE_REGEXP.exec(data);
  if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);

  if (match === null) throw new Error('Date resolve error');

  // match: [1] year [2] month [3] day

  year = +(match[1]);
  month = +(match[2]) - 1; // JS month starts with 0
  day = +(match[3]);

  if (!match[4]) { // no hour
    return new Date(Date.UTC(year, month, day));
  }

  // match: [4] hour [5] minute [6] second [7] fraction

  hour = +(match[4]);
  minute = +(match[5]);
  second = +(match[6]);

  if (match[7]) {
    fraction = match[7].slice(0, 3);
    while (fraction.length < 3) { // milli-seconds
      fraction += '0';
    }
    fraction = +fraction;
  }

  // match: [8] tz [9] tz_sign [10] tz_hour [11] tz_minute

  if (match[9]) {
    tz_hour = +(match[10]);
    tz_minute = +(match[11] || 0);
    delta = (tz_hour * 60 + tz_minute) * 60000; // delta in mili-seconds
    if (match[9] === '-') delta = -delta;
  }

  date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));

  if (delta) date.setTime(date.getTime() - delta);

  return date;
}

function representYamlTimestamp(object /*, style*/) {
  return object.toISOString();
}

module.exports = new Type('tag:yaml.org,2002:timestamp', {
  kind: 'scalar',
  resolve: resolveYamlTimestamp,
  construct: constructYamlTimestamp,
  instanceOf: Date,
  represent: representYamlTimestamp
});

},{"../type":16}],33:[function(require,module,exports){
//from https://github.com/joker-x/languages.js
(function(exports){var langs={attribute:{name:0,nativeName:1},rtl:{ar:1,dv:1,fa:1,ha:1,he:1,ks:1,ku:1,ps:1,ur:1,yi:1},lang:{aa:["Afar","Afar"],ab:["Abkhazian","Аҧсуа"],af:["Afrikaans","Afrikaans"],ak:["Akan","Akana"],am:["Amharic","አማርኛ"],an:["Aragonese","Aragonés"],ar:["Arabic","العربية"],as:["Assamese","অসমীয়া"],av:["Avar","Авар"],ay:["Aymara","Aymar"],az:["Azerbaijani","Azərbaycanca / آذربايجان"],ba:["Bashkir","Башҡорт"],be:["Belarusian","Беларуская"],bg:["Bulgarian","Български"],bh:["Bihari","भोजपुरी"],bi:["Bislama","Bislama"],bm:["Bambara","Bamanankan"],bn:["Bengali","বাংলা"],bo:["Tibetan","བོད་ཡིག / Bod skad"],br:["Breton","Brezhoneg"],bs:["Bosnian","Bosanski"],ca:["Catalan","Català"],ce:["Chechen","Нохчийн"],ch:["Chamorro","Chamoru"],co:["Corsican","Corsu"],cr:["Cree","Nehiyaw"],cs:["Czech","Česky"],cu:["Old Church Slavonic / Old Bulgarian","словѣньскъ / slověnĭskŭ"],cv:["Chuvash","Чăваш"],cy:["Welsh","Cymraeg"],da:["Danish","Dansk"],de:["German","Deutsch"],dv:["Divehi","ދިވެހިބަސް"],dz:["Dzongkha","ཇོང་ཁ"],ee:["Ewe","Ɛʋɛ"],el:["Greek","Ελληνικά"],en:["English","English"],eo:["Esperanto","Esperanto"],es:["Spanish","Español"],et:["Estonian","Eesti"],eu:["Basque","Euskara"],fa:["Persian","فارسی"],ff:["Peul","Fulfulde"],fi:["Finnish","Suomi"],fj:["Fijian","Na Vosa Vakaviti"],fo:["Faroese","Føroyskt"],fr:["French","Français"],fy:["West Frisian","Frysk"],ga:["Irish","Gaeilge"],gd:["Scottish Gaelic","Gàidhlig"],gl:["Galician","Galego"],gn:["Guarani","Avañe'ẽ"],gu:["Gujarati","ગુજરાતી"],gv:["Manx","Gaelg"],ha:["Hausa","هَوُسَ"],he:["Hebrew","עברית"],hi:["Hindi","हिन्दी"],ho:["Hiri Motu","Hiri Motu"],hr:["Croatian","Hrvatski"],ht:["Haitian","Krèyol ayisyen"],hu:["Hungarian","Magyar"],hy:["Armenian","Հայերեն"],hz:["Herero","Otsiherero"],ia:["Interlingua","Interlingua"],id:["Indonesian","Bahasa Indonesia"],ie:["Interlingue","Interlingue"],ig:["Igbo","Igbo"],ii:["Sichuan Yi","ꆇꉙ / 四川彝语"],ik:["Inupiak","Iñupiak"],io:["Ido","Ido"],is:["Icelandic","Íslenska"],it:["Italian","Italiano"],iu:["Inuktitut","ᐃᓄᒃᑎᑐᑦ"],ja:["Japanese","日本語"],jv:["Javanese","Basa Jawa"],ka:["Georgian","ქართული"],kg:["Kongo","KiKongo"],ki:["Kikuyu","Gĩkũyũ"],kj:["Kuanyama","Kuanyama"],kk:["Kazakh","Қазақша"],kl:["Greenlandic","Kalaallisut"],km:["Cambodian","ភាសាខ្មែរ"],kn:["Kannada","ಕನ್ನಡ"],ko:["Korean","한국어"],kr:["Kanuri","Kanuri"],ks:["Kashmiri","कश्मीरी / كشميري"],ku:["Kurdish","Kurdî / كوردی"],kv:["Komi","Коми"],kw:["Cornish","Kernewek"],ky:["Kirghiz","Kırgızca / Кыргызча"],la:["Latin","Latina"],lb:["Luxembourgish","Lëtzebuergesch"],lg:["Ganda","Luganda"],li:["Limburgian","Limburgs"],ln:["Lingala","Lingála"],lo:["Laotian","ລາວ / Pha xa lao"],lt:["Lithuanian","Lietuvių"],lv:["Latvian","Latviešu"],mg:["Malagasy","Malagasy"],mh:["Marshallese","Kajin Majel / Ebon"],mi:["Maori","Māori"],mk:["Macedonian","Македонски"],ml:["Malayalam","മലയാളം"],mn:["Mongolian","Монгол"],mo:["Moldovan","Moldovenească"],mr:["Marathi","मराठी"],ms:["Malay","Bahasa Melayu"],mt:["Maltese","bil-Malti"],my:["Burmese","Myanmasa"],na:["Nauruan","Dorerin Naoero"],nd:["North Ndebele","Sindebele"],ne:["Nepali","नेपाली"],ng:["Ndonga","Oshiwambo"],nl:["Dutch","Nederlands"],nn:["Norwegian Nynorsk","Norsk (nynorsk)"],no:["Norwegian","Norsk (bokmål / riksmål)"],nr:["South Ndebele","isiNdebele"],nv:["Navajo","Diné bizaad"],ny:["Chichewa","Chi-Chewa"],oc:["Occitan","Occitan"],oj:["Ojibwa","ᐊᓂᔑᓈᐯᒧᐎᓐ / Anishinaabemowin"],om:["Oromo","Oromoo"],or:["Oriya","ଓଡ଼ିଆ"],os:["Ossetian / Ossetic","Иронау"],pa:["Panjabi / Punjabi","ਪੰਜਾਬੀ / पंजाबी / پنجابي"],pi:["Pali","Pāli / पाऴि"],pl:["Polish","Polski"],ps:["Pashto","پښتو"],pt:["Portuguese","Português"],qu:["Quechua","Runa Simi"],rm:["Raeto Romance","Rumantsch"],rn:["Kirundi","Kirundi"],ro:["Romanian","Română"],ru:["Russian","Русский"],rw:["Rwandi","Kinyarwandi"],sa:["Sanskrit","संस्कृतम्"],sc:["Sardinian","Sardu"],sd:["Sindhi","सिनधि"],se:["Northern Sami","Sámegiella"],sg:["Sango","Sängö"],sh:["Serbo-Croatian","Srpskohrvatski / Српскохрватски"],si:["Sinhalese","සිංහල"],sk:["Slovak","Slovenčina"],sl:["Slovenian","Slovenščina"],sm:["Samoan","Gagana Samoa"],sn:["Shona","chiShona"],so:["Somalia","Soomaaliga"],sq:["Albanian","Shqip"],sr:["Serbian","Српски"],ss:["Swati","SiSwati"],st:["Southern Sotho","Sesotho"],su:["Sundanese","Basa Sunda"],sv:["Swedish","Svenska"],sw:["Swahili","Kiswahili"],ta:["Tamil","தமிழ்"],te:["Telugu","తెలుగు"],tg:["Tajik","Тоҷикӣ"],th:["Thai","ไทย / Phasa Thai"],ti:["Tigrinya","ትግርኛ"],tk:["Turkmen","Туркмен / تركمن"],tl:["Tagalog / Filipino","Tagalog"],tn:["Tswana","Setswana"],to:["Tonga","Lea Faka-Tonga"],tr:["Turkish","Türkçe"],ts:["Tsonga","Xitsonga"],tt:["Tatar","Tatarça"],tw:["Twi","Twi"],ty:["Tahitian","Reo Mā`ohi"],ug:["Uyghur","Uyƣurqə / ئۇيغۇرچە"],uk:["Ukrainian","Українська"],ur:["Urdu","اردو"],uz:["Uzbek","Ўзбек"],ve:["Venda","Tshivenḓa"],vi:["Vietnamese","Tiếng Việt"],vo:["Volapük","Volapük"],wa:["Walloon","Walon"],wo:["Wolof","Wollof"],xh:["Xhosa","isiXhosa"],yi:["Yiddish","ייִדיש"],yo:["Yoruba","Yorùbá"],za:["Zhuang","Cuengh / Tôô / 壮语"],zh:["Chinese","中文"],zu:["Zulu","isiZulu"]}};var getLangDirection=function(langcode){return langs.rtl[langcode]?"rtl":"ltr"};exports.isValid=function(langcode){return langs.lang.hasOwnProperty(langcode)};exports.getAllLanguageCode=function(){var result=[];for(langcode in langs.lang){result.push(langcode)}return result};exports.getLanguageInfo=function(langcode){var result={};if(exports.isValid(langcode)){var lang=langs.lang[langcode];result["name"]=lang[0];result["nativeName"]=lang[1];result["direction"]=getLangDirection(langcode)}return result}})(typeof exports==="undefined"?this["languages"]={}:exports);

},{}],34:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],35:[function(require,module,exports){
/**
 * Root reference for iframes.
 */

var root;
if (typeof window !== 'undefined') { // Browser window
  root = window;
} else if (typeof self !== 'undefined') { // Web Worker
  root = self;
} else { // Other environments
  console.warn("Using browser-only version of superagent in non-browser environment");
  root = this;
}

var Emitter = require('component-emitter');
var RequestBase = require('./request-base');
var isObject = require('./is-object');
var isFunction = require('./is-function');
var ResponseBase = require('./response-base');
var shouldRetry = require('./should-retry');

/**
 * Noop.
 */

function noop(){};

/**
 * Expose `request`.
 */

var request = exports = module.exports = function(method, url) {
  // callback
  if ('function' == typeof url) {
    return new exports.Request('GET', method).end(url);
  }

  // url first
  if (1 == arguments.length) {
    return new exports.Request('GET', method);
  }

  return new exports.Request(method, url);
}

exports.Request = Request;

/**
 * Determine XHR.
 */

request.getXHR = function () {
  if (root.XMLHttpRequest
      && (!root.location || 'file:' != root.location.protocol
          || !root.ActiveXObject)) {
    return new XMLHttpRequest;
  } else {
    try { return new ActiveXObject('Microsoft.XMLHTTP'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP.6.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP.3.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP'); } catch(e) {}
  }
  throw Error("Browser-only verison of superagent could not find XHR");
};

/**
 * Removes leading and trailing whitespace, added to support IE.
 *
 * @param {String} s
 * @return {String}
 * @api private
 */

var trim = ''.trim
  ? function(s) { return s.trim(); }
  : function(s) { return s.replace(/(^\s*|\s*$)/g, ''); };

/**
 * Serialize the given `obj`.
 *
 * @param {Object} obj
 * @return {String}
 * @api private
 */

function serialize(obj) {
  if (!isObject(obj)) return obj;
  var pairs = [];
  for (var key in obj) {
    pushEncodedKeyValuePair(pairs, key, obj[key]);
  }
  return pairs.join('&');
}

/**
 * Helps 'serialize' with serializing arrays.
 * Mutates the pairs array.
 *
 * @param {Array} pairs
 * @param {String} key
 * @param {Mixed} val
 */

function pushEncodedKeyValuePair(pairs, key, val) {
  if (val != null) {
    if (Array.isArray(val)) {
      val.forEach(function(v) {
        pushEncodedKeyValuePair(pairs, key, v);
      });
    } else if (isObject(val)) {
      for(var subkey in val) {
        pushEncodedKeyValuePair(pairs, key + '[' + subkey + ']', val[subkey]);
      }
    } else {
      pairs.push(encodeURIComponent(key)
        + '=' + encodeURIComponent(val));
    }
  } else if (val === null) {
    pairs.push(encodeURIComponent(key));
  }
}

/**
 * Expose serialization method.
 */

 request.serializeObject = serialize;

 /**
  * Parse the given x-www-form-urlencoded `str`.
  *
  * @param {String} str
  * @return {Object}
  * @api private
  */

function parseString(str) {
  var obj = {};
  var pairs = str.split('&');
  var pair;
  var pos;

  for (var i = 0, len = pairs.length; i < len; ++i) {
    pair = pairs[i];
    pos = pair.indexOf('=');
    if (pos == -1) {
      obj[decodeURIComponent(pair)] = '';
    } else {
      obj[decodeURIComponent(pair.slice(0, pos))] =
        decodeURIComponent(pair.slice(pos + 1));
    }
  }

  return obj;
}

/**
 * Expose parser.
 */

request.parseString = parseString;

/**
 * Default MIME type map.
 *
 *     superagent.types.xml = 'application/xml';
 *
 */

request.types = {
  html: 'text/html',
  json: 'application/json',
  xml: 'application/xml',
  urlencoded: 'application/x-www-form-urlencoded',
  'form': 'application/x-www-form-urlencoded',
  'form-data': 'application/x-www-form-urlencoded'
};

/**
 * Default serialization map.
 *
 *     superagent.serialize['application/xml'] = function(obj){
 *       return 'generated xml here';
 *     };
 *
 */

 request.serialize = {
   'application/x-www-form-urlencoded': serialize,
   'application/json': JSON.stringify
 };

 /**
  * Default parsers.
  *
  *     superagent.parse['application/xml'] = function(str){
  *       return { object parsed from str };
  *     };
  *
  */

request.parse = {
  'application/x-www-form-urlencoded': parseString,
  'application/json': JSON.parse
};

/**
 * Parse the given header `str` into
 * an object containing the mapped fields.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function parseHeader(str) {
  var lines = str.split(/\r?\n/);
  var fields = {};
  var index;
  var line;
  var field;
  var val;

  lines.pop(); // trailing CRLF

  for (var i = 0, len = lines.length; i < len; ++i) {
    line = lines[i];
    index = line.indexOf(':');
    field = line.slice(0, index).toLowerCase();
    val = trim(line.slice(index + 1));
    fields[field] = val;
  }

  return fields;
}

/**
 * Check if `mime` is json or has +json structured syntax suffix.
 *
 * @param {String} mime
 * @return {Boolean}
 * @api private
 */

function isJSON(mime) {
  return /[\/+]json\b/.test(mime);
}

/**
 * Initialize a new `Response` with the given `xhr`.
 *
 *  - set flags (.ok, .error, etc)
 *  - parse header
 *
 * Examples:
 *
 *  Aliasing `superagent` as `request` is nice:
 *
 *      request = superagent;
 *
 *  We can use the promise-like API, or pass callbacks:
 *
 *      request.get('/').end(function(res){});
 *      request.get('/', function(res){});
 *
 *  Sending data can be chained:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' })
 *        .end(function(res){});
 *
 *  Or passed to `.send()`:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' }, function(res){});
 *
 *  Or passed to `.post()`:
 *
 *      request
 *        .post('/user', { name: 'tj' })
 *        .end(function(res){});
 *
 * Or further reduced to a single call for simple cases:
 *
 *      request
 *        .post('/user', { name: 'tj' }, function(res){});
 *
 * @param {XMLHTTPRequest} xhr
 * @param {Object} options
 * @api private
 */

function Response(req) {
  this.req = req;
  this.xhr = this.req.xhr;
  // responseText is accessible only if responseType is '' or 'text' and on older browsers
  this.text = ((this.req.method !='HEAD' && (this.xhr.responseType === '' || this.xhr.responseType === 'text')) || typeof this.xhr.responseType === 'undefined')
     ? this.xhr.responseText
     : null;
  this.statusText = this.req.xhr.statusText;
  var status = this.xhr.status;
  // handle IE9 bug: http://stackoverflow.com/questions/10046972/msie-returns-status-code-of-1223-for-ajax-request
  if (status === 1223) {
      status = 204;
  }
  this._setStatusProperties(status);
  this.header = this.headers = parseHeader(this.xhr.getAllResponseHeaders());
  // getAllResponseHeaders sometimes falsely returns "" for CORS requests, but
  // getResponseHeader still works. so we get content-type even if getting
  // other headers fails.
  this.header['content-type'] = this.xhr.getResponseHeader('content-type');
  this._setHeaderProperties(this.header);

  if (null === this.text && req._responseType) {
    this.body = this.xhr.response;
  } else {
    this.body = this.req.method != 'HEAD'
      ? this._parseBody(this.text ? this.text : this.xhr.response)
      : null;
  }
}

ResponseBase(Response.prototype);

/**
 * Parse the given body `str`.
 *
 * Used for auto-parsing of bodies. Parsers
 * are defined on the `superagent.parse` object.
 *
 * @param {String} str
 * @return {Mixed}
 * @api private
 */

Response.prototype._parseBody = function(str){
  var parse = request.parse[this.type];
  if(this.req._parser) {
    return this.req._parser(this, str);
  }
  if (!parse && isJSON(this.type)) {
    parse = request.parse['application/json'];
  }
  return parse && str && (str.length || str instanceof Object)
    ? parse(str)
    : null;
};

/**
 * Return an `Error` representative of this response.
 *
 * @return {Error}
 * @api public
 */

Response.prototype.toError = function(){
  var req = this.req;
  var method = req.method;
  var url = req.url;

  var msg = 'cannot ' + method + ' ' + url + ' (' + this.status + ')';
  var err = new Error(msg);
  err.status = this.status;
  err.method = method;
  err.url = url;

  return err;
};

/**
 * Expose `Response`.
 */

request.Response = Response;

/**
 * Initialize a new `Request` with the given `method` and `url`.
 *
 * @param {String} method
 * @param {String} url
 * @api public
 */

function Request(method, url) {
  var self = this;
  this._query = this._query || [];
  this.method = method;
  this.url = url;
  this.header = {}; // preserves header name case
  this._header = {}; // coerces header names to lowercase
  this.on('end', function(){
    var err = null;
    var res = null;

    try {
      res = new Response(self);
    } catch(e) {
      err = new Error('Parser is unable to parse the response');
      err.parse = true;
      err.original = e;
      // issue #675: return the raw response if the response parsing fails
      if (self.xhr) {
        // ie9 doesn't have 'response' property
        err.rawResponse = typeof self.xhr.responseType == 'undefined' ? self.xhr.responseText : self.xhr.response;
        // issue #876: return the http status code if the response parsing fails
        err.status = self.xhr.status ? self.xhr.status : null;
        err.statusCode = err.status; // backwards-compat only
      } else {
        err.rawResponse = null;
        err.status = null;
      }

      return self.callback(err);
    }

    self.emit('response', res);

    var new_err;
    try {
      if (!self._isResponseOK(res)) {
        new_err = new Error(res.statusText || 'Unsuccessful HTTP response');
        new_err.original = err;
        new_err.response = res;
        new_err.status = res.status;
      }
    } catch(e) {
      new_err = e; // #985 touching res may cause INVALID_STATE_ERR on old Android
    }

    // #1000 don't catch errors from the callback to avoid double calling it
    if (new_err) {
      self.callback(new_err, res);
    } else {
      self.callback(null, res);
    }
  });
}

/**
 * Mixin `Emitter` and `RequestBase`.
 */

Emitter(Request.prototype);
RequestBase(Request.prototype);

/**
 * Set Content-Type to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.xml = 'application/xml';
 *
 *      request.post('/')
 *        .type('xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 *      request.post('/')
 *        .type('application/xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 * @param {String} type
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.type = function(type){
  this.set('Content-Type', request.types[type] || type);
  return this;
};

/**
 * Set Accept to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.json = 'application/json';
 *
 *      request.get('/agent')
 *        .accept('json')
 *        .end(callback);
 *
 *      request.get('/agent')
 *        .accept('application/json')
 *        .end(callback);
 *
 * @param {String} accept
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.accept = function(type){
  this.set('Accept', request.types[type] || type);
  return this;
};

/**
 * Set Authorization field value with `user` and `pass`.
 *
 * @param {String} user
 * @param {String} [pass] optional in case of using 'bearer' as type
 * @param {Object} options with 'type' property 'auto', 'basic' or 'bearer' (default 'basic')
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.auth = function(user, pass, options){
  if (typeof pass === 'object' && pass !== null) { // pass is optional and can substitute for options
    options = pass;
  }
  if (!options) {
    options = {
      type: 'function' === typeof btoa ? 'basic' : 'auto',
    }
  }

  switch (options.type) {
    case 'basic':
      this.set('Authorization', 'Basic ' + btoa(user + ':' + pass));
    break;

    case 'auto':
      this.username = user;
      this.password = pass;
    break;
      
    case 'bearer': // usage would be .auth(accessToken, { type: 'bearer' })
      this.set('Authorization', 'Bearer ' + user);
    break;  
  }
  return this;
};

/**
 * Add query-string `val`.
 *
 * Examples:
 *
 *   request.get('/shoes')
 *     .query('size=10')
 *     .query({ color: 'blue' })
 *
 * @param {Object|String} val
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.query = function(val){
  if ('string' != typeof val) val = serialize(val);
  if (val) this._query.push(val);
  return this;
};

/**
 * Queue the given `file` as an attachment to the specified `field`,
 * with optional `options` (or filename).
 *
 * ``` js
 * request.post('/upload')
 *   .attach('content', new Blob(['<a id="a"><b id="b">hey!</b></a>'], { type: "text/html"}))
 *   .end(callback);
 * ```
 *
 * @param {String} field
 * @param {Blob|File} file
 * @param {String|Object} options
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.attach = function(field, file, options){
  if (file) {
    if (this._data) {
      throw Error("superagent can't mix .send() and .attach()");
    }

    this._getFormData().append(field, file, options || file.name);
  }
  return this;
};

Request.prototype._getFormData = function(){
  if (!this._formData) {
    this._formData = new root.FormData();
  }
  return this._formData;
};

/**
 * Invoke the callback with `err` and `res`
 * and handle arity check.
 *
 * @param {Error} err
 * @param {Response} res
 * @api private
 */

Request.prototype.callback = function(err, res){
  // console.log(this._retries, this._maxRetries)
  if (this._maxRetries && this._retries++ < this._maxRetries && shouldRetry(err, res)) {
    return this._retry();
  }

  var fn = this._callback;
  this.clearTimeout();

  if (err) {
    if (this._maxRetries) err.retries = this._retries - 1;
    this.emit('error', err);
  }

  fn(err, res);
};

/**
 * Invoke callback with x-domain error.
 *
 * @api private
 */

Request.prototype.crossDomainError = function(){
  var err = new Error('Request has been terminated\nPossible causes: the network is offline, Origin is not allowed by Access-Control-Allow-Origin, the page is being unloaded, etc.');
  err.crossDomain = true;

  err.status = this.status;
  err.method = this.method;
  err.url = this.url;

  this.callback(err);
};

// This only warns, because the request is still likely to work
Request.prototype.buffer = Request.prototype.ca = Request.prototype.agent = function(){
  console.warn("This is not supported in browser version of superagent");
  return this;
};

// This throws, because it can't send/receive data as expected
Request.prototype.pipe = Request.prototype.write = function(){
  throw Error("Streaming is not supported in browser version of superagent");
};

/**
 * Compose querystring to append to req.url
 *
 * @api private
 */

Request.prototype._appendQueryString = function(){
  var query = this._query.join('&');
  if (query) {
    this.url += (this.url.indexOf('?') >= 0 ? '&' : '?') + query;
  }

  if (this._sort) {
    var index = this.url.indexOf('?');
    if (index >= 0) {
      var queryArr = this.url.substring(index + 1).split('&');
      if (isFunction(this._sort)) {
        queryArr.sort(this._sort);
      } else {
        queryArr.sort();
      }
      this.url = this.url.substring(0, index) + '?' + queryArr.join('&');
    }
  }
};

/**
 * Check if `obj` is a host object,
 * we don't want to serialize these :)
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */
Request.prototype._isHost = function _isHost(obj) {
  // Native objects stringify to [object File], [object Blob], [object FormData], etc.
  return obj && 'object' === typeof obj && !Array.isArray(obj) && Object.prototype.toString.call(obj) !== '[object Object]';
}

/**
 * Initiate request, invoking callback `fn(res)`
 * with an instanceof `Response`.
 *
 * @param {Function} fn
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.end = function(fn){
  if (this._endCalled) {
    console.warn("Warning: .end() was called twice. This is not supported in superagent");
  }
  this._endCalled = true;

  // store callback
  this._callback = fn || noop;

  // querystring
  this._appendQueryString();

  return this._end();
};

Request.prototype._end = function() {
  var self = this;
  var xhr = this.xhr = request.getXHR();
  var data = this._formData || this._data;

  this._setTimeouts();

  // state change
  xhr.onreadystatechange = function(){
    var readyState = xhr.readyState;
    if (readyState >= 2 && self._responseTimeoutTimer) {
      clearTimeout(self._responseTimeoutTimer);
    }
    if (4 != readyState) {
      return;
    }

    // In IE9, reads to any property (e.g. status) off of an aborted XHR will
    // result in the error "Could not complete the operation due to error c00c023f"
    var status;
    try { status = xhr.status } catch(e) { status = 0; }

    if (!status) {
      if (self.timedout || self._aborted) return;
      return self.crossDomainError();
    }
    self.emit('end');
  };

  // progress
  var handleProgress = function(direction, e) {
    if (e.total > 0) {
      e.percent = e.loaded / e.total * 100;
    }
    e.direction = direction;
    self.emit('progress', e);
  }
  if (this.hasListeners('progress')) {
    try {
      xhr.onprogress = handleProgress.bind(null, 'download');
      if (xhr.upload) {
        xhr.upload.onprogress = handleProgress.bind(null, 'upload');
      }
    } catch(e) {
      // Accessing xhr.upload fails in IE from a web worker, so just pretend it doesn't exist.
      // Reported here:
      // https://connect.microsoft.com/IE/feedback/details/837245/xmlhttprequest-upload-throws-invalid-argument-when-used-from-web-worker-context
    }
  }

  // initiate request
  try {
    if (this.username && this.password) {
      xhr.open(this.method, this.url, true, this.username, this.password);
    } else {
      xhr.open(this.method, this.url, true);
    }
  } catch (err) {
    // see #1149
    return this.callback(err);
  }

  // CORS
  if (this._withCredentials) xhr.withCredentials = true;

  // body
  if (!this._formData && 'GET' != this.method && 'HEAD' != this.method && 'string' != typeof data && !this._isHost(data)) {
    // serialize stuff
    var contentType = this._header['content-type'];
    var serialize = this._serializer || request.serialize[contentType ? contentType.split(';')[0] : ''];
    if (!serialize && isJSON(contentType)) {
      serialize = request.serialize['application/json'];
    }
    if (serialize) data = serialize(data);
  }

  // set header fields
  for (var field in this.header) {
    if (null == this.header[field]) continue;

    if (this.header.hasOwnProperty(field))
      xhr.setRequestHeader(field, this.header[field]);
  }

  if (this._responseType) {
    xhr.responseType = this._responseType;
  }

  // send stuff
  this.emit('request', this);

  // IE11 xhr.send(undefined) sends 'undefined' string as POST payload (instead of nothing)
  // We need null here if data is undefined
  xhr.send(typeof data !== 'undefined' ? data : null);
  return this;
};

/**
 * GET `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} [data] or fn
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */

request.get = function(url, data, fn){
  var req = request('GET', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.query(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * HEAD `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} [data] or fn
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */

request.head = function(url, data, fn){
  var req = request('HEAD', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * OPTIONS query to `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} [data] or fn
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */

request.options = function(url, data, fn){
  var req = request('OPTIONS', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * DELETE `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} [data]
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */

function del(url, data, fn){
  var req = request('DELETE', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

request['del'] = del;
request['delete'] = del;

/**
 * PATCH `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} [data]
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */

request.patch = function(url, data, fn){
  var req = request('PATCH', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * POST `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} [data]
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */

request.post = function(url, data, fn){
  var req = request('POST', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * PUT `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} [data] or fn
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */

request.put = function(url, data, fn){
  var req = request('PUT', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

},{"./is-function":36,"./is-object":37,"./request-base":38,"./response-base":39,"./should-retry":40,"component-emitter":2}],36:[function(require,module,exports){
/**
 * Check if `fn` is a function.
 *
 * @param {Function} fn
 * @return {Boolean}
 * @api private
 */
var isObject = require('./is-object');

function isFunction(fn) {
  var tag = isObject(fn) ? Object.prototype.toString.call(fn) : '';
  return tag === '[object Function]';
}

module.exports = isFunction;

},{"./is-object":37}],37:[function(require,module,exports){
/**
 * Check if `obj` is an object.
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isObject(obj) {
  return null !== obj && 'object' === typeof obj;
}

module.exports = isObject;

},{}],38:[function(require,module,exports){
/**
 * Module of mixed-in functions shared between node and client code
 */
var isObject = require('./is-object');

/**
 * Expose `RequestBase`.
 */

module.exports = RequestBase;

/**
 * Initialize a new `RequestBase`.
 *
 * @api public
 */

function RequestBase(obj) {
  if (obj) return mixin(obj);
}

/**
 * Mixin the prototype properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in RequestBase.prototype) {
    obj[key] = RequestBase.prototype[key];
  }
  return obj;
}

/**
 * Clear previous timeout.
 *
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.clearTimeout = function _clearTimeout(){
  clearTimeout(this._timer);
  clearTimeout(this._responseTimeoutTimer);
  delete this._timer;
  delete this._responseTimeoutTimer;
  return this;
};

/**
 * Override default response body parser
 *
 * This function will be called to convert incoming data into request.body
 *
 * @param {Function}
 * @api public
 */

RequestBase.prototype.parse = function parse(fn){
  this._parser = fn;
  return this;
};

/**
 * Set format of binary response body.
 * In browser valid formats are 'blob' and 'arraybuffer',
 * which return Blob and ArrayBuffer, respectively.
 *
 * In Node all values result in Buffer.
 *
 * Examples:
 *
 *      req.get('/')
 *        .responseType('blob')
 *        .end(callback);
 *
 * @param {String} val
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.responseType = function(val){
  this._responseType = val;
  return this;
};

/**
 * Override default request body serializer
 *
 * This function will be called to convert data set via .send or .attach into payload to send
 *
 * @param {Function}
 * @api public
 */

RequestBase.prototype.serialize = function serialize(fn){
  this._serializer = fn;
  return this;
};

/**
 * Set timeouts.
 *
 * - response timeout is time between sending request and receiving the first byte of the response. Includes DNS and connection time.
 * - deadline is the time from start of the request to receiving response body in full. If the deadline is too short large files may not load at all on slow connections.
 *
 * Value of 0 or false means no timeout.
 *
 * @param {Number|Object} ms or {response, read, deadline}
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.timeout = function timeout(options){
  if (!options || 'object' !== typeof options) {
    this._timeout = options;
    this._responseTimeout = 0;
    return this;
  }

  for(var option in options) {
    switch(option) {
      case 'deadline':
        this._timeout = options.deadline;
        break;
      case 'response':
        this._responseTimeout = options.response;
        break;
      default:
        console.warn("Unknown timeout option", option);
    }
  }
  return this;
};

/**
 * Set number of retry attempts on error.
 *
 * Failed requests will be retried 'count' times if timeout or err.code >= 500.
 *
 * @param {Number} count
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.retry = function retry(count){
  // Default to 1 if no count passed or true
  if (arguments.length === 0 || count === true) count = 1;
  if (count <= 0) count = 0;
  this._maxRetries = count;
  this._retries = 0;
  return this;
};

/**
 * Retry request
 *
 * @return {Request} for chaining
 * @api private
 */

RequestBase.prototype._retry = function() {
  this.clearTimeout();

  // node
  if (this.req) {
    this.req = null;
    this.req = this.request();
  }

  this._aborted = false;
  this.timedout = false;

  return this._end();
};

/**
 * Promise support
 *
 * @param {Function} resolve
 * @param {Function} [reject]
 * @return {Request}
 */

RequestBase.prototype.then = function then(resolve, reject) {
  if (!this._fullfilledPromise) {
    var self = this;
    if (this._endCalled) {
      console.warn("Warning: superagent request was sent twice, because both .end() and .then() were called. Never call .end() if you use promises");
    }
    this._fullfilledPromise = new Promise(function(innerResolve, innerReject){
      self.end(function(err, res){
        if (err) innerReject(err); else innerResolve(res);
      });
    });
  }
  return this._fullfilledPromise.then(resolve, reject);
}

RequestBase.prototype.catch = function(cb) {
  return this.then(undefined, cb);
};

/**
 * Allow for extension
 */

RequestBase.prototype.use = function use(fn) {
  fn(this);
  return this;
}

RequestBase.prototype.ok = function(cb) {
  if ('function' !== typeof cb) throw Error("Callback required");
  this._okCallback = cb;
  return this;
};

RequestBase.prototype._isResponseOK = function(res) {
  if (!res) {
    return false;
  }

  if (this._okCallback) {
    return this._okCallback(res);
  }

  return res.status >= 200 && res.status < 300;
};


/**
 * Get request header `field`.
 * Case-insensitive.
 *
 * @param {String} field
 * @return {String}
 * @api public
 */

RequestBase.prototype.get = function(field){
  return this._header[field.toLowerCase()];
};

/**
 * Get case-insensitive header `field` value.
 * This is a deprecated internal API. Use `.get(field)` instead.
 *
 * (getHeader is no longer used internally by the superagent code base)
 *
 * @param {String} field
 * @return {String}
 * @api private
 * @deprecated
 */

RequestBase.prototype.getHeader = RequestBase.prototype.get;

/**
 * Set header `field` to `val`, or multiple fields with one object.
 * Case-insensitive.
 *
 * Examples:
 *
 *      req.get('/')
 *        .set('Accept', 'application/json')
 *        .set('X-API-Key', 'foobar')
 *        .end(callback);
 *
 *      req.get('/')
 *        .set({ Accept: 'application/json', 'X-API-Key': 'foobar' })
 *        .end(callback);
 *
 * @param {String|Object} field
 * @param {String} val
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.set = function(field, val){
  if (isObject(field)) {
    for (var key in field) {
      this.set(key, field[key]);
    }
    return this;
  }
  this._header[field.toLowerCase()] = val;
  this.header[field] = val;
  return this;
};

/**
 * Remove header `field`.
 * Case-insensitive.
 *
 * Example:
 *
 *      req.get('/')
 *        .unset('User-Agent')
 *        .end(callback);
 *
 * @param {String} field
 */
RequestBase.prototype.unset = function(field){
  delete this._header[field.toLowerCase()];
  delete this.header[field];
  return this;
};

/**
 * Write the field `name` and `val`, or multiple fields with one object
 * for "multipart/form-data" request bodies.
 *
 * ``` js
 * request.post('/upload')
 *   .field('foo', 'bar')
 *   .end(callback);
 *
 * request.post('/upload')
 *   .field({ foo: 'bar', baz: 'qux' })
 *   .end(callback);
 * ```
 *
 * @param {String|Object} name
 * @param {String|Blob|File|Buffer|fs.ReadStream} val
 * @return {Request} for chaining
 * @api public
 */
RequestBase.prototype.field = function(name, val) {

  // name should be either a string or an object.
  if (null === name ||  undefined === name) {
    throw new Error('.field(name, val) name can not be empty');
  }

  if (this._data) {
    console.error(".field() can't be used if .send() is used. Please use only .send() or only .field() & .attach()");
  }

  if (isObject(name)) {
    for (var key in name) {
      this.field(key, name[key]);
    }
    return this;
  }

  if (Array.isArray(val)) {
    for (var i in val) {
      this.field(name, val[i]);
    }
    return this;
  }

  // val should be defined now
  if (null === val || undefined === val) {
    throw new Error('.field(name, val) val can not be empty');
  }
  if ('boolean' === typeof val) {
    val = '' + val;
  }
  this._getFormData().append(name, val);
  return this;
};

/**
 * Abort the request, and clear potential timeout.
 *
 * @return {Request}
 * @api public
 */
RequestBase.prototype.abort = function(){
  if (this._aborted) {
    return this;
  }
  this._aborted = true;
  this.xhr && this.xhr.abort(); // browser
  this.req && this.req.abort(); // node
  this.clearTimeout();
  this.emit('abort');
  return this;
};

/**
 * Enable transmission of cookies with x-domain requests.
 *
 * Note that for this to work the origin must not be
 * using "Access-Control-Allow-Origin" with a wildcard,
 * and also must set "Access-Control-Allow-Credentials"
 * to "true".
 *
 * @api public
 */

RequestBase.prototype.withCredentials = function(on){
  // This is browser-only functionality. Node side is no-op.
  if(on==undefined) on = true;
  this._withCredentials = on;
  return this;
};

/**
 * Set the max redirects to `n`. Does noting in browser XHR implementation.
 *
 * @param {Number} n
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.redirects = function(n){
  this._maxRedirects = n;
  return this;
};

/**
 * Convert to a plain javascript object (not JSON string) of scalar properties.
 * Note as this method is designed to return a useful non-this value,
 * it cannot be chained.
 *
 * @return {Object} describing method, url, and data of this request
 * @api public
 */

RequestBase.prototype.toJSON = function(){
  return {
    method: this.method,
    url: this.url,
    data: this._data,
    headers: this._header
  };
};


/**
 * Send `data` as the request body, defaulting the `.type()` to "json" when
 * an object is given.
 *
 * Examples:
 *
 *       // manual json
 *       request.post('/user')
 *         .type('json')
 *         .send('{"name":"tj"}')
 *         .end(callback)
 *
 *       // auto json
 *       request.post('/user')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // manual x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send('name=tj')
 *         .end(callback)
 *
 *       // auto x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // defaults to x-www-form-urlencoded
 *      request.post('/user')
 *        .send('name=tobi')
 *        .send('species=ferret')
 *        .end(callback)
 *
 * @param {String|Object} data
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.send = function(data){
  var isObj = isObject(data);
  var type = this._header['content-type'];

  if (this._formData) {
    console.error(".send() can't be used if .attach() or .field() is used. Please use only .send() or only .field() & .attach()");
  }

  if (isObj && !this._data) {
    if (Array.isArray(data)) {
      this._data = [];
    } else if (!this._isHost(data)) {
      this._data = {};
    }
  } else if (data && this._data && this._isHost(this._data)) {
    throw Error("Can't merge these send calls");
  }

  // merge
  if (isObj && isObject(this._data)) {
    for (var key in data) {
      this._data[key] = data[key];
    }
  } else if ('string' == typeof data) {
    // default to x-www-form-urlencoded
    if (!type) this.type('form');
    type = this._header['content-type'];
    if ('application/x-www-form-urlencoded' == type) {
      this._data = this._data
        ? this._data + '&' + data
        : data;
    } else {
      this._data = (this._data || '') + data;
    }
  } else {
    this._data = data;
  }

  if (!isObj || this._isHost(data)) {
    return this;
  }

  // default to json
  if (!type) this.type('json');
  return this;
};


/**
 * Sort `querystring` by the sort function
 *
 *
 * Examples:
 *
 *       // default order
 *       request.get('/user')
 *         .query('name=Nick')
 *         .query('search=Manny')
 *         .sortQuery()
 *         .end(callback)
 *
 *       // customized sort function
 *       request.get('/user')
 *         .query('name=Nick')
 *         .query('search=Manny')
 *         .sortQuery(function(a, b){
 *           return a.length - b.length;
 *         })
 *         .end(callback)
 *
 *
 * @param {Function} sort
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.sortQuery = function(sort) {
  // _sort default to true but otherwise can be a function or boolean
  this._sort = typeof sort === 'undefined' ? true : sort;
  return this;
};

/**
 * Invoke callback with timeout error.
 *
 * @api private
 */

RequestBase.prototype._timeoutError = function(reason, timeout, errno){
  if (this._aborted) {
    return;
  }
  var err = new Error(reason + timeout + 'ms exceeded');
  err.timeout = timeout;
  err.code = 'ECONNABORTED';
  err.errno = errno;
  this.timedout = true;
  this.abort();
  this.callback(err);
};

RequestBase.prototype._setTimeouts = function() {
  var self = this;

  // deadline
  if (this._timeout && !this._timer) {
    this._timer = setTimeout(function(){
      self._timeoutError('Timeout of ', self._timeout, 'ETIME');
    }, this._timeout);
  }
  // response timeout
  if (this._responseTimeout && !this._responseTimeoutTimer) {
    this._responseTimeoutTimer = setTimeout(function(){
      self._timeoutError('Response timeout of ', self._responseTimeout, 'ETIMEDOUT');
    }, this._responseTimeout);
  }
}

},{"./is-object":37}],39:[function(require,module,exports){

/**
 * Module dependencies.
 */

var utils = require('./utils');

/**
 * Expose `ResponseBase`.
 */

module.exports = ResponseBase;

/**
 * Initialize a new `ResponseBase`.
 *
 * @api public
 */

function ResponseBase(obj) {
  if (obj) return mixin(obj);
}

/**
 * Mixin the prototype properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in ResponseBase.prototype) {
    obj[key] = ResponseBase.prototype[key];
  }
  return obj;
}

/**
 * Get case-insensitive `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api public
 */

ResponseBase.prototype.get = function(field){
    return this.header[field.toLowerCase()];
};

/**
 * Set header related properties:
 *
 *   - `.type` the content type without params
 *
 * A response of "Content-Type: text/plain; charset=utf-8"
 * will provide you with a `.type` of "text/plain".
 *
 * @param {Object} header
 * @api private
 */

ResponseBase.prototype._setHeaderProperties = function(header){
    // TODO: moar!
    // TODO: make this a util

    // content-type
    var ct = header['content-type'] || '';
    this.type = utils.type(ct);

    // params
    var params = utils.params(ct);
    for (var key in params) this[key] = params[key];

    this.links = {};

    // links
    try {
        if (header.link) {
            this.links = utils.parseLinks(header.link);
        }
    } catch (err) {
        // ignore
    }
};

/**
 * Set flags such as `.ok` based on `status`.
 *
 * For example a 2xx response will give you a `.ok` of __true__
 * whereas 5xx will be __false__ and `.error` will be __true__. The
 * `.clientError` and `.serverError` are also available to be more
 * specific, and `.statusType` is the class of error ranging from 1..5
 * sometimes useful for mapping respond colors etc.
 *
 * "sugar" properties are also defined for common cases. Currently providing:
 *
 *   - .noContent
 *   - .badRequest
 *   - .unauthorized
 *   - .notAcceptable
 *   - .notFound
 *
 * @param {Number} status
 * @api private
 */

ResponseBase.prototype._setStatusProperties = function(status){
    var type = status / 100 | 0;

    // status / class
    this.status = this.statusCode = status;
    this.statusType = type;

    // basics
    this.info = 1 == type;
    this.ok = 2 == type;
    this.redirect = 3 == type;
    this.clientError = 4 == type;
    this.serverError = 5 == type;
    this.error = (4 == type || 5 == type)
        ? this.toError()
        : false;

    // sugar
    this.accepted = 202 == status;
    this.noContent = 204 == status;
    this.badRequest = 400 == status;
    this.unauthorized = 401 == status;
    this.notAcceptable = 406 == status;
    this.forbidden = 403 == status;
    this.notFound = 404 == status;
};

},{"./utils":41}],40:[function(require,module,exports){
var ERROR_CODES = [
  'ECONNRESET',
  'ETIMEDOUT',
  'EADDRINFO',
  'ESOCKETTIMEDOUT'
];

/**
 * Determine if a request should be retried.
 * (Borrowed from segmentio/superagent-retry)
 *
 * @param {Error} err
 * @param {Response} [res]
 * @returns {Boolean}
 */
module.exports = function shouldRetry(err, res) {
  if (err && err.code && ~ERROR_CODES.indexOf(err.code)) return true;
  if (res && res.status && res.status >= 500) return true;
  // Superagent timeout
  if (err && 'timeout' in err && err.code == 'ECONNABORTED') return true;
  if (err && 'crossDomain' in err) return true;
  return false;
};

},{}],41:[function(require,module,exports){

/**
 * Return the mime type for the given `str`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

exports.type = function(str){
  return str.split(/ *; */).shift();
};

/**
 * Return header field parameters.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

exports.params = function(str){
  return str.split(/ *; */).reduce(function(obj, str){
    var parts = str.split(/ *= */);
    var key = parts.shift();
    var val = parts.shift();

    if (key && val) obj[key] = val;
    return obj;
  }, {});
};

/**
 * Parse Link header fields.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

exports.parseLinks = function(str){
  return str.split(/ *, */).reduce(function(obj, str){
    var parts = str.split(/ *; */);
    var url = parts[0].slice(1, -1);
    var rel = parts[1].split(/ *= */)[1].slice(1, -1);
    obj[rel] = url;
    return obj;
  }, {});
};

/**
 * Strip content related fields from `header`.
 *
 * @param {Object} header
 * @return {Object} header
 * @api private
 */

exports.cleanHeader = function(header, shouldStripCookie){
  delete header['content-type'];
  delete header['content-length'];
  delete header['transfer-encoding'];
  delete header['host'];
  if (shouldStripCookie) {
    delete header['cookie'];
  }
  return header;
};
},{}],42:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _application = require('./application');

var _application2 = _interopRequireDefault(_application);

var _browserHelper = require('./browser-helper');

var _browserHelper2 = _interopRequireDefault(_browserHelper);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Promise = require('bluebird');
var superagent = require('superagent');
var yaml = require('js-yaml');

var languages = require('languages');

var AppLauncher = function () {
  function AppLauncher() {
    _classCallCheck(this, AppLauncher);

    this.config = {};
    this.lang = 'en';
    this.title = 'IMAGINARY';
    this.logo = '';
    this.apps = [];
    this.appContainer = null;
    this.runningApp = null;
    this.infoApp = null;
    this.$body = null;
    this.$inputMask = $('<div class="inputmask"></div>');
    this.$titlePane = $('<div class="titlePane"></div>');
    this.$logoText = null;
    this.$overlayContainer = null;
    this.overlayVisible = false;
  }

  _createClass(AppLauncher, [{
    key: 'init',
    value: function init() {
      var _this = this;

      this.$body = $('body');
      this.$body.addClass('lock-position');
      return this.readConfig().then(function (config) {
        _this.config = config;
        var tasks = [];
        tasks.push(_this.loadApps(config.apps));
        if (config.infoApp) {
          tasks.push(_this.loadInfoApp(config.infoApp));
        }
        return Promise.all(tasks);
      }).then(function () {
        var qs = _browserHelper2.default.getQueryString();
        if (qs.lang) {
          _this.lang = qs.lang;
        }
        _this.setTitle();
        _this.setMenuMode();
        _this.initResizeHandler();
        _this.enableUserInput();
      });
    }
  }, {
    key: 'initResizeHandler',
    value: function initResizeHandler() {
      var _this2 = this;

      // Timeout for throttled resize
      var resizeTimeout = void 0;

      window.addEventListener('resize', function () {
        // ignore resize events as long as an actualResizeHandler execution is in the queue
        if (!resizeTimeout) {
          resizeTimeout = setTimeout(function () {
            resizeTimeout = null;
            _this2.onResize();
            // The actualResizeHandler will execute at a rate of 15fps
          }, 66);
        }
      });
    }
  }, {
    key: 'readConfig',
    value: function readConfig() {
      var _this3 = this;

      console.log('Reading config');
      return new Promise(function (accept, reject) {
        superagent.get('cfg/config.yml').then(function (response) {
          var config = yaml.safeLoad(response.text);
          if (config.lang) {
            _this3.lang = config.lang;
          }
          if (config.infoApp) {
            _this3.infoApp = config.infoApp;
          }
          accept(config);
        }).catch(function (err) {
          reject(err);
        });
      });
    }
  }, {
    key: 'loadAppConfig',
    value: function loadAppConfig(appRoot) {
      return superagent.get(appRoot + '/app.json').set('Accept', 'json').then(function (response) {
        var appConfig = response.body;
        appConfig.root = appRoot;
        return appConfig;
      });
    }
  }, {
    key: 'loadApps',
    value: function loadApps(appList) {
      var _this4 = this;

      console.log('Loading apps');
      this.apps = [];
      var appLoaders = [];
      var i = 0;
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        var _loop = function _loop() {
          var appRoot = _step.value;

          var appIndex = i;
          appLoaders.push(_this4.loadAppConfig(appRoot).then(function (appConfig) {
            _this4.apps[appIndex] = new _application2.default(appConfig);
          }));
          i += 1;
        };

        for (var _iterator = appList[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          _loop();
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      return Promise.all(appLoaders);
    }
  }, {
    key: 'loadInfoApp',
    value: function loadInfoApp(appRoot) {
      var _this5 = this;

      console.log('Loading info app');
      return this.loadAppConfig(appRoot).then(function (appConfig) {
        _this5.infoApp = new _application2.default(appConfig);
      });
    }
  }, {
    key: 'setLang',
    value: function setLang(langCode) {
      this.lang = langCode;
      this.setTitle();
      $('.logo').replaceWith(this.renderLogo());
      $('.menu-main').replaceWith(this.renderMainMenu());
      this.resizeTitle();
    }
  }, {
    key: 'onLogoClicked',
    value: function onLogoClicked() {
      this.closeApp();
      this.setMenuMode();
      return false;
    }
  }, {
    key: 'onLangButton',
    value: function onLangButton() {
      this.showOverlay(this.renderLangMenu());
    }
  }, {
    key: 'onInfoButton',
    value: function onInfoButton() {
      if (this.runningApp === this.infoApp) {
        return false;
      }
      this.runApp(this.infoApp);
      return false;
    }
  }, {
    key: 'onCloseButton',
    value: function onCloseButton() {
      if (this.overlayVisible) {
        this.closeOverlay();
      } else {
        this.closeApp();
        this.setMenuMode();
      }
      return false;
    }
  }, {
    key: 'onAppButton',
    value: function onAppButton(app) {
      this.runApp(app);
      this.displayTitle(app.getName(this.lang));
      return false;
    }
  }, {
    key: 'runApp',
    value: function runApp(app) {
      var _this6 = this;

      this.disableUserInput();
      this.closeApp();
      this.setAppMode();
      // Delay for fluid animation
      window.setTimeout(function () {
        app.run(_this6.appContainer, _this6.lang);
        _this6.setAppVisible(true);
        _this6.runningApp = app;
        _this6.enableUserInput();
      }, 500);
    }
  }, {
    key: 'closeApp',
    value: function closeApp() {
      this.setAppVisible(false);
      this.runningApp = null;
      this.hideTitle();
      $(this.appContainer).empty();
    }
  }, {
    key: 'clearMode',
    value: function clearMode() {
      this.$body.removeClass(function (index, className) {
        return (className.match(/(^|\s)mode-\S+/g) || []).join(' ');
      });
    }
  }, {
    key: 'setTitle',
    value: function setTitle() {
      if (typeof this.config.title === 'string') {
        this.title = this.config.title;
      } else if (_typeof(this.config.title) === 'object') {
        if (this.config.title[this.lang] !== undefined) {
          this.title = this.config.title[this.lang];
        } else {
          // Defaults to english
          this.title = this.config.title.en;
        }
      }
      document.title = this.title;
    }
  }, {
    key: 'setMenuMode',
    value: function setMenuMode() {
      this.clearMode();
      this.$body.addClass('mode-menu');
    }
  }, {
    key: 'setAppMode',
    value: function setAppMode() {
      this.clearMode();
      this.$body.addClass('mode-app');
    }
  }, {
    key: 'setAppVisible',
    value: function setAppVisible(visibility) {
      if (visibility) {
        this.$body.addClass('app-visible');
      } else {
        this.$body.removeClass('app-visible');
      }
    }
  }, {
    key: 'showOverlay',
    value: function showOverlay(content) {
      this.overlayVisible = true;
      this.setAppMode();
      this.$body.addClass('overlay-visible');
      this.$overlayContainer.append(content);
    }
  }, {
    key: 'closeOverlay',
    value: function closeOverlay() {
      this.$body.removeClass('overlay-visible');
      this.$overlayContainer.empty();
      if (this.runningApp === null) {
        this.setMenuMode();
      }
      this.overlayVisible = false;
    }
  }, {
    key: 'displayTitle',
    value: function displayTitle(aTitle) {
      this.$titlePane.text(aTitle);
      this.$titlePane.addClass('visible');
    }
  }, {
    key: 'hideTitle',
    value: function hideTitle() {
      this.$titlePane.removeClass('visible');
    }
  }, {
    key: 'disableUserInput',
    value: function disableUserInput() {
      this.$inputMask.show();
    }
  }, {
    key: 'enableUserInput',
    value: function enableUserInput() {
      this.$inputMask.hide();
    }
  }, {
    key: 'renderUtilBar',
    value: function renderUtilBar() {
      var utilBar = $('<div class="util-bar"></div>');

      if (this.config.langMenuShow) {
        utilBar.append($("<a class='util-button util-button-lang' href='#'><span class='fa fa-language'></span></a>").on('click', this.onLangButton.bind(this)));
      }

      // Info button
      if (this.infoApp) {
        utilBar.append($("<a class='util-button util-button-info' href='#'><span class='fa fa-info-circle'></span></a>").on('click', this.onInfoButton.bind(this)));
      }

      // Close button
      utilBar.append($("<a class='util-button util-button-close' href='#'><span class='fa fa-arrow-left'></span></a>").on('click', this.onCloseButton.bind(this)));

      utilBar.append(this.$titlePane);

      return utilBar;
    }
  }, {
    key: 'renderMainMenu',
    value: function renderMainMenu() {
      var mainMenu = $('<div class="menu-main"></div>');
      var rowCount = Math.ceil(this.apps.length / 6);
      mainMenu.addClass('menu-main-' + rowCount + '-rows');

      var currRow = null;
      for (var i = 0; i !== this.apps.length; i += 1) {
        if (i % 6 === 0) {
          var rowItems = this.apps.length - i >= 6 ? 6 : this.apps.length - i;
          currRow = $('<div class="menu-main-row"></div>');
          currRow.addClass('menu-main-row-' + rowItems);
          mainMenu.append(currRow);
        }
        currRow.append(this.renderMainMenuItem(this.apps[i]));
      }

      return mainMenu;
    }
  }, {
    key: 'renderMainMenuItem',
    value: function renderMainMenuItem(app) {
      var item = $('<a href="#" class="button menu-main-button"></a>').on('click', this.onAppButton.bind(this, app));

      item.append($('<img src="' + app.getIcon() + '" class="icon"></div>'));
      item.append($('<div class="name">' + app.getName(this.lang) + '</div>'));

      return item;
    }
  }, {
    key: 'renderAppContainer',
    value: function renderAppContainer() {
      var appContainer = $('<div class="appContainer"></div>');
      this.appContainer = appContainer[0];
      return appContainer;
    }
  }, {
    key: 'renderLogo',
    value: function renderLogo() {
      var $logo = $("<a href='#' class='logo'></a>").on('click', this.onLogoClicked.bind(this));

      if (this.config.logo !== undefined) {
        if (typeof this.config.logo === 'string') {
          this.logo = this.config.logo;
        } else if (_typeof(this.config.logo) === 'object') {
          if (this.config.logo[this.lang] !== undefined) {
            this.logo = this.config.logo[this.lang];
          } else if (this.config.logo.default !== undefined) {
            this.logo = this.config.logo.default;
          }
        }
      }

      if (this.logo !== '') {
        $logo.css('background-image', 'url(' + this.logo + ')');
      } else {
        // If there is no logo use the title
        this.$logoText = $("<div class='logo-text'></div>").text(this.title);
        $logo.append($("<div class='logo-text-wrapper'></div>").append(this.$logoText));
      }

      return $logo;
    }
  }, {
    key: 'renderOverlayContainer',
    value: function renderOverlayContainer() {
      var $overlay = $("<div class='overlay'></div>");
      $overlay.append($("<div class='overlay-background'></div>"));
      this.$overlayContainer = $("<div class='overlay-container'></div>");
      $overlay.append(this.$overlayContainer);

      return $overlay;
    }
  }, {
    key: 'onLangMenuChoice',
    value: function onLangMenuChoice(code) {
      this.closeOverlay();
      this.setLang(code);
      return false;
    }
  }, {
    key: 'renderLangMenu',
    value: function renderLangMenu() {
      var $menu = $("<ul class='menu-lang'></ul>");

      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = this.config.langMenuItems[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var langCode = _step2.value;

          var langInfo = languages.getLanguageInfo(langCode);
          if (langInfo) {
            var $item = $('<li></li>');
            var $link = $("<a href='#'></a>");
            $link.text(langInfo.nativeName);
            $link.on('click', this.onLangMenuChoice.bind(this, langCode));
            $item.append($link);
            $menu.append($item);
          }
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      return $menu;
    }
  }, {
    key: 'resizeTitle',
    value: function resizeTitle() {
      if (this.$logoText) {
        var maxWidth = window.innerWidth * 0.9;
        var maxHeight = window.innerHeight * 0.15;
        var newScale = Math.min(maxHeight / this.$logoText.outerHeight(), maxWidth / this.$logoText.outerWidth(), 1);

        this.$logoText.css('transform', 'scale(' + newScale + ')');
      }
    }
  }, {
    key: 'onResize',
    value: function onResize() {
      this.resizeTitle();
    }
  }, {
    key: 'onReady',
    value: function onReady() {
      window.setTimeout(this.resizeTitle.bind(this), 0);
    }
  }, {
    key: 'render',
    value: function render() {
      var view = $("<div class='appLauncher'></div>");
      view.append(this.renderLogo());
      view.append(this.renderMainMenu());
      view.append($('<div class="appPane"></div>'));
      view.append(this.renderAppContainer());
      view.append(this.renderOverlayContainer());
      view.append(this.renderUtilBar());
      view.append(this.$inputMask);

      return view;
    }
  }]);

  return AppLauncher;
}();

exports.default = AppLauncher;

},{"./application":43,"./browser-helper":44,"bluebird":1,"js-yaml":3,"languages":33,"superagent":35}],43:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Application = function () {
  function Application(config) {
    _classCallCheck(this, Application);

    this.id = config.id;
    this.root = config.root;
    this.version = config.version;
    this.main = config.main;
    this.width = config.width;
    this.height = config.height;
    this.name = config.name;
    this.description = config.description;
    console.log('Create app ' + this.id);
  }

  _createClass(Application, [{
    key: 'getName',
    value: function getName() {
      var lang = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'en';

      if (this.name[lang]) {
        return this.name[lang];
      }
      return this.name.en;
    }
  }, {
    key: 'getDescription',
    value: function getDescription() {
      var lang = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'en';

      if (this.description[lang]) {
        return this.description[lang];
      }
      return this.description.en;
    }
  }, {
    key: 'getIcon',
    value: function getIcon() {
      return this.root + '/icons/icon.png';
    }
  }, {
    key: 'run',
    value: function run(container) {
      var lang = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'en';

      window.IMAGINARY.CindyViewer.create(container, this.root + '/' + this.main, this.width ? this.width : null, this.height ? this.height : null, lang);
    }
  }]);

  return Application;
}();

exports.default = Application;

},{}],44:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var BrowserHelper = function () {
  function BrowserHelper() {
    _classCallCheck(this, BrowserHelper);
  }

  _createClass(BrowserHelper, null, [{
    key: 'getQueryString',

    /**
     * Gets the query string
     * @return {object} map of query string parameters
     */
    value: function getQueryString() {
      var pl = /\+/g; // Regex for replacing addition symbol with a space
      var search = /([^&=]+)=?([^&]*)/g;
      var decode = function decode(s) {
        return decodeURIComponent(s.replace(pl, ' '));
      };
      var query = window.location.search.substring(1);

      var urlParams = {};
      var match = search.exec(query);
      while (match) {
        urlParams[decode(match[1])] = decode(match[2]);
        match = search.exec(query);
      }

      return urlParams;
    }
  }]);

  return BrowserHelper;
}();

exports.default = BrowserHelper;

},{}],45:[function(require,module,exports){
'use strict';

var _applauncher = require('./applauncher');

var _applauncher2 = _interopRequireDefault(_applauncher);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

if (!window.IMAGINARY) {
  window.IMAGINARY = {};
}

var appLauncher = new _applauncher2.default();
window.IMAGINARY.AppLauncher = appLauncher;
$(function () {
  appLauncher.init().then(function () {
    $('body').append(appLauncher.render());
    appLauncher.onReady();
  });
});

},{"./applauncher":42}]},{},[45])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYmx1ZWJpcmQvanMvYnJvd3Nlci9ibHVlYmlyZC5qcyIsIm5vZGVfbW9kdWxlcy9jb21wb25lbnQtZW1pdHRlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9qcy15YW1sL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2pzLXlhbWwvbGliL2pzLXlhbWwuanMiLCJub2RlX21vZHVsZXMvanMteWFtbC9saWIvanMteWFtbC9jb21tb24uanMiLCJub2RlX21vZHVsZXMvanMteWFtbC9saWIvanMteWFtbC9kdW1wZXIuanMiLCJub2RlX21vZHVsZXMvanMteWFtbC9saWIvanMteWFtbC9leGNlcHRpb24uanMiLCJub2RlX21vZHVsZXMvanMteWFtbC9saWIvanMteWFtbC9sb2FkZXIuanMiLCJub2RlX21vZHVsZXMvanMteWFtbC9saWIvanMteWFtbC9tYXJrLmpzIiwibm9kZV9tb2R1bGVzL2pzLXlhbWwvbGliL2pzLXlhbWwvc2NoZW1hLmpzIiwibm9kZV9tb2R1bGVzL2pzLXlhbWwvbGliL2pzLXlhbWwvc2NoZW1hL2NvcmUuanMiLCJub2RlX21vZHVsZXMvanMteWFtbC9saWIvanMteWFtbC9zY2hlbWEvZGVmYXVsdF9mdWxsLmpzIiwibm9kZV9tb2R1bGVzL2pzLXlhbWwvbGliL2pzLXlhbWwvc2NoZW1hL2RlZmF1bHRfc2FmZS5qcyIsIm5vZGVfbW9kdWxlcy9qcy15YW1sL2xpYi9qcy15YW1sL3NjaGVtYS9mYWlsc2FmZS5qcyIsIm5vZGVfbW9kdWxlcy9qcy15YW1sL2xpYi9qcy15YW1sL3NjaGVtYS9qc29uLmpzIiwibm9kZV9tb2R1bGVzL2pzLXlhbWwvbGliL2pzLXlhbWwvdHlwZS5qcyIsIm5vZGVfbW9kdWxlcy9qcy15YW1sL2xpYi9qcy15YW1sL3R5cGUvYmluYXJ5LmpzIiwibm9kZV9tb2R1bGVzL2pzLXlhbWwvbGliL2pzLXlhbWwvdHlwZS9ib29sLmpzIiwibm9kZV9tb2R1bGVzL2pzLXlhbWwvbGliL2pzLXlhbWwvdHlwZS9mbG9hdC5qcyIsIm5vZGVfbW9kdWxlcy9qcy15YW1sL2xpYi9qcy15YW1sL3R5cGUvaW50LmpzIiwibm9kZV9tb2R1bGVzL2pzLXlhbWwvbGliL2pzLXlhbWwvdHlwZS9qcy9mdW5jdGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9qcy15YW1sL2xpYi9qcy15YW1sL3R5cGUvanMvcmVnZXhwLmpzIiwibm9kZV9tb2R1bGVzL2pzLXlhbWwvbGliL2pzLXlhbWwvdHlwZS9qcy91bmRlZmluZWQuanMiLCJub2RlX21vZHVsZXMvanMteWFtbC9saWIvanMteWFtbC90eXBlL21hcC5qcyIsIm5vZGVfbW9kdWxlcy9qcy15YW1sL2xpYi9qcy15YW1sL3R5cGUvbWVyZ2UuanMiLCJub2RlX21vZHVsZXMvanMteWFtbC9saWIvanMteWFtbC90eXBlL251bGwuanMiLCJub2RlX21vZHVsZXMvanMteWFtbC9saWIvanMteWFtbC90eXBlL29tYXAuanMiLCJub2RlX21vZHVsZXMvanMteWFtbC9saWIvanMteWFtbC90eXBlL3BhaXJzLmpzIiwibm9kZV9tb2R1bGVzL2pzLXlhbWwvbGliL2pzLXlhbWwvdHlwZS9zZXEuanMiLCJub2RlX21vZHVsZXMvanMteWFtbC9saWIvanMteWFtbC90eXBlL3NldC5qcyIsIm5vZGVfbW9kdWxlcy9qcy15YW1sL2xpYi9qcy15YW1sL3R5cGUvc3RyLmpzIiwibm9kZV9tb2R1bGVzL2pzLXlhbWwvbGliL2pzLXlhbWwvdHlwZS90aW1lc3RhbXAuanMiLCJub2RlX21vZHVsZXMvbGFuZ3VhZ2VzL2xhbmd1YWdlcy5taW4uanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3N1cGVyYWdlbnQvbGliL2NsaWVudC5qcyIsIm5vZGVfbW9kdWxlcy9zdXBlcmFnZW50L2xpYi9pcy1mdW5jdGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9zdXBlcmFnZW50L2xpYi9pcy1vYmplY3QuanMiLCJub2RlX21vZHVsZXMvc3VwZXJhZ2VudC9saWIvcmVxdWVzdC1iYXNlLmpzIiwibm9kZV9tb2R1bGVzL3N1cGVyYWdlbnQvbGliL3Jlc3BvbnNlLWJhc2UuanMiLCJub2RlX21vZHVsZXMvc3VwZXJhZ2VudC9saWIvc2hvdWxkLXJldHJ5LmpzIiwibm9kZV9tb2R1bGVzL3N1cGVyYWdlbnQvbGliL3V0aWxzLmpzIiwic3JjL2FwcGxhdW5jaGVyLmpzIiwic3JjL2FwcGxpY2F0aW9uLmpzIiwic3JjL2Jyb3dzZXItaGVscGVyLmpzIiwic3JjL21haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbC9LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeHlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hGQTtBQUNBO0FBQ0E7O0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcjZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9rQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7QUNuRUE7Ozs7QUFDQTs7Ozs7Ozs7QUFFQSxJQUFNLFVBQVUsUUFBUSxVQUFSLENBQWhCO0FBQ0EsSUFBTSxhQUFhLFFBQVEsWUFBUixDQUFuQjtBQUNBLElBQU0sT0FBTyxRQUFRLFNBQVIsQ0FBYjs7QUFFQSxJQUFNLFlBQVksUUFBUSxXQUFSLENBQWxCOztJQUVxQixXO0FBRW5CLHlCQUFjO0FBQUE7O0FBQ1osU0FBSyxNQUFMLEdBQWMsRUFBZDtBQUNBLFNBQUssSUFBTCxHQUFZLElBQVo7QUFDQSxTQUFLLEtBQUwsR0FBYSxXQUFiO0FBQ0EsU0FBSyxJQUFMLEdBQVksRUFBWjtBQUNBLFNBQUssSUFBTCxHQUFZLEVBQVo7QUFDQSxTQUFLLFlBQUwsR0FBb0IsSUFBcEI7QUFDQSxTQUFLLFVBQUwsR0FBa0IsSUFBbEI7QUFDQSxTQUFLLE9BQUwsR0FBZSxJQUFmO0FBQ0EsU0FBSyxLQUFMLEdBQWEsSUFBYjtBQUNBLFNBQUssVUFBTCxHQUFrQixFQUFFLCtCQUFGLENBQWxCO0FBQ0EsU0FBSyxVQUFMLEdBQWtCLEVBQUUsK0JBQUYsQ0FBbEI7QUFDQSxTQUFLLFNBQUwsR0FBaUIsSUFBakI7QUFDQSxTQUFLLGlCQUFMLEdBQXlCLElBQXpCO0FBQ0EsU0FBSyxjQUFMLEdBQXNCLEtBQXRCO0FBQ0Q7Ozs7MkJBRU07QUFBQTs7QUFDTCxXQUFLLEtBQUwsR0FBYSxFQUFFLE1BQUYsQ0FBYjtBQUNBLFdBQUssS0FBTCxDQUFXLFFBQVgsQ0FBb0IsZUFBcEI7QUFDQSxhQUFPLEtBQUssVUFBTCxHQUNKLElBREksQ0FDQyxVQUFDLE1BQUQsRUFBWTtBQUNoQixjQUFLLE1BQUwsR0FBYyxNQUFkO0FBQ0EsWUFBTSxRQUFRLEVBQWQ7QUFDQSxjQUFNLElBQU4sQ0FBVyxNQUFLLFFBQUwsQ0FBYyxPQUFPLElBQXJCLENBQVg7QUFDQSxZQUFJLE9BQU8sT0FBWCxFQUFvQjtBQUNsQixnQkFBTSxJQUFOLENBQVcsTUFBSyxXQUFMLENBQWlCLE9BQU8sT0FBeEIsQ0FBWDtBQUNEO0FBQ0QsZUFBTyxRQUFRLEdBQVIsQ0FBWSxLQUFaLENBQVA7QUFDRCxPQVRJLEVBVUosSUFWSSxDQVVDLFlBQU07QUFDVixZQUFNLEtBQUssd0JBQWMsY0FBZCxFQUFYO0FBQ0EsWUFBSSxHQUFHLElBQVAsRUFBYTtBQUNYLGdCQUFLLElBQUwsR0FBWSxHQUFHLElBQWY7QUFDRDtBQUNELGNBQUssUUFBTDtBQUNBLGNBQUssV0FBTDtBQUNBLGNBQUssaUJBQUw7QUFDQSxjQUFLLGVBQUw7QUFDRCxPQW5CSSxDQUFQO0FBb0JEOzs7d0NBRW1CO0FBQUE7O0FBQ2xCO0FBQ0EsVUFBSSxzQkFBSjs7QUFFQSxhQUFPLGdCQUFQLENBQXdCLFFBQXhCLEVBQWtDLFlBQU07QUFDdEM7QUFDQSxZQUFJLENBQUMsYUFBTCxFQUFvQjtBQUNsQiwwQkFBZ0IsV0FBVyxZQUFNO0FBQy9CLDRCQUFnQixJQUFoQjtBQUNBLG1CQUFLLFFBQUw7QUFDQTtBQUNELFdBSmUsRUFJYixFQUphLENBQWhCO0FBS0Q7QUFDRixPQVREO0FBVUQ7OztpQ0FFWTtBQUFBOztBQUNYLGNBQVEsR0FBUixDQUFZLGdCQUFaO0FBQ0EsYUFBTyxJQUFJLE9BQUosQ0FBWSxVQUFDLE1BQUQsRUFBUyxNQUFULEVBQW9CO0FBQ3JDLG1CQUNHLEdBREgsQ0FDTyxnQkFEUCxFQUVHLElBRkgsQ0FFUSxVQUFDLFFBQUQsRUFBYztBQUNsQixjQUFNLFNBQVMsS0FBSyxRQUFMLENBQWMsU0FBUyxJQUF2QixDQUFmO0FBQ0EsY0FBSSxPQUFPLElBQVgsRUFBaUI7QUFDZixtQkFBSyxJQUFMLEdBQVksT0FBTyxJQUFuQjtBQUNEO0FBQ0QsY0FBSSxPQUFPLE9BQVgsRUFBb0I7QUFDbEIsbUJBQUssT0FBTCxHQUFlLE9BQU8sT0FBdEI7QUFDRDtBQUNELGlCQUFPLE1BQVA7QUFDRCxTQVhILEVBWUcsS0FaSCxDQVlTLFVBQUMsR0FBRCxFQUFTO0FBQ2QsaUJBQU8sR0FBUDtBQUNELFNBZEg7QUFlRCxPQWhCTSxDQUFQO0FBaUJEOzs7a0NBRWEsTyxFQUFTO0FBQ3JCLGFBQU8sV0FBVyxHQUFYLENBQWtCLE9BQWxCLGdCQUNKLEdBREksQ0FDQSxRQURBLEVBQ1UsTUFEVixFQUVKLElBRkksQ0FFQyxVQUFDLFFBQUQsRUFBYztBQUNsQixZQUFNLFlBQVksU0FBUyxJQUEzQjtBQUNBLGtCQUFVLElBQVYsR0FBaUIsT0FBakI7QUFDQSxlQUFPLFNBQVA7QUFDRCxPQU5JLENBQVA7QUFPRDs7OzZCQUVRLE8sRUFBUztBQUFBOztBQUNoQixjQUFRLEdBQVIsQ0FBWSxjQUFaO0FBQ0EsV0FBSyxJQUFMLEdBQVksRUFBWjtBQUNBLFVBQU0sYUFBYSxFQUFuQjtBQUNBLFVBQUksSUFBSSxDQUFSO0FBSmdCO0FBQUE7QUFBQTs7QUFBQTtBQUFBO0FBQUEsY0FLTCxPQUxLOztBQU1kLGNBQU0sV0FBVyxDQUFqQjtBQUNBLHFCQUFXLElBQVgsQ0FDRSxPQUFLLGFBQUwsQ0FBbUIsT0FBbkIsRUFDRyxJQURILENBQ1EsVUFBQyxTQUFELEVBQWU7QUFDbkIsbUJBQUssSUFBTCxDQUFVLFFBQVYsSUFBdUIsMEJBQWdCLFNBQWhCLENBQXZCO0FBQ0QsV0FISCxDQURGO0FBT0EsZUFBSyxDQUFMO0FBZGM7O0FBS2hCLDZCQUFzQixPQUF0Qiw4SEFBK0I7QUFBQTtBQVU5QjtBQWZlO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBaUJoQixhQUFPLFFBQVEsR0FBUixDQUFZLFVBQVosQ0FBUDtBQUNEOzs7Z0NBRVcsTyxFQUFTO0FBQUE7O0FBQ25CLGNBQVEsR0FBUixDQUFZLGtCQUFaO0FBQ0EsYUFBTyxLQUFLLGFBQUwsQ0FBbUIsT0FBbkIsRUFDSixJQURJLENBQ0MsVUFBQyxTQUFELEVBQWU7QUFDbkIsZUFBSyxPQUFMLEdBQWUsMEJBQWdCLFNBQWhCLENBQWY7QUFDRCxPQUhJLENBQVA7QUFJRDs7OzRCQUVPLFEsRUFBVTtBQUNoQixXQUFLLElBQUwsR0FBWSxRQUFaO0FBQ0EsV0FBSyxRQUFMO0FBQ0EsUUFBRSxPQUFGLEVBQVcsV0FBWCxDQUF1QixLQUFLLFVBQUwsRUFBdkI7QUFDQSxRQUFFLFlBQUYsRUFBZ0IsV0FBaEIsQ0FBNEIsS0FBSyxjQUFMLEVBQTVCO0FBQ0EsV0FBSyxXQUFMO0FBQ0Q7OztvQ0FFZTtBQUNkLFdBQUssUUFBTDtBQUNBLFdBQUssV0FBTDtBQUNBLGFBQU8sS0FBUDtBQUNEOzs7bUNBRWM7QUFDYixXQUFLLFdBQUwsQ0FBaUIsS0FBSyxjQUFMLEVBQWpCO0FBQ0Q7OzttQ0FFYztBQUNiLFVBQUksS0FBSyxVQUFMLEtBQW9CLEtBQUssT0FBN0IsRUFBc0M7QUFDcEMsZUFBTyxLQUFQO0FBQ0Q7QUFDRCxXQUFLLE1BQUwsQ0FBWSxLQUFLLE9BQWpCO0FBQ0EsYUFBTyxLQUFQO0FBQ0Q7OztvQ0FFZTtBQUNkLFVBQUksS0FBSyxjQUFULEVBQXlCO0FBQ3ZCLGFBQUssWUFBTDtBQUNELE9BRkQsTUFFTztBQUNMLGFBQUssUUFBTDtBQUNBLGFBQUssV0FBTDtBQUNEO0FBQ0QsYUFBTyxLQUFQO0FBQ0Q7OztnQ0FFVyxHLEVBQUs7QUFDZixXQUFLLE1BQUwsQ0FBWSxHQUFaO0FBQ0EsV0FBSyxZQUFMLENBQWtCLElBQUksT0FBSixDQUFZLEtBQUssSUFBakIsQ0FBbEI7QUFDQSxhQUFPLEtBQVA7QUFDRDs7OzJCQUVNLEcsRUFBSztBQUFBOztBQUNWLFdBQUssZ0JBQUw7QUFDQSxXQUFLLFFBQUw7QUFDQSxXQUFLLFVBQUw7QUFDQTtBQUNBLGFBQU8sVUFBUCxDQUFrQixZQUFNO0FBQ3RCLFlBQUksR0FBSixDQUFRLE9BQUssWUFBYixFQUEyQixPQUFLLElBQWhDO0FBQ0EsZUFBSyxhQUFMLENBQW1CLElBQW5CO0FBQ0EsZUFBSyxVQUFMLEdBQWtCLEdBQWxCO0FBQ0EsZUFBSyxlQUFMO0FBQ0QsT0FMRCxFQUtHLEdBTEg7QUFNRDs7OytCQUVVO0FBQ1QsV0FBSyxhQUFMLENBQW1CLEtBQW5CO0FBQ0EsV0FBSyxVQUFMLEdBQWtCLElBQWxCO0FBQ0EsV0FBSyxTQUFMO0FBQ0EsUUFBRSxLQUFLLFlBQVAsRUFBcUIsS0FBckI7QUFDRDs7O2dDQUVXO0FBQ1YsV0FBSyxLQUFMLENBQVcsV0FBWCxDQUF1QixVQUFDLEtBQUQsRUFBUSxTQUFSO0FBQUEsZUFBc0IsQ0FBQyxVQUFVLEtBQVYsQ0FBZ0IsaUJBQWhCLEtBQXNDLEVBQXZDLEVBQTJDLElBQTNDLENBQWdELEdBQWhELENBQXRCO0FBQUEsT0FBdkI7QUFDRDs7OytCQUVVO0FBQ1QsVUFBSSxPQUFPLEtBQUssTUFBTCxDQUFZLEtBQW5CLEtBQTZCLFFBQWpDLEVBQTJDO0FBQ3pDLGFBQUssS0FBTCxHQUFhLEtBQUssTUFBTCxDQUFZLEtBQXpCO0FBQ0QsT0FGRCxNQUVPLElBQUksUUFBTyxLQUFLLE1BQUwsQ0FBWSxLQUFuQixNQUE2QixRQUFqQyxFQUEyQztBQUNoRCxZQUFJLEtBQUssTUFBTCxDQUFZLEtBQVosQ0FBa0IsS0FBSyxJQUF2QixNQUFpQyxTQUFyQyxFQUFnRDtBQUM5QyxlQUFLLEtBQUwsR0FBYSxLQUFLLE1BQUwsQ0FBWSxLQUFaLENBQWtCLEtBQUssSUFBdkIsQ0FBYjtBQUNELFNBRkQsTUFFTztBQUNMO0FBQ0EsZUFBSyxLQUFMLEdBQWEsS0FBSyxNQUFMLENBQVksS0FBWixDQUFrQixFQUEvQjtBQUNEO0FBQ0Y7QUFDRCxlQUFTLEtBQVQsR0FBaUIsS0FBSyxLQUF0QjtBQUNEOzs7a0NBRWE7QUFDWixXQUFLLFNBQUw7QUFDQSxXQUFLLEtBQUwsQ0FBVyxRQUFYLENBQW9CLFdBQXBCO0FBQ0Q7OztpQ0FFWTtBQUNYLFdBQUssU0FBTDtBQUNBLFdBQUssS0FBTCxDQUFXLFFBQVgsQ0FBb0IsVUFBcEI7QUFDRDs7O2tDQUVhLFUsRUFBWTtBQUN4QixVQUFJLFVBQUosRUFBZ0I7QUFDZCxhQUFLLEtBQUwsQ0FBVyxRQUFYLENBQW9CLGFBQXBCO0FBQ0QsT0FGRCxNQUVPO0FBQ0wsYUFBSyxLQUFMLENBQVcsV0FBWCxDQUF1QixhQUF2QjtBQUNEO0FBQ0Y7OztnQ0FFVyxPLEVBQVM7QUFDbkIsV0FBSyxjQUFMLEdBQXNCLElBQXRCO0FBQ0EsV0FBSyxVQUFMO0FBQ0EsV0FBSyxLQUFMLENBQVcsUUFBWCxDQUFvQixpQkFBcEI7QUFDQSxXQUFLLGlCQUFMLENBQXVCLE1BQXZCLENBQThCLE9BQTlCO0FBQ0Q7OzttQ0FFYztBQUNiLFdBQUssS0FBTCxDQUFXLFdBQVgsQ0FBdUIsaUJBQXZCO0FBQ0EsV0FBSyxpQkFBTCxDQUF1QixLQUF2QjtBQUNBLFVBQUksS0FBSyxVQUFMLEtBQW9CLElBQXhCLEVBQThCO0FBQzVCLGFBQUssV0FBTDtBQUNEO0FBQ0QsV0FBSyxjQUFMLEdBQXNCLEtBQXRCO0FBQ0Q7OztpQ0FFWSxNLEVBQVE7QUFDbkIsV0FBSyxVQUFMLENBQWdCLElBQWhCLENBQXFCLE1BQXJCO0FBQ0EsV0FBSyxVQUFMLENBQWdCLFFBQWhCLENBQXlCLFNBQXpCO0FBQ0Q7OztnQ0FFVztBQUNWLFdBQUssVUFBTCxDQUFnQixXQUFoQixDQUE0QixTQUE1QjtBQUNEOzs7dUNBRWtCO0FBQ2pCLFdBQUssVUFBTCxDQUFnQixJQUFoQjtBQUNEOzs7c0NBRWlCO0FBQ2hCLFdBQUssVUFBTCxDQUFnQixJQUFoQjtBQUNEOzs7b0NBRWU7QUFDZCxVQUFNLFVBQVUsRUFBRSw4QkFBRixDQUFoQjs7QUFFQSxVQUFJLEtBQUssTUFBTCxDQUFZLFlBQWhCLEVBQThCO0FBQzVCLGdCQUFRLE1BQVIsQ0FDRSxFQUFFLDJGQUFGLEVBQ0csRUFESCxDQUNNLE9BRE4sRUFDZSxLQUFLLFlBQUwsQ0FBa0IsSUFBbEIsQ0FBdUIsSUFBdkIsQ0FEZixDQURGO0FBSUQ7O0FBRUQ7QUFDQSxVQUFJLEtBQUssT0FBVCxFQUFrQjtBQUNoQixnQkFBUSxNQUFSLENBQ0UsRUFBRSw4RkFBRixFQUNHLEVBREgsQ0FDTSxPQUROLEVBQ2UsS0FBSyxZQUFMLENBQWtCLElBQWxCLENBQXVCLElBQXZCLENBRGYsQ0FERjtBQUlEOztBQUVEO0FBQ0EsY0FBUSxNQUFSLENBQ0UsRUFBRSw4RkFBRixFQUNHLEVBREgsQ0FDTSxPQUROLEVBQ2UsS0FBSyxhQUFMLENBQW1CLElBQW5CLENBQXdCLElBQXhCLENBRGYsQ0FERjs7QUFLQSxjQUFRLE1BQVIsQ0FBZSxLQUFLLFVBQXBCOztBQUVBLGFBQU8sT0FBUDtBQUNEOzs7cUNBRWdCO0FBQ2YsVUFBTSxXQUFXLEVBQUUsK0JBQUYsQ0FBakI7QUFDQSxVQUFNLFdBQVcsS0FBSyxJQUFMLENBQVUsS0FBSyxJQUFMLENBQVUsTUFBVixHQUFtQixDQUE3QixDQUFqQjtBQUNBLGVBQVMsUUFBVCxnQkFBK0IsUUFBL0I7O0FBRUEsVUFBSSxVQUFVLElBQWQ7QUFDQSxXQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLE1BQU0sS0FBSyxJQUFMLENBQVUsTUFBaEMsRUFBd0MsS0FBSyxDQUE3QyxFQUFnRDtBQUM5QyxZQUFJLElBQUksQ0FBSixLQUFVLENBQWQsRUFBaUI7QUFDZixjQUFNLFdBQVcsS0FBSyxJQUFMLENBQVUsTUFBVixHQUFtQixDQUFuQixJQUF3QixDQUF4QixHQUE0QixDQUE1QixHQUFnQyxLQUFLLElBQUwsQ0FBVSxNQUFWLEdBQW1CLENBQXBFO0FBQ0Esb0JBQVUsRUFBRSxtQ0FBRixDQUFWO0FBQ0Esa0JBQVEsUUFBUixvQkFBa0MsUUFBbEM7QUFDQSxtQkFBUyxNQUFULENBQWdCLE9BQWhCO0FBQ0Q7QUFDRCxnQkFBUSxNQUFSLENBQWUsS0FBSyxrQkFBTCxDQUF3QixLQUFLLElBQUwsQ0FBVSxDQUFWLENBQXhCLENBQWY7QUFDRDs7QUFFRCxhQUFPLFFBQVA7QUFDRDs7O3VDQUVrQixHLEVBQUs7QUFDdEIsVUFBTSxPQUFPLEVBQUUsa0RBQUYsRUFDVixFQURVLENBQ1AsT0FETyxFQUNFLEtBQUssV0FBTCxDQUFpQixJQUFqQixDQUFzQixJQUF0QixFQUE0QixHQUE1QixDQURGLENBQWI7O0FBR0EsV0FBSyxNQUFMLENBQVksaUJBQWUsSUFBSSxPQUFKLEVBQWYsMkJBQVo7QUFDQSxXQUFLLE1BQUwsQ0FBWSx5QkFBdUIsSUFBSSxPQUFKLENBQVksS0FBSyxJQUFqQixDQUF2QixZQUFaOztBQUVBLGFBQU8sSUFBUDtBQUNEOzs7eUNBRW9CO0FBQ25CLFVBQU0sZUFBZSxFQUFFLGtDQUFGLENBQXJCO0FBQ0EsV0FBSyxZQUFMLEdBQW9CLGFBQWEsQ0FBYixDQUFwQjtBQUNBLGFBQU8sWUFBUDtBQUNEOzs7aUNBRVk7QUFDWCxVQUFNLFFBQVEsRUFBRSwrQkFBRixFQUNYLEVBRFcsQ0FDUixPQURRLEVBQ0MsS0FBSyxhQUFMLENBQW1CLElBQW5CLENBQXdCLElBQXhCLENBREQsQ0FBZDs7QUFHQSxVQUFJLEtBQUssTUFBTCxDQUFZLElBQVosS0FBcUIsU0FBekIsRUFBb0M7QUFDbEMsWUFBSSxPQUFPLEtBQUssTUFBTCxDQUFZLElBQW5CLEtBQTRCLFFBQWhDLEVBQTBDO0FBQ3hDLGVBQUssSUFBTCxHQUFZLEtBQUssTUFBTCxDQUFZLElBQXhCO0FBQ0QsU0FGRCxNQUVPLElBQUksUUFBTyxLQUFLLE1BQUwsQ0FBWSxJQUFuQixNQUE0QixRQUFoQyxFQUEwQztBQUMvQyxjQUFJLEtBQUssTUFBTCxDQUFZLElBQVosQ0FBaUIsS0FBSyxJQUF0QixNQUFnQyxTQUFwQyxFQUErQztBQUM3QyxpQkFBSyxJQUFMLEdBQVksS0FBSyxNQUFMLENBQVksSUFBWixDQUFpQixLQUFLLElBQXRCLENBQVo7QUFDRCxXQUZELE1BRU8sSUFBSSxLQUFLLE1BQUwsQ0FBWSxJQUFaLENBQWlCLE9BQWpCLEtBQTZCLFNBQWpDLEVBQTRDO0FBQ2pELGlCQUFLLElBQUwsR0FBWSxLQUFLLE1BQUwsQ0FBWSxJQUFaLENBQWlCLE9BQTdCO0FBQ0Q7QUFDRjtBQUNGOztBQUVELFVBQUksS0FBSyxJQUFMLEtBQWMsRUFBbEIsRUFBc0I7QUFDcEIsY0FBTSxHQUFOLENBQVUsa0JBQVYsV0FBcUMsS0FBSyxJQUExQztBQUNELE9BRkQsTUFFTztBQUNMO0FBQ0EsYUFBSyxTQUFMLEdBQWlCLEVBQUUsK0JBQUYsRUFBbUMsSUFBbkMsQ0FBd0MsS0FBSyxLQUE3QyxDQUFqQjtBQUNBLGNBQU0sTUFBTixDQUFhLEVBQUUsdUNBQUYsRUFBMkMsTUFBM0MsQ0FBa0QsS0FBSyxTQUF2RCxDQUFiO0FBQ0Q7O0FBRUQsYUFBTyxLQUFQO0FBQ0Q7Ozs2Q0FFd0I7QUFDdkIsVUFBTSxXQUFXLEVBQUUsNkJBQUYsQ0FBakI7QUFDQSxlQUFTLE1BQVQsQ0FBZ0IsRUFBRSx3Q0FBRixDQUFoQjtBQUNBLFdBQUssaUJBQUwsR0FBeUIsRUFBRSx1Q0FBRixDQUF6QjtBQUNBLGVBQVMsTUFBVCxDQUFnQixLQUFLLGlCQUFyQjs7QUFFQSxhQUFPLFFBQVA7QUFDRDs7O3FDQUVnQixJLEVBQU07QUFDckIsV0FBSyxZQUFMO0FBQ0EsV0FBSyxPQUFMLENBQWEsSUFBYjtBQUNBLGFBQU8sS0FBUDtBQUNEOzs7cUNBRWdCO0FBQ2YsVUFBTSxRQUFRLEVBQUUsNkJBQUYsQ0FBZDs7QUFEZTtBQUFBO0FBQUE7O0FBQUE7QUFHZiw4QkFBdUIsS0FBSyxNQUFMLENBQVksYUFBbkMsbUlBQWtEO0FBQUEsY0FBdkMsUUFBdUM7O0FBQ2hELGNBQU0sV0FBVyxVQUFVLGVBQVYsQ0FBMEIsUUFBMUIsQ0FBakI7QUFDQSxjQUFJLFFBQUosRUFBYztBQUNaLGdCQUFNLFFBQVEsRUFBRSxXQUFGLENBQWQ7QUFDQSxnQkFBTSxRQUFRLEVBQUUsa0JBQUYsQ0FBZDtBQUNBLGtCQUFNLElBQU4sQ0FBVyxTQUFTLFVBQXBCO0FBQ0Esa0JBQU0sRUFBTixDQUFTLE9BQVQsRUFBa0IsS0FBSyxnQkFBTCxDQUFzQixJQUF0QixDQUEyQixJQUEzQixFQUFpQyxRQUFqQyxDQUFsQjtBQUNBLGtCQUFNLE1BQU4sQ0FBYSxLQUFiO0FBQ0Esa0JBQU0sTUFBTixDQUFhLEtBQWI7QUFDRDtBQUNGO0FBYmM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTs7QUFlZixhQUFPLEtBQVA7QUFDRDs7O2tDQUVhO0FBQ1osVUFBSSxLQUFLLFNBQVQsRUFBb0I7QUFDbEIsWUFBTSxXQUFXLE9BQU8sVUFBUCxHQUFvQixHQUFyQztBQUNBLFlBQU0sWUFBWSxPQUFPLFdBQVAsR0FBcUIsSUFBdkM7QUFDQSxZQUFNLFdBQVcsS0FBSyxHQUFMLENBQ2YsWUFBWSxLQUFLLFNBQUwsQ0FBZSxXQUFmLEVBREcsRUFFZixXQUFXLEtBQUssU0FBTCxDQUFlLFVBQWYsRUFGSSxFQUdmLENBSGUsQ0FBakI7O0FBTUEsYUFBSyxTQUFMLENBQWUsR0FBZixDQUFtQixXQUFuQixhQUF5QyxRQUF6QztBQUNEO0FBQ0Y7OzsrQkFFVTtBQUNULFdBQUssV0FBTDtBQUNEOzs7OEJBRVM7QUFDUixhQUFPLFVBQVAsQ0FBa0IsS0FBSyxXQUFMLENBQWlCLElBQWpCLENBQXNCLElBQXRCLENBQWxCLEVBQStDLENBQS9DO0FBQ0Q7Ozs2QkFFUTtBQUNQLFVBQU0sT0FBTyxFQUFFLGlDQUFGLENBQWI7QUFDQSxXQUFLLE1BQUwsQ0FBWSxLQUFLLFVBQUwsRUFBWjtBQUNBLFdBQUssTUFBTCxDQUFZLEtBQUssY0FBTCxFQUFaO0FBQ0EsV0FBSyxNQUFMLENBQVksRUFBRSw2QkFBRixDQUFaO0FBQ0EsV0FBSyxNQUFMLENBQVksS0FBSyxrQkFBTCxFQUFaO0FBQ0EsV0FBSyxNQUFMLENBQVksS0FBSyxzQkFBTCxFQUFaO0FBQ0EsV0FBSyxNQUFMLENBQVksS0FBSyxhQUFMLEVBQVo7QUFDQSxXQUFLLE1BQUwsQ0FBWSxLQUFLLFVBQWpCOztBQUVBLGFBQU8sSUFBUDtBQUNEOzs7Ozs7a0JBdlprQixXOzs7Ozs7Ozs7Ozs7O0lDVEEsVztBQUVuQix1QkFBWSxNQUFaLEVBQW9CO0FBQUE7O0FBQ2xCLFNBQUssRUFBTCxHQUFVLE9BQU8sRUFBakI7QUFDQSxTQUFLLElBQUwsR0FBWSxPQUFPLElBQW5CO0FBQ0EsU0FBSyxPQUFMLEdBQWUsT0FBTyxPQUF0QjtBQUNBLFNBQUssSUFBTCxHQUFZLE9BQU8sSUFBbkI7QUFDQSxTQUFLLEtBQUwsR0FBYSxPQUFPLEtBQXBCO0FBQ0EsU0FBSyxNQUFMLEdBQWMsT0FBTyxNQUFyQjtBQUNBLFNBQUssSUFBTCxHQUFZLE9BQU8sSUFBbkI7QUFDQSxTQUFLLFdBQUwsR0FBbUIsT0FBTyxXQUExQjtBQUNBLFlBQVEsR0FBUixpQkFBMEIsS0FBSyxFQUEvQjtBQUNEOzs7OzhCQUVvQjtBQUFBLFVBQWIsSUFBYSx1RUFBTixJQUFNOztBQUNuQixVQUFJLEtBQUssSUFBTCxDQUFVLElBQVYsQ0FBSixFQUFxQjtBQUNuQixlQUFPLEtBQUssSUFBTCxDQUFVLElBQVYsQ0FBUDtBQUNEO0FBQ0QsYUFBTyxLQUFLLElBQUwsQ0FBVSxFQUFqQjtBQUNEOzs7cUNBRTJCO0FBQUEsVUFBYixJQUFhLHVFQUFOLElBQU07O0FBQzFCLFVBQUksS0FBSyxXQUFMLENBQWlCLElBQWpCLENBQUosRUFBNEI7QUFDMUIsZUFBTyxLQUFLLFdBQUwsQ0FBaUIsSUFBakIsQ0FBUDtBQUNEO0FBQ0QsYUFBTyxLQUFLLFdBQUwsQ0FBaUIsRUFBeEI7QUFDRDs7OzhCQUVTO0FBQ1IsYUFBVSxLQUFLLElBQWY7QUFDRDs7O3dCQUVHLFMsRUFBd0I7QUFBQSxVQUFiLElBQWEsdUVBQU4sSUFBTTs7QUFDMUIsYUFBTyxTQUFQLENBQWlCLFdBQWpCLENBQTZCLE1BQTdCLENBQ0UsU0FERixFQUVLLEtBQUssSUFGVixTQUVrQixLQUFLLElBRnZCLEVBR0UsS0FBSyxLQUFMLEdBQWEsS0FBSyxLQUFsQixHQUEwQixJQUg1QixFQUlFLEtBQUssTUFBTCxHQUFjLEtBQUssTUFBbkIsR0FBNEIsSUFKOUIsRUFLRSxJQUxGO0FBT0Q7Ozs7OztrQkF4Q2tCLFc7Ozs7Ozs7Ozs7Ozs7SUNBQSxhOzs7Ozs7OztBQUNuQjs7OztxQ0FJd0I7QUFDdEIsVUFBTSxLQUFLLEtBQVgsQ0FEc0IsQ0FDSDtBQUNuQixVQUFNLFNBQVMsb0JBQWY7QUFDQSxVQUFNLFNBQVUsU0FBVixNQUFVO0FBQUEsZUFBSyxtQkFBbUIsRUFBRSxPQUFGLENBQVUsRUFBVixFQUFjLEdBQWQsQ0FBbkIsQ0FBTDtBQUFBLE9BQWhCO0FBQ0EsVUFBTSxRQUFRLE9BQU8sUUFBUCxDQUFnQixNQUFoQixDQUF1QixTQUF2QixDQUFpQyxDQUFqQyxDQUFkOztBQUVBLFVBQU0sWUFBWSxFQUFsQjtBQUNBLFVBQUksUUFBUSxPQUFPLElBQVAsQ0FBWSxLQUFaLENBQVo7QUFDQSxhQUFPLEtBQVAsRUFBYztBQUNaLGtCQUFVLE9BQU8sTUFBTSxDQUFOLENBQVAsQ0FBVixJQUE4QixPQUFPLE1BQU0sQ0FBTixDQUFQLENBQTlCO0FBQ0EsZ0JBQVEsT0FBTyxJQUFQLENBQVksS0FBWixDQUFSO0FBQ0Q7O0FBRUQsYUFBTyxTQUFQO0FBQ0Q7Ozs7OztrQkFuQmtCLGE7Ozs7O0FDQXJCOzs7Ozs7QUFFQSxJQUFJLENBQUMsT0FBTyxTQUFaLEVBQXVCO0FBQ3JCLFNBQU8sU0FBUCxHQUFtQixFQUFuQjtBQUNEOztBQUVELElBQU0sY0FBYywyQkFBcEI7QUFDQSxPQUFPLFNBQVAsQ0FBaUIsV0FBakIsR0FBK0IsV0FBL0I7QUFDQSxFQUFFLFlBQU07QUFDTixjQUFZLElBQVosR0FBbUIsSUFBbkIsQ0FBd0IsWUFBTTtBQUM1QixNQUFFLE1BQUYsRUFBVSxNQUFWLENBQWlCLFlBQVksTUFBWixFQUFqQjtBQUNBLGdCQUFZLE9BQVo7QUFDRCxHQUhEO0FBSUQsQ0FMRCIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKiBAcHJlc2VydmVcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICogXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTMtMjAxNyBQZXRrYSBBbnRvbm92XG4gKiBcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqIFxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICogXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuICBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKiBcbiAqL1xuLyoqXG4gKiBibHVlYmlyZCBidWlsZCB2ZXJzaW9uIDMuNS4wXG4gKiBGZWF0dXJlcyBlbmFibGVkOiBjb3JlLCByYWNlLCBjYWxsX2dldCwgZ2VuZXJhdG9ycywgbWFwLCBub2RlaWZ5LCBwcm9taXNpZnksIHByb3BzLCByZWR1Y2UsIHNldHRsZSwgc29tZSwgdXNpbmcsIHRpbWVycywgZmlsdGVyLCBhbnksIGVhY2hcbiovXG4hZnVuY3Rpb24oZSl7aWYoXCJvYmplY3RcIj09dHlwZW9mIGV4cG9ydHMmJlwidW5kZWZpbmVkXCIhPXR5cGVvZiBtb2R1bGUpbW9kdWxlLmV4cG9ydHM9ZSgpO2Vsc2UgaWYoXCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kKWRlZmluZShbXSxlKTtlbHNle3ZhciBmO1widW5kZWZpbmVkXCIhPXR5cGVvZiB3aW5kb3c/Zj13aW5kb3c6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIGdsb2JhbD9mPWdsb2JhbDpcInVuZGVmaW5lZFwiIT10eXBlb2Ygc2VsZiYmKGY9c2VsZiksZi5Qcm9taXNlPWUoKX19KGZ1bmN0aW9uKCl7dmFyIGRlZmluZSxtb2R1bGUsZXhwb3J0cztyZXR1cm4gKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiBfZGVyZXFfPT1cImZ1bmN0aW9uXCImJl9kZXJlcV87aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIF9kZXJlcV89PVwiZnVuY3Rpb25cIiYmX2RlcmVxXztmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkoezE6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKFByb21pc2UpIHtcbnZhciBTb21lUHJvbWlzZUFycmF5ID0gUHJvbWlzZS5fU29tZVByb21pc2VBcnJheTtcbmZ1bmN0aW9uIGFueShwcm9taXNlcykge1xuICAgIHZhciByZXQgPSBuZXcgU29tZVByb21pc2VBcnJheShwcm9taXNlcyk7XG4gICAgdmFyIHByb21pc2UgPSByZXQucHJvbWlzZSgpO1xuICAgIHJldC5zZXRIb3dNYW55KDEpO1xuICAgIHJldC5zZXRVbndyYXAoKTtcbiAgICByZXQuaW5pdCgpO1xuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG5Qcm9taXNlLmFueSA9IGZ1bmN0aW9uIChwcm9taXNlcykge1xuICAgIHJldHVybiBhbnkocHJvbWlzZXMpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuYW55ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBhbnkodGhpcyk7XG59O1xuXG59O1xuXG59LHt9XSwyOltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xudmFyIGZpcnN0TGluZUVycm9yO1xudHJ5IHt0aHJvdyBuZXcgRXJyb3IoKTsgfSBjYXRjaCAoZSkge2ZpcnN0TGluZUVycm9yID0gZTt9XG52YXIgc2NoZWR1bGUgPSBfZGVyZXFfKFwiLi9zY2hlZHVsZVwiKTtcbnZhciBRdWV1ZSA9IF9kZXJlcV8oXCIuL3F1ZXVlXCIpO1xudmFyIHV0aWwgPSBfZGVyZXFfKFwiLi91dGlsXCIpO1xuXG5mdW5jdGlvbiBBc3luYygpIHtcbiAgICB0aGlzLl9jdXN0b21TY2hlZHVsZXIgPSBmYWxzZTtcbiAgICB0aGlzLl9pc1RpY2tVc2VkID0gZmFsc2U7XG4gICAgdGhpcy5fbGF0ZVF1ZXVlID0gbmV3IFF1ZXVlKDE2KTtcbiAgICB0aGlzLl9ub3JtYWxRdWV1ZSA9IG5ldyBRdWV1ZSgxNik7XG4gICAgdGhpcy5faGF2ZURyYWluZWRRdWV1ZXMgPSBmYWxzZTtcbiAgICB0aGlzLl90cmFtcG9saW5lRW5hYmxlZCA9IHRydWU7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuZHJhaW5RdWV1ZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNlbGYuX2RyYWluUXVldWVzKCk7XG4gICAgfTtcbiAgICB0aGlzLl9zY2hlZHVsZSA9IHNjaGVkdWxlO1xufVxuXG5Bc3luYy5wcm90b3R5cGUuc2V0U2NoZWR1bGVyID0gZnVuY3Rpb24oZm4pIHtcbiAgICB2YXIgcHJldiA9IHRoaXMuX3NjaGVkdWxlO1xuICAgIHRoaXMuX3NjaGVkdWxlID0gZm47XG4gICAgdGhpcy5fY3VzdG9tU2NoZWR1bGVyID0gdHJ1ZTtcbiAgICByZXR1cm4gcHJldjtcbn07XG5cbkFzeW5jLnByb3RvdHlwZS5oYXNDdXN0b21TY2hlZHVsZXIgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fY3VzdG9tU2NoZWR1bGVyO1xufTtcblxuQXN5bmMucHJvdG90eXBlLmVuYWJsZVRyYW1wb2xpbmUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl90cmFtcG9saW5lRW5hYmxlZCA9IHRydWU7XG59O1xuXG5Bc3luYy5wcm90b3R5cGUuZGlzYWJsZVRyYW1wb2xpbmVJZk5lY2Vzc2FyeSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh1dGlsLmhhc0RldlRvb2xzKSB7XG4gICAgICAgIHRoaXMuX3RyYW1wb2xpbmVFbmFibGVkID0gZmFsc2U7XG4gICAgfVxufTtcblxuQXN5bmMucHJvdG90eXBlLmhhdmVJdGVtc1F1ZXVlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5faXNUaWNrVXNlZCB8fCB0aGlzLl9oYXZlRHJhaW5lZFF1ZXVlcztcbn07XG5cblxuQXN5bmMucHJvdG90eXBlLmZhdGFsRXJyb3IgPSBmdW5jdGlvbihlLCBpc05vZGUpIHtcbiAgICBpZiAoaXNOb2RlKSB7XG4gICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKFwiRmF0YWwgXCIgKyAoZSBpbnN0YW5jZW9mIEVycm9yID8gZS5zdGFjayA6IGUpICtcbiAgICAgICAgICAgIFwiXFxuXCIpO1xuICAgICAgICBwcm9jZXNzLmV4aXQoMik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy50aHJvd0xhdGVyKGUpO1xuICAgIH1cbn07XG5cbkFzeW5jLnByb3RvdHlwZS50aHJvd0xhdGVyID0gZnVuY3Rpb24oZm4sIGFyZykge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIGFyZyA9IGZuO1xuICAgICAgICBmbiA9IGZ1bmN0aW9uICgpIHsgdGhyb3cgYXJnOyB9O1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGZuKGFyZyk7XG4gICAgICAgIH0sIDApO1xuICAgIH0gZWxzZSB0cnkge1xuICAgICAgICB0aGlzLl9zY2hlZHVsZShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGZuKGFyZyk7XG4gICAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gYXN5bmMgc2NoZWR1bGVyIGF2YWlsYWJsZVxcdTAwMGFcXHUwMDBhICAgIFNlZSBodHRwOi8vZ29vLmdsL01xckZtWFxcdTAwMGFcIik7XG4gICAgfVxufTtcblxuZnVuY3Rpb24gQXN5bmNJbnZva2VMYXRlcihmbiwgcmVjZWl2ZXIsIGFyZykge1xuICAgIHRoaXMuX2xhdGVRdWV1ZS5wdXNoKGZuLCByZWNlaXZlciwgYXJnKTtcbiAgICB0aGlzLl9xdWV1ZVRpY2soKTtcbn1cblxuZnVuY3Rpb24gQXN5bmNJbnZva2UoZm4sIHJlY2VpdmVyLCBhcmcpIHtcbiAgICB0aGlzLl9ub3JtYWxRdWV1ZS5wdXNoKGZuLCByZWNlaXZlciwgYXJnKTtcbiAgICB0aGlzLl9xdWV1ZVRpY2soKTtcbn1cblxuZnVuY3Rpb24gQXN5bmNTZXR0bGVQcm9taXNlcyhwcm9taXNlKSB7XG4gICAgdGhpcy5fbm9ybWFsUXVldWUuX3B1c2hPbmUocHJvbWlzZSk7XG4gICAgdGhpcy5fcXVldWVUaWNrKCk7XG59XG5cbmlmICghdXRpbC5oYXNEZXZUb29scykge1xuICAgIEFzeW5jLnByb3RvdHlwZS5pbnZva2VMYXRlciA9IEFzeW5jSW52b2tlTGF0ZXI7XG4gICAgQXN5bmMucHJvdG90eXBlLmludm9rZSA9IEFzeW5jSW52b2tlO1xuICAgIEFzeW5jLnByb3RvdHlwZS5zZXR0bGVQcm9taXNlcyA9IEFzeW5jU2V0dGxlUHJvbWlzZXM7XG59IGVsc2Uge1xuICAgIEFzeW5jLnByb3RvdHlwZS5pbnZva2VMYXRlciA9IGZ1bmN0aW9uIChmbiwgcmVjZWl2ZXIsIGFyZykge1xuICAgICAgICBpZiAodGhpcy5fdHJhbXBvbGluZUVuYWJsZWQpIHtcbiAgICAgICAgICAgIEFzeW5jSW52b2tlTGF0ZXIuY2FsbCh0aGlzLCBmbiwgcmVjZWl2ZXIsIGFyZyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9zY2hlZHVsZShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBmbi5jYWxsKHJlY2VpdmVyLCBhcmcpO1xuICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBBc3luYy5wcm90b3R5cGUuaW52b2tlID0gZnVuY3Rpb24gKGZuLCByZWNlaXZlciwgYXJnKSB7XG4gICAgICAgIGlmICh0aGlzLl90cmFtcG9saW5lRW5hYmxlZCkge1xuICAgICAgICAgICAgQXN5bmNJbnZva2UuY2FsbCh0aGlzLCBmbiwgcmVjZWl2ZXIsIGFyZyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9zY2hlZHVsZShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBmbi5jYWxsKHJlY2VpdmVyLCBhcmcpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgQXN5bmMucHJvdG90eXBlLnNldHRsZVByb21pc2VzID0gZnVuY3Rpb24ocHJvbWlzZSkge1xuICAgICAgICBpZiAodGhpcy5fdHJhbXBvbGluZUVuYWJsZWQpIHtcbiAgICAgICAgICAgIEFzeW5jU2V0dGxlUHJvbWlzZXMuY2FsbCh0aGlzLCBwcm9taXNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3NjaGVkdWxlKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHByb21pc2UuX3NldHRsZVByb21pc2VzKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbkFzeW5jLnByb3RvdHlwZS5fZHJhaW5RdWV1ZSA9IGZ1bmN0aW9uKHF1ZXVlKSB7XG4gICAgd2hpbGUgKHF1ZXVlLmxlbmd0aCgpID4gMCkge1xuICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICBpZiAodHlwZW9mIGZuICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIGZuLl9zZXR0bGVQcm9taXNlcygpO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJlY2VpdmVyID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgdmFyIGFyZyA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgIGZuLmNhbGwocmVjZWl2ZXIsIGFyZyk7XG4gICAgfVxufTtcblxuQXN5bmMucHJvdG90eXBlLl9kcmFpblF1ZXVlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9kcmFpblF1ZXVlKHRoaXMuX25vcm1hbFF1ZXVlKTtcbiAgICB0aGlzLl9yZXNldCgpO1xuICAgIHRoaXMuX2hhdmVEcmFpbmVkUXVldWVzID0gdHJ1ZTtcbiAgICB0aGlzLl9kcmFpblF1ZXVlKHRoaXMuX2xhdGVRdWV1ZSk7XG59O1xuXG5Bc3luYy5wcm90b3R5cGUuX3F1ZXVlVGljayA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuX2lzVGlja1VzZWQpIHtcbiAgICAgICAgdGhpcy5faXNUaWNrVXNlZCA9IHRydWU7XG4gICAgICAgIHRoaXMuX3NjaGVkdWxlKHRoaXMuZHJhaW5RdWV1ZXMpO1xuICAgIH1cbn07XG5cbkFzeW5jLnByb3RvdHlwZS5fcmVzZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faXNUaWNrVXNlZCA9IGZhbHNlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBBc3luYztcbm1vZHVsZS5leHBvcnRzLmZpcnN0TGluZUVycm9yID0gZmlyc3RMaW5lRXJyb3I7XG5cbn0se1wiLi9xdWV1ZVwiOjI2LFwiLi9zY2hlZHVsZVwiOjI5LFwiLi91dGlsXCI6MzZ9XSwzOltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihQcm9taXNlLCBJTlRFUk5BTCwgdHJ5Q29udmVydFRvUHJvbWlzZSwgZGVidWcpIHtcbnZhciBjYWxsZWRCaW5kID0gZmFsc2U7XG52YXIgcmVqZWN0VGhpcyA9IGZ1bmN0aW9uKF8sIGUpIHtcbiAgICB0aGlzLl9yZWplY3QoZSk7XG59O1xuXG52YXIgdGFyZ2V0UmVqZWN0ZWQgPSBmdW5jdGlvbihlLCBjb250ZXh0KSB7XG4gICAgY29udGV4dC5wcm9taXNlUmVqZWN0aW9uUXVldWVkID0gdHJ1ZTtcbiAgICBjb250ZXh0LmJpbmRpbmdQcm9taXNlLl90aGVuKHJlamVjdFRoaXMsIHJlamVjdFRoaXMsIG51bGwsIHRoaXMsIGUpO1xufTtcblxudmFyIGJpbmRpbmdSZXNvbHZlZCA9IGZ1bmN0aW9uKHRoaXNBcmcsIGNvbnRleHQpIHtcbiAgICBpZiAoKCh0aGlzLl9iaXRGaWVsZCAmIDUwMzk3MTg0KSA9PT0gMCkpIHtcbiAgICAgICAgdGhpcy5fcmVzb2x2ZUNhbGxiYWNrKGNvbnRleHQudGFyZ2V0KTtcbiAgICB9XG59O1xuXG52YXIgYmluZGluZ1JlamVjdGVkID0gZnVuY3Rpb24oZSwgY29udGV4dCkge1xuICAgIGlmICghY29udGV4dC5wcm9taXNlUmVqZWN0aW9uUXVldWVkKSB0aGlzLl9yZWplY3QoZSk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5iaW5kID0gZnVuY3Rpb24gKHRoaXNBcmcpIHtcbiAgICBpZiAoIWNhbGxlZEJpbmQpIHtcbiAgICAgICAgY2FsbGVkQmluZCA9IHRydWU7XG4gICAgICAgIFByb21pc2UucHJvdG90eXBlLl9wcm9wYWdhdGVGcm9tID0gZGVidWcucHJvcGFnYXRlRnJvbUZ1bmN0aW9uKCk7XG4gICAgICAgIFByb21pc2UucHJvdG90eXBlLl9ib3VuZFZhbHVlID0gZGVidWcuYm91bmRWYWx1ZUZ1bmN0aW9uKCk7XG4gICAgfVxuICAgIHZhciBtYXliZVByb21pc2UgPSB0cnlDb252ZXJ0VG9Qcm9taXNlKHRoaXNBcmcpO1xuICAgIHZhciByZXQgPSBuZXcgUHJvbWlzZShJTlRFUk5BTCk7XG4gICAgcmV0Ll9wcm9wYWdhdGVGcm9tKHRoaXMsIDEpO1xuICAgIHZhciB0YXJnZXQgPSB0aGlzLl90YXJnZXQoKTtcbiAgICByZXQuX3NldEJvdW5kVG8obWF5YmVQcm9taXNlKTtcbiAgICBpZiAobWF5YmVQcm9taXNlIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICB2YXIgY29udGV4dCA9IHtcbiAgICAgICAgICAgIHByb21pc2VSZWplY3Rpb25RdWV1ZWQ6IGZhbHNlLFxuICAgICAgICAgICAgcHJvbWlzZTogcmV0LFxuICAgICAgICAgICAgdGFyZ2V0OiB0YXJnZXQsXG4gICAgICAgICAgICBiaW5kaW5nUHJvbWlzZTogbWF5YmVQcm9taXNlXG4gICAgICAgIH07XG4gICAgICAgIHRhcmdldC5fdGhlbihJTlRFUk5BTCwgdGFyZ2V0UmVqZWN0ZWQsIHVuZGVmaW5lZCwgcmV0LCBjb250ZXh0KTtcbiAgICAgICAgbWF5YmVQcm9taXNlLl90aGVuKFxuICAgICAgICAgICAgYmluZGluZ1Jlc29sdmVkLCBiaW5kaW5nUmVqZWN0ZWQsIHVuZGVmaW5lZCwgcmV0LCBjb250ZXh0KTtcbiAgICAgICAgcmV0Ll9zZXRPbkNhbmNlbChtYXliZVByb21pc2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldC5fcmVzb2x2ZUNhbGxiYWNrKHRhcmdldCk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fc2V0Qm91bmRUbyA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICBpZiAob2JqICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fYml0RmllbGQgPSB0aGlzLl9iaXRGaWVsZCB8IDIwOTcxNTI7XG4gICAgICAgIHRoaXMuX2JvdW5kVG8gPSBvYmo7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fYml0RmllbGQgPSB0aGlzLl9iaXRGaWVsZCAmICh+MjA5NzE1Mik7XG4gICAgfVxufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX2lzQm91bmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICh0aGlzLl9iaXRGaWVsZCAmIDIwOTcxNTIpID09PSAyMDk3MTUyO1xufTtcblxuUHJvbWlzZS5iaW5kID0gZnVuY3Rpb24gKHRoaXNBcmcsIHZhbHVlKSB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh2YWx1ZSkuYmluZCh0aGlzQXJnKTtcbn07XG59O1xuXG59LHt9XSw0OltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xudmFyIG9sZDtcbmlmICh0eXBlb2YgUHJvbWlzZSAhPT0gXCJ1bmRlZmluZWRcIikgb2xkID0gUHJvbWlzZTtcbmZ1bmN0aW9uIG5vQ29uZmxpY3QoKSB7XG4gICAgdHJ5IHsgaWYgKFByb21pc2UgPT09IGJsdWViaXJkKSBQcm9taXNlID0gb2xkOyB9XG4gICAgY2F0Y2ggKGUpIHt9XG4gICAgcmV0dXJuIGJsdWViaXJkO1xufVxudmFyIGJsdWViaXJkID0gX2RlcmVxXyhcIi4vcHJvbWlzZVwiKSgpO1xuYmx1ZWJpcmQubm9Db25mbGljdCA9IG5vQ29uZmxpY3Q7XG5tb2R1bGUuZXhwb3J0cyA9IGJsdWViaXJkO1xuXG59LHtcIi4vcHJvbWlzZVwiOjIyfV0sNTpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbnZhciBjciA9IE9iamVjdC5jcmVhdGU7XG5pZiAoY3IpIHtcbiAgICB2YXIgY2FsbGVyQ2FjaGUgPSBjcihudWxsKTtcbiAgICB2YXIgZ2V0dGVyQ2FjaGUgPSBjcihudWxsKTtcbiAgICBjYWxsZXJDYWNoZVtcIiBzaXplXCJdID0gZ2V0dGVyQ2FjaGVbXCIgc2l6ZVwiXSA9IDA7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oUHJvbWlzZSkge1xudmFyIHV0aWwgPSBfZGVyZXFfKFwiLi91dGlsXCIpO1xudmFyIGNhbkV2YWx1YXRlID0gdXRpbC5jYW5FdmFsdWF0ZTtcbnZhciBpc0lkZW50aWZpZXIgPSB1dGlsLmlzSWRlbnRpZmllcjtcblxudmFyIGdldE1ldGhvZENhbGxlcjtcbnZhciBnZXRHZXR0ZXI7XG5pZiAoIXRydWUpIHtcbnZhciBtYWtlTWV0aG9kQ2FsbGVyID0gZnVuY3Rpb24gKG1ldGhvZE5hbWUpIHtcbiAgICByZXR1cm4gbmV3IEZ1bmN0aW9uKFwiZW5zdXJlTWV0aG9kXCIsIFwiICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKG9iaikgeyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICd1c2Ugc3RyaWN0JyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIHZhciBsZW4gPSB0aGlzLmxlbmd0aDsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIGVuc3VyZU1ldGhvZChvYmosICdtZXRob2ROYW1lJyk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIHN3aXRjaChsZW4pIHsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICBjYXNlIDE6IHJldHVybiBvYmoubWV0aG9kTmFtZSh0aGlzWzBdKTsgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICBjYXNlIDI6IHJldHVybiBvYmoubWV0aG9kTmFtZSh0aGlzWzBdLCB0aGlzWzFdKTsgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICBjYXNlIDM6IHJldHVybiBvYmoubWV0aG9kTmFtZSh0aGlzWzBdLCB0aGlzWzFdLCB0aGlzWzJdKTsgICAgXFxuXFxcbiAgICAgICAgICAgICAgICBjYXNlIDA6IHJldHVybiBvYmoubWV0aG9kTmFtZSgpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9iai5tZXRob2ROYW1lLmFwcGx5KG9iaiwgdGhpcyk7ICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIH0gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgfTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgXCIucmVwbGFjZSgvbWV0aG9kTmFtZS9nLCBtZXRob2ROYW1lKSkoZW5zdXJlTWV0aG9kKTtcbn07XG5cbnZhciBtYWtlR2V0dGVyID0gZnVuY3Rpb24gKHByb3BlcnR5TmFtZSkge1xuICAgIHJldHVybiBuZXcgRnVuY3Rpb24oXCJvYmpcIiwgXCIgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAndXNlIHN0cmljdCc7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICByZXR1cm4gb2JqLnByb3BlcnR5TmFtZTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICBcIi5yZXBsYWNlKFwicHJvcGVydHlOYW1lXCIsIHByb3BlcnR5TmFtZSkpO1xufTtcblxudmFyIGdldENvbXBpbGVkID0gZnVuY3Rpb24obmFtZSwgY29tcGlsZXIsIGNhY2hlKSB7XG4gICAgdmFyIHJldCA9IGNhY2hlW25hbWVdO1xuICAgIGlmICh0eXBlb2YgcmV0ICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgaWYgKCFpc0lkZW50aWZpZXIobmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldCA9IGNvbXBpbGVyKG5hbWUpO1xuICAgICAgICBjYWNoZVtuYW1lXSA9IHJldDtcbiAgICAgICAgY2FjaGVbXCIgc2l6ZVwiXSsrO1xuICAgICAgICBpZiAoY2FjaGVbXCIgc2l6ZVwiXSA+IDUxMikge1xuICAgICAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhjYWNoZSk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IDI1NjsgKytpKSBkZWxldGUgY2FjaGVba2V5c1tpXV07XG4gICAgICAgICAgICBjYWNoZVtcIiBzaXplXCJdID0ga2V5cy5sZW5ndGggLSAyNTY7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbn07XG5cbmdldE1ldGhvZENhbGxlciA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gZ2V0Q29tcGlsZWQobmFtZSwgbWFrZU1ldGhvZENhbGxlciwgY2FsbGVyQ2FjaGUpO1xufTtcblxuZ2V0R2V0dGVyID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiBnZXRDb21waWxlZChuYW1lLCBtYWtlR2V0dGVyLCBnZXR0ZXJDYWNoZSk7XG59O1xufVxuXG5mdW5jdGlvbiBlbnN1cmVNZXRob2Qob2JqLCBtZXRob2ROYW1lKSB7XG4gICAgdmFyIGZuO1xuICAgIGlmIChvYmogIT0gbnVsbCkgZm4gPSBvYmpbbWV0aG9kTmFtZV07XG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHZhciBtZXNzYWdlID0gXCJPYmplY3QgXCIgKyB1dGlsLmNsYXNzU3RyaW5nKG9iaikgKyBcIiBoYXMgbm8gbWV0aG9kICdcIiArXG4gICAgICAgICAgICB1dGlsLnRvU3RyaW5nKG1ldGhvZE5hbWUpICsgXCInXCI7XG4gICAgICAgIHRocm93IG5ldyBQcm9taXNlLlR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICB9XG4gICAgcmV0dXJuIGZuO1xufVxuXG5mdW5jdGlvbiBjYWxsZXIob2JqKSB7XG4gICAgdmFyIG1ldGhvZE5hbWUgPSB0aGlzLnBvcCgpO1xuICAgIHZhciBmbiA9IGVuc3VyZU1ldGhvZChvYmosIG1ldGhvZE5hbWUpO1xuICAgIHJldHVybiBmbi5hcHBseShvYmosIHRoaXMpO1xufVxuUHJvbWlzZS5wcm90b3R5cGUuY2FsbCA9IGZ1bmN0aW9uIChtZXRob2ROYW1lKSB7XG4gICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7O1xuICAgIGlmICghdHJ1ZSkge1xuICAgICAgICBpZiAoY2FuRXZhbHVhdGUpIHtcbiAgICAgICAgICAgIHZhciBtYXliZUNhbGxlciA9IGdldE1ldGhvZENhbGxlcihtZXRob2ROYW1lKTtcbiAgICAgICAgICAgIGlmIChtYXliZUNhbGxlciAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl90aGVuKFxuICAgICAgICAgICAgICAgICAgICBtYXliZUNhbGxlciwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIGFyZ3MsIHVuZGVmaW5lZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgYXJncy5wdXNoKG1ldGhvZE5hbWUpO1xuICAgIHJldHVybiB0aGlzLl90aGVuKGNhbGxlciwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIGFyZ3MsIHVuZGVmaW5lZCk7XG59O1xuXG5mdW5jdGlvbiBuYW1lZEdldHRlcihvYmopIHtcbiAgICByZXR1cm4gb2JqW3RoaXNdO1xufVxuZnVuY3Rpb24gaW5kZXhlZEdldHRlcihvYmopIHtcbiAgICB2YXIgaW5kZXggPSArdGhpcztcbiAgICBpZiAoaW5kZXggPCAwKSBpbmRleCA9IE1hdGgubWF4KDAsIGluZGV4ICsgb2JqLmxlbmd0aCk7XG4gICAgcmV0dXJuIG9ialtpbmRleF07XG59XG5Qcm9taXNlLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAocHJvcGVydHlOYW1lKSB7XG4gICAgdmFyIGlzSW5kZXggPSAodHlwZW9mIHByb3BlcnR5TmFtZSA9PT0gXCJudW1iZXJcIik7XG4gICAgdmFyIGdldHRlcjtcbiAgICBpZiAoIWlzSW5kZXgpIHtcbiAgICAgICAgaWYgKGNhbkV2YWx1YXRlKSB7XG4gICAgICAgICAgICB2YXIgbWF5YmVHZXR0ZXIgPSBnZXRHZXR0ZXIocHJvcGVydHlOYW1lKTtcbiAgICAgICAgICAgIGdldHRlciA9IG1heWJlR2V0dGVyICE9PSBudWxsID8gbWF5YmVHZXR0ZXIgOiBuYW1lZEdldHRlcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGdldHRlciA9IG5hbWVkR2V0dGVyO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZ2V0dGVyID0gaW5kZXhlZEdldHRlcjtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3RoZW4oZ2V0dGVyLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgcHJvcGVydHlOYW1lLCB1bmRlZmluZWQpO1xufTtcbn07XG5cbn0se1wiLi91dGlsXCI6MzZ9XSw2OltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihQcm9taXNlLCBQcm9taXNlQXJyYXksIGFwaVJlamVjdGlvbiwgZGVidWcpIHtcbnZhciB1dGlsID0gX2RlcmVxXyhcIi4vdXRpbFwiKTtcbnZhciB0cnlDYXRjaCA9IHV0aWwudHJ5Q2F0Y2g7XG52YXIgZXJyb3JPYmogPSB1dGlsLmVycm9yT2JqO1xudmFyIGFzeW5jID0gUHJvbWlzZS5fYXN5bmM7XG5cblByb21pc2UucHJvdG90eXBlW1wiYnJlYWtcIl0gPSBQcm9taXNlLnByb3RvdHlwZS5jYW5jZWwgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIWRlYnVnLmNhbmNlbGxhdGlvbigpKSByZXR1cm4gdGhpcy5fd2FybihcImNhbmNlbGxhdGlvbiBpcyBkaXNhYmxlZFwiKTtcblxuICAgIHZhciBwcm9taXNlID0gdGhpcztcbiAgICB2YXIgY2hpbGQgPSBwcm9taXNlO1xuICAgIHdoaWxlIChwcm9taXNlLl9pc0NhbmNlbGxhYmxlKCkpIHtcbiAgICAgICAgaWYgKCFwcm9taXNlLl9jYW5jZWxCeShjaGlsZCkpIHtcbiAgICAgICAgICAgIGlmIChjaGlsZC5faXNGb2xsb3dpbmcoKSkge1xuICAgICAgICAgICAgICAgIGNoaWxkLl9mb2xsb3dlZSgpLmNhbmNlbCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjaGlsZC5fY2FuY2VsQnJhbmNoZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHBhcmVudCA9IHByb21pc2UuX2NhbmNlbGxhdGlvblBhcmVudDtcbiAgICAgICAgaWYgKHBhcmVudCA9PSBudWxsIHx8ICFwYXJlbnQuX2lzQ2FuY2VsbGFibGUoKSkge1xuICAgICAgICAgICAgaWYgKHByb21pc2UuX2lzRm9sbG93aW5nKCkpIHtcbiAgICAgICAgICAgICAgICBwcm9taXNlLl9mb2xsb3dlZSgpLmNhbmNlbCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwcm9taXNlLl9jYW5jZWxCcmFuY2hlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAocHJvbWlzZS5faXNGb2xsb3dpbmcoKSkgcHJvbWlzZS5fZm9sbG93ZWUoKS5jYW5jZWwoKTtcbiAgICAgICAgICAgIHByb21pc2UuX3NldFdpbGxCZUNhbmNlbGxlZCgpO1xuICAgICAgICAgICAgY2hpbGQgPSBwcm9taXNlO1xuICAgICAgICAgICAgcHJvbWlzZSA9IHBhcmVudDtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblByb21pc2UucHJvdG90eXBlLl9icmFuY2hIYXNDYW5jZWxsZWQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9icmFuY2hlc1JlbWFpbmluZ1RvQ2FuY2VsLS07XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fZW5vdWdoQnJhbmNoZXNIYXZlQ2FuY2VsbGVkID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2JyYW5jaGVzUmVtYWluaW5nVG9DYW5jZWwgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICAgICB0aGlzLl9icmFuY2hlc1JlbWFpbmluZ1RvQ2FuY2VsIDw9IDA7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fY2FuY2VsQnkgPSBmdW5jdGlvbihjYW5jZWxsZXIpIHtcbiAgICBpZiAoY2FuY2VsbGVyID09PSB0aGlzKSB7XG4gICAgICAgIHRoaXMuX2JyYW5jaGVzUmVtYWluaW5nVG9DYW5jZWwgPSAwO1xuICAgICAgICB0aGlzLl9pbnZva2VPbkNhbmNlbCgpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9icmFuY2hIYXNDYW5jZWxsZWQoKTtcbiAgICAgICAgaWYgKHRoaXMuX2Vub3VnaEJyYW5jaGVzSGF2ZUNhbmNlbGxlZCgpKSB7XG4gICAgICAgICAgICB0aGlzLl9pbnZva2VPbkNhbmNlbCgpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX2NhbmNlbEJyYW5jaGVkID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX2Vub3VnaEJyYW5jaGVzSGF2ZUNhbmNlbGxlZCgpKSB7XG4gICAgICAgIHRoaXMuX2NhbmNlbCgpO1xuICAgIH1cbn07XG5cblByb21pc2UucHJvdG90eXBlLl9jYW5jZWwgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMuX2lzQ2FuY2VsbGFibGUoKSkgcmV0dXJuO1xuICAgIHRoaXMuX3NldENhbmNlbGxlZCgpO1xuICAgIGFzeW5jLmludm9rZSh0aGlzLl9jYW5jZWxQcm9taXNlcywgdGhpcywgdW5kZWZpbmVkKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9jYW5jZWxQcm9taXNlcyA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl9sZW5ndGgoKSA+IDApIHRoaXMuX3NldHRsZVByb21pc2VzKCk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fdW5zZXRPbkNhbmNlbCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX29uQ2FuY2VsRmllbGQgPSB1bmRlZmluZWQ7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5faXNDYW5jZWxsYWJsZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmlzUGVuZGluZygpICYmICF0aGlzLl9pc0NhbmNlbGxlZCgpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuaXNDYW5jZWxsYWJsZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmlzUGVuZGluZygpICYmICF0aGlzLmlzQ2FuY2VsbGVkKCk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fZG9JbnZva2VPbkNhbmNlbCA9IGZ1bmN0aW9uKG9uQ2FuY2VsQ2FsbGJhY2ssIGludGVybmFsT25seSkge1xuICAgIGlmICh1dGlsLmlzQXJyYXkob25DYW5jZWxDYWxsYmFjaykpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvbkNhbmNlbENhbGxiYWNrLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICB0aGlzLl9kb0ludm9rZU9uQ2FuY2VsKG9uQ2FuY2VsQ2FsbGJhY2tbaV0sIGludGVybmFsT25seSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKG9uQ2FuY2VsQ2FsbGJhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIG9uQ2FuY2VsQ2FsbGJhY2sgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgaWYgKCFpbnRlcm5hbE9ubHkpIHtcbiAgICAgICAgICAgICAgICB2YXIgZSA9IHRyeUNhdGNoKG9uQ2FuY2VsQ2FsbGJhY2spLmNhbGwodGhpcy5fYm91bmRWYWx1ZSgpKTtcbiAgICAgICAgICAgICAgICBpZiAoZSA9PT0gZXJyb3JPYmopIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fYXR0YWNoRXh0cmFUcmFjZShlLmUpO1xuICAgICAgICAgICAgICAgICAgICBhc3luYy50aHJvd0xhdGVyKGUuZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb25DYW5jZWxDYWxsYmFjay5fcmVzdWx0Q2FuY2VsbGVkKHRoaXMpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX2ludm9rZU9uQ2FuY2VsID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG9uQ2FuY2VsQ2FsbGJhY2sgPSB0aGlzLl9vbkNhbmNlbCgpO1xuICAgIHRoaXMuX3Vuc2V0T25DYW5jZWwoKTtcbiAgICBhc3luYy5pbnZva2UodGhpcy5fZG9JbnZva2VPbkNhbmNlbCwgdGhpcywgb25DYW5jZWxDYWxsYmFjayk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5faW52b2tlSW50ZXJuYWxPbkNhbmNlbCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl9pc0NhbmNlbGxhYmxlKCkpIHtcbiAgICAgICAgdGhpcy5fZG9JbnZva2VPbkNhbmNlbCh0aGlzLl9vbkNhbmNlbCgpLCB0cnVlKTtcbiAgICAgICAgdGhpcy5fdW5zZXRPbkNhbmNlbCgpO1xuICAgIH1cbn07XG5cblByb21pc2UucHJvdG90eXBlLl9yZXN1bHRDYW5jZWxsZWQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmNhbmNlbCgpO1xufTtcblxufTtcblxufSx7XCIuL3V0aWxcIjozNn1dLDc6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKE5FWFRfRklMVEVSKSB7XG52YXIgdXRpbCA9IF9kZXJlcV8oXCIuL3V0aWxcIik7XG52YXIgZ2V0S2V5cyA9IF9kZXJlcV8oXCIuL2VzNVwiKS5rZXlzO1xudmFyIHRyeUNhdGNoID0gdXRpbC50cnlDYXRjaDtcbnZhciBlcnJvck9iaiA9IHV0aWwuZXJyb3JPYmo7XG5cbmZ1bmN0aW9uIGNhdGNoRmlsdGVyKGluc3RhbmNlcywgY2IsIHByb21pc2UpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oZSkge1xuICAgICAgICB2YXIgYm91bmRUbyA9IHByb21pc2UuX2JvdW5kVmFsdWUoKTtcbiAgICAgICAgcHJlZGljYXRlTG9vcDogZm9yICh2YXIgaSA9IDA7IGkgPCBpbnN0YW5jZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIHZhciBpdGVtID0gaW5zdGFuY2VzW2ldO1xuXG4gICAgICAgICAgICBpZiAoaXRlbSA9PT0gRXJyb3IgfHxcbiAgICAgICAgICAgICAgICAoaXRlbSAhPSBudWxsICYmIGl0ZW0ucHJvdG90eXBlIGluc3RhbmNlb2YgRXJyb3IpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGUgaW5zdGFuY2VvZiBpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnlDYXRjaChjYikuY2FsbChib3VuZFRvLCBlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBpdGVtID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICB2YXIgbWF0Y2hlc1ByZWRpY2F0ZSA9IHRyeUNhdGNoKGl0ZW0pLmNhbGwoYm91bmRUbywgZSk7XG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoZXNQcmVkaWNhdGUgPT09IGVycm9yT2JqKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBtYXRjaGVzUHJlZGljYXRlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobWF0Y2hlc1ByZWRpY2F0ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ5Q2F0Y2goY2IpLmNhbGwoYm91bmRUbywgZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICh1dGlsLmlzT2JqZWN0KGUpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGtleXMgPSBnZXRLZXlzKGl0ZW0pO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwga2V5cy5sZW5ndGg7ICsraikge1xuICAgICAgICAgICAgICAgICAgICB2YXIga2V5ID0ga2V5c1tqXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW1ba2V5XSAhPSBlW2tleV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlIHByZWRpY2F0ZUxvb3A7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRyeUNhdGNoKGNiKS5jYWxsKGJvdW5kVG8sIGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBORVhUX0ZJTFRFUjtcbiAgICB9O1xufVxuXG5yZXR1cm4gY2F0Y2hGaWx0ZXI7XG59O1xuXG59LHtcIi4vZXM1XCI6MTMsXCIuL3V0aWxcIjozNn1dLDg6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKFByb21pc2UpIHtcbnZhciBsb25nU3RhY2tUcmFjZXMgPSBmYWxzZTtcbnZhciBjb250ZXh0U3RhY2sgPSBbXTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3Byb21pc2VDcmVhdGVkID0gZnVuY3Rpb24oKSB7fTtcblByb21pc2UucHJvdG90eXBlLl9wdXNoQ29udGV4dCA9IGZ1bmN0aW9uKCkge307XG5Qcm9taXNlLnByb3RvdHlwZS5fcG9wQ29udGV4dCA9IGZ1bmN0aW9uKCkge3JldHVybiBudWxsO307XG5Qcm9taXNlLl9wZWVrQ29udGV4dCA9IFByb21pc2UucHJvdG90eXBlLl9wZWVrQ29udGV4dCA9IGZ1bmN0aW9uKCkge307XG5cbmZ1bmN0aW9uIENvbnRleHQoKSB7XG4gICAgdGhpcy5fdHJhY2UgPSBuZXcgQ29udGV4dC5DYXB0dXJlZFRyYWNlKHBlZWtDb250ZXh0KCkpO1xufVxuQ29udGV4dC5wcm90b3R5cGUuX3B1c2hDb250ZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLl90cmFjZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuX3RyYWNlLl9wcm9taXNlQ3JlYXRlZCA9IG51bGw7XG4gICAgICAgIGNvbnRleHRTdGFjay5wdXNoKHRoaXMuX3RyYWNlKTtcbiAgICB9XG59O1xuXG5Db250ZXh0LnByb3RvdHlwZS5fcG9wQ29udGV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5fdHJhY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB2YXIgdHJhY2UgPSBjb250ZXh0U3RhY2sucG9wKCk7XG4gICAgICAgIHZhciByZXQgPSB0cmFjZS5fcHJvbWlzZUNyZWF0ZWQ7XG4gICAgICAgIHRyYWNlLl9wcm9taXNlQ3JlYXRlZCA9IG51bGw7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufTtcblxuZnVuY3Rpb24gY3JlYXRlQ29udGV4dCgpIHtcbiAgICBpZiAobG9uZ1N0YWNrVHJhY2VzKSByZXR1cm4gbmV3IENvbnRleHQoKTtcbn1cblxuZnVuY3Rpb24gcGVla0NvbnRleHQoKSB7XG4gICAgdmFyIGxhc3RJbmRleCA9IGNvbnRleHRTdGFjay5sZW5ndGggLSAxO1xuICAgIGlmIChsYXN0SW5kZXggPj0gMCkge1xuICAgICAgICByZXR1cm4gY29udGV4dFN0YWNrW2xhc3RJbmRleF07XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59XG5Db250ZXh0LkNhcHR1cmVkVHJhY2UgPSBudWxsO1xuQ29udGV4dC5jcmVhdGUgPSBjcmVhdGVDb250ZXh0O1xuQ29udGV4dC5kZWFjdGl2YXRlTG9uZ1N0YWNrVHJhY2VzID0gZnVuY3Rpb24oKSB7fTtcbkNvbnRleHQuYWN0aXZhdGVMb25nU3RhY2tUcmFjZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgUHJvbWlzZV9wdXNoQ29udGV4dCA9IFByb21pc2UucHJvdG90eXBlLl9wdXNoQ29udGV4dDtcbiAgICB2YXIgUHJvbWlzZV9wb3BDb250ZXh0ID0gUHJvbWlzZS5wcm90b3R5cGUuX3BvcENvbnRleHQ7XG4gICAgdmFyIFByb21pc2VfUGVla0NvbnRleHQgPSBQcm9taXNlLl9wZWVrQ29udGV4dDtcbiAgICB2YXIgUHJvbWlzZV9wZWVrQ29udGV4dCA9IFByb21pc2UucHJvdG90eXBlLl9wZWVrQ29udGV4dDtcbiAgICB2YXIgUHJvbWlzZV9wcm9taXNlQ3JlYXRlZCA9IFByb21pc2UucHJvdG90eXBlLl9wcm9taXNlQ3JlYXRlZDtcbiAgICBDb250ZXh0LmRlYWN0aXZhdGVMb25nU3RhY2tUcmFjZXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgUHJvbWlzZS5wcm90b3R5cGUuX3B1c2hDb250ZXh0ID0gUHJvbWlzZV9wdXNoQ29udGV4dDtcbiAgICAgICAgUHJvbWlzZS5wcm90b3R5cGUuX3BvcENvbnRleHQgPSBQcm9taXNlX3BvcENvbnRleHQ7XG4gICAgICAgIFByb21pc2UuX3BlZWtDb250ZXh0ID0gUHJvbWlzZV9QZWVrQ29udGV4dDtcbiAgICAgICAgUHJvbWlzZS5wcm90b3R5cGUuX3BlZWtDb250ZXh0ID0gUHJvbWlzZV9wZWVrQ29udGV4dDtcbiAgICAgICAgUHJvbWlzZS5wcm90b3R5cGUuX3Byb21pc2VDcmVhdGVkID0gUHJvbWlzZV9wcm9taXNlQ3JlYXRlZDtcbiAgICAgICAgbG9uZ1N0YWNrVHJhY2VzID0gZmFsc2U7XG4gICAgfTtcbiAgICBsb25nU3RhY2tUcmFjZXMgPSB0cnVlO1xuICAgIFByb21pc2UucHJvdG90eXBlLl9wdXNoQ29udGV4dCA9IENvbnRleHQucHJvdG90eXBlLl9wdXNoQ29udGV4dDtcbiAgICBQcm9taXNlLnByb3RvdHlwZS5fcG9wQ29udGV4dCA9IENvbnRleHQucHJvdG90eXBlLl9wb3BDb250ZXh0O1xuICAgIFByb21pc2UuX3BlZWtDb250ZXh0ID0gUHJvbWlzZS5wcm90b3R5cGUuX3BlZWtDb250ZXh0ID0gcGVla0NvbnRleHQ7XG4gICAgUHJvbWlzZS5wcm90b3R5cGUuX3Byb21pc2VDcmVhdGVkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBjdHggPSB0aGlzLl9wZWVrQ29udGV4dCgpO1xuICAgICAgICBpZiAoY3R4ICYmIGN0eC5fcHJvbWlzZUNyZWF0ZWQgPT0gbnVsbCkgY3R4Ll9wcm9taXNlQ3JlYXRlZCA9IHRoaXM7XG4gICAgfTtcbn07XG5yZXR1cm4gQ29udGV4dDtcbn07XG5cbn0se31dLDk6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKFByb21pc2UsIENvbnRleHQpIHtcbnZhciBnZXREb21haW4gPSBQcm9taXNlLl9nZXREb21haW47XG52YXIgYXN5bmMgPSBQcm9taXNlLl9hc3luYztcbnZhciBXYXJuaW5nID0gX2RlcmVxXyhcIi4vZXJyb3JzXCIpLldhcm5pbmc7XG52YXIgdXRpbCA9IF9kZXJlcV8oXCIuL3V0aWxcIik7XG52YXIgY2FuQXR0YWNoVHJhY2UgPSB1dGlsLmNhbkF0dGFjaFRyYWNlO1xudmFyIHVuaGFuZGxlZFJlamVjdGlvbkhhbmRsZWQ7XG52YXIgcG9zc2libHlVbmhhbmRsZWRSZWplY3Rpb247XG52YXIgYmx1ZWJpcmRGcmFtZVBhdHRlcm4gPVxuICAgIC9bXFxcXFxcL11ibHVlYmlyZFtcXFxcXFwvXWpzW1xcXFxcXC9dKHJlbGVhc2V8ZGVidWd8aW5zdHJ1bWVudGVkKS87XG52YXIgbm9kZUZyYW1lUGF0dGVybiA9IC9cXCgoPzp0aW1lcnNcXC5qcyk6XFxkKzpcXGQrXFwpLztcbnZhciBwYXJzZUxpbmVQYXR0ZXJuID0gL1tcXC88XFwoXSguKz8pOihcXGQrKTooXFxkKylcXCk/XFxzKiQvO1xudmFyIHN0YWNrRnJhbWVQYXR0ZXJuID0gbnVsbDtcbnZhciBmb3JtYXRTdGFjayA9IG51bGw7XG52YXIgaW5kZW50U3RhY2tGcmFtZXMgPSBmYWxzZTtcbnZhciBwcmludFdhcm5pbmc7XG52YXIgZGVidWdnaW5nID0gISEodXRpbC5lbnYoXCJCTFVFQklSRF9ERUJVR1wiKSAhPSAwICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAodHJ1ZSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgIHV0aWwuZW52KFwiQkxVRUJJUkRfREVCVUdcIikgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICB1dGlsLmVudihcIk5PREVfRU5WXCIpID09PSBcImRldmVsb3BtZW50XCIpKTtcblxudmFyIHdhcm5pbmdzID0gISEodXRpbC5lbnYoXCJCTFVFQklSRF9XQVJOSU5HU1wiKSAhPSAwICYmXG4gICAgKGRlYnVnZ2luZyB8fCB1dGlsLmVudihcIkJMVUVCSVJEX1dBUk5JTkdTXCIpKSk7XG5cbnZhciBsb25nU3RhY2tUcmFjZXMgPSAhISh1dGlsLmVudihcIkJMVUVCSVJEX0xPTkdfU1RBQ0tfVFJBQ0VTXCIpICE9IDAgJiZcbiAgICAoZGVidWdnaW5nIHx8IHV0aWwuZW52KFwiQkxVRUJJUkRfTE9OR19TVEFDS19UUkFDRVNcIikpKTtcblxudmFyIHdGb3Jnb3R0ZW5SZXR1cm4gPSB1dGlsLmVudihcIkJMVUVCSVJEX1dfRk9SR09UVEVOX1JFVFVSTlwiKSAhPSAwICYmXG4gICAgKHdhcm5pbmdzIHx8ICEhdXRpbC5lbnYoXCJCTFVFQklSRF9XX0ZPUkdPVFRFTl9SRVRVUk5cIikpO1xuXG5Qcm9taXNlLnByb3RvdHlwZS5zdXBwcmVzc1VuaGFuZGxlZFJlamVjdGlvbnMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGFyZ2V0ID0gdGhpcy5fdGFyZ2V0KCk7XG4gICAgdGFyZ2V0Ll9iaXRGaWVsZCA9ICgodGFyZ2V0Ll9iaXRGaWVsZCAmICh+MTA0ODU3NikpIHxcbiAgICAgICAgICAgICAgICAgICAgICA1MjQyODgpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX2Vuc3VyZVBvc3NpYmxlUmVqZWN0aW9uSGFuZGxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoKHRoaXMuX2JpdEZpZWxkICYgNTI0Mjg4KSAhPT0gMCkgcmV0dXJuO1xuICAgIHRoaXMuX3NldFJlamVjdGlvbklzVW5oYW5kbGVkKCk7XG4gICAgYXN5bmMuaW52b2tlTGF0ZXIodGhpcy5fbm90aWZ5VW5oYW5kbGVkUmVqZWN0aW9uLCB0aGlzLCB1bmRlZmluZWQpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX25vdGlmeVVuaGFuZGxlZFJlamVjdGlvbklzSGFuZGxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICBmaXJlUmVqZWN0aW9uRXZlbnQoXCJyZWplY3Rpb25IYW5kbGVkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5oYW5kbGVkUmVqZWN0aW9uSGFuZGxlZCwgdW5kZWZpbmVkLCB0aGlzKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9zZXRSZXR1cm5lZE5vblVuZGVmaW5lZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2JpdEZpZWxkID0gdGhpcy5fYml0RmllbGQgfCAyNjg0MzU0NTY7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fcmV0dXJuZWROb25VbmRlZmluZWQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gKHRoaXMuX2JpdEZpZWxkICYgMjY4NDM1NDU2KSAhPT0gMDtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9ub3RpZnlVbmhhbmRsZWRSZWplY3Rpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuX2lzUmVqZWN0aW9uVW5oYW5kbGVkKCkpIHtcbiAgICAgICAgdmFyIHJlYXNvbiA9IHRoaXMuX3NldHRsZWRWYWx1ZSgpO1xuICAgICAgICB0aGlzLl9zZXRVbmhhbmRsZWRSZWplY3Rpb25Jc05vdGlmaWVkKCk7XG4gICAgICAgIGZpcmVSZWplY3Rpb25FdmVudChcInVuaGFuZGxlZFJlamVjdGlvblwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NzaWJseVVuaGFuZGxlZFJlamVjdGlvbiwgcmVhc29uLCB0aGlzKTtcbiAgICB9XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fc2V0VW5oYW5kbGVkUmVqZWN0aW9uSXNOb3RpZmllZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9iaXRGaWVsZCA9IHRoaXMuX2JpdEZpZWxkIHwgMjYyMTQ0O1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3Vuc2V0VW5oYW5kbGVkUmVqZWN0aW9uSXNOb3RpZmllZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9iaXRGaWVsZCA9IHRoaXMuX2JpdEZpZWxkICYgKH4yNjIxNDQpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX2lzVW5oYW5kbGVkUmVqZWN0aW9uTm90aWZpZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICh0aGlzLl9iaXRGaWVsZCAmIDI2MjE0NCkgPiAwO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3NldFJlamVjdGlvbklzVW5oYW5kbGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2JpdEZpZWxkID0gdGhpcy5fYml0RmllbGQgfCAxMDQ4NTc2O1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3Vuc2V0UmVqZWN0aW9uSXNVbmhhbmRsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fYml0RmllbGQgPSB0aGlzLl9iaXRGaWVsZCAmICh+MTA0ODU3Nik7XG4gICAgaWYgKHRoaXMuX2lzVW5oYW5kbGVkUmVqZWN0aW9uTm90aWZpZWQoKSkge1xuICAgICAgICB0aGlzLl91bnNldFVuaGFuZGxlZFJlamVjdGlvbklzTm90aWZpZWQoKTtcbiAgICAgICAgdGhpcy5fbm90aWZ5VW5oYW5kbGVkUmVqZWN0aW9uSXNIYW5kbGVkKCk7XG4gICAgfVxufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX2lzUmVqZWN0aW9uVW5oYW5kbGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAodGhpcy5fYml0RmllbGQgJiAxMDQ4NTc2KSA+IDA7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fd2FybiA9IGZ1bmN0aW9uKG1lc3NhZ2UsIHNob3VsZFVzZU93blRyYWNlLCBwcm9taXNlKSB7XG4gICAgcmV0dXJuIHdhcm4obWVzc2FnZSwgc2hvdWxkVXNlT3duVHJhY2UsIHByb21pc2UgfHwgdGhpcyk7XG59O1xuXG5Qcm9taXNlLm9uUG9zc2libHlVbmhhbmRsZWRSZWplY3Rpb24gPSBmdW5jdGlvbiAoZm4pIHtcbiAgICB2YXIgZG9tYWluID0gZ2V0RG9tYWluKCk7XG4gICAgcG9zc2libHlVbmhhbmRsZWRSZWplY3Rpb24gPVxuICAgICAgICB0eXBlb2YgZm4gPT09IFwiZnVuY3Rpb25cIiA/IChkb21haW4gPT09IG51bGwgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmbiA6IHV0aWwuZG9tYWluQmluZChkb21haW4sIGZuKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogdW5kZWZpbmVkO1xufTtcblxuUHJvbWlzZS5vblVuaGFuZGxlZFJlamVjdGlvbkhhbmRsZWQgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICB2YXIgZG9tYWluID0gZ2V0RG9tYWluKCk7XG4gICAgdW5oYW5kbGVkUmVqZWN0aW9uSGFuZGxlZCA9XG4gICAgICAgIHR5cGVvZiBmbiA9PT0gXCJmdW5jdGlvblwiID8gKGRvbWFpbiA9PT0gbnVsbCA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZuIDogdXRpbC5kb21haW5CaW5kKGRvbWFpbiwgZm4pKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiB1bmRlZmluZWQ7XG59O1xuXG52YXIgZGlzYWJsZUxvbmdTdGFja1RyYWNlcyA9IGZ1bmN0aW9uKCkge307XG5Qcm9taXNlLmxvbmdTdGFja1RyYWNlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoYXN5bmMuaGF2ZUl0ZW1zUXVldWVkKCkgJiYgIWNvbmZpZy5sb25nU3RhY2tUcmFjZXMpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiY2Fubm90IGVuYWJsZSBsb25nIHN0YWNrIHRyYWNlcyBhZnRlciBwcm9taXNlcyBoYXZlIGJlZW4gY3JlYXRlZFxcdTAwMGFcXHUwMDBhICAgIFNlZSBodHRwOi8vZ29vLmdsL01xckZtWFxcdTAwMGFcIik7XG4gICAgfVxuICAgIGlmICghY29uZmlnLmxvbmdTdGFja1RyYWNlcyAmJiBsb25nU3RhY2tUcmFjZXNJc1N1cHBvcnRlZCgpKSB7XG4gICAgICAgIHZhciBQcm9taXNlX2NhcHR1cmVTdGFja1RyYWNlID0gUHJvbWlzZS5wcm90b3R5cGUuX2NhcHR1cmVTdGFja1RyYWNlO1xuICAgICAgICB2YXIgUHJvbWlzZV9hdHRhY2hFeHRyYVRyYWNlID0gUHJvbWlzZS5wcm90b3R5cGUuX2F0dGFjaEV4dHJhVHJhY2U7XG4gICAgICAgIGNvbmZpZy5sb25nU3RhY2tUcmFjZXMgPSB0cnVlO1xuICAgICAgICBkaXNhYmxlTG9uZ1N0YWNrVHJhY2VzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoYXN5bmMuaGF2ZUl0ZW1zUXVldWVkKCkgJiYgIWNvbmZpZy5sb25nU3RhY2tUcmFjZXMpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJjYW5ub3QgZW5hYmxlIGxvbmcgc3RhY2sgdHJhY2VzIGFmdGVyIHByb21pc2VzIGhhdmUgYmVlbiBjcmVhdGVkXFx1MDAwYVxcdTAwMGEgICAgU2VlIGh0dHA6Ly9nb28uZ2wvTXFyRm1YXFx1MDAwYVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFByb21pc2UucHJvdG90eXBlLl9jYXB0dXJlU3RhY2tUcmFjZSA9IFByb21pc2VfY2FwdHVyZVN0YWNrVHJhY2U7XG4gICAgICAgICAgICBQcm9taXNlLnByb3RvdHlwZS5fYXR0YWNoRXh0cmFUcmFjZSA9IFByb21pc2VfYXR0YWNoRXh0cmFUcmFjZTtcbiAgICAgICAgICAgIENvbnRleHQuZGVhY3RpdmF0ZUxvbmdTdGFja1RyYWNlcygpO1xuICAgICAgICAgICAgYXN5bmMuZW5hYmxlVHJhbXBvbGluZSgpO1xuICAgICAgICAgICAgY29uZmlnLmxvbmdTdGFja1RyYWNlcyA9IGZhbHNlO1xuICAgICAgICB9O1xuICAgICAgICBQcm9taXNlLnByb3RvdHlwZS5fY2FwdHVyZVN0YWNrVHJhY2UgPSBsb25nU3RhY2tUcmFjZXNDYXB0dXJlU3RhY2tUcmFjZTtcbiAgICAgICAgUHJvbWlzZS5wcm90b3R5cGUuX2F0dGFjaEV4dHJhVHJhY2UgPSBsb25nU3RhY2tUcmFjZXNBdHRhY2hFeHRyYVRyYWNlO1xuICAgICAgICBDb250ZXh0LmFjdGl2YXRlTG9uZ1N0YWNrVHJhY2VzKCk7XG4gICAgICAgIGFzeW5jLmRpc2FibGVUcmFtcG9saW5lSWZOZWNlc3NhcnkoKTtcbiAgICB9XG59O1xuXG5Qcm9taXNlLmhhc0xvbmdTdGFja1RyYWNlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gY29uZmlnLmxvbmdTdGFja1RyYWNlcyAmJiBsb25nU3RhY2tUcmFjZXNJc1N1cHBvcnRlZCgpO1xufTtcblxudmFyIGZpcmVEb21FdmVudCA9IChmdW5jdGlvbigpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIEN1c3RvbUV2ZW50ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHZhciBldmVudCA9IG5ldyBDdXN0b21FdmVudChcIkN1c3RvbUV2ZW50XCIpO1xuICAgICAgICAgICAgdXRpbC5nbG9iYWwuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24obmFtZSwgZXZlbnQpIHtcbiAgICAgICAgICAgICAgICB2YXIgZG9tRXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQobmFtZS50b0xvd2VyQ2FzZSgpLCB7XG4gICAgICAgICAgICAgICAgICAgIGRldGFpbDogZXZlbnQsXG4gICAgICAgICAgICAgICAgICAgIGNhbmNlbGFibGU6IHRydWVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gIXV0aWwuZ2xvYmFsLmRpc3BhdGNoRXZlbnQoZG9tRXZlbnQpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgRXZlbnQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgdmFyIGV2ZW50ID0gbmV3IEV2ZW50KFwiQ3VzdG9tRXZlbnRcIik7XG4gICAgICAgICAgICB1dGlsLmdsb2JhbC5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbihuYW1lLCBldmVudCkge1xuICAgICAgICAgICAgICAgIHZhciBkb21FdmVudCA9IG5ldyBFdmVudChuYW1lLnRvTG93ZXJDYXNlKCksIHtcbiAgICAgICAgICAgICAgICAgICAgY2FuY2VsYWJsZTogdHJ1ZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGRvbUV2ZW50LmRldGFpbCA9IGV2ZW50O1xuICAgICAgICAgICAgICAgIHJldHVybiAhdXRpbC5nbG9iYWwuZGlzcGF0Y2hFdmVudChkb21FdmVudCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJDdXN0b21FdmVudFwiKTtcbiAgICAgICAgICAgIGV2ZW50LmluaXRDdXN0b21FdmVudChcInRlc3Rpbmd0aGVldmVudFwiLCBmYWxzZSwgdHJ1ZSwge30pO1xuICAgICAgICAgICAgdXRpbC5nbG9iYWwuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24obmFtZSwgZXZlbnQpIHtcbiAgICAgICAgICAgICAgICB2YXIgZG9tRXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudChcIkN1c3RvbUV2ZW50XCIpO1xuICAgICAgICAgICAgICAgIGRvbUV2ZW50LmluaXRDdXN0b21FdmVudChuYW1lLnRvTG93ZXJDYXNlKCksIGZhbHNlLCB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBldmVudCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICF1dGlsLmdsb2JhbC5kaXNwYXRjaEV2ZW50KGRvbUV2ZW50KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7fVxuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG59KSgpO1xuXG52YXIgZmlyZUdsb2JhbEV2ZW50ID0gKGZ1bmN0aW9uKCkge1xuICAgIGlmICh1dGlsLmlzTm9kZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJvY2Vzcy5lbWl0LmFwcGx5KHByb2Nlc3MsIGFyZ3VtZW50cyk7XG4gICAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCF1dGlsLmdsb2JhbCkge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgICAgIHZhciBtZXRob2ROYW1lID0gXCJvblwiICsgbmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgdmFyIG1ldGhvZCA9IHV0aWwuZ2xvYmFsW21ldGhvZE5hbWVdO1xuICAgICAgICAgICAgaWYgKCFtZXRob2QpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIG1ldGhvZC5hcHBseSh1dGlsLmdsb2JhbCwgW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuICAgIH1cbn0pKCk7XG5cbmZ1bmN0aW9uIGdlbmVyYXRlUHJvbWlzZUxpZmVjeWNsZUV2ZW50T2JqZWN0KG5hbWUsIHByb21pc2UpIHtcbiAgICByZXR1cm4ge3Byb21pc2U6IHByb21pc2V9O1xufVxuXG52YXIgZXZlbnRUb09iamVjdEdlbmVyYXRvciA9IHtcbiAgICBwcm9taXNlQ3JlYXRlZDogZ2VuZXJhdGVQcm9taXNlTGlmZWN5Y2xlRXZlbnRPYmplY3QsXG4gICAgcHJvbWlzZUZ1bGZpbGxlZDogZ2VuZXJhdGVQcm9taXNlTGlmZWN5Y2xlRXZlbnRPYmplY3QsXG4gICAgcHJvbWlzZVJlamVjdGVkOiBnZW5lcmF0ZVByb21pc2VMaWZlY3ljbGVFdmVudE9iamVjdCxcbiAgICBwcm9taXNlUmVzb2x2ZWQ6IGdlbmVyYXRlUHJvbWlzZUxpZmVjeWNsZUV2ZW50T2JqZWN0LFxuICAgIHByb21pc2VDYW5jZWxsZWQ6IGdlbmVyYXRlUHJvbWlzZUxpZmVjeWNsZUV2ZW50T2JqZWN0LFxuICAgIHByb21pc2VDaGFpbmVkOiBmdW5jdGlvbihuYW1lLCBwcm9taXNlLCBjaGlsZCkge1xuICAgICAgICByZXR1cm4ge3Byb21pc2U6IHByb21pc2UsIGNoaWxkOiBjaGlsZH07XG4gICAgfSxcbiAgICB3YXJuaW5nOiBmdW5jdGlvbihuYW1lLCB3YXJuaW5nKSB7XG4gICAgICAgIHJldHVybiB7d2FybmluZzogd2FybmluZ307XG4gICAgfSxcbiAgICB1bmhhbmRsZWRSZWplY3Rpb246IGZ1bmN0aW9uIChuYW1lLCByZWFzb24sIHByb21pc2UpIHtcbiAgICAgICAgcmV0dXJuIHtyZWFzb246IHJlYXNvbiwgcHJvbWlzZTogcHJvbWlzZX07XG4gICAgfSxcbiAgICByZWplY3Rpb25IYW5kbGVkOiBnZW5lcmF0ZVByb21pc2VMaWZlY3ljbGVFdmVudE9iamVjdFxufTtcblxudmFyIGFjdGl2ZUZpcmVFdmVudCA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdmFyIGdsb2JhbEV2ZW50RmlyZWQgPSBmYWxzZTtcbiAgICB0cnkge1xuICAgICAgICBnbG9iYWxFdmVudEZpcmVkID0gZmlyZUdsb2JhbEV2ZW50LmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBhc3luYy50aHJvd0xhdGVyKGUpO1xuICAgICAgICBnbG9iYWxFdmVudEZpcmVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICB2YXIgZG9tRXZlbnRGaXJlZCA9IGZhbHNlO1xuICAgIHRyeSB7XG4gICAgICAgIGRvbUV2ZW50RmlyZWQgPSBmaXJlRG9tRXZlbnQobmFtZSxcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRUb09iamVjdEdlbmVyYXRvcltuYW1lXS5hcHBseShudWxsLCBhcmd1bWVudHMpKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGFzeW5jLnRocm93TGF0ZXIoZSk7XG4gICAgICAgIGRvbUV2ZW50RmlyZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBkb21FdmVudEZpcmVkIHx8IGdsb2JhbEV2ZW50RmlyZWQ7XG59O1xuXG5Qcm9taXNlLmNvbmZpZyA9IGZ1bmN0aW9uKG9wdHMpIHtcbiAgICBvcHRzID0gT2JqZWN0KG9wdHMpO1xuICAgIGlmIChcImxvbmdTdGFja1RyYWNlc1wiIGluIG9wdHMpIHtcbiAgICAgICAgaWYgKG9wdHMubG9uZ1N0YWNrVHJhY2VzKSB7XG4gICAgICAgICAgICBQcm9taXNlLmxvbmdTdGFja1RyYWNlcygpO1xuICAgICAgICB9IGVsc2UgaWYgKCFvcHRzLmxvbmdTdGFja1RyYWNlcyAmJiBQcm9taXNlLmhhc0xvbmdTdGFja1RyYWNlcygpKSB7XG4gICAgICAgICAgICBkaXNhYmxlTG9uZ1N0YWNrVHJhY2VzKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKFwid2FybmluZ3NcIiBpbiBvcHRzKSB7XG4gICAgICAgIHZhciB3YXJuaW5nc09wdGlvbiA9IG9wdHMud2FybmluZ3M7XG4gICAgICAgIGNvbmZpZy53YXJuaW5ncyA9ICEhd2FybmluZ3NPcHRpb247XG4gICAgICAgIHdGb3Jnb3R0ZW5SZXR1cm4gPSBjb25maWcud2FybmluZ3M7XG5cbiAgICAgICAgaWYgKHV0aWwuaXNPYmplY3Qod2FybmluZ3NPcHRpb24pKSB7XG4gICAgICAgICAgICBpZiAoXCJ3Rm9yZ290dGVuUmV0dXJuXCIgaW4gd2FybmluZ3NPcHRpb24pIHtcbiAgICAgICAgICAgICAgICB3Rm9yZ290dGVuUmV0dXJuID0gISF3YXJuaW5nc09wdGlvbi53Rm9yZ290dGVuUmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChcImNhbmNlbGxhdGlvblwiIGluIG9wdHMgJiYgb3B0cy5jYW5jZWxsYXRpb24gJiYgIWNvbmZpZy5jYW5jZWxsYXRpb24pIHtcbiAgICAgICAgaWYgKGFzeW5jLmhhdmVJdGVtc1F1ZXVlZCgpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgXCJjYW5ub3QgZW5hYmxlIGNhbmNlbGxhdGlvbiBhZnRlciBwcm9taXNlcyBhcmUgaW4gdXNlXCIpO1xuICAgICAgICB9XG4gICAgICAgIFByb21pc2UucHJvdG90eXBlLl9jbGVhckNhbmNlbGxhdGlvbkRhdGEgPVxuICAgICAgICAgICAgY2FuY2VsbGF0aW9uQ2xlYXJDYW5jZWxsYXRpb25EYXRhO1xuICAgICAgICBQcm9taXNlLnByb3RvdHlwZS5fcHJvcGFnYXRlRnJvbSA9IGNhbmNlbGxhdGlvblByb3BhZ2F0ZUZyb207XG4gICAgICAgIFByb21pc2UucHJvdG90eXBlLl9vbkNhbmNlbCA9IGNhbmNlbGxhdGlvbk9uQ2FuY2VsO1xuICAgICAgICBQcm9taXNlLnByb3RvdHlwZS5fc2V0T25DYW5jZWwgPSBjYW5jZWxsYXRpb25TZXRPbkNhbmNlbDtcbiAgICAgICAgUHJvbWlzZS5wcm90b3R5cGUuX2F0dGFjaENhbmNlbGxhdGlvbkNhbGxiYWNrID1cbiAgICAgICAgICAgIGNhbmNlbGxhdGlvbkF0dGFjaENhbmNlbGxhdGlvbkNhbGxiYWNrO1xuICAgICAgICBQcm9taXNlLnByb3RvdHlwZS5fZXhlY3V0ZSA9IGNhbmNlbGxhdGlvbkV4ZWN1dGU7XG4gICAgICAgIHByb3BhZ2F0ZUZyb21GdW5jdGlvbiA9IGNhbmNlbGxhdGlvblByb3BhZ2F0ZUZyb207XG4gICAgICAgIGNvbmZpZy5jYW5jZWxsYXRpb24gPSB0cnVlO1xuICAgIH1cbiAgICBpZiAoXCJtb25pdG9yaW5nXCIgaW4gb3B0cykge1xuICAgICAgICBpZiAob3B0cy5tb25pdG9yaW5nICYmICFjb25maWcubW9uaXRvcmluZykge1xuICAgICAgICAgICAgY29uZmlnLm1vbml0b3JpbmcgPSB0cnVlO1xuICAgICAgICAgICAgUHJvbWlzZS5wcm90b3R5cGUuX2ZpcmVFdmVudCA9IGFjdGl2ZUZpcmVFdmVudDtcbiAgICAgICAgfSBlbHNlIGlmICghb3B0cy5tb25pdG9yaW5nICYmIGNvbmZpZy5tb25pdG9yaW5nKSB7XG4gICAgICAgICAgICBjb25maWcubW9uaXRvcmluZyA9IGZhbHNlO1xuICAgICAgICAgICAgUHJvbWlzZS5wcm90b3R5cGUuX2ZpcmVFdmVudCA9IGRlZmF1bHRGaXJlRXZlbnQ7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIFByb21pc2U7XG59O1xuXG5mdW5jdGlvbiBkZWZhdWx0RmlyZUV2ZW50KCkgeyByZXR1cm4gZmFsc2U7IH1cblxuUHJvbWlzZS5wcm90b3R5cGUuX2ZpcmVFdmVudCA9IGRlZmF1bHRGaXJlRXZlbnQ7XG5Qcm9taXNlLnByb3RvdHlwZS5fZXhlY3V0ZSA9IGZ1bmN0aW9uKGV4ZWN1dG9yLCByZXNvbHZlLCByZWplY3QpIHtcbiAgICB0cnkge1xuICAgICAgICBleGVjdXRvcihyZXNvbHZlLCByZWplY3QpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIGU7XG4gICAgfVxufTtcblByb21pc2UucHJvdG90eXBlLl9vbkNhbmNlbCA9IGZ1bmN0aW9uICgpIHt9O1xuUHJvbWlzZS5wcm90b3R5cGUuX3NldE9uQ2FuY2VsID0gZnVuY3Rpb24gKGhhbmRsZXIpIHsgOyB9O1xuUHJvbWlzZS5wcm90b3R5cGUuX2F0dGFjaENhbmNlbGxhdGlvbkNhbGxiYWNrID0gZnVuY3Rpb24ob25DYW5jZWwpIHtcbiAgICA7XG59O1xuUHJvbWlzZS5wcm90b3R5cGUuX2NhcHR1cmVTdGFja1RyYWNlID0gZnVuY3Rpb24gKCkge307XG5Qcm9taXNlLnByb3RvdHlwZS5fYXR0YWNoRXh0cmFUcmFjZSA9IGZ1bmN0aW9uICgpIHt9O1xuUHJvbWlzZS5wcm90b3R5cGUuX2NsZWFyQ2FuY2VsbGF0aW9uRGF0YSA9IGZ1bmN0aW9uKCkge307XG5Qcm9taXNlLnByb3RvdHlwZS5fcHJvcGFnYXRlRnJvbSA9IGZ1bmN0aW9uIChwYXJlbnQsIGZsYWdzKSB7XG4gICAgO1xuICAgIDtcbn07XG5cbmZ1bmN0aW9uIGNhbmNlbGxhdGlvbkV4ZWN1dGUoZXhlY3V0b3IsIHJlc29sdmUsIHJlamVjdCkge1xuICAgIHZhciBwcm9taXNlID0gdGhpcztcbiAgICB0cnkge1xuICAgICAgICBleGVjdXRvcihyZXNvbHZlLCByZWplY3QsIGZ1bmN0aW9uKG9uQ2FuY2VsKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9uQ2FuY2VsICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwib25DYW5jZWwgbXVzdCBiZSBhIGZ1bmN0aW9uLCBnb3Q6IFwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHV0aWwudG9TdHJpbmcob25DYW5jZWwpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHByb21pc2UuX2F0dGFjaENhbmNlbGxhdGlvbkNhbGxiYWNrKG9uQ2FuY2VsKTtcbiAgICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXR1cm4gZTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNhbmNlbGxhdGlvbkF0dGFjaENhbmNlbGxhdGlvbkNhbGxiYWNrKG9uQ2FuY2VsKSB7XG4gICAgaWYgKCF0aGlzLl9pc0NhbmNlbGxhYmxlKCkpIHJldHVybiB0aGlzO1xuXG4gICAgdmFyIHByZXZpb3VzT25DYW5jZWwgPSB0aGlzLl9vbkNhbmNlbCgpO1xuICAgIGlmIChwcmV2aW91c09uQ2FuY2VsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHV0aWwuaXNBcnJheShwcmV2aW91c09uQ2FuY2VsKSkge1xuICAgICAgICAgICAgcHJldmlvdXNPbkNhbmNlbC5wdXNoKG9uQ2FuY2VsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3NldE9uQ2FuY2VsKFtwcmV2aW91c09uQ2FuY2VsLCBvbkNhbmNlbF0pO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fc2V0T25DYW5jZWwob25DYW5jZWwpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gY2FuY2VsbGF0aW9uT25DYW5jZWwoKSB7XG4gICAgcmV0dXJuIHRoaXMuX29uQ2FuY2VsRmllbGQ7XG59XG5cbmZ1bmN0aW9uIGNhbmNlbGxhdGlvblNldE9uQ2FuY2VsKG9uQ2FuY2VsKSB7XG4gICAgdGhpcy5fb25DYW5jZWxGaWVsZCA9IG9uQ2FuY2VsO1xufVxuXG5mdW5jdGlvbiBjYW5jZWxsYXRpb25DbGVhckNhbmNlbGxhdGlvbkRhdGEoKSB7XG4gICAgdGhpcy5fY2FuY2VsbGF0aW9uUGFyZW50ID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX29uQ2FuY2VsRmllbGQgPSB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGNhbmNlbGxhdGlvblByb3BhZ2F0ZUZyb20ocGFyZW50LCBmbGFncykge1xuICAgIGlmICgoZmxhZ3MgJiAxKSAhPT0gMCkge1xuICAgICAgICB0aGlzLl9jYW5jZWxsYXRpb25QYXJlbnQgPSBwYXJlbnQ7XG4gICAgICAgIHZhciBicmFuY2hlc1JlbWFpbmluZ1RvQ2FuY2VsID0gcGFyZW50Ll9icmFuY2hlc1JlbWFpbmluZ1RvQ2FuY2VsO1xuICAgICAgICBpZiAoYnJhbmNoZXNSZW1haW5pbmdUb0NhbmNlbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBicmFuY2hlc1JlbWFpbmluZ1RvQ2FuY2VsID0gMDtcbiAgICAgICAgfVxuICAgICAgICBwYXJlbnQuX2JyYW5jaGVzUmVtYWluaW5nVG9DYW5jZWwgPSBicmFuY2hlc1JlbWFpbmluZ1RvQ2FuY2VsICsgMTtcbiAgICB9XG4gICAgaWYgKChmbGFncyAmIDIpICE9PSAwICYmIHBhcmVudC5faXNCb3VuZCgpKSB7XG4gICAgICAgIHRoaXMuX3NldEJvdW5kVG8ocGFyZW50Ll9ib3VuZFRvKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGJpbmRpbmdQcm9wYWdhdGVGcm9tKHBhcmVudCwgZmxhZ3MpIHtcbiAgICBpZiAoKGZsYWdzICYgMikgIT09IDAgJiYgcGFyZW50Ll9pc0JvdW5kKCkpIHtcbiAgICAgICAgdGhpcy5fc2V0Qm91bmRUbyhwYXJlbnQuX2JvdW5kVG8pO1xuICAgIH1cbn1cbnZhciBwcm9wYWdhdGVGcm9tRnVuY3Rpb24gPSBiaW5kaW5nUHJvcGFnYXRlRnJvbTtcblxuZnVuY3Rpb24gYm91bmRWYWx1ZUZ1bmN0aW9uKCkge1xuICAgIHZhciByZXQgPSB0aGlzLl9ib3VuZFRvO1xuICAgIGlmIChyZXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAocmV0IGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICAgICAgaWYgKHJldC5pc0Z1bGZpbGxlZCgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldC52YWx1ZSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG59XG5cbmZ1bmN0aW9uIGxvbmdTdGFja1RyYWNlc0NhcHR1cmVTdGFja1RyYWNlKCkge1xuICAgIHRoaXMuX3RyYWNlID0gbmV3IENhcHR1cmVkVHJhY2UodGhpcy5fcGVla0NvbnRleHQoKSk7XG59XG5cbmZ1bmN0aW9uIGxvbmdTdGFja1RyYWNlc0F0dGFjaEV4dHJhVHJhY2UoZXJyb3IsIGlnbm9yZVNlbGYpIHtcbiAgICBpZiAoY2FuQXR0YWNoVHJhY2UoZXJyb3IpKSB7XG4gICAgICAgIHZhciB0cmFjZSA9IHRoaXMuX3RyYWNlO1xuICAgICAgICBpZiAodHJhY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgaWYgKGlnbm9yZVNlbGYpIHRyYWNlID0gdHJhY2UuX3BhcmVudDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHJhY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdHJhY2UuYXR0YWNoRXh0cmFUcmFjZShlcnJvcik7XG4gICAgICAgIH0gZWxzZSBpZiAoIWVycm9yLl9fc3RhY2tDbGVhbmVkX18pIHtcbiAgICAgICAgICAgIHZhciBwYXJzZWQgPSBwYXJzZVN0YWNrQW5kTWVzc2FnZShlcnJvcik7XG4gICAgICAgICAgICB1dGlsLm5vdEVudW1lcmFibGVQcm9wKGVycm9yLCBcInN0YWNrXCIsXG4gICAgICAgICAgICAgICAgcGFyc2VkLm1lc3NhZ2UgKyBcIlxcblwiICsgcGFyc2VkLnN0YWNrLmpvaW4oXCJcXG5cIikpO1xuICAgICAgICAgICAgdXRpbC5ub3RFbnVtZXJhYmxlUHJvcChlcnJvciwgXCJfX3N0YWNrQ2xlYW5lZF9fXCIsIHRydWUpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBjaGVja0ZvcmdvdHRlblJldHVybnMocmV0dXJuVmFsdWUsIHByb21pc2VDcmVhdGVkLCBuYW1lLCBwcm9taXNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudCkge1xuICAgIGlmIChyZXR1cm5WYWx1ZSA9PT0gdW5kZWZpbmVkICYmIHByb21pc2VDcmVhdGVkICE9PSBudWxsICYmXG4gICAgICAgIHdGb3Jnb3R0ZW5SZXR1cm4pIHtcbiAgICAgICAgaWYgKHBhcmVudCAhPT0gdW5kZWZpbmVkICYmIHBhcmVudC5fcmV0dXJuZWROb25VbmRlZmluZWQoKSkgcmV0dXJuO1xuICAgICAgICBpZiAoKHByb21pc2UuX2JpdEZpZWxkICYgNjU1MzUpID09PSAwKSByZXR1cm47XG5cbiAgICAgICAgaWYgKG5hbWUpIG5hbWUgPSBuYW1lICsgXCIgXCI7XG4gICAgICAgIHZhciBoYW5kbGVyTGluZSA9IFwiXCI7XG4gICAgICAgIHZhciBjcmVhdG9yTGluZSA9IFwiXCI7XG4gICAgICAgIGlmIChwcm9taXNlQ3JlYXRlZC5fdHJhY2UpIHtcbiAgICAgICAgICAgIHZhciB0cmFjZUxpbmVzID0gcHJvbWlzZUNyZWF0ZWQuX3RyYWNlLnN0YWNrLnNwbGl0KFwiXFxuXCIpO1xuICAgICAgICAgICAgdmFyIHN0YWNrID0gY2xlYW5TdGFjayh0cmFjZUxpbmVzKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSBzdGFjay5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgICAgICAgICAgIHZhciBsaW5lID0gc3RhY2tbaV07XG4gICAgICAgICAgICAgICAgaWYgKCFub2RlRnJhbWVQYXR0ZXJuLnRlc3QobGluZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxpbmVNYXRjaGVzID0gbGluZS5tYXRjaChwYXJzZUxpbmVQYXR0ZXJuKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxpbmVNYXRjaGVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVyTGluZSAgPSBcImF0IFwiICsgbGluZU1hdGNoZXNbMV0gK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiOlwiICsgbGluZU1hdGNoZXNbMl0gKyBcIjpcIiArIGxpbmVNYXRjaGVzWzNdICsgXCIgXCI7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc3RhY2subGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHZhciBmaXJzdFVzZXJMaW5lID0gc3RhY2tbMF07XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0cmFjZUxpbmVzLmxlbmd0aDsgKytpKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRyYWNlTGluZXNbaV0gPT09IGZpcnN0VXNlckxpbmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0b3JMaW5lID0gXCJcXG5cIiArIHRyYWNlTGluZXNbaSAtIDFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgbXNnID0gXCJhIHByb21pc2Ugd2FzIGNyZWF0ZWQgaW4gYSBcIiArIG5hbWUgK1xuICAgICAgICAgICAgXCJoYW5kbGVyIFwiICsgaGFuZGxlckxpbmUgKyBcImJ1dCB3YXMgbm90IHJldHVybmVkIGZyb20gaXQsIFwiICtcbiAgICAgICAgICAgIFwic2VlIGh0dHA6Ly9nb28uZ2wvclJxTVV3XCIgK1xuICAgICAgICAgICAgY3JlYXRvckxpbmU7XG4gICAgICAgIHByb21pc2UuX3dhcm4obXNnLCB0cnVlLCBwcm9taXNlQ3JlYXRlZCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkZXByZWNhdGVkKG5hbWUsIHJlcGxhY2VtZW50KSB7XG4gICAgdmFyIG1lc3NhZ2UgPSBuYW1lICtcbiAgICAgICAgXCIgaXMgZGVwcmVjYXRlZCBhbmQgd2lsbCBiZSByZW1vdmVkIGluIGEgZnV0dXJlIHZlcnNpb24uXCI7XG4gICAgaWYgKHJlcGxhY2VtZW50KSBtZXNzYWdlICs9IFwiIFVzZSBcIiArIHJlcGxhY2VtZW50ICsgXCIgaW5zdGVhZC5cIjtcbiAgICByZXR1cm4gd2FybihtZXNzYWdlKTtcbn1cblxuZnVuY3Rpb24gd2FybihtZXNzYWdlLCBzaG91bGRVc2VPd25UcmFjZSwgcHJvbWlzZSkge1xuICAgIGlmICghY29uZmlnLndhcm5pbmdzKSByZXR1cm47XG4gICAgdmFyIHdhcm5pbmcgPSBuZXcgV2FybmluZyhtZXNzYWdlKTtcbiAgICB2YXIgY3R4O1xuICAgIGlmIChzaG91bGRVc2VPd25UcmFjZSkge1xuICAgICAgICBwcm9taXNlLl9hdHRhY2hFeHRyYVRyYWNlKHdhcm5pbmcpO1xuICAgIH0gZWxzZSBpZiAoY29uZmlnLmxvbmdTdGFja1RyYWNlcyAmJiAoY3R4ID0gUHJvbWlzZS5fcGVla0NvbnRleHQoKSkpIHtcbiAgICAgICAgY3R4LmF0dGFjaEV4dHJhVHJhY2Uod2FybmluZyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHBhcnNlZCA9IHBhcnNlU3RhY2tBbmRNZXNzYWdlKHdhcm5pbmcpO1xuICAgICAgICB3YXJuaW5nLnN0YWNrID0gcGFyc2VkLm1lc3NhZ2UgKyBcIlxcblwiICsgcGFyc2VkLnN0YWNrLmpvaW4oXCJcXG5cIik7XG4gICAgfVxuXG4gICAgaWYgKCFhY3RpdmVGaXJlRXZlbnQoXCJ3YXJuaW5nXCIsIHdhcm5pbmcpKSB7XG4gICAgICAgIGZvcm1hdEFuZExvZ0Vycm9yKHdhcm5pbmcsIFwiXCIsIHRydWUpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVjb25zdHJ1Y3RTdGFjayhtZXNzYWdlLCBzdGFja3MpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0YWNrcy5sZW5ndGggLSAxOyArK2kpIHtcbiAgICAgICAgc3RhY2tzW2ldLnB1c2goXCJGcm9tIHByZXZpb3VzIGV2ZW50OlwiKTtcbiAgICAgICAgc3RhY2tzW2ldID0gc3RhY2tzW2ldLmpvaW4oXCJcXG5cIik7XG4gICAgfVxuICAgIGlmIChpIDwgc3RhY2tzLmxlbmd0aCkge1xuICAgICAgICBzdGFja3NbaV0gPSBzdGFja3NbaV0uam9pbihcIlxcblwiKTtcbiAgICB9XG4gICAgcmV0dXJuIG1lc3NhZ2UgKyBcIlxcblwiICsgc3RhY2tzLmpvaW4oXCJcXG5cIik7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUR1cGxpY2F0ZU9yRW1wdHlKdW1wcyhzdGFja3MpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0YWNrcy5sZW5ndGg7ICsraSkge1xuICAgICAgICBpZiAoc3RhY2tzW2ldLmxlbmd0aCA9PT0gMCB8fFxuICAgICAgICAgICAgKChpICsgMSA8IHN0YWNrcy5sZW5ndGgpICYmIHN0YWNrc1tpXVswXSA9PT0gc3RhY2tzW2krMV1bMF0pKSB7XG4gICAgICAgICAgICBzdGFja3Muc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgaS0tO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiByZW1vdmVDb21tb25Sb290cyhzdGFja3MpIHtcbiAgICB2YXIgY3VycmVudCA9IHN0YWNrc1swXTtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IHN0YWNrcy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgcHJldiA9IHN0YWNrc1tpXTtcbiAgICAgICAgdmFyIGN1cnJlbnRMYXN0SW5kZXggPSBjdXJyZW50Lmxlbmd0aCAtIDE7XG4gICAgICAgIHZhciBjdXJyZW50TGFzdExpbmUgPSBjdXJyZW50W2N1cnJlbnRMYXN0SW5kZXhdO1xuICAgICAgICB2YXIgY29tbW9uUm9vdE1lZXRQb2ludCA9IC0xO1xuXG4gICAgICAgIGZvciAodmFyIGogPSBwcmV2Lmxlbmd0aCAtIDE7IGogPj0gMDsgLS1qKSB7XG4gICAgICAgICAgICBpZiAocHJldltqXSA9PT0gY3VycmVudExhc3RMaW5lKSB7XG4gICAgICAgICAgICAgICAgY29tbW9uUm9vdE1lZXRQb2ludCA9IGo7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHZhciBqID0gY29tbW9uUm9vdE1lZXRQb2ludDsgaiA+PSAwOyAtLWopIHtcbiAgICAgICAgICAgIHZhciBsaW5lID0gcHJldltqXTtcbiAgICAgICAgICAgIGlmIChjdXJyZW50W2N1cnJlbnRMYXN0SW5kZXhdID09PSBsaW5lKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudC5wb3AoKTtcbiAgICAgICAgICAgICAgICBjdXJyZW50TGFzdEluZGV4LS07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGN1cnJlbnQgPSBwcmV2O1xuICAgIH1cbn1cblxuZnVuY3Rpb24gY2xlYW5TdGFjayhzdGFjaykge1xuICAgIHZhciByZXQgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0YWNrLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBsaW5lID0gc3RhY2tbaV07XG4gICAgICAgIHZhciBpc1RyYWNlTGluZSA9IFwiICAgIChObyBzdGFjayB0cmFjZSlcIiA9PT0gbGluZSB8fFxuICAgICAgICAgICAgc3RhY2tGcmFtZVBhdHRlcm4udGVzdChsaW5lKTtcbiAgICAgICAgdmFyIGlzSW50ZXJuYWxGcmFtZSA9IGlzVHJhY2VMaW5lICYmIHNob3VsZElnbm9yZShsaW5lKTtcbiAgICAgICAgaWYgKGlzVHJhY2VMaW5lICYmICFpc0ludGVybmFsRnJhbWUpIHtcbiAgICAgICAgICAgIGlmIChpbmRlbnRTdGFja0ZyYW1lcyAmJiBsaW5lLmNoYXJBdCgwKSAhPT0gXCIgXCIpIHtcbiAgICAgICAgICAgICAgICBsaW5lID0gXCIgICAgXCIgKyBsaW5lO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0LnB1c2gobGluZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbn1cblxuZnVuY3Rpb24gc3RhY2tGcmFtZXNBc0FycmF5KGVycm9yKSB7XG4gICAgdmFyIHN0YWNrID0gZXJyb3Iuc3RhY2sucmVwbGFjZSgvXFxzKyQvZywgXCJcIikuc3BsaXQoXCJcXG5cIik7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdGFjay5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgbGluZSA9IHN0YWNrW2ldO1xuICAgICAgICBpZiAoXCIgICAgKE5vIHN0YWNrIHRyYWNlKVwiID09PSBsaW5lIHx8IHN0YWNrRnJhbWVQYXR0ZXJuLnRlc3QobGluZSkpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChpID4gMCAmJiBlcnJvci5uYW1lICE9IFwiU3ludGF4RXJyb3JcIikge1xuICAgICAgICBzdGFjayA9IHN0YWNrLnNsaWNlKGkpO1xuICAgIH1cbiAgICByZXR1cm4gc3RhY2s7XG59XG5cbmZ1bmN0aW9uIHBhcnNlU3RhY2tBbmRNZXNzYWdlKGVycm9yKSB7XG4gICAgdmFyIHN0YWNrID0gZXJyb3Iuc3RhY2s7XG4gICAgdmFyIG1lc3NhZ2UgPSBlcnJvci50b1N0cmluZygpO1xuICAgIHN0YWNrID0gdHlwZW9mIHN0YWNrID09PSBcInN0cmluZ1wiICYmIHN0YWNrLmxlbmd0aCA+IDBcbiAgICAgICAgICAgICAgICA/IHN0YWNrRnJhbWVzQXNBcnJheShlcnJvcikgOiBbXCIgICAgKE5vIHN0YWNrIHRyYWNlKVwiXTtcbiAgICByZXR1cm4ge1xuICAgICAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgICAgICBzdGFjazogZXJyb3IubmFtZSA9PSBcIlN5bnRheEVycm9yXCIgPyBzdGFjayA6IGNsZWFuU3RhY2soc3RhY2spXG4gICAgfTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0QW5kTG9nRXJyb3IoZXJyb3IsIHRpdGxlLCBpc1NvZnQpIHtcbiAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgdmFyIG1lc3NhZ2U7XG4gICAgICAgIGlmICh1dGlsLmlzT2JqZWN0KGVycm9yKSkge1xuICAgICAgICAgICAgdmFyIHN0YWNrID0gZXJyb3Iuc3RhY2s7XG4gICAgICAgICAgICBtZXNzYWdlID0gdGl0bGUgKyBmb3JtYXRTdGFjayhzdGFjaywgZXJyb3IpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbWVzc2FnZSA9IHRpdGxlICsgU3RyaW5nKGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIHByaW50V2FybmluZyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBwcmludFdhcm5pbmcobWVzc2FnZSwgaXNTb2Z0KTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgY29uc29sZS5sb2cgPT09IFwiZnVuY3Rpb25cIiB8fFxuICAgICAgICAgICAgdHlwZW9mIGNvbnNvbGUubG9nID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZmlyZVJlamVjdGlvbkV2ZW50KG5hbWUsIGxvY2FsSGFuZGxlciwgcmVhc29uLCBwcm9taXNlKSB7XG4gICAgdmFyIGxvY2FsRXZlbnRGaXJlZCA9IGZhbHNlO1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgbG9jYWxIYW5kbGVyID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIGxvY2FsRXZlbnRGaXJlZCA9IHRydWU7XG4gICAgICAgICAgICBpZiAobmFtZSA9PT0gXCJyZWplY3Rpb25IYW5kbGVkXCIpIHtcbiAgICAgICAgICAgICAgICBsb2NhbEhhbmRsZXIocHJvbWlzZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxvY2FsSGFuZGxlcihyZWFzb24sIHByb21pc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBhc3luYy50aHJvd0xhdGVyKGUpO1xuICAgIH1cblxuICAgIGlmIChuYW1lID09PSBcInVuaGFuZGxlZFJlamVjdGlvblwiKSB7XG4gICAgICAgIGlmICghYWN0aXZlRmlyZUV2ZW50KG5hbWUsIHJlYXNvbiwgcHJvbWlzZSkgJiYgIWxvY2FsRXZlbnRGaXJlZCkge1xuICAgICAgICAgICAgZm9ybWF0QW5kTG9nRXJyb3IocmVhc29uLCBcIlVuaGFuZGxlZCByZWplY3Rpb24gXCIpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgYWN0aXZlRmlyZUV2ZW50KG5hbWUsIHByb21pc2UpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZm9ybWF0Tm9uRXJyb3Iob2JqKSB7XG4gICAgdmFyIHN0cjtcbiAgICBpZiAodHlwZW9mIG9iaiA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHN0ciA9IFwiW2Z1bmN0aW9uIFwiICtcbiAgICAgICAgICAgIChvYmoubmFtZSB8fCBcImFub255bW91c1wiKSArXG4gICAgICAgICAgICBcIl1cIjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBzdHIgPSBvYmogJiYgdHlwZW9mIG9iai50b1N0cmluZyA9PT0gXCJmdW5jdGlvblwiXG4gICAgICAgICAgICA/IG9iai50b1N0cmluZygpIDogdXRpbC50b1N0cmluZyhvYmopO1xuICAgICAgICB2YXIgcnVzZWxlc3NUb1N0cmluZyA9IC9cXFtvYmplY3QgW2EtekEtWjAtOSRfXStcXF0vO1xuICAgICAgICBpZiAocnVzZWxlc3NUb1N0cmluZy50ZXN0KHN0cikpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdmFyIG5ld1N0ciA9IEpTT04uc3RyaW5naWZ5KG9iaik7XG4gICAgICAgICAgICAgICAgc3RyID0gbmV3U3RyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2goZSkge1xuXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0ci5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHN0ciA9IFwiKGVtcHR5IGFycmF5KVwiO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiAoXCIoPFwiICsgc25pcChzdHIpICsgXCI+LCBubyBzdGFjayB0cmFjZSlcIik7XG59XG5cbmZ1bmN0aW9uIHNuaXAoc3RyKSB7XG4gICAgdmFyIG1heENoYXJzID0gNDE7XG4gICAgaWYgKHN0ci5sZW5ndGggPCBtYXhDaGFycykge1xuICAgICAgICByZXR1cm4gc3RyO1xuICAgIH1cbiAgICByZXR1cm4gc3RyLnN1YnN0cigwLCBtYXhDaGFycyAtIDMpICsgXCIuLi5cIjtcbn1cblxuZnVuY3Rpb24gbG9uZ1N0YWNrVHJhY2VzSXNTdXBwb3J0ZWQoKSB7XG4gICAgcmV0dXJuIHR5cGVvZiBjYXB0dXJlU3RhY2tUcmFjZSA9PT0gXCJmdW5jdGlvblwiO1xufVxuXG52YXIgc2hvdWxkSWdub3JlID0gZnVuY3Rpb24oKSB7IHJldHVybiBmYWxzZTsgfTtcbnZhciBwYXJzZUxpbmVJbmZvUmVnZXggPSAvW1xcLzxcXChdKFteOlxcL10rKTooXFxkKyk6KD86XFxkKylcXCk/XFxzKiQvO1xuZnVuY3Rpb24gcGFyc2VMaW5lSW5mbyhsaW5lKSB7XG4gICAgdmFyIG1hdGNoZXMgPSBsaW5lLm1hdGNoKHBhcnNlTGluZUluZm9SZWdleCk7XG4gICAgaWYgKG1hdGNoZXMpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGZpbGVOYW1lOiBtYXRjaGVzWzFdLFxuICAgICAgICAgICAgbGluZTogcGFyc2VJbnQobWF0Y2hlc1syXSwgMTApXG4gICAgICAgIH07XG4gICAgfVxufVxuXG5mdW5jdGlvbiBzZXRCb3VuZHMoZmlyc3RMaW5lRXJyb3IsIGxhc3RMaW5lRXJyb3IpIHtcbiAgICBpZiAoIWxvbmdTdGFja1RyYWNlc0lzU3VwcG9ydGVkKCkpIHJldHVybjtcbiAgICB2YXIgZmlyc3RTdGFja0xpbmVzID0gZmlyc3RMaW5lRXJyb3Iuc3RhY2suc3BsaXQoXCJcXG5cIik7XG4gICAgdmFyIGxhc3RTdGFja0xpbmVzID0gbGFzdExpbmVFcnJvci5zdGFjay5zcGxpdChcIlxcblwiKTtcbiAgICB2YXIgZmlyc3RJbmRleCA9IC0xO1xuICAgIHZhciBsYXN0SW5kZXggPSAtMTtcbiAgICB2YXIgZmlyc3RGaWxlTmFtZTtcbiAgICB2YXIgbGFzdEZpbGVOYW1lO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZmlyc3RTdGFja0xpbmVzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBwYXJzZUxpbmVJbmZvKGZpcnN0U3RhY2tMaW5lc1tpXSk7XG4gICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgIGZpcnN0RmlsZU5hbWUgPSByZXN1bHQuZmlsZU5hbWU7XG4gICAgICAgICAgICBmaXJzdEluZGV4ID0gcmVzdWx0LmxpbmU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxhc3RTdGFja0xpbmVzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBwYXJzZUxpbmVJbmZvKGxhc3RTdGFja0xpbmVzW2ldKTtcbiAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgbGFzdEZpbGVOYW1lID0gcmVzdWx0LmZpbGVOYW1lO1xuICAgICAgICAgICAgbGFzdEluZGV4ID0gcmVzdWx0LmxpbmU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoZmlyc3RJbmRleCA8IDAgfHwgbGFzdEluZGV4IDwgMCB8fCAhZmlyc3RGaWxlTmFtZSB8fCAhbGFzdEZpbGVOYW1lIHx8XG4gICAgICAgIGZpcnN0RmlsZU5hbWUgIT09IGxhc3RGaWxlTmFtZSB8fCBmaXJzdEluZGV4ID49IGxhc3RJbmRleCkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc2hvdWxkSWdub3JlID0gZnVuY3Rpb24obGluZSkge1xuICAgICAgICBpZiAoYmx1ZWJpcmRGcmFtZVBhdHRlcm4udGVzdChsaW5lKSkgcmV0dXJuIHRydWU7XG4gICAgICAgIHZhciBpbmZvID0gcGFyc2VMaW5lSW5mbyhsaW5lKTtcbiAgICAgICAgaWYgKGluZm8pIHtcbiAgICAgICAgICAgIGlmIChpbmZvLmZpbGVOYW1lID09PSBmaXJzdEZpbGVOYW1lICYmXG4gICAgICAgICAgICAgICAgKGZpcnN0SW5kZXggPD0gaW5mby5saW5lICYmIGluZm8ubGluZSA8PSBsYXN0SW5kZXgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIENhcHR1cmVkVHJhY2UocGFyZW50KSB7XG4gICAgdGhpcy5fcGFyZW50ID0gcGFyZW50O1xuICAgIHRoaXMuX3Byb21pc2VzQ3JlYXRlZCA9IDA7XG4gICAgdmFyIGxlbmd0aCA9IHRoaXMuX2xlbmd0aCA9IDEgKyAocGFyZW50ID09PSB1bmRlZmluZWQgPyAwIDogcGFyZW50Ll9sZW5ndGgpO1xuICAgIGNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIENhcHR1cmVkVHJhY2UpO1xuICAgIGlmIChsZW5ndGggPiAzMikgdGhpcy51bmN5Y2xlKCk7XG59XG51dGlsLmluaGVyaXRzKENhcHR1cmVkVHJhY2UsIEVycm9yKTtcbkNvbnRleHQuQ2FwdHVyZWRUcmFjZSA9IENhcHR1cmVkVHJhY2U7XG5cbkNhcHR1cmVkVHJhY2UucHJvdG90eXBlLnVuY3ljbGUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbGVuZ3RoID0gdGhpcy5fbGVuZ3RoO1xuICAgIGlmIChsZW5ndGggPCAyKSByZXR1cm47XG4gICAgdmFyIG5vZGVzID0gW107XG4gICAgdmFyIHN0YWNrVG9JbmRleCA9IHt9O1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIG5vZGUgPSB0aGlzOyBub2RlICE9PSB1bmRlZmluZWQ7ICsraSkge1xuICAgICAgICBub2Rlcy5wdXNoKG5vZGUpO1xuICAgICAgICBub2RlID0gbm9kZS5fcGFyZW50O1xuICAgIH1cbiAgICBsZW5ndGggPSB0aGlzLl9sZW5ndGggPSBpO1xuICAgIGZvciAodmFyIGkgPSBsZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgICB2YXIgc3RhY2sgPSBub2Rlc1tpXS5zdGFjaztcbiAgICAgICAgaWYgKHN0YWNrVG9JbmRleFtzdGFja10gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc3RhY2tUb0luZGV4W3N0YWNrXSA9IGk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgY3VycmVudFN0YWNrID0gbm9kZXNbaV0uc3RhY2s7XG4gICAgICAgIHZhciBpbmRleCA9IHN0YWNrVG9JbmRleFtjdXJyZW50U3RhY2tdO1xuICAgICAgICBpZiAoaW5kZXggIT09IHVuZGVmaW5lZCAmJiBpbmRleCAhPT0gaSkge1xuICAgICAgICAgICAgaWYgKGluZGV4ID4gMCkge1xuICAgICAgICAgICAgICAgIG5vZGVzW2luZGV4IC0gMV0uX3BhcmVudCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBub2Rlc1tpbmRleCAtIDFdLl9sZW5ndGggPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbm9kZXNbaV0uX3BhcmVudCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIG5vZGVzW2ldLl9sZW5ndGggPSAxO1xuICAgICAgICAgICAgdmFyIGN5Y2xlRWRnZU5vZGUgPSBpID4gMCA/IG5vZGVzW2kgLSAxXSA6IHRoaXM7XG5cbiAgICAgICAgICAgIGlmIChpbmRleCA8IGxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICBjeWNsZUVkZ2VOb2RlLl9wYXJlbnQgPSBub2Rlc1tpbmRleCArIDFdO1xuICAgICAgICAgICAgICAgIGN5Y2xlRWRnZU5vZGUuX3BhcmVudC51bmN5Y2xlKCk7XG4gICAgICAgICAgICAgICAgY3ljbGVFZGdlTm9kZS5fbGVuZ3RoID1cbiAgICAgICAgICAgICAgICAgICAgY3ljbGVFZGdlTm9kZS5fcGFyZW50Ll9sZW5ndGggKyAxO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjeWNsZUVkZ2VOb2RlLl9wYXJlbnQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgY3ljbGVFZGdlTm9kZS5fbGVuZ3RoID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBjdXJyZW50Q2hpbGRMZW5ndGggPSBjeWNsZUVkZ2VOb2RlLl9sZW5ndGggKyAxO1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IGkgLSAyOyBqID49IDA7IC0taikge1xuICAgICAgICAgICAgICAgIG5vZGVzW2pdLl9sZW5ndGggPSBjdXJyZW50Q2hpbGRMZW5ndGg7XG4gICAgICAgICAgICAgICAgY3VycmVudENoaWxkTGVuZ3RoKys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5DYXB0dXJlZFRyYWNlLnByb3RvdHlwZS5hdHRhY2hFeHRyYVRyYWNlID0gZnVuY3Rpb24oZXJyb3IpIHtcbiAgICBpZiAoZXJyb3IuX19zdGFja0NsZWFuZWRfXykgcmV0dXJuO1xuICAgIHRoaXMudW5jeWNsZSgpO1xuICAgIHZhciBwYXJzZWQgPSBwYXJzZVN0YWNrQW5kTWVzc2FnZShlcnJvcik7XG4gICAgdmFyIG1lc3NhZ2UgPSBwYXJzZWQubWVzc2FnZTtcbiAgICB2YXIgc3RhY2tzID0gW3BhcnNlZC5zdGFja107XG5cbiAgICB2YXIgdHJhY2UgPSB0aGlzO1xuICAgIHdoaWxlICh0cmFjZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHN0YWNrcy5wdXNoKGNsZWFuU3RhY2sodHJhY2Uuc3RhY2suc3BsaXQoXCJcXG5cIikpKTtcbiAgICAgICAgdHJhY2UgPSB0cmFjZS5fcGFyZW50O1xuICAgIH1cbiAgICByZW1vdmVDb21tb25Sb290cyhzdGFja3MpO1xuICAgIHJlbW92ZUR1cGxpY2F0ZU9yRW1wdHlKdW1wcyhzdGFja3MpO1xuICAgIHV0aWwubm90RW51bWVyYWJsZVByb3AoZXJyb3IsIFwic3RhY2tcIiwgcmVjb25zdHJ1Y3RTdGFjayhtZXNzYWdlLCBzdGFja3MpKTtcbiAgICB1dGlsLm5vdEVudW1lcmFibGVQcm9wKGVycm9yLCBcIl9fc3RhY2tDbGVhbmVkX19cIiwgdHJ1ZSk7XG59O1xuXG52YXIgY2FwdHVyZVN0YWNrVHJhY2UgPSAoZnVuY3Rpb24gc3RhY2tEZXRlY3Rpb24oKSB7XG4gICAgdmFyIHY4c3RhY2tGcmFtZVBhdHRlcm4gPSAvXlxccyphdFxccyovO1xuICAgIHZhciB2OHN0YWNrRm9ybWF0dGVyID0gZnVuY3Rpb24oc3RhY2ssIGVycm9yKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc3RhY2sgPT09IFwic3RyaW5nXCIpIHJldHVybiBzdGFjaztcblxuICAgICAgICBpZiAoZXJyb3IubmFtZSAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICBlcnJvci5tZXNzYWdlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBlcnJvci50b1N0cmluZygpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmb3JtYXROb25FcnJvcihlcnJvcik7XG4gICAgfTtcblxuICAgIGlmICh0eXBlb2YgRXJyb3Iuc3RhY2tUcmFjZUxpbWl0ID09PSBcIm51bWJlclwiICYmXG4gICAgICAgIHR5cGVvZiBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIEVycm9yLnN0YWNrVHJhY2VMaW1pdCArPSA2O1xuICAgICAgICBzdGFja0ZyYW1lUGF0dGVybiA9IHY4c3RhY2tGcmFtZVBhdHRlcm47XG4gICAgICAgIGZvcm1hdFN0YWNrID0gdjhzdGFja0Zvcm1hdHRlcjtcbiAgICAgICAgdmFyIGNhcHR1cmVTdGFja1RyYWNlID0gRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2U7XG5cbiAgICAgICAgc2hvdWxkSWdub3JlID0gZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuIGJsdWViaXJkRnJhbWVQYXR0ZXJuLnRlc3QobGluZSk7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihyZWNlaXZlciwgaWdub3JlVW50aWwpIHtcbiAgICAgICAgICAgIEVycm9yLnN0YWNrVHJhY2VMaW1pdCArPSA2O1xuICAgICAgICAgICAgY2FwdHVyZVN0YWNrVHJhY2UocmVjZWl2ZXIsIGlnbm9yZVVudGlsKTtcbiAgICAgICAgICAgIEVycm9yLnN0YWNrVHJhY2VMaW1pdCAtPSA2O1xuICAgICAgICB9O1xuICAgIH1cbiAgICB2YXIgZXJyID0gbmV3IEVycm9yKCk7XG5cbiAgICBpZiAodHlwZW9mIGVyci5zdGFjayA9PT0gXCJzdHJpbmdcIiAmJlxuICAgICAgICBlcnIuc3RhY2suc3BsaXQoXCJcXG5cIilbMF0uaW5kZXhPZihcInN0YWNrRGV0ZWN0aW9uQFwiKSA+PSAwKSB7XG4gICAgICAgIHN0YWNrRnJhbWVQYXR0ZXJuID0gL0AvO1xuICAgICAgICBmb3JtYXRTdGFjayA9IHY4c3RhY2tGb3JtYXR0ZXI7XG4gICAgICAgIGluZGVudFN0YWNrRnJhbWVzID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIGNhcHR1cmVTdGFja1RyYWNlKG8pIHtcbiAgICAgICAgICAgIG8uc3RhY2sgPSBuZXcgRXJyb3IoKS5zdGFjaztcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICB2YXIgaGFzU3RhY2tBZnRlclRocm93O1xuICAgIHRyeSB7IHRocm93IG5ldyBFcnJvcigpOyB9XG4gICAgY2F0Y2goZSkge1xuICAgICAgICBoYXNTdGFja0FmdGVyVGhyb3cgPSAoXCJzdGFja1wiIGluIGUpO1xuICAgIH1cbiAgICBpZiAoIShcInN0YWNrXCIgaW4gZXJyKSAmJiBoYXNTdGFja0FmdGVyVGhyb3cgJiZcbiAgICAgICAgdHlwZW9mIEVycm9yLnN0YWNrVHJhY2VMaW1pdCA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICBzdGFja0ZyYW1lUGF0dGVybiA9IHY4c3RhY2tGcmFtZVBhdHRlcm47XG4gICAgICAgIGZvcm1hdFN0YWNrID0gdjhzdGFja0Zvcm1hdHRlcjtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIGNhcHR1cmVTdGFja1RyYWNlKG8pIHtcbiAgICAgICAgICAgIEVycm9yLnN0YWNrVHJhY2VMaW1pdCArPSA2O1xuICAgICAgICAgICAgdHJ5IHsgdGhyb3cgbmV3IEVycm9yKCk7IH1cbiAgICAgICAgICAgIGNhdGNoKGUpIHsgby5zdGFjayA9IGUuc3RhY2s7IH1cbiAgICAgICAgICAgIEVycm9yLnN0YWNrVHJhY2VMaW1pdCAtPSA2O1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZvcm1hdFN0YWNrID0gZnVuY3Rpb24oc3RhY2ssIGVycm9yKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc3RhY2sgPT09IFwic3RyaW5nXCIpIHJldHVybiBzdGFjaztcblxuICAgICAgICBpZiAoKHR5cGVvZiBlcnJvciA9PT0gXCJvYmplY3RcIiB8fFxuICAgICAgICAgICAgdHlwZW9mIGVycm9yID09PSBcImZ1bmN0aW9uXCIpICYmXG4gICAgICAgICAgICBlcnJvci5uYW1lICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICAgIGVycm9yLm1lc3NhZ2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIGVycm9yLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZvcm1hdE5vbkVycm9yKGVycm9yKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIG51bGw7XG5cbn0pKFtdKTtcblxuaWYgKHR5cGVvZiBjb25zb2xlICE9PSBcInVuZGVmaW5lZFwiICYmIHR5cGVvZiBjb25zb2xlLndhcm4gIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICBwcmludFdhcm5pbmcgPSBmdW5jdGlvbiAobWVzc2FnZSkge1xuICAgICAgICBjb25zb2xlLndhcm4obWVzc2FnZSk7XG4gICAgfTtcbiAgICBpZiAodXRpbC5pc05vZGUgJiYgcHJvY2Vzcy5zdGRlcnIuaXNUVFkpIHtcbiAgICAgICAgcHJpbnRXYXJuaW5nID0gZnVuY3Rpb24obWVzc2FnZSwgaXNTb2Z0KSB7XG4gICAgICAgICAgICB2YXIgY29sb3IgPSBpc1NvZnQgPyBcIlxcdTAwMWJbMzNtXCIgOiBcIlxcdTAwMWJbMzFtXCI7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oY29sb3IgKyBtZXNzYWdlICsgXCJcXHUwMDFiWzBtXFxuXCIpO1xuICAgICAgICB9O1xuICAgIH0gZWxzZSBpZiAoIXV0aWwuaXNOb2RlICYmIHR5cGVvZiAobmV3IEVycm9yKCkuc3RhY2spID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIHByaW50V2FybmluZyA9IGZ1bmN0aW9uKG1lc3NhZ2UsIGlzU29mdCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKFwiJWNcIiArIG1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBpc1NvZnQgPyBcImNvbG9yOiBkYXJrb3JhbmdlXCIgOiBcImNvbG9yOiByZWRcIik7XG4gICAgICAgIH07XG4gICAgfVxufVxuXG52YXIgY29uZmlnID0ge1xuICAgIHdhcm5pbmdzOiB3YXJuaW5ncyxcbiAgICBsb25nU3RhY2tUcmFjZXM6IGZhbHNlLFxuICAgIGNhbmNlbGxhdGlvbjogZmFsc2UsXG4gICAgbW9uaXRvcmluZzogZmFsc2Vcbn07XG5cbmlmIChsb25nU3RhY2tUcmFjZXMpIFByb21pc2UubG9uZ1N0YWNrVHJhY2VzKCk7XG5cbnJldHVybiB7XG4gICAgbG9uZ1N0YWNrVHJhY2VzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGNvbmZpZy5sb25nU3RhY2tUcmFjZXM7XG4gICAgfSxcbiAgICB3YXJuaW5nczogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBjb25maWcud2FybmluZ3M7XG4gICAgfSxcbiAgICBjYW5jZWxsYXRpb246IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gY29uZmlnLmNhbmNlbGxhdGlvbjtcbiAgICB9LFxuICAgIG1vbml0b3Jpbmc6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gY29uZmlnLm1vbml0b3Jpbmc7XG4gICAgfSxcbiAgICBwcm9wYWdhdGVGcm9tRnVuY3Rpb246IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gcHJvcGFnYXRlRnJvbUZ1bmN0aW9uO1xuICAgIH0sXG4gICAgYm91bmRWYWx1ZUZ1bmN0aW9uOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGJvdW5kVmFsdWVGdW5jdGlvbjtcbiAgICB9LFxuICAgIGNoZWNrRm9yZ290dGVuUmV0dXJuczogY2hlY2tGb3Jnb3R0ZW5SZXR1cm5zLFxuICAgIHNldEJvdW5kczogc2V0Qm91bmRzLFxuICAgIHdhcm46IHdhcm4sXG4gICAgZGVwcmVjYXRlZDogZGVwcmVjYXRlZCxcbiAgICBDYXB0dXJlZFRyYWNlOiBDYXB0dXJlZFRyYWNlLFxuICAgIGZpcmVEb21FdmVudDogZmlyZURvbUV2ZW50LFxuICAgIGZpcmVHbG9iYWxFdmVudDogZmlyZUdsb2JhbEV2ZW50XG59O1xufTtcblxufSx7XCIuL2Vycm9yc1wiOjEyLFwiLi91dGlsXCI6MzZ9XSwxMDpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oUHJvbWlzZSkge1xuZnVuY3Rpb24gcmV0dXJuZXIoKSB7XG4gICAgcmV0dXJuIHRoaXMudmFsdWU7XG59XG5mdW5jdGlvbiB0aHJvd2VyKCkge1xuICAgIHRocm93IHRoaXMucmVhc29uO1xufVxuXG5Qcm9taXNlLnByb3RvdHlwZVtcInJldHVyblwiXSA9XG5Qcm9taXNlLnByb3RvdHlwZS50aGVuUmV0dXJuID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgUHJvbWlzZSkgdmFsdWUuc3VwcHJlc3NVbmhhbmRsZWRSZWplY3Rpb25zKCk7XG4gICAgcmV0dXJuIHRoaXMuX3RoZW4oXG4gICAgICAgIHJldHVybmVyLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwge3ZhbHVlOiB2YWx1ZX0sIHVuZGVmaW5lZCk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZVtcInRocm93XCJdID1cblByb21pc2UucHJvdG90eXBlLnRoZW5UaHJvdyA9IGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICByZXR1cm4gdGhpcy5fdGhlbihcbiAgICAgICAgdGhyb3dlciwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHtyZWFzb246IHJlYXNvbn0sIHVuZGVmaW5lZCk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5jYXRjaFRocm93ID0gZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RoZW4oXG4gICAgICAgICAgICB1bmRlZmluZWQsIHRocm93ZXIsIHVuZGVmaW5lZCwge3JlYXNvbjogcmVhc29ufSwgdW5kZWZpbmVkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgX3JlYXNvbiA9IGFyZ3VtZW50c1sxXTtcbiAgICAgICAgdmFyIGhhbmRsZXIgPSBmdW5jdGlvbigpIHt0aHJvdyBfcmVhc29uO307XG4gICAgICAgIHJldHVybiB0aGlzLmNhdWdodChyZWFzb24sIGhhbmRsZXIpO1xuICAgIH1cbn07XG5cblByb21pc2UucHJvdG90eXBlLmNhdGNoUmV0dXJuID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPD0gMSkge1xuICAgICAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBQcm9taXNlKSB2YWx1ZS5zdXBwcmVzc1VuaGFuZGxlZFJlamVjdGlvbnMoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RoZW4oXG4gICAgICAgICAgICB1bmRlZmluZWQsIHJldHVybmVyLCB1bmRlZmluZWQsIHt2YWx1ZTogdmFsdWV9LCB1bmRlZmluZWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBfdmFsdWUgPSBhcmd1bWVudHNbMV07XG4gICAgICAgIGlmIChfdmFsdWUgaW5zdGFuY2VvZiBQcm9taXNlKSBfdmFsdWUuc3VwcHJlc3NVbmhhbmRsZWRSZWplY3Rpb25zKCk7XG4gICAgICAgIHZhciBoYW5kbGVyID0gZnVuY3Rpb24oKSB7cmV0dXJuIF92YWx1ZTt9O1xuICAgICAgICByZXR1cm4gdGhpcy5jYXVnaHQodmFsdWUsIGhhbmRsZXIpO1xuICAgIH1cbn07XG59O1xuXG59LHt9XSwxMTpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oUHJvbWlzZSwgSU5URVJOQUwpIHtcbnZhciBQcm9taXNlUmVkdWNlID0gUHJvbWlzZS5yZWR1Y2U7XG52YXIgUHJvbWlzZUFsbCA9IFByb21pc2UuYWxsO1xuXG5mdW5jdGlvbiBwcm9taXNlQWxsVGhpcygpIHtcbiAgICByZXR1cm4gUHJvbWlzZUFsbCh0aGlzKTtcbn1cblxuZnVuY3Rpb24gUHJvbWlzZU1hcFNlcmllcyhwcm9taXNlcywgZm4pIHtcbiAgICByZXR1cm4gUHJvbWlzZVJlZHVjZShwcm9taXNlcywgZm4sIElOVEVSTkFMLCBJTlRFUk5BTCk7XG59XG5cblByb21pc2UucHJvdG90eXBlLmVhY2ggPSBmdW5jdGlvbiAoZm4pIHtcbiAgICByZXR1cm4gUHJvbWlzZVJlZHVjZSh0aGlzLCBmbiwgSU5URVJOQUwsIDApXG4gICAgICAgICAgICAgIC5fdGhlbihwcm9taXNlQWxsVGhpcywgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHRoaXMsIHVuZGVmaW5lZCk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5tYXBTZXJpZXMgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICByZXR1cm4gUHJvbWlzZVJlZHVjZSh0aGlzLCBmbiwgSU5URVJOQUwsIElOVEVSTkFMKTtcbn07XG5cblByb21pc2UuZWFjaCA9IGZ1bmN0aW9uIChwcm9taXNlcywgZm4pIHtcbiAgICByZXR1cm4gUHJvbWlzZVJlZHVjZShwcm9taXNlcywgZm4sIElOVEVSTkFMLCAwKVxuICAgICAgICAgICAgICAuX3RoZW4ocHJvbWlzZUFsbFRoaXMsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBwcm9taXNlcywgdW5kZWZpbmVkKTtcbn07XG5cblByb21pc2UubWFwU2VyaWVzID0gUHJvbWlzZU1hcFNlcmllcztcbn07XG5cblxufSx7fV0sMTI6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgZXM1ID0gX2RlcmVxXyhcIi4vZXM1XCIpO1xudmFyIE9iamVjdGZyZWV6ZSA9IGVzNS5mcmVlemU7XG52YXIgdXRpbCA9IF9kZXJlcV8oXCIuL3V0aWxcIik7XG52YXIgaW5oZXJpdHMgPSB1dGlsLmluaGVyaXRzO1xudmFyIG5vdEVudW1lcmFibGVQcm9wID0gdXRpbC5ub3RFbnVtZXJhYmxlUHJvcDtcblxuZnVuY3Rpb24gc3ViRXJyb3IobmFtZVByb3BlcnR5LCBkZWZhdWx0TWVzc2FnZSkge1xuICAgIGZ1bmN0aW9uIFN1YkVycm9yKG1lc3NhZ2UpIHtcbiAgICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFN1YkVycm9yKSkgcmV0dXJuIG5ldyBTdWJFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgbm90RW51bWVyYWJsZVByb3AodGhpcywgXCJtZXNzYWdlXCIsXG4gICAgICAgICAgICB0eXBlb2YgbWVzc2FnZSA9PT0gXCJzdHJpbmdcIiA/IG1lc3NhZ2UgOiBkZWZhdWx0TWVzc2FnZSk7XG4gICAgICAgIG5vdEVudW1lcmFibGVQcm9wKHRoaXMsIFwibmFtZVwiLCBuYW1lUHJvcGVydHkpO1xuICAgICAgICBpZiAoRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UpIHtcbiAgICAgICAgICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIHRoaXMuY29uc3RydWN0b3IpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgRXJyb3IuY2FsbCh0aGlzKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpbmhlcml0cyhTdWJFcnJvciwgRXJyb3IpO1xuICAgIHJldHVybiBTdWJFcnJvcjtcbn1cblxudmFyIF9UeXBlRXJyb3IsIF9SYW5nZUVycm9yO1xudmFyIFdhcm5pbmcgPSBzdWJFcnJvcihcIldhcm5pbmdcIiwgXCJ3YXJuaW5nXCIpO1xudmFyIENhbmNlbGxhdGlvbkVycm9yID0gc3ViRXJyb3IoXCJDYW5jZWxsYXRpb25FcnJvclwiLCBcImNhbmNlbGxhdGlvbiBlcnJvclwiKTtcbnZhciBUaW1lb3V0RXJyb3IgPSBzdWJFcnJvcihcIlRpbWVvdXRFcnJvclwiLCBcInRpbWVvdXQgZXJyb3JcIik7XG52YXIgQWdncmVnYXRlRXJyb3IgPSBzdWJFcnJvcihcIkFnZ3JlZ2F0ZUVycm9yXCIsIFwiYWdncmVnYXRlIGVycm9yXCIpO1xudHJ5IHtcbiAgICBfVHlwZUVycm9yID0gVHlwZUVycm9yO1xuICAgIF9SYW5nZUVycm9yID0gUmFuZ2VFcnJvcjtcbn0gY2F0Y2goZSkge1xuICAgIF9UeXBlRXJyb3IgPSBzdWJFcnJvcihcIlR5cGVFcnJvclwiLCBcInR5cGUgZXJyb3JcIik7XG4gICAgX1JhbmdlRXJyb3IgPSBzdWJFcnJvcihcIlJhbmdlRXJyb3JcIiwgXCJyYW5nZSBlcnJvclwiKTtcbn1cblxudmFyIG1ldGhvZHMgPSAoXCJqb2luIHBvcCBwdXNoIHNoaWZ0IHVuc2hpZnQgc2xpY2UgZmlsdGVyIGZvckVhY2ggc29tZSBcIiArXG4gICAgXCJldmVyeSBtYXAgaW5kZXhPZiBsYXN0SW5kZXhPZiByZWR1Y2UgcmVkdWNlUmlnaHQgc29ydCByZXZlcnNlXCIpLnNwbGl0KFwiIFwiKTtcblxuZm9yICh2YXIgaSA9IDA7IGkgPCBtZXRob2RzLmxlbmd0aDsgKytpKSB7XG4gICAgaWYgKHR5cGVvZiBBcnJheS5wcm90b3R5cGVbbWV0aG9kc1tpXV0gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBBZ2dyZWdhdGVFcnJvci5wcm90b3R5cGVbbWV0aG9kc1tpXV0gPSBBcnJheS5wcm90b3R5cGVbbWV0aG9kc1tpXV07XG4gICAgfVxufVxuXG5lczUuZGVmaW5lUHJvcGVydHkoQWdncmVnYXRlRXJyb3IucHJvdG90eXBlLCBcImxlbmd0aFwiLCB7XG4gICAgdmFsdWU6IDAsXG4gICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICBlbnVtZXJhYmxlOiB0cnVlXG59KTtcbkFnZ3JlZ2F0ZUVycm9yLnByb3RvdHlwZVtcImlzT3BlcmF0aW9uYWxcIl0gPSB0cnVlO1xudmFyIGxldmVsID0gMDtcbkFnZ3JlZ2F0ZUVycm9yLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpbmRlbnQgPSBBcnJheShsZXZlbCAqIDQgKyAxKS5qb2luKFwiIFwiKTtcbiAgICB2YXIgcmV0ID0gXCJcXG5cIiArIGluZGVudCArIFwiQWdncmVnYXRlRXJyb3Igb2Y6XCIgKyBcIlxcblwiO1xuICAgIGxldmVsKys7XG4gICAgaW5kZW50ID0gQXJyYXkobGV2ZWwgKiA0ICsgMSkuam9pbihcIiBcIik7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBzdHIgPSB0aGlzW2ldID09PSB0aGlzID8gXCJbQ2lyY3VsYXIgQWdncmVnYXRlRXJyb3JdXCIgOiB0aGlzW2ldICsgXCJcIjtcbiAgICAgICAgdmFyIGxpbmVzID0gc3RyLnNwbGl0KFwiXFxuXCIpO1xuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGxpbmVzLmxlbmd0aDsgKytqKSB7XG4gICAgICAgICAgICBsaW5lc1tqXSA9IGluZGVudCArIGxpbmVzW2pdO1xuICAgICAgICB9XG4gICAgICAgIHN0ciA9IGxpbmVzLmpvaW4oXCJcXG5cIik7XG4gICAgICAgIHJldCArPSBzdHIgKyBcIlxcblwiO1xuICAgIH1cbiAgICBsZXZlbC0tO1xuICAgIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBPcGVyYXRpb25hbEVycm9yKG1lc3NhZ2UpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgT3BlcmF0aW9uYWxFcnJvcikpXG4gICAgICAgIHJldHVybiBuZXcgT3BlcmF0aW9uYWxFcnJvcihtZXNzYWdlKTtcbiAgICBub3RFbnVtZXJhYmxlUHJvcCh0aGlzLCBcIm5hbWVcIiwgXCJPcGVyYXRpb25hbEVycm9yXCIpO1xuICAgIG5vdEVudW1lcmFibGVQcm9wKHRoaXMsIFwibWVzc2FnZVwiLCBtZXNzYWdlKTtcbiAgICB0aGlzLmNhdXNlID0gbWVzc2FnZTtcbiAgICB0aGlzW1wiaXNPcGVyYXRpb25hbFwiXSA9IHRydWU7XG5cbiAgICBpZiAobWVzc2FnZSBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIG5vdEVudW1lcmFibGVQcm9wKHRoaXMsIFwibWVzc2FnZVwiLCBtZXNzYWdlLm1lc3NhZ2UpO1xuICAgICAgICBub3RFbnVtZXJhYmxlUHJvcCh0aGlzLCBcInN0YWNrXCIsIG1lc3NhZ2Uuc3RhY2spO1xuICAgIH0gZWxzZSBpZiAoRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UpIHtcbiAgICAgICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgdGhpcy5jb25zdHJ1Y3Rvcik7XG4gICAgfVxuXG59XG5pbmhlcml0cyhPcGVyYXRpb25hbEVycm9yLCBFcnJvcik7XG5cbnZhciBlcnJvclR5cGVzID0gRXJyb3JbXCJfX0JsdWViaXJkRXJyb3JUeXBlc19fXCJdO1xuaWYgKCFlcnJvclR5cGVzKSB7XG4gICAgZXJyb3JUeXBlcyA9IE9iamVjdGZyZWV6ZSh7XG4gICAgICAgIENhbmNlbGxhdGlvbkVycm9yOiBDYW5jZWxsYXRpb25FcnJvcixcbiAgICAgICAgVGltZW91dEVycm9yOiBUaW1lb3V0RXJyb3IsXG4gICAgICAgIE9wZXJhdGlvbmFsRXJyb3I6IE9wZXJhdGlvbmFsRXJyb3IsXG4gICAgICAgIFJlamVjdGlvbkVycm9yOiBPcGVyYXRpb25hbEVycm9yLFxuICAgICAgICBBZ2dyZWdhdGVFcnJvcjogQWdncmVnYXRlRXJyb3JcbiAgICB9KTtcbiAgICBlczUuZGVmaW5lUHJvcGVydHkoRXJyb3IsIFwiX19CbHVlYmlyZEVycm9yVHlwZXNfX1wiLCB7XG4gICAgICAgIHZhbHVlOiBlcnJvclR5cGVzLFxuICAgICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICBjb25maWd1cmFibGU6IGZhbHNlXG4gICAgfSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIEVycm9yOiBFcnJvcixcbiAgICBUeXBlRXJyb3I6IF9UeXBlRXJyb3IsXG4gICAgUmFuZ2VFcnJvcjogX1JhbmdlRXJyb3IsXG4gICAgQ2FuY2VsbGF0aW9uRXJyb3I6IGVycm9yVHlwZXMuQ2FuY2VsbGF0aW9uRXJyb3IsXG4gICAgT3BlcmF0aW9uYWxFcnJvcjogZXJyb3JUeXBlcy5PcGVyYXRpb25hbEVycm9yLFxuICAgIFRpbWVvdXRFcnJvcjogZXJyb3JUeXBlcy5UaW1lb3V0RXJyb3IsXG4gICAgQWdncmVnYXRlRXJyb3I6IGVycm9yVHlwZXMuQWdncmVnYXRlRXJyb3IsXG4gICAgV2FybmluZzogV2FybmluZ1xufTtcblxufSx7XCIuL2VzNVwiOjEzLFwiLi91dGlsXCI6MzZ9XSwxMzpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG52YXIgaXNFUzUgPSAoZnVuY3Rpb24oKXtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICByZXR1cm4gdGhpcyA9PT0gdW5kZWZpbmVkO1xufSkoKTtcblxuaWYgKGlzRVM1KSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgICAgIGZyZWV6ZTogT2JqZWN0LmZyZWV6ZSxcbiAgICAgICAgZGVmaW5lUHJvcGVydHk6IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSxcbiAgICAgICAgZ2V0RGVzY3JpcHRvcjogT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcixcbiAgICAgICAga2V5czogT2JqZWN0LmtleXMsXG4gICAgICAgIG5hbWVzOiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyxcbiAgICAgICAgZ2V0UHJvdG90eXBlT2Y6IE9iamVjdC5nZXRQcm90b3R5cGVPZixcbiAgICAgICAgaXNBcnJheTogQXJyYXkuaXNBcnJheSxcbiAgICAgICAgaXNFUzU6IGlzRVM1LFxuICAgICAgICBwcm9wZXJ0eUlzV3JpdGFibGU6IGZ1bmN0aW9uKG9iaiwgcHJvcCkge1xuICAgICAgICAgICAgdmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iaiwgcHJvcCk7XG4gICAgICAgICAgICByZXR1cm4gISEoIWRlc2NyaXB0b3IgfHwgZGVzY3JpcHRvci53cml0YWJsZSB8fCBkZXNjcmlwdG9yLnNldCk7XG4gICAgICAgIH1cbiAgICB9O1xufSBlbHNlIHtcbiAgICB2YXIgaGFzID0ge30uaGFzT3duUHJvcGVydHk7XG4gICAgdmFyIHN0ciA9IHt9LnRvU3RyaW5nO1xuICAgIHZhciBwcm90byA9IHt9LmNvbnN0cnVjdG9yLnByb3RvdHlwZTtcblxuICAgIHZhciBPYmplY3RLZXlzID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgdmFyIHJldCA9IFtdO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gbykge1xuICAgICAgICAgICAgaWYgKGhhcy5jYWxsKG8sIGtleSkpIHtcbiAgICAgICAgICAgICAgICByZXQucHVzaChrZXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcblxuICAgIHZhciBPYmplY3RHZXREZXNjcmlwdG9yID0gZnVuY3Rpb24obywga2V5KSB7XG4gICAgICAgIHJldHVybiB7dmFsdWU6IG9ba2V5XX07XG4gICAgfTtcblxuICAgIHZhciBPYmplY3REZWZpbmVQcm9wZXJ0eSA9IGZ1bmN0aW9uIChvLCBrZXksIGRlc2MpIHtcbiAgICAgICAgb1trZXldID0gZGVzYy52YWx1ZTtcbiAgICAgICAgcmV0dXJuIG87XG4gICAgfTtcblxuICAgIHZhciBPYmplY3RGcmVlemUgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfTtcblxuICAgIHZhciBPYmplY3RHZXRQcm90b3R5cGVPZiA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJldHVybiBPYmplY3Qob2JqKS5jb25zdHJ1Y3Rvci5wcm90b3R5cGU7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHJldHVybiBwcm90bztcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgQXJyYXlJc0FycmF5ID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmV0dXJuIHN0ci5jYWxsKG9iaikgPT09IFwiW29iamVjdCBBcnJheV1cIjtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaChlKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgICAgIGlzQXJyYXk6IEFycmF5SXNBcnJheSxcbiAgICAgICAga2V5czogT2JqZWN0S2V5cyxcbiAgICAgICAgbmFtZXM6IE9iamVjdEtleXMsXG4gICAgICAgIGRlZmluZVByb3BlcnR5OiBPYmplY3REZWZpbmVQcm9wZXJ0eSxcbiAgICAgICAgZ2V0RGVzY3JpcHRvcjogT2JqZWN0R2V0RGVzY3JpcHRvcixcbiAgICAgICAgZnJlZXplOiBPYmplY3RGcmVlemUsXG4gICAgICAgIGdldFByb3RvdHlwZU9mOiBPYmplY3RHZXRQcm90b3R5cGVPZixcbiAgICAgICAgaXNFUzU6IGlzRVM1LFxuICAgICAgICBwcm9wZXJ0eUlzV3JpdGFibGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG59LHt9XSwxNDpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oUHJvbWlzZSwgSU5URVJOQUwpIHtcbnZhciBQcm9taXNlTWFwID0gUHJvbWlzZS5tYXA7XG5cblByb21pc2UucHJvdG90eXBlLmZpbHRlciA9IGZ1bmN0aW9uIChmbiwgb3B0aW9ucykge1xuICAgIHJldHVybiBQcm9taXNlTWFwKHRoaXMsIGZuLCBvcHRpb25zLCBJTlRFUk5BTCk7XG59O1xuXG5Qcm9taXNlLmZpbHRlciA9IGZ1bmN0aW9uIChwcm9taXNlcywgZm4sIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gUHJvbWlzZU1hcChwcm9taXNlcywgZm4sIG9wdGlvbnMsIElOVEVSTkFMKTtcbn07XG59O1xuXG59LHt9XSwxNTpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oUHJvbWlzZSwgdHJ5Q29udmVydFRvUHJvbWlzZSwgTkVYVF9GSUxURVIpIHtcbnZhciB1dGlsID0gX2RlcmVxXyhcIi4vdXRpbFwiKTtcbnZhciBDYW5jZWxsYXRpb25FcnJvciA9IFByb21pc2UuQ2FuY2VsbGF0aW9uRXJyb3I7XG52YXIgZXJyb3JPYmogPSB1dGlsLmVycm9yT2JqO1xudmFyIGNhdGNoRmlsdGVyID0gX2RlcmVxXyhcIi4vY2F0Y2hfZmlsdGVyXCIpKE5FWFRfRklMVEVSKTtcblxuZnVuY3Rpb24gUGFzc1Rocm91Z2hIYW5kbGVyQ29udGV4dChwcm9taXNlLCB0eXBlLCBoYW5kbGVyKSB7XG4gICAgdGhpcy5wcm9taXNlID0gcHJvbWlzZTtcbiAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICAgIHRoaXMuaGFuZGxlciA9IGhhbmRsZXI7XG4gICAgdGhpcy5jYWxsZWQgPSBmYWxzZTtcbiAgICB0aGlzLmNhbmNlbFByb21pc2UgPSBudWxsO1xufVxuXG5QYXNzVGhyb3VnaEhhbmRsZXJDb250ZXh0LnByb3RvdHlwZS5pc0ZpbmFsbHlIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMudHlwZSA9PT0gMDtcbn07XG5cbmZ1bmN0aW9uIEZpbmFsbHlIYW5kbGVyQ2FuY2VsUmVhY3Rpb24oZmluYWxseUhhbmRsZXIpIHtcbiAgICB0aGlzLmZpbmFsbHlIYW5kbGVyID0gZmluYWxseUhhbmRsZXI7XG59XG5cbkZpbmFsbHlIYW5kbGVyQ2FuY2VsUmVhY3Rpb24ucHJvdG90eXBlLl9yZXN1bHRDYW5jZWxsZWQgPSBmdW5jdGlvbigpIHtcbiAgICBjaGVja0NhbmNlbCh0aGlzLmZpbmFsbHlIYW5kbGVyKTtcbn07XG5cbmZ1bmN0aW9uIGNoZWNrQ2FuY2VsKGN0eCwgcmVhc29uKSB7XG4gICAgaWYgKGN0eC5jYW5jZWxQcm9taXNlICE9IG51bGwpIHtcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICBjdHguY2FuY2VsUHJvbWlzZS5fcmVqZWN0KHJlYXNvbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjdHguY2FuY2VsUHJvbWlzZS5fY2FuY2VsKCk7XG4gICAgICAgIH1cbiAgICAgICAgY3R4LmNhbmNlbFByb21pc2UgPSBudWxsO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBzdWNjZWVkKCkge1xuICAgIHJldHVybiBmaW5hbGx5SGFuZGxlci5jYWxsKHRoaXMsIHRoaXMucHJvbWlzZS5fdGFyZ2V0KCkuX3NldHRsZWRWYWx1ZSgpKTtcbn1cbmZ1bmN0aW9uIGZhaWwocmVhc29uKSB7XG4gICAgaWYgKGNoZWNrQ2FuY2VsKHRoaXMsIHJlYXNvbikpIHJldHVybjtcbiAgICBlcnJvck9iai5lID0gcmVhc29uO1xuICAgIHJldHVybiBlcnJvck9iajtcbn1cbmZ1bmN0aW9uIGZpbmFsbHlIYW5kbGVyKHJlYXNvbk9yVmFsdWUpIHtcbiAgICB2YXIgcHJvbWlzZSA9IHRoaXMucHJvbWlzZTtcbiAgICB2YXIgaGFuZGxlciA9IHRoaXMuaGFuZGxlcjtcblxuICAgIGlmICghdGhpcy5jYWxsZWQpIHtcbiAgICAgICAgdGhpcy5jYWxsZWQgPSB0cnVlO1xuICAgICAgICB2YXIgcmV0ID0gdGhpcy5pc0ZpbmFsbHlIYW5kbGVyKClcbiAgICAgICAgICAgID8gaGFuZGxlci5jYWxsKHByb21pc2UuX2JvdW5kVmFsdWUoKSlcbiAgICAgICAgICAgIDogaGFuZGxlci5jYWxsKHByb21pc2UuX2JvdW5kVmFsdWUoKSwgcmVhc29uT3JWYWx1ZSk7XG4gICAgICAgIGlmIChyZXQgPT09IE5FWFRfRklMVEVSKSB7XG4gICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICB9IGVsc2UgaWYgKHJldCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBwcm9taXNlLl9zZXRSZXR1cm5lZE5vblVuZGVmaW5lZCgpO1xuICAgICAgICAgICAgdmFyIG1heWJlUHJvbWlzZSA9IHRyeUNvbnZlcnRUb1Byb21pc2UocmV0LCBwcm9taXNlKTtcbiAgICAgICAgICAgIGlmIChtYXliZVByb21pc2UgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY2FuY2VsUHJvbWlzZSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtYXliZVByb21pc2UuX2lzQ2FuY2VsbGVkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZWFzb24gPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBDYW5jZWxsYXRpb25FcnJvcihcImxhdGUgY2FuY2VsbGF0aW9uIG9ic2VydmVyXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbWlzZS5fYXR0YWNoRXh0cmFUcmFjZShyZWFzb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JPYmouZSA9IHJlYXNvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlcnJvck9iajtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtYXliZVByb21pc2UuaXNQZW5kaW5nKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heWJlUHJvbWlzZS5fYXR0YWNoQ2FuY2VsbGF0aW9uQ2FsbGJhY2soXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IEZpbmFsbHlIYW5kbGVyQ2FuY2VsUmVhY3Rpb24odGhpcykpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBtYXliZVByb21pc2UuX3RoZW4oXG4gICAgICAgICAgICAgICAgICAgIHN1Y2NlZWQsIGZhaWwsIHVuZGVmaW5lZCwgdGhpcywgdW5kZWZpbmVkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwcm9taXNlLmlzUmVqZWN0ZWQoKSkge1xuICAgICAgICBjaGVja0NhbmNlbCh0aGlzKTtcbiAgICAgICAgZXJyb3JPYmouZSA9IHJlYXNvbk9yVmFsdWU7XG4gICAgICAgIHJldHVybiBlcnJvck9iajtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjaGVja0NhbmNlbCh0aGlzKTtcbiAgICAgICAgcmV0dXJuIHJlYXNvbk9yVmFsdWU7XG4gICAgfVxufVxuXG5Qcm9taXNlLnByb3RvdHlwZS5fcGFzc1Rocm91Z2ggPSBmdW5jdGlvbihoYW5kbGVyLCB0eXBlLCBzdWNjZXNzLCBmYWlsKSB7XG4gICAgaWYgKHR5cGVvZiBoYW5kbGVyICE9PSBcImZ1bmN0aW9uXCIpIHJldHVybiB0aGlzLnRoZW4oKTtcbiAgICByZXR1cm4gdGhpcy5fdGhlbihzdWNjZXNzLFxuICAgICAgICAgICAgICAgICAgICAgIGZhaWwsXG4gICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgIG5ldyBQYXNzVGhyb3VnaEhhbmRsZXJDb250ZXh0KHRoaXMsIHR5cGUsIGhhbmRsZXIpLFxuICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZCk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5sYXN0bHkgPVxuUHJvbWlzZS5wcm90b3R5cGVbXCJmaW5hbGx5XCJdID0gZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICByZXR1cm4gdGhpcy5fcGFzc1Rocm91Z2goaGFuZGxlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmluYWxseUhhbmRsZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbmFsbHlIYW5kbGVyKTtcbn07XG5cblxuUHJvbWlzZS5wcm90b3R5cGUudGFwID0gZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICByZXR1cm4gdGhpcy5fcGFzc1Rocm91Z2goaGFuZGxlciwgMSwgZmluYWxseUhhbmRsZXIpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUudGFwQ2F0Y2ggPSBmdW5jdGlvbiAoaGFuZGxlck9yUHJlZGljYXRlKSB7XG4gICAgdmFyIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgaWYobGVuID09PSAxKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wYXNzVGhyb3VnaChoYW5kbGVyT3JQcmVkaWNhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmluYWxseUhhbmRsZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgICB2YXIgY2F0Y2hJbnN0YW5jZXMgPSBuZXcgQXJyYXkobGVuIC0gMSksXG4gICAgICAgICAgICBqID0gMCwgaTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGxlbiAtIDE7ICsraSkge1xuICAgICAgICAgICAgdmFyIGl0ZW0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgICAgICBpZiAodXRpbC5pc09iamVjdChpdGVtKSkge1xuICAgICAgICAgICAgICAgIGNhdGNoSW5zdGFuY2VzW2orK10gPSBpdGVtO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IFR5cGVFcnJvcihcbiAgICAgICAgICAgICAgICAgICAgXCJ0YXBDYXRjaCBzdGF0ZW1lbnQgcHJlZGljYXRlOiBcIlxuICAgICAgICAgICAgICAgICAgICArIFwiZXhwZWN0aW5nIGFuIG9iamVjdCBidXQgZ290IFwiICsgdXRpbC5jbGFzc1N0cmluZyhpdGVtKVxuICAgICAgICAgICAgICAgICkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNhdGNoSW5zdGFuY2VzLmxlbmd0aCA9IGo7XG4gICAgICAgIHZhciBoYW5kbGVyID0gYXJndW1lbnRzW2ldO1xuICAgICAgICByZXR1cm4gdGhpcy5fcGFzc1Rocm91Z2goY2F0Y2hGaWx0ZXIoY2F0Y2hJbnN0YW5jZXMsIGhhbmRsZXIsIHRoaXMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbmFsbHlIYW5kbGVyKTtcbiAgICB9XG5cbn07XG5cbnJldHVybiBQYXNzVGhyb3VnaEhhbmRsZXJDb250ZXh0O1xufTtcblxufSx7XCIuL2NhdGNoX2ZpbHRlclwiOjcsXCIuL3V0aWxcIjozNn1dLDE2OltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihQcm9taXNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlSZWplY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIElOVEVSTkFMLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB0cnlDb252ZXJ0VG9Qcm9taXNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBQcm94eWFibGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGRlYnVnKSB7XG52YXIgZXJyb3JzID0gX2RlcmVxXyhcIi4vZXJyb3JzXCIpO1xudmFyIFR5cGVFcnJvciA9IGVycm9ycy5UeXBlRXJyb3I7XG52YXIgdXRpbCA9IF9kZXJlcV8oXCIuL3V0aWxcIik7XG52YXIgZXJyb3JPYmogPSB1dGlsLmVycm9yT2JqO1xudmFyIHRyeUNhdGNoID0gdXRpbC50cnlDYXRjaDtcbnZhciB5aWVsZEhhbmRsZXJzID0gW107XG5cbmZ1bmN0aW9uIHByb21pc2VGcm9tWWllbGRIYW5kbGVyKHZhbHVlLCB5aWVsZEhhbmRsZXJzLCB0cmFjZVBhcmVudCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeWllbGRIYW5kbGVycy5sZW5ndGg7ICsraSkge1xuICAgICAgICB0cmFjZVBhcmVudC5fcHVzaENvbnRleHQoKTtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHRyeUNhdGNoKHlpZWxkSGFuZGxlcnNbaV0pKHZhbHVlKTtcbiAgICAgICAgdHJhY2VQYXJlbnQuX3BvcENvbnRleHQoKTtcbiAgICAgICAgaWYgKHJlc3VsdCA9PT0gZXJyb3JPYmopIHtcbiAgICAgICAgICAgIHRyYWNlUGFyZW50Ll9wdXNoQ29udGV4dCgpO1xuICAgICAgICAgICAgdmFyIHJldCA9IFByb21pc2UucmVqZWN0KGVycm9yT2JqLmUpO1xuICAgICAgICAgICAgdHJhY2VQYXJlbnQuX3BvcENvbnRleHQoKTtcbiAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG1heWJlUHJvbWlzZSA9IHRyeUNvbnZlcnRUb1Byb21pc2UocmVzdWx0LCB0cmFjZVBhcmVudCk7XG4gICAgICAgIGlmIChtYXliZVByb21pc2UgaW5zdGFuY2VvZiBQcm9taXNlKSByZXR1cm4gbWF5YmVQcm9taXNlO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gUHJvbWlzZVNwYXduKGdlbmVyYXRvckZ1bmN0aW9uLCByZWNlaXZlciwgeWllbGRIYW5kbGVyLCBzdGFjaykge1xuICAgIGlmIChkZWJ1Zy5jYW5jZWxsYXRpb24oKSkge1xuICAgICAgICB2YXIgaW50ZXJuYWwgPSBuZXcgUHJvbWlzZShJTlRFUk5BTCk7XG4gICAgICAgIHZhciBfZmluYWxseVByb21pc2UgPSB0aGlzLl9maW5hbGx5UHJvbWlzZSA9IG5ldyBQcm9taXNlKElOVEVSTkFMKTtcbiAgICAgICAgdGhpcy5fcHJvbWlzZSA9IGludGVybmFsLmxhc3RseShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBfZmluYWxseVByb21pc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBpbnRlcm5hbC5fY2FwdHVyZVN0YWNrVHJhY2UoKTtcbiAgICAgICAgaW50ZXJuYWwuX3NldE9uQ2FuY2VsKHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBwcm9taXNlID0gdGhpcy5fcHJvbWlzZSA9IG5ldyBQcm9taXNlKElOVEVSTkFMKTtcbiAgICAgICAgcHJvbWlzZS5fY2FwdHVyZVN0YWNrVHJhY2UoKTtcbiAgICB9XG4gICAgdGhpcy5fc3RhY2sgPSBzdGFjaztcbiAgICB0aGlzLl9nZW5lcmF0b3JGdW5jdGlvbiA9IGdlbmVyYXRvckZ1bmN0aW9uO1xuICAgIHRoaXMuX3JlY2VpdmVyID0gcmVjZWl2ZXI7XG4gICAgdGhpcy5fZ2VuZXJhdG9yID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX3lpZWxkSGFuZGxlcnMgPSB0eXBlb2YgeWllbGRIYW5kbGVyID09PSBcImZ1bmN0aW9uXCJcbiAgICAgICAgPyBbeWllbGRIYW5kbGVyXS5jb25jYXQoeWllbGRIYW5kbGVycylcbiAgICAgICAgOiB5aWVsZEhhbmRsZXJzO1xuICAgIHRoaXMuX3lpZWxkZWRQcm9taXNlID0gbnVsbDtcbiAgICB0aGlzLl9jYW5jZWxsYXRpb25QaGFzZSA9IGZhbHNlO1xufVxudXRpbC5pbmhlcml0cyhQcm9taXNlU3Bhd24sIFByb3h5YWJsZSk7XG5cblByb21pc2VTcGF3bi5wcm90b3R5cGUuX2lzUmVzb2x2ZWQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fcHJvbWlzZSA9PT0gbnVsbDtcbn07XG5cblByb21pc2VTcGF3bi5wcm90b3R5cGUuX2NsZWFudXAgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9wcm9taXNlID0gdGhpcy5fZ2VuZXJhdG9yID0gbnVsbDtcbiAgICBpZiAoZGVidWcuY2FuY2VsbGF0aW9uKCkgJiYgdGhpcy5fZmluYWxseVByb21pc2UgIT09IG51bGwpIHtcbiAgICAgICAgdGhpcy5fZmluYWxseVByb21pc2UuX2Z1bGZpbGwoKTtcbiAgICAgICAgdGhpcy5fZmluYWxseVByb21pc2UgPSBudWxsO1xuICAgIH1cbn07XG5cblByb21pc2VTcGF3bi5wcm90b3R5cGUuX3Byb21pc2VDYW5jZWxsZWQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5faXNSZXNvbHZlZCgpKSByZXR1cm47XG4gICAgdmFyIGltcGxlbWVudHNSZXR1cm4gPSB0eXBlb2YgdGhpcy5fZ2VuZXJhdG9yW1wicmV0dXJuXCJdICE9PSBcInVuZGVmaW5lZFwiO1xuXG4gICAgdmFyIHJlc3VsdDtcbiAgICBpZiAoIWltcGxlbWVudHNSZXR1cm4pIHtcbiAgICAgICAgdmFyIHJlYXNvbiA9IG5ldyBQcm9taXNlLkNhbmNlbGxhdGlvbkVycm9yKFxuICAgICAgICAgICAgXCJnZW5lcmF0b3IgLnJldHVybigpIHNlbnRpbmVsXCIpO1xuICAgICAgICBQcm9taXNlLmNvcm91dGluZS5yZXR1cm5TZW50aW5lbCA9IHJlYXNvbjtcbiAgICAgICAgdGhpcy5fcHJvbWlzZS5fYXR0YWNoRXh0cmFUcmFjZShyZWFzb24pO1xuICAgICAgICB0aGlzLl9wcm9taXNlLl9wdXNoQ29udGV4dCgpO1xuICAgICAgICByZXN1bHQgPSB0cnlDYXRjaCh0aGlzLl9nZW5lcmF0b3JbXCJ0aHJvd1wiXSkuY2FsbCh0aGlzLl9nZW5lcmF0b3IsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWFzb24pO1xuICAgICAgICB0aGlzLl9wcm9taXNlLl9wb3BDb250ZXh0KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fcHJvbWlzZS5fcHVzaENvbnRleHQoKTtcbiAgICAgICAgcmVzdWx0ID0gdHJ5Q2F0Y2godGhpcy5fZ2VuZXJhdG9yW1wicmV0dXJuXCJdKS5jYWxsKHRoaXMuX2dlbmVyYXRvcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQpO1xuICAgICAgICB0aGlzLl9wcm9taXNlLl9wb3BDb250ZXh0KCk7XG4gICAgfVxuICAgIHRoaXMuX2NhbmNlbGxhdGlvblBoYXNlID0gdHJ1ZTtcbiAgICB0aGlzLl95aWVsZGVkUHJvbWlzZSA9IG51bGw7XG4gICAgdGhpcy5fY29udGludWUocmVzdWx0KTtcbn07XG5cblByb21pc2VTcGF3bi5wcm90b3R5cGUuX3Byb21pc2VGdWxmaWxsZWQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHRoaXMuX3lpZWxkZWRQcm9taXNlID0gbnVsbDtcbiAgICB0aGlzLl9wcm9taXNlLl9wdXNoQ29udGV4dCgpO1xuICAgIHZhciByZXN1bHQgPSB0cnlDYXRjaCh0aGlzLl9nZW5lcmF0b3IubmV4dCkuY2FsbCh0aGlzLl9nZW5lcmF0b3IsIHZhbHVlKTtcbiAgICB0aGlzLl9wcm9taXNlLl9wb3BDb250ZXh0KCk7XG4gICAgdGhpcy5fY29udGludWUocmVzdWx0KTtcbn07XG5cblByb21pc2VTcGF3bi5wcm90b3R5cGUuX3Byb21pc2VSZWplY3RlZCA9IGZ1bmN0aW9uKHJlYXNvbikge1xuICAgIHRoaXMuX3lpZWxkZWRQcm9taXNlID0gbnVsbDtcbiAgICB0aGlzLl9wcm9taXNlLl9hdHRhY2hFeHRyYVRyYWNlKHJlYXNvbik7XG4gICAgdGhpcy5fcHJvbWlzZS5fcHVzaENvbnRleHQoKTtcbiAgICB2YXIgcmVzdWx0ID0gdHJ5Q2F0Y2godGhpcy5fZ2VuZXJhdG9yW1widGhyb3dcIl0pXG4gICAgICAgIC5jYWxsKHRoaXMuX2dlbmVyYXRvciwgcmVhc29uKTtcbiAgICB0aGlzLl9wcm9taXNlLl9wb3BDb250ZXh0KCk7XG4gICAgdGhpcy5fY29udGludWUocmVzdWx0KTtcbn07XG5cblByb21pc2VTcGF3bi5wcm90b3R5cGUuX3Jlc3VsdENhbmNlbGxlZCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl95aWVsZGVkUHJvbWlzZSBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgdmFyIHByb21pc2UgPSB0aGlzLl95aWVsZGVkUHJvbWlzZTtcbiAgICAgICAgdGhpcy5feWllbGRlZFByb21pc2UgPSBudWxsO1xuICAgICAgICBwcm9taXNlLmNhbmNlbCgpO1xuICAgIH1cbn07XG5cblByb21pc2VTcGF3bi5wcm90b3R5cGUucHJvbWlzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fcHJvbWlzZTtcbn07XG5cblByb21pc2VTcGF3bi5wcm90b3R5cGUuX3J1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9nZW5lcmF0b3IgPSB0aGlzLl9nZW5lcmF0b3JGdW5jdGlvbi5jYWxsKHRoaXMuX3JlY2VpdmVyKTtcbiAgICB0aGlzLl9yZWNlaXZlciA9XG4gICAgICAgIHRoaXMuX2dlbmVyYXRvckZ1bmN0aW9uID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX3Byb21pc2VGdWxmaWxsZWQodW5kZWZpbmVkKTtcbn07XG5cblByb21pc2VTcGF3bi5wcm90b3R5cGUuX2NvbnRpbnVlID0gZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgIHZhciBwcm9taXNlID0gdGhpcy5fcHJvbWlzZTtcbiAgICBpZiAocmVzdWx0ID09PSBlcnJvck9iaikge1xuICAgICAgICB0aGlzLl9jbGVhbnVwKCk7XG4gICAgICAgIGlmICh0aGlzLl9jYW5jZWxsYXRpb25QaGFzZSkge1xuICAgICAgICAgICAgcmV0dXJuIHByb21pc2UuY2FuY2VsKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gcHJvbWlzZS5fcmVqZWN0Q2FsbGJhY2socmVzdWx0LmUsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciB2YWx1ZSA9IHJlc3VsdC52YWx1ZTtcbiAgICBpZiAocmVzdWx0LmRvbmUgPT09IHRydWUpIHtcbiAgICAgICAgdGhpcy5fY2xlYW51cCgpO1xuICAgICAgICBpZiAodGhpcy5fY2FuY2VsbGF0aW9uUGhhc2UpIHtcbiAgICAgICAgICAgIHJldHVybiBwcm9taXNlLmNhbmNlbCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHByb21pc2UuX3Jlc29sdmVDYWxsYmFjayh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgbWF5YmVQcm9taXNlID0gdHJ5Q29udmVydFRvUHJvbWlzZSh2YWx1ZSwgdGhpcy5fcHJvbWlzZSk7XG4gICAgICAgIGlmICghKG1heWJlUHJvbWlzZSBpbnN0YW5jZW9mIFByb21pc2UpKSB7XG4gICAgICAgICAgICBtYXliZVByb21pc2UgPVxuICAgICAgICAgICAgICAgIHByb21pc2VGcm9tWWllbGRIYW5kbGVyKG1heWJlUHJvbWlzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl95aWVsZEhhbmRsZXJzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3Byb21pc2UpO1xuICAgICAgICAgICAgaWYgKG1heWJlUHJvbWlzZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3Byb21pc2VSZWplY3RlZChcbiAgICAgICAgICAgICAgICAgICAgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiQSB2YWx1ZSAlcyB3YXMgeWllbGRlZCB0aGF0IGNvdWxkIG5vdCBiZSB0cmVhdGVkIGFzIGEgcHJvbWlzZVxcdTAwMGFcXHUwMDBhICAgIFNlZSBodHRwOi8vZ29vLmdsL01xckZtWFxcdTAwMGFcXHUwMDBhXCIucmVwbGFjZShcIiVzXCIsIFN0cmluZyh2YWx1ZSkpICtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiRnJvbSBjb3JvdXRpbmU6XFx1MDAwYVwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3N0YWNrLnNwbGl0KFwiXFxuXCIpLnNsaWNlKDEsIC03KS5qb2luKFwiXFxuXCIpXG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBtYXliZVByb21pc2UgPSBtYXliZVByb21pc2UuX3RhcmdldCgpO1xuICAgICAgICB2YXIgYml0RmllbGQgPSBtYXliZVByb21pc2UuX2JpdEZpZWxkO1xuICAgICAgICA7XG4gICAgICAgIGlmICgoKGJpdEZpZWxkICYgNTAzOTcxODQpID09PSAwKSkge1xuICAgICAgICAgICAgdGhpcy5feWllbGRlZFByb21pc2UgPSBtYXliZVByb21pc2U7XG4gICAgICAgICAgICBtYXliZVByb21pc2UuX3Byb3h5KHRoaXMsIG51bGwpO1xuICAgICAgICB9IGVsc2UgaWYgKCgoYml0RmllbGQgJiAzMzU1NDQzMikgIT09IDApKSB7XG4gICAgICAgICAgICBQcm9taXNlLl9hc3luYy5pbnZva2UoXG4gICAgICAgICAgICAgICAgdGhpcy5fcHJvbWlzZUZ1bGZpbGxlZCwgdGhpcywgbWF5YmVQcm9taXNlLl92YWx1ZSgpXG4gICAgICAgICAgICApO1xuICAgICAgICB9IGVsc2UgaWYgKCgoYml0RmllbGQgJiAxNjc3NzIxNikgIT09IDApKSB7XG4gICAgICAgICAgICBQcm9taXNlLl9hc3luYy5pbnZva2UoXG4gICAgICAgICAgICAgICAgdGhpcy5fcHJvbWlzZVJlamVjdGVkLCB0aGlzLCBtYXliZVByb21pc2UuX3JlYXNvbigpXG4gICAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fcHJvbWlzZUNhbmNlbGxlZCgpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuUHJvbWlzZS5jb3JvdXRpbmUgPSBmdW5jdGlvbiAoZ2VuZXJhdG9yRnVuY3Rpb24sIG9wdGlvbnMpIHtcbiAgICBpZiAodHlwZW9mIGdlbmVyYXRvckZ1bmN0aW9uICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImdlbmVyYXRvckZ1bmN0aW9uIG11c3QgYmUgYSBmdW5jdGlvblxcdTAwMGFcXHUwMDBhICAgIFNlZSBodHRwOi8vZ29vLmdsL01xckZtWFxcdTAwMGFcIik7XG4gICAgfVxuICAgIHZhciB5aWVsZEhhbmRsZXIgPSBPYmplY3Qob3B0aW9ucykueWllbGRIYW5kbGVyO1xuICAgIHZhciBQcm9taXNlU3Bhd24kID0gUHJvbWlzZVNwYXduO1xuICAgIHZhciBzdGFjayA9IG5ldyBFcnJvcigpLnN0YWNrO1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBnZW5lcmF0b3IgPSBnZW5lcmF0b3JGdW5jdGlvbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB2YXIgc3Bhd24gPSBuZXcgUHJvbWlzZVNwYXduJCh1bmRlZmluZWQsIHVuZGVmaW5lZCwgeWllbGRIYW5kbGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFjayk7XG4gICAgICAgIHZhciByZXQgPSBzcGF3bi5wcm9taXNlKCk7XG4gICAgICAgIHNwYXduLl9nZW5lcmF0b3IgPSBnZW5lcmF0b3I7XG4gICAgICAgIHNwYXduLl9wcm9taXNlRnVsZmlsbGVkKHVuZGVmaW5lZCk7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbn07XG5cblByb21pc2UuY29yb3V0aW5lLmFkZFlpZWxkSGFuZGxlciA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJleHBlY3RpbmcgYSBmdW5jdGlvbiBidXQgZ290IFwiICsgdXRpbC5jbGFzc1N0cmluZyhmbikpO1xuICAgIH1cbiAgICB5aWVsZEhhbmRsZXJzLnB1c2goZm4pO1xufTtcblxuUHJvbWlzZS5zcGF3biA9IGZ1bmN0aW9uIChnZW5lcmF0b3JGdW5jdGlvbikge1xuICAgIGRlYnVnLmRlcHJlY2F0ZWQoXCJQcm9taXNlLnNwYXduKClcIiwgXCJQcm9taXNlLmNvcm91dGluZSgpXCIpO1xuICAgIGlmICh0eXBlb2YgZ2VuZXJhdG9yRnVuY3Rpb24gIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICByZXR1cm4gYXBpUmVqZWN0aW9uKFwiZ2VuZXJhdG9yRnVuY3Rpb24gbXVzdCBiZSBhIGZ1bmN0aW9uXFx1MDAwYVxcdTAwMGEgICAgU2VlIGh0dHA6Ly9nb28uZ2wvTXFyRm1YXFx1MDAwYVwiKTtcbiAgICB9XG4gICAgdmFyIHNwYXduID0gbmV3IFByb21pc2VTcGF3bihnZW5lcmF0b3JGdW5jdGlvbiwgdGhpcyk7XG4gICAgdmFyIHJldCA9IHNwYXduLnByb21pc2UoKTtcbiAgICBzcGF3bi5fcnVuKFByb21pc2Uuc3Bhd24pO1xuICAgIHJldHVybiByZXQ7XG59O1xufTtcblxufSx7XCIuL2Vycm9yc1wiOjEyLFwiLi91dGlsXCI6MzZ9XSwxNzpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID1cbmZ1bmN0aW9uKFByb21pc2UsIFByb21pc2VBcnJheSwgdHJ5Q29udmVydFRvUHJvbWlzZSwgSU5URVJOQUwsIGFzeW5jLFxuICAgICAgICAgZ2V0RG9tYWluKSB7XG52YXIgdXRpbCA9IF9kZXJlcV8oXCIuL3V0aWxcIik7XG52YXIgY2FuRXZhbHVhdGUgPSB1dGlsLmNhbkV2YWx1YXRlO1xudmFyIHRyeUNhdGNoID0gdXRpbC50cnlDYXRjaDtcbnZhciBlcnJvck9iaiA9IHV0aWwuZXJyb3JPYmo7XG52YXIgcmVqZWN0O1xuXG5pZiAoIXRydWUpIHtcbmlmIChjYW5FdmFsdWF0ZSkge1xuICAgIHZhciB0aGVuQ2FsbGJhY2sgPSBmdW5jdGlvbihpKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnVuY3Rpb24oXCJ2YWx1ZVwiLCBcImhvbGRlclwiLCBcIiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICd1c2Ugc3RyaWN0JzsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIGhvbGRlci5wSW5kZXggPSB2YWx1ZTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIGhvbGRlci5jaGVja0Z1bGZpbGxtZW50KHRoaXMpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIFwiLnJlcGxhY2UoL0luZGV4L2csIGkpKTtcbiAgICB9O1xuXG4gICAgdmFyIHByb21pc2VTZXR0ZXIgPSBmdW5jdGlvbihpKSB7XG4gICAgICAgIHJldHVybiBuZXcgRnVuY3Rpb24oXCJwcm9taXNlXCIsIFwiaG9sZGVyXCIsIFwiICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICd1c2Ugc3RyaWN0JzsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIGhvbGRlci5wSW5kZXggPSBwcm9taXNlOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIFwiLnJlcGxhY2UoL0luZGV4L2csIGkpKTtcbiAgICB9O1xuXG4gICAgdmFyIGdlbmVyYXRlSG9sZGVyQ2xhc3MgPSBmdW5jdGlvbih0b3RhbCkge1xuICAgICAgICB2YXIgcHJvcHMgPSBuZXcgQXJyYXkodG90YWwpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBwcm9wc1tpXSA9IFwidGhpcy5wXCIgKyAoaSsxKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYXNzaWdubWVudCA9IHByb3BzLmpvaW4oXCIgPSBcIikgKyBcIiA9IG51bGw7XCI7XG4gICAgICAgIHZhciBjYW5jZWxsYXRpb25Db2RlPSBcInZhciBwcm9taXNlO1xcblwiICsgcHJvcHMubWFwKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgICAgICAgIHJldHVybiBcIiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxcblxcXG4gICAgICAgICAgICAgICAgcHJvbWlzZSA9IFwiICsgcHJvcCArIFwiOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICBpZiAocHJvbWlzZSBpbnN0YW5jZW9mIFByb21pc2UpIHsgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICAgICAgcHJvbWlzZS5jYW5jZWwoKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICB9ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIFwiO1xuICAgICAgICB9KS5qb2luKFwiXFxuXCIpO1xuICAgICAgICB2YXIgcGFzc2VkQXJndW1lbnRzID0gcHJvcHMuam9pbihcIiwgXCIpO1xuICAgICAgICB2YXIgbmFtZSA9IFwiSG9sZGVyJFwiICsgdG90YWw7XG5cblxuICAgICAgICB2YXIgY29kZSA9IFwicmV0dXJuIGZ1bmN0aW9uKHRyeUNhdGNoLCBlcnJvck9iaiwgUHJvbWlzZSwgYXN5bmMpIHsgICAgXFxuXFxcbiAgICAgICAgICAgICd1c2Ugc3RyaWN0JzsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIGZ1bmN0aW9uIFtUaGVOYW1lXShmbikgeyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICBbVGhlUHJvcGVydGllc10gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICB0aGlzLmZuID0gZm47ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICB0aGlzLmFzeW5jTmVlZGVkID0gdHJ1ZTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICB0aGlzLm5vdyA9IDA7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIH0gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIFtUaGVOYW1lXS5wcm90b3R5cGUuX2NhbGxGdW5jdGlvbiA9IGZ1bmN0aW9uKHByb21pc2UpIHsgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICBwcm9taXNlLl9wdXNoQ29udGV4dCgpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICB2YXIgcmV0ID0gdHJ5Q2F0Y2godGhpcy5mbikoW1RoZVBhc3NlZEFyZ3VtZW50c10pOyAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICBwcm9taXNlLl9wb3BDb250ZXh0KCk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICBpZiAocmV0ID09PSBlcnJvck9iaikgeyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICAgICAgcHJvbWlzZS5fcmVqZWN0Q2FsbGJhY2socmV0LmUsIGZhbHNlKTsgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICB9IGVsc2UgeyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICAgICAgcHJvbWlzZS5fcmVzb2x2ZUNhbGxiYWNrKHJldCk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICB9ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIH07ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIFtUaGVOYW1lXS5wcm90b3R5cGUuY2hlY2tGdWxmaWxsbWVudCA9IGZ1bmN0aW9uKHByb21pc2UpIHsgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICB2YXIgbm93ID0gKyt0aGlzLm5vdzsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICBpZiAobm93ID09PSBbVGhlVG90YWxdKSB7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuYXN5bmNOZWVkZWQpIHsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzeW5jLmludm9rZSh0aGlzLl9jYWxsRnVuY3Rpb24sIHRoaXMsIHByb21pc2UpOyAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NhbGxGdW5jdGlvbihwcm9taXNlKTsgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICAgICAgfSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICB9ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIH07ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIFtUaGVOYW1lXS5wcm90b3R5cGUuX3Jlc3VsdENhbmNlbGxlZCA9IGZ1bmN0aW9uKCkgeyAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICBbQ2FuY2VsbGF0aW9uQ29kZV0gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIH07ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIHJldHVybiBbVGhlTmFtZV07ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgfSh0cnlDYXRjaCwgZXJyb3JPYmosIFByb21pc2UsIGFzeW5jKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgXCI7XG5cbiAgICAgICAgY29kZSA9IGNvZGUucmVwbGFjZSgvXFxbVGhlTmFtZVxcXS9nLCBuYW1lKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcW1RoZVRvdGFsXFxdL2csIHRvdGFsKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcW1RoZVBhc3NlZEFyZ3VtZW50c1xcXS9nLCBwYXNzZWRBcmd1bWVudHMpXG4gICAgICAgICAgICAucmVwbGFjZSgvXFxbVGhlUHJvcGVydGllc1xcXS9nLCBhc3NpZ25tZW50KVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcW0NhbmNlbGxhdGlvbkNvZGVcXF0vZywgY2FuY2VsbGF0aW9uQ29kZSk7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBGdW5jdGlvbihcInRyeUNhdGNoXCIsIFwiZXJyb3JPYmpcIiwgXCJQcm9taXNlXCIsIFwiYXN5bmNcIiwgY29kZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICh0cnlDYXRjaCwgZXJyb3JPYmosIFByb21pc2UsIGFzeW5jKTtcbiAgICB9O1xuXG4gICAgdmFyIGhvbGRlckNsYXNzZXMgPSBbXTtcbiAgICB2YXIgdGhlbkNhbGxiYWNrcyA9IFtdO1xuICAgIHZhciBwcm9taXNlU2V0dGVycyA9IFtdO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCA4OyArK2kpIHtcbiAgICAgICAgaG9sZGVyQ2xhc3Nlcy5wdXNoKGdlbmVyYXRlSG9sZGVyQ2xhc3MoaSArIDEpKTtcbiAgICAgICAgdGhlbkNhbGxiYWNrcy5wdXNoKHRoZW5DYWxsYmFjayhpICsgMSkpO1xuICAgICAgICBwcm9taXNlU2V0dGVycy5wdXNoKHByb21pc2VTZXR0ZXIoaSArIDEpKTtcbiAgICB9XG5cbiAgICByZWplY3QgPSBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIHRoaXMuX3JlamVjdChyZWFzb24pO1xuICAgIH07XG59fVxuXG5Qcm9taXNlLmpvaW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGxhc3QgPSBhcmd1bWVudHMubGVuZ3RoIC0gMTtcbiAgICB2YXIgZm47XG4gICAgaWYgKGxhc3QgPiAwICYmIHR5cGVvZiBhcmd1bWVudHNbbGFzdF0gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBmbiA9IGFyZ3VtZW50c1tsYXN0XTtcbiAgICAgICAgaWYgKCF0cnVlKSB7XG4gICAgICAgICAgICBpZiAobGFzdCA8PSA4ICYmIGNhbkV2YWx1YXRlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJldCA9IG5ldyBQcm9taXNlKElOVEVSTkFMKTtcbiAgICAgICAgICAgICAgICByZXQuX2NhcHR1cmVTdGFja1RyYWNlKCk7XG4gICAgICAgICAgICAgICAgdmFyIEhvbGRlckNsYXNzID0gaG9sZGVyQ2xhc3Nlc1tsYXN0IC0gMV07XG4gICAgICAgICAgICAgICAgdmFyIGhvbGRlciA9IG5ldyBIb2xkZXJDbGFzcyhmbik7XG4gICAgICAgICAgICAgICAgdmFyIGNhbGxiYWNrcyA9IHRoZW5DYWxsYmFja3M7XG5cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxhc3Q7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbWF5YmVQcm9taXNlID0gdHJ5Q29udmVydFRvUHJvbWlzZShhcmd1bWVudHNbaV0sIHJldCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtYXliZVByb21pc2UgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXliZVByb21pc2UgPSBtYXliZVByb21pc2UuX3RhcmdldCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGJpdEZpZWxkID0gbWF5YmVQcm9taXNlLl9iaXRGaWVsZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgoKGJpdEZpZWxkICYgNTAzOTcxODQpID09PSAwKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1heWJlUHJvbWlzZS5fdGhlbihjYWxsYmFja3NbaV0sIHJlamVjdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkLCByZXQsIGhvbGRlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvbWlzZVNldHRlcnNbaV0obWF5YmVQcm9taXNlLCBob2xkZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvbGRlci5hc3luY05lZWRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICgoKGJpdEZpZWxkICYgMzM1NTQ0MzIpICE9PSAwKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrc1tpXS5jYWxsKHJldCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXliZVByb21pc2UuX3ZhbHVlKCksIGhvbGRlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCgoYml0RmllbGQgJiAxNjc3NzIxNikgIT09IDApKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0Ll9yZWplY3QobWF5YmVQcm9taXNlLl9yZWFzb24oKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldC5fY2FuY2VsKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFja3NbaV0uY2FsbChyZXQsIG1heWJlUHJvbWlzZSwgaG9sZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICghcmV0Ll9pc0ZhdGVTZWFsZWQoKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaG9sZGVyLmFzeW5jTmVlZGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZG9tYWluID0gZ2V0RG9tYWluKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZG9tYWluICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaG9sZGVyLmZuID0gdXRpbC5kb21haW5CaW5kKGRvbWFpbiwgaG9sZGVyLmZuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXQuX3NldEFzeW5jR3VhcmFudGVlZCgpO1xuICAgICAgICAgICAgICAgICAgICByZXQuX3NldE9uQ2FuY2VsKGhvbGRlcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7O1xuICAgIGlmIChmbikgYXJncy5wb3AoKTtcbiAgICB2YXIgcmV0ID0gbmV3IFByb21pc2VBcnJheShhcmdzKS5wcm9taXNlKCk7XG4gICAgcmV0dXJuIGZuICE9PSB1bmRlZmluZWQgPyByZXQuc3ByZWFkKGZuKSA6IHJldDtcbn07XG5cbn07XG5cbn0se1wiLi91dGlsXCI6MzZ9XSwxODpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oUHJvbWlzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgUHJvbWlzZUFycmF5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlSZWplY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRyeUNvbnZlcnRUb1Byb21pc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIElOVEVSTkFMLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBkZWJ1Zykge1xudmFyIGdldERvbWFpbiA9IFByb21pc2UuX2dldERvbWFpbjtcbnZhciB1dGlsID0gX2RlcmVxXyhcIi4vdXRpbFwiKTtcbnZhciB0cnlDYXRjaCA9IHV0aWwudHJ5Q2F0Y2g7XG52YXIgZXJyb3JPYmogPSB1dGlsLmVycm9yT2JqO1xudmFyIGFzeW5jID0gUHJvbWlzZS5fYXN5bmM7XG5cbmZ1bmN0aW9uIE1hcHBpbmdQcm9taXNlQXJyYXkocHJvbWlzZXMsIGZuLCBsaW1pdCwgX2ZpbHRlcikge1xuICAgIHRoaXMuY29uc3RydWN0b3IkKHByb21pc2VzKTtcbiAgICB0aGlzLl9wcm9taXNlLl9jYXB0dXJlU3RhY2tUcmFjZSgpO1xuICAgIHZhciBkb21haW4gPSBnZXREb21haW4oKTtcbiAgICB0aGlzLl9jYWxsYmFjayA9IGRvbWFpbiA9PT0gbnVsbCA/IGZuIDogdXRpbC5kb21haW5CaW5kKGRvbWFpbiwgZm4pO1xuICAgIHRoaXMuX3ByZXNlcnZlZFZhbHVlcyA9IF9maWx0ZXIgPT09IElOVEVSTkFMXG4gICAgICAgID8gbmV3IEFycmF5KHRoaXMubGVuZ3RoKCkpXG4gICAgICAgIDogbnVsbDtcbiAgICB0aGlzLl9saW1pdCA9IGxpbWl0O1xuICAgIHRoaXMuX2luRmxpZ2h0ID0gMDtcbiAgICB0aGlzLl9xdWV1ZSA9IFtdO1xuICAgIGFzeW5jLmludm9rZSh0aGlzLl9hc3luY0luaXQsIHRoaXMsIHVuZGVmaW5lZCk7XG59XG51dGlsLmluaGVyaXRzKE1hcHBpbmdQcm9taXNlQXJyYXksIFByb21pc2VBcnJheSk7XG5cbk1hcHBpbmdQcm9taXNlQXJyYXkucHJvdG90eXBlLl9hc3luY0luaXQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9pbml0JCh1bmRlZmluZWQsIC0yKTtcbn07XG5cbk1hcHBpbmdQcm9taXNlQXJyYXkucHJvdG90eXBlLl9pbml0ID0gZnVuY3Rpb24gKCkge307XG5cbk1hcHBpbmdQcm9taXNlQXJyYXkucHJvdG90eXBlLl9wcm9taXNlRnVsZmlsbGVkID0gZnVuY3Rpb24gKHZhbHVlLCBpbmRleCkge1xuICAgIHZhciB2YWx1ZXMgPSB0aGlzLl92YWx1ZXM7XG4gICAgdmFyIGxlbmd0aCA9IHRoaXMubGVuZ3RoKCk7XG4gICAgdmFyIHByZXNlcnZlZFZhbHVlcyA9IHRoaXMuX3ByZXNlcnZlZFZhbHVlcztcbiAgICB2YXIgbGltaXQgPSB0aGlzLl9saW1pdDtcblxuICAgIGlmIChpbmRleCA8IDApIHtcbiAgICAgICAgaW5kZXggPSAoaW5kZXggKiAtMSkgLSAxO1xuICAgICAgICB2YWx1ZXNbaW5kZXhdID0gdmFsdWU7XG4gICAgICAgIGlmIChsaW1pdCA+PSAxKSB7XG4gICAgICAgICAgICB0aGlzLl9pbkZsaWdodC0tO1xuICAgICAgICAgICAgdGhpcy5fZHJhaW5RdWV1ZSgpO1xuICAgICAgICAgICAgaWYgKHRoaXMuX2lzUmVzb2x2ZWQoKSkgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAobGltaXQgPj0gMSAmJiB0aGlzLl9pbkZsaWdodCA+PSBsaW1pdCkge1xuICAgICAgICAgICAgdmFsdWVzW2luZGV4XSA9IHZhbHVlO1xuICAgICAgICAgICAgdGhpcy5fcXVldWUucHVzaChpbmRleCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByZXNlcnZlZFZhbHVlcyAhPT0gbnVsbCkgcHJlc2VydmVkVmFsdWVzW2luZGV4XSA9IHZhbHVlO1xuXG4gICAgICAgIHZhciBwcm9taXNlID0gdGhpcy5fcHJvbWlzZTtcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gdGhpcy5fY2FsbGJhY2s7XG4gICAgICAgIHZhciByZWNlaXZlciA9IHByb21pc2UuX2JvdW5kVmFsdWUoKTtcbiAgICAgICAgcHJvbWlzZS5fcHVzaENvbnRleHQoKTtcbiAgICAgICAgdmFyIHJldCA9IHRyeUNhdGNoKGNhbGxiYWNrKS5jYWxsKHJlY2VpdmVyLCB2YWx1ZSwgaW5kZXgsIGxlbmd0aCk7XG4gICAgICAgIHZhciBwcm9taXNlQ3JlYXRlZCA9IHByb21pc2UuX3BvcENvbnRleHQoKTtcbiAgICAgICAgZGVidWcuY2hlY2tGb3Jnb3R0ZW5SZXR1cm5zKFxuICAgICAgICAgICAgcmV0LFxuICAgICAgICAgICAgcHJvbWlzZUNyZWF0ZWQsXG4gICAgICAgICAgICBwcmVzZXJ2ZWRWYWx1ZXMgIT09IG51bGwgPyBcIlByb21pc2UuZmlsdGVyXCIgOiBcIlByb21pc2UubWFwXCIsXG4gICAgICAgICAgICBwcm9taXNlXG4gICAgICAgICk7XG4gICAgICAgIGlmIChyZXQgPT09IGVycm9yT2JqKSB7XG4gICAgICAgICAgICB0aGlzLl9yZWplY3QocmV0LmUpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbWF5YmVQcm9taXNlID0gdHJ5Q29udmVydFRvUHJvbWlzZShyZXQsIHRoaXMuX3Byb21pc2UpO1xuICAgICAgICBpZiAobWF5YmVQcm9taXNlIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICAgICAgbWF5YmVQcm9taXNlID0gbWF5YmVQcm9taXNlLl90YXJnZXQoKTtcbiAgICAgICAgICAgIHZhciBiaXRGaWVsZCA9IG1heWJlUHJvbWlzZS5fYml0RmllbGQ7XG4gICAgICAgICAgICA7XG4gICAgICAgICAgICBpZiAoKChiaXRGaWVsZCAmIDUwMzk3MTg0KSA9PT0gMCkpIHtcbiAgICAgICAgICAgICAgICBpZiAobGltaXQgPj0gMSkgdGhpcy5faW5GbGlnaHQrKztcbiAgICAgICAgICAgICAgICB2YWx1ZXNbaW5kZXhdID0gbWF5YmVQcm9taXNlO1xuICAgICAgICAgICAgICAgIG1heWJlUHJvbWlzZS5fcHJveHkodGhpcywgKGluZGV4ICsgMSkgKiAtMSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgoKGJpdEZpZWxkICYgMzM1NTQ0MzIpICE9PSAwKSkge1xuICAgICAgICAgICAgICAgIHJldCA9IG1heWJlUHJvbWlzZS5fdmFsdWUoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoKChiaXRGaWVsZCAmIDE2Nzc3MjE2KSAhPT0gMCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZWplY3QobWF5YmVQcm9taXNlLl9yZWFzb24oKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuX2NhbmNlbCgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhbHVlc1tpbmRleF0gPSByZXQ7XG4gICAgfVxuICAgIHZhciB0b3RhbFJlc29sdmVkID0gKyt0aGlzLl90b3RhbFJlc29sdmVkO1xuICAgIGlmICh0b3RhbFJlc29sdmVkID49IGxlbmd0aCkge1xuICAgICAgICBpZiAocHJlc2VydmVkVmFsdWVzICE9PSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLl9maWx0ZXIodmFsdWVzLCBwcmVzZXJ2ZWRWYWx1ZXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fcmVzb2x2ZSh2YWx1ZXMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG5NYXBwaW5nUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fZHJhaW5RdWV1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcXVldWUgPSB0aGlzLl9xdWV1ZTtcbiAgICB2YXIgbGltaXQgPSB0aGlzLl9saW1pdDtcbiAgICB2YXIgdmFsdWVzID0gdGhpcy5fdmFsdWVzO1xuICAgIHdoaWxlIChxdWV1ZS5sZW5ndGggPiAwICYmIHRoaXMuX2luRmxpZ2h0IDwgbGltaXQpIHtcbiAgICAgICAgaWYgKHRoaXMuX2lzUmVzb2x2ZWQoKSkgcmV0dXJuO1xuICAgICAgICB2YXIgaW5kZXggPSBxdWV1ZS5wb3AoKTtcbiAgICAgICAgdGhpcy5fcHJvbWlzZUZ1bGZpbGxlZCh2YWx1ZXNbaW5kZXhdLCBpbmRleCk7XG4gICAgfVxufTtcblxuTWFwcGluZ1Byb21pc2VBcnJheS5wcm90b3R5cGUuX2ZpbHRlciA9IGZ1bmN0aW9uIChib29sZWFucywgdmFsdWVzKSB7XG4gICAgdmFyIGxlbiA9IHZhbHVlcy5sZW5ndGg7XG4gICAgdmFyIHJldCA9IG5ldyBBcnJheShsZW4pO1xuICAgIHZhciBqID0gMDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgIGlmIChib29sZWFuc1tpXSkgcmV0W2orK10gPSB2YWx1ZXNbaV07XG4gICAgfVxuICAgIHJldC5sZW5ndGggPSBqO1xuICAgIHRoaXMuX3Jlc29sdmUocmV0KTtcbn07XG5cbk1hcHBpbmdQcm9taXNlQXJyYXkucHJvdG90eXBlLnByZXNlcnZlZFZhbHVlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fcHJlc2VydmVkVmFsdWVzO1xufTtcblxuZnVuY3Rpb24gbWFwKHByb21pc2VzLCBmbiwgb3B0aW9ucywgX2ZpbHRlcikge1xuICAgIGlmICh0eXBlb2YgZm4gIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICByZXR1cm4gYXBpUmVqZWN0aW9uKFwiZXhwZWN0aW5nIGEgZnVuY3Rpb24gYnV0IGdvdCBcIiArIHV0aWwuY2xhc3NTdHJpbmcoZm4pKTtcbiAgICB9XG5cbiAgICB2YXIgbGltaXQgPSAwO1xuICAgIGlmIChvcHRpb25zICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSBcIm9iamVjdFwiICYmIG9wdGlvbnMgIT09IG51bGwpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5jb25jdXJyZW5jeSAhPT0gXCJudW1iZXJcIikge1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChcbiAgICAgICAgICAgICAgICAgICAgbmV3IFR5cGVFcnJvcihcIidjb25jdXJyZW5jeScgbXVzdCBiZSBhIG51bWJlciBidXQgaXQgaXMgXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXRpbC5jbGFzc1N0cmluZyhvcHRpb25zLmNvbmN1cnJlbmN5KSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGltaXQgPSBvcHRpb25zLmNvbmN1cnJlbmN5O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJvcHRpb25zIGFyZ3VtZW50IG11c3QgYmUgYW4gb2JqZWN0IGJ1dCBpdCBpcyBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHV0aWwuY2xhc3NTdHJpbmcob3B0aW9ucykpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBsaW1pdCA9IHR5cGVvZiBsaW1pdCA9PT0gXCJudW1iZXJcIiAmJlxuICAgICAgICBpc0Zpbml0ZShsaW1pdCkgJiYgbGltaXQgPj0gMSA/IGxpbWl0IDogMDtcbiAgICByZXR1cm4gbmV3IE1hcHBpbmdQcm9taXNlQXJyYXkocHJvbWlzZXMsIGZuLCBsaW1pdCwgX2ZpbHRlcikucHJvbWlzZSgpO1xufVxuXG5Qcm9taXNlLnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbiAoZm4sIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gbWFwKHRoaXMsIGZuLCBvcHRpb25zLCBudWxsKTtcbn07XG5cblByb21pc2UubWFwID0gZnVuY3Rpb24gKHByb21pc2VzLCBmbiwgb3B0aW9ucywgX2ZpbHRlcikge1xuICAgIHJldHVybiBtYXAocHJvbWlzZXMsIGZuLCBvcHRpb25zLCBfZmlsdGVyKTtcbn07XG5cblxufTtcblxufSx7XCIuL3V0aWxcIjozNn1dLDE5OltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPVxuZnVuY3Rpb24oUHJvbWlzZSwgSU5URVJOQUwsIHRyeUNvbnZlcnRUb1Byb21pc2UsIGFwaVJlamVjdGlvbiwgZGVidWcpIHtcbnZhciB1dGlsID0gX2RlcmVxXyhcIi4vdXRpbFwiKTtcbnZhciB0cnlDYXRjaCA9IHV0aWwudHJ5Q2F0Y2g7XG5cblByb21pc2UubWV0aG9kID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHRocm93IG5ldyBQcm9taXNlLlR5cGVFcnJvcihcImV4cGVjdGluZyBhIGZ1bmN0aW9uIGJ1dCBnb3QgXCIgKyB1dGlsLmNsYXNzU3RyaW5nKGZuKSk7XG4gICAgfVxuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciByZXQgPSBuZXcgUHJvbWlzZShJTlRFUk5BTCk7XG4gICAgICAgIHJldC5fY2FwdHVyZVN0YWNrVHJhY2UoKTtcbiAgICAgICAgcmV0Ll9wdXNoQ29udGV4dCgpO1xuICAgICAgICB2YXIgdmFsdWUgPSB0cnlDYXRjaChmbikuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgdmFyIHByb21pc2VDcmVhdGVkID0gcmV0Ll9wb3BDb250ZXh0KCk7XG4gICAgICAgIGRlYnVnLmNoZWNrRm9yZ290dGVuUmV0dXJucyhcbiAgICAgICAgICAgIHZhbHVlLCBwcm9taXNlQ3JlYXRlZCwgXCJQcm9taXNlLm1ldGhvZFwiLCByZXQpO1xuICAgICAgICByZXQuX3Jlc29sdmVGcm9tU3luY1ZhbHVlKHZhbHVlKTtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xufTtcblxuUHJvbWlzZS5hdHRlbXB0ID0gUHJvbWlzZVtcInRyeVwiXSA9IGZ1bmN0aW9uIChmbikge1xuICAgIGlmICh0eXBlb2YgZm4gIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICByZXR1cm4gYXBpUmVqZWN0aW9uKFwiZXhwZWN0aW5nIGEgZnVuY3Rpb24gYnV0IGdvdCBcIiArIHV0aWwuY2xhc3NTdHJpbmcoZm4pKTtcbiAgICB9XG4gICAgdmFyIHJldCA9IG5ldyBQcm9taXNlKElOVEVSTkFMKTtcbiAgICByZXQuX2NhcHR1cmVTdGFja1RyYWNlKCk7XG4gICAgcmV0Ll9wdXNoQ29udGV4dCgpO1xuICAgIHZhciB2YWx1ZTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZGVidWcuZGVwcmVjYXRlZChcImNhbGxpbmcgUHJvbWlzZS50cnkgd2l0aCBtb3JlIHRoYW4gMSBhcmd1bWVudFwiKTtcbiAgICAgICAgdmFyIGFyZyA9IGFyZ3VtZW50c1sxXTtcbiAgICAgICAgdmFyIGN0eCA9IGFyZ3VtZW50c1syXTtcbiAgICAgICAgdmFsdWUgPSB1dGlsLmlzQXJyYXkoYXJnKSA/IHRyeUNhdGNoKGZuKS5hcHBseShjdHgsIGFyZylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IHRyeUNhdGNoKGZuKS5jYWxsKGN0eCwgYXJnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YWx1ZSA9IHRyeUNhdGNoKGZuKSgpO1xuICAgIH1cbiAgICB2YXIgcHJvbWlzZUNyZWF0ZWQgPSByZXQuX3BvcENvbnRleHQoKTtcbiAgICBkZWJ1Zy5jaGVja0ZvcmdvdHRlblJldHVybnMoXG4gICAgICAgIHZhbHVlLCBwcm9taXNlQ3JlYXRlZCwgXCJQcm9taXNlLnRyeVwiLCByZXQpO1xuICAgIHJldC5fcmVzb2x2ZUZyb21TeW5jVmFsdWUodmFsdWUpO1xuICAgIHJldHVybiByZXQ7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fcmVzb2x2ZUZyb21TeW5jVmFsdWUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICBpZiAodmFsdWUgPT09IHV0aWwuZXJyb3JPYmopIHtcbiAgICAgICAgdGhpcy5fcmVqZWN0Q2FsbGJhY2sodmFsdWUuZSwgZmFsc2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3Jlc29sdmVDYWxsYmFjayh2YWx1ZSwgdHJ1ZSk7XG4gICAgfVxufTtcbn07XG5cbn0se1wiLi91dGlsXCI6MzZ9XSwyMDpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbnZhciB1dGlsID0gX2RlcmVxXyhcIi4vdXRpbFwiKTtcbnZhciBtYXliZVdyYXBBc0Vycm9yID0gdXRpbC5tYXliZVdyYXBBc0Vycm9yO1xudmFyIGVycm9ycyA9IF9kZXJlcV8oXCIuL2Vycm9yc1wiKTtcbnZhciBPcGVyYXRpb25hbEVycm9yID0gZXJyb3JzLk9wZXJhdGlvbmFsRXJyb3I7XG52YXIgZXM1ID0gX2RlcmVxXyhcIi4vZXM1XCIpO1xuXG5mdW5jdGlvbiBpc1VudHlwZWRFcnJvcihvYmopIHtcbiAgICByZXR1cm4gb2JqIGluc3RhbmNlb2YgRXJyb3IgJiZcbiAgICAgICAgZXM1LmdldFByb3RvdHlwZU9mKG9iaikgPT09IEVycm9yLnByb3RvdHlwZTtcbn1cblxudmFyIHJFcnJvcktleSA9IC9eKD86bmFtZXxtZXNzYWdlfHN0YWNrfGNhdXNlKSQvO1xuZnVuY3Rpb24gd3JhcEFzT3BlcmF0aW9uYWxFcnJvcihvYmopIHtcbiAgICB2YXIgcmV0O1xuICAgIGlmIChpc1VudHlwZWRFcnJvcihvYmopKSB7XG4gICAgICAgIHJldCA9IG5ldyBPcGVyYXRpb25hbEVycm9yKG9iaik7XG4gICAgICAgIHJldC5uYW1lID0gb2JqLm5hbWU7XG4gICAgICAgIHJldC5tZXNzYWdlID0gb2JqLm1lc3NhZ2U7XG4gICAgICAgIHJldC5zdGFjayA9IG9iai5zdGFjaztcbiAgICAgICAgdmFyIGtleXMgPSBlczUua2V5cyhvYmopO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgICAgICAgaWYgKCFyRXJyb3JLZXkudGVzdChrZXkpKSB7XG4gICAgICAgICAgICAgICAgcmV0W2tleV0gPSBvYmpba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cbiAgICB1dGlsLm1hcmtBc09yaWdpbmF0aW5nRnJvbVJlamVjdGlvbihvYmopO1xuICAgIHJldHVybiBvYmo7XG59XG5cbmZ1bmN0aW9uIG5vZGViYWNrRm9yUHJvbWlzZShwcm9taXNlLCBtdWx0aUFyZ3MpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oZXJyLCB2YWx1ZSkge1xuICAgICAgICBpZiAocHJvbWlzZSA9PT0gbnVsbCkgcmV0dXJuO1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICB2YXIgd3JhcHBlZCA9IHdyYXBBc09wZXJhdGlvbmFsRXJyb3IobWF5YmVXcmFwQXNFcnJvcihlcnIpKTtcbiAgICAgICAgICAgIHByb21pc2UuX2F0dGFjaEV4dHJhVHJhY2Uod3JhcHBlZCk7XG4gICAgICAgICAgICBwcm9taXNlLl9yZWplY3Qod3JhcHBlZCk7XG4gICAgICAgIH0gZWxzZSBpZiAoIW11bHRpQXJncykge1xuICAgICAgICAgICAgcHJvbWlzZS5fZnVsZmlsbCh2YWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTs7XG4gICAgICAgICAgICBwcm9taXNlLl9mdWxmaWxsKGFyZ3MpO1xuICAgICAgICB9XG4gICAgICAgIHByb21pc2UgPSBudWxsO1xuICAgIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbm9kZWJhY2tGb3JQcm9taXNlO1xuXG59LHtcIi4vZXJyb3JzXCI6MTIsXCIuL2VzNVwiOjEzLFwiLi91dGlsXCI6MzZ9XSwyMTpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oUHJvbWlzZSkge1xudmFyIHV0aWwgPSBfZGVyZXFfKFwiLi91dGlsXCIpO1xudmFyIGFzeW5jID0gUHJvbWlzZS5fYXN5bmM7XG52YXIgdHJ5Q2F0Y2ggPSB1dGlsLnRyeUNhdGNoO1xudmFyIGVycm9yT2JqID0gdXRpbC5lcnJvck9iajtcblxuZnVuY3Rpb24gc3ByZWFkQWRhcHRlcih2YWwsIG5vZGViYWNrKSB7XG4gICAgdmFyIHByb21pc2UgPSB0aGlzO1xuICAgIGlmICghdXRpbC5pc0FycmF5KHZhbCkpIHJldHVybiBzdWNjZXNzQWRhcHRlci5jYWxsKHByb21pc2UsIHZhbCwgbm9kZWJhY2spO1xuICAgIHZhciByZXQgPVxuICAgICAgICB0cnlDYXRjaChub2RlYmFjaykuYXBwbHkocHJvbWlzZS5fYm91bmRWYWx1ZSgpLCBbbnVsbF0uY29uY2F0KHZhbCkpO1xuICAgIGlmIChyZXQgPT09IGVycm9yT2JqKSB7XG4gICAgICAgIGFzeW5jLnRocm93TGF0ZXIocmV0LmUpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gc3VjY2Vzc0FkYXB0ZXIodmFsLCBub2RlYmFjaykge1xuICAgIHZhciBwcm9taXNlID0gdGhpcztcbiAgICB2YXIgcmVjZWl2ZXIgPSBwcm9taXNlLl9ib3VuZFZhbHVlKCk7XG4gICAgdmFyIHJldCA9IHZhbCA9PT0gdW5kZWZpbmVkXG4gICAgICAgID8gdHJ5Q2F0Y2gobm9kZWJhY2spLmNhbGwocmVjZWl2ZXIsIG51bGwpXG4gICAgICAgIDogdHJ5Q2F0Y2gobm9kZWJhY2spLmNhbGwocmVjZWl2ZXIsIG51bGwsIHZhbCk7XG4gICAgaWYgKHJldCA9PT0gZXJyb3JPYmopIHtcbiAgICAgICAgYXN5bmMudGhyb3dMYXRlcihyZXQuZSk7XG4gICAgfVxufVxuZnVuY3Rpb24gZXJyb3JBZGFwdGVyKHJlYXNvbiwgbm9kZWJhY2spIHtcbiAgICB2YXIgcHJvbWlzZSA9IHRoaXM7XG4gICAgaWYgKCFyZWFzb24pIHtcbiAgICAgICAgdmFyIG5ld1JlYXNvbiA9IG5ldyBFcnJvcihyZWFzb24gKyBcIlwiKTtcbiAgICAgICAgbmV3UmVhc29uLmNhdXNlID0gcmVhc29uO1xuICAgICAgICByZWFzb24gPSBuZXdSZWFzb247XG4gICAgfVxuICAgIHZhciByZXQgPSB0cnlDYXRjaChub2RlYmFjaykuY2FsbChwcm9taXNlLl9ib3VuZFZhbHVlKCksIHJlYXNvbik7XG4gICAgaWYgKHJldCA9PT0gZXJyb3JPYmopIHtcbiAgICAgICAgYXN5bmMudGhyb3dMYXRlcihyZXQuZSk7XG4gICAgfVxufVxuXG5Qcm9taXNlLnByb3RvdHlwZS5hc0NhbGxiYWNrID0gUHJvbWlzZS5wcm90b3R5cGUubm9kZWlmeSA9IGZ1bmN0aW9uIChub2RlYmFjayxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMpIHtcbiAgICBpZiAodHlwZW9mIG5vZGViYWNrID09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICB2YXIgYWRhcHRlciA9IHN1Y2Nlc3NBZGFwdGVyO1xuICAgICAgICBpZiAob3B0aW9ucyAhPT0gdW5kZWZpbmVkICYmIE9iamVjdChvcHRpb25zKS5zcHJlYWQpIHtcbiAgICAgICAgICAgIGFkYXB0ZXIgPSBzcHJlYWRBZGFwdGVyO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3RoZW4oXG4gICAgICAgICAgICBhZGFwdGVyLFxuICAgICAgICAgICAgZXJyb3JBZGFwdGVyLFxuICAgICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgICAgdGhpcyxcbiAgICAgICAgICAgIG5vZGViYWNrXG4gICAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcbn07XG5cbn0se1wiLi91dGlsXCI6MzZ9XSwyMjpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG52YXIgbWFrZVNlbGZSZXNvbHV0aW9uRXJyb3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIG5ldyBUeXBlRXJyb3IoXCJjaXJjdWxhciBwcm9taXNlIHJlc29sdXRpb24gY2hhaW5cXHUwMDBhXFx1MDAwYSAgICBTZWUgaHR0cDovL2dvby5nbC9NcXJGbVhcXHUwMDBhXCIpO1xufTtcbnZhciByZWZsZWN0SGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZS5Qcm9taXNlSW5zcGVjdGlvbih0aGlzLl90YXJnZXQoKSk7XG59O1xudmFyIGFwaVJlamVjdGlvbiA9IGZ1bmN0aW9uKG1zZykge1xuICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgVHlwZUVycm9yKG1zZykpO1xufTtcbmZ1bmN0aW9uIFByb3h5YWJsZSgpIHt9XG52YXIgVU5ERUZJTkVEX0JJTkRJTkcgPSB7fTtcbnZhciB1dGlsID0gX2RlcmVxXyhcIi4vdXRpbFwiKTtcblxudmFyIGdldERvbWFpbjtcbmlmICh1dGlsLmlzTm9kZSkge1xuICAgIGdldERvbWFpbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmV0ID0gcHJvY2Vzcy5kb21haW47XG4gICAgICAgIGlmIChyZXQgPT09IHVuZGVmaW5lZCkgcmV0ID0gbnVsbDtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xufSBlbHNlIHtcbiAgICBnZXREb21haW4gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfTtcbn1cbnV0aWwubm90RW51bWVyYWJsZVByb3AoUHJvbWlzZSwgXCJfZ2V0RG9tYWluXCIsIGdldERvbWFpbik7XG5cbnZhciBlczUgPSBfZGVyZXFfKFwiLi9lczVcIik7XG52YXIgQXN5bmMgPSBfZGVyZXFfKFwiLi9hc3luY1wiKTtcbnZhciBhc3luYyA9IG5ldyBBc3luYygpO1xuZXM1LmRlZmluZVByb3BlcnR5KFByb21pc2UsIFwiX2FzeW5jXCIsIHt2YWx1ZTogYXN5bmN9KTtcbnZhciBlcnJvcnMgPSBfZGVyZXFfKFwiLi9lcnJvcnNcIik7XG52YXIgVHlwZUVycm9yID0gUHJvbWlzZS5UeXBlRXJyb3IgPSBlcnJvcnMuVHlwZUVycm9yO1xuUHJvbWlzZS5SYW5nZUVycm9yID0gZXJyb3JzLlJhbmdlRXJyb3I7XG52YXIgQ2FuY2VsbGF0aW9uRXJyb3IgPSBQcm9taXNlLkNhbmNlbGxhdGlvbkVycm9yID0gZXJyb3JzLkNhbmNlbGxhdGlvbkVycm9yO1xuUHJvbWlzZS5UaW1lb3V0RXJyb3IgPSBlcnJvcnMuVGltZW91dEVycm9yO1xuUHJvbWlzZS5PcGVyYXRpb25hbEVycm9yID0gZXJyb3JzLk9wZXJhdGlvbmFsRXJyb3I7XG5Qcm9taXNlLlJlamVjdGlvbkVycm9yID0gZXJyb3JzLk9wZXJhdGlvbmFsRXJyb3I7XG5Qcm9taXNlLkFnZ3JlZ2F0ZUVycm9yID0gZXJyb3JzLkFnZ3JlZ2F0ZUVycm9yO1xudmFyIElOVEVSTkFMID0gZnVuY3Rpb24oKXt9O1xudmFyIEFQUExZID0ge307XG52YXIgTkVYVF9GSUxURVIgPSB7fTtcbnZhciB0cnlDb252ZXJ0VG9Qcm9taXNlID0gX2RlcmVxXyhcIi4vdGhlbmFibGVzXCIpKFByb21pc2UsIElOVEVSTkFMKTtcbnZhciBQcm9taXNlQXJyYXkgPVxuICAgIF9kZXJlcV8oXCIuL3Byb21pc2VfYXJyYXlcIikoUHJvbWlzZSwgSU5URVJOQUwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5Q29udmVydFRvUHJvbWlzZSwgYXBpUmVqZWN0aW9uLCBQcm94eWFibGUpO1xudmFyIENvbnRleHQgPSBfZGVyZXFfKFwiLi9jb250ZXh0XCIpKFByb21pc2UpO1xuIC8qanNoaW50IHVudXNlZDpmYWxzZSovXG52YXIgY3JlYXRlQ29udGV4dCA9IENvbnRleHQuY3JlYXRlO1xudmFyIGRlYnVnID0gX2RlcmVxXyhcIi4vZGVidWdnYWJpbGl0eVwiKShQcm9taXNlLCBDb250ZXh0KTtcbnZhciBDYXB0dXJlZFRyYWNlID0gZGVidWcuQ2FwdHVyZWRUcmFjZTtcbnZhciBQYXNzVGhyb3VnaEhhbmRsZXJDb250ZXh0ID1cbiAgICBfZGVyZXFfKFwiLi9maW5hbGx5XCIpKFByb21pc2UsIHRyeUNvbnZlcnRUb1Byb21pc2UsIE5FWFRfRklMVEVSKTtcbnZhciBjYXRjaEZpbHRlciA9IF9kZXJlcV8oXCIuL2NhdGNoX2ZpbHRlclwiKShORVhUX0ZJTFRFUik7XG52YXIgbm9kZWJhY2tGb3JQcm9taXNlID0gX2RlcmVxXyhcIi4vbm9kZWJhY2tcIik7XG52YXIgZXJyb3JPYmogPSB1dGlsLmVycm9yT2JqO1xudmFyIHRyeUNhdGNoID0gdXRpbC50cnlDYXRjaDtcbmZ1bmN0aW9uIGNoZWNrKHNlbGYsIGV4ZWN1dG9yKSB7XG4gICAgaWYgKHNlbGYgPT0gbnVsbCB8fCBzZWxmLmNvbnN0cnVjdG9yICE9PSBQcm9taXNlKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJ0aGUgcHJvbWlzZSBjb25zdHJ1Y3RvciBjYW5ub3QgYmUgaW52b2tlZCBkaXJlY3RseVxcdTAwMGFcXHUwMDBhICAgIFNlZSBodHRwOi8vZ29vLmdsL01xckZtWFxcdTAwMGFcIik7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgZXhlY3V0b3IgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiZXhwZWN0aW5nIGEgZnVuY3Rpb24gYnV0IGdvdCBcIiArIHV0aWwuY2xhc3NTdHJpbmcoZXhlY3V0b3IpKTtcbiAgICB9XG5cbn1cblxuZnVuY3Rpb24gUHJvbWlzZShleGVjdXRvcikge1xuICAgIGlmIChleGVjdXRvciAhPT0gSU5URVJOQUwpIHtcbiAgICAgICAgY2hlY2sodGhpcywgZXhlY3V0b3IpO1xuICAgIH1cbiAgICB0aGlzLl9iaXRGaWVsZCA9IDA7XG4gICAgdGhpcy5fZnVsZmlsbG1lbnRIYW5kbGVyMCA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9yZWplY3Rpb25IYW5kbGVyMCA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9wcm9taXNlMCA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9yZWNlaXZlcjAgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fcmVzb2x2ZUZyb21FeGVjdXRvcihleGVjdXRvcik7XG4gICAgdGhpcy5fcHJvbWlzZUNyZWF0ZWQoKTtcbiAgICB0aGlzLl9maXJlRXZlbnQoXCJwcm9taXNlQ3JlYXRlZFwiLCB0aGlzKTtcbn1cblxuUHJvbWlzZS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFwiW29iamVjdCBQcm9taXNlXVwiO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuY2F1Z2h0ID0gUHJvbWlzZS5wcm90b3R5cGVbXCJjYXRjaFwiXSA9IGZ1bmN0aW9uIChmbikge1xuICAgIHZhciBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGlmIChsZW4gPiAxKSB7XG4gICAgICAgIHZhciBjYXRjaEluc3RhbmNlcyA9IG5ldyBBcnJheShsZW4gLSAxKSxcbiAgICAgICAgICAgIGogPSAwLCBpO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuIC0gMTsgKytpKSB7XG4gICAgICAgICAgICB2YXIgaXRlbSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgICAgIGlmICh1dGlsLmlzT2JqZWN0KGl0ZW0pKSB7XG4gICAgICAgICAgICAgICAgY2F0Y2hJbnN0YW5jZXNbaisrXSA9IGl0ZW07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBhcGlSZWplY3Rpb24oXCJDYXRjaCBzdGF0ZW1lbnQgcHJlZGljYXRlOiBcIiArXG4gICAgICAgICAgICAgICAgICAgIFwiZXhwZWN0aW5nIGFuIG9iamVjdCBidXQgZ290IFwiICsgdXRpbC5jbGFzc1N0cmluZyhpdGVtKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2hJbnN0YW5jZXMubGVuZ3RoID0gajtcbiAgICAgICAgZm4gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIHJldHVybiB0aGlzLnRoZW4odW5kZWZpbmVkLCBjYXRjaEZpbHRlcihjYXRjaEluc3RhbmNlcywgZm4sIHRoaXMpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMudGhlbih1bmRlZmluZWQsIGZuKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLnJlZmxlY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3RoZW4ocmVmbGVjdEhhbmRsZXIsXG4gICAgICAgIHJlZmxlY3RIYW5kbGVyLCB1bmRlZmluZWQsIHRoaXMsIHVuZGVmaW5lZCk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS50aGVuID0gZnVuY3Rpb24gKGRpZEZ1bGZpbGwsIGRpZFJlamVjdCkge1xuICAgIGlmIChkZWJ1Zy53YXJuaW5ncygpICYmIGFyZ3VtZW50cy5sZW5ndGggPiAwICYmXG4gICAgICAgIHR5cGVvZiBkaWRGdWxmaWxsICE9PSBcImZ1bmN0aW9uXCIgJiZcbiAgICAgICAgdHlwZW9mIGRpZFJlamVjdCAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHZhciBtc2cgPSBcIi50aGVuKCkgb25seSBhY2NlcHRzIGZ1bmN0aW9ucyBidXQgd2FzIHBhc3NlZDogXCIgK1xuICAgICAgICAgICAgICAgIHV0aWwuY2xhc3NTdHJpbmcoZGlkRnVsZmlsbCk7XG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgbXNnICs9IFwiLCBcIiArIHV0aWwuY2xhc3NTdHJpbmcoZGlkUmVqZWN0KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl93YXJuKG1zZyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl90aGVuKGRpZEZ1bGZpbGwsIGRpZFJlamVjdCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5kb25lID0gZnVuY3Rpb24gKGRpZEZ1bGZpbGwsIGRpZFJlamVjdCkge1xuICAgIHZhciBwcm9taXNlID1cbiAgICAgICAgdGhpcy5fdGhlbihkaWRGdWxmaWxsLCBkaWRSZWplY3QsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQpO1xuICAgIHByb21pc2UuX3NldElzRmluYWwoKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLnNwcmVhZCA9IGZ1bmN0aW9uIChmbikge1xuICAgIGlmICh0eXBlb2YgZm4gIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICByZXR1cm4gYXBpUmVqZWN0aW9uKFwiZXhwZWN0aW5nIGEgZnVuY3Rpb24gYnV0IGdvdCBcIiArIHV0aWwuY2xhc3NTdHJpbmcoZm4pKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuYWxsKCkuX3RoZW4oZm4sIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBBUFBMWSwgdW5kZWZpbmVkKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcmV0ID0ge1xuICAgICAgICBpc0Z1bGZpbGxlZDogZmFsc2UsXG4gICAgICAgIGlzUmVqZWN0ZWQ6IGZhbHNlLFxuICAgICAgICBmdWxmaWxsbWVudFZhbHVlOiB1bmRlZmluZWQsXG4gICAgICAgIHJlamVjdGlvblJlYXNvbjogdW5kZWZpbmVkXG4gICAgfTtcbiAgICBpZiAodGhpcy5pc0Z1bGZpbGxlZCgpKSB7XG4gICAgICAgIHJldC5mdWxmaWxsbWVudFZhbHVlID0gdGhpcy52YWx1ZSgpO1xuICAgICAgICByZXQuaXNGdWxmaWxsZWQgPSB0cnVlO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc1JlamVjdGVkKCkpIHtcbiAgICAgICAgcmV0LnJlamVjdGlvblJlYXNvbiA9IHRoaXMucmVhc29uKCk7XG4gICAgICAgIHJldC5pc1JlamVjdGVkID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy5fd2FybihcIi5hbGwoKSB3YXMgcGFzc2VkIGFyZ3VtZW50cyBidXQgaXQgZG9lcyBub3QgdGFrZSBhbnlcIik7XG4gICAgfVxuICAgIHJldHVybiBuZXcgUHJvbWlzZUFycmF5KHRoaXMpLnByb21pc2UoKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgcmV0dXJuIHRoaXMuY2F1Z2h0KHV0aWwub3JpZ2luYXRlc0Zyb21SZWplY3Rpb24sIGZuKTtcbn07XG5cblByb21pc2UuZ2V0TmV3TGlicmFyeUNvcHkgPSBtb2R1bGUuZXhwb3J0cztcblxuUHJvbWlzZS5pcyA9IGZ1bmN0aW9uICh2YWwpIHtcbiAgICByZXR1cm4gdmFsIGluc3RhbmNlb2YgUHJvbWlzZTtcbn07XG5cblByb21pc2UuZnJvbU5vZGUgPSBQcm9taXNlLmZyb21DYWxsYmFjayA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgdmFyIHJldCA9IG5ldyBQcm9taXNlKElOVEVSTkFMKTtcbiAgICByZXQuX2NhcHR1cmVTdGFja1RyYWNlKCk7XG4gICAgdmFyIG11bHRpQXJncyA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gISFPYmplY3QoYXJndW1lbnRzWzFdKS5tdWx0aUFyZ3NcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBmYWxzZTtcbiAgICB2YXIgcmVzdWx0ID0gdHJ5Q2F0Y2goZm4pKG5vZGViYWNrRm9yUHJvbWlzZShyZXQsIG11bHRpQXJncykpO1xuICAgIGlmIChyZXN1bHQgPT09IGVycm9yT2JqKSB7XG4gICAgICAgIHJldC5fcmVqZWN0Q2FsbGJhY2socmVzdWx0LmUsIHRydWUpO1xuICAgIH1cbiAgICBpZiAoIXJldC5faXNGYXRlU2VhbGVkKCkpIHJldC5fc2V0QXN5bmNHdWFyYW50ZWVkKCk7XG4gICAgcmV0dXJuIHJldDtcbn07XG5cblByb21pc2UuYWxsID0gZnVuY3Rpb24gKHByb21pc2VzKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlQXJyYXkocHJvbWlzZXMpLnByb21pc2UoKTtcbn07XG5cblByb21pc2UuY2FzdCA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICB2YXIgcmV0ID0gdHJ5Q29udmVydFRvUHJvbWlzZShvYmopO1xuICAgIGlmICghKHJldCBpbnN0YW5jZW9mIFByb21pc2UpKSB7XG4gICAgICAgIHJldCA9IG5ldyBQcm9taXNlKElOVEVSTkFMKTtcbiAgICAgICAgcmV0Ll9jYXB0dXJlU3RhY2tUcmFjZSgpO1xuICAgICAgICByZXQuX3NldEZ1bGZpbGxlZCgpO1xuICAgICAgICByZXQuX3JlamVjdGlvbkhhbmRsZXIwID0gb2JqO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xufTtcblxuUHJvbWlzZS5yZXNvbHZlID0gUHJvbWlzZS5mdWxmaWxsZWQgPSBQcm9taXNlLmNhc3Q7XG5cblByb21pc2UucmVqZWN0ID0gUHJvbWlzZS5yZWplY3RlZCA9IGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICB2YXIgcmV0ID0gbmV3IFByb21pc2UoSU5URVJOQUwpO1xuICAgIHJldC5fY2FwdHVyZVN0YWNrVHJhY2UoKTtcbiAgICByZXQuX3JlamVjdENhbGxiYWNrKHJlYXNvbiwgdHJ1ZSk7XG4gICAgcmV0dXJuIHJldDtcbn07XG5cblByb21pc2Uuc2V0U2NoZWR1bGVyID0gZnVuY3Rpb24oZm4pIHtcbiAgICBpZiAodHlwZW9mIGZuICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImV4cGVjdGluZyBhIGZ1bmN0aW9uIGJ1dCBnb3QgXCIgKyB1dGlsLmNsYXNzU3RyaW5nKGZuKSk7XG4gICAgfVxuICAgIHJldHVybiBhc3luYy5zZXRTY2hlZHVsZXIoZm4pO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3RoZW4gPSBmdW5jdGlvbiAoXG4gICAgZGlkRnVsZmlsbCxcbiAgICBkaWRSZWplY3QsXG4gICAgXywgICAgcmVjZWl2ZXIsXG4gICAgaW50ZXJuYWxEYXRhXG4pIHtcbiAgICB2YXIgaGF2ZUludGVybmFsRGF0YSA9IGludGVybmFsRGF0YSAhPT0gdW5kZWZpbmVkO1xuICAgIHZhciBwcm9taXNlID0gaGF2ZUludGVybmFsRGF0YSA/IGludGVybmFsRGF0YSA6IG5ldyBQcm9taXNlKElOVEVSTkFMKTtcbiAgICB2YXIgdGFyZ2V0ID0gdGhpcy5fdGFyZ2V0KCk7XG4gICAgdmFyIGJpdEZpZWxkID0gdGFyZ2V0Ll9iaXRGaWVsZDtcblxuICAgIGlmICghaGF2ZUludGVybmFsRGF0YSkge1xuICAgICAgICBwcm9taXNlLl9wcm9wYWdhdGVGcm9tKHRoaXMsIDMpO1xuICAgICAgICBwcm9taXNlLl9jYXB0dXJlU3RhY2tUcmFjZSgpO1xuICAgICAgICBpZiAocmVjZWl2ZXIgPT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgKCh0aGlzLl9iaXRGaWVsZCAmIDIwOTcxNTIpICE9PSAwKSkge1xuICAgICAgICAgICAgaWYgKCEoKGJpdEZpZWxkICYgNTAzOTcxODQpID09PSAwKSkge1xuICAgICAgICAgICAgICAgIHJlY2VpdmVyID0gdGhpcy5fYm91bmRWYWx1ZSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWNlaXZlciA9IHRhcmdldCA9PT0gdGhpcyA/IHVuZGVmaW5lZCA6IHRoaXMuX2JvdW5kVG87XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fZmlyZUV2ZW50KFwicHJvbWlzZUNoYWluZWRcIiwgdGhpcywgcHJvbWlzZSk7XG4gICAgfVxuXG4gICAgdmFyIGRvbWFpbiA9IGdldERvbWFpbigpO1xuICAgIGlmICghKChiaXRGaWVsZCAmIDUwMzk3MTg0KSA9PT0gMCkpIHtcbiAgICAgICAgdmFyIGhhbmRsZXIsIHZhbHVlLCBzZXR0bGVyID0gdGFyZ2V0Ll9zZXR0bGVQcm9taXNlQ3R4O1xuICAgICAgICBpZiAoKChiaXRGaWVsZCAmIDMzNTU0NDMyKSAhPT0gMCkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdGFyZ2V0Ll9yZWplY3Rpb25IYW5kbGVyMDtcbiAgICAgICAgICAgIGhhbmRsZXIgPSBkaWRGdWxmaWxsO1xuICAgICAgICB9IGVsc2UgaWYgKCgoYml0RmllbGQgJiAxNjc3NzIxNikgIT09IDApKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHRhcmdldC5fZnVsZmlsbG1lbnRIYW5kbGVyMDtcbiAgICAgICAgICAgIGhhbmRsZXIgPSBkaWRSZWplY3Q7XG4gICAgICAgICAgICB0YXJnZXQuX3Vuc2V0UmVqZWN0aW9uSXNVbmhhbmRsZWQoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNldHRsZXIgPSB0YXJnZXQuX3NldHRsZVByb21pc2VMYXRlQ2FuY2VsbGF0aW9uT2JzZXJ2ZXI7XG4gICAgICAgICAgICB2YWx1ZSA9IG5ldyBDYW5jZWxsYXRpb25FcnJvcihcImxhdGUgY2FuY2VsbGF0aW9uIG9ic2VydmVyXCIpO1xuICAgICAgICAgICAgdGFyZ2V0Ll9hdHRhY2hFeHRyYVRyYWNlKHZhbHVlKTtcbiAgICAgICAgICAgIGhhbmRsZXIgPSBkaWRSZWplY3Q7XG4gICAgICAgIH1cblxuICAgICAgICBhc3luYy5pbnZva2Uoc2V0dGxlciwgdGFyZ2V0LCB7XG4gICAgICAgICAgICBoYW5kbGVyOiBkb21haW4gPT09IG51bGwgPyBoYW5kbGVyXG4gICAgICAgICAgICAgICAgOiAodHlwZW9mIGhhbmRsZXIgPT09IFwiZnVuY3Rpb25cIiAmJlxuICAgICAgICAgICAgICAgICAgICB1dGlsLmRvbWFpbkJpbmQoZG9tYWluLCBoYW5kbGVyKSksXG4gICAgICAgICAgICBwcm9taXNlOiBwcm9taXNlLFxuICAgICAgICAgICAgcmVjZWl2ZXI6IHJlY2VpdmVyLFxuICAgICAgICAgICAgdmFsdWU6IHZhbHVlXG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRhcmdldC5fYWRkQ2FsbGJhY2tzKGRpZEZ1bGZpbGwsIGRpZFJlamVjdCwgcHJvbWlzZSwgcmVjZWl2ZXIsIGRvbWFpbik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb21pc2U7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fbGVuZ3RoID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9iaXRGaWVsZCAmIDY1NTM1O1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX2lzRmF0ZVNlYWxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gKHRoaXMuX2JpdEZpZWxkICYgMTE3NTA2MDQ4KSAhPT0gMDtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9pc0ZvbGxvd2luZyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gKHRoaXMuX2JpdEZpZWxkICYgNjcxMDg4NjQpID09PSA2NzEwODg2NDtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9zZXRMZW5ndGggPSBmdW5jdGlvbiAobGVuKSB7XG4gICAgdGhpcy5fYml0RmllbGQgPSAodGhpcy5fYml0RmllbGQgJiAtNjU1MzYpIHxcbiAgICAgICAgKGxlbiAmIDY1NTM1KTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9zZXRGdWxmaWxsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fYml0RmllbGQgPSB0aGlzLl9iaXRGaWVsZCB8IDMzNTU0NDMyO1xuICAgIHRoaXMuX2ZpcmVFdmVudChcInByb21pc2VGdWxmaWxsZWRcIiwgdGhpcyk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fc2V0UmVqZWN0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fYml0RmllbGQgPSB0aGlzLl9iaXRGaWVsZCB8IDE2Nzc3MjE2O1xuICAgIHRoaXMuX2ZpcmVFdmVudChcInByb21pc2VSZWplY3RlZFwiLCB0aGlzKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9zZXRGb2xsb3dpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fYml0RmllbGQgPSB0aGlzLl9iaXRGaWVsZCB8IDY3MTA4ODY0O1xuICAgIHRoaXMuX2ZpcmVFdmVudChcInByb21pc2VSZXNvbHZlZFwiLCB0aGlzKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9zZXRJc0ZpbmFsID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2JpdEZpZWxkID0gdGhpcy5fYml0RmllbGQgfCA0MTk0MzA0O1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX2lzRmluYWwgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICh0aGlzLl9iaXRGaWVsZCAmIDQxOTQzMDQpID4gMDtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl91bnNldENhbmNlbGxlZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2JpdEZpZWxkID0gdGhpcy5fYml0RmllbGQgJiAofjY1NTM2KTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9zZXRDYW5jZWxsZWQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9iaXRGaWVsZCA9IHRoaXMuX2JpdEZpZWxkIHwgNjU1MzY7XG4gICAgdGhpcy5fZmlyZUV2ZW50KFwicHJvbWlzZUNhbmNlbGxlZFwiLCB0aGlzKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9zZXRXaWxsQmVDYW5jZWxsZWQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9iaXRGaWVsZCA9IHRoaXMuX2JpdEZpZWxkIHwgODM4ODYwODtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9zZXRBc3luY0d1YXJhbnRlZWQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoYXN5bmMuaGFzQ3VzdG9tU2NoZWR1bGVyKCkpIHJldHVybjtcbiAgICB0aGlzLl9iaXRGaWVsZCA9IHRoaXMuX2JpdEZpZWxkIHwgMTM0MjE3NzI4O1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3JlY2VpdmVyQXQgPSBmdW5jdGlvbiAoaW5kZXgpIHtcbiAgICB2YXIgcmV0ID0gaW5kZXggPT09IDAgPyB0aGlzLl9yZWNlaXZlcjAgOiB0aGlzW1xuICAgICAgICAgICAgaW5kZXggKiA0IC0gNCArIDNdO1xuICAgIGlmIChyZXQgPT09IFVOREVGSU5FRF9CSU5ESU5HKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIGlmIChyZXQgPT09IHVuZGVmaW5lZCAmJiB0aGlzLl9pc0JvdW5kKCkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2JvdW5kVmFsdWUoKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9wcm9taXNlQXQgPSBmdW5jdGlvbiAoaW5kZXgpIHtcbiAgICByZXR1cm4gdGhpc1tcbiAgICAgICAgICAgIGluZGV4ICogNCAtIDQgKyAyXTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9mdWxmaWxsbWVudEhhbmRsZXJBdCA9IGZ1bmN0aW9uIChpbmRleCkge1xuICAgIHJldHVybiB0aGlzW1xuICAgICAgICAgICAgaW5kZXggKiA0IC0gNCArIDBdO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3JlamVjdGlvbkhhbmRsZXJBdCA9IGZ1bmN0aW9uIChpbmRleCkge1xuICAgIHJldHVybiB0aGlzW1xuICAgICAgICAgICAgaW5kZXggKiA0IC0gNCArIDFdO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX2JvdW5kVmFsdWUgPSBmdW5jdGlvbigpIHt9O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fbWlncmF0ZUNhbGxiYWNrMCA9IGZ1bmN0aW9uIChmb2xsb3dlcikge1xuICAgIHZhciBiaXRGaWVsZCA9IGZvbGxvd2VyLl9iaXRGaWVsZDtcbiAgICB2YXIgZnVsZmlsbCA9IGZvbGxvd2VyLl9mdWxmaWxsbWVudEhhbmRsZXIwO1xuICAgIHZhciByZWplY3QgPSBmb2xsb3dlci5fcmVqZWN0aW9uSGFuZGxlcjA7XG4gICAgdmFyIHByb21pc2UgPSBmb2xsb3dlci5fcHJvbWlzZTA7XG4gICAgdmFyIHJlY2VpdmVyID0gZm9sbG93ZXIuX3JlY2VpdmVyQXQoMCk7XG4gICAgaWYgKHJlY2VpdmVyID09PSB1bmRlZmluZWQpIHJlY2VpdmVyID0gVU5ERUZJTkVEX0JJTkRJTkc7XG4gICAgdGhpcy5fYWRkQ2FsbGJhY2tzKGZ1bGZpbGwsIHJlamVjdCwgcHJvbWlzZSwgcmVjZWl2ZXIsIG51bGwpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX21pZ3JhdGVDYWxsYmFja0F0ID0gZnVuY3Rpb24gKGZvbGxvd2VyLCBpbmRleCkge1xuICAgIHZhciBmdWxmaWxsID0gZm9sbG93ZXIuX2Z1bGZpbGxtZW50SGFuZGxlckF0KGluZGV4KTtcbiAgICB2YXIgcmVqZWN0ID0gZm9sbG93ZXIuX3JlamVjdGlvbkhhbmRsZXJBdChpbmRleCk7XG4gICAgdmFyIHByb21pc2UgPSBmb2xsb3dlci5fcHJvbWlzZUF0KGluZGV4KTtcbiAgICB2YXIgcmVjZWl2ZXIgPSBmb2xsb3dlci5fcmVjZWl2ZXJBdChpbmRleCk7XG4gICAgaWYgKHJlY2VpdmVyID09PSB1bmRlZmluZWQpIHJlY2VpdmVyID0gVU5ERUZJTkVEX0JJTkRJTkc7XG4gICAgdGhpcy5fYWRkQ2FsbGJhY2tzKGZ1bGZpbGwsIHJlamVjdCwgcHJvbWlzZSwgcmVjZWl2ZXIsIG51bGwpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX2FkZENhbGxiYWNrcyA9IGZ1bmN0aW9uIChcbiAgICBmdWxmaWxsLFxuICAgIHJlamVjdCxcbiAgICBwcm9taXNlLFxuICAgIHJlY2VpdmVyLFxuICAgIGRvbWFpblxuKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5fbGVuZ3RoKCk7XG5cbiAgICBpZiAoaW5kZXggPj0gNjU1MzUgLSA0KSB7XG4gICAgICAgIGluZGV4ID0gMDtcbiAgICAgICAgdGhpcy5fc2V0TGVuZ3RoKDApO1xuICAgIH1cblxuICAgIGlmIChpbmRleCA9PT0gMCkge1xuICAgICAgICB0aGlzLl9wcm9taXNlMCA9IHByb21pc2U7XG4gICAgICAgIHRoaXMuX3JlY2VpdmVyMCA9IHJlY2VpdmVyO1xuICAgICAgICBpZiAodHlwZW9mIGZ1bGZpbGwgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgdGhpcy5fZnVsZmlsbG1lbnRIYW5kbGVyMCA9XG4gICAgICAgICAgICAgICAgZG9tYWluID09PSBudWxsID8gZnVsZmlsbCA6IHV0aWwuZG9tYWluQmluZChkb21haW4sIGZ1bGZpbGwpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgcmVqZWN0ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHRoaXMuX3JlamVjdGlvbkhhbmRsZXIwID1cbiAgICAgICAgICAgICAgICBkb21haW4gPT09IG51bGwgPyByZWplY3QgOiB1dGlsLmRvbWFpbkJpbmQoZG9tYWluLCByZWplY3QpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGJhc2UgPSBpbmRleCAqIDQgLSA0O1xuICAgICAgICB0aGlzW2Jhc2UgKyAyXSA9IHByb21pc2U7XG4gICAgICAgIHRoaXNbYmFzZSArIDNdID0gcmVjZWl2ZXI7XG4gICAgICAgIGlmICh0eXBlb2YgZnVsZmlsbCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICB0aGlzW2Jhc2UgKyAwXSA9XG4gICAgICAgICAgICAgICAgZG9tYWluID09PSBudWxsID8gZnVsZmlsbCA6IHV0aWwuZG9tYWluQmluZChkb21haW4sIGZ1bGZpbGwpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgcmVqZWN0ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHRoaXNbYmFzZSArIDFdID1cbiAgICAgICAgICAgICAgICBkb21haW4gPT09IG51bGwgPyByZWplY3QgOiB1dGlsLmRvbWFpbkJpbmQoZG9tYWluLCByZWplY3QpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRoaXMuX3NldExlbmd0aChpbmRleCArIDEpO1xuICAgIHJldHVybiBpbmRleDtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9wcm94eSA9IGZ1bmN0aW9uIChwcm94eWFibGUsIGFyZykge1xuICAgIHRoaXMuX2FkZENhbGxiYWNrcyh1bmRlZmluZWQsIHVuZGVmaW5lZCwgYXJnLCBwcm94eWFibGUsIG51bGwpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3Jlc29sdmVDYWxsYmFjayA9IGZ1bmN0aW9uKHZhbHVlLCBzaG91bGRCaW5kKSB7XG4gICAgaWYgKCgodGhpcy5fYml0RmllbGQgJiAxMTc1MDYwNDgpICE9PSAwKSkgcmV0dXJuO1xuICAgIGlmICh2YWx1ZSA9PT0gdGhpcylcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JlamVjdENhbGxiYWNrKG1ha2VTZWxmUmVzb2x1dGlvbkVycm9yKCksIGZhbHNlKTtcbiAgICB2YXIgbWF5YmVQcm9taXNlID0gdHJ5Q29udmVydFRvUHJvbWlzZSh2YWx1ZSwgdGhpcyk7XG4gICAgaWYgKCEobWF5YmVQcm9taXNlIGluc3RhbmNlb2YgUHJvbWlzZSkpIHJldHVybiB0aGlzLl9mdWxmaWxsKHZhbHVlKTtcblxuICAgIGlmIChzaG91bGRCaW5kKSB0aGlzLl9wcm9wYWdhdGVGcm9tKG1heWJlUHJvbWlzZSwgMik7XG5cbiAgICB2YXIgcHJvbWlzZSA9IG1heWJlUHJvbWlzZS5fdGFyZ2V0KCk7XG5cbiAgICBpZiAocHJvbWlzZSA9PT0gdGhpcykge1xuICAgICAgICB0aGlzLl9yZWplY3QobWFrZVNlbGZSZXNvbHV0aW9uRXJyb3IoKSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgYml0RmllbGQgPSBwcm9taXNlLl9iaXRGaWVsZDtcbiAgICBpZiAoKChiaXRGaWVsZCAmIDUwMzk3MTg0KSA9PT0gMCkpIHtcbiAgICAgICAgdmFyIGxlbiA9IHRoaXMuX2xlbmd0aCgpO1xuICAgICAgICBpZiAobGVuID4gMCkgcHJvbWlzZS5fbWlncmF0ZUNhbGxiYWNrMCh0aGlzKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBsZW47ICsraSkge1xuICAgICAgICAgICAgcHJvbWlzZS5fbWlncmF0ZUNhbGxiYWNrQXQodGhpcywgaSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fc2V0Rm9sbG93aW5nKCk7XG4gICAgICAgIHRoaXMuX3NldExlbmd0aCgwKTtcbiAgICAgICAgdGhpcy5fc2V0Rm9sbG93ZWUocHJvbWlzZSk7XG4gICAgfSBlbHNlIGlmICgoKGJpdEZpZWxkICYgMzM1NTQ0MzIpICE9PSAwKSkge1xuICAgICAgICB0aGlzLl9mdWxmaWxsKHByb21pc2UuX3ZhbHVlKCkpO1xuICAgIH0gZWxzZSBpZiAoKChiaXRGaWVsZCAmIDE2Nzc3MjE2KSAhPT0gMCkpIHtcbiAgICAgICAgdGhpcy5fcmVqZWN0KHByb21pc2UuX3JlYXNvbigpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgcmVhc29uID0gbmV3IENhbmNlbGxhdGlvbkVycm9yKFwibGF0ZSBjYW5jZWxsYXRpb24gb2JzZXJ2ZXJcIik7XG4gICAgICAgIHByb21pc2UuX2F0dGFjaEV4dHJhVHJhY2UocmVhc29uKTtcbiAgICAgICAgdGhpcy5fcmVqZWN0KHJlYXNvbik7XG4gICAgfVxufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3JlamVjdENhbGxiYWNrID1cbmZ1bmN0aW9uKHJlYXNvbiwgc3luY2hyb25vdXMsIGlnbm9yZU5vbkVycm9yV2FybmluZ3MpIHtcbiAgICB2YXIgdHJhY2UgPSB1dGlsLmVuc3VyZUVycm9yT2JqZWN0KHJlYXNvbik7XG4gICAgdmFyIGhhc1N0YWNrID0gdHJhY2UgPT09IHJlYXNvbjtcbiAgICBpZiAoIWhhc1N0YWNrICYmICFpZ25vcmVOb25FcnJvcldhcm5pbmdzICYmIGRlYnVnLndhcm5pbmdzKCkpIHtcbiAgICAgICAgdmFyIG1lc3NhZ2UgPSBcImEgcHJvbWlzZSB3YXMgcmVqZWN0ZWQgd2l0aCBhIG5vbi1lcnJvcjogXCIgK1xuICAgICAgICAgICAgdXRpbC5jbGFzc1N0cmluZyhyZWFzb24pO1xuICAgICAgICB0aGlzLl93YXJuKG1lc3NhZ2UsIHRydWUpO1xuICAgIH1cbiAgICB0aGlzLl9hdHRhY2hFeHRyYVRyYWNlKHRyYWNlLCBzeW5jaHJvbm91cyA/IGhhc1N0YWNrIDogZmFsc2UpO1xuICAgIHRoaXMuX3JlamVjdChyZWFzb24pO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3Jlc29sdmVGcm9tRXhlY3V0b3IgPSBmdW5jdGlvbiAoZXhlY3V0b3IpIHtcbiAgICBpZiAoZXhlY3V0b3IgPT09IElOVEVSTkFMKSByZXR1cm47XG4gICAgdmFyIHByb21pc2UgPSB0aGlzO1xuICAgIHRoaXMuX2NhcHR1cmVTdGFja1RyYWNlKCk7XG4gICAgdGhpcy5fcHVzaENvbnRleHQoKTtcbiAgICB2YXIgc3luY2hyb25vdXMgPSB0cnVlO1xuICAgIHZhciByID0gdGhpcy5fZXhlY3V0ZShleGVjdXRvciwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgcHJvbWlzZS5fcmVzb2x2ZUNhbGxiYWNrKHZhbHVlKTtcbiAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIHByb21pc2UuX3JlamVjdENhbGxiYWNrKHJlYXNvbiwgc3luY2hyb25vdXMpO1xuICAgIH0pO1xuICAgIHN5bmNocm9ub3VzID0gZmFsc2U7XG4gICAgdGhpcy5fcG9wQ29udGV4dCgpO1xuXG4gICAgaWYgKHIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBwcm9taXNlLl9yZWplY3RDYWxsYmFjayhyLCB0cnVlKTtcbiAgICB9XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fc2V0dGxlUHJvbWlzZUZyb21IYW5kbGVyID0gZnVuY3Rpb24gKFxuICAgIGhhbmRsZXIsIHJlY2VpdmVyLCB2YWx1ZSwgcHJvbWlzZVxuKSB7XG4gICAgdmFyIGJpdEZpZWxkID0gcHJvbWlzZS5fYml0RmllbGQ7XG4gICAgaWYgKCgoYml0RmllbGQgJiA2NTUzNikgIT09IDApKSByZXR1cm47XG4gICAgcHJvbWlzZS5fcHVzaENvbnRleHQoKTtcbiAgICB2YXIgeDtcbiAgICBpZiAocmVjZWl2ZXIgPT09IEFQUExZKSB7XG4gICAgICAgIGlmICghdmFsdWUgfHwgdHlwZW9mIHZhbHVlLmxlbmd0aCAhPT0gXCJudW1iZXJcIikge1xuICAgICAgICAgICAgeCA9IGVycm9yT2JqO1xuICAgICAgICAgICAgeC5lID0gbmV3IFR5cGVFcnJvcihcImNhbm5vdCAuc3ByZWFkKCkgYSBub24tYXJyYXk6IFwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHV0aWwuY2xhc3NTdHJpbmcodmFsdWUpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHggPSB0cnlDYXRjaChoYW5kbGVyKS5hcHBseSh0aGlzLl9ib3VuZFZhbHVlKCksIHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHggPSB0cnlDYXRjaChoYW5kbGVyKS5jYWxsKHJlY2VpdmVyLCB2YWx1ZSk7XG4gICAgfVxuICAgIHZhciBwcm9taXNlQ3JlYXRlZCA9IHByb21pc2UuX3BvcENvbnRleHQoKTtcbiAgICBiaXRGaWVsZCA9IHByb21pc2UuX2JpdEZpZWxkO1xuICAgIGlmICgoKGJpdEZpZWxkICYgNjU1MzYpICE9PSAwKSkgcmV0dXJuO1xuXG4gICAgaWYgKHggPT09IE5FWFRfRklMVEVSKSB7XG4gICAgICAgIHByb21pc2UuX3JlamVjdCh2YWx1ZSk7XG4gICAgfSBlbHNlIGlmICh4ID09PSBlcnJvck9iaikge1xuICAgICAgICBwcm9taXNlLl9yZWplY3RDYWxsYmFjayh4LmUsIGZhbHNlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBkZWJ1Zy5jaGVja0ZvcmdvdHRlblJldHVybnMoeCwgcHJvbWlzZUNyZWF0ZWQsIFwiXCIsICBwcm9taXNlLCB0aGlzKTtcbiAgICAgICAgcHJvbWlzZS5fcmVzb2x2ZUNhbGxiYWNrKHgpO1xuICAgIH1cbn07XG5cblByb21pc2UucHJvdG90eXBlLl90YXJnZXQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcmV0ID0gdGhpcztcbiAgICB3aGlsZSAocmV0Ll9pc0ZvbGxvd2luZygpKSByZXQgPSByZXQuX2ZvbGxvd2VlKCk7XG4gICAgcmV0dXJuIHJldDtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9mb2xsb3dlZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9yZWplY3Rpb25IYW5kbGVyMDtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9zZXRGb2xsb3dlZSA9IGZ1bmN0aW9uKHByb21pc2UpIHtcbiAgICB0aGlzLl9yZWplY3Rpb25IYW5kbGVyMCA9IHByb21pc2U7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fc2V0dGxlUHJvbWlzZSA9IGZ1bmN0aW9uKHByb21pc2UsIGhhbmRsZXIsIHJlY2VpdmVyLCB2YWx1ZSkge1xuICAgIHZhciBpc1Byb21pc2UgPSBwcm9taXNlIGluc3RhbmNlb2YgUHJvbWlzZTtcbiAgICB2YXIgYml0RmllbGQgPSB0aGlzLl9iaXRGaWVsZDtcbiAgICB2YXIgYXN5bmNHdWFyYW50ZWVkID0gKChiaXRGaWVsZCAmIDEzNDIxNzcyOCkgIT09IDApO1xuICAgIGlmICgoKGJpdEZpZWxkICYgNjU1MzYpICE9PSAwKSkge1xuICAgICAgICBpZiAoaXNQcm9taXNlKSBwcm9taXNlLl9pbnZva2VJbnRlcm5hbE9uQ2FuY2VsKCk7XG5cbiAgICAgICAgaWYgKHJlY2VpdmVyIGluc3RhbmNlb2YgUGFzc1Rocm91Z2hIYW5kbGVyQ29udGV4dCAmJlxuICAgICAgICAgICAgcmVjZWl2ZXIuaXNGaW5hbGx5SGFuZGxlcigpKSB7XG4gICAgICAgICAgICByZWNlaXZlci5jYW5jZWxQcm9taXNlID0gcHJvbWlzZTtcbiAgICAgICAgICAgIGlmICh0cnlDYXRjaChoYW5kbGVyKS5jYWxsKHJlY2VpdmVyLCB2YWx1ZSkgPT09IGVycm9yT2JqKSB7XG4gICAgICAgICAgICAgICAgcHJvbWlzZS5fcmVqZWN0KGVycm9yT2JqLmUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGhhbmRsZXIgPT09IHJlZmxlY3RIYW5kbGVyKSB7XG4gICAgICAgICAgICBwcm9taXNlLl9mdWxmaWxsKHJlZmxlY3RIYW5kbGVyLmNhbGwocmVjZWl2ZXIpKTtcbiAgICAgICAgfSBlbHNlIGlmIChyZWNlaXZlciBpbnN0YW5jZW9mIFByb3h5YWJsZSkge1xuICAgICAgICAgICAgcmVjZWl2ZXIuX3Byb21pc2VDYW5jZWxsZWQocHJvbWlzZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNQcm9taXNlIHx8IHByb21pc2UgaW5zdGFuY2VvZiBQcm9taXNlQXJyYXkpIHtcbiAgICAgICAgICAgIHByb21pc2UuX2NhbmNlbCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVjZWl2ZXIuY2FuY2VsKCk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBoYW5kbGVyID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgaWYgKCFpc1Byb21pc2UpIHtcbiAgICAgICAgICAgIGhhbmRsZXIuY2FsbChyZWNlaXZlciwgdmFsdWUsIHByb21pc2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGFzeW5jR3VhcmFudGVlZCkgcHJvbWlzZS5fc2V0QXN5bmNHdWFyYW50ZWVkKCk7XG4gICAgICAgICAgICB0aGlzLl9zZXR0bGVQcm9taXNlRnJvbUhhbmRsZXIoaGFuZGxlciwgcmVjZWl2ZXIsIHZhbHVlLCBwcm9taXNlKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAocmVjZWl2ZXIgaW5zdGFuY2VvZiBQcm94eWFibGUpIHtcbiAgICAgICAgaWYgKCFyZWNlaXZlci5faXNSZXNvbHZlZCgpKSB7XG4gICAgICAgICAgICBpZiAoKChiaXRGaWVsZCAmIDMzNTU0NDMyKSAhPT0gMCkpIHtcbiAgICAgICAgICAgICAgICByZWNlaXZlci5fcHJvbWlzZUZ1bGZpbGxlZCh2YWx1ZSwgcHJvbWlzZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlY2VpdmVyLl9wcm9taXNlUmVqZWN0ZWQodmFsdWUsIHByb21pc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChpc1Byb21pc2UpIHtcbiAgICAgICAgaWYgKGFzeW5jR3VhcmFudGVlZCkgcHJvbWlzZS5fc2V0QXN5bmNHdWFyYW50ZWVkKCk7XG4gICAgICAgIGlmICgoKGJpdEZpZWxkICYgMzM1NTQ0MzIpICE9PSAwKSkge1xuICAgICAgICAgICAgcHJvbWlzZS5fZnVsZmlsbCh2YWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwcm9taXNlLl9yZWplY3QodmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3NldHRsZVByb21pc2VMYXRlQ2FuY2VsbGF0aW9uT2JzZXJ2ZXIgPSBmdW5jdGlvbihjdHgpIHtcbiAgICB2YXIgaGFuZGxlciA9IGN0eC5oYW5kbGVyO1xuICAgIHZhciBwcm9taXNlID0gY3R4LnByb21pc2U7XG4gICAgdmFyIHJlY2VpdmVyID0gY3R4LnJlY2VpdmVyO1xuICAgIHZhciB2YWx1ZSA9IGN0eC52YWx1ZTtcbiAgICBpZiAodHlwZW9mIGhhbmRsZXIgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBpZiAoIShwcm9taXNlIGluc3RhbmNlb2YgUHJvbWlzZSkpIHtcbiAgICAgICAgICAgIGhhbmRsZXIuY2FsbChyZWNlaXZlciwgdmFsdWUsIHByb21pc2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fc2V0dGxlUHJvbWlzZUZyb21IYW5kbGVyKGhhbmRsZXIsIHJlY2VpdmVyLCB2YWx1ZSwgcHJvbWlzZSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHByb21pc2UgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgIHByb21pc2UuX3JlamVjdCh2YWx1ZSk7XG4gICAgfVxufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3NldHRsZVByb21pc2VDdHggPSBmdW5jdGlvbihjdHgpIHtcbiAgICB0aGlzLl9zZXR0bGVQcm9taXNlKGN0eC5wcm9taXNlLCBjdHguaGFuZGxlciwgY3R4LnJlY2VpdmVyLCBjdHgudmFsdWUpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3NldHRsZVByb21pc2UwID0gZnVuY3Rpb24oaGFuZGxlciwgdmFsdWUsIGJpdEZpZWxkKSB7XG4gICAgdmFyIHByb21pc2UgPSB0aGlzLl9wcm9taXNlMDtcbiAgICB2YXIgcmVjZWl2ZXIgPSB0aGlzLl9yZWNlaXZlckF0KDApO1xuICAgIHRoaXMuX3Byb21pc2UwID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX3JlY2VpdmVyMCA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9zZXR0bGVQcm9taXNlKHByb21pc2UsIGhhbmRsZXIsIHJlY2VpdmVyLCB2YWx1ZSk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fY2xlYXJDYWxsYmFja0RhdGFBdEluZGV4ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICB2YXIgYmFzZSA9IGluZGV4ICogNCAtIDQ7XG4gICAgdGhpc1tiYXNlICsgMl0gPVxuICAgIHRoaXNbYmFzZSArIDNdID1cbiAgICB0aGlzW2Jhc2UgKyAwXSA9XG4gICAgdGhpc1tiYXNlICsgMV0gPSB1bmRlZmluZWQ7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fZnVsZmlsbCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHZhciBiaXRGaWVsZCA9IHRoaXMuX2JpdEZpZWxkO1xuICAgIGlmICgoKGJpdEZpZWxkICYgMTE3NTA2MDQ4KSA+Pj4gMTYpKSByZXR1cm47XG4gICAgaWYgKHZhbHVlID09PSB0aGlzKSB7XG4gICAgICAgIHZhciBlcnIgPSBtYWtlU2VsZlJlc29sdXRpb25FcnJvcigpO1xuICAgICAgICB0aGlzLl9hdHRhY2hFeHRyYVRyYWNlKGVycik7XG4gICAgICAgIHJldHVybiB0aGlzLl9yZWplY3QoZXJyKTtcbiAgICB9XG4gICAgdGhpcy5fc2V0RnVsZmlsbGVkKCk7XG4gICAgdGhpcy5fcmVqZWN0aW9uSGFuZGxlcjAgPSB2YWx1ZTtcblxuICAgIGlmICgoYml0RmllbGQgJiA2NTUzNSkgPiAwKSB7XG4gICAgICAgIGlmICgoKGJpdEZpZWxkICYgMTM0MjE3NzI4KSAhPT0gMCkpIHtcbiAgICAgICAgICAgIHRoaXMuX3NldHRsZVByb21pc2VzKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhc3luYy5zZXR0bGVQcm9taXNlcyh0aGlzKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblByb21pc2UucHJvdG90eXBlLl9yZWplY3QgPSBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgdmFyIGJpdEZpZWxkID0gdGhpcy5fYml0RmllbGQ7XG4gICAgaWYgKCgoYml0RmllbGQgJiAxMTc1MDYwNDgpID4+PiAxNikpIHJldHVybjtcbiAgICB0aGlzLl9zZXRSZWplY3RlZCgpO1xuICAgIHRoaXMuX2Z1bGZpbGxtZW50SGFuZGxlcjAgPSByZWFzb247XG5cbiAgICBpZiAodGhpcy5faXNGaW5hbCgpKSB7XG4gICAgICAgIHJldHVybiBhc3luYy5mYXRhbEVycm9yKHJlYXNvbiwgdXRpbC5pc05vZGUpO1xuICAgIH1cblxuICAgIGlmICgoYml0RmllbGQgJiA2NTUzNSkgPiAwKSB7XG4gICAgICAgIGFzeW5jLnNldHRsZVByb21pc2VzKHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2Vuc3VyZVBvc3NpYmxlUmVqZWN0aW9uSGFuZGxlZCgpO1xuICAgIH1cbn07XG5cblByb21pc2UucHJvdG90eXBlLl9mdWxmaWxsUHJvbWlzZXMgPSBmdW5jdGlvbiAobGVuLCB2YWx1ZSkge1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgdmFyIGhhbmRsZXIgPSB0aGlzLl9mdWxmaWxsbWVudEhhbmRsZXJBdChpKTtcbiAgICAgICAgdmFyIHByb21pc2UgPSB0aGlzLl9wcm9taXNlQXQoaSk7XG4gICAgICAgIHZhciByZWNlaXZlciA9IHRoaXMuX3JlY2VpdmVyQXQoaSk7XG4gICAgICAgIHRoaXMuX2NsZWFyQ2FsbGJhY2tEYXRhQXRJbmRleChpKTtcbiAgICAgICAgdGhpcy5fc2V0dGxlUHJvbWlzZShwcm9taXNlLCBoYW5kbGVyLCByZWNlaXZlciwgdmFsdWUpO1xuICAgIH1cbn07XG5cblByb21pc2UucHJvdG90eXBlLl9yZWplY3RQcm9taXNlcyA9IGZ1bmN0aW9uIChsZW4sIHJlYXNvbikge1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgdmFyIGhhbmRsZXIgPSB0aGlzLl9yZWplY3Rpb25IYW5kbGVyQXQoaSk7XG4gICAgICAgIHZhciBwcm9taXNlID0gdGhpcy5fcHJvbWlzZUF0KGkpO1xuICAgICAgICB2YXIgcmVjZWl2ZXIgPSB0aGlzLl9yZWNlaXZlckF0KGkpO1xuICAgICAgICB0aGlzLl9jbGVhckNhbGxiYWNrRGF0YUF0SW5kZXgoaSk7XG4gICAgICAgIHRoaXMuX3NldHRsZVByb21pc2UocHJvbWlzZSwgaGFuZGxlciwgcmVjZWl2ZXIsIHJlYXNvbik7XG4gICAgfVxufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuX3NldHRsZVByb21pc2VzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBiaXRGaWVsZCA9IHRoaXMuX2JpdEZpZWxkO1xuICAgIHZhciBsZW4gPSAoYml0RmllbGQgJiA2NTUzNSk7XG5cbiAgICBpZiAobGVuID4gMCkge1xuICAgICAgICBpZiAoKChiaXRGaWVsZCAmIDE2ODQyNzUyKSAhPT0gMCkpIHtcbiAgICAgICAgICAgIHZhciByZWFzb24gPSB0aGlzLl9mdWxmaWxsbWVudEhhbmRsZXIwO1xuICAgICAgICAgICAgdGhpcy5fc2V0dGxlUHJvbWlzZTAodGhpcy5fcmVqZWN0aW9uSGFuZGxlcjAsIHJlYXNvbiwgYml0RmllbGQpO1xuICAgICAgICAgICAgdGhpcy5fcmVqZWN0UHJvbWlzZXMobGVuLCByZWFzb24pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gdGhpcy5fcmVqZWN0aW9uSGFuZGxlcjA7XG4gICAgICAgICAgICB0aGlzLl9zZXR0bGVQcm9taXNlMCh0aGlzLl9mdWxmaWxsbWVudEhhbmRsZXIwLCB2YWx1ZSwgYml0RmllbGQpO1xuICAgICAgICAgICAgdGhpcy5fZnVsZmlsbFByb21pc2VzKGxlbiwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3NldExlbmd0aCgwKTtcbiAgICB9XG4gICAgdGhpcy5fY2xlYXJDYW5jZWxsYXRpb25EYXRhKCk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5fc2V0dGxlZFZhbHVlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGJpdEZpZWxkID0gdGhpcy5fYml0RmllbGQ7XG4gICAgaWYgKCgoYml0RmllbGQgJiAzMzU1NDQzMikgIT09IDApKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yZWplY3Rpb25IYW5kbGVyMDtcbiAgICB9IGVsc2UgaWYgKCgoYml0RmllbGQgJiAxNjc3NzIxNikgIT09IDApKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9mdWxmaWxsbWVudEhhbmRsZXIwO1xuICAgIH1cbn07XG5cbmZ1bmN0aW9uIGRlZmVyUmVzb2x2ZSh2KSB7dGhpcy5wcm9taXNlLl9yZXNvbHZlQ2FsbGJhY2sodik7fVxuZnVuY3Rpb24gZGVmZXJSZWplY3Qodikge3RoaXMucHJvbWlzZS5fcmVqZWN0Q2FsbGJhY2sodiwgZmFsc2UpO31cblxuUHJvbWlzZS5kZWZlciA9IFByb21pc2UucGVuZGluZyA9IGZ1bmN0aW9uKCkge1xuICAgIGRlYnVnLmRlcHJlY2F0ZWQoXCJQcm9taXNlLmRlZmVyXCIsIFwibmV3IFByb21pc2VcIik7XG4gICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShJTlRFUk5BTCk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcHJvbWlzZTogcHJvbWlzZSxcbiAgICAgICAgcmVzb2x2ZTogZGVmZXJSZXNvbHZlLFxuICAgICAgICByZWplY3Q6IGRlZmVyUmVqZWN0XG4gICAgfTtcbn07XG5cbnV0aWwubm90RW51bWVyYWJsZVByb3AoUHJvbWlzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgXCJfbWFrZVNlbGZSZXNvbHV0aW9uRXJyb3JcIixcbiAgICAgICAgICAgICAgICAgICAgICAgbWFrZVNlbGZSZXNvbHV0aW9uRXJyb3IpO1xuXG5fZGVyZXFfKFwiLi9tZXRob2RcIikoUHJvbWlzZSwgSU5URVJOQUwsIHRyeUNvbnZlcnRUb1Byb21pc2UsIGFwaVJlamVjdGlvbixcbiAgICBkZWJ1Zyk7XG5fZGVyZXFfKFwiLi9iaW5kXCIpKFByb21pc2UsIElOVEVSTkFMLCB0cnlDb252ZXJ0VG9Qcm9taXNlLCBkZWJ1Zyk7XG5fZGVyZXFfKFwiLi9jYW5jZWxcIikoUHJvbWlzZSwgUHJvbWlzZUFycmF5LCBhcGlSZWplY3Rpb24sIGRlYnVnKTtcbl9kZXJlcV8oXCIuL2RpcmVjdF9yZXNvbHZlXCIpKFByb21pc2UpO1xuX2RlcmVxXyhcIi4vc3luY2hyb25vdXNfaW5zcGVjdGlvblwiKShQcm9taXNlKTtcbl9kZXJlcV8oXCIuL2pvaW5cIikoXG4gICAgUHJvbWlzZSwgUHJvbWlzZUFycmF5LCB0cnlDb252ZXJ0VG9Qcm9taXNlLCBJTlRFUk5BTCwgYXN5bmMsIGdldERvbWFpbik7XG5Qcm9taXNlLlByb21pc2UgPSBQcm9taXNlO1xuUHJvbWlzZS52ZXJzaW9uID0gXCIzLjUuMFwiO1xuX2RlcmVxXygnLi9tYXAuanMnKShQcm9taXNlLCBQcm9taXNlQXJyYXksIGFwaVJlamVjdGlvbiwgdHJ5Q29udmVydFRvUHJvbWlzZSwgSU5URVJOQUwsIGRlYnVnKTtcbl9kZXJlcV8oJy4vY2FsbF9nZXQuanMnKShQcm9taXNlKTtcbl9kZXJlcV8oJy4vdXNpbmcuanMnKShQcm9taXNlLCBhcGlSZWplY3Rpb24sIHRyeUNvbnZlcnRUb1Byb21pc2UsIGNyZWF0ZUNvbnRleHQsIElOVEVSTkFMLCBkZWJ1Zyk7XG5fZGVyZXFfKCcuL3RpbWVycy5qcycpKFByb21pc2UsIElOVEVSTkFMLCBkZWJ1Zyk7XG5fZGVyZXFfKCcuL2dlbmVyYXRvcnMuanMnKShQcm9taXNlLCBhcGlSZWplY3Rpb24sIElOVEVSTkFMLCB0cnlDb252ZXJ0VG9Qcm9taXNlLCBQcm94eWFibGUsIGRlYnVnKTtcbl9kZXJlcV8oJy4vbm9kZWlmeS5qcycpKFByb21pc2UpO1xuX2RlcmVxXygnLi9wcm9taXNpZnkuanMnKShQcm9taXNlLCBJTlRFUk5BTCk7XG5fZGVyZXFfKCcuL3Byb3BzLmpzJykoUHJvbWlzZSwgUHJvbWlzZUFycmF5LCB0cnlDb252ZXJ0VG9Qcm9taXNlLCBhcGlSZWplY3Rpb24pO1xuX2RlcmVxXygnLi9yYWNlLmpzJykoUHJvbWlzZSwgSU5URVJOQUwsIHRyeUNvbnZlcnRUb1Byb21pc2UsIGFwaVJlamVjdGlvbik7XG5fZGVyZXFfKCcuL3JlZHVjZS5qcycpKFByb21pc2UsIFByb21pc2VBcnJheSwgYXBpUmVqZWN0aW9uLCB0cnlDb252ZXJ0VG9Qcm9taXNlLCBJTlRFUk5BTCwgZGVidWcpO1xuX2RlcmVxXygnLi9zZXR0bGUuanMnKShQcm9taXNlLCBQcm9taXNlQXJyYXksIGRlYnVnKTtcbl9kZXJlcV8oJy4vc29tZS5qcycpKFByb21pc2UsIFByb21pc2VBcnJheSwgYXBpUmVqZWN0aW9uKTtcbl9kZXJlcV8oJy4vZmlsdGVyLmpzJykoUHJvbWlzZSwgSU5URVJOQUwpO1xuX2RlcmVxXygnLi9lYWNoLmpzJykoUHJvbWlzZSwgSU5URVJOQUwpO1xuX2RlcmVxXygnLi9hbnkuanMnKShQcm9taXNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgIHV0aWwudG9GYXN0UHJvcGVydGllcyhQcm9taXNlKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICB1dGlsLnRvRmFzdFByb3BlcnRpZXMoUHJvbWlzZS5wcm90b3R5cGUpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgZnVuY3Rpb24gZmlsbFR5cGVzKHZhbHVlKSB7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICB2YXIgcCA9IG5ldyBQcm9taXNlKElOVEVSTkFMKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgcC5fZnVsZmlsbG1lbnRIYW5kbGVyMCA9IHZhbHVlOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIHAuX3JlamVjdGlvbkhhbmRsZXIwID0gdmFsdWU7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICBwLl9wcm9taXNlMCA9IHZhbHVlOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgcC5fcmVjZWl2ZXIwID0gdmFsdWU7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgfSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgIC8vIENvbXBsZXRlIHNsYWNrIHRyYWNraW5nLCBvcHQgb3V0IG9mIGZpZWxkLXR5cGUgdHJhY2tpbmcgYW5kICAgICAgICAgICBcbiAgICAvLyBzdGFiaWxpemUgbWFwICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgZmlsbFR5cGVzKHthOiAxfSk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgIGZpbGxUeXBlcyh7YjogMn0pOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICBmaWxsVHlwZXMoe2M6IDN9KTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgZmlsbFR5cGVzKDEpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgIGZpbGxUeXBlcyhmdW5jdGlvbigpe30pOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICBmaWxsVHlwZXModW5kZWZpbmVkKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgZmlsbFR5cGVzKGZhbHNlKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgIGZpbGxUeXBlcyhuZXcgUHJvbWlzZShJTlRFUk5BTCkpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICBkZWJ1Zy5zZXRCb3VuZHMoQXN5bmMuZmlyc3RMaW5lRXJyb3IsIHV0aWwubGFzdExpbmVFcnJvcik7ICAgICAgICAgICAgICAgXG4gICAgcmV0dXJuIFByb21pc2U7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuXG59O1xuXG59LHtcIi4vYW55LmpzXCI6MSxcIi4vYXN5bmNcIjoyLFwiLi9iaW5kXCI6MyxcIi4vY2FsbF9nZXQuanNcIjo1LFwiLi9jYW5jZWxcIjo2LFwiLi9jYXRjaF9maWx0ZXJcIjo3LFwiLi9jb250ZXh0XCI6OCxcIi4vZGVidWdnYWJpbGl0eVwiOjksXCIuL2RpcmVjdF9yZXNvbHZlXCI6MTAsXCIuL2VhY2guanNcIjoxMSxcIi4vZXJyb3JzXCI6MTIsXCIuL2VzNVwiOjEzLFwiLi9maWx0ZXIuanNcIjoxNCxcIi4vZmluYWxseVwiOjE1LFwiLi9nZW5lcmF0b3JzLmpzXCI6MTYsXCIuL2pvaW5cIjoxNyxcIi4vbWFwLmpzXCI6MTgsXCIuL21ldGhvZFwiOjE5LFwiLi9ub2RlYmFja1wiOjIwLFwiLi9ub2RlaWZ5LmpzXCI6MjEsXCIuL3Byb21pc2VfYXJyYXlcIjoyMyxcIi4vcHJvbWlzaWZ5LmpzXCI6MjQsXCIuL3Byb3BzLmpzXCI6MjUsXCIuL3JhY2UuanNcIjoyNyxcIi4vcmVkdWNlLmpzXCI6MjgsXCIuL3NldHRsZS5qc1wiOjMwLFwiLi9zb21lLmpzXCI6MzEsXCIuL3N5bmNocm9ub3VzX2luc3BlY3Rpb25cIjozMixcIi4vdGhlbmFibGVzXCI6MzMsXCIuL3RpbWVycy5qc1wiOjM0LFwiLi91c2luZy5qc1wiOjM1LFwiLi91dGlsXCI6MzZ9XSwyMzpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oUHJvbWlzZSwgSU5URVJOQUwsIHRyeUNvbnZlcnRUb1Byb21pc2UsXG4gICAgYXBpUmVqZWN0aW9uLCBQcm94eWFibGUpIHtcbnZhciB1dGlsID0gX2RlcmVxXyhcIi4vdXRpbFwiKTtcbnZhciBpc0FycmF5ID0gdXRpbC5pc0FycmF5O1xuXG5mdW5jdGlvbiB0b1Jlc29sdXRpb25WYWx1ZSh2YWwpIHtcbiAgICBzd2l0Y2godmFsKSB7XG4gICAgY2FzZSAtMjogcmV0dXJuIFtdO1xuICAgIGNhc2UgLTM6IHJldHVybiB7fTtcbiAgICBjYXNlIC02OiByZXR1cm4gbmV3IE1hcCgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gUHJvbWlzZUFycmF5KHZhbHVlcykge1xuICAgIHZhciBwcm9taXNlID0gdGhpcy5fcHJvbWlzZSA9IG5ldyBQcm9taXNlKElOVEVSTkFMKTtcbiAgICBpZiAodmFsdWVzIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICBwcm9taXNlLl9wcm9wYWdhdGVGcm9tKHZhbHVlcywgMyk7XG4gICAgfVxuICAgIHByb21pc2UuX3NldE9uQ2FuY2VsKHRoaXMpO1xuICAgIHRoaXMuX3ZhbHVlcyA9IHZhbHVlcztcbiAgICB0aGlzLl9sZW5ndGggPSAwO1xuICAgIHRoaXMuX3RvdGFsUmVzb2x2ZWQgPSAwO1xuICAgIHRoaXMuX2luaXQodW5kZWZpbmVkLCAtMik7XG59XG51dGlsLmluaGVyaXRzKFByb21pc2VBcnJheSwgUHJveHlhYmxlKTtcblxuUHJvbWlzZUFycmF5LnByb3RvdHlwZS5sZW5ndGggPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2xlbmd0aDtcbn07XG5cblByb21pc2VBcnJheS5wcm90b3R5cGUucHJvbWlzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fcHJvbWlzZTtcbn07XG5cblByb21pc2VBcnJheS5wcm90b3R5cGUuX2luaXQgPSBmdW5jdGlvbiBpbml0KF8sIHJlc29sdmVWYWx1ZUlmRW1wdHkpIHtcbiAgICB2YXIgdmFsdWVzID0gdHJ5Q29udmVydFRvUHJvbWlzZSh0aGlzLl92YWx1ZXMsIHRoaXMuX3Byb21pc2UpO1xuICAgIGlmICh2YWx1ZXMgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgIHZhbHVlcyA9IHZhbHVlcy5fdGFyZ2V0KCk7XG4gICAgICAgIHZhciBiaXRGaWVsZCA9IHZhbHVlcy5fYml0RmllbGQ7XG4gICAgICAgIDtcbiAgICAgICAgdGhpcy5fdmFsdWVzID0gdmFsdWVzO1xuXG4gICAgICAgIGlmICgoKGJpdEZpZWxkICYgNTAzOTcxODQpID09PSAwKSkge1xuICAgICAgICAgICAgdGhpcy5fcHJvbWlzZS5fc2V0QXN5bmNHdWFyYW50ZWVkKCk7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWVzLl90aGVuKFxuICAgICAgICAgICAgICAgIGluaXQsXG4gICAgICAgICAgICAgICAgdGhpcy5fcmVqZWN0LFxuICAgICAgICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICB0aGlzLFxuICAgICAgICAgICAgICAgIHJlc29sdmVWYWx1ZUlmRW1wdHlcbiAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIGlmICgoKGJpdEZpZWxkICYgMzM1NTQ0MzIpICE9PSAwKSkge1xuICAgICAgICAgICAgdmFsdWVzID0gdmFsdWVzLl92YWx1ZSgpO1xuICAgICAgICB9IGVsc2UgaWYgKCgoYml0RmllbGQgJiAxNjc3NzIxNikgIT09IDApKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcmVqZWN0KHZhbHVlcy5fcmVhc29uKCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2NhbmNlbCgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZhbHVlcyA9IHV0aWwuYXNBcnJheSh2YWx1ZXMpO1xuICAgIGlmICh2YWx1ZXMgPT09IG51bGwpIHtcbiAgICAgICAgdmFyIGVyciA9IGFwaVJlamVjdGlvbihcbiAgICAgICAgICAgIFwiZXhwZWN0aW5nIGFuIGFycmF5IG9yIGFuIGl0ZXJhYmxlIG9iamVjdCBidXQgZ290IFwiICsgdXRpbC5jbGFzc1N0cmluZyh2YWx1ZXMpKS5yZWFzb24oKTtcbiAgICAgICAgdGhpcy5fcHJvbWlzZS5fcmVqZWN0Q2FsbGJhY2soZXJyLCBmYWxzZSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodmFsdWVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBpZiAocmVzb2x2ZVZhbHVlSWZFbXB0eSA9PT0gLTUpIHtcbiAgICAgICAgICAgIHRoaXMuX3Jlc29sdmVFbXB0eUFycmF5KCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9yZXNvbHZlKHRvUmVzb2x1dGlvblZhbHVlKHJlc29sdmVWYWx1ZUlmRW1wdHkpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX2l0ZXJhdGUodmFsdWVzKTtcbn07XG5cblByb21pc2VBcnJheS5wcm90b3R5cGUuX2l0ZXJhdGUgPSBmdW5jdGlvbih2YWx1ZXMpIHtcbiAgICB2YXIgbGVuID0gdGhpcy5nZXRBY3R1YWxMZW5ndGgodmFsdWVzLmxlbmd0aCk7XG4gICAgdGhpcy5fbGVuZ3RoID0gbGVuO1xuICAgIHRoaXMuX3ZhbHVlcyA9IHRoaXMuc2hvdWxkQ29weVZhbHVlcygpID8gbmV3IEFycmF5KGxlbikgOiB0aGlzLl92YWx1ZXM7XG4gICAgdmFyIHJlc3VsdCA9IHRoaXMuX3Byb21pc2U7XG4gICAgdmFyIGlzUmVzb2x2ZWQgPSBmYWxzZTtcbiAgICB2YXIgYml0RmllbGQgPSBudWxsO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgdmFyIG1heWJlUHJvbWlzZSA9IHRyeUNvbnZlcnRUb1Byb21pc2UodmFsdWVzW2ldLCByZXN1bHQpO1xuXG4gICAgICAgIGlmIChtYXliZVByb21pc2UgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgICAgICBtYXliZVByb21pc2UgPSBtYXliZVByb21pc2UuX3RhcmdldCgpO1xuICAgICAgICAgICAgYml0RmllbGQgPSBtYXliZVByb21pc2UuX2JpdEZpZWxkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYml0RmllbGQgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzUmVzb2x2ZWQpIHtcbiAgICAgICAgICAgIGlmIChiaXRGaWVsZCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIG1heWJlUHJvbWlzZS5zdXBwcmVzc1VuaGFuZGxlZFJlamVjdGlvbnMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChiaXRGaWVsZCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKCgoYml0RmllbGQgJiA1MDM5NzE4NCkgPT09IDApKSB7XG4gICAgICAgICAgICAgICAgbWF5YmVQcm9taXNlLl9wcm94eSh0aGlzLCBpKTtcbiAgICAgICAgICAgICAgICB0aGlzLl92YWx1ZXNbaV0gPSBtYXliZVByb21pc2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCgoYml0RmllbGQgJiAzMzU1NDQzMikgIT09IDApKSB7XG4gICAgICAgICAgICAgICAgaXNSZXNvbHZlZCA9IHRoaXMuX3Byb21pc2VGdWxmaWxsZWQobWF5YmVQcm9taXNlLl92YWx1ZSgpLCBpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoKChiaXRGaWVsZCAmIDE2Nzc3MjE2KSAhPT0gMCkpIHtcbiAgICAgICAgICAgICAgICBpc1Jlc29sdmVkID0gdGhpcy5fcHJvbWlzZVJlamVjdGVkKG1heWJlUHJvbWlzZS5fcmVhc29uKCksIGkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpc1Jlc29sdmVkID0gdGhpcy5fcHJvbWlzZUNhbmNlbGxlZChpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlzUmVzb2x2ZWQgPSB0aGlzLl9wcm9taXNlRnVsZmlsbGVkKG1heWJlUHJvbWlzZSwgaSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFpc1Jlc29sdmVkKSByZXN1bHQuX3NldEFzeW5jR3VhcmFudGVlZCgpO1xufTtcblxuUHJvbWlzZUFycmF5LnByb3RvdHlwZS5faXNSZXNvbHZlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fdmFsdWVzID09PSBudWxsO1xufTtcblxuUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fcmVzb2x2ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHRoaXMuX3ZhbHVlcyA9IG51bGw7XG4gICAgdGhpcy5fcHJvbWlzZS5fZnVsZmlsbCh2YWx1ZSk7XG59O1xuXG5Qcm9taXNlQXJyYXkucHJvdG90eXBlLl9jYW5jZWwgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5faXNSZXNvbHZlZCgpIHx8ICF0aGlzLl9wcm9taXNlLl9pc0NhbmNlbGxhYmxlKCkpIHJldHVybjtcbiAgICB0aGlzLl92YWx1ZXMgPSBudWxsO1xuICAgIHRoaXMuX3Byb21pc2UuX2NhbmNlbCgpO1xufTtcblxuUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fcmVqZWN0ID0gZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIHRoaXMuX3ZhbHVlcyA9IG51bGw7XG4gICAgdGhpcy5fcHJvbWlzZS5fcmVqZWN0Q2FsbGJhY2socmVhc29uLCBmYWxzZSk7XG59O1xuXG5Qcm9taXNlQXJyYXkucHJvdG90eXBlLl9wcm9taXNlRnVsZmlsbGVkID0gZnVuY3Rpb24gKHZhbHVlLCBpbmRleCkge1xuICAgIHRoaXMuX3ZhbHVlc1tpbmRleF0gPSB2YWx1ZTtcbiAgICB2YXIgdG90YWxSZXNvbHZlZCA9ICsrdGhpcy5fdG90YWxSZXNvbHZlZDtcbiAgICBpZiAodG90YWxSZXNvbHZlZCA+PSB0aGlzLl9sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5fcmVzb2x2ZSh0aGlzLl92YWx1ZXMpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fcHJvbWlzZUNhbmNlbGxlZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2NhbmNlbCgpO1xuICAgIHJldHVybiB0cnVlO1xufTtcblxuUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fcHJvbWlzZVJlamVjdGVkID0gZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIHRoaXMuX3RvdGFsUmVzb2x2ZWQrKztcbiAgICB0aGlzLl9yZWplY3QocmVhc29uKTtcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cblByb21pc2VBcnJheS5wcm90b3R5cGUuX3Jlc3VsdENhbmNlbGxlZCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl9pc1Jlc29sdmVkKCkpIHJldHVybjtcbiAgICB2YXIgdmFsdWVzID0gdGhpcy5fdmFsdWVzO1xuICAgIHRoaXMuX2NhbmNlbCgpO1xuICAgIGlmICh2YWx1ZXMgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgIHZhbHVlcy5jYW5jZWwoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZhbHVlcy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgaWYgKHZhbHVlc1tpXSBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXNbaV0uY2FuY2VsKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5Qcm9taXNlQXJyYXkucHJvdG90eXBlLnNob3VsZENvcHlWYWx1ZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG5Qcm9taXNlQXJyYXkucHJvdG90eXBlLmdldEFjdHVhbExlbmd0aCA9IGZ1bmN0aW9uIChsZW4pIHtcbiAgICByZXR1cm4gbGVuO1xufTtcblxucmV0dXJuIFByb21pc2VBcnJheTtcbn07XG5cbn0se1wiLi91dGlsXCI6MzZ9XSwyNDpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oUHJvbWlzZSwgSU5URVJOQUwpIHtcbnZhciBUSElTID0ge307XG52YXIgdXRpbCA9IF9kZXJlcV8oXCIuL3V0aWxcIik7XG52YXIgbm9kZWJhY2tGb3JQcm9taXNlID0gX2RlcmVxXyhcIi4vbm9kZWJhY2tcIik7XG52YXIgd2l0aEFwcGVuZGVkID0gdXRpbC53aXRoQXBwZW5kZWQ7XG52YXIgbWF5YmVXcmFwQXNFcnJvciA9IHV0aWwubWF5YmVXcmFwQXNFcnJvcjtcbnZhciBjYW5FdmFsdWF0ZSA9IHV0aWwuY2FuRXZhbHVhdGU7XG52YXIgVHlwZUVycm9yID0gX2RlcmVxXyhcIi4vZXJyb3JzXCIpLlR5cGVFcnJvcjtcbnZhciBkZWZhdWx0U3VmZml4ID0gXCJBc3luY1wiO1xudmFyIGRlZmF1bHRQcm9taXNpZmllZCA9IHtfX2lzUHJvbWlzaWZpZWRfXzogdHJ1ZX07XG52YXIgbm9Db3B5UHJvcHMgPSBbXG4gICAgXCJhcml0eVwiLCAgICBcImxlbmd0aFwiLFxuICAgIFwibmFtZVwiLFxuICAgIFwiYXJndW1lbnRzXCIsXG4gICAgXCJjYWxsZXJcIixcbiAgICBcImNhbGxlZVwiLFxuICAgIFwicHJvdG90eXBlXCIsXG4gICAgXCJfX2lzUHJvbWlzaWZpZWRfX1wiXG5dO1xudmFyIG5vQ29weVByb3BzUGF0dGVybiA9IG5ldyBSZWdFeHAoXCJeKD86XCIgKyBub0NvcHlQcm9wcy5qb2luKFwifFwiKSArIFwiKSRcIik7XG5cbnZhciBkZWZhdWx0RmlsdGVyID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB1dGlsLmlzSWRlbnRpZmllcihuYW1lKSAmJlxuICAgICAgICBuYW1lLmNoYXJBdCgwKSAhPT0gXCJfXCIgJiZcbiAgICAgICAgbmFtZSAhPT0gXCJjb25zdHJ1Y3RvclwiO1xufTtcblxuZnVuY3Rpb24gcHJvcHNGaWx0ZXIoa2V5KSB7XG4gICAgcmV0dXJuICFub0NvcHlQcm9wc1BhdHRlcm4udGVzdChrZXkpO1xufVxuXG5mdW5jdGlvbiBpc1Byb21pc2lmaWVkKGZuKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGZuLl9faXNQcm9taXNpZmllZF9fID09PSB0cnVlO1xuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBoYXNQcm9taXNpZmllZChvYmosIGtleSwgc3VmZml4KSB7XG4gICAgdmFyIHZhbCA9IHV0aWwuZ2V0RGF0YVByb3BlcnR5T3JEZWZhdWx0KG9iaiwga2V5ICsgc3VmZml4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0UHJvbWlzaWZpZWQpO1xuICAgIHJldHVybiB2YWwgPyBpc1Byb21pc2lmaWVkKHZhbCkgOiBmYWxzZTtcbn1cbmZ1bmN0aW9uIGNoZWNrVmFsaWQocmV0LCBzdWZmaXgsIHN1ZmZpeFJlZ2V4cCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmV0Lmxlbmd0aDsgaSArPSAyKSB7XG4gICAgICAgIHZhciBrZXkgPSByZXRbaV07XG4gICAgICAgIGlmIChzdWZmaXhSZWdleHAudGVzdChrZXkpKSB7XG4gICAgICAgICAgICB2YXIga2V5V2l0aG91dEFzeW5jU3VmZml4ID0ga2V5LnJlcGxhY2Uoc3VmZml4UmVnZXhwLCBcIlwiKTtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgcmV0Lmxlbmd0aDsgaiArPSAyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJldFtqXSA9PT0ga2V5V2l0aG91dEFzeW5jU3VmZml4KSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgcHJvbWlzaWZ5IGFuIEFQSSB0aGF0IGhhcyBub3JtYWwgbWV0aG9kcyB3aXRoICclcyctc3VmZml4XFx1MDAwYVxcdTAwMGEgICAgU2VlIGh0dHA6Ly9nb28uZ2wvTXFyRm1YXFx1MDAwYVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZShcIiVzXCIsIHN1ZmZpeCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gcHJvbWlzaWZpYWJsZU1ldGhvZHMob2JqLCBzdWZmaXgsIHN1ZmZpeFJlZ2V4cCwgZmlsdGVyKSB7XG4gICAgdmFyIGtleXMgPSB1dGlsLmluaGVyaXRlZERhdGFLZXlzKG9iaik7XG4gICAgdmFyIHJldCA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICAgICAgdmFyIHZhbHVlID0gb2JqW2tleV07XG4gICAgICAgIHZhciBwYXNzZXNEZWZhdWx0RmlsdGVyID0gZmlsdGVyID09PSBkZWZhdWx0RmlsdGVyXG4gICAgICAgICAgICA/IHRydWUgOiBkZWZhdWx0RmlsdGVyKGtleSwgdmFsdWUsIG9iaik7XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIiAmJlxuICAgICAgICAgICAgIWlzUHJvbWlzaWZpZWQodmFsdWUpICYmXG4gICAgICAgICAgICAhaGFzUHJvbWlzaWZpZWQob2JqLCBrZXksIHN1ZmZpeCkgJiZcbiAgICAgICAgICAgIGZpbHRlcihrZXksIHZhbHVlLCBvYmosIHBhc3Nlc0RlZmF1bHRGaWx0ZXIpKSB7XG4gICAgICAgICAgICByZXQucHVzaChrZXksIHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBjaGVja1ZhbGlkKHJldCwgc3VmZml4LCBzdWZmaXhSZWdleHApO1xuICAgIHJldHVybiByZXQ7XG59XG5cbnZhciBlc2NhcGVJZGVudFJlZ2V4ID0gZnVuY3Rpb24oc3RyKSB7XG4gICAgcmV0dXJuIHN0ci5yZXBsYWNlKC8oWyRdKS8sIFwiXFxcXCRcIik7XG59O1xuXG52YXIgbWFrZU5vZGVQcm9taXNpZmllZEV2YWw7XG5pZiAoIXRydWUpIHtcbnZhciBzd2l0Y2hDYXNlQXJndW1lbnRPcmRlciA9IGZ1bmN0aW9uKGxpa2VseUFyZ3VtZW50Q291bnQpIHtcbiAgICB2YXIgcmV0ID0gW2xpa2VseUFyZ3VtZW50Q291bnRdO1xuICAgIHZhciBtaW4gPSBNYXRoLm1heCgwLCBsaWtlbHlBcmd1bWVudENvdW50IC0gMSAtIDMpO1xuICAgIGZvcih2YXIgaSA9IGxpa2VseUFyZ3VtZW50Q291bnQgLSAxOyBpID49IG1pbjsgLS1pKSB7XG4gICAgICAgIHJldC5wdXNoKGkpO1xuICAgIH1cbiAgICBmb3IodmFyIGkgPSBsaWtlbHlBcmd1bWVudENvdW50ICsgMTsgaSA8PSAzOyArK2kpIHtcbiAgICAgICAgcmV0LnB1c2goaSk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG59O1xuXG52YXIgYXJndW1lbnRTZXF1ZW5jZSA9IGZ1bmN0aW9uKGFyZ3VtZW50Q291bnQpIHtcbiAgICByZXR1cm4gdXRpbC5maWxsZWRSYW5nZShhcmd1bWVudENvdW50LCBcIl9hcmdcIiwgXCJcIik7XG59O1xuXG52YXIgcGFyYW1ldGVyRGVjbGFyYXRpb24gPSBmdW5jdGlvbihwYXJhbWV0ZXJDb3VudCkge1xuICAgIHJldHVybiB1dGlsLmZpbGxlZFJhbmdlKFxuICAgICAgICBNYXRoLm1heChwYXJhbWV0ZXJDb3VudCwgMyksIFwiX2FyZ1wiLCBcIlwiKTtcbn07XG5cbnZhciBwYXJhbWV0ZXJDb3VudCA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgaWYgKHR5cGVvZiBmbi5sZW5ndGggPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KE1hdGgubWluKGZuLmxlbmd0aCwgMTAyMyArIDEpLCAwKTtcbiAgICB9XG4gICAgcmV0dXJuIDA7XG59O1xuXG5tYWtlTm9kZVByb21pc2lmaWVkRXZhbCA9XG5mdW5jdGlvbihjYWxsYmFjaywgcmVjZWl2ZXIsIG9yaWdpbmFsTmFtZSwgZm4sIF8sIG11bHRpQXJncykge1xuICAgIHZhciBuZXdQYXJhbWV0ZXJDb3VudCA9IE1hdGgubWF4KDAsIHBhcmFtZXRlckNvdW50KGZuKSAtIDEpO1xuICAgIHZhciBhcmd1bWVudE9yZGVyID0gc3dpdGNoQ2FzZUFyZ3VtZW50T3JkZXIobmV3UGFyYW1ldGVyQ291bnQpO1xuICAgIHZhciBzaG91bGRQcm94eVRoaXMgPSB0eXBlb2YgY2FsbGJhY2sgPT09IFwic3RyaW5nXCIgfHwgcmVjZWl2ZXIgPT09IFRISVM7XG5cbiAgICBmdW5jdGlvbiBnZW5lcmF0ZUNhbGxGb3JBcmd1bWVudENvdW50KGNvdW50KSB7XG4gICAgICAgIHZhciBhcmdzID0gYXJndW1lbnRTZXF1ZW5jZShjb3VudCkuam9pbihcIiwgXCIpO1xuICAgICAgICB2YXIgY29tbWEgPSBjb3VudCA+IDAgPyBcIiwgXCIgOiBcIlwiO1xuICAgICAgICB2YXIgcmV0O1xuICAgICAgICBpZiAoc2hvdWxkUHJveHlUaGlzKSB7XG4gICAgICAgICAgICByZXQgPSBcInJldCA9IGNhbGxiYWNrLmNhbGwodGhpcywge3thcmdzfX0sIG5vZGViYWNrKTsgYnJlYWs7XFxuXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXQgPSByZWNlaXZlciA9PT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgPyBcInJldCA9IGNhbGxiYWNrKHt7YXJnc319LCBub2RlYmFjayk7IGJyZWFrO1xcblwiXG4gICAgICAgICAgICAgICAgOiBcInJldCA9IGNhbGxiYWNrLmNhbGwocmVjZWl2ZXIsIHt7YXJnc319LCBub2RlYmFjayk7IGJyZWFrO1xcblwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQucmVwbGFjZShcInt7YXJnc319XCIsIGFyZ3MpLnJlcGxhY2UoXCIsIFwiLCBjb21tYSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2VuZXJhdGVBcmd1bWVudFN3aXRjaENhc2UoKSB7XG4gICAgICAgIHZhciByZXQgPSBcIlwiO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50T3JkZXIubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIHJldCArPSBcImNhc2UgXCIgKyBhcmd1bWVudE9yZGVyW2ldICtcIjpcIiArXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVDYWxsRm9yQXJndW1lbnRDb3VudChhcmd1bWVudE9yZGVyW2ldKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldCArPSBcIiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICBkZWZhdWx0OiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkobGVuICsgMSk7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgdmFyIGkgPSAwOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkgeyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgICAgYXJnc1tpXSA9IGFyZ3VtZW50c1tpXTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgfSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgYXJnc1tpXSA9IG5vZGViYWNrOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgW0NvZGVGb3JDYWxsXSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICAgICAgYnJlYWs7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXG5cXFxuICAgICAgICBcIi5yZXBsYWNlKFwiW0NvZGVGb3JDYWxsXVwiLCAoc2hvdWxkUHJveHlUaGlzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gXCJyZXQgPSBjYWxsYmFjay5hcHBseSh0aGlzLCBhcmdzKTtcXG5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IFwicmV0ID0gY2FsbGJhY2suYXBwbHkocmVjZWl2ZXIsIGFyZ3MpO1xcblwiKSk7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuXG4gICAgdmFyIGdldEZ1bmN0aW9uQ29kZSA9IHR5cGVvZiBjYWxsYmFjayA9PT0gXCJzdHJpbmdcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IChcInRoaXMgIT0gbnVsbCA/IHRoaXNbJ1wiK2NhbGxiYWNrK1wiJ10gOiBmblwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IFwiZm5cIjtcbiAgICB2YXIgYm9keSA9IFwiJ3VzZSBzdHJpY3QnOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxcblxcXG4gICAgICAgIHZhciByZXQgPSBmdW5jdGlvbiAoUGFyYW1ldGVycykgeyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxcblxcXG4gICAgICAgICAgICAndXNlIHN0cmljdCc7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxcblxcXG4gICAgICAgICAgICB2YXIgbGVuID0gYXJndW1lbnRzLmxlbmd0aDsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxcblxcXG4gICAgICAgICAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKElOVEVSTkFMKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxcblxcXG4gICAgICAgICAgICBwcm9taXNlLl9jYXB0dXJlU3RhY2tUcmFjZSgpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxcblxcXG4gICAgICAgICAgICB2YXIgbm9kZWJhY2sgPSBub2RlYmFja0ZvclByb21pc2UocHJvbWlzZSwgXCIgKyBtdWx0aUFyZ3MgKyBcIik7ICAgXFxuXFxcbiAgICAgICAgICAgIHZhciByZXQ7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIHZhciBjYWxsYmFjayA9IHRyeUNhdGNoKFtHZXRGdW5jdGlvbkNvZGVdKTsgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIHN3aXRjaChsZW4pIHsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICBbQ29kZUZvclN3aXRjaENhc2VdICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIH0gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIGlmIChyZXQgPT09IGVycm9yT2JqKSB7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgICAgICBwcm9taXNlLl9yZWplY3RDYWxsYmFjayhtYXliZVdyYXBBc0Vycm9yKHJldC5lKSwgdHJ1ZSwgdHJ1ZSk7XFxuXFxcbiAgICAgICAgICAgIH0gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgICAgIGlmICghcHJvbWlzZS5faXNGYXRlU2VhbGVkKCkpIHByb21pc2UuX3NldEFzeW5jR3VhcmFudGVlZCgpOyAgICAgXFxuXFxcbiAgICAgICAgICAgIHJldHVybiBwcm9taXNlOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgfTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgbm90RW51bWVyYWJsZVByb3AocmV0LCAnX19pc1Byb21pc2lmaWVkX18nLCB0cnVlKTsgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICAgICAgcmV0dXJuIHJldDsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFxuXFxcbiAgICBcIi5yZXBsYWNlKFwiW0NvZGVGb3JTd2l0Y2hDYXNlXVwiLCBnZW5lcmF0ZUFyZ3VtZW50U3dpdGNoQ2FzZSgpKVxuICAgICAgICAucmVwbGFjZShcIltHZXRGdW5jdGlvbkNvZGVdXCIsIGdldEZ1bmN0aW9uQ29kZSk7XG4gICAgYm9keSA9IGJvZHkucmVwbGFjZShcIlBhcmFtZXRlcnNcIiwgcGFyYW1ldGVyRGVjbGFyYXRpb24obmV3UGFyYW1ldGVyQ291bnQpKTtcbiAgICByZXR1cm4gbmV3IEZ1bmN0aW9uKFwiUHJvbWlzZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJmblwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJyZWNlaXZlclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ3aXRoQXBwZW5kZWRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibWF5YmVXcmFwQXNFcnJvclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJub2RlYmFja0ZvclByb21pc2VcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidHJ5Q2F0Y2hcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiZXJyb3JPYmpcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibm90RW51bWVyYWJsZVByb3BcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiSU5URVJOQUxcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvZHkpKFxuICAgICAgICAgICAgICAgICAgICBQcm9taXNlLFxuICAgICAgICAgICAgICAgICAgICBmbixcbiAgICAgICAgICAgICAgICAgICAgcmVjZWl2ZXIsXG4gICAgICAgICAgICAgICAgICAgIHdpdGhBcHBlbmRlZCxcbiAgICAgICAgICAgICAgICAgICAgbWF5YmVXcmFwQXNFcnJvcixcbiAgICAgICAgICAgICAgICAgICAgbm9kZWJhY2tGb3JQcm9taXNlLFxuICAgICAgICAgICAgICAgICAgICB1dGlsLnRyeUNhdGNoLFxuICAgICAgICAgICAgICAgICAgICB1dGlsLmVycm9yT2JqLFxuICAgICAgICAgICAgICAgICAgICB1dGlsLm5vdEVudW1lcmFibGVQcm9wLFxuICAgICAgICAgICAgICAgICAgICBJTlRFUk5BTCk7XG59O1xufVxuXG5mdW5jdGlvbiBtYWtlTm9kZVByb21pc2lmaWVkQ2xvc3VyZShjYWxsYmFjaywgcmVjZWl2ZXIsIF8sIGZuLCBfXywgbXVsdGlBcmdzKSB7XG4gICAgdmFyIGRlZmF1bHRUaGlzID0gKGZ1bmN0aW9uKCkge3JldHVybiB0aGlzO30pKCk7XG4gICAgdmFyIG1ldGhvZCA9IGNhbGxiYWNrO1xuICAgIGlmICh0eXBlb2YgbWV0aG9kID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIGNhbGxiYWNrID0gZm47XG4gICAgfVxuICAgIGZ1bmN0aW9uIHByb21pc2lmaWVkKCkge1xuICAgICAgICB2YXIgX3JlY2VpdmVyID0gcmVjZWl2ZXI7XG4gICAgICAgIGlmIChyZWNlaXZlciA9PT0gVEhJUykgX3JlY2VpdmVyID0gdGhpcztcbiAgICAgICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShJTlRFUk5BTCk7XG4gICAgICAgIHByb21pc2UuX2NhcHR1cmVTdGFja1RyYWNlKCk7XG4gICAgICAgIHZhciBjYiA9IHR5cGVvZiBtZXRob2QgPT09IFwic3RyaW5nXCIgJiYgdGhpcyAhPT0gZGVmYXVsdFRoaXNcbiAgICAgICAgICAgID8gdGhpc1ttZXRob2RdIDogY2FsbGJhY2s7XG4gICAgICAgIHZhciBmbiA9IG5vZGViYWNrRm9yUHJvbWlzZShwcm9taXNlLCBtdWx0aUFyZ3MpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY2IuYXBwbHkoX3JlY2VpdmVyLCB3aXRoQXBwZW5kZWQoYXJndW1lbnRzLCBmbikpO1xuICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgIHByb21pc2UuX3JlamVjdENhbGxiYWNrKG1heWJlV3JhcEFzRXJyb3IoZSksIHRydWUsIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghcHJvbWlzZS5faXNGYXRlU2VhbGVkKCkpIHByb21pc2UuX3NldEFzeW5jR3VhcmFudGVlZCgpO1xuICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9XG4gICAgdXRpbC5ub3RFbnVtZXJhYmxlUHJvcChwcm9taXNpZmllZCwgXCJfX2lzUHJvbWlzaWZpZWRfX1wiLCB0cnVlKTtcbiAgICByZXR1cm4gcHJvbWlzaWZpZWQ7XG59XG5cbnZhciBtYWtlTm9kZVByb21pc2lmaWVkID0gY2FuRXZhbHVhdGVcbiAgICA/IG1ha2VOb2RlUHJvbWlzaWZpZWRFdmFsXG4gICAgOiBtYWtlTm9kZVByb21pc2lmaWVkQ2xvc3VyZTtcblxuZnVuY3Rpb24gcHJvbWlzaWZ5QWxsKG9iaiwgc3VmZml4LCBmaWx0ZXIsIHByb21pc2lmaWVyLCBtdWx0aUFyZ3MpIHtcbiAgICB2YXIgc3VmZml4UmVnZXhwID0gbmV3IFJlZ0V4cChlc2NhcGVJZGVudFJlZ2V4KHN1ZmZpeCkgKyBcIiRcIik7XG4gICAgdmFyIG1ldGhvZHMgPVxuICAgICAgICBwcm9taXNpZmlhYmxlTWV0aG9kcyhvYmosIHN1ZmZpeCwgc3VmZml4UmVnZXhwLCBmaWx0ZXIpO1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IG1ldGhvZHMubGVuZ3RoOyBpIDwgbGVuOyBpKz0gMikge1xuICAgICAgICB2YXIga2V5ID0gbWV0aG9kc1tpXTtcbiAgICAgICAgdmFyIGZuID0gbWV0aG9kc1tpKzFdO1xuICAgICAgICB2YXIgcHJvbWlzaWZpZWRLZXkgPSBrZXkgKyBzdWZmaXg7XG4gICAgICAgIGlmIChwcm9taXNpZmllciA9PT0gbWFrZU5vZGVQcm9taXNpZmllZCkge1xuICAgICAgICAgICAgb2JqW3Byb21pc2lmaWVkS2V5XSA9XG4gICAgICAgICAgICAgICAgbWFrZU5vZGVQcm9taXNpZmllZChrZXksIFRISVMsIGtleSwgZm4sIHN1ZmZpeCwgbXVsdGlBcmdzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBwcm9taXNpZmllZCA9IHByb21pc2lmaWVyKGZuLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWFrZU5vZGVQcm9taXNpZmllZChrZXksIFRISVMsIGtleSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmbiwgc3VmZml4LCBtdWx0aUFyZ3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB1dGlsLm5vdEVudW1lcmFibGVQcm9wKHByb21pc2lmaWVkLCBcIl9faXNQcm9taXNpZmllZF9fXCIsIHRydWUpO1xuICAgICAgICAgICAgb2JqW3Byb21pc2lmaWVkS2V5XSA9IHByb21pc2lmaWVkO1xuICAgICAgICB9XG4gICAgfVxuICAgIHV0aWwudG9GYXN0UHJvcGVydGllcyhvYmopO1xuICAgIHJldHVybiBvYmo7XG59XG5cbmZ1bmN0aW9uIHByb21pc2lmeShjYWxsYmFjaywgcmVjZWl2ZXIsIG11bHRpQXJncykge1xuICAgIHJldHVybiBtYWtlTm9kZVByb21pc2lmaWVkKGNhbGxiYWNrLCByZWNlaXZlciwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjaywgbnVsbCwgbXVsdGlBcmdzKTtcbn1cblxuUHJvbWlzZS5wcm9taXNpZnkgPSBmdW5jdGlvbiAoZm4sIG9wdGlvbnMpIHtcbiAgICBpZiAodHlwZW9mIGZuICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImV4cGVjdGluZyBhIGZ1bmN0aW9uIGJ1dCBnb3QgXCIgKyB1dGlsLmNsYXNzU3RyaW5nKGZuKSk7XG4gICAgfVxuICAgIGlmIChpc1Byb21pc2lmaWVkKGZuKSkge1xuICAgICAgICByZXR1cm4gZm47XG4gICAgfVxuICAgIG9wdGlvbnMgPSBPYmplY3Qob3B0aW9ucyk7XG4gICAgdmFyIHJlY2VpdmVyID0gb3B0aW9ucy5jb250ZXh0ID09PSB1bmRlZmluZWQgPyBUSElTIDogb3B0aW9ucy5jb250ZXh0O1xuICAgIHZhciBtdWx0aUFyZ3MgPSAhIW9wdGlvbnMubXVsdGlBcmdzO1xuICAgIHZhciByZXQgPSBwcm9taXNpZnkoZm4sIHJlY2VpdmVyLCBtdWx0aUFyZ3MpO1xuICAgIHV0aWwuY29weURlc2NyaXB0b3JzKGZuLCByZXQsIHByb3BzRmlsdGVyKTtcbiAgICByZXR1cm4gcmV0O1xufTtcblxuUHJvbWlzZS5wcm9taXNpZnlBbGwgPSBmdW5jdGlvbiAodGFyZ2V0LCBvcHRpb25zKSB7XG4gICAgaWYgKHR5cGVvZiB0YXJnZXQgIT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgdGFyZ2V0ICE9PSBcIm9iamVjdFwiKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJ0aGUgdGFyZ2V0IG9mIHByb21pc2lmeUFsbCBtdXN0IGJlIGFuIG9iamVjdCBvciBhIGZ1bmN0aW9uXFx1MDAwYVxcdTAwMGEgICAgU2VlIGh0dHA6Ly9nb28uZ2wvTXFyRm1YXFx1MDAwYVwiKTtcbiAgICB9XG4gICAgb3B0aW9ucyA9IE9iamVjdChvcHRpb25zKTtcbiAgICB2YXIgbXVsdGlBcmdzID0gISFvcHRpb25zLm11bHRpQXJncztcbiAgICB2YXIgc3VmZml4ID0gb3B0aW9ucy5zdWZmaXg7XG4gICAgaWYgKHR5cGVvZiBzdWZmaXggIT09IFwic3RyaW5nXCIpIHN1ZmZpeCA9IGRlZmF1bHRTdWZmaXg7XG4gICAgdmFyIGZpbHRlciA9IG9wdGlvbnMuZmlsdGVyO1xuICAgIGlmICh0eXBlb2YgZmlsdGVyICE9PSBcImZ1bmN0aW9uXCIpIGZpbHRlciA9IGRlZmF1bHRGaWx0ZXI7XG4gICAgdmFyIHByb21pc2lmaWVyID0gb3B0aW9ucy5wcm9taXNpZmllcjtcbiAgICBpZiAodHlwZW9mIHByb21pc2lmaWVyICE9PSBcImZ1bmN0aW9uXCIpIHByb21pc2lmaWVyID0gbWFrZU5vZGVQcm9taXNpZmllZDtcblxuICAgIGlmICghdXRpbC5pc0lkZW50aWZpZXIoc3VmZml4KSkge1xuICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihcInN1ZmZpeCBtdXN0IGJlIGEgdmFsaWQgaWRlbnRpZmllclxcdTAwMGFcXHUwMDBhICAgIFNlZSBodHRwOi8vZ29vLmdsL01xckZtWFxcdTAwMGFcIik7XG4gICAgfVxuXG4gICAgdmFyIGtleXMgPSB1dGlsLmluaGVyaXRlZERhdGFLZXlzKHRhcmdldCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHRhcmdldFtrZXlzW2ldXTtcbiAgICAgICAgaWYgKGtleXNbaV0gIT09IFwiY29uc3RydWN0b3JcIiAmJlxuICAgICAgICAgICAgdXRpbC5pc0NsYXNzKHZhbHVlKSkge1xuICAgICAgICAgICAgcHJvbWlzaWZ5QWxsKHZhbHVlLnByb3RvdHlwZSwgc3VmZml4LCBmaWx0ZXIsIHByb21pc2lmaWVyLFxuICAgICAgICAgICAgICAgIG11bHRpQXJncyk7XG4gICAgICAgICAgICBwcm9taXNpZnlBbGwodmFsdWUsIHN1ZmZpeCwgZmlsdGVyLCBwcm9taXNpZmllciwgbXVsdGlBcmdzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBwcm9taXNpZnlBbGwodGFyZ2V0LCBzdWZmaXgsIGZpbHRlciwgcHJvbWlzaWZpZXIsIG11bHRpQXJncyk7XG59O1xufTtcblxuXG59LHtcIi4vZXJyb3JzXCI6MTIsXCIuL25vZGViYWNrXCI6MjAsXCIuL3V0aWxcIjozNn1dLDI1OltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihcbiAgICBQcm9taXNlLCBQcm9taXNlQXJyYXksIHRyeUNvbnZlcnRUb1Byb21pc2UsIGFwaVJlamVjdGlvbikge1xudmFyIHV0aWwgPSBfZGVyZXFfKFwiLi91dGlsXCIpO1xudmFyIGlzT2JqZWN0ID0gdXRpbC5pc09iamVjdDtcbnZhciBlczUgPSBfZGVyZXFfKFwiLi9lczVcIik7XG52YXIgRXM2TWFwO1xuaWYgKHR5cGVvZiBNYXAgPT09IFwiZnVuY3Rpb25cIikgRXM2TWFwID0gTWFwO1xuXG52YXIgbWFwVG9FbnRyaWVzID0gKGZ1bmN0aW9uKCkge1xuICAgIHZhciBpbmRleCA9IDA7XG4gICAgdmFyIHNpemUgPSAwO1xuXG4gICAgZnVuY3Rpb24gZXh0cmFjdEVudHJ5KHZhbHVlLCBrZXkpIHtcbiAgICAgICAgdGhpc1tpbmRleF0gPSB2YWx1ZTtcbiAgICAgICAgdGhpc1tpbmRleCArIHNpemVdID0ga2V5O1xuICAgICAgICBpbmRleCsrO1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBtYXBUb0VudHJpZXMobWFwKSB7XG4gICAgICAgIHNpemUgPSBtYXAuc2l6ZTtcbiAgICAgICAgaW5kZXggPSAwO1xuICAgICAgICB2YXIgcmV0ID0gbmV3IEFycmF5KG1hcC5zaXplICogMik7XG4gICAgICAgIG1hcC5mb3JFYWNoKGV4dHJhY3RFbnRyeSwgcmV0KTtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xufSkoKTtcblxudmFyIGVudHJpZXNUb01hcCA9IGZ1bmN0aW9uKGVudHJpZXMpIHtcbiAgICB2YXIgcmV0ID0gbmV3IEVzNk1hcCgpO1xuICAgIHZhciBsZW5ndGggPSBlbnRyaWVzLmxlbmd0aCAvIDIgfCAwO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIGtleSA9IGVudHJpZXNbbGVuZ3RoICsgaV07XG4gICAgICAgIHZhciB2YWx1ZSA9IGVudHJpZXNbaV07XG4gICAgICAgIHJldC5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBQcm9wZXJ0aWVzUHJvbWlzZUFycmF5KG9iaikge1xuICAgIHZhciBpc01hcCA9IGZhbHNlO1xuICAgIHZhciBlbnRyaWVzO1xuICAgIGlmIChFczZNYXAgIT09IHVuZGVmaW5lZCAmJiBvYmogaW5zdGFuY2VvZiBFczZNYXApIHtcbiAgICAgICAgZW50cmllcyA9IG1hcFRvRW50cmllcyhvYmopO1xuICAgICAgICBpc01hcCA9IHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGtleXMgPSBlczUua2V5cyhvYmopO1xuICAgICAgICB2YXIgbGVuID0ga2V5cy5sZW5ndGg7XG4gICAgICAgIGVudHJpZXMgPSBuZXcgQXJyYXkobGVuICogMik7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgICAgICAgZW50cmllc1tpXSA9IG9ialtrZXldO1xuICAgICAgICAgICAgZW50cmllc1tpICsgbGVuXSA9IGtleTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmNvbnN0cnVjdG9yJChlbnRyaWVzKTtcbiAgICB0aGlzLl9pc01hcCA9IGlzTWFwO1xuICAgIHRoaXMuX2luaXQkKHVuZGVmaW5lZCwgaXNNYXAgPyAtNiA6IC0zKTtcbn1cbnV0aWwuaW5oZXJpdHMoUHJvcGVydGllc1Byb21pc2VBcnJheSwgUHJvbWlzZUFycmF5KTtcblxuUHJvcGVydGllc1Byb21pc2VBcnJheS5wcm90b3R5cGUuX2luaXQgPSBmdW5jdGlvbiAoKSB7fTtcblxuUHJvcGVydGllc1Byb21pc2VBcnJheS5wcm90b3R5cGUuX3Byb21pc2VGdWxmaWxsZWQgPSBmdW5jdGlvbiAodmFsdWUsIGluZGV4KSB7XG4gICAgdGhpcy5fdmFsdWVzW2luZGV4XSA9IHZhbHVlO1xuICAgIHZhciB0b3RhbFJlc29sdmVkID0gKyt0aGlzLl90b3RhbFJlc29sdmVkO1xuICAgIGlmICh0b3RhbFJlc29sdmVkID49IHRoaXMuX2xlbmd0aCkge1xuICAgICAgICB2YXIgdmFsO1xuICAgICAgICBpZiAodGhpcy5faXNNYXApIHtcbiAgICAgICAgICAgIHZhbCA9IGVudHJpZXNUb01hcCh0aGlzLl92YWx1ZXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFsID0ge307XG4gICAgICAgICAgICB2YXIga2V5T2Zmc2V0ID0gdGhpcy5sZW5ndGgoKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSB0aGlzLmxlbmd0aCgpOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgICAgICAgICB2YWxbdGhpcy5fdmFsdWVzW2kgKyBrZXlPZmZzZXRdXSA9IHRoaXMuX3ZhbHVlc1tpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9yZXNvbHZlKHZhbCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG5Qcm9wZXJ0aWVzUHJvbWlzZUFycmF5LnByb3RvdHlwZS5zaG91bGRDb3B5VmFsdWVzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZTtcbn07XG5cblByb3BlcnRpZXNQcm9taXNlQXJyYXkucHJvdG90eXBlLmdldEFjdHVhbExlbmd0aCA9IGZ1bmN0aW9uIChsZW4pIHtcbiAgICByZXR1cm4gbGVuID4+IDE7XG59O1xuXG5mdW5jdGlvbiBwcm9wcyhwcm9taXNlcykge1xuICAgIHZhciByZXQ7XG4gICAgdmFyIGNhc3RWYWx1ZSA9IHRyeUNvbnZlcnRUb1Byb21pc2UocHJvbWlzZXMpO1xuXG4gICAgaWYgKCFpc09iamVjdChjYXN0VmFsdWUpKSB7XG4gICAgICAgIHJldHVybiBhcGlSZWplY3Rpb24oXCJjYW5ub3QgYXdhaXQgcHJvcGVydGllcyBvZiBhIG5vbi1vYmplY3RcXHUwMDBhXFx1MDAwYSAgICBTZWUgaHR0cDovL2dvby5nbC9NcXJGbVhcXHUwMDBhXCIpO1xuICAgIH0gZWxzZSBpZiAoY2FzdFZhbHVlIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICByZXQgPSBjYXN0VmFsdWUuX3RoZW4oXG4gICAgICAgICAgICBQcm9taXNlLnByb3BzLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldCA9IG5ldyBQcm9wZXJ0aWVzUHJvbWlzZUFycmF5KGNhc3RWYWx1ZSkucHJvbWlzZSgpO1xuICAgIH1cblxuICAgIGlmIChjYXN0VmFsdWUgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgIHJldC5fcHJvcGFnYXRlRnJvbShjYXN0VmFsdWUsIDIpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xufVxuXG5Qcm9taXNlLnByb3RvdHlwZS5wcm9wcyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gcHJvcHModGhpcyk7XG59O1xuXG5Qcm9taXNlLnByb3BzID0gZnVuY3Rpb24gKHByb21pc2VzKSB7XG4gICAgcmV0dXJuIHByb3BzKHByb21pc2VzKTtcbn07XG59O1xuXG59LHtcIi4vZXM1XCI6MTMsXCIuL3V0aWxcIjozNn1dLDI2OltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuZnVuY3Rpb24gYXJyYXlNb3ZlKHNyYywgc3JjSW5kZXgsIGRzdCwgZHN0SW5kZXgsIGxlbikge1xuICAgIGZvciAodmFyIGogPSAwOyBqIDwgbGVuOyArK2opIHtcbiAgICAgICAgZHN0W2ogKyBkc3RJbmRleF0gPSBzcmNbaiArIHNyY0luZGV4XTtcbiAgICAgICAgc3JjW2ogKyBzcmNJbmRleF0gPSB2b2lkIDA7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBRdWV1ZShjYXBhY2l0eSkge1xuICAgIHRoaXMuX2NhcGFjaXR5ID0gY2FwYWNpdHk7XG4gICAgdGhpcy5fbGVuZ3RoID0gMDtcbiAgICB0aGlzLl9mcm9udCA9IDA7XG59XG5cblF1ZXVlLnByb3RvdHlwZS5fd2lsbEJlT3ZlckNhcGFjaXR5ID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgICByZXR1cm4gdGhpcy5fY2FwYWNpdHkgPCBzaXplO1xufTtcblxuUXVldWUucHJvdG90eXBlLl9wdXNoT25lID0gZnVuY3Rpb24gKGFyZykge1xuICAgIHZhciBsZW5ndGggPSB0aGlzLmxlbmd0aCgpO1xuICAgIHRoaXMuX2NoZWNrQ2FwYWNpdHkobGVuZ3RoICsgMSk7XG4gICAgdmFyIGkgPSAodGhpcy5fZnJvbnQgKyBsZW5ndGgpICYgKHRoaXMuX2NhcGFjaXR5IC0gMSk7XG4gICAgdGhpc1tpXSA9IGFyZztcbiAgICB0aGlzLl9sZW5ndGggPSBsZW5ndGggKyAxO1xufTtcblxuUXVldWUucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbiAoZm4sIHJlY2VpdmVyLCBhcmcpIHtcbiAgICB2YXIgbGVuZ3RoID0gdGhpcy5sZW5ndGgoKSArIDM7XG4gICAgaWYgKHRoaXMuX3dpbGxCZU92ZXJDYXBhY2l0eShsZW5ndGgpKSB7XG4gICAgICAgIHRoaXMuX3B1c2hPbmUoZm4pO1xuICAgICAgICB0aGlzLl9wdXNoT25lKHJlY2VpdmVyKTtcbiAgICAgICAgdGhpcy5fcHVzaE9uZShhcmcpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBqID0gdGhpcy5fZnJvbnQgKyBsZW5ndGggLSAzO1xuICAgIHRoaXMuX2NoZWNrQ2FwYWNpdHkobGVuZ3RoKTtcbiAgICB2YXIgd3JhcE1hc2sgPSB0aGlzLl9jYXBhY2l0eSAtIDE7XG4gICAgdGhpc1soaiArIDApICYgd3JhcE1hc2tdID0gZm47XG4gICAgdGhpc1soaiArIDEpICYgd3JhcE1hc2tdID0gcmVjZWl2ZXI7XG4gICAgdGhpc1soaiArIDIpICYgd3JhcE1hc2tdID0gYXJnO1xuICAgIHRoaXMuX2xlbmd0aCA9IGxlbmd0aDtcbn07XG5cblF1ZXVlLnByb3RvdHlwZS5zaGlmdCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZnJvbnQgPSB0aGlzLl9mcm9udCxcbiAgICAgICAgcmV0ID0gdGhpc1tmcm9udF07XG5cbiAgICB0aGlzW2Zyb250XSA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9mcm9udCA9IChmcm9udCArIDEpICYgKHRoaXMuX2NhcGFjaXR5IC0gMSk7XG4gICAgdGhpcy5fbGVuZ3RoLS07XG4gICAgcmV0dXJuIHJldDtcbn07XG5cblF1ZXVlLnByb3RvdHlwZS5sZW5ndGggPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2xlbmd0aDtcbn07XG5cblF1ZXVlLnByb3RvdHlwZS5fY2hlY2tDYXBhY2l0eSA9IGZ1bmN0aW9uIChzaXplKSB7XG4gICAgaWYgKHRoaXMuX2NhcGFjaXR5IDwgc2l6ZSkge1xuICAgICAgICB0aGlzLl9yZXNpemVUbyh0aGlzLl9jYXBhY2l0eSA8PCAxKTtcbiAgICB9XG59O1xuXG5RdWV1ZS5wcm90b3R5cGUuX3Jlc2l6ZVRvID0gZnVuY3Rpb24gKGNhcGFjaXR5KSB7XG4gICAgdmFyIG9sZENhcGFjaXR5ID0gdGhpcy5fY2FwYWNpdHk7XG4gICAgdGhpcy5fY2FwYWNpdHkgPSBjYXBhY2l0eTtcbiAgICB2YXIgZnJvbnQgPSB0aGlzLl9mcm9udDtcbiAgICB2YXIgbGVuZ3RoID0gdGhpcy5fbGVuZ3RoO1xuICAgIHZhciBtb3ZlSXRlbXNDb3VudCA9IChmcm9udCArIGxlbmd0aCkgJiAob2xkQ2FwYWNpdHkgLSAxKTtcbiAgICBhcnJheU1vdmUodGhpcywgMCwgdGhpcywgb2xkQ2FwYWNpdHksIG1vdmVJdGVtc0NvdW50KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUXVldWU7XG5cbn0se31dLDI3OltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihcbiAgICBQcm9taXNlLCBJTlRFUk5BTCwgdHJ5Q29udmVydFRvUHJvbWlzZSwgYXBpUmVqZWN0aW9uKSB7XG52YXIgdXRpbCA9IF9kZXJlcV8oXCIuL3V0aWxcIik7XG5cbnZhciByYWNlTGF0ZXIgPSBmdW5jdGlvbiAocHJvbWlzZSkge1xuICAgIHJldHVybiBwcm9taXNlLnRoZW4oZnVuY3Rpb24oYXJyYXkpIHtcbiAgICAgICAgcmV0dXJuIHJhY2UoYXJyYXksIHByb21pc2UpO1xuICAgIH0pO1xufTtcblxuZnVuY3Rpb24gcmFjZShwcm9taXNlcywgcGFyZW50KSB7XG4gICAgdmFyIG1heWJlUHJvbWlzZSA9IHRyeUNvbnZlcnRUb1Byb21pc2UocHJvbWlzZXMpO1xuXG4gICAgaWYgKG1heWJlUHJvbWlzZSBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgcmV0dXJuIHJhY2VMYXRlcihtYXliZVByb21pc2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHByb21pc2VzID0gdXRpbC5hc0FycmF5KHByb21pc2VzKTtcbiAgICAgICAgaWYgKHByb21pc2VzID09PSBudWxsKVxuICAgICAgICAgICAgcmV0dXJuIGFwaVJlamVjdGlvbihcImV4cGVjdGluZyBhbiBhcnJheSBvciBhbiBpdGVyYWJsZSBvYmplY3QgYnV0IGdvdCBcIiArIHV0aWwuY2xhc3NTdHJpbmcocHJvbWlzZXMpKTtcbiAgICB9XG5cbiAgICB2YXIgcmV0ID0gbmV3IFByb21pc2UoSU5URVJOQUwpO1xuICAgIGlmIChwYXJlbnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXQuX3Byb3BhZ2F0ZUZyb20ocGFyZW50LCAzKTtcbiAgICB9XG4gICAgdmFyIGZ1bGZpbGwgPSByZXQuX2Z1bGZpbGw7XG4gICAgdmFyIHJlamVjdCA9IHJldC5fcmVqZWN0O1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBwcm9taXNlcy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgICAgICB2YXIgdmFsID0gcHJvbWlzZXNbaV07XG5cbiAgICAgICAgaWYgKHZhbCA9PT0gdW5kZWZpbmVkICYmICEoaSBpbiBwcm9taXNlcykpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgUHJvbWlzZS5jYXN0KHZhbCkuX3RoZW4oZnVsZmlsbCwgcmVqZWN0LCB1bmRlZmluZWQsIHJldCwgbnVsbCk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG59XG5cblByb21pc2UucmFjZSA9IGZ1bmN0aW9uIChwcm9taXNlcykge1xuICAgIHJldHVybiByYWNlKHByb21pc2VzLCB1bmRlZmluZWQpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUucmFjZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gcmFjZSh0aGlzLCB1bmRlZmluZWQpO1xufTtcblxufTtcblxufSx7XCIuL3V0aWxcIjozNn1dLDI4OltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihQcm9taXNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBQcm9taXNlQXJyYXksXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVJlamVjdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5Q29udmVydFRvUHJvbWlzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgSU5URVJOQUwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGRlYnVnKSB7XG52YXIgZ2V0RG9tYWluID0gUHJvbWlzZS5fZ2V0RG9tYWluO1xudmFyIHV0aWwgPSBfZGVyZXFfKFwiLi91dGlsXCIpO1xudmFyIHRyeUNhdGNoID0gdXRpbC50cnlDYXRjaDtcblxuZnVuY3Rpb24gUmVkdWN0aW9uUHJvbWlzZUFycmF5KHByb21pc2VzLCBmbiwgaW5pdGlhbFZhbHVlLCBfZWFjaCkge1xuICAgIHRoaXMuY29uc3RydWN0b3IkKHByb21pc2VzKTtcbiAgICB2YXIgZG9tYWluID0gZ2V0RG9tYWluKCk7XG4gICAgdGhpcy5fZm4gPSBkb21haW4gPT09IG51bGwgPyBmbiA6IHV0aWwuZG9tYWluQmluZChkb21haW4sIGZuKTtcbiAgICBpZiAoaW5pdGlhbFZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaW5pdGlhbFZhbHVlID0gUHJvbWlzZS5yZXNvbHZlKGluaXRpYWxWYWx1ZSk7XG4gICAgICAgIGluaXRpYWxWYWx1ZS5fYXR0YWNoQ2FuY2VsbGF0aW9uQ2FsbGJhY2sodGhpcyk7XG4gICAgfVxuICAgIHRoaXMuX2luaXRpYWxWYWx1ZSA9IGluaXRpYWxWYWx1ZTtcbiAgICB0aGlzLl9jdXJyZW50Q2FuY2VsbGFibGUgPSBudWxsO1xuICAgIGlmKF9lYWNoID09PSBJTlRFUk5BTCkge1xuICAgICAgICB0aGlzLl9lYWNoVmFsdWVzID0gQXJyYXkodGhpcy5fbGVuZ3RoKTtcbiAgICB9IGVsc2UgaWYgKF9lYWNoID09PSAwKSB7XG4gICAgICAgIHRoaXMuX2VhY2hWYWx1ZXMgPSBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2VhY2hWYWx1ZXMgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHRoaXMuX3Byb21pc2UuX2NhcHR1cmVTdGFja1RyYWNlKCk7XG4gICAgdGhpcy5faW5pdCQodW5kZWZpbmVkLCAtNSk7XG59XG51dGlsLmluaGVyaXRzKFJlZHVjdGlvblByb21pc2VBcnJheSwgUHJvbWlzZUFycmF5KTtcblxuUmVkdWN0aW9uUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fZ290QWNjdW0gPSBmdW5jdGlvbihhY2N1bSkge1xuICAgIGlmICh0aGlzLl9lYWNoVmFsdWVzICE9PSB1bmRlZmluZWQgJiYgXG4gICAgICAgIHRoaXMuX2VhY2hWYWx1ZXMgIT09IG51bGwgJiYgXG4gICAgICAgIGFjY3VtICE9PSBJTlRFUk5BTCkge1xuICAgICAgICB0aGlzLl9lYWNoVmFsdWVzLnB1c2goYWNjdW0pO1xuICAgIH1cbn07XG5cblJlZHVjdGlvblByb21pc2VBcnJheS5wcm90b3R5cGUuX2VhY2hDb21wbGV0ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKHRoaXMuX2VhY2hWYWx1ZXMgIT09IG51bGwpIHtcbiAgICAgICAgdGhpcy5fZWFjaFZhbHVlcy5wdXNoKHZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2VhY2hWYWx1ZXM7XG59O1xuXG5SZWR1Y3Rpb25Qcm9taXNlQXJyYXkucHJvdG90eXBlLl9pbml0ID0gZnVuY3Rpb24oKSB7fTtcblxuUmVkdWN0aW9uUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fcmVzb2x2ZUVtcHR5QXJyYXkgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9yZXNvbHZlKHRoaXMuX2VhY2hWYWx1ZXMgIT09IHVuZGVmaW5lZCA/IHRoaXMuX2VhY2hWYWx1ZXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IHRoaXMuX2luaXRpYWxWYWx1ZSk7XG59O1xuXG5SZWR1Y3Rpb25Qcm9taXNlQXJyYXkucHJvdG90eXBlLnNob3VsZENvcHlWYWx1ZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuUmVkdWN0aW9uUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fcmVzb2x2ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdGhpcy5fcHJvbWlzZS5fcmVzb2x2ZUNhbGxiYWNrKHZhbHVlKTtcbiAgICB0aGlzLl92YWx1ZXMgPSBudWxsO1xufTtcblxuUmVkdWN0aW9uUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fcmVzdWx0Q2FuY2VsbGVkID0gZnVuY3Rpb24oc2VuZGVyKSB7XG4gICAgaWYgKHNlbmRlciA9PT0gdGhpcy5faW5pdGlhbFZhbHVlKSByZXR1cm4gdGhpcy5fY2FuY2VsKCk7XG4gICAgaWYgKHRoaXMuX2lzUmVzb2x2ZWQoKSkgcmV0dXJuO1xuICAgIHRoaXMuX3Jlc3VsdENhbmNlbGxlZCQoKTtcbiAgICBpZiAodGhpcy5fY3VycmVudENhbmNlbGxhYmxlIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICB0aGlzLl9jdXJyZW50Q2FuY2VsbGFibGUuY2FuY2VsKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLl9pbml0aWFsVmFsdWUgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgIHRoaXMuX2luaXRpYWxWYWx1ZS5jYW5jZWwoKTtcbiAgICB9XG59O1xuXG5SZWR1Y3Rpb25Qcm9taXNlQXJyYXkucHJvdG90eXBlLl9pdGVyYXRlID0gZnVuY3Rpb24gKHZhbHVlcykge1xuICAgIHRoaXMuX3ZhbHVlcyA9IHZhbHVlcztcbiAgICB2YXIgdmFsdWU7XG4gICAgdmFyIGk7XG4gICAgdmFyIGxlbmd0aCA9IHZhbHVlcy5sZW5ndGg7XG4gICAgaWYgKHRoaXMuX2luaXRpYWxWYWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHZhbHVlID0gdGhpcy5faW5pdGlhbFZhbHVlO1xuICAgICAgICBpID0gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YWx1ZSA9IFByb21pc2UucmVzb2x2ZSh2YWx1ZXNbMF0pO1xuICAgICAgICBpID0gMTtcbiAgICB9XG5cbiAgICB0aGlzLl9jdXJyZW50Q2FuY2VsbGFibGUgPSB2YWx1ZTtcblxuICAgIGlmICghdmFsdWUuaXNSZWplY3RlZCgpKSB7XG4gICAgICAgIGZvciAoOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIHZhciBjdHggPSB7XG4gICAgICAgICAgICAgICAgYWNjdW06IG51bGwsXG4gICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlc1tpXSxcbiAgICAgICAgICAgICAgICBpbmRleDogaSxcbiAgICAgICAgICAgICAgICBsZW5ndGg6IGxlbmd0aCxcbiAgICAgICAgICAgICAgICBhcnJheTogdGhpc1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWUuX3RoZW4oZ290QWNjdW0sIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBjdHgsIHVuZGVmaW5lZCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZWFjaFZhbHVlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHZhbHVlID0gdmFsdWVcbiAgICAgICAgICAgIC5fdGhlbih0aGlzLl9lYWNoQ29tcGxldGUsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB0aGlzLCB1bmRlZmluZWQpO1xuICAgIH1cbiAgICB2YWx1ZS5fdGhlbihjb21wbGV0ZWQsIGNvbXBsZXRlZCwgdW5kZWZpbmVkLCB2YWx1ZSwgdGhpcyk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5yZWR1Y2UgPSBmdW5jdGlvbiAoZm4sIGluaXRpYWxWYWx1ZSkge1xuICAgIHJldHVybiByZWR1Y2UodGhpcywgZm4sIGluaXRpYWxWYWx1ZSwgbnVsbCk7XG59O1xuXG5Qcm9taXNlLnJlZHVjZSA9IGZ1bmN0aW9uIChwcm9taXNlcywgZm4sIGluaXRpYWxWYWx1ZSwgX2VhY2gpIHtcbiAgICByZXR1cm4gcmVkdWNlKHByb21pc2VzLCBmbiwgaW5pdGlhbFZhbHVlLCBfZWFjaCk7XG59O1xuXG5mdW5jdGlvbiBjb21wbGV0ZWQodmFsdWVPclJlYXNvbiwgYXJyYXkpIHtcbiAgICBpZiAodGhpcy5pc0Z1bGZpbGxlZCgpKSB7XG4gICAgICAgIGFycmF5Ll9yZXNvbHZlKHZhbHVlT3JSZWFzb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGFycmF5Ll9yZWplY3QodmFsdWVPclJlYXNvbik7XG4gICAgfVxufVxuXG5mdW5jdGlvbiByZWR1Y2UocHJvbWlzZXMsIGZuLCBpbml0aWFsVmFsdWUsIF9lYWNoKSB7XG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHJldHVybiBhcGlSZWplY3Rpb24oXCJleHBlY3RpbmcgYSBmdW5jdGlvbiBidXQgZ290IFwiICsgdXRpbC5jbGFzc1N0cmluZyhmbikpO1xuICAgIH1cbiAgICB2YXIgYXJyYXkgPSBuZXcgUmVkdWN0aW9uUHJvbWlzZUFycmF5KHByb21pc2VzLCBmbiwgaW5pdGlhbFZhbHVlLCBfZWFjaCk7XG4gICAgcmV0dXJuIGFycmF5LnByb21pc2UoKTtcbn1cblxuZnVuY3Rpb24gZ290QWNjdW0oYWNjdW0pIHtcbiAgICB0aGlzLmFjY3VtID0gYWNjdW07XG4gICAgdGhpcy5hcnJheS5fZ290QWNjdW0oYWNjdW0pO1xuICAgIHZhciB2YWx1ZSA9IHRyeUNvbnZlcnRUb1Byb21pc2UodGhpcy52YWx1ZSwgdGhpcy5hcnJheS5fcHJvbWlzZSk7XG4gICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICB0aGlzLmFycmF5Ll9jdXJyZW50Q2FuY2VsbGFibGUgPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIHZhbHVlLl90aGVuKGdvdFZhbHVlLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgdGhpcywgdW5kZWZpbmVkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZ290VmFsdWUuY2FsbCh0aGlzLCB2YWx1ZSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBnb3RWYWx1ZSh2YWx1ZSkge1xuICAgIHZhciBhcnJheSA9IHRoaXMuYXJyYXk7XG4gICAgdmFyIHByb21pc2UgPSBhcnJheS5fcHJvbWlzZTtcbiAgICB2YXIgZm4gPSB0cnlDYXRjaChhcnJheS5fZm4pO1xuICAgIHByb21pc2UuX3B1c2hDb250ZXh0KCk7XG4gICAgdmFyIHJldDtcbiAgICBpZiAoYXJyYXkuX2VhY2hWYWx1ZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXQgPSBmbi5jYWxsKHByb21pc2UuX2JvdW5kVmFsdWUoKSwgdmFsdWUsIHRoaXMuaW5kZXgsIHRoaXMubGVuZ3RoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXQgPSBmbi5jYWxsKHByb21pc2UuX2JvdW5kVmFsdWUoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYWNjdW0sIHZhbHVlLCB0aGlzLmluZGV4LCB0aGlzLmxlbmd0aCk7XG4gICAgfVxuICAgIGlmIChyZXQgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgIGFycmF5Ll9jdXJyZW50Q2FuY2VsbGFibGUgPSByZXQ7XG4gICAgfVxuICAgIHZhciBwcm9taXNlQ3JlYXRlZCA9IHByb21pc2UuX3BvcENvbnRleHQoKTtcbiAgICBkZWJ1Zy5jaGVja0ZvcmdvdHRlblJldHVybnMoXG4gICAgICAgIHJldCxcbiAgICAgICAgcHJvbWlzZUNyZWF0ZWQsXG4gICAgICAgIGFycmF5Ll9lYWNoVmFsdWVzICE9PSB1bmRlZmluZWQgPyBcIlByb21pc2UuZWFjaFwiIDogXCJQcm9taXNlLnJlZHVjZVwiLFxuICAgICAgICBwcm9taXNlXG4gICAgKTtcbiAgICByZXR1cm4gcmV0O1xufVxufTtcblxufSx7XCIuL3V0aWxcIjozNn1dLDI5OltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xudmFyIHV0aWwgPSBfZGVyZXFfKFwiLi91dGlsXCIpO1xudmFyIHNjaGVkdWxlO1xudmFyIG5vQXN5bmNTY2hlZHVsZXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyBhc3luYyBzY2hlZHVsZXIgYXZhaWxhYmxlXFx1MDAwYVxcdTAwMGEgICAgU2VlIGh0dHA6Ly9nb28uZ2wvTXFyRm1YXFx1MDAwYVwiKTtcbn07XG52YXIgTmF0aXZlUHJvbWlzZSA9IHV0aWwuZ2V0TmF0aXZlUHJvbWlzZSgpO1xuaWYgKHV0aWwuaXNOb2RlICYmIHR5cGVvZiBNdXRhdGlvbk9ic2VydmVyID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgdmFyIEdsb2JhbFNldEltbWVkaWF0ZSA9IGdsb2JhbC5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIFByb2Nlc3NOZXh0VGljayA9IHByb2Nlc3MubmV4dFRpY2s7XG4gICAgc2NoZWR1bGUgPSB1dGlsLmlzUmVjZW50Tm9kZVxuICAgICAgICAgICAgICAgID8gZnVuY3Rpb24oZm4pIHsgR2xvYmFsU2V0SW1tZWRpYXRlLmNhbGwoZ2xvYmFsLCBmbik7IH1cbiAgICAgICAgICAgICAgICA6IGZ1bmN0aW9uKGZuKSB7IFByb2Nlc3NOZXh0VGljay5jYWxsKHByb2Nlc3MsIGZuKTsgfTtcbn0gZWxzZSBpZiAodHlwZW9mIE5hdGl2ZVByb21pc2UgPT09IFwiZnVuY3Rpb25cIiAmJlxuICAgICAgICAgICB0eXBlb2YgTmF0aXZlUHJvbWlzZS5yZXNvbHZlID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICB2YXIgbmF0aXZlUHJvbWlzZSA9IE5hdGl2ZVByb21pc2UucmVzb2x2ZSgpO1xuICAgIHNjaGVkdWxlID0gZnVuY3Rpb24oZm4pIHtcbiAgICAgICAgbmF0aXZlUHJvbWlzZS50aGVuKGZuKTtcbiAgICB9O1xufSBlbHNlIGlmICgodHlwZW9mIE11dGF0aW9uT2JzZXJ2ZXIgIT09IFwidW5kZWZpbmVkXCIpICYmXG4gICAgICAgICAgISh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiICYmXG4gICAgICAgICAgICB3aW5kb3cubmF2aWdhdG9yICYmXG4gICAgICAgICAgICAod2luZG93Lm5hdmlnYXRvci5zdGFuZGFsb25lIHx8IHdpbmRvdy5jb3Jkb3ZhKSkpIHtcbiAgICBzY2hlZHVsZSA9IChmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIHZhciBvcHRzID0ge2F0dHJpYnV0ZXM6IHRydWV9O1xuICAgICAgICB2YXIgdG9nZ2xlU2NoZWR1bGVkID0gZmFsc2U7XG4gICAgICAgIHZhciBkaXYyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgdmFyIG8yID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBkaXYuY2xhc3NMaXN0LnRvZ2dsZShcImZvb1wiKTtcbiAgICAgICAgICAgIHRvZ2dsZVNjaGVkdWxlZCA9IGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgbzIub2JzZXJ2ZShkaXYyLCBvcHRzKTtcblxuICAgICAgICB2YXIgc2NoZWR1bGVUb2dnbGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICh0b2dnbGVTY2hlZHVsZWQpIHJldHVybjtcbiAgICAgICAgICAgIHRvZ2dsZVNjaGVkdWxlZCA9IHRydWU7XG4gICAgICAgICAgICBkaXYyLmNsYXNzTGlzdC50b2dnbGUoXCJmb29cIik7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIHNjaGVkdWxlKGZuKSB7XG4gICAgICAgICAgICB2YXIgbyA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIG8uZGlzY29ubmVjdCgpO1xuICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIG8ub2JzZXJ2ZShkaXYsIG9wdHMpO1xuICAgICAgICAgICAgc2NoZWR1bGVUb2dnbGUoKTtcbiAgICAgICAgfTtcbiAgICB9KSgpO1xufSBlbHNlIGlmICh0eXBlb2Ygc2V0SW1tZWRpYXRlICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgc2NoZWR1bGUgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgc2V0SW1tZWRpYXRlKGZuKTtcbiAgICB9O1xufSBlbHNlIGlmICh0eXBlb2Ygc2V0VGltZW91dCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHNjaGVkdWxlID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59IGVsc2Uge1xuICAgIHNjaGVkdWxlID0gbm9Bc3luY1NjaGVkdWxlcjtcbn1cbm1vZHVsZS5leHBvcnRzID0gc2NoZWR1bGU7XG5cbn0se1wiLi91dGlsXCI6MzZ9XSwzMDpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID1cbiAgICBmdW5jdGlvbihQcm9taXNlLCBQcm9taXNlQXJyYXksIGRlYnVnKSB7XG52YXIgUHJvbWlzZUluc3BlY3Rpb24gPSBQcm9taXNlLlByb21pc2VJbnNwZWN0aW9uO1xudmFyIHV0aWwgPSBfZGVyZXFfKFwiLi91dGlsXCIpO1xuXG5mdW5jdGlvbiBTZXR0bGVkUHJvbWlzZUFycmF5KHZhbHVlcykge1xuICAgIHRoaXMuY29uc3RydWN0b3IkKHZhbHVlcyk7XG59XG51dGlsLmluaGVyaXRzKFNldHRsZWRQcm9taXNlQXJyYXksIFByb21pc2VBcnJheSk7XG5cblNldHRsZWRQcm9taXNlQXJyYXkucHJvdG90eXBlLl9wcm9taXNlUmVzb2x2ZWQgPSBmdW5jdGlvbiAoaW5kZXgsIGluc3BlY3Rpb24pIHtcbiAgICB0aGlzLl92YWx1ZXNbaW5kZXhdID0gaW5zcGVjdGlvbjtcbiAgICB2YXIgdG90YWxSZXNvbHZlZCA9ICsrdGhpcy5fdG90YWxSZXNvbHZlZDtcbiAgICBpZiAodG90YWxSZXNvbHZlZCA+PSB0aGlzLl9sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5fcmVzb2x2ZSh0aGlzLl92YWx1ZXMpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuU2V0dGxlZFByb21pc2VBcnJheS5wcm90b3R5cGUuX3Byb21pc2VGdWxmaWxsZWQgPSBmdW5jdGlvbiAodmFsdWUsIGluZGV4KSB7XG4gICAgdmFyIHJldCA9IG5ldyBQcm9taXNlSW5zcGVjdGlvbigpO1xuICAgIHJldC5fYml0RmllbGQgPSAzMzU1NDQzMjtcbiAgICByZXQuX3NldHRsZWRWYWx1ZUZpZWxkID0gdmFsdWU7XG4gICAgcmV0dXJuIHRoaXMuX3Byb21pc2VSZXNvbHZlZChpbmRleCwgcmV0KTtcbn07XG5TZXR0bGVkUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fcHJvbWlzZVJlamVjdGVkID0gZnVuY3Rpb24gKHJlYXNvbiwgaW5kZXgpIHtcbiAgICB2YXIgcmV0ID0gbmV3IFByb21pc2VJbnNwZWN0aW9uKCk7XG4gICAgcmV0Ll9iaXRGaWVsZCA9IDE2Nzc3MjE2O1xuICAgIHJldC5fc2V0dGxlZFZhbHVlRmllbGQgPSByZWFzb247XG4gICAgcmV0dXJuIHRoaXMuX3Byb21pc2VSZXNvbHZlZChpbmRleCwgcmV0KTtcbn07XG5cblByb21pc2Uuc2V0dGxlID0gZnVuY3Rpb24gKHByb21pc2VzKSB7XG4gICAgZGVidWcuZGVwcmVjYXRlZChcIi5zZXR0bGUoKVwiLCBcIi5yZWZsZWN0KClcIik7XG4gICAgcmV0dXJuIG5ldyBTZXR0bGVkUHJvbWlzZUFycmF5KHByb21pc2VzKS5wcm9taXNlKCk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5zZXR0bGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFByb21pc2Uuc2V0dGxlKHRoaXMpO1xufTtcbn07XG5cbn0se1wiLi91dGlsXCI6MzZ9XSwzMTpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID1cbmZ1bmN0aW9uKFByb21pc2UsIFByb21pc2VBcnJheSwgYXBpUmVqZWN0aW9uKSB7XG52YXIgdXRpbCA9IF9kZXJlcV8oXCIuL3V0aWxcIik7XG52YXIgUmFuZ2VFcnJvciA9IF9kZXJlcV8oXCIuL2Vycm9yc1wiKS5SYW5nZUVycm9yO1xudmFyIEFnZ3JlZ2F0ZUVycm9yID0gX2RlcmVxXyhcIi4vZXJyb3JzXCIpLkFnZ3JlZ2F0ZUVycm9yO1xudmFyIGlzQXJyYXkgPSB1dGlsLmlzQXJyYXk7XG52YXIgQ0FOQ0VMTEFUSU9OID0ge307XG5cblxuZnVuY3Rpb24gU29tZVByb21pc2VBcnJheSh2YWx1ZXMpIHtcbiAgICB0aGlzLmNvbnN0cnVjdG9yJCh2YWx1ZXMpO1xuICAgIHRoaXMuX2hvd01hbnkgPSAwO1xuICAgIHRoaXMuX3Vud3JhcCA9IGZhbHNlO1xuICAgIHRoaXMuX2luaXRpYWxpemVkID0gZmFsc2U7XG59XG51dGlsLmluaGVyaXRzKFNvbWVQcm9taXNlQXJyYXksIFByb21pc2VBcnJheSk7XG5cblNvbWVQcm9taXNlQXJyYXkucHJvdG90eXBlLl9pbml0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5faW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAodGhpcy5faG93TWFueSA9PT0gMCkge1xuICAgICAgICB0aGlzLl9yZXNvbHZlKFtdKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9pbml0JCh1bmRlZmluZWQsIC01KTtcbiAgICB2YXIgaXNBcnJheVJlc29sdmVkID0gaXNBcnJheSh0aGlzLl92YWx1ZXMpO1xuICAgIGlmICghdGhpcy5faXNSZXNvbHZlZCgpICYmXG4gICAgICAgIGlzQXJyYXlSZXNvbHZlZCAmJlxuICAgICAgICB0aGlzLl9ob3dNYW55ID4gdGhpcy5fY2FuUG9zc2libHlGdWxmaWxsKCkpIHtcbiAgICAgICAgdGhpcy5fcmVqZWN0KHRoaXMuX2dldFJhbmdlRXJyb3IodGhpcy5sZW5ndGgoKSkpO1xuICAgIH1cbn07XG5cblNvbWVQcm9taXNlQXJyYXkucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5faW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIHRoaXMuX2luaXQoKTtcbn07XG5cblNvbWVQcm9taXNlQXJyYXkucHJvdG90eXBlLnNldFVud3JhcCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl91bndyYXAgPSB0cnVlO1xufTtcblxuU29tZVByb21pc2VBcnJheS5wcm90b3R5cGUuaG93TWFueSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5faG93TWFueTtcbn07XG5cblNvbWVQcm9taXNlQXJyYXkucHJvdG90eXBlLnNldEhvd01hbnkgPSBmdW5jdGlvbiAoY291bnQpIHtcbiAgICB0aGlzLl9ob3dNYW55ID0gY291bnQ7XG59O1xuXG5Tb21lUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fcHJvbWlzZUZ1bGZpbGxlZCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHRoaXMuX2FkZEZ1bGZpbGxlZCh2YWx1ZSk7XG4gICAgaWYgKHRoaXMuX2Z1bGZpbGxlZCgpID09PSB0aGlzLmhvd01hbnkoKSkge1xuICAgICAgICB0aGlzLl92YWx1ZXMubGVuZ3RoID0gdGhpcy5ob3dNYW55KCk7XG4gICAgICAgIGlmICh0aGlzLmhvd01hbnkoKSA9PT0gMSAmJiB0aGlzLl91bndyYXApIHtcbiAgICAgICAgICAgIHRoaXMuX3Jlc29sdmUodGhpcy5fdmFsdWVzWzBdKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3Jlc29sdmUodGhpcy5fdmFsdWVzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuXG59O1xuU29tZVByb21pc2VBcnJheS5wcm90b3R5cGUuX3Byb21pc2VSZWplY3RlZCA9IGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICB0aGlzLl9hZGRSZWplY3RlZChyZWFzb24pO1xuICAgIHJldHVybiB0aGlzLl9jaGVja091dGNvbWUoKTtcbn07XG5cblNvbWVQcm9taXNlQXJyYXkucHJvdG90eXBlLl9wcm9taXNlQ2FuY2VsbGVkID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLl92YWx1ZXMgaW5zdGFuY2VvZiBQcm9taXNlIHx8IHRoaXMuX3ZhbHVlcyA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jYW5jZWwoKTtcbiAgICB9XG4gICAgdGhpcy5fYWRkUmVqZWN0ZWQoQ0FOQ0VMTEFUSU9OKTtcbiAgICByZXR1cm4gdGhpcy5fY2hlY2tPdXRjb21lKCk7XG59O1xuXG5Tb21lUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fY2hlY2tPdXRjb21lID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuaG93TWFueSgpID4gdGhpcy5fY2FuUG9zc2libHlGdWxmaWxsKCkpIHtcbiAgICAgICAgdmFyIGUgPSBuZXcgQWdncmVnYXRlRXJyb3IoKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IHRoaXMubGVuZ3RoKCk7IGkgPCB0aGlzLl92YWx1ZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl92YWx1ZXNbaV0gIT09IENBTkNFTExBVElPTikge1xuICAgICAgICAgICAgICAgIGUucHVzaCh0aGlzLl92YWx1ZXNbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHRoaXMuX3JlamVjdChlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2NhbmNlbCgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG5Tb21lUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fZnVsZmlsbGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl90b3RhbFJlc29sdmVkO1xufTtcblxuU29tZVByb21pc2VBcnJheS5wcm90b3R5cGUuX3JlamVjdGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl92YWx1ZXMubGVuZ3RoIC0gdGhpcy5sZW5ndGgoKTtcbn07XG5cblNvbWVQcm9taXNlQXJyYXkucHJvdG90eXBlLl9hZGRSZWplY3RlZCA9IGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICB0aGlzLl92YWx1ZXMucHVzaChyZWFzb24pO1xufTtcblxuU29tZVByb21pc2VBcnJheS5wcm90b3R5cGUuX2FkZEZ1bGZpbGxlZCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHRoaXMuX3ZhbHVlc1t0aGlzLl90b3RhbFJlc29sdmVkKytdID0gdmFsdWU7XG59O1xuXG5Tb21lUHJvbWlzZUFycmF5LnByb3RvdHlwZS5fY2FuUG9zc2libHlGdWxmaWxsID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmxlbmd0aCgpIC0gdGhpcy5fcmVqZWN0ZWQoKTtcbn07XG5cblNvbWVQcm9taXNlQXJyYXkucHJvdG90eXBlLl9nZXRSYW5nZUVycm9yID0gZnVuY3Rpb24gKGNvdW50KSB7XG4gICAgdmFyIG1lc3NhZ2UgPSBcIklucHV0IGFycmF5IG11c3QgY29udGFpbiBhdCBsZWFzdCBcIiArXG4gICAgICAgICAgICB0aGlzLl9ob3dNYW55ICsgXCIgaXRlbXMgYnV0IGNvbnRhaW5zIG9ubHkgXCIgKyBjb3VudCArIFwiIGl0ZW1zXCI7XG4gICAgcmV0dXJuIG5ldyBSYW5nZUVycm9yKG1lc3NhZ2UpO1xufTtcblxuU29tZVByb21pc2VBcnJheS5wcm90b3R5cGUuX3Jlc29sdmVFbXB0eUFycmF5ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3JlamVjdCh0aGlzLl9nZXRSYW5nZUVycm9yKDApKTtcbn07XG5cbmZ1bmN0aW9uIHNvbWUocHJvbWlzZXMsIGhvd01hbnkpIHtcbiAgICBpZiAoKGhvd01hbnkgfCAwKSAhPT0gaG93TWFueSB8fCBob3dNYW55IDwgMCkge1xuICAgICAgICByZXR1cm4gYXBpUmVqZWN0aW9uKFwiZXhwZWN0aW5nIGEgcG9zaXRpdmUgaW50ZWdlclxcdTAwMGFcXHUwMDBhICAgIFNlZSBodHRwOi8vZ29vLmdsL01xckZtWFxcdTAwMGFcIik7XG4gICAgfVxuICAgIHZhciByZXQgPSBuZXcgU29tZVByb21pc2VBcnJheShwcm9taXNlcyk7XG4gICAgdmFyIHByb21pc2UgPSByZXQucHJvbWlzZSgpO1xuICAgIHJldC5zZXRIb3dNYW55KGhvd01hbnkpO1xuICAgIHJldC5pbml0KCk7XG4gICAgcmV0dXJuIHByb21pc2U7XG59XG5cblByb21pc2Uuc29tZSA9IGZ1bmN0aW9uIChwcm9taXNlcywgaG93TWFueSkge1xuICAgIHJldHVybiBzb21lKHByb21pc2VzLCBob3dNYW55KTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLnNvbWUgPSBmdW5jdGlvbiAoaG93TWFueSkge1xuICAgIHJldHVybiBzb21lKHRoaXMsIGhvd01hbnkpO1xufTtcblxuUHJvbWlzZS5fU29tZVByb21pc2VBcnJheSA9IFNvbWVQcm9taXNlQXJyYXk7XG59O1xuXG59LHtcIi4vZXJyb3JzXCI6MTIsXCIuL3V0aWxcIjozNn1dLDMyOltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihQcm9taXNlKSB7XG5mdW5jdGlvbiBQcm9taXNlSW5zcGVjdGlvbihwcm9taXNlKSB7XG4gICAgaWYgKHByb21pc2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBwcm9taXNlID0gcHJvbWlzZS5fdGFyZ2V0KCk7XG4gICAgICAgIHRoaXMuX2JpdEZpZWxkID0gcHJvbWlzZS5fYml0RmllbGQ7XG4gICAgICAgIHRoaXMuX3NldHRsZWRWYWx1ZUZpZWxkID0gcHJvbWlzZS5faXNGYXRlU2VhbGVkKClcbiAgICAgICAgICAgID8gcHJvbWlzZS5fc2V0dGxlZFZhbHVlKCkgOiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLl9iaXRGaWVsZCA9IDA7XG4gICAgICAgIHRoaXMuX3NldHRsZWRWYWx1ZUZpZWxkID0gdW5kZWZpbmVkO1xuICAgIH1cbn1cblxuUHJvbWlzZUluc3BlY3Rpb24ucHJvdG90eXBlLl9zZXR0bGVkVmFsdWUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fc2V0dGxlZFZhbHVlRmllbGQ7XG59O1xuXG52YXIgdmFsdWUgPSBQcm9taXNlSW5zcGVjdGlvbi5wcm90b3R5cGUudmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmlzRnVsZmlsbGVkKCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImNhbm5vdCBnZXQgZnVsZmlsbG1lbnQgdmFsdWUgb2YgYSBub24tZnVsZmlsbGVkIHByb21pc2VcXHUwMDBhXFx1MDAwYSAgICBTZWUgaHR0cDovL2dvby5nbC9NcXJGbVhcXHUwMDBhXCIpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fc2V0dGxlZFZhbHVlKCk7XG59O1xuXG52YXIgcmVhc29uID0gUHJvbWlzZUluc3BlY3Rpb24ucHJvdG90eXBlLmVycm9yID1cblByb21pc2VJbnNwZWN0aW9uLnByb3RvdHlwZS5yZWFzb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmlzUmVqZWN0ZWQoKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiY2Fubm90IGdldCByZWplY3Rpb24gcmVhc29uIG9mIGEgbm9uLXJlamVjdGVkIHByb21pc2VcXHUwMDBhXFx1MDAwYSAgICBTZWUgaHR0cDovL2dvby5nbC9NcXJGbVhcXHUwMDBhXCIpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fc2V0dGxlZFZhbHVlKCk7XG59O1xuXG52YXIgaXNGdWxmaWxsZWQgPSBQcm9taXNlSW5zcGVjdGlvbi5wcm90b3R5cGUuaXNGdWxmaWxsZWQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gKHRoaXMuX2JpdEZpZWxkICYgMzM1NTQ0MzIpICE9PSAwO1xufTtcblxudmFyIGlzUmVqZWN0ZWQgPSBQcm9taXNlSW5zcGVjdGlvbi5wcm90b3R5cGUuaXNSZWplY3RlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gKHRoaXMuX2JpdEZpZWxkICYgMTY3NzcyMTYpICE9PSAwO1xufTtcblxudmFyIGlzUGVuZGluZyA9IFByb21pc2VJbnNwZWN0aW9uLnByb3RvdHlwZS5pc1BlbmRpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICh0aGlzLl9iaXRGaWVsZCAmIDUwMzk3MTg0KSA9PT0gMDtcbn07XG5cbnZhciBpc1Jlc29sdmVkID0gUHJvbWlzZUluc3BlY3Rpb24ucHJvdG90eXBlLmlzUmVzb2x2ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICh0aGlzLl9iaXRGaWVsZCAmIDUwMzMxNjQ4KSAhPT0gMDtcbn07XG5cblByb21pc2VJbnNwZWN0aW9uLnByb3RvdHlwZS5pc0NhbmNlbGxlZCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAodGhpcy5fYml0RmllbGQgJiA4NDU0MTQ0KSAhPT0gMDtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9faXNDYW5jZWxsZWQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gKHRoaXMuX2JpdEZpZWxkICYgNjU1MzYpID09PSA2NTUzNjtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9pc0NhbmNlbGxlZCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl90YXJnZXQoKS5fX2lzQ2FuY2VsbGVkKCk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5pc0NhbmNlbGxlZCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAodGhpcy5fdGFyZ2V0KCkuX2JpdEZpZWxkICYgODQ1NDE0NCkgIT09IDA7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5pc1BlbmRpbmcgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gaXNQZW5kaW5nLmNhbGwodGhpcy5fdGFyZ2V0KCkpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuaXNSZWplY3RlZCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBpc1JlamVjdGVkLmNhbGwodGhpcy5fdGFyZ2V0KCkpO1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuaXNGdWxmaWxsZWQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gaXNGdWxmaWxsZWQuY2FsbCh0aGlzLl90YXJnZXQoKSk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS5pc1Jlc29sdmVkID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGlzUmVzb2x2ZWQuY2FsbCh0aGlzLl90YXJnZXQoKSk7XG59O1xuXG5Qcm9taXNlLnByb3RvdHlwZS52YWx1ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB2YWx1ZS5jYWxsKHRoaXMuX3RhcmdldCgpKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLnJlYXNvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0YXJnZXQgPSB0aGlzLl90YXJnZXQoKTtcbiAgICB0YXJnZXQuX3Vuc2V0UmVqZWN0aW9uSXNVbmhhbmRsZWQoKTtcbiAgICByZXR1cm4gcmVhc29uLmNhbGwodGFyZ2V0KTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl92YWx1ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9zZXR0bGVkVmFsdWUoKTtcbn07XG5cblByb21pc2UucHJvdG90eXBlLl9yZWFzb24gPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl91bnNldFJlamVjdGlvbklzVW5oYW5kbGVkKCk7XG4gICAgcmV0dXJuIHRoaXMuX3NldHRsZWRWYWx1ZSgpO1xufTtcblxuUHJvbWlzZS5Qcm9taXNlSW5zcGVjdGlvbiA9IFByb21pc2VJbnNwZWN0aW9uO1xufTtcblxufSx7fV0sMzM6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKFByb21pc2UsIElOVEVSTkFMKSB7XG52YXIgdXRpbCA9IF9kZXJlcV8oXCIuL3V0aWxcIik7XG52YXIgZXJyb3JPYmogPSB1dGlsLmVycm9yT2JqO1xudmFyIGlzT2JqZWN0ID0gdXRpbC5pc09iamVjdDtcblxuZnVuY3Rpb24gdHJ5Q29udmVydFRvUHJvbWlzZShvYmosIGNvbnRleHQpIHtcbiAgICBpZiAoaXNPYmplY3Qob2JqKSkge1xuICAgICAgICBpZiAob2JqIGluc3RhbmNlb2YgUHJvbWlzZSkgcmV0dXJuIG9iajtcbiAgICAgICAgdmFyIHRoZW4gPSBnZXRUaGVuKG9iaik7XG4gICAgICAgIGlmICh0aGVuID09PSBlcnJvck9iaikge1xuICAgICAgICAgICAgaWYgKGNvbnRleHQpIGNvbnRleHQuX3B1c2hDb250ZXh0KCk7XG4gICAgICAgICAgICB2YXIgcmV0ID0gUHJvbWlzZS5yZWplY3QodGhlbi5lKTtcbiAgICAgICAgICAgIGlmIChjb250ZXh0KSBjb250ZXh0Ll9wb3BDb250ZXh0KCk7XG4gICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB0aGVuID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIGlmIChpc0FueUJsdWViaXJkUHJvbWlzZShvYmopKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJldCA9IG5ldyBQcm9taXNlKElOVEVSTkFMKTtcbiAgICAgICAgICAgICAgICBvYmouX3RoZW4oXG4gICAgICAgICAgICAgICAgICAgIHJldC5fZnVsZmlsbCxcbiAgICAgICAgICAgICAgICAgICAgcmV0Ll9yZWplY3QsXG4gICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgcmV0LFxuICAgICAgICAgICAgICAgICAgICBudWxsXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGRvVGhlbmFibGUob2JqLCB0aGVuLCBjb250ZXh0KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xufVxuXG5mdW5jdGlvbiBkb0dldFRoZW4ob2JqKSB7XG4gICAgcmV0dXJuIG9iai50aGVuO1xufVxuXG5mdW5jdGlvbiBnZXRUaGVuKG9iaikge1xuICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBkb0dldFRoZW4ob2JqKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGVycm9yT2JqLmUgPSBlO1xuICAgICAgICByZXR1cm4gZXJyb3JPYmo7XG4gICAgfVxufVxuXG52YXIgaGFzUHJvcCA9IHt9Lmhhc093blByb3BlcnR5O1xuZnVuY3Rpb24gaXNBbnlCbHVlYmlyZFByb21pc2Uob2JqKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGhhc1Byb3AuY2FsbChvYmosIFwiX3Byb21pc2UwXCIpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZG9UaGVuYWJsZSh4LCB0aGVuLCBjb250ZXh0KSB7XG4gICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShJTlRFUk5BTCk7XG4gICAgdmFyIHJldCA9IHByb21pc2U7XG4gICAgaWYgKGNvbnRleHQpIGNvbnRleHQuX3B1c2hDb250ZXh0KCk7XG4gICAgcHJvbWlzZS5fY2FwdHVyZVN0YWNrVHJhY2UoKTtcbiAgICBpZiAoY29udGV4dCkgY29udGV4dC5fcG9wQ29udGV4dCgpO1xuICAgIHZhciBzeW5jaHJvbm91cyA9IHRydWU7XG4gICAgdmFyIHJlc3VsdCA9IHV0aWwudHJ5Q2F0Y2godGhlbikuY2FsbCh4LCByZXNvbHZlLCByZWplY3QpO1xuICAgIHN5bmNocm9ub3VzID0gZmFsc2U7XG5cbiAgICBpZiAocHJvbWlzZSAmJiByZXN1bHQgPT09IGVycm9yT2JqKSB7XG4gICAgICAgIHByb21pc2UuX3JlamVjdENhbGxiYWNrKHJlc3VsdC5lLCB0cnVlLCB0cnVlKTtcbiAgICAgICAgcHJvbWlzZSA9IG51bGw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVzb2x2ZSh2YWx1ZSkge1xuICAgICAgICBpZiAoIXByb21pc2UpIHJldHVybjtcbiAgICAgICAgcHJvbWlzZS5fcmVzb2x2ZUNhbGxiYWNrKHZhbHVlKTtcbiAgICAgICAgcHJvbWlzZSA9IG51bGw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVqZWN0KHJlYXNvbikge1xuICAgICAgICBpZiAoIXByb21pc2UpIHJldHVybjtcbiAgICAgICAgcHJvbWlzZS5fcmVqZWN0Q2FsbGJhY2socmVhc29uLCBzeW5jaHJvbm91cywgdHJ1ZSk7XG4gICAgICAgIHByb21pc2UgPSBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xufVxuXG5yZXR1cm4gdHJ5Q29udmVydFRvUHJvbWlzZTtcbn07XG5cbn0se1wiLi91dGlsXCI6MzZ9XSwzNDpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oUHJvbWlzZSwgSU5URVJOQUwsIGRlYnVnKSB7XG52YXIgdXRpbCA9IF9kZXJlcV8oXCIuL3V0aWxcIik7XG52YXIgVGltZW91dEVycm9yID0gUHJvbWlzZS5UaW1lb3V0RXJyb3I7XG5cbmZ1bmN0aW9uIEhhbmRsZVdyYXBwZXIoaGFuZGxlKSAge1xuICAgIHRoaXMuaGFuZGxlID0gaGFuZGxlO1xufVxuXG5IYW5kbGVXcmFwcGVyLnByb3RvdHlwZS5fcmVzdWx0Q2FuY2VsbGVkID0gZnVuY3Rpb24oKSB7XG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuaGFuZGxlKTtcbn07XG5cbnZhciBhZnRlclZhbHVlID0gZnVuY3Rpb24odmFsdWUpIHsgcmV0dXJuIGRlbGF5KCt0aGlzKS50aGVuUmV0dXJuKHZhbHVlKTsgfTtcbnZhciBkZWxheSA9IFByb21pc2UuZGVsYXkgPSBmdW5jdGlvbiAobXMsIHZhbHVlKSB7XG4gICAgdmFyIHJldDtcbiAgICB2YXIgaGFuZGxlO1xuICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldCA9IFByb21pc2UucmVzb2x2ZSh2YWx1ZSlcbiAgICAgICAgICAgICAgICAuX3RoZW4oYWZ0ZXJWYWx1ZSwgbnVsbCwgbnVsbCwgbXMsIHVuZGVmaW5lZCk7XG4gICAgICAgIGlmIChkZWJ1Zy5jYW5jZWxsYXRpb24oKSAmJiB2YWx1ZSBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgICAgIHJldC5fc2V0T25DYW5jZWwodmFsdWUpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0ID0gbmV3IFByb21pc2UoSU5URVJOQUwpO1xuICAgICAgICBoYW5kbGUgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyByZXQuX2Z1bGZpbGwoKTsgfSwgK21zKTtcbiAgICAgICAgaWYgKGRlYnVnLmNhbmNlbGxhdGlvbigpKSB7XG4gICAgICAgICAgICByZXQuX3NldE9uQ2FuY2VsKG5ldyBIYW5kbGVXcmFwcGVyKGhhbmRsZSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldC5fY2FwdHVyZVN0YWNrVHJhY2UoKTtcbiAgICB9XG4gICAgcmV0Ll9zZXRBc3luY0d1YXJhbnRlZWQoKTtcbiAgICByZXR1cm4gcmV0O1xufTtcblxuUHJvbWlzZS5wcm90b3R5cGUuZGVsYXkgPSBmdW5jdGlvbiAobXMpIHtcbiAgICByZXR1cm4gZGVsYXkobXMsIHRoaXMpO1xufTtcblxudmFyIGFmdGVyVGltZW91dCA9IGZ1bmN0aW9uIChwcm9taXNlLCBtZXNzYWdlLCBwYXJlbnQpIHtcbiAgICB2YXIgZXJyO1xuICAgIGlmICh0eXBlb2YgbWVzc2FnZSAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICBpZiAobWVzc2FnZSBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgICBlcnIgPSBtZXNzYWdlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXJyID0gbmV3IFRpbWVvdXRFcnJvcihcIm9wZXJhdGlvbiB0aW1lZCBvdXRcIik7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBlcnIgPSBuZXcgVGltZW91dEVycm9yKG1lc3NhZ2UpO1xuICAgIH1cbiAgICB1dGlsLm1hcmtBc09yaWdpbmF0aW5nRnJvbVJlamVjdGlvbihlcnIpO1xuICAgIHByb21pc2UuX2F0dGFjaEV4dHJhVHJhY2UoZXJyKTtcbiAgICBwcm9taXNlLl9yZWplY3QoZXJyKTtcblxuICAgIGlmIChwYXJlbnQgIT0gbnVsbCkge1xuICAgICAgICBwYXJlbnQuY2FuY2VsKCk7XG4gICAgfVxufTtcblxuZnVuY3Rpb24gc3VjY2Vzc0NsZWFyKHZhbHVlKSB7XG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuaGFuZGxlKTtcbiAgICByZXR1cm4gdmFsdWU7XG59XG5cbmZ1bmN0aW9uIGZhaWx1cmVDbGVhcihyZWFzb24pIHtcbiAgICBjbGVhclRpbWVvdXQodGhpcy5oYW5kbGUpO1xuICAgIHRocm93IHJlYXNvbjtcbn1cblxuUHJvbWlzZS5wcm90b3R5cGUudGltZW91dCA9IGZ1bmN0aW9uIChtcywgbWVzc2FnZSkge1xuICAgIG1zID0gK21zO1xuICAgIHZhciByZXQsIHBhcmVudDtcblxuICAgIHZhciBoYW5kbGVXcmFwcGVyID0gbmV3IEhhbmRsZVdyYXBwZXIoc2V0VGltZW91dChmdW5jdGlvbiB0aW1lb3V0VGltZW91dCgpIHtcbiAgICAgICAgaWYgKHJldC5pc1BlbmRpbmcoKSkge1xuICAgICAgICAgICAgYWZ0ZXJUaW1lb3V0KHJldCwgbWVzc2FnZSwgcGFyZW50KTtcbiAgICAgICAgfVxuICAgIH0sIG1zKSk7XG5cbiAgICBpZiAoZGVidWcuY2FuY2VsbGF0aW9uKCkpIHtcbiAgICAgICAgcGFyZW50ID0gdGhpcy50aGVuKCk7XG4gICAgICAgIHJldCA9IHBhcmVudC5fdGhlbihzdWNjZXNzQ2xlYXIsIGZhaWx1cmVDbGVhcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQsIGhhbmRsZVdyYXBwZXIsIHVuZGVmaW5lZCk7XG4gICAgICAgIHJldC5fc2V0T25DYW5jZWwoaGFuZGxlV3JhcHBlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0ID0gdGhpcy5fdGhlbihzdWNjZXNzQ2xlYXIsIGZhaWx1cmVDbGVhcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQsIGhhbmRsZVdyYXBwZXIsIHVuZGVmaW5lZCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbn07XG5cbn07XG5cbn0se1wiLi91dGlsXCI6MzZ9XSwzNTpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKFByb21pc2UsIGFwaVJlamVjdGlvbiwgdHJ5Q29udmVydFRvUHJvbWlzZSxcbiAgICBjcmVhdGVDb250ZXh0LCBJTlRFUk5BTCwgZGVidWcpIHtcbiAgICB2YXIgdXRpbCA9IF9kZXJlcV8oXCIuL3V0aWxcIik7XG4gICAgdmFyIFR5cGVFcnJvciA9IF9kZXJlcV8oXCIuL2Vycm9yc1wiKS5UeXBlRXJyb3I7XG4gICAgdmFyIGluaGVyaXRzID0gX2RlcmVxXyhcIi4vdXRpbFwiKS5pbmhlcml0cztcbiAgICB2YXIgZXJyb3JPYmogPSB1dGlsLmVycm9yT2JqO1xuICAgIHZhciB0cnlDYXRjaCA9IHV0aWwudHJ5Q2F0Y2g7XG4gICAgdmFyIE5VTEwgPSB7fTtcblxuICAgIGZ1bmN0aW9uIHRocm93ZXIoZSkge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7dGhyb3cgZTt9LCAwKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjYXN0UHJlc2VydmluZ0Rpc3Bvc2FibGUodGhlbmFibGUpIHtcbiAgICAgICAgdmFyIG1heWJlUHJvbWlzZSA9IHRyeUNvbnZlcnRUb1Byb21pc2UodGhlbmFibGUpO1xuICAgICAgICBpZiAobWF5YmVQcm9taXNlICE9PSB0aGVuYWJsZSAmJlxuICAgICAgICAgICAgdHlwZW9mIHRoZW5hYmxlLl9pc0Rpc3Bvc2FibGUgPT09IFwiZnVuY3Rpb25cIiAmJlxuICAgICAgICAgICAgdHlwZW9mIHRoZW5hYmxlLl9nZXREaXNwb3NlciA9PT0gXCJmdW5jdGlvblwiICYmXG4gICAgICAgICAgICB0aGVuYWJsZS5faXNEaXNwb3NhYmxlKCkpIHtcbiAgICAgICAgICAgIG1heWJlUHJvbWlzZS5fc2V0RGlzcG9zYWJsZSh0aGVuYWJsZS5fZ2V0RGlzcG9zZXIoKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1heWJlUHJvbWlzZTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZGlzcG9zZShyZXNvdXJjZXMsIGluc3BlY3Rpb24pIHtcbiAgICAgICAgdmFyIGkgPSAwO1xuICAgICAgICB2YXIgbGVuID0gcmVzb3VyY2VzLmxlbmd0aDtcbiAgICAgICAgdmFyIHJldCA9IG5ldyBQcm9taXNlKElOVEVSTkFMKTtcbiAgICAgICAgZnVuY3Rpb24gaXRlcmF0b3IoKSB7XG4gICAgICAgICAgICBpZiAoaSA+PSBsZW4pIHJldHVybiByZXQuX2Z1bGZpbGwoKTtcbiAgICAgICAgICAgIHZhciBtYXliZVByb21pc2UgPSBjYXN0UHJlc2VydmluZ0Rpc3Bvc2FibGUocmVzb3VyY2VzW2krK10pO1xuICAgICAgICAgICAgaWYgKG1heWJlUHJvbWlzZSBpbnN0YW5jZW9mIFByb21pc2UgJiZcbiAgICAgICAgICAgICAgICBtYXliZVByb21pc2UuX2lzRGlzcG9zYWJsZSgpKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgbWF5YmVQcm9taXNlID0gdHJ5Q29udmVydFRvUHJvbWlzZShcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heWJlUHJvbWlzZS5fZ2V0RGlzcG9zZXIoKS50cnlEaXNwb3NlKGluc3BlY3Rpb24pLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzLnByb21pc2UpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRocm93ZXIoZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChtYXliZVByb21pc2UgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBtYXliZVByb21pc2UuX3RoZW4oaXRlcmF0b3IsIHRocm93ZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbnVsbCwgbnVsbCwgbnVsbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaXRlcmF0b3IoKTtcbiAgICAgICAgfVxuICAgICAgICBpdGVyYXRvcigpO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIERpc3Bvc2VyKGRhdGEsIHByb21pc2UsIGNvbnRleHQpIHtcbiAgICAgICAgdGhpcy5fZGF0YSA9IGRhdGE7XG4gICAgICAgIHRoaXMuX3Byb21pc2UgPSBwcm9taXNlO1xuICAgICAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgICB9XG5cbiAgICBEaXNwb3Nlci5wcm90b3R5cGUuZGF0YSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RhdGE7XG4gICAgfTtcblxuICAgIERpc3Bvc2VyLnByb3RvdHlwZS5wcm9taXNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcHJvbWlzZTtcbiAgICB9O1xuXG4gICAgRGlzcG9zZXIucHJvdG90eXBlLnJlc291cmNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5wcm9taXNlKCkuaXNGdWxmaWxsZWQoKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJvbWlzZSgpLnZhbHVlKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE5VTEw7XG4gICAgfTtcblxuICAgIERpc3Bvc2VyLnByb3RvdHlwZS50cnlEaXNwb3NlID0gZnVuY3Rpb24oaW5zcGVjdGlvbikge1xuICAgICAgICB2YXIgcmVzb3VyY2UgPSB0aGlzLnJlc291cmNlKCk7XG4gICAgICAgIHZhciBjb250ZXh0ID0gdGhpcy5fY29udGV4dDtcbiAgICAgICAgaWYgKGNvbnRleHQgIT09IHVuZGVmaW5lZCkgY29udGV4dC5fcHVzaENvbnRleHQoKTtcbiAgICAgICAgdmFyIHJldCA9IHJlc291cmNlICE9PSBOVUxMXG4gICAgICAgICAgICA/IHRoaXMuZG9EaXNwb3NlKHJlc291cmNlLCBpbnNwZWN0aW9uKSA6IG51bGw7XG4gICAgICAgIGlmIChjb250ZXh0ICE9PSB1bmRlZmluZWQpIGNvbnRleHQuX3BvcENvbnRleHQoKTtcbiAgICAgICAgdGhpcy5fcHJvbWlzZS5fdW5zZXREaXNwb3NhYmxlKCk7XG4gICAgICAgIHRoaXMuX2RhdGEgPSBudWxsO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG5cbiAgICBEaXNwb3Nlci5pc0Rpc3Bvc2VyID0gZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgcmV0dXJuIChkICE9IG51bGwgJiZcbiAgICAgICAgICAgICAgICB0eXBlb2YgZC5yZXNvdXJjZSA9PT0gXCJmdW5jdGlvblwiICYmXG4gICAgICAgICAgICAgICAgdHlwZW9mIGQudHJ5RGlzcG9zZSA9PT0gXCJmdW5jdGlvblwiKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gRnVuY3Rpb25EaXNwb3NlcihmbiwgcHJvbWlzZSwgY29udGV4dCkge1xuICAgICAgICB0aGlzLmNvbnN0cnVjdG9yJChmbiwgcHJvbWlzZSwgY29udGV4dCk7XG4gICAgfVxuICAgIGluaGVyaXRzKEZ1bmN0aW9uRGlzcG9zZXIsIERpc3Bvc2VyKTtcblxuICAgIEZ1bmN0aW9uRGlzcG9zZXIucHJvdG90eXBlLmRvRGlzcG9zZSA9IGZ1bmN0aW9uIChyZXNvdXJjZSwgaW5zcGVjdGlvbikge1xuICAgICAgICB2YXIgZm4gPSB0aGlzLmRhdGEoKTtcbiAgICAgICAgcmV0dXJuIGZuLmNhbGwocmVzb3VyY2UsIHJlc291cmNlLCBpbnNwZWN0aW9uKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gbWF5YmVVbndyYXBEaXNwb3Nlcih2YWx1ZSkge1xuICAgICAgICBpZiAoRGlzcG9zZXIuaXNEaXNwb3Nlcih2YWx1ZSkpIHtcbiAgICAgICAgICAgIHRoaXMucmVzb3VyY2VzW3RoaXMuaW5kZXhdLl9zZXREaXNwb3NhYmxlKHZhbHVlKTtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZS5wcm9taXNlKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIFJlc291cmNlTGlzdChsZW5ndGgpIHtcbiAgICAgICAgdGhpcy5sZW5ndGggPSBsZW5ndGg7XG4gICAgICAgIHRoaXMucHJvbWlzZSA9IG51bGw7XG4gICAgICAgIHRoaXNbbGVuZ3RoLTFdID0gbnVsbDtcbiAgICB9XG5cbiAgICBSZXNvdXJjZUxpc3QucHJvdG90eXBlLl9yZXN1bHRDYW5jZWxsZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgICAgICB2YXIgaXRlbSA9IHRoaXNbaV07XG4gICAgICAgICAgICBpZiAoaXRlbSBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgICAgICAgICBpdGVtLmNhbmNlbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIFByb21pc2UudXNpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBpZiAobGVuIDwgMikgcmV0dXJuIGFwaVJlamVjdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieW91IG11c3QgcGFzcyBhdCBsZWFzdCAyIGFyZ3VtZW50cyB0byBQcm9taXNlLnVzaW5nXCIpO1xuICAgICAgICB2YXIgZm4gPSBhcmd1bWVudHNbbGVuIC0gMV07XG4gICAgICAgIGlmICh0eXBlb2YgZm4gIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgcmV0dXJuIGFwaVJlamVjdGlvbihcImV4cGVjdGluZyBhIGZ1bmN0aW9uIGJ1dCBnb3QgXCIgKyB1dGlsLmNsYXNzU3RyaW5nKGZuKSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGlucHV0O1xuICAgICAgICB2YXIgc3ByZWFkQXJncyA9IHRydWU7XG4gICAgICAgIGlmIChsZW4gPT09IDIgJiYgQXJyYXkuaXNBcnJheShhcmd1bWVudHNbMF0pKSB7XG4gICAgICAgICAgICBpbnB1dCA9IGFyZ3VtZW50c1swXTtcbiAgICAgICAgICAgIGxlbiA9IGlucHV0Lmxlbmd0aDtcbiAgICAgICAgICAgIHNwcmVhZEFyZ3MgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlucHV0ID0gYXJndW1lbnRzO1xuICAgICAgICAgICAgbGVuLS07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJlc291cmNlcyA9IG5ldyBSZXNvdXJjZUxpc3QobGVuKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgICAgICAgICAgdmFyIHJlc291cmNlID0gaW5wdXRbaV07XG4gICAgICAgICAgICBpZiAoRGlzcG9zZXIuaXNEaXNwb3NlcihyZXNvdXJjZSkpIHtcbiAgICAgICAgICAgICAgICB2YXIgZGlzcG9zZXIgPSByZXNvdXJjZTtcbiAgICAgICAgICAgICAgICByZXNvdXJjZSA9IHJlc291cmNlLnByb21pc2UoKTtcbiAgICAgICAgICAgICAgICByZXNvdXJjZS5fc2V0RGlzcG9zYWJsZShkaXNwb3Nlcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBtYXliZVByb21pc2UgPSB0cnlDb252ZXJ0VG9Qcm9taXNlKHJlc291cmNlKTtcbiAgICAgICAgICAgICAgICBpZiAobWF5YmVQcm9taXNlIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICAgICAgICAgICAgICByZXNvdXJjZSA9XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXliZVByb21pc2UuX3RoZW4obWF5YmVVbndyYXBEaXNwb3NlciwgbnVsbCwgbnVsbCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlczogcmVzb3VyY2VzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4OiBpXG4gICAgICAgICAgICAgICAgICAgIH0sIHVuZGVmaW5lZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb3VyY2VzW2ldID0gcmVzb3VyY2U7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcmVmbGVjdGVkUmVzb3VyY2VzID0gbmV3IEFycmF5KHJlc291cmNlcy5sZW5ndGgpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlZmxlY3RlZFJlc291cmNlcy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgcmVmbGVjdGVkUmVzb3VyY2VzW2ldID0gUHJvbWlzZS5yZXNvbHZlKHJlc291cmNlc1tpXSkucmVmbGVjdCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHJlc3VsdFByb21pc2UgPSBQcm9taXNlLmFsbChyZWZsZWN0ZWRSZXNvdXJjZXMpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihpbnNwZWN0aW9ucykge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaW5zcGVjdGlvbnMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGluc3BlY3Rpb24gPSBpbnNwZWN0aW9uc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluc3BlY3Rpb24uaXNSZWplY3RlZCgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvck9iai5lID0gaW5zcGVjdGlvbi5lcnJvcigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVycm9yT2JqO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFpbnNwZWN0aW9uLmlzRnVsZmlsbGVkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdFByb21pc2UuY2FuY2VsKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaW5zcGVjdGlvbnNbaV0gPSBpbnNwZWN0aW9uLnZhbHVlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHByb21pc2UuX3B1c2hDb250ZXh0KCk7XG5cbiAgICAgICAgICAgICAgICBmbiA9IHRyeUNhdGNoKGZuKTtcbiAgICAgICAgICAgICAgICB2YXIgcmV0ID0gc3ByZWFkQXJnc1xuICAgICAgICAgICAgICAgICAgICA/IGZuLmFwcGx5KHVuZGVmaW5lZCwgaW5zcGVjdGlvbnMpIDogZm4oaW5zcGVjdGlvbnMpO1xuICAgICAgICAgICAgICAgIHZhciBwcm9taXNlQ3JlYXRlZCA9IHByb21pc2UuX3BvcENvbnRleHQoKTtcbiAgICAgICAgICAgICAgICBkZWJ1Zy5jaGVja0ZvcmdvdHRlblJldHVybnMoXG4gICAgICAgICAgICAgICAgICAgIHJldCwgcHJvbWlzZUNyZWF0ZWQsIFwiUHJvbWlzZS51c2luZ1wiLCBwcm9taXNlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIHByb21pc2UgPSByZXN1bHRQcm9taXNlLmxhc3RseShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBpbnNwZWN0aW9uID0gbmV3IFByb21pc2UuUHJvbWlzZUluc3BlY3Rpb24ocmVzdWx0UHJvbWlzZSk7XG4gICAgICAgICAgICByZXR1cm4gZGlzcG9zZShyZXNvdXJjZXMsIGluc3BlY3Rpb24pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmVzb3VyY2VzLnByb21pc2UgPSBwcm9taXNlO1xuICAgICAgICBwcm9taXNlLl9zZXRPbkNhbmNlbChyZXNvdXJjZXMpO1xuICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9O1xuXG4gICAgUHJvbWlzZS5wcm90b3R5cGUuX3NldERpc3Bvc2FibGUgPSBmdW5jdGlvbiAoZGlzcG9zZXIpIHtcbiAgICAgICAgdGhpcy5fYml0RmllbGQgPSB0aGlzLl9iaXRGaWVsZCB8IDEzMTA3MjtcbiAgICAgICAgdGhpcy5fZGlzcG9zZXIgPSBkaXNwb3NlcjtcbiAgICB9O1xuXG4gICAgUHJvbWlzZS5wcm90b3R5cGUuX2lzRGlzcG9zYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLl9iaXRGaWVsZCAmIDEzMTA3MikgPiAwO1xuICAgIH07XG5cbiAgICBQcm9taXNlLnByb3RvdHlwZS5fZ2V0RGlzcG9zZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kaXNwb3NlcjtcbiAgICB9O1xuXG4gICAgUHJvbWlzZS5wcm90b3R5cGUuX3Vuc2V0RGlzcG9zYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fYml0RmllbGQgPSB0aGlzLl9iaXRGaWVsZCAmICh+MTMxMDcyKTtcbiAgICAgICAgdGhpcy5fZGlzcG9zZXIgPSB1bmRlZmluZWQ7XG4gICAgfTtcblxuICAgIFByb21pc2UucHJvdG90eXBlLmRpc3Bvc2VyID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgIGlmICh0eXBlb2YgZm4gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBGdW5jdGlvbkRpc3Bvc2VyKGZuLCB0aGlzLCBjcmVhdGVDb250ZXh0KCkpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoKTtcbiAgICB9O1xuXG59O1xuXG59LHtcIi4vZXJyb3JzXCI6MTIsXCIuL3V0aWxcIjozNn1dLDM2OltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xudmFyIGVzNSA9IF9kZXJlcV8oXCIuL2VzNVwiKTtcbnZhciBjYW5FdmFsdWF0ZSA9IHR5cGVvZiBuYXZpZ2F0b3IgPT0gXCJ1bmRlZmluZWRcIjtcblxudmFyIGVycm9yT2JqID0ge2U6IHt9fTtcbnZhciB0cnlDYXRjaFRhcmdldDtcbnZhciBnbG9iYWxPYmplY3QgPSB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOlxuICAgIHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOlxuICAgIHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOlxuICAgIHRoaXMgIT09IHVuZGVmaW5lZCA/IHRoaXMgOiBudWxsO1xuXG5mdW5jdGlvbiB0cnlDYXRjaGVyKCkge1xuICAgIHRyeSB7XG4gICAgICAgIHZhciB0YXJnZXQgPSB0cnlDYXRjaFRhcmdldDtcbiAgICAgICAgdHJ5Q2F0Y2hUYXJnZXQgPSBudWxsO1xuICAgICAgICByZXR1cm4gdGFyZ2V0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBlcnJvck9iai5lID0gZTtcbiAgICAgICAgcmV0dXJuIGVycm9yT2JqO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHRyeUNhdGNoKGZuKSB7XG4gICAgdHJ5Q2F0Y2hUYXJnZXQgPSBmbjtcbiAgICByZXR1cm4gdHJ5Q2F0Y2hlcjtcbn1cblxudmFyIGluaGVyaXRzID0gZnVuY3Rpb24oQ2hpbGQsIFBhcmVudCkge1xuICAgIHZhciBoYXNQcm9wID0ge30uaGFzT3duUHJvcGVydHk7XG5cbiAgICBmdW5jdGlvbiBUKCkge1xuICAgICAgICB0aGlzLmNvbnN0cnVjdG9yID0gQ2hpbGQ7XG4gICAgICAgIHRoaXMuY29uc3RydWN0b3IkID0gUGFyZW50O1xuICAgICAgICBmb3IgKHZhciBwcm9wZXJ0eU5hbWUgaW4gUGFyZW50LnByb3RvdHlwZSkge1xuICAgICAgICAgICAgaWYgKGhhc1Byb3AuY2FsbChQYXJlbnQucHJvdG90eXBlLCBwcm9wZXJ0eU5hbWUpICYmXG4gICAgICAgICAgICAgICAgcHJvcGVydHlOYW1lLmNoYXJBdChwcm9wZXJ0eU5hbWUubGVuZ3RoLTEpICE9PSBcIiRcIlxuICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICB0aGlzW3Byb3BlcnR5TmFtZSArIFwiJFwiXSA9IFBhcmVudC5wcm90b3R5cGVbcHJvcGVydHlOYW1lXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBULnByb3RvdHlwZSA9IFBhcmVudC5wcm90b3R5cGU7XG4gICAgQ2hpbGQucHJvdG90eXBlID0gbmV3IFQoKTtcbiAgICByZXR1cm4gQ2hpbGQucHJvdG90eXBlO1xufTtcblxuXG5mdW5jdGlvbiBpc1ByaW1pdGl2ZSh2YWwpIHtcbiAgICByZXR1cm4gdmFsID09IG51bGwgfHwgdmFsID09PSB0cnVlIHx8IHZhbCA9PT0gZmFsc2UgfHxcbiAgICAgICAgdHlwZW9mIHZhbCA9PT0gXCJzdHJpbmdcIiB8fCB0eXBlb2YgdmFsID09PSBcIm51bWJlclwiO1xuXG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiIHx8XG4gICAgICAgICAgIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiAmJiB2YWx1ZSAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gbWF5YmVXcmFwQXNFcnJvcihtYXliZUVycm9yKSB7XG4gICAgaWYgKCFpc1ByaW1pdGl2ZShtYXliZUVycm9yKSkgcmV0dXJuIG1heWJlRXJyb3I7XG5cbiAgICByZXR1cm4gbmV3IEVycm9yKHNhZmVUb1N0cmluZyhtYXliZUVycm9yKSk7XG59XG5cbmZ1bmN0aW9uIHdpdGhBcHBlbmRlZCh0YXJnZXQsIGFwcGVuZGVlKSB7XG4gICAgdmFyIGxlbiA9IHRhcmdldC5sZW5ndGg7XG4gICAgdmFyIHJldCA9IG5ldyBBcnJheShsZW4gKyAxKTtcbiAgICB2YXIgaTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgcmV0W2ldID0gdGFyZ2V0W2ldO1xuICAgIH1cbiAgICByZXRbaV0gPSBhcHBlbmRlZTtcbiAgICByZXR1cm4gcmV0O1xufVxuXG5mdW5jdGlvbiBnZXREYXRhUHJvcGVydHlPckRlZmF1bHQob2JqLCBrZXksIGRlZmF1bHRWYWx1ZSkge1xuICAgIGlmIChlczUuaXNFUzUpIHtcbiAgICAgICAgdmFyIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iaiwga2V5KTtcblxuICAgICAgICBpZiAoZGVzYyAhPSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gZGVzYy5nZXQgPT0gbnVsbCAmJiBkZXNjLnNldCA9PSBudWxsXG4gICAgICAgICAgICAgICAgICAgID8gZGVzYy52YWx1ZVxuICAgICAgICAgICAgICAgICAgICA6IGRlZmF1bHRWYWx1ZTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB7fS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KSA/IG9ialtrZXldIDogdW5kZWZpbmVkO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gbm90RW51bWVyYWJsZVByb3Aob2JqLCBuYW1lLCB2YWx1ZSkge1xuICAgIGlmIChpc1ByaW1pdGl2ZShvYmopKSByZXR1cm4gb2JqO1xuICAgIHZhciBkZXNjcmlwdG9yID0ge1xuICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgfTtcbiAgICBlczUuZGVmaW5lUHJvcGVydHkob2JqLCBuYW1lLCBkZXNjcmlwdG9yKTtcbiAgICByZXR1cm4gb2JqO1xufVxuXG5mdW5jdGlvbiB0aHJvd2VyKHIpIHtcbiAgICB0aHJvdyByO1xufVxuXG52YXIgaW5oZXJpdGVkRGF0YUtleXMgPSAoZnVuY3Rpb24oKSB7XG4gICAgdmFyIGV4Y2x1ZGVkUHJvdG90eXBlcyA9IFtcbiAgICAgICAgQXJyYXkucHJvdG90eXBlLFxuICAgICAgICBPYmplY3QucHJvdG90eXBlLFxuICAgICAgICBGdW5jdGlvbi5wcm90b3R5cGVcbiAgICBdO1xuXG4gICAgdmFyIGlzRXhjbHVkZWRQcm90byA9IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGV4Y2x1ZGVkUHJvdG90eXBlcy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgaWYgKGV4Y2x1ZGVkUHJvdG90eXBlc1tpXSA9PT0gdmFsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG5cbiAgICBpZiAoZXM1LmlzRVM1KSB7XG4gICAgICAgIHZhciBnZXRLZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXM7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgICAgIHZhciB2aXNpdGVkS2V5cyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICAgICAgICB3aGlsZSAob2JqICE9IG51bGwgJiYgIWlzRXhjbHVkZWRQcm90byhvYmopKSB7XG4gICAgICAgICAgICAgICAgdmFyIGtleXM7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAga2V5cyA9IGdldEtleXMob2JqKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZpc2l0ZWRLZXlzW2tleV0pIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB2aXNpdGVkS2V5c1trZXldID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iaiwga2V5KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRlc2MgIT0gbnVsbCAmJiBkZXNjLmdldCA9PSBudWxsICYmIGRlc2Muc2V0ID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldC5wdXNoKGtleSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb2JqID0gZXM1LmdldFByb3RvdHlwZU9mKG9iaik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBoYXNQcm9wID0ge30uaGFzT3duUHJvcGVydHk7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgICAgIGlmIChpc0V4Y2x1ZGVkUHJvdG8ob2JqKSkgcmV0dXJuIFtdO1xuICAgICAgICAgICAgdmFyIHJldCA9IFtdO1xuXG4gICAgICAgICAgICAvKmpzaGludCBmb3JpbjpmYWxzZSAqL1xuICAgICAgICAgICAgZW51bWVyYXRpb246IGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgICAgICAgICAgICBpZiAoaGFzUHJvcC5jYWxsKG9iaiwga2V5KSkge1xuICAgICAgICAgICAgICAgICAgICByZXQucHVzaChrZXkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZXhjbHVkZWRQcm90b3R5cGVzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaGFzUHJvcC5jYWxsKGV4Y2x1ZGVkUHJvdG90eXBlc1tpXSwga2V5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlIGVudW1lcmF0aW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldC5wdXNoKGtleSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgfTtcbiAgICB9XG5cbn0pKCk7XG5cbnZhciB0aGlzQXNzaWdubWVudFBhdHRlcm4gPSAvdGhpc1xccypcXC5cXHMqXFxTK1xccyo9LztcbmZ1bmN0aW9uIGlzQ2xhc3MoZm4pIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGZuID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHZhciBrZXlzID0gZXM1Lm5hbWVzKGZuLnByb3RvdHlwZSk7XG5cbiAgICAgICAgICAgIHZhciBoYXNNZXRob2RzID0gZXM1LmlzRVM1ICYmIGtleXMubGVuZ3RoID4gMTtcbiAgICAgICAgICAgIHZhciBoYXNNZXRob2RzT3RoZXJUaGFuQ29uc3RydWN0b3IgPSBrZXlzLmxlbmd0aCA+IDAgJiZcbiAgICAgICAgICAgICAgICAhKGtleXMubGVuZ3RoID09PSAxICYmIGtleXNbMF0gPT09IFwiY29uc3RydWN0b3JcIik7XG4gICAgICAgICAgICB2YXIgaGFzVGhpc0Fzc2lnbm1lbnRBbmRTdGF0aWNNZXRob2RzID1cbiAgICAgICAgICAgICAgICB0aGlzQXNzaWdubWVudFBhdHRlcm4udGVzdChmbiArIFwiXCIpICYmIGVzNS5uYW1lcyhmbikubGVuZ3RoID4gMDtcblxuICAgICAgICAgICAgaWYgKGhhc01ldGhvZHMgfHwgaGFzTWV0aG9kc090aGVyVGhhbkNvbnN0cnVjdG9yIHx8XG4gICAgICAgICAgICAgICAgaGFzVGhpc0Fzc2lnbm1lbnRBbmRTdGF0aWNNZXRob2RzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gdG9GYXN0UHJvcGVydGllcyhvYmopIHtcbiAgICAvKmpzaGludCAtVzAyNywtVzA1NSwtVzAzMSovXG4gICAgZnVuY3Rpb24gRmFrZUNvbnN0cnVjdG9yKCkge31cbiAgICBGYWtlQ29uc3RydWN0b3IucHJvdG90eXBlID0gb2JqO1xuICAgIHZhciBsID0gODtcbiAgICB3aGlsZSAobC0tKSBuZXcgRmFrZUNvbnN0cnVjdG9yKCk7XG4gICAgcmV0dXJuIG9iajtcbiAgICBldmFsKG9iaik7XG59XG5cbnZhciByaWRlbnQgPSAvXlthLXokX11bYS16JF8wLTldKiQvaTtcbmZ1bmN0aW9uIGlzSWRlbnRpZmllcihzdHIpIHtcbiAgICByZXR1cm4gcmlkZW50LnRlc3Qoc3RyKTtcbn1cblxuZnVuY3Rpb24gZmlsbGVkUmFuZ2UoY291bnQsIHByZWZpeCwgc3VmZml4KSB7XG4gICAgdmFyIHJldCA9IG5ldyBBcnJheShjb3VudCk7XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGNvdW50OyArK2kpIHtcbiAgICAgICAgcmV0W2ldID0gcHJlZml4ICsgaSArIHN1ZmZpeDtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbn1cblxuZnVuY3Rpb24gc2FmZVRvU3RyaW5nKG9iaikge1xuICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBvYmogKyBcIlwiO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIFwiW25vIHN0cmluZyByZXByZXNlbnRhdGlvbl1cIjtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGlzRXJyb3Iob2JqKSB7XG4gICAgcmV0dXJuIG9iaiAhPT0gbnVsbCAmJlxuICAgICAgICAgICB0eXBlb2Ygb2JqID09PSBcIm9iamVjdFwiICYmXG4gICAgICAgICAgIHR5cGVvZiBvYmoubWVzc2FnZSA9PT0gXCJzdHJpbmdcIiAmJlxuICAgICAgICAgICB0eXBlb2Ygb2JqLm5hbWUgPT09IFwic3RyaW5nXCI7XG59XG5cbmZ1bmN0aW9uIG1hcmtBc09yaWdpbmF0aW5nRnJvbVJlamVjdGlvbihlKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgbm90RW51bWVyYWJsZVByb3AoZSwgXCJpc09wZXJhdGlvbmFsXCIsIHRydWUpO1xuICAgIH1cbiAgICBjYXRjaChpZ25vcmUpIHt9XG59XG5cbmZ1bmN0aW9uIG9yaWdpbmF0ZXNGcm9tUmVqZWN0aW9uKGUpIHtcbiAgICBpZiAoZSA9PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuICgoZSBpbnN0YW5jZW9mIEVycm9yW1wiX19CbHVlYmlyZEVycm9yVHlwZXNfX1wiXS5PcGVyYXRpb25hbEVycm9yKSB8fFxuICAgICAgICBlW1wiaXNPcGVyYXRpb25hbFwiXSA9PT0gdHJ1ZSk7XG59XG5cbmZ1bmN0aW9uIGNhbkF0dGFjaFRyYWNlKG9iaikge1xuICAgIHJldHVybiBpc0Vycm9yKG9iaikgJiYgZXM1LnByb3BlcnR5SXNXcml0YWJsZShvYmosIFwic3RhY2tcIik7XG59XG5cbnZhciBlbnN1cmVFcnJvck9iamVjdCA9IChmdW5jdGlvbigpIHtcbiAgICBpZiAoIShcInN0YWNrXCIgaW4gbmV3IEVycm9yKCkpKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKGNhbkF0dGFjaFRyYWNlKHZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgICAgdHJ5IHt0aHJvdyBuZXcgRXJyb3Ioc2FmZVRvU3RyaW5nKHZhbHVlKSk7fVxuICAgICAgICAgICAgY2F0Y2goZXJyKSB7cmV0dXJuIGVycjt9XG4gICAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoY2FuQXR0YWNoVHJhY2UodmFsdWUpKSByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEVycm9yKHNhZmVUb1N0cmluZyh2YWx1ZSkpO1xuICAgICAgICB9O1xuICAgIH1cbn0pKCk7XG5cbmZ1bmN0aW9uIGNsYXNzU3RyaW5nKG9iaikge1xuICAgIHJldHVybiB7fS50b1N0cmluZy5jYWxsKG9iaik7XG59XG5cbmZ1bmN0aW9uIGNvcHlEZXNjcmlwdG9ycyhmcm9tLCB0bywgZmlsdGVyKSB7XG4gICAgdmFyIGtleXMgPSBlczUubmFtZXMoZnJvbSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgICBpZiAoZmlsdGVyKGtleSkpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgZXM1LmRlZmluZVByb3BlcnR5KHRvLCBrZXksIGVzNS5nZXREZXNjcmlwdG9yKGZyb20sIGtleSkpO1xuICAgICAgICAgICAgfSBjYXRjaCAoaWdub3JlKSB7fVxuICAgICAgICB9XG4gICAgfVxufVxuXG52YXIgYXNBcnJheSA9IGZ1bmN0aW9uKHYpIHtcbiAgICBpZiAoZXM1LmlzQXJyYXkodikpIHtcbiAgICAgICAgcmV0dXJuIHY7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufTtcblxuaWYgKHR5cGVvZiBTeW1ib2wgIT09IFwidW5kZWZpbmVkXCIgJiYgU3ltYm9sLml0ZXJhdG9yKSB7XG4gICAgdmFyIEFycmF5RnJvbSA9IHR5cGVvZiBBcnJheS5mcm9tID09PSBcImZ1bmN0aW9uXCIgPyBmdW5jdGlvbih2KSB7XG4gICAgICAgIHJldHVybiBBcnJheS5mcm9tKHYpO1xuICAgIH0gOiBmdW5jdGlvbih2KSB7XG4gICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgdmFyIGl0ID0gdltTeW1ib2wuaXRlcmF0b3JdKCk7XG4gICAgICAgIHZhciBpdFJlc3VsdDtcbiAgICAgICAgd2hpbGUgKCEoKGl0UmVzdWx0ID0gaXQubmV4dCgpKS5kb25lKSkge1xuICAgICAgICAgICAgcmV0LnB1c2goaXRSZXN1bHQudmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcblxuICAgIGFzQXJyYXkgPSBmdW5jdGlvbih2KSB7XG4gICAgICAgIGlmIChlczUuaXNBcnJheSh2KSkge1xuICAgICAgICAgICAgcmV0dXJuIHY7XG4gICAgICAgIH0gZWxzZSBpZiAodiAhPSBudWxsICYmIHR5cGVvZiB2W1N5bWJvbC5pdGVyYXRvcl0gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgcmV0dXJuIEFycmF5RnJvbSh2KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9O1xufVxuXG52YXIgaXNOb2RlID0gdHlwZW9mIHByb2Nlc3MgIT09IFwidW5kZWZpbmVkXCIgJiZcbiAgICAgICAgY2xhc3NTdHJpbmcocHJvY2VzcykudG9Mb3dlckNhc2UoKSA9PT0gXCJbb2JqZWN0IHByb2Nlc3NdXCI7XG5cbnZhciBoYXNFbnZWYXJpYWJsZXMgPSB0eXBlb2YgcHJvY2VzcyAhPT0gXCJ1bmRlZmluZWRcIiAmJlxuICAgIHR5cGVvZiBwcm9jZXNzLmVudiAhPT0gXCJ1bmRlZmluZWRcIjtcblxuZnVuY3Rpb24gZW52KGtleSkge1xuICAgIHJldHVybiBoYXNFbnZWYXJpYWJsZXMgPyBwcm9jZXNzLmVudltrZXldIDogdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiBnZXROYXRpdmVQcm9taXNlKCkge1xuICAgIGlmICh0eXBlb2YgUHJvbWlzZSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKCl7fSk7XG4gICAgICAgICAgICBpZiAoe30udG9TdHJpbmcuY2FsbChwcm9taXNlKSA9PT0gXCJbb2JqZWN0IFByb21pc2VdXCIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge31cbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRvbWFpbkJpbmQoc2VsZiwgY2IpIHtcbiAgICByZXR1cm4gc2VsZi5iaW5kKGNiKTtcbn1cblxudmFyIHJldCA9IHtcbiAgICBpc0NsYXNzOiBpc0NsYXNzLFxuICAgIGlzSWRlbnRpZmllcjogaXNJZGVudGlmaWVyLFxuICAgIGluaGVyaXRlZERhdGFLZXlzOiBpbmhlcml0ZWREYXRhS2V5cyxcbiAgICBnZXREYXRhUHJvcGVydHlPckRlZmF1bHQ6IGdldERhdGFQcm9wZXJ0eU9yRGVmYXVsdCxcbiAgICB0aHJvd2VyOiB0aHJvd2VyLFxuICAgIGlzQXJyYXk6IGVzNS5pc0FycmF5LFxuICAgIGFzQXJyYXk6IGFzQXJyYXksXG4gICAgbm90RW51bWVyYWJsZVByb3A6IG5vdEVudW1lcmFibGVQcm9wLFxuICAgIGlzUHJpbWl0aXZlOiBpc1ByaW1pdGl2ZSxcbiAgICBpc09iamVjdDogaXNPYmplY3QsXG4gICAgaXNFcnJvcjogaXNFcnJvcixcbiAgICBjYW5FdmFsdWF0ZTogY2FuRXZhbHVhdGUsXG4gICAgZXJyb3JPYmo6IGVycm9yT2JqLFxuICAgIHRyeUNhdGNoOiB0cnlDYXRjaCxcbiAgICBpbmhlcml0czogaW5oZXJpdHMsXG4gICAgd2l0aEFwcGVuZGVkOiB3aXRoQXBwZW5kZWQsXG4gICAgbWF5YmVXcmFwQXNFcnJvcjogbWF5YmVXcmFwQXNFcnJvcixcbiAgICB0b0Zhc3RQcm9wZXJ0aWVzOiB0b0Zhc3RQcm9wZXJ0aWVzLFxuICAgIGZpbGxlZFJhbmdlOiBmaWxsZWRSYW5nZSxcbiAgICB0b1N0cmluZzogc2FmZVRvU3RyaW5nLFxuICAgIGNhbkF0dGFjaFRyYWNlOiBjYW5BdHRhY2hUcmFjZSxcbiAgICBlbnN1cmVFcnJvck9iamVjdDogZW5zdXJlRXJyb3JPYmplY3QsXG4gICAgb3JpZ2luYXRlc0Zyb21SZWplY3Rpb246IG9yaWdpbmF0ZXNGcm9tUmVqZWN0aW9uLFxuICAgIG1hcmtBc09yaWdpbmF0aW5nRnJvbVJlamVjdGlvbjogbWFya0FzT3JpZ2luYXRpbmdGcm9tUmVqZWN0aW9uLFxuICAgIGNsYXNzU3RyaW5nOiBjbGFzc1N0cmluZyxcbiAgICBjb3B5RGVzY3JpcHRvcnM6IGNvcHlEZXNjcmlwdG9ycyxcbiAgICBoYXNEZXZUb29sczogdHlwZW9mIGNocm9tZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBjaHJvbWUgJiZcbiAgICAgICAgICAgICAgICAgdHlwZW9mIGNocm9tZS5sb2FkVGltZXMgPT09IFwiZnVuY3Rpb25cIixcbiAgICBpc05vZGU6IGlzTm9kZSxcbiAgICBoYXNFbnZWYXJpYWJsZXM6IGhhc0VudlZhcmlhYmxlcyxcbiAgICBlbnY6IGVudixcbiAgICBnbG9iYWw6IGdsb2JhbE9iamVjdCxcbiAgICBnZXROYXRpdmVQcm9taXNlOiBnZXROYXRpdmVQcm9taXNlLFxuICAgIGRvbWFpbkJpbmQ6IGRvbWFpbkJpbmRcbn07XG5yZXQuaXNSZWNlbnROb2RlID0gcmV0LmlzTm9kZSAmJiAoZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZlcnNpb24gPSBwcm9jZXNzLnZlcnNpb25zLm5vZGUuc3BsaXQoXCIuXCIpLm1hcChOdW1iZXIpO1xuICAgIHJldHVybiAodmVyc2lvblswXSA9PT0gMCAmJiB2ZXJzaW9uWzFdID4gMTApIHx8ICh2ZXJzaW9uWzBdID4gMCk7XG59KSgpO1xuXG5pZiAocmV0LmlzTm9kZSkgcmV0LnRvRmFzdFByb3BlcnRpZXMocHJvY2Vzcyk7XG5cbnRyeSB7dGhyb3cgbmV3IEVycm9yKCk7IH0gY2F0Y2ggKGUpIHtyZXQubGFzdExpbmVFcnJvciA9IGU7fVxubW9kdWxlLmV4cG9ydHMgPSByZXQ7XG5cbn0se1wiLi9lczVcIjoxM31dfSx7fSxbNF0pKDQpXG59KTsgICAgICAgICAgICAgICAgICAgIDtpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93ICE9PSBudWxsKSB7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5QID0gd2luZG93LlByb21pc2U7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJyAmJiBzZWxmICE9PSBudWxsKSB7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLlAgPSBzZWxmLlByb21pc2U7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSIsIlxyXG4vKipcclxuICogRXhwb3NlIGBFbWl0dGVyYC5cclxuICovXHJcblxyXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICBtb2R1bGUuZXhwb3J0cyA9IEVtaXR0ZXI7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBJbml0aWFsaXplIGEgbmV3IGBFbWl0dGVyYC5cclxuICpcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5mdW5jdGlvbiBFbWl0dGVyKG9iaikge1xyXG4gIGlmIChvYmopIHJldHVybiBtaXhpbihvYmopO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIE1peGluIHRoZSBlbWl0dGVyIHByb3BlcnRpZXMuXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcclxuICogQHJldHVybiB7T2JqZWN0fVxyXG4gKiBAYXBpIHByaXZhdGVcclxuICovXHJcblxyXG5mdW5jdGlvbiBtaXhpbihvYmopIHtcclxuICBmb3IgKHZhciBrZXkgaW4gRW1pdHRlci5wcm90b3R5cGUpIHtcclxuICAgIG9ialtrZXldID0gRW1pdHRlci5wcm90b3R5cGVba2V5XTtcclxuICB9XHJcbiAgcmV0dXJuIG9iajtcclxufVxyXG5cclxuLyoqXHJcbiAqIExpc3RlbiBvbiB0aGUgZ2l2ZW4gYGV2ZW50YCB3aXRoIGBmbmAuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxyXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcbkVtaXR0ZXIucHJvdG90eXBlLm9uID1cclxuRW1pdHRlci5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKGV2ZW50LCBmbil7XHJcbiAgdGhpcy5fY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzIHx8IHt9O1xyXG4gICh0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdID0gdGhpcy5fY2FsbGJhY2tzWyckJyArIGV2ZW50XSB8fCBbXSlcclxuICAgIC5wdXNoKGZuKTtcclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBZGRzIGFuIGBldmVudGAgbGlzdGVuZXIgdGhhdCB3aWxsIGJlIGludm9rZWQgYSBzaW5nbGVcclxuICogdGltZSB0aGVuIGF1dG9tYXRpY2FsbHkgcmVtb3ZlZC5cclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXHJcbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuRW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKGV2ZW50LCBmbil7XHJcbiAgZnVuY3Rpb24gb24oKSB7XHJcbiAgICB0aGlzLm9mZihldmVudCwgb24pO1xyXG4gICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxuICB9XHJcblxyXG4gIG9uLmZuID0gZm47XHJcbiAgdGhpcy5vbihldmVudCwgb24pO1xyXG4gIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlbW92ZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgZm9yIGBldmVudGAgb3IgYWxsXHJcbiAqIHJlZ2lzdGVyZWQgY2FsbGJhY2tzLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cclxuICogQHJldHVybiB7RW1pdHRlcn1cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5FbWl0dGVyLnByb3RvdHlwZS5vZmYgPVxyXG5FbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9XHJcbkVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9XHJcbkVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCwgZm4pe1xyXG4gIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcclxuXHJcbiAgLy8gYWxsXHJcbiAgaWYgKDAgPT0gYXJndW1lbnRzLmxlbmd0aCkge1xyXG4gICAgdGhpcy5fY2FsbGJhY2tzID0ge307XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIC8vIHNwZWNpZmljIGV2ZW50XHJcbiAgdmFyIGNhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrc1snJCcgKyBldmVudF07XHJcbiAgaWYgKCFjYWxsYmFja3MpIHJldHVybiB0aGlzO1xyXG5cclxuICAvLyByZW1vdmUgYWxsIGhhbmRsZXJzXHJcbiAgaWYgKDEgPT0gYXJndW1lbnRzLmxlbmd0aCkge1xyXG4gICAgZGVsZXRlIHRoaXMuX2NhbGxiYWNrc1snJCcgKyBldmVudF07XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIC8vIHJlbW92ZSBzcGVjaWZpYyBoYW5kbGVyXHJcbiAgdmFyIGNiO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY2FsbGJhY2tzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBjYiA9IGNhbGxiYWNrc1tpXTtcclxuICAgIGlmIChjYiA9PT0gZm4gfHwgY2IuZm4gPT09IGZuKSB7XHJcbiAgICAgIGNhbGxiYWNrcy5zcGxpY2UoaSwgMSk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBFbWl0IGBldmVudGAgd2l0aCB0aGUgZ2l2ZW4gYXJncy5cclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XHJcbiAqIEBwYXJhbSB7TWl4ZWR9IC4uLlxyXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxyXG4gKi9cclxuXHJcbkVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbihldmVudCl7XHJcbiAgdGhpcy5fY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzIHx8IHt9O1xyXG4gIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpXHJcbiAgICAsIGNhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrc1snJCcgKyBldmVudF07XHJcblxyXG4gIGlmIChjYWxsYmFja3MpIHtcclxuICAgIGNhbGxiYWNrcyA9IGNhbGxiYWNrcy5zbGljZSgwKTtcclxuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBjYWxsYmFja3MubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcclxuICAgICAgY2FsbGJhY2tzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogUmV0dXJuIGFycmF5IG9mIGNhbGxiYWNrcyBmb3IgYGV2ZW50YC5cclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XHJcbiAqIEByZXR1cm4ge0FycmF5fVxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcbkVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKGV2ZW50KXtcclxuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XHJcbiAgcmV0dXJuIHRoaXMuX2NhbGxiYWNrc1snJCcgKyBldmVudF0gfHwgW107XHJcbn07XHJcblxyXG4vKipcclxuICogQ2hlY2sgaWYgdGhpcyBlbWl0dGVyIGhhcyBgZXZlbnRgIGhhbmRsZXJzLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcclxuICogQHJldHVybiB7Qm9vbGVhbn1cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5FbWl0dGVyLnByb3RvdHlwZS5oYXNMaXN0ZW5lcnMgPSBmdW5jdGlvbihldmVudCl7XHJcbiAgcmV0dXJuICEhIHRoaXMubGlzdGVuZXJzKGV2ZW50KS5sZW5ndGg7XHJcbn07XHJcbiIsIid1c2Ugc3RyaWN0JztcblxuXG52YXIgeWFtbCA9IHJlcXVpcmUoJy4vbGliL2pzLXlhbWwuanMnKTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IHlhbWw7XG4iLCIndXNlIHN0cmljdCc7XG5cblxudmFyIGxvYWRlciA9IHJlcXVpcmUoJy4vanMteWFtbC9sb2FkZXInKTtcbnZhciBkdW1wZXIgPSByZXF1aXJlKCcuL2pzLXlhbWwvZHVtcGVyJyk7XG5cblxuZnVuY3Rpb24gZGVwcmVjYXRlZChuYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdGdW5jdGlvbiAnICsgbmFtZSArICcgaXMgZGVwcmVjYXRlZCBhbmQgY2Fubm90IGJlIHVzZWQuJyk7XG4gIH07XG59XG5cblxubW9kdWxlLmV4cG9ydHMuVHlwZSAgICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4vanMteWFtbC90eXBlJyk7XG5tb2R1bGUuZXhwb3J0cy5TY2hlbWEgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi9qcy15YW1sL3NjaGVtYScpO1xubW9kdWxlLmV4cG9ydHMuRkFJTFNBRkVfU0NIRU1BICAgICA9IHJlcXVpcmUoJy4vanMteWFtbC9zY2hlbWEvZmFpbHNhZmUnKTtcbm1vZHVsZS5leHBvcnRzLkpTT05fU0NIRU1BICAgICAgICAgPSByZXF1aXJlKCcuL2pzLXlhbWwvc2NoZW1hL2pzb24nKTtcbm1vZHVsZS5leHBvcnRzLkNPUkVfU0NIRU1BICAgICAgICAgPSByZXF1aXJlKCcuL2pzLXlhbWwvc2NoZW1hL2NvcmUnKTtcbm1vZHVsZS5leHBvcnRzLkRFRkFVTFRfU0FGRV9TQ0hFTUEgPSByZXF1aXJlKCcuL2pzLXlhbWwvc2NoZW1hL2RlZmF1bHRfc2FmZScpO1xubW9kdWxlLmV4cG9ydHMuREVGQVVMVF9GVUxMX1NDSEVNQSA9IHJlcXVpcmUoJy4vanMteWFtbC9zY2hlbWEvZGVmYXVsdF9mdWxsJyk7XG5tb2R1bGUuZXhwb3J0cy5sb2FkICAgICAgICAgICAgICAgID0gbG9hZGVyLmxvYWQ7XG5tb2R1bGUuZXhwb3J0cy5sb2FkQWxsICAgICAgICAgICAgID0gbG9hZGVyLmxvYWRBbGw7XG5tb2R1bGUuZXhwb3J0cy5zYWZlTG9hZCAgICAgICAgICAgID0gbG9hZGVyLnNhZmVMb2FkO1xubW9kdWxlLmV4cG9ydHMuc2FmZUxvYWRBbGwgICAgICAgICA9IGxvYWRlci5zYWZlTG9hZEFsbDtcbm1vZHVsZS5leHBvcnRzLmR1bXAgICAgICAgICAgICAgICAgPSBkdW1wZXIuZHVtcDtcbm1vZHVsZS5leHBvcnRzLnNhZmVEdW1wICAgICAgICAgICAgPSBkdW1wZXIuc2FmZUR1bXA7XG5tb2R1bGUuZXhwb3J0cy5ZQU1MRXhjZXB0aW9uICAgICAgID0gcmVxdWlyZSgnLi9qcy15YW1sL2V4Y2VwdGlvbicpO1xuXG4vLyBEZXByZWNhdGVkIHNjaGVtYSBuYW1lcyBmcm9tIEpTLVlBTUwgMi4wLnhcbm1vZHVsZS5leHBvcnRzLk1JTklNQUxfU0NIRU1BID0gcmVxdWlyZSgnLi9qcy15YW1sL3NjaGVtYS9mYWlsc2FmZScpO1xubW9kdWxlLmV4cG9ydHMuU0FGRV9TQ0hFTUEgICAgPSByZXF1aXJlKCcuL2pzLXlhbWwvc2NoZW1hL2RlZmF1bHRfc2FmZScpO1xubW9kdWxlLmV4cG9ydHMuREVGQVVMVF9TQ0hFTUEgPSByZXF1aXJlKCcuL2pzLXlhbWwvc2NoZW1hL2RlZmF1bHRfZnVsbCcpO1xuXG4vLyBEZXByZWNhdGVkIGZ1bmN0aW9ucyBmcm9tIEpTLVlBTUwgMS54Lnhcbm1vZHVsZS5leHBvcnRzLnNjYW4gICAgICAgICAgID0gZGVwcmVjYXRlZCgnc2NhbicpO1xubW9kdWxlLmV4cG9ydHMucGFyc2UgICAgICAgICAgPSBkZXByZWNhdGVkKCdwYXJzZScpO1xubW9kdWxlLmV4cG9ydHMuY29tcG9zZSAgICAgICAgPSBkZXByZWNhdGVkKCdjb21wb3NlJyk7XG5tb2R1bGUuZXhwb3J0cy5hZGRDb25zdHJ1Y3RvciA9IGRlcHJlY2F0ZWQoJ2FkZENvbnN0cnVjdG9yJyk7XG4iLCIndXNlIHN0cmljdCc7XG5cblxuZnVuY3Rpb24gaXNOb3RoaW5nKHN1YmplY3QpIHtcbiAgcmV0dXJuICh0eXBlb2Ygc3ViamVjdCA9PT0gJ3VuZGVmaW5lZCcpIHx8IChzdWJqZWN0ID09PSBudWxsKTtcbn1cblxuXG5mdW5jdGlvbiBpc09iamVjdChzdWJqZWN0KSB7XG4gIHJldHVybiAodHlwZW9mIHN1YmplY3QgPT09ICdvYmplY3QnKSAmJiAoc3ViamVjdCAhPT0gbnVsbCk7XG59XG5cblxuZnVuY3Rpb24gdG9BcnJheShzZXF1ZW5jZSkge1xuICBpZiAoQXJyYXkuaXNBcnJheShzZXF1ZW5jZSkpIHJldHVybiBzZXF1ZW5jZTtcbiAgZWxzZSBpZiAoaXNOb3RoaW5nKHNlcXVlbmNlKSkgcmV0dXJuIFtdO1xuXG4gIHJldHVybiBbIHNlcXVlbmNlIF07XG59XG5cblxuZnVuY3Rpb24gZXh0ZW5kKHRhcmdldCwgc291cmNlKSB7XG4gIHZhciBpbmRleCwgbGVuZ3RoLCBrZXksIHNvdXJjZUtleXM7XG5cbiAgaWYgKHNvdXJjZSkge1xuICAgIHNvdXJjZUtleXMgPSBPYmplY3Qua2V5cyhzb3VyY2UpO1xuXG4gICAgZm9yIChpbmRleCA9IDAsIGxlbmd0aCA9IHNvdXJjZUtleXMubGVuZ3RoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXggKz0gMSkge1xuICAgICAga2V5ID0gc291cmNlS2V5c1tpbmRleF07XG4gICAgICB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0YXJnZXQ7XG59XG5cblxuZnVuY3Rpb24gcmVwZWF0KHN0cmluZywgY291bnQpIHtcbiAgdmFyIHJlc3VsdCA9ICcnLCBjeWNsZTtcblxuICBmb3IgKGN5Y2xlID0gMDsgY3ljbGUgPCBjb3VudDsgY3ljbGUgKz0gMSkge1xuICAgIHJlc3VsdCArPSBzdHJpbmc7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5cbmZ1bmN0aW9uIGlzTmVnYXRpdmVaZXJvKG51bWJlcikge1xuICByZXR1cm4gKG51bWJlciA9PT0gMCkgJiYgKE51bWJlci5ORUdBVElWRV9JTkZJTklUWSA9PT0gMSAvIG51bWJlcik7XG59XG5cblxubW9kdWxlLmV4cG9ydHMuaXNOb3RoaW5nICAgICAgPSBpc05vdGhpbmc7XG5tb2R1bGUuZXhwb3J0cy5pc09iamVjdCAgICAgICA9IGlzT2JqZWN0O1xubW9kdWxlLmV4cG9ydHMudG9BcnJheSAgICAgICAgPSB0b0FycmF5O1xubW9kdWxlLmV4cG9ydHMucmVwZWF0ICAgICAgICAgPSByZXBlYXQ7XG5tb2R1bGUuZXhwb3J0cy5pc05lZ2F0aXZlWmVybyA9IGlzTmVnYXRpdmVaZXJvO1xubW9kdWxlLmV4cG9ydHMuZXh0ZW5kICAgICAgICAgPSBleHRlbmQ7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qZXNsaW50LWRpc2FibGUgbm8tdXNlLWJlZm9yZS1kZWZpbmUqL1xuXG52YXIgY29tbW9uICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4vY29tbW9uJyk7XG52YXIgWUFNTEV4Y2VwdGlvbiAgICAgICA9IHJlcXVpcmUoJy4vZXhjZXB0aW9uJyk7XG52YXIgREVGQVVMVF9GVUxMX1NDSEVNQSA9IHJlcXVpcmUoJy4vc2NoZW1hL2RlZmF1bHRfZnVsbCcpO1xudmFyIERFRkFVTFRfU0FGRV9TQ0hFTUEgPSByZXF1aXJlKCcuL3NjaGVtYS9kZWZhdWx0X3NhZmUnKTtcblxudmFyIF90b1N0cmluZyAgICAgICA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG52YXIgX2hhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxudmFyIENIQVJfVEFCICAgICAgICAgICAgICAgICAgPSAweDA5OyAvKiBUYWIgKi9cbnZhciBDSEFSX0xJTkVfRkVFRCAgICAgICAgICAgID0gMHgwQTsgLyogTEYgKi9cbnZhciBDSEFSX1NQQUNFICAgICAgICAgICAgICAgID0gMHgyMDsgLyogU3BhY2UgKi9cbnZhciBDSEFSX0VYQ0xBTUFUSU9OICAgICAgICAgID0gMHgyMTsgLyogISAqL1xudmFyIENIQVJfRE9VQkxFX1FVT1RFICAgICAgICAgPSAweDIyOyAvKiBcIiAqL1xudmFyIENIQVJfU0hBUlAgICAgICAgICAgICAgICAgPSAweDIzOyAvKiAjICovXG52YXIgQ0hBUl9QRVJDRU5UICAgICAgICAgICAgICA9IDB4MjU7IC8qICUgKi9cbnZhciBDSEFSX0FNUEVSU0FORCAgICAgICAgICAgID0gMHgyNjsgLyogJiAqL1xudmFyIENIQVJfU0lOR0xFX1FVT1RFICAgICAgICAgPSAweDI3OyAvKiAnICovXG52YXIgQ0hBUl9BU1RFUklTSyAgICAgICAgICAgICA9IDB4MkE7IC8qICogKi9cbnZhciBDSEFSX0NPTU1BICAgICAgICAgICAgICAgID0gMHgyQzsgLyogLCAqL1xudmFyIENIQVJfTUlOVVMgICAgICAgICAgICAgICAgPSAweDJEOyAvKiAtICovXG52YXIgQ0hBUl9DT0xPTiAgICAgICAgICAgICAgICA9IDB4M0E7IC8qIDogKi9cbnZhciBDSEFSX0dSRUFURVJfVEhBTiAgICAgICAgID0gMHgzRTsgLyogPiAqL1xudmFyIENIQVJfUVVFU1RJT04gICAgICAgICAgICAgPSAweDNGOyAvKiA/ICovXG52YXIgQ0hBUl9DT01NRVJDSUFMX0FUICAgICAgICA9IDB4NDA7IC8qIEAgKi9cbnZhciBDSEFSX0xFRlRfU1FVQVJFX0JSQUNLRVQgID0gMHg1QjsgLyogWyAqL1xudmFyIENIQVJfUklHSFRfU1FVQVJFX0JSQUNLRVQgPSAweDVEOyAvKiBdICovXG52YXIgQ0hBUl9HUkFWRV9BQ0NFTlQgICAgICAgICA9IDB4NjA7IC8qIGAgKi9cbnZhciBDSEFSX0xFRlRfQ1VSTFlfQlJBQ0tFVCAgID0gMHg3QjsgLyogeyAqL1xudmFyIENIQVJfVkVSVElDQUxfTElORSAgICAgICAgPSAweDdDOyAvKiB8ICovXG52YXIgQ0hBUl9SSUdIVF9DVVJMWV9CUkFDS0VUICA9IDB4N0Q7IC8qIH0gKi9cblxudmFyIEVTQ0FQRV9TRVFVRU5DRVMgPSB7fTtcblxuRVNDQVBFX1NFUVVFTkNFU1sweDAwXSAgID0gJ1xcXFwwJztcbkVTQ0FQRV9TRVFVRU5DRVNbMHgwN10gICA9ICdcXFxcYSc7XG5FU0NBUEVfU0VRVUVOQ0VTWzB4MDhdICAgPSAnXFxcXGInO1xuRVNDQVBFX1NFUVVFTkNFU1sweDA5XSAgID0gJ1xcXFx0JztcbkVTQ0FQRV9TRVFVRU5DRVNbMHgwQV0gICA9ICdcXFxcbic7XG5FU0NBUEVfU0VRVUVOQ0VTWzB4MEJdICAgPSAnXFxcXHYnO1xuRVNDQVBFX1NFUVVFTkNFU1sweDBDXSAgID0gJ1xcXFxmJztcbkVTQ0FQRV9TRVFVRU5DRVNbMHgwRF0gICA9ICdcXFxccic7XG5FU0NBUEVfU0VRVUVOQ0VTWzB4MUJdICAgPSAnXFxcXGUnO1xuRVNDQVBFX1NFUVVFTkNFU1sweDIyXSAgID0gJ1xcXFxcIic7XG5FU0NBUEVfU0VRVUVOQ0VTWzB4NUNdICAgPSAnXFxcXFxcXFwnO1xuRVNDQVBFX1NFUVVFTkNFU1sweDg1XSAgID0gJ1xcXFxOJztcbkVTQ0FQRV9TRVFVRU5DRVNbMHhBMF0gICA9ICdcXFxcXyc7XG5FU0NBUEVfU0VRVUVOQ0VTWzB4MjAyOF0gPSAnXFxcXEwnO1xuRVNDQVBFX1NFUVVFTkNFU1sweDIwMjldID0gJ1xcXFxQJztcblxudmFyIERFUFJFQ0FURURfQk9PTEVBTlNfU1lOVEFYID0gW1xuICAneScsICdZJywgJ3llcycsICdZZXMnLCAnWUVTJywgJ29uJywgJ09uJywgJ09OJyxcbiAgJ24nLCAnTicsICdubycsICdObycsICdOTycsICdvZmYnLCAnT2ZmJywgJ09GRidcbl07XG5cbmZ1bmN0aW9uIGNvbXBpbGVTdHlsZU1hcChzY2hlbWEsIG1hcCkge1xuICB2YXIgcmVzdWx0LCBrZXlzLCBpbmRleCwgbGVuZ3RoLCB0YWcsIHN0eWxlLCB0eXBlO1xuXG4gIGlmIChtYXAgPT09IG51bGwpIHJldHVybiB7fTtcblxuICByZXN1bHQgPSB7fTtcbiAga2V5cyA9IE9iamVjdC5rZXlzKG1hcCk7XG5cbiAgZm9yIChpbmRleCA9IDAsIGxlbmd0aCA9IGtleXMubGVuZ3RoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXggKz0gMSkge1xuICAgIHRhZyA9IGtleXNbaW5kZXhdO1xuICAgIHN0eWxlID0gU3RyaW5nKG1hcFt0YWddKTtcblxuICAgIGlmICh0YWcuc2xpY2UoMCwgMikgPT09ICchIScpIHtcbiAgICAgIHRhZyA9ICd0YWc6eWFtbC5vcmcsMjAwMjonICsgdGFnLnNsaWNlKDIpO1xuICAgIH1cbiAgICB0eXBlID0gc2NoZW1hLmNvbXBpbGVkVHlwZU1hcFsnZmFsbGJhY2snXVt0YWddO1xuXG4gICAgaWYgKHR5cGUgJiYgX2hhc093blByb3BlcnR5LmNhbGwodHlwZS5zdHlsZUFsaWFzZXMsIHN0eWxlKSkge1xuICAgICAgc3R5bGUgPSB0eXBlLnN0eWxlQWxpYXNlc1tzdHlsZV07XG4gICAgfVxuXG4gICAgcmVzdWx0W3RhZ10gPSBzdHlsZTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGVuY29kZUhleChjaGFyYWN0ZXIpIHtcbiAgdmFyIHN0cmluZywgaGFuZGxlLCBsZW5ndGg7XG5cbiAgc3RyaW5nID0gY2hhcmFjdGVyLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpO1xuXG4gIGlmIChjaGFyYWN0ZXIgPD0gMHhGRikge1xuICAgIGhhbmRsZSA9ICd4JztcbiAgICBsZW5ndGggPSAyO1xuICB9IGVsc2UgaWYgKGNoYXJhY3RlciA8PSAweEZGRkYpIHtcbiAgICBoYW5kbGUgPSAndSc7XG4gICAgbGVuZ3RoID0gNDtcbiAgfSBlbHNlIGlmIChjaGFyYWN0ZXIgPD0gMHhGRkZGRkZGRikge1xuICAgIGhhbmRsZSA9ICdVJztcbiAgICBsZW5ndGggPSA4O1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBZQU1MRXhjZXB0aW9uKCdjb2RlIHBvaW50IHdpdGhpbiBhIHN0cmluZyBtYXkgbm90IGJlIGdyZWF0ZXIgdGhhbiAweEZGRkZGRkZGJyk7XG4gIH1cblxuICByZXR1cm4gJ1xcXFwnICsgaGFuZGxlICsgY29tbW9uLnJlcGVhdCgnMCcsIGxlbmd0aCAtIHN0cmluZy5sZW5ndGgpICsgc3RyaW5nO1xufVxuXG5mdW5jdGlvbiBTdGF0ZShvcHRpb25zKSB7XG4gIHRoaXMuc2NoZW1hICAgICAgID0gb3B0aW9uc1snc2NoZW1hJ10gfHwgREVGQVVMVF9GVUxMX1NDSEVNQTtcbiAgdGhpcy5pbmRlbnQgICAgICAgPSBNYXRoLm1heCgxLCAob3B0aW9uc1snaW5kZW50J10gfHwgMikpO1xuICB0aGlzLnNraXBJbnZhbGlkICA9IG9wdGlvbnNbJ3NraXBJbnZhbGlkJ10gfHwgZmFsc2U7XG4gIHRoaXMuZmxvd0xldmVsICAgID0gKGNvbW1vbi5pc05vdGhpbmcob3B0aW9uc1snZmxvd0xldmVsJ10pID8gLTEgOiBvcHRpb25zWydmbG93TGV2ZWwnXSk7XG4gIHRoaXMuc3R5bGVNYXAgICAgID0gY29tcGlsZVN0eWxlTWFwKHRoaXMuc2NoZW1hLCBvcHRpb25zWydzdHlsZXMnXSB8fCBudWxsKTtcbiAgdGhpcy5zb3J0S2V5cyAgICAgPSBvcHRpb25zWydzb3J0S2V5cyddIHx8IGZhbHNlO1xuICB0aGlzLmxpbmVXaWR0aCAgICA9IG9wdGlvbnNbJ2xpbmVXaWR0aCddIHx8IDgwO1xuICB0aGlzLm5vUmVmcyAgICAgICA9IG9wdGlvbnNbJ25vUmVmcyddIHx8IGZhbHNlO1xuICB0aGlzLm5vQ29tcGF0TW9kZSA9IG9wdGlvbnNbJ25vQ29tcGF0TW9kZSddIHx8IGZhbHNlO1xuXG4gIHRoaXMuaW1wbGljaXRUeXBlcyA9IHRoaXMuc2NoZW1hLmNvbXBpbGVkSW1wbGljaXQ7XG4gIHRoaXMuZXhwbGljaXRUeXBlcyA9IHRoaXMuc2NoZW1hLmNvbXBpbGVkRXhwbGljaXQ7XG5cbiAgdGhpcy50YWcgPSBudWxsO1xuICB0aGlzLnJlc3VsdCA9ICcnO1xuXG4gIHRoaXMuZHVwbGljYXRlcyA9IFtdO1xuICB0aGlzLnVzZWREdXBsaWNhdGVzID0gbnVsbDtcbn1cblxuLy8gSW5kZW50cyBldmVyeSBsaW5lIGluIGEgc3RyaW5nLiBFbXB0eSBsaW5lcyAoXFxuIG9ubHkpIGFyZSBub3QgaW5kZW50ZWQuXG5mdW5jdGlvbiBpbmRlbnRTdHJpbmcoc3RyaW5nLCBzcGFjZXMpIHtcbiAgdmFyIGluZCA9IGNvbW1vbi5yZXBlYXQoJyAnLCBzcGFjZXMpLFxuICAgICAgcG9zaXRpb24gPSAwLFxuICAgICAgbmV4dCA9IC0xLFxuICAgICAgcmVzdWx0ID0gJycsXG4gICAgICBsaW5lLFxuICAgICAgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aDtcblxuICB3aGlsZSAocG9zaXRpb24gPCBsZW5ndGgpIHtcbiAgICBuZXh0ID0gc3RyaW5nLmluZGV4T2YoJ1xcbicsIHBvc2l0aW9uKTtcbiAgICBpZiAobmV4dCA9PT0gLTEpIHtcbiAgICAgIGxpbmUgPSBzdHJpbmcuc2xpY2UocG9zaXRpb24pO1xuICAgICAgcG9zaXRpb24gPSBsZW5ndGg7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpbmUgPSBzdHJpbmcuc2xpY2UocG9zaXRpb24sIG5leHQgKyAxKTtcbiAgICAgIHBvc2l0aW9uID0gbmV4dCArIDE7XG4gICAgfVxuXG4gICAgaWYgKGxpbmUubGVuZ3RoICYmIGxpbmUgIT09ICdcXG4nKSByZXN1bHQgKz0gaW5kO1xuXG4gICAgcmVzdWx0ICs9IGxpbmU7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZU5leHRMaW5lKHN0YXRlLCBsZXZlbCkge1xuICByZXR1cm4gJ1xcbicgKyBjb21tb24ucmVwZWF0KCcgJywgc3RhdGUuaW5kZW50ICogbGV2ZWwpO1xufVxuXG5mdW5jdGlvbiB0ZXN0SW1wbGljaXRSZXNvbHZpbmcoc3RhdGUsIHN0cikge1xuICB2YXIgaW5kZXgsIGxlbmd0aCwgdHlwZTtcblxuICBmb3IgKGluZGV4ID0gMCwgbGVuZ3RoID0gc3RhdGUuaW1wbGljaXRUeXBlcy5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSAxKSB7XG4gICAgdHlwZSA9IHN0YXRlLmltcGxpY2l0VHlwZXNbaW5kZXhdO1xuXG4gICAgaWYgKHR5cGUucmVzb2x2ZShzdHIpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8vIFszM10gcy13aGl0ZSA6Oj0gcy1zcGFjZSB8IHMtdGFiXG5mdW5jdGlvbiBpc1doaXRlc3BhY2UoYykge1xuICByZXR1cm4gYyA9PT0gQ0hBUl9TUEFDRSB8fCBjID09PSBDSEFSX1RBQjtcbn1cblxuLy8gUmV0dXJucyB0cnVlIGlmIHRoZSBjaGFyYWN0ZXIgY2FuIGJlIHByaW50ZWQgd2l0aG91dCBlc2NhcGluZy5cbi8vIEZyb20gWUFNTCAxLjI6IFwiYW55IGFsbG93ZWQgY2hhcmFjdGVycyBrbm93biB0byBiZSBub24tcHJpbnRhYmxlXG4vLyBzaG91bGQgYWxzbyBiZSBlc2NhcGVkLiBbSG93ZXZlcixdIFRoaXMgaXNu4oCZdCBtYW5kYXRvcnlcIlxuLy8gRGVyaXZlZCBmcm9tIG5iLWNoYXIgLSBcXHQgLSAjeDg1IC0gI3hBMCAtICN4MjAyOCAtICN4MjAyOS5cbmZ1bmN0aW9uIGlzUHJpbnRhYmxlKGMpIHtcbiAgcmV0dXJuICAoMHgwMDAyMCA8PSBjICYmIGMgPD0gMHgwMDAwN0UpXG4gICAgICB8fCAoKDB4MDAwQTEgPD0gYyAmJiBjIDw9IDB4MDBEN0ZGKSAmJiBjICE9PSAweDIwMjggJiYgYyAhPT0gMHgyMDI5KVxuICAgICAgfHwgKCgweDBFMDAwIDw9IGMgJiYgYyA8PSAweDAwRkZGRCkgJiYgYyAhPT0gMHhGRUZGIC8qIEJPTSAqLylcbiAgICAgIHx8ICAoMHgxMDAwMCA8PSBjICYmIGMgPD0gMHgxMEZGRkYpO1xufVxuXG4vLyBTaW1wbGlmaWVkIHRlc3QgZm9yIHZhbHVlcyBhbGxvd2VkIGFmdGVyIHRoZSBmaXJzdCBjaGFyYWN0ZXIgaW4gcGxhaW4gc3R5bGUuXG5mdW5jdGlvbiBpc1BsYWluU2FmZShjKSB7XG4gIC8vIFVzZXMgYSBzdWJzZXQgb2YgbmItY2hhciAtIGMtZmxvdy1pbmRpY2F0b3IgLSBcIjpcIiAtIFwiI1wiXG4gIC8vIHdoZXJlIG5iLWNoYXIgOjo9IGMtcHJpbnRhYmxlIC0gYi1jaGFyIC0gYy1ieXRlLW9yZGVyLW1hcmsuXG4gIHJldHVybiBpc1ByaW50YWJsZShjKSAmJiBjICE9PSAweEZFRkZcbiAgICAvLyAtIGMtZmxvdy1pbmRpY2F0b3JcbiAgICAmJiBjICE9PSBDSEFSX0NPTU1BXG4gICAgJiYgYyAhPT0gQ0hBUl9MRUZUX1NRVUFSRV9CUkFDS0VUXG4gICAgJiYgYyAhPT0gQ0hBUl9SSUdIVF9TUVVBUkVfQlJBQ0tFVFxuICAgICYmIGMgIT09IENIQVJfTEVGVF9DVVJMWV9CUkFDS0VUXG4gICAgJiYgYyAhPT0gQ0hBUl9SSUdIVF9DVVJMWV9CUkFDS0VUXG4gICAgLy8gLSBcIjpcIiAtIFwiI1wiXG4gICAgJiYgYyAhPT0gQ0hBUl9DT0xPTlxuICAgICYmIGMgIT09IENIQVJfU0hBUlA7XG59XG5cbi8vIFNpbXBsaWZpZWQgdGVzdCBmb3IgdmFsdWVzIGFsbG93ZWQgYXMgdGhlIGZpcnN0IGNoYXJhY3RlciBpbiBwbGFpbiBzdHlsZS5cbmZ1bmN0aW9uIGlzUGxhaW5TYWZlRmlyc3QoYykge1xuICAvLyBVc2VzIGEgc3Vic2V0IG9mIG5zLWNoYXIgLSBjLWluZGljYXRvclxuICAvLyB3aGVyZSBucy1jaGFyID0gbmItY2hhciAtIHMtd2hpdGUuXG4gIHJldHVybiBpc1ByaW50YWJsZShjKSAmJiBjICE9PSAweEZFRkZcbiAgICAmJiAhaXNXaGl0ZXNwYWNlKGMpIC8vIC0gcy13aGl0ZVxuICAgIC8vIC0gKGMtaW5kaWNhdG9yIDo6PVxuICAgIC8vIOKAnC3igJ0gfCDigJw/4oCdIHwg4oCcOuKAnSB8IOKAnCzigJ0gfCDigJxb4oCdIHwg4oCcXeKAnSB8IOKAnHvigJ0gfCDigJx94oCdXG4gICAgJiYgYyAhPT0gQ0hBUl9NSU5VU1xuICAgICYmIGMgIT09IENIQVJfUVVFU1RJT05cbiAgICAmJiBjICE9PSBDSEFSX0NPTE9OXG4gICAgJiYgYyAhPT0gQ0hBUl9DT01NQVxuICAgICYmIGMgIT09IENIQVJfTEVGVF9TUVVBUkVfQlJBQ0tFVFxuICAgICYmIGMgIT09IENIQVJfUklHSFRfU1FVQVJFX0JSQUNLRVRcbiAgICAmJiBjICE9PSBDSEFSX0xFRlRfQ1VSTFlfQlJBQ0tFVFxuICAgICYmIGMgIT09IENIQVJfUklHSFRfQ1VSTFlfQlJBQ0tFVFxuICAgIC8vIHwg4oCcI+KAnSB8IOKAnCbigJ0gfCDigJwq4oCdIHwg4oCcIeKAnSB8IOKAnHzigJ0gfCDigJw+4oCdIHwg4oCcJ+KAnSB8IOKAnFwi4oCdXG4gICAgJiYgYyAhPT0gQ0hBUl9TSEFSUFxuICAgICYmIGMgIT09IENIQVJfQU1QRVJTQU5EXG4gICAgJiYgYyAhPT0gQ0hBUl9BU1RFUklTS1xuICAgICYmIGMgIT09IENIQVJfRVhDTEFNQVRJT05cbiAgICAmJiBjICE9PSBDSEFSX1ZFUlRJQ0FMX0xJTkVcbiAgICAmJiBjICE9PSBDSEFSX0dSRUFURVJfVEhBTlxuICAgICYmIGMgIT09IENIQVJfU0lOR0xFX1FVT1RFXG4gICAgJiYgYyAhPT0gQ0hBUl9ET1VCTEVfUVVPVEVcbiAgICAvLyB8IOKAnCXigJ0gfCDigJxA4oCdIHwg4oCcYOKAnSlcbiAgICAmJiBjICE9PSBDSEFSX1BFUkNFTlRcbiAgICAmJiBjICE9PSBDSEFSX0NPTU1FUkNJQUxfQVRcbiAgICAmJiBjICE9PSBDSEFSX0dSQVZFX0FDQ0VOVDtcbn1cblxudmFyIFNUWUxFX1BMQUlOICAgPSAxLFxuICAgIFNUWUxFX1NJTkdMRSAgPSAyLFxuICAgIFNUWUxFX0xJVEVSQUwgPSAzLFxuICAgIFNUWUxFX0ZPTERFRCAgPSA0LFxuICAgIFNUWUxFX0RPVUJMRSAgPSA1O1xuXG4vLyBEZXRlcm1pbmVzIHdoaWNoIHNjYWxhciBzdHlsZXMgYXJlIHBvc3NpYmxlIGFuZCByZXR1cm5zIHRoZSBwcmVmZXJyZWQgc3R5bGUuXG4vLyBsaW5lV2lkdGggPSAtMSA9PiBubyBsaW1pdC5cbi8vIFByZS1jb25kaXRpb25zOiBzdHIubGVuZ3RoID4gMC5cbi8vIFBvc3QtY29uZGl0aW9uczpcbi8vICAgIFNUWUxFX1BMQUlOIG9yIFNUWUxFX1NJTkdMRSA9PiBubyBcXG4gYXJlIGluIHRoZSBzdHJpbmcuXG4vLyAgICBTVFlMRV9MSVRFUkFMID0+IG5vIGxpbmVzIGFyZSBzdWl0YWJsZSBmb3IgZm9sZGluZyAob3IgbGluZVdpZHRoIGlzIC0xKS5cbi8vICAgIFNUWUxFX0ZPTERFRCA9PiBhIGxpbmUgPiBsaW5lV2lkdGggYW5kIGNhbiBiZSBmb2xkZWQgKGFuZCBsaW5lV2lkdGggIT0gLTEpLlxuZnVuY3Rpb24gY2hvb3NlU2NhbGFyU3R5bGUoc3RyaW5nLCBzaW5nbGVMaW5lT25seSwgaW5kZW50UGVyTGV2ZWwsIGxpbmVXaWR0aCwgdGVzdEFtYmlndW91c1R5cGUpIHtcbiAgdmFyIGk7XG4gIHZhciBjaGFyO1xuICB2YXIgaGFzTGluZUJyZWFrID0gZmFsc2U7XG4gIHZhciBoYXNGb2xkYWJsZUxpbmUgPSBmYWxzZTsgLy8gb25seSBjaGVja2VkIGlmIHNob3VsZFRyYWNrV2lkdGhcbiAgdmFyIHNob3VsZFRyYWNrV2lkdGggPSBsaW5lV2lkdGggIT09IC0xO1xuICB2YXIgcHJldmlvdXNMaW5lQnJlYWsgPSAtMTsgLy8gY291bnQgdGhlIGZpcnN0IGxpbmUgY29ycmVjdGx5XG4gIHZhciBwbGFpbiA9IGlzUGxhaW5TYWZlRmlyc3Qoc3RyaW5nLmNoYXJDb2RlQXQoMCkpXG4gICAgICAgICAgJiYgIWlzV2hpdGVzcGFjZShzdHJpbmcuY2hhckNvZGVBdChzdHJpbmcubGVuZ3RoIC0gMSkpO1xuXG4gIGlmIChzaW5nbGVMaW5lT25seSkge1xuICAgIC8vIENhc2U6IG5vIGJsb2NrIHN0eWxlcy5cbiAgICAvLyBDaGVjayBmb3IgZGlzYWxsb3dlZCBjaGFyYWN0ZXJzIHRvIHJ1bGUgb3V0IHBsYWluIGFuZCBzaW5nbGUuXG4gICAgZm9yIChpID0gMDsgaSA8IHN0cmluZy5sZW5ndGg7IGkrKykge1xuICAgICAgY2hhciA9IHN0cmluZy5jaGFyQ29kZUF0KGkpO1xuICAgICAgaWYgKCFpc1ByaW50YWJsZShjaGFyKSkge1xuICAgICAgICByZXR1cm4gU1RZTEVfRE9VQkxFO1xuICAgICAgfVxuICAgICAgcGxhaW4gPSBwbGFpbiAmJiBpc1BsYWluU2FmZShjaGFyKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gQ2FzZTogYmxvY2sgc3R5bGVzIHBlcm1pdHRlZC5cbiAgICBmb3IgKGkgPSAwOyBpIDwgc3RyaW5nLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjaGFyID0gc3RyaW5nLmNoYXJDb2RlQXQoaSk7XG4gICAgICBpZiAoY2hhciA9PT0gQ0hBUl9MSU5FX0ZFRUQpIHtcbiAgICAgICAgaGFzTGluZUJyZWFrID0gdHJ1ZTtcbiAgICAgICAgLy8gQ2hlY2sgaWYgYW55IGxpbmUgY2FuIGJlIGZvbGRlZC5cbiAgICAgICAgaWYgKHNob3VsZFRyYWNrV2lkdGgpIHtcbiAgICAgICAgICBoYXNGb2xkYWJsZUxpbmUgPSBoYXNGb2xkYWJsZUxpbmUgfHxcbiAgICAgICAgICAgIC8vIEZvbGRhYmxlIGxpbmUgPSB0b28gbG9uZywgYW5kIG5vdCBtb3JlLWluZGVudGVkLlxuICAgICAgICAgICAgKGkgLSBwcmV2aW91c0xpbmVCcmVhayAtIDEgPiBsaW5lV2lkdGggJiZcbiAgICAgICAgICAgICBzdHJpbmdbcHJldmlvdXNMaW5lQnJlYWsgKyAxXSAhPT0gJyAnKTtcbiAgICAgICAgICBwcmV2aW91c0xpbmVCcmVhayA9IGk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoIWlzUHJpbnRhYmxlKGNoYXIpKSB7XG4gICAgICAgIHJldHVybiBTVFlMRV9ET1VCTEU7XG4gICAgICB9XG4gICAgICBwbGFpbiA9IHBsYWluICYmIGlzUGxhaW5TYWZlKGNoYXIpO1xuICAgIH1cbiAgICAvLyBpbiBjYXNlIHRoZSBlbmQgaXMgbWlzc2luZyBhIFxcblxuICAgIGhhc0ZvbGRhYmxlTGluZSA9IGhhc0ZvbGRhYmxlTGluZSB8fCAoc2hvdWxkVHJhY2tXaWR0aCAmJlxuICAgICAgKGkgLSBwcmV2aW91c0xpbmVCcmVhayAtIDEgPiBsaW5lV2lkdGggJiZcbiAgICAgICBzdHJpbmdbcHJldmlvdXNMaW5lQnJlYWsgKyAxXSAhPT0gJyAnKSk7XG4gIH1cbiAgLy8gQWx0aG91Z2ggZXZlcnkgc3R5bGUgY2FuIHJlcHJlc2VudCBcXG4gd2l0aG91dCBlc2NhcGluZywgcHJlZmVyIGJsb2NrIHN0eWxlc1xuICAvLyBmb3IgbXVsdGlsaW5lLCBzaW5jZSB0aGV5J3JlIG1vcmUgcmVhZGFibGUgYW5kIHRoZXkgZG9uJ3QgYWRkIGVtcHR5IGxpbmVzLlxuICAvLyBBbHNvIHByZWZlciBmb2xkaW5nIGEgc3VwZXItbG9uZyBsaW5lLlxuICBpZiAoIWhhc0xpbmVCcmVhayAmJiAhaGFzRm9sZGFibGVMaW5lKSB7XG4gICAgLy8gU3RyaW5ncyBpbnRlcnByZXRhYmxlIGFzIGFub3RoZXIgdHlwZSBoYXZlIHRvIGJlIHF1b3RlZDtcbiAgICAvLyBlLmcuIHRoZSBzdHJpbmcgJ3RydWUnIHZzLiB0aGUgYm9vbGVhbiB0cnVlLlxuICAgIHJldHVybiBwbGFpbiAmJiAhdGVzdEFtYmlndW91c1R5cGUoc3RyaW5nKVxuICAgICAgPyBTVFlMRV9QTEFJTiA6IFNUWUxFX1NJTkdMRTtcbiAgfVxuICAvLyBFZGdlIGNhc2U6IGJsb2NrIGluZGVudGF0aW9uIGluZGljYXRvciBjYW4gb25seSBoYXZlIG9uZSBkaWdpdC5cbiAgaWYgKHN0cmluZ1swXSA9PT0gJyAnICYmIGluZGVudFBlckxldmVsID4gOSkge1xuICAgIHJldHVybiBTVFlMRV9ET1VCTEU7XG4gIH1cbiAgLy8gQXQgdGhpcyBwb2ludCB3ZSBrbm93IGJsb2NrIHN0eWxlcyBhcmUgdmFsaWQuXG4gIC8vIFByZWZlciBsaXRlcmFsIHN0eWxlIHVubGVzcyB3ZSB3YW50IHRvIGZvbGQuXG4gIHJldHVybiBoYXNGb2xkYWJsZUxpbmUgPyBTVFlMRV9GT0xERUQgOiBTVFlMRV9MSVRFUkFMO1xufVxuXG4vLyBOb3RlOiBsaW5lIGJyZWFraW5nL2ZvbGRpbmcgaXMgaW1wbGVtZW50ZWQgZm9yIG9ubHkgdGhlIGZvbGRlZCBzdHlsZS5cbi8vIE5CLiBXZSBkcm9wIHRoZSBsYXN0IHRyYWlsaW5nIG5ld2xpbmUgKGlmIGFueSkgb2YgYSByZXR1cm5lZCBibG9jayBzY2FsYXJcbi8vICBzaW5jZSB0aGUgZHVtcGVyIGFkZHMgaXRzIG93biBuZXdsaW5lLiBUaGlzIGFsd2F5cyB3b3Jrczpcbi8vICAgIOKAoiBObyBlbmRpbmcgbmV3bGluZSA9PiB1bmFmZmVjdGVkOyBhbHJlYWR5IHVzaW5nIHN0cmlwIFwiLVwiIGNob21waW5nLlxuLy8gICAg4oCiIEVuZGluZyBuZXdsaW5lICAgID0+IHJlbW92ZWQgdGhlbiByZXN0b3JlZC5cbi8vICBJbXBvcnRhbnRseSwgdGhpcyBrZWVwcyB0aGUgXCIrXCIgY2hvbXAgaW5kaWNhdG9yIGZyb20gZ2FpbmluZyBhbiBleHRyYSBsaW5lLlxuZnVuY3Rpb24gd3JpdGVTY2FsYXIoc3RhdGUsIHN0cmluZywgbGV2ZWwsIGlza2V5KSB7XG4gIHN0YXRlLmR1bXAgPSAoZnVuY3Rpb24gKCkge1xuICAgIGlmIChzdHJpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gXCInJ1wiO1xuICAgIH1cbiAgICBpZiAoIXN0YXRlLm5vQ29tcGF0TW9kZSAmJlxuICAgICAgICBERVBSRUNBVEVEX0JPT0xFQU5TX1NZTlRBWC5pbmRleE9mKHN0cmluZykgIT09IC0xKSB7XG4gICAgICByZXR1cm4gXCInXCIgKyBzdHJpbmcgKyBcIidcIjtcbiAgICB9XG5cbiAgICB2YXIgaW5kZW50ID0gc3RhdGUuaW5kZW50ICogTWF0aC5tYXgoMSwgbGV2ZWwpOyAvLyBubyAwLWluZGVudCBzY2FsYXJzXG4gICAgLy8gQXMgaW5kZW50YXRpb24gZ2V0cyBkZWVwZXIsIGxldCB0aGUgd2lkdGggZGVjcmVhc2UgbW9ub3RvbmljYWxseVxuICAgIC8vIHRvIHRoZSBsb3dlciBib3VuZCBtaW4oc3RhdGUubGluZVdpZHRoLCA0MCkuXG4gICAgLy8gTm90ZSB0aGF0IHRoaXMgaW1wbGllc1xuICAgIC8vICBzdGF0ZS5saW5lV2lkdGgg4omkIDQwICsgc3RhdGUuaW5kZW50OiB3aWR0aCBpcyBmaXhlZCBhdCB0aGUgbG93ZXIgYm91bmQuXG4gICAgLy8gIHN0YXRlLmxpbmVXaWR0aCA+IDQwICsgc3RhdGUuaW5kZW50OiB3aWR0aCBkZWNyZWFzZXMgdW50aWwgdGhlIGxvd2VyIGJvdW5kLlxuICAgIC8vIFRoaXMgYmVoYXZlcyBiZXR0ZXIgdGhhbiBhIGNvbnN0YW50IG1pbmltdW0gd2lkdGggd2hpY2ggZGlzYWxsb3dzIG5hcnJvd2VyIG9wdGlvbnMsXG4gICAgLy8gb3IgYW4gaW5kZW50IHRocmVzaG9sZCB3aGljaCBjYXVzZXMgdGhlIHdpZHRoIHRvIHN1ZGRlbmx5IGluY3JlYXNlLlxuICAgIHZhciBsaW5lV2lkdGggPSBzdGF0ZS5saW5lV2lkdGggPT09IC0xXG4gICAgICA/IC0xIDogTWF0aC5tYXgoTWF0aC5taW4oc3RhdGUubGluZVdpZHRoLCA0MCksIHN0YXRlLmxpbmVXaWR0aCAtIGluZGVudCk7XG5cbiAgICAvLyBXaXRob3V0IGtub3dpbmcgaWYga2V5cyBhcmUgaW1wbGljaXQvZXhwbGljaXQsIGFzc3VtZSBpbXBsaWNpdCBmb3Igc2FmZXR5LlxuICAgIHZhciBzaW5nbGVMaW5lT25seSA9IGlza2V5XG4gICAgICAvLyBObyBibG9jayBzdHlsZXMgaW4gZmxvdyBtb2RlLlxuICAgICAgfHwgKHN0YXRlLmZsb3dMZXZlbCA+IC0xICYmIGxldmVsID49IHN0YXRlLmZsb3dMZXZlbCk7XG4gICAgZnVuY3Rpb24gdGVzdEFtYmlndWl0eShzdHJpbmcpIHtcbiAgICAgIHJldHVybiB0ZXN0SW1wbGljaXRSZXNvbHZpbmcoc3RhdGUsIHN0cmluZyk7XG4gICAgfVxuXG4gICAgc3dpdGNoIChjaG9vc2VTY2FsYXJTdHlsZShzdHJpbmcsIHNpbmdsZUxpbmVPbmx5LCBzdGF0ZS5pbmRlbnQsIGxpbmVXaWR0aCwgdGVzdEFtYmlndWl0eSkpIHtcbiAgICAgIGNhc2UgU1RZTEVfUExBSU46XG4gICAgICAgIHJldHVybiBzdHJpbmc7XG4gICAgICBjYXNlIFNUWUxFX1NJTkdMRTpcbiAgICAgICAgcmV0dXJuIFwiJ1wiICsgc3RyaW5nLnJlcGxhY2UoLycvZywgXCInJ1wiKSArIFwiJ1wiO1xuICAgICAgY2FzZSBTVFlMRV9MSVRFUkFMOlxuICAgICAgICByZXR1cm4gJ3wnICsgYmxvY2tIZWFkZXIoc3RyaW5nLCBzdGF0ZS5pbmRlbnQpXG4gICAgICAgICAgKyBkcm9wRW5kaW5nTmV3bGluZShpbmRlbnRTdHJpbmcoc3RyaW5nLCBpbmRlbnQpKTtcbiAgICAgIGNhc2UgU1RZTEVfRk9MREVEOlxuICAgICAgICByZXR1cm4gJz4nICsgYmxvY2tIZWFkZXIoc3RyaW5nLCBzdGF0ZS5pbmRlbnQpXG4gICAgICAgICAgKyBkcm9wRW5kaW5nTmV3bGluZShpbmRlbnRTdHJpbmcoZm9sZFN0cmluZyhzdHJpbmcsIGxpbmVXaWR0aCksIGluZGVudCkpO1xuICAgICAgY2FzZSBTVFlMRV9ET1VCTEU6XG4gICAgICAgIHJldHVybiAnXCInICsgZXNjYXBlU3RyaW5nKHN0cmluZywgbGluZVdpZHRoKSArICdcIic7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgWUFNTEV4Y2VwdGlvbignaW1wb3NzaWJsZSBlcnJvcjogaW52YWxpZCBzY2FsYXIgc3R5bGUnKTtcbiAgICB9XG4gIH0oKSk7XG59XG5cbi8vIFByZS1jb25kaXRpb25zOiBzdHJpbmcgaXMgdmFsaWQgZm9yIGEgYmxvY2sgc2NhbGFyLCAxIDw9IGluZGVudFBlckxldmVsIDw9IDkuXG5mdW5jdGlvbiBibG9ja0hlYWRlcihzdHJpbmcsIGluZGVudFBlckxldmVsKSB7XG4gIHZhciBpbmRlbnRJbmRpY2F0b3IgPSAoc3RyaW5nWzBdID09PSAnICcpID8gU3RyaW5nKGluZGVudFBlckxldmVsKSA6ICcnO1xuXG4gIC8vIG5vdGUgdGhlIHNwZWNpYWwgY2FzZTogdGhlIHN0cmluZyAnXFxuJyBjb3VudHMgYXMgYSBcInRyYWlsaW5nXCIgZW1wdHkgbGluZS5cbiAgdmFyIGNsaXAgPSAgICAgICAgICBzdHJpbmdbc3RyaW5nLmxlbmd0aCAtIDFdID09PSAnXFxuJztcbiAgdmFyIGtlZXAgPSBjbGlwICYmIChzdHJpbmdbc3RyaW5nLmxlbmd0aCAtIDJdID09PSAnXFxuJyB8fCBzdHJpbmcgPT09ICdcXG4nKTtcbiAgdmFyIGNob21wID0ga2VlcCA/ICcrJyA6IChjbGlwID8gJycgOiAnLScpO1xuXG4gIHJldHVybiBpbmRlbnRJbmRpY2F0b3IgKyBjaG9tcCArICdcXG4nO1xufVxuXG4vLyAoU2VlIHRoZSBub3RlIGZvciB3cml0ZVNjYWxhci4pXG5mdW5jdGlvbiBkcm9wRW5kaW5nTmV3bGluZShzdHJpbmcpIHtcbiAgcmV0dXJuIHN0cmluZ1tzdHJpbmcubGVuZ3RoIC0gMV0gPT09ICdcXG4nID8gc3RyaW5nLnNsaWNlKDAsIC0xKSA6IHN0cmluZztcbn1cblxuLy8gTm90ZTogYSBsb25nIGxpbmUgd2l0aG91dCBhIHN1aXRhYmxlIGJyZWFrIHBvaW50IHdpbGwgZXhjZWVkIHRoZSB3aWR0aCBsaW1pdC5cbi8vIFByZS1jb25kaXRpb25zOiBldmVyeSBjaGFyIGluIHN0ciBpc1ByaW50YWJsZSwgc3RyLmxlbmd0aCA+IDAsIHdpZHRoID4gMC5cbmZ1bmN0aW9uIGZvbGRTdHJpbmcoc3RyaW5nLCB3aWR0aCkge1xuICAvLyBJbiBmb2xkZWQgc3R5bGUsICRrJCBjb25zZWN1dGl2ZSBuZXdsaW5lcyBvdXRwdXQgYXMgJGsrMSQgbmV3bGluZXPigJRcbiAgLy8gdW5sZXNzIHRoZXkncmUgYmVmb3JlIG9yIGFmdGVyIGEgbW9yZS1pbmRlbnRlZCBsaW5lLCBvciBhdCB0aGUgdmVyeVxuICAvLyBiZWdpbm5pbmcgb3IgZW5kLCBpbiB3aGljaCBjYXNlICRrJCBtYXBzIHRvICRrJC5cbiAgLy8gVGhlcmVmb3JlLCBwYXJzZSBlYWNoIGNodW5rIGFzIG5ld2xpbmUocykgZm9sbG93ZWQgYnkgYSBjb250ZW50IGxpbmUuXG4gIHZhciBsaW5lUmUgPSAvKFxcbispKFteXFxuXSopL2c7XG5cbiAgLy8gZmlyc3QgbGluZSAocG9zc2libHkgYW4gZW1wdHkgbGluZSlcbiAgdmFyIHJlc3VsdCA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG5leHRMRiA9IHN0cmluZy5pbmRleE9mKCdcXG4nKTtcbiAgICBuZXh0TEYgPSBuZXh0TEYgIT09IC0xID8gbmV4dExGIDogc3RyaW5nLmxlbmd0aDtcbiAgICBsaW5lUmUubGFzdEluZGV4ID0gbmV4dExGO1xuICAgIHJldHVybiBmb2xkTGluZShzdHJpbmcuc2xpY2UoMCwgbmV4dExGKSwgd2lkdGgpO1xuICB9KCkpO1xuICAvLyBJZiB3ZSBoYXZlbid0IHJlYWNoZWQgdGhlIGZpcnN0IGNvbnRlbnQgbGluZSB5ZXQsIGRvbid0IGFkZCBhbiBleHRyYSBcXG4uXG4gIHZhciBwcmV2TW9yZUluZGVudGVkID0gc3RyaW5nWzBdID09PSAnXFxuJyB8fCBzdHJpbmdbMF0gPT09ICcgJztcbiAgdmFyIG1vcmVJbmRlbnRlZDtcblxuICAvLyByZXN0IG9mIHRoZSBsaW5lc1xuICB2YXIgbWF0Y2g7XG4gIHdoaWxlICgobWF0Y2ggPSBsaW5lUmUuZXhlYyhzdHJpbmcpKSkge1xuICAgIHZhciBwcmVmaXggPSBtYXRjaFsxXSwgbGluZSA9IG1hdGNoWzJdO1xuICAgIG1vcmVJbmRlbnRlZCA9IChsaW5lWzBdID09PSAnICcpO1xuICAgIHJlc3VsdCArPSBwcmVmaXhcbiAgICAgICsgKCFwcmV2TW9yZUluZGVudGVkICYmICFtb3JlSW5kZW50ZWQgJiYgbGluZSAhPT0gJydcbiAgICAgICAgPyAnXFxuJyA6ICcnKVxuICAgICAgKyBmb2xkTGluZShsaW5lLCB3aWR0aCk7XG4gICAgcHJldk1vcmVJbmRlbnRlZCA9IG1vcmVJbmRlbnRlZDtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8vIEdyZWVkeSBsaW5lIGJyZWFraW5nLlxuLy8gUGlja3MgdGhlIGxvbmdlc3QgbGluZSB1bmRlciB0aGUgbGltaXQgZWFjaCB0aW1lLFxuLy8gb3RoZXJ3aXNlIHNldHRsZXMgZm9yIHRoZSBzaG9ydGVzdCBsaW5lIG92ZXIgdGhlIGxpbWl0LlxuLy8gTkIuIE1vcmUtaW5kZW50ZWQgbGluZXMgKmNhbm5vdCogYmUgZm9sZGVkLCBhcyB0aGF0IHdvdWxkIGFkZCBhbiBleHRyYSBcXG4uXG5mdW5jdGlvbiBmb2xkTGluZShsaW5lLCB3aWR0aCkge1xuICBpZiAobGluZSA9PT0gJycgfHwgbGluZVswXSA9PT0gJyAnKSByZXR1cm4gbGluZTtcblxuICAvLyBTaW5jZSBhIG1vcmUtaW5kZW50ZWQgbGluZSBhZGRzIGEgXFxuLCBicmVha3MgY2FuJ3QgYmUgZm9sbG93ZWQgYnkgYSBzcGFjZS5cbiAgdmFyIGJyZWFrUmUgPSAvIFteIF0vZzsgLy8gbm90ZTogdGhlIG1hdGNoIGluZGV4IHdpbGwgYWx3YXlzIGJlIDw9IGxlbmd0aC0yLlxuICB2YXIgbWF0Y2g7XG4gIC8vIHN0YXJ0IGlzIGFuIGluY2x1c2l2ZSBpbmRleC4gZW5kLCBjdXJyLCBhbmQgbmV4dCBhcmUgZXhjbHVzaXZlLlxuICB2YXIgc3RhcnQgPSAwLCBlbmQsIGN1cnIgPSAwLCBuZXh0ID0gMDtcbiAgdmFyIHJlc3VsdCA9ICcnO1xuXG4gIC8vIEludmFyaWFudHM6IDAgPD0gc3RhcnQgPD0gbGVuZ3RoLTEuXG4gIC8vICAgMCA8PSBjdXJyIDw9IG5leHQgPD0gbWF4KDAsIGxlbmd0aC0yKS4gY3VyciAtIHN0YXJ0IDw9IHdpZHRoLlxuICAvLyBJbnNpZGUgdGhlIGxvb3A6XG4gIC8vICAgQSBtYXRjaCBpbXBsaWVzIGxlbmd0aCA+PSAyLCBzbyBjdXJyIGFuZCBuZXh0IGFyZSA8PSBsZW5ndGgtMi5cbiAgd2hpbGUgKChtYXRjaCA9IGJyZWFrUmUuZXhlYyhsaW5lKSkpIHtcbiAgICBuZXh0ID0gbWF0Y2guaW5kZXg7XG4gICAgLy8gbWFpbnRhaW4gaW52YXJpYW50OiBjdXJyIC0gc3RhcnQgPD0gd2lkdGhcbiAgICBpZiAobmV4dCAtIHN0YXJ0ID4gd2lkdGgpIHtcbiAgICAgIGVuZCA9IChjdXJyID4gc3RhcnQpID8gY3VyciA6IG5leHQ7IC8vIGRlcml2ZSBlbmQgPD0gbGVuZ3RoLTJcbiAgICAgIHJlc3VsdCArPSAnXFxuJyArIGxpbmUuc2xpY2Uoc3RhcnQsIGVuZCk7XG4gICAgICAvLyBza2lwIHRoZSBzcGFjZSB0aGF0IHdhcyBvdXRwdXQgYXMgXFxuXG4gICAgICBzdGFydCA9IGVuZCArIDE7ICAgICAgICAgICAgICAgICAgICAvLyBkZXJpdmUgc3RhcnQgPD0gbGVuZ3RoLTFcbiAgICB9XG4gICAgY3VyciA9IG5leHQ7XG4gIH1cblxuICAvLyBCeSB0aGUgaW52YXJpYW50cywgc3RhcnQgPD0gbGVuZ3RoLTEsIHNvIHRoZXJlIGlzIHNvbWV0aGluZyBsZWZ0IG92ZXIuXG4gIC8vIEl0IGlzIGVpdGhlciB0aGUgd2hvbGUgc3RyaW5nIG9yIGEgcGFydCBzdGFydGluZyBmcm9tIG5vbi13aGl0ZXNwYWNlLlxuICByZXN1bHQgKz0gJ1xcbic7XG4gIC8vIEluc2VydCBhIGJyZWFrIGlmIHRoZSByZW1haW5kZXIgaXMgdG9vIGxvbmcgYW5kIHRoZXJlIGlzIGEgYnJlYWsgYXZhaWxhYmxlLlxuICBpZiAobGluZS5sZW5ndGggLSBzdGFydCA+IHdpZHRoICYmIGN1cnIgPiBzdGFydCkge1xuICAgIHJlc3VsdCArPSBsaW5lLnNsaWNlKHN0YXJ0LCBjdXJyKSArICdcXG4nICsgbGluZS5zbGljZShjdXJyICsgMSk7XG4gIH0gZWxzZSB7XG4gICAgcmVzdWx0ICs9IGxpbmUuc2xpY2Uoc3RhcnQpO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdC5zbGljZSgxKTsgLy8gZHJvcCBleHRyYSBcXG4gam9pbmVyXG59XG5cbi8vIEVzY2FwZXMgYSBkb3VibGUtcXVvdGVkIHN0cmluZy5cbmZ1bmN0aW9uIGVzY2FwZVN0cmluZyhzdHJpbmcpIHtcbiAgdmFyIHJlc3VsdCA9ICcnO1xuICB2YXIgY2hhcjtcbiAgdmFyIGVzY2FwZVNlcTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0cmluZy5sZW5ndGg7IGkrKykge1xuICAgIGNoYXIgPSBzdHJpbmcuY2hhckNvZGVBdChpKTtcbiAgICBlc2NhcGVTZXEgPSBFU0NBUEVfU0VRVUVOQ0VTW2NoYXJdO1xuICAgIHJlc3VsdCArPSAhZXNjYXBlU2VxICYmIGlzUHJpbnRhYmxlKGNoYXIpXG4gICAgICA/IHN0cmluZ1tpXVxuICAgICAgOiBlc2NhcGVTZXEgfHwgZW5jb2RlSGV4KGNoYXIpO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gd3JpdGVGbG93U2VxdWVuY2Uoc3RhdGUsIGxldmVsLCBvYmplY3QpIHtcbiAgdmFyIF9yZXN1bHQgPSAnJyxcbiAgICAgIF90YWcgICAgPSBzdGF0ZS50YWcsXG4gICAgICBpbmRleCxcbiAgICAgIGxlbmd0aDtcblxuICBmb3IgKGluZGV4ID0gMCwgbGVuZ3RoID0gb2JqZWN0Lmxlbmd0aDsgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IDEpIHtcbiAgICAvLyBXcml0ZSBvbmx5IHZhbGlkIGVsZW1lbnRzLlxuICAgIGlmICh3cml0ZU5vZGUoc3RhdGUsIGxldmVsLCBvYmplY3RbaW5kZXhdLCBmYWxzZSwgZmFsc2UpKSB7XG4gICAgICBpZiAoaW5kZXggIT09IDApIF9yZXN1bHQgKz0gJywgJztcbiAgICAgIF9yZXN1bHQgKz0gc3RhdGUuZHVtcDtcbiAgICB9XG4gIH1cblxuICBzdGF0ZS50YWcgPSBfdGFnO1xuICBzdGF0ZS5kdW1wID0gJ1snICsgX3Jlc3VsdCArICddJztcbn1cblxuZnVuY3Rpb24gd3JpdGVCbG9ja1NlcXVlbmNlKHN0YXRlLCBsZXZlbCwgb2JqZWN0LCBjb21wYWN0KSB7XG4gIHZhciBfcmVzdWx0ID0gJycsXG4gICAgICBfdGFnICAgID0gc3RhdGUudGFnLFxuICAgICAgaW5kZXgsXG4gICAgICBsZW5ndGg7XG5cbiAgZm9yIChpbmRleCA9IDAsIGxlbmd0aCA9IG9iamVjdC5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSAxKSB7XG4gICAgLy8gV3JpdGUgb25seSB2YWxpZCBlbGVtZW50cy5cbiAgICBpZiAod3JpdGVOb2RlKHN0YXRlLCBsZXZlbCArIDEsIG9iamVjdFtpbmRleF0sIHRydWUsIHRydWUpKSB7XG4gICAgICBpZiAoIWNvbXBhY3QgfHwgaW5kZXggIT09IDApIHtcbiAgICAgICAgX3Jlc3VsdCArPSBnZW5lcmF0ZU5leHRMaW5lKHN0YXRlLCBsZXZlbCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChzdGF0ZS5kdW1wICYmIENIQVJfTElORV9GRUVEID09PSBzdGF0ZS5kdW1wLmNoYXJDb2RlQXQoMCkpIHtcbiAgICAgICAgX3Jlc3VsdCArPSAnLSc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBfcmVzdWx0ICs9ICctICc7XG4gICAgICB9XG5cbiAgICAgIF9yZXN1bHQgKz0gc3RhdGUuZHVtcDtcbiAgICB9XG4gIH1cblxuICBzdGF0ZS50YWcgPSBfdGFnO1xuICBzdGF0ZS5kdW1wID0gX3Jlc3VsdCB8fCAnW10nOyAvLyBFbXB0eSBzZXF1ZW5jZSBpZiBubyB2YWxpZCB2YWx1ZXMuXG59XG5cbmZ1bmN0aW9uIHdyaXRlRmxvd01hcHBpbmcoc3RhdGUsIGxldmVsLCBvYmplY3QpIHtcbiAgdmFyIF9yZXN1bHQgICAgICAgPSAnJyxcbiAgICAgIF90YWcgICAgICAgICAgPSBzdGF0ZS50YWcsXG4gICAgICBvYmplY3RLZXlMaXN0ID0gT2JqZWN0LmtleXMob2JqZWN0KSxcbiAgICAgIGluZGV4LFxuICAgICAgbGVuZ3RoLFxuICAgICAgb2JqZWN0S2V5LFxuICAgICAgb2JqZWN0VmFsdWUsXG4gICAgICBwYWlyQnVmZmVyO1xuXG4gIGZvciAoaW5kZXggPSAwLCBsZW5ndGggPSBvYmplY3RLZXlMaXN0Lmxlbmd0aDsgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IDEpIHtcbiAgICBwYWlyQnVmZmVyID0gJyc7XG5cbiAgICBpZiAoaW5kZXggIT09IDApIHBhaXJCdWZmZXIgKz0gJywgJztcblxuICAgIG9iamVjdEtleSA9IG9iamVjdEtleUxpc3RbaW5kZXhdO1xuICAgIG9iamVjdFZhbHVlID0gb2JqZWN0W29iamVjdEtleV07XG5cbiAgICBpZiAoIXdyaXRlTm9kZShzdGF0ZSwgbGV2ZWwsIG9iamVjdEtleSwgZmFsc2UsIGZhbHNlKSkge1xuICAgICAgY29udGludWU7IC8vIFNraXAgdGhpcyBwYWlyIGJlY2F1c2Ugb2YgaW52YWxpZCBrZXk7XG4gICAgfVxuXG4gICAgaWYgKHN0YXRlLmR1bXAubGVuZ3RoID4gMTAyNCkgcGFpckJ1ZmZlciArPSAnPyAnO1xuXG4gICAgcGFpckJ1ZmZlciArPSBzdGF0ZS5kdW1wICsgJzogJztcblxuICAgIGlmICghd3JpdGVOb2RlKHN0YXRlLCBsZXZlbCwgb2JqZWN0VmFsdWUsIGZhbHNlLCBmYWxzZSkpIHtcbiAgICAgIGNvbnRpbnVlOyAvLyBTa2lwIHRoaXMgcGFpciBiZWNhdXNlIG9mIGludmFsaWQgdmFsdWUuXG4gICAgfVxuXG4gICAgcGFpckJ1ZmZlciArPSBzdGF0ZS5kdW1wO1xuXG4gICAgLy8gQm90aCBrZXkgYW5kIHZhbHVlIGFyZSB2YWxpZC5cbiAgICBfcmVzdWx0ICs9IHBhaXJCdWZmZXI7XG4gIH1cblxuICBzdGF0ZS50YWcgPSBfdGFnO1xuICBzdGF0ZS5kdW1wID0gJ3snICsgX3Jlc3VsdCArICd9Jztcbn1cblxuZnVuY3Rpb24gd3JpdGVCbG9ja01hcHBpbmcoc3RhdGUsIGxldmVsLCBvYmplY3QsIGNvbXBhY3QpIHtcbiAgdmFyIF9yZXN1bHQgICAgICAgPSAnJyxcbiAgICAgIF90YWcgICAgICAgICAgPSBzdGF0ZS50YWcsXG4gICAgICBvYmplY3RLZXlMaXN0ID0gT2JqZWN0LmtleXMob2JqZWN0KSxcbiAgICAgIGluZGV4LFxuICAgICAgbGVuZ3RoLFxuICAgICAgb2JqZWN0S2V5LFxuICAgICAgb2JqZWN0VmFsdWUsXG4gICAgICBleHBsaWNpdFBhaXIsXG4gICAgICBwYWlyQnVmZmVyO1xuXG4gIC8vIEFsbG93IHNvcnRpbmcga2V5cyBzbyB0aGF0IHRoZSBvdXRwdXQgZmlsZSBpcyBkZXRlcm1pbmlzdGljXG4gIGlmIChzdGF0ZS5zb3J0S2V5cyA9PT0gdHJ1ZSkge1xuICAgIC8vIERlZmF1bHQgc29ydGluZ1xuICAgIG9iamVjdEtleUxpc3Quc29ydCgpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBzdGF0ZS5zb3J0S2V5cyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIC8vIEN1c3RvbSBzb3J0IGZ1bmN0aW9uXG4gICAgb2JqZWN0S2V5TGlzdC5zb3J0KHN0YXRlLnNvcnRLZXlzKTtcbiAgfSBlbHNlIGlmIChzdGF0ZS5zb3J0S2V5cykge1xuICAgIC8vIFNvbWV0aGluZyBpcyB3cm9uZ1xuICAgIHRocm93IG5ldyBZQU1MRXhjZXB0aW9uKCdzb3J0S2V5cyBtdXN0IGJlIGEgYm9vbGVhbiBvciBhIGZ1bmN0aW9uJyk7XG4gIH1cblxuICBmb3IgKGluZGV4ID0gMCwgbGVuZ3RoID0gb2JqZWN0S2V5TGlzdC5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSAxKSB7XG4gICAgcGFpckJ1ZmZlciA9ICcnO1xuXG4gICAgaWYgKCFjb21wYWN0IHx8IGluZGV4ICE9PSAwKSB7XG4gICAgICBwYWlyQnVmZmVyICs9IGdlbmVyYXRlTmV4dExpbmUoc3RhdGUsIGxldmVsKTtcbiAgICB9XG5cbiAgICBvYmplY3RLZXkgPSBvYmplY3RLZXlMaXN0W2luZGV4XTtcbiAgICBvYmplY3RWYWx1ZSA9IG9iamVjdFtvYmplY3RLZXldO1xuXG4gICAgaWYgKCF3cml0ZU5vZGUoc3RhdGUsIGxldmVsICsgMSwgb2JqZWN0S2V5LCB0cnVlLCB0cnVlLCB0cnVlKSkge1xuICAgICAgY29udGludWU7IC8vIFNraXAgdGhpcyBwYWlyIGJlY2F1c2Ugb2YgaW52YWxpZCBrZXkuXG4gICAgfVxuXG4gICAgZXhwbGljaXRQYWlyID0gKHN0YXRlLnRhZyAhPT0gbnVsbCAmJiBzdGF0ZS50YWcgIT09ICc/JykgfHxcbiAgICAgICAgICAgICAgICAgICAoc3RhdGUuZHVtcCAmJiBzdGF0ZS5kdW1wLmxlbmd0aCA+IDEwMjQpO1xuXG4gICAgaWYgKGV4cGxpY2l0UGFpcikge1xuICAgICAgaWYgKHN0YXRlLmR1bXAgJiYgQ0hBUl9MSU5FX0ZFRUQgPT09IHN0YXRlLmR1bXAuY2hhckNvZGVBdCgwKSkge1xuICAgICAgICBwYWlyQnVmZmVyICs9ICc/JztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhaXJCdWZmZXIgKz0gJz8gJztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBwYWlyQnVmZmVyICs9IHN0YXRlLmR1bXA7XG5cbiAgICBpZiAoZXhwbGljaXRQYWlyKSB7XG4gICAgICBwYWlyQnVmZmVyICs9IGdlbmVyYXRlTmV4dExpbmUoc3RhdGUsIGxldmVsKTtcbiAgICB9XG5cbiAgICBpZiAoIXdyaXRlTm9kZShzdGF0ZSwgbGV2ZWwgKyAxLCBvYmplY3RWYWx1ZSwgdHJ1ZSwgZXhwbGljaXRQYWlyKSkge1xuICAgICAgY29udGludWU7IC8vIFNraXAgdGhpcyBwYWlyIGJlY2F1c2Ugb2YgaW52YWxpZCB2YWx1ZS5cbiAgICB9XG5cbiAgICBpZiAoc3RhdGUuZHVtcCAmJiBDSEFSX0xJTkVfRkVFRCA9PT0gc3RhdGUuZHVtcC5jaGFyQ29kZUF0KDApKSB7XG4gICAgICBwYWlyQnVmZmVyICs9ICc6JztcbiAgICB9IGVsc2Uge1xuICAgICAgcGFpckJ1ZmZlciArPSAnOiAnO1xuICAgIH1cblxuICAgIHBhaXJCdWZmZXIgKz0gc3RhdGUuZHVtcDtcblxuICAgIC8vIEJvdGgga2V5IGFuZCB2YWx1ZSBhcmUgdmFsaWQuXG4gICAgX3Jlc3VsdCArPSBwYWlyQnVmZmVyO1xuICB9XG5cbiAgc3RhdGUudGFnID0gX3RhZztcbiAgc3RhdGUuZHVtcCA9IF9yZXN1bHQgfHwgJ3t9JzsgLy8gRW1wdHkgbWFwcGluZyBpZiBubyB2YWxpZCBwYWlycy5cbn1cblxuZnVuY3Rpb24gZGV0ZWN0VHlwZShzdGF0ZSwgb2JqZWN0LCBleHBsaWNpdCkge1xuICB2YXIgX3Jlc3VsdCwgdHlwZUxpc3QsIGluZGV4LCBsZW5ndGgsIHR5cGUsIHN0eWxlO1xuXG4gIHR5cGVMaXN0ID0gZXhwbGljaXQgPyBzdGF0ZS5leHBsaWNpdFR5cGVzIDogc3RhdGUuaW1wbGljaXRUeXBlcztcblxuICBmb3IgKGluZGV4ID0gMCwgbGVuZ3RoID0gdHlwZUxpc3QubGVuZ3RoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXggKz0gMSkge1xuICAgIHR5cGUgPSB0eXBlTGlzdFtpbmRleF07XG5cbiAgICBpZiAoKHR5cGUuaW5zdGFuY2VPZiAgfHwgdHlwZS5wcmVkaWNhdGUpICYmXG4gICAgICAgICghdHlwZS5pbnN0YW5jZU9mIHx8ICgodHlwZW9mIG9iamVjdCA9PT0gJ29iamVjdCcpICYmIChvYmplY3QgaW5zdGFuY2VvZiB0eXBlLmluc3RhbmNlT2YpKSkgJiZcbiAgICAgICAgKCF0eXBlLnByZWRpY2F0ZSAgfHwgdHlwZS5wcmVkaWNhdGUob2JqZWN0KSkpIHtcblxuICAgICAgc3RhdGUudGFnID0gZXhwbGljaXQgPyB0eXBlLnRhZyA6ICc/JztcblxuICAgICAgaWYgKHR5cGUucmVwcmVzZW50KSB7XG4gICAgICAgIHN0eWxlID0gc3RhdGUuc3R5bGVNYXBbdHlwZS50YWddIHx8IHR5cGUuZGVmYXVsdFN0eWxlO1xuXG4gICAgICAgIGlmIChfdG9TdHJpbmcuY2FsbCh0eXBlLnJlcHJlc2VudCkgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXScpIHtcbiAgICAgICAgICBfcmVzdWx0ID0gdHlwZS5yZXByZXNlbnQob2JqZWN0LCBzdHlsZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoX2hhc093blByb3BlcnR5LmNhbGwodHlwZS5yZXByZXNlbnQsIHN0eWxlKSkge1xuICAgICAgICAgIF9yZXN1bHQgPSB0eXBlLnJlcHJlc2VudFtzdHlsZV0ob2JqZWN0LCBzdHlsZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFlBTUxFeGNlcHRpb24oJyE8JyArIHR5cGUudGFnICsgJz4gdGFnIHJlc29sdmVyIGFjY2VwdHMgbm90IFwiJyArIHN0eWxlICsgJ1wiIHN0eWxlJyk7XG4gICAgICAgIH1cblxuICAgICAgICBzdGF0ZS5kdW1wID0gX3Jlc3VsdDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vLyBTZXJpYWxpemVzIGBvYmplY3RgIGFuZCB3cml0ZXMgaXQgdG8gZ2xvYmFsIGByZXN1bHRgLlxuLy8gUmV0dXJucyB0cnVlIG9uIHN1Y2Nlc3MsIG9yIGZhbHNlIG9uIGludmFsaWQgb2JqZWN0LlxuLy9cbmZ1bmN0aW9uIHdyaXRlTm9kZShzdGF0ZSwgbGV2ZWwsIG9iamVjdCwgYmxvY2ssIGNvbXBhY3QsIGlza2V5KSB7XG4gIHN0YXRlLnRhZyA9IG51bGw7XG4gIHN0YXRlLmR1bXAgPSBvYmplY3Q7XG5cbiAgaWYgKCFkZXRlY3RUeXBlKHN0YXRlLCBvYmplY3QsIGZhbHNlKSkge1xuICAgIGRldGVjdFR5cGUoc3RhdGUsIG9iamVjdCwgdHJ1ZSk7XG4gIH1cblxuICB2YXIgdHlwZSA9IF90b1N0cmluZy5jYWxsKHN0YXRlLmR1bXApO1xuXG4gIGlmIChibG9jaykge1xuICAgIGJsb2NrID0gKHN0YXRlLmZsb3dMZXZlbCA8IDAgfHwgc3RhdGUuZmxvd0xldmVsID4gbGV2ZWwpO1xuICB9XG5cbiAgdmFyIG9iamVjdE9yQXJyYXkgPSB0eXBlID09PSAnW29iamVjdCBPYmplY3RdJyB8fCB0eXBlID09PSAnW29iamVjdCBBcnJheV0nLFxuICAgICAgZHVwbGljYXRlSW5kZXgsXG4gICAgICBkdXBsaWNhdGU7XG5cbiAgaWYgKG9iamVjdE9yQXJyYXkpIHtcbiAgICBkdXBsaWNhdGVJbmRleCA9IHN0YXRlLmR1cGxpY2F0ZXMuaW5kZXhPZihvYmplY3QpO1xuICAgIGR1cGxpY2F0ZSA9IGR1cGxpY2F0ZUluZGV4ICE9PSAtMTtcbiAgfVxuXG4gIGlmICgoc3RhdGUudGFnICE9PSBudWxsICYmIHN0YXRlLnRhZyAhPT0gJz8nKSB8fCBkdXBsaWNhdGUgfHwgKHN0YXRlLmluZGVudCAhPT0gMiAmJiBsZXZlbCA+IDApKSB7XG4gICAgY29tcGFjdCA9IGZhbHNlO1xuICB9XG5cbiAgaWYgKGR1cGxpY2F0ZSAmJiBzdGF0ZS51c2VkRHVwbGljYXRlc1tkdXBsaWNhdGVJbmRleF0pIHtcbiAgICBzdGF0ZS5kdW1wID0gJypyZWZfJyArIGR1cGxpY2F0ZUluZGV4O1xuICB9IGVsc2Uge1xuICAgIGlmIChvYmplY3RPckFycmF5ICYmIGR1cGxpY2F0ZSAmJiAhc3RhdGUudXNlZER1cGxpY2F0ZXNbZHVwbGljYXRlSW5kZXhdKSB7XG4gICAgICBzdGF0ZS51c2VkRHVwbGljYXRlc1tkdXBsaWNhdGVJbmRleF0gPSB0cnVlO1xuICAgIH1cbiAgICBpZiAodHlwZSA9PT0gJ1tvYmplY3QgT2JqZWN0XScpIHtcbiAgICAgIGlmIChibG9jayAmJiAoT2JqZWN0LmtleXMoc3RhdGUuZHVtcCkubGVuZ3RoICE9PSAwKSkge1xuICAgICAgICB3cml0ZUJsb2NrTWFwcGluZyhzdGF0ZSwgbGV2ZWwsIHN0YXRlLmR1bXAsIGNvbXBhY3QpO1xuICAgICAgICBpZiAoZHVwbGljYXRlKSB7XG4gICAgICAgICAgc3RhdGUuZHVtcCA9ICcmcmVmXycgKyBkdXBsaWNhdGVJbmRleCArIHN0YXRlLmR1bXA7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHdyaXRlRmxvd01hcHBpbmcoc3RhdGUsIGxldmVsLCBzdGF0ZS5kdW1wKTtcbiAgICAgICAgaWYgKGR1cGxpY2F0ZSkge1xuICAgICAgICAgIHN0YXRlLmR1bXAgPSAnJnJlZl8nICsgZHVwbGljYXRlSW5kZXggKyAnICcgKyBzdGF0ZS5kdW1wO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnW29iamVjdCBBcnJheV0nKSB7XG4gICAgICBpZiAoYmxvY2sgJiYgKHN0YXRlLmR1bXAubGVuZ3RoICE9PSAwKSkge1xuICAgICAgICB3cml0ZUJsb2NrU2VxdWVuY2Uoc3RhdGUsIGxldmVsLCBzdGF0ZS5kdW1wLCBjb21wYWN0KTtcbiAgICAgICAgaWYgKGR1cGxpY2F0ZSkge1xuICAgICAgICAgIHN0YXRlLmR1bXAgPSAnJnJlZl8nICsgZHVwbGljYXRlSW5kZXggKyBzdGF0ZS5kdW1wO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB3cml0ZUZsb3dTZXF1ZW5jZShzdGF0ZSwgbGV2ZWwsIHN0YXRlLmR1bXApO1xuICAgICAgICBpZiAoZHVwbGljYXRlKSB7XG4gICAgICAgICAgc3RhdGUuZHVtcCA9ICcmcmVmXycgKyBkdXBsaWNhdGVJbmRleCArICcgJyArIHN0YXRlLmR1bXA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdbb2JqZWN0IFN0cmluZ10nKSB7XG4gICAgICBpZiAoc3RhdGUudGFnICE9PSAnPycpIHtcbiAgICAgICAgd3JpdGVTY2FsYXIoc3RhdGUsIHN0YXRlLmR1bXAsIGxldmVsLCBpc2tleSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChzdGF0ZS5za2lwSW52YWxpZCkgcmV0dXJuIGZhbHNlO1xuICAgICAgdGhyb3cgbmV3IFlBTUxFeGNlcHRpb24oJ3VuYWNjZXB0YWJsZSBraW5kIG9mIGFuIG9iamVjdCB0byBkdW1wICcgKyB0eXBlKTtcbiAgICB9XG5cbiAgICBpZiAoc3RhdGUudGFnICE9PSBudWxsICYmIHN0YXRlLnRhZyAhPT0gJz8nKSB7XG4gICAgICBzdGF0ZS5kdW1wID0gJyE8JyArIHN0YXRlLnRhZyArICc+ICcgKyBzdGF0ZS5kdW1wO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBnZXREdXBsaWNhdGVSZWZlcmVuY2VzKG9iamVjdCwgc3RhdGUpIHtcbiAgdmFyIG9iamVjdHMgPSBbXSxcbiAgICAgIGR1cGxpY2F0ZXNJbmRleGVzID0gW10sXG4gICAgICBpbmRleCxcbiAgICAgIGxlbmd0aDtcblxuICBpbnNwZWN0Tm9kZShvYmplY3QsIG9iamVjdHMsIGR1cGxpY2F0ZXNJbmRleGVzKTtcblxuICBmb3IgKGluZGV4ID0gMCwgbGVuZ3RoID0gZHVwbGljYXRlc0luZGV4ZXMubGVuZ3RoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXggKz0gMSkge1xuICAgIHN0YXRlLmR1cGxpY2F0ZXMucHVzaChvYmplY3RzW2R1cGxpY2F0ZXNJbmRleGVzW2luZGV4XV0pO1xuICB9XG4gIHN0YXRlLnVzZWREdXBsaWNhdGVzID0gbmV3IEFycmF5KGxlbmd0aCk7XG59XG5cbmZ1bmN0aW9uIGluc3BlY3ROb2RlKG9iamVjdCwgb2JqZWN0cywgZHVwbGljYXRlc0luZGV4ZXMpIHtcbiAgdmFyIG9iamVjdEtleUxpc3QsXG4gICAgICBpbmRleCxcbiAgICAgIGxlbmd0aDtcblxuICBpZiAob2JqZWN0ICE9PSBudWxsICYmIHR5cGVvZiBvYmplY3QgPT09ICdvYmplY3QnKSB7XG4gICAgaW5kZXggPSBvYmplY3RzLmluZGV4T2Yob2JqZWN0KTtcbiAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICBpZiAoZHVwbGljYXRlc0luZGV4ZXMuaW5kZXhPZihpbmRleCkgPT09IC0xKSB7XG4gICAgICAgIGR1cGxpY2F0ZXNJbmRleGVzLnB1c2goaW5kZXgpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBvYmplY3RzLnB1c2gob2JqZWN0KTtcblxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkob2JqZWN0KSkge1xuICAgICAgICBmb3IgKGluZGV4ID0gMCwgbGVuZ3RoID0gb2JqZWN0Lmxlbmd0aDsgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IDEpIHtcbiAgICAgICAgICBpbnNwZWN0Tm9kZShvYmplY3RbaW5kZXhdLCBvYmplY3RzLCBkdXBsaWNhdGVzSW5kZXhlcyk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9iamVjdEtleUxpc3QgPSBPYmplY3Qua2V5cyhvYmplY3QpO1xuXG4gICAgICAgIGZvciAoaW5kZXggPSAwLCBsZW5ndGggPSBvYmplY3RLZXlMaXN0Lmxlbmd0aDsgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IDEpIHtcbiAgICAgICAgICBpbnNwZWN0Tm9kZShvYmplY3Rbb2JqZWN0S2V5TGlzdFtpbmRleF1dLCBvYmplY3RzLCBkdXBsaWNhdGVzSW5kZXhlcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZHVtcChpbnB1dCwgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICB2YXIgc3RhdGUgPSBuZXcgU3RhdGUob3B0aW9ucyk7XG5cbiAgaWYgKCFzdGF0ZS5ub1JlZnMpIGdldER1cGxpY2F0ZVJlZmVyZW5jZXMoaW5wdXQsIHN0YXRlKTtcblxuICBpZiAod3JpdGVOb2RlKHN0YXRlLCAwLCBpbnB1dCwgdHJ1ZSwgdHJ1ZSkpIHJldHVybiBzdGF0ZS5kdW1wICsgJ1xcbic7XG5cbiAgcmV0dXJuICcnO1xufVxuXG5mdW5jdGlvbiBzYWZlRHVtcChpbnB1dCwgb3B0aW9ucykge1xuICByZXR1cm4gZHVtcChpbnB1dCwgY29tbW9uLmV4dGVuZCh7IHNjaGVtYTogREVGQVVMVF9TQUZFX1NDSEVNQSB9LCBvcHRpb25zKSk7XG59XG5cbm1vZHVsZS5leHBvcnRzLmR1bXAgICAgID0gZHVtcDtcbm1vZHVsZS5leHBvcnRzLnNhZmVEdW1wID0gc2FmZUR1bXA7XG4iLCIvLyBZQU1MIGVycm9yIGNsYXNzLiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzg0NTg5ODRcbi8vXG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFlBTUxFeGNlcHRpb24ocmVhc29uLCBtYXJrKSB7XG4gIC8vIFN1cGVyIGNvbnN0cnVjdG9yXG4gIEVycm9yLmNhbGwodGhpcyk7XG5cbiAgLy8gSW5jbHVkZSBzdGFjayB0cmFjZSBpbiBlcnJvciBvYmplY3RcbiAgaWYgKEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKSB7XG4gICAgLy8gQ2hyb21lIGFuZCBOb2RlSlNcbiAgICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBGRiwgSUUgMTArIGFuZCBTYWZhcmkgNisuIEZhbGxiYWNrIGZvciBvdGhlcnNcbiAgICB0aGlzLnN0YWNrID0gKG5ldyBFcnJvcigpKS5zdGFjayB8fCAnJztcbiAgfVxuXG4gIHRoaXMubmFtZSA9ICdZQU1MRXhjZXB0aW9uJztcbiAgdGhpcy5yZWFzb24gPSByZWFzb247XG4gIHRoaXMubWFyayA9IG1hcms7XG4gIHRoaXMubWVzc2FnZSA9ICh0aGlzLnJlYXNvbiB8fCAnKHVua25vd24gcmVhc29uKScpICsgKHRoaXMubWFyayA/ICcgJyArIHRoaXMubWFyay50b1N0cmluZygpIDogJycpO1xufVxuXG5cbi8vIEluaGVyaXQgZnJvbSBFcnJvclxuWUFNTEV4Y2VwdGlvbi5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSk7XG5ZQU1MRXhjZXB0aW9uLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFlBTUxFeGNlcHRpb247XG5cblxuWUFNTEV4Y2VwdGlvbi5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyhjb21wYWN0KSB7XG4gIHZhciByZXN1bHQgPSB0aGlzLm5hbWUgKyAnOiAnO1xuXG4gIHJlc3VsdCArPSB0aGlzLnJlYXNvbiB8fCAnKHVua25vd24gcmVhc29uKSc7XG5cbiAgaWYgKCFjb21wYWN0ICYmIHRoaXMubWFyaykge1xuICAgIHJlc3VsdCArPSAnICcgKyB0aGlzLm1hcmsudG9TdHJpbmcoKTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gWUFNTEV4Y2VwdGlvbjtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyplc2xpbnQtZGlzYWJsZSBtYXgtbGVuLG5vLXVzZS1iZWZvcmUtZGVmaW5lKi9cblxudmFyIGNvbW1vbiAgICAgICAgICAgICAgPSByZXF1aXJlKCcuL2NvbW1vbicpO1xudmFyIFlBTUxFeGNlcHRpb24gICAgICAgPSByZXF1aXJlKCcuL2V4Y2VwdGlvbicpO1xudmFyIE1hcmsgICAgICAgICAgICAgICAgPSByZXF1aXJlKCcuL21hcmsnKTtcbnZhciBERUZBVUxUX1NBRkVfU0NIRU1BID0gcmVxdWlyZSgnLi9zY2hlbWEvZGVmYXVsdF9zYWZlJyk7XG52YXIgREVGQVVMVF9GVUxMX1NDSEVNQSA9IHJlcXVpcmUoJy4vc2NoZW1hL2RlZmF1bHRfZnVsbCcpO1xuXG5cbnZhciBfaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG5cbnZhciBDT05URVhUX0ZMT1dfSU4gICA9IDE7XG52YXIgQ09OVEVYVF9GTE9XX09VVCAgPSAyO1xudmFyIENPTlRFWFRfQkxPQ0tfSU4gID0gMztcbnZhciBDT05URVhUX0JMT0NLX09VVCA9IDQ7XG5cblxudmFyIENIT01QSU5HX0NMSVAgID0gMTtcbnZhciBDSE9NUElOR19TVFJJUCA9IDI7XG52YXIgQ0hPTVBJTkdfS0VFUCAgPSAzO1xuXG5cbnZhciBQQVRURVJOX05PTl9QUklOVEFCTEUgICAgICAgICA9IC9bXFx4MDAtXFx4MDhcXHgwQlxceDBDXFx4MEUtXFx4MUZcXHg3Ri1cXHg4NFxceDg2LVxceDlGXFx1RkZGRVxcdUZGRkZdfFtcXHVEODAwLVxcdURCRkZdKD8hW1xcdURDMDAtXFx1REZGRl0pfCg/OlteXFx1RDgwMC1cXHVEQkZGXXxeKVtcXHVEQzAwLVxcdURGRkZdLztcbnZhciBQQVRURVJOX05PTl9BU0NJSV9MSU5FX0JSRUFLUyA9IC9bXFx4ODVcXHUyMDI4XFx1MjAyOV0vO1xudmFyIFBBVFRFUk5fRkxPV19JTkRJQ0FUT1JTICAgICAgID0gL1ssXFxbXFxdXFx7XFx9XS87XG52YXIgUEFUVEVSTl9UQUdfSEFORExFICAgICAgICAgICAgPSAvXig/OiF8ISF8IVthLXpcXC1dKyEpJC9pO1xudmFyIFBBVFRFUk5fVEFHX1VSSSAgICAgICAgICAgICAgID0gL14oPzohfFteLFxcW1xcXVxce1xcfV0pKD86JVswLTlhLWZdezJ9fFswLTlhLXpcXC0jO1xcL1xcPzpAJj1cXCtcXCQsX1xcLiF+XFwqJ1xcKFxcKVxcW1xcXV0pKiQvaTtcblxuXG5mdW5jdGlvbiBpc19FT0woYykge1xuICByZXR1cm4gKGMgPT09IDB4MEEvKiBMRiAqLykgfHwgKGMgPT09IDB4MEQvKiBDUiAqLyk7XG59XG5cbmZ1bmN0aW9uIGlzX1dISVRFX1NQQUNFKGMpIHtcbiAgcmV0dXJuIChjID09PSAweDA5LyogVGFiICovKSB8fCAoYyA9PT0gMHgyMC8qIFNwYWNlICovKTtcbn1cblxuZnVuY3Rpb24gaXNfV1NfT1JfRU9MKGMpIHtcbiAgcmV0dXJuIChjID09PSAweDA5LyogVGFiICovKSB8fFxuICAgICAgICAgKGMgPT09IDB4MjAvKiBTcGFjZSAqLykgfHxcbiAgICAgICAgIChjID09PSAweDBBLyogTEYgKi8pIHx8XG4gICAgICAgICAoYyA9PT0gMHgwRC8qIENSICovKTtcbn1cblxuZnVuY3Rpb24gaXNfRkxPV19JTkRJQ0FUT1IoYykge1xuICByZXR1cm4gYyA9PT0gMHgyQy8qICwgKi8gfHxcbiAgICAgICAgIGMgPT09IDB4NUIvKiBbICovIHx8XG4gICAgICAgICBjID09PSAweDVELyogXSAqLyB8fFxuICAgICAgICAgYyA9PT0gMHg3Qi8qIHsgKi8gfHxcbiAgICAgICAgIGMgPT09IDB4N0QvKiB9ICovO1xufVxuXG5mdW5jdGlvbiBmcm9tSGV4Q29kZShjKSB7XG4gIHZhciBsYztcblxuICBpZiAoKDB4MzAvKiAwICovIDw9IGMpICYmIChjIDw9IDB4MzkvKiA5ICovKSkge1xuICAgIHJldHVybiBjIC0gMHgzMDtcbiAgfVxuXG4gIC8qZXNsaW50LWRpc2FibGUgbm8tYml0d2lzZSovXG4gIGxjID0gYyB8IDB4MjA7XG5cbiAgaWYgKCgweDYxLyogYSAqLyA8PSBsYykgJiYgKGxjIDw9IDB4NjYvKiBmICovKSkge1xuICAgIHJldHVybiBsYyAtIDB4NjEgKyAxMDtcbiAgfVxuXG4gIHJldHVybiAtMTtcbn1cblxuZnVuY3Rpb24gZXNjYXBlZEhleExlbihjKSB7XG4gIGlmIChjID09PSAweDc4LyogeCAqLykgeyByZXR1cm4gMjsgfVxuICBpZiAoYyA9PT0gMHg3NS8qIHUgKi8pIHsgcmV0dXJuIDQ7IH1cbiAgaWYgKGMgPT09IDB4NTUvKiBVICovKSB7IHJldHVybiA4OyB9XG4gIHJldHVybiAwO1xufVxuXG5mdW5jdGlvbiBmcm9tRGVjaW1hbENvZGUoYykge1xuICBpZiAoKDB4MzAvKiAwICovIDw9IGMpICYmIChjIDw9IDB4MzkvKiA5ICovKSkge1xuICAgIHJldHVybiBjIC0gMHgzMDtcbiAgfVxuXG4gIHJldHVybiAtMTtcbn1cblxuZnVuY3Rpb24gc2ltcGxlRXNjYXBlU2VxdWVuY2UoYykge1xuICByZXR1cm4gKGMgPT09IDB4MzAvKiAwICovKSA/ICdcXHgwMCcgOlxuICAgICAgICAoYyA9PT0gMHg2MS8qIGEgKi8pID8gJ1xceDA3JyA6XG4gICAgICAgIChjID09PSAweDYyLyogYiAqLykgPyAnXFx4MDgnIDpcbiAgICAgICAgKGMgPT09IDB4NzQvKiB0ICovKSA/ICdcXHgwOScgOlxuICAgICAgICAoYyA9PT0gMHgwOS8qIFRhYiAqLykgPyAnXFx4MDknIDpcbiAgICAgICAgKGMgPT09IDB4NkUvKiBuICovKSA/ICdcXHgwQScgOlxuICAgICAgICAoYyA9PT0gMHg3Ni8qIHYgKi8pID8gJ1xceDBCJyA6XG4gICAgICAgIChjID09PSAweDY2LyogZiAqLykgPyAnXFx4MEMnIDpcbiAgICAgICAgKGMgPT09IDB4NzIvKiByICovKSA/ICdcXHgwRCcgOlxuICAgICAgICAoYyA9PT0gMHg2NS8qIGUgKi8pID8gJ1xceDFCJyA6XG4gICAgICAgIChjID09PSAweDIwLyogU3BhY2UgKi8pID8gJyAnIDpcbiAgICAgICAgKGMgPT09IDB4MjIvKiBcIiAqLykgPyAnXFx4MjInIDpcbiAgICAgICAgKGMgPT09IDB4MkYvKiAvICovKSA/ICcvJyA6XG4gICAgICAgIChjID09PSAweDVDLyogXFwgKi8pID8gJ1xceDVDJyA6XG4gICAgICAgIChjID09PSAweDRFLyogTiAqLykgPyAnXFx4ODUnIDpcbiAgICAgICAgKGMgPT09IDB4NUYvKiBfICovKSA/ICdcXHhBMCcgOlxuICAgICAgICAoYyA9PT0gMHg0Qy8qIEwgKi8pID8gJ1xcdTIwMjgnIDpcbiAgICAgICAgKGMgPT09IDB4NTAvKiBQICovKSA/ICdcXHUyMDI5JyA6ICcnO1xufVxuXG5mdW5jdGlvbiBjaGFyRnJvbUNvZGVwb2ludChjKSB7XG4gIGlmIChjIDw9IDB4RkZGRikge1xuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKGMpO1xuICB9XG4gIC8vIEVuY29kZSBVVEYtMTYgc3Vycm9nYXRlIHBhaXJcbiAgLy8gaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvVVRGLTE2I0NvZGVfcG9pbnRzX1UuMkIwMTAwMDBfdG9fVS4yQjEwRkZGRlxuICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSgoKGMgLSAweDAxMDAwMCkgPj4gMTApICsgMHhEODAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoKGMgLSAweDAxMDAwMCkgJiAweDAzRkYpICsgMHhEQzAwKTtcbn1cblxudmFyIHNpbXBsZUVzY2FwZUNoZWNrID0gbmV3IEFycmF5KDI1Nik7IC8vIGludGVnZXIsIGZvciBmYXN0IGFjY2Vzc1xudmFyIHNpbXBsZUVzY2FwZU1hcCA9IG5ldyBBcnJheSgyNTYpO1xuZm9yICh2YXIgaSA9IDA7IGkgPCAyNTY7IGkrKykge1xuICBzaW1wbGVFc2NhcGVDaGVja1tpXSA9IHNpbXBsZUVzY2FwZVNlcXVlbmNlKGkpID8gMSA6IDA7XG4gIHNpbXBsZUVzY2FwZU1hcFtpXSA9IHNpbXBsZUVzY2FwZVNlcXVlbmNlKGkpO1xufVxuXG5cbmZ1bmN0aW9uIFN0YXRlKGlucHV0LCBvcHRpb25zKSB7XG4gIHRoaXMuaW5wdXQgPSBpbnB1dDtcblxuICB0aGlzLmZpbGVuYW1lICA9IG9wdGlvbnNbJ2ZpbGVuYW1lJ10gIHx8IG51bGw7XG4gIHRoaXMuc2NoZW1hICAgID0gb3B0aW9uc1snc2NoZW1hJ10gICAgfHwgREVGQVVMVF9GVUxMX1NDSEVNQTtcbiAgdGhpcy5vbldhcm5pbmcgPSBvcHRpb25zWydvbldhcm5pbmcnXSB8fCBudWxsO1xuICB0aGlzLmxlZ2FjeSAgICA9IG9wdGlvbnNbJ2xlZ2FjeSddICAgIHx8IGZhbHNlO1xuICB0aGlzLmpzb24gICAgICA9IG9wdGlvbnNbJ2pzb24nXSAgICAgIHx8IGZhbHNlO1xuICB0aGlzLmxpc3RlbmVyICA9IG9wdGlvbnNbJ2xpc3RlbmVyJ10gIHx8IG51bGw7XG5cbiAgdGhpcy5pbXBsaWNpdFR5cGVzID0gdGhpcy5zY2hlbWEuY29tcGlsZWRJbXBsaWNpdDtcbiAgdGhpcy50eXBlTWFwICAgICAgID0gdGhpcy5zY2hlbWEuY29tcGlsZWRUeXBlTWFwO1xuXG4gIHRoaXMubGVuZ3RoICAgICA9IGlucHV0Lmxlbmd0aDtcbiAgdGhpcy5wb3NpdGlvbiAgID0gMDtcbiAgdGhpcy5saW5lICAgICAgID0gMDtcbiAgdGhpcy5saW5lU3RhcnQgID0gMDtcbiAgdGhpcy5saW5lSW5kZW50ID0gMDtcblxuICB0aGlzLmRvY3VtZW50cyA9IFtdO1xuXG4gIC8qXG4gIHRoaXMudmVyc2lvbjtcbiAgdGhpcy5jaGVja0xpbmVCcmVha3M7XG4gIHRoaXMudGFnTWFwO1xuICB0aGlzLmFuY2hvck1hcDtcbiAgdGhpcy50YWc7XG4gIHRoaXMuYW5jaG9yO1xuICB0aGlzLmtpbmQ7XG4gIHRoaXMucmVzdWx0OyovXG5cbn1cblxuXG5mdW5jdGlvbiBnZW5lcmF0ZUVycm9yKHN0YXRlLCBtZXNzYWdlKSB7XG4gIHJldHVybiBuZXcgWUFNTEV4Y2VwdGlvbihcbiAgICBtZXNzYWdlLFxuICAgIG5ldyBNYXJrKHN0YXRlLmZpbGVuYW1lLCBzdGF0ZS5pbnB1dCwgc3RhdGUucG9zaXRpb24sIHN0YXRlLmxpbmUsIChzdGF0ZS5wb3NpdGlvbiAtIHN0YXRlLmxpbmVTdGFydCkpKTtcbn1cblxuZnVuY3Rpb24gdGhyb3dFcnJvcihzdGF0ZSwgbWVzc2FnZSkge1xuICB0aHJvdyBnZW5lcmF0ZUVycm9yKHN0YXRlLCBtZXNzYWdlKTtcbn1cblxuZnVuY3Rpb24gdGhyb3dXYXJuaW5nKHN0YXRlLCBtZXNzYWdlKSB7XG4gIGlmIChzdGF0ZS5vbldhcm5pbmcpIHtcbiAgICBzdGF0ZS5vbldhcm5pbmcuY2FsbChudWxsLCBnZW5lcmF0ZUVycm9yKHN0YXRlLCBtZXNzYWdlKSk7XG4gIH1cbn1cblxuXG52YXIgZGlyZWN0aXZlSGFuZGxlcnMgPSB7XG5cbiAgWUFNTDogZnVuY3Rpb24gaGFuZGxlWWFtbERpcmVjdGl2ZShzdGF0ZSwgbmFtZSwgYXJncykge1xuXG4gICAgdmFyIG1hdGNoLCBtYWpvciwgbWlub3I7XG5cbiAgICBpZiAoc3RhdGUudmVyc2lvbiAhPT0gbnVsbCkge1xuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2R1cGxpY2F0aW9uIG9mICVZQU1MIGRpcmVjdGl2ZScpO1xuICAgIH1cblxuICAgIGlmIChhcmdzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ1lBTUwgZGlyZWN0aXZlIGFjY2VwdHMgZXhhY3RseSBvbmUgYXJndW1lbnQnKTtcbiAgICB9XG5cbiAgICBtYXRjaCA9IC9eKFswLTldKylcXC4oWzAtOV0rKSQvLmV4ZWMoYXJnc1swXSk7XG5cbiAgICBpZiAobWF0Y2ggPT09IG51bGwpIHtcbiAgICAgIHRocm93RXJyb3Ioc3RhdGUsICdpbGwtZm9ybWVkIGFyZ3VtZW50IG9mIHRoZSBZQU1MIGRpcmVjdGl2ZScpO1xuICAgIH1cblxuICAgIG1ham9yID0gcGFyc2VJbnQobWF0Y2hbMV0sIDEwKTtcbiAgICBtaW5vciA9IHBhcnNlSW50KG1hdGNoWzJdLCAxMCk7XG5cbiAgICBpZiAobWFqb3IgIT09IDEpIHtcbiAgICAgIHRocm93RXJyb3Ioc3RhdGUsICd1bmFjY2VwdGFibGUgWUFNTCB2ZXJzaW9uIG9mIHRoZSBkb2N1bWVudCcpO1xuICAgIH1cblxuICAgIHN0YXRlLnZlcnNpb24gPSBhcmdzWzBdO1xuICAgIHN0YXRlLmNoZWNrTGluZUJyZWFrcyA9IChtaW5vciA8IDIpO1xuXG4gICAgaWYgKG1pbm9yICE9PSAxICYmIG1pbm9yICE9PSAyKSB7XG4gICAgICB0aHJvd1dhcm5pbmcoc3RhdGUsICd1bnN1cHBvcnRlZCBZQU1MIHZlcnNpb24gb2YgdGhlIGRvY3VtZW50Jyk7XG4gICAgfVxuICB9LFxuXG4gIFRBRzogZnVuY3Rpb24gaGFuZGxlVGFnRGlyZWN0aXZlKHN0YXRlLCBuYW1lLCBhcmdzKSB7XG5cbiAgICB2YXIgaGFuZGxlLCBwcmVmaXg7XG5cbiAgICBpZiAoYXJncy5sZW5ndGggIT09IDIpIHtcbiAgICAgIHRocm93RXJyb3Ioc3RhdGUsICdUQUcgZGlyZWN0aXZlIGFjY2VwdHMgZXhhY3RseSB0d28gYXJndW1lbnRzJyk7XG4gICAgfVxuXG4gICAgaGFuZGxlID0gYXJnc1swXTtcbiAgICBwcmVmaXggPSBhcmdzWzFdO1xuXG4gICAgaWYgKCFQQVRURVJOX1RBR19IQU5ETEUudGVzdChoYW5kbGUpKSB7XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAnaWxsLWZvcm1lZCB0YWcgaGFuZGxlIChmaXJzdCBhcmd1bWVudCkgb2YgdGhlIFRBRyBkaXJlY3RpdmUnKTtcbiAgICB9XG5cbiAgICBpZiAoX2hhc093blByb3BlcnR5LmNhbGwoc3RhdGUudGFnTWFwLCBoYW5kbGUpKSB7XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAndGhlcmUgaXMgYSBwcmV2aW91c2x5IGRlY2xhcmVkIHN1ZmZpeCBmb3IgXCInICsgaGFuZGxlICsgJ1wiIHRhZyBoYW5kbGUnKTtcbiAgICB9XG5cbiAgICBpZiAoIVBBVFRFUk5fVEFHX1VSSS50ZXN0KHByZWZpeCkpIHtcbiAgICAgIHRocm93RXJyb3Ioc3RhdGUsICdpbGwtZm9ybWVkIHRhZyBwcmVmaXggKHNlY29uZCBhcmd1bWVudCkgb2YgdGhlIFRBRyBkaXJlY3RpdmUnKTtcbiAgICB9XG5cbiAgICBzdGF0ZS50YWdNYXBbaGFuZGxlXSA9IHByZWZpeDtcbiAgfVxufTtcblxuXG5mdW5jdGlvbiBjYXB0dXJlU2VnbWVudChzdGF0ZSwgc3RhcnQsIGVuZCwgY2hlY2tKc29uKSB7XG4gIHZhciBfcG9zaXRpb24sIF9sZW5ndGgsIF9jaGFyYWN0ZXIsIF9yZXN1bHQ7XG5cbiAgaWYgKHN0YXJ0IDwgZW5kKSB7XG4gICAgX3Jlc3VsdCA9IHN0YXRlLmlucHV0LnNsaWNlKHN0YXJ0LCBlbmQpO1xuXG4gICAgaWYgKGNoZWNrSnNvbikge1xuICAgICAgZm9yIChfcG9zaXRpb24gPSAwLCBfbGVuZ3RoID0gX3Jlc3VsdC5sZW5ndGg7XG4gICAgICAgICAgIF9wb3NpdGlvbiA8IF9sZW5ndGg7XG4gICAgICAgICAgIF9wb3NpdGlvbiArPSAxKSB7XG4gICAgICAgIF9jaGFyYWN0ZXIgPSBfcmVzdWx0LmNoYXJDb2RlQXQoX3Bvc2l0aW9uKTtcbiAgICAgICAgaWYgKCEoX2NoYXJhY3RlciA9PT0gMHgwOSB8fFxuICAgICAgICAgICAgICAoMHgyMCA8PSBfY2hhcmFjdGVyICYmIF9jaGFyYWN0ZXIgPD0gMHgxMEZGRkYpKSkge1xuICAgICAgICAgIHRocm93RXJyb3Ioc3RhdGUsICdleHBlY3RlZCB2YWxpZCBKU09OIGNoYXJhY3RlcicpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChQQVRURVJOX05PTl9QUklOVEFCTEUudGVzdChfcmVzdWx0KSkge1xuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ3RoZSBzdHJlYW0gY29udGFpbnMgbm9uLXByaW50YWJsZSBjaGFyYWN0ZXJzJyk7XG4gICAgfVxuXG4gICAgc3RhdGUucmVzdWx0ICs9IF9yZXN1bHQ7XG4gIH1cbn1cblxuZnVuY3Rpb24gbWVyZ2VNYXBwaW5ncyhzdGF0ZSwgZGVzdGluYXRpb24sIHNvdXJjZSwgb3ZlcnJpZGFibGVLZXlzKSB7XG4gIHZhciBzb3VyY2VLZXlzLCBrZXksIGluZGV4LCBxdWFudGl0eTtcblxuICBpZiAoIWNvbW1vbi5pc09iamVjdChzb3VyY2UpKSB7XG4gICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2Nhbm5vdCBtZXJnZSBtYXBwaW5nczsgdGhlIHByb3ZpZGVkIHNvdXJjZSBvYmplY3QgaXMgdW5hY2NlcHRhYmxlJyk7XG4gIH1cblxuICBzb3VyY2VLZXlzID0gT2JqZWN0LmtleXMoc291cmNlKTtcblxuICBmb3IgKGluZGV4ID0gMCwgcXVhbnRpdHkgPSBzb3VyY2VLZXlzLmxlbmd0aDsgaW5kZXggPCBxdWFudGl0eTsgaW5kZXggKz0gMSkge1xuICAgIGtleSA9IHNvdXJjZUtleXNbaW5kZXhdO1xuXG4gICAgaWYgKCFfaGFzT3duUHJvcGVydHkuY2FsbChkZXN0aW5hdGlvbiwga2V5KSkge1xuICAgICAgZGVzdGluYXRpb25ba2V5XSA9IHNvdXJjZVtrZXldO1xuICAgICAgb3ZlcnJpZGFibGVLZXlzW2tleV0gPSB0cnVlO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBzdG9yZU1hcHBpbmdQYWlyKHN0YXRlLCBfcmVzdWx0LCBvdmVycmlkYWJsZUtleXMsIGtleVRhZywga2V5Tm9kZSwgdmFsdWVOb2RlLCBzdGFydExpbmUsIHN0YXJ0UG9zKSB7XG4gIHZhciBpbmRleCwgcXVhbnRpdHk7XG5cbiAga2V5Tm9kZSA9IFN0cmluZyhrZXlOb2RlKTtcblxuICBpZiAoX3Jlc3VsdCA9PT0gbnVsbCkge1xuICAgIF9yZXN1bHQgPSB7fTtcbiAgfVxuXG4gIGlmIChrZXlUYWcgPT09ICd0YWc6eWFtbC5vcmcsMjAwMjptZXJnZScpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZU5vZGUpKSB7XG4gICAgICBmb3IgKGluZGV4ID0gMCwgcXVhbnRpdHkgPSB2YWx1ZU5vZGUubGVuZ3RoOyBpbmRleCA8IHF1YW50aXR5OyBpbmRleCArPSAxKSB7XG4gICAgICAgIG1lcmdlTWFwcGluZ3Moc3RhdGUsIF9yZXN1bHQsIHZhbHVlTm9kZVtpbmRleF0sIG92ZXJyaWRhYmxlS2V5cyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG1lcmdlTWFwcGluZ3Moc3RhdGUsIF9yZXN1bHQsIHZhbHVlTm9kZSwgb3ZlcnJpZGFibGVLZXlzKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKCFzdGF0ZS5qc29uICYmXG4gICAgICAgICFfaGFzT3duUHJvcGVydHkuY2FsbChvdmVycmlkYWJsZUtleXMsIGtleU5vZGUpICYmXG4gICAgICAgIF9oYXNPd25Qcm9wZXJ0eS5jYWxsKF9yZXN1bHQsIGtleU5vZGUpKSB7XG4gICAgICBzdGF0ZS5saW5lID0gc3RhcnRMaW5lIHx8IHN0YXRlLmxpbmU7XG4gICAgICBzdGF0ZS5wb3NpdGlvbiA9IHN0YXJ0UG9zIHx8IHN0YXRlLnBvc2l0aW9uO1xuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2R1cGxpY2F0ZWQgbWFwcGluZyBrZXknKTtcbiAgICB9XG4gICAgX3Jlc3VsdFtrZXlOb2RlXSA9IHZhbHVlTm9kZTtcbiAgICBkZWxldGUgb3ZlcnJpZGFibGVLZXlzW2tleU5vZGVdO1xuICB9XG5cbiAgcmV0dXJuIF9yZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIHJlYWRMaW5lQnJlYWsoc3RhdGUpIHtcbiAgdmFyIGNoO1xuXG4gIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgaWYgKGNoID09PSAweDBBLyogTEYgKi8pIHtcbiAgICBzdGF0ZS5wb3NpdGlvbisrO1xuICB9IGVsc2UgaWYgKGNoID09PSAweDBELyogQ1IgKi8pIHtcbiAgICBzdGF0ZS5wb3NpdGlvbisrO1xuICAgIGlmIChzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKSA9PT0gMHgwQS8qIExGICovKSB7XG4gICAgICBzdGF0ZS5wb3NpdGlvbisrO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvd0Vycm9yKHN0YXRlLCAnYSBsaW5lIGJyZWFrIGlzIGV4cGVjdGVkJyk7XG4gIH1cblxuICBzdGF0ZS5saW5lICs9IDE7XG4gIHN0YXRlLmxpbmVTdGFydCA9IHN0YXRlLnBvc2l0aW9uO1xufVxuXG5mdW5jdGlvbiBza2lwU2VwYXJhdGlvblNwYWNlKHN0YXRlLCBhbGxvd0NvbW1lbnRzLCBjaGVja0luZGVudCkge1xuICB2YXIgbGluZUJyZWFrcyA9IDAsXG4gICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pO1xuXG4gIHdoaWxlIChjaCAhPT0gMCkge1xuICAgIHdoaWxlIChpc19XSElURV9TUEFDRShjaCkpIHtcbiAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgICB9XG5cbiAgICBpZiAoYWxsb3dDb21tZW50cyAmJiBjaCA9PT0gMHgyMy8qICMgKi8pIHtcbiAgICAgIGRvIHtcbiAgICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuICAgICAgfSB3aGlsZSAoY2ggIT09IDB4MEEvKiBMRiAqLyAmJiBjaCAhPT0gMHgwRC8qIENSICovICYmIGNoICE9PSAwKTtcbiAgICB9XG5cbiAgICBpZiAoaXNfRU9MKGNoKSkge1xuICAgICAgcmVhZExpbmVCcmVhayhzdGF0ZSk7XG5cbiAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG4gICAgICBsaW5lQnJlYWtzKys7XG4gICAgICBzdGF0ZS5saW5lSW5kZW50ID0gMDtcblxuICAgICAgd2hpbGUgKGNoID09PSAweDIwLyogU3BhY2UgKi8pIHtcbiAgICAgICAgc3RhdGUubGluZUluZGVudCsrO1xuICAgICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIGlmIChjaGVja0luZGVudCAhPT0gLTEgJiYgbGluZUJyZWFrcyAhPT0gMCAmJiBzdGF0ZS5saW5lSW5kZW50IDwgY2hlY2tJbmRlbnQpIHtcbiAgICB0aHJvd1dhcm5pbmcoc3RhdGUsICdkZWZpY2llbnQgaW5kZW50YXRpb24nKTtcbiAgfVxuXG4gIHJldHVybiBsaW5lQnJlYWtzO1xufVxuXG5mdW5jdGlvbiB0ZXN0RG9jdW1lbnRTZXBhcmF0b3Ioc3RhdGUpIHtcbiAgdmFyIF9wb3NpdGlvbiA9IHN0YXRlLnBvc2l0aW9uLFxuICAgICAgY2g7XG5cbiAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KF9wb3NpdGlvbik7XG5cbiAgLy8gQ29uZGl0aW9uIHN0YXRlLnBvc2l0aW9uID09PSBzdGF0ZS5saW5lU3RhcnQgaXMgdGVzdGVkXG4gIC8vIGluIHBhcmVudCBvbiBlYWNoIGNhbGwsIGZvciBlZmZpY2llbmN5LiBObyBuZWVkcyB0byB0ZXN0IGhlcmUgYWdhaW4uXG4gIGlmICgoY2ggPT09IDB4MkQvKiAtICovIHx8IGNoID09PSAweDJFLyogLiAqLykgJiZcbiAgICAgIGNoID09PSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KF9wb3NpdGlvbiArIDEpICYmXG4gICAgICBjaCA9PT0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChfcG9zaXRpb24gKyAyKSkge1xuXG4gICAgX3Bvc2l0aW9uICs9IDM7XG5cbiAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoX3Bvc2l0aW9uKTtcblxuICAgIGlmIChjaCA9PT0gMCB8fCBpc19XU19PUl9FT0woY2gpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHdyaXRlRm9sZGVkTGluZXMoc3RhdGUsIGNvdW50KSB7XG4gIGlmIChjb3VudCA9PT0gMSkge1xuICAgIHN0YXRlLnJlc3VsdCArPSAnICc7XG4gIH0gZWxzZSBpZiAoY291bnQgPiAxKSB7XG4gICAgc3RhdGUucmVzdWx0ICs9IGNvbW1vbi5yZXBlYXQoJ1xcbicsIGNvdW50IC0gMSk7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiByZWFkUGxhaW5TY2FsYXIoc3RhdGUsIG5vZGVJbmRlbnQsIHdpdGhpbkZsb3dDb2xsZWN0aW9uKSB7XG4gIHZhciBwcmVjZWRpbmcsXG4gICAgICBmb2xsb3dpbmcsXG4gICAgICBjYXB0dXJlU3RhcnQsXG4gICAgICBjYXB0dXJlRW5kLFxuICAgICAgaGFzUGVuZGluZ0NvbnRlbnQsXG4gICAgICBfbGluZSxcbiAgICAgIF9saW5lU3RhcnQsXG4gICAgICBfbGluZUluZGVudCxcbiAgICAgIF9raW5kID0gc3RhdGUua2luZCxcbiAgICAgIF9yZXN1bHQgPSBzdGF0ZS5yZXN1bHQsXG4gICAgICBjaDtcblxuICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pO1xuXG4gIGlmIChpc19XU19PUl9FT0woY2gpICAgICAgfHxcbiAgICAgIGlzX0ZMT1dfSU5ESUNBVE9SKGNoKSB8fFxuICAgICAgY2ggPT09IDB4MjMvKiAjICovICAgIHx8XG4gICAgICBjaCA9PT0gMHgyNi8qICYgKi8gICAgfHxcbiAgICAgIGNoID09PSAweDJBLyogKiAqLyAgICB8fFxuICAgICAgY2ggPT09IDB4MjEvKiAhICovICAgIHx8XG4gICAgICBjaCA9PT0gMHg3Qy8qIHwgKi8gICAgfHxcbiAgICAgIGNoID09PSAweDNFLyogPiAqLyAgICB8fFxuICAgICAgY2ggPT09IDB4MjcvKiAnICovICAgIHx8XG4gICAgICBjaCA9PT0gMHgyMi8qIFwiICovICAgIHx8XG4gICAgICBjaCA9PT0gMHgyNS8qICUgKi8gICAgfHxcbiAgICAgIGNoID09PSAweDQwLyogQCAqLyAgICB8fFxuICAgICAgY2ggPT09IDB4NjAvKiBgICovKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKGNoID09PSAweDNGLyogPyAqLyB8fCBjaCA9PT0gMHgyRC8qIC0gKi8pIHtcbiAgICBmb2xsb3dpbmcgPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uICsgMSk7XG5cbiAgICBpZiAoaXNfV1NfT1JfRU9MKGZvbGxvd2luZykgfHxcbiAgICAgICAgd2l0aGluRmxvd0NvbGxlY3Rpb24gJiYgaXNfRkxPV19JTkRJQ0FUT1IoZm9sbG93aW5nKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHN0YXRlLmtpbmQgPSAnc2NhbGFyJztcbiAgc3RhdGUucmVzdWx0ID0gJyc7XG4gIGNhcHR1cmVTdGFydCA9IGNhcHR1cmVFbmQgPSBzdGF0ZS5wb3NpdGlvbjtcbiAgaGFzUGVuZGluZ0NvbnRlbnQgPSBmYWxzZTtcblxuICB3aGlsZSAoY2ggIT09IDApIHtcbiAgICBpZiAoY2ggPT09IDB4M0EvKiA6ICovKSB7XG4gICAgICBmb2xsb3dpbmcgPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uICsgMSk7XG5cbiAgICAgIGlmIChpc19XU19PUl9FT0woZm9sbG93aW5nKSB8fFxuICAgICAgICAgIHdpdGhpbkZsb3dDb2xsZWN0aW9uICYmIGlzX0ZMT1dfSU5ESUNBVE9SKGZvbGxvd2luZykpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICB9IGVsc2UgaWYgKGNoID09PSAweDIzLyogIyAqLykge1xuICAgICAgcHJlY2VkaW5nID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbiAtIDEpO1xuXG4gICAgICBpZiAoaXNfV1NfT1JfRU9MKHByZWNlZGluZykpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICB9IGVsc2UgaWYgKChzdGF0ZS5wb3NpdGlvbiA9PT0gc3RhdGUubGluZVN0YXJ0ICYmIHRlc3REb2N1bWVudFNlcGFyYXRvcihzdGF0ZSkpIHx8XG4gICAgICAgICAgICAgICB3aXRoaW5GbG93Q29sbGVjdGlvbiAmJiBpc19GTE9XX0lORElDQVRPUihjaCkpIHtcbiAgICAgIGJyZWFrO1xuXG4gICAgfSBlbHNlIGlmIChpc19FT0woY2gpKSB7XG4gICAgICBfbGluZSA9IHN0YXRlLmxpbmU7XG4gICAgICBfbGluZVN0YXJ0ID0gc3RhdGUubGluZVN0YXJ0O1xuICAgICAgX2xpbmVJbmRlbnQgPSBzdGF0ZS5saW5lSW5kZW50O1xuICAgICAgc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgZmFsc2UsIC0xKTtcblxuICAgICAgaWYgKHN0YXRlLmxpbmVJbmRlbnQgPj0gbm9kZUluZGVudCkge1xuICAgICAgICBoYXNQZW5kaW5nQ29udGVudCA9IHRydWU7XG4gICAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RhdGUucG9zaXRpb24gPSBjYXB0dXJlRW5kO1xuICAgICAgICBzdGF0ZS5saW5lID0gX2xpbmU7XG4gICAgICAgIHN0YXRlLmxpbmVTdGFydCA9IF9saW5lU3RhcnQ7XG4gICAgICAgIHN0YXRlLmxpbmVJbmRlbnQgPSBfbGluZUluZGVudDtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGhhc1BlbmRpbmdDb250ZW50KSB7XG4gICAgICBjYXB0dXJlU2VnbWVudChzdGF0ZSwgY2FwdHVyZVN0YXJ0LCBjYXB0dXJlRW5kLCBmYWxzZSk7XG4gICAgICB3cml0ZUZvbGRlZExpbmVzKHN0YXRlLCBzdGF0ZS5saW5lIC0gX2xpbmUpO1xuICAgICAgY2FwdHVyZVN0YXJ0ID0gY2FwdHVyZUVuZCA9IHN0YXRlLnBvc2l0aW9uO1xuICAgICAgaGFzUGVuZGluZ0NvbnRlbnQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIWlzX1dISVRFX1NQQUNFKGNoKSkge1xuICAgICAgY2FwdHVyZUVuZCA9IHN0YXRlLnBvc2l0aW9uICsgMTtcbiAgICB9XG5cbiAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gIH1cblxuICBjYXB0dXJlU2VnbWVudChzdGF0ZSwgY2FwdHVyZVN0YXJ0LCBjYXB0dXJlRW5kLCBmYWxzZSk7XG5cbiAgaWYgKHN0YXRlLnJlc3VsdCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgc3RhdGUua2luZCA9IF9raW5kO1xuICBzdGF0ZS5yZXN1bHQgPSBfcmVzdWx0O1xuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHJlYWRTaW5nbGVRdW90ZWRTY2FsYXIoc3RhdGUsIG5vZGVJbmRlbnQpIHtcbiAgdmFyIGNoLFxuICAgICAgY2FwdHVyZVN0YXJ0LCBjYXB0dXJlRW5kO1xuXG4gIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgaWYgKGNoICE9PSAweDI3LyogJyAqLykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHN0YXRlLmtpbmQgPSAnc2NhbGFyJztcbiAgc3RhdGUucmVzdWx0ID0gJyc7XG4gIHN0YXRlLnBvc2l0aW9uKys7XG4gIGNhcHR1cmVTdGFydCA9IGNhcHR1cmVFbmQgPSBzdGF0ZS5wb3NpdGlvbjtcblxuICB3aGlsZSAoKGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbikpICE9PSAwKSB7XG4gICAgaWYgKGNoID09PSAweDI3LyogJyAqLykge1xuICAgICAgY2FwdHVyZVNlZ21lbnQoc3RhdGUsIGNhcHR1cmVTdGFydCwgc3RhdGUucG9zaXRpb24sIHRydWUpO1xuICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuXG4gICAgICBpZiAoY2ggPT09IDB4MjcvKiAnICovKSB7XG4gICAgICAgIGNhcHR1cmVTdGFydCA9IHN0YXRlLnBvc2l0aW9uO1xuICAgICAgICBzdGF0ZS5wb3NpdGlvbisrO1xuICAgICAgICBjYXB0dXJlRW5kID0gc3RhdGUucG9zaXRpb247XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgIH0gZWxzZSBpZiAoaXNfRU9MKGNoKSkge1xuICAgICAgY2FwdHVyZVNlZ21lbnQoc3RhdGUsIGNhcHR1cmVTdGFydCwgY2FwdHVyZUVuZCwgdHJ1ZSk7XG4gICAgICB3cml0ZUZvbGRlZExpbmVzKHN0YXRlLCBza2lwU2VwYXJhdGlvblNwYWNlKHN0YXRlLCBmYWxzZSwgbm9kZUluZGVudCkpO1xuICAgICAgY2FwdHVyZVN0YXJ0ID0gY2FwdHVyZUVuZCA9IHN0YXRlLnBvc2l0aW9uO1xuXG4gICAgfSBlbHNlIGlmIChzdGF0ZS5wb3NpdGlvbiA9PT0gc3RhdGUubGluZVN0YXJ0ICYmIHRlc3REb2N1bWVudFNlcGFyYXRvcihzdGF0ZSkpIHtcbiAgICAgIHRocm93RXJyb3Ioc3RhdGUsICd1bmV4cGVjdGVkIGVuZCBvZiB0aGUgZG9jdW1lbnQgd2l0aGluIGEgc2luZ2xlIHF1b3RlZCBzY2FsYXInKTtcblxuICAgIH0gZWxzZSB7XG4gICAgICBzdGF0ZS5wb3NpdGlvbisrO1xuICAgICAgY2FwdHVyZUVuZCA9IHN0YXRlLnBvc2l0aW9uO1xuICAgIH1cbiAgfVxuXG4gIHRocm93RXJyb3Ioc3RhdGUsICd1bmV4cGVjdGVkIGVuZCBvZiB0aGUgc3RyZWFtIHdpdGhpbiBhIHNpbmdsZSBxdW90ZWQgc2NhbGFyJyk7XG59XG5cbmZ1bmN0aW9uIHJlYWREb3VibGVRdW90ZWRTY2FsYXIoc3RhdGUsIG5vZGVJbmRlbnQpIHtcbiAgdmFyIGNhcHR1cmVTdGFydCxcbiAgICAgIGNhcHR1cmVFbmQsXG4gICAgICBoZXhMZW5ndGgsXG4gICAgICBoZXhSZXN1bHQsXG4gICAgICB0bXAsXG4gICAgICBjaDtcblxuICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pO1xuXG4gIGlmIChjaCAhPT0gMHgyMi8qIFwiICovKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgc3RhdGUua2luZCA9ICdzY2FsYXInO1xuICBzdGF0ZS5yZXN1bHQgPSAnJztcbiAgc3RhdGUucG9zaXRpb24rKztcbiAgY2FwdHVyZVN0YXJ0ID0gY2FwdHVyZUVuZCA9IHN0YXRlLnBvc2l0aW9uO1xuXG4gIHdoaWxlICgoY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKSkgIT09IDApIHtcbiAgICBpZiAoY2ggPT09IDB4MjIvKiBcIiAqLykge1xuICAgICAgY2FwdHVyZVNlZ21lbnQoc3RhdGUsIGNhcHR1cmVTdGFydCwgc3RhdGUucG9zaXRpb24sIHRydWUpO1xuICAgICAgc3RhdGUucG9zaXRpb24rKztcbiAgICAgIHJldHVybiB0cnVlO1xuXG4gICAgfSBlbHNlIGlmIChjaCA9PT0gMHg1Qy8qIFxcICovKSB7XG4gICAgICBjYXB0dXJlU2VnbWVudChzdGF0ZSwgY2FwdHVyZVN0YXJ0LCBzdGF0ZS5wb3NpdGlvbiwgdHJ1ZSk7XG4gICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG5cbiAgICAgIGlmIChpc19FT0woY2gpKSB7XG4gICAgICAgIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIGZhbHNlLCBub2RlSW5kZW50KTtcblxuICAgICAgICAvLyBUT0RPOiByZXdvcmsgdG8gaW5saW5lIGZuIHdpdGggbm8gdHlwZSBjYXN0P1xuICAgICAgfSBlbHNlIGlmIChjaCA8IDI1NiAmJiBzaW1wbGVFc2NhcGVDaGVja1tjaF0pIHtcbiAgICAgICAgc3RhdGUucmVzdWx0ICs9IHNpbXBsZUVzY2FwZU1hcFtjaF07XG4gICAgICAgIHN0YXRlLnBvc2l0aW9uKys7XG5cbiAgICAgIH0gZWxzZSBpZiAoKHRtcCA9IGVzY2FwZWRIZXhMZW4oY2gpKSA+IDApIHtcbiAgICAgICAgaGV4TGVuZ3RoID0gdG1wO1xuICAgICAgICBoZXhSZXN1bHQgPSAwO1xuXG4gICAgICAgIGZvciAoOyBoZXhMZW5ndGggPiAwOyBoZXhMZW5ndGgtLSkge1xuICAgICAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcblxuICAgICAgICAgIGlmICgodG1wID0gZnJvbUhleENvZGUoY2gpKSA+PSAwKSB7XG4gICAgICAgICAgICBoZXhSZXN1bHQgPSAoaGV4UmVzdWx0IDw8IDQpICsgdG1wO1xuXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93RXJyb3Ioc3RhdGUsICdleHBlY3RlZCBoZXhhZGVjaW1hbCBjaGFyYWN0ZXInKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBzdGF0ZS5yZXN1bHQgKz0gY2hhckZyb21Db2RlcG9pbnQoaGV4UmVzdWx0KTtcblxuICAgICAgICBzdGF0ZS5wb3NpdGlvbisrO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvd0Vycm9yKHN0YXRlLCAndW5rbm93biBlc2NhcGUgc2VxdWVuY2UnKTtcbiAgICAgIH1cblxuICAgICAgY2FwdHVyZVN0YXJ0ID0gY2FwdHVyZUVuZCA9IHN0YXRlLnBvc2l0aW9uO1xuXG4gICAgfSBlbHNlIGlmIChpc19FT0woY2gpKSB7XG4gICAgICBjYXB0dXJlU2VnbWVudChzdGF0ZSwgY2FwdHVyZVN0YXJ0LCBjYXB0dXJlRW5kLCB0cnVlKTtcbiAgICAgIHdyaXRlRm9sZGVkTGluZXMoc3RhdGUsIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIGZhbHNlLCBub2RlSW5kZW50KSk7XG4gICAgICBjYXB0dXJlU3RhcnQgPSBjYXB0dXJlRW5kID0gc3RhdGUucG9zaXRpb247XG5cbiAgICB9IGVsc2UgaWYgKHN0YXRlLnBvc2l0aW9uID09PSBzdGF0ZS5saW5lU3RhcnQgJiYgdGVzdERvY3VtZW50U2VwYXJhdG9yKHN0YXRlKSkge1xuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ3VuZXhwZWN0ZWQgZW5kIG9mIHRoZSBkb2N1bWVudCB3aXRoaW4gYSBkb3VibGUgcXVvdGVkIHNjYWxhcicpO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXRlLnBvc2l0aW9uKys7XG4gICAgICBjYXB0dXJlRW5kID0gc3RhdGUucG9zaXRpb247XG4gICAgfVxuICB9XG5cbiAgdGhyb3dFcnJvcihzdGF0ZSwgJ3VuZXhwZWN0ZWQgZW5kIG9mIHRoZSBzdHJlYW0gd2l0aGluIGEgZG91YmxlIHF1b3RlZCBzY2FsYXInKTtcbn1cblxuZnVuY3Rpb24gcmVhZEZsb3dDb2xsZWN0aW9uKHN0YXRlLCBub2RlSW5kZW50KSB7XG4gIHZhciByZWFkTmV4dCA9IHRydWUsXG4gICAgICBfbGluZSxcbiAgICAgIF90YWcgICAgID0gc3RhdGUudGFnLFxuICAgICAgX3Jlc3VsdCxcbiAgICAgIF9hbmNob3IgID0gc3RhdGUuYW5jaG9yLFxuICAgICAgZm9sbG93aW5nLFxuICAgICAgdGVybWluYXRvcixcbiAgICAgIGlzUGFpcixcbiAgICAgIGlzRXhwbGljaXRQYWlyLFxuICAgICAgaXNNYXBwaW5nLFxuICAgICAgb3ZlcnJpZGFibGVLZXlzID0ge30sXG4gICAgICBrZXlOb2RlLFxuICAgICAga2V5VGFnLFxuICAgICAgdmFsdWVOb2RlLFxuICAgICAgY2g7XG5cbiAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcblxuICBpZiAoY2ggPT09IDB4NUIvKiBbICovKSB7XG4gICAgdGVybWluYXRvciA9IDB4NUQ7LyogXSAqL1xuICAgIGlzTWFwcGluZyA9IGZhbHNlO1xuICAgIF9yZXN1bHQgPSBbXTtcbiAgfSBlbHNlIGlmIChjaCA9PT0gMHg3Qi8qIHsgKi8pIHtcbiAgICB0ZXJtaW5hdG9yID0gMHg3RDsvKiB9ICovXG4gICAgaXNNYXBwaW5nID0gdHJ1ZTtcbiAgICBfcmVzdWx0ID0ge307XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKHN0YXRlLmFuY2hvciAhPT0gbnVsbCkge1xuICAgIHN0YXRlLmFuY2hvck1hcFtzdGF0ZS5hbmNob3JdID0gX3Jlc3VsdDtcbiAgfVxuXG4gIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcblxuICB3aGlsZSAoY2ggIT09IDApIHtcbiAgICBza2lwU2VwYXJhdGlvblNwYWNlKHN0YXRlLCB0cnVlLCBub2RlSW5kZW50KTtcblxuICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgICBpZiAoY2ggPT09IHRlcm1pbmF0b3IpIHtcbiAgICAgIHN0YXRlLnBvc2l0aW9uKys7XG4gICAgICBzdGF0ZS50YWcgPSBfdGFnO1xuICAgICAgc3RhdGUuYW5jaG9yID0gX2FuY2hvcjtcbiAgICAgIHN0YXRlLmtpbmQgPSBpc01hcHBpbmcgPyAnbWFwcGluZycgOiAnc2VxdWVuY2UnO1xuICAgICAgc3RhdGUucmVzdWx0ID0gX3Jlc3VsdDtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAoIXJlYWROZXh0KSB7XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAnbWlzc2VkIGNvbW1hIGJldHdlZW4gZmxvdyBjb2xsZWN0aW9uIGVudHJpZXMnKTtcbiAgICB9XG5cbiAgICBrZXlUYWcgPSBrZXlOb2RlID0gdmFsdWVOb2RlID0gbnVsbDtcbiAgICBpc1BhaXIgPSBpc0V4cGxpY2l0UGFpciA9IGZhbHNlO1xuXG4gICAgaWYgKGNoID09PSAweDNGLyogPyAqLykge1xuICAgICAgZm9sbG93aW5nID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbiArIDEpO1xuXG4gICAgICBpZiAoaXNfV1NfT1JfRU9MKGZvbGxvd2luZykpIHtcbiAgICAgICAgaXNQYWlyID0gaXNFeHBsaWNpdFBhaXIgPSB0cnVlO1xuICAgICAgICBzdGF0ZS5wb3NpdGlvbisrO1xuICAgICAgICBza2lwU2VwYXJhdGlvblNwYWNlKHN0YXRlLCB0cnVlLCBub2RlSW5kZW50KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBfbGluZSA9IHN0YXRlLmxpbmU7XG4gICAgY29tcG9zZU5vZGUoc3RhdGUsIG5vZGVJbmRlbnQsIENPTlRFWFRfRkxPV19JTiwgZmFsc2UsIHRydWUpO1xuICAgIGtleVRhZyA9IHN0YXRlLnRhZztcbiAgICBrZXlOb2RlID0gc3RhdGUucmVzdWx0O1xuICAgIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIG5vZGVJbmRlbnQpO1xuXG4gICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcblxuICAgIGlmICgoaXNFeHBsaWNpdFBhaXIgfHwgc3RhdGUubGluZSA9PT0gX2xpbmUpICYmIGNoID09PSAweDNBLyogOiAqLykge1xuICAgICAgaXNQYWlyID0gdHJ1ZTtcbiAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgICAgIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIG5vZGVJbmRlbnQpO1xuICAgICAgY29tcG9zZU5vZGUoc3RhdGUsIG5vZGVJbmRlbnQsIENPTlRFWFRfRkxPV19JTiwgZmFsc2UsIHRydWUpO1xuICAgICAgdmFsdWVOb2RlID0gc3RhdGUucmVzdWx0O1xuICAgIH1cblxuICAgIGlmIChpc01hcHBpbmcpIHtcbiAgICAgIHN0b3JlTWFwcGluZ1BhaXIoc3RhdGUsIF9yZXN1bHQsIG92ZXJyaWRhYmxlS2V5cywga2V5VGFnLCBrZXlOb2RlLCB2YWx1ZU5vZGUpO1xuICAgIH0gZWxzZSBpZiAoaXNQYWlyKSB7XG4gICAgICBfcmVzdWx0LnB1c2goc3RvcmVNYXBwaW5nUGFpcihzdGF0ZSwgbnVsbCwgb3ZlcnJpZGFibGVLZXlzLCBrZXlUYWcsIGtleU5vZGUsIHZhbHVlTm9kZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBfcmVzdWx0LnB1c2goa2V5Tm9kZSk7XG4gICAgfVxuXG4gICAgc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgdHJ1ZSwgbm9kZUluZGVudCk7XG5cbiAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pO1xuXG4gICAgaWYgKGNoID09PSAweDJDLyogLCAqLykge1xuICAgICAgcmVhZE5leHQgPSB0cnVlO1xuICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZWFkTmV4dCA9IGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHRocm93RXJyb3Ioc3RhdGUsICd1bmV4cGVjdGVkIGVuZCBvZiB0aGUgc3RyZWFtIHdpdGhpbiBhIGZsb3cgY29sbGVjdGlvbicpO1xufVxuXG5mdW5jdGlvbiByZWFkQmxvY2tTY2FsYXIoc3RhdGUsIG5vZGVJbmRlbnQpIHtcbiAgdmFyIGNhcHR1cmVTdGFydCxcbiAgICAgIGZvbGRpbmcsXG4gICAgICBjaG9tcGluZyAgICAgICA9IENIT01QSU5HX0NMSVAsXG4gICAgICBkaWRSZWFkQ29udGVudCA9IGZhbHNlLFxuICAgICAgZGV0ZWN0ZWRJbmRlbnQgPSBmYWxzZSxcbiAgICAgIHRleHRJbmRlbnQgICAgID0gbm9kZUluZGVudCxcbiAgICAgIGVtcHR5TGluZXMgICAgID0gMCxcbiAgICAgIGF0TW9yZUluZGVudGVkID0gZmFsc2UsXG4gICAgICB0bXAsXG4gICAgICBjaDtcblxuICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pO1xuXG4gIGlmIChjaCA9PT0gMHg3Qy8qIHwgKi8pIHtcbiAgICBmb2xkaW5nID0gZmFsc2U7XG4gIH0gZWxzZSBpZiAoY2ggPT09IDB4M0UvKiA+ICovKSB7XG4gICAgZm9sZGluZyA9IHRydWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgc3RhdGUua2luZCA9ICdzY2FsYXInO1xuICBzdGF0ZS5yZXN1bHQgPSAnJztcblxuICB3aGlsZSAoY2ggIT09IDApIHtcbiAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG5cbiAgICBpZiAoY2ggPT09IDB4MkIvKiArICovIHx8IGNoID09PSAweDJELyogLSAqLykge1xuICAgICAgaWYgKENIT01QSU5HX0NMSVAgPT09IGNob21waW5nKSB7XG4gICAgICAgIGNob21waW5nID0gKGNoID09PSAweDJCLyogKyAqLykgPyBDSE9NUElOR19LRUVQIDogQ0hPTVBJTkdfU1RSSVA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvd0Vycm9yKHN0YXRlLCAncmVwZWF0IG9mIGEgY2hvbXBpbmcgbW9kZSBpZGVudGlmaWVyJyk7XG4gICAgICB9XG5cbiAgICB9IGVsc2UgaWYgKCh0bXAgPSBmcm9tRGVjaW1hbENvZGUoY2gpKSA+PSAwKSB7XG4gICAgICBpZiAodG1wID09PSAwKSB7XG4gICAgICAgIHRocm93RXJyb3Ioc3RhdGUsICdiYWQgZXhwbGljaXQgaW5kZW50YXRpb24gd2lkdGggb2YgYSBibG9jayBzY2FsYXI7IGl0IGNhbm5vdCBiZSBsZXNzIHRoYW4gb25lJyk7XG4gICAgICB9IGVsc2UgaWYgKCFkZXRlY3RlZEluZGVudCkge1xuICAgICAgICB0ZXh0SW5kZW50ID0gbm9kZUluZGVudCArIHRtcCAtIDE7XG4gICAgICAgIGRldGVjdGVkSW5kZW50ID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93RXJyb3Ioc3RhdGUsICdyZXBlYXQgb2YgYW4gaW5kZW50YXRpb24gd2lkdGggaWRlbnRpZmllcicpO1xuICAgICAgfVxuXG4gICAgfSBlbHNlIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIGlmIChpc19XSElURV9TUEFDRShjaCkpIHtcbiAgICBkbyB7IGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTsgfVxuICAgIHdoaWxlIChpc19XSElURV9TUEFDRShjaCkpO1xuXG4gICAgaWYgKGNoID09PSAweDIzLyogIyAqLykge1xuICAgICAgZG8geyBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7IH1cbiAgICAgIHdoaWxlICghaXNfRU9MKGNoKSAmJiAoY2ggIT09IDApKTtcbiAgICB9XG4gIH1cblxuICB3aGlsZSAoY2ggIT09IDApIHtcbiAgICByZWFkTGluZUJyZWFrKHN0YXRlKTtcbiAgICBzdGF0ZS5saW5lSW5kZW50ID0gMDtcblxuICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgICB3aGlsZSAoKCFkZXRlY3RlZEluZGVudCB8fCBzdGF0ZS5saW5lSW5kZW50IDwgdGV4dEluZGVudCkgJiZcbiAgICAgICAgICAgKGNoID09PSAweDIwLyogU3BhY2UgKi8pKSB7XG4gICAgICBzdGF0ZS5saW5lSW5kZW50Kys7XG4gICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgfVxuXG4gICAgaWYgKCFkZXRlY3RlZEluZGVudCAmJiBzdGF0ZS5saW5lSW5kZW50ID4gdGV4dEluZGVudCkge1xuICAgICAgdGV4dEluZGVudCA9IHN0YXRlLmxpbmVJbmRlbnQ7XG4gICAgfVxuXG4gICAgaWYgKGlzX0VPTChjaCkpIHtcbiAgICAgIGVtcHR5TGluZXMrKztcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIEVuZCBvZiB0aGUgc2NhbGFyLlxuICAgIGlmIChzdGF0ZS5saW5lSW5kZW50IDwgdGV4dEluZGVudCkge1xuXG4gICAgICAvLyBQZXJmb3JtIHRoZSBjaG9tcGluZy5cbiAgICAgIGlmIChjaG9tcGluZyA9PT0gQ0hPTVBJTkdfS0VFUCkge1xuICAgICAgICBzdGF0ZS5yZXN1bHQgKz0gY29tbW9uLnJlcGVhdCgnXFxuJywgZGlkUmVhZENvbnRlbnQgPyAxICsgZW1wdHlMaW5lcyA6IGVtcHR5TGluZXMpO1xuICAgICAgfSBlbHNlIGlmIChjaG9tcGluZyA9PT0gQ0hPTVBJTkdfQ0xJUCkge1xuICAgICAgICBpZiAoZGlkUmVhZENvbnRlbnQpIHsgLy8gaS5lLiBvbmx5IGlmIHRoZSBzY2FsYXIgaXMgbm90IGVtcHR5LlxuICAgICAgICAgIHN0YXRlLnJlc3VsdCArPSAnXFxuJztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBCcmVhayB0aGlzIGB3aGlsZWAgY3ljbGUgYW5kIGdvIHRvIHRoZSBmdW5jaXRvbidzIGVwaWxvZ3VlLlxuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgLy8gRm9sZGVkIHN0eWxlOiB1c2UgZmFuY3kgcnVsZXMgdG8gaGFuZGxlIGxpbmUgYnJlYWtzLlxuICAgIGlmIChmb2xkaW5nKSB7XG5cbiAgICAgIC8vIExpbmVzIHN0YXJ0aW5nIHdpdGggd2hpdGUgc3BhY2UgY2hhcmFjdGVycyAobW9yZS1pbmRlbnRlZCBsaW5lcykgYXJlIG5vdCBmb2xkZWQuXG4gICAgICBpZiAoaXNfV0hJVEVfU1BBQ0UoY2gpKSB7XG4gICAgICAgIGF0TW9yZUluZGVudGVkID0gdHJ1ZTtcbiAgICAgICAgLy8gZXhjZXB0IGZvciB0aGUgZmlyc3QgY29udGVudCBsaW5lIChjZi4gRXhhbXBsZSA4LjEpXG4gICAgICAgIHN0YXRlLnJlc3VsdCArPSBjb21tb24ucmVwZWF0KCdcXG4nLCBkaWRSZWFkQ29udGVudCA/IDEgKyBlbXB0eUxpbmVzIDogZW1wdHlMaW5lcyk7XG5cbiAgICAgIC8vIEVuZCBvZiBtb3JlLWluZGVudGVkIGJsb2NrLlxuICAgICAgfSBlbHNlIGlmIChhdE1vcmVJbmRlbnRlZCkge1xuICAgICAgICBhdE1vcmVJbmRlbnRlZCA9IGZhbHNlO1xuICAgICAgICBzdGF0ZS5yZXN1bHQgKz0gY29tbW9uLnJlcGVhdCgnXFxuJywgZW1wdHlMaW5lcyArIDEpO1xuXG4gICAgICAvLyBKdXN0IG9uZSBsaW5lIGJyZWFrIC0gcGVyY2VpdmUgYXMgdGhlIHNhbWUgbGluZS5cbiAgICAgIH0gZWxzZSBpZiAoZW1wdHlMaW5lcyA9PT0gMCkge1xuICAgICAgICBpZiAoZGlkUmVhZENvbnRlbnQpIHsgLy8gaS5lLiBvbmx5IGlmIHdlIGhhdmUgYWxyZWFkeSByZWFkIHNvbWUgc2NhbGFyIGNvbnRlbnQuXG4gICAgICAgICAgc3RhdGUucmVzdWx0ICs9ICcgJztcbiAgICAgICAgfVxuXG4gICAgICAvLyBTZXZlcmFsIGxpbmUgYnJlYWtzIC0gcGVyY2VpdmUgYXMgZGlmZmVyZW50IGxpbmVzLlxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RhdGUucmVzdWx0ICs9IGNvbW1vbi5yZXBlYXQoJ1xcbicsIGVtcHR5TGluZXMpO1xuICAgICAgfVxuXG4gICAgLy8gTGl0ZXJhbCBzdHlsZToganVzdCBhZGQgZXhhY3QgbnVtYmVyIG9mIGxpbmUgYnJlYWtzIGJldHdlZW4gY29udGVudCBsaW5lcy5cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gS2VlcCBhbGwgbGluZSBicmVha3MgZXhjZXB0IHRoZSBoZWFkZXIgbGluZSBicmVhay5cbiAgICAgIHN0YXRlLnJlc3VsdCArPSBjb21tb24ucmVwZWF0KCdcXG4nLCBkaWRSZWFkQ29udGVudCA/IDEgKyBlbXB0eUxpbmVzIDogZW1wdHlMaW5lcyk7XG4gICAgfVxuXG4gICAgZGlkUmVhZENvbnRlbnQgPSB0cnVlO1xuICAgIGRldGVjdGVkSW5kZW50ID0gdHJ1ZTtcbiAgICBlbXB0eUxpbmVzID0gMDtcbiAgICBjYXB0dXJlU3RhcnQgPSBzdGF0ZS5wb3NpdGlvbjtcblxuICAgIHdoaWxlICghaXNfRU9MKGNoKSAmJiAoY2ggIT09IDApKSB7XG4gICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgfVxuXG4gICAgY2FwdHVyZVNlZ21lbnQoc3RhdGUsIGNhcHR1cmVTdGFydCwgc3RhdGUucG9zaXRpb24sIGZhbHNlKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiByZWFkQmxvY2tTZXF1ZW5jZShzdGF0ZSwgbm9kZUluZGVudCkge1xuICB2YXIgX2xpbmUsXG4gICAgICBfdGFnICAgICAgPSBzdGF0ZS50YWcsXG4gICAgICBfYW5jaG9yICAgPSBzdGF0ZS5hbmNob3IsXG4gICAgICBfcmVzdWx0ICAgPSBbXSxcbiAgICAgIGZvbGxvd2luZyxcbiAgICAgIGRldGVjdGVkICA9IGZhbHNlLFxuICAgICAgY2g7XG5cbiAgaWYgKHN0YXRlLmFuY2hvciAhPT0gbnVsbCkge1xuICAgIHN0YXRlLmFuY2hvck1hcFtzdGF0ZS5hbmNob3JdID0gX3Jlc3VsdDtcbiAgfVxuXG4gIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgd2hpbGUgKGNoICE9PSAwKSB7XG5cbiAgICBpZiAoY2ggIT09IDB4MkQvKiAtICovKSB7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBmb2xsb3dpbmcgPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uICsgMSk7XG5cbiAgICBpZiAoIWlzX1dTX09SX0VPTChmb2xsb3dpbmcpKSB7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBkZXRlY3RlZCA9IHRydWU7XG4gICAgc3RhdGUucG9zaXRpb24rKztcblxuICAgIGlmIChza2lwU2VwYXJhdGlvblNwYWNlKHN0YXRlLCB0cnVlLCAtMSkpIHtcbiAgICAgIGlmIChzdGF0ZS5saW5lSW5kZW50IDw9IG5vZGVJbmRlbnQpIHtcbiAgICAgICAgX3Jlc3VsdC5wdXNoKG51bGwpO1xuICAgICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBfbGluZSA9IHN0YXRlLmxpbmU7XG4gICAgY29tcG9zZU5vZGUoc3RhdGUsIG5vZGVJbmRlbnQsIENPTlRFWFRfQkxPQ0tfSU4sIGZhbHNlLCB0cnVlKTtcbiAgICBfcmVzdWx0LnB1c2goc3RhdGUucmVzdWx0KTtcbiAgICBza2lwU2VwYXJhdGlvblNwYWNlKHN0YXRlLCB0cnVlLCAtMSk7XG5cbiAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pO1xuXG4gICAgaWYgKChzdGF0ZS5saW5lID09PSBfbGluZSB8fCBzdGF0ZS5saW5lSW5kZW50ID4gbm9kZUluZGVudCkgJiYgKGNoICE9PSAwKSkge1xuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2JhZCBpbmRlbnRhdGlvbiBvZiBhIHNlcXVlbmNlIGVudHJ5Jyk7XG4gICAgfSBlbHNlIGlmIChzdGF0ZS5saW5lSW5kZW50IDwgbm9kZUluZGVudCkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgaWYgKGRldGVjdGVkKSB7XG4gICAgc3RhdGUudGFnID0gX3RhZztcbiAgICBzdGF0ZS5hbmNob3IgPSBfYW5jaG9yO1xuICAgIHN0YXRlLmtpbmQgPSAnc2VxdWVuY2UnO1xuICAgIHN0YXRlLnJlc3VsdCA9IF9yZXN1bHQ7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiByZWFkQmxvY2tNYXBwaW5nKHN0YXRlLCBub2RlSW5kZW50LCBmbG93SW5kZW50KSB7XG4gIHZhciBmb2xsb3dpbmcsXG4gICAgICBhbGxvd0NvbXBhY3QsXG4gICAgICBfbGluZSxcbiAgICAgIF9wb3MsXG4gICAgICBfdGFnICAgICAgICAgID0gc3RhdGUudGFnLFxuICAgICAgX2FuY2hvciAgICAgICA9IHN0YXRlLmFuY2hvcixcbiAgICAgIF9yZXN1bHQgICAgICAgPSB7fSxcbiAgICAgIG92ZXJyaWRhYmxlS2V5cyA9IHt9LFxuICAgICAga2V5VGFnICAgICAgICA9IG51bGwsXG4gICAgICBrZXlOb2RlICAgICAgID0gbnVsbCxcbiAgICAgIHZhbHVlTm9kZSAgICAgPSBudWxsLFxuICAgICAgYXRFeHBsaWNpdEtleSA9IGZhbHNlLFxuICAgICAgZGV0ZWN0ZWQgICAgICA9IGZhbHNlLFxuICAgICAgY2g7XG5cbiAgaWYgKHN0YXRlLmFuY2hvciAhPT0gbnVsbCkge1xuICAgIHN0YXRlLmFuY2hvck1hcFtzdGF0ZS5hbmNob3JdID0gX3Jlc3VsdDtcbiAgfVxuXG4gIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgd2hpbGUgKGNoICE9PSAwKSB7XG4gICAgZm9sbG93aW5nID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbiArIDEpO1xuICAgIF9saW5lID0gc3RhdGUubGluZTsgLy8gU2F2ZSB0aGUgY3VycmVudCBsaW5lLlxuICAgIF9wb3MgPSBzdGF0ZS5wb3NpdGlvbjtcblxuICAgIC8vXG4gICAgLy8gRXhwbGljaXQgbm90YXRpb24gY2FzZS4gVGhlcmUgYXJlIHR3byBzZXBhcmF0ZSBibG9ja3M6XG4gICAgLy8gZmlyc3QgZm9yIHRoZSBrZXkgKGRlbm90ZWQgYnkgXCI/XCIpIGFuZCBzZWNvbmQgZm9yIHRoZSB2YWx1ZSAoZGVub3RlZCBieSBcIjpcIilcbiAgICAvL1xuICAgIGlmICgoY2ggPT09IDB4M0YvKiA/ICovIHx8IGNoID09PSAweDNBLyogOiAqLykgJiYgaXNfV1NfT1JfRU9MKGZvbGxvd2luZykpIHtcblxuICAgICAgaWYgKGNoID09PSAweDNGLyogPyAqLykge1xuICAgICAgICBpZiAoYXRFeHBsaWNpdEtleSkge1xuICAgICAgICAgIHN0b3JlTWFwcGluZ1BhaXIoc3RhdGUsIF9yZXN1bHQsIG92ZXJyaWRhYmxlS2V5cywga2V5VGFnLCBrZXlOb2RlLCBudWxsKTtcbiAgICAgICAgICBrZXlUYWcgPSBrZXlOb2RlID0gdmFsdWVOb2RlID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGRldGVjdGVkID0gdHJ1ZTtcbiAgICAgICAgYXRFeHBsaWNpdEtleSA9IHRydWU7XG4gICAgICAgIGFsbG93Q29tcGFjdCA9IHRydWU7XG5cbiAgICAgIH0gZWxzZSBpZiAoYXRFeHBsaWNpdEtleSkge1xuICAgICAgICAvLyBpLmUuIDB4M0EvKiA6ICovID09PSBjaGFyYWN0ZXIgYWZ0ZXIgdGhlIGV4cGxpY2l0IGtleS5cbiAgICAgICAgYXRFeHBsaWNpdEtleSA9IGZhbHNlO1xuICAgICAgICBhbGxvd0NvbXBhY3QgPSB0cnVlO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvd0Vycm9yKHN0YXRlLCAnaW5jb21wbGV0ZSBleHBsaWNpdCBtYXBwaW5nIHBhaXI7IGEga2V5IG5vZGUgaXMgbWlzc2VkJyk7XG4gICAgICB9XG5cbiAgICAgIHN0YXRlLnBvc2l0aW9uICs9IDE7XG4gICAgICBjaCA9IGZvbGxvd2luZztcblxuICAgIC8vXG4gICAgLy8gSW1wbGljaXQgbm90YXRpb24gY2FzZS4gRmxvdy1zdHlsZSBub2RlIGFzIHRoZSBrZXkgZmlyc3QsIHRoZW4gXCI6XCIsIGFuZCB0aGUgdmFsdWUuXG4gICAgLy9cbiAgICB9IGVsc2UgaWYgKGNvbXBvc2VOb2RlKHN0YXRlLCBmbG93SW5kZW50LCBDT05URVhUX0ZMT1dfT1VULCBmYWxzZSwgdHJ1ZSkpIHtcblxuICAgICAgaWYgKHN0YXRlLmxpbmUgPT09IF9saW5lKSB7XG4gICAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgICAgICAgd2hpbGUgKGlzX1dISVRFX1NQQUNFKGNoKSkge1xuICAgICAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaCA9PT0gMHgzQS8qIDogKi8pIHtcbiAgICAgICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG5cbiAgICAgICAgICBpZiAoIWlzX1dTX09SX0VPTChjaCkpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3Ioc3RhdGUsICdhIHdoaXRlc3BhY2UgY2hhcmFjdGVyIGlzIGV4cGVjdGVkIGFmdGVyIHRoZSBrZXktdmFsdWUgc2VwYXJhdG9yIHdpdGhpbiBhIGJsb2NrIG1hcHBpbmcnKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoYXRFeHBsaWNpdEtleSkge1xuICAgICAgICAgICAgc3RvcmVNYXBwaW5nUGFpcihzdGF0ZSwgX3Jlc3VsdCwgb3ZlcnJpZGFibGVLZXlzLCBrZXlUYWcsIGtleU5vZGUsIG51bGwpO1xuICAgICAgICAgICAga2V5VGFnID0ga2V5Tm9kZSA9IHZhbHVlTm9kZSA9IG51bGw7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZGV0ZWN0ZWQgPSB0cnVlO1xuICAgICAgICAgIGF0RXhwbGljaXRLZXkgPSBmYWxzZTtcbiAgICAgICAgICBhbGxvd0NvbXBhY3QgPSBmYWxzZTtcbiAgICAgICAgICBrZXlUYWcgPSBzdGF0ZS50YWc7XG4gICAgICAgICAga2V5Tm9kZSA9IHN0YXRlLnJlc3VsdDtcblxuICAgICAgICB9IGVsc2UgaWYgKGRldGVjdGVkKSB7XG4gICAgICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2NhbiBub3QgcmVhZCBhbiBpbXBsaWNpdCBtYXBwaW5nIHBhaXI7IGEgY29sb24gaXMgbWlzc2VkJyk7XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdGF0ZS50YWcgPSBfdGFnO1xuICAgICAgICAgIHN0YXRlLmFuY2hvciA9IF9hbmNob3I7XG4gICAgICAgICAgcmV0dXJuIHRydWU7IC8vIEtlZXAgdGhlIHJlc3VsdCBvZiBgY29tcG9zZU5vZGVgLlxuICAgICAgICB9XG5cbiAgICAgIH0gZWxzZSBpZiAoZGV0ZWN0ZWQpIHtcbiAgICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2NhbiBub3QgcmVhZCBhIGJsb2NrIG1hcHBpbmcgZW50cnk7IGEgbXVsdGlsaW5lIGtleSBtYXkgbm90IGJlIGFuIGltcGxpY2l0IGtleScpO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdGF0ZS50YWcgPSBfdGFnO1xuICAgICAgICBzdGF0ZS5hbmNob3IgPSBfYW5jaG9yO1xuICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gS2VlcCB0aGUgcmVzdWx0IG9mIGBjb21wb3NlTm9kZWAuXG4gICAgICB9XG5cbiAgICB9IGVsc2Uge1xuICAgICAgYnJlYWs7IC8vIFJlYWRpbmcgaXMgZG9uZS4gR28gdG8gdGhlIGVwaWxvZ3VlLlxuICAgIH1cblxuICAgIC8vXG4gICAgLy8gQ29tbW9uIHJlYWRpbmcgY29kZSBmb3IgYm90aCBleHBsaWNpdCBhbmQgaW1wbGljaXQgbm90YXRpb25zLlxuICAgIC8vXG4gICAgaWYgKHN0YXRlLmxpbmUgPT09IF9saW5lIHx8IHN0YXRlLmxpbmVJbmRlbnQgPiBub2RlSW5kZW50KSB7XG4gICAgICBpZiAoY29tcG9zZU5vZGUoc3RhdGUsIG5vZGVJbmRlbnQsIENPTlRFWFRfQkxPQ0tfT1VULCB0cnVlLCBhbGxvd0NvbXBhY3QpKSB7XG4gICAgICAgIGlmIChhdEV4cGxpY2l0S2V5KSB7XG4gICAgICAgICAga2V5Tm9kZSA9IHN0YXRlLnJlc3VsdDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YWx1ZU5vZGUgPSBzdGF0ZS5yZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKCFhdEV4cGxpY2l0S2V5KSB7XG4gICAgICAgIHN0b3JlTWFwcGluZ1BhaXIoc3RhdGUsIF9yZXN1bHQsIG92ZXJyaWRhYmxlS2V5cywga2V5VGFnLCBrZXlOb2RlLCB2YWx1ZU5vZGUsIF9saW5lLCBfcG9zKTtcbiAgICAgICAga2V5VGFnID0ga2V5Tm9kZSA9IHZhbHVlTm9kZSA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIC0xKTtcbiAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG4gICAgfVxuXG4gICAgaWYgKHN0YXRlLmxpbmVJbmRlbnQgPiBub2RlSW5kZW50ICYmIChjaCAhPT0gMCkpIHtcbiAgICAgIHRocm93RXJyb3Ioc3RhdGUsICdiYWQgaW5kZW50YXRpb24gb2YgYSBtYXBwaW5nIGVudHJ5Jyk7XG4gICAgfSBlbHNlIGlmIChzdGF0ZS5saW5lSW5kZW50IDwgbm9kZUluZGVudCkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgLy9cbiAgLy8gRXBpbG9ndWUuXG4gIC8vXG5cbiAgLy8gU3BlY2lhbCBjYXNlOiBsYXN0IG1hcHBpbmcncyBub2RlIGNvbnRhaW5zIG9ubHkgdGhlIGtleSBpbiBleHBsaWNpdCBub3RhdGlvbi5cbiAgaWYgKGF0RXhwbGljaXRLZXkpIHtcbiAgICBzdG9yZU1hcHBpbmdQYWlyKHN0YXRlLCBfcmVzdWx0LCBvdmVycmlkYWJsZUtleXMsIGtleVRhZywga2V5Tm9kZSwgbnVsbCk7XG4gIH1cblxuICAvLyBFeHBvc2UgdGhlIHJlc3VsdGluZyBtYXBwaW5nLlxuICBpZiAoZGV0ZWN0ZWQpIHtcbiAgICBzdGF0ZS50YWcgPSBfdGFnO1xuICAgIHN0YXRlLmFuY2hvciA9IF9hbmNob3I7XG4gICAgc3RhdGUua2luZCA9ICdtYXBwaW5nJztcbiAgICBzdGF0ZS5yZXN1bHQgPSBfcmVzdWx0O1xuICB9XG5cbiAgcmV0dXJuIGRldGVjdGVkO1xufVxuXG5mdW5jdGlvbiByZWFkVGFnUHJvcGVydHkoc3RhdGUpIHtcbiAgdmFyIF9wb3NpdGlvbixcbiAgICAgIGlzVmVyYmF0aW0gPSBmYWxzZSxcbiAgICAgIGlzTmFtZWQgICAgPSBmYWxzZSxcbiAgICAgIHRhZ0hhbmRsZSxcbiAgICAgIHRhZ05hbWUsXG4gICAgICBjaDtcblxuICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pO1xuXG4gIGlmIChjaCAhPT0gMHgyMS8qICEgKi8pIHJldHVybiBmYWxzZTtcblxuICBpZiAoc3RhdGUudGFnICE9PSBudWxsKSB7XG4gICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2R1cGxpY2F0aW9uIG9mIGEgdGFnIHByb3BlcnR5Jyk7XG4gIH1cblxuICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG5cbiAgaWYgKGNoID09PSAweDNDLyogPCAqLykge1xuICAgIGlzVmVyYmF0aW0gPSB0cnVlO1xuICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcblxuICB9IGVsc2UgaWYgKGNoID09PSAweDIxLyogISAqLykge1xuICAgIGlzTmFtZWQgPSB0cnVlO1xuICAgIHRhZ0hhbmRsZSA9ICchISc7XG4gICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuXG4gIH0gZWxzZSB7XG4gICAgdGFnSGFuZGxlID0gJyEnO1xuICB9XG5cbiAgX3Bvc2l0aW9uID0gc3RhdGUucG9zaXRpb247XG5cbiAgaWYgKGlzVmVyYmF0aW0pIHtcbiAgICBkbyB7IGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTsgfVxuICAgIHdoaWxlIChjaCAhPT0gMCAmJiBjaCAhPT0gMHgzRS8qID4gKi8pO1xuXG4gICAgaWYgKHN0YXRlLnBvc2l0aW9uIDwgc3RhdGUubGVuZ3RoKSB7XG4gICAgICB0YWdOYW1lID0gc3RhdGUuaW5wdXQuc2xpY2UoX3Bvc2l0aW9uLCBzdGF0ZS5wb3NpdGlvbik7XG4gICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93RXJyb3Ioc3RhdGUsICd1bmV4cGVjdGVkIGVuZCBvZiB0aGUgc3RyZWFtIHdpdGhpbiBhIHZlcmJhdGltIHRhZycpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB3aGlsZSAoY2ggIT09IDAgJiYgIWlzX1dTX09SX0VPTChjaCkpIHtcblxuICAgICAgaWYgKGNoID09PSAweDIxLyogISAqLykge1xuICAgICAgICBpZiAoIWlzTmFtZWQpIHtcbiAgICAgICAgICB0YWdIYW5kbGUgPSBzdGF0ZS5pbnB1dC5zbGljZShfcG9zaXRpb24gLSAxLCBzdGF0ZS5wb3NpdGlvbiArIDEpO1xuXG4gICAgICAgICAgaWYgKCFQQVRURVJOX1RBR19IQU5ETEUudGVzdCh0YWdIYW5kbGUpKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHN0YXRlLCAnbmFtZWQgdGFnIGhhbmRsZSBjYW5ub3QgY29udGFpbiBzdWNoIGNoYXJhY3RlcnMnKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpc05hbWVkID0gdHJ1ZTtcbiAgICAgICAgICBfcG9zaXRpb24gPSBzdGF0ZS5wb3NpdGlvbiArIDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ3RhZyBzdWZmaXggY2Fubm90IGNvbnRhaW4gZXhjbGFtYXRpb24gbWFya3MnKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgfVxuXG4gICAgdGFnTmFtZSA9IHN0YXRlLmlucHV0LnNsaWNlKF9wb3NpdGlvbiwgc3RhdGUucG9zaXRpb24pO1xuXG4gICAgaWYgKFBBVFRFUk5fRkxPV19JTkRJQ0FUT1JTLnRlc3QodGFnTmFtZSkpIHtcbiAgICAgIHRocm93RXJyb3Ioc3RhdGUsICd0YWcgc3VmZml4IGNhbm5vdCBjb250YWluIGZsb3cgaW5kaWNhdG9yIGNoYXJhY3RlcnMnKTtcbiAgICB9XG4gIH1cblxuICBpZiAodGFnTmFtZSAmJiAhUEFUVEVSTl9UQUdfVVJJLnRlc3QodGFnTmFtZSkpIHtcbiAgICB0aHJvd0Vycm9yKHN0YXRlLCAndGFnIG5hbWUgY2Fubm90IGNvbnRhaW4gc3VjaCBjaGFyYWN0ZXJzOiAnICsgdGFnTmFtZSk7XG4gIH1cblxuICBpZiAoaXNWZXJiYXRpbSkge1xuICAgIHN0YXRlLnRhZyA9IHRhZ05hbWU7XG5cbiAgfSBlbHNlIGlmIChfaGFzT3duUHJvcGVydHkuY2FsbChzdGF0ZS50YWdNYXAsIHRhZ0hhbmRsZSkpIHtcbiAgICBzdGF0ZS50YWcgPSBzdGF0ZS50YWdNYXBbdGFnSGFuZGxlXSArIHRhZ05hbWU7XG5cbiAgfSBlbHNlIGlmICh0YWdIYW5kbGUgPT09ICchJykge1xuICAgIHN0YXRlLnRhZyA9ICchJyArIHRhZ05hbWU7XG5cbiAgfSBlbHNlIGlmICh0YWdIYW5kbGUgPT09ICchIScpIHtcbiAgICBzdGF0ZS50YWcgPSAndGFnOnlhbWwub3JnLDIwMDI6JyArIHRhZ05hbWU7XG5cbiAgfSBlbHNlIHtcbiAgICB0aHJvd0Vycm9yKHN0YXRlLCAndW5kZWNsYXJlZCB0YWcgaGFuZGxlIFwiJyArIHRhZ0hhbmRsZSArICdcIicpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHJlYWRBbmNob3JQcm9wZXJ0eShzdGF0ZSkge1xuICB2YXIgX3Bvc2l0aW9uLFxuICAgICAgY2g7XG5cbiAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcblxuICBpZiAoY2ggIT09IDB4MjYvKiAmICovKSByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKHN0YXRlLmFuY2hvciAhPT0gbnVsbCkge1xuICAgIHRocm93RXJyb3Ioc3RhdGUsICdkdXBsaWNhdGlvbiBvZiBhbiBhbmNob3IgcHJvcGVydHknKTtcbiAgfVxuXG4gIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgX3Bvc2l0aW9uID0gc3RhdGUucG9zaXRpb247XG5cbiAgd2hpbGUgKGNoICE9PSAwICYmICFpc19XU19PUl9FT0woY2gpICYmICFpc19GTE9XX0lORElDQVRPUihjaCkpIHtcbiAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gIH1cblxuICBpZiAoc3RhdGUucG9zaXRpb24gPT09IF9wb3NpdGlvbikge1xuICAgIHRocm93RXJyb3Ioc3RhdGUsICduYW1lIG9mIGFuIGFuY2hvciBub2RlIG11c3QgY29udGFpbiBhdCBsZWFzdCBvbmUgY2hhcmFjdGVyJyk7XG4gIH1cblxuICBzdGF0ZS5hbmNob3IgPSBzdGF0ZS5pbnB1dC5zbGljZShfcG9zaXRpb24sIHN0YXRlLnBvc2l0aW9uKTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHJlYWRBbGlhcyhzdGF0ZSkge1xuICB2YXIgX3Bvc2l0aW9uLCBhbGlhcyxcbiAgICAgIGNoO1xuXG4gIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgaWYgKGNoICE9PSAweDJBLyogKiAqLykgcmV0dXJuIGZhbHNlO1xuXG4gIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgX3Bvc2l0aW9uID0gc3RhdGUucG9zaXRpb247XG5cbiAgd2hpbGUgKGNoICE9PSAwICYmICFpc19XU19PUl9FT0woY2gpICYmICFpc19GTE9XX0lORElDQVRPUihjaCkpIHtcbiAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gIH1cblxuICBpZiAoc3RhdGUucG9zaXRpb24gPT09IF9wb3NpdGlvbikge1xuICAgIHRocm93RXJyb3Ioc3RhdGUsICduYW1lIG9mIGFuIGFsaWFzIG5vZGUgbXVzdCBjb250YWluIGF0IGxlYXN0IG9uZSBjaGFyYWN0ZXInKTtcbiAgfVxuXG4gIGFsaWFzID0gc3RhdGUuaW5wdXQuc2xpY2UoX3Bvc2l0aW9uLCBzdGF0ZS5wb3NpdGlvbik7XG5cbiAgaWYgKCFzdGF0ZS5hbmNob3JNYXAuaGFzT3duUHJvcGVydHkoYWxpYXMpKSB7XG4gICAgdGhyb3dFcnJvcihzdGF0ZSwgJ3VuaWRlbnRpZmllZCBhbGlhcyBcIicgKyBhbGlhcyArICdcIicpO1xuICB9XG5cbiAgc3RhdGUucmVzdWx0ID0gc3RhdGUuYW5jaG9yTWFwW2FsaWFzXTtcbiAgc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgdHJ1ZSwgLTEpO1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gY29tcG9zZU5vZGUoc3RhdGUsIHBhcmVudEluZGVudCwgbm9kZUNvbnRleHQsIGFsbG93VG9TZWVrLCBhbGxvd0NvbXBhY3QpIHtcbiAgdmFyIGFsbG93QmxvY2tTdHlsZXMsXG4gICAgICBhbGxvd0Jsb2NrU2NhbGFycyxcbiAgICAgIGFsbG93QmxvY2tDb2xsZWN0aW9ucyxcbiAgICAgIGluZGVudFN0YXR1cyA9IDEsIC8vIDE6IHRoaXM+cGFyZW50LCAwOiB0aGlzPXBhcmVudCwgLTE6IHRoaXM8cGFyZW50XG4gICAgICBhdE5ld0xpbmUgID0gZmFsc2UsXG4gICAgICBoYXNDb250ZW50ID0gZmFsc2UsXG4gICAgICB0eXBlSW5kZXgsXG4gICAgICB0eXBlUXVhbnRpdHksXG4gICAgICB0eXBlLFxuICAgICAgZmxvd0luZGVudCxcbiAgICAgIGJsb2NrSW5kZW50O1xuXG4gIGlmIChzdGF0ZS5saXN0ZW5lciAhPT0gbnVsbCkge1xuICAgIHN0YXRlLmxpc3RlbmVyKCdvcGVuJywgc3RhdGUpO1xuICB9XG5cbiAgc3RhdGUudGFnICAgID0gbnVsbDtcbiAgc3RhdGUuYW5jaG9yID0gbnVsbDtcbiAgc3RhdGUua2luZCAgID0gbnVsbDtcbiAgc3RhdGUucmVzdWx0ID0gbnVsbDtcblxuICBhbGxvd0Jsb2NrU3R5bGVzID0gYWxsb3dCbG9ja1NjYWxhcnMgPSBhbGxvd0Jsb2NrQ29sbGVjdGlvbnMgPVxuICAgIENPTlRFWFRfQkxPQ0tfT1VUID09PSBub2RlQ29udGV4dCB8fFxuICAgIENPTlRFWFRfQkxPQ0tfSU4gID09PSBub2RlQ29udGV4dDtcblxuICBpZiAoYWxsb3dUb1NlZWspIHtcbiAgICBpZiAoc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgdHJ1ZSwgLTEpKSB7XG4gICAgICBhdE5ld0xpbmUgPSB0cnVlO1xuXG4gICAgICBpZiAoc3RhdGUubGluZUluZGVudCA+IHBhcmVudEluZGVudCkge1xuICAgICAgICBpbmRlbnRTdGF0dXMgPSAxO1xuICAgICAgfSBlbHNlIGlmIChzdGF0ZS5saW5lSW5kZW50ID09PSBwYXJlbnRJbmRlbnQpIHtcbiAgICAgICAgaW5kZW50U3RhdHVzID0gMDtcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGUubGluZUluZGVudCA8IHBhcmVudEluZGVudCkge1xuICAgICAgICBpbmRlbnRTdGF0dXMgPSAtMTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoaW5kZW50U3RhdHVzID09PSAxKSB7XG4gICAgd2hpbGUgKHJlYWRUYWdQcm9wZXJ0eShzdGF0ZSkgfHwgcmVhZEFuY2hvclByb3BlcnR5KHN0YXRlKSkge1xuICAgICAgaWYgKHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIC0xKSkge1xuICAgICAgICBhdE5ld0xpbmUgPSB0cnVlO1xuICAgICAgICBhbGxvd0Jsb2NrQ29sbGVjdGlvbnMgPSBhbGxvd0Jsb2NrU3R5bGVzO1xuXG4gICAgICAgIGlmIChzdGF0ZS5saW5lSW5kZW50ID4gcGFyZW50SW5kZW50KSB7XG4gICAgICAgICAgaW5kZW50U3RhdHVzID0gMTtcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZS5saW5lSW5kZW50ID09PSBwYXJlbnRJbmRlbnQpIHtcbiAgICAgICAgICBpbmRlbnRTdGF0dXMgPSAwO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlLmxpbmVJbmRlbnQgPCBwYXJlbnRJbmRlbnQpIHtcbiAgICAgICAgICBpbmRlbnRTdGF0dXMgPSAtMTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYWxsb3dCbG9ja0NvbGxlY3Rpb25zID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKGFsbG93QmxvY2tDb2xsZWN0aW9ucykge1xuICAgIGFsbG93QmxvY2tDb2xsZWN0aW9ucyA9IGF0TmV3TGluZSB8fCBhbGxvd0NvbXBhY3Q7XG4gIH1cblxuICBpZiAoaW5kZW50U3RhdHVzID09PSAxIHx8IENPTlRFWFRfQkxPQ0tfT1VUID09PSBub2RlQ29udGV4dCkge1xuICAgIGlmIChDT05URVhUX0ZMT1dfSU4gPT09IG5vZGVDb250ZXh0IHx8IENPTlRFWFRfRkxPV19PVVQgPT09IG5vZGVDb250ZXh0KSB7XG4gICAgICBmbG93SW5kZW50ID0gcGFyZW50SW5kZW50O1xuICAgIH0gZWxzZSB7XG4gICAgICBmbG93SW5kZW50ID0gcGFyZW50SW5kZW50ICsgMTtcbiAgICB9XG5cbiAgICBibG9ja0luZGVudCA9IHN0YXRlLnBvc2l0aW9uIC0gc3RhdGUubGluZVN0YXJ0O1xuXG4gICAgaWYgKGluZGVudFN0YXR1cyA9PT0gMSkge1xuICAgICAgaWYgKGFsbG93QmxvY2tDb2xsZWN0aW9ucyAmJlxuICAgICAgICAgIChyZWFkQmxvY2tTZXF1ZW5jZShzdGF0ZSwgYmxvY2tJbmRlbnQpIHx8XG4gICAgICAgICAgIHJlYWRCbG9ja01hcHBpbmcoc3RhdGUsIGJsb2NrSW5kZW50LCBmbG93SW5kZW50KSkgfHxcbiAgICAgICAgICByZWFkRmxvd0NvbGxlY3Rpb24oc3RhdGUsIGZsb3dJbmRlbnQpKSB7XG4gICAgICAgIGhhc0NvbnRlbnQgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKChhbGxvd0Jsb2NrU2NhbGFycyAmJiByZWFkQmxvY2tTY2FsYXIoc3RhdGUsIGZsb3dJbmRlbnQpKSB8fFxuICAgICAgICAgICAgcmVhZFNpbmdsZVF1b3RlZFNjYWxhcihzdGF0ZSwgZmxvd0luZGVudCkgfHxcbiAgICAgICAgICAgIHJlYWREb3VibGVRdW90ZWRTY2FsYXIoc3RhdGUsIGZsb3dJbmRlbnQpKSB7XG4gICAgICAgICAgaGFzQ29udGVudCA9IHRydWU7XG5cbiAgICAgICAgfSBlbHNlIGlmIChyZWFkQWxpYXMoc3RhdGUpKSB7XG4gICAgICAgICAgaGFzQ29udGVudCA9IHRydWU7XG5cbiAgICAgICAgICBpZiAoc3RhdGUudGFnICE9PSBudWxsIHx8IHN0YXRlLmFuY2hvciAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2FsaWFzIG5vZGUgc2hvdWxkIG5vdCBoYXZlIGFueSBwcm9wZXJ0aWVzJyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSBpZiAocmVhZFBsYWluU2NhbGFyKHN0YXRlLCBmbG93SW5kZW50LCBDT05URVhUX0ZMT1dfSU4gPT09IG5vZGVDb250ZXh0KSkge1xuICAgICAgICAgIGhhc0NvbnRlbnQgPSB0cnVlO1xuXG4gICAgICAgICAgaWYgKHN0YXRlLnRhZyA9PT0gbnVsbCkge1xuICAgICAgICAgICAgc3RhdGUudGFnID0gJz8nO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzdGF0ZS5hbmNob3IgIT09IG51bGwpIHtcbiAgICAgICAgICBzdGF0ZS5hbmNob3JNYXBbc3RhdGUuYW5jaG9yXSA9IHN0YXRlLnJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaW5kZW50U3RhdHVzID09PSAwKSB7XG4gICAgICAvLyBTcGVjaWFsIGNhc2U6IGJsb2NrIHNlcXVlbmNlcyBhcmUgYWxsb3dlZCB0byBoYXZlIHNhbWUgaW5kZW50YXRpb24gbGV2ZWwgYXMgdGhlIHBhcmVudC5cbiAgICAgIC8vIGh0dHA6Ly93d3cueWFtbC5vcmcvc3BlYy8xLjIvc3BlYy5odG1sI2lkMjc5OTc4NFxuICAgICAgaGFzQ29udGVudCA9IGFsbG93QmxvY2tDb2xsZWN0aW9ucyAmJiByZWFkQmxvY2tTZXF1ZW5jZShzdGF0ZSwgYmxvY2tJbmRlbnQpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChzdGF0ZS50YWcgIT09IG51bGwgJiYgc3RhdGUudGFnICE9PSAnIScpIHtcbiAgICBpZiAoc3RhdGUudGFnID09PSAnPycpIHtcbiAgICAgIGZvciAodHlwZUluZGV4ID0gMCwgdHlwZVF1YW50aXR5ID0gc3RhdGUuaW1wbGljaXRUeXBlcy5sZW5ndGg7XG4gICAgICAgICAgIHR5cGVJbmRleCA8IHR5cGVRdWFudGl0eTtcbiAgICAgICAgICAgdHlwZUluZGV4ICs9IDEpIHtcbiAgICAgICAgdHlwZSA9IHN0YXRlLmltcGxpY2l0VHlwZXNbdHlwZUluZGV4XTtcblxuICAgICAgICAvLyBJbXBsaWNpdCByZXNvbHZpbmcgaXMgbm90IGFsbG93ZWQgZm9yIG5vbi1zY2FsYXIgdHlwZXMsIGFuZCAnPydcbiAgICAgICAgLy8gbm9uLXNwZWNpZmljIHRhZyBpcyBvbmx5IGFzc2lnbmVkIHRvIHBsYWluIHNjYWxhcnMuIFNvLCBpdCBpc24ndFxuICAgICAgICAvLyBuZWVkZWQgdG8gY2hlY2sgZm9yICdraW5kJyBjb25mb3JtaXR5LlxuXG4gICAgICAgIGlmICh0eXBlLnJlc29sdmUoc3RhdGUucmVzdWx0KSkgeyAvLyBgc3RhdGUucmVzdWx0YCB1cGRhdGVkIGluIHJlc29sdmVyIGlmIG1hdGNoZWRcbiAgICAgICAgICBzdGF0ZS5yZXN1bHQgPSB0eXBlLmNvbnN0cnVjdChzdGF0ZS5yZXN1bHQpO1xuICAgICAgICAgIHN0YXRlLnRhZyA9IHR5cGUudGFnO1xuICAgICAgICAgIGlmIChzdGF0ZS5hbmNob3IgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHN0YXRlLmFuY2hvck1hcFtzdGF0ZS5hbmNob3JdID0gc3RhdGUucmVzdWx0O1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoX2hhc093blByb3BlcnR5LmNhbGwoc3RhdGUudHlwZU1hcFtzdGF0ZS5raW5kIHx8ICdmYWxsYmFjayddLCBzdGF0ZS50YWcpKSB7XG4gICAgICB0eXBlID0gc3RhdGUudHlwZU1hcFtzdGF0ZS5raW5kIHx8ICdmYWxsYmFjayddW3N0YXRlLnRhZ107XG5cbiAgICAgIGlmIChzdGF0ZS5yZXN1bHQgIT09IG51bGwgJiYgdHlwZS5raW5kICE9PSBzdGF0ZS5raW5kKSB7XG4gICAgICAgIHRocm93RXJyb3Ioc3RhdGUsICd1bmFjY2VwdGFibGUgbm9kZSBraW5kIGZvciAhPCcgKyBzdGF0ZS50YWcgKyAnPiB0YWc7IGl0IHNob3VsZCBiZSBcIicgKyB0eXBlLmtpbmQgKyAnXCIsIG5vdCBcIicgKyBzdGF0ZS5raW5kICsgJ1wiJyk7XG4gICAgICB9XG5cbiAgICAgIGlmICghdHlwZS5yZXNvbHZlKHN0YXRlLnJlc3VsdCkpIHsgLy8gYHN0YXRlLnJlc3VsdGAgdXBkYXRlZCBpbiByZXNvbHZlciBpZiBtYXRjaGVkXG4gICAgICAgIHRocm93RXJyb3Ioc3RhdGUsICdjYW5ub3QgcmVzb2x2ZSBhIG5vZGUgd2l0aCAhPCcgKyBzdGF0ZS50YWcgKyAnPiBleHBsaWNpdCB0YWcnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0YXRlLnJlc3VsdCA9IHR5cGUuY29uc3RydWN0KHN0YXRlLnJlc3VsdCk7XG4gICAgICAgIGlmIChzdGF0ZS5hbmNob3IgIT09IG51bGwpIHtcbiAgICAgICAgICBzdGF0ZS5hbmNob3JNYXBbc3RhdGUuYW5jaG9yXSA9IHN0YXRlLnJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAndW5rbm93biB0YWcgITwnICsgc3RhdGUudGFnICsgJz4nKTtcbiAgICB9XG4gIH1cblxuICBpZiAoc3RhdGUubGlzdGVuZXIgIT09IG51bGwpIHtcbiAgICBzdGF0ZS5saXN0ZW5lcignY2xvc2UnLCBzdGF0ZSk7XG4gIH1cbiAgcmV0dXJuIHN0YXRlLnRhZyAhPT0gbnVsbCB8fCAgc3RhdGUuYW5jaG9yICE9PSBudWxsIHx8IGhhc0NvbnRlbnQ7XG59XG5cbmZ1bmN0aW9uIHJlYWREb2N1bWVudChzdGF0ZSkge1xuICB2YXIgZG9jdW1lbnRTdGFydCA9IHN0YXRlLnBvc2l0aW9uLFxuICAgICAgX3Bvc2l0aW9uLFxuICAgICAgZGlyZWN0aXZlTmFtZSxcbiAgICAgIGRpcmVjdGl2ZUFyZ3MsXG4gICAgICBoYXNEaXJlY3RpdmVzID0gZmFsc2UsXG4gICAgICBjaDtcblxuICBzdGF0ZS52ZXJzaW9uID0gbnVsbDtcbiAgc3RhdGUuY2hlY2tMaW5lQnJlYWtzID0gc3RhdGUubGVnYWN5O1xuICBzdGF0ZS50YWdNYXAgPSB7fTtcbiAgc3RhdGUuYW5jaG9yTWFwID0ge307XG5cbiAgd2hpbGUgKChjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pKSAhPT0gMCkge1xuICAgIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIC0xKTtcblxuICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgICBpZiAoc3RhdGUubGluZUluZGVudCA+IDAgfHwgY2ggIT09IDB4MjUvKiAlICovKSB7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBoYXNEaXJlY3RpdmVzID0gdHJ1ZTtcbiAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgX3Bvc2l0aW9uID0gc3RhdGUucG9zaXRpb247XG5cbiAgICB3aGlsZSAoY2ggIT09IDAgJiYgIWlzX1dTX09SX0VPTChjaCkpIHtcbiAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgICB9XG5cbiAgICBkaXJlY3RpdmVOYW1lID0gc3RhdGUuaW5wdXQuc2xpY2UoX3Bvc2l0aW9uLCBzdGF0ZS5wb3NpdGlvbik7XG4gICAgZGlyZWN0aXZlQXJncyA9IFtdO1xuXG4gICAgaWYgKGRpcmVjdGl2ZU5hbWUubGVuZ3RoIDwgMSkge1xuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2RpcmVjdGl2ZSBuYW1lIG11c3Qgbm90IGJlIGxlc3MgdGhhbiBvbmUgY2hhcmFjdGVyIGluIGxlbmd0aCcpO1xuICAgIH1cblxuICAgIHdoaWxlIChjaCAhPT0gMCkge1xuICAgICAgd2hpbGUgKGlzX1dISVRFX1NQQUNFKGNoKSkge1xuICAgICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgICB9XG5cbiAgICAgIGlmIChjaCA9PT0gMHgyMy8qICMgKi8pIHtcbiAgICAgICAgZG8geyBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7IH1cbiAgICAgICAgd2hpbGUgKGNoICE9PSAwICYmICFpc19FT0woY2gpKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIGlmIChpc19FT0woY2gpKSBicmVhaztcblxuICAgICAgX3Bvc2l0aW9uID0gc3RhdGUucG9zaXRpb247XG5cbiAgICAgIHdoaWxlIChjaCAhPT0gMCAmJiAhaXNfV1NfT1JfRU9MKGNoKSkge1xuICAgICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgICB9XG5cbiAgICAgIGRpcmVjdGl2ZUFyZ3MucHVzaChzdGF0ZS5pbnB1dC5zbGljZShfcG9zaXRpb24sIHN0YXRlLnBvc2l0aW9uKSk7XG4gICAgfVxuXG4gICAgaWYgKGNoICE9PSAwKSByZWFkTGluZUJyZWFrKHN0YXRlKTtcblxuICAgIGlmIChfaGFzT3duUHJvcGVydHkuY2FsbChkaXJlY3RpdmVIYW5kbGVycywgZGlyZWN0aXZlTmFtZSkpIHtcbiAgICAgIGRpcmVjdGl2ZUhhbmRsZXJzW2RpcmVjdGl2ZU5hbWVdKHN0YXRlLCBkaXJlY3RpdmVOYW1lLCBkaXJlY3RpdmVBcmdzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3dXYXJuaW5nKHN0YXRlLCAndW5rbm93biBkb2N1bWVudCBkaXJlY3RpdmUgXCInICsgZGlyZWN0aXZlTmFtZSArICdcIicpO1xuICAgIH1cbiAgfVxuXG4gIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIC0xKTtcblxuICBpZiAoc3RhdGUubGluZUluZGVudCA9PT0gMCAmJlxuICAgICAgc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbikgICAgID09PSAweDJELyogLSAqLyAmJlxuICAgICAgc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbiArIDEpID09PSAweDJELyogLSAqLyAmJlxuICAgICAgc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbiArIDIpID09PSAweDJELyogLSAqLykge1xuICAgIHN0YXRlLnBvc2l0aW9uICs9IDM7XG4gICAgc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgdHJ1ZSwgLTEpO1xuXG4gIH0gZWxzZSBpZiAoaGFzRGlyZWN0aXZlcykge1xuICAgIHRocm93RXJyb3Ioc3RhdGUsICdkaXJlY3RpdmVzIGVuZCBtYXJrIGlzIGV4cGVjdGVkJyk7XG4gIH1cblxuICBjb21wb3NlTm9kZShzdGF0ZSwgc3RhdGUubGluZUluZGVudCAtIDEsIENPTlRFWFRfQkxPQ0tfT1VULCBmYWxzZSwgdHJ1ZSk7XG4gIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIC0xKTtcblxuICBpZiAoc3RhdGUuY2hlY2tMaW5lQnJlYWtzICYmXG4gICAgICBQQVRURVJOX05PTl9BU0NJSV9MSU5FX0JSRUFLUy50ZXN0KHN0YXRlLmlucHV0LnNsaWNlKGRvY3VtZW50U3RhcnQsIHN0YXRlLnBvc2l0aW9uKSkpIHtcbiAgICB0aHJvd1dhcm5pbmcoc3RhdGUsICdub24tQVNDSUkgbGluZSBicmVha3MgYXJlIGludGVycHJldGVkIGFzIGNvbnRlbnQnKTtcbiAgfVxuXG4gIHN0YXRlLmRvY3VtZW50cy5wdXNoKHN0YXRlLnJlc3VsdCk7XG5cbiAgaWYgKHN0YXRlLnBvc2l0aW9uID09PSBzdGF0ZS5saW5lU3RhcnQgJiYgdGVzdERvY3VtZW50U2VwYXJhdG9yKHN0YXRlKSkge1xuXG4gICAgaWYgKHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pID09PSAweDJFLyogLiAqLykge1xuICAgICAgc3RhdGUucG9zaXRpb24gKz0gMztcbiAgICAgIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIC0xKTtcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHN0YXRlLnBvc2l0aW9uIDwgKHN0YXRlLmxlbmd0aCAtIDEpKSB7XG4gICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2VuZCBvZiB0aGUgc3RyZWFtIG9yIGEgZG9jdW1lbnQgc2VwYXJhdG9yIGlzIGV4cGVjdGVkJyk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuO1xuICB9XG59XG5cblxuZnVuY3Rpb24gbG9hZERvY3VtZW50cyhpbnB1dCwgb3B0aW9ucykge1xuICBpbnB1dCA9IFN0cmluZyhpbnB1dCk7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIGlmIChpbnB1dC5sZW5ndGggIT09IDApIHtcblxuICAgIC8vIEFkZCB0YWlsaW5nIGBcXG5gIGlmIG5vdCBleGlzdHNcbiAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChpbnB1dC5sZW5ndGggLSAxKSAhPT0gMHgwQS8qIExGICovICYmXG4gICAgICAgIGlucHV0LmNoYXJDb2RlQXQoaW5wdXQubGVuZ3RoIC0gMSkgIT09IDB4MEQvKiBDUiAqLykge1xuICAgICAgaW5wdXQgKz0gJ1xcbic7XG4gICAgfVxuXG4gICAgLy8gU3RyaXAgQk9NXG4gICAgaWYgKGlucHV0LmNoYXJDb2RlQXQoMCkgPT09IDB4RkVGRikge1xuICAgICAgaW5wdXQgPSBpbnB1dC5zbGljZSgxKTtcbiAgICB9XG4gIH1cblxuICB2YXIgc3RhdGUgPSBuZXcgU3RhdGUoaW5wdXQsIG9wdGlvbnMpO1xuXG4gIC8vIFVzZSAwIGFzIHN0cmluZyB0ZXJtaW5hdG9yLiBUaGF0IHNpZ25pZmljYW50bHkgc2ltcGxpZmllcyBib3VuZHMgY2hlY2suXG4gIHN0YXRlLmlucHV0ICs9ICdcXDAnO1xuXG4gIHdoaWxlIChzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKSA9PT0gMHgyMC8qIFNwYWNlICovKSB7XG4gICAgc3RhdGUubGluZUluZGVudCArPSAxO1xuICAgIHN0YXRlLnBvc2l0aW9uICs9IDE7XG4gIH1cblxuICB3aGlsZSAoc3RhdGUucG9zaXRpb24gPCAoc3RhdGUubGVuZ3RoIC0gMSkpIHtcbiAgICByZWFkRG9jdW1lbnQoc3RhdGUpO1xuICB9XG5cbiAgcmV0dXJuIHN0YXRlLmRvY3VtZW50cztcbn1cblxuXG5mdW5jdGlvbiBsb2FkQWxsKGlucHV0LCBpdGVyYXRvciwgb3B0aW9ucykge1xuICB2YXIgZG9jdW1lbnRzID0gbG9hZERvY3VtZW50cyhpbnB1dCwgb3B0aW9ucyksIGluZGV4LCBsZW5ndGg7XG5cbiAgZm9yIChpbmRleCA9IDAsIGxlbmd0aCA9IGRvY3VtZW50cy5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSAxKSB7XG4gICAgaXRlcmF0b3IoZG9jdW1lbnRzW2luZGV4XSk7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBsb2FkKGlucHV0LCBvcHRpb25zKSB7XG4gIHZhciBkb2N1bWVudHMgPSBsb2FkRG9jdW1lbnRzKGlucHV0LCBvcHRpb25zKTtcblxuICBpZiAoZG9jdW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIC8qZXNsaW50LWRpc2FibGUgbm8tdW5kZWZpbmVkKi9cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9IGVsc2UgaWYgKGRvY3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gZG9jdW1lbnRzWzBdO1xuICB9XG4gIHRocm93IG5ldyBZQU1MRXhjZXB0aW9uKCdleHBlY3RlZCBhIHNpbmdsZSBkb2N1bWVudCBpbiB0aGUgc3RyZWFtLCBidXQgZm91bmQgbW9yZScpO1xufVxuXG5cbmZ1bmN0aW9uIHNhZmVMb2FkQWxsKGlucHV0LCBvdXRwdXQsIG9wdGlvbnMpIHtcbiAgbG9hZEFsbChpbnB1dCwgb3V0cHV0LCBjb21tb24uZXh0ZW5kKHsgc2NoZW1hOiBERUZBVUxUX1NBRkVfU0NIRU1BIH0sIG9wdGlvbnMpKTtcbn1cblxuXG5mdW5jdGlvbiBzYWZlTG9hZChpbnB1dCwgb3B0aW9ucykge1xuICByZXR1cm4gbG9hZChpbnB1dCwgY29tbW9uLmV4dGVuZCh7IHNjaGVtYTogREVGQVVMVF9TQUZFX1NDSEVNQSB9LCBvcHRpb25zKSk7XG59XG5cblxubW9kdWxlLmV4cG9ydHMubG9hZEFsbCAgICAgPSBsb2FkQWxsO1xubW9kdWxlLmV4cG9ydHMubG9hZCAgICAgICAgPSBsb2FkO1xubW9kdWxlLmV4cG9ydHMuc2FmZUxvYWRBbGwgPSBzYWZlTG9hZEFsbDtcbm1vZHVsZS5leHBvcnRzLnNhZmVMb2FkICAgID0gc2FmZUxvYWQ7XG4iLCIndXNlIHN0cmljdCc7XG5cblxudmFyIGNvbW1vbiA9IHJlcXVpcmUoJy4vY29tbW9uJyk7XG5cblxuZnVuY3Rpb24gTWFyayhuYW1lLCBidWZmZXIsIHBvc2l0aW9uLCBsaW5lLCBjb2x1bW4pIHtcbiAgdGhpcy5uYW1lICAgICA9IG5hbWU7XG4gIHRoaXMuYnVmZmVyICAgPSBidWZmZXI7XG4gIHRoaXMucG9zaXRpb24gPSBwb3NpdGlvbjtcbiAgdGhpcy5saW5lICAgICA9IGxpbmU7XG4gIHRoaXMuY29sdW1uICAgPSBjb2x1bW47XG59XG5cblxuTWFyay5wcm90b3R5cGUuZ2V0U25pcHBldCA9IGZ1bmN0aW9uIGdldFNuaXBwZXQoaW5kZW50LCBtYXhMZW5ndGgpIHtcbiAgdmFyIGhlYWQsIHN0YXJ0LCB0YWlsLCBlbmQsIHNuaXBwZXQ7XG5cbiAgaWYgKCF0aGlzLmJ1ZmZlcikgcmV0dXJuIG51bGw7XG5cbiAgaW5kZW50ID0gaW5kZW50IHx8IDQ7XG4gIG1heExlbmd0aCA9IG1heExlbmd0aCB8fCA3NTtcblxuICBoZWFkID0gJyc7XG4gIHN0YXJ0ID0gdGhpcy5wb3NpdGlvbjtcblxuICB3aGlsZSAoc3RhcnQgPiAwICYmICdcXHgwMFxcclxcblxceDg1XFx1MjAyOFxcdTIwMjknLmluZGV4T2YodGhpcy5idWZmZXIuY2hhckF0KHN0YXJ0IC0gMSkpID09PSAtMSkge1xuICAgIHN0YXJ0IC09IDE7XG4gICAgaWYgKHRoaXMucG9zaXRpb24gLSBzdGFydCA+IChtYXhMZW5ndGggLyAyIC0gMSkpIHtcbiAgICAgIGhlYWQgPSAnIC4uLiAnO1xuICAgICAgc3RhcnQgKz0gNTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHRhaWwgPSAnJztcbiAgZW5kID0gdGhpcy5wb3NpdGlvbjtcblxuICB3aGlsZSAoZW5kIDwgdGhpcy5idWZmZXIubGVuZ3RoICYmICdcXHgwMFxcclxcblxceDg1XFx1MjAyOFxcdTIwMjknLmluZGV4T2YodGhpcy5idWZmZXIuY2hhckF0KGVuZCkpID09PSAtMSkge1xuICAgIGVuZCArPSAxO1xuICAgIGlmIChlbmQgLSB0aGlzLnBvc2l0aW9uID4gKG1heExlbmd0aCAvIDIgLSAxKSkge1xuICAgICAgdGFpbCA9ICcgLi4uICc7XG4gICAgICBlbmQgLT0gNTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHNuaXBwZXQgPSB0aGlzLmJ1ZmZlci5zbGljZShzdGFydCwgZW5kKTtcblxuICByZXR1cm4gY29tbW9uLnJlcGVhdCgnICcsIGluZGVudCkgKyBoZWFkICsgc25pcHBldCArIHRhaWwgKyAnXFxuJyArXG4gICAgICAgICBjb21tb24ucmVwZWF0KCcgJywgaW5kZW50ICsgdGhpcy5wb3NpdGlvbiAtIHN0YXJ0ICsgaGVhZC5sZW5ndGgpICsgJ14nO1xufTtcblxuXG5NYXJrLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nKGNvbXBhY3QpIHtcbiAgdmFyIHNuaXBwZXQsIHdoZXJlID0gJyc7XG5cbiAgaWYgKHRoaXMubmFtZSkge1xuICAgIHdoZXJlICs9ICdpbiBcIicgKyB0aGlzLm5hbWUgKyAnXCIgJztcbiAgfVxuXG4gIHdoZXJlICs9ICdhdCBsaW5lICcgKyAodGhpcy5saW5lICsgMSkgKyAnLCBjb2x1bW4gJyArICh0aGlzLmNvbHVtbiArIDEpO1xuXG4gIGlmICghY29tcGFjdCkge1xuICAgIHNuaXBwZXQgPSB0aGlzLmdldFNuaXBwZXQoKTtcblxuICAgIGlmIChzbmlwcGV0KSB7XG4gICAgICB3aGVyZSArPSAnOlxcbicgKyBzbmlwcGV0O1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB3aGVyZTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBNYXJrO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKmVzbGludC1kaXNhYmxlIG1heC1sZW4qL1xuXG52YXIgY29tbW9uICAgICAgICA9IHJlcXVpcmUoJy4vY29tbW9uJyk7XG52YXIgWUFNTEV4Y2VwdGlvbiA9IHJlcXVpcmUoJy4vZXhjZXB0aW9uJyk7XG52YXIgVHlwZSAgICAgICAgICA9IHJlcXVpcmUoJy4vdHlwZScpO1xuXG5cbmZ1bmN0aW9uIGNvbXBpbGVMaXN0KHNjaGVtYSwgbmFtZSwgcmVzdWx0KSB7XG4gIHZhciBleGNsdWRlID0gW107XG5cbiAgc2NoZW1hLmluY2x1ZGUuZm9yRWFjaChmdW5jdGlvbiAoaW5jbHVkZWRTY2hlbWEpIHtcbiAgICByZXN1bHQgPSBjb21waWxlTGlzdChpbmNsdWRlZFNjaGVtYSwgbmFtZSwgcmVzdWx0KTtcbiAgfSk7XG5cbiAgc2NoZW1hW25hbWVdLmZvckVhY2goZnVuY3Rpb24gKGN1cnJlbnRUeXBlKSB7XG4gICAgcmVzdWx0LmZvckVhY2goZnVuY3Rpb24gKHByZXZpb3VzVHlwZSwgcHJldmlvdXNJbmRleCkge1xuICAgICAgaWYgKHByZXZpb3VzVHlwZS50YWcgPT09IGN1cnJlbnRUeXBlLnRhZyAmJiBwcmV2aW91c1R5cGUua2luZCA9PT0gY3VycmVudFR5cGUua2luZCkge1xuICAgICAgICBleGNsdWRlLnB1c2gocHJldmlvdXNJbmRleCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXN1bHQucHVzaChjdXJyZW50VHlwZSk7XG4gIH0pO1xuXG4gIHJldHVybiByZXN1bHQuZmlsdGVyKGZ1bmN0aW9uICh0eXBlLCBpbmRleCkge1xuICAgIHJldHVybiBleGNsdWRlLmluZGV4T2YoaW5kZXgpID09PSAtMTtcbiAgfSk7XG59XG5cblxuZnVuY3Rpb24gY29tcGlsZU1hcCgvKiBsaXN0cy4uLiAqLykge1xuICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICBzY2FsYXI6IHt9LFxuICAgICAgICBzZXF1ZW5jZToge30sXG4gICAgICAgIG1hcHBpbmc6IHt9LFxuICAgICAgICBmYWxsYmFjazoge31cbiAgICAgIH0sIGluZGV4LCBsZW5ndGg7XG5cbiAgZnVuY3Rpb24gY29sbGVjdFR5cGUodHlwZSkge1xuICAgIHJlc3VsdFt0eXBlLmtpbmRdW3R5cGUudGFnXSA9IHJlc3VsdFsnZmFsbGJhY2snXVt0eXBlLnRhZ10gPSB0eXBlO1xuICB9XG5cbiAgZm9yIChpbmRleCA9IDAsIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSAxKSB7XG4gICAgYXJndW1lbnRzW2luZGV4XS5mb3JFYWNoKGNvbGxlY3RUeXBlKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5cbmZ1bmN0aW9uIFNjaGVtYShkZWZpbml0aW9uKSB7XG4gIHRoaXMuaW5jbHVkZSAgPSBkZWZpbml0aW9uLmluY2x1ZGUgIHx8IFtdO1xuICB0aGlzLmltcGxpY2l0ID0gZGVmaW5pdGlvbi5pbXBsaWNpdCB8fCBbXTtcbiAgdGhpcy5leHBsaWNpdCA9IGRlZmluaXRpb24uZXhwbGljaXQgfHwgW107XG5cbiAgdGhpcy5pbXBsaWNpdC5mb3JFYWNoKGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgaWYgKHR5cGUubG9hZEtpbmQgJiYgdHlwZS5sb2FkS2luZCAhPT0gJ3NjYWxhcicpIHtcbiAgICAgIHRocm93IG5ldyBZQU1MRXhjZXB0aW9uKCdUaGVyZSBpcyBhIG5vbi1zY2FsYXIgdHlwZSBpbiB0aGUgaW1wbGljaXQgbGlzdCBvZiBhIHNjaGVtYS4gSW1wbGljaXQgcmVzb2x2aW5nIG9mIHN1Y2ggdHlwZXMgaXMgbm90IHN1cHBvcnRlZC4nKTtcbiAgICB9XG4gIH0pO1xuXG4gIHRoaXMuY29tcGlsZWRJbXBsaWNpdCA9IGNvbXBpbGVMaXN0KHRoaXMsICdpbXBsaWNpdCcsIFtdKTtcbiAgdGhpcy5jb21waWxlZEV4cGxpY2l0ID0gY29tcGlsZUxpc3QodGhpcywgJ2V4cGxpY2l0JywgW10pO1xuICB0aGlzLmNvbXBpbGVkVHlwZU1hcCAgPSBjb21waWxlTWFwKHRoaXMuY29tcGlsZWRJbXBsaWNpdCwgdGhpcy5jb21waWxlZEV4cGxpY2l0KTtcbn1cblxuXG5TY2hlbWEuREVGQVVMVCA9IG51bGw7XG5cblxuU2NoZW1hLmNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZVNjaGVtYSgpIHtcbiAgdmFyIHNjaGVtYXMsIHR5cGVzO1xuXG4gIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIGNhc2UgMTpcbiAgICAgIHNjaGVtYXMgPSBTY2hlbWEuREVGQVVMVDtcbiAgICAgIHR5cGVzID0gYXJndW1lbnRzWzBdO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIDI6XG4gICAgICBzY2hlbWFzID0gYXJndW1lbnRzWzBdO1xuICAgICAgdHlwZXMgPSBhcmd1bWVudHNbMV07XG4gICAgICBicmVhaztcblxuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgWUFNTEV4Y2VwdGlvbignV3JvbmcgbnVtYmVyIG9mIGFyZ3VtZW50cyBmb3IgU2NoZW1hLmNyZWF0ZSBmdW5jdGlvbicpO1xuICB9XG5cbiAgc2NoZW1hcyA9IGNvbW1vbi50b0FycmF5KHNjaGVtYXMpO1xuICB0eXBlcyA9IGNvbW1vbi50b0FycmF5KHR5cGVzKTtcblxuICBpZiAoIXNjaGVtYXMuZXZlcnkoZnVuY3Rpb24gKHNjaGVtYSkgeyByZXR1cm4gc2NoZW1hIGluc3RhbmNlb2YgU2NoZW1hOyB9KSkge1xuICAgIHRocm93IG5ldyBZQU1MRXhjZXB0aW9uKCdTcGVjaWZpZWQgbGlzdCBvZiBzdXBlciBzY2hlbWFzIChvciBhIHNpbmdsZSBTY2hlbWEgb2JqZWN0KSBjb250YWlucyBhIG5vbi1TY2hlbWEgb2JqZWN0LicpO1xuICB9XG5cbiAgaWYgKCF0eXBlcy5ldmVyeShmdW5jdGlvbiAodHlwZSkgeyByZXR1cm4gdHlwZSBpbnN0YW5jZW9mIFR5cGU7IH0pKSB7XG4gICAgdGhyb3cgbmV3IFlBTUxFeGNlcHRpb24oJ1NwZWNpZmllZCBsaXN0IG9mIFlBTUwgdHlwZXMgKG9yIGEgc2luZ2xlIFR5cGUgb2JqZWN0KSBjb250YWlucyBhIG5vbi1UeXBlIG9iamVjdC4nKTtcbiAgfVxuXG4gIHJldHVybiBuZXcgU2NoZW1hKHtcbiAgICBpbmNsdWRlOiBzY2hlbWFzLFxuICAgIGV4cGxpY2l0OiB0eXBlc1xuICB9KTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBTY2hlbWE7XG4iLCIvLyBTdGFuZGFyZCBZQU1MJ3MgQ29yZSBzY2hlbWEuXG4vLyBodHRwOi8vd3d3LnlhbWwub3JnL3NwZWMvMS4yL3NwZWMuaHRtbCNpZDI4MDQ5MjNcbi8vXG4vLyBOT1RFOiBKUy1ZQU1MIGRvZXMgbm90IHN1cHBvcnQgc2NoZW1hLXNwZWNpZmljIHRhZyByZXNvbHV0aW9uIHJlc3RyaWN0aW9ucy5cbi8vIFNvLCBDb3JlIHNjaGVtYSBoYXMgbm8gZGlzdGluY3Rpb25zIGZyb20gSlNPTiBzY2hlbWEgaXMgSlMtWUFNTC5cblxuXG4ndXNlIHN0cmljdCc7XG5cblxudmFyIFNjaGVtYSA9IHJlcXVpcmUoJy4uL3NjaGVtYScpO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IFNjaGVtYSh7XG4gIGluY2x1ZGU6IFtcbiAgICByZXF1aXJlKCcuL2pzb24nKVxuICBdXG59KTtcbiIsIi8vIEpTLVlBTUwncyBkZWZhdWx0IHNjaGVtYSBmb3IgYGxvYWRgIGZ1bmN0aW9uLlxuLy8gSXQgaXMgbm90IGRlc2NyaWJlZCBpbiB0aGUgWUFNTCBzcGVjaWZpY2F0aW9uLlxuLy9cbi8vIFRoaXMgc2NoZW1hIGlzIGJhc2VkIG9uIEpTLVlBTUwncyBkZWZhdWx0IHNhZmUgc2NoZW1hIGFuZCBpbmNsdWRlc1xuLy8gSmF2YVNjcmlwdC1zcGVjaWZpYyB0eXBlczogISFqcy91bmRlZmluZWQsICEhanMvcmVnZXhwIGFuZCAhIWpzL2Z1bmN0aW9uLlxuLy9cbi8vIEFsc28gdGhpcyBzY2hlbWEgaXMgdXNlZCBhcyBkZWZhdWx0IGJhc2Ugc2NoZW1hIGF0IGBTY2hlbWEuY3JlYXRlYCBmdW5jdGlvbi5cblxuXG4ndXNlIHN0cmljdCc7XG5cblxudmFyIFNjaGVtYSA9IHJlcXVpcmUoJy4uL3NjaGVtYScpO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gU2NoZW1hLkRFRkFVTFQgPSBuZXcgU2NoZW1hKHtcbiAgaW5jbHVkZTogW1xuICAgIHJlcXVpcmUoJy4vZGVmYXVsdF9zYWZlJylcbiAgXSxcbiAgZXhwbGljaXQ6IFtcbiAgICByZXF1aXJlKCcuLi90eXBlL2pzL3VuZGVmaW5lZCcpLFxuICAgIHJlcXVpcmUoJy4uL3R5cGUvanMvcmVnZXhwJyksXG4gICAgcmVxdWlyZSgnLi4vdHlwZS9qcy9mdW5jdGlvbicpXG4gIF1cbn0pO1xuIiwiLy8gSlMtWUFNTCdzIGRlZmF1bHQgc2NoZW1hIGZvciBgc2FmZUxvYWRgIGZ1bmN0aW9uLlxuLy8gSXQgaXMgbm90IGRlc2NyaWJlZCBpbiB0aGUgWUFNTCBzcGVjaWZpY2F0aW9uLlxuLy9cbi8vIFRoaXMgc2NoZW1hIGlzIGJhc2VkIG9uIHN0YW5kYXJkIFlBTUwncyBDb3JlIHNjaGVtYSBhbmQgaW5jbHVkZXMgbW9zdCBvZlxuLy8gZXh0cmEgdHlwZXMgZGVzY3JpYmVkIGF0IFlBTUwgdGFnIHJlcG9zaXRvcnkuIChodHRwOi8veWFtbC5vcmcvdHlwZS8pXG5cblxuJ3VzZSBzdHJpY3QnO1xuXG5cbnZhciBTY2hlbWEgPSByZXF1aXJlKCcuLi9zY2hlbWEnKTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBTY2hlbWEoe1xuICBpbmNsdWRlOiBbXG4gICAgcmVxdWlyZSgnLi9jb3JlJylcbiAgXSxcbiAgaW1wbGljaXQ6IFtcbiAgICByZXF1aXJlKCcuLi90eXBlL3RpbWVzdGFtcCcpLFxuICAgIHJlcXVpcmUoJy4uL3R5cGUvbWVyZ2UnKVxuICBdLFxuICBleHBsaWNpdDogW1xuICAgIHJlcXVpcmUoJy4uL3R5cGUvYmluYXJ5JyksXG4gICAgcmVxdWlyZSgnLi4vdHlwZS9vbWFwJyksXG4gICAgcmVxdWlyZSgnLi4vdHlwZS9wYWlycycpLFxuICAgIHJlcXVpcmUoJy4uL3R5cGUvc2V0JylcbiAgXVxufSk7XG4iLCIvLyBTdGFuZGFyZCBZQU1MJ3MgRmFpbHNhZmUgc2NoZW1hLlxuLy8gaHR0cDovL3d3dy55YW1sLm9yZy9zcGVjLzEuMi9zcGVjLmh0bWwjaWQyODAyMzQ2XG5cblxuJ3VzZSBzdHJpY3QnO1xuXG5cbnZhciBTY2hlbWEgPSByZXF1aXJlKCcuLi9zY2hlbWEnKTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBTY2hlbWEoe1xuICBleHBsaWNpdDogW1xuICAgIHJlcXVpcmUoJy4uL3R5cGUvc3RyJyksXG4gICAgcmVxdWlyZSgnLi4vdHlwZS9zZXEnKSxcbiAgICByZXF1aXJlKCcuLi90eXBlL21hcCcpXG4gIF1cbn0pO1xuIiwiLy8gU3RhbmRhcmQgWUFNTCdzIEpTT04gc2NoZW1hLlxuLy8gaHR0cDovL3d3dy55YW1sLm9yZy9zcGVjLzEuMi9zcGVjLmh0bWwjaWQyODAzMjMxXG4vL1xuLy8gTk9URTogSlMtWUFNTCBkb2VzIG5vdCBzdXBwb3J0IHNjaGVtYS1zcGVjaWZpYyB0YWcgcmVzb2x1dGlvbiByZXN0cmljdGlvbnMuXG4vLyBTbywgdGhpcyBzY2hlbWEgaXMgbm90IHN1Y2ggc3RyaWN0IGFzIGRlZmluZWQgaW4gdGhlIFlBTUwgc3BlY2lmaWNhdGlvbi5cbi8vIEl0IGFsbG93cyBudW1iZXJzIGluIGJpbmFyeSBub3RhaW9uLCB1c2UgYE51bGxgIGFuZCBgTlVMTGAgYXMgYG51bGxgLCBldGMuXG5cblxuJ3VzZSBzdHJpY3QnO1xuXG5cbnZhciBTY2hlbWEgPSByZXF1aXJlKCcuLi9zY2hlbWEnKTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBTY2hlbWEoe1xuICBpbmNsdWRlOiBbXG4gICAgcmVxdWlyZSgnLi9mYWlsc2FmZScpXG4gIF0sXG4gIGltcGxpY2l0OiBbXG4gICAgcmVxdWlyZSgnLi4vdHlwZS9udWxsJyksXG4gICAgcmVxdWlyZSgnLi4vdHlwZS9ib29sJyksXG4gICAgcmVxdWlyZSgnLi4vdHlwZS9pbnQnKSxcbiAgICByZXF1aXJlKCcuLi90eXBlL2Zsb2F0JylcbiAgXVxufSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBZQU1MRXhjZXB0aW9uID0gcmVxdWlyZSgnLi9leGNlcHRpb24nKTtcblxudmFyIFRZUEVfQ09OU1RSVUNUT1JfT1BUSU9OUyA9IFtcbiAgJ2tpbmQnLFxuICAncmVzb2x2ZScsXG4gICdjb25zdHJ1Y3QnLFxuICAnaW5zdGFuY2VPZicsXG4gICdwcmVkaWNhdGUnLFxuICAncmVwcmVzZW50JyxcbiAgJ2RlZmF1bHRTdHlsZScsXG4gICdzdHlsZUFsaWFzZXMnXG5dO1xuXG52YXIgWUFNTF9OT0RFX0tJTkRTID0gW1xuICAnc2NhbGFyJyxcbiAgJ3NlcXVlbmNlJyxcbiAgJ21hcHBpbmcnXG5dO1xuXG5mdW5jdGlvbiBjb21waWxlU3R5bGVBbGlhc2VzKG1hcCkge1xuICB2YXIgcmVzdWx0ID0ge307XG5cbiAgaWYgKG1hcCAhPT0gbnVsbCkge1xuICAgIE9iamVjdC5rZXlzKG1hcCkuZm9yRWFjaChmdW5jdGlvbiAoc3R5bGUpIHtcbiAgICAgIG1hcFtzdHlsZV0uZm9yRWFjaChmdW5jdGlvbiAoYWxpYXMpIHtcbiAgICAgICAgcmVzdWx0W1N0cmluZyhhbGlhcyldID0gc3R5bGU7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIFR5cGUodGFnLCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIE9iamVjdC5rZXlzKG9wdGlvbnMpLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcbiAgICBpZiAoVFlQRV9DT05TVFJVQ1RPUl9PUFRJT05TLmluZGV4T2YobmFtZSkgPT09IC0xKSB7XG4gICAgICB0aHJvdyBuZXcgWUFNTEV4Y2VwdGlvbignVW5rbm93biBvcHRpb24gXCInICsgbmFtZSArICdcIiBpcyBtZXQgaW4gZGVmaW5pdGlvbiBvZiBcIicgKyB0YWcgKyAnXCIgWUFNTCB0eXBlLicpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gVE9ETzogQWRkIHRhZyBmb3JtYXQgY2hlY2suXG4gIHRoaXMudGFnICAgICAgICAgID0gdGFnO1xuICB0aGlzLmtpbmQgICAgICAgICA9IG9wdGlvbnNbJ2tpbmQnXSAgICAgICAgIHx8IG51bGw7XG4gIHRoaXMucmVzb2x2ZSAgICAgID0gb3B0aW9uc1sncmVzb2x2ZSddICAgICAgfHwgZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgdGhpcy5jb25zdHJ1Y3QgICAgPSBvcHRpb25zWydjb25zdHJ1Y3QnXSAgICB8fCBmdW5jdGlvbiAoZGF0YSkgeyByZXR1cm4gZGF0YTsgfTtcbiAgdGhpcy5pbnN0YW5jZU9mICAgPSBvcHRpb25zWydpbnN0YW5jZU9mJ10gICB8fCBudWxsO1xuICB0aGlzLnByZWRpY2F0ZSAgICA9IG9wdGlvbnNbJ3ByZWRpY2F0ZSddICAgIHx8IG51bGw7XG4gIHRoaXMucmVwcmVzZW50ICAgID0gb3B0aW9uc1sncmVwcmVzZW50J10gICAgfHwgbnVsbDtcbiAgdGhpcy5kZWZhdWx0U3R5bGUgPSBvcHRpb25zWydkZWZhdWx0U3R5bGUnXSB8fCBudWxsO1xuICB0aGlzLnN0eWxlQWxpYXNlcyA9IGNvbXBpbGVTdHlsZUFsaWFzZXMob3B0aW9uc1snc3R5bGVBbGlhc2VzJ10gfHwgbnVsbCk7XG5cbiAgaWYgKFlBTUxfTk9ERV9LSU5EUy5pbmRleE9mKHRoaXMua2luZCkgPT09IC0xKSB7XG4gICAgdGhyb3cgbmV3IFlBTUxFeGNlcHRpb24oJ1Vua25vd24ga2luZCBcIicgKyB0aGlzLmtpbmQgKyAnXCIgaXMgc3BlY2lmaWVkIGZvciBcIicgKyB0YWcgKyAnXCIgWUFNTCB0eXBlLicpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVHlwZTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyplc2xpbnQtZGlzYWJsZSBuby1iaXR3aXNlKi9cblxudmFyIE5vZGVCdWZmZXI7XG5cbnRyeSB7XG4gIC8vIEEgdHJpY2sgZm9yIGJyb3dzZXJpZmllZCB2ZXJzaW9uLCB0byBub3QgaW5jbHVkZSBgQnVmZmVyYCBzaGltXG4gIHZhciBfcmVxdWlyZSA9IHJlcXVpcmU7XG4gIE5vZGVCdWZmZXIgPSBfcmVxdWlyZSgnYnVmZmVyJykuQnVmZmVyO1xufSBjYXRjaCAoX18pIHt9XG5cbnZhciBUeXBlICAgICAgID0gcmVxdWlyZSgnLi4vdHlwZScpO1xuXG5cbi8vIFsgNjQsIDY1LCA2NiBdIC0+IFsgcGFkZGluZywgQ1IsIExGIF1cbnZhciBCQVNFNjRfTUFQID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky89XFxuXFxyJztcblxuXG5mdW5jdGlvbiByZXNvbHZlWWFtbEJpbmFyeShkYXRhKSB7XG4gIGlmIChkYXRhID09PSBudWxsKSByZXR1cm4gZmFsc2U7XG5cbiAgdmFyIGNvZGUsIGlkeCwgYml0bGVuID0gMCwgbWF4ID0gZGF0YS5sZW5ndGgsIG1hcCA9IEJBU0U2NF9NQVA7XG5cbiAgLy8gQ29udmVydCBvbmUgYnkgb25lLlxuICBmb3IgKGlkeCA9IDA7IGlkeCA8IG1heDsgaWR4KyspIHtcbiAgICBjb2RlID0gbWFwLmluZGV4T2YoZGF0YS5jaGFyQXQoaWR4KSk7XG5cbiAgICAvLyBTa2lwIENSL0xGXG4gICAgaWYgKGNvZGUgPiA2NCkgY29udGludWU7XG5cbiAgICAvLyBGYWlsIG9uIGlsbGVnYWwgY2hhcmFjdGVyc1xuICAgIGlmIChjb2RlIDwgMCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgYml0bGVuICs9IDY7XG4gIH1cblxuICAvLyBJZiB0aGVyZSBhcmUgYW55IGJpdHMgbGVmdCwgc291cmNlIHdhcyBjb3JydXB0ZWRcbiAgcmV0dXJuIChiaXRsZW4gJSA4KSA9PT0gMDtcbn1cblxuZnVuY3Rpb24gY29uc3RydWN0WWFtbEJpbmFyeShkYXRhKSB7XG4gIHZhciBpZHgsIHRhaWxiaXRzLFxuICAgICAgaW5wdXQgPSBkYXRhLnJlcGxhY2UoL1tcXHJcXG49XS9nLCAnJyksIC8vIHJlbW92ZSBDUi9MRiAmIHBhZGRpbmcgdG8gc2ltcGxpZnkgc2NhblxuICAgICAgbWF4ID0gaW5wdXQubGVuZ3RoLFxuICAgICAgbWFwID0gQkFTRTY0X01BUCxcbiAgICAgIGJpdHMgPSAwLFxuICAgICAgcmVzdWx0ID0gW107XG5cbiAgLy8gQ29sbGVjdCBieSA2KjQgYml0cyAoMyBieXRlcylcblxuICBmb3IgKGlkeCA9IDA7IGlkeCA8IG1heDsgaWR4KyspIHtcbiAgICBpZiAoKGlkeCAlIDQgPT09IDApICYmIGlkeCkge1xuICAgICAgcmVzdWx0LnB1c2goKGJpdHMgPj4gMTYpICYgMHhGRik7XG4gICAgICByZXN1bHQucHVzaCgoYml0cyA+PiA4KSAmIDB4RkYpO1xuICAgICAgcmVzdWx0LnB1c2goYml0cyAmIDB4RkYpO1xuICAgIH1cblxuICAgIGJpdHMgPSAoYml0cyA8PCA2KSB8IG1hcC5pbmRleE9mKGlucHV0LmNoYXJBdChpZHgpKTtcbiAgfVxuXG4gIC8vIER1bXAgdGFpbFxuXG4gIHRhaWxiaXRzID0gKG1heCAlIDQpICogNjtcblxuICBpZiAodGFpbGJpdHMgPT09IDApIHtcbiAgICByZXN1bHQucHVzaCgoYml0cyA+PiAxNikgJiAweEZGKTtcbiAgICByZXN1bHQucHVzaCgoYml0cyA+PiA4KSAmIDB4RkYpO1xuICAgIHJlc3VsdC5wdXNoKGJpdHMgJiAweEZGKTtcbiAgfSBlbHNlIGlmICh0YWlsYml0cyA9PT0gMTgpIHtcbiAgICByZXN1bHQucHVzaCgoYml0cyA+PiAxMCkgJiAweEZGKTtcbiAgICByZXN1bHQucHVzaCgoYml0cyA+PiAyKSAmIDB4RkYpO1xuICB9IGVsc2UgaWYgKHRhaWxiaXRzID09PSAxMikge1xuICAgIHJlc3VsdC5wdXNoKChiaXRzID4+IDQpICYgMHhGRik7XG4gIH1cblxuICAvLyBXcmFwIGludG8gQnVmZmVyIGZvciBOb2RlSlMgYW5kIGxlYXZlIEFycmF5IGZvciBicm93c2VyXG4gIGlmIChOb2RlQnVmZmVyKSB7XG4gICAgLy8gU3VwcG9ydCBub2RlIDYuKyBCdWZmZXIgQVBJIHdoZW4gYXZhaWxhYmxlXG4gICAgcmV0dXJuIE5vZGVCdWZmZXIuZnJvbSA/IE5vZGVCdWZmZXIuZnJvbShyZXN1bHQpIDogbmV3IE5vZGVCdWZmZXIocmVzdWx0KTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIHJlcHJlc2VudFlhbWxCaW5hcnkob2JqZWN0IC8qLCBzdHlsZSovKSB7XG4gIHZhciByZXN1bHQgPSAnJywgYml0cyA9IDAsIGlkeCwgdGFpbCxcbiAgICAgIG1heCA9IG9iamVjdC5sZW5ndGgsXG4gICAgICBtYXAgPSBCQVNFNjRfTUFQO1xuXG4gIC8vIENvbnZlcnQgZXZlcnkgdGhyZWUgYnl0ZXMgdG8gNCBBU0NJSSBjaGFyYWN0ZXJzLlxuXG4gIGZvciAoaWR4ID0gMDsgaWR4IDwgbWF4OyBpZHgrKykge1xuICAgIGlmICgoaWR4ICUgMyA9PT0gMCkgJiYgaWR4KSB7XG4gICAgICByZXN1bHQgKz0gbWFwWyhiaXRzID4+IDE4KSAmIDB4M0ZdO1xuICAgICAgcmVzdWx0ICs9IG1hcFsoYml0cyA+PiAxMikgJiAweDNGXTtcbiAgICAgIHJlc3VsdCArPSBtYXBbKGJpdHMgPj4gNikgJiAweDNGXTtcbiAgICAgIHJlc3VsdCArPSBtYXBbYml0cyAmIDB4M0ZdO1xuICAgIH1cblxuICAgIGJpdHMgPSAoYml0cyA8PCA4KSArIG9iamVjdFtpZHhdO1xuICB9XG5cbiAgLy8gRHVtcCB0YWlsXG5cbiAgdGFpbCA9IG1heCAlIDM7XG5cbiAgaWYgKHRhaWwgPT09IDApIHtcbiAgICByZXN1bHQgKz0gbWFwWyhiaXRzID4+IDE4KSAmIDB4M0ZdO1xuICAgIHJlc3VsdCArPSBtYXBbKGJpdHMgPj4gMTIpICYgMHgzRl07XG4gICAgcmVzdWx0ICs9IG1hcFsoYml0cyA+PiA2KSAmIDB4M0ZdO1xuICAgIHJlc3VsdCArPSBtYXBbYml0cyAmIDB4M0ZdO1xuICB9IGVsc2UgaWYgKHRhaWwgPT09IDIpIHtcbiAgICByZXN1bHQgKz0gbWFwWyhiaXRzID4+IDEwKSAmIDB4M0ZdO1xuICAgIHJlc3VsdCArPSBtYXBbKGJpdHMgPj4gNCkgJiAweDNGXTtcbiAgICByZXN1bHQgKz0gbWFwWyhiaXRzIDw8IDIpICYgMHgzRl07XG4gICAgcmVzdWx0ICs9IG1hcFs2NF07XG4gIH0gZWxzZSBpZiAodGFpbCA9PT0gMSkge1xuICAgIHJlc3VsdCArPSBtYXBbKGJpdHMgPj4gMikgJiAweDNGXTtcbiAgICByZXN1bHQgKz0gbWFwWyhiaXRzIDw8IDQpICYgMHgzRl07XG4gICAgcmVzdWx0ICs9IG1hcFs2NF07XG4gICAgcmVzdWx0ICs9IG1hcFs2NF07XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBpc0JpbmFyeShvYmplY3QpIHtcbiAgcmV0dXJuIE5vZGVCdWZmZXIgJiYgTm9kZUJ1ZmZlci5pc0J1ZmZlcihvYmplY3QpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBUeXBlKCd0YWc6eWFtbC5vcmcsMjAwMjpiaW5hcnknLCB7XG4gIGtpbmQ6ICdzY2FsYXInLFxuICByZXNvbHZlOiByZXNvbHZlWWFtbEJpbmFyeSxcbiAgY29uc3RydWN0OiBjb25zdHJ1Y3RZYW1sQmluYXJ5LFxuICBwcmVkaWNhdGU6IGlzQmluYXJ5LFxuICByZXByZXNlbnQ6IHJlcHJlc2VudFlhbWxCaW5hcnlcbn0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgVHlwZSA9IHJlcXVpcmUoJy4uL3R5cGUnKTtcblxuZnVuY3Rpb24gcmVzb2x2ZVlhbWxCb29sZWFuKGRhdGEpIHtcbiAgaWYgKGRhdGEgPT09IG51bGwpIHJldHVybiBmYWxzZTtcblxuICB2YXIgbWF4ID0gZGF0YS5sZW5ndGg7XG5cbiAgcmV0dXJuIChtYXggPT09IDQgJiYgKGRhdGEgPT09ICd0cnVlJyB8fCBkYXRhID09PSAnVHJ1ZScgfHwgZGF0YSA9PT0gJ1RSVUUnKSkgfHxcbiAgICAgICAgIChtYXggPT09IDUgJiYgKGRhdGEgPT09ICdmYWxzZScgfHwgZGF0YSA9PT0gJ0ZhbHNlJyB8fCBkYXRhID09PSAnRkFMU0UnKSk7XG59XG5cbmZ1bmN0aW9uIGNvbnN0cnVjdFlhbWxCb29sZWFuKGRhdGEpIHtcbiAgcmV0dXJuIGRhdGEgPT09ICd0cnVlJyB8fFxuICAgICAgICAgZGF0YSA9PT0gJ1RydWUnIHx8XG4gICAgICAgICBkYXRhID09PSAnVFJVRSc7XG59XG5cbmZ1bmN0aW9uIGlzQm9vbGVhbihvYmplY3QpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmplY3QpID09PSAnW29iamVjdCBCb29sZWFuXSc7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IFR5cGUoJ3RhZzp5YW1sLm9yZywyMDAyOmJvb2wnLCB7XG4gIGtpbmQ6ICdzY2FsYXInLFxuICByZXNvbHZlOiByZXNvbHZlWWFtbEJvb2xlYW4sXG4gIGNvbnN0cnVjdDogY29uc3RydWN0WWFtbEJvb2xlYW4sXG4gIHByZWRpY2F0ZTogaXNCb29sZWFuLFxuICByZXByZXNlbnQ6IHtcbiAgICBsb3dlcmNhc2U6IGZ1bmN0aW9uIChvYmplY3QpIHsgcmV0dXJuIG9iamVjdCA/ICd0cnVlJyA6ICdmYWxzZSc7IH0sXG4gICAgdXBwZXJjYXNlOiBmdW5jdGlvbiAob2JqZWN0KSB7IHJldHVybiBvYmplY3QgPyAnVFJVRScgOiAnRkFMU0UnOyB9LFxuICAgIGNhbWVsY2FzZTogZnVuY3Rpb24gKG9iamVjdCkgeyByZXR1cm4gb2JqZWN0ID8gJ1RydWUnIDogJ0ZhbHNlJzsgfVxuICB9LFxuICBkZWZhdWx0U3R5bGU6ICdsb3dlcmNhc2UnXG59KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNvbW1vbiA9IHJlcXVpcmUoJy4uL2NvbW1vbicpO1xudmFyIFR5cGUgICA9IHJlcXVpcmUoJy4uL3R5cGUnKTtcblxudmFyIFlBTUxfRkxPQVRfUEFUVEVSTiA9IG5ldyBSZWdFeHAoXG4gIC8vIDIuNWU0LCAyLjUgYW5kIGludGVnZXJzXG4gICdeKD86Wy0rXT8oPzowfFsxLTldWzAtOV9dKikoPzpcXFxcLlswLTlfXSopPyg/OltlRV1bLStdP1swLTldKyk/JyArXG4gIC8vIC4yZTQsIC4yXG4gIC8vIHNwZWNpYWwgY2FzZSwgc2VlbXMgbm90IGZyb20gc3BlY1xuICAnfFxcXFwuWzAtOV9dKyg/OltlRV1bLStdP1swLTldKyk/JyArXG4gIC8vIDIwOjU5XG4gICd8Wy0rXT9bMC05XVswLTlfXSooPzo6WzAtNV0/WzAtOV0pK1xcXFwuWzAtOV9dKicgK1xuICAvLyAuaW5mXG4gICd8Wy0rXT9cXFxcLig/OmluZnxJbmZ8SU5GKScgK1xuICAvLyAubmFuXG4gICd8XFxcXC4oPzpuYW58TmFOfE5BTikpJCcpO1xuXG5mdW5jdGlvbiByZXNvbHZlWWFtbEZsb2F0KGRhdGEpIHtcbiAgaWYgKGRhdGEgPT09IG51bGwpIHJldHVybiBmYWxzZTtcblxuICBpZiAoIVlBTUxfRkxPQVRfUEFUVEVSTi50ZXN0KGRhdGEpIHx8XG4gICAgICAvLyBRdWljayBoYWNrIHRvIG5vdCBhbGxvdyBpbnRlZ2VycyBlbmQgd2l0aCBgX2BcbiAgICAgIC8vIFByb2JhYmx5IHNob3VsZCB1cGRhdGUgcmVnZXhwICYgY2hlY2sgc3BlZWRcbiAgICAgIGRhdGFbZGF0YS5sZW5ndGggLSAxXSA9PT0gJ18nKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGNvbnN0cnVjdFlhbWxGbG9hdChkYXRhKSB7XG4gIHZhciB2YWx1ZSwgc2lnbiwgYmFzZSwgZGlnaXRzO1xuXG4gIHZhbHVlICA9IGRhdGEucmVwbGFjZSgvXy9nLCAnJykudG9Mb3dlckNhc2UoKTtcbiAgc2lnbiAgID0gdmFsdWVbMF0gPT09ICctJyA/IC0xIDogMTtcbiAgZGlnaXRzID0gW107XG5cbiAgaWYgKCcrLScuaW5kZXhPZih2YWx1ZVswXSkgPj0gMCkge1xuICAgIHZhbHVlID0gdmFsdWUuc2xpY2UoMSk7XG4gIH1cblxuICBpZiAodmFsdWUgPT09ICcuaW5mJykge1xuICAgIHJldHVybiAoc2lnbiA9PT0gMSkgPyBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFkgOiBOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFk7XG5cbiAgfSBlbHNlIGlmICh2YWx1ZSA9PT0gJy5uYW4nKSB7XG4gICAgcmV0dXJuIE5hTjtcblxuICB9IGVsc2UgaWYgKHZhbHVlLmluZGV4T2YoJzonKSA+PSAwKSB7XG4gICAgdmFsdWUuc3BsaXQoJzonKS5mb3JFYWNoKGZ1bmN0aW9uICh2KSB7XG4gICAgICBkaWdpdHMudW5zaGlmdChwYXJzZUZsb2F0KHYsIDEwKSk7XG4gICAgfSk7XG5cbiAgICB2YWx1ZSA9IDAuMDtcbiAgICBiYXNlID0gMTtcblxuICAgIGRpZ2l0cy5mb3JFYWNoKGZ1bmN0aW9uIChkKSB7XG4gICAgICB2YWx1ZSArPSBkICogYmFzZTtcbiAgICAgIGJhc2UgKj0gNjA7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gc2lnbiAqIHZhbHVlO1xuXG4gIH1cbiAgcmV0dXJuIHNpZ24gKiBwYXJzZUZsb2F0KHZhbHVlLCAxMCk7XG59XG5cblxudmFyIFNDSUVOVElGSUNfV0lUSE9VVF9ET1QgPSAvXlstK10/WzAtOV0rZS87XG5cbmZ1bmN0aW9uIHJlcHJlc2VudFlhbWxGbG9hdChvYmplY3QsIHN0eWxlKSB7XG4gIHZhciByZXM7XG5cbiAgaWYgKGlzTmFOKG9iamVjdCkpIHtcbiAgICBzd2l0Y2ggKHN0eWxlKSB7XG4gICAgICBjYXNlICdsb3dlcmNhc2UnOiByZXR1cm4gJy5uYW4nO1xuICAgICAgY2FzZSAndXBwZXJjYXNlJzogcmV0dXJuICcuTkFOJztcbiAgICAgIGNhc2UgJ2NhbWVsY2FzZSc6IHJldHVybiAnLk5hTic7XG4gICAgfVxuICB9IGVsc2UgaWYgKE51bWJlci5QT1NJVElWRV9JTkZJTklUWSA9PT0gb2JqZWN0KSB7XG4gICAgc3dpdGNoIChzdHlsZSkge1xuICAgICAgY2FzZSAnbG93ZXJjYXNlJzogcmV0dXJuICcuaW5mJztcbiAgICAgIGNhc2UgJ3VwcGVyY2FzZSc6IHJldHVybiAnLklORic7XG4gICAgICBjYXNlICdjYW1lbGNhc2UnOiByZXR1cm4gJy5JbmYnO1xuICAgIH1cbiAgfSBlbHNlIGlmIChOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFkgPT09IG9iamVjdCkge1xuICAgIHN3aXRjaCAoc3R5bGUpIHtcbiAgICAgIGNhc2UgJ2xvd2VyY2FzZSc6IHJldHVybiAnLS5pbmYnO1xuICAgICAgY2FzZSAndXBwZXJjYXNlJzogcmV0dXJuICctLklORic7XG4gICAgICBjYXNlICdjYW1lbGNhc2UnOiByZXR1cm4gJy0uSW5mJztcbiAgICB9XG4gIH0gZWxzZSBpZiAoY29tbW9uLmlzTmVnYXRpdmVaZXJvKG9iamVjdCkpIHtcbiAgICByZXR1cm4gJy0wLjAnO1xuICB9XG5cbiAgcmVzID0gb2JqZWN0LnRvU3RyaW5nKDEwKTtcblxuICAvLyBKUyBzdHJpbmdpZmllciBjYW4gYnVpbGQgc2NpZW50aWZpYyBmb3JtYXQgd2l0aG91dCBkb3RzOiA1ZS0xMDAsXG4gIC8vIHdoaWxlIFlBTUwgcmVxdXJlcyBkb3Q6IDUuZS0xMDAuIEZpeCBpdCB3aXRoIHNpbXBsZSBoYWNrXG5cbiAgcmV0dXJuIFNDSUVOVElGSUNfV0lUSE9VVF9ET1QudGVzdChyZXMpID8gcmVzLnJlcGxhY2UoJ2UnLCAnLmUnKSA6IHJlcztcbn1cblxuZnVuY3Rpb24gaXNGbG9hdChvYmplY3QpIHtcbiAgcmV0dXJuIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqZWN0KSA9PT0gJ1tvYmplY3QgTnVtYmVyXScpICYmXG4gICAgICAgICAob2JqZWN0ICUgMSAhPT0gMCB8fCBjb21tb24uaXNOZWdhdGl2ZVplcm8ob2JqZWN0KSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IFR5cGUoJ3RhZzp5YW1sLm9yZywyMDAyOmZsb2F0Jywge1xuICBraW5kOiAnc2NhbGFyJyxcbiAgcmVzb2x2ZTogcmVzb2x2ZVlhbWxGbG9hdCxcbiAgY29uc3RydWN0OiBjb25zdHJ1Y3RZYW1sRmxvYXQsXG4gIHByZWRpY2F0ZTogaXNGbG9hdCxcbiAgcmVwcmVzZW50OiByZXByZXNlbnRZYW1sRmxvYXQsXG4gIGRlZmF1bHRTdHlsZTogJ2xvd2VyY2FzZSdcbn0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY29tbW9uID0gcmVxdWlyZSgnLi4vY29tbW9uJyk7XG52YXIgVHlwZSAgID0gcmVxdWlyZSgnLi4vdHlwZScpO1xuXG5mdW5jdGlvbiBpc0hleENvZGUoYykge1xuICByZXR1cm4gKCgweDMwLyogMCAqLyA8PSBjKSAmJiAoYyA8PSAweDM5LyogOSAqLykpIHx8XG4gICAgICAgICAoKDB4NDEvKiBBICovIDw9IGMpICYmIChjIDw9IDB4NDYvKiBGICovKSkgfHxcbiAgICAgICAgICgoMHg2MS8qIGEgKi8gPD0gYykgJiYgKGMgPD0gMHg2Ni8qIGYgKi8pKTtcbn1cblxuZnVuY3Rpb24gaXNPY3RDb2RlKGMpIHtcbiAgcmV0dXJuICgoMHgzMC8qIDAgKi8gPD0gYykgJiYgKGMgPD0gMHgzNy8qIDcgKi8pKTtcbn1cblxuZnVuY3Rpb24gaXNEZWNDb2RlKGMpIHtcbiAgcmV0dXJuICgoMHgzMC8qIDAgKi8gPD0gYykgJiYgKGMgPD0gMHgzOS8qIDkgKi8pKTtcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZVlhbWxJbnRlZ2VyKGRhdGEpIHtcbiAgaWYgKGRhdGEgPT09IG51bGwpIHJldHVybiBmYWxzZTtcblxuICB2YXIgbWF4ID0gZGF0YS5sZW5ndGgsXG4gICAgICBpbmRleCA9IDAsXG4gICAgICBoYXNEaWdpdHMgPSBmYWxzZSxcbiAgICAgIGNoO1xuXG4gIGlmICghbWF4KSByZXR1cm4gZmFsc2U7XG5cbiAgY2ggPSBkYXRhW2luZGV4XTtcblxuICAvLyBzaWduXG4gIGlmIChjaCA9PT0gJy0nIHx8IGNoID09PSAnKycpIHtcbiAgICBjaCA9IGRhdGFbKytpbmRleF07XG4gIH1cblxuICBpZiAoY2ggPT09ICcwJykge1xuICAgIC8vIDBcbiAgICBpZiAoaW5kZXggKyAxID09PSBtYXgpIHJldHVybiB0cnVlO1xuICAgIGNoID0gZGF0YVsrK2luZGV4XTtcblxuICAgIC8vIGJhc2UgMiwgYmFzZSA4LCBiYXNlIDE2XG5cbiAgICBpZiAoY2ggPT09ICdiJykge1xuICAgICAgLy8gYmFzZSAyXG4gICAgICBpbmRleCsrO1xuXG4gICAgICBmb3IgKDsgaW5kZXggPCBtYXg7IGluZGV4KyspIHtcbiAgICAgICAgY2ggPSBkYXRhW2luZGV4XTtcbiAgICAgICAgaWYgKGNoID09PSAnXycpIGNvbnRpbnVlO1xuICAgICAgICBpZiAoY2ggIT09ICcwJyAmJiBjaCAhPT0gJzEnKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGhhc0RpZ2l0cyA9IHRydWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gaGFzRGlnaXRzICYmIGNoICE9PSAnXyc7XG4gICAgfVxuXG5cbiAgICBpZiAoY2ggPT09ICd4Jykge1xuICAgICAgLy8gYmFzZSAxNlxuICAgICAgaW5kZXgrKztcblxuICAgICAgZm9yICg7IGluZGV4IDwgbWF4OyBpbmRleCsrKSB7XG4gICAgICAgIGNoID0gZGF0YVtpbmRleF07XG4gICAgICAgIGlmIChjaCA9PT0gJ18nKSBjb250aW51ZTtcbiAgICAgICAgaWYgKCFpc0hleENvZGUoZGF0YS5jaGFyQ29kZUF0KGluZGV4KSkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaGFzRGlnaXRzID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBoYXNEaWdpdHMgJiYgY2ggIT09ICdfJztcbiAgICB9XG5cbiAgICAvLyBiYXNlIDhcbiAgICBmb3IgKDsgaW5kZXggPCBtYXg7IGluZGV4KyspIHtcbiAgICAgIGNoID0gZGF0YVtpbmRleF07XG4gICAgICBpZiAoY2ggPT09ICdfJykgY29udGludWU7XG4gICAgICBpZiAoIWlzT2N0Q29kZShkYXRhLmNoYXJDb2RlQXQoaW5kZXgpKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgaGFzRGlnaXRzID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGhhc0RpZ2l0cyAmJiBjaCAhPT0gJ18nO1xuICB9XG5cbiAgLy8gYmFzZSAxMCAoZXhjZXB0IDApIG9yIGJhc2UgNjBcblxuICAvLyB2YWx1ZSBzaG91bGQgbm90IHN0YXJ0IHdpdGggYF9gO1xuICBpZiAoY2ggPT09ICdfJykgcmV0dXJuIGZhbHNlO1xuXG4gIGZvciAoOyBpbmRleCA8IG1heDsgaW5kZXgrKykge1xuICAgIGNoID0gZGF0YVtpbmRleF07XG4gICAgaWYgKGNoID09PSAnXycpIGNvbnRpbnVlO1xuICAgIGlmIChjaCA9PT0gJzonKSBicmVhaztcbiAgICBpZiAoIWlzRGVjQ29kZShkYXRhLmNoYXJDb2RlQXQoaW5kZXgpKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBoYXNEaWdpdHMgPSB0cnVlO1xuICB9XG5cbiAgLy8gU2hvdWxkIGhhdmUgZGlnaXRzIGFuZCBzaG91bGQgbm90IGVuZCB3aXRoIGBfYFxuICBpZiAoIWhhc0RpZ2l0cyB8fCBjaCA9PT0gJ18nKSByZXR1cm4gZmFsc2U7XG5cbiAgLy8gaWYgIWJhc2U2MCAtIGRvbmU7XG4gIGlmIChjaCAhPT0gJzonKSByZXR1cm4gdHJ1ZTtcblxuICAvLyBiYXNlNjAgYWxtb3N0IG5vdCB1c2VkLCBubyBuZWVkcyB0byBvcHRpbWl6ZVxuICByZXR1cm4gL14oOlswLTVdP1swLTldKSskLy50ZXN0KGRhdGEuc2xpY2UoaW5kZXgpKTtcbn1cblxuZnVuY3Rpb24gY29uc3RydWN0WWFtbEludGVnZXIoZGF0YSkge1xuICB2YXIgdmFsdWUgPSBkYXRhLCBzaWduID0gMSwgY2gsIGJhc2UsIGRpZ2l0cyA9IFtdO1xuXG4gIGlmICh2YWx1ZS5pbmRleE9mKCdfJykgIT09IC0xKSB7XG4gICAgdmFsdWUgPSB2YWx1ZS5yZXBsYWNlKC9fL2csICcnKTtcbiAgfVxuXG4gIGNoID0gdmFsdWVbMF07XG5cbiAgaWYgKGNoID09PSAnLScgfHwgY2ggPT09ICcrJykge1xuICAgIGlmIChjaCA9PT0gJy0nKSBzaWduID0gLTE7XG4gICAgdmFsdWUgPSB2YWx1ZS5zbGljZSgxKTtcbiAgICBjaCA9IHZhbHVlWzBdO1xuICB9XG5cbiAgaWYgKHZhbHVlID09PSAnMCcpIHJldHVybiAwO1xuXG4gIGlmIChjaCA9PT0gJzAnKSB7XG4gICAgaWYgKHZhbHVlWzFdID09PSAnYicpIHJldHVybiBzaWduICogcGFyc2VJbnQodmFsdWUuc2xpY2UoMiksIDIpO1xuICAgIGlmICh2YWx1ZVsxXSA9PT0gJ3gnKSByZXR1cm4gc2lnbiAqIHBhcnNlSW50KHZhbHVlLCAxNik7XG4gICAgcmV0dXJuIHNpZ24gKiBwYXJzZUludCh2YWx1ZSwgOCk7XG4gIH1cblxuICBpZiAodmFsdWUuaW5kZXhPZignOicpICE9PSAtMSkge1xuICAgIHZhbHVlLnNwbGl0KCc6JykuZm9yRWFjaChmdW5jdGlvbiAodikge1xuICAgICAgZGlnaXRzLnVuc2hpZnQocGFyc2VJbnQodiwgMTApKTtcbiAgICB9KTtcblxuICAgIHZhbHVlID0gMDtcbiAgICBiYXNlID0gMTtcblxuICAgIGRpZ2l0cy5mb3JFYWNoKGZ1bmN0aW9uIChkKSB7XG4gICAgICB2YWx1ZSArPSAoZCAqIGJhc2UpO1xuICAgICAgYmFzZSAqPSA2MDtcbiAgICB9KTtcblxuICAgIHJldHVybiBzaWduICogdmFsdWU7XG5cbiAgfVxuXG4gIHJldHVybiBzaWduICogcGFyc2VJbnQodmFsdWUsIDEwKTtcbn1cblxuZnVuY3Rpb24gaXNJbnRlZ2VyKG9iamVjdCkge1xuICByZXR1cm4gKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmplY3QpKSA9PT0gJ1tvYmplY3QgTnVtYmVyXScgJiZcbiAgICAgICAgIChvYmplY3QgJSAxID09PSAwICYmICFjb21tb24uaXNOZWdhdGl2ZVplcm8ob2JqZWN0KSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IFR5cGUoJ3RhZzp5YW1sLm9yZywyMDAyOmludCcsIHtcbiAga2luZDogJ3NjYWxhcicsXG4gIHJlc29sdmU6IHJlc29sdmVZYW1sSW50ZWdlcixcbiAgY29uc3RydWN0OiBjb25zdHJ1Y3RZYW1sSW50ZWdlcixcbiAgcHJlZGljYXRlOiBpc0ludGVnZXIsXG4gIHJlcHJlc2VudDoge1xuICAgIGJpbmFyeTogICAgICBmdW5jdGlvbiAob2JqZWN0KSB7IHJldHVybiAnMGInICsgb2JqZWN0LnRvU3RyaW5nKDIpOyB9LFxuICAgIG9jdGFsOiAgICAgICBmdW5jdGlvbiAob2JqZWN0KSB7IHJldHVybiAnMCcgICsgb2JqZWN0LnRvU3RyaW5nKDgpOyB9LFxuICAgIGRlY2ltYWw6ICAgICBmdW5jdGlvbiAob2JqZWN0KSB7IHJldHVybiAgICAgICAgb2JqZWN0LnRvU3RyaW5nKDEwKTsgfSxcbiAgICBoZXhhZGVjaW1hbDogZnVuY3Rpb24gKG9iamVjdCkgeyByZXR1cm4gJzB4JyArIG9iamVjdC50b1N0cmluZygxNikudG9VcHBlckNhc2UoKTsgfVxuICB9LFxuICBkZWZhdWx0U3R5bGU6ICdkZWNpbWFsJyxcbiAgc3R5bGVBbGlhc2VzOiB7XG4gICAgYmluYXJ5OiAgICAgIFsgMiwgICdiaW4nIF0sXG4gICAgb2N0YWw6ICAgICAgIFsgOCwgICdvY3QnIF0sXG4gICAgZGVjaW1hbDogICAgIFsgMTAsICdkZWMnIF0sXG4gICAgaGV4YWRlY2ltYWw6IFsgMTYsICdoZXgnIF1cbiAgfVxufSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBlc3ByaW1hO1xuXG4vLyBCcm93c2VyaWZpZWQgdmVyc2lvbiBkb2VzIG5vdCBoYXZlIGVzcHJpbWFcbi8vXG4vLyAxLiBGb3Igbm9kZS5qcyBqdXN0IHJlcXVpcmUgbW9kdWxlIGFzIGRlcHNcbi8vIDIuIEZvciBicm93c2VyIHRyeSB0byByZXF1aXJlIG11ZHVsZSB2aWEgZXh0ZXJuYWwgQU1EIHN5c3RlbS5cbi8vICAgIElmIG5vdCBmb3VuZCAtIHRyeSB0byBmYWxsYmFjayB0byB3aW5kb3cuZXNwcmltYS4gSWYgbm90XG4vLyAgICBmb3VuZCB0b28gLSB0aGVuIGZhaWwgdG8gcGFyc2UuXG4vL1xudHJ5IHtcbiAgLy8gd29ya2Fyb3VuZCB0byBleGNsdWRlIHBhY2thZ2UgZnJvbSBicm93c2VyaWZ5IGxpc3QuXG4gIHZhciBfcmVxdWlyZSA9IHJlcXVpcmU7XG4gIGVzcHJpbWEgPSBfcmVxdWlyZSgnZXNwcmltYScpO1xufSBjYXRjaCAoXykge1xuICAvKmdsb2JhbCB3aW5kb3cgKi9cbiAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSBlc3ByaW1hID0gd2luZG93LmVzcHJpbWE7XG59XG5cbnZhciBUeXBlID0gcmVxdWlyZSgnLi4vLi4vdHlwZScpO1xuXG5mdW5jdGlvbiByZXNvbHZlSmF2YXNjcmlwdEZ1bmN0aW9uKGRhdGEpIHtcbiAgaWYgKGRhdGEgPT09IG51bGwpIHJldHVybiBmYWxzZTtcblxuICB0cnkge1xuICAgIHZhciBzb3VyY2UgPSAnKCcgKyBkYXRhICsgJyknLFxuICAgICAgICBhc3QgICAgPSBlc3ByaW1hLnBhcnNlKHNvdXJjZSwgeyByYW5nZTogdHJ1ZSB9KTtcblxuICAgIGlmIChhc3QudHlwZSAgICAgICAgICAgICAgICAgICAgIT09ICdQcm9ncmFtJyAgICAgICAgICAgICB8fFxuICAgICAgICBhc3QuYm9keS5sZW5ndGggICAgICAgICAgICAgIT09IDEgICAgICAgICAgICAgICAgICAgICB8fFxuICAgICAgICBhc3QuYm9keVswXS50eXBlICAgICAgICAgICAgIT09ICdFeHByZXNzaW9uU3RhdGVtZW50JyB8fFxuICAgICAgICBhc3QuYm9keVswXS5leHByZXNzaW9uLnR5cGUgIT09ICdGdW5jdGlvbkV4cHJlc3Npb24nKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjb25zdHJ1Y3RKYXZhc2NyaXB0RnVuY3Rpb24oZGF0YSkge1xuICAvKmpzbGludCBldmlsOnRydWUqL1xuXG4gIHZhciBzb3VyY2UgPSAnKCcgKyBkYXRhICsgJyknLFxuICAgICAgYXN0ICAgID0gZXNwcmltYS5wYXJzZShzb3VyY2UsIHsgcmFuZ2U6IHRydWUgfSksXG4gICAgICBwYXJhbXMgPSBbXSxcbiAgICAgIGJvZHk7XG5cbiAgaWYgKGFzdC50eXBlICAgICAgICAgICAgICAgICAgICAhPT0gJ1Byb2dyYW0nICAgICAgICAgICAgIHx8XG4gICAgICBhc3QuYm9keS5sZW5ndGggICAgICAgICAgICAgIT09IDEgICAgICAgICAgICAgICAgICAgICB8fFxuICAgICAgYXN0LmJvZHlbMF0udHlwZSAgICAgICAgICAgICE9PSAnRXhwcmVzc2lvblN0YXRlbWVudCcgfHxcbiAgICAgIGFzdC5ib2R5WzBdLmV4cHJlc3Npb24udHlwZSAhPT0gJ0Z1bmN0aW9uRXhwcmVzc2lvbicpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byByZXNvbHZlIGZ1bmN0aW9uJyk7XG4gIH1cblxuICBhc3QuYm9keVswXS5leHByZXNzaW9uLnBhcmFtcy5mb3JFYWNoKGZ1bmN0aW9uIChwYXJhbSkge1xuICAgIHBhcmFtcy5wdXNoKHBhcmFtLm5hbWUpO1xuICB9KTtcblxuICBib2R5ID0gYXN0LmJvZHlbMF0uZXhwcmVzc2lvbi5ib2R5LnJhbmdlO1xuXG4gIC8vIEVzcHJpbWEncyByYW5nZXMgaW5jbHVkZSB0aGUgZmlyc3QgJ3snIGFuZCB0aGUgbGFzdCAnfScgY2hhcmFjdGVycyBvblxuICAvLyBmdW5jdGlvbiBleHByZXNzaW9ucy4gU28gY3V0IHRoZW0gb3V0LlxuICAvKmVzbGludC1kaXNhYmxlIG5vLW5ldy1mdW5jKi9cbiAgcmV0dXJuIG5ldyBGdW5jdGlvbihwYXJhbXMsIHNvdXJjZS5zbGljZShib2R5WzBdICsgMSwgYm9keVsxXSAtIDEpKTtcbn1cblxuZnVuY3Rpb24gcmVwcmVzZW50SmF2YXNjcmlwdEZ1bmN0aW9uKG9iamVjdCAvKiwgc3R5bGUqLykge1xuICByZXR1cm4gb2JqZWN0LnRvU3RyaW5nKCk7XG59XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24ob2JqZWN0KSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqZWN0KSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgVHlwZSgndGFnOnlhbWwub3JnLDIwMDI6anMvZnVuY3Rpb24nLCB7XG4gIGtpbmQ6ICdzY2FsYXInLFxuICByZXNvbHZlOiByZXNvbHZlSmF2YXNjcmlwdEZ1bmN0aW9uLFxuICBjb25zdHJ1Y3Q6IGNvbnN0cnVjdEphdmFzY3JpcHRGdW5jdGlvbixcbiAgcHJlZGljYXRlOiBpc0Z1bmN0aW9uLFxuICByZXByZXNlbnQ6IHJlcHJlc2VudEphdmFzY3JpcHRGdW5jdGlvblxufSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBUeXBlID0gcmVxdWlyZSgnLi4vLi4vdHlwZScpO1xuXG5mdW5jdGlvbiByZXNvbHZlSmF2YXNjcmlwdFJlZ0V4cChkYXRhKSB7XG4gIGlmIChkYXRhID09PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gIGlmIChkYXRhLmxlbmd0aCA9PT0gMCkgcmV0dXJuIGZhbHNlO1xuXG4gIHZhciByZWdleHAgPSBkYXRhLFxuICAgICAgdGFpbCAgID0gL1xcLyhbZ2ltXSopJC8uZXhlYyhkYXRhKSxcbiAgICAgIG1vZGlmaWVycyA9ICcnO1xuXG4gIC8vIGlmIHJlZ2V4cCBzdGFydHMgd2l0aCAnLycgaXQgY2FuIGhhdmUgbW9kaWZpZXJzIGFuZCBtdXN0IGJlIHByb3Blcmx5IGNsb3NlZFxuICAvLyBgL2Zvby9naW1gIC0gbW9kaWZpZXJzIHRhaWwgY2FuIGJlIG1heGltdW0gMyBjaGFyc1xuICBpZiAocmVnZXhwWzBdID09PSAnLycpIHtcbiAgICBpZiAodGFpbCkgbW9kaWZpZXJzID0gdGFpbFsxXTtcblxuICAgIGlmIChtb2RpZmllcnMubGVuZ3RoID4gMykgcmV0dXJuIGZhbHNlO1xuICAgIC8vIGlmIGV4cHJlc3Npb24gc3RhcnRzIHdpdGggLywgaXMgc2hvdWxkIGJlIHByb3Blcmx5IHRlcm1pbmF0ZWRcbiAgICBpZiAocmVnZXhwW3JlZ2V4cC5sZW5ndGggLSBtb2RpZmllcnMubGVuZ3RoIC0gMV0gIT09ICcvJykgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGNvbnN0cnVjdEphdmFzY3JpcHRSZWdFeHAoZGF0YSkge1xuICB2YXIgcmVnZXhwID0gZGF0YSxcbiAgICAgIHRhaWwgICA9IC9cXC8oW2dpbV0qKSQvLmV4ZWMoZGF0YSksXG4gICAgICBtb2RpZmllcnMgPSAnJztcblxuICAvLyBgL2Zvby9naW1gIC0gdGFpbCBjYW4gYmUgbWF4aW11bSA0IGNoYXJzXG4gIGlmIChyZWdleHBbMF0gPT09ICcvJykge1xuICAgIGlmICh0YWlsKSBtb2RpZmllcnMgPSB0YWlsWzFdO1xuICAgIHJlZ2V4cCA9IHJlZ2V4cC5zbGljZSgxLCByZWdleHAubGVuZ3RoIC0gbW9kaWZpZXJzLmxlbmd0aCAtIDEpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBSZWdFeHAocmVnZXhwLCBtb2RpZmllcnMpO1xufVxuXG5mdW5jdGlvbiByZXByZXNlbnRKYXZhc2NyaXB0UmVnRXhwKG9iamVjdCAvKiwgc3R5bGUqLykge1xuICB2YXIgcmVzdWx0ID0gJy8nICsgb2JqZWN0LnNvdXJjZSArICcvJztcblxuICBpZiAob2JqZWN0Lmdsb2JhbCkgcmVzdWx0ICs9ICdnJztcbiAgaWYgKG9iamVjdC5tdWx0aWxpbmUpIHJlc3VsdCArPSAnbSc7XG4gIGlmIChvYmplY3QuaWdub3JlQ2FzZSkgcmVzdWx0ICs9ICdpJztcblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBpc1JlZ0V4cChvYmplY3QpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmplY3QpID09PSAnW29iamVjdCBSZWdFeHBdJztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgVHlwZSgndGFnOnlhbWwub3JnLDIwMDI6anMvcmVnZXhwJywge1xuICBraW5kOiAnc2NhbGFyJyxcbiAgcmVzb2x2ZTogcmVzb2x2ZUphdmFzY3JpcHRSZWdFeHAsXG4gIGNvbnN0cnVjdDogY29uc3RydWN0SmF2YXNjcmlwdFJlZ0V4cCxcbiAgcHJlZGljYXRlOiBpc1JlZ0V4cCxcbiAgcmVwcmVzZW50OiByZXByZXNlbnRKYXZhc2NyaXB0UmVnRXhwXG59KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFR5cGUgPSByZXF1aXJlKCcuLi8uLi90eXBlJyk7XG5cbmZ1bmN0aW9uIHJlc29sdmVKYXZhc2NyaXB0VW5kZWZpbmVkKCkge1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gY29uc3RydWN0SmF2YXNjcmlwdFVuZGVmaW5lZCgpIHtcbiAgLyplc2xpbnQtZGlzYWJsZSBuby11bmRlZmluZWQqL1xuICByZXR1cm4gdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiByZXByZXNlbnRKYXZhc2NyaXB0VW5kZWZpbmVkKCkge1xuICByZXR1cm4gJyc7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKG9iamVjdCkge1xuICByZXR1cm4gdHlwZW9mIG9iamVjdCA9PT0gJ3VuZGVmaW5lZCc7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IFR5cGUoJ3RhZzp5YW1sLm9yZywyMDAyOmpzL3VuZGVmaW5lZCcsIHtcbiAga2luZDogJ3NjYWxhcicsXG4gIHJlc29sdmU6IHJlc29sdmVKYXZhc2NyaXB0VW5kZWZpbmVkLFxuICBjb25zdHJ1Y3Q6IGNvbnN0cnVjdEphdmFzY3JpcHRVbmRlZmluZWQsXG4gIHByZWRpY2F0ZTogaXNVbmRlZmluZWQsXG4gIHJlcHJlc2VudDogcmVwcmVzZW50SmF2YXNjcmlwdFVuZGVmaW5lZFxufSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBUeXBlID0gcmVxdWlyZSgnLi4vdHlwZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBUeXBlKCd0YWc6eWFtbC5vcmcsMjAwMjptYXAnLCB7XG4gIGtpbmQ6ICdtYXBwaW5nJyxcbiAgY29uc3RydWN0OiBmdW5jdGlvbiAoZGF0YSkgeyByZXR1cm4gZGF0YSAhPT0gbnVsbCA/IGRhdGEgOiB7fTsgfVxufSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBUeXBlID0gcmVxdWlyZSgnLi4vdHlwZScpO1xuXG5mdW5jdGlvbiByZXNvbHZlWWFtbE1lcmdlKGRhdGEpIHtcbiAgcmV0dXJuIGRhdGEgPT09ICc8PCcgfHwgZGF0YSA9PT0gbnVsbDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgVHlwZSgndGFnOnlhbWwub3JnLDIwMDI6bWVyZ2UnLCB7XG4gIGtpbmQ6ICdzY2FsYXInLFxuICByZXNvbHZlOiByZXNvbHZlWWFtbE1lcmdlXG59KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFR5cGUgPSByZXF1aXJlKCcuLi90eXBlJyk7XG5cbmZ1bmN0aW9uIHJlc29sdmVZYW1sTnVsbChkYXRhKSB7XG4gIGlmIChkYXRhID09PSBudWxsKSByZXR1cm4gdHJ1ZTtcblxuICB2YXIgbWF4ID0gZGF0YS5sZW5ndGg7XG5cbiAgcmV0dXJuIChtYXggPT09IDEgJiYgZGF0YSA9PT0gJ34nKSB8fFxuICAgICAgICAgKG1heCA9PT0gNCAmJiAoZGF0YSA9PT0gJ251bGwnIHx8IGRhdGEgPT09ICdOdWxsJyB8fCBkYXRhID09PSAnTlVMTCcpKTtcbn1cblxuZnVuY3Rpb24gY29uc3RydWN0WWFtbE51bGwoKSB7XG4gIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBpc051bGwob2JqZWN0KSB7XG4gIHJldHVybiBvYmplY3QgPT09IG51bGw7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IFR5cGUoJ3RhZzp5YW1sLm9yZywyMDAyOm51bGwnLCB7XG4gIGtpbmQ6ICdzY2FsYXInLFxuICByZXNvbHZlOiByZXNvbHZlWWFtbE51bGwsXG4gIGNvbnN0cnVjdDogY29uc3RydWN0WWFtbE51bGwsXG4gIHByZWRpY2F0ZTogaXNOdWxsLFxuICByZXByZXNlbnQ6IHtcbiAgICBjYW5vbmljYWw6IGZ1bmN0aW9uICgpIHsgcmV0dXJuICd+JzsgICAgfSxcbiAgICBsb3dlcmNhc2U6IGZ1bmN0aW9uICgpIHsgcmV0dXJuICdudWxsJzsgfSxcbiAgICB1cHBlcmNhc2U6IGZ1bmN0aW9uICgpIHsgcmV0dXJuICdOVUxMJzsgfSxcbiAgICBjYW1lbGNhc2U6IGZ1bmN0aW9uICgpIHsgcmV0dXJuICdOdWxsJzsgfVxuICB9LFxuICBkZWZhdWx0U3R5bGU6ICdsb3dlcmNhc2UnXG59KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFR5cGUgPSByZXF1aXJlKCcuLi90eXBlJyk7XG5cbnZhciBfaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xudmFyIF90b1N0cmluZyAgICAgICA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbmZ1bmN0aW9uIHJlc29sdmVZYW1sT21hcChkYXRhKSB7XG4gIGlmIChkYXRhID09PSBudWxsKSByZXR1cm4gdHJ1ZTtcblxuICB2YXIgb2JqZWN0S2V5cyA9IFtdLCBpbmRleCwgbGVuZ3RoLCBwYWlyLCBwYWlyS2V5LCBwYWlySGFzS2V5LFxuICAgICAgb2JqZWN0ID0gZGF0YTtcblxuICBmb3IgKGluZGV4ID0gMCwgbGVuZ3RoID0gb2JqZWN0Lmxlbmd0aDsgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IDEpIHtcbiAgICBwYWlyID0gb2JqZWN0W2luZGV4XTtcbiAgICBwYWlySGFzS2V5ID0gZmFsc2U7XG5cbiAgICBpZiAoX3RvU3RyaW5nLmNhbGwocGFpcikgIT09ICdbb2JqZWN0IE9iamVjdF0nKSByZXR1cm4gZmFsc2U7XG5cbiAgICBmb3IgKHBhaXJLZXkgaW4gcGFpcikge1xuICAgICAgaWYgKF9oYXNPd25Qcm9wZXJ0eS5jYWxsKHBhaXIsIHBhaXJLZXkpKSB7XG4gICAgICAgIGlmICghcGFpckhhc0tleSkgcGFpckhhc0tleSA9IHRydWU7XG4gICAgICAgIGVsc2UgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghcGFpckhhc0tleSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgaWYgKG9iamVjdEtleXMuaW5kZXhPZihwYWlyS2V5KSA9PT0gLTEpIG9iamVjdEtleXMucHVzaChwYWlyS2V5KTtcbiAgICBlbHNlIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBjb25zdHJ1Y3RZYW1sT21hcChkYXRhKSB7XG4gIHJldHVybiBkYXRhICE9PSBudWxsID8gZGF0YSA6IFtdO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBUeXBlKCd0YWc6eWFtbC5vcmcsMjAwMjpvbWFwJywge1xuICBraW5kOiAnc2VxdWVuY2UnLFxuICByZXNvbHZlOiByZXNvbHZlWWFtbE9tYXAsXG4gIGNvbnN0cnVjdDogY29uc3RydWN0WWFtbE9tYXBcbn0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgVHlwZSA9IHJlcXVpcmUoJy4uL3R5cGUnKTtcblxudmFyIF90b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbmZ1bmN0aW9uIHJlc29sdmVZYW1sUGFpcnMoZGF0YSkge1xuICBpZiAoZGF0YSA9PT0gbnVsbCkgcmV0dXJuIHRydWU7XG5cbiAgdmFyIGluZGV4LCBsZW5ndGgsIHBhaXIsIGtleXMsIHJlc3VsdCxcbiAgICAgIG9iamVjdCA9IGRhdGE7XG5cbiAgcmVzdWx0ID0gbmV3IEFycmF5KG9iamVjdC5sZW5ndGgpO1xuXG4gIGZvciAoaW5kZXggPSAwLCBsZW5ndGggPSBvYmplY3QubGVuZ3RoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXggKz0gMSkge1xuICAgIHBhaXIgPSBvYmplY3RbaW5kZXhdO1xuXG4gICAgaWYgKF90b1N0cmluZy5jYWxsKHBhaXIpICE9PSAnW29iamVjdCBPYmplY3RdJykgcmV0dXJuIGZhbHNlO1xuXG4gICAga2V5cyA9IE9iamVjdC5rZXlzKHBhaXIpO1xuXG4gICAgaWYgKGtleXMubGVuZ3RoICE9PSAxKSByZXR1cm4gZmFsc2U7XG5cbiAgICByZXN1bHRbaW5kZXhdID0gWyBrZXlzWzBdLCBwYWlyW2tleXNbMF1dIF07XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gY29uc3RydWN0WWFtbFBhaXJzKGRhdGEpIHtcbiAgaWYgKGRhdGEgPT09IG51bGwpIHJldHVybiBbXTtcblxuICB2YXIgaW5kZXgsIGxlbmd0aCwgcGFpciwga2V5cywgcmVzdWx0LFxuICAgICAgb2JqZWN0ID0gZGF0YTtcblxuICByZXN1bHQgPSBuZXcgQXJyYXkob2JqZWN0Lmxlbmd0aCk7XG5cbiAgZm9yIChpbmRleCA9IDAsIGxlbmd0aCA9IG9iamVjdC5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSAxKSB7XG4gICAgcGFpciA9IG9iamVjdFtpbmRleF07XG5cbiAgICBrZXlzID0gT2JqZWN0LmtleXMocGFpcik7XG5cbiAgICByZXN1bHRbaW5kZXhdID0gWyBrZXlzWzBdLCBwYWlyW2tleXNbMF1dIF07XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBUeXBlKCd0YWc6eWFtbC5vcmcsMjAwMjpwYWlycycsIHtcbiAga2luZDogJ3NlcXVlbmNlJyxcbiAgcmVzb2x2ZTogcmVzb2x2ZVlhbWxQYWlycyxcbiAgY29uc3RydWN0OiBjb25zdHJ1Y3RZYW1sUGFpcnNcbn0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgVHlwZSA9IHJlcXVpcmUoJy4uL3R5cGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgVHlwZSgndGFnOnlhbWwub3JnLDIwMDI6c2VxJywge1xuICBraW5kOiAnc2VxdWVuY2UnLFxuICBjb25zdHJ1Y3Q6IGZ1bmN0aW9uIChkYXRhKSB7IHJldHVybiBkYXRhICE9PSBudWxsID8gZGF0YSA6IFtdOyB9XG59KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFR5cGUgPSByZXF1aXJlKCcuLi90eXBlJyk7XG5cbnZhciBfaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG5mdW5jdGlvbiByZXNvbHZlWWFtbFNldChkYXRhKSB7XG4gIGlmIChkYXRhID09PSBudWxsKSByZXR1cm4gdHJ1ZTtcblxuICB2YXIga2V5LCBvYmplY3QgPSBkYXRhO1xuXG4gIGZvciAoa2V5IGluIG9iamVjdCkge1xuICAgIGlmIChfaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIGtleSkpIHtcbiAgICAgIGlmIChvYmplY3Rba2V5XSAhPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBjb25zdHJ1Y3RZYW1sU2V0KGRhdGEpIHtcbiAgcmV0dXJuIGRhdGEgIT09IG51bGwgPyBkYXRhIDoge307XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IFR5cGUoJ3RhZzp5YW1sLm9yZywyMDAyOnNldCcsIHtcbiAga2luZDogJ21hcHBpbmcnLFxuICByZXNvbHZlOiByZXNvbHZlWWFtbFNldCxcbiAgY29uc3RydWN0OiBjb25zdHJ1Y3RZYW1sU2V0XG59KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFR5cGUgPSByZXF1aXJlKCcuLi90eXBlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IFR5cGUoJ3RhZzp5YW1sLm9yZywyMDAyOnN0cicsIHtcbiAga2luZDogJ3NjYWxhcicsXG4gIGNvbnN0cnVjdDogZnVuY3Rpb24gKGRhdGEpIHsgcmV0dXJuIGRhdGEgIT09IG51bGwgPyBkYXRhIDogJyc7IH1cbn0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgVHlwZSA9IHJlcXVpcmUoJy4uL3R5cGUnKTtcblxudmFyIFlBTUxfREFURV9SRUdFWFAgPSBuZXcgUmVnRXhwKFxuICAnXihbMC05XVswLTldWzAtOV1bMC05XSknICAgICAgICAgICsgLy8gWzFdIHllYXJcbiAgJy0oWzAtOV1bMC05XSknICAgICAgICAgICAgICAgICAgICArIC8vIFsyXSBtb250aFxuICAnLShbMC05XVswLTldKSQnKTsgICAgICAgICAgICAgICAgICAgLy8gWzNdIGRheVxuXG52YXIgWUFNTF9USU1FU1RBTVBfUkVHRVhQID0gbmV3IFJlZ0V4cChcbiAgJ14oWzAtOV1bMC05XVswLTldWzAtOV0pJyAgICAgICAgICArIC8vIFsxXSB5ZWFyXG4gICctKFswLTldWzAtOV0/KScgICAgICAgICAgICAgICAgICAgKyAvLyBbMl0gbW9udGhcbiAgJy0oWzAtOV1bMC05XT8pJyAgICAgICAgICAgICAgICAgICArIC8vIFszXSBkYXlcbiAgJyg/OltUdF18WyBcXFxcdF0rKScgICAgICAgICAgICAgICAgICsgLy8gLi4uXG4gICcoWzAtOV1bMC05XT8pJyAgICAgICAgICAgICAgICAgICAgKyAvLyBbNF0gaG91clxuICAnOihbMC05XVswLTldKScgICAgICAgICAgICAgICAgICAgICsgLy8gWzVdIG1pbnV0ZVxuICAnOihbMC05XVswLTldKScgICAgICAgICAgICAgICAgICAgICsgLy8gWzZdIHNlY29uZFxuICAnKD86XFxcXC4oWzAtOV0qKSk/JyAgICAgICAgICAgICAgICAgKyAvLyBbN10gZnJhY3Rpb25cbiAgJyg/OlsgXFxcXHRdKihafChbLStdKShbMC05XVswLTldPyknICsgLy8gWzhdIHR6IFs5XSB0el9zaWduIFsxMF0gdHpfaG91clxuICAnKD86OihbMC05XVswLTldKSk/KSk/JCcpOyAgICAgICAgICAgLy8gWzExXSB0el9taW51dGVcblxuZnVuY3Rpb24gcmVzb2x2ZVlhbWxUaW1lc3RhbXAoZGF0YSkge1xuICBpZiAoZGF0YSA9PT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICBpZiAoWUFNTF9EQVRFX1JFR0VYUC5leGVjKGRhdGEpICE9PSBudWxsKSByZXR1cm4gdHJ1ZTtcbiAgaWYgKFlBTUxfVElNRVNUQU1QX1JFR0VYUC5leGVjKGRhdGEpICE9PSBudWxsKSByZXR1cm4gdHJ1ZTtcbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBjb25zdHJ1Y3RZYW1sVGltZXN0YW1wKGRhdGEpIHtcbiAgdmFyIG1hdGNoLCB5ZWFyLCBtb250aCwgZGF5LCBob3VyLCBtaW51dGUsIHNlY29uZCwgZnJhY3Rpb24gPSAwLFxuICAgICAgZGVsdGEgPSBudWxsLCB0el9ob3VyLCB0el9taW51dGUsIGRhdGU7XG5cbiAgbWF0Y2ggPSBZQU1MX0RBVEVfUkVHRVhQLmV4ZWMoZGF0YSk7XG4gIGlmIChtYXRjaCA9PT0gbnVsbCkgbWF0Y2ggPSBZQU1MX1RJTUVTVEFNUF9SRUdFWFAuZXhlYyhkYXRhKTtcblxuICBpZiAobWF0Y2ggPT09IG51bGwpIHRocm93IG5ldyBFcnJvcignRGF0ZSByZXNvbHZlIGVycm9yJyk7XG5cbiAgLy8gbWF0Y2g6IFsxXSB5ZWFyIFsyXSBtb250aCBbM10gZGF5XG5cbiAgeWVhciA9ICsobWF0Y2hbMV0pO1xuICBtb250aCA9ICsobWF0Y2hbMl0pIC0gMTsgLy8gSlMgbW9udGggc3RhcnRzIHdpdGggMFxuICBkYXkgPSArKG1hdGNoWzNdKTtcblxuICBpZiAoIW1hdGNoWzRdKSB7IC8vIG5vIGhvdXJcbiAgICByZXR1cm4gbmV3IERhdGUoRGF0ZS5VVEMoeWVhciwgbW9udGgsIGRheSkpO1xuICB9XG5cbiAgLy8gbWF0Y2g6IFs0XSBob3VyIFs1XSBtaW51dGUgWzZdIHNlY29uZCBbN10gZnJhY3Rpb25cblxuICBob3VyID0gKyhtYXRjaFs0XSk7XG4gIG1pbnV0ZSA9ICsobWF0Y2hbNV0pO1xuICBzZWNvbmQgPSArKG1hdGNoWzZdKTtcblxuICBpZiAobWF0Y2hbN10pIHtcbiAgICBmcmFjdGlvbiA9IG1hdGNoWzddLnNsaWNlKDAsIDMpO1xuICAgIHdoaWxlIChmcmFjdGlvbi5sZW5ndGggPCAzKSB7IC8vIG1pbGxpLXNlY29uZHNcbiAgICAgIGZyYWN0aW9uICs9ICcwJztcbiAgICB9XG4gICAgZnJhY3Rpb24gPSArZnJhY3Rpb247XG4gIH1cblxuICAvLyBtYXRjaDogWzhdIHR6IFs5XSB0el9zaWduIFsxMF0gdHpfaG91ciBbMTFdIHR6X21pbnV0ZVxuXG4gIGlmIChtYXRjaFs5XSkge1xuICAgIHR6X2hvdXIgPSArKG1hdGNoWzEwXSk7XG4gICAgdHpfbWludXRlID0gKyhtYXRjaFsxMV0gfHwgMCk7XG4gICAgZGVsdGEgPSAodHpfaG91ciAqIDYwICsgdHpfbWludXRlKSAqIDYwMDAwOyAvLyBkZWx0YSBpbiBtaWxpLXNlY29uZHNcbiAgICBpZiAobWF0Y2hbOV0gPT09ICctJykgZGVsdGEgPSAtZGVsdGE7XG4gIH1cblxuICBkYXRlID0gbmV3IERhdGUoRGF0ZS5VVEMoeWVhciwgbW9udGgsIGRheSwgaG91ciwgbWludXRlLCBzZWNvbmQsIGZyYWN0aW9uKSk7XG5cbiAgaWYgKGRlbHRhKSBkYXRlLnNldFRpbWUoZGF0ZS5nZXRUaW1lKCkgLSBkZWx0YSk7XG5cbiAgcmV0dXJuIGRhdGU7XG59XG5cbmZ1bmN0aW9uIHJlcHJlc2VudFlhbWxUaW1lc3RhbXAob2JqZWN0IC8qLCBzdHlsZSovKSB7XG4gIHJldHVybiBvYmplY3QudG9JU09TdHJpbmcoKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgVHlwZSgndGFnOnlhbWwub3JnLDIwMDI6dGltZXN0YW1wJywge1xuICBraW5kOiAnc2NhbGFyJyxcbiAgcmVzb2x2ZTogcmVzb2x2ZVlhbWxUaW1lc3RhbXAsXG4gIGNvbnN0cnVjdDogY29uc3RydWN0WWFtbFRpbWVzdGFtcCxcbiAgaW5zdGFuY2VPZjogRGF0ZSxcbiAgcmVwcmVzZW50OiByZXByZXNlbnRZYW1sVGltZXN0YW1wXG59KTtcbiIsIi8vZnJvbSBodHRwczovL2dpdGh1Yi5jb20vam9rZXIteC9sYW5ndWFnZXMuanNcbihmdW5jdGlvbihleHBvcnRzKXt2YXIgbGFuZ3M9e2F0dHJpYnV0ZTp7bmFtZTowLG5hdGl2ZU5hbWU6MX0scnRsOnthcjoxLGR2OjEsZmE6MSxoYToxLGhlOjEsa3M6MSxrdToxLHBzOjEsdXI6MSx5aToxfSxsYW5nOnthYTpbXCJBZmFyXCIsXCJBZmFyXCJdLGFiOltcIkFia2hhemlhblwiLFwi0JDSp9GB0YPQsFwiXSxhZjpbXCJBZnJpa2FhbnNcIixcIkFmcmlrYWFuc1wiXSxhazpbXCJBa2FuXCIsXCJBa2FuYVwiXSxhbTpbXCJBbWhhcmljXCIsXCLhiqDhiJvhiK3hiptcIl0sYW46W1wiQXJhZ29uZXNlXCIsXCJBcmFnb27DqXNcIl0sYXI6W1wiQXJhYmljXCIsXCLYp9mE2LnYsdio2YrYqVwiXSxhczpbXCJBc3NhbWVzZVwiLFwi4KaF4Ka44Kau4KeA4Kav4Ka84Ka+XCJdLGF2OltcIkF2YXJcIixcItCQ0LLQsNGAXCJdLGF5OltcIkF5bWFyYVwiLFwiQXltYXJcIl0sYXo6W1wiQXplcmJhaWphbmlcIixcIkF6yZlyYmF5Y2FuY2EgLyDYotiw2LHYqNin2YrYrNin2YZcIl0sYmE6W1wiQmFzaGtpclwiLFwi0JHQsNGI0qHQvtGA0YJcIl0sYmU6W1wiQmVsYXJ1c2lhblwiLFwi0JHQtdC70LDRgNGD0YHQutCw0Y9cIl0sYmc6W1wiQnVsZ2FyaWFuXCIsXCLQkdGK0LvQs9Cw0YDRgdC60LhcIl0sYmg6W1wiQmloYXJpXCIsXCLgpK3gpYvgpJzgpKrgpYHgpLDgpYBcIl0sYmk6W1wiQmlzbGFtYVwiLFwiQmlzbGFtYVwiXSxibTpbXCJCYW1iYXJhXCIsXCJCYW1hbmFua2FuXCJdLGJuOltcIkJlbmdhbGlcIixcIuCmrOCmvuCmguCmsuCmvlwiXSxibzpbXCJUaWJldGFuXCIsXCLgvZbgvbzgvZHgvIvgvaHgvbLgvYIgLyBCb2Qgc2thZFwiXSxicjpbXCJCcmV0b25cIixcIkJyZXpob25lZ1wiXSxiczpbXCJCb3NuaWFuXCIsXCJCb3NhbnNraVwiXSxjYTpbXCJDYXRhbGFuXCIsXCJDYXRhbMOgXCJdLGNlOltcIkNoZWNoZW5cIixcItCd0L7RhdGH0LjQudC9XCJdLGNoOltcIkNoYW1vcnJvXCIsXCJDaGFtb3J1XCJdLGNvOltcIkNvcnNpY2FuXCIsXCJDb3JzdVwiXSxjcjpbXCJDcmVlXCIsXCJOZWhpeWF3XCJdLGNzOltcIkN6ZWNoXCIsXCLEjGVza3lcIl0sY3U6W1wiT2xkIENodXJjaCBTbGF2b25pYyAvIE9sZCBCdWxnYXJpYW5cIixcItGB0LvQvtCy0aPQvdGM0YHQutGKIC8gc2xvdsSbbsStc2vFrVwiXSxjdjpbXCJDaHV2YXNoXCIsXCLQp8SD0LLQsNGIXCJdLGN5OltcIldlbHNoXCIsXCJDeW1yYWVnXCJdLGRhOltcIkRhbmlzaFwiLFwiRGFuc2tcIl0sZGU6W1wiR2VybWFuXCIsXCJEZXV0c2NoXCJdLGR2OltcIkRpdmVoaVwiLFwi3oveqN6I3qzegN6o3oTept6Q3rBcIl0sZHo6W1wiRHpvbmdraGFcIixcIuC9h+C9vOC9hOC8i+C9gVwiXSxlZTpbXCJFd2VcIixcIsaQyovJm1wiXSxlbDpbXCJHcmVla1wiLFwizpXOu867zrfOvc65zrrOrFwiXSxlbjpbXCJFbmdsaXNoXCIsXCJFbmdsaXNoXCJdLGVvOltcIkVzcGVyYW50b1wiLFwiRXNwZXJhbnRvXCJdLGVzOltcIlNwYW5pc2hcIixcIkVzcGHDsW9sXCJdLGV0OltcIkVzdG9uaWFuXCIsXCJFZXN0aVwiXSxldTpbXCJCYXNxdWVcIixcIkV1c2thcmFcIl0sZmE6W1wiUGVyc2lhblwiLFwi2YHYp9ix2LPbjFwiXSxmZjpbXCJQZXVsXCIsXCJGdWxmdWxkZVwiXSxmaTpbXCJGaW5uaXNoXCIsXCJTdW9taVwiXSxmajpbXCJGaWppYW5cIixcIk5hIFZvc2EgVmFrYXZpdGlcIl0sZm86W1wiRmFyb2VzZVwiLFwiRsO4cm95c2t0XCJdLGZyOltcIkZyZW5jaFwiLFwiRnJhbsOnYWlzXCJdLGZ5OltcIldlc3QgRnJpc2lhblwiLFwiRnJ5c2tcIl0sZ2E6W1wiSXJpc2hcIixcIkdhZWlsZ2VcIl0sZ2Q6W1wiU2NvdHRpc2ggR2FlbGljXCIsXCJHw6BpZGhsaWdcIl0sZ2w6W1wiR2FsaWNpYW5cIixcIkdhbGVnb1wiXSxnbjpbXCJHdWFyYW5pXCIsXCJBdmHDsWUn4bq9XCJdLGd1OltcIkd1amFyYXRpXCIsXCLgqpfgq4HgqpzgqrDgqr7gqqTgq4BcIl0sZ3Y6W1wiTWFueFwiLFwiR2FlbGdcIl0saGE6W1wiSGF1c2FcIixcItmH2Y7ZiNmP2LPZjlwiXSxoZTpbXCJIZWJyZXdcIixcItei15HXqNeZ16pcIl0saGk6W1wiSGluZGlcIixcIuCkueCkv+CkqOCljeCkpuClgFwiXSxobzpbXCJIaXJpIE1vdHVcIixcIkhpcmkgTW90dVwiXSxocjpbXCJDcm9hdGlhblwiLFwiSHJ2YXRza2lcIl0saHQ6W1wiSGFpdGlhblwiLFwiS3LDqHlvbCBheWlzeWVuXCJdLGh1OltcIkh1bmdhcmlhblwiLFwiTWFneWFyXCJdLGh5OltcIkFybWVuaWFuXCIsXCLVgNWh1bXVpdaA1aXVtlwiXSxoejpbXCJIZXJlcm9cIixcIk90c2loZXJlcm9cIl0saWE6W1wiSW50ZXJsaW5ndWFcIixcIkludGVybGluZ3VhXCJdLGlkOltcIkluZG9uZXNpYW5cIixcIkJhaGFzYSBJbmRvbmVzaWFcIl0saWU6W1wiSW50ZXJsaW5ndWVcIixcIkludGVybGluZ3VlXCJdLGlnOltcIklnYm9cIixcIklnYm9cIl0saWk6W1wiU2ljaHVhbiBZaVwiLFwi6oaH6omZIC8g5Zub5bed5b2d6K+tXCJdLGlrOltcIkludXBpYWtcIixcIknDsXVwaWFrXCJdLGlvOltcIklkb1wiLFwiSWRvXCJdLGlzOltcIkljZWxhbmRpY1wiLFwiw41zbGVuc2thXCJdLGl0OltcIkl0YWxpYW5cIixcIkl0YWxpYW5vXCJdLGl1OltcIkludWt0aXR1dFwiLFwi4ZCD4ZOE4ZKD4ZGO4ZGQ4ZGmXCJdLGphOltcIkphcGFuZXNlXCIsXCLml6XmnKzoqp5cIl0sanY6W1wiSmF2YW5lc2VcIixcIkJhc2EgSmF3YVwiXSxrYTpbXCJHZW9yZ2lhblwiLFwi4YOl4YOQ4YOg4YOX4YOj4YOa4YOYXCJdLGtnOltcIktvbmdvXCIsXCJLaUtvbmdvXCJdLGtpOltcIktpa3V5dVwiLFwiR8Spa8WpecWpXCJdLGtqOltcIkt1YW55YW1hXCIsXCJLdWFueWFtYVwiXSxrazpbXCJLYXpha2hcIixcItKa0LDQt9Cw0pvRiNCwXCJdLGtsOltcIkdyZWVubGFuZGljXCIsXCJLYWxhYWxsaXN1dFwiXSxrbTpbXCJDYW1ib2RpYW5cIixcIuGel+GetuGen+GetuGegeGfkuGemOGfguGemlwiXSxrbjpbXCJLYW5uYWRhXCIsXCLgspXgsqjgs43gsqjgsqFcIl0sa286W1wiS29yZWFuXCIsXCLtlZzqta3slrRcIl0sa3I6W1wiS2FudXJpXCIsXCJLYW51cmlcIl0sa3M6W1wiS2FzaG1pcmlcIixcIuCkleCktuCljeCkruClgOCksOClgCAvINmD2LTZhdmK2LHZilwiXSxrdTpbXCJLdXJkaXNoXCIsXCJLdXJkw64gLyDZg9mI2LHYr9uMXCJdLGt2OltcIktvbWlcIixcItCa0L7QvNC4XCJdLGt3OltcIkNvcm5pc2hcIixcIktlcm5ld2VrXCJdLGt5OltcIktpcmdoaXpcIixcIkvEsXJnxLF6Y2EgLyDQmtGL0YDQs9GL0LfRh9CwXCJdLGxhOltcIkxhdGluXCIsXCJMYXRpbmFcIl0sbGI6W1wiTHV4ZW1ib3VyZ2lzaFwiLFwiTMOrdHplYnVlcmdlc2NoXCJdLGxnOltcIkdhbmRhXCIsXCJMdWdhbmRhXCJdLGxpOltcIkxpbWJ1cmdpYW5cIixcIkxpbWJ1cmdzXCJdLGxuOltcIkxpbmdhbGFcIixcIkxpbmfDoWxhXCJdLGxvOltcIkxhb3RpYW5cIixcIuC6peC6suC6pyAvIFBoYSB4YSBsYW9cIl0sbHQ6W1wiTGl0aHVhbmlhblwiLFwiTGlldHV2acWzXCJdLGx2OltcIkxhdHZpYW5cIixcIkxhdHZpZcWhdVwiXSxtZzpbXCJNYWxhZ2FzeVwiLFwiTWFsYWdhc3lcIl0sbWg6W1wiTWFyc2hhbGxlc2VcIixcIkthamluIE1hamVsIC8gRWJvblwiXSxtaTpbXCJNYW9yaVwiLFwiTcSBb3JpXCJdLG1rOltcIk1hY2Vkb25pYW5cIixcItCc0LDQutC10LTQvtC90YHQutC4XCJdLG1sOltcIk1hbGF5YWxhbVwiLFwi4LSu4LSy4LSv4LS+4LSz4LSCXCJdLG1uOltcIk1vbmdvbGlhblwiLFwi0JzQvtC90LPQvtC7XCJdLG1vOltcIk1vbGRvdmFuXCIsXCJNb2xkb3ZlbmVhc2PEg1wiXSxtcjpbXCJNYXJhdGhpXCIsXCLgpK7gpLDgpL7gpKDgpYBcIl0sbXM6W1wiTWFsYXlcIixcIkJhaGFzYSBNZWxheXVcIl0sbXQ6W1wiTWFsdGVzZVwiLFwiYmlsLU1hbHRpXCJdLG15OltcIkJ1cm1lc2VcIixcIk15YW5tYXNhXCJdLG5hOltcIk5hdXJ1YW5cIixcIkRvcmVyaW4gTmFvZXJvXCJdLG5kOltcIk5vcnRoIE5kZWJlbGVcIixcIlNpbmRlYmVsZVwiXSxuZTpbXCJOZXBhbGlcIixcIuCkqOClh+CkquCkvuCksuClgFwiXSxuZzpbXCJOZG9uZ2FcIixcIk9zaGl3YW1ib1wiXSxubDpbXCJEdXRjaFwiLFwiTmVkZXJsYW5kc1wiXSxubjpbXCJOb3J3ZWdpYW4gTnlub3Jza1wiLFwiTm9yc2sgKG55bm9yc2spXCJdLG5vOltcIk5vcndlZ2lhblwiLFwiTm9yc2sgKGJva23DpWwgLyByaWtzbcOlbClcIl0sbnI6W1wiU291dGggTmRlYmVsZVwiLFwiaXNpTmRlYmVsZVwiXSxudjpbXCJOYXZham9cIixcIkRpbsOpIGJpemFhZFwiXSxueTpbXCJDaGljaGV3YVwiLFwiQ2hpLUNoZXdhXCJdLG9jOltcIk9jY2l0YW5cIixcIk9jY2l0YW5cIl0sb2o6W1wiT2ppYndhXCIsXCLhkIrhk4LhlJHhk4jhkK/hkqfhkI7hk5AgLyBBbmlzaGluYWFiZW1vd2luXCJdLG9tOltcIk9yb21vXCIsXCJPcm9tb29cIl0sb3I6W1wiT3JpeWFcIixcIuCsk+CsoeCsvOCsv+CshlwiXSxvczpbXCJPc3NldGlhbiAvIE9zc2V0aWNcIixcItCY0YDQvtC90LDRg1wiXSxwYTpbXCJQYW5qYWJpIC8gUHVuamFiaVwiLFwi4Kiq4Kmw4Kic4Ki+4Kis4KmAIC8g4KSq4KSC4KSc4KS+4KSs4KWAIC8g2b7Zhtis2KfYqNmKXCJdLHBpOltcIlBhbGlcIixcIlDEgWxpIC8g4KSq4KS+4KS04KS/XCJdLHBsOltcIlBvbGlzaFwiLFwiUG9sc2tpXCJdLHBzOltcIlBhc2h0b1wiLFwi2b7amtiq2YhcIl0scHQ6W1wiUG9ydHVndWVzZVwiLFwiUG9ydHVndcOqc1wiXSxxdTpbXCJRdWVjaHVhXCIsXCJSdW5hIFNpbWlcIl0scm06W1wiUmFldG8gUm9tYW5jZVwiLFwiUnVtYW50c2NoXCJdLHJuOltcIktpcnVuZGlcIixcIktpcnVuZGlcIl0scm86W1wiUm9tYW5pYW5cIixcIlJvbcOibsSDXCJdLHJ1OltcIlJ1c3NpYW5cIixcItCg0YPRgdGB0LrQuNC5XCJdLHJ3OltcIlJ3YW5kaVwiLFwiS2lueWFyd2FuZGlcIl0sc2E6W1wiU2Fuc2tyaXRcIixcIuCkuOCkguCkuOCljeCkleClg+CkpOCkruCljVwiXSxzYzpbXCJTYXJkaW5pYW5cIixcIlNhcmR1XCJdLHNkOltcIlNpbmRoaVwiLFwi4KS44KS/4KSo4KSn4KS/XCJdLHNlOltcIk5vcnRoZXJuIFNhbWlcIixcIlPDoW1lZ2llbGxhXCJdLHNnOltcIlNhbmdvXCIsXCJTw6RuZ8O2XCJdLHNoOltcIlNlcmJvLUNyb2F0aWFuXCIsXCJTcnBza29ocnZhdHNraSAvINCh0YDQv9GB0LrQvtGF0YDQstCw0YLRgdC60LhcIl0sc2k6W1wiU2luaGFsZXNlXCIsXCLgt4Pgt5LgtoLgt4Tgtr1cIl0sc2s6W1wiU2xvdmFrXCIsXCJTbG92ZW7EjWluYVwiXSxzbDpbXCJTbG92ZW5pYW5cIixcIlNsb3ZlbsWhxI1pbmFcIl0sc206W1wiU2Ftb2FuXCIsXCJHYWdhbmEgU2Ftb2FcIl0sc246W1wiU2hvbmFcIixcImNoaVNob25hXCJdLHNvOltcIlNvbWFsaWFcIixcIlNvb21hYWxpZ2FcIl0sc3E6W1wiQWxiYW5pYW5cIixcIlNocWlwXCJdLHNyOltcIlNlcmJpYW5cIixcItCh0YDQv9GB0LrQuFwiXSxzczpbXCJTd2F0aVwiLFwiU2lTd2F0aVwiXSxzdDpbXCJTb3V0aGVybiBTb3Rob1wiLFwiU2Vzb3Rob1wiXSxzdTpbXCJTdW5kYW5lc2VcIixcIkJhc2EgU3VuZGFcIl0sc3Y6W1wiU3dlZGlzaFwiLFwiU3ZlbnNrYVwiXSxzdzpbXCJTd2FoaWxpXCIsXCJLaXN3YWhpbGlcIl0sdGE6W1wiVGFtaWxcIixcIuCupOCuruCuv+CutOCvjVwiXSx0ZTpbXCJUZWx1Z3VcIixcIuCwpOCxhuCwsuCxgeCwl+CxgVwiXSx0ZzpbXCJUYWppa1wiLFwi0KLQvtK30LjQutOjXCJdLHRoOltcIlRoYWlcIixcIuC5hOC4l+C4oiAvIFBoYXNhIFRoYWlcIl0sdGk6W1wiVGlncmlueWFcIixcIuGJteGMjeGIreGKm1wiXSx0azpbXCJUdXJrbWVuXCIsXCLQotGD0YDQutC80LXQvSAvINiq2LHZg9mF2YZcIl0sdGw6W1wiVGFnYWxvZyAvIEZpbGlwaW5vXCIsXCJUYWdhbG9nXCJdLHRuOltcIlRzd2FuYVwiLFwiU2V0c3dhbmFcIl0sdG86W1wiVG9uZ2FcIixcIkxlYSBGYWthLVRvbmdhXCJdLHRyOltcIlR1cmtpc2hcIixcIlTDvHJrw6dlXCJdLHRzOltcIlRzb25nYVwiLFwiWGl0c29uZ2FcIl0sdHQ6W1wiVGF0YXJcIixcIlRhdGFyw6dhXCJdLHR3OltcIlR3aVwiLFwiVHdpXCJdLHR5OltcIlRhaGl0aWFuXCIsXCJSZW8gTcSBYG9oaVwiXSx1ZzpbXCJVeWdodXJcIixcIlV5xqN1cnHJmSAvINim24fZiti624fYsdqG25VcIl0sdWs6W1wiVWtyYWluaWFuXCIsXCLQo9C60YDQsNGX0L3RgdGM0LrQsFwiXSx1cjpbXCJVcmR1XCIsXCLYp9ix2K/ZiFwiXSx1ejpbXCJVemJla1wiLFwi0I7Qt9Cx0LXQulwiXSx2ZTpbXCJWZW5kYVwiLFwiVHNoaXZlbuG4k2FcIl0sdmk6W1wiVmlldG5hbWVzZVwiLFwiVGnhur9uZyBWaeG7h3RcIl0sdm86W1wiVm9sYXDDvGtcIixcIlZvbGFww7xrXCJdLHdhOltcIldhbGxvb25cIixcIldhbG9uXCJdLHdvOltcIldvbG9mXCIsXCJXb2xsb2ZcIl0seGg6W1wiWGhvc2FcIixcImlzaVhob3NhXCJdLHlpOltcIllpZGRpc2hcIixcIteZ15nWtNeT15nXqVwiXSx5bzpbXCJZb3J1YmFcIixcIllvcsO5YsOhXCJdLHphOltcIlpodWFuZ1wiLFwiQ3VlbmdoIC8gVMO0w7QgLyDlo67or61cIl0semg6W1wiQ2hpbmVzZVwiLFwi5Lit5paHXCJdLHp1OltcIlp1bHVcIixcImlzaVp1bHVcIl19fTt2YXIgZ2V0TGFuZ0RpcmVjdGlvbj1mdW5jdGlvbihsYW5nY29kZSl7cmV0dXJuIGxhbmdzLnJ0bFtsYW5nY29kZV0/XCJydGxcIjpcImx0clwifTtleHBvcnRzLmlzVmFsaWQ9ZnVuY3Rpb24obGFuZ2NvZGUpe3JldHVybiBsYW5ncy5sYW5nLmhhc093blByb3BlcnR5KGxhbmdjb2RlKX07ZXhwb3J0cy5nZXRBbGxMYW5ndWFnZUNvZGU9ZnVuY3Rpb24oKXt2YXIgcmVzdWx0PVtdO2ZvcihsYW5nY29kZSBpbiBsYW5ncy5sYW5nKXtyZXN1bHQucHVzaChsYW5nY29kZSl9cmV0dXJuIHJlc3VsdH07ZXhwb3J0cy5nZXRMYW5ndWFnZUluZm89ZnVuY3Rpb24obGFuZ2NvZGUpe3ZhciByZXN1bHQ9e307aWYoZXhwb3J0cy5pc1ZhbGlkKGxhbmdjb2RlKSl7dmFyIGxhbmc9bGFuZ3MubGFuZ1tsYW5nY29kZV07cmVzdWx0W1wibmFtZVwiXT1sYW5nWzBdO3Jlc3VsdFtcIm5hdGl2ZU5hbWVcIl09bGFuZ1sxXTtyZXN1bHRbXCJkaXJlY3Rpb25cIl09Z2V0TGFuZ0RpcmVjdGlvbihsYW5nY29kZSl9cmV0dXJuIHJlc3VsdH19KSh0eXBlb2YgZXhwb3J0cz09PVwidW5kZWZpbmVkXCI/dGhpc1tcImxhbmd1YWdlc1wiXT17fTpleHBvcnRzKTtcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCIvKipcbiAqIFJvb3QgcmVmZXJlbmNlIGZvciBpZnJhbWVzLlxuICovXG5cbnZhciByb290O1xuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7IC8vIEJyb3dzZXIgd2luZG93XG4gIHJvb3QgPSB3aW5kb3c7XG59IGVsc2UgaWYgKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJykgeyAvLyBXZWIgV29ya2VyXG4gIHJvb3QgPSBzZWxmO1xufSBlbHNlIHsgLy8gT3RoZXIgZW52aXJvbm1lbnRzXG4gIGNvbnNvbGUud2FybihcIlVzaW5nIGJyb3dzZXItb25seSB2ZXJzaW9uIG9mIHN1cGVyYWdlbnQgaW4gbm9uLWJyb3dzZXIgZW52aXJvbm1lbnRcIik7XG4gIHJvb3QgPSB0aGlzO1xufVxuXG52YXIgRW1pdHRlciA9IHJlcXVpcmUoJ2NvbXBvbmVudC1lbWl0dGVyJyk7XG52YXIgUmVxdWVzdEJhc2UgPSByZXF1aXJlKCcuL3JlcXVlc3QtYmFzZScpO1xudmFyIGlzT2JqZWN0ID0gcmVxdWlyZSgnLi9pcy1vYmplY3QnKTtcbnZhciBpc0Z1bmN0aW9uID0gcmVxdWlyZSgnLi9pcy1mdW5jdGlvbicpO1xudmFyIFJlc3BvbnNlQmFzZSA9IHJlcXVpcmUoJy4vcmVzcG9uc2UtYmFzZScpO1xudmFyIHNob3VsZFJldHJ5ID0gcmVxdWlyZSgnLi9zaG91bGQtcmV0cnknKTtcblxuLyoqXG4gKiBOb29wLlxuICovXG5cbmZ1bmN0aW9uIG5vb3AoKXt9O1xuXG4vKipcbiAqIEV4cG9zZSBgcmVxdWVzdGAuXG4gKi9cblxudmFyIHJlcXVlc3QgPSBleHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihtZXRob2QsIHVybCkge1xuICAvLyBjYWxsYmFja1xuICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgdXJsKSB7XG4gICAgcmV0dXJuIG5ldyBleHBvcnRzLlJlcXVlc3QoJ0dFVCcsIG1ldGhvZCkuZW5kKHVybCk7XG4gIH1cblxuICAvLyB1cmwgZmlyc3RcbiAgaWYgKDEgPT0gYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIHJldHVybiBuZXcgZXhwb3J0cy5SZXF1ZXN0KCdHRVQnLCBtZXRob2QpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBleHBvcnRzLlJlcXVlc3QobWV0aG9kLCB1cmwpO1xufVxuXG5leHBvcnRzLlJlcXVlc3QgPSBSZXF1ZXN0O1xuXG4vKipcbiAqIERldGVybWluZSBYSFIuXG4gKi9cblxucmVxdWVzdC5nZXRYSFIgPSBmdW5jdGlvbiAoKSB7XG4gIGlmIChyb290LlhNTEh0dHBSZXF1ZXN0XG4gICAgICAmJiAoIXJvb3QubG9jYXRpb24gfHwgJ2ZpbGU6JyAhPSByb290LmxvY2F0aW9uLnByb3RvY29sXG4gICAgICAgICAgfHwgIXJvb3QuQWN0aXZlWE9iamVjdCkpIHtcbiAgICByZXR1cm4gbmV3IFhNTEh0dHBSZXF1ZXN0O1xuICB9IGVsc2Uge1xuICAgIHRyeSB7IHJldHVybiBuZXcgQWN0aXZlWE9iamVjdCgnTWljcm9zb2Z0LlhNTEhUVFAnKTsgfSBjYXRjaChlKSB7fVxuICAgIHRyeSB7IHJldHVybiBuZXcgQWN0aXZlWE9iamVjdCgnTXN4bWwyLlhNTEhUVFAuNi4wJyk7IH0gY2F0Y2goZSkge31cbiAgICB0cnkgeyByZXR1cm4gbmV3IEFjdGl2ZVhPYmplY3QoJ01zeG1sMi5YTUxIVFRQLjMuMCcpOyB9IGNhdGNoKGUpIHt9XG4gICAgdHJ5IHsgcmV0dXJuIG5ldyBBY3RpdmVYT2JqZWN0KCdNc3htbDIuWE1MSFRUUCcpOyB9IGNhdGNoKGUpIHt9XG4gIH1cbiAgdGhyb3cgRXJyb3IoXCJCcm93c2VyLW9ubHkgdmVyaXNvbiBvZiBzdXBlcmFnZW50IGNvdWxkIG5vdCBmaW5kIFhIUlwiKTtcbn07XG5cbi8qKlxuICogUmVtb3ZlcyBsZWFkaW5nIGFuZCB0cmFpbGluZyB3aGl0ZXNwYWNlLCBhZGRlZCB0byBzdXBwb3J0IElFLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG52YXIgdHJpbSA9ICcnLnRyaW1cbiAgPyBmdW5jdGlvbihzKSB7IHJldHVybiBzLnRyaW0oKTsgfVxuICA6IGZ1bmN0aW9uKHMpIHsgcmV0dXJuIHMucmVwbGFjZSgvKF5cXHMqfFxccyokKS9nLCAnJyk7IH07XG5cbi8qKlxuICogU2VyaWFsaXplIHRoZSBnaXZlbiBgb2JqYC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBzZXJpYWxpemUob2JqKSB7XG4gIGlmICghaXNPYmplY3Qob2JqKSkgcmV0dXJuIG9iajtcbiAgdmFyIHBhaXJzID0gW107XG4gIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICBwdXNoRW5jb2RlZEtleVZhbHVlUGFpcihwYWlycywga2V5LCBvYmpba2V5XSk7XG4gIH1cbiAgcmV0dXJuIHBhaXJzLmpvaW4oJyYnKTtcbn1cblxuLyoqXG4gKiBIZWxwcyAnc2VyaWFsaXplJyB3aXRoIHNlcmlhbGl6aW5nIGFycmF5cy5cbiAqIE11dGF0ZXMgdGhlIHBhaXJzIGFycmF5LlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHBhaXJzXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge01peGVkfSB2YWxcbiAqL1xuXG5mdW5jdGlvbiBwdXNoRW5jb2RlZEtleVZhbHVlUGFpcihwYWlycywga2V5LCB2YWwpIHtcbiAgaWYgKHZhbCAhPSBudWxsKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgdmFsLmZvckVhY2goZnVuY3Rpb24odikge1xuICAgICAgICBwdXNoRW5jb2RlZEtleVZhbHVlUGFpcihwYWlycywga2V5LCB2KTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoaXNPYmplY3QodmFsKSkge1xuICAgICAgZm9yKHZhciBzdWJrZXkgaW4gdmFsKSB7XG4gICAgICAgIHB1c2hFbmNvZGVkS2V5VmFsdWVQYWlyKHBhaXJzLCBrZXkgKyAnWycgKyBzdWJrZXkgKyAnXScsIHZhbFtzdWJrZXldKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcGFpcnMucHVzaChlbmNvZGVVUklDb21wb25lbnQoa2V5KVxuICAgICAgICArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudCh2YWwpKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAodmFsID09PSBudWxsKSB7XG4gICAgcGFpcnMucHVzaChlbmNvZGVVUklDb21wb25lbnQoa2V5KSk7XG4gIH1cbn1cblxuLyoqXG4gKiBFeHBvc2Ugc2VyaWFsaXphdGlvbiBtZXRob2QuXG4gKi9cblxuIHJlcXVlc3Quc2VyaWFsaXplT2JqZWN0ID0gc2VyaWFsaXplO1xuXG4gLyoqXG4gICogUGFyc2UgdGhlIGdpdmVuIHgtd3d3LWZvcm0tdXJsZW5jb2RlZCBgc3RyYC5cbiAgKlxuICAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAgKiBAcmV0dXJuIHtPYmplY3R9XG4gICogQGFwaSBwcml2YXRlXG4gICovXG5cbmZ1bmN0aW9uIHBhcnNlU3RyaW5nKHN0cikge1xuICB2YXIgb2JqID0ge307XG4gIHZhciBwYWlycyA9IHN0ci5zcGxpdCgnJicpO1xuICB2YXIgcGFpcjtcbiAgdmFyIHBvcztcblxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gcGFpcnMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICBwYWlyID0gcGFpcnNbaV07XG4gICAgcG9zID0gcGFpci5pbmRleE9mKCc9Jyk7XG4gICAgaWYgKHBvcyA9PSAtMSkge1xuICAgICAgb2JqW2RlY29kZVVSSUNvbXBvbmVudChwYWlyKV0gPSAnJztcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqW2RlY29kZVVSSUNvbXBvbmVudChwYWlyLnNsaWNlKDAsIHBvcykpXSA9XG4gICAgICAgIGRlY29kZVVSSUNvbXBvbmVudChwYWlyLnNsaWNlKHBvcyArIDEpKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gb2JqO1xufVxuXG4vKipcbiAqIEV4cG9zZSBwYXJzZXIuXG4gKi9cblxucmVxdWVzdC5wYXJzZVN0cmluZyA9IHBhcnNlU3RyaW5nO1xuXG4vKipcbiAqIERlZmF1bHQgTUlNRSB0eXBlIG1hcC5cbiAqXG4gKiAgICAgc3VwZXJhZ2VudC50eXBlcy54bWwgPSAnYXBwbGljYXRpb24veG1sJztcbiAqXG4gKi9cblxucmVxdWVzdC50eXBlcyA9IHtcbiAgaHRtbDogJ3RleHQvaHRtbCcsXG4gIGpzb246ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgeG1sOiAnYXBwbGljYXRpb24veG1sJyxcbiAgdXJsZW5jb2RlZDogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcsXG4gICdmb3JtJzogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcsXG4gICdmb3JtLWRhdGEnOiAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJ1xufTtcblxuLyoqXG4gKiBEZWZhdWx0IHNlcmlhbGl6YXRpb24gbWFwLlxuICpcbiAqICAgICBzdXBlcmFnZW50LnNlcmlhbGl6ZVsnYXBwbGljYXRpb24veG1sJ10gPSBmdW5jdGlvbihvYmope1xuICogICAgICAgcmV0dXJuICdnZW5lcmF0ZWQgeG1sIGhlcmUnO1xuICogICAgIH07XG4gKlxuICovXG5cbiByZXF1ZXN0LnNlcmlhbGl6ZSA9IHtcbiAgICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnOiBzZXJpYWxpemUsXG4gICAnYXBwbGljYXRpb24vanNvbic6IEpTT04uc3RyaW5naWZ5XG4gfTtcblxuIC8qKlxuICAqIERlZmF1bHQgcGFyc2Vycy5cbiAgKlxuICAqICAgICBzdXBlcmFnZW50LnBhcnNlWydhcHBsaWNhdGlvbi94bWwnXSA9IGZ1bmN0aW9uKHN0cil7XG4gICogICAgICAgcmV0dXJuIHsgb2JqZWN0IHBhcnNlZCBmcm9tIHN0ciB9O1xuICAqICAgICB9O1xuICAqXG4gICovXG5cbnJlcXVlc3QucGFyc2UgPSB7XG4gICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnOiBwYXJzZVN0cmluZyxcbiAgJ2FwcGxpY2F0aW9uL2pzb24nOiBKU09OLnBhcnNlXG59O1xuXG4vKipcbiAqIFBhcnNlIHRoZSBnaXZlbiBoZWFkZXIgYHN0cmAgaW50b1xuICogYW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG1hcHBlZCBmaWVsZHMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0clxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gcGFyc2VIZWFkZXIoc3RyKSB7XG4gIHZhciBsaW5lcyA9IHN0ci5zcGxpdCgvXFxyP1xcbi8pO1xuICB2YXIgZmllbGRzID0ge307XG4gIHZhciBpbmRleDtcbiAgdmFyIGxpbmU7XG4gIHZhciBmaWVsZDtcbiAgdmFyIHZhbDtcblxuICBsaW5lcy5wb3AoKTsgLy8gdHJhaWxpbmcgQ1JMRlxuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBsaW5lcy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgIGxpbmUgPSBsaW5lc1tpXTtcbiAgICBpbmRleCA9IGxpbmUuaW5kZXhPZignOicpO1xuICAgIGZpZWxkID0gbGluZS5zbGljZSgwLCBpbmRleCkudG9Mb3dlckNhc2UoKTtcbiAgICB2YWwgPSB0cmltKGxpbmUuc2xpY2UoaW5kZXggKyAxKSk7XG4gICAgZmllbGRzW2ZpZWxkXSA9IHZhbDtcbiAgfVxuXG4gIHJldHVybiBmaWVsZHM7XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgYG1pbWVgIGlzIGpzb24gb3IgaGFzICtqc29uIHN0cnVjdHVyZWQgc3ludGF4IHN1ZmZpeC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbWltZVxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIGlzSlNPTihtaW1lKSB7XG4gIHJldHVybiAvW1xcLytdanNvblxcYi8udGVzdChtaW1lKTtcbn1cblxuLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IGBSZXNwb25zZWAgd2l0aCB0aGUgZ2l2ZW4gYHhocmAuXG4gKlxuICogIC0gc2V0IGZsYWdzICgub2ssIC5lcnJvciwgZXRjKVxuICogIC0gcGFyc2UgaGVhZGVyXG4gKlxuICogRXhhbXBsZXM6XG4gKlxuICogIEFsaWFzaW5nIGBzdXBlcmFnZW50YCBhcyBgcmVxdWVzdGAgaXMgbmljZTpcbiAqXG4gKiAgICAgIHJlcXVlc3QgPSBzdXBlcmFnZW50O1xuICpcbiAqICBXZSBjYW4gdXNlIHRoZSBwcm9taXNlLWxpa2UgQVBJLCBvciBwYXNzIGNhbGxiYWNrczpcbiAqXG4gKiAgICAgIHJlcXVlc3QuZ2V0KCcvJykuZW5kKGZ1bmN0aW9uKHJlcyl7fSk7XG4gKiAgICAgIHJlcXVlc3QuZ2V0KCcvJywgZnVuY3Rpb24ocmVzKXt9KTtcbiAqXG4gKiAgU2VuZGluZyBkYXRhIGNhbiBiZSBjaGFpbmVkOlxuICpcbiAqICAgICAgcmVxdWVzdFxuICogICAgICAgIC5wb3N0KCcvdXNlcicpXG4gKiAgICAgICAgLnNlbmQoeyBuYW1lOiAndGonIH0pXG4gKiAgICAgICAgLmVuZChmdW5jdGlvbihyZXMpe30pO1xuICpcbiAqICBPciBwYXNzZWQgdG8gYC5zZW5kKClgOlxuICpcbiAqICAgICAgcmVxdWVzdFxuICogICAgICAgIC5wb3N0KCcvdXNlcicpXG4gKiAgICAgICAgLnNlbmQoeyBuYW1lOiAndGonIH0sIGZ1bmN0aW9uKHJlcyl7fSk7XG4gKlxuICogIE9yIHBhc3NlZCB0byBgLnBvc3QoKWA6XG4gKlxuICogICAgICByZXF1ZXN0XG4gKiAgICAgICAgLnBvc3QoJy91c2VyJywgeyBuYW1lOiAndGonIH0pXG4gKiAgICAgICAgLmVuZChmdW5jdGlvbihyZXMpe30pO1xuICpcbiAqIE9yIGZ1cnRoZXIgcmVkdWNlZCB0byBhIHNpbmdsZSBjYWxsIGZvciBzaW1wbGUgY2FzZXM6XG4gKlxuICogICAgICByZXF1ZXN0XG4gKiAgICAgICAgLnBvc3QoJy91c2VyJywgeyBuYW1lOiAndGonIH0sIGZ1bmN0aW9uKHJlcyl7fSk7XG4gKlxuICogQHBhcmFtIHtYTUxIVFRQUmVxdWVzdH0geGhyXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gUmVzcG9uc2UocmVxKSB7XG4gIHRoaXMucmVxID0gcmVxO1xuICB0aGlzLnhociA9IHRoaXMucmVxLnhocjtcbiAgLy8gcmVzcG9uc2VUZXh0IGlzIGFjY2Vzc2libGUgb25seSBpZiByZXNwb25zZVR5cGUgaXMgJycgb3IgJ3RleHQnIGFuZCBvbiBvbGRlciBicm93c2Vyc1xuICB0aGlzLnRleHQgPSAoKHRoaXMucmVxLm1ldGhvZCAhPSdIRUFEJyAmJiAodGhpcy54aHIucmVzcG9uc2VUeXBlID09PSAnJyB8fCB0aGlzLnhoci5yZXNwb25zZVR5cGUgPT09ICd0ZXh0JykpIHx8IHR5cGVvZiB0aGlzLnhoci5yZXNwb25zZVR5cGUgPT09ICd1bmRlZmluZWQnKVxuICAgICA/IHRoaXMueGhyLnJlc3BvbnNlVGV4dFxuICAgICA6IG51bGw7XG4gIHRoaXMuc3RhdHVzVGV4dCA9IHRoaXMucmVxLnhoci5zdGF0dXNUZXh0O1xuICB2YXIgc3RhdHVzID0gdGhpcy54aHIuc3RhdHVzO1xuICAvLyBoYW5kbGUgSUU5IGJ1ZzogaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMDA0Njk3Mi9tc2llLXJldHVybnMtc3RhdHVzLWNvZGUtb2YtMTIyMy1mb3ItYWpheC1yZXF1ZXN0XG4gIGlmIChzdGF0dXMgPT09IDEyMjMpIHtcbiAgICAgIHN0YXR1cyA9IDIwNDtcbiAgfVxuICB0aGlzLl9zZXRTdGF0dXNQcm9wZXJ0aWVzKHN0YXR1cyk7XG4gIHRoaXMuaGVhZGVyID0gdGhpcy5oZWFkZXJzID0gcGFyc2VIZWFkZXIodGhpcy54aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkpO1xuICAvLyBnZXRBbGxSZXNwb25zZUhlYWRlcnMgc29tZXRpbWVzIGZhbHNlbHkgcmV0dXJucyBcIlwiIGZvciBDT1JTIHJlcXVlc3RzLCBidXRcbiAgLy8gZ2V0UmVzcG9uc2VIZWFkZXIgc3RpbGwgd29ya3MuIHNvIHdlIGdldCBjb250ZW50LXR5cGUgZXZlbiBpZiBnZXR0aW5nXG4gIC8vIG90aGVyIGhlYWRlcnMgZmFpbHMuXG4gIHRoaXMuaGVhZGVyWydjb250ZW50LXR5cGUnXSA9IHRoaXMueGhyLmdldFJlc3BvbnNlSGVhZGVyKCdjb250ZW50LXR5cGUnKTtcbiAgdGhpcy5fc2V0SGVhZGVyUHJvcGVydGllcyh0aGlzLmhlYWRlcik7XG5cbiAgaWYgKG51bGwgPT09IHRoaXMudGV4dCAmJiByZXEuX3Jlc3BvbnNlVHlwZSkge1xuICAgIHRoaXMuYm9keSA9IHRoaXMueGhyLnJlc3BvbnNlO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuYm9keSA9IHRoaXMucmVxLm1ldGhvZCAhPSAnSEVBRCdcbiAgICAgID8gdGhpcy5fcGFyc2VCb2R5KHRoaXMudGV4dCA/IHRoaXMudGV4dCA6IHRoaXMueGhyLnJlc3BvbnNlKVxuICAgICAgOiBudWxsO1xuICB9XG59XG5cblJlc3BvbnNlQmFzZShSZXNwb25zZS5wcm90b3R5cGUpO1xuXG4vKipcbiAqIFBhcnNlIHRoZSBnaXZlbiBib2R5IGBzdHJgLlxuICpcbiAqIFVzZWQgZm9yIGF1dG8tcGFyc2luZyBvZiBib2RpZXMuIFBhcnNlcnNcbiAqIGFyZSBkZWZpbmVkIG9uIHRoZSBgc3VwZXJhZ2VudC5wYXJzZWAgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge01peGVkfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUmVzcG9uc2UucHJvdG90eXBlLl9wYXJzZUJvZHkgPSBmdW5jdGlvbihzdHIpe1xuICB2YXIgcGFyc2UgPSByZXF1ZXN0LnBhcnNlW3RoaXMudHlwZV07XG4gIGlmKHRoaXMucmVxLl9wYXJzZXIpIHtcbiAgICByZXR1cm4gdGhpcy5yZXEuX3BhcnNlcih0aGlzLCBzdHIpO1xuICB9XG4gIGlmICghcGFyc2UgJiYgaXNKU09OKHRoaXMudHlwZSkpIHtcbiAgICBwYXJzZSA9IHJlcXVlc3QucGFyc2VbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgfVxuICByZXR1cm4gcGFyc2UgJiYgc3RyICYmIChzdHIubGVuZ3RoIHx8IHN0ciBpbnN0YW5jZW9mIE9iamVjdClcbiAgICA/IHBhcnNlKHN0cilcbiAgICA6IG51bGw7XG59O1xuXG4vKipcbiAqIFJldHVybiBhbiBgRXJyb3JgIHJlcHJlc2VudGF0aXZlIG9mIHRoaXMgcmVzcG9uc2UuXG4gKlxuICogQHJldHVybiB7RXJyb3J9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlc3BvbnNlLnByb3RvdHlwZS50b0Vycm9yID0gZnVuY3Rpb24oKXtcbiAgdmFyIHJlcSA9IHRoaXMucmVxO1xuICB2YXIgbWV0aG9kID0gcmVxLm1ldGhvZDtcbiAgdmFyIHVybCA9IHJlcS51cmw7XG5cbiAgdmFyIG1zZyA9ICdjYW5ub3QgJyArIG1ldGhvZCArICcgJyArIHVybCArICcgKCcgKyB0aGlzLnN0YXR1cyArICcpJztcbiAgdmFyIGVyciA9IG5ldyBFcnJvcihtc2cpO1xuICBlcnIuc3RhdHVzID0gdGhpcy5zdGF0dXM7XG4gIGVyci5tZXRob2QgPSBtZXRob2Q7XG4gIGVyci51cmwgPSB1cmw7XG5cbiAgcmV0dXJuIGVycjtcbn07XG5cbi8qKlxuICogRXhwb3NlIGBSZXNwb25zZWAuXG4gKi9cblxucmVxdWVzdC5SZXNwb25zZSA9IFJlc3BvbnNlO1xuXG4vKipcbiAqIEluaXRpYWxpemUgYSBuZXcgYFJlcXVlc3RgIHdpdGggdGhlIGdpdmVuIGBtZXRob2RgIGFuZCBgdXJsYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbWV0aG9kXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIFJlcXVlc3QobWV0aG9kLCB1cmwpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLl9xdWVyeSA9IHRoaXMuX3F1ZXJ5IHx8IFtdO1xuICB0aGlzLm1ldGhvZCA9IG1ldGhvZDtcbiAgdGhpcy51cmwgPSB1cmw7XG4gIHRoaXMuaGVhZGVyID0ge307IC8vIHByZXNlcnZlcyBoZWFkZXIgbmFtZSBjYXNlXG4gIHRoaXMuX2hlYWRlciA9IHt9OyAvLyBjb2VyY2VzIGhlYWRlciBuYW1lcyB0byBsb3dlcmNhc2VcbiAgdGhpcy5vbignZW5kJywgZnVuY3Rpb24oKXtcbiAgICB2YXIgZXJyID0gbnVsbDtcbiAgICB2YXIgcmVzID0gbnVsbDtcblxuICAgIHRyeSB7XG4gICAgICByZXMgPSBuZXcgUmVzcG9uc2Uoc2VsZik7XG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBlcnIgPSBuZXcgRXJyb3IoJ1BhcnNlciBpcyB1bmFibGUgdG8gcGFyc2UgdGhlIHJlc3BvbnNlJyk7XG4gICAgICBlcnIucGFyc2UgPSB0cnVlO1xuICAgICAgZXJyLm9yaWdpbmFsID0gZTtcbiAgICAgIC8vIGlzc3VlICM2NzU6IHJldHVybiB0aGUgcmF3IHJlc3BvbnNlIGlmIHRoZSByZXNwb25zZSBwYXJzaW5nIGZhaWxzXG4gICAgICBpZiAoc2VsZi54aHIpIHtcbiAgICAgICAgLy8gaWU5IGRvZXNuJ3QgaGF2ZSAncmVzcG9uc2UnIHByb3BlcnR5XG4gICAgICAgIGVyci5yYXdSZXNwb25zZSA9IHR5cGVvZiBzZWxmLnhoci5yZXNwb25zZVR5cGUgPT0gJ3VuZGVmaW5lZCcgPyBzZWxmLnhoci5yZXNwb25zZVRleHQgOiBzZWxmLnhoci5yZXNwb25zZTtcbiAgICAgICAgLy8gaXNzdWUgIzg3NjogcmV0dXJuIHRoZSBodHRwIHN0YXR1cyBjb2RlIGlmIHRoZSByZXNwb25zZSBwYXJzaW5nIGZhaWxzXG4gICAgICAgIGVyci5zdGF0dXMgPSBzZWxmLnhoci5zdGF0dXMgPyBzZWxmLnhoci5zdGF0dXMgOiBudWxsO1xuICAgICAgICBlcnIuc3RhdHVzQ29kZSA9IGVyci5zdGF0dXM7IC8vIGJhY2t3YXJkcy1jb21wYXQgb25seVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXJyLnJhd1Jlc3BvbnNlID0gbnVsbDtcbiAgICAgICAgZXJyLnN0YXR1cyA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzZWxmLmNhbGxiYWNrKGVycik7XG4gICAgfVxuXG4gICAgc2VsZi5lbWl0KCdyZXNwb25zZScsIHJlcyk7XG5cbiAgICB2YXIgbmV3X2VycjtcbiAgICB0cnkge1xuICAgICAgaWYgKCFzZWxmLl9pc1Jlc3BvbnNlT0socmVzKSkge1xuICAgICAgICBuZXdfZXJyID0gbmV3IEVycm9yKHJlcy5zdGF0dXNUZXh0IHx8ICdVbnN1Y2Nlc3NmdWwgSFRUUCByZXNwb25zZScpO1xuICAgICAgICBuZXdfZXJyLm9yaWdpbmFsID0gZXJyO1xuICAgICAgICBuZXdfZXJyLnJlc3BvbnNlID0gcmVzO1xuICAgICAgICBuZXdfZXJyLnN0YXR1cyA9IHJlcy5zdGF0dXM7XG4gICAgICB9XG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBuZXdfZXJyID0gZTsgLy8gIzk4NSB0b3VjaGluZyByZXMgbWF5IGNhdXNlIElOVkFMSURfU1RBVEVfRVJSIG9uIG9sZCBBbmRyb2lkXG4gICAgfVxuXG4gICAgLy8gIzEwMDAgZG9uJ3QgY2F0Y2ggZXJyb3JzIGZyb20gdGhlIGNhbGxiYWNrIHRvIGF2b2lkIGRvdWJsZSBjYWxsaW5nIGl0XG4gICAgaWYgKG5ld19lcnIpIHtcbiAgICAgIHNlbGYuY2FsbGJhY2sobmV3X2VyciwgcmVzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2VsZi5jYWxsYmFjayhudWxsLCByZXMpO1xuICAgIH1cbiAgfSk7XG59XG5cbi8qKlxuICogTWl4aW4gYEVtaXR0ZXJgIGFuZCBgUmVxdWVzdEJhc2VgLlxuICovXG5cbkVtaXR0ZXIoUmVxdWVzdC5wcm90b3R5cGUpO1xuUmVxdWVzdEJhc2UoUmVxdWVzdC5wcm90b3R5cGUpO1xuXG4vKipcbiAqIFNldCBDb250ZW50LVR5cGUgdG8gYHR5cGVgLCBtYXBwaW5nIHZhbHVlcyBmcm9tIGByZXF1ZXN0LnR5cGVzYC5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICAgIHN1cGVyYWdlbnQudHlwZXMueG1sID0gJ2FwcGxpY2F0aW9uL3htbCc7XG4gKlxuICogICAgICByZXF1ZXN0LnBvc3QoJy8nKVxuICogICAgICAgIC50eXBlKCd4bWwnKVxuICogICAgICAgIC5zZW5kKHhtbHN0cmluZylcbiAqICAgICAgICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiAgICAgIHJlcXVlc3QucG9zdCgnLycpXG4gKiAgICAgICAgLnR5cGUoJ2FwcGxpY2F0aW9uL3htbCcpXG4gKiAgICAgICAgLnNlbmQoeG1sc3RyaW5nKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUudHlwZSA9IGZ1bmN0aW9uKHR5cGUpe1xuICB0aGlzLnNldCgnQ29udGVudC1UeXBlJywgcmVxdWVzdC50eXBlc1t0eXBlXSB8fCB0eXBlKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCBBY2NlcHQgdG8gYHR5cGVgLCBtYXBwaW5nIHZhbHVlcyBmcm9tIGByZXF1ZXN0LnR5cGVzYC5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICAgIHN1cGVyYWdlbnQudHlwZXMuanNvbiA9ICdhcHBsaWNhdGlvbi9qc29uJztcbiAqXG4gKiAgICAgIHJlcXVlc3QuZ2V0KCcvYWdlbnQnKVxuICogICAgICAgIC5hY2NlcHQoJ2pzb24nKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqICAgICAgcmVxdWVzdC5nZXQoJy9hZ2VudCcpXG4gKiAgICAgICAgLmFjY2VwdCgnYXBwbGljYXRpb24vanNvbicpXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGFjY2VwdFxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLmFjY2VwdCA9IGZ1bmN0aW9uKHR5cGUpe1xuICB0aGlzLnNldCgnQWNjZXB0JywgcmVxdWVzdC50eXBlc1t0eXBlXSB8fCB0eXBlKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCBBdXRob3JpemF0aW9uIGZpZWxkIHZhbHVlIHdpdGggYHVzZXJgIGFuZCBgcGFzc2AuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVzZXJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFzc10gb3B0aW9uYWwgaW4gY2FzZSBvZiB1c2luZyAnYmVhcmVyJyBhcyB0eXBlXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyB3aXRoICd0eXBlJyBwcm9wZXJ0eSAnYXV0bycsICdiYXNpYycgb3IgJ2JlYXJlcicgKGRlZmF1bHQgJ2Jhc2ljJylcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5hdXRoID0gZnVuY3Rpb24odXNlciwgcGFzcywgb3B0aW9ucyl7XG4gIGlmICh0eXBlb2YgcGFzcyA9PT0gJ29iamVjdCcgJiYgcGFzcyAhPT0gbnVsbCkgeyAvLyBwYXNzIGlzIG9wdGlvbmFsIGFuZCBjYW4gc3Vic3RpdHV0ZSBmb3Igb3B0aW9uc1xuICAgIG9wdGlvbnMgPSBwYXNzO1xuICB9XG4gIGlmICghb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSB7XG4gICAgICB0eXBlOiAnZnVuY3Rpb24nID09PSB0eXBlb2YgYnRvYSA/ICdiYXNpYycgOiAnYXV0bycsXG4gICAgfVxuICB9XG5cbiAgc3dpdGNoIChvcHRpb25zLnR5cGUpIHtcbiAgICBjYXNlICdiYXNpYyc6XG4gICAgICB0aGlzLnNldCgnQXV0aG9yaXphdGlvbicsICdCYXNpYyAnICsgYnRvYSh1c2VyICsgJzonICsgcGFzcykpO1xuICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnYXV0byc6XG4gICAgICB0aGlzLnVzZXJuYW1lID0gdXNlcjtcbiAgICAgIHRoaXMucGFzc3dvcmQgPSBwYXNzO1xuICAgIGJyZWFrO1xuICAgICAgXG4gICAgY2FzZSAnYmVhcmVyJzogLy8gdXNhZ2Ugd291bGQgYmUgLmF1dGgoYWNjZXNzVG9rZW4sIHsgdHlwZTogJ2JlYXJlcicgfSlcbiAgICAgIHRoaXMuc2V0KCdBdXRob3JpemF0aW9uJywgJ0JlYXJlciAnICsgdXNlcik7XG4gICAgYnJlYWs7ICBcbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkIHF1ZXJ5LXN0cmluZyBgdmFsYC5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgIHJlcXVlc3QuZ2V0KCcvc2hvZXMnKVxuICogICAgIC5xdWVyeSgnc2l6ZT0xMCcpXG4gKiAgICAgLnF1ZXJ5KHsgY29sb3I6ICdibHVlJyB9KVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fFN0cmluZ30gdmFsXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUucXVlcnkgPSBmdW5jdGlvbih2YWwpe1xuICBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIHZhbCkgdmFsID0gc2VyaWFsaXplKHZhbCk7XG4gIGlmICh2YWwpIHRoaXMuX3F1ZXJ5LnB1c2godmFsKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFF1ZXVlIHRoZSBnaXZlbiBgZmlsZWAgYXMgYW4gYXR0YWNobWVudCB0byB0aGUgc3BlY2lmaWVkIGBmaWVsZGAsXG4gKiB3aXRoIG9wdGlvbmFsIGBvcHRpb25zYCAob3IgZmlsZW5hbWUpLlxuICpcbiAqIGBgYCBqc1xuICogcmVxdWVzdC5wb3N0KCcvdXBsb2FkJylcbiAqICAgLmF0dGFjaCgnY29udGVudCcsIG5ldyBCbG9iKFsnPGEgaWQ9XCJhXCI+PGIgaWQ9XCJiXCI+aGV5ITwvYj48L2E+J10sIHsgdHlwZTogXCJ0ZXh0L2h0bWxcIn0pKVxuICogICAuZW5kKGNhbGxiYWNrKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBmaWVsZFxuICogQHBhcmFtIHtCbG9ifEZpbGV9IGZpbGVcbiAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gb3B0aW9uc1xuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLmF0dGFjaCA9IGZ1bmN0aW9uKGZpZWxkLCBmaWxlLCBvcHRpb25zKXtcbiAgaWYgKGZpbGUpIHtcbiAgICBpZiAodGhpcy5fZGF0YSkge1xuICAgICAgdGhyb3cgRXJyb3IoXCJzdXBlcmFnZW50IGNhbid0IG1peCAuc2VuZCgpIGFuZCAuYXR0YWNoKClcIik7XG4gICAgfVxuXG4gICAgdGhpcy5fZ2V0Rm9ybURhdGEoKS5hcHBlbmQoZmllbGQsIGZpbGUsIG9wdGlvbnMgfHwgZmlsZS5uYW1lKTtcbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cblJlcXVlc3QucHJvdG90eXBlLl9nZXRGb3JtRGF0YSA9IGZ1bmN0aW9uKCl7XG4gIGlmICghdGhpcy5fZm9ybURhdGEpIHtcbiAgICB0aGlzLl9mb3JtRGF0YSA9IG5ldyByb290LkZvcm1EYXRhKCk7XG4gIH1cbiAgcmV0dXJuIHRoaXMuX2Zvcm1EYXRhO1xufTtcblxuLyoqXG4gKiBJbnZva2UgdGhlIGNhbGxiYWNrIHdpdGggYGVycmAgYW5kIGByZXNgXG4gKiBhbmQgaGFuZGxlIGFyaXR5IGNoZWNrLlxuICpcbiAqIEBwYXJhbSB7RXJyb3J9IGVyclxuICogQHBhcmFtIHtSZXNwb25zZX0gcmVzXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5jYWxsYmFjayA9IGZ1bmN0aW9uKGVyciwgcmVzKXtcbiAgLy8gY29uc29sZS5sb2codGhpcy5fcmV0cmllcywgdGhpcy5fbWF4UmV0cmllcylcbiAgaWYgKHRoaXMuX21heFJldHJpZXMgJiYgdGhpcy5fcmV0cmllcysrIDwgdGhpcy5fbWF4UmV0cmllcyAmJiBzaG91bGRSZXRyeShlcnIsIHJlcykpIHtcbiAgICByZXR1cm4gdGhpcy5fcmV0cnkoKTtcbiAgfVxuXG4gIHZhciBmbiA9IHRoaXMuX2NhbGxiYWNrO1xuICB0aGlzLmNsZWFyVGltZW91dCgpO1xuXG4gIGlmIChlcnIpIHtcbiAgICBpZiAodGhpcy5fbWF4UmV0cmllcykgZXJyLnJldHJpZXMgPSB0aGlzLl9yZXRyaWVzIC0gMTtcbiAgICB0aGlzLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgfVxuXG4gIGZuKGVyciwgcmVzKTtcbn07XG5cbi8qKlxuICogSW52b2tlIGNhbGxiYWNrIHdpdGggeC1kb21haW4gZXJyb3IuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuY3Jvc3NEb21haW5FcnJvciA9IGZ1bmN0aW9uKCl7XG4gIHZhciBlcnIgPSBuZXcgRXJyb3IoJ1JlcXVlc3QgaGFzIGJlZW4gdGVybWluYXRlZFxcblBvc3NpYmxlIGNhdXNlczogdGhlIG5ldHdvcmsgaXMgb2ZmbGluZSwgT3JpZ2luIGlzIG5vdCBhbGxvd2VkIGJ5IEFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbiwgdGhlIHBhZ2UgaXMgYmVpbmcgdW5sb2FkZWQsIGV0Yy4nKTtcbiAgZXJyLmNyb3NzRG9tYWluID0gdHJ1ZTtcblxuICBlcnIuc3RhdHVzID0gdGhpcy5zdGF0dXM7XG4gIGVyci5tZXRob2QgPSB0aGlzLm1ldGhvZDtcbiAgZXJyLnVybCA9IHRoaXMudXJsO1xuXG4gIHRoaXMuY2FsbGJhY2soZXJyKTtcbn07XG5cbi8vIFRoaXMgb25seSB3YXJucywgYmVjYXVzZSB0aGUgcmVxdWVzdCBpcyBzdGlsbCBsaWtlbHkgdG8gd29ya1xuUmVxdWVzdC5wcm90b3R5cGUuYnVmZmVyID0gUmVxdWVzdC5wcm90b3R5cGUuY2EgPSBSZXF1ZXN0LnByb3RvdHlwZS5hZ2VudCA9IGZ1bmN0aW9uKCl7XG4gIGNvbnNvbGUud2FybihcIlRoaXMgaXMgbm90IHN1cHBvcnRlZCBpbiBicm93c2VyIHZlcnNpb24gb2Ygc3VwZXJhZ2VudFwiKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBUaGlzIHRocm93cywgYmVjYXVzZSBpdCBjYW4ndCBzZW5kL3JlY2VpdmUgZGF0YSBhcyBleHBlY3RlZFxuUmVxdWVzdC5wcm90b3R5cGUucGlwZSA9IFJlcXVlc3QucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24oKXtcbiAgdGhyb3cgRXJyb3IoXCJTdHJlYW1pbmcgaXMgbm90IHN1cHBvcnRlZCBpbiBicm93c2VyIHZlcnNpb24gb2Ygc3VwZXJhZ2VudFwiKTtcbn07XG5cbi8qKlxuICogQ29tcG9zZSBxdWVyeXN0cmluZyB0byBhcHBlbmQgdG8gcmVxLnVybFxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblJlcXVlc3QucHJvdG90eXBlLl9hcHBlbmRRdWVyeVN0cmluZyA9IGZ1bmN0aW9uKCl7XG4gIHZhciBxdWVyeSA9IHRoaXMuX3F1ZXJ5LmpvaW4oJyYnKTtcbiAgaWYgKHF1ZXJ5KSB7XG4gICAgdGhpcy51cmwgKz0gKHRoaXMudXJsLmluZGV4T2YoJz8nKSA+PSAwID8gJyYnIDogJz8nKSArIHF1ZXJ5O1xuICB9XG5cbiAgaWYgKHRoaXMuX3NvcnQpIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLnVybC5pbmRleE9mKCc/Jyk7XG4gICAgaWYgKGluZGV4ID49IDApIHtcbiAgICAgIHZhciBxdWVyeUFyciA9IHRoaXMudXJsLnN1YnN0cmluZyhpbmRleCArIDEpLnNwbGl0KCcmJyk7XG4gICAgICBpZiAoaXNGdW5jdGlvbih0aGlzLl9zb3J0KSkge1xuICAgICAgICBxdWVyeUFyci5zb3J0KHRoaXMuX3NvcnQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcXVlcnlBcnIuc29ydCgpO1xuICAgICAgfVxuICAgICAgdGhpcy51cmwgPSB0aGlzLnVybC5zdWJzdHJpbmcoMCwgaW5kZXgpICsgJz8nICsgcXVlcnlBcnIuam9pbignJicpO1xuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBDaGVjayBpZiBgb2JqYCBpcyBhIGhvc3Qgb2JqZWN0LFxuICogd2UgZG9uJ3Qgd2FudCB0byBzZXJpYWxpemUgdGhlc2UgOilcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwcml2YXRlXG4gKi9cblJlcXVlc3QucHJvdG90eXBlLl9pc0hvc3QgPSBmdW5jdGlvbiBfaXNIb3N0KG9iaikge1xuICAvLyBOYXRpdmUgb2JqZWN0cyBzdHJpbmdpZnkgdG8gW29iamVjdCBGaWxlXSwgW29iamVjdCBCbG9iXSwgW29iamVjdCBGb3JtRGF0YV0sIGV0Yy5cbiAgcmV0dXJuIG9iaiAmJiAnb2JqZWN0JyA9PT0gdHlwZW9mIG9iaiAmJiAhQXJyYXkuaXNBcnJheShvYmopICYmIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopICE9PSAnW29iamVjdCBPYmplY3RdJztcbn1cblxuLyoqXG4gKiBJbml0aWF0ZSByZXF1ZXN0LCBpbnZva2luZyBjYWxsYmFjayBgZm4ocmVzKWBcbiAqIHdpdGggYW4gaW5zdGFuY2VvZiBgUmVzcG9uc2VgLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24oZm4pe1xuICBpZiAodGhpcy5fZW5kQ2FsbGVkKSB7XG4gICAgY29uc29sZS53YXJuKFwiV2FybmluZzogLmVuZCgpIHdhcyBjYWxsZWQgdHdpY2UuIFRoaXMgaXMgbm90IHN1cHBvcnRlZCBpbiBzdXBlcmFnZW50XCIpO1xuICB9XG4gIHRoaXMuX2VuZENhbGxlZCA9IHRydWU7XG5cbiAgLy8gc3RvcmUgY2FsbGJhY2tcbiAgdGhpcy5fY2FsbGJhY2sgPSBmbiB8fCBub29wO1xuXG4gIC8vIHF1ZXJ5c3RyaW5nXG4gIHRoaXMuX2FwcGVuZFF1ZXJ5U3RyaW5nKCk7XG5cbiAgcmV0dXJuIHRoaXMuX2VuZCgpO1xufTtcblxuUmVxdWVzdC5wcm90b3R5cGUuX2VuZCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciB4aHIgPSB0aGlzLnhociA9IHJlcXVlc3QuZ2V0WEhSKCk7XG4gIHZhciBkYXRhID0gdGhpcy5fZm9ybURhdGEgfHwgdGhpcy5fZGF0YTtcblxuICB0aGlzLl9zZXRUaW1lb3V0cygpO1xuXG4gIC8vIHN0YXRlIGNoYW5nZVxuICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgcmVhZHlTdGF0ZSA9IHhoci5yZWFkeVN0YXRlO1xuICAgIGlmIChyZWFkeVN0YXRlID49IDIgJiYgc2VsZi5fcmVzcG9uc2VUaW1lb3V0VGltZXIpIHtcbiAgICAgIGNsZWFyVGltZW91dChzZWxmLl9yZXNwb25zZVRpbWVvdXRUaW1lcik7XG4gICAgfVxuICAgIGlmICg0ICE9IHJlYWR5U3RhdGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBJbiBJRTksIHJlYWRzIHRvIGFueSBwcm9wZXJ0eSAoZS5nLiBzdGF0dXMpIG9mZiBvZiBhbiBhYm9ydGVkIFhIUiB3aWxsXG4gICAgLy8gcmVzdWx0IGluIHRoZSBlcnJvciBcIkNvdWxkIG5vdCBjb21wbGV0ZSB0aGUgb3BlcmF0aW9uIGR1ZSB0byBlcnJvciBjMDBjMDIzZlwiXG4gICAgdmFyIHN0YXR1cztcbiAgICB0cnkgeyBzdGF0dXMgPSB4aHIuc3RhdHVzIH0gY2F0Y2goZSkgeyBzdGF0dXMgPSAwOyB9XG5cbiAgICBpZiAoIXN0YXR1cykge1xuICAgICAgaWYgKHNlbGYudGltZWRvdXQgfHwgc2VsZi5fYWJvcnRlZCkgcmV0dXJuO1xuICAgICAgcmV0dXJuIHNlbGYuY3Jvc3NEb21haW5FcnJvcigpO1xuICAgIH1cbiAgICBzZWxmLmVtaXQoJ2VuZCcpO1xuICB9O1xuXG4gIC8vIHByb2dyZXNzXG4gIHZhciBoYW5kbGVQcm9ncmVzcyA9IGZ1bmN0aW9uKGRpcmVjdGlvbiwgZSkge1xuICAgIGlmIChlLnRvdGFsID4gMCkge1xuICAgICAgZS5wZXJjZW50ID0gZS5sb2FkZWQgLyBlLnRvdGFsICogMTAwO1xuICAgIH1cbiAgICBlLmRpcmVjdGlvbiA9IGRpcmVjdGlvbjtcbiAgICBzZWxmLmVtaXQoJ3Byb2dyZXNzJywgZSk7XG4gIH1cbiAgaWYgKHRoaXMuaGFzTGlzdGVuZXJzKCdwcm9ncmVzcycpKSB7XG4gICAgdHJ5IHtcbiAgICAgIHhoci5vbnByb2dyZXNzID0gaGFuZGxlUHJvZ3Jlc3MuYmluZChudWxsLCAnZG93bmxvYWQnKTtcbiAgICAgIGlmICh4aHIudXBsb2FkKSB7XG4gICAgICAgIHhoci51cGxvYWQub25wcm9ncmVzcyA9IGhhbmRsZVByb2dyZXNzLmJpbmQobnVsbCwgJ3VwbG9hZCcpO1xuICAgICAgfVxuICAgIH0gY2F0Y2goZSkge1xuICAgICAgLy8gQWNjZXNzaW5nIHhoci51cGxvYWQgZmFpbHMgaW4gSUUgZnJvbSBhIHdlYiB3b3JrZXIsIHNvIGp1c3QgcHJldGVuZCBpdCBkb2Vzbid0IGV4aXN0LlxuICAgICAgLy8gUmVwb3J0ZWQgaGVyZTpcbiAgICAgIC8vIGh0dHBzOi8vY29ubmVjdC5taWNyb3NvZnQuY29tL0lFL2ZlZWRiYWNrL2RldGFpbHMvODM3MjQ1L3htbGh0dHByZXF1ZXN0LXVwbG9hZC10aHJvd3MtaW52YWxpZC1hcmd1bWVudC13aGVuLXVzZWQtZnJvbS13ZWItd29ya2VyLWNvbnRleHRcbiAgICB9XG4gIH1cblxuICAvLyBpbml0aWF0ZSByZXF1ZXN0XG4gIHRyeSB7XG4gICAgaWYgKHRoaXMudXNlcm5hbWUgJiYgdGhpcy5wYXNzd29yZCkge1xuICAgICAgeGhyLm9wZW4odGhpcy5tZXRob2QsIHRoaXMudXJsLCB0cnVlLCB0aGlzLnVzZXJuYW1lLCB0aGlzLnBhc3N3b3JkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgeGhyLm9wZW4odGhpcy5tZXRob2QsIHRoaXMudXJsLCB0cnVlKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIC8vIHNlZSAjMTE0OVxuICAgIHJldHVybiB0aGlzLmNhbGxiYWNrKGVycik7XG4gIH1cblxuICAvLyBDT1JTXG4gIGlmICh0aGlzLl93aXRoQ3JlZGVudGlhbHMpIHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuXG4gIC8vIGJvZHlcbiAgaWYgKCF0aGlzLl9mb3JtRGF0YSAmJiAnR0VUJyAhPSB0aGlzLm1ldGhvZCAmJiAnSEVBRCcgIT0gdGhpcy5tZXRob2QgJiYgJ3N0cmluZycgIT0gdHlwZW9mIGRhdGEgJiYgIXRoaXMuX2lzSG9zdChkYXRhKSkge1xuICAgIC8vIHNlcmlhbGl6ZSBzdHVmZlxuICAgIHZhciBjb250ZW50VHlwZSA9IHRoaXMuX2hlYWRlclsnY29udGVudC10eXBlJ107XG4gICAgdmFyIHNlcmlhbGl6ZSA9IHRoaXMuX3NlcmlhbGl6ZXIgfHwgcmVxdWVzdC5zZXJpYWxpemVbY29udGVudFR5cGUgPyBjb250ZW50VHlwZS5zcGxpdCgnOycpWzBdIDogJyddO1xuICAgIGlmICghc2VyaWFsaXplICYmIGlzSlNPTihjb250ZW50VHlwZSkpIHtcbiAgICAgIHNlcmlhbGl6ZSA9IHJlcXVlc3Quc2VyaWFsaXplWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgfVxuICAgIGlmIChzZXJpYWxpemUpIGRhdGEgPSBzZXJpYWxpemUoZGF0YSk7XG4gIH1cblxuICAvLyBzZXQgaGVhZGVyIGZpZWxkc1xuICBmb3IgKHZhciBmaWVsZCBpbiB0aGlzLmhlYWRlcikge1xuICAgIGlmIChudWxsID09IHRoaXMuaGVhZGVyW2ZpZWxkXSkgY29udGludWU7XG5cbiAgICBpZiAodGhpcy5oZWFkZXIuaGFzT3duUHJvcGVydHkoZmllbGQpKVxuICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoZmllbGQsIHRoaXMuaGVhZGVyW2ZpZWxkXSk7XG4gIH1cblxuICBpZiAodGhpcy5fcmVzcG9uc2VUeXBlKSB7XG4gICAgeGhyLnJlc3BvbnNlVHlwZSA9IHRoaXMuX3Jlc3BvbnNlVHlwZTtcbiAgfVxuXG4gIC8vIHNlbmQgc3R1ZmZcbiAgdGhpcy5lbWl0KCdyZXF1ZXN0JywgdGhpcyk7XG5cbiAgLy8gSUUxMSB4aHIuc2VuZCh1bmRlZmluZWQpIHNlbmRzICd1bmRlZmluZWQnIHN0cmluZyBhcyBQT1NUIHBheWxvYWQgKGluc3RlYWQgb2Ygbm90aGluZylcbiAgLy8gV2UgbmVlZCBudWxsIGhlcmUgaWYgZGF0YSBpcyB1bmRlZmluZWRcbiAgeGhyLnNlbmQodHlwZW9mIGRhdGEgIT09ICd1bmRlZmluZWQnID8gZGF0YSA6IG51bGwpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogR0VUIGB1cmxgIHdpdGggb3B0aW9uYWwgY2FsbGJhY2sgYGZuKHJlcylgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7TWl4ZWR8RnVuY3Rpb259IFtkYXRhXSBvciBmblxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxucmVxdWVzdC5nZXQgPSBmdW5jdGlvbih1cmwsIGRhdGEsIGZuKXtcbiAgdmFyIHJlcSA9IHJlcXVlc3QoJ0dFVCcsIHVybCk7XG4gIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBkYXRhKSBmbiA9IGRhdGEsIGRhdGEgPSBudWxsO1xuICBpZiAoZGF0YSkgcmVxLnF1ZXJ5KGRhdGEpO1xuICBpZiAoZm4pIHJlcS5lbmQoZm4pO1xuICByZXR1cm4gcmVxO1xufTtcblxuLyoqXG4gKiBIRUFEIGB1cmxgIHdpdGggb3B0aW9uYWwgY2FsbGJhY2sgYGZuKHJlcylgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7TWl4ZWR8RnVuY3Rpb259IFtkYXRhXSBvciBmblxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxucmVxdWVzdC5oZWFkID0gZnVuY3Rpb24odXJsLCBkYXRhLCBmbil7XG4gIHZhciByZXEgPSByZXF1ZXN0KCdIRUFEJywgdXJsKTtcbiAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGRhdGEpIGZuID0gZGF0YSwgZGF0YSA9IG51bGw7XG4gIGlmIChkYXRhKSByZXEuc2VuZChkYXRhKTtcbiAgaWYgKGZuKSByZXEuZW5kKGZuKTtcbiAgcmV0dXJuIHJlcTtcbn07XG5cbi8qKlxuICogT1BUSU9OUyBxdWVyeSB0byBgdXJsYCB3aXRoIG9wdGlvbmFsIGNhbGxiYWNrIGBmbihyZXMpYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge01peGVkfEZ1bmN0aW9ufSBbZGF0YV0gb3IgZm5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cbiAqIEByZXR1cm4ge1JlcXVlc3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbnJlcXVlc3Qub3B0aW9ucyA9IGZ1bmN0aW9uKHVybCwgZGF0YSwgZm4pe1xuICB2YXIgcmVxID0gcmVxdWVzdCgnT1BUSU9OUycsIHVybCk7XG4gIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBkYXRhKSBmbiA9IGRhdGEsIGRhdGEgPSBudWxsO1xuICBpZiAoZGF0YSkgcmVxLnNlbmQoZGF0YSk7XG4gIGlmIChmbikgcmVxLmVuZChmbik7XG4gIHJldHVybiByZXE7XG59O1xuXG4vKipcbiAqIERFTEVURSBgdXJsYCB3aXRoIG9wdGlvbmFsIGBkYXRhYCBhbmQgY2FsbGJhY2sgYGZuKHJlcylgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7TWl4ZWR9IFtkYXRhXVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZGVsKHVybCwgZGF0YSwgZm4pe1xuICB2YXIgcmVxID0gcmVxdWVzdCgnREVMRVRFJywgdXJsKTtcbiAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGRhdGEpIGZuID0gZGF0YSwgZGF0YSA9IG51bGw7XG4gIGlmIChkYXRhKSByZXEuc2VuZChkYXRhKTtcbiAgaWYgKGZuKSByZXEuZW5kKGZuKTtcbiAgcmV0dXJuIHJlcTtcbn07XG5cbnJlcXVlc3RbJ2RlbCddID0gZGVsO1xucmVxdWVzdFsnZGVsZXRlJ10gPSBkZWw7XG5cbi8qKlxuICogUEFUQ0ggYHVybGAgd2l0aCBvcHRpb25hbCBgZGF0YWAgYW5kIGNhbGxiYWNrIGBmbihyZXMpYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge01peGVkfSBbZGF0YV1cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cbiAqIEByZXR1cm4ge1JlcXVlc3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbnJlcXVlc3QucGF0Y2ggPSBmdW5jdGlvbih1cmwsIGRhdGEsIGZuKXtcbiAgdmFyIHJlcSA9IHJlcXVlc3QoJ1BBVENIJywgdXJsKTtcbiAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGRhdGEpIGZuID0gZGF0YSwgZGF0YSA9IG51bGw7XG4gIGlmIChkYXRhKSByZXEuc2VuZChkYXRhKTtcbiAgaWYgKGZuKSByZXEuZW5kKGZuKTtcbiAgcmV0dXJuIHJlcTtcbn07XG5cbi8qKlxuICogUE9TVCBgdXJsYCB3aXRoIG9wdGlvbmFsIGBkYXRhYCBhbmQgY2FsbGJhY2sgYGZuKHJlcylgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7TWl4ZWR9IFtkYXRhXVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxucmVxdWVzdC5wb3N0ID0gZnVuY3Rpb24odXJsLCBkYXRhLCBmbil7XG4gIHZhciByZXEgPSByZXF1ZXN0KCdQT1NUJywgdXJsKTtcbiAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGRhdGEpIGZuID0gZGF0YSwgZGF0YSA9IG51bGw7XG4gIGlmIChkYXRhKSByZXEuc2VuZChkYXRhKTtcbiAgaWYgKGZuKSByZXEuZW5kKGZuKTtcbiAgcmV0dXJuIHJlcTtcbn07XG5cbi8qKlxuICogUFVUIGB1cmxgIHdpdGggb3B0aW9uYWwgYGRhdGFgIGFuZCBjYWxsYmFjayBgZm4ocmVzKWAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQHBhcmFtIHtNaXhlZHxGdW5jdGlvbn0gW2RhdGFdIG9yIGZuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5yZXF1ZXN0LnB1dCA9IGZ1bmN0aW9uKHVybCwgZGF0YSwgZm4pe1xuICB2YXIgcmVxID0gcmVxdWVzdCgnUFVUJywgdXJsKTtcbiAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGRhdGEpIGZuID0gZGF0YSwgZGF0YSA9IG51bGw7XG4gIGlmIChkYXRhKSByZXEuc2VuZChkYXRhKTtcbiAgaWYgKGZuKSByZXEuZW5kKGZuKTtcbiAgcmV0dXJuIHJlcTtcbn07XG4iLCIvKipcbiAqIENoZWNrIGlmIGBmbmAgaXMgYSBmdW5jdGlvbi5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG52YXIgaXNPYmplY3QgPSByZXF1aXJlKCcuL2lzLW9iamVjdCcpO1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGZuKSB7XG4gIHZhciB0YWcgPSBpc09iamVjdChmbikgPyBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZm4pIDogJyc7XG4gIHJldHVybiB0YWcgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaXNGdW5jdGlvbjtcbiIsIi8qKlxuICogQ2hlY2sgaWYgYG9iamAgaXMgYW4gb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBpc09iamVjdChvYmopIHtcbiAgcmV0dXJuIG51bGwgIT09IG9iaiAmJiAnb2JqZWN0JyA9PT0gdHlwZW9mIG9iajtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpc09iamVjdDtcbiIsIi8qKlxuICogTW9kdWxlIG9mIG1peGVkLWluIGZ1bmN0aW9ucyBzaGFyZWQgYmV0d2VlbiBub2RlIGFuZCBjbGllbnQgY29kZVxuICovXG52YXIgaXNPYmplY3QgPSByZXF1aXJlKCcuL2lzLW9iamVjdCcpO1xuXG4vKipcbiAqIEV4cG9zZSBgUmVxdWVzdEJhc2VgLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gUmVxdWVzdEJhc2U7XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBhIG5ldyBgUmVxdWVzdEJhc2VgLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gUmVxdWVzdEJhc2Uob2JqKSB7XG4gIGlmIChvYmopIHJldHVybiBtaXhpbihvYmopO1xufVxuXG4vKipcbiAqIE1peGluIHRoZSBwcm90b3R5cGUgcHJvcGVydGllcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBtaXhpbihvYmopIHtcbiAgZm9yICh2YXIga2V5IGluIFJlcXVlc3RCYXNlLnByb3RvdHlwZSkge1xuICAgIG9ialtrZXldID0gUmVxdWVzdEJhc2UucHJvdG90eXBlW2tleV07XG4gIH1cbiAgcmV0dXJuIG9iajtcbn1cblxuLyoqXG4gKiBDbGVhciBwcmV2aW91cyB0aW1lb3V0LlxuICpcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuY2xlYXJUaW1lb3V0ID0gZnVuY3Rpb24gX2NsZWFyVGltZW91dCgpe1xuICBjbGVhclRpbWVvdXQodGhpcy5fdGltZXIpO1xuICBjbGVhclRpbWVvdXQodGhpcy5fcmVzcG9uc2VUaW1lb3V0VGltZXIpO1xuICBkZWxldGUgdGhpcy5fdGltZXI7XG4gIGRlbGV0ZSB0aGlzLl9yZXNwb25zZVRpbWVvdXRUaW1lcjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIE92ZXJyaWRlIGRlZmF1bHQgcmVzcG9uc2UgYm9keSBwYXJzZXJcbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIHRvIGNvbnZlcnQgaW5jb21pbmcgZGF0YSBpbnRvIHJlcXVlc3QuYm9keVxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5wYXJzZSA9IGZ1bmN0aW9uIHBhcnNlKGZuKXtcbiAgdGhpcy5fcGFyc2VyID0gZm47XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgZm9ybWF0IG9mIGJpbmFyeSByZXNwb25zZSBib2R5LlxuICogSW4gYnJvd3NlciB2YWxpZCBmb3JtYXRzIGFyZSAnYmxvYicgYW5kICdhcnJheWJ1ZmZlcicsXG4gKiB3aGljaCByZXR1cm4gQmxvYiBhbmQgQXJyYXlCdWZmZXIsIHJlc3BlY3RpdmVseS5cbiAqXG4gKiBJbiBOb2RlIGFsbCB2YWx1ZXMgcmVzdWx0IGluIEJ1ZmZlci5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICAgIHJlcS5nZXQoJy8nKVxuICogICAgICAgIC5yZXNwb25zZVR5cGUoJ2Jsb2InKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWxcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUucmVzcG9uc2VUeXBlID0gZnVuY3Rpb24odmFsKXtcbiAgdGhpcy5fcmVzcG9uc2VUeXBlID0gdmFsO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogT3ZlcnJpZGUgZGVmYXVsdCByZXF1ZXN0IGJvZHkgc2VyaWFsaXplclxuICpcbiAqIFRoaXMgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgdG8gY29udmVydCBkYXRhIHNldCB2aWEgLnNlbmQgb3IgLmF0dGFjaCBpbnRvIHBheWxvYWQgdG8gc2VuZFxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbiBzZXJpYWxpemUoZm4pe1xuICB0aGlzLl9zZXJpYWxpemVyID0gZm47XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgdGltZW91dHMuXG4gKlxuICogLSByZXNwb25zZSB0aW1lb3V0IGlzIHRpbWUgYmV0d2VlbiBzZW5kaW5nIHJlcXVlc3QgYW5kIHJlY2VpdmluZyB0aGUgZmlyc3QgYnl0ZSBvZiB0aGUgcmVzcG9uc2UuIEluY2x1ZGVzIEROUyBhbmQgY29ubmVjdGlvbiB0aW1lLlxuICogLSBkZWFkbGluZSBpcyB0aGUgdGltZSBmcm9tIHN0YXJ0IG9mIHRoZSByZXF1ZXN0IHRvIHJlY2VpdmluZyByZXNwb25zZSBib2R5IGluIGZ1bGwuIElmIHRoZSBkZWFkbGluZSBpcyB0b28gc2hvcnQgbGFyZ2UgZmlsZXMgbWF5IG5vdCBsb2FkIGF0IGFsbCBvbiBzbG93IGNvbm5lY3Rpb25zLlxuICpcbiAqIFZhbHVlIG9mIDAgb3IgZmFsc2UgbWVhbnMgbm8gdGltZW91dC5cbiAqXG4gKiBAcGFyYW0ge051bWJlcnxPYmplY3R9IG1zIG9yIHtyZXNwb25zZSwgcmVhZCwgZGVhZGxpbmV9XG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnRpbWVvdXQgPSBmdW5jdGlvbiB0aW1lb3V0KG9wdGlvbnMpe1xuICBpZiAoIW9wdGlvbnMgfHwgJ29iamVjdCcgIT09IHR5cGVvZiBvcHRpb25zKSB7XG4gICAgdGhpcy5fdGltZW91dCA9IG9wdGlvbnM7XG4gICAgdGhpcy5fcmVzcG9uc2VUaW1lb3V0ID0gMDtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGZvcih2YXIgb3B0aW9uIGluIG9wdGlvbnMpIHtcbiAgICBzd2l0Y2gob3B0aW9uKSB7XG4gICAgICBjYXNlICdkZWFkbGluZSc6XG4gICAgICAgIHRoaXMuX3RpbWVvdXQgPSBvcHRpb25zLmRlYWRsaW5lO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3Jlc3BvbnNlJzpcbiAgICAgICAgdGhpcy5fcmVzcG9uc2VUaW1lb3V0ID0gb3B0aW9ucy5yZXNwb25zZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBjb25zb2xlLndhcm4oXCJVbmtub3duIHRpbWVvdXQgb3B0aW9uXCIsIG9wdGlvbik7XG4gICAgfVxuICB9XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgbnVtYmVyIG9mIHJldHJ5IGF0dGVtcHRzIG9uIGVycm9yLlxuICpcbiAqIEZhaWxlZCByZXF1ZXN0cyB3aWxsIGJlIHJldHJpZWQgJ2NvdW50JyB0aW1lcyBpZiB0aW1lb3V0IG9yIGVyci5jb2RlID49IDUwMC5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gY291bnRcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUucmV0cnkgPSBmdW5jdGlvbiByZXRyeShjb3VudCl7XG4gIC8vIERlZmF1bHQgdG8gMSBpZiBubyBjb3VudCBwYXNzZWQgb3IgdHJ1ZVxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCB8fCBjb3VudCA9PT0gdHJ1ZSkgY291bnQgPSAxO1xuICBpZiAoY291bnQgPD0gMCkgY291bnQgPSAwO1xuICB0aGlzLl9tYXhSZXRyaWVzID0gY291bnQ7XG4gIHRoaXMuX3JldHJpZXMgPSAwO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmV0cnkgcmVxdWVzdFxuICpcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLl9yZXRyeSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmNsZWFyVGltZW91dCgpO1xuXG4gIC8vIG5vZGVcbiAgaWYgKHRoaXMucmVxKSB7XG4gICAgdGhpcy5yZXEgPSBudWxsO1xuICAgIHRoaXMucmVxID0gdGhpcy5yZXF1ZXN0KCk7XG4gIH1cblxuICB0aGlzLl9hYm9ydGVkID0gZmFsc2U7XG4gIHRoaXMudGltZWRvdXQgPSBmYWxzZTtcblxuICByZXR1cm4gdGhpcy5fZW5kKCk7XG59O1xuXG4vKipcbiAqIFByb21pc2Ugc3VwcG9ydFxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHJlc29sdmVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtyZWplY3RdXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fVxuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS50aGVuID0gZnVuY3Rpb24gdGhlbihyZXNvbHZlLCByZWplY3QpIHtcbiAgaWYgKCF0aGlzLl9mdWxsZmlsbGVkUHJvbWlzZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAodGhpcy5fZW5kQ2FsbGVkKSB7XG4gICAgICBjb25zb2xlLndhcm4oXCJXYXJuaW5nOiBzdXBlcmFnZW50IHJlcXVlc3Qgd2FzIHNlbnQgdHdpY2UsIGJlY2F1c2UgYm90aCAuZW5kKCkgYW5kIC50aGVuKCkgd2VyZSBjYWxsZWQuIE5ldmVyIGNhbGwgLmVuZCgpIGlmIHlvdSB1c2UgcHJvbWlzZXNcIik7XG4gICAgfVxuICAgIHRoaXMuX2Z1bGxmaWxsZWRQcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24oaW5uZXJSZXNvbHZlLCBpbm5lclJlamVjdCl7XG4gICAgICBzZWxmLmVuZChmdW5jdGlvbihlcnIsIHJlcyl7XG4gICAgICAgIGlmIChlcnIpIGlubmVyUmVqZWN0KGVycik7IGVsc2UgaW5uZXJSZXNvbHZlKHJlcyk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gdGhpcy5fZnVsbGZpbGxlZFByb21pc2UudGhlbihyZXNvbHZlLCByZWplY3QpO1xufVxuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuY2F0Y2ggPSBmdW5jdGlvbihjYikge1xuICByZXR1cm4gdGhpcy50aGVuKHVuZGVmaW5lZCwgY2IpO1xufTtcblxuLyoqXG4gKiBBbGxvdyBmb3IgZXh0ZW5zaW9uXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnVzZSA9IGZ1bmN0aW9uIHVzZShmbikge1xuICBmbih0aGlzKTtcbiAgcmV0dXJuIHRoaXM7XG59XG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5vayA9IGZ1bmN0aW9uKGNiKSB7XG4gIGlmICgnZnVuY3Rpb24nICE9PSB0eXBlb2YgY2IpIHRocm93IEVycm9yKFwiQ2FsbGJhY2sgcmVxdWlyZWRcIik7XG4gIHRoaXMuX29rQ2FsbGJhY2sgPSBjYjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuX2lzUmVzcG9uc2VPSyA9IGZ1bmN0aW9uKHJlcykge1xuICBpZiAoIXJlcykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlmICh0aGlzLl9va0NhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuX29rQ2FsbGJhY2socmVzKTtcbiAgfVxuXG4gIHJldHVybiByZXMuc3RhdHVzID49IDIwMCAmJiByZXMuc3RhdHVzIDwgMzAwO1xufTtcblxuXG4vKipcbiAqIEdldCByZXF1ZXN0IGhlYWRlciBgZmllbGRgLlxuICogQ2FzZS1pbnNlbnNpdGl2ZS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZmllbGRcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgcmV0dXJuIHRoaXMuX2hlYWRlcltmaWVsZC50b0xvd2VyQ2FzZSgpXTtcbn07XG5cbi8qKlxuICogR2V0IGNhc2UtaW5zZW5zaXRpdmUgaGVhZGVyIGBmaWVsZGAgdmFsdWUuXG4gKiBUaGlzIGlzIGEgZGVwcmVjYXRlZCBpbnRlcm5hbCBBUEkuIFVzZSBgLmdldChmaWVsZClgIGluc3RlYWQuXG4gKlxuICogKGdldEhlYWRlciBpcyBubyBsb25nZXIgdXNlZCBpbnRlcm5hbGx5IGJ5IHRoZSBzdXBlcmFnZW50IGNvZGUgYmFzZSlcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZmllbGRcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHJpdmF0ZVxuICogQGRlcHJlY2F0ZWRcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuZ2V0SGVhZGVyID0gUmVxdWVzdEJhc2UucHJvdG90eXBlLmdldDtcblxuLyoqXG4gKiBTZXQgaGVhZGVyIGBmaWVsZGAgdG8gYHZhbGAsIG9yIG11bHRpcGxlIGZpZWxkcyB3aXRoIG9uZSBvYmplY3QuXG4gKiBDYXNlLWluc2Vuc2l0aXZlLlxuICpcbiAqIEV4YW1wbGVzOlxuICpcbiAqICAgICAgcmVxLmdldCgnLycpXG4gKiAgICAgICAgLnNldCgnQWNjZXB0JywgJ2FwcGxpY2F0aW9uL2pzb24nKVxuICogICAgICAgIC5zZXQoJ1gtQVBJLUtleScsICdmb29iYXInKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqICAgICAgcmVxLmdldCgnLycpXG4gKiAgICAgICAgLnNldCh7IEFjY2VwdDogJ2FwcGxpY2F0aW9uL2pzb24nLCAnWC1BUEktS2V5JzogJ2Zvb2JhcicgfSlcbiAqICAgICAgICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IGZpZWxkXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKGZpZWxkLCB2YWwpe1xuICBpZiAoaXNPYmplY3QoZmllbGQpKSB7XG4gICAgZm9yICh2YXIga2V5IGluIGZpZWxkKSB7XG4gICAgICB0aGlzLnNldChrZXksIGZpZWxkW2tleV0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICB0aGlzLl9oZWFkZXJbZmllbGQudG9Mb3dlckNhc2UoKV0gPSB2YWw7XG4gIHRoaXMuaGVhZGVyW2ZpZWxkXSA9IHZhbDtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBoZWFkZXIgYGZpZWxkYC5cbiAqIENhc2UtaW5zZW5zaXRpdmUuXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiAgICAgIHJlcS5nZXQoJy8nKVxuICogICAgICAgIC51bnNldCgnVXNlci1BZ2VudCcpXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGZpZWxkXG4gKi9cblJlcXVlc3RCYXNlLnByb3RvdHlwZS51bnNldCA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgZGVsZXRlIHRoaXMuX2hlYWRlcltmaWVsZC50b0xvd2VyQ2FzZSgpXTtcbiAgZGVsZXRlIHRoaXMuaGVhZGVyW2ZpZWxkXTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFdyaXRlIHRoZSBmaWVsZCBgbmFtZWAgYW5kIGB2YWxgLCBvciBtdWx0aXBsZSBmaWVsZHMgd2l0aCBvbmUgb2JqZWN0XG4gKiBmb3IgXCJtdWx0aXBhcnQvZm9ybS1kYXRhXCIgcmVxdWVzdCBib2RpZXMuXG4gKlxuICogYGBgIGpzXG4gKiByZXF1ZXN0LnBvc3QoJy91cGxvYWQnKVxuICogICAuZmllbGQoJ2ZvbycsICdiYXInKVxuICogICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiByZXF1ZXN0LnBvc3QoJy91cGxvYWQnKVxuICogICAuZmllbGQoeyBmb286ICdiYXInLCBiYXo6ICdxdXgnIH0pXG4gKiAgIC5lbmQoY2FsbGJhY2spO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBuYW1lXG4gKiBAcGFyYW0ge1N0cmluZ3xCbG9ifEZpbGV8QnVmZmVyfGZzLlJlYWRTdHJlYW19IHZhbFxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuZmllbGQgPSBmdW5jdGlvbihuYW1lLCB2YWwpIHtcblxuICAvLyBuYW1lIHNob3VsZCBiZSBlaXRoZXIgYSBzdHJpbmcgb3IgYW4gb2JqZWN0LlxuICBpZiAobnVsbCA9PT0gbmFtZSB8fCAgdW5kZWZpbmVkID09PSBuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCcuZmllbGQobmFtZSwgdmFsKSBuYW1lIGNhbiBub3QgYmUgZW1wdHknKTtcbiAgfVxuXG4gIGlmICh0aGlzLl9kYXRhKSB7XG4gICAgY29uc29sZS5lcnJvcihcIi5maWVsZCgpIGNhbid0IGJlIHVzZWQgaWYgLnNlbmQoKSBpcyB1c2VkLiBQbGVhc2UgdXNlIG9ubHkgLnNlbmQoKSBvciBvbmx5IC5maWVsZCgpICYgLmF0dGFjaCgpXCIpO1xuICB9XG5cbiAgaWYgKGlzT2JqZWN0KG5hbWUpKSB7XG4gICAgZm9yICh2YXIga2V5IGluIG5hbWUpIHtcbiAgICAgIHRoaXMuZmllbGQoa2V5LCBuYW1lW2tleV0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGlmIChBcnJheS5pc0FycmF5KHZhbCkpIHtcbiAgICBmb3IgKHZhciBpIGluIHZhbCkge1xuICAgICAgdGhpcy5maWVsZChuYW1lLCB2YWxbaV0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIHZhbCBzaG91bGQgYmUgZGVmaW5lZCBub3dcbiAgaWYgKG51bGwgPT09IHZhbCB8fCB1bmRlZmluZWQgPT09IHZhbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignLmZpZWxkKG5hbWUsIHZhbCkgdmFsIGNhbiBub3QgYmUgZW1wdHknKTtcbiAgfVxuICBpZiAoJ2Jvb2xlYW4nID09PSB0eXBlb2YgdmFsKSB7XG4gICAgdmFsID0gJycgKyB2YWw7XG4gIH1cbiAgdGhpcy5fZ2V0Rm9ybURhdGEoKS5hcHBlbmQobmFtZSwgdmFsKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFib3J0IHRoZSByZXF1ZXN0LCBhbmQgY2xlYXIgcG90ZW50aWFsIHRpbWVvdXQuXG4gKlxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5hYm9ydCA9IGZ1bmN0aW9uKCl7XG4gIGlmICh0aGlzLl9hYm9ydGVkKSB7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgdGhpcy5fYWJvcnRlZCA9IHRydWU7XG4gIHRoaXMueGhyICYmIHRoaXMueGhyLmFib3J0KCk7IC8vIGJyb3dzZXJcbiAgdGhpcy5yZXEgJiYgdGhpcy5yZXEuYWJvcnQoKTsgLy8gbm9kZVxuICB0aGlzLmNsZWFyVGltZW91dCgpO1xuICB0aGlzLmVtaXQoJ2Fib3J0Jyk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBFbmFibGUgdHJhbnNtaXNzaW9uIG9mIGNvb2tpZXMgd2l0aCB4LWRvbWFpbiByZXF1ZXN0cy5cbiAqXG4gKiBOb3RlIHRoYXQgZm9yIHRoaXMgdG8gd29yayB0aGUgb3JpZ2luIG11c3Qgbm90IGJlXG4gKiB1c2luZyBcIkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpblwiIHdpdGggYSB3aWxkY2FyZCxcbiAqIGFuZCBhbHNvIG11c3Qgc2V0IFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctQ3JlZGVudGlhbHNcIlxuICogdG8gXCJ0cnVlXCIuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUud2l0aENyZWRlbnRpYWxzID0gZnVuY3Rpb24ob24pe1xuICAvLyBUaGlzIGlzIGJyb3dzZXItb25seSBmdW5jdGlvbmFsaXR5LiBOb2RlIHNpZGUgaXMgbm8tb3AuXG4gIGlmKG9uPT11bmRlZmluZWQpIG9uID0gdHJ1ZTtcbiAgdGhpcy5fd2l0aENyZWRlbnRpYWxzID0gb247XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIG1heCByZWRpcmVjdHMgdG8gYG5gLiBEb2VzIG5vdGluZyBpbiBicm93c2VyIFhIUiBpbXBsZW1lbnRhdGlvbi5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gblxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5yZWRpcmVjdHMgPSBmdW5jdGlvbihuKXtcbiAgdGhpcy5fbWF4UmVkaXJlY3RzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENvbnZlcnQgdG8gYSBwbGFpbiBqYXZhc2NyaXB0IG9iamVjdCAobm90IEpTT04gc3RyaW5nKSBvZiBzY2FsYXIgcHJvcGVydGllcy5cbiAqIE5vdGUgYXMgdGhpcyBtZXRob2QgaXMgZGVzaWduZWQgdG8gcmV0dXJuIGEgdXNlZnVsIG5vbi10aGlzIHZhbHVlLFxuICogaXQgY2Fubm90IGJlIGNoYWluZWQuXG4gKlxuICogQHJldHVybiB7T2JqZWN0fSBkZXNjcmliaW5nIG1ldGhvZCwgdXJsLCBhbmQgZGF0YSBvZiB0aGlzIHJlcXVlc3RcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiB7XG4gICAgbWV0aG9kOiB0aGlzLm1ldGhvZCxcbiAgICB1cmw6IHRoaXMudXJsLFxuICAgIGRhdGE6IHRoaXMuX2RhdGEsXG4gICAgaGVhZGVyczogdGhpcy5faGVhZGVyXG4gIH07XG59O1xuXG5cbi8qKlxuICogU2VuZCBgZGF0YWAgYXMgdGhlIHJlcXVlc3QgYm9keSwgZGVmYXVsdGluZyB0aGUgYC50eXBlKClgIHRvIFwianNvblwiIHdoZW5cbiAqIGFuIG9iamVjdCBpcyBnaXZlbi5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICAgICAvLyBtYW51YWwganNvblxuICogICAgICAgcmVxdWVzdC5wb3N0KCcvdXNlcicpXG4gKiAgICAgICAgIC50eXBlKCdqc29uJylcbiAqICAgICAgICAgLnNlbmQoJ3tcIm5hbWVcIjpcInRqXCJ9JylcbiAqICAgICAgICAgLmVuZChjYWxsYmFjaylcbiAqXG4gKiAgICAgICAvLyBhdXRvIGpzb25cbiAqICAgICAgIHJlcXVlc3QucG9zdCgnL3VzZXInKVxuICogICAgICAgICAuc2VuZCh7IG5hbWU6ICd0aicgfSlcbiAqICAgICAgICAgLmVuZChjYWxsYmFjaylcbiAqXG4gKiAgICAgICAvLyBtYW51YWwgeC13d3ctZm9ybS11cmxlbmNvZGVkXG4gKiAgICAgICByZXF1ZXN0LnBvc3QoJy91c2VyJylcbiAqICAgICAgICAgLnR5cGUoJ2Zvcm0nKVxuICogICAgICAgICAuc2VuZCgnbmFtZT10aicpXG4gKiAgICAgICAgIC5lbmQoY2FsbGJhY2spXG4gKlxuICogICAgICAgLy8gYXV0byB4LXd3dy1mb3JtLXVybGVuY29kZWRcbiAqICAgICAgIHJlcXVlc3QucG9zdCgnL3VzZXInKVxuICogICAgICAgICAudHlwZSgnZm9ybScpXG4gKiAgICAgICAgIC5zZW5kKHsgbmFtZTogJ3RqJyB9KVxuICogICAgICAgICAuZW5kKGNhbGxiYWNrKVxuICpcbiAqICAgICAgIC8vIGRlZmF1bHRzIHRvIHgtd3d3LWZvcm0tdXJsZW5jb2RlZFxuICogICAgICByZXF1ZXN0LnBvc3QoJy91c2VyJylcbiAqICAgICAgICAuc2VuZCgnbmFtZT10b2JpJylcbiAqICAgICAgICAuc2VuZCgnc3BlY2llcz1mZXJyZXQnKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBkYXRhXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnNlbmQgPSBmdW5jdGlvbihkYXRhKXtcbiAgdmFyIGlzT2JqID0gaXNPYmplY3QoZGF0YSk7XG4gIHZhciB0eXBlID0gdGhpcy5faGVhZGVyWydjb250ZW50LXR5cGUnXTtcblxuICBpZiAodGhpcy5fZm9ybURhdGEpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiLnNlbmQoKSBjYW4ndCBiZSB1c2VkIGlmIC5hdHRhY2goKSBvciAuZmllbGQoKSBpcyB1c2VkLiBQbGVhc2UgdXNlIG9ubHkgLnNlbmQoKSBvciBvbmx5IC5maWVsZCgpICYgLmF0dGFjaCgpXCIpO1xuICB9XG5cbiAgaWYgKGlzT2JqICYmICF0aGlzLl9kYXRhKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgIHRoaXMuX2RhdGEgPSBbXTtcbiAgICB9IGVsc2UgaWYgKCF0aGlzLl9pc0hvc3QoZGF0YSkpIHtcbiAgICAgIHRoaXMuX2RhdGEgPSB7fTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoZGF0YSAmJiB0aGlzLl9kYXRhICYmIHRoaXMuX2lzSG9zdCh0aGlzLl9kYXRhKSkge1xuICAgIHRocm93IEVycm9yKFwiQ2FuJ3QgbWVyZ2UgdGhlc2Ugc2VuZCBjYWxsc1wiKTtcbiAgfVxuXG4gIC8vIG1lcmdlXG4gIGlmIChpc09iaiAmJiBpc09iamVjdCh0aGlzLl9kYXRhKSkge1xuICAgIGZvciAodmFyIGtleSBpbiBkYXRhKSB7XG4gICAgICB0aGlzLl9kYXRhW2tleV0gPSBkYXRhW2tleV07XG4gICAgfVxuICB9IGVsc2UgaWYgKCdzdHJpbmcnID09IHR5cGVvZiBkYXRhKSB7XG4gICAgLy8gZGVmYXVsdCB0byB4LXd3dy1mb3JtLXVybGVuY29kZWRcbiAgICBpZiAoIXR5cGUpIHRoaXMudHlwZSgnZm9ybScpO1xuICAgIHR5cGUgPSB0aGlzLl9oZWFkZXJbJ2NvbnRlbnQtdHlwZSddO1xuICAgIGlmICgnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJyA9PSB0eXBlKSB7XG4gICAgICB0aGlzLl9kYXRhID0gdGhpcy5fZGF0YVxuICAgICAgICA/IHRoaXMuX2RhdGEgKyAnJicgKyBkYXRhXG4gICAgICAgIDogZGF0YTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZGF0YSA9ICh0aGlzLl9kYXRhIHx8ICcnKSArIGRhdGE7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRoaXMuX2RhdGEgPSBkYXRhO1xuICB9XG5cbiAgaWYgKCFpc09iaiB8fCB0aGlzLl9pc0hvc3QoZGF0YSkpIHtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGRlZmF1bHQgdG8ganNvblxuICBpZiAoIXR5cGUpIHRoaXMudHlwZSgnanNvbicpO1xuICByZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4gKiBTb3J0IGBxdWVyeXN0cmluZ2AgYnkgdGhlIHNvcnQgZnVuY3Rpb25cbiAqXG4gKlxuICogRXhhbXBsZXM6XG4gKlxuICogICAgICAgLy8gZGVmYXVsdCBvcmRlclxuICogICAgICAgcmVxdWVzdC5nZXQoJy91c2VyJylcbiAqICAgICAgICAgLnF1ZXJ5KCduYW1lPU5pY2snKVxuICogICAgICAgICAucXVlcnkoJ3NlYXJjaD1NYW5ueScpXG4gKiAgICAgICAgIC5zb3J0UXVlcnkoKVxuICogICAgICAgICAuZW5kKGNhbGxiYWNrKVxuICpcbiAqICAgICAgIC8vIGN1c3RvbWl6ZWQgc29ydCBmdW5jdGlvblxuICogICAgICAgcmVxdWVzdC5nZXQoJy91c2VyJylcbiAqICAgICAgICAgLnF1ZXJ5KCduYW1lPU5pY2snKVxuICogICAgICAgICAucXVlcnkoJ3NlYXJjaD1NYW5ueScpXG4gKiAgICAgICAgIC5zb3J0UXVlcnkoZnVuY3Rpb24oYSwgYil7XG4gKiAgICAgICAgICAgcmV0dXJuIGEubGVuZ3RoIC0gYi5sZW5ndGg7XG4gKiAgICAgICAgIH0pXG4gKiAgICAgICAgIC5lbmQoY2FsbGJhY2spXG4gKlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHNvcnRcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuc29ydFF1ZXJ5ID0gZnVuY3Rpb24oc29ydCkge1xuICAvLyBfc29ydCBkZWZhdWx0IHRvIHRydWUgYnV0IG90aGVyd2lzZSBjYW4gYmUgYSBmdW5jdGlvbiBvciBib29sZWFuXG4gIHRoaXMuX3NvcnQgPSB0eXBlb2Ygc29ydCA9PT0gJ3VuZGVmaW5lZCcgPyB0cnVlIDogc29ydDtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEludm9rZSBjYWxsYmFjayB3aXRoIHRpbWVvdXQgZXJyb3IuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLl90aW1lb3V0RXJyb3IgPSBmdW5jdGlvbihyZWFzb24sIHRpbWVvdXQsIGVycm5vKXtcbiAgaWYgKHRoaXMuX2Fib3J0ZWQpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIGVyciA9IG5ldyBFcnJvcihyZWFzb24gKyB0aW1lb3V0ICsgJ21zIGV4Y2VlZGVkJyk7XG4gIGVyci50aW1lb3V0ID0gdGltZW91dDtcbiAgZXJyLmNvZGUgPSAnRUNPTk5BQk9SVEVEJztcbiAgZXJyLmVycm5vID0gZXJybm87XG4gIHRoaXMudGltZWRvdXQgPSB0cnVlO1xuICB0aGlzLmFib3J0KCk7XG4gIHRoaXMuY2FsbGJhY2soZXJyKTtcbn07XG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5fc2V0VGltZW91dHMgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIC8vIGRlYWRsaW5lXG4gIGlmICh0aGlzLl90aW1lb3V0ICYmICF0aGlzLl90aW1lcikge1xuICAgIHRoaXMuX3RpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgc2VsZi5fdGltZW91dEVycm9yKCdUaW1lb3V0IG9mICcsIHNlbGYuX3RpbWVvdXQsICdFVElNRScpO1xuICAgIH0sIHRoaXMuX3RpbWVvdXQpO1xuICB9XG4gIC8vIHJlc3BvbnNlIHRpbWVvdXRcbiAgaWYgKHRoaXMuX3Jlc3BvbnNlVGltZW91dCAmJiAhdGhpcy5fcmVzcG9uc2VUaW1lb3V0VGltZXIpIHtcbiAgICB0aGlzLl9yZXNwb25zZVRpbWVvdXRUaW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIHNlbGYuX3RpbWVvdXRFcnJvcignUmVzcG9uc2UgdGltZW91dCBvZiAnLCBzZWxmLl9yZXNwb25zZVRpbWVvdXQsICdFVElNRURPVVQnKTtcbiAgICB9LCB0aGlzLl9yZXNwb25zZVRpbWVvdXQpO1xuICB9XG59XG4iLCJcbi8qKlxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbi8qKlxuICogRXhwb3NlIGBSZXNwb25zZUJhc2VgLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gUmVzcG9uc2VCYXNlO1xuXG4vKipcbiAqIEluaXRpYWxpemUgYSBuZXcgYFJlc3BvbnNlQmFzZWAuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBSZXNwb25zZUJhc2Uob2JqKSB7XG4gIGlmIChvYmopIHJldHVybiBtaXhpbihvYmopO1xufVxuXG4vKipcbiAqIE1peGluIHRoZSBwcm90b3R5cGUgcHJvcGVydGllcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBtaXhpbihvYmopIHtcbiAgZm9yICh2YXIga2V5IGluIFJlc3BvbnNlQmFzZS5wcm90b3R5cGUpIHtcbiAgICBvYmpba2V5XSA9IFJlc3BvbnNlQmFzZS5wcm90b3R5cGVba2V5XTtcbiAgfVxuICByZXR1cm4gb2JqO1xufVxuXG4vKipcbiAqIEdldCBjYXNlLWluc2Vuc2l0aXZlIGBmaWVsZGAgdmFsdWUuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGZpZWxkXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlc3BvbnNlQmFzZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24oZmllbGQpe1xuICAgIHJldHVybiB0aGlzLmhlYWRlcltmaWVsZC50b0xvd2VyQ2FzZSgpXTtcbn07XG5cbi8qKlxuICogU2V0IGhlYWRlciByZWxhdGVkIHByb3BlcnRpZXM6XG4gKlxuICogICAtIGAudHlwZWAgdGhlIGNvbnRlbnQgdHlwZSB3aXRob3V0IHBhcmFtc1xuICpcbiAqIEEgcmVzcG9uc2Ugb2YgXCJDb250ZW50LVR5cGU6IHRleHQvcGxhaW47IGNoYXJzZXQ9dXRmLThcIlxuICogd2lsbCBwcm92aWRlIHlvdSB3aXRoIGEgYC50eXBlYCBvZiBcInRleHQvcGxhaW5cIi5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gaGVhZGVyXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5SZXNwb25zZUJhc2UucHJvdG90eXBlLl9zZXRIZWFkZXJQcm9wZXJ0aWVzID0gZnVuY3Rpb24oaGVhZGVyKXtcbiAgICAvLyBUT0RPOiBtb2FyIVxuICAgIC8vIFRPRE86IG1ha2UgdGhpcyBhIHV0aWxcblxuICAgIC8vIGNvbnRlbnQtdHlwZVxuICAgIHZhciBjdCA9IGhlYWRlclsnY29udGVudC10eXBlJ10gfHwgJyc7XG4gICAgdGhpcy50eXBlID0gdXRpbHMudHlwZShjdCk7XG5cbiAgICAvLyBwYXJhbXNcbiAgICB2YXIgcGFyYW1zID0gdXRpbHMucGFyYW1zKGN0KTtcbiAgICBmb3IgKHZhciBrZXkgaW4gcGFyYW1zKSB0aGlzW2tleV0gPSBwYXJhbXNba2V5XTtcblxuICAgIHRoaXMubGlua3MgPSB7fTtcblxuICAgIC8vIGxpbmtzXG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKGhlYWRlci5saW5rKSB7XG4gICAgICAgICAgICB0aGlzLmxpbmtzID0gdXRpbHMucGFyc2VMaW5rcyhoZWFkZXIubGluayk7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgLy8gaWdub3JlXG4gICAgfVxufTtcblxuLyoqXG4gKiBTZXQgZmxhZ3Mgc3VjaCBhcyBgLm9rYCBiYXNlZCBvbiBgc3RhdHVzYC5cbiAqXG4gKiBGb3IgZXhhbXBsZSBhIDJ4eCByZXNwb25zZSB3aWxsIGdpdmUgeW91IGEgYC5va2Agb2YgX190cnVlX19cbiAqIHdoZXJlYXMgNXh4IHdpbGwgYmUgX19mYWxzZV9fIGFuZCBgLmVycm9yYCB3aWxsIGJlIF9fdHJ1ZV9fLiBUaGVcbiAqIGAuY2xpZW50RXJyb3JgIGFuZCBgLnNlcnZlckVycm9yYCBhcmUgYWxzbyBhdmFpbGFibGUgdG8gYmUgbW9yZVxuICogc3BlY2lmaWMsIGFuZCBgLnN0YXR1c1R5cGVgIGlzIHRoZSBjbGFzcyBvZiBlcnJvciByYW5naW5nIGZyb20gMS4uNVxuICogc29tZXRpbWVzIHVzZWZ1bCBmb3IgbWFwcGluZyByZXNwb25kIGNvbG9ycyBldGMuXG4gKlxuICogXCJzdWdhclwiIHByb3BlcnRpZXMgYXJlIGFsc28gZGVmaW5lZCBmb3IgY29tbW9uIGNhc2VzLiBDdXJyZW50bHkgcHJvdmlkaW5nOlxuICpcbiAqICAgLSAubm9Db250ZW50XG4gKiAgIC0gLmJhZFJlcXVlc3RcbiAqICAgLSAudW5hdXRob3JpemVkXG4gKiAgIC0gLm5vdEFjY2VwdGFibGVcbiAqICAgLSAubm90Rm91bmRcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gc3RhdHVzXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5SZXNwb25zZUJhc2UucHJvdG90eXBlLl9zZXRTdGF0dXNQcm9wZXJ0aWVzID0gZnVuY3Rpb24oc3RhdHVzKXtcbiAgICB2YXIgdHlwZSA9IHN0YXR1cyAvIDEwMCB8IDA7XG5cbiAgICAvLyBzdGF0dXMgLyBjbGFzc1xuICAgIHRoaXMuc3RhdHVzID0gdGhpcy5zdGF0dXNDb2RlID0gc3RhdHVzO1xuICAgIHRoaXMuc3RhdHVzVHlwZSA9IHR5cGU7XG5cbiAgICAvLyBiYXNpY3NcbiAgICB0aGlzLmluZm8gPSAxID09IHR5cGU7XG4gICAgdGhpcy5vayA9IDIgPT0gdHlwZTtcbiAgICB0aGlzLnJlZGlyZWN0ID0gMyA9PSB0eXBlO1xuICAgIHRoaXMuY2xpZW50RXJyb3IgPSA0ID09IHR5cGU7XG4gICAgdGhpcy5zZXJ2ZXJFcnJvciA9IDUgPT0gdHlwZTtcbiAgICB0aGlzLmVycm9yID0gKDQgPT0gdHlwZSB8fCA1ID09IHR5cGUpXG4gICAgICAgID8gdGhpcy50b0Vycm9yKClcbiAgICAgICAgOiBmYWxzZTtcblxuICAgIC8vIHN1Z2FyXG4gICAgdGhpcy5hY2NlcHRlZCA9IDIwMiA9PSBzdGF0dXM7XG4gICAgdGhpcy5ub0NvbnRlbnQgPSAyMDQgPT0gc3RhdHVzO1xuICAgIHRoaXMuYmFkUmVxdWVzdCA9IDQwMCA9PSBzdGF0dXM7XG4gICAgdGhpcy51bmF1dGhvcml6ZWQgPSA0MDEgPT0gc3RhdHVzO1xuICAgIHRoaXMubm90QWNjZXB0YWJsZSA9IDQwNiA9PSBzdGF0dXM7XG4gICAgdGhpcy5mb3JiaWRkZW4gPSA0MDMgPT0gc3RhdHVzO1xuICAgIHRoaXMubm90Rm91bmQgPSA0MDQgPT0gc3RhdHVzO1xufTtcbiIsInZhciBFUlJPUl9DT0RFUyA9IFtcbiAgJ0VDT05OUkVTRVQnLFxuICAnRVRJTUVET1VUJyxcbiAgJ0VBRERSSU5GTycsXG4gICdFU09DS0VUVElNRURPVVQnXG5dO1xuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHJlcXVlc3Qgc2hvdWxkIGJlIHJldHJpZWQuXG4gKiAoQm9ycm93ZWQgZnJvbSBzZWdtZW50aW8vc3VwZXJhZ2VudC1yZXRyeSlcbiAqXG4gKiBAcGFyYW0ge0Vycm9yfSBlcnJcbiAqIEBwYXJhbSB7UmVzcG9uc2V9IFtyZXNdXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBzaG91bGRSZXRyeShlcnIsIHJlcykge1xuICBpZiAoZXJyICYmIGVyci5jb2RlICYmIH5FUlJPUl9DT0RFUy5pbmRleE9mKGVyci5jb2RlKSkgcmV0dXJuIHRydWU7XG4gIGlmIChyZXMgJiYgcmVzLnN0YXR1cyAmJiByZXMuc3RhdHVzID49IDUwMCkgcmV0dXJuIHRydWU7XG4gIC8vIFN1cGVyYWdlbnQgdGltZW91dFxuICBpZiAoZXJyICYmICd0aW1lb3V0JyBpbiBlcnIgJiYgZXJyLmNvZGUgPT0gJ0VDT05OQUJPUlRFRCcpIHJldHVybiB0cnVlO1xuICBpZiAoZXJyICYmICdjcm9zc0RvbWFpbicgaW4gZXJyKSByZXR1cm4gdHJ1ZTtcbiAgcmV0dXJuIGZhbHNlO1xufTtcbiIsIlxuLyoqXG4gKiBSZXR1cm4gdGhlIG1pbWUgdHlwZSBmb3IgdGhlIGdpdmVuIGBzdHJgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmV4cG9ydHMudHlwZSA9IGZ1bmN0aW9uKHN0cil7XG4gIHJldHVybiBzdHIuc3BsaXQoLyAqOyAqLykuc2hpZnQoKTtcbn07XG5cbi8qKlxuICogUmV0dXJuIGhlYWRlciBmaWVsZCBwYXJhbWV0ZXJzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmV4cG9ydHMucGFyYW1zID0gZnVuY3Rpb24oc3RyKXtcbiAgcmV0dXJuIHN0ci5zcGxpdCgvICo7ICovKS5yZWR1Y2UoZnVuY3Rpb24ob2JqLCBzdHIpe1xuICAgIHZhciBwYXJ0cyA9IHN0ci5zcGxpdCgvICo9ICovKTtcbiAgICB2YXIga2V5ID0gcGFydHMuc2hpZnQoKTtcbiAgICB2YXIgdmFsID0gcGFydHMuc2hpZnQoKTtcblxuICAgIGlmIChrZXkgJiYgdmFsKSBvYmpba2V5XSA9IHZhbDtcbiAgICByZXR1cm4gb2JqO1xuICB9LCB7fSk7XG59O1xuXG4vKipcbiAqIFBhcnNlIExpbmsgaGVhZGVyIGZpZWxkcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5leHBvcnRzLnBhcnNlTGlua3MgPSBmdW5jdGlvbihzdHIpe1xuICByZXR1cm4gc3RyLnNwbGl0KC8gKiwgKi8pLnJlZHVjZShmdW5jdGlvbihvYmosIHN0cil7XG4gICAgdmFyIHBhcnRzID0gc3RyLnNwbGl0KC8gKjsgKi8pO1xuICAgIHZhciB1cmwgPSBwYXJ0c1swXS5zbGljZSgxLCAtMSk7XG4gICAgdmFyIHJlbCA9IHBhcnRzWzFdLnNwbGl0KC8gKj0gKi8pWzFdLnNsaWNlKDEsIC0xKTtcbiAgICBvYmpbcmVsXSA9IHVybDtcbiAgICByZXR1cm4gb2JqO1xuICB9LCB7fSk7XG59O1xuXG4vKipcbiAqIFN0cmlwIGNvbnRlbnQgcmVsYXRlZCBmaWVsZHMgZnJvbSBgaGVhZGVyYC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gaGVhZGVyXG4gKiBAcmV0dXJuIHtPYmplY3R9IGhlYWRlclxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZXhwb3J0cy5jbGVhbkhlYWRlciA9IGZ1bmN0aW9uKGhlYWRlciwgc2hvdWxkU3RyaXBDb29raWUpe1xuICBkZWxldGUgaGVhZGVyWydjb250ZW50LXR5cGUnXTtcbiAgZGVsZXRlIGhlYWRlclsnY29udGVudC1sZW5ndGgnXTtcbiAgZGVsZXRlIGhlYWRlclsndHJhbnNmZXItZW5jb2RpbmcnXTtcbiAgZGVsZXRlIGhlYWRlclsnaG9zdCddO1xuICBpZiAoc2hvdWxkU3RyaXBDb29raWUpIHtcbiAgICBkZWxldGUgaGVhZGVyWydjb29raWUnXTtcbiAgfVxuICByZXR1cm4gaGVhZGVyO1xufTsiLCJpbXBvcnQgQXBwbGljYXRpb24gZnJvbSAnLi9hcHBsaWNhdGlvbic7XG5pbXBvcnQgQnJvd3NlckhlbHBlciBmcm9tICcuL2Jyb3dzZXItaGVscGVyJztcblxuY29uc3QgUHJvbWlzZSA9IHJlcXVpcmUoJ2JsdWViaXJkJyk7XG5jb25zdCBzdXBlcmFnZW50ID0gcmVxdWlyZSgnc3VwZXJhZ2VudCcpO1xuY29uc3QgeWFtbCA9IHJlcXVpcmUoJ2pzLXlhbWwnKTtcblxuY29uc3QgbGFuZ3VhZ2VzID0gcmVxdWlyZSgnbGFuZ3VhZ2VzJyk7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFwcExhdW5jaGVyIHtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLmNvbmZpZyA9IHt9O1xuICAgIHRoaXMubGFuZyA9ICdlbic7XG4gICAgdGhpcy50aXRsZSA9ICdJTUFHSU5BUlknO1xuICAgIHRoaXMubG9nbyA9ICcnO1xuICAgIHRoaXMuYXBwcyA9IFtdO1xuICAgIHRoaXMuYXBwQ29udGFpbmVyID0gbnVsbDtcbiAgICB0aGlzLnJ1bm5pbmdBcHAgPSBudWxsO1xuICAgIHRoaXMuaW5mb0FwcCA9IG51bGw7XG4gICAgdGhpcy4kYm9keSA9IG51bGw7XG4gICAgdGhpcy4kaW5wdXRNYXNrID0gJCgnPGRpdiBjbGFzcz1cImlucHV0bWFza1wiPjwvZGl2PicpO1xuICAgIHRoaXMuJHRpdGxlUGFuZSA9ICQoJzxkaXYgY2xhc3M9XCJ0aXRsZVBhbmVcIj48L2Rpdj4nKTtcbiAgICB0aGlzLiRsb2dvVGV4dCA9IG51bGw7XG4gICAgdGhpcy4kb3ZlcmxheUNvbnRhaW5lciA9IG51bGw7XG4gICAgdGhpcy5vdmVybGF5VmlzaWJsZSA9IGZhbHNlO1xuICB9XG5cbiAgaW5pdCgpIHtcbiAgICB0aGlzLiRib2R5ID0gJCgnYm9keScpO1xuICAgIHRoaXMuJGJvZHkuYWRkQ2xhc3MoJ2xvY2stcG9zaXRpb24nKTtcbiAgICByZXR1cm4gdGhpcy5yZWFkQ29uZmlnKClcbiAgICAgIC50aGVuKChjb25maWcpID0+IHtcbiAgICAgICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgICAgIGNvbnN0IHRhc2tzID0gW107XG4gICAgICAgIHRhc2tzLnB1c2godGhpcy5sb2FkQXBwcyhjb25maWcuYXBwcykpO1xuICAgICAgICBpZiAoY29uZmlnLmluZm9BcHApIHtcbiAgICAgICAgICB0YXNrcy5wdXNoKHRoaXMubG9hZEluZm9BcHAoY29uZmlnLmluZm9BcHApKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwodGFza3MpO1xuICAgICAgfSlcbiAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgY29uc3QgcXMgPSBCcm93c2VySGVscGVyLmdldFF1ZXJ5U3RyaW5nKCk7XG4gICAgICAgIGlmIChxcy5sYW5nKSB7XG4gICAgICAgICAgdGhpcy5sYW5nID0gcXMubGFuZztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNldFRpdGxlKCk7XG4gICAgICAgIHRoaXMuc2V0TWVudU1vZGUoKTtcbiAgICAgICAgdGhpcy5pbml0UmVzaXplSGFuZGxlcigpO1xuICAgICAgICB0aGlzLmVuYWJsZVVzZXJJbnB1dCgpO1xuICAgICAgfSk7XG4gIH1cblxuICBpbml0UmVzaXplSGFuZGxlcigpIHtcbiAgICAvLyBUaW1lb3V0IGZvciB0aHJvdHRsZWQgcmVzaXplXG4gICAgbGV0IHJlc2l6ZVRpbWVvdXQ7XG5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgKCkgPT4ge1xuICAgICAgLy8gaWdub3JlIHJlc2l6ZSBldmVudHMgYXMgbG9uZyBhcyBhbiBhY3R1YWxSZXNpemVIYW5kbGVyIGV4ZWN1dGlvbiBpcyBpbiB0aGUgcXVldWVcbiAgICAgIGlmICghcmVzaXplVGltZW91dCkge1xuICAgICAgICByZXNpemVUaW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgcmVzaXplVGltZW91dCA9IG51bGw7XG4gICAgICAgICAgdGhpcy5vblJlc2l6ZSgpO1xuICAgICAgICAgIC8vIFRoZSBhY3R1YWxSZXNpemVIYW5kbGVyIHdpbGwgZXhlY3V0ZSBhdCBhIHJhdGUgb2YgMTVmcHNcbiAgICAgICAgfSwgNjYpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcmVhZENvbmZpZygpIHtcbiAgICBjb25zb2xlLmxvZygnUmVhZGluZyBjb25maWcnKTtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKGFjY2VwdCwgcmVqZWN0KSA9PiB7XG4gICAgICBzdXBlcmFnZW50XG4gICAgICAgIC5nZXQoJ2NmZy9jb25maWcueW1sJylcbiAgICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgY29uc3QgY29uZmlnID0geWFtbC5zYWZlTG9hZChyZXNwb25zZS50ZXh0KTtcbiAgICAgICAgICBpZiAoY29uZmlnLmxhbmcpIHtcbiAgICAgICAgICAgIHRoaXMubGFuZyA9IGNvbmZpZy5sYW5nO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoY29uZmlnLmluZm9BcHApIHtcbiAgICAgICAgICAgIHRoaXMuaW5mb0FwcCA9IGNvbmZpZy5pbmZvQXBwO1xuICAgICAgICAgIH1cbiAgICAgICAgICBhY2NlcHQoY29uZmlnKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBsb2FkQXBwQ29uZmlnKGFwcFJvb3QpIHtcbiAgICByZXR1cm4gc3VwZXJhZ2VudC5nZXQoYCR7YXBwUm9vdH0vYXBwLmpzb25gKVxuICAgICAgLnNldCgnQWNjZXB0JywgJ2pzb24nKVxuICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgIGNvbnN0IGFwcENvbmZpZyA9IHJlc3BvbnNlLmJvZHk7XG4gICAgICAgIGFwcENvbmZpZy5yb290ID0gYXBwUm9vdDtcbiAgICAgICAgcmV0dXJuIGFwcENvbmZpZztcbiAgICAgIH0pO1xuICB9XG5cbiAgbG9hZEFwcHMoYXBwTGlzdCkge1xuICAgIGNvbnNvbGUubG9nKCdMb2FkaW5nIGFwcHMnKTtcbiAgICB0aGlzLmFwcHMgPSBbXTtcbiAgICBjb25zdCBhcHBMb2FkZXJzID0gW107XG4gICAgbGV0IGkgPSAwO1xuICAgIGZvciAoY29uc3QgYXBwUm9vdCBvZiBhcHBMaXN0KSB7XG4gICAgICBjb25zdCBhcHBJbmRleCA9IGk7XG4gICAgICBhcHBMb2FkZXJzLnB1c2goXG4gICAgICAgIHRoaXMubG9hZEFwcENvbmZpZyhhcHBSb290KVxuICAgICAgICAgIC50aGVuKChhcHBDb25maWcpID0+IHtcbiAgICAgICAgICAgIHRoaXMuYXBwc1thcHBJbmRleF0gPSAobmV3IEFwcGxpY2F0aW9uKGFwcENvbmZpZykpO1xuICAgICAgICAgIH1cbiAgICAgICAgKVxuICAgICAgKTtcbiAgICAgIGkgKz0gMTtcbiAgICB9XG5cbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoYXBwTG9hZGVycyk7XG4gIH1cblxuICBsb2FkSW5mb0FwcChhcHBSb290KSB7XG4gICAgY29uc29sZS5sb2coJ0xvYWRpbmcgaW5mbyBhcHAnKTtcbiAgICByZXR1cm4gdGhpcy5sb2FkQXBwQ29uZmlnKGFwcFJvb3QpXG4gICAgICAudGhlbigoYXBwQ29uZmlnKSA9PiB7XG4gICAgICAgIHRoaXMuaW5mb0FwcCA9IG5ldyBBcHBsaWNhdGlvbihhcHBDb25maWcpO1xuICAgICAgfSk7XG4gIH1cblxuICBzZXRMYW5nKGxhbmdDb2RlKSB7XG4gICAgdGhpcy5sYW5nID0gbGFuZ0NvZGU7XG4gICAgdGhpcy5zZXRUaXRsZSgpO1xuICAgICQoJy5sb2dvJykucmVwbGFjZVdpdGgodGhpcy5yZW5kZXJMb2dvKCkpO1xuICAgICQoJy5tZW51LW1haW4nKS5yZXBsYWNlV2l0aCh0aGlzLnJlbmRlck1haW5NZW51KCkpO1xuICAgIHRoaXMucmVzaXplVGl0bGUoKTtcbiAgfVxuXG4gIG9uTG9nb0NsaWNrZWQoKSB7XG4gICAgdGhpcy5jbG9zZUFwcCgpO1xuICAgIHRoaXMuc2V0TWVudU1vZGUoKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBvbkxhbmdCdXR0b24oKSB7XG4gICAgdGhpcy5zaG93T3ZlcmxheSh0aGlzLnJlbmRlckxhbmdNZW51KCkpO1xuICB9XG5cbiAgb25JbmZvQnV0dG9uKCkge1xuICAgIGlmICh0aGlzLnJ1bm5pbmdBcHAgPT09IHRoaXMuaW5mb0FwcCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB0aGlzLnJ1bkFwcCh0aGlzLmluZm9BcHApO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIG9uQ2xvc2VCdXR0b24oKSB7XG4gICAgaWYgKHRoaXMub3ZlcmxheVZpc2libGUpIHtcbiAgICAgIHRoaXMuY2xvc2VPdmVybGF5KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY2xvc2VBcHAoKTtcbiAgICAgIHRoaXMuc2V0TWVudU1vZGUoKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgb25BcHBCdXR0b24oYXBwKSB7XG4gICAgdGhpcy5ydW5BcHAoYXBwKTtcbiAgICB0aGlzLmRpc3BsYXlUaXRsZShhcHAuZ2V0TmFtZSh0aGlzLmxhbmcpKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBydW5BcHAoYXBwKSB7XG4gICAgdGhpcy5kaXNhYmxlVXNlcklucHV0KCk7XG4gICAgdGhpcy5jbG9zZUFwcCgpO1xuICAgIHRoaXMuc2V0QXBwTW9kZSgpO1xuICAgIC8vIERlbGF5IGZvciBmbHVpZCBhbmltYXRpb25cbiAgICB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBhcHAucnVuKHRoaXMuYXBwQ29udGFpbmVyLCB0aGlzLmxhbmcpO1xuICAgICAgdGhpcy5zZXRBcHBWaXNpYmxlKHRydWUpO1xuICAgICAgdGhpcy5ydW5uaW5nQXBwID0gYXBwO1xuICAgICAgdGhpcy5lbmFibGVVc2VySW5wdXQoKTtcbiAgICB9LCA1MDApO1xuICB9XG5cbiAgY2xvc2VBcHAoKSB7XG4gICAgdGhpcy5zZXRBcHBWaXNpYmxlKGZhbHNlKTtcbiAgICB0aGlzLnJ1bm5pbmdBcHAgPSBudWxsO1xuICAgIHRoaXMuaGlkZVRpdGxlKCk7XG4gICAgJCh0aGlzLmFwcENvbnRhaW5lcikuZW1wdHkoKTtcbiAgfVxuXG4gIGNsZWFyTW9kZSgpIHtcbiAgICB0aGlzLiRib2R5LnJlbW92ZUNsYXNzKChpbmRleCwgY2xhc3NOYW1lKSA9PiAoY2xhc3NOYW1lLm1hdGNoKC8oXnxcXHMpbW9kZS1cXFMrL2cpIHx8IFtdKS5qb2luKCcgJykpO1xuICB9XG5cbiAgc2V0VGl0bGUoKSB7XG4gICAgaWYgKHR5cGVvZiB0aGlzLmNvbmZpZy50aXRsZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMudGl0bGUgPSB0aGlzLmNvbmZpZy50aXRsZTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB0aGlzLmNvbmZpZy50aXRsZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGlmICh0aGlzLmNvbmZpZy50aXRsZVt0aGlzLmxhbmddICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy50aXRsZSA9IHRoaXMuY29uZmlnLnRpdGxlW3RoaXMubGFuZ107XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBEZWZhdWx0cyB0byBlbmdsaXNoXG4gICAgICAgIHRoaXMudGl0bGUgPSB0aGlzLmNvbmZpZy50aXRsZS5lbjtcbiAgICAgIH1cbiAgICB9XG4gICAgZG9jdW1lbnQudGl0bGUgPSB0aGlzLnRpdGxlO1xuICB9XG5cbiAgc2V0TWVudU1vZGUoKSB7XG4gICAgdGhpcy5jbGVhck1vZGUoKTtcbiAgICB0aGlzLiRib2R5LmFkZENsYXNzKCdtb2RlLW1lbnUnKTtcbiAgfVxuXG4gIHNldEFwcE1vZGUoKSB7XG4gICAgdGhpcy5jbGVhck1vZGUoKTtcbiAgICB0aGlzLiRib2R5LmFkZENsYXNzKCdtb2RlLWFwcCcpO1xuICB9XG5cbiAgc2V0QXBwVmlzaWJsZSh2aXNpYmlsaXR5KSB7XG4gICAgaWYgKHZpc2liaWxpdHkpIHtcbiAgICAgIHRoaXMuJGJvZHkuYWRkQ2xhc3MoJ2FwcC12aXNpYmxlJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuJGJvZHkucmVtb3ZlQ2xhc3MoJ2FwcC12aXNpYmxlJyk7XG4gICAgfVxuICB9XG5cbiAgc2hvd092ZXJsYXkoY29udGVudCkge1xuICAgIHRoaXMub3ZlcmxheVZpc2libGUgPSB0cnVlO1xuICAgIHRoaXMuc2V0QXBwTW9kZSgpO1xuICAgIHRoaXMuJGJvZHkuYWRkQ2xhc3MoJ292ZXJsYXktdmlzaWJsZScpO1xuICAgIHRoaXMuJG92ZXJsYXlDb250YWluZXIuYXBwZW5kKGNvbnRlbnQpO1xuICB9XG5cbiAgY2xvc2VPdmVybGF5KCkge1xuICAgIHRoaXMuJGJvZHkucmVtb3ZlQ2xhc3MoJ292ZXJsYXktdmlzaWJsZScpO1xuICAgIHRoaXMuJG92ZXJsYXlDb250YWluZXIuZW1wdHkoKTtcbiAgICBpZiAodGhpcy5ydW5uaW5nQXBwID09PSBudWxsKSB7XG4gICAgICB0aGlzLnNldE1lbnVNb2RlKCk7XG4gICAgfVxuICAgIHRoaXMub3ZlcmxheVZpc2libGUgPSBmYWxzZTtcbiAgfVxuXG4gIGRpc3BsYXlUaXRsZShhVGl0bGUpIHtcbiAgICB0aGlzLiR0aXRsZVBhbmUudGV4dChhVGl0bGUpO1xuICAgIHRoaXMuJHRpdGxlUGFuZS5hZGRDbGFzcygndmlzaWJsZScpO1xuICB9XG5cbiAgaGlkZVRpdGxlKCkge1xuICAgIHRoaXMuJHRpdGxlUGFuZS5yZW1vdmVDbGFzcygndmlzaWJsZScpO1xuICB9XG5cbiAgZGlzYWJsZVVzZXJJbnB1dCgpIHtcbiAgICB0aGlzLiRpbnB1dE1hc2suc2hvdygpO1xuICB9XG5cbiAgZW5hYmxlVXNlcklucHV0KCkge1xuICAgIHRoaXMuJGlucHV0TWFzay5oaWRlKCk7XG4gIH1cblxuICByZW5kZXJVdGlsQmFyKCkge1xuICAgIGNvbnN0IHV0aWxCYXIgPSAkKCc8ZGl2IGNsYXNzPVwidXRpbC1iYXJcIj48L2Rpdj4nKTtcblxuICAgIGlmICh0aGlzLmNvbmZpZy5sYW5nTWVudVNob3cpIHtcbiAgICAgIHV0aWxCYXIuYXBwZW5kKFxuICAgICAgICAkKFwiPGEgY2xhc3M9J3V0aWwtYnV0dG9uIHV0aWwtYnV0dG9uLWxhbmcnIGhyZWY9JyMnPjxzcGFuIGNsYXNzPSdmYSBmYS1sYW5ndWFnZSc+PC9zcGFuPjwvYT5cIilcbiAgICAgICAgICAub24oJ2NsaWNrJywgdGhpcy5vbkxhbmdCdXR0b24uYmluZCh0aGlzKSlcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gSW5mbyBidXR0b25cbiAgICBpZiAodGhpcy5pbmZvQXBwKSB7XG4gICAgICB1dGlsQmFyLmFwcGVuZChcbiAgICAgICAgJChcIjxhIGNsYXNzPSd1dGlsLWJ1dHRvbiB1dGlsLWJ1dHRvbi1pbmZvJyBocmVmPScjJz48c3BhbiBjbGFzcz0nZmEgZmEtaW5mby1jaXJjbGUnPjwvc3Bhbj48L2E+XCIpXG4gICAgICAgICAgLm9uKCdjbGljaycsIHRoaXMub25JbmZvQnV0dG9uLmJpbmQodGhpcykpXG4gICAgICApO1xuICAgIH1cblxuICAgIC8vIENsb3NlIGJ1dHRvblxuICAgIHV0aWxCYXIuYXBwZW5kKFxuICAgICAgJChcIjxhIGNsYXNzPSd1dGlsLWJ1dHRvbiB1dGlsLWJ1dHRvbi1jbG9zZScgaHJlZj0nIyc+PHNwYW4gY2xhc3M9J2ZhIGZhLWFycm93LWxlZnQnPjwvc3Bhbj48L2E+XCIpXG4gICAgICAgIC5vbignY2xpY2snLCB0aGlzLm9uQ2xvc2VCdXR0b24uYmluZCh0aGlzKSlcbiAgICApO1xuXG4gICAgdXRpbEJhci5hcHBlbmQodGhpcy4kdGl0bGVQYW5lKTtcblxuICAgIHJldHVybiB1dGlsQmFyO1xuICB9XG5cbiAgcmVuZGVyTWFpbk1lbnUoKSB7XG4gICAgY29uc3QgbWFpbk1lbnUgPSAkKCc8ZGl2IGNsYXNzPVwibWVudS1tYWluXCI+PC9kaXY+Jyk7XG4gICAgY29uc3Qgcm93Q291bnQgPSBNYXRoLmNlaWwodGhpcy5hcHBzLmxlbmd0aCAvIDYpO1xuICAgIG1haW5NZW51LmFkZENsYXNzKGBtZW51LW1haW4tJHtyb3dDb3VudH0tcm93c2ApO1xuXG4gICAgbGV0IGN1cnJSb3cgPSBudWxsO1xuICAgIGZvciAobGV0IGkgPSAwOyBpICE9PSB0aGlzLmFwcHMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIGlmIChpICUgNiA9PT0gMCkge1xuICAgICAgICBjb25zdCByb3dJdGVtcyA9IHRoaXMuYXBwcy5sZW5ndGggLSBpID49IDYgPyA2IDogdGhpcy5hcHBzLmxlbmd0aCAtIGk7XG4gICAgICAgIGN1cnJSb3cgPSAkKCc8ZGl2IGNsYXNzPVwibWVudS1tYWluLXJvd1wiPjwvZGl2PicpO1xuICAgICAgICBjdXJyUm93LmFkZENsYXNzKGBtZW51LW1haW4tcm93LSR7cm93SXRlbXN9YCk7XG4gICAgICAgIG1haW5NZW51LmFwcGVuZChjdXJyUm93KTtcbiAgICAgIH1cbiAgICAgIGN1cnJSb3cuYXBwZW5kKHRoaXMucmVuZGVyTWFpbk1lbnVJdGVtKHRoaXMuYXBwc1tpXSkpO1xuICAgIH1cblxuICAgIHJldHVybiBtYWluTWVudTtcbiAgfVxuXG4gIHJlbmRlck1haW5NZW51SXRlbShhcHApIHtcbiAgICBjb25zdCBpdGVtID0gJCgnPGEgaHJlZj1cIiNcIiBjbGFzcz1cImJ1dHRvbiBtZW51LW1haW4tYnV0dG9uXCI+PC9hPicpXG4gICAgICAub24oJ2NsaWNrJywgdGhpcy5vbkFwcEJ1dHRvbi5iaW5kKHRoaXMsIGFwcCkpO1xuXG4gICAgaXRlbS5hcHBlbmQoJChgPGltZyBzcmM9XCIke2FwcC5nZXRJY29uKCl9XCIgY2xhc3M9XCJpY29uXCI+PC9kaXY+YCkpO1xuICAgIGl0ZW0uYXBwZW5kKCQoYDxkaXYgY2xhc3M9XCJuYW1lXCI+JHthcHAuZ2V0TmFtZSh0aGlzLmxhbmcpfTwvZGl2PmApKTtcblxuICAgIHJldHVybiBpdGVtO1xuICB9XG5cbiAgcmVuZGVyQXBwQ29udGFpbmVyKCkge1xuICAgIGNvbnN0IGFwcENvbnRhaW5lciA9ICQoJzxkaXYgY2xhc3M9XCJhcHBDb250YWluZXJcIj48L2Rpdj4nKTtcbiAgICB0aGlzLmFwcENvbnRhaW5lciA9IGFwcENvbnRhaW5lclswXTtcbiAgICByZXR1cm4gYXBwQ29udGFpbmVyO1xuICB9XG5cbiAgcmVuZGVyTG9nbygpIHtcbiAgICBjb25zdCAkbG9nbyA9ICQoXCI8YSBocmVmPScjJyBjbGFzcz0nbG9nbyc+PC9hPlwiKVxuICAgICAgLm9uKCdjbGljaycsIHRoaXMub25Mb2dvQ2xpY2tlZC5iaW5kKHRoaXMpKTtcblxuICAgIGlmICh0aGlzLmNvbmZpZy5sb2dvICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmICh0eXBlb2YgdGhpcy5jb25maWcubG9nbyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhpcy5sb2dvID0gdGhpcy5jb25maWcubG9nbztcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHRoaXMuY29uZmlnLmxvZ28gPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5sb2dvW3RoaXMubGFuZ10gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHRoaXMubG9nbyA9IHRoaXMuY29uZmlnLmxvZ29bdGhpcy5sYW5nXTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmNvbmZpZy5sb2dvLmRlZmF1bHQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHRoaXMubG9nbyA9IHRoaXMuY29uZmlnLmxvZ28uZGVmYXVsdDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLmxvZ28gIT09ICcnKSB7XG4gICAgICAkbG9nby5jc3MoJ2JhY2tncm91bmQtaW1hZ2UnLCBgdXJsKCR7dGhpcy5sb2dvfSlgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgdGhlcmUgaXMgbm8gbG9nbyB1c2UgdGhlIHRpdGxlXG4gICAgICB0aGlzLiRsb2dvVGV4dCA9ICQoXCI8ZGl2IGNsYXNzPSdsb2dvLXRleHQnPjwvZGl2PlwiKS50ZXh0KHRoaXMudGl0bGUpO1xuICAgICAgJGxvZ28uYXBwZW5kKCQoXCI8ZGl2IGNsYXNzPSdsb2dvLXRleHQtd3JhcHBlcic+PC9kaXY+XCIpLmFwcGVuZCh0aGlzLiRsb2dvVGV4dCkpO1xuICAgIH1cblxuICAgIHJldHVybiAkbG9nbztcbiAgfVxuXG4gIHJlbmRlck92ZXJsYXlDb250YWluZXIoKSB7XG4gICAgY29uc3QgJG92ZXJsYXkgPSAkKFwiPGRpdiBjbGFzcz0nb3ZlcmxheSc+PC9kaXY+XCIpO1xuICAgICRvdmVybGF5LmFwcGVuZCgkKFwiPGRpdiBjbGFzcz0nb3ZlcmxheS1iYWNrZ3JvdW5kJz48L2Rpdj5cIikpO1xuICAgIHRoaXMuJG92ZXJsYXlDb250YWluZXIgPSAkKFwiPGRpdiBjbGFzcz0nb3ZlcmxheS1jb250YWluZXInPjwvZGl2PlwiKTtcbiAgICAkb3ZlcmxheS5hcHBlbmQodGhpcy4kb3ZlcmxheUNvbnRhaW5lcik7XG5cbiAgICByZXR1cm4gJG92ZXJsYXk7XG4gIH1cblxuICBvbkxhbmdNZW51Q2hvaWNlKGNvZGUpIHtcbiAgICB0aGlzLmNsb3NlT3ZlcmxheSgpO1xuICAgIHRoaXMuc2V0TGFuZyhjb2RlKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZW5kZXJMYW5nTWVudSgpIHtcbiAgICBjb25zdCAkbWVudSA9ICQoXCI8dWwgY2xhc3M9J21lbnUtbGFuZyc+PC91bD5cIik7XG5cbiAgICBmb3IgKGNvbnN0IGxhbmdDb2RlIG9mIHRoaXMuY29uZmlnLmxhbmdNZW51SXRlbXMpIHtcbiAgICAgIGNvbnN0IGxhbmdJbmZvID0gbGFuZ3VhZ2VzLmdldExhbmd1YWdlSW5mbyhsYW5nQ29kZSk7XG4gICAgICBpZiAobGFuZ0luZm8pIHtcbiAgICAgICAgY29uc3QgJGl0ZW0gPSAkKCc8bGk+PC9saT4nKTtcbiAgICAgICAgY29uc3QgJGxpbmsgPSAkKFwiPGEgaHJlZj0nIyc+PC9hPlwiKTtcbiAgICAgICAgJGxpbmsudGV4dChsYW5nSW5mby5uYXRpdmVOYW1lKTtcbiAgICAgICAgJGxpbmsub24oJ2NsaWNrJywgdGhpcy5vbkxhbmdNZW51Q2hvaWNlLmJpbmQodGhpcywgbGFuZ0NvZGUpKTtcbiAgICAgICAgJGl0ZW0uYXBwZW5kKCRsaW5rKTtcbiAgICAgICAgJG1lbnUuYXBwZW5kKCRpdGVtKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gJG1lbnU7XG4gIH1cblxuICByZXNpemVUaXRsZSgpIHtcbiAgICBpZiAodGhpcy4kbG9nb1RleHQpIHtcbiAgICAgIGNvbnN0IG1heFdpZHRoID0gd2luZG93LmlubmVyV2lkdGggKiAwLjk7XG4gICAgICBjb25zdCBtYXhIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgKiAwLjE1O1xuICAgICAgY29uc3QgbmV3U2NhbGUgPSBNYXRoLm1pbihcbiAgICAgICAgbWF4SGVpZ2h0IC8gdGhpcy4kbG9nb1RleHQub3V0ZXJIZWlnaHQoKSxcbiAgICAgICAgbWF4V2lkdGggLyB0aGlzLiRsb2dvVGV4dC5vdXRlcldpZHRoKCksXG4gICAgICAgIDFcbiAgICAgICk7XG5cbiAgICAgIHRoaXMuJGxvZ29UZXh0LmNzcygndHJhbnNmb3JtJywgYHNjYWxlKCR7bmV3U2NhbGV9KWApO1xuICAgIH1cbiAgfVxuXG4gIG9uUmVzaXplKCkge1xuICAgIHRoaXMucmVzaXplVGl0bGUoKTtcbiAgfVxuXG4gIG9uUmVhZHkoKSB7XG4gICAgd2luZG93LnNldFRpbWVvdXQodGhpcy5yZXNpemVUaXRsZS5iaW5kKHRoaXMpLCAwKTtcbiAgfVxuXG4gIHJlbmRlcigpIHtcbiAgICBjb25zdCB2aWV3ID0gJChcIjxkaXYgY2xhc3M9J2FwcExhdW5jaGVyJz48L2Rpdj5cIik7XG4gICAgdmlldy5hcHBlbmQodGhpcy5yZW5kZXJMb2dvKCkpO1xuICAgIHZpZXcuYXBwZW5kKHRoaXMucmVuZGVyTWFpbk1lbnUoKSk7XG4gICAgdmlldy5hcHBlbmQoJCgnPGRpdiBjbGFzcz1cImFwcFBhbmVcIj48L2Rpdj4nKSk7XG4gICAgdmlldy5hcHBlbmQodGhpcy5yZW5kZXJBcHBDb250YWluZXIoKSk7XG4gICAgdmlldy5hcHBlbmQodGhpcy5yZW5kZXJPdmVybGF5Q29udGFpbmVyKCkpO1xuICAgIHZpZXcuYXBwZW5kKHRoaXMucmVuZGVyVXRpbEJhcigpKTtcbiAgICB2aWV3LmFwcGVuZCh0aGlzLiRpbnB1dE1hc2spO1xuXG4gICAgcmV0dXJuIHZpZXc7XG4gIH1cbn1cbiIsImV4cG9ydCBkZWZhdWx0IGNsYXNzIEFwcGxpY2F0aW9uIHtcblxuICBjb25zdHJ1Y3Rvcihjb25maWcpIHtcbiAgICB0aGlzLmlkID0gY29uZmlnLmlkO1xuICAgIHRoaXMucm9vdCA9IGNvbmZpZy5yb290O1xuICAgIHRoaXMudmVyc2lvbiA9IGNvbmZpZy52ZXJzaW9uO1xuICAgIHRoaXMubWFpbiA9IGNvbmZpZy5tYWluO1xuICAgIHRoaXMud2lkdGggPSBjb25maWcud2lkdGg7XG4gICAgdGhpcy5oZWlnaHQgPSBjb25maWcuaGVpZ2h0O1xuICAgIHRoaXMubmFtZSA9IGNvbmZpZy5uYW1lO1xuICAgIHRoaXMuZGVzY3JpcHRpb24gPSBjb25maWcuZGVzY3JpcHRpb247XG4gICAgY29uc29sZS5sb2coYENyZWF0ZSBhcHAgJHt0aGlzLmlkfWApO1xuICB9XG5cbiAgZ2V0TmFtZShsYW5nID0gJ2VuJykge1xuICAgIGlmICh0aGlzLm5hbWVbbGFuZ10pIHtcbiAgICAgIHJldHVybiB0aGlzLm5hbWVbbGFuZ107XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm5hbWUuZW47XG4gIH1cblxuICBnZXREZXNjcmlwdGlvbihsYW5nID0gJ2VuJykge1xuICAgIGlmICh0aGlzLmRlc2NyaXB0aW9uW2xhbmddKSB7XG4gICAgICByZXR1cm4gdGhpcy5kZXNjcmlwdGlvbltsYW5nXTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZGVzY3JpcHRpb24uZW47XG4gIH1cblxuICBnZXRJY29uKCkge1xuICAgIHJldHVybiBgJHt0aGlzLnJvb3R9L2ljb25zL2ljb24ucG5nYDtcbiAgfVxuXG4gIHJ1bihjb250YWluZXIsIGxhbmcgPSAnZW4nKSB7XG4gICAgd2luZG93LklNQUdJTkFSWS5DaW5keVZpZXdlci5jcmVhdGUoXG4gICAgICBjb250YWluZXIsXG4gICAgICBgJHt0aGlzLnJvb3R9LyR7dGhpcy5tYWlufWAsXG4gICAgICB0aGlzLndpZHRoID8gdGhpcy53aWR0aCA6IG51bGwsXG4gICAgICB0aGlzLmhlaWdodCA/IHRoaXMuaGVpZ2h0IDogbnVsbCxcbiAgICAgIGxhbmdcbiAgICApO1xuICB9XG59XG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBCcm93c2VySGVscGVyIHtcbiAgLyoqXG4gICAqIEdldHMgdGhlIHF1ZXJ5IHN0cmluZ1xuICAgKiBAcmV0dXJuIHtvYmplY3R9IG1hcCBvZiBxdWVyeSBzdHJpbmcgcGFyYW1ldGVyc1xuICAgKi9cbiAgc3RhdGljIGdldFF1ZXJ5U3RyaW5nKCkge1xuICAgIGNvbnN0IHBsID0gL1xcKy9nOyAgLy8gUmVnZXggZm9yIHJlcGxhY2luZyBhZGRpdGlvbiBzeW1ib2wgd2l0aCBhIHNwYWNlXG4gICAgY29uc3Qgc2VhcmNoID0gLyhbXiY9XSspPT8oW14mXSopL2c7XG4gICAgY29uc3QgZGVjb2RlID0gKHMgPT4gZGVjb2RlVVJJQ29tcG9uZW50KHMucmVwbGFjZShwbCwgJyAnKSkpO1xuICAgIGNvbnN0IHF1ZXJ5ID0gd2luZG93LmxvY2F0aW9uLnNlYXJjaC5zdWJzdHJpbmcoMSk7XG5cbiAgICBjb25zdCB1cmxQYXJhbXMgPSB7fTtcbiAgICBsZXQgbWF0Y2ggPSBzZWFyY2guZXhlYyhxdWVyeSk7XG4gICAgd2hpbGUgKG1hdGNoKSB7XG4gICAgICB1cmxQYXJhbXNbZGVjb2RlKG1hdGNoWzFdKV0gPSBkZWNvZGUobWF0Y2hbMl0pO1xuICAgICAgbWF0Y2ggPSBzZWFyY2guZXhlYyhxdWVyeSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHVybFBhcmFtcztcbiAgfVxufVxuIiwiaW1wb3J0IEFwcExhdW5jaGVyIGZyb20gJy4vYXBwbGF1bmNoZXInO1xuXG5pZiAoIXdpbmRvdy5JTUFHSU5BUlkpIHtcbiAgd2luZG93LklNQUdJTkFSWSA9IHt9O1xufVxuXG5jb25zdCBhcHBMYXVuY2hlciA9IG5ldyBBcHBMYXVuY2hlcigpO1xud2luZG93LklNQUdJTkFSWS5BcHBMYXVuY2hlciA9IGFwcExhdW5jaGVyO1xuJCgoKSA9PiB7XG4gIGFwcExhdW5jaGVyLmluaXQoKS50aGVuKCgpID0+IHtcbiAgICAkKCdib2R5JykuYXBwZW5kKGFwcExhdW5jaGVyLnJlbmRlcigpKTtcbiAgICBhcHBMYXVuY2hlci5vblJlYWR5KCk7XG4gIH0pO1xufSk7Il19
