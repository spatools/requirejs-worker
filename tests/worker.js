importScripts(
    "require.js"
);

requirejs.config({
    paths: {
        worker: "../worker"
    }
});

require(["worker/proxy"], function(proxy) {
    onmessage = proxy.onmessage;
    proxy.init();
});