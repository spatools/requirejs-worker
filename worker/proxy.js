define(function() {
    if (typeof importScripts === "undefined") {
        throw new Error("This script could only be loaded in a Web Worker context!");
    }

    var 
        slice = Array.prototype.slice,

        WORKER_CONFIG = {},
        PROXIES = {};

    return {
        init: init,
        onmessage: onmessage
    };

    function init() {
        postMessage({
            module: "system",
            method: "init"
        });
    }

    function onmessage(e) {
        var data = e.data || {};
        if (typeof data === "string") {
            data = JSON.parse(data);
        }
        
        if (data.module === "system") {
            switch (data.method) {
                case "load":
                    return loadModule(data.args);
                case "config":
                    WORKER_CONFIG = data.args;
                    break;
            }
        }
        else {
            callModuleMethod(data);
        }
    }

    function loadModule(name) {
        if (PROXIES[name]) {
            return;
        }

        log("Loading Module", name);

        var proxy = PROXIES[name] = {};
        require([name], function (module) {
            proxy.name = name;
            proxy.module = module;
            proxy.methods = extractMethods(module);

            postMessage({
                module: "system",
                method: "load",
                result: {
                    name: name,
                    methods: proxy.methods
                }
            });
        });
    }

    function extractMethods(module) {
        return Object.keys(module)
            .filter(function (key) { return typeof module[key] === "function"; });
    }

    function callModuleMethod(req) {
        var proxy = PROXIES[req.module];
        if (!proxy || proxy.methods.indexOf(req.method) === -1) {
            warn("Method", req.method, "not found in", req.module);
            return;
        }

        var 
            response = {
                module: req.module,
                method: req.method,
                cid: req.cid
            },
            promise;

        log("Calling method", getMethodString(req));

        try {
            var res = proxy.module[req.method].apply(proxy.module, req.args || []);
            promise = Promise.resolve(res)
        }
        catch (err) {
            promise = Promise.reject(err);
        }

        promise
            .then(function (result) {
                response.result = result;
            })
            .catch(function (error) {
                response.error = createErrorObject(error);
            })
            .then(function() {
                log("Sending method", getMethodString(req), "response");
                postMessage(response);
            });
    }

    function createErrorObject(error) {
        var obj = {
            message: error.message
        };

        Object.keys(error).forEach(function(key) {
            obj[key] = error[key];
        });

        if (WORKER_CONFIG.stack) {
            obj.stack = error.stack;
        }

        return obj;
    }

    /*
     * DEBUG METHODS
     */

    function getMethodString(res) {
        return "'" + res.module + "." + res.method + " (cid: " + res.cid + ")'";
    }

    function log() {
        if (WORKER_CONFIG && WORKER_CONFIG.debug) {
            console.log.apply(console, ["RJSW >>> WORKER >>>"].concat(slice.call(arguments)));
        }
    }
    
    function warn() {
        if (WORKER_CONFIG && WORKER_CONFIG.debug) {
            console.warn.apply(console, ["RJSW >>> WORKER >>>"].concat(slice.call(arguments)));
        }
    }
});