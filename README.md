# requirejs-worker

[Require.JS](http://requirejs.org) plugin to simplify [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) management.

## Features

`requirejs-worker` is a Work In Progress, some features are already availables but a lot of tests and improvements needs to be done.

- [x] Load module in a Web Worker proxy
- [x] Provide module proxy methods in DOM context
- [x] Test on Chrome, Firefox, Edge, IE 10 (with Promise polyfill)
- [ ] Test on Opera, Safari, mobiles...
- [ ] Allow multiple Workers
- [ ] Allow SharedWorker ?
- [ ] Create a Proxy when Web Workers are not availables
- [ ] Optimize performances
- [ ] Optimize almonds builds

## Installation

#### NPM

```batch
npm install requirejs-worker --save
```

#### Bower

```batch
bower install requirejs-worker --save
```

#### Manual

Simply clone the repository or download the last release.

## Configuration

#### Basic configuration

Configure `paths` in your `requirejs` configuration:

```javascript
requirejs.config({
    paths: {
        worker: "path/to/workerlib/worker"
    },
    worker: {
        // requirejs-worker options goes here.
        debug: true
    }
});
```

#### Available options

- __path__: (Optional) URL of the worker. _Default: `webworker.js`_
- __debug__: (Optional) Output debug informations to console. _Default: `false`_
- __stack__: (Optional) Send error stacks from Web Worker. _Default: `false`_


## Usage

#### Create a webworker.js bootstrapper file

Create a `webworker.js` bootstrapper file in the same directory as your `main` file with the following content:

```javascript
importScripts("path/to/requirejs/require.js");

requirejs.config({
    paths: {
        worker: "path/to/workerlib/worker"
        // Add your config here
    }
});

require(["worker/proxy"], function(proxy) {
    onmessage = proxy.onmessage;
    proxy.init();
});
```


#### Define a simple module

`calc.js`
```javascript
define({
    add: function (a, b) {
        return a + b;
    },
    sub: function (a, b) {
        return a - b;
    },
    mul: function (a, b) {
        return a * b;
    },
    div: function (a, b) {
        return a / b;
    }
});
```

#### Reference the module in another module

```javascript
define(["worker!calc"], function (calc) {

});
```

#### Use the module

Every methods are proxied using `Promises`.

```javascript
define(["worker!calc"], function (calc) {

    calc.add(2, 3)
        .then(function(result) { console.log(result === 5); })
        .catch(function(error) { console.error(error); });

});
```

## Building

`requirejs-worker` includes a plugin builder which:
 - append modules in base file in case of fallback
 - create a `webworker.js` file alongside to the `out` file which contains every _workers modules_.

#### Configuration

To enable web worker building, you need to include `require.js` in your resulting build:

`build.js`
```javascript
({
    name: "requirejs",
    baseUrl: "tests",
    out: "dist/main.js",

    paths: {
        requirejs: "path/to/requirejs/require",
        worker: "path/to/workerlib/worker"
    },

    include: ["main"],
    insertRequire: ["main"],

    wrap: true
})
```

`requirejs-worker` will automatically adapt the configuration to generate the `webworker.js` file.

#### Note about almond

[almond](https://github.com/requirejs/almond) is an tiny implementation of the [Require.JS](http://requirejs.org) API for use in built files.
It drastically reduces the size of the package by dropping the asynchronous feature of [Require.JS](http://requirejs.org).

`requirejs-worker` include a hack to work with [almond](https://github.com/requirejs/almond).

However, to generate module proxies in sync, it need to load the module in both environments (DOM + Web Worker). __This has a major performance impact.__

_Waiting for a better workaround, we strongly encourage to not use `requirejs-worker` with [almond](https://github.com/requirejs/almond)_