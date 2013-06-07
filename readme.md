# Backbone Subscriptions

Backbone subscriptions is a Backbone.js extension that provides loosely-coupled communication between views. It does this via a publish/subscribe pattern. Backbone views are in many ways self-contained mini-apps. While it's easy for them to react to things that happen in its own scope, it's not so easy for it to react to things that originate outside itself. Backbone subscriptions provides a clean solution to this problem.

    // an event that originates at the global level
    window.addEventListener('message', function(ev){
      var message = JSON.parse(ev.data);
      Backbone.publish('message', message);
    });

    // a view that subscribes to that event
    var MyView = Backbone.View.extend({
      subscriptions: { 'message': 'handleMessage' },
      handleMessage: function(message){ ... }
    });

The above shows an example of making a view respond to cross-window communication messages. Other external events that views might want to subscribe to include page visibility or focus changes, device orientation changes, window resize, incoming data from websockets, window scroll, local storage mutations, etc.

## Why not just add events in initialize?

    var MyView = Backbone.View.extend({
      initialize: function(){
        window.addEventListener('message', _.bind(function(ev){
          var message = JSON.parse(ev.data);
          this.message(message);
        }));
      },
      message: function(message){ ... }
    });

This will certainly work, however it adds additional event handlers to `window` as more instances of that view are created. Each extra handler still runs in the background, even though the view is no longer visible in the DOM. Not only is it a CPU drain, but it's a memory leak, since functions stored on the window (the event handlers) keep references to each view instance.

## What happens to a view after it goes away?

Once a view is detached from the document, backbone subscriptions won't be able to send messages to it anymore, and it will be garbage collected just like any other view. This is possible because no hidden references to views are kept hanging around in memory, but rather views are discovered lazily through the DOM tree in order to publish events to them.

## No dependencies

Backbone subscriptions has no dependencies besides Backbone. If the [await](https://github.com/greim/await.js) promises library is present, calls to `Backbone.publish()` return await promises that are kept when the call completes. If subscribing view methods don't themselves return await promises, this happens immediately, otherwise it happens after all returned promises are themselves kept.

## Browser support

Browsers that don't support the [selector API](http://www.w3.org/TR/selectors-api2/) aren't supported. In practical terms, this means that Backbone subscriptions should work in all modern browsers as of 2013, and also in IE8 and above.

## AMD/RequireJS

If AMD/RequireJS exists, this library exports a function in addition to creating `Backbone.publish()`. Both of these have the same signature and behavior.