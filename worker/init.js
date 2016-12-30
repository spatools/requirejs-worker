define(["worker/proxy"], function(proxy) {
    onmessage = proxy.onmessage;
    proxy.init();
});