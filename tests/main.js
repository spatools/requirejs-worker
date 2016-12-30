requirejs.config({
    paths: {
        worker: "../worker"
    }
});

define(["worker!calc"], function (calc) {

    calc.add(2, 3)
        .then(function(result) { document.getElementById("result-add").innerHTML = result; })
        .catch(function(error) { document.getElementById("result-add").innerHTML = "/!\\ " + error; });

    calc.sub(2, 3)
        .then(function(result) { document.getElementById("result-sub").innerHTML = result; })
        .catch(function(error) { document.getElementById("result-sub").innerHTML = "/!\\ " + error; });

    calc.mul(2, 3)
        .then(function(result) { document.getElementById("result-mul").innerHTML = result; })
        .catch(function(error) { document.getElementById("result-mul").innerHTML = "/!\\ " + error; });

    calc.div(2, 3)
        .then(function(result) { document.getElementById("result-div").innerHTML = result; })
        .catch(function(error) { document.getElementById("result-div").innerHTML = "/!\\ " + error; });

    calc.err(2, 3)
        .then(function(result) { document.getElementById("result-err").innerHTML = "???SUCCESS???" + result; })
        .catch(function(error) { document.getElementById("result-err").innerHTML = JSON.stringify(error); });

});