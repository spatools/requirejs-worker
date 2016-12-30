define(function () {
    if (typeof window === "undefined") {
        return { load: function (name, req, onLoad) { onLoad(); } };
    }

    var
        HAS_WORKER = "Worker" in window,
        WORKER_PATH = "worker.js",

        WORKER, WORKER_PROMISE, WORKER_RESOLVE,

        PROXIES = {};

    return {
        load: HAS_WORKER ? loadWorker : loadSimple,
        pluginBuilder: "worker/builder"
    };

    /*
     * LOAD FUNCTIONS
     */

    function loadWorker(name, req, onLoad, config) {
        if (config.workerUrl) {
            WORKER_PATH = config.workerUrl;
        }

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

        WORKER = new Worker(WORKER_PATH);
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

        PROXIES[name] = { onLoad: onLoad };

        ensureWorker().then(function (worker) {
            worker.postMessage({ module: "system", load: name });
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
            var args = Array.prototype.slice.call(arguments),
                cid = generateCid(),
                operation = operations[cid] = {};

            operation.promise = new Promise(function (res, rej) {
                operation.resolve = res;
                operation.reject = rej;
            });

            return ensureWorker()
                .then(function (worker) {
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
        WORKER_RESOLVE(WORKER);
        WORKER_PROMISE = WORKER_RESOLVE = null;
    }

    function onModuleLoaded(res) {
        var proxy = PROXIES[res.name];
        proxy.name = res.name;
        proxy.methods = res.methods;
        proxy.operations = {};
        proxy.module = buildProxyModule(proxy);
        proxy.isLoaded = true;

        Array.isArray(proxy.onLoad) ?
            proxy.onLoad.forEach(function (onLoad) { onLoad(proxy.module); }) :
            proxy.onLoad(proxy.module);

        delete proxy.onLoad;
    }

    function onModuleMethodResult(res) {
        var proxy = PROXIES[res.module];
        if (!proxy || !proxy.isLoaded || proxy.methods.indexOf(res.method) === -1) {
            return;
        }

        var operation = proxy.operations[res.cid];
        if (!operation) {
            return;
        }

        res.error ? operation.reject(res.error) : operation.resolve(res.result);
        delete proxy.operations[res.cid];
    }
});