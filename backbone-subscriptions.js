(function(){

    /*
     * If AMD is available, use it.
     */
    var isAmd = typeof window.define === "function" && window.define.amd;
    var define = isAmd ? window.define : function(list, cb){
        cb(jQuery, Backbone, window.await);
    };

    define([
        'jquery',
        'backbone',
        'await'
    ],function(
        $,
        Backbone,
        await
    ){

        /*
         * This is a bit of voodoo to ensure that subscribing
         * views are reachable through the DOM.
         */
        var setElement = Backbone.View.prototype.setElement;
        Backbone.View.prototype.setElement = function(){
            var result = setElement.apply(this, arguments);
            if (this.subscriptions) {
                this.el.view = this;
                this.el.className += ' subscriber';
            }
            return result;
        };

        if (!await) {
            await = function(){};
            await.all = function(){};
        }

        /*
         * Returns a list of elements by class name. Uses native
         * DOM query functionality for maximum performance.
         */
        var elementListByClass = (function(){
            var lists = {}; // this is the cache
            var slice = [].slice;
            var useFallback = typeof document.getElementsByClassName !== 'function';
            return function(className){
                if (useFallback) {
                    return slice.call(document.querySelectorAll('.'+className));
                } else {
                    if (!lists[className]) {
                        // gebcn returns a "live" list, so it will be automatically
                        // updated by the browser from here on out
                        lists[className] = document.getElementsByClassName(className);
                    }
                    return slice.call(lists[className]);
                }
            };
        })();

        /**
         * Publish/subscribe for Backbone views.
         * To notify views in the current DOM, do this:
         *
         *     Backbone.publish('foo');
         *
         * To subscribe to events from views, do this:
         *
         *     Backbone.View.extend({
         *         subscriptions: {
         *             'foo': 'doFoo'
         *         },
         *         doFoo: function(){
         *             ...
         *         }
         *     });
         */
        Backbone.publish = function(eventName){
            var args = Array.prototype.slice.call(arguments, 1);
            var liveElements = elementListByClass('subscriber');
            var proms = liveElements
            .filter(function(el){
                return el.view
                    && el.view.subscriptions
                    && el.view.subscriptions[eventName];
            })
            .map(function(el){
                var view = el.view;
                var subs = view.subscriptions;
                var methodName = subs[eventName];
                var prom = view[methodName].apply(view, args);
                if (!(prom instanceof await)) {
                    prom = await();
                }
                return prom;
            });
            return await.all(proms);
        };
    });

    return function(){
        return Backbone.publish.apply(Backbone, arguments);
    };

})();
