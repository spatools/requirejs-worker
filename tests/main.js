requirejs.config({
    paths: {
        worker: "../worker"
    },

    worker: {
        debug: true,
        stack: true
    }
});

define(["worker!calc"], function (calc) {

    var addStartDate = Date.now();
    calc.add(2, 3)
        .then(function(result) { setFieldResult("result-add", result, addStartDate); })
        .catch(function(error) { setFieldError("result-add", error , addStartDate); });

    var subStartDate = Date.now();
    calc.sub(2, 3)
        .then(function(result) { setFieldResult("result-sub", result, subStartDate); })
        .catch(function(error) { setFieldError("result-sub", error , subStartDate); });

    var mulStartDate = Date.now();
    calc.mul(2, 3)
        .then(function(result) { setFieldResult("result-mul", result, mulStartDate); })
        .catch(function(error) { setFieldError("result-mul", error , mulStartDate); });

    var divStartDate = Date.now();
    calc.div(2, 3)
        .then(function(result) { setFieldResult("result-div", result, divStartDate); })
        .catch(function(error) { setFieldError("result-div", error , divStartDate); });

    var errStartDate = Date.now();
    calc.err(2, 3)
        .then(function(result) { setFieldResult("result-err", "???SUCESS???", errStartDate); })
        .catch(function(error) { setFieldError("result-err", error, errStartDate); });

    function setFieldResult(id, result, startDate) {
        document.getElementById(id).innerHTML = result + " (" + (Date.now() - startDate) + "ms)";
    }

    function setFieldError(id, error, startDate) {
        document.getElementById(id).innerHTML = "/!\\ " + JSON.stringify(error) + " (" + (Date.now() - startDate) + "ms)";
    }

});