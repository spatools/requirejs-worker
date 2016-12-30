({
    name: "almond",
    baseUrl: "tests",
    out: "dist/main.js",

    paths: {
        almond: "../node_modules/almond/almond",
        worker: "../worker"
    },

    include: ["main"],
    insertRequire: ["main"],

    wrap: true
})