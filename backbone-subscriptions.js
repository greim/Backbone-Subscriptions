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
    cb(Backbone);
  };

  define([
    'backbone'
  ],function(
    Backbone
  ) {

    var subscriberClassName = 'subscriber';

    /*
     * This is a bit of voodoo to ensure that subscribing
     * views are reachable through the DOM.
     */
    var setElement = Backbone.View.prototype.setElement;
    Backbone.View.prototype.setElement = function() {
      var result = setElement.apply(this, arguments);
      if (this.subscriptions) {
        this.el.view = this;
        this.$el.addClass(subscriberClassName);
      } else {
        this.el.view = undefined;
        this.$el.removeClass(subscriberClassName);
      }
      return result;
    };

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
          return document.querySelectorAll('.'+className);
        } else {
          if (!lists[className]) {
            // gebcn returns a "live" list, so it will be automatically
            // updated by the browser from here on out
            lists[className] = document.getElementsByClassName(className);
          }
          return lists[className];
        }
      };
    })();

    function Event(props){
      _.extend(this, props);
    }

    var getChannelFilter = (function(){
      /*
       * A view declares which events it wants to handle in
       * its subscriptions:{key:value} object. The key is a
       * string like 'foo (string, number)'. This class
       * represents the parsed version of that key, and is
       * used to select which events a view responds to,
       * based on the channel name and argument list
       * provided by the caller.
       */
      function ChannelFilter(filterString){
        var matches = filterString.match(patts.sig);
        if (!matches) {
          this.sig = null;
          this.channel = filterString || null;
        } else {
          this.channel = matches[1] || null;
          var commaSep = matches[2];
          var sig = _(commaSep.split(',')).map(trim);
          sig = _(sig).filter(function(part){
            return patts.notEmpty.test(part);
          });
          this.sig = sig;
        }
      }
      ChannelFilter.prototype.test = function(callerChan, callerSig){
        var result = true;
        if (this.channel !== null) {
          result &= this.channel === callerChan;
        }
        if (this.sig !== null) {
          if (this.sig.length !== callerSig.length) {
            result = false;
          } else {
            _(this.sig).each(function(type, idx){
              result &= (type === '*' || type === typeof callerSig[idx]);
            });
          }
        }
        return !!result;
      };
      function trim(s){
        return patts.leadingTrailing.test(s)
          ? s.replace(patts.leadingTrailing,'')
          : s;
      }
      var channelFilters = {};
      var patts = {
        sig: /^\s*([^\(]*?)\s*\(([^\)]*)\)\s*$/,
        leadingTrailing: /(^\s+)|(\s+$)/g,
        notEmpty: /\S/
      };
      return function(filterString){
        var filter = channelFilters[filterString];
        if (!filter) {
          filter = channelFilters[filterString] = new ChannelFilter(filterString);
        }
        return filter;
      }
    })();

    Backbone.Subscriptions = _.extend({

      /**
       * Publish a message to any subscribing Backbone views.
       * @param channel - String name describing the thing
       * being subscribed to.
       */
      publish: function(channel) {
        var scopeView = this instanceof Backbone.View ? this : undefined;
        var isGlobal = !scopeView;
        var event = new Event({
          channel: channel
        });
        var sig = Array.prototype.slice.call(arguments, 1);
        var args = sig.slice();
        args.unshift(event);
        var liveElements = elementListByClass(subscriberClassName);

        _(liveElements).each(function(el){
          if (!el.view) return;
          if (!el.view.subscriptions) return;
          var view = el.view;
          var subs = view.subscriptions;
          _(_(subs).keys()).each(function(filterString){
            var filter = getChannelFilter(filterString);
            if (filter.test(channel, sig)) {
              if (!scopeView || Backbone.$.contains(scopeView.el, el)) {
                view[subs[filterString]].apply(view, args);
              }
            }
          });
        });
        if (isGlobal) {
          Backbone.Subscriptions.trigger.apply(Backbone.Subscriptions, sig);
        }
      },

      /**
       * Set the HTML className used to track views in the
       * DOM. Useful to avoid naming collisions in case
       * the default className is used by something else.
       * @param className - The className string to be set.
       */
      setDomTrackingClassName: function(className) {
        var patt = /[a-z0-9_-]+/i;
        if (!className || !patt.test(className)) {
          throw new Error("className doesn't match pattern "+ patt);
        }
        subscriberClassName = className;
      }
    }, Backbone.Events);

    Backbone.View.prototype.publish = Backbone.Subscriptions.publish;

    return Backbone.Subscriptions;
  
  }); // end of define()
})();
