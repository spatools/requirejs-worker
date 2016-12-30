define(function () {
    var 
        ABSOLUTE_URL_REGEXP = /^([^\:\/]+:\/)?\//,

        IS_WINDOWS = !!process.platform.match(/^win/),

        OUT_DIR,
        CONFIG,

        WORKERS_BUFFERS = {},
        LAYER_BUFFERS = {};

    return {
        load: load,
        write: write,
        onLayerEnd: onLayerEnd
    };

    function load(name, req, onLoad, config) {
        CONFIG = CONFIG || config;
        OUT_DIR = OUT_DIR || (config.dir || path.dirname(config.out)).replace(/\\/g, "/");

        // External URLs don't get added (just like JS requires)
        if (ABSOLUTE_URL_REGEXP.test(name)) {
            return onLoad();
        }

        var fileUrl = req.toUrl(name + ".js")
                         .replace(/\\/g, "/");

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

        if (CONFIG.skipFallback) {
            return;
        }

        // Add fallback in case of no worker
        write.asModule(moduleName, content);
    }

    function onLayerEnd(write, data) {
        var out = path.join(path.dirname(data.path), "worker.js"),
            content = "";

        console.log(CONFIG);

        saveFile(out, content);
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

});