define(function() {

    return {
        add: add,
        sub: sub,
        mul: mul,
        div: div,
        err: err
    };

    function add(a, b) {
        return a + b;
    }

    function sub(a, b) {
        return a - b;
    }

    function mul(a, b) {
        return a * b;
    }

    function div(a, b) {
        return a / b;
    }

    function err() {
        throw new Error("Rejected!");
    }
});