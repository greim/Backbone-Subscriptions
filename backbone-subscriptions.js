// ########################################################################
// MIT LICENSE

/*
Copyright (c) 2013 by Greg Reimer
https://github.com/greim
http://obadger.com/

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

// ########################################################################
// BACKBONE SUBSCRIPTIONS

(function() {

  /*
   * If AMD is available, use it.
   */
  var isAmd = typeof window.define === "function" && window.define.amd;
  var define = isAmd ? window.define : function(list, cb) {
    cb(jQuery, Backbone, _, window.await);
  };

  define([
    'jquery',
    'backbone',
    'underscore',
    'await'
  ],function(
    $,
    Backbone,
    _,
    await
  ) {

    /*
     * This is a bit of voodoo to ensure that subscribing
     * views are reachable through the DOM.
     */
    var setElement = Backbone.View.prototype.setElement;
    Backbone.View.prototype.setElement = function() {
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
    var elementListByClass = (function() {
      var lists = {}; // this is the cache
      var slice = [].slice;
      var useFallback = typeof document.getElementsByClassName !== 'function';
      return function(className) {
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
     */
    Backbone.Subscriptions = {
      publish: function(channel) {
        var args = Array.prototype.slice.call(arguments, 1);
        var liveElements = elementListByClass('subscriber');
        var proms = _(liveElements).filter(function(el) {
          return el.view
            && el.view.subscriptions
            && el.view.subscriptions[channel];
        });
        proms = _(proms).map(function(el) {
          var view = el.view;
          var subs = view.subscriptions;
          var methodName = subs[channel];
          var prom = view[methodName].apply(view, args);
          if (!(prom instanceof await)) {
            prom = await();
          }
          return prom;
        });
        return await.all(proms);
      }
    }
  });

  return Backbone.Subscriptions;

})();
