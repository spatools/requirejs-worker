define(function () {
    if (typeof window === "undefined") {
        return { load: function (name, req, onLoad) { onLoad(); } };
    }

    var
        slice = Array.prototype.slice,

        HAS_WORKER = "Worker" in window,
        IS_ALMOND = require.length === 5,

        WORKER_CONFIG,
        WORKER, WORKER_PROMISE, WORKER_RESOLVE,

        PROXIES = {};

    WebWorkerError.prototype = Error.prototype; // Before return

    return {
        load: HAS_WORKER ? loadWorker : loadSimple,
        pluginBuilder: "worker/builder",

        WebWorkerError: WebWorkerError // Can serve as error checker
    };

    /*
     * LOAD FUNCTIONS
     */

    function loadWorker(name, req, onLoad, config) {
        WORKER_CONFIG = WORKER_CONFIG || (config && config.worker) || {};
        WORKER_CONFIG.path = WORKER_CONFIG.path || "webworker.js";

        ensureProxy(name, onLoad);
    }

    function loadSimple(name, req, onLoad, config) {
        req([name], onLoad);
    }

    /*
     * WORKER METHODS
     */

    function ensureWorker() {
        if (WORKER_PROMISE) {
            return WORKER_PROMISE;
        }

        if (WORKER) {
            return Promise.resolve(WORKER);
        }

        log("Launching worker from url:", WORKER_CONFIG.path);

        WORKER = new Worker(WORKER_CONFIG.path);
        WORKER.onmessage = onWorkerMessage;

        return (WORKER_PROMISE = new Promise(function (res) { WORKER_RESOLVE = res; }));
    }

    /*
     * PROXY METHODS
     */
    function ensureProxy(name, onLoad) {
        var proxy = PROXIES[name];
        if (proxy) {
            if (proxy.isLoaded) {
                onLoad(proxy.module);
            }

            if (typeof proxy.onLoad === "function") {
                proxy.onLoad = [proxy.onLoad, onLoad];
            }
            else if (Array.isArray(proxy.onLoad)) {
                proxy.onLoad.push(onLoad);
            }

            return;
        }

        proxy = PROXIES[name] = { 
            name: name, 
            onLoad: onLoad,
            operations: {},
            isLoaded: false
        };

        if (IS_ALMOND) {
            warn("Almond Detected! Make sure you really need almond because there is a perf issue with requirejs-worker plugin.");

            var mod = require(name);
            proxy.methods = Object.keys(mod).filter(function(key) { return typeof mod[key] === "function"; });
            proxy.module = buildProxyModule(proxy);
            onLoad(proxy.module);
        }

        ensureWorker().then(function (worker) {
            log("Send load request for module:", name, "to Worker");

            worker.postMessage({ module: "system", method: "load", args: name });
        });
    }

    function ensureProxyPromise(name) {
        return new Promise(function (resolve) {
            ensureProxy(name, resolve);
        });
    }

    function buildProxyModule(proxy) {
        var module = {};

        proxy.methods.forEach(function (method) {
            module[method] = buildProxyMethod(proxy, method);
        });

        return module;
    }

    function buildProxyMethod(proxy, method) {
        var name = proxy.name,
            operations = proxy.operations;

        return function () {
            var args = slice.call(arguments),
                cid = generateCid(),
                operation = operations[cid] = {};

            operation.promise = new Promise(function (res, rej) {
                operation.resolve = res;
                operation.reject = rej;
            });

            return ensureProxyPromise(name)
                .then(ensureWorker)
                .then(function (worker) {
                    log("Send method request '" + name + "." + method + " (cid: " + cid + ")' to Worker");

                    worker.postMessage({ module: name, method: method, cid: cid, args: args });
                })
                .then(function () {
                    return operation.promise;
                });
        };
    }

    function generateCid() {
        return Math.floor(0xcfd41b90fffff * Math.random()).toString(36);
    }

    /*
     * HANDLERS METHODS
     */
    function onWorkerMessage(e) {
        var data = e.data || {};
        if (typeof data === "string") {
            data = JSON.parse(data);
        }

        if (data.module === "system") {
            switch (data.method) {
                case "init":
                    return onWorkerInitialized();
                case "load":
                    return onModuleLoaded(data.result);
            }
        }
        else {
            onModuleMethodResult(data);
        }
    }

    function onWorkerInitialized() {
        WORKER.postMessage({ module: "system", method: "config", args: WORKER_CONFIG });
        
        WORKER_RESOLVE(WORKER);
        WORKER_PROMISE = WORKER_RESOLVE = null;

        log("Worker initialized!");
    }

    function onModuleLoaded(res) {
        var proxy = PROXIES[res.name];

        if (!IS_ALMOND) {
            proxy.methods = res.methods;
            proxy.module = buildProxyModule(proxy);
        }

        proxy.isLoaded = true;

        Array.isArray(proxy.onLoad) ?
            proxy.onLoad.forEach(function (onLoad) { onLoad(proxy.module); }) :
            proxy.onLoad(proxy.module);

        delete proxy.onLoad;

        log("Module", res.name, "sucessfully loaded!");
    }

    function onModuleMethodResult(res) {
        var proxy = PROXIES[res.module];
        if (!proxy || !proxy.isLoaded || proxy.methods.indexOf(res.method) === -1) {
            warn("Method", res.method, "not found in", res.module);
            return;
        }

        var operation = proxy.operations[res.cid];
        if (!operation) {
            warn("Method", getMethodString(res), "is not found in proxy operations!");
            return;
        }

        if (res.error) {
            operation.reject(new WebWorkerError(res.error));
            warn("Method", getMethodString(res), "sent an error!");
        }
        else {
            operation.resolve(res.result);
            log("Method", getMethodString(res), "resolved successfully!");
        }

        delete proxy.operations[res.cid];
    }

    /*
     * ERRORS
     */

    function WebWorkerError(errorObj) {
        this.name = "WebWorkerError";
        this.message = errorObj.message || "";

        if (WORKER_CONFIG.stack && errorObj.stack) {
            this.stack = errorObj.stack;
        }
    }

    /*
     * DEBUG METHODS
     */

    function getMethodString(res) {
        return "'" + res.module + "." + res.method + " (cid: " + res.cid + ")'";
    }

    function log() {
        if (WORKER_CONFIG && WORKER_CONFIG.debug) {
            console.log.apply(console, ["RJSW >>> DOM >>>"].concat(slice.call(arguments)));
        }
    }
    
    function warn() {
        if (WORKER_CONFIG && WORKER_CONFIG.debug) {
            console.warn.apply(console, ["RJSW >>> DOM >>>"].concat(slice.call(arguments)));
        }
    }
});