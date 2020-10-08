/*
    Author: Kaan Kaner
*/

var requestAnimationFrame, cancelAnimationFrame;

new (
    function() {

        var elapsed = 0.0;

        var cbSet = new Set();
        var cbArr = [];
        var lastCbId = 0;
        var lastSetInterval = undefined;
        var INTERVAL = 16.0;

        var requestAFfallback = function(cb) {
            lastCbId++;
            cbArr[lastCbId] = cb;
            cbSet.add(cb);
            return lastCbId;
        };
        
        var cancelAFfallback = function(id) {
            var cb = cbArr[id];
            cbArr[id] = undefined;
            cbSet.delete(cb);
        };

        var tick = function() {
            for (var it = cbSet.values(), cb = null; cb = it.next().value; ) {
                cb(elapsed);
            }

            // TODO poll time here
            elapsed += INTERVAL;
        };

        var setupFallback = function() {

            cbArr = [];
            cbSet = new Set();
            elapsed = 0.0;

            if (lastSetInterval === undefined) {
                lastSetInterval = setInterval(tick, INTERVAL);
            }
        };

        var init = function() {

            var fallback = false;

            // To force fallback while testing:
            //fallback = true; 

            var r, c;

            if ('function' === typeof window.requestAnimationFrame) {
                r = window.requestAnimationFrame;
                c = window.cancelAnimationFrame;
            } else if ('function' === typeof window.webkitRequestAnimationFrame) {
                r = window.webkitRequestAnimationFrame;
                c = window.webkitCancelAnimationFrame;
            } else if ('function' === typeof window.mozRequestAnimationFrame) {
                r = window.mozRequestAnimationFrame;
                c = window.webkitCancelRequestAnimationFrame;
            } else if ('function' === typeof window.mozRequestAnimationFrame) {
                r = window.mozRequestAnimationFrame;
                c = window.mozCancelAnimationFrame;
            } else {
                fallback = true;
            }

            if (fallback) {
                r = requestAFfallback;
                c = cancelAFfallback;
                setupFallback();
            }

            requestAnimationFrame = function(cb) { r(cb); };
            cancelAnimationFrame = function(cb) { c(cb); };
        }

        init();

    }
)();

