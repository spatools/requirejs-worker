importScripts(
    // "https://rawgit.com/stefanpenner/es6-promise/master/dist/es6-promise.auto.js", // Uncomment for IE10
    "../node_modules/requirejs/require.js"
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