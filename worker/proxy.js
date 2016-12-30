define(function() {
    var proxies = {};

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
            if (data.load) {
                loadModule(data.load);
            }
        }
        else {
            callModuleMethod(data);
        }
    }

    function loadModule(name) {
        if (proxies[name]) {
            return;
        }

        var proxy = proxies[name] = {};
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
        var proxy = proxies[req.module];
        if (!proxy || proxy.methods.indexOf(req.method) === -1) {
            return;
        }

        var 
            response = {
                module: req.module,
                method: req.method,
                cid: req.cid
            },
            promise;

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

        return obj;
    }
});