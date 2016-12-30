define(function () {
    var 
        ABSOLUTE_URL_REGEXP = /^([^\:\/]+:\/)?\//,

        IS_WINDOWS = !!process.platform.match(/^win/),

        RJS_PATH,
        CONFIG, WORKER_CONFIG,

        WORKERS_BUFFERS = {},
        LAYER_BUFFERS = {};

    return {
        load: load,
        write: write,
        onLayerEnd: onLayerEnd
    };

    function load(name, req, onLoad, config) {
        CONFIG = CONFIG || config;
        RJS_PATH = RJS_PATH || req.toUrl("worker/r.js").replace(/\\/g, "/");

        WORKER_CONFIG = WORKER_CONFIG || config.worker || {};
        WORKER_CONFIG.path = WORKER_CONFIG.path || "webworker.js";

        // External URLs don't get added (just like JS requires)
        if (ABSOLUTE_URL_REGEXP.test(name)) {
            return onLoad();
        }

        var fileUrl = req.toUrl(name + ".js").replace(/\\/g, "/");

        // Add file to buffer
        WORKERS_BUFFERS[name] = loadFile(fileUrl);

        onLoad();
    }

    function write(pluginName, moduleName, write) {
        if (!WORKERS_BUFFERS.hasOwnProperty(moduleName)) {
            return;
        }

        // External URLs don't get added (just like JS requires)
        if (ABSOLUTE_URL_REGEXP.test(moduleName)) {
            return;
        }

        var content = WORKERS_BUFFERS[moduleName];
        LAYER_BUFFERS[moduleName] = content;

        if (WORKER_CONFIG.fallbacks === false) {
            return;
        }

        // Add fallback in case of no worker
        write.asModule(moduleName, content);
    }

    function onLayerEnd(write, data) {
        if (WORKER_CONFIG.output === false) {
            return;
        }

        var 
            out = path.join(path.dirname(data.path), WORKER_CONFIG.path).replace(/\\/g, "/"),
            workers = Object.keys(LAYER_BUFFERS);

        process.nextTick(function() {
            var
                rjs = nodeRequire(RJS_PATH),
                config = cloneConfig(out, workers);

            rjs.optimize(config, function(output) {
                console.log(output);
            });
        });
    }

    function cloneConfig(out, include) {
        var config = extend({}, CONFIG, { out: out, include: include }, WORKER_CONFIG.overrides || {});

        if (config.name === "almond" || config.name === "requirejs") {
            include.unshift("worker/init");
            config.insertRequire = ["worker/init"];
        }
        else {
            // TODO: FIX DOES NOT WORK FOR NOW
            // worker/proxy module is inserted before webworker so no requirejs
            config.name = "";
            include.unshift("webworker");
        }

        delete config.modules;
        delete config.buildFile;
        
        return config;        
    }

    function loadFile(path) {
        if (typeof process !== "undefined" && process.versions && !!process.versions.node && require.nodeRequire) {
            var fs = require.nodeRequire("fs");
            var file = fs.readFileSync(path, "utf8");

            if (file.indexOf("\uFEFF") === 0) {
                return file.substring(1);
            }

            return file;
        }
        else {
            var file = new java.io.File(path),
                lineSeparator = java.lang.System.getProperty("line.separator"),
                input = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(file), "utf-8")),
                stringBuffer, line;

            try {
                stringBuffer = new java.lang.StringBuffer();
                line = input.readLine();

                if (line && line.length() && line.charAt(0) === 0xfeff) {
                    line = line.substring(1);
                }

                stringBuffer.append(line);

                while ((line = input.readLine()) !== null) {
                    stringBuffer.append(lineSeparator).append(line);
                }

                return String(stringBuffer.toString());
            }
            finally {
                input.close();
            }
        }
    }

    function saveFile(path, data) {
        if (typeof process !== "undefined" && process.versions && !!process.versions.node && require.nodeRequire) {
            var fs = require.nodeRequire("fs");
            fs.writeFileSync(path, data, "utf8");
        }
        else {
            var content = new java.lang.String(data),
                output = new java.io.BufferedWriter(new java.io.OutputStreamWriter(new java.io.FileOutputStream(path), "utf-8"));

            try {
                output.write(content, 0, content.length());
                output.flush();
            }
            finally {
                output.close();
            }
        }
    }

    function extend(obj) {
        var froms = Array.prototype.slice.call(arguments, 1);

        froms.forEach(function(from) {
            Object.keys(from).forEach(function(key) {
                obj[key] = from[key];
            });
        });

        return obj;
    }

});