({
    name: "requirejs",
    baseUrl: "tests",
    out: "dist/main.js",

    paths: {
        requirejs: "../node_modules/requirejs/require",
        worker: "../worker"
    },

    include: ["main"],
    insertRequire: ["main"],

    wrap: true
})